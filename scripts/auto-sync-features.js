/**
 * Automatic Synchronizer for Altarion & Aitusa
 * Converts and synchronizes Dragon Rider, Wizard (2014 PHB), School of Abjuration (2014 PHB),
 * Fighting Style: Defense (2014 PHB), and Dragon Companion classes, subclasses, and features
 * directly via Plutonium's runtime converters (PlutoniumDataBridge).
 */

import {
  PlutoniumDataBridge,
  DRAGON_RIDER_CLASS,
  WIZARD_CLASS,
  DRAGON_CLASS,
  ABJURATION_SUBCLASS
} from "./dragon-rider-data.js";
import { DragonScalingManager } from "./dragon-scaling.js";
import { SecondaryClassManager } from "./secondary-class.js";

export class FeatureSyncManager {
  /**
   * Set of Actor IDs currently undergoing synchronization to prevent recursive hook triggers.
   */
  static _syncing = new Set();

  /**
   * Guard to prevent recursive spell mirroring between Altarion and Aitusa.
   */
  static _mirroringSpells = false;

  /**
   * Cached Compendium UUIDs for 2014 PHB Wizard & School of Abjuration features seeded in altarion-aitusa.subclasses
   */
  static _wizardFeatureUuidsByLevel = { 1: [], 18: [], 20: [] };
  static _abjurationFeatureUuidsByLevel = { 2: [], 6: [], 10: [], 14: [] };
  static _abjurationSubclassUuid = null;

  static isSyncing(actorId) {
    return this._syncing.has(actorId);
  }

  /**
   * Extract an array of plain advancement objects from an item's advancement field
   * (compatible with both dnd5e 5.x Object/TypedObjectField and dnd5e 3.x/4.x ArrayField).
   */
  static getAdvancementArray(advSource) {
    if (!advSource) return [];
    if (Array.isArray(advSource)) return advSource;
    if (typeof advSource.values === "function") {
      return Array.from(advSource.values()).map(a => (typeof a?.toObject === "function" ? a.toObject() : a));
    }
    if (typeof advSource === "object") return Object.values(advSource);
    return [];
  }

  /**
   * Generate a deterministic, valid 16-character alphanumeric FoundryVTT `_id` from a string seed.
   */
  static makeDeterministicAdvId(seed) {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let h1 = 0x811c9dc5;
    let h2 = 0x01000193;
    const str = String(seed || "");
    for (let i = 0; i < str.length; i++) {
      const c = str.charCodeAt(i);
      h1 ^= c;
      h1 = Math.imul(h1, 0x01000193) >>> 0;
      h2 ^= c + i * 31;
      h2 = Math.imul(h2, 0x85ebca6b) >>> 0;
    }
    let out = "AA";
    let s1 = h1;
    let s2 = h2;
    for (let i = 0; i < 14; i++) {
      s1 = (Math.imul(s1 ^ (s2 >>> 13), 0x5bd1e995) + i * 97) >>> 0;
      s2 = (Math.imul(s2 ^ (s1 >>> 15), 0x27d4eb2d) + i * 53) >>> 0;
      const idx = ((s1 ^ s2) >>> 0) % 62;
      out += chars[idx];
    }
    return out;
  }

  /**
   * Check whether an `_id` is a valid 16-character alphanumeric FoundryVTT ID.
   */
  static isValidAdvId(id) {
    return typeof id === "string" && /^[A-Za-z0-9]{16}$/.test(id);
  }

  /**
   * Build a FoundryVTT advancement update payload that explicitly deletes removed/duplicate keys
   * via `"-=oldKey": null` on `TypedObjectField` (`system.advancement`).
   */
  static buildAdvancementUpdatePatch(existingAdvSource, cleanAdvList) {
    if (Array.isArray(existingAdvSource)) {
      return cleanAdvList;
    }

    const outObj = {};
    for (let idx = 0; idx < cleanAdvList.length; idx++) {
      const adv = cleanAdvList[idx];
      if (!adv) continue;
      const rawId = adv._id || adv.id;
      const id = this.isValidAdvId(rawId)
        ? rawId
        : this.makeDeterministicAdvId(`altarion:adv:${adv.type}:${adv.level ?? 0}:${idx}`);
      adv._id = id;
      outObj[id] = adv;
    }

    if (existingAdvSource && typeof existingAdvSource === "object") {
      for (const oldKey of Object.keys(existingAdvSource)) {
        if (oldKey.startsWith("-=")) continue;
        if (!(oldKey in outObj)) {
          outObj[`-=${oldKey}`] = null;
        }
      }
    }

    return outObj;
  }

  /**
   * Deduplicate an array/object of advancements so no duplicate steps (`ItemGrant`, `Subclass`,
   * `AbilityScoreImprovement`, `ScaleValue`, `Trait`, `HitPoints`) can ever accumulate.
   */
  static deduplicateAdvancementList(advSource, { isSecondary = false, seedPrefix = "altarion" } = {}) {
    const rawList = this.getAdvancementArray(foundry.utils.deepClone(advSource || {})).filter(Boolean);
    const hasNonEmptyValue = (v) => v && typeof v === "object" && Object.keys(v).length > 0;

    let keptHitPoints = null;
    let keptSubclass = null;
    const asiByLevel = new Map();
    const scaleByIdent = new Map();
    const traitByKey = new Map();
    const grantByLevel = new Map();
    const otherByKey = new Map();

    for (const adv of rawList) {
      const lvl = Number(adv.level ?? 0);

      if (adv.type === "HitPoints") {
        if (isSecondary) continue;
        if (!keptHitPoints || (!hasNonEmptyValue(keptHitPoints.value) && hasNonEmptyValue(adv.value))) {
          keptHitPoints = adv;
        }
        continue;
      }

      if (adv.type === "Subclass") {
        if (!keptSubclass || (!hasNonEmptyValue(keptSubclass.value) && hasNonEmptyValue(adv.value))) {
          keptSubclass = adv;
        }
        continue;
      }

      if (adv.type === "AbilityScoreImprovement") {
        const prev = asiByLevel.get(lvl);
        if (!prev || (!hasNonEmptyValue(prev.value) && hasNonEmptyValue(adv.value))) {
          asiByLevel.set(lvl, adv);
        }
        continue;
      }

      if (adv.type === "ScaleValue") {
        const identKey = String(adv.configuration?.identifier || adv.title || "").trim().toLowerCase();
        if (identKey && !scaleByIdent.has(identKey)) {
          scaleByIdent.set(identKey, adv);
        }
        continue;
      }

      if (adv.type === "Trait") {
        const grantsArr = Array.from(adv.configuration?.grants || []).map(String).sort();
        if (isSecondary) {
          if (adv.classRestriction === "primary") continue;
          if (grantsArr.some(g => g.startsWith("saves:"))) continue;
        }
        const choicesKey = JSON.stringify((adv.configuration?.choices || []).map(c => ({ count: c?.count, pool: c?.pool })));
        const tKey = `${lvl}::${adv.classRestriction || ""}::${adv.configuration?.mode || ""}::${adv.title || ""}::${grantsArr.join(",")}::${choicesKey}`;
        const prev = traitByKey.get(tKey);
        if (!prev || (!hasNonEmptyValue(prev.value) && hasNonEmptyValue(adv.value))) {
          traitByKey.set(tKey, adv);
        }
        continue;
      }

      if (adv.type === "ItemGrant") {
        const prev = grantByLevel.get(lvl);
        const rawItems = adv.configuration?.items;
        const entries = rawItems instanceof Set ? Array.from(rawItems) : (Array.isArray(rawItems) ? rawItems : []);
        const uuids = entries.map(e => (typeof e === "string" ? e : e?.uuid)).filter(Boolean);

        if (!prev) {
          const uniqueUuids = Array.from(new Set(uuids));
          adv.configuration = foundry.utils.mergeObject(adv.configuration || {}, {
            items: uniqueUuids.map(uuid => ({ uuid, optional: false }))
          });
          adv.value = adv.value || {};
          adv.value.added = foundry.utils.deepClone(adv.value.added || {});
          grantByLevel.set(lvl, adv);
        } else {
          const prevEntries = Array.isArray(prev.configuration?.items) ? prev.configuration.items : [];
          const prevUuids = prevEntries.map(e => (typeof e === "string" ? e : e?.uuid)).filter(Boolean);
          const mergedUuids = Array.from(new Set([...prevUuids, ...uuids]));
          prev.configuration.items = mergedUuids.map(uuid => ({ uuid, optional: false }));
          prev.value = prev.value || {};
          prev.value.added = foundry.utils.mergeObject(prev.value.added || {}, adv.value?.added || {});
        }
        continue;
      }

      const oKey = `${adv.type}::${lvl}::${adv.title || ""}`;
      if (!otherByKey.has(oKey)) {
        otherByKey.set(oKey, adv);
      }
    }

    const clean = [];
    if (keptHitPoints) clean.push(keptHitPoints);
    if (keptSubclass) clean.push(keptSubclass);
    for (const [, adv] of Array.from(traitByKey.entries())) clean.push(adv);
    for (const [, adv] of Array.from(scaleByIdent.entries())) clean.push(adv);
    for (const [, adv] of Array.from(asiByLevel.entries()).sort((a, b) => a[0] - b[0])) clean.push(adv);
    for (const [, adv] of Array.from(grantByLevel.entries()).sort((a, b) => a[0] - b[0])) clean.push(adv);
    for (const [, adv] of Array.from(otherByKey.entries())) clean.push(adv);

    for (let i = 0; i < clean.length; i++) {
      const adv = clean[i];
      const rawId = adv._id || adv.id;
      adv._id = this.isValidAdvId(rawId)
        ? rawId
        : this.makeDeterministicAdvId(`${seedPrefix}:${adv.type}:${adv.level ?? 0}:${adv.configuration?.identifier || adv.title || i}`);
    }

    return clean;
  }

  /**
   * Build a clean, deduplicated advancement payload for Altarion's Secondary Class (2014 PHB Wizard),
   * with HitPoints & primary saves removed, strictly 1 Subclass step at level 2, 1 ASI per ASI level,
   * and strictly 1 deterministic ItemGrant step at levels 1, 18, and 20.
   */
  static buildSecondaryWizardAdvancements(existingAdvSource, freshAdvSource = null, actor = null) {
    const baseList = this.deduplicateAdvancementList(existingAdvSource || freshAdvSource || {}, {
      isSecondary: true,
      seedPrefix: "altarion:wizard"
    });

    // Merge in any ScaleValue advancements from freshAdvSource that were missing on existingAdvSource
    if (existingAdvSource && freshAdvSource) {
      const freshDedup = this.deduplicateAdvancementList(freshAdvSource, {
        isSecondary: true,
        seedPrefix: "altarion:wizard"
      });
      for (const fAdv of freshDedup) {
        if (fAdv.type === "ScaleValue") {
          const ident = String(fAdv.configuration?.identifier || fAdv.title || "").trim().toLowerCase();
          if (ident && !baseList.some(a => a.type === "ScaleValue" && String(a.configuration?.identifier || a.title || "").trim().toLowerCase() === ident)) {
            baseList.push(fAdv);
          }
        }
      }
    }

    // Collect existing valid value.added links before replacing all ItemGrant entries cleanly
    const preservedAddedByUuid = new Map();
    for (const adv of baseList) {
      if (adv.type === "ItemGrant" && adv.value?.added) {
        for (const [itemId, uuid] of Object.entries(adv.value.added)) {
          if (uuid && (!actor || actor.items?.has(itemId))) {
            preservedAddedByUuid.set(uuid, itemId);
          }
        }
      }
    }

    const list = baseList.filter(a => a.type !== "ItemGrant");

    // 1. Ensure strictly 1 Subclass advancement at level 2 ("Arcane Tradition")
    let subAdv = list.find(a => a.type === "Subclass");
    if (!subAdv) {
      list.push({
        _id: this.makeDeterministicAdvId("altarion:wizard:subclass:2"),
        type: "Subclass",
        configuration: {},
        value: {},
        level: 2,
        title: "Arcane Tradition",
        icon: null
      });
    } else {
      subAdv.level = 2;
      subAdv.title = subAdv.title || "Arcane Tradition";
    }

    // 2. Ensure strictly 1 AbilityScoreImprovement advancement at levels 4, 8, 12, 16, 19
    for (const asiLvl of [4, 8, 12, 16, 19]) {
      const hasAsi = list.some(a => a.type === "AbilityScoreImprovement" && Number(a.level) === asiLvl);
      if (!hasAsi) {
        list.push({
          _id: this.makeDeterministicAdvId(`altarion:wizard:asi:${asiLvl}`),
          type: "AbilityScoreImprovement",
          configuration: { points: 2, fixed: {}, cap: 2, locked: [] },
          value: { type: "asi" },
          level: asiLvl,
          title: "Ability Score Improvement",
          icon: null
        });
      }
    }

    // 3. Inject strictly 1 deterministic ItemGrant per Wizard feature level (1, 18, 20)
    for (const [lvlStr, rawUuids] of Object.entries(this._wizardFeatureUuidsByLevel)) {
      const uuids = Array.from(new Set((rawUuids || []).filter(Boolean)));
      if (!uuids.length) continue;
      const lvl = Number(lvlStr);
      const added = {};
      for (const u of uuids) {
        const existingId = preservedAddedByUuid.get(u);
        if (existingId) added[existingId] = u;
      }
      list.push({
        _id: this.makeDeterministicAdvId(`altarion:wizard:grant:${lvl}`),
        type: "ItemGrant",
        configuration: {
          items: uuids.map(uuid => ({ uuid, optional: false })),
          optional: false,
          spell: null
        },
        value: { added },
        level: lvl,
        title: "Features",
        icon: null
      });
    }

    return this.buildAdvancementUpdatePatch(existingAdvSource, list);
  }

