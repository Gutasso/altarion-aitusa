/**
 * Party JSON Synchronizer (Aitusa, Altarion Talendris, Flinn Encantor, Kyrion, Parva)
 * Imports curated Inventory, Currency, Tool Proficiencies, Languages, Missing Feats, Backgrounds,
 * Card of the Resonant Arcana (as attunable Equipment Trinkets in Inventory!), Equipped/Attuned States + ActiveEffects,
 * and `professions-reworked-5e` flags.
 * Also migrates legacy third-party `cdn.5e.tools` / `raw.githubusercontent.com` item images to verified local Foundry
 * icons (eliminating Chrome third-party cookie warnings) and converts legacy `feat` Resonant Arcana cards to `equipment`.
 */

import {
  PARTY_JSON_DATA,
  PARTY_JSON_SYNC_VERSION,
  EXTERNAL_IMG_MIGRATION_MAP
} from "./party-json-data.js";

const MODULE_ID = "altarion-aitusa";
const FALLBACK_CARD_IMG = "icons/sundries/gaming/rune-card.webp";

export class PartyJsonSyncManager {
  static _syncInFlight = new Set();

  static init() {
    globalThis.PartyJsonSyncManager = this;
  }

  static getCharKeyForActor(actor) {
    const n = String(actor?.name || "").trim().toLowerCase();
    if (!n) return null;
    if (n === "aitusa" || n.startsWith("aitusa ")) return "aitusa";
    if (n === "altarion" || n === "altarion talendris" || n.startsWith("altarion ")) return "altarion";
    if (n === "flinn" || n === "flinn encantor" || n.startsWith("flinn ")) return "flinn";
    if (n === "kyrion" || n.startsWith("kyrion ")) return "kyrion";
    if (n === "parva" || n.startsWith("parva ")) return "parva";
    return null;
  }

  static _sanitizeItemImg(img, itemName = "") {
    const s = String(img || "").trim();
    if (s && EXTERNAL_IMG_MIGRATION_MAP[s]) {
      return EXTERNAL_IMG_MIGRATION_MAP[s];
    }
    const nameLow = String(itemName || "").toLowerCase();
    if (!s || s === "360_F_539323090_rgemn9ld3PWY4BTQ7X2Gz9gxHIblEjld.jpg") {
      return FALLBACK_CARD_IMG;
    }
    if (/^https?:\/\/(?:cdn\.5e\.tools|raw\.githubusercontent\.com\/5etools)/i.test(s)) {
      if (nameLow.includes("bag of holding")) return "icons/containers/bags/coinpouch-cloth-purple.webp";
      if (nameLow.includes("cloak")) return "icons/equipment/back/cloak-collared-blue-gold.webp";
      if (nameLow.includes("sending stone")) return "icons/commodities/gems/gem-faceted-oval-blue.webp";
      if (nameLow.includes("rewarded")) return "icons/sundries/flags/banner-blue.webp";
      if (nameLow.includes("ruined")) return "icons/environment/settlement/graveyard-tombstone-night.webp";
      if (nameLow.includes("lucky charm")) return "icons/commodities/treasure/brooch-crown-gold.webp";
      return "icons/svg/item-bag.svg";
    }
    return s;
  }

