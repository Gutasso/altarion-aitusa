/**
 * Character Synchronizer & Homebrew Configuration for: PARVA
 * - Dual Races: Human (Variant) [Feat: Telekinetic] + Aasimar (Fallen)
 * - Primary Class: Warlock (Default Level 4) — Subclass: The Fathomless, Pact Boon: Pact of the Tome
 * - Secondary Class: Sorcerer (Default Level 2) — Subclass: Divine Soul
 * - Interactive Choice Dialogs: Eldritch Invocations, Divine Magic Affinity, and Metamagic (at Sorcerer Lvl 3+)
 */

import { OtherPlayersBase } from "./OtherPlayersBase.js";
import { createV2Dialog } from "../scripts/dialog-v2.js";

export class ParvaManager {
  static CHARACTER_NAME = "Parva";

  static PRIMARY_CLASS = {
    name: "Warlock",
    identifier: "warlock",
    source: "PHB",
    defaultLevel: 4,
    saves: ["wis", "cha"],
    subclass: {
      name: "The Fathomless",
      shortName: "Fathomless",
      source: "TCE",
      unlockLevel: 1
    }
  };

  static SECONDARY_CLASS = {
    name: "Sorcerer",
    identifier: "sorcerer",
    source: "PHB",
    defaultLevel: 2,
    subclass: {
      name: "Divine Soul",
      shortName: "Divine Soul",
      source: "XGE",
      unlockLevel: 1
    }
  };

  static WARLOCK_CLASS_FEATURES = [
    { name: "Otherworldly Patron", level: 1, source: "PHB" },
    { name: "Pact Magic", level: 1, source: "PHB" },
    { name: "Eldritch Invocations", level: 2, source: "PHB" },
    { name: "Pact Boon", level: 3, source: "PHB" },
    { name: "Ability Score Improvement", level: 4, source: "PHB" },
    { name: "Ability Score Improvement", level: 8, source: "PHB" },
    { name: "Mystic Arcanum (6th level)", level: 11, source: "PHB" },
    { name: "Ability Score Improvement", level: 12, source: "PHB" },
    { name: "Mystic Arcanum (7th level)", level: 13, source: "PHB" },
    { name: "Mystic Arcanum (8th level)", level: 15, source: "PHB" },
    { name: "Ability Score Improvement", level: 16, source: "PHB" },
    { name: "Mystic Arcanum (9th level)", level: 17, source: "PHB" },
    { name: "Ability Score Improvement", level: 19, source: "PHB" },
    { name: "Eldritch Master", level: 20, source: "PHB" }
  ];

  static FATHOMLESS_SUBCLASS_FEATURES = [
    { name: "Expanded Spell List", level: 1, source: "TCE" },
    { name: "Tentacle of the Deeps", level: 1, source: "TCE" },
    { name: "Gift of the Sea", level: 1, source: "TCE" },
    { name: "Oceanic Soul", level: 6, source: "TCE" },
    { name: "Guardian Coil", level: 6, source: "TCE" },
    { name: "Grasping Tentacles", level: 10, source: "TCE" },
    { name: "Fathomless Plunge", level: 14, source: "TCE" }
  ];

  static SORCERER_CLASS_FEATURES = [
    { name: "Spellcasting", level: 1, source: "PHB" },
    { name: "Sorcerous Origin", level: 1, source: "PHB" },
    { name: "Font of Magic", level: 2, source: "PHB" },
    { name: "Metamagic", level: 3, source: "PHB" },
    { name: "Ability Score Improvement", level: 4, source: "PHB" },
    { name: "Ability Score Improvement", level: 8, source: "PHB" },
    { name: "Ability Score Improvement", level: 12, source: "PHB" },
    { name: "Ability Score Improvement", level: 16, source: "PHB" },
    { name: "Ability Score Improvement", level: 19, source: "PHB" },
    { name: "Sorcerous Restoration", level: 20, source: "PHB" }
  ];

  static DIVINE_SOUL_SUBCLASS_FEATURES = [
    { name: "Divine Magic", level: 1, source: "XGE" },
    { name: "Favored by the Gods", level: 1, source: "XGE" },
    { name: "Empowered Healing", level: 6, source: "XGE" },
    { name: "Otherworldly Wings", level: 14, source: "XGE" },
    { name: "Unearthly Recovery", level: 18, source: "XGE" }
  ];