  /**
   * Build a clean, deduplicated advancement payload for 2014 PHB School of Abjuration,
   * stripping any accumulated duplicate ItemGrant keys and keeping strictly 1 deterministic
   * ItemGrant per level (2, 6, 10, 14).
   */
  static buildAbjurationSubclassAdvancements(existingAdvSource, freshAdvSource = null, actor = null) {
    const baseList = this.deduplicateAdvancementList(existingAdvSource || freshAdvSource || {}, {
      isSecondary: true,
      seedPrefix: "altarion:abjuration"
    });

    const preservedAddedByUuid = new Map();
    for (const adv of baseList) {
      if (adv.type === "ItemGrant" && adv.value?.added) {
        for (const [itemId, uuid] of Object.entries(adv.value.added)) {
          if (uuid && (!actor || actor.items?.has(itemId))) {
            preservedAddedByUuid.set(uuid, itemId);
          }
        }
      }
    }

    const list = baseList.filter(a => a.type !== "ItemGrant");

    for (const [lvlStr, rawUuids] of Object.entries(this._abjurationFeatureUuidsByLevel)) {
      const uuids = Array.from(new Set((rawUuids || []).filter(Boolean)));
      if (!uuids.length) continue;
      const lvl = Number(lvlStr);
      const added = {};
      for (const u of uuids) {
        const existingId = preservedAddedByUuid.get(u);
        if (existingId) added[existingId] = u;
      }
      list.push({
        _id: this.makeDeterministicAdvId(`altarion:abjuration:grant:${lvl}`),
        type: "ItemGrant",
        configuration: {
          items: uuids.map(uuid => ({ uuid, optional: false })),
          optional: false,
          spell: null
        },
        value: { added },
        level: lvl,
        title: "Features",
        icon: null
      });
    }

    return this.buildAdvancementUpdatePatch(existingAdvSource, list);
  }

  /**
   * Names of legacy or size-suffixed duplicate items to automatically clean up from sheets
   */
  static LEGACY_NAMES = [
    "Mago (Abjuração) - Classe Secundária",
    "Spellcasting (Wizard)",
    "Obter o Dragão",
    "Ancestralidade do Dragão (Força / INT)",
    "Estilo de Luta: Defesa",
    "Cuidado com Dragão",
    "Despertar Ancestral (Arma Ancestral)",
    "Ataque Ancestral: Proteção Ancestral",
    "Ataque Ancestral: Rio Ancestral",
    "Ataque Ancestral: Escudo Ancestral",
    "Aumento no Valor de Habilidade (4º Nível)",
    "Garra (Aitusa)",
    "Mordida (Aitusa - Dano de Força)",
    "Companheiro Dragão: Tamanho Pequeno & Voo",
    "Dragon's Egg",
    "Obtain the Dragon",
    "Dragon's Ancestry",
    "Extra Attack",
    "Rider's Reflexes",
    "Elemental Mastery",
    "Shared Soul",
    "Ancient Presence",
    "Energy Flow",
    "Improved Ancestral Awakening",
    "Ancestral Transformation",
    "Claw",
    "Bite",
    "Tail",
    // Repeated 5etools size items
    "Ancestral Ward Tiny", "Ancestral Ward Small", "Ancestral Ward Medium", "Ancestral Ward Large", "Ancestral Ward Huge",
    "Ancestral Ray Tiny", "Ancestral Ray Small", "Ancestral Ray Medium", "Ancestral Ray Large", "Ancestral Ray Huge",
    "Ancestral Shielding Tiny", "Ancestral Shielding Small", "Ancestral Shielding Medium", "Ancestral Shielding Large", "Ancestral Shielding Huge",
    "Ancestral Attacks Small", "Ancestral Attacks Medium", "Ancestral Attacks Large", "Ancestral Attacks Huge",
    "Bursting Strike Medium", "Bursting Strike Large", "Bursting Strike Huge",
    "Ancestral Surge Medium", "Ancestral Surge Large", "Ancestral Surge Huge",
    "Ancestral Marking Medium", "Ancestral Marking Large", "Ancestral Marking Huge",
    "Dragon's Breath Large", "Dragon's Breath Huge",
    "Claw Attack Small", "Claw Attack Medium", "Claw Attack Large", "Claw Attack Huge",
    "Bite Attack Small", "Bite Attack Medium", "Bite Attack Large", "Bite Attack Huge",
    "Tail Attack Medium", "Tail Attack Large", "Tail Attack Huge",
    "Wing Attack Medium", "Wing Attack Large", "Wing Attack Huge",
    "Breath Weapon Medium", "Breath Weapon Large", "Breath Weapon Huge",
    "Large Dragon", "Huge Dragon"
  ];

  /**
   * Seed the 2014 PHB School of Abjuration subclass, its 5 features, and the 4 2014 PHB Wizard
   * class features (converted via Plutonium) into the `altarion-aitusa.subclasses` Compendium pack.
   * For non-GM users, populates the cached Compendium UUID maps directly from the pack in read-only mode.
   */
  static async ensureCompendiumContent() {
    try {
      const modulePack = game.packs.get("altarion-aitusa.subclasses");
      if (!modulePack) return;

      // Non-GM users cannot mutate Compendium packs, so read existing seeded UUIDs in read-only mode
      if (!game.user?.isGM) {
        const roDocs = await modulePack.getDocuments();
        this._wizardFeatureUuidsByLevel = { 1: [], 18: [], 20: [] };
        this._abjurationFeatureUuidsByLevel = { 2: [], 6: [], 10: [], 14: [] };
        for (const d of roDocs) {
          if (d.flags?.["altarion-aitusa"]?.otherPlayersCompendiumFeat) continue;
          const fKey = String(d.flags?.["altarion-aitusa"]?.featureKey || "");
          const lvl = Number(d.flags?.["altarion-aitusa"]?.levelRequired || 0);
          if (fKey.startsWith("wizard:class:") && this._wizardFeatureUuidsByLevel[lvl]) {
            if (!this._wizardFeatureUuidsByLevel[lvl].includes(d.uuid)) {
              this._wizardFeatureUuidsByLevel[lvl].push(d.uuid);
            }
          } else if (fKey.startsWith("wizard:abjuration:") && this._abjurationFeatureUuidsByLevel[lvl]) {
            if (!this._abjurationFeatureUuidsByLevel[lvl].includes(d.uuid)) {
              this._abjurationFeatureUuidsByLevel[lvl].push(d.uuid);
            }
          } else if (d.type === "subclass" && (d.name === "School of Abjuration" || d.system?.identifier === "abjuration")) {
            this._abjurationSubclassUuid = d.uuid;
          }
        }
        return;
      }

      // Clean up any temporary fallback items previously seeded into dnd5e.subclasses
      const dndSubclassesPack = game.packs.get("dnd5e.subclasses");
      if (dndSubclassesPack) {
        const subIdx = await dndSubclassesPack.getIndex({ fields: ["system.identifier"] });
        const tempSub = subIdx.find(e => e.name === "School of Abjuration" || e.system?.identifier === "abjuration");
        if (tempSub) {
          const wasLocked = dndSubclassesPack.locked;
          if (wasLocked) await dndSubclassesPack.configure({ locked: false });
          await Item.deleteDocuments([tempSub._id], { pack: dndSubclassesPack.collection });
          if (wasLocked) await dndSubclassesPack.configure({ locked: true });
        }
      }

      const wizBundle = await PlutoniumDataBridge.pGetWizard2014Bundle();

      const runWithPackMutex = (fn) => {
        const prev = globalThis.__altarionSubclassesPackMutex || Promise.resolve();
        const next = prev.then(fn, fn);
        globalThis.__altarionSubclassesPackMutex = next.catch(() => {});
        return next;
      };

      await runWithPackMutex(async () => {
        const wasLocked = modulePack.locked;
        if (wasLocked) await modulePack.configure({ locked: false });

        try {
          const existingDocs = await modulePack.getDocuments();

          // Purge old non-Plutonium fallback docs AND any duplicate featureKey / duplicate School of Abjuration docs
          const idsToDelete = [];
          const seenCompendiumKeys = new Set();
          for (const d of existingDocs) {
            const isOtherPlayerDoc = Boolean(d.flags?.["altarion-aitusa"]?.otherPlayersCompendiumFeat);
            if (wizBundle && !d.flags?.plutonium && !isOtherPlayerDoc) {
              idsToDelete.push(d.id);
              continue;
            }
            const compKey = isOtherPlayerDoc
              ? `op:${d.flags?.["altarion-aitusa"]?.compendiumKey || d.flags?.["altarion-aitusa"]?.featureKey || d.name}`
              : d.type === "subclass"
                ? `sc:${(d.system?.identifier || d.name).toLowerCase()}`
                : `feat:${d.flags?.["altarion-aitusa"]?.featureKey || d.name.toLowerCase()}`;
            if (seenCompendiumKeys.has(compKey)) {
              idsToDelete.push(d.id);
            } else {
              seenCompendiumKeys.add(compKey);
            }
          }
          if (idsToDelete.length > 0) {
            await Item.deleteDocuments(idsToDelete, { pack: modulePack.collection });
          }

          const currentDocs = await modulePack.getDocuments();
          this._wizardFeatureUuidsByLevel = { 1: [], 18: [], 20: [] };
          this._abjurationFeatureUuidsByLevel = { 2: [], 6: [], 10: [], 14: [] };

          if (wizBundle) {
            // 1. Seed 2014 PHB Wizard Class Features into modulePack
            for (const { level, data } of wizBundle.wizardFeatures) {
              const fKey = data.flags?.["altarion-aitusa"]?.featureKey;
              let doc = currentDocs.find(
                d =>
                  !d.flags?.["altarion-aitusa"]?.otherPlayersCompendiumFeat &&
                  (d.flags?.["altarion-aitusa"]?.featureKey === fKey ||
                    (d.type === "feat" && d.name === data.name && d.system?.requirements?.includes("Wizard")))
              );
              if (!doc) {
                const created = await Item.createDocuments([foundry.utils.deepClone(data)], {
                  pack: modulePack.collection
                });
                doc = created[0];
              }
              if (doc && this._wizardFeatureUuidsByLevel[level] && !this._wizardFeatureUuidsByLevel[level].includes(doc.uuid)) {
                this._wizardFeatureUuidsByLevel[level].push(doc.uuid);
              }
            }

            // 2. Seed 2014 PHB School of Abjuration Subclass Features into modulePack
            for (const { level, data } of wizBundle.abjurationFeatures) {
              const fKey = data.flags?.["altarion-aitusa"]?.featureKey;
              let doc = currentDocs.find(
                d =>
                  !d.flags?.["altarion-aitusa"]?.otherPlayersCompendiumFeat &&
                  (d.flags?.["altarion-aitusa"]?.featureKey === fKey ||
                    (d.type === "feat" && d.name === data.name))
              );
              if (!doc) {
                const created = await Item.createDocuments([foundry.utils.deepClone(data)], {
                  pack: modulePack.collection
                });
                doc = created[0];
              }
              if (doc && this._abjurationFeatureUuidsByLevel[level] && !this._abjurationFeatureUuidsByLevel[level].includes(doc.uuid)) {
                this._abjurationFeatureUuidsByLevel[level].push(doc.uuid);
              }
            }

            // 3. Build clean, deterministic ItemGrant advancements at levels 2, 6, 10, 14 for School of Abjuration
            const subclassData = foundry.utils.deepClone(wizBundle.abjurationSubclassData);

            let scDoc = currentDocs.find(
              d => d.type === "subclass" && (d.name === "School of Abjuration" || d.system?.identifier === "abjuration")
            );
            if (!scDoc) {
              subclassData.system.advancement = this.buildAbjurationSubclassAdvancements(
                null,
                subclassData.system?.advancement
              );
              const createdSc = await Item.createDocuments([subclassData], {
                pack: modulePack.collection
              });
              scDoc = createdSc[0];
            } else {
              // Explicitly delete any accumulated duplicate ItemGrant keys via `"-=oldKey": null`
              const advPatch = this.buildAbjurationSubclassAdvancements(
                scDoc.toObject().system?.advancement,
                subclassData.system?.advancement
              );
              await scDoc.update({
                img: subclassData.img,
                "system.description.value": subclassData.system.description.value,
                "system.source": subclassData.system.source,
                "system.advancement": advPatch,
                flags: subclassData.flags
              });
            }

            this._abjurationSubclassUuid = scDoc?.uuid || null;
          } else {
            // Minimal fallback if Plutonium is inactive
            let scDoc = currentDocs.find(
              d => d.type === "subclass" && (d.name === "School of Abjuration" || d.system?.identifier === "abjuration")
            );
            if (!scDoc) {
              const createdSc = await Item.createDocuments([foundry.utils.deepClone(ABJURATION_SUBCLASS)], {
                pack: modulePack.collection
              });
              scDoc = createdSc[0];
            }
            this._abjurationSubclassUuid = scDoc?.uuid || null;
          }

          await modulePack.getIndex({
            fields: ["system.identifier", "system.classIdentifier", "system.source"]
          });
        } finally {
          if (wasLocked) await modulePack.configure({ locked: true });
        }
      });
    } catch (err) {
      console.warn("[Altarion & Aitusa] Could not seed 2014 Wizard / Abjuration content into compendium:", err);
    }
  }