  /**
   * Lightweight idempotent migration that runs on existing actors to:
   * 1. Replace third-party `cdn.5e.tools` / `raw.githubusercontent.com` / missing local image URLs
   *    on items & active effects with verified local Foundry icons (stops Chrome third-party cookie console spam).
   * 2. Convert any "Card of the Resonant Arcana (...)" item stored as `type: "feat"` into an attunable
   *    `type: "equipment"` (trinket) so it shows up in the actor's Inventory and works natively with Attunement Slots!
   */
  static async migrateExistingActorItems(actor) {
    if (!actor || !actor.isOwner) return;

    const itemUpdates = [];
    const legacyCardFeats = [];

    for (const item of actor.items) {
      const nameLow = String(item.name || "").trim().toLowerCase();

      // 1. Detect legacy `feat` Card of the Resonant Arcana -> convert to `equipment` (trinket)
      if (nameLow.startsWith("card of the resonant arcana") && item.type !== "equipment") {
        legacyCardFeats.push(item);
        continue;
      }

      // 2. Replace external cdn.5e.tools / githubusercontent / broken images on items & their embedded effects
      const cleanImg = this._sanitizeItemImg(item.img, item.name);
      const patch = {};
      if (cleanImg !== item.img) {
        patch.img = cleanImg;
      }
      if (nameLow.startsWith("card of the resonant arcana") && item.type === "equipment") {
        if (item.img !== FALLBACK_CARD_IMG) patch.img = FALLBACK_CARD_IMG;
        if (item.system?.attunement !== "required") patch["system.attunement"] = "required";
        if (item.system?.type?.value !== "trinket") patch["system.type.value"] = "trinket";
      }

      if (Object.keys(patch).length > 0) {
        itemUpdates.push({ _id: item.id, ...patch });
      }

      // Also fix any embedded ActiveEffect img that references external cdn.5e.tools
      for (const eff of item.effects || []) {
        const cleanEffImg = this._sanitizeItemImg(eff.img, item.name);
        if (cleanEffImg !== eff.img) {
          try {
            await eff.update({ img: cleanEffImg });
          } catch (_e) {}
        }
      }
    }

    // Also fix any actor-level ActiveEffect img referencing external cdn.5e.tools
    for (const eff of actor.effects || []) {
      const cleanEffImg = this._sanitizeItemImg(eff.img, eff.name);
      if (cleanEffImg !== eff.img) {
        try {
          await eff.update({ img: cleanEffImg });
        } catch (_e) {}
      }
    }

    if (itemUpdates.length > 0) {
      await actor.updateEmbeddedDocuments("Item", itemUpdates);
    }

    if (legacyCardFeats.length > 0) {
      const toCreateEquip = [];
      const toDeleteIds = [];

      for (const oldFeat of legacyCardFeats) {
        const nameLow = String(oldFeat.name || "").trim().toLowerCase();
        const alreadyEquip = actor.items.some(
          i => i.type === "equipment" && String(i.name || "").trim().toLowerCase() === nameLow
        );
        if (!alreadyEquip) {
          const oldObj = oldFeat.toObject();
          toCreateEquip.push({
            name: oldObj.name,
            type: "equipment",
            img: FALLBACK_CARD_IMG,
            system: {
              description: oldObj.system?.description || { value: "", chat: "" },
              quantity: 1,
              weight: { value: 0, units: "lb" },
              price: { value: 0, denomination: "gp" },
              rarity: "veryRare",
              identified: true,
              attunement: "required",
              attuned: false,
              equipped: false,
              properties: ["mgc"],
              type: { value: "trinket", baseItem: "" },
              armor: { value: null, magicalBonus: null, dex: null },
              uses: { spent: 0, max: "", recovery: [] },
              activities: {},
              source: { custom: "Coria Homebrew", rules: "2014" }
            },
            flags: {
              ...(oldObj.flags || {}),
              [MODULE_ID]: {
                ...(oldObj.flags?.[MODULE_ID] || {}),
                isResonantArcanaCard: true
              }
            }
          });
        }
        toDeleteIds.push(oldFeat.id);
      }

      if (toCreateEquip.length > 0) {
        await actor.createEmbeddedDocuments("Item", toCreateEquip);
      }
      if (toDeleteIds.length > 0) {
        await actor.deleteEmbeddedDocuments("Item", toDeleteIds);
      }
    }
  }

  static async syncAllPartyActors({ force = false, silent = false } = {}) {
    if (!game.actors) return [];
    const results = [];
    for (const actor of game.actors) {
      if (!actor.isOwner) continue;
      // Clean third-party cookie image URLs & migrate Resonant Arcana cards on all owned PCs/companions
      if (actor.type === "character" || this.getCharKeyForActor(actor)) {
        try {
          await this.migrateExistingActorItems(actor);
        } catch (_e) {}
      }
      const charKey = this.getCharKeyForActor(actor);
      if (!charKey) continue;
      const res = await this.syncActorFromJson(actor, { force, silent });
      if (res) results.push(res);
    }
    return results;
  }