  static register() {
    globalThis.ParvaManager = this;
    OtherPlayersBase.registerCharacterHandler(this.CHARACTER_NAME, this);
    Hooks.once("ready", async () => {
      try {
        const parva = game.actors?.find(
          a => String(a.name || "").trim().toLowerCase() === this.CHARACTER_NAME.toLowerCase()
        );
        if (parva?.isOwner) {
          await this.ensureTentacleOfTheDeepsConfigured(parva);
        }
      } catch (_e) {
        // ignore
      }
    });
  }

  static configureTentacleOfTheDeepsDoc(doc, existingItem = null) {
    if (!doc) return doc;
    const existingSpent = Number(existingItem?.system?.uses?.spent ?? doc.system?.uses?.spent ?? 0);
    doc.img = "modules/altarion-aitusa/flinn_icons/tentacle-of-the-deeps-spectral.jpg";
    doc.system = doc.system || {};
    doc.system.uses = {
      spent: existingSpent,
      max: "@prof",
      recovery: [{ period: "lr", type: "recoverAll" }]
    };
    doc.system.activation = {
      type: "bonus",
      value: 1,
      condition: ""
    };
    doc.system.duration = {
      value: "1",
      units: "minute"
    };
    doc.system.range = {
      value: 60,
      units: "ft"
    };
    doc.system.target = {
      template: { count: "", contiguous: false, type: "", size: "", width: "", height: "", units: "ft" },
      affects: { count: "", type: "", choice: false, special: "" }
    };
    doc.system.activities = {
      tentacleDeepsSp1: {
        _id: "tentacleDeepsSp1",
        type: "utility",
        name: "Summon Tentacle of the Deeps (60 ft, 1 Minute)",
        activation: {
          type: "bonus",
          value: 1,
          condition: "",
          override: false
        },
        consumption: {
          targets: [
            {
              type: "itemUses",
              value: "1",
              target: "",
              scaling: {}
            }
          ],
          scaling: { allowed: false, max: "" },
          spellSlot: false
        },
        description: {
          chatFlavor:
            "As a bonus action, you create a 10-foot-long spectral tentacle at a point you can see within 60 feet of you (lasts 1 minute). Double-click the summoned Tentacle token on the map to make a melee spell attack (1d8 Cold damage, or 2d8 at 10th level, and reduces the target's speed by 10 feet until the start of your next turn)."
        },
        duration: {
          concentration: false,
          value: "1",
          units: "minute",
          special: "",
          override: false
        },
        effects: [],
        range: {
          value: 60,
          units: "ft",
          special: "",
          override: false
        },
        target: {
          template: { count: "", contiguous: false, type: "", size: "", width: "", height: "", units: "ft" },
          affects: { count: "", type: "", choice: false, special: "" },
          prompt: false,
          override: false
        },
        uses: { spent: 0, max: "", recovery: [] },
        roll: { prompt: false, visible: false, name: "", formula: "" },
        sort: 0
      }
    };
    doc.flags = foundry.utils.mergeObject(doc.flags || {}, {
      "altarion-aitusa": {
        isTentacleOfTheDeepsFeat: true,
        syncSchemaVersion: 5
      }
    });
    return doc;
  }

  static async ensureTentacleOfTheDeepsConfigured(actor) {
    if (!actor || !actor.isOwner) return null;
    const item = actor.items.find(
      i =>
        i.type === "feat" &&
        (i.flags?.["altarion-aitusa"]?.isTentacleOfTheDeepsFeat ||
          i.name?.trim().toLowerCase() === "tentacle of the deeps")
    );
    if (!item) return null;
    if (
      Number(item.flags?.["altarion-aitusa"]?.syncSchemaVersion || 0) >= 5 &&
      item.img === "modules/altarion-aitusa/flinn_icons/tentacle-of-the-deeps-spectral.jpg" &&
      item.system?.uses?.max === "@prof"
    ) {
      return item;
    }
    const stub = this.configureTentacleOfTheDeepsDoc(item.toObject(), item);
    const actPatch = foundry.utils.deepClone(stub.system.activities);
    const oldActs = item.toObject().system?.activities || {};
    for (const oldKey of Object.keys(oldActs)) {
      if (!(oldKey in actPatch)) {
        actPatch[`-=${oldKey}`] = null;
      }
    }
    await item.update({
      img: stub.img,
      "system.uses": stub.system.uses,
      "system.activation": stub.system.activation,
      "system.duration": stub.system.duration,
      "system.range": stub.system.range,
      "system.target": stub.system.target,
      "system.activities": actPatch,
      "flags.altarion-aitusa.isTentacleOfTheDeepsFeat": true,
      "flags.altarion-aitusa.syncSchemaVersion": 5
    });
    return item;
  }