  /**
   * Remove legacy, duplicate-size, and old non-Plutonium manual items from actor
   */
  static async cleanupLegacyItems(actor, { isPlutoniumReady = false } = {}) {
    const toDelete = actor.items.filter(i => {
      if (this.LEGACY_NAMES.includes(i.name)) return true;

      // If Plutonium is ready, remove old manually-created module feats/subclasses that lack Plutonium flags
      if (
        isPlutoniumReady &&
        (i.type === "feat" || i.type === "subclass") &&
        !i.flags?.plutonium &&
        (
          i.flags?.["altarion-aitusa"] ||
          i.system?.requirements?.includes("Dragon Rider") ||
          i.system?.requirements?.includes("School of Abjuration")
        )
      ) {
        return true;
      }
      return false;
    }).map(i => i.id);

    if (toDelete.length > 0) {
      await actor.deleteEmbeddedDocuments("Item", toDelete);
      console.log(`[Altarion & Aitusa] Cleaned up ${toDelete.length} legacy/non-Plutonium items from ${actor.name}`);
    }
  }

  /**
   * Deduplicate repeated feature items (`feat`) on Altarion or Aitusa (such as multiple copies of
   * `Abjuration Savant` or `Arcane Ward` created by earlier multi-step advancements), keeping 1 canonical copy.
   */
  static async cleanupDuplicateFeatures(actor) {
    if (!actor) return;
    const groups = new Map();

    for (const item of actor.items) {
      if (item.type !== "feat") continue;
      const normName = String(item.name || "").trim().toLowerCase();
      if (!normName || normName === "ability score improvement") continue;

      const reqLower = String(item.system?.requirements || "").toLowerCase();
      const isSecBucket =
        Boolean(item.flags?.["altarion-aitusa"]?.isSecondaryClassItem) ||
        reqLower.includes("wizard") ||
        reqLower.includes("abjuration");
      const groupKey = `${normName}::${isSecBucket ? "sec" : "pri"}`;

      if (!groups.has(groupKey)) groups.set(groupKey, []);
      groups.get(groupKey).push(item);
    }

    const duplicateIds = [];
    const scoreItem = (it) => {
      let score = 0;
      if (it.flags?.["altarion-aitusa"]?.featureKey) score += 4;
      if (it.flags?.plutonium) score += 2;
      if (it.flags?.dnd5e?.advancementOrigin) score += 1;
      return score;
    };

    for (const list of groups.values()) {
      if (list.length <= 1) continue;
      list.sort((a, b) => scoreItem(b) - scoreItem(a));
      for (let idx = 1; idx < list.length; idx++) {
        duplicateIds.push(list[idx].id);
      }
    }

    if (duplicateIds.length > 0) {
      await actor.deleteEmbeddedDocuments("Item", duplicateIds);
      console.log(`[Altarion & Aitusa] Removed ${duplicateIds.length} duplicate feature items from ${actor.name}`);
    }
  }

  /**
   * Pull and synchronize class/subclass features directly from Compendium via ItemGrant advancements,
   * matching native dnd5e / Plutonium behavior without creating duplicates.
   */
  static async syncCompendiumAdvancementFeatures(actor, parentItem, maxLevel) {
    if (!actor || !parentItem) return;

    const rawAdvSource = foundry.utils.deepClone(parentItem.toObject().system?.advancement);
    const advList = this.getAdvancementArray(rawAdvSource);
    if (advList.length === 0) return;

    const isArraySource = Array.isArray(rawAdvSource);
    const advUpdates = {};
    let advancementUpdated = false;

    for (const adv of advList) {
      if (adv?.type !== "ItemGrant") continue;
      const advId = adv._id || adv.id;
      const advLevel = Number(adv.level ?? 0);
      if (advLevel <= 0 || advLevel > maxLevel) continue;

      adv.value = adv.value || {};
      const cleanedAdded = {};
      for (const [addedId, addedUuid] of Object.entries(adv.value.added || {})) {
        if (actor.items.has(addedId)) {
          cleanedAdded[addedId] = addedUuid;
        } else {
          advancementUpdated = true;
        }
      }
      adv.value.added = cleanedAdded;

      const rawItems = adv.configuration?.items;
      const grantEntries = rawItems instanceof Set
        ? Array.from(rawItems)
        : (Array.isArray(rawItems) ? rawItems : []);
      const seenUuids = new Set();

      for (const entry of grantEntries) {
        const uuid = typeof entry === "string" ? entry : entry?.uuid;
        if (!uuid || seenUuids.has(uuid)) continue;
        seenUuids.add(uuid);

        let doc = null;
        try {
          doc = await fromUuid(uuid);
        } catch (err) {
          console.warn(`[Altarion & Aitusa] Could not resolve compendium UUID ${uuid}:`, err);
        }
        if (!doc) continue;

        const docFeatureKey = doc.flags?.["altarion-aitusa"]?.featureKey;
        const docNormName = doc.name.trim().toLowerCase();
        let existingItem = actor.items.find(i =>
          i.flags?.dnd5e?.sourceId === uuid ||
          i._stats?.compendiumSource === uuid ||
          (docFeatureKey && i.flags?.["altarion-aitusa"]?.featureKey === docFeatureKey) ||
          (adv.value?.added && Object.entries(adv.value.added).some(([id, u]) => u === uuid && i.id === id)) ||
          (
            i.type === doc.type &&
            i.name.trim().toLowerCase() === docNormName &&
            (
              Boolean(i.flags?.["altarion-aitusa"]?.isSecondaryClassItem) ||
              String(i.flags?.dnd5e?.advancementOrigin || "").startsWith(parentItem.id) ||
              String(i.system?.requirements || "").toLowerCase().includes("wizard") ||
              String(i.system?.requirements || "").toLowerCase().includes("abjuration")
            )
          )
        );

        if (!existingItem) {
          const itemData = game.items?.fromCompendium
            ? game.items.fromCompendium(doc, { clearFolder: true, clearSort: true, keepId: false })
            : doc.toObject();

          itemData._stats = foundry.utils.mergeObject(itemData._stats || {}, {
            compendiumSource: uuid
          });
          itemData.flags = foundry.utils.mergeObject(itemData.flags || {}, {
            dnd5e: {
              sourceId: uuid,
              advancementOrigin: advId ? `${parentItem.id}.${advId}` : parentItem.id
            },
            "altarion-aitusa": {
              isSecondaryClassItem: true,
              levelRequired: advLevel,
              ...(docFeatureKey ? { featureKey: docFeatureKey } : {})
            }
          });

          const created = await actor.createEmbeddedDocuments("Item", [itemData]);
          if (created?.[0]) {
            adv.value.added[created[0].id] = uuid;
            advancementUpdated = true;
            if (!isArraySource && advId) {
              advUpdates[`system.advancement.${advId}.value.added`] = adv.value.added;
            }
          }
        } else {
          const itemUpdates = {};
          if (!existingItem.flags?.["altarion-aitusa"]?.isSecondaryClassItem) {
            itemUpdates["flags.altarion-aitusa.isSecondaryClassItem"] = true;
          }
          if (Number(existingItem.flags?.["altarion-aitusa"]?.levelRequired || 0) !== advLevel) {
            itemUpdates["flags.altarion-aitusa.levelRequired"] = advLevel;
          }
          if (docFeatureKey && existingItem.flags?.["altarion-aitusa"]?.featureKey !== docFeatureKey) {
            itemUpdates["flags.altarion-aitusa.featureKey"] = docFeatureKey;
          }
          if (!existingItem.flags?.dnd5e?.sourceId) {
            itemUpdates["flags.dnd5e.sourceId"] = uuid;
          }
          const curOrigin = String(existingItem.flags?.dnd5e?.advancementOrigin || "");
          if (!curOrigin || !curOrigin.startsWith(parentItem.id)) {
            itemUpdates["flags.dnd5e.advancementOrigin"] = advId ? `${parentItem.id}.${advId}` : parentItem.id;
          }
          if (!foundry.utils.isEmpty(itemUpdates)) {
            await existingItem.update(itemUpdates);
          }
          if (adv.value.added[existingItem.id] !== uuid) {
            adv.value.added[existingItem.id] = uuid;
            advancementUpdated = true;
            if (!isArraySource && advId) {
              advUpdates[`system.advancement.${advId}.value.added`] = adv.value.added;
            }
          }
        }
      }

      if (!isArraySource && advId && advancementUpdated) {
        advUpdates[`system.advancement.${advId}.value.added`] = adv.value.added;
      }
    }

    if (advancementUpdated) {
      if (isArraySource) {
        await parentItem.update({ "system.advancement": rawAdvSource });
      } else if (!foundry.utils.isEmpty(advUpdates)) {
        await parentItem.update(advUpdates);
      }
    }
  }

  /**
  /**
   * Synchronize a list of Plutonium-converted features onto an Actor, creating missing items
   * and automatically updating size-scaled features, activities, active effects, and class/subclass
   * advancementOrigin grouping so features appear under their proper sheet headers.
   */
  static async syncConvertedFeatureList(
    actor,
    convertedFeatures,
    { flagName, maxLevel, classItemId = null, subclassItemId = null, raceItemId = null }
  ) {
    if (!actor || !Array.isArray(convertedFeatures)) return;

    // 1. Remove features from this class that exceed current maxLevel (if user reduced class level)
    const toRemoveHigherLevel = actor.items
      .filter(
        i =>
          i.type === "feat" &&
          i.flags?.["altarion-aitusa"]?.[flagName] &&
          !i.flags?.["altarion-aitusa"]?.isRacialFeature &&
          Number(i.flags?.["altarion-aitusa"]?.levelRequired || 0) > maxLevel
      )
      .map(i => i.id);

    if (toRemoveHigherLevel.length > 0) {
      await actor.deleteEmbeddedDocuments("Item", toRemoveHigherLevel);
    }

    // 2. Create or update features up to maxLevel
    const itemsToCreate = [];
    const itemsToUpdate = [];
    const effectsToCreateByItem = [];

    for (const rawFeatData of convertedFeatures) {
      const featData = foundry.utils.deepClone(rawFeatData);
      const fKey = featData.flags?.["altarion-aitusa"]?.featureKey;
      const plutHash = featData.flags?.plutonium?.hash;
      const isAsi = featData.name.toLowerCase() === "ability score improvement";
      const originCategory = featData.flags?.["altarion-aitusa"]?.originCategory || "class";
      const originItemId =
        originCategory === "race"
          ? raceItemId
          : originCategory === "subclass"
            ? subclassItemId || classItemId
            : classItemId;

      if (originItemId) {
        featData.flags = foundry.utils.mergeObject(featData.flags || {}, {
          dnd5e: {
            advancementOrigin: originItemId,
            advancementRoot: originItemId
          }
        });
      }

      const existing = actor.items.find(i => {
        if (i.type !== "feat") return false;
        if (fKey && i.flags?.["altarion-aitusa"]?.featureKey === fKey) return true;
        if (plutHash && i.flags?.plutonium?.hash === plutHash) return true;
        if (
          !isAsi &&
          i.name.toLowerCase() === featData.name.toLowerCase() &&
          (Boolean(i.flags?.["altarion-aitusa"]?.[flagName]) ||
            i.system?.requirements?.includes("Dragon Rider") ||
            i.system?.requirements?.includes("Dragon") ||
            i.system?.requirements?.includes("Ivarian High Elf"))
        ) {
          return true;
        }
        return false;
      });

      if (!existing) {
        itemsToCreate.push(featData);
      } else {
        const newSizeLabel = featData.flags?.["altarion-aitusa"]?.dragonSizeLabel;
        const oldSizeLabel = existing.flags?.["altarion-aitusa"]?.dragonSizeLabel;
        const isScaled = Boolean(featData.flags?.["altarion-aitusa"]?.isScaledByDragonSize);
        const descChanged = (existing.system?.description?.value || "") !== (featData.system?.description?.value || "");
        const imgChanged = Boolean(featData.img && existing.img !== featData.img);
        const oldSchema = Number(existing.flags?.["altarion-aitusa"]?.syncSchemaVersion || 0);
        const newSchema = Number(featData.flags?.["altarion-aitusa"]?.syncSchemaVersion || 6);
        const curOrigin = existing.getFlag("dnd5e", "advancementOrigin");
        const originChanged = Boolean(
          originItemId && curOrigin !== originItemId && !String(curOrigin || "").startsWith(`${originItemId}.`)
        );

        if (
          (isScaled && newSizeLabel !== oldSizeLabel) ||
          descChanged ||
          imgChanged ||
          oldSchema < newSchema ||
          originChanged ||
          !existing.flags?.plutonium
        ) {
          const activitiesUpdate = foundry.utils.deepClone(featData.system.activities || {});
          const existingActivities = existing.toObject().system?.activities || {};
          for (const oldKey of Object.keys(existingActivities)) {
            if (!(oldKey in activitiesUpdate)) {
              activitiesUpdate[`-=${oldKey}`] = null;
            }
          }

          const updateObj = {
            _id: existing.id,
            name: featData.name,
            img: featData.img,
            "system.description": featData.system.description,
            "system.source": featData.system.source,
            "system.type": featData.system.type || { value: "class" },
            "system.activities": activitiesUpdate,
            "system.uses": featData.system.uses || { spent: 0, max: "", recovery: [] },
            flags: foundry.utils.mergeObject(existing.toObject().flags || {}, featData.flags || {})
          };
          if (featData.system.requirements !== undefined) {
            updateObj["system.requirements"] = featData.system.requirements;
          }
          if (featData.system.target !== undefined) {
            updateObj["system.target"] = featData.system.target;
          }
          itemsToUpdate.push(updateObj);
        }

        if (Array.isArray(featData.effects) && featData.effects.length > 0) {
          const missingEffects = featData.effects.filter(
            eff => !existing.effects.some(e => e.name === eff.name)
          );
          if (missingEffects.length > 0) {
            effectsToCreateByItem.push({ item: existing, effects: missingEffects });
          }
        }
      }
    }

    if (itemsToCreate.length > 0) {
      await actor.createEmbeddedDocuments("Item", itemsToCreate);
    }
    if (itemsToUpdate.length > 0) {
      await actor.updateEmbeddedDocuments("Item", itemsToUpdate);
    }
    for (const { item, effects } of effectsToCreateByItem) {
      try {
        await item.createEmbeddedDocuments(
          "ActiveEffect",
          effects.map(e => {
            const cpy = foundry.utils.deepClone(e);
            delete cpy._id;
            return cpy;
          })
        );
      } catch (err) {
        console.warn(`[Altarion & Aitusa] Could not create passive effect on ${item.name}:`, err);
      }
    }
  }