  static async syncActorFromJson(actor, { force = false, silent = false } = {}) {
    if (!actor || !actor.isOwner) return null;
    const charKey = this.getCharKeyForActor(actor);
    if (!charKey) return null;
    const data = PARTY_JSON_DATA[charKey];
    if (!data) return null;

    const syncedVer = Number(actor.getFlag(MODULE_ID, "partyJsonSyncVersion") || 0);
    if (!force && syncedVer >= PARTY_JSON_SYNC_VERSION) {
      return { actorName: actor.name, charKey, skipped: true };
    }

    // If upgrading from v1 -> v2 (actor already synced once), run item migration + ensure Resonant Arcana card
    // exists in Inventory WITHOUT overwriting currency or professions progress!
    const isIncrementalUpgrade = !force && syncedVer >= 1 && syncedVer < PARTY_JSON_SYNC_VERSION;

    if (this._syncInFlight.has(actor.id)) return null;
    this._syncInFlight.add(actor.id);

    try {
      await this.migrateExistingActorItems(actor);

      if (isIncrementalUpgrade) {
        // Ensure the actor's Resonant Arcana Card exists as equipment in Inventory if somehow missing
        const cardEntry = (data.items || []).find(x =>
          String(x.doc?.name || "").trim().toLowerCase().startsWith("card of the resonant arcana")
        );
        if (cardEntry) {
          const cardNameLow = String(cardEntry.doc.name || "").trim().toLowerCase();
          const hasCardEquip = actor.items.some(
            i => i.type === "equipment" && String(i.name || "").trim().toLowerCase() === cardNameLow
          );
          if (!hasCardEquip) {
            const clone = foundry.utils.deepClone(cardEntry.doc);
            clone.img = this._sanitizeItemImg(clone.img, clone.name);
            clone.flags ??= {};
            clone.flags[MODULE_ID] = {
              ...(clone.flags[MODULE_ID] || {}),
              partyJsonItemKey: `${charKey}:${cardEntry.origId}`,
              isResonantArcanaCard: true
            };
            await actor.createEmbeddedDocuments("Item", [clone]);
          }
        }
        await actor.update(
          { [`flags.${MODULE_ID}.partyJsonSyncVersion`]: PARTY_JSON_SYNC_VERSION },
          { altarionBypassWard: true, coriaDamageReactionInternal: true }
        );
        try {
          await globalThis.CoriaAttunementSlots?.syncActorAttunementSlots?.(actor);
        } catch (_e) {}
        return { actorName: actor.name, charKey, migratedToV2: true };
      }

      const origIdToRealId = new Map();
      const matchedExistingIds = new Set();

      const findExistingItem = (origId, doc) => {
        const key = `${charKey}:${origId}`;
        const byKey = actor.items.find(
          i => !matchedExistingIds.has(i.id) && i.flags?.[MODULE_ID]?.partyJsonItemKey === key
        );
        if (byKey) return byKey;

        const nameLow = String(doc.name || "").trim().toLowerCase();
        const byNameAndType = actor.items.find(
          i =>
            !matchedExistingIds.has(i.id) &&
            i.type === doc.type &&
            String(i.name || "").trim().toLowerCase() === nameLow
        );
        return byNameAndType || null;
      };

      const rawItems = Array.isArray(data.items) ? data.items : [];
      const containerEntries = rawItems.filter(
        x => x.doc?.type === "container" || x.doc?.type === "backpack"
      );
      const otherEntries = rawItems.filter(
        x => x.doc?.type !== "container" && x.doc?.type !== "backpack"
      );

      let createdCount = 0;
      const toCreateContainers = [];
      const containerOrigOrder = [];

      // Pass 1: Containers
      for (const entry of containerEntries) {
        const existing = findExistingItem(entry.origId, entry.doc);
        if (existing) {
          matchedExistingIds.add(existing.id);
          origIdToRealId.set(entry.origId, existing.id);
          continue;
        }
        const clone = foundry.utils.deepClone(entry.doc);
        clone.img = this._sanitizeItemImg(clone.img, clone.name);
        clone.flags ??= {};
        clone.flags[MODULE_ID] = {
          ...(clone.flags[MODULE_ID] || {}),
          partyJsonItemKey: `${charKey}:${entry.origId}`
        };
        toCreateContainers.push(clone);
        containerOrigOrder.push(entry.origId);
      }

      if (toCreateContainers.length > 0) {
        const createdCont = await actor.createEmbeddedDocuments("Item", toCreateContainers);
        for (let idx = 0; idx < createdCont.length; idx++) {
          const item = createdCont[idx];
          const origId = containerOrigOrder[idx];
          if (item?.id) {
            matchedExistingIds.add(item.id);
            origIdToRealId.set(origId, item.id);
            createdCount++;
          }
        }
      }

      // Pass 2: All other items (Weapons, Equipment, Consumables, Tools, Loot, Feats, Backgrounds)
      const toCreateOthers = [];
      const otherOrigOrder = [];
      let backgroundItemId = null;

      for (const entry of otherEntries) {
        const existing = findExistingItem(entry.origId, entry.doc);
        if (existing) {
          matchedExistingIds.add(existing.id);
          origIdToRealId.set(entry.origId, existing.id);
          if (existing.type === "background") backgroundItemId = existing.id;
          continue;
        }
        const clone = foundry.utils.deepClone(entry.doc);
        clone.img = this._sanitizeItemImg(clone.img, clone.name);
        if (clone.system && "container" in clone.system) {
          const origCont = clone.system.container;
          if (origCont && origIdToRealId.has(origCont)) {
            clone.system.container = origIdToRealId.get(origCont);
          } else {
            clone.system.container = null;
          }
        }
        clone.flags ??= {};
        clone.flags[MODULE_ID] = {
          ...(clone.flags[MODULE_ID] || {}),
          partyJsonItemKey: `${charKey}:${entry.origId}`,
          ...(String(clone.name || "").toLowerCase().startsWith("card of the resonant arcana")
            ? { isResonantArcanaCard: true }
            : {})
        };
        toCreateOthers.push(clone);
        otherOrigOrder.push(entry.origId);
      }

      if (toCreateOthers.length > 0) {
        const createdOthers = await actor.createEmbeddedDocuments("Item", toCreateOthers);
        for (let idx = 0; idx < createdOthers.length; idx++) {
          const item = createdOthers[idx];
          const origId = otherOrigOrder[idx];
          if (item?.id) {
            matchedExistingIds.add(item.id);
            origIdToRealId.set(origId, item.id);
            if (item.type === "background") backgroundItemId = item.id;
            createdCount++;
          }
        }
      }

      const actorUpdates = {};

      // 1. Background reference
      const curBg =
        typeof actor._source?.system?.details?.background === "string"
          ? actor._source.system.details.background
          : actor.system?.details?.background?.id || "";
      if (!curBg && backgroundItemId) {
        actorUpdates["system.details.background"] = backgroundItemId;
      }

      // 2. Currency
      if (data.currency && typeof data.currency === "object") {
        const curC = actor.system?.currency || {};
        const curTotalCoins =
          Number(curC.pp || 0) +
          Number(curC.gp || 0) +
          Number(curC.ep || 0) +
          Number(curC.sp || 0) +
          Number(curC.cp || 0);
        const srcTotalCoins =
          Number(data.currency.pp || 0) +
          Number(data.currency.gp || 0) +
          Number(data.currency.ep || 0) +
          Number(data.currency.sp || 0) +
          Number(data.currency.cp || 0);

        if (srcTotalCoins > 0 && (force || curTotalCoins === 0)) {
          for (const denom of ["pp", "gp", "ep", "sp", "cp"]) {
            actorUpdates[`system.currency.${denom}`] = Number(data.currency[denom] || 0);
          }
        }
      }

      // 3. Tool Proficiencies
      if (data.tools && typeof data.tools === "object") {
        const curTools = actor.system?.tools || {};
        for (const [toolKey, toolCfg] of Object.entries(data.tools)) {
          if (!toolCfg || typeof toolCfg !== "object") continue;
          const existingTool = curTools[toolKey];
          const existingProf = Number(existingTool?.value ?? -1);
          const incomingProf = Number(toolCfg.value ?? 0);
          if (!existingTool || incomingProf > existingProf) {
            actorUpdates[`system.tools.${toolKey}`] = foundry.utils.deepClone(toolCfg);
          }
        }
      }

      // 4. Languages
      if (data.languages) {
        const curLangVal = Array.from(actor.system?.traits?.languages?.value || []);
        const mergedLangs = Array.from(new Set([...curLangVal, ...(data.languages.value || [])]));
        actorUpdates["system.traits.languages.value"] = mergedLangs;
        if (data.languages.custom && !actor.system?.traits?.languages?.custom) {
          actorUpdates["system.traits.languages.custom"] = data.languages.custom;
        }
      }

      // 5. `professions-reworked-5e` flags
      if (data.professionsFlags && typeof data.professionsFlags === "object") {
        const existingProf = actor.flags?.["professions-reworked-5e"] || null;
        const hasExistingProfProgress = Boolean(
          existingProf &&
            ((Array.isArray(existingProf.profissoesAtivas) && existingProf.profissoesAtivas.length > 0) ||
              (Array.isArray(existingProf.projetos) && existingProf.projetos.length > 0) ||
              (Array.isArray(existingProf.listaTreinamentos) &&
                existingProf.listaTreinamentos.some(t => Number(t?.progresso || t?.atual || 0) > 0)))
        );

        if (force || !hasExistingProfProgress) {
          const profClone = foundry.utils.deepClone(data.professionsFlags);
          if (profClone.ferramentasEquipadas && typeof profClone.ferramentasEquipadas === "object") {
            const remapped = {};
            for (const [profName, origToolId] of Object.entries(profClone.ferramentasEquipadas)) {
              if (origToolId && origIdToRealId.has(origToolId)) {
                remapped[profName] = origIdToRealId.get(origToolId);
              } else {
                const profLow = profName.toLowerCase();
                const toolMatch = actor.items.find(i => {
                  if (i.type !== "tool") return false;
                  const n = String(i.name || "").toLowerCase();
                  if (profLow.includes("escrib") && n.includes("calligrapher")) return true;
                  if (profLow.includes("cart") && n.includes("cartographer")) return true;
                  if (profLow.includes("oleir") && n.includes("potter")) return true;
                  if (profLow.includes("sic") && n.includes("poison")) return true;
                  return false;
                });
                remapped[profName] = toolMatch?.id || origToolId;
              }
            }
            profClone.ferramentasEquipadas = remapped;
          }
          actorUpdates["flags.professions-reworked-5e"] = profClone;
        }
      }

      actorUpdates[`flags.${MODULE_ID}.partyJsonSyncVersion`] = PARTY_JSON_SYNC_VERSION;

      await actor.update(actorUpdates, { altarionBypassWard: true, coriaDamageReactionInternal: true });

      try {
        await globalThis.CoriaAttunementSlots?.syncActorAttunementSlots?.(actor);
      } catch (_e) {}

      console.log(
        `[Altarion & Aitusa] Party JSON Sync completed for ${actor.name} (+${createdCount} items synced).`
      );
      if (!silent && createdCount > 0) {
        ui.notifications?.info?.(
          `[Sync JSON] ${actor.name}: ${createdCount} itens, moedas, proficiências e dados de profissões sincronizados!`
        );
      }
      return { actorName: actor.name, charKey, createdCount };
    } catch (err) {
      console.error(`[Altarion & Aitusa] Party JSON Sync failed for ${actor.name}:`, err);
      return null;
    } finally {
      this._syncInFlight.delete(actor.id);
    }
  }
}