  /**
   * Build and synchronize Parva's 1st-level Abjuration spell: "Armor of Agathys"
   * (Cold damage, fixing Temporary HP & Cold Retaliation upcast scaling to 5 * Spell Slot Level).
   */
  static async syncArmorOfAgathys(actor) {
    if (!actor) return;

    // Purge any corrupted/invalid embedded Item documents (e.g. from legacy 17-char activity IDs)
    if (actor.items?.invalidDocumentIds?.size > 0) {
      const invalidIds = Array.from(actor.items.invalidDocumentIds);
      try {
        await actor.deleteEmbeddedDocuments("Item", invalidIds);
      } catch (_e) {
        for (const badId of invalidIds) {
          try {
            const badDoc = actor.items.getInvalid?.(badId);
            if (badDoc?.delete) await badDoc.delete();
          } catch (_e2) {
            // ignore
          }
        }
      }
    }

    const plutSpell = await OtherPlayersBase.pConvertSpell({
      name: "Armor of Agathys",
      source: "PHB",
      actor
    });
    const img =
      plutSpell?.img ||
      "icons/magic/water/barrier-ice-crystal-wall-jagged-blue.webp";

    const spellData = {
      name: "Armor of Agathys",
      type: "spell",
      img,
      system: {
        description: {
          value: `<div class="rd__b  rd__b--2"><p>A protective magical force surrounds you, manifesting as a spectral frost that covers you and your gear. You gain <strong>5 temporary hit points</strong> for the duration. If a creature hits you with a melee attack while you have these temporary hit points, the creature takes <strong>5 cold damage</strong>.</p><div class="rd__b  rd__b--3"><span class="rd__h rd__h--3" data-title-index="1"> <span class="entry-title-inner">At Higher Levels.</span></span> <p>When you cast this spell using a spell slot of 2nd level or higher, both the temporary hit points and the cold damage increase by <strong>5</strong> for each slot level above 1st (<strong>5 &times; Spell Slot Level</strong>).</p></div></div>`
        },
        source: {
          book: "PHB",
          page: "215",
          custom: "",
          rules: "2014"
        },
        level: 1,
        school: "abj",
        properties: ["vocal", "somatic", "material"],
        materials: {
          value: "a cup of water",
          consumed: false,
          cost: 0,
          supply: 0
        },
        method: "spell",
        prepared: 1,
        activation: {
          type: "action",
          value: 1,
          condition: ""
        },
        duration: {
          value: "1",
          units: "hour"
        },
        range: {
          value: null,
          units: "self"
        },
        target: {
          template: { count: "", contiguous: false, type: "", size: "", width: "", height: "", units: "ft" },
          affects: { count: "", type: "self", choice: false, special: "" }
        },
        activities: {
          agathysArmorCst1: {
            _id: "agathysArmorCst1",
            type: "utility",
            name: "Cast Armor of Agathys (Temp HP & Cold Retaliation)",
            activation: {
              type: "action",
              value: 1,
              condition: "",
              override: false
            },
            consumption: {
              targets: [],
              scaling: { allowed: false, max: "" },
              spellSlot: true
            },
            description: {
              chatFlavor:
                "Grants 5 × Spell Slot Level Temporary Hit Points for 1 hour. Any creature that hits you with a melee attack while these Temporary Hit Points remain takes 5 × Spell Slot Level Cold damage."
            },
            duration: {
              concentration: false,
              value: "1",
              units: "hour",
              special: "",
              override: false
            },
            effects: [],
            range: {
              value: null,
              units: "self",
              special: "",
              override: false
            },
            target: {
              template: { count: "", contiguous: false, type: "", size: "", width: "", height: "", units: "ft" },
              affects: { count: "", type: "self", choice: false, special: "" },
              prompt: false,
              override: false
            },
            uses: { spent: 0, max: "", recovery: [] },
            roll: { prompt: false, visible: false, name: "", formula: "" },
            sort: 0
          }
        }
      },
      flags: {
        plutonium: {
          page: "spells.html",
          source: "PHB",
          hash: "armor_of_agathys_phb",
          isDirectImport: true,
          isStandardDragDrop: true
        },
        "altarion-aitusa": {
          isPrimaryClassItem: true,
          isArmorOfAgathysSpell: true,
          featureKey: "parva:spell:armor-of-agathys:1",
          syncSchemaVersion: 4
        }
      }
    };

    const existingMatches = actor.items.filter(
      i =>
        i.type === "spell" &&
        (i.flags?.["altarion-aitusa"]?.isArmorOfAgathysSpell ||
          i.name?.trim().toLowerCase() === "armor of agathys")
    );
    if (existingMatches.length > 1) {
      await actor.deleteEmbeddedDocuments(
        "Item",
        existingMatches.slice(1).map(i => i.id)
      );
    }
    const existing = existingMatches[0] || null;
    if (!existing) {
      await actor.createEmbeddedDocuments("Item", [spellData]);
    } else if (Number(existing.flags?.["altarion-aitusa"]?.syncSchemaVersion || 0) < 4) {
      const actPatch = foundry.utils.deepClone(spellData.system.activities);
      const oldActs = existing.toObject().system?.activities || {};
      for (const oldKey of Object.keys(oldActs)) {
        if (!(oldKey in actPatch)) {
          actPatch[`-=${oldKey}`] = null;
        }
      }
      await existing.update({
        img: spellData.img,
        "system.method": "spell",
        "system.prepared": 1,
        "system.description.value": spellData.system.description.value,
        "system.activities": actPatch,
        flags: spellData.flags
      });
    }
  }