  /**
   * Synchronize the "Ancestral Weapon" inventory item on Altarion (unlocked at level 3)
   */
  static async syncAncestralWeapon(actor, ancestralWeaponData, riderLevel) {
    if (!actor) return;
    const existingWpn = actor.items.find(
      i =>
        i.type === "weapon" &&
        (i.flags?.["altarion-aitusa"]?.isAncestralWeapon || i.name.toLowerCase() === "ancestral weapon")
    );

    if (riderLevel < 3) {
      if (existingWpn) await existingWpn.delete();
      return;
    }

    if (!ancestralWeaponData) return;

    if (!existingWpn) {
      await actor.createEmbeddedDocuments("Item", [foundry.utils.deepClone(ancestralWeaponData)]);
    } else if (
      Number(existingWpn.flags?.["altarion-aitusa"]?.syncSchemaVersion || 0) < 6 ||
      existingWpn.img !== ancestralWeaponData.img
    ) {
      const wpnClone = foundry.utils.deepClone(ancestralWeaponData);
      await existingWpn.update({
        name: wpnClone.name,
        img: wpnClone.img,
        "system.description": wpnClone.system.description,
        "system.type": wpnClone.system.type,
        "system.properties": wpnClone.system.properties,
        "system.proficient": 1,
        "system.ability": "str",
        "system.damage": wpnClone.system.damage,
        "system.activities": wpnClone.system.activities,
        flags: foundry.utils.mergeObject(existingWpn.toObject().flags || {}, wpnClone.flags || {})
      });
    }
  }

  /**
   * Synchronize a Race item onto Altarion ("Ivarian High Elf") or Aitusa ("Dragon")
   */
  static async syncRaceItem(actor, raceData) {
    if (!actor || !raceData) return null;

    let raceItem = actor.items.find(i => i.type === "race");
    const clone = foundry.utils.deepClone(raceData);

    if (!raceItem) {
      const created = await actor.createEmbeddedDocuments("Item", [clone]);
      raceItem = created?.[0] || null;
    } else if (
      raceItem.name !== clone.name ||
      raceItem.img !== clone.img ||
      (raceItem.system?.description?.value || "") !== (clone.system?.description?.value || "") ||
      Number(raceItem.flags?.["altarion-aitusa"]?.syncSchemaVersion || 0) < 6
    ) {
      await raceItem.update({
        name: clone.name,
        img: clone.img,
        "system.identifier": clone.system.identifier,
        "system.description": clone.system.description,
        "system.source": clone.system.source,
        "system.type": clone.system.type,
        flags: foundry.utils.mergeObject(raceItem.toObject().flags || {}, clone.flags || {})
      });
    }

    return raceItem;
  }

  /**
   * Synchronize Altarion's exclusive spell "Altarion's Echoing Ward"
   */
  static async syncEchoingWardSpell(actor, echoingWardSpellData) {
    if (!actor || !echoingWardSpellData) return;

    const existingSpell = actor.items.find(
      i =>
        i.type === "spell" &&
        (i.flags?.["altarion-aitusa"]?.isExclusiveSpell ||
          i.name.toLowerCase().replace(/’/g, "'") === "altarion's echoing ward")
    );

    const spellClone = foundry.utils.deepClone(echoingWardSpellData);
    if (!existingSpell) {
      await actor.createEmbeddedDocuments("Item", [spellClone]);
    } else if (
      Number(existingSpell.flags?.["altarion-aitusa"]?.syncSchemaVersion || 0) < 7 ||
      existingSpell.img !== spellClone.img ||
      (existingSpell.system?.description?.value || "") !== (spellClone.system?.description?.value || "")
    ) {
      await existingSpell.update({
        name: spellClone.name,
        img: spellClone.img,
        "system.description": spellClone.system.description,
        "system.source": spellClone.system.source,
        "system.level": spellClone.system.level,
        "system.school": spellClone.system.school,
        "system.properties": spellClone.system.properties,
        "system.activation": spellClone.system.activation,
        "system.duration": spellClone.system.duration,
        "system.range": spellClone.system.range,
        "system.target": spellClone.system.target,
        "system.activities": spellClone.system.activities,
        flags: foundry.utils.mergeObject(existingSpell.toObject().flags || {}, spellClone.flags || {})
      });
    }
  }

  /**
   * Upgrade or clean up any legacy "Armor of Agathys" or "Armor of Agathys (Linked Casting)"
   * ActiveEffects on Altarion or Aitusa so they use the new "Arcane Armor" icon, name, and Force description.
   */
  static async cleanupLegacyArmorOfAgathysEffects(actor) {
    if (!actor || !actor.effects) return;

    const newImg = "modules/altarion-aitusa/dr_icons/arcane-armor.jpg";
    const newDesc = `<div class="rd__b  rd__b--2"><p>A protective magical force surrounds you, manifesting as crystalline plates of pure arcane energy that cover you and your gear. You gain <strong>5 temporary hit points</strong> for the duration. If a creature hits you with a melee attack while you have these temporary hit points, the creature takes <strong>5 force damage</strong> <em>(converted from cold damage via Dragon Ancestry)</em>.</p><div class="rd__b  rd__b--3"><span class="rd__h rd__h--3" data-title-index="1"> <span class="entry-title-inner">At Higher Levels.</span></span> <p>When you cast this spell using a spell slot of 2nd level or higher, both the temporary hit points and the force damage increase by <strong>5</strong> for each slot level above 1st (<strong>5 &times; Spell Slot Level</strong>).</p></div></div>`;

    const toDeleteIds = [];
    const toUpdate = [];

    for (const eff of actor.effects) {
      const nLower = String(eff.name || "").trim().toLowerCase();
      if (nLower.includes("armor of agathys")) {
        const curTemp = Number(actor.system?.attributes?.hp?.temp ?? 0);
        if (curTemp <= 0) {
          toDeleteIds.push(eff.id);
        } else {
          const isLinked = nLower.includes("linked casting");
          toUpdate.push({
            _id: eff.id,
            name: isLinked ? "Arcane Armor (Linked Casting)" : "Arcane Armor",
            img: newImg,
            description: newDesc,
            statuses: ["arcane-armor"],
            "flags.altarion-aitusa.statusId": "arcane-armor",
            "flags.altarion-aitusa.isArcaneArmorEffect": true,
            "flags.altarion-aitusa.armorLabel": "Arcane Armor",
            "flags.altarion-aitusa.retaliationDamageType": "force"
          });
        }
      } else if (
        nLower.startsWith("arcane armor") &&
        (eff.img !== newImg || String(eff.description || "").toLowerCase().includes("cold damage") && !String(eff.description || "").toLowerCase().includes("force damage"))
      ) {
        toUpdate.push({
          _id: eff.id,
          img: newImg,
          description: newDesc
        });
      }
    }

    if (toDeleteIds.length > 0) {
      await actor.deleteEmbeddedDocuments("ActiveEffect", toDeleteIds);
    }
    if (toUpdate.length > 0) {
      await actor.updateEmbeddedDocuments("ActiveEffect", toUpdate);
    }
  }

  /**
   * Synchronize Altarion's 2nd-level Abjuration spell "Abjuration Bulwark"
   * (1/Long Rest free cast + normal spell slot cast).
   */
  static async syncAbjurationBulwarkSpell(actor, abjurationBulwarkSpellData) {
    if (!actor || !abjurationBulwarkSpellData) return;

    const existingSpells = actor.items.filter(
      i =>
        i.type === "spell" &&
        (i.flags?.["altarion-aitusa"]?.isAbjurationBulwarkSpell ||
          i.name?.trim().toLowerCase() === "abjuration bulwark")
    );
    const existingSpell = existingSpells[0] || null;
    if (existingSpells.length > 1) {
      await actor.deleteEmbeddedDocuments(
        "Item",
        existingSpells.slice(1).map(i => i.id)
      );
    }

    const spellClone = foundry.utils.deepClone(abjurationBulwarkSpellData);
    if (!existingSpell) {
      await actor.createEmbeddedDocuments("Item", [spellClone]);
    } else if (
      Number(existingSpell.flags?.["altarion-aitusa"]?.syncSchemaVersion || 0) < 11 ||
      existingSpell.img !== spellClone.img ||
      (existingSpell.system?.description?.value || "") !== (spellClone.system?.description?.value || "")
    ) {
      await existingSpell.update({
        name: spellClone.name,
        img: spellClone.img,
        "system.description": spellClone.system.description,
        "system.source": spellClone.system.source,
        "system.level": spellClone.system.level,
        "system.school": spellClone.system.school,
        "system.properties": spellClone.system.properties,
        "system.materials": spellClone.system.materials,
        "system.uses": spellClone.system.uses,
        "system.activation": spellClone.system.activation,
        "system.duration": spellClone.system.duration,
        "system.range": spellClone.system.range,
        "system.target": spellClone.system.target,
        "system.activities": spellClone.system.activities,
        flags: foundry.utils.mergeObject(existingSpell.toObject().flags || {}, spellClone.flags || {})
      });
    }
  }

  /**
   * Synchronize Altarion's 1st-level Abjuration spell "Arcane Armor" (Force-damage rebuild of Armor of Agathys
   * with fixed 5 * Slot Level upcast scaling), removing any legacy Plutonium "Armor of Agathys" spell item.
   */
  static async syncArcaneArmorSpell(actor, arcaneArmorSpellData) {
    if (!actor || !arcaneArmorSpellData) return;

    // Remove legacy Plutonium "Armor of Agathys" spells on Altarion so "Arcane Armor" cleanly replaces it
    const legacyAgathysIds = actor.items
      .filter(i => i.type === "spell" && i.name?.trim().toLowerCase() === "armor of agathys")
      .map(i => i.id);
    if (legacyAgathysIds.length > 0) {
      await actor.deleteEmbeddedDocuments("Item", legacyAgathysIds);
    }

    const existingSpells = actor.items.filter(
      i =>
        i.type === "spell" &&
        (i.flags?.["altarion-aitusa"]?.isArcaneArmorSpell ||
          i.name?.trim().toLowerCase() === "arcane armor")
    );
    const existingSpell = existingSpells[0] || null;
    if (existingSpells.length > 1) {
      await actor.deleteEmbeddedDocuments(
        "Item",
        existingSpells.slice(1).map(i => i.id)
      );
    }

    const spellClone = foundry.utils.deepClone(arcaneArmorSpellData);
    if (!existingSpell) {
      await actor.createEmbeddedDocuments("Item", [spellClone]);
    } else if (
      Number(existingSpell.flags?.["altarion-aitusa"]?.syncSchemaVersion || 0) < 10 ||
      existingSpell.img !== spellClone.img ||
      (existingSpell.system?.description?.value || "") !== (spellClone.system?.description?.value || "")
    ) {
      await existingSpell.update({
        name: spellClone.name,
        img: spellClone.img,
        "system.description": spellClone.system.description,
        "system.source": spellClone.system.source,
        "system.level": spellClone.system.level,
        "system.school": spellClone.system.school,
        "system.properties": spellClone.system.properties,
        "system.materials": spellClone.system.materials,
        "system.activation": spellClone.system.activation,
        "system.duration": spellClone.system.duration,
        "system.range": spellClone.system.range,
        "system.target": spellClone.system.target,
        "system.activities": spellClone.system.activities,
        flags: foundry.utils.mergeObject(existingSpell.toObject().flags || {}, spellClone.flags || {})
      });
    }
  }

  /**
   * Synchronize Altarion's custom Force-damage cantrips ("Arcane Bolt" replacing Fire Bolt,
   * and "Arcane Blade" replacing Booming Blade).
   */
  static async syncAltarionCustomCantrips(actor, { arcaneBoltSpellData = null, arcaneBladeSpellData = null } = {}) {
    if (!actor) return;

    // Remove legacy Fire Bolt and Booming Blade spells on Altarion
    const legacyCantripIds = actor.items
      .filter(
        i =>
          i.type === "spell" &&
          ["fire bolt", "booming blade"].includes(i.name?.trim().toLowerCase())
      )
      .map(i => i.id);
    if (legacyCantripIds.length > 0) {
      await actor.deleteEmbeddedDocuments("Item", legacyCantripIds);
    }

    const customCantrips = [
      { data: arcaneBoltSpellData, flagKey: "isArcaneBoltSpell", lowerName: "arcane bolt" },
      { data: arcaneBladeSpellData, flagKey: "isArcaneBladeSpell", lowerName: "arcane blade" }
    ];

    for (const { data, flagKey, lowerName } of customCantrips) {
      if (!data) continue;
      const matches = actor.items.filter(
        i =>
          i.type === "spell" &&
          (i.flags?.["altarion-aitusa"]?.[flagKey] || i.name?.trim().toLowerCase() === lowerName)
      );
      const existing = matches[0] || null;
      if (matches.length > 1) {
        await actor.deleteEmbeddedDocuments(
          "Item",
          matches.slice(1).map(i => i.id)
        );
      }

      const spellClone = foundry.utils.deepClone(data);
      if (!existing) {
        await actor.createEmbeddedDocuments("Item", [spellClone]);
      } else if (
        Number(existing.flags?.["altarion-aitusa"]?.syncSchemaVersion || 0) < 10 ||
        existing.img !== spellClone.img ||
        (existing.system?.description?.value || "") !== (spellClone.system?.description?.value || "")
      ) {
        await existing.update({
          name: spellClone.name,
          img: spellClone.img,
          "system.description": spellClone.system.description,
          "system.source": spellClone.system.source,
          "system.level": spellClone.system.level,
          "system.school": spellClone.system.school,
          "system.properties": spellClone.system.properties,
          "system.materials": spellClone.system.materials,
          "system.activation": spellClone.system.activation,
          "system.duration": spellClone.system.duration,
          "system.range": spellClone.system.range,
          "system.target": spellClone.system.target,
          "system.activities": spellClone.system.activities,
          flags: foundry.utils.mergeObject(existing.toObject().flags || {}, spellClone.flags || {})
        });
      }
    }
  }

  /**
   * Guarantee Aitusa ALWAYS has access to ALL spells in Altarion's spell list,
   * while giving Aitusa's "Arcane Bolt" its dedicated purple impact icon
   * ("icons/magic/light/explosion-impact-purple.webp").
   */
  static async syncAitusaSpellsFromAltarion(altarion, aitusa) {
    if (!altarion || !aitusa || !aitusa.isOwner || this._mirroringSpells) return;
    this._mirroringSpells = true;

    try {
      const normalizeSpellName = (s) => String(s || "").trim().toLowerCase().replace(/’/g, "'");

      // 1. Remove any legacy replaced spells on Aitusa
      const legacyOnAitusaIds = aitusa.items
        .filter(
          i =>
            i.type === "spell" &&
            ["fire bolt", "booming blade", "armor of agathys"].includes(normalizeSpellName(i.name))
        )
        .map(i => i.id);
      if (legacyOnAitusaIds.length > 0) {
        await aitusa.deleteEmbeddedDocuments("Item", legacyOnAitusaIds);
      }

      // 2. Collect unique spells from Altarion's spell list
      const altarionSpellsByName = new Map();
      for (const sp of altarion.items) {
        if (sp.type !== "spell") continue;
        const nKey = normalizeSpellName(sp.name);
        if (!nKey || ["fire bolt", "booming blade", "armor of agathys"].includes(nKey)) continue;
        if (!altarionSpellsByName.has(nKey)) {
          altarionSpellsByName.set(nKey, sp);
        }
      }

      const validAltarionSpellIds = new Set(Array.from(altarionSpellsByName.values()).map(s => s.id));
      const validAltarionSpellNames = new Set(altarionSpellsByName.keys());

      // 3. Remove mirrored spells on Aitusa that were deleted from Altarion (plus deduplicate same-named spells)
      const aitusaSpellsByName = new Map();
      const staleIds = [];
      for (const sp of aitusa.items) {
        if (sp.type !== "spell") continue;
        const nKey = normalizeSpellName(sp.name);
        const mirroredId = sp.flags?.["altarion-aitusa"]?.mirroredFromAltarionSpellId;
        const isMirrored = Boolean(sp.flags?.["altarion-aitusa"]?.isMirroredFromAltarion);

        if (isMirrored && !validAltarionSpellIds.has(mirroredId) && !validAltarionSpellNames.has(nKey)) {
          staleIds.push(sp.id);
          continue;
        }
        if (aitusaSpellsByName.has(nKey)) {
          staleIds.push(sp.id);
        } else {
          aitusaSpellsByName.set(nKey, sp);
        }
      }
      if (staleIds.length > 0) {
        await aitusa.deleteEmbeddedDocuments("Item", staleIds);
      }

      // 4. Create or update every spell from Altarion onto Aitusa
      const toCreate = [];
      const toUpdate = [];

      for (const [nKey, altSpell] of altarionSpellsByName.entries()) {
        const isArcaneBolt =
          nKey === "arcane bolt" || Boolean(altSpell.flags?.["altarion-aitusa"]?.isArcaneBoltSpell);
        const desiredImg = isArcaneBolt
          ? "icons/magic/light/explosion-impact-purple.webp"
          : altSpell.img;

        const clone = altSpell.toObject();
        delete clone._id;
        clone.img = desiredImg;
        clone.system = clone.system || {};
        clone.system.method = clone.system.method || "spell";
        clone.system.prepared = 1;
        clone.flags = foundry.utils.mergeObject(clone.flags || {}, {
          plutonium: {
            ...(clone.flags?.plutonium || {}),
            isDirectImport: true,
            isStandardDragDrop: true
          },
          "altarion-aitusa": {
            ...(clone.flags?.["altarion-aitusa"] || {}),
            isMirroredFromAltarion: true,
            mirroredFromAltarionSpellId: altSpell.id
          }
        });

        const existingOnAitusa =
          aitusa.items.find(
            i =>
              i.type === "spell" &&
              (i.flags?.["altarion-aitusa"]?.mirroredFromAltarionSpellId === altSpell.id ||
                normalizeSpellName(i.name) === nKey)
          ) || null;

        if (!existingOnAitusa) {
          toCreate.push(clone);
        } else {
          const needsUpdate =
            existingOnAitusa.name !== clone.name ||
            existingOnAitusa.img !== desiredImg ||
            Number(existingOnAitusa.system?.level ?? 0) !== Number(clone.system?.level ?? 0) ||
            String(existingOnAitusa.system?.school || "") !== String(clone.system?.school || "") ||
            Number(existingOnAitusa.system?.prepared ?? 0) !== 1 ||
            (existingOnAitusa.system?.description?.value || "") !== (clone.system?.description?.value || "") ||
            existingOnAitusa.flags?.["altarion-aitusa"]?.mirroredFromAltarionSpellId !== altSpell.id ||
            Number(existingOnAitusa.flags?.["altarion-aitusa"]?.syncSchemaVersion || 0) !==
              Number(clone.flags?.["altarion-aitusa"]?.syncSchemaVersion || 0);

          if (needsUpdate) {
            toUpdate.push({
              _id: existingOnAitusa.id,
              name: clone.name,
              img: desiredImg,
              "system.description": clone.system.description,
              "system.source": clone.system.source,
              "system.level": clone.system.level,
              "system.school": clone.system.school,
              "system.properties": clone.system.properties,
              "system.materials": clone.system.materials,
              "system.method": clone.system.method,
              "system.prepared": 1,
              "system.activation": clone.system.activation,
              "system.duration": clone.system.duration,
              "system.range": clone.system.range,
              "system.target": clone.system.target,
              "system.activities": clone.system.activities,
              flags: foundry.utils.mergeObject(existingOnAitusa.toObject().flags || {}, clone.flags || {})
            });
          }
        }
      }

      if (toCreate.length > 0) {
        await aitusa.createEmbeddedDocuments("Item", toCreate);
      }
      if (toUpdate.length > 0) {
        await aitusa.updateEmbeddedDocuments("Item", toUpdate);
      }
    } catch (err) {
      console.warn("[Altarion & Aitusa] Error mirroring Altarion's spells onto Aitusa:", err);
    } finally {
      this._mirroringSpells = false;
    }
  }

  /**
   * Real-time hook handler whenever a spell item is created, updated, or deleted on Altarion:
   * - Automatically upgrades legacy "Fire Bolt" -> "Arcane Bolt", "Booming Blade" -> "Arcane Blade",
   *   and "Armor of Agathys" -> "Arcane Armor".
   * - Immediately mirrors Altarion's full spell list onto Aitusa so Aitusa always has access to all of Altarion's spells.
   */
  static async handleAltarionSpellHook(hookName, altarion, spellItem, aitusa = null) {
    if (!altarion || !altarion.isOwner || this._syncing.has(altarion.id) || this._mirroringSpells) return;

    if (hookName === "createItem" && spellItem) {
      const lowerName = String(spellItem.name || "").trim().toLowerCase();
      if (lowerName === "fire bolt") {
        const boltData = await PlutoniumDataBridge.pBuildArcaneBoltSpell({ forAitusa: false });
        await this.syncAltarionCustomCantrips(altarion, { arcaneBoltSpellData: boltData });
      } else if (lowerName === "booming blade") {
        const bladeData = await PlutoniumDataBridge.pBuildArcaneBladeSpell();
        await this.syncAltarionCustomCantrips(altarion, { arcaneBladeSpellData: bladeData });
      } else if (lowerName === "armor of agathys") {
        const armorData = await PlutoniumDataBridge.pBuildArcaneArmorSpell();
        await this.syncArcaneArmorSpell(altarion, armorData);
      }
    }

    if (!aitusa) {
      const aitusaName = game.settings.get("altarion-aitusa", "aitusaName") || "Aitusa";
      aitusa = game.actors?.find(a => a.name?.trim().toLowerCase() === aitusaName.trim().toLowerCase());
    }
    if (aitusa?.isOwner) {
      await this.syncAitusaSpellsFromAltarion(altarion, aitusa);
      if (aitusa.sheet?.rendered) aitusa.sheet.render(false);
    }
  }