  static async sync(actor, options = {}) {
    return OtherPlayersBase.runExclusiveSync(
      actor,
      this,
      async () => {
        // Determine current class levels on Parva (or defaults: Warlock 4, Sorcerer 2)
      const existingWarlock = actor.items.find(
        i => i.type === "class" && (i.system?.identifier === "warlock" || i.name.toLowerCase() === "warlock")
      );
      const warlockLevel = Number(existingWarlock?.system?.levels || this.PRIMARY_CLASS.defaultLevel);

      const existingSorcerer = actor.items.find(
        i => i.type === "class" && (i.system?.identifier === "sorcerer" || i.name.toLowerCase() === "sorcerer")
      );
      const sorcererLevel = Number(existingSorcerer?.system?.levels || this.SECONDARY_CLASS.defaultLevel);

      // 1. Dual Races: Human (Variant) + Aasimar (Fallen) via Plutonium
      const variantHumanBundle = await OtherPlayersBase.pConvertRaceAndTraits(
        {
          name: "Human (Variant)",
          source: "PHB",
          alternateNames: ["Variant Human", "Human"]
        },
        { actor }
      );
      const fallenAasimarBundle = await OtherPlayersBase.pConvertRaceAndTraits(
        {
          name: "Aasimar (Fallen)",
          source: "VGM",
          alternateNames: ["Fallen Aasimar"]
        },
        { actor }
      );
      await OtherPlayersBase.syncDualRaces(
        actor,
        [variantHumanBundle, fallenAasimarBundle].filter(Boolean)
      );

      // 2. Variant Human Feat: Telekinetic (TCE) + Mage Hand & Light cantrips
      const telekineticDoc = await OtherPlayersBase.pConvertFeat({
        name: "Telekinetic",
        source: "TCE",
        actor
      });
      if (telekineticDoc) {
        await OtherPlayersBase.syncFeatureItems(actor, [telekineticDoc], { maxLevel: 20 });
      }
      await OtherPlayersBase.syncSpells(actor, [
        { name: "Mage Hand", source: "PHB" },
        { name: "Light", source: "PHB" }
      ]);
      await this.syncArmorOfAgathys(actor);

      // 3. Primary Class: Warlock + Subclass: The Fathomless (TCE)
      const warlockConv = await OtherPlayersBase.pConvertClass({
        name: "Warlock",
        source: "PHB",
        level: warlockLevel,
        actor,
        isSecondary: false
      });
      let warlockClassItem = existingWarlock;
      let fathomlessSubclassItem = null;

      if (warlockConv) {
        const scConv = await OtherPlayersBase.pConvertSubclass({
          clsRaw: warlockConv.clsRaw,
          name: "The Fathomless",
          shortName: "Fathomless",
          source: "TCE",
          className: "Warlock",
          classSource: "PHB",
          actor,
          isSecondary: false
        });
        const syncedPrimary = await OtherPlayersBase.syncClassAndSubclass(actor, {
          clsData: warlockConv.clsData,
          scData: scConv?.scData,
          subclassUnlockLevel: 1,
          isSecondary: false,
          classFeatureDefs: this.WARLOCK_CLASS_FEATURES,
          subclassFeatureDefs: this.FATHOMLESS_SUBCLASS_FEATURES,
          clsRaw: warlockConv.clsRaw,
          scRaw: scConv?.scRaw,
          className: "Warlock",
          classSource: "PHB",
          subclassShortName: "Fathomless",
          subclassSource: "TCE"
        });
        warlockClassItem = syncedPrimary.classItem;
        fathomlessSubclassItem = syncedPrimary.subclassItem;

        // Convert Warlock Class Features & Fathomless Subclass Features up to warlockLevel
        const warlockFeats = [];
        for (const def of this.WARLOCK_CLASS_FEATURES) {
          if (def.level > warlockLevel) continue;
          const doc = await OtherPlayersBase.pConvertFeatureStub(
            {
              name: def.name,
              source: def.source,
              className: "Warlock",
              classSource: "PHB",
              level: def.level,
              __prop: "classFeature"
            },
            { actor, isSecondary: false, originCategory: "class", clsRaw: warlockConv.clsRaw }
          );
          if (doc) warlockFeats.push(doc);
        }

        // Pact of the Tome at Warlock Level 3+
        if (warlockLevel >= 3) {
          const pactTomeDoc = await OtherPlayersBase.pConvertOptionalFeature({
            name: "Pact of the Tome",
            source: "PHB",
            actor,
            isSecondary: false,
            subtype: "pact",
            requirements: "Warlock 3",
            choiceCategory: "pact-boon"
          });
          if (pactTomeDoc) warlockFeats.push(pactTomeDoc);
        }

        for (const def of this.FATHOMLESS_SUBCLASS_FEATURES) {
          if (def.level > warlockLevel) continue;
          const doc = await OtherPlayersBase.pConvertFeatureStub(
            {
              name: def.name,
              source: def.source,
              className: "Warlock",
              classSource: "PHB",
              subclassShortName: "Fathomless",
              subclassSource: "TCE",
              level: def.level,
              __prop: "subclassFeature"
            },
            { actor, isSecondary: false, originCategory: "subclass", scRaw: scConv?.scRaw }
          );
          if (doc) {
            if (def.name.toLowerCase() === "tentacle of the deeps") {
              const existingTentacle = actor.items.find(
                i => i.type === "feat" && i.name?.trim().toLowerCase() === "tentacle of the deeps"
              );
              this.configureTentacleOfTheDeepsDoc(doc, existingTentacle);
            }
            warlockFeats.push(doc);
          }
        }

        await OtherPlayersBase.syncFeatureItems(actor, warlockFeats, {
          maxLevel: warlockLevel,
          classItemId: warlockClassItem?.id || null,
          subclassItemId: fathomlessSubclassItem?.id || null
        });
        await this.ensureTentacleOfTheDeepsConfigured(actor);
      }

      // 4. Secondary Class: Sorcerer + Subclass: Divine Soul (XGE)
      const sorcererConv = await OtherPlayersBase.pConvertClass({
        name: "Sorcerer",
        source: "PHB",
        level: sorcererLevel,
        actor,
        isSecondary: true
      });
      let sorcererClassItem = existingSorcerer;
      let divineSoulSubclassItem = null;

      if (sorcererConv) {
        const scConv = await OtherPlayersBase.pConvertSubclass({
          clsRaw: sorcererConv.clsRaw,
          name: "Divine Soul",
          shortName: "Divine Soul",
          source: "XGE",
          className: "Sorcerer",
          classSource: "PHB",
          actor,
          isSecondary: true
        });
        const syncedSec = await OtherPlayersBase.syncClassAndSubclass(actor, {
          clsData: sorcererConv.clsData,
          scData: scConv?.scData,
          subclassUnlockLevel: 1,
          isSecondary: true,
          classFeatureDefs: this.SORCERER_CLASS_FEATURES,
          subclassFeatureDefs: this.DIVINE_SOUL_SUBCLASS_FEATURES,
          clsRaw: sorcererConv.clsRaw,
          scRaw: scConv?.scRaw,
          className: "Sorcerer",
          classSource: "PHB",
          subclassShortName: "Divine Soul",
          subclassSource: "XGE"
        });
        sorcererClassItem = syncedSec.classItem;
        divineSoulSubclassItem = syncedSec.subclassItem;

        const sorcererFeats = [];
        for (const def of this.SORCERER_CLASS_FEATURES) {
          if (def.level > sorcererLevel) continue;
          const doc = await OtherPlayersBase.pConvertFeatureStub(
            {
              name: def.name,
              source: def.source,
              className: "Sorcerer",
              classSource: "PHB",
              level: def.level,
              __prop: "classFeature"
            },
            { actor, isSecondary: true, originCategory: "class", clsRaw: sorcererConv.clsRaw }
          );
          if (doc) sorcererFeats.push(doc);
        }

        for (const def of this.DIVINE_SOUL_SUBCLASS_FEATURES) {
          if (def.level > sorcererLevel) continue;
          const doc = await OtherPlayersBase.pConvertFeatureStub(
            {
              name: def.name,
              source: def.source,
              className: "Sorcerer",
              classSource: "PHB",
              subclassShortName: "Divine Soul",
              subclassSource: "XGE",
              level: def.level,
              __prop: "subclassFeature"
            },
            { actor, isSecondary: true, originCategory: "subclass", scRaw: scConv?.scRaw }
          );
          if (doc) sorcererFeats.push(doc);
        }

        await OtherPlayersBase.syncFeatureItems(actor, sorcererFeats, {
          maxLevel: sorcererLevel,
          classItemId: sorcererClassItem?.id || null,
          subclassItemId: divineSoulSubclassItem?.id || null
        });
      }

      // 5. Actor Traits: Saving Throws (WIS & CHA from Warlock), Darkvision 60 ft, Necrotic/Radiant Resistance (Aasimar), Swim Speed 40 ft (Gift of the Sea)
      const actorUpdates = {};
      if (warlockClassItem && actor.system.details?.originalClass !== warlockClassItem.id) {
        actorUpdates["system.details.originalClass"] = warlockClassItem.id;
      }
      for (const saveKey of this.PRIMARY_CLASS.saves) {
        if (actor.system.abilities?.[saveKey] && Number(actor.system.abilities[saveKey].proficient || 0) < 1) {
          actorUpdates[`system.abilities.${saveKey}.proficient`] = 1;
        }
      }
      const sensesObj = actor.system.attributes?.senses;
      const curDarkvision = Number(
        sensesObj?.ranges ? sensesObj.ranges.darkvision : sensesObj?.darkvision
      ) || 0;
      if (curDarkvision < 60) {
        actorUpdates["system.attributes.senses.ranges.darkvision"] = 60;
      }
      if (Number(actor.system.attributes?.movement?.walk || 0) < 30) {
        actorUpdates["system.attributes.movement.walk"] = 30;
      }
      if (Number(actor.system.attributes?.movement?.swim || 0) < 40) {
        actorUpdates["system.attributes.movement.swim"] = 40;
      }
      if (actor.system.traits?.dr) {
        const drSet = new Set(Array.from(actor.system.traits.dr.value || []));
        let drChanged = false;
        for (const d of ["necrotic", "radiant", ...(warlockLevel >= 6 ? ["cold"] : [])]) {
          if (!drSet.has(d)) {
            drSet.add(d);
            drChanged = true;
          }
        }
        if (drChanged) {
          actorUpdates["system.traits.dr.value"] = Array.from(drSet);
        }
      }
      if (!foundry.utils.isEmpty(actorUpdates)) {
        await actor.update(actorUpdates);
      }

      OtherPlayersBase.refreshActor(actor);

      // Initialize current HP to Max HP if this is a freshly created sheet with 0 HP
      const maxHp = Number(actor.system?.attributes?.hp?.max || 0);
      const curHp = Number(actor.system?.attributes?.hp?.value || 0);
      if (maxHp > 0 && curHp === 0 && !actor.getFlag("altarion-aitusa", "hpInitialized")) {
        await actor.update({
          "system.attributes.hp.value": maxHp,
          "flags.altarion-aitusa.hpInitialized": true
        });
      }

      if (actor.sheet?.rendered) actor.sheet.render(false);

      // 6. Interactive Choice Dialogs (Eldritch Invocations, Divine Magic Affinity, Metamagic at Lvl 3+)
      const maxInvocations = OtherPlayersBase.getEldritchInvocationCount(warlockLevel);
      if (maxInvocations > 0) {
        await OtherPlayersBase.promptOptionalFeatureChoiceIfNeeded(actor, {
          featureType: "EI",
          choiceCategory: "eldritch-invocation",
          title: `Eldritch Invocations (Warlock Level ${warlockLevel})`,
          totalAllowed: maxInvocations,
          classItem: warlockClassItem,
          isSecondary: false,
          requirementsLabel: `Warlock ${warlockLevel}`,
          subtype: "eldritchInvocation"
        });
      }

      if (sorcererLevel >= 3) {
        const maxMetamagic = OtherPlayersBase.getMetamagicCount(sorcererLevel);
        await OtherPlayersBase.promptOptionalFeatureChoiceIfNeeded(actor, {
          featureType: "MM",
          choiceCategory: "metamagic",
          title: `Metamagic Options (Sorcerer Level ${sorcererLevel})`,
          totalAllowed: maxMetamagic,
          classItem: sorcererClassItem,
          isSecondary: true,
          requirementsLabel: `Sorcerer ${sorcererLevel}`,
          subtype: "metamagic"
        });
      }

      await this.promptDivineSoulAffinityIfNeeded(actor);

      ui.notifications.info(
        `[Other Players] Synchronized ${actor.name}: Warlock (Lvl ${warlockLevel}) & Sorcerer (Lvl ${sorcererLevel} - Secondary).`
      );
      },
      options
    );
  }