  /**
   * Synchronize Altarion's "Arcane Ward" tertiary resource (Max = 2 * Wizard Level + INT Modifier)
   * and configure Token Bar 2 (`bar2.attribute = "resources.tertiary"`) on prototype and scene tokens
   * whenever Altarion has School of Abjuration (Wizard Lvl 2+) / the "Arcane Ward" feature.
   */
  static async syncArcaneWardResource(actor) {
    if (!actor) return;

    const wizardItem = actor.items.find(
      i =>
        i.type === "class" &&
        (i.system?.identifier === "wizard" || i.name?.trim().toLowerCase() === "wizard")
    );
    const wizardLevel = Number(wizardItem?.system?.levels || 0);
    const abjurationSubclass = actor.items.find(
      i =>
        i.type === "subclass" &&
        i.system?.classIdentifier === "wizard" &&
        (i.system?.identifier === "abjuration" || i.name?.trim().toLowerCase() === "school of abjuration")
    );
    const hasArcaneWardFeat = actor.items.some(
      i => i.type === "feat" && i.name?.trim().toLowerCase() === "arcane ward"
    );
    const hasArcaneWard = (wizardLevel >= 2 && Boolean(abjurationSubclass)) || (wizardLevel >= 2 && hasArcaneWardFeat);

    const tert = actor.system?.resources?.tertiary || {};

    if (!hasArcaneWard) {
      const cleanupUpdates = {};
      if (tert.label === "Arcane Ward") {
        cleanupUpdates["system.resources.tertiary"] = {
          label: "",
          value: 0,
          max: 0,
          sr: false,
          lr: false
        };
      }
      if (actor.getFlag("altarion-aitusa", "arcaneWardActive")) {
        cleanupUpdates["flags.altarion-aitusa.arcaneWardActive"] = false;
      }
      if (actor.prototypeToken?.bar2?.attribute === "resources.tertiary") {
        cleanupUpdates["prototypeToken.bar2.attribute"] = null;
      }
      if (!foundry.utils.isEmpty(cleanupUpdates)) {
        await actor.update(cleanupUpdates, { altarionBypassWard: true });
      }
      for (const scene of game.scenes || []) {
        for (const tokDoc of scene.tokens || []) {
          if (tokDoc.actorId === actor.id && tokDoc.bar2?.attribute === "resources.tertiary" && tokDoc.isOwner) {
            await tokDoc.update({ "bar2.attribute": null });
          }
        }
      }
      return;
    }

    const intMod = Number(actor.system?.abilities?.int?.mod ?? 0);
    const maxWardHp = Math.max(1, 2 * wizardLevel + intMod);
    const wardActive = Boolean(actor.getFlag("altarion-aitusa", "arcaneWardActive"));
    const curVal =
      tert.label === "Arcane Ward" && Number.isFinite(tert.value)
        ? Math.clamp(Number(tert.value), 0, maxWardHp)
        : wardActive
          ? maxWardHp
          : 0;

    const actorUpdates = {};
    if (
      tert.label !== "Arcane Ward" ||
      tert.max !== maxWardHp ||
      tert.value !== curVal ||
      tert.sr !== false ||
      tert.lr !== false
    ) {
      actorUpdates["system.resources.tertiary"] = {
        label: "Arcane Ward",
        value: curVal,
        max: maxWardHp,
        sr: false,
        lr: false
      };
    }

    if (actor.prototypeToken?.bar2?.attribute !== "resources.tertiary") {
      actorUpdates["prototypeToken.bar2.attribute"] = "resources.tertiary";
    }
    const protoDisplayBars = Number(actor.prototypeToken?.displayBars ?? 0);
    if (protoDisplayBars === 0) {
      actorUpdates["prototypeToken.displayBars"] = CONST.TOKEN_DISPLAY_MODES?.OWNER ?? 40;
    }

    if (!foundry.utils.isEmpty(actorUpdates)) {
      await actor.update(actorUpdates, { altarionBypassWard: true });
    }

    // Update placed tokens of Altarion across scenes so the Arcane Ward bar is visible just like the HP bar
    for (const scene of game.scenes || []) {
      for (const tokDoc of scene.tokens || []) {
        if (tokDoc.actorId !== actor.id || !tokDoc.isOwner) continue;
        const tokUpdates = {};
        if (tokDoc.bar2?.attribute !== "resources.tertiary") {
          tokUpdates["bar2.attribute"] = "resources.tertiary";
        }
        if (Number(tokDoc.displayBars ?? 0) === 0) {
          tokUpdates.displayBars = Number(actor.prototypeToken?.displayBars) || (CONST.TOKEN_DISPLAY_MODES?.OWNER ?? 40);
        }
        if (!foundry.utils.isEmpty(tokUpdates)) {
          await tokDoc.update(tokUpdates);
        }
      }
    }
  }

  /**
   * Synchronize Altarion's "Linked Casting" secondary resource (Max = Aitusa's INT modifier, Long Rest recovery)
   */
  static async syncLinkedCastingResource(actor, aitusaActor = null) {
    if (!actor) return;
    if (!aitusaActor) {
      const aitusaName = game.settings.get("altarion-aitusa", "aitusaName") || "Aitusa";
      aitusaActor = game.actors?.find(a => a.name?.trim().toLowerCase() === aitusaName.trim().toLowerCase());
    }

    const aitusaIntMod = Math.max(1, Number(aitusaActor?.system?.abilities?.int?.mod ?? 3));
    const sec = actor.system?.resources?.secondary || {};
    const curVal =
      sec.label === "Linked Casting" && Number.isFinite(sec.value)
        ? Math.clamp(Number(sec.value), 0, aitusaIntMod)
        : aitusaIntMod;

    if (
      sec.label !== "Linked Casting" ||
      sec.max !== aitusaIntMod ||
      sec.value !== curVal ||
      sec.lr !== true
    ) {
      await actor.update({
        "system.resources.secondary": {
          label: "Linked Casting",
          value: curVal,
          max: aitusaIntMod,
          sr: false,
          lr: true
        }
      });
    }
  }

  /**
   * Synchronize Aitusa's "Dragon Attacks" primary resource (Max = Aitusa's STR modifier, Short & Long Rest recovery)
   * for Bite Attack, Tail Attack, and Wing Attack.
   */
  static async syncDragonAttacksResource(actor) {
    if (!actor) return;

    const strMod = Math.max(1, Number(actor.system?.abilities?.str?.mod ?? 2));
    const prim = actor.system?.resources?.primary || {};
    const curVal =
      prim.label === "Dragon Attacks" && Number.isFinite(prim.value)
        ? Math.clamp(Number(prim.value), 0, strMod)
        : strMod;

    if (
      prim.label !== "Dragon Attacks" ||
      prim.max !== strMod ||
      prim.value !== curVal ||
      prim.sr !== true ||
      prim.lr !== true
    ) {
      await actor.update({
        "system.resources.primary": {
          label: "Dragon Attacks",
          value: curVal,
          max: strMod,
          sr: true,
          lr: true
        }
      });
    }
  }

  /**
   * Link the 6 Ancestral Attack features (Ancestral Ward, Ancestral Ray, Ancestral Shielding,
   * Bursting Strike, Ancestral Surge, Ancestral Marking) to consume 1 use of the shared
   * "Ancestral Attacks" feature item (max = Intelligence modifier, Long Rest recovery),
   * and expose "Ancestral Attacks" in the actor's primary resource & favorites for easy visibility.
   */
  static async syncAncestralAttacksResource(actor) {
    if (!actor) return;

    const ancestralAttacksItem = actor.items.find(
      i => i.type === "feat" && i.name.toLowerCase() === "ancestral attacks"
    );
    if (!ancestralAttacksItem) return;

    // 1. Ensure Ancestral Attacks item has max = max(1, @abilities.int.mod) and Long Rest recovery
    if (ancestralAttacksItem.system?.uses?.max !== "max(1, @abilities.int.mod)") {
      await ancestralAttacksItem.update({
        "system.uses.max": "max(1, @abilities.int.mod)",
        "system.uses.recovery": [{ period: "lr", type: "recoverAll" }]
      });
    }

    // 2. Link all 6 Ancestral Attack items to consume 1 use from ancestralAttacksItem.id
    const attackChildren = actor.items.filter(
      i =>
        i.type === "feat" &&
        (i.flags?.["altarion-aitusa"]?.isAncestralAttack ||
          [
            "ancestral ward",
            "ancestral ray",
            "ancestral shielding",
            "bursting strike",
            "ancestral surge",
            "ancestral marking"
          ].includes(i.name.toLowerCase()))
    );

    const itemUpdates = [];
    for (const child of attackChildren) {
      const rawActs = foundry.utils.deepClone(child.toObject().system?.activities || {});
      let changed = false;
      for (const act of Object.values(rawActs)) {
        if (!act || typeof act !== "object") continue;
        const curTarget = act.consumption?.targets?.[0];
        if (!curTarget || curTarget.type !== "itemUses" || curTarget.target !== ancestralAttacksItem.id) {
          act.consumption = {
            scaling: { allowed: false, max: "" },
            spellSlot: false,
            targets: [
              {
                type: "itemUses",
                target: ancestralAttacksItem.id,
                value: "1",
                scaling: { mode: "", formula: "" }
              }
            ]
          };
          changed = true;
        }
      }
      if (changed) {
        itemUpdates.push({
          _id: child.id,
          "system.activities": rawActs,
          "system.uses": { spent: 0, max: "", recovery: [] }
        });
      }
    }

    if (itemUpdates.length > 0) {
      await actor.updateEmbeddedDocuments("Item", itemUpdates);
    }

    // 3. Synchronize actor.system.resources.primary and actor.system.favorites for easy sheet visibility
    const intMod = Math.max(1, Number(actor.system?.abilities?.int?.mod ?? 3));
    const spent = Number(ancestralAttacksItem.system?.uses?.spent ?? 0);
    const remaining = Math.max(0, intMod - spent);

    const actorUpdates = {};
    if (actor.system?.resources?.primary) {
      const prim = actor.system.resources.primary;
      if (
        prim.label !== "Ancestral Attacks" ||
        prim.max !== intMod ||
        prim.value !== remaining ||
        prim.lr !== true
      ) {
        actorUpdates["system.resources.primary"] = {
          label: "Ancestral Attacks",
          value: remaining,
          max: intMod,
          sr: false,
          lr: true
        };
      }
    }

    if (Array.isArray(actor.system?.favorites)) {
      const relUuid = `.Item.${ancestralAttacksItem.id}`;
      const hasFav = actor.system.favorites.some(f => f.id === relUuid);
      if (!hasFav) {
        const favs = foundry.utils.deepClone(actor.system.favorites);
        favs.push({
          type: "item",
          id: relUuid,
          sort: 100000
        });
        actorUpdates["system.favorites"] = favs;
      }
    }

    if (!foundry.utils.isEmpty(actorUpdates)) {
      await actor.update(actorUpdates);
    }
  }

  /**
   * Synchronize Altarion's sheet
   */
  static async syncAltarion(actor) {
    if (!actor || this._syncing.has(actor.id)) return;
    this._syncing.add(actor.id);

    try {
      const isPlutoniumReady = await PlutoniumDataBridge.waitForPlutonium();
      if (isPlutoniumReady && !this._wizardFeatureUuidsByLevel[1]?.length) {
        await this.ensureCompendiumContent();
      }

      await this.cleanupLegacyItems(actor, { isPlutoniumReady });
      await this.cleanupDuplicateFeatures(actor);

      const aitusaName = game.settings.get("altarion-aitusa", "aitusaName") || "Aitusa";
      const aitusaActor = game.actors.find(a => a.name?.trim().toLowerCase() === aitusaName.trim().toLowerCase());
      const aitusaLevel = aitusaActor?.items.find(i => i.type === "class")?.system?.levels || 4;

      // Determine current levels on Altarion before syncing
      let dragonRider = actor.items.find(
        i =>
          i.type === "class" &&
          (i.system.identifier === "dragon-rider" || i.name.toLowerCase() === "dragon rider")
      );
      const riderLevel = dragonRider?.system?.levels || 4;

      let wizard = actor.items.find(
        i =>
          i.type === "class" &&
          (i.flags?.["altarion-aitusa"]?.isSecondaryClass ||
            i.system.identifier === "wizard" ||
            i.name.toLowerCase() === "wizard")
      );
      const wizardLevel = wizard?.system?.levels || 1;

      // 1. Convert & Sync Dragon Rider + Ancestral Magic + Features via Plutonium
      const drBundle = isPlutoniumReady
        ? await PlutoniumDataBridge.pGetAltarionBundle({ actor, riderLevel, dragonLevel: aitusaLevel })
        : null;

      if (drBundle) {
        if (!dragonRider) {
          drBundle.dragonRiderClassData.system.advancement = this.buildAdvancementUpdatePatch(
            null,
            this.deduplicateAdvancementList(drBundle.dragonRiderClassData.system?.advancement, {
              isSecondary: false,
              seedPrefix: "altarion:dragon-rider"
            })
          );
          const created = await actor.createEmbeddedDocuments("Item", [drBundle.dragonRiderClassData]);
          dragonRider = created[0];
        } else {
          const drExistingObj = dragonRider.toObject();
          const drCleanAdv = this.buildAdvancementUpdatePatch(
            drExistingObj.system?.advancement,
            this.deduplicateAdvancementList(drExistingObj.system?.advancement, {
              isSecondary: false,
              seedPrefix: "altarion:dragon-rider"
            })
          );
          await dragonRider.update({
            img: drBundle.dragonRiderClassData.img,
            "system.description.value": drBundle.dragonRiderClassData.system.description.value,
            "system.source": drBundle.dragonRiderClassData.system.source,
            "system.spellcasting": drBundle.dragonRiderClassData.system.spellcasting,
            "system.advancement": drCleanAdv,
            flags: foundry.utils.mergeObject(
              drExistingObj.flags || {},
              drBundle.dragonRiderClassData.flags || {}
            )
          });
        }

        // Sync Ancestral Magic Subclass at level 3+
        let drSubclass = actor.items.find(
          i =>
            i.type === "subclass" &&
            (i.system?.classIdentifier === "dragon-rider" || i.name.toLowerCase() === "ancestral magic")
        );
        if (riderLevel >= 3) {
          if (!drSubclass) {
            drBundle.ancestralSubclassData.system.advancement = this.buildAdvancementUpdatePatch(
              null,
              this.deduplicateAdvancementList(drBundle.ancestralSubclassData.system?.advancement, {
                isSecondary: false,
                seedPrefix: "altarion:ancestral-magic"
              })
            );
            const createdSc = await actor.createEmbeddedDocuments("Item", [drBundle.ancestralSubclassData]);
            drSubclass = createdSc[0];
          } else {
            const drScObj = drSubclass.toObject();
            const drScCleanAdv = this.buildAdvancementUpdatePatch(
              drScObj.system?.advancement,
              this.deduplicateAdvancementList(drScObj.system?.advancement, {
                isSecondary: false,
                seedPrefix: "altarion:ancestral-magic"
              })
            );
            await drSubclass.update({
              img: drBundle.ancestralSubclassData.img,
              "system.description.value": drBundle.ancestralSubclassData.system.description.value,
              "system.source": drBundle.ancestralSubclassData.system.source,
              "system.spellcasting": drBundle.ancestralSubclassData.system.spellcasting,
              "system.advancement": drScCleanAdv,
              flags: foundry.utils.mergeObject(
                drScObj.flags || {},
                drBundle.ancestralSubclassData.flags || {}
              )
            });
          }
        } else if (drSubclass) {
          await drSubclass.delete();
          drSubclass = null;
        }

        // Sync all Dragon Rider & Ancestral Magic features into their proper class/subclass headers
        await this.syncConvertedFeatureList(actor, drBundle.features, {
          flagName: "isPrimaryClassItem",
          maxLevel: riderLevel,
          classItemId: dragonRider?.id || null,
          subclassItemId: drSubclass?.id || null
        });

        // Sync Ivarian High Elf Race + Racial Features + Essence Harvest & ONLY unlocked Arcane Echoes (default: Abjurer's Echo)
        const raceItem = await this.syncRaceItem(actor, drBundle.raceData);
        if (drBundle.racialFeatures?.length) {
          let unlockedEchoes = actor.getFlag("altarion-aitusa", "unlockedArcaneEchoes");
          if (!Array.isArray(unlockedEchoes)) {
            unlockedEchoes = ["abjurer"];
            await actor.setFlag("altarion-aitusa", "unlockedArcaneEchoes", unlockedEchoes);
          }
          const unlockedSet = new Set(unlockedEchoes.map(k => String(k || "").trim().toLowerCase()));
          unlockedSet.add("abjurer");

          const filteredRacialFeats = drBundle.racialFeatures.filter(f => {
            const flags = f.flags?.["altarion-aitusa"] || {};
            if (!flags.isArcaneEcho) return true;
            const eKey = String(flags.echoKey || "").trim().toLowerCase();
            return unlockedSet.has(eKey);
          });

          // Remove any locked Arcane Echo items currently sitting on Altarion's sheet
          const lockedEchoItemIds = actor.items
            .filter(i => {
              if (i.type !== "feat") return false;
              const fl = i.flags?.["altarion-aitusa"] || {};
              if (!fl.isArcaneEcho) return false;
              const eKey = String(fl.echoKey || "").trim().toLowerCase();
              return !unlockedSet.has(eKey);
            })
            .map(i => i.id);
          if (lockedEchoItemIds.length > 0) {
            await actor.deleteEmbeddedDocuments("Item", lockedEchoItemIds);
          }

          await this.syncConvertedFeatureList(actor, filteredRacialFeats, {
            flagName: "isRacialFeature",
            maxLevel: 20,
            raceItemId: raceItem?.id || null
          });
        }

        // Sync Altarion's exclusive spells ("Altarion's Echoing Ward", "Arcane Armor", "Abjuration Bulwark", "Arcane Bolt" & "Arcane Blade")
        await this.syncEchoingWardSpell(actor, drBundle.echoingWardSpellData);
        await this.syncArcaneArmorSpell(actor, drBundle.arcaneArmorSpellData);
        await this.syncAbjurationBulwarkSpell(actor, drBundle.abjurationBulwarkSpellData);
        await this.syncAltarionCustomCantrips(actor, {
          arcaneBoltSpellData: drBundle.arcaneBoltSpellData,
          arcaneBladeSpellData: drBundle.arcaneBladeSpellData
        });
        await this.cleanupLegacyArmorOfAgathysEffects(actor);

        // Sync Ancestral Weapon in Altarion's inventory (level 3+)
        await this.syncAncestralWeapon(actor, drBundle.ancestralWeaponData, riderLevel);

        // Link Ancestral Attacks shared resource & consumption across all 6 Ancestral Attack features
        await this.syncAncestralAttacksResource(actor);

        // Sync Linked Casting secondary resource (Max = Aitusa's INT modifier, Long Rest recovery)
        await this.syncLinkedCastingResource(actor, aitusaActor);
      } else if (!dragonRider) {
        const created = await actor.createEmbeddedDocuments("Item", [foundry.utils.deepClone(DRAGON_RIDER_CLASS)]);
        dragonRider = created[0];
      }

      // Ensure Altarion's creature type (Humanoid - Elf), languages (Common, Elvish, Old Ivarian),
      // Perception (Keen Senses), Arcana (Arcane Knowledge), and originalClass are set
      const altarionActorUpdates = {};
      if (dragonRider && actor.system.details?.originalClass !== dragonRider.id) {
        altarionActorUpdates["system.details.originalClass"] = dragonRider.id;
      }
      if (actor.system.details?.type?.value !== "humanoid" || actor.system.details?.type?.subtype !== "elf") {
        altarionActorUpdates["system.details.type.value"] = "humanoid";
        altarionActorUpdates["system.details.type.subtype"] = "elf";
      }
      if (actor.system.traits?.languages) {
        const langSet = new Set(Array.from(actor.system.traits.languages.value || []));
        let langChanged = false;
        for (const l of ["common", "elvish"]) {
          if (!langSet.has(l)) {
            langSet.add(l);
            langChanged = true;
          }
        }
        if (langChanged) {
          altarionActorUpdates["system.traits.languages.value"] = Array.from(langSet);
        }
        const curCustomLang = String(actor.system.traits.languages.custom || "");
        if (!curCustomLang.toLowerCase().includes("old ivarian")) {
          altarionActorUpdates["system.traits.languages.custom"] = curCustomLang
            ? `${curCustomLang}; Old Ivarian`
            : "Old Ivarian";
        }
      }
      if (actor.system.skills?.prc && Number(actor.system.skills.prc.value || 0) < 1) {
        altarionActorUpdates["system.skills.prc.value"] = 1;
      }
      if (actor.system.skills?.arc && Number(actor.system.skills.arc.value || 0) < 1) {
        altarionActorUpdates["system.skills.arc.value"] = 1;
      }
      // Saving Throw Proficiencies from Dragon Rider class: Intelligence & Constitution
      if (actor.system.abilities?.int && Number(actor.system.abilities.int.proficient || 0) < 1) {
        altarionActorUpdates["system.abilities.int.proficient"] = 1;
      }
      if (actor.system.abilities?.con && Number(actor.system.abilities.con.proficient || 0) < 1) {
        altarionActorUpdates["system.abilities.con.proficient"] = 1;
      }
      if (!foundry.utils.isEmpty(altarionActorUpdates)) {
        await actor.update(altarionActorUpdates);
      }

      // 2. Convert & Sync Secondary Class: 2014 PHB Wizard via Plutonium
      const wizBundle = isPlutoniumReady
        ? await PlutoniumDataBridge.pGetWizard2014Bundle({ actor, level: wizardLevel })
        : null;

      if (wizBundle) {
        const wizData = foundry.utils.deepClone(wizBundle.wizardClassData);
        wizData.system.levels = wizardLevel;
        wizData.flags = foundry.utils.mergeObject(wizData.flags || {}, {
          "altarion-aitusa": { isSecondaryClass: true }
        });

        if (!wizard) {
          wizData.system.advancement = this.buildSecondaryWizardAdvancements(
            null,
            wizData.system?.advancement,
            actor
          );
          const createdWiz = await actor.createEmbeddedDocuments("Item", [wizData]);
          wizard = createdWiz[0];
        } else {
          const wizExistingObj = wizard.toObject();
          const updatedAdvPatch = this.buildSecondaryWizardAdvancements(
            wizExistingObj.system?.advancement,
            wizData.system?.advancement,
            actor
          );
          await wizard.update({
            img: wizData.img,
            "system.description.value": wizData.system.description.value,
            "system.source": wizData.system.source,
            "system.advancement": updatedAdvPatch,
            flags: foundry.utils.mergeObject(wizExistingObj.flags || {}, wizData.flags || {})
          });
        }
      } else if (!wizard) {
        const createdWiz = await actor.createEmbeddedDocuments("Item", [foundry.utils.deepClone(WIZARD_CLASS)]);
        wizard = createdWiz[0];
      }

      // 3. Pull Wizard class features (and School of Abjuration subclass features if selected) from Compendium advancements
      if (wizard) {
        await this.syncCompendiumAdvancementFeatures(actor, wizard, wizardLevel);
      }

      let wizardSubclass = actor.items.find(
        i =>
          i.type === "subclass" &&
          (i.system?.classIdentifier === "wizard" ||
            i.system?.identifier === "abjuration" ||
            i.name === "School of Abjuration")
      );
      if (wizardSubclass && wizardLevel < 2) {
        await wizardSubclass.delete();
        wizardSubclass = null;
      }

      // Auto-create School of Abjuration when Altarion reaches Wizard Level 2+
      if (!wizardSubclass && wizardLevel >= 2) {
        const rawSubData = wizBundle?.abjurationSubclassData
          ? foundry.utils.deepClone(wizBundle.abjurationSubclassData)
          : foundry.utils.deepClone(ABJURATION_SUBCLASS);
        delete rawSubData._id;
        rawSubData.system = rawSubData.system || {};
        rawSubData.system.identifier = rawSubData.system.identifier || "abjuration";
        rawSubData.system.classIdentifier = "wizard";
        rawSubData.system.advancement = this.buildAbjurationSubclassAdvancements(
          null,
          rawSubData.system?.advancement,
          actor
        );
        rawSubData.flags = foundry.utils.mergeObject(rawSubData.flags || {}, {
          plutonium: {
            isDirectImport: true,
            isStandardDragDrop: true
          },
          "altarion-aitusa": {
            isSecondaryClassItem: true
          }
        });
        const createdSc = await actor.createEmbeddedDocuments("Item", [rawSubData]);
        wizardSubclass = createdSc[0] || null;
      }

      if (wizardSubclass) {
        const scExistingObj = wizardSubclass.toObject();
        const isAbjuration =
          wizardSubclass.name === "School of Abjuration" || wizardSubclass.system?.identifier === "abjuration";
        const scAdvPatch = isAbjuration
          ? this.buildAbjurationSubclassAdvancements(
              scExistingObj.system?.advancement,
              wizBundle?.abjurationSubclassData?.system?.advancement,
              actor
            )
          : this.buildAdvancementUpdatePatch(
              scExistingObj.system?.advancement,
              this.deduplicateAdvancementList(scExistingObj.system?.advancement, {
                isSecondary: true,
                seedPrefix: `altarion:wiz-sc:${wizardSubclass.system?.identifier || "subclass"}`
              })
            );

        await wizardSubclass.update({
          ...(wizBundle?.abjurationSubclassData?.img && isAbjuration
            ? { img: wizBundle.abjurationSubclassData.img }
            : {}),
          ...(wizBundle?.abjurationSubclassData?.system?.description?.value && isAbjuration
            ? { "system.description.value": wizBundle.abjurationSubclassData.system.description.value }
            : {}),
          "system.classIdentifier": "wizard",
          "system.advancement": scAdvPatch,
          "flags.altarion-aitusa.isSecondaryClassItem": true
        });
        await this.syncCompendiumAdvancementFeatures(actor, wizardSubclass, wizardLevel);
      }

      // Direct guarantee: ensure all converted Wizard & School of Abjuration features up to wizardLevel exist on Altarion
      if (wizBundle) {
        const requiredSecFeatures = [];
        for (const wf of wizBundle.wizardFeatures || []) {
          if (Number(wf.level) <= wizardLevel && wf.data) {
            requiredSecFeatures.push({ level: Number(wf.level), data: wf.data, isSubclass: false });
          }
        }
        if (wizardLevel >= 2) {
          for (const af of wizBundle.abjurationFeatures || []) {
            if (Number(af.level) <= wizardLevel && af.data) {
              requiredSecFeatures.push({ level: Number(af.level), data: af.data, isSubclass: true });
            }
          }
        }

        const missingSecDocs = [];
        for (const req of requiredSecFeatures) {
          const fKey = req.data.flags?.["altarion-aitusa"]?.featureKey;
          const reqNameLower = String(req.data.name || "").trim().toLowerCase();
          const alreadyExists = actor.items.some(i => {
            if (i.type !== "feat") return false;
            if (fKey && i.flags?.["altarion-aitusa"]?.featureKey === fKey) return true;
            const iNameLower = String(i.name || "").trim().toLowerCase();
            if (iNameLower !== reqNameLower) return false;
            if (reqNameLower === "spellcasting") {
              return (
                Boolean(i.flags?.["altarion-aitusa"]?.isSecondaryClassItem) ||
                String(i.system?.requirements || "").toLowerCase().includes("wizard")
              );
            }
            return true;
          });

          if (!alreadyExists) {
            const docToCreate = foundry.utils.deepClone(req.data);
            delete docToCreate._id;
            const parentOriginId = req.isSubclass
              ? wizardSubclass?.id || wizard?.id || ""
              : wizard?.id || "";
            docToCreate.flags = foundry.utils.mergeObject(docToCreate.flags || {}, {
              plutonium: {
                isDirectImport: true,
                isStandardDragDrop: true
              },
              ...(parentOriginId
                ? {
                    dnd5e: {
                      advancementOrigin: parentOriginId,
                      advancementRoot: wizard?.id || parentOriginId
                    }
                  }
                : {}),
              "altarion-aitusa": {
                isSecondaryClassItem: true,
                levelRequired: req.level,
                featureKey: fKey || `wizard:${req.isSubclass ? "abjuration" : "class"}:${reqNameLower}:${req.level}`
              }
            });
            missingSecDocs.push(docToCreate);
          }
        }

        if (missingSecDocs.length > 0) {
          await actor.createEmbeddedDocuments("Item", missingSecDocs);
        }
      }

      // Remove any secondary class features exceeding current wizardLevel
      const excessSecondaryFeats = actor.items
        .filter(
          i =>
            i.type === "feat" &&
            i.flags?.["altarion-aitusa"]?.isSecondaryClassItem &&
            Number(i.flags?.["altarion-aitusa"]?.levelRequired || 0) > wizardLevel
        )
        .map(i => i.id);
      if (excessSecondaryFeats.length > 0) {
        await actor.deleteEmbeddedDocuments("Item", excessSecondaryFeats);
      }

      // Run a final deduplication pass in case any new items overlapped existing ones
      await this.cleanupDuplicateFeatures(actor);

      // Sync Altarion's Arcane Ward resource (2 * Wizard Level + INT Mod) & Token Bar 2
      await this.syncArcaneWardResource(actor);

      // 4. Apply trait scaling (Force Resistance / Immunity at lvl 11+)
      await DragonScalingManager.scaleAltarion(actor, riderLevel);

      // 4b. Mirror Altarion's full spell list onto Aitusa (preserving Aitusa's custom Arcane Bolt icon)
      if (aitusaActor?.isOwner) {
        await this.syncAitusaSpellsFromAltarion(actor, aitusaActor);
      }

      // 5. Refresh actor derived data so Primary Level & Proficiency Bonus are exact
      SecondaryClassManager.refreshActor(actor);
      if (actor.sheet?.rendered) actor.sheet.render(false);

      ui.notifications.info(
        `[Altarion & Aitusa] Synchronized ${actor.name}: Dragon Rider (Lvl ${riderLevel}, PB +${actor.system.attributes?.prof ?? 2}) & Wizard (Lvl ${wizardLevel} - Secondary).`
      );
    } catch (err) {
      console.error(`[Altarion & Aitusa] Failed to synchronize ${actor.name}:`, err);
    } finally {
      this._syncing.delete(actor.id);
    }
  }