  static async promptDivineSoulAffinityIfNeeded(actor) {
    const chosenAffinity = actor.getFlag("altarion-aitusa", "divineSoulAffinity");
    if (chosenAffinity) return;

    const lockKey = `${actor.id}:divineSoulAffinity`;
    if (OtherPlayersBase._choiceDialogOpenFor.has(lockKey)) return;
    OtherPlayersBase._choiceDialogOpenFor.add(lockKey);
    let dialogRendered = false;

    try {
      const affinities = [
        { key: "good", label: "Good — Cure Wounds", spell: "Cure Wounds" },
        { key: "evil", label: "Evil — Inflict Wounds", spell: "Inflict Wounds" },
        { key: "law", label: "Law — Bless", spell: "Bless" },
        { key: "chaos", label: "Chaos — Bane", spell: "Bane" },
        { key: "neutrality", label: "Neutrality — Protection from Evil and Good", spell: "Protection from Evil and Good" }
      ];

      const optionsHtml = affinities
        .map(a => `<option value="${a.key}">${a.label}</option>`)
        .join("");

      const content = `
        <div style="padding: 6px 0;">
          <p style="margin-bottom: 8px;"><strong>${actor.name} (Divine Soul Sorcerer)</strong> — Choose the affinity of your divine power source to learn its bonus 1st-level spell:</p>
          <div class="form-group">
            <select id="parva-divine-affinity-select" style="width: 100%; font-weight: 600;">
              ${optionsHtml}
            </select>
          </div>
        </div>
      `;

      createV2Dialog({
        title: `${actor.name} — Divine Magic Affinity`,
        content,
        buttons: {
          choose: {
            icon: '<i class="fas fa-star"></i>',
            label: "Confirm Affinity",
            callback: async (html) => {
              const root = html instanceof HTMLElement ? html : html?.[0];
              const key = root?.querySelector("#parva-divine-affinity-select")?.value || "good";
              const found = affinities.find(a => a.key === key) || affinities[0];
              await actor.setFlag("altarion-aitusa", "divineSoulAffinity", found.key);
              await OtherPlayersBase.syncSpells(actor, [{ name: found.spell, source: "PHB" }]);
              ui.notifications.info(`[${actor.name}] Divine Magic Affinity (${found.label}) selected!`);
            }
          },
          later: {
            icon: '<i class="fas fa-times"></i>',
            label: "Decide Later"
          }
        },
        default: "choose",
        close: () => {
          OtherPlayersBase._choiceDialogOpenFor.delete(lockKey);
        }
      }).render(true);
      dialogRendered = true;
    } finally {
      if (!dialogRendered) {
        OtherPlayersBase._choiceDialogOpenFor.delete(lockKey);
      }
    }
  }
}

ParvaManager.register();