  /**
   * Synchronize Aitusa's sheet
   */
  static async syncAitusa(actor) {
    if (!actor || this._syncing.has(actor.id)) return;
    this._syncing.add(actor.id);

    try {
      const isPlutoniumReady = await PlutoniumDataBridge.waitForPlutonium();
      await this.cleanupLegacyItems(actor, { isPlutoniumReady });
      await this.cleanupDuplicateFeatures(actor);
      await this.cleanupLegacyArmorOfAgathysEffects(actor);

      let dragonClass = actor.items.find(
        i =>
          i.type === "class" &&
          (i.system.identifier === "dragon" || i.name.toLowerCase() === "dragon")
      );
      const dragonLevel = dragonClass?.system?.levels || actor.system.details?.level || 4;

      const aitusaBundle = isPlutoniumReady
        ? await PlutoniumDataBridge.pGetAitusaBundle({ actor, dragonLevel })
        : null;

      let dragonSubclass = actor.items.find(
        i =>
          i.type === "subclass" &&
          (i.system?.classIdentifier === "dragon" || i.name.toLowerCase() === "ancestral magic")
      );

      if (aitusaBundle) {
        if (actor.type === "character") {
          if (!dragonClass) {
            aitusaBundle.dragonClassData.system.advancement = this.buildAdvancementUpdatePatch(
              null,
              this.deduplicateAdvancementList(aitusaBundle.dragonClassData.system?.advancement, {
                isSecondary: false,
                seedPrefix: "aitusa:dragon"
              })
            );
            const created = await actor.createEmbeddedDocuments("Item", [aitusaBundle.dragonClassData]);
            dragonClass = created[0];
          } else {
            const dgObj = dragonClass.toObject();
            const dgCleanAdv = this.buildAdvancementUpdatePatch(
              dgObj.system?.advancement,
              this.deduplicateAdvancementList(dgObj.system?.advancement, {
                isSecondary: false,
                seedPrefix: "aitusa:dragon"
              })
            );
            await dragonClass.update({
              img: aitusaBundle.dragonClassData.img,
              "system.description.value": aitusaBundle.dragonClassData.system.description.value,
              "system.source": aitusaBundle.dragonClassData.system.source,
              "system.advancement": dgCleanAdv,
              flags: foundry.utils.mergeObject(
                dgObj.flags || {},
                aitusaBundle.dragonClassData.flags || {}
              )
            });
          }

          if (dragonLevel >= 3) {
            if (!dragonSubclass) {
              aitusaBundle.ancestralSubclassData.system.advancement = this.buildAdvancementUpdatePatch(
                null,
                this.deduplicateAdvancementList(aitusaBundle.ancestralSubclassData.system?.advancement, {
                  isSecondary: false,
                  seedPrefix: "aitusa:ancestral-magic"
                })
              );
              const createdSc = await actor.createEmbeddedDocuments("Item", [aitusaBundle.ancestralSubclassData]);
              dragonSubclass = createdSc[0];
            } else {
              const dgScObj = dragonSubclass.toObject();
              const dgScCleanAdv = this.buildAdvancementUpdatePatch(
                dgScObj.system?.advancement,
                this.deduplicateAdvancementList(dgScObj.system?.advancement, {
                  isSecondary: false,
                  seedPrefix: "aitusa:ancestral-magic"
                })
              );
              await dragonSubclass.update({
                img: aitusaBundle.ancestralSubclassData.img,
                "system.description.value": aitusaBundle.ancestralSubclassData.system.description.value,
                "system.source": aitusaBundle.ancestralSubclassData.system.source,
                "system.spellcasting": aitusaBundle.ancestralSubclassData.system.spellcasting,
                "system.advancement": dgScCleanAdv,
                flags: foundry.utils.mergeObject(
                  dgScObj.flags || {},
                  aitusaBundle.ancestralSubclassData.flags || {}
                )
              });
            }
          } else if (dragonSubclass) {
            await dragonSubclass.delete();
            dragonSubclass = null;
          }
        }

        await this.syncConvertedFeatureList(actor, aitusaBundle.features, {
          flagName: "isCompanionItem",
          maxLevel: dragonLevel,
          classItemId: dragonClass?.id || null,
          subclassItemId: dragonSubclass?.id || null
        });

        // Sync Aitusa's "Dragon" Race item
        if (aitusaBundle.raceData) {
          await this.syncRaceItem(actor, aitusaBundle.raceData);
        }
      } else if (!dragonClass && actor.type === "character") {
        const created = await actor.createEmbeddedDocuments("Item", [foundry.utils.deepClone(DRAGON_CLASS)]);
        dragonClass = created[0];
      }

      // Ensure Aitusa's creature type is "dragon" and Saving Throw Proficiencies (Intelligence & Constitution) are set
      const aitusaActorUpdates = {};
      if (dragonClass && actor.system.details?.originalClass !== dragonClass.id) {
        aitusaActorUpdates["system.details.originalClass"] = dragonClass.id;
      }
      if (actor.system.details?.type?.value !== "dragon") {
        aitusaActorUpdates["system.details.type.value"] = "dragon";
      }
      if (actor.system.abilities?.int && Number(actor.system.abilities.int.proficient || 0) < 1) {
        aitusaActorUpdates["system.abilities.int.proficient"] = 1;
      }
      if (actor.system.abilities?.con && Number(actor.system.abilities.con.proficient || 0) < 1) {
        aitusaActorUpdates["system.abilities.con.proficient"] = 1;
      }
      if (!foundry.utils.isEmpty(aitusaActorUpdates)) {
        await actor.update(aitusaActorUpdates);
      }

      // Mirror all spells from Altarion's spell list onto Aitusa so Aitusa always has access to Altarion's full spell list
      const altarionActor = game.actors.find(a => SecondaryClassManager.isAltarion(a));
      if (altarionActor) {
        await this.syncAitusaSpellsFromAltarion(altarionActor, actor);
      } else {
        // Fallback if Altarion actor is not yet created
        const aitusaEchoingWard = actor.items.find(
          i =>
            i.type === "spell" &&
            (i.flags?.["altarion-aitusa"]?.isExclusiveSpell ||
              i.name.toLowerCase().replace(/’/g, "'") === "altarion's echoing ward")
        );
        if (aitusaEchoingWard) {
          const ewData = await PlutoniumDataBridge.pBuildEchoingWardSpell();
          await this.syncEchoingWardSpell(actor, ewData);
        }
      }

      // Sync Aitusa's "Dragon Attacks" resource (Max = STR modifier, SR/LR recovery)
      await this.syncDragonAttacksResource(actor);

      // Apply dynamic scaling (sizes, speeds, AC formula, Hit Die denomination, Force immunity)
      await DragonScalingManager.scaleAitusa(actor);

      SecondaryClassManager.refreshActor(actor);

      // Initialize any newly unlocked spell slot levels on Aitusa to full value so they are ready to use
      const slotUpdates = {};
      const prevMaxByLvl = actor.flags?.["altarion-aitusa"]?.syncedSpellMax || {};
      const newMaxByLvl = {};
      for (let lvl = 1; lvl <= 9; lvl++) {
        const key = `spell${lvl}`;
        const slotObj = actor.system?.spells?.[key];
        const maxSlots = Number(slotObj?.max || 0);
        newMaxByLvl[lvl] = maxSlots;
        const oldMax = Number(prevMaxByLvl[lvl] || 0);
        if (maxSlots > oldMax) {
          const curVal = Number(slotObj?.value || 0);
          slotUpdates[`system.spells.${key}.value`] = Math.min(maxSlots, curVal + (maxSlots - oldMax));
        }
      }
      if (!foundry.utils.isEmpty(slotUpdates)) {
        slotUpdates["flags.altarion-aitusa.syncedSpellMax"] = newMaxByLvl;
        await actor.update(slotUpdates);
        SecondaryClassManager.refreshActor(actor);
      }
      if (actor.sheet?.rendered) actor.sheet.render(false);

      ui.notifications.info(
        `[Altarion & Aitusa] Synchronized ${actor.name}: Dragon Companion (Lvl ${dragonLevel}, ${PlutoniumDataBridge.getSizeLabel(dragonLevel)}).`
      );
    } catch (err) {
      console.error(`[Altarion & Aitusa] Failed to synchronize ${actor.name}:`, err);
    } finally {
      this._syncing.delete(actor.id);
    }
  }

  /**
   * Synchronize both characters in the world
   */
  static async syncAll() {
    const aitusaName = game.settings.get("altarion-aitusa", "aitusaName") || "Aitusa";

    const altarion = game.actors.find(a => SecondaryClassManager.isAltarion(a));
    const aitusa = game.actors.find(a => {
      const n = a.name?.trim().toLowerCase() || "";
      return n === aitusaName.trim().toLowerCase() || n === "aitusa" || n.startsWith("aitusa ");
    });

    if (aitusa) await this.syncAitusa(aitusa);
    if (altarion) await this.syncAltarion(altarion);
  }
}

globalThis.FeatureSyncManager = FeatureSyncManager;
