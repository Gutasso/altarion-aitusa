/**
 * Shared Plutonium Bridge, Dual-Race Engine, Secondary Class Engine & Interactive Choice Dialogs
 * for the other campaign player characters: Parva, Kyrion, and Flinn.
 *
 * Strictly isolated from Altarion & Aitusa: all hooks check `isOtherPlayerActor(actor)`
 * and never run on Altarion or Aitusa.
 */

import { ArcanePlagueManager } from "../scripts/arcane-plague.js";
import { createV2Dialog } from "../scripts/dialog-v2.js";

const MODULE_ID = "altarion-aitusa";

export class OtherPlayersBase {
  static _initialized = false;
  static _plutoniumReady = false;
  static _converters = null;
  static _syncingActors = new Set();
  static _syncCooldownUntil = new Map(); // actorId -> timestamp ms
  static _lastSyncedLevelSig = new Map(); // actorId -> serialized class/race state signature
  static _autoSyncedOnSheetOpen = new Set(); // actorId set to prevent sheet-render infinite loops
  static _choiceDialogOpenFor = new Set();
  static _characterHandlers = new Map(); // key: lowercase character name -> handler class (Parva, Kyrion, Flinn)
  static _compendiumUuidByKey = new Map(); // cached Compendium UUIDs for seeded class/subclass features

  static registerCharacterHandler(name, handlerClass) {
    if (!name || !handlerClass) return;
    this._characterHandlers.set(name.trim().toLowerCase(), handlerClass);
  }

  static getHandlerForActor(actor) {
    if (!actor || actor.type !== "character") return null;
    const nameKey = (actor.name || "").trim().toLowerCase();
    if (!nameKey) return null;
    const exact = this._characterHandlers.get(nameKey);
    if (exact) return exact;
    for (const [regKey, handler] of this._characterHandlers.entries()) {
      if (nameKey.startsWith(`${regKey} `)) return handler;
    }
    return null;
  }

  static isOtherPlayerActor(actor) {
    return Boolean(this.getHandlerForActor(actor));
  }

  static isSyncing(actorId) {
    return this._syncingActors.has(actorId);
  }

  /**
   * Compute a compact signature of the actor's current Primary/Secondary class levels and race count
   * so post-sync hooks only re-run synchronization when levels or core items genuinely changed.
   */
  static getActorLevelSignature(actor, handler = null) {
    const h = handler || this.getHandlerForActor(actor);
    if (!actor || !h) return "";
    const primIdent = h.PRIMARY_CLASS.identifier;
    const primName = h.PRIMARY_CLASS.name.toLowerCase();
    const secIdent = h.SECONDARY_CLASS.identifier;
    const secName = h.SECONDARY_CLASS.name.toLowerCase();

    const primItem = actor.items.find(
      i => i.type === "class" && ((i.system?.identifier || "").toLowerCase() === primIdent || i.name.toLowerCase() === primName)
    );
    const secItem = actor.items.find(
      i => i.type === "class" && ((i.system?.identifier || "").toLowerCase() === secIdent || i.name.toLowerCase() === secName)
    );
    const subCount = actor.items.filter(i => i.type === "subclass").length;
    const raceCount = actor.items.filter(i => i.type === "race").length;
    const primLvl = primItem ? Number(primItem.system?.levels || 0) : -1;
    const secLvl = secItem ? Number(secItem.system?.levels || 0) : -1;
    return `${primIdent}:${primLvl}|${secIdent}:${secLvl}|sc:${subCount}|rc:${raceCount}`;
  }

  /**
   * Run a character synchronization exclusively per actor with post-sync cooldown & signature tracking,
   * guaranteeing zero re-entrant or infinite sync loops.
   */
  static async runExclusiveSync(actor, handler, syncFn, { force = false } = {}) {
    if (!actor || !handler || typeof syncFn !== "function") return;
    if (this._syncingActors.has(actor.id)) return;

    const currentSig = this.getActorLevelSignature(actor, handler);
    const lastSig = this._lastSyncedLevelSig.get(actor.id);
    const inCooldown = (this._syncCooldownUntil.get(actor.id) || 0) > Date.now();
    if (!force && inCooldown && lastSig && currentSig === lastSig) {
      return;
    }

    this._syncingActors.add(actor.id);
    this._autoSyncedOnSheetOpen.add(actor.id);

    try {
      // Purge any invalid embedded Item documents on the actor before Plutonium/Foundry resets actor data
      if (actor.items?.invalidDocumentIds?.size > 0) {
        const badIds = Array.from(actor.items.invalidDocumentIds);
        try {
          await actor.deleteEmbeddedDocuments("Item", badIds);
        } catch (_e) {
          // ignore
        }
      }

      const ok = await this.waitForPlutonium();
      if (!ok) return;

      await this.sanitizeExistingActorEffects(actor);
      await syncFn();

      this._lastSyncedLevelSig.set(actor.id, this.getActorLevelSignature(actor, handler));
    } catch (err) {
      console.error(`[Other Players] Error synchronizing ${actor.name}:`, err);
    } finally {
      this._syncCooldownUntil.set(actor.id, Date.now() + 800);
      this._syncingActors.delete(actor.id);
    }
  }

  /* -------------------------------------------- */
  /*  Initialization & Isolated Hooks             */
  /* -------------------------------------------- */

  static init() {
    if (this._initialized) return;

    const charProto = CONFIG.Actor?.dataModels?.character?.prototype;
    const classProto = CONFIG.Item?.dataModels?.class?.prototype;
    const raceProto = CONFIG.Item?.dataModels?.race?.prototype;

    if (!charProto || !classProto) {
      Hooks.once("setup", () => this.init());
      return;
    }

    this._initialized = true;

    // 1. Allow Dual Races (2 Race items simultaneously) ONLY on Parva, Kyrion, and Flinn
    if (raceProto && typeof raceProto._preCreate === "function") {
      const origRacePreCreate = raceProto._preCreate;
      raceProto._preCreate = async function (data, options, user) {
        const actor = this.parent?.actor || this.parent?.parent;
        if (actor && OtherPlayersBase.isOtherPlayerActor(actor)) {
          // Bypass ItemDataModel._preCreate's singleton check (which rejects a 2nd race item)
          // without mutating the frozen RaceData.metadata object
          if (typeof this.preCreateAdvancement === "function") {
            await this.preCreateAdvancement(data, options);
          }
          return true;
        }
        return origRacePreCreate.call(this, data, options, user);
      };
    }

    // 2. Wrap CharacterData.prototype.prepareBaseData for Parva, Kyrion, and Flinn
    const origPrepareBaseData = charProto.prepareBaseData;
    charProto.prepareBaseData = function (...args) {
      origPrepareBaseData.apply(this, args);
      const actor = this.parent;
      if (actor && OtherPlayersBase.isOtherPlayerActor(actor)) {
        OtherPlayersBase.onPrepareCharacterBaseData(this);
      }
    };

    // 3. Wrap CharacterData.prototype.prepareDerivedData for Parva, Kyrion, and Flinn
    const origPrepareDerivedData = charProto.prepareDerivedData;
    charProto.prepareDerivedData = function (...args) {
      const actor = this.parent;
      if (actor && OtherPlayersBase.isOtherPlayerActor(actor)) {
        return OtherPlayersBase.onPrepareCharacterDerivedData(this, origPrepareDerivedData, args);
      }
      return origPrepareDerivedData.apply(this, args);
    };

    // 4. Wrap ClassData.prototype.prepareFinalData & _preUpdate for Secondary Classes on Parva, Kyrion, and Flinn
    const origClassPrepareFinalData = classProto.prepareFinalData;
    classProto.prepareFinalData = function (...args) {
      const item = this.parent;
      const actor = item?.actor;
      const actorNameLow = String(actor?.name || "").trim().toLowerCase();
      const isFlinn = Boolean(actor && (actorNameLow === "flinn" || actorNameLow.startsWith("flinn ")));
      const ident = String(this.identifier || item?.name || "").trim().toLowerCase();

      if (isFlinn && this.spellcasting?.preparation) {
        if (ident === "cleric" && !this.spellcasting.preparation.formula) {
          this.spellcasting.preparation.formula = "max(1, @classes.cleric.levels + @abilities.wis.mod)";
        } else if (ident === "wizard" && !this.spellcasting.preparation.formula) {
          this.spellcasting.preparation.formula = "max(1, @classes.wizard.levels + @abilities.int.mod)";
        }
      }

      origClassPrepareFinalData.apply(this, args);

      if (item && actor && OtherPlayersBase.isOtherPlayerActor(actor) && OtherPlayersBase.isSecondaryClass(item, actor)) {
        this.hd.max = 0;
        this.hd.value = 0;
      }

      if (isFlinn && this.spellcasting?.preparation) {
        if (ident === "cleric") {
          const wisMod = Number(actor.system?.abilities?.wis?.mod ?? 0);
          const clrLvl = Number(this.levels || 0);
          this.spellcasting.preparation.max = Math.max(1, clrLvl + wisMod);
        } else if (ident === "wizard") {
          const intMod = Number(actor.system?.abilities?.int?.mod ?? 0);
          const wizLvl = Number(this.levels || 0);
          this.spellcasting.preparation.max = Math.max(1, wizLvl + intMod);
        }
      }
    };

    const origClassPreUpdate = classProto._preUpdate;
    classProto._preUpdate = async function (changed, options, user) {
      const item = this.parent;
      const actor = item?.actor;
      if (item && actor && OtherPlayersBase.isOtherPlayerActor(actor) && OtherPlayersBase.isSecondaryClass(item, actor)) {
        if ("levels" in (changed.system ?? {})) {
          if (changed.system.levels <= 0) changed.system.levels = 1;
          if (changed.system.levels > CONFIG.DND5E.maxLevel) changed.system.levels = CONFIG.DND5E.maxLevel;
          return;
        }
      }
      return origClassPreUpdate.call(this, changed, options, user);
    };

    // 5. Special Spellcasting Hooks for Flinn (Wizard Full Caster + Cleric as Pact Magic)
    for (const hookName of ["dnd5e.prepareSpellSlots", "dnd5e.prepareLeveledSlots", "dnd5e.preparePactSlots"]) {
      Hooks.on(hookName, (spells, actor, progression) => {
        const handler = this.getHandlerForActor(actor);
        if (handler && typeof handler.onPrepareSpellSlots === "function") {
          handler.onPrepareSpellSlots(spells, actor, progression, hookName);
        }
      });
    }

    // 6. Auto-sync hooks on Ready, Actor create/rename, and Class level change
    if (game?.ready) {
      setTimeout(() => this.syncAllOtherPlayers(), 100);
    } else {
      Hooks.once("ready", async () => {
        await this.syncAllOtherPlayers();
      });
    }

    Hooks.on("createActor", async (actor) => {
      if (!actor || !actor.isOwner || this.isSyncing(actor.id)) return;
      const handler = this.getHandlerForActor(actor);
      if (handler) {
        await handler.sync(actor);
      }
    });

    Hooks.on("updateActor", async (actor, changed) => {
      if (!actor || !actor.isOwner || this.isSyncing(actor.id)) return;
      const handler = this.getHandlerForActor(actor);
      if (!handler) return;

      if ("name" in (changed ?? {})) {
        await handler.sync(actor);
        return;
      }

      if (
        handler.CHARACTER_NAME === "Kyrion" &&
        typeof handler.syncShadowResources === "function" &&
        changed?.system?.abilities?.cha !== undefined
      ) {
        await handler.syncShadowResources(actor);
      }
    });

    for (const hookName of ["createItem", "updateItem", "deleteItem"]) {
      Hooks.on(hookName, async (item, changed) => {
        const actor = item?.parent;
        if (!actor || !actor.isOwner || this.isSyncing(actor.id)) return;
        const handler = this.getHandlerForActor(actor);
        if (!handler) return;

        if (handler.CHARACTER_NAME === "Kyrion") {
          const lowerName = item.name?.trim().toLowerCase() || "";
          if (
            hookName === "createItem" &&
            item.type === "spell" &&
            (handler.LEGACY_SPELL_NAMES?.has(lowerName) ||
              (lowerName === "shadow blade" && !item.flags?.["altarion-aitusa"]?.isKyrionCustomSpell))
          ) {
            await handler.syncCustomSpells(actor);
            await handler.syncLegacyOfCaniaAndInvocationLinks(actor);
            return;
          }

          if (
            (hookName === "createItem" || hookName === "deleteItem") &&
            item.type === "feat" &&
            (item.system?.type?.subtype === "eldritchInvocation" ||
              item.flags?.["altarion-aitusa"]?.choiceCategory === "eldritch-invocation" ||
              lowerName.includes("eldritch spear"))
          ) {
            await handler.syncLegacyOfCaniaAndInvocationLinks(actor);
          }
        }

        if (handler.CHARACTER_NAME === "Parva") {
          const lowerName = item.name?.trim().toLowerCase() || "";
          if (
            hookName === "createItem" &&
            item.type === "spell" &&
            lowerName === "armor of agathys" &&
            !item.flags?.["altarion-aitusa"]?.isArmorOfAgathysSpell &&
            typeof handler.syncArmorOfAgathys === "function" &&
            !this._syncingParvaAgathys
          ) {
            this._syncingParvaAgathys = true;
            try {
              await handler.syncArmorOfAgathys(actor);
            } finally {
              this._syncingParvaAgathys = false;
            }
            return;
          }
        }

        if (handler.CHARACTER_NAME === "Flinn" && (item.type === "spell" || item.type === "feat")) {
          setTimeout(() => {
            const sheetEl = actor.sheet?.element instanceof HTMLElement ? actor.sheet.element : actor.sheet?.element?.[0];
            if (sheetEl) this.decorateCharacterSheet(actor, sheetEl);
          }, 50);
        }

        if (item.type === "class" || item.type === "subclass") {
          const curSig = this.getActorLevelSignature(actor, handler);
          const lastSig = this._lastSyncedLevelSig.get(actor.id);
          const inCooldown = (this._syncCooldownUntil.get(actor.id) || 0) > Date.now();

          if (hookName === "updateItem") {
            const levelsChanged = Boolean(changed?.system && "levels" in changed.system);
            if (levelsChanged && (!lastSig || curSig !== lastSig)) {
              await handler.sync(actor);
            } else {
              this.refreshActor(actor);
            }
          } else {
            // createItem / deleteItem: only trigger if outside post-sync cooldown AND signature actually differs
            if (!inCooldown && (!lastSig || curSig !== lastSig)) {
              await handler.sync(actor);
            } else {
              this.refreshActor(actor);
            }
          }
        }
      });
    }

    // 7. Sheet UI Header Badge ([Sec] & Dual-Race display & "Sync Features" button) for Parva, Kyrion, and Flinn
    for (const hookName of [
      "renderActorSheet5eCharacter2",
      "renderActorSheet5eCharacter",
      "renderCharacterActorSheet",
      "renderActorSheetV2",
      "renderActorSheet",
      "renderTidy5eCharacterSheet",
      "tidy5e-sheet.renderActorSheet",
      "tidy5e-sheet.selectTab"
    ]) {
      Hooks.on(hookName, (app, html) => {
        const actor = app?.actor || app?.document;
        if (!actor || !this.isOtherPlayerActor(actor)) return;
        const root = html instanceof HTMLElement ? html : html?.[0] || app?.element;
        if (!root) return;
        this.decorateCharacterSheet(actor, root);
      });
    }

    console.log("[Other Players] Initialized Secondary Class, Dual-Race & Plutonium Sync for Parva, Kyrion, and Flinn.");
  }

  static async syncAllOtherPlayers() {
    if (!game?.actors) return;
    for (const actor of game.actors) {
      if (actor.isOwner && actor.items?.invalidDocumentIds?.size > 0) {
        try {
          await actor.deleteEmbeddedDocuments("Item", Array.from(actor.items.invalidDocumentIds));
        } catch (_e) {
          // ignore
        }
      }
    }
    for (const [nameKey, handler] of this._characterHandlers.entries()) {
      const matchingActors = game.actors.filter(
        a => a.type === "character" && a.name?.trim().toLowerCase() === nameKey && a.isOwner
      );
      for (const actor of matchingActors) {
        await handler.sync(actor);
      }
    }
  }

  /* -------------------------------------------- */
  /*  Secondary Class Level & HP Calculation      */
  /* -------------------------------------------- */

  static isSecondaryClass(item, actor) {
    if (!item || item.type !== "class") return false;
    if (item.flags?.["altarion-aitusa"]?.isSecondaryClass === true) return true;
    if (item.flags?.["altarion-aitusa"]?.isPrimaryClass === true) return false;

    const handler = this.getHandlerForActor(actor);
    if (handler) {
      const ident = (item.system?.identifier || "").toLowerCase();
      const name = (item.name || "").toLowerCase();
      if (ident === handler.SECONDARY_CLASS.identifier || name === handler.SECONDARY_CLASS.name.toLowerCase()) {
        return true;
      }
      if (ident === handler.PRIMARY_CLASS.identifier || name === handler.PRIMARY_CLASS.name.toLowerCase()) {
        return false;
      }
    }
    return false;
  }

  static onPrepareCharacterBaseData(charData) {
    const actor = charData.parent;
    if (!actor || !this.isOtherPlayerActor(actor)) return;

    let primaryLevel = 0;
    let secondaryLevel = 0;

    for (const item of actor.items) {
      if (item.type !== "class") continue;
      const lvl = Number(item.system?.levels) || 0;
      if (this.isSecondaryClass(item, actor)) {
        secondaryLevel += lvl;
      } else {
        primaryLevel += lvl;
      }
    }

    if (secondaryLevel <= 0 || primaryLevel <= 0) return;

    // 1. Total Character Level strictly equals Primary Class Level
    charData.details.level = primaryLevel;

    // 2. Proficiency Bonus strictly from Primary Class Level
    const calcMod = dnd5e?.documents?.Proficiency?.calculateMod;
    charData.attributes.prof =
      typeof calcMod === "function" ? calcMod(primaryLevel) : Math.floor((primaryLevel + 7) / 4);

    // 3. XP thresholds strictly from Primary Class Level
    const { xp, level } = charData.details;
    if (xp && typeof actor.getLevelExp === "function") {
      xp.max = level >= CONFIG.DND5E.maxLevel ? Infinity : actor.getLevelExp(level || 1);
      xp.min = level ? actor.getLevelExp(level - 1) : 0;
      if (Number.isFinite(xp.max)) {
        const required = xp.max - xp.min;
        const pct = required > 0 ? Math.round(((xp.value - xp.min) * 100) / required) : 0;
        xp.pct = Math.min(Math.max(pct, 0), 100);
      }
    }

    // 4. Exclude Secondary Class from Hit Dice pool
    if (charData.attributes?.hd?.classes instanceof Set) {
      for (const cls of Array.from(charData.attributes.hd.classes)) {
        if (this.isSecondaryClass(cls, actor)) {
          charData.attributes.hd.classes.delete(cls);
        }
      }
    }

    // 5. Merge Dual-Race Movement & Senses (take best speed/senses across both Race items)
    const raceItems = actor.items.filter(i => i.type === "race");
    for (const rItem of raceItems) {
      const rMove = rItem.system?.movement || {};
      for (const [mKey, mVal] of Object.entries(rMove)) {
        if (typeof mVal === "number" && mVal > 0 && charData.attributes?.movement) {
          charData.attributes.movement[mKey] = Math.max(Number(charData.attributes.movement[mKey] || 0), mVal);
        }
      }
      const rSensesObj = rItem.system?.senses;
      const rSenses = rSensesObj?.ranges ? rSensesObj.ranges : (rSensesObj || {});
      for (const sKey of ["darkvision", "blindsight", "tremorsense", "truesight"]) {
        const sVal = rSenses?.[sKey];
        if (typeof sVal === "number" && sVal > 0 && charData.attributes?.senses) {
          if (charData.attributes.senses.ranges) {
            charData.attributes.senses.ranges[sKey] = Math.max(
              Number(charData.attributes.senses.ranges[sKey] || 0),
              sVal
            );
          } else {
            charData.attributes.senses[sKey] = Math.max(Number(charData.attributes.senses[sKey] || 0), sVal);
          }
        }
      }
    }
  }

  static onPrepareCharacterDerivedData(charData, origPrepareDerivedData, args) {
    const actor = charData.parent;
    const hiddenAdvancements = [];

    for (const cls of Object.values(actor.classes ?? {})) {
      if (this.isSecondaryClass(cls, actor) && cls.advancement?.byType?.HitPoints) {
        hiddenAdvancements.push({ cls, hpAdv: cls.advancement.byType.HitPoints });
        cls.advancement.byType.HitPoints = [];
      }
    }

    try {
      origPrepareDerivedData.apply(charData, args);
    } finally {
      for (const { cls, hpAdv } of hiddenAdvancements) {
        if (cls.advancement?.byType) {
          cls.advancement.byType.HitPoints = hpAdv;
        }
      }
    }

    this.onPrepareCharacterBaseData(charData);

    const handler = this.getHandlerForActor(actor);
    if (handler && typeof handler.onPostPrepareDerivedData === "function") {
      handler.onPostPrepareDerivedData(charData, actor);
    }
  }

  static refreshActor(actor) {
    if (!actor) return;
    try {
      if (typeof actor.reset === "function") {
        actor.reset();
      }
    } catch (err) {
      console.warn(`[Other Players] Non-fatal warning resetting ${actor.name}:`, err);
    }
  }

  /* -------------------------------------------- */
  /*  Plutonium Converter Bridge                  */
  /* -------------------------------------------- */

  static async waitForPlutonium(timeoutMs = 20000) {
    if (this._plutoniumReady && this._converters) return true;

    const mod = game.modules?.get("plutonium");
    if (!mod?.active) return false;

    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const plutApi = game.modules?.get("plutonium")?.api;
      if (plutApi?.importer?.pGetImporter && globalThis.DataLoader && globalThis.UrlUtil) {
        break;
      }
      await new Promise(r => setTimeout(r, 100));
    }

    const plutApi = game.modules?.get("plutonium")?.api || globalThis.plutonium;
    if (!plutApi?.importer?.pGetImporter) return false;

    const safeGetImporter = async (prop) => {
      try {
        return await plutApi.importer.pGetImporter({ prop });
      } catch (_) {
        return null;
      }
    };

    try {
      const impClass = await safeGetImporter("class");
      const impFeature = await safeGetImporter("classFeature");
      const impOptFeature = await safeGetImporter("optionalfeature");
      const impFeat = await safeGetImporter("feat");
      const impRace = await safeGetImporter("race");
      const impRaceFeature = await safeGetImporter("raceFeature");
      const impSpell = await safeGetImporter("spell");

      this._converters = {
        DataConverterClass: impClass?.constructor?._DataConverter || globalThis.DataConverterClass,
        DataConverterClassSubclassFeature:
          impFeature?.constructor?._DataConverter || globalThis.DataConverterClassSubclassFeature,
        DataConverterOptionalfeature:
          impOptFeature?.constructor?._DataConverter || globalThis.DataConverterOptionalfeature,
        DataConverterFeat: impFeat?.constructor?._DataConverter || globalThis.DataConverterFeat,
        DataConverterRace: impRace?.constructor?._DataConverter || globalThis.DataConverterRace,
        DataConverterRaceFeature:
          impRaceFeature?.constructor?._DataConverter || globalThis.DataConverterRaceFeature,
        DataConverterSpell: impSpell?.constructor?._DataConverter || globalThis.DataConverterSpell
      };

      this._plutoniumReady = Boolean(
        this._converters.DataConverterClass && this._converters.DataConverterClassSubclassFeature
      );
      return this._plutoniumReady;
    } catch (err) {
      console.error("[Other Players] Error initializing Plutonium converters:", err);
      return false;
    }
  }

  /**
   * Mark any Plutonium-converted document as `isDirectImport: true` & `isStandardDragDrop: true`
   * so Plutonium's `preCreateItem` drag-drop hook NEVER intercepts `createEmbeddedDocuments`
   * or spawns "Ability Scores?" / "Use Importer?" popups, and migrate legacy dnd5e 5.3 sense keys.
   */
  static sanitizeConvertedDoc(doc) {
    if (!doc || typeof doc !== "object") return doc;
    if (doc.flags?.plutonium && typeof doc.flags.plutonium === "object") {
      doc.flags.plutonium.isDirectImport = true;
      doc.flags.plutonium.isStandardDragDrop = true;
    }
    if (Array.isArray(doc.effects)) {
      for (const eff of doc.effects) {
        if (!Array.isArray(eff?.changes)) continue;
        for (const ch of eff.changes) {
          if (typeof ch?.key === "string") {
            ch.key = ch.key.replace(
              /^system\.attributes\.senses\.(darkvision|blindsight|tremorsense|truesight)$/,
              "system.attributes.senses.ranges.$1"
            );
          }
        }
      }
    }
    return doc;
  }

  /**
   * Upgrade any legacy `system.attributes.senses.<sense>` ActiveEffect change keys on existing
   * embedded items/effects of an actor so dnd5e 5.3+ never logs `senses.darkvision` warnings.
   */
  static async sanitizeExistingActorEffects(actor) {
    if (!actor) return;
    const legacyRe = /^system\.attributes\.senses\.(darkvision|blindsight|tremorsense|truesight)$/;
    const patchEffectDoc = async (effDoc) => {
      if (!Array.isArray(effDoc?.changes)) return;
      let dirty = false;
      const newChanges = effDoc.changes.map(ch => {
        if (typeof ch?.key === "string" && legacyRe.test(ch.key)) {
          dirty = true;
          return { ...ch, key: ch.key.replace(legacyRe, "system.attributes.senses.ranges.$1") };
        }
        return ch;
      });
      if (dirty) {
        await effDoc.update({ changes: newChanges });
      }
    };

    for (const eff of actor.effects || []) {
      await patchEffectDoc(eff);
    }
    for (const item of actor.items || []) {
      for (const eff of item.effects || []) {
        await patchEffectDoc(eff);
      }
    }
  }

  /**
   * Convert a 5etools Class via Plutonium
   */
  static async pConvertClass({ name, source = "PHB", level = 1, actor = null, isSecondary = false }) {
    const ok = await this.waitForPlutonium();
    if (!ok) return null;

    const hash = globalThis.UrlUtil.URL_TO_HASH_BUILDER["class"]({ name, source });
    const clsRaw = await globalThis.DataLoader.pCacheAndGet("class", source, hash, {
      isCopy: true,
      isRequired: true
    });
    if (!clsRaw) return null;

    const clsData = await this._converters.DataConverterClass.pGetDocumentJsonClass(clsRaw, {
      actor,
      isActorItem: true,
      isClsDereferenced: true,
      level
    });
    if (!clsData) return null;
    delete clsData._id;
    clsData.system.levels = level;

    // Strip HitPoints advancement if this is a Secondary Class;
    // or ensure HitPoints advancement has default values (1: "max", 2..level: "avg") if Primary Class
    if (isSecondary && clsData.system?.advancement) {
      if (Array.isArray(clsData.system.advancement)) {
        clsData.system.advancement = clsData.system.advancement.filter(a => a?.type !== "HitPoints");
      } else if (typeof clsData.system.advancement === "object") {
        for (const [k, adv] of Object.entries(clsData.system.advancement)) {
          if (adv?.type === "HitPoints") delete clsData.system.advancement[k];
        }
      }
    } else if (!isSecondary) {
      this._ensurePrimaryHitPointsAdvancement(clsData.system, level);
    }

    clsData.flags = foundry.utils.mergeObject(clsData.flags || {}, {
      "altarion-aitusa": {
        isPrimaryClass: !isSecondary,
        isSecondaryClass: isSecondary
      }
    });
    this.sanitizeConvertedDoc(clsData);

    return { clsData, clsRaw };
  }

  /**
   * Ensure a Primary Class system object has a HitPoints advancement with default values (1: "max", 2..level: "avg")
   * so newly created characters immediately compute their proper Max HP.
   */
  static _ensurePrimaryHitPointsAdvancement(systemObj, targetLevel = 4) {
    if (!systemObj) return;
    const buildHpValue = (existingVal = {}, maxLvl = 4) => {
      const val = foundry.utils.deepClone(existingVal || {});
      for (let lvl = 1; lvl <= maxLvl; lvl++) {
        if (val[lvl] === undefined || val[lvl] === null || val[lvl] === "") {
          val[lvl] = lvl === 1 ? "max" : "avg";
        }
      }
      return val;
    };

    if (Array.isArray(systemObj.advancement)) {
      let hpAdv = systemObj.advancement.find(a => a?.type === "HitPoints");
      if (!hpAdv) {
        hpAdv = {
          _id: foundry.utils.randomID(),
          type: "HitPoints",
          configuration: {},
          value: {}
        };
        systemObj.advancement.push(hpAdv);
      }
      hpAdv.value = buildHpValue(hpAdv.value, targetLevel);
    } else {
      systemObj.advancement = systemObj.advancement || {};
      let hpEntry = Object.values(systemObj.advancement).find(a => a?.type === "HitPoints");
      if (!hpEntry) {
        const newId = foundry.utils.randomID();
        hpEntry = {
          _id: newId,
          type: "HitPoints",
          configuration: {},
          value: {}
        };
        systemObj.advancement[newId] = hpEntry;
      }
      hpEntry.value = buildHpValue(hpEntry.value, targetLevel);
    }
  }

  /**
   * Convert a 5etools Subclass via Plutonium
   */
  static async pConvertSubclass({
    clsRaw,
    name,
    shortName,
    source,
    className,
    classSource = "PHB",
    actor = null,
    isSecondary = false
  }) {
    const ok = await this.waitForPlutonium();
    if (!ok) return null;

    // Look for the subclass inside clsRaw.subclasses first so exact shortName / name / source match 5etools
    const lowerName = (name || "").trim().toLowerCase();
    const lowerShort = (shortName || name || "").trim().toLowerCase();
    const lowerSrc = (source || "").trim().toLowerCase();
    const matchedInCls = (clsRaw?.subclasses || []).find(sc => {
      const scName = (sc.name || "").trim().toLowerCase();
      const scShort = (sc.shortName || sc.name || "").trim().toLowerCase();
      const scSrc = (sc.source || clsRaw.source || "").trim().toLowerCase();
      const nameMatch = scName === lowerName || scShort === lowerShort || scName.includes(lowerShort);
      return nameMatch && (!lowerSrc || scSrc === lowerSrc);
    });

    const targetScStub = matchedInCls
      ? {
          name: matchedInCls.name,
          shortName: matchedInCls.shortName || matchedInCls.name,
          source: matchedInCls.source || source,
          className: matchedInCls.className || className || clsRaw?.name,
          classSource: matchedInCls.classSource || classSource || clsRaw?.source || "PHB"
        }
      : {
          name,
          shortName: shortName || name,
          source,
          className: className || clsRaw?.name,
          classSource: classSource || clsRaw?.source || "PHB"
        };

    const scHash = globalThis.UrlUtil.URL_TO_HASH_BUILDER["subclass"](targetScStub);
    let scRaw = null;
    try {
      scRaw = await globalThis.DataLoader.pCacheAndGet("subclass", targetScStub.source, scHash, {
        isCopy: true
      });
    } catch (_) {
      scRaw = null;
    }
    if (!scRaw && matchedInCls) {
      scRaw = foundry.utils.deepClone(matchedInCls);
    }
    if (!scRaw) return null;

    const scData = await this._converters.DataConverterClass.pGetDocumentJsonSubclass(clsRaw, scRaw, {
      actor,
      isActorItem: true,
      isScDereferenced: Boolean(scRaw.subclassFeatures)
    });
    if (!scData) return null;
    delete scData._id;

    // Ensure subclass intro fluff is populated
    const curVal = (scData.system?.description?.value || "").trim();
    if (!curVal || curVal === '<div class="ve-mb-2 ve-flex-col"></div>') {
      const fauxFluff = this._converters.DataConverterClass?._pGetSubclassDescription_getFakeFluff?.({
        scDereferenced: scRaw,
        isIncludeFeatures: true
      });
      if (fauxFluff) {
        scData.system.description.value = `<div class="ve-mb-2 ve-flex-col">${fauxFluff}</div>`;
      }
    }

    scData.flags = foundry.utils.mergeObject(scData.flags || {}, {
      "altarion-aitusa": {
        isPrimaryClassItem: !isSecondary,
        isSecondaryClassItem: isSecondary
      }
    });
    this.sanitizeConvertedDoc(scData);

    return { scData, scRaw };
  }

  /**
   * Convert a single Class Feature or Subclass Feature stub via Plutonium,
   * with fallback lookup in `clsRaw.classFeatures` / `scRaw.subclassFeatures` if needed.
   */
  static async pConvertFeatureStub(
    stub,
    { actor = null, isSecondary = false, originCategory = "class", clsRaw = null, scRaw = null } = {}
  ) {
    const ok = await this.waitForPlutonium();
    if (!ok) return null;

    try {
      const { DataConverterClassSubclassFeature } = this._converters;
      let deref = null;
      try {
        deref = await DataConverterClassSubclassFeature.pGetDereferencedFeatureItem(stub);
      } catch (_) {
        deref = null;
      }

      if (!deref) {
        const lowerTarget = (stub.name || "").trim().toLowerCase();
        const targetLvl = Number(stub.level || 1);
        if (stub.__prop === "subclassFeature" && Array.isArray(scRaw?.subclassFeatures)) {
          const allScFeats = scRaw.subclassFeatures.flat();
          deref = allScFeats.find(
            f => f && (f.name || "").trim().toLowerCase() === lowerTarget && Number(f.level || targetLvl) === targetLvl
          );
        } else if (Array.isArray(clsRaw?.classFeatures)) {
          const allClsFeats = clsRaw.classFeatures.flat();
          deref = allClsFeats.find(
            f => f && (f.name || "").trim().toLowerCase() === lowerTarget && Number(f.level || targetLvl) === targetLvl
          );
        }
      }

      if (!deref) return null;
      const docData = await DataConverterClassSubclassFeature.pGetDocumentJson(deref, {
        actor,
        isActorItem: true
      });
      if (!docData) return null;
      delete docData._id;

      docData.system.type = foundry.utils.mergeObject(docData.system.type || {}, { value: "class" });
      const lvl = Number(stub.level || deref.level || 1);
      const keyPrefix = stub.__prop === "subclassFeature"
        ? `${stub.className}:${stub.subclassShortName}`
        : `${stub.className}:class`;

      docData.flags = foundry.utils.mergeObject(docData.flags || {}, {
        "altarion-aitusa": {
          isPrimaryClassItem: !isSecondary,
          isSecondaryClassItem: isSecondary,
          originCategory,
          levelRequired: lvl,
          featureKey: `${keyPrefix}:${stub.name}:${lvl}`.toLowerCase(),
          syncSchemaVersion: 1
        }
      });
      this.sanitizeConvertedDoc(docData);

      return docData;
    } catch (err) {
      console.warn(`[Other Players] Could not convert feature stub ${stub?.name}:`, err);
      return null;
    }
  }

  /**
   * Convert an Optional Feature (Eldritch Invocation, Pact Boon, Metamagic, Fighting Style) via Plutonium
   */
  static async pConvertOptionalFeature({
    name,
    source = "PHB",
    rawEnt = null,
    actor = null,
    isSecondary = false,
    subtype = "",
    requirements = "",
    choiceCategory = ""
  }) {
    const ok = await this.waitForPlutonium();
    if (!ok) return null;

    try {
      const pageOpt = globalThis.UrlUtil?.PG_OPT_FEATURES || "optionalfeatures.html";
      let ent = rawEnt;
      if (!ent) {
        try {
          const hashBuilder =
            globalThis.UrlUtil.URL_TO_HASH_BUILDER[pageOpt] ||
            globalThis.UrlUtil.URL_TO_HASH_BUILDER["optionalfeature"];
          const hash = hashBuilder({ name, source });
          ent = await globalThis.DataLoader.pCacheAndGet(pageOpt, source, hash, { isCopy: true });
        } catch (_) {
          ent = null;
        }
      }
      if (!ent) {
        const allOpt = await globalThis.DataLoader.pCacheAndGetAllSite(pageOpt);
        if (Array.isArray(allOpt)) {
          const found = allOpt.find(
            o =>
              String(o?.name || "").trim().toLowerCase() === name.trim().toLowerCase() &&
              (!source || String(o?.source || "").toLowerCase() === source.toLowerCase())
          );
          if (found) ent = foundry.utils.deepClone(found);
        }
      }
      if (!ent) return null;

      const docData = await this._converters.DataConverterOptionalfeature.pGetDocumentJson(ent, {
        actor,
        isActorItem: true
      });
      if (!docData) return null;
      delete docData._id;

      docData.system.type = foundry.utils.mergeObject(docData.system.type || {}, {
        value: "class",
        subtype: subtype || docData.system?.type?.subtype || ""
      });
      if (requirements) {
        docData.system.requirements = requirements;
      }

      docData.flags = foundry.utils.mergeObject(docData.flags || {}, {
        "altarion-aitusa": {
          isPrimaryClassItem: !isSecondary,
          isSecondaryClassItem: isSecondary,
          originCategory: "class",
          choiceCategory,
          featureKey: `optionalfeature:${ent.name}:${ent.source}`.toLowerCase(),
          syncSchemaVersion: 1
        }
      });
      this.sanitizeConvertedDoc(docData);
      return docData;
    } catch (err) {
      console.warn(`[Other Players] Could not convert optionalfeature ${name}:`, err);
      return null;
    }
  }

  /**
   * Convert a 5etools Feat (e.g. Telekinetic) via Plutonium
   */
  static async pConvertFeat({ name, source = "PHB", actor = null }) {
    const ok = await this.waitForPlutonium();
    if (!ok || !this._converters.DataConverterFeat) return null;

    try {
      const pageFeats = globalThis.UrlUtil?.PG_FEATS || "feats.html";
      let rawFeat = null;
      try {
        const hashBuilder =
          globalThis.UrlUtil.URL_TO_HASH_BUILDER[pageFeats] ||
          globalThis.UrlUtil.URL_TO_HASH_BUILDER["feat"];
        const hash = hashBuilder({ name, source });
        rawFeat = await globalThis.DataLoader.pCacheAndGet(pageFeats, source, hash, { isCopy: true });
      } catch (_) {
        rawFeat = null;
      }

      if (!rawFeat) {
        const allFeats = await globalThis.DataLoader.pCacheAndGetAllSite(pageFeats);
        if (Array.isArray(allFeats)) {
          const found = allFeats.find(
            f =>
              String(f?.name || "").trim().toLowerCase() === name.trim().toLowerCase() &&
              (!source || String(f?.source || "").toLowerCase() === source.toLowerCase())
          );
          if (found) rawFeat = foundry.utils.deepClone(found);
        }
      }
      if (!rawFeat) return null;

      const docData = await this._converters.DataConverterFeat.pGetDocumentJson(rawFeat, {
        actor,
        isActorItem: true
      });
      if (!docData) return null;
      delete docData._id;

      docData.system.type = foundry.utils.mergeObject(docData.system.type || {}, { value: "feat" });
      docData.flags = foundry.utils.mergeObject(docData.flags || {}, {
        "altarion-aitusa": {
          isOtherPlayerFeat: true,
          originCategory: "feat",
          featureKey: `feat:${name}:${source}`.toLowerCase(),
          syncSchemaVersion: 1
        }
      });
      this.sanitizeConvertedDoc(docData);
      return docData;
    } catch (err) {
      console.warn(`[Other Players] Could not convert feat ${name} (${source}):`, err);
      return null;
    }
  }

  /**
   * Convert a 5etools Spell via Plutonium
   */
  static async pConvertSpell({ name, source = "PHB", actor = null }) {
    const ok = await this.waitForPlutonium();
    if (!ok || !this._converters.DataConverterSpell) return null;

    try {
      const pageSpells = globalThis.UrlUtil?.PG_SPELLS || "spells.html";
      let rawSpell = null;
      try {
        const hashBuilder =
          globalThis.UrlUtil.URL_TO_HASH_BUILDER[pageSpells] ||
          globalThis.UrlUtil.URL_TO_HASH_BUILDER["spell"];
        const hash = hashBuilder({ name, source });
        rawSpell = await globalThis.DataLoader.pCacheAndGet(pageSpells, source, hash, { isCopy: true });
      } catch (_) {
        rawSpell = null;
      }

      if (!rawSpell) {
        const allSpells = await globalThis.DataLoader.pCacheAndGetAllSite(pageSpells);
        if (Array.isArray(allSpells)) {
          const found = allSpells.find(
            s =>
              String(s?.name || "").trim().toLowerCase() === name.trim().toLowerCase() &&
              (!source || String(s?.source || "").toLowerCase() === source.toLowerCase())
          );
          if (found) rawSpell = foundry.utils.deepClone(found);
        }
      }
      if (!rawSpell) return null;

      const docData = await this._converters.DataConverterSpell.pGetDocumentJson(rawSpell, {
        actor,
        isActorItem: true
      });
      if (!docData) return null;
      delete docData._id;

      docData.flags = foundry.utils.mergeObject(docData.flags || {}, {
        "altarion-aitusa": {
          isGrantedSpell: true,
          featureKey: `spell:${name}:${source}`.toLowerCase(),
          syncSchemaVersion: 1
        }
      });
      this.sanitizeConvertedDoc(docData);
      return docData;
    } catch (err) {
      console.warn(`[Other Players] Could not convert spell ${name} (${source}):`, err);
      return null;
    }
  }

  /**
   * Load a 5etools Race/Subrace raw object by name and source, with fallback search across all loaded races
   */
  static async pLoadRaceRaw({ name, source, alternateNames = [] }) {
    const ok = await this.waitForPlutonium();
    if (!ok) return null;

    const pageRaces = globalThis.UrlUtil?.PG_RACES || "races.html";
    const hashBuilder =
      globalThis.UrlUtil.URL_TO_HASH_BUILDER[pageRaces] ||
      globalThis.UrlUtil.URL_TO_HASH_BUILDER["race"];

    const candidates = [name, ...alternateNames];
    for (const candName of candidates) {
      try {
        if (typeof hashBuilder === "function") {
          const hash = hashBuilder({ name: candName, source });
          const raw = await globalThis.DataLoader.pCacheAndGet(pageRaces, source, hash, { isCopy: true });
          if (raw) return raw;
        }
      } catch (_) {
        // try next
      }
    }

    // Fallback: search all site races in DataLoader
    try {
      const allRaces = await globalThis.DataLoader.pCacheAndGetAllSite(pageRaces);
      if (Array.isArray(allRaces)) {
        const lowerCands = new Set(candidates.map(c => c.trim().toLowerCase()));
        const found =
          allRaces.find(
            r =>
              lowerCands.has(String(r?.name || "").trim().toLowerCase()) &&
              (!source || String(r?.source || "").toLowerCase() === source.toLowerCase())
          ) ||
          allRaces.find(r => lowerCands.has(String(r?.name || "").trim().toLowerCase()));
        if (found) return foundry.utils.deepClone(found);
      }
    } catch (_) {
      // ignore
    }

    return null;
  }

  /**
   * Convert a 5etools Race/Subrace AND all of its individual racial trait entries via Plutonium
   */
  static async pConvertRaceAndTraits(
    { name, source, alternateNames = [] },
    { actor = null, customRaceMutator = null } = {}
  ) {
    const ok = await this.waitForPlutonium();
    if (!ok) return null;

    let rawRace = await this.pLoadRaceRaw({ name, source, alternateNames });
    if (!rawRace) {
      console.warn(`[Other Players] Could not find 5etools race ${name} (${source}).`);
      return null;
    }

    rawRace = foundry.utils.deepClone(rawRace);
    if (typeof customRaceMutator === "function") {
      await customRaceMutator(rawRace);
    }

    const pageRaces = globalThis.UrlUtil?.PG_RACES || "races.html";
    const raceHashBuilder =
      globalThis.UrlUtil.URL_TO_HASH_BUILDER[pageRaces] ||
      globalThis.UrlUtil.URL_TO_HASH_BUILDER["race"] ||
      (r => `${r.name}_${r.source}`.toLowerCase().replace(/[^a-z0-9_]+/g, "_"));

    // 1. Convert the Race Item itself via Plutonium's DataConverterRace (isActorItem: false so full description & summary table render)
    let raceDoc = null;
    try {
      if (this._converters.DataConverterRace?.pGetDocumentJson) {
        raceDoc = await this._converters.DataConverterRace.pGetDocumentJson(rawRace, {
          actor: null,
          isActorItem: false
        });
      }
    } catch (err) {
      console.warn(`[Other Players] DataConverterRace fallback for ${rawRace.name}:`, err);
    }

    const renderer = globalThis.Renderer?.get?.();

    if (!raceDoc) {
      const renderedEntries = renderer
        ? (rawRace.entries || []).map(e => renderer.render(e)).join("")
        : "";
      raceDoc = {
        name: rawRace.name,
        type: "race",
        img: "icons/environment/people/group.webp",
        system: {
          identifier: rawRace.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
          description: { value: `<div class="rd__b rd__b--2">${renderedEntries}</div>` },
          source: { book: rawRace.source, page: String(rawRace.page || ""), rules: "2014" },
          type: { value: "humanoid", subtype: "" },
          advancement: {}
        },
        flags: {
          plutonium: {
            page: pageRaces,
            source: rawRace.source,
            hash: raceHashBuilder(rawRace)
          }
        }
      };
    }

    delete raceDoc._id;
    raceDoc.name = rawRace.name;
    // Clear advancements on the race item that would trigger popups during automated sync, since we sync traits directly
    raceDoc.system.advancement = Array.isArray(raceDoc.system.advancement) ? [] : {};
    raceDoc.flags = foundry.utils.mergeObject(raceDoc.flags || {}, {
      "altarion-aitusa": {
        isOtherPlayerRace: true,
        raceKey: `race:${rawRace.name}:${rawRace.source}`.toLowerCase(),
        syncSchemaVersion: 1
      }
    });
    // CRITICAL: Mark `flags.plutonium.isDirectImport = true` so Plutonium's `preCreateItem` hook
    // NEVER intercepts/cancels `createEmbeddedDocuments` or spawns "Ability Scores?" popups!
    this.sanitizeConvertedDoc(raceDoc);

    // 2. Convert each named racial trait entry in `rawRace.entries` into its own Racial Feature (`feat` with type `race`)
    const ignoredTraitNames = new Set([
      "ability score increase",
      "ability score increases",
      "age",
      "alignment",
      "size",
      "speed",
      "languages",
      "language",
      "creature type"
    ]);

    const traitItems = [];
    for (const entry of rawRace.entries || []) {
      if (!entry || typeof entry !== "object" || !entry.name) continue;
      if (ignoredTraitNames.has(entry.name.trim().toLowerCase())) continue;

      let traitDoc = null;
      if (this._converters.DataConverterRaceFeature?.pGetDocumentJson) {
        try {
          const fakeRf = globalThis.DataUtil?.raceFeature?.getFauxRaceFeature
            ? globalThis.DataUtil.raceFeature.getFauxRaceFeature(rawRace, entry)
            : {
                name: entry.name,
                source: entry.source || rawRace.source,
                page: rawRace.page,
                raceName: rawRace.name,
                raceSource: rawRace.source,
                entries: entry.entries || [entry]
              };
          traitDoc = await this._converters.DataConverterRaceFeature.pGetDocumentJson(fakeRf, {
            actor,
            isActorItem: true
          });
        } catch (_) {
          traitDoc = null;
        }
      }

      if (!traitDoc) {
        const htmlDesc = renderer
          ? renderer.render({ type: "entries", entries: entry.entries || [] })
          : (entry.entries || []).join("<br>");
        traitDoc = {
          name: entry.name,
          type: "feat",
          img: raceDoc.img || "icons/magic/light/explosion-star-glow-blue-purple.webp",
          system: {
            description: { value: `<div class="rd__b rd__b--2">${htmlDesc}</div>` },
            source: {
              book: rawRace.source,
              page: String(rawRace.page || ""),
              custom: rawRace.name,
              rules: "2014"
            },
            type: { value: "race", subtype: "" },
            requirements: rawRace.name,
            uses: { spent: 0, max: "", recovery: [] },
            activities: {}
          },
          flags: {
            plutonium: {
              page: pageRaces,
              source: rawRace.source,
              hash: `${rawRace.name}_${entry.name}_${rawRace.source}`.toLowerCase().replace(/[^a-z0-9_]+/g, "_")
            }
          }
        };
      }

      delete traitDoc._id;
      traitDoc.name = entry.name;
      traitDoc.system.type = foundry.utils.mergeObject(traitDoc.system.type || {}, { value: "race" });
      traitDoc.system.requirements = rawRace.name;
      traitDoc.flags = foundry.utils.mergeObject(traitDoc.flags || {}, {
        "altarion-aitusa": {
          isOtherPlayerRacialTrait: true,
          originCategory: "race",
          parentRaceKey: `race:${rawRace.name}:${rawRace.source}`.toLowerCase(),
          featureKey: `racetrait:${rawRace.name}:${entry.name}:${rawRace.source}`.toLowerCase(),
          syncSchemaVersion: 1
        }
      });
      this.sanitizeConvertedDoc(traitDoc);

      traitItems.push(traitDoc);
    }

    return { raceDoc, traitItems, rawRace };
  }

  /* -------------------------------------------- */
  /*  Synchronization Helpers for Actor Documents */
  /* -------------------------------------------- */

  /**
   * Sync two Race items on an actor (keeping both without singleton deletion, deduplicating any extra copies)
   * and return their created/existing docs.
   */
  static async syncDualRaces(actor, raceBundles) {
    if (!actor || !Array.isArray(raceBundles)) return [];
    const syncedRaceDocs = [];
    const keptRaceIds = new Set();
    const extraRaceIdsToDelete = [];

    for (const bundle of raceBundles) {
      if (!bundle?.raceDoc) continue;
      const rKey = bundle.raceDoc.flags?.["altarion-aitusa"]?.raceKey;
      const targetNameLower = bundle.raceDoc.name.trim().toLowerCase();

      const matchingRaces = actor.items.filter(
        i =>
          i.type === "race" &&
          !keptRaceIds.has(i.id) &&
          (i.flags?.["altarion-aitusa"]?.raceKey === rKey ||
            i.name.trim().toLowerCase() === targetNameLower)
      );

      let existing = matchingRaces[0] || null;
      for (let idx = 1; idx < matchingRaces.length; idx++) {
        extraRaceIdsToDelete.push(matchingRaces[idx].id);
      }

      if (!existing) {
        const created = await actor.createEmbeddedDocuments("Item", [bundle.raceDoc]);
        existing = created?.[0];
      } else {
        const existingObj = existing.toObject();
        const existingAdvCount = this.getAdvancementArray(existingObj.system?.advancement).length;
        const needsDirectFlag =
          existingObj.flags?.plutonium && !existingObj.flags.plutonium.isDirectImport;
        const descChanged =
          (existing.system?.description?.value || "") !== (bundle.raceDoc.system?.description?.value || "");
        const missingRaceKey = !existing.flags?.["altarion-aitusa"]?.raceKey;

        if (descChanged || missingRaceKey || needsDirectFlag || existingAdvCount > 0) {
          const clearedAdv = Array.isArray(existingObj.system?.advancement)
            ? []
            : Object.fromEntries(
                Object.keys(existingObj.system?.advancement || {})
                  .filter(k => !k.startsWith("-="))
                  .map(k => [`-=${k}`, null])
              );
          await existing.update({
            name: bundle.raceDoc.name,
            img: bundle.raceDoc.img,
            "system.description": bundle.raceDoc.system.description,
            "system.source": bundle.raceDoc.system.source,
            ...(existingAdvCount > 0 ? { "system.advancement": clearedAdv } : {}),
            flags: foundry.utils.mergeObject(existingObj.flags || {}, bundle.raceDoc.flags || {})
          });
        }
      }

      if (existing) {
        keptRaceIds.add(existing.id);
        syncedRaceDocs.push({ raceItem: existing, traitItems: bundle.traitItems || [] });
      }
    }

    if (extraRaceIdsToDelete.length > 0) {
      await actor.deleteEmbeddedDocuments("Item", extraRaceIdsToDelete);
    }

    // Sync all racial trait feats linked to their respective parent Race item
    for (const { raceItem, traitItems } of syncedRaceDocs) {
      await this.syncFeatureItems(actor, traitItems, {
        maxLevel: 20,
        raceItemId: raceItem.id
      });
    }

    // Ensure the 1st race in `raceBundles` is explicitly bound as the primary Species (`system.details.race` & sort order)
    if (syncedRaceDocs.length >= 1) {
      const primaryRace = syncedRaceDocs[0].raceItem;
      const curRaceId =
        typeof actor._source?.system?.details?.race === "string"
          ? actor._source.system.details.race
          : actor.system?.details?.race?.id || "";
      if (primaryRace?.id && curRaceId !== primaryRace.id) {
        try {
          await actor.update({ "system.details.race": primaryRace.id });
        } catch (_e) {}
      }
      if (syncedRaceDocs.length >= 2) {
        const secondRace = syncedRaceDocs[1].raceItem;
        const sortUpdates = [];
        if (primaryRace && Number(primaryRace.sort ?? 0) !== 100000) {
          sortUpdates.push({ _id: primaryRace.id, sort: 100000 });
        }
        if (secondRace && Number(secondRace.sort ?? 0) !== 200000) {
          sortUpdates.push({ _id: secondRace.id, sort: 200000 });
        }
        if (sortUpdates.length > 0) {
          try {
            await actor.updateEmbeddedDocuments("Item", sortUpdates);
          } catch (_e) {}
        }
      }
    }

    return syncedRaceDocs.map(r => r.raceItem);
  }

  /* -------------------------------------------- */
  /*  Deterministic Advancements & Deduplication  */
  /* -------------------------------------------- */

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
    let out = "OP";
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

  static isValidAdvId(id) {
    return typeof id === "string" && /^[A-Za-z0-9]{16}$/.test(id);
  }

  static getAdvancementArray(advSource) {
    if (!advSource) return [];
    if (Array.isArray(advSource)) return advSource;
    if (typeof advSource.values === "function") {
      return Array.from(advSource.values()).map(a => (typeof a?.toObject === "function" ? a.toObject() : a));
    }
    if (typeof advSource === "object") {
      return Object.entries(advSource)
        .filter(([k, v]) => !k.startsWith("-=") && v)
        .map(([, v]) => v);
    }
    return [];
  }

  /**
   * Build an advancement update patch that explicitly deletes removed/duplicate keys via `"-=oldKey": null`.
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
        : this.makeDeterministicAdvId(`op:adv:${adv.type}:${adv.level ?? 0}:${idx}`);
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
   * Deduplicate advancements so no duplicate `ItemGrant`, `Subclass`, `AbilityScoreImprovement`,
   * `ScaleValue`, `Trait`, or `HitPoints` steps can ever accumulate.
   */
  static deduplicateAdvancementList(advSource, { isSecondary = false, seedPrefix = "op" } = {}) {
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
        const choicesKey = JSON.stringify(
          (adv.configuration?.choices || []).map(c => ({ count: c?.count, pool: c?.pool }))
        );
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
        : this.makeDeterministicAdvId(
            `${seedPrefix}:${adv.type}:${adv.level ?? 0}:${adv.configuration?.identifier || adv.title || i}`
          );
    }

    return clean;
  }

  /**
   * Ensure Plutonium-converted class/subclass features for Parva, Kyrion, and Flinn exist in
   * `altarion-aitusa.subclasses` Compendium and return `{ [level]: [uuid, ...] }` for single-step ItemGrants.
   */
  static async pResolveFeatureGrantUuidsByLevel({
    featureDefs = [],
    className,
    classSource = "PHB",
    subclassShortName = null,
    subclassSource = null,
    isSecondary = false,
    clsRaw = null,
    scRaw = null
  } = {}) {
    const uuidsByLevel = {};
    if (!Array.isArray(featureDefs) || !featureDefs.length || !className) return uuidsByLevel;

    const modulePack = game.packs?.get("altarion-aitusa.subclasses");
    if (!modulePack) return uuidsByLevel;

    // Exclude ASI (handled natively by AbilityScoreImprovement advancement) and level>1 subclass-unlock blurbs
    const skippedNames = new Set([
      "ability score improvement",
      "arcane tradition",
      "roguish archetype"
    ]);
    const validDefs = featureDefs.filter(
      d => d && d.name && !skippedNames.has(d.name.trim().toLowerCase())
    );
    if (!validDefs.length) return uuidsByLevel;

    // Hydrate cache from pack documents if needed
    const refreshCacheFromPack = async () => {
      const docs = await modulePack.getDocuments();
      for (const doc of docs) {
        const cKey = doc.flags?.["altarion-aitusa"]?.compendiumKey;
        if (cKey) {
          this._compendiumUuidByKey.set(cKey, doc.uuid);
        }
      }
      return docs;
    };

    const keyPrefix = subclassShortName
      ? `${className}:${subclassShortName}`
      : `${className}:class`;
    const roleTag = isSecondary ? "sec" : "pri";

    // Check if any def is missing from cache
    const missingDefs = [];
    for (const def of validDefs) {
      const lvl = Number(def.level || 1);
      const fKey = `${keyPrefix}:${def.name}:${lvl}`.toLowerCase();
      const compKey = `op:${roleTag}:${fKey}`;
      if (!this._compendiumUuidByKey.has(compKey)) {
        missingDefs.push({ def, lvl, fKey, compKey });
      }
    }

    if (missingDefs.length > 0) {
      await refreshCacheFromPack();
    }

    const stillMissing = missingDefs.filter(m => !this._compendiumUuidByKey.has(m.compKey));
    if (stillMissing.length > 0 && game.user?.isGM) {
      const toSeed = [];
      for (const { def, lvl, fKey, compKey } of stillMissing) {
        const stub = subclassShortName
          ? {
              name: def.name,
              source: def.source || subclassSource || "PHB",
              className,
              classSource,
              subclassShortName,
              subclassSource: subclassSource || def.source || "PHB",
              level: lvl,
              __prop: "subclassFeature"
            }
          : {
              name: def.name,
              source: def.source || classSource || "PHB",
              className,
              classSource,
              level: lvl,
              __prop: "classFeature"
            };

        const converted = await this.pConvertFeatureStub(stub, {
          actor: null,
          isSecondary,
          originCategory: subclassShortName ? "subclass" : "class",
          clsRaw,
          scRaw
        });
        if (converted) {
          converted.flags = foundry.utils.mergeObject(converted.flags || {}, {
            "altarion-aitusa": {
              otherPlayersCompendiumFeat: true,
              compendiumKey: compKey,
              featureKey: fKey
            }
          });
          toSeed.push({ compKey, data: converted });
        }
      }

      if (toSeed.length > 0) {
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
            const currentDocs = await refreshCacheFromPack();
            const docsToCreate = [];
            const keysToCreate = [];
            for (const entry of toSeed) {
              const already = currentDocs.find(
                d => d.flags?.["altarion-aitusa"]?.compendiumKey === entry.compKey
              );
              if (already) {
                this._compendiumUuidByKey.set(entry.compKey, already.uuid);
              } else {
                docsToCreate.push(entry.data);
                keysToCreate.push(entry.compKey);
              }
            }
            if (docsToCreate.length > 0) {
              const createdDocs = await Item.createDocuments(docsToCreate, { pack: modulePack.collection });
              for (let i = 0; i < createdDocs.length; i++) {
                if (createdDocs[i] && keysToCreate[i]) {
                  this._compendiumUuidByKey.set(keysToCreate[i], createdDocs[i].uuid);
                }
              }
            }
          } catch (err) {
            console.warn("[Other Players] Could not seed class/subclass features into compendium:", err);
          } finally {
            if (wasLocked) await modulePack.configure({ locked: true });
          }
        });
      }
    }

    for (const def of validDefs) {
      const lvl = Number(def.level || 1);
      const fKey = `${keyPrefix}:${def.name}:${lvl}`.toLowerCase();
      const compKey = `op:${roleTag}:${fKey}`;
      const uuid = this._compendiumUuidByKey.get(compKey);
      if (uuid) {
        if (!uuidsByLevel[lvl]) uuidsByLevel[lvl] = [];
        if (!uuidsByLevel[lvl].includes(uuid)) {
          uuidsByLevel[lvl].push(uuid);
        }
      }
    }

    return uuidsByLevel;
  }

  /**
   * Build a clean, deduplicated Class advancement patch with strictly 1 step for features per level.
   */
  static buildClassAdvancements({
    existingAdvSource,
    freshAdvSource,
    ident,
    subclassUnlockLevel = 1,
    isSecondary = false,
    targetLevel = 4,
    grantUuidsByLevel = null,
    actor = null
  }) {
    const roleTag = isSecondary ? "sec" : "pri";
    const seedPrefix = `op:${ident}:${roleTag}`;
    const baseList = this.deduplicateAdvancementList(existingAdvSource || freshAdvSource || {}, {
      isSecondary,
      seedPrefix
    });

    // Merge in any missing ScaleValue advancements from freshAdvSource
    if (existingAdvSource && freshAdvSource) {
      const freshDedup = this.deduplicateAdvancementList(freshAdvSource, { isSecondary, seedPrefix });
      for (const fAdv of freshDedup) {
        if (fAdv.type === "ScaleValue") {
          const sKey = String(fAdv.configuration?.identifier || fAdv.title || "").trim().toLowerCase();
          if (
            sKey &&
            !baseList.some(
              a =>
                a.type === "ScaleValue" &&
                String(a.configuration?.identifier || a.title || "").trim().toLowerCase() === sKey
            )
          ) {
            baseList.push(fAdv);
          }
        }
      }
    }

    // 1. Primary Class HitPoints defaults (1: "max", 2..targetLevel: "avg")
    if (!isSecondary) {
      let hpAdv = baseList.find(a => a.type === "HitPoints");
      if (!hpAdv) {
        hpAdv = {
          _id: this.makeDeterministicAdvId(`${seedPrefix}:hp`),
          type: "HitPoints",
          configuration: {},
          value: {}
        };
        baseList.unshift(hpAdv);
      }
      hpAdv.value = foundry.utils.deepClone(hpAdv.value || {});
      for (let lvl = 1; lvl <= targetLevel; lvl++) {
        if (hpAdv.value[lvl] === undefined || hpAdv.value[lvl] === null || hpAdv.value[lvl] === "") {
          hpAdv.value[lvl] = lvl === 1 ? "max" : "avg";
        }
      }
    }

    // 2. Strictly 1 Subclass advancement at subclassUnlockLevel
    let subAdv = baseList.find(a => a.type === "Subclass");
    if (!subAdv) {
      baseList.push({
        _id: this.makeDeterministicAdvId(`${seedPrefix}:subclass:${subclassUnlockLevel}`),
        type: "Subclass",
        configuration: {},
        value: {},
        level: Number(subclassUnlockLevel || 1),
        title: "Subclass",
        icon: null
      });
    } else {
      subAdv.level = Number(subAdv.level || subclassUnlockLevel || 1);
    }

    // 3. Strictly 1 AbilityScoreImprovement advancement at each standard class ASI level
    const asiLevels =
      ident === "rogue"
        ? [4, 8, 10, 12, 16, 19]
        : ident === "fighter"
          ? [4, 6, 8, 12, 14, 16, 19]
          : [4, 8, 12, 16, 19];
    for (const asiLvl of asiLevels) {
      const hasAsi = baseList.some(a => a.type === "AbilityScoreImprovement" && Number(a.level) === asiLvl);
      if (!hasAsi) {
        baseList.push({
          _id: this.makeDeterministicAdvId(`${seedPrefix}:asi:${asiLvl}`),
          type: "AbilityScoreImprovement",
          configuration: { points: 2, fixed: {}, cap: 2, locked: [] },
          value: { type: "asi" },
          level: asiLvl,
          title: "Ability Score Improvement",
          icon: null
        });
      }
    }

    // 4. Replace ItemGrants if grantUuidsByLevel was resolved (strictly 1 deterministic ItemGrant per level)
    let finalList = baseList;
    if (grantUuidsByLevel && Object.keys(grantUuidsByLevel).length > 0) {
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
      finalList = baseList.filter(a => a.type !== "ItemGrant");
      for (const [lvlStr, rawUuids] of Object.entries(grantUuidsByLevel)) {
        const uuids = Array.from(new Set((rawUuids || []).filter(Boolean)));
        if (!uuids.length) continue;
        const lvl = Number(lvlStr);
        const added = {};
        for (const u of uuids) {
          const existingId = preservedAddedByUuid.get(u);
          if (existingId) added[existingId] = u;
        }
        finalList.push({
          _id: this.makeDeterministicAdvId(`${seedPrefix}:grant:${lvl}`),
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
    }

    return this.buildAdvancementUpdatePatch(existingAdvSource, finalList);
  }

  /**
   * Build a clean, deduplicated Subclass advancement patch with strictly 1 step for features per level.
   */
  static buildSubclassAdvancements({
    existingAdvSource,
    freshAdvSource,
    scIdent,
    isSecondary = false,
    grantUuidsByLevel = null,
    actor = null
  }) {
    const roleTag = isSecondary ? "sec" : "pri";
    const seedPrefix = `op:sc:${scIdent}:${roleTag}`;
    const baseList = this.deduplicateAdvancementList(existingAdvSource || freshAdvSource || {}, {
      isSecondary,
      seedPrefix
    });

    let finalList = baseList;
    if (grantUuidsByLevel && Object.keys(grantUuidsByLevel).length > 0) {
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
      finalList = baseList.filter(a => a.type !== "ItemGrant");
      for (const [lvlStr, rawUuids] of Object.entries(grantUuidsByLevel)) {
        const uuids = Array.from(new Set((rawUuids || []).filter(Boolean)));
        if (!uuids.length) continue;
        const lvl = Number(lvlStr);
        const added = {};
        for (const u of uuids) {
          const existingId = preservedAddedByUuid.get(u);
          if (existingId) added[existingId] = u;
        }
        finalList.push({
          _id: this.makeDeterministicAdvId(`${seedPrefix}:grant:${lvl}`),
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
    }

    return this.buildAdvancementUpdatePatch(existingAdvSource, finalList);
  }

  /**
   * Remove duplicate feature items (`feat`) on Parva, Kyrion, or Flinn while preserving legitimate
   * distinct features (such as Primary vs Secondary `Spellcasting` or Rogue Lvl 1 vs Lvl 6 `Expertise`).
   */
  static async cleanupDuplicateFeatures(actor) {
    if (!actor) return;
    const handler = this.getHandlerForActor(actor);
    const secNameLower = (handler?.SECONDARY_CLASS?.name || "").toLowerCase();
    const secScLower = (handler?.SECONDARY_CLASS?.subclass?.shortName || "").toLowerCase();
    const priNameLower = (handler?.PRIMARY_CLASS?.name || "").toLowerCase();
    const priScLower = (handler?.PRIMARY_CLASS?.subclass?.shortName || "").toLowerCase();

    const secClassItem = actor.items.find(i => i.type === "class" && this.isSecondaryClass(i, actor));
    const secScItem = secClassItem
      ? actor.items.find(
          i => i.type === "subclass" && i.system?.classIdentifier === secClassItem.system?.identifier
        )
      : null;

    const getBucket = (item) => {
      const flags = item.flags?.["altarion-aitusa"] || {};
      if (flags.originCategory === "race" || item.system?.type?.value === "race") return "race";
      if (flags.originCategory === "feat" || item.system?.type?.value === "feat") return "feat";
      if (flags.isSecondaryClassItem) return "sec";
      if (flags.isPrimaryClassItem) return "pri";

      const origin = String(item.flags?.dnd5e?.advancementOrigin || "");
      if ((secClassItem && origin.startsWith(secClassItem.id)) || (secScItem && origin.startsWith(secScItem.id))) {
        return "sec";
      }
      const req = String(item.system?.requirements || "").toLowerCase();
      if ((secNameLower && req.includes(secNameLower)) || (secScLower && req.includes(secScLower))) {
        return "sec";
      }
      if ((priNameLower && req.includes(priNameLower)) || (priScLower && req.includes(priScLower))) {
        return "pri";
      }
      return "pri";
    };

    const scoreItem = (it) => {
      let score = 0;
      if (it.flags?.["altarion-aitusa"]?.featureKey) score += 4;
      if (it.flags?.plutonium) score += 2;
      if (it.flags?.dnd5e?.advancementOrigin) score += 1;
      return score;
    };

    const duplicateIds = new Set();

    // Pass 1: Exact featureKey duplicates
    const byFeatureKey = new Map();
    for (const item of actor.items) {
      if (item.type !== "feat") continue;
      const fKey = item.flags?.["altarion-aitusa"]?.featureKey;
      const bucket = getBucket(item);
      if (!fKey) continue;
      const k = `${bucket}::${fKey}`;
      if (!byFeatureKey.has(k)) byFeatureKey.set(k, []);
      byFeatureKey.get(k).push(item);
    }
    for (const list of byFeatureKey.values()) {
      if (list.length <= 1) continue;
      list.sort((a, b) => scoreItem(b) - scoreItem(a));
      for (let i = 1; i < list.length; i++) duplicateIds.add(list[i].id);
    }

    // Pass 2: Same normalized (name, bucket) where at least one item lacks a distinct featureKey
    const byNameBucket = new Map();
    for (const item of actor.items) {
      if (item.type !== "feat" || duplicateIds.has(item.id)) continue;
      const normName = String(item.name || "").trim().toLowerCase();
      if (!normName || normName === "ability score improvement") continue;
      const bucket = getBucket(item);
      const k = `${bucket}::${normName}`;
      if (!byNameBucket.has(k)) byNameBucket.set(k, []);
      byNameBucket.get(k).push(item);
    }
    for (const list of byNameBucket.values()) {
      if (list.length <= 1) continue;
      list.sort((a, b) => scoreItem(b) - scoreItem(a));
      const canonical = list[0];
      const canonicalKey = canonical.flags?.["altarion-aitusa"]?.featureKey || "";
      for (let i = 1; i < list.length; i++) {
        const otherKey = list[i].flags?.["altarion-aitusa"]?.featureKey || "";
        // Keep distinct multi-level features (like Rogue Expertise Lvl 1 vs Lvl 6) that have different explicit featureKeys
        if (canonicalKey && otherKey && canonicalKey !== otherKey) continue;
        duplicateIds.add(list[i].id);
      }
    }

    if (duplicateIds.size > 0) {
      await actor.deleteEmbeddedDocuments("Item", Array.from(duplicateIds));
      console.log(`[Other Players] Removed ${duplicateIds.size} duplicate feature items from ${actor.name}`);
    }
  }

  /**
   * Sync a Class and its Subclass on an actor (with deduplicated advancements and 1-step ItemGrants)
   */
  static async syncClassAndSubclass(
    actor,
    {
      clsData,
      scData,
      subclassUnlockLevel = 1,
      isSecondary = false,
      classFeatureDefs = null,
      subclassFeatureDefs = null,
      clsRaw = null,
      scRaw = null,
      className = null,
      classSource = "PHB",
      subclassShortName = null,
      subclassSource = null
    }
  ) {
    if (!actor || !clsData) return { classItem: null, subclassItem: null };

    await this.cleanupDuplicateFeatures(actor);

    const ident = (clsData.system?.identifier || clsData.name.toLowerCase().replace(/\s+/g, "-")).toLowerCase();
    const resolvedClassName = className || clsRaw?.name || clsData.name;
    const resolvedScShort = subclassShortName || scRaw?.shortName || scData?.name || null;

    const classGrantUuidsByLevel = classFeatureDefs
      ? await this.pResolveFeatureGrantUuidsByLevel({
          featureDefs: classFeatureDefs,
          className: resolvedClassName,
          classSource,
          isSecondary,
          clsRaw
        })
      : null;

    const subclassGrantUuidsByLevel =
      subclassFeatureDefs && resolvedScShort
        ? await this.pResolveFeatureGrantUuidsByLevel({
            featureDefs: subclassFeatureDefs,
            className: resolvedClassName,
            classSource,
            subclassShortName: resolvedScShort,
            subclassSource: subclassSource || scRaw?.source || "PHB",
            isSecondary,
            clsRaw,
            scRaw
          })
        : null;

    let classItem = actor.items.find(
      i =>
        i.type === "class" &&
        (i.system?.identifier?.toLowerCase() === ident || i.name.toLowerCase() === clsData.name.toLowerCase())
    );

    if (!classItem) {
      const targetLvl = Number(clsData.system?.levels || 1);
      clsData.system.advancement = this.buildClassAdvancements({
        existingAdvSource: null,
        freshAdvSource: clsData.system?.advancement,
        ident,
        subclassUnlockLevel,
        isSecondary,
        targetLevel: targetLvl,
        grantUuidsByLevel: classGrantUuidsByLevel,
        actor
      });
      const created = await actor.createEmbeddedDocuments("Item", [clsData]);
      classItem = created?.[0] || null;
    } else {
      const existingObj = classItem.toObject();
      const curLvl = Number(existingObj.system?.levels || clsData.system?.levels || 1);
      const advPatch = this.buildClassAdvancements({
        existingAdvSource: existingObj.system?.advancement,
        freshAdvSource: clsData.system?.advancement,
        ident,
        subclassUnlockLevel,
        isSecondary,
        targetLevel: curLvl,
        grantUuidsByLevel: classGrantUuidsByLevel,
        actor
      });
      await classItem.update({
        img: clsData.img,
        "system.description.value": clsData.system.description.value,
        "system.source": clsData.system.source,
        "system.spellcasting": clsData.system.spellcasting,
        "system.advancement": advPatch,
        flags: foundry.utils.mergeObject(existingObj.flags || {}, clsData.flags || {})
      });
    }

    const currentLvl = Number(classItem?.system?.levels || clsData.system?.levels || 1);
    let subclassItem = actor.items.find(
      i =>
        i.type === "subclass" &&
        (i.system?.classIdentifier?.toLowerCase() === ident ||
          (scData && i.name.toLowerCase() === scData.name.toLowerCase()))
    );

    if (scData && currentLvl >= subclassUnlockLevel) {
      scData.system.classIdentifier = classItem?.system?.identifier || ident;
      const scIdent = (scData.system?.identifier || scData.name.toLowerCase().replace(/\s+/g, "-")).toLowerCase();
      if (!subclassItem) {
        scData.system.advancement = this.buildSubclassAdvancements({
          existingAdvSource: null,
          freshAdvSource: scData.system?.advancement,
          scIdent,
          isSecondary,
          grantUuidsByLevel: subclassGrantUuidsByLevel,
          actor
        });
        const createdSc = await actor.createEmbeddedDocuments("Item", [scData]);
        subclassItem = createdSc?.[0] || null;
      } else {
        const existingScObj = subclassItem.toObject();
        const scAdvPatch = this.buildSubclassAdvancements({
          existingAdvSource: existingScObj.system?.advancement,
          freshAdvSource: scData.system?.advancement,
          scIdent,
          isSecondary,
          grantUuidsByLevel: subclassGrantUuidsByLevel,
          actor
        });
        await subclassItem.update({
          img: scData.img,
          "system.classIdentifier": scData.system.classIdentifier,
          "system.description.value": scData.system.description.value,
          "system.source": scData.system.source,
          "system.advancement": scAdvPatch,
          flags: foundry.utils.mergeObject(existingScObj.flags || {}, scData.flags || {})
        });
      }
    } else if (subclassItem && currentLvl < subclassUnlockLevel) {
      await subclassItem.delete();
      subclassItem = null;
    }

    return { classItem, subclassItem, currentLvl };
  }

  /**
   * Sync a list of converted feature items (`feat`) onto an actor, linking `advancementOrigin`
   * to the parent Class, Subclass, or Race item, adopting AdvancementManager-granted items
   * without duplicating them, and pruning higher-level features when leveling down.
   */
  static async syncFeatureItems(
    actor,
    featureList,
    { maxLevel = 20, classItemId = null, subclassItemId = null, raceItemId = null, isSecondary = null } = {}
  ) {
    if (!actor || !Array.isArray(featureList)) return;

    // Infer whether this batch is for Secondary vs Primary class if classItemId was passed
    const resolvedIsSecondary =
      typeof isSecondary === "boolean"
        ? isSecondary
        : featureList.some(f => f?.flags?.["altarion-aitusa"]?.isSecondaryClassItem)
          ? true
          : classItemId
            ? false
            : null;

    // 1. If syncing a Class/Subclass and user reduced class level, remove features above maxLevel
    if (classItemId && resolvedIsSecondary !== null && maxLevel < 20) {
      const bucketFlag = resolvedIsSecondary ? "isSecondaryClassItem" : "isPrimaryClassItem";
      const excessIds = actor.items
        .filter(i => {
          if (i.type !== "feat") return false;
          const fl = i.flags?.["altarion-aitusa"] || {};
          if (fl.originCategory === "race" || fl.originCategory === "feat") return false;
          const origin = String(i.flags?.dnd5e?.advancementOrigin || "");
          const belongsHere =
            Boolean(fl[bucketFlag]) ||
            origin.startsWith(classItemId) ||
            (subclassItemId && origin.startsWith(subclassItemId));
          return belongsHere && Number(fl.levelRequired || 0) > maxLevel;
        })
        .map(i => i.id);

      if (excessIds.length > 0) {
        await actor.deleteEmbeddedDocuments("Item", excessIds);
      }
    }

    const toCreate = [];
    const toUpdate = [];
    const claimedItemIds = new Set();

    for (const rawFeat of featureList) {
      if (!rawFeat) continue;
      const featData = foundry.utils.deepClone(rawFeat);
      const fKey = featData.flags?.["altarion-aitusa"]?.featureKey;
      const isSecFeat = Boolean(featData.flags?.["altarion-aitusa"]?.isSecondaryClassItem);
      const isPriFeat = Boolean(featData.flags?.["altarion-aitusa"]?.isPrimaryClassItem);
      const normFeatName = featData.name.trim().toLowerCase();
      const isAsi = normFeatName === "ability score improvement";
      const originCategory = featData.flags?.["altarion-aitusa"]?.originCategory || "class";
      const originId =
        originCategory === "race"
          ? raceItemId
          : originCategory === "subclass"
            ? subclassItemId || classItemId
            : classItemId;

      if (originId) {
        featData.flags = foundry.utils.mergeObject(featData.flags || {}, {
          dnd5e: {
            advancementOrigin: originId,
            advancementRoot: originId
          }
        });
      }

      const existing = actor.items.find(i => {
        if (i.type !== "feat" || claimedItemIds.has(i.id)) return false;
        const iFlags = i.flags?.["altarion-aitusa"] || {};
        if (fKey && iFlags.featureKey === fKey) {
          // Ensure Primary vs Secondary separation if both classes share a featureKey pattern (e.g. Warlock on Parva vs Kyrion)
          if (isSecFeat && iFlags.isPrimaryClassItem && !iFlags.isSecondaryClassItem) return false;
          if (isPriFeat && iFlags.isSecondaryClassItem && !iFlags.isPrimaryClassItem) return false;
          return true;
        }
        if (i.name.trim().toLowerCase() !== normFeatName) return false;
        if ((i.system?.requirements || "") === (featData.system?.requirements || "")) {
          if (isSecFeat && iFlags.isPrimaryClassItem && !iFlags.isSecondaryClassItem) return false;
          if (isPriFeat && iFlags.isSecondaryClassItem && !iFlags.isPrimaryClassItem) return false;
          if (fKey && iFlags.featureKey && iFlags.featureKey !== fKey) return false;
          return true;
        }
        // Adopt AdvancementManager-granted items (from Compendium) that match by name & parent origin/bucket
        if (!isAsi && (!iFlags.featureKey || iFlags.featureKey === fKey)) {
          const iOrigin = String(i.flags?.dnd5e?.advancementOrigin || "");
          if (
            (originId && iOrigin.startsWith(originId)) ||
            (classItemId && iOrigin.startsWith(classItemId)) ||
            (subclassItemId && iOrigin.startsWith(subclassItemId))
          ) {
            return true;
          }
          if (isSecFeat && iFlags.isSecondaryClassItem) return true;
          if (isPriFeat && iFlags.isPrimaryClassItem) return true;
        }
        return false;
      });

      if (!existing) {
        toCreate.push(featData);
      } else {
        claimedItemIds.add(existing.id);
        const curOrigin = String(existing.getFlag("dnd5e", "advancementOrigin") || "");
        const originMatches =
          !originId || curOrigin === originId || curOrigin.startsWith(`${originId}.`);
        const descChanged =
          (existing.system?.description?.value || "") !== (featData.system?.description?.value || "");
        const imgChanged = Boolean(featData.img && existing.img !== featData.img);
        const targetSchema = Number(featData.flags?.["altarion-aitusa"]?.syncSchemaVersion || 0);
        const curSchema = Number(existing.flags?.["altarion-aitusa"]?.syncSchemaVersion || 0);
        const schemaChanged = targetSchema > 0 && curSchema < targetSchema;
        const missingRoleFlags =
          (fKey && existing.flags?.["altarion-aitusa"]?.featureKey !== fKey) ||
          (isSecFeat && !existing.flags?.["altarion-aitusa"]?.isSecondaryClassItem) ||
          (isPriFeat && !existing.flags?.["altarion-aitusa"]?.isPrimaryClassItem);

        if (!originMatches || descChanged || imgChanged || schemaChanged || missingRoleFlags) {
          const mergedFlags = foundry.utils.mergeObject(existing.toObject().flags || {}, featData.flags || {});
          if (originMatches && curOrigin) {
            mergedFlags.dnd5e = mergedFlags.dnd5e || {};
            mergedFlags.dnd5e.advancementOrigin = curOrigin;
          }
          const hasCustomActivities =
            featData.system?.activities && Object.keys(featData.system.activities).length > 0;
          const hasCustomUses = Boolean(featData.system?.uses?.max);
          toUpdate.push({
            _id: existing.id,
            name: featData.name,
            img: featData.img,
            "system.description": featData.system.description,
            "system.type": featData.system.type,
            "system.requirements": featData.system.requirements,
            ...(hasCustomActivities ? { "system.activities": featData.system.activities } : {}),
            ...(hasCustomUses
              ? {
                  "system.uses.max": featData.system.uses.max,
                  "system.uses.recovery": featData.system.uses.recovery || []
                }
              : {}),
            flags: mergedFlags
          });
        }
      }
    }

    if (toCreate.length > 0) {
      await actor.createEmbeddedDocuments("Item", toCreate);
    }
    if (toUpdate.length > 0) {
      await actor.updateEmbeddedDocuments("Item", toUpdate);
    }

    await this.cleanupDuplicateFeatures(actor);
  }

  /**
   * Sync a list of granted Spells onto an actor (without creating duplicates)
   */
  static async syncSpells(actor, spellDefs) {
    if (!actor || !Array.isArray(spellDefs)) return;
    for (const def of spellDefs) {
      const exists = actor.items.some(
        i => i.type === "spell" && i.name.trim().toLowerCase() === def.name.trim().toLowerCase()
      );
      if (!exists) {
        const spellDoc = await this.pConvertSpell({
          name: def.name,
          source: def.source || "PHB",
          actor
        });
        if (spellDoc) {
          if (def.preparationMode) {
            spellDoc.system.method = def.preparationMode;
          }
          if (def.prepared !== undefined) {
            spellDoc.system.prepared = def.prepared;
          }
          await actor.createEmbeddedDocuments("Item", [spellDoc]);
        }
      }
    }
  }

  /* -------------------------------------------- */
  /*  Interactive Choice Dialogs (RTF Previews)   */
  /* -------------------------------------------- */

  static getEldritchInvocationCount(warlockLevel) {
    if (warlockLevel < 2) return 0;
    if (warlockLevel <= 4) return 2;
    if (warlockLevel <= 6) return 3;
    if (warlockLevel <= 8) return 4;
    if (warlockLevel <= 11) return 5;
    if (warlockLevel <= 14) return 6;
    if (warlockLevel <= 17) return 7;
    return 8;
  }

  static getMetamagicCount(sorcererLevel) {
    if (sorcererLevel < 3) return 0;
    if (sorcererLevel < 10) return 2;
    if (sorcererLevel < 17) return 3;
    return 4;
  }

  /**
   * Load all 5etools optionalfeatures matching a given featureType ("EI", "MM", "PB")
   */
  static async pGetOptionalFeaturesByType(featureType) {
    const ok = await this.waitForPlutonium();
    if (!ok) return [];

    try {
      const pageOpt = globalThis.UrlUtil?.PG_OPT_FEATURES || "optionalfeatures.html";
      const allOpt = await globalThis.DataLoader.pCacheAndGetAllSite(pageOpt);
      if (!Array.isArray(allOpt)) return [];

      // Filter to 2014 rules sources (PHB, XGE, TCE) and matching featureType
      const allowedSources = new Set(["PHB", "XGE", "TCE"]);
      const seenNames = new Set();
      const filtered = [];

      for (const opt of allOpt) {
        if (!opt || !Array.isArray(opt.featureType) || !opt.featureType.includes(featureType)) continue;
        if (!allowedSources.has(opt.source)) continue;
        const key = opt.name.trim().toLowerCase();
        if (seenNames.has(key)) continue;
        seenNames.add(key);
        filtered.push(opt);
      }

      filtered.sort((a, b) => a.name.localeCompare(b.name));
      return filtered;
    } catch (err) {
      console.warn(`[Other Players] Could not load optionalfeatures for ${featureType}:`, err);
      return [];
    }
  }

  /**
   * Prompt an interactive Choice Dialog (with Search + Rich Text Format preview) whenever an actor
   * has unpicked Optional Features (Eldritch Invocations, Metamagic, Pact Boon).
   */
  static async promptOptionalFeatureChoiceIfNeeded(
    actor,
    {
      featureType = "EI",
      choiceCategory = "eldritch-invocation",
      title = "Choose Eldritch Invocations",
      totalAllowed = 2,
      classItem = null,
      isSecondary = false,
      requirementsLabel = "Warlock",
      subtype = "eldritchInvocation",
      forceOpen = false
    } = {}
  ) {
    if (!actor || totalAllowed <= 0) return;

    const existingChoices = actor.items.filter(
      i =>
        i.type === "feat" &&
        (i.flags?.["altarion-aitusa"]?.choiceCategory === choiceCategory ||
          (subtype && i.system?.type?.subtype === subtype))
    );

    const missingCount = Math.max(0, totalAllowed - existingChoices.length);
    if (missingCount <= 0 && !forceOpen) return;

    const lockKey = `${actor.id}:${choiceCategory}`;
    if (this._choiceDialogOpenFor.has(lockKey)) return;
    this._choiceDialogOpenFor.add(lockKey);
    let dialogRendered = false;

    try {
      const optionsRaw = await this.pGetOptionalFeaturesByType(featureType);
      if (optionsRaw.length === 0) return;

      const renderer = globalThis.Renderer?.get?.();
      const enrichFn =
        foundry?.applications?.ux?.TextEditor?.implementation?.enrichHTML?.bind(
          foundry.applications.ux.TextEditor.implementation
        ) ||
        TextEditor?.enrichHTML?.bind(TextEditor) ||
        (async html => html);

      const existingNames = new Set(existingChoices.map(i => i.name.trim().toLowerCase()));
      const availableOptions = optionsRaw.filter(o => !existingNames.has(o.name.trim().toLowerCase()));
      if (availableOptions.length === 0) return;

      const metaByIndex = new Map();
      for (let idx = 0; idx < availableOptions.length; idx++) {
        const opt = availableOptions[idx];
        const prereqStr = renderer && opt.prerequisite
          ? renderer.utils?. prerequisite?.getHtml?.(opt.prerequisite) || ""
          : "";
        const rawHtml = renderer
          ? renderer.render({ type: "entries", entries: opt.entries || [] })
          : (opt.entries || []).join("<br>");
        const enrichedHtml = await enrichFn(
          `${prereqStr ? `<p><em>Prerequisite: ${prereqStr}</em></p>` : ""}<div class="rd__b rd__b--2">${rawHtml}</div>`,
          { async: true, relativeTo: actor, rollData: actor.getRollData?.() || {} }
        );
        metaByIndex.set(String(idx), {
          idx,
          opt,
          name: `${opt.name} (${opt.source})`,
          enrichedHtml
        });
      }

      const slotsToPick = missingCount > 0 ? missingCount : 1;
      const selectsHtml = [];
      for (let s = 0; s < slotsToPick; s++) {
        const optsHtml = availableOptions
          .map((o, idx) => `<option value="${idx}" ${idx === s ? "selected" : ""}>${o.name} (${o.source})</option>`)
          .join("");
        selectsHtml.push(`
          <div class="form-group" style="margin-bottom: 8px;">
            <label style="font-weight: 600;">Choice #${existingChoices.length + s + 1} of ${totalAllowed}:</label>
            <select class="other-player-opt-select" data-slot="${s}" style="width: 100%; font-weight: 600;">
              ${optsHtml}
            </select>
          </div>
        `);
      }

      const firstMeta = metaByIndex.get("0");
      const content = `
        <div style="padding: 6px 0;">
          <p style="margin-bottom: 8px;">
            <strong>${actor.name}</strong> (${requirementsLabel}) has <strong>${slotsToPick}</strong> unspent <strong>${title}</strong> choice(s).
            Select your option(s) below to preview their Rich Text description and import them via Plutonium:
          </p>
          <div class="form-group" style="margin-bottom: 8px;">
            <input type="text" id="other-player-opt-search" placeholder="Filter options by name..." style="width: 100%;" />
          </div>
          ${selectsHtml.join("")}
          <div style="
            border: 1px solid rgba(139, 92, 246, 0.45);
            border-radius: 8px;
            background: rgba(30, 18, 56, 0.35);
            padding: 10px 12px;
            max-height: 250px;
            overflow-y: auto;
            margin-top: 8px;
          ">
            <div style="border-bottom: 1px solid rgba(139, 92, 246, 0.3); padding-bottom: 6px; margin-bottom: 8px;">
              <strong id="other-player-opt-preview-title" style="font-size: 13.5px; color: #ede9fe;">
                ${firstMeta?.name || ""}
              </strong>
            </div>
            <div id="other-player-opt-preview-desc" class="editor-content" style="font-size: 12.5px; line-height: 1.45;">
              ${firstMeta?.enrichedHtml || ""}
            </div>
          </div>
        </div>
      `;

      createV2Dialog(
        {
          title: `${actor.name} — ${title}`,
          content,
          render: (html) => {
            const root = html instanceof HTMLElement ? html : html?.[0];
            if (!root) return;
            const titleEl = root.querySelector("#other-player-opt-preview-title");
            const descEl = root.querySelector("#other-player-opt-preview-desc");
            const selects = Array.from(root.querySelectorAll(".other-player-opt-select"));
            const searchInput = root.querySelector("#other-player-opt-search");

            const updatePreview = (idxStr) => {
              const meta = metaByIndex.get(String(idxStr));
              if (!meta) return;
              if (titleEl) titleEl.textContent = meta.name;
              if (descEl) descEl.innerHTML = meta.enrichedHtml;
            };

            for (const sel of selects) {
              sel.addEventListener("change", (ev) => updatePreview(ev.currentTarget.value));
              sel.addEventListener("focus", (ev) => updatePreview(ev.currentTarget.value));
            }

            searchInput?.addEventListener("input", (ev) => {
              const q = ev.currentTarget.value.trim().toLowerCase();
              for (const sel of selects) {
                for (const optEl of Array.from(sel.options)) {
                  const match = !q || optEl.textContent.toLowerCase().includes(q);
                  optEl.hidden = !match;
                }
              }
            });
          },
          buttons: {
            importChoices: {
              icon: '<i class="fas fa-check"></i>',
              label: "Import Selected Option(s)",
              callback: async (html) => {
                const root = html instanceof HTMLElement ? html : html?.[0];
                if (!root) return;
                const selects = Array.from(root.querySelectorAll(".other-player-opt-select"));
                const chosenIndices = new Set(selects.map(s => Number(s.value)).filter(Number.isFinite));

                const docsToSync = [];
                for (const idx of chosenIndices) {
                  const rawEnt = availableOptions[idx];
                  if (!rawEnt) continue;
                  const doc = await this.pConvertOptionalFeature({
                    name: rawEnt.name,
                    source: rawEnt.source,
                    rawEnt,
                    actor,
                    isSecondary,
                    subtype,
                    requirements: requirementsLabel,
                    choiceCategory
                  });
                  if (doc) docsToSync.push(doc);
                }

                if (docsToSync.length > 0) {
                  await this.syncFeatureItems(actor, docsToSync, {
                    maxLevel: 20,
                    classItemId: classItem?.id || null
                  });
                  ui.notifications.info(
                    `[${actor.name}] Imported ${docsToSync.map(d => d.name).join(", ")}!`
                  );
                }
              }
            },
            later: {
              icon: '<i class="fas fa-times"></i>',
              label: "Decide Later"
            }
          },
          default: "importChoices",
          close: () => {
            this._choiceDialogOpenFor.delete(lockKey);
          }
        },
        { width: 520 }
      ).render(true);
      dialogRendered = true;
    } finally {
      if (!dialogRendered) {
        this._choiceDialogOpenFor.delete(lockKey);
      }
    }
  }

  /**
   * Prompt a Skill Expertise Choice Dialog (for Kyrion's Rogue Expertise or Flinn's Blessings of Knowledge)
   */
  static async promptSkillExpertiseChoiceIfNeeded(
    actor,
    {
      flagKey = "expertiseChosen",
      title = "Choose Skill Expertise",
      description = "Select 2 skills to gain Expertise (double proficiency bonus):",
      allowedSkills = null, // array of skill keys e.g. ["arc", "his", "nat", "rel"] or null for all skills
      count = 2,
      requireProficiency = false,
      forceOpen = false
    } = {}
  ) {
    if (!actor) return;
    const chosenAlready = actor.getFlag("altarion-aitusa", flagKey);
    if (Array.isArray(chosenAlready) && chosenAlready.length >= count && !forceOpen) return;

    const lockKey = `${actor.id}:${flagKey}`;
    if (this._choiceDialogOpenFor.has(lockKey)) return;
    this._choiceDialogOpenFor.add(lockKey);
    let dialogRendered = false;

    try {
      const skillConfig = CONFIG.DND5E?.skills || {};
      const skillEntries = Object.entries(skillConfig).filter(([key]) => {
        if (Array.isArray(allowedSkills) && !allowedSkills.includes(key)) return false;
        if (requireProficiency) {
          const val = Number(actor.system?.skills?.[key]?.value || 0);
          return val >= 1;
        }
        return true;
      });

      // If requireProficiency filtered everything out (because the player hasn't picked base skills yet), allow all skills
      const finalSkills =
        skillEntries.length >= count
          ? skillEntries
          : Object.entries(skillConfig).filter(([key]) => !allowedSkills || allowedSkills.includes(key));

      const selectsHtml = [];
      for (let s = 0; s < count; s++) {
        const opts = finalSkills
          .map(([k, cfg], idx) => `<option value="${k}" ${idx === s ? "selected" : ""}>${cfg.label || k.toUpperCase()}</option>`)
          .join("");
        selectsHtml.push(`
          <div class="form-group" style="margin-bottom: 8px;">
            <label style="font-weight: 600;">Expertise Skill #${s + 1}:</label>
            <select class="other-player-expertise-select" style="width: 100%; font-weight: 600;">
              ${opts}
            </select>
          </div>
        `);
      }

      const content = `
        <div style="padding: 6px 0;">
          <p style="margin-bottom: 10px;"><strong>${actor.name}</strong> — ${description}</p>
          ${selectsHtml.join("")}
        </div>
      `;

      createV2Dialog({
        title: `${actor.name} — ${title}`,
        content,
        buttons: {
          apply: {
            icon: '<i class="fas fa-check"></i>',
            label: "Apply Expertise",
            callback: async (html) => {
              const root = html instanceof HTMLElement ? html : html?.[0];
              if (!root) return;
              const chosen = Array.from(root.querySelectorAll(".other-player-expertise-select"))
                .map(el => el.value)
                .filter(Boolean);
              const uniqueChosen = Array.from(new Set(chosen));
              const updates = {
                [`flags.altarion-aitusa.${flagKey}`]: uniqueChosen
              };
              for (const sk of uniqueChosen) {
                updates[`system.skills.${sk}.value`] = 2;
              }
              await actor.update(updates);
              ui.notifications.info(
                `[${actor.name}] Applied Expertise to ${uniqueChosen.map(k => skillConfig[k]?.label || k).join(", ")}!`
              );
            }
          },
          later: {
            icon: '<i class="fas fa-times"></i>',
            label: "Decide Later"
          }
        },
        default: "apply",
        close: () => {
          this._choiceDialogOpenFor.delete(lockKey);
        }
      }).render(true);
      dialogRendered = true;
    } finally {
      if (!dialogRendered) {
        this._choiceDialogOpenFor.delete(lockKey);
      }
    }
  }

  /* -------------------------------------------- */
  /*  Character Sheet Header Decoration           */
  /* -------------------------------------------- */

  static decorateCharacterSheet(actor, root) {
    const handler = this.getHandlerForActor(actor);
    if (!handler) return;

    // 0. If this actor is opened for the first time and hasn't had its dual classes & dual races synced yet,
    //    auto-sync at most ONCE (never re-triggering recursively on subsequent sheet renders).
    if (actor.isOwner && !this.isSyncing(actor.id) && !this._autoSyncedOnSheetOpen.has(actor.id)) {
      const classCount = actor.items.filter(i => i.type === "class").length;
      const raceCount = actor.items.filter(i => i.type === "race").length;
      if (classCount < 2 || raceCount < 2) {
        this._autoSyncedOnSheetOpen.add(actor.id);
        handler.sync(actor);
      }
    }

    // Remove any legacy button that may have been appended directly inside .window-header
    for (const oldBtn of root.querySelectorAll(".other-player-sync-btn")) {
      oldBtn.remove();
    }

    // 1. Inject the full-width Header Badge Bar (.altarion-aitusa-class-container) + Sync Features button,
    //    matching the exact layout and styling of Altarion and Aitusa's sheets
    const header = root.querySelector(".sheet-header, .header-details, .tidy5e-header, .window-header");
    if (header) {
      let container = root.querySelector(".altarion-aitusa-class-container");
      if (!container) {
        container = document.createElement("div");
        container.className = "altarion-aitusa-class-container";
        header.insertAdjacentElement("afterend", container);
      }

      container.innerHTML = "";

      const primDef = handler.PRIMARY_CLASS;
      const secDef = handler.SECONDARY_CLASS;

      const primItem = actor.items.find(
        i =>
          i.type === "class" &&
          (i.system?.identifier?.toLowerCase() === primDef.identifier ||
            i.name.toLowerCase() === primDef.name.toLowerCase())
      );
      const secItem = actor.items.find(
        i =>
          i.type === "class" &&
          (i.system?.identifier?.toLowerCase() === secDef.identifier ||
            i.name.toLowerCase() === secDef.name.toLowerCase())
      );

      const primLvl = Number(primItem?.system?.levels || primDef.defaultLevel);
      const secLvl = Number(secItem?.system?.levels || secDef.defaultLevel);

      const iconMap = {
        warlock: "fa-eye",
        sorcerer: "fa-sun",
        rogue: "fa-user-ninja",
        wizard: "fa-hat-wizard",
        cleric: "fa-pray"
      };
      const primIcon = iconMap[primDef.identifier] || "fa-shield-alt";
      const secIcon = iconMap[secDef.identifier] || "fa-magic";

      const isFlinn = handler.CHARACTER_NAME.toLowerCase() === "flinn";
      const isKyrion = handler.CHARACTER_NAME.toLowerCase() === "kyrion";
      const isParva = handler.CHARACTER_NAME.toLowerCase() === "parva";

      // Flinn: Intuitive Arcanum DC + Wizard/Cleric Prepared Spell Counters
      const flinnIntuitiveDc = isFlinn
        ? Math.max(
            10,
            Number(
              actor.getFlag(MODULE_ID, "intuitiveArcanumDC") ??
                actor.getFlag(MODULE_ID, "flinnIntuitiveArcanumDc") ??
                10
            )
          )
        : 10;
      const flinnIntMod = Number(actor.system?.abilities?.int?.mod ?? 0);
      const flinnWisMod = Number(actor.system?.abilities?.wis?.mod ?? 0);
      const flinnWizPrepMax = Math.max(1, primLvl + flinnIntMod);
      const flinnClrPrepMax = Math.max(1, secLvl + flinnWisMod);
      const flinnLuckyFeat = isFlinn
        ? actor.items.find(
            i =>
              i.type === "feat" &&
              (i.flags?.[MODULE_ID]?.isFlinnLuckyFeat ||
                i.flags?.[MODULE_ID]?.featureKey === "feat:lucky:phb" ||
                (i.name?.trim().toLowerCase() === "lucky" && i.system?.type?.value !== "race"))
          )
        : null;
      const flinnLuckMax = Math.max(3, Number(flinnLuckyFeat?.system?.uses?.max || 3));
      const flinnLuckSpent = Number(flinnLuckyFeat?.system?.uses?.spent || 0);
      const flinnLuckVal = Math.clamp(flinnLuckMax - flinnLuckSpent, 0, flinnLuckMax);
      let flinnWizPrepCount = 0;
      let flinnClrPrepCount = 0;
      if (isFlinn) {
        for (const sp of actor.items) {
          if (sp.type !== "spell") continue;
          const spLvl = Number(sp.system?.level ?? 0);
          if (spLvl <= 0) continue;
          const prepMode = sp.system?.method || sp.system?.preparation?.mode || "prepared";
          const prepVal = Number(sp.system?.prepared ?? sp.system?.preparation?.prepared ?? 0);
          const isAlways =
            prepVal === 2 ||
            prepMode === "always" ||
            prepMode === "atwill" ||
            prepMode === "innate" ||
            Boolean(sp.flags?.[MODULE_ID]?.isDomainSpell);
          if (prepVal !== 1 || isAlways) continue; // Only count manually prepared (1), not always-prepared (2) or domain
          const origin =
            sp.flags?.[MODULE_ID]?.flinnSpellOrigin ||
            (sp.system?.sourceItem === "class:cleric" ? "cleric" : "wizard");
          if (origin === "cleric") flinnClrPrepCount += 1;
          else flinnWizPrepCount += 1;
        }
      }

      const kyrionProf = Number(actor.system?.attributes?.prof ?? 2);
      const kyrionChaMod = Number(actor.system?.abilities?.cha?.mod ?? 0);
      const kyrionPoolMax = Math.max(1, kyrionProf + kyrionChaMod);
      const kyrionActiveSummonsMax = Math.max(1, kyrionChaMod);
      const kyrionEssenceVal = Math.clamp(
        Number(actor.system?.resources?.primary?.value ?? kyrionPoolMax),
        0,
        kyrionPoolMax
      );
      const kyrionStorageVal = Math.clamp(
        Number(actor.system?.resources?.secondary?.value ?? 0),
        0,
        kyrionPoolMax
      );
      const kyrionShadowArmorEff = isKyrion
        ? actor.effects?.find(
            e =>
              !e.disabled &&
              (e.flags?.["altarion-aitusa"]?.isShadowArmorEffect ||
                e.statuses?.has?.("shadow-armor") ||
                e.name?.toLowerCase() === "shadow armor")
          )
        : null;
      const kyrionShadowArmorActive =
        Boolean(kyrionShadowArmorEff) && Number(actor.system?.attributes?.hp?.temp ?? 0) > 0;
      const kyrionShadowArmorDmg = Number(
        kyrionShadowArmorEff?.flags?.["altarion-aitusa"]?.retaliationDamage || 5
      );
      const parvaAgathysEff = isParva
        ? actor.effects?.find(
            e =>
              !e.disabled &&
              (e.flags?.["altarion-aitusa"]?.isArmorOfAgathysEffect ||
                e.statuses?.has?.("armor-of-agathys") ||
                e.name?.toLowerCase() === "armor of agathys")
          )
        : null;
      const parvaAgathysActive =
        Boolean(parvaAgathysEff) && Number(actor.system?.attributes?.hp?.temp ?? 0) > 0;
      const parvaAgathysDmg = Number(
        parvaAgathysEff?.flags?.["altarion-aitusa"]?.retaliationDamage || 5
      );
      const parvaTentacleItem = isParva
        ? actor.items.find(
            i =>
              i.type === "feat" &&
              (i.flags?.[MODULE_ID]?.isTentacleOfTheDeepsFeat ||
                i.name?.trim().toLowerCase() === "tentacle of the deeps")
          )
        : null;
      const parvaTentacleMax = Math.max(1, Number(actor.system?.attributes?.prof ?? 2));
      const parvaTentacleSpent = Number(parvaTentacleItem?.system?.uses?.spent ?? 0);
      const parvaTentacleVal = Math.clamp(parvaTentacleMax - parvaTentacleSpent, 0, parvaTentacleMax);

      container.innerHTML = `
        <span class="altarion-aitusa-badge primary" data-coria-color-key="class-primary" data-coria-color-label="${primDef.name} (Classe Principal)" title="Primary Class (defines Character Level, Max HP, Hit Dice & Proficiency Bonus) | Clique direito para personalizar cor">
          <i class="fas ${primIcon}"></i> ${primDef.name} (Lvl ${primLvl})
        </span>
        <span class="altarion-aitusa-badge secondary" data-coria-color-key="class-secondary" data-coria-color-label="${secDef.name} (Classe Secundária)" title="Secondary Class (grants Class/Subclass Features & Spellcasting) | Clique direito para personalizar cor">
          <i class="fas ${secIcon}"></i> ${secDef.name} (Lvl ${secLvl} - Secondary)
        </span>
        ${
          isFlinn
            ? `<span class="altarion-aitusa-badge flinn-intuitive-dc" data-coria-color-key="flinn-intuitive-dc" data-coria-color-label="Intuitive Arcanum" title="Intuitive Arcanum — Accidental Casting DC (Starts at DC 10; +2 per success; resets to DC 10 + Wild Magic Surge on failure). Click DC to roll! | Clique direito para personalizar cor">
                <i class="fas fa-dice-d20"></i> Intuitive Arcanum:
                <span role="button" tabindex="0" class="altarion-res-step" data-res="flinn-dc" data-delta="-2" title="Decrease Intuitive Arcanum DC by 2 (min 10)">-</span>
                <strong class="flinn-open-intuitive-btn" title="Click to open Accidental Casting dialog" style="cursor:pointer; text-decoration:underline;">CD ${flinnIntuitiveDc}</strong>
                <span role="button" tabindex="0" class="altarion-res-step" data-res="flinn-dc" data-delta="2" title="Increase Intuitive Arcanum DC by 2">+</span>
              </span>
              <span class="altarion-aitusa-badge flinn-luck-points" data-coria-color-key="flinn-luck-points" data-coria-color-label="Luck Points" title="Lucky Feat — Luck Points (${flinnLuckVal} / ${flinnLuckMax} remaining, Long Rest recovery) | Clique direito para personalizar cor">
                <i class="fas fa-clover"></i> Luck Points:
                <span role="button" tabindex="0" class="altarion-res-step" data-res="flinn-luck" data-delta="-1" title="Spend 1 Luck Point">-</span>
                <strong>${flinnLuckVal} / ${flinnLuckMax}</strong>
                <span role="button" tabindex="0" class="altarion-res-step" data-res="flinn-luck" data-delta="1" title="Recover 1 Luck Point">+</span>
              </span>
              <span class="altarion-aitusa-badge flinn-prep-wizard" data-coria-color-key="flinn-prep-wizard" data-coria-color-label="Wizard Prep" title="Prepared Wizard Spells (Blue in Spellbook): ${flinnWizPrepCount} / ${flinnWizPrepMax} (Wizard Lvl ${primLvl} + INT Mod ${flinnIntMod >= 0 ? `+${flinnIntMod}` : flinnIntMod}) | Clique direito para personalizar cor">
                <i class="fas fa-hat-wizard"></i> Wizard Prep: <strong>${flinnWizPrepCount} / ${flinnWizPrepMax}</strong>
              </span>
              <span class="altarion-aitusa-badge flinn-prep-cleric" data-coria-color-key="flinn-prep-cleric" data-coria-color-label="Cleric Prep" title="Prepared Cleric Spells (Yellow/Gold in Spellbook): ${flinnClrPrepCount} / ${flinnClrPrepMax} (Cleric Lvl ${secLvl} + WIS Mod ${flinnWisMod >= 0 ? `+${flinnWisMod}` : flinnWisMod}) | Clique direito para personalizar cor">
                <i class="fas fa-pray"></i> Cleric Prep: <strong>${flinnClrPrepCount} / ${flinnClrPrepMax}</strong>
              </span>`
            : ""
        }
        ${
          isKyrion
            ? `<span class="altarion-aitusa-badge kyrion-essence" data-coria-color-key="kyrion-essence" data-coria-color-label="Essence Points" title="Shadow Essence — Essence Points (Max = PB + CHA Mod = ${kyrionPoolMax}, Long Rest recovery) | Clique direito para personalizar cor">
                <i class="fas fa-fire-alt"></i> Essence Points:
                <span role="button" tabindex="0" class="altarion-res-step" data-res="kyrion-essence" data-delta="-1" title="Spend 1 Essence Point">-</span>
                <strong>${kyrionEssenceVal} / ${kyrionPoolMax}</strong>
                <span role="button" tabindex="0" class="altarion-res-step" data-res="kyrion-essence" data-delta="1" title="Recover 1 Essence Point">+</span>
              </span>
              <span class="altarion-aitusa-badge kyrion-storage" data-coria-color-key="kyrion-storage" data-coria-color-label="Shadow Storage" title="Shadow Extraction & Summoning — Stored Shadows (Capacity = PB + CHA Mod = ${kyrionPoolMax}, persistent). Active Summons Limit: ${kyrionActiveSummonsMax} (Shadow Lieutenant counts as 2) | Clique direito para personalizar cor">
                <i class="fas fa-skull"></i> Shadow Storage:
                <span role="button" tabindex="0" class="altarion-res-step" data-res="kyrion-storage" data-delta="-1" title="Release 1 Stored Shadow">-</span>
                <strong>${kyrionStorageVal} / ${kyrionPoolMax}</strong>
                <span role="button" tabindex="0" class="altarion-res-step" data-res="kyrion-storage" data-delta="1" title="Store 1 Captured Shadow">+</span>
              </span>`
            : ""
        }
        ${
          isParva
            ? `<span class="altarion-aitusa-badge parva-tentacle-uses" data-coria-color-key="parva-tentacle-uses" data-coria-color-label="Tentacle of the Deeps" title="Tentacle of the Deeps Uses Remaining (Max = Proficiency Bonus = ${parvaTentacleMax}, Long Rest recovery) | Clique direito para personalizar cor">
                <i class="fas fa-water"></i> Tentacle of the Deeps:
                <span role="button" tabindex="0" class="altarion-res-step" data-res="parva-tentacle" data-delta="-1" title="Spend 1 Tentacle of the Deeps use">-</span>
                <strong>${parvaTentacleVal} / ${parvaTentacleMax}</strong>
                <span role="button" tabindex="0" class="altarion-res-step" data-res="parva-tentacle" data-delta="1" title="Recover 1 Tentacle of the Deeps use">+</span>
              </span>`
            : ""
        }
        ${
          kyrionShadowArmorActive
            ? `<span class="altarion-aitusa-badge arcane-armor-active" data-coria-color-key="status-shadow-armor" data-coria-color-label="Shadow Armor Active" title="Shadow Armor active while Temp HP > 0 (${kyrionShadowArmorDmg} Necrotic damage retaliation on melee hits) | Clique direito para personalizar cor">
                <i class="fas fa-skull-crossbones"></i> Shadow Armor (${kyrionShadowArmorDmg} Necrotic)
              </span>`
            : ""
        }
        ${
          parvaAgathysActive
            ? `<span class="altarion-aitusa-badge arcane-armor-active" data-coria-color-key="status-agathys-armor" data-coria-color-label="Armor of Agathys Active" title="Armor of Agathys active while Temp HP > 0 (${parvaAgathysDmg} Cold damage retaliation on melee hits) | Clique direito para personalizar cor">
                <i class="fas fa-snowflake"></i> Armor of Agathys (${parvaAgathysDmg} Cold)
              </span>`
            : ""
        }
      `;

      if (actor.isOwner && (isKyrion || isFlinn || isParva)) {
        for (const stepBtn of container.querySelectorAll(".altarion-res-step")) {
          stepBtn.addEventListener("click", async (ev) => {
            ev.preventDefault();
            ev.stopPropagation();
            const delta = Number(stepBtn.getAttribute("data-delta") || 0);
            const resType = stepBtn.getAttribute("data-res");
            if (resType === "kyrion-essence") {
              const nextVal = Math.clamp(kyrionEssenceVal + delta, 0, kyrionPoolMax);
              await actor.update({
                "system.resources.primary.label": "Essence Points",
                "system.resources.primary.value": nextVal,
                "system.resources.primary.max": kyrionPoolMax,
                "system.resources.primary.sr": false,
                "system.resources.primary.lr": true
              });
            } else if (resType === "kyrion-storage") {
              const nextVal = Math.clamp(kyrionStorageVal + delta, 0, kyrionPoolMax);
              await actor.update({
                "system.resources.secondary.label": "Shadow Storage",
                "system.resources.secondary.value": nextVal,
                "system.resources.secondary.max": kyrionPoolMax,
                "system.resources.secondary.sr": false,
                "system.resources.secondary.lr": false
              });
            } else if (resType === "flinn-dc") {
              const nextDc = Math.max(10, flinnIntuitiveDc + delta);
              await actor.setFlag(MODULE_ID, "intuitiveArcanumDC", nextDc);
              await actor.update({
                "system.resources.primary.label": "Intuitive Arcanum DC",
                "system.resources.primary.value": nextDc,
                "system.resources.primary.max": 30
              });
            } else if (resType === "flinn-luck" && flinnLuckyFeat) {
              const nextVal = Math.clamp(flinnLuckVal + delta, 0, flinnLuckMax);
              const nextSpent = Math.clamp(flinnLuckMax - nextVal, 0, flinnLuckMax);
              await flinnLuckyFeat.update({
                "system.uses.max": String(flinnLuckMax),
                "system.uses.spent": nextSpent
              });
            } else if (resType === "parva-tentacle" && parvaTentacleItem) {
              const nextVal = Math.clamp(parvaTentacleVal + delta, 0, parvaTentacleMax);
              const nextSpent = Math.clamp(parvaTentacleMax - nextVal, 0, parvaTentacleMax);
              await parvaTentacleItem.update({
                "system.uses.max": "@prof",
                "system.uses.spent": nextSpent,
                "system.uses.recovery": [{ period: "lr", type: "recoverAll" }]
              });
            }
          });
        }
        const openIntuitiveBtn = container.querySelector(".flinn-open-intuitive-btn");
        if (openIntuitiveBtn && typeof handler.openIntuitiveArcanumDialog === "function") {
          openIntuitiveBtn.addEventListener("click", async (ev) => {
            ev.preventDefault();
            ev.stopPropagation();
            await handler.openIntuitiveArcanumDialog(actor);
          });
        }
      }

      if (actor.isOwner) {
        const syncBtn = document.createElement("button");
        syncBtn.type = "button";
        syncBtn.className = "altarion-aitusa-sync-btn";
        syncBtn.innerHTML = `<i class="fas fa-sync"></i> Sync Features`;
        syncBtn.addEventListener("click", async (ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          await handler.sync(actor, { force: true });
        });
        container.appendChild(syncBtn);
      }

      ArcanePlagueManager.renderPlagueHeaderRow(actor, root);
      globalThis.CoriaHeaderColorManager?.applyAndBind?.(actor, container);
    }

    // 2. Add [Sec] badge next to the Secondary Class name in the classes list
    const secNameLower = handler.SECONDARY_CLASS.name.toLowerCase();
    const classLabels = root.querySelectorAll(
      ".class-header .name, .item-name, .subtitles .pill, .header-details .summary li"
    );
    for (const el of classLabels) {
      const txt = (el.textContent || "").trim().toLowerCase();
      if (txt.includes(secNameLower) && !el.querySelector(".altarion-sec-tag")) {
        const badge = document.createElement("span");
        badge.className = "altarion-sec-tag";
        badge.style.cssText =
          "margin-left: 4px; font-size: 10px; padding: 1px 5px; border-radius: 4px; background: rgba(139, 92, 246, 0.35); border: 1px solid rgba(167, 139, 250, 0.6); color: #ede9fe; vertical-align: middle;";
        badge.textContent = "Sec";
        el.appendChild(badge);
      }
    }

    // 3. Highlight secondary class items, primary class items, and Flinn's Spellbook rows + footer
    const isFlinnActor = handler.CHARACTER_NAME.toLowerCase() === "flinn";
    const setAttrIfDiff = (node, attr, val) => {
      if (node && node.getAttribute(attr) !== val) node.setAttribute(attr, val);
    };

    const decorateItemsAndFlinnSpellbook = () => {
      if (root._flinnDecorating) return;
      root._flinnDecorating = true;
      try {
        let wizPrepCount = 0;
        let clrPrepCount = 0;
        let wizUnprepCount = 0;
        let clrUnprepCount = 0;
        if (isFlinnActor) {
          for (const sp of actor.items) {
            if (sp.type !== "spell") continue;
            const spLvl = Number(sp.system?.level ?? 0);
            if (spLvl <= 0) continue;
            const prepMode = sp.system?.method || sp.system?.preparation?.mode || "prepared";
            const prepVal = Number(sp.system?.prepared ?? sp.system?.preparation?.prepared ?? 0);
            const isAlways =
              prepVal === 2 ||
              prepMode === "always" ||
              prepMode === "atwill" ||
              prepMode === "innate" ||
              Boolean(sp.flags?.[MODULE_ID]?.isDomainSpell);
            const origin =
              sp.flags?.[MODULE_ID]?.flinnSpellOrigin ||
              (sp.system?.sourceItem === "class:cleric" ? "cleric" : "wizard");
            if (isAlways) continue;
            if (prepVal >= 1) {
              if (origin === "cleric") clrPrepCount += 1;
              else wizPrepCount += 1;
            } else {
              if (origin === "cleric") clrUnprepCount += 1;
              else wizUnprepCount += 1;
            }
          }

          const primClsItem = actor.items.find(
            i => i.type === "class" && i.system?.identifier?.toLowerCase() === "wizard"
          );
          const secClsItem = actor.items.find(
            i => i.type === "class" && i.system?.identifier?.toLowerCase() === "cleric"
          );
          const wizLvl = Number(primClsItem?.system?.levels || handler.PRIMARY_CLASS.defaultLevel || 6);
          const clrLvl = Number(secClsItem?.system?.levels || handler.SECONDARY_CLASS.defaultLevel || 4);
          const intMod = Number(actor.system?.abilities?.int?.mod ?? 0);
          const wisMod = Number(actor.system?.abilities?.wis?.mod ?? 0);
          const wizMax = Math.max(1, wizLvl + intMod);
          const clrMax = Math.max(1, clrLvl + wisMod);

          // Update top header badges if present
          const wizHeaderStrong = root.querySelector(".altarion-aitusa-badge.flinn-prep-wizard strong");
          if (wizHeaderStrong) {
            const targetTxt = `${wizPrepCount} / ${wizMax}`;
            if (wizHeaderStrong.textContent !== targetTxt) wizHeaderStrong.textContent = targetTxt;
          }
          const clrHeaderStrong = root.querySelector(".altarion-aitusa-badge.flinn-prep-cleric strong");
          if (clrHeaderStrong) {
            const targetTxt = `${clrPrepCount} / ${clrMax}`;
            if (clrHeaderStrong.textContent !== targetTxt) clrHeaderStrong.textContent = targetTxt;
          }

          // Update bottom Spellbook Footer cards (.spellcasting-class-card)
          for (const card of root.querySelectorAll(".spellcasting-class-card")) {
            const abil = (card.getAttribute("data-ability") || "").toLowerCase();
            const cardTxt = (card.textContent || "").toLowerCase();
            const isClericCard = abil === "wis" || cardTxt.includes("cleric");
            const isWizardCard = abil === "int" || cardTxt.includes("wizard");
            if (isClericCard) {
              setAttrIfDiff(card, "data-flinn-footer-card", "cleric");
              const countEl = card.querySelector(".preparations .count");
              const maxEl = card.querySelector(".preparations .max");
              if (countEl && countEl.textContent.trim() !== String(clrPrepCount)) {
                countEl.textContent = String(clrPrepCount);
              }
              if (maxEl && maxEl.textContent.trim() !== String(clrMax)) {
                maxEl.textContent = String(clrMax);
              }
            } else if (isWizardCard) {
              setAttrIfDiff(card, "data-flinn-footer-card", "wizard");
              const countEl = card.querySelector(".preparations .count");
              const maxEl = card.querySelector(".preparations .max");
              if (countEl && countEl.textContent.trim() !== String(wizPrepCount)) {
                countEl.textContent = String(wizPrepCount);
              }
              if (maxEl && maxEl.textContent.trim() !== String(wizMax)) {
                maxEl.textContent = String(wizMax);
              }
            }
          }

          // Inject Flinn's 2 Spellbook Buttons:
          // 1) Toggle: Esconder Magias Não Preparadas
          // 2) Window: Abrir Magias Escondidas (Clérigo & Mago)
          const hideUnprepared = Boolean(actor.getFlag(MODULE_ID, "hideUnpreparedSpells"));
          setAttrIfDiff(root, "data-flinn-hide-unprepared", hideUnprepared ? "true" : "false");

          const spellbookTab =
            root.querySelector('[data-tab-contents-for="spellbook"]') ||
            root.querySelector(".tidy-tab.spellbook") ||
            root.querySelector('.tab.spellbook[data-tab="spellbook"]') ||
            root.querySelector(".spellbook-footer")?.parentElement;

          if (spellbookTab) {
            let toolbar = spellbookTab.querySelector(".flinn-spellbook-toolbar");
            if (!toolbar) {
              toolbar = document.createElement("div");
              toolbar.className = "flinn-spellbook-toolbar";
              const utilBar =
                spellbookTab.querySelector(".utility-toolbar") ||
                spellbookTab.querySelector(".spellbook-filters") ||
                spellbookTab.querySelector(".filter-list");
              if (utilBar) {
                utilBar.insertAdjacentElement("afterend", toolbar);
              } else {
                spellbookTab.prepend(toolbar);
              }
            }

            const totalUnprep = wizUnprepCount + clrUnprepCount;
            const toggleBtnLabel = hideUnprepared
              ? `<i class="fas fa-eye"></i> Mostrar Magias Não Preparadas (${totalUnprep} Escondidas)`
              : `<i class="fas fa-eye-slash"></i> Esconder Magias Não Preparadas (${totalUnprep})`;
            const openBrowserLabel = `<i class="fas fa-book-open"></i> Magias Escondidas (Clérigo: ${clrUnprepCount} | Mago: ${wizUnprepCount})`;

            let toggleBtn = toolbar.querySelector(".flinn-toggle-hide-unprepared-btn");
            let browserBtn = toolbar.querySelector(".flinn-open-hidden-spells-btn");

            if (!toggleBtn || !browserBtn) {
              const existingImportBtn = toolbar.querySelector(".coria-import-spells-btn");
              toolbar.innerHTML = `
                <button type="button" class="flinn-toggle-hide-unprepared-btn ${hideUnprepared ? "is-active" : ""}" data-coria-color-key="flinn-btn-toggle-unprep" data-coria-color-label="Botão Esconder/Mostrar Magias Não Preparadas" title="Alternar visibilidade das magias não preparadas no Spellbook | Clique direito para personalizar cor">
                  ${toggleBtnLabel}
                </button>
                <button type="button" class="flinn-open-hidden-spells-btn" data-coria-color-key="flinn-btn-hidden-spells" data-coria-color-label="Botão Magias Escondidas" title="Abrir janela interativa com as magias escondidas/não preparadas de Clérigo e Mago | Clique direito para personalizar cor">
                  ${openBrowserLabel}
                </button>
              `;
              if (existingImportBtn) toolbar.appendChild(existingImportBtn);
              toggleBtn = toolbar.querySelector(".flinn-toggle-hide-unprepared-btn");
              browserBtn = toolbar.querySelector(".flinn-open-hidden-spells-btn");

              toggleBtn?.addEventListener("click", async (ev) => {
                ev.preventDefault();
                ev.stopPropagation();
                const cur = Boolean(actor.getFlag(MODULE_ID, "hideUnpreparedSpells"));
                const next = !cur;
                root.setAttribute("data-flinn-hide-unprepared", next ? "true" : "false");
                await actor.setFlag(MODULE_ID, "hideUnpreparedSpells", next);
                decorateItemsAndFlinnSpellbook();
              });

              browserBtn?.addEventListener("click", (ev) => {
                ev.preventDefault();
                ev.stopPropagation();
                if (typeof handler.openHiddenSpellsBrowser === "function") {
                  handler.openHiddenSpellsBrowser(actor);
                }
              });
            } else {
              toggleBtn.classList.toggle("is-active", hideUnprepared);
              if (!toggleBtn.hasAttribute("data-coria-color-key")) {
                toggleBtn.setAttribute("data-coria-color-key", "flinn-btn-toggle-unprep");
                toggleBtn.setAttribute("data-coria-color-label", "Botão Esconder/Mostrar Magias Não Preparadas");
              }
              if (!browserBtn.hasAttribute("data-coria-color-key")) {
                browserBtn.setAttribute("data-coria-color-key", "flinn-btn-hidden-spells");
                browserBtn.setAttribute("data-coria-color-label", "Botão Magias Escondidas");
              }
              if (toggleBtn.innerHTML.trim() !== toggleBtnLabel) {
                toggleBtn.innerHTML = toggleBtnLabel;
              }
              if (browserBtn.innerHTML.trim() !== openBrowserLabel) {
                browserBtn.innerHTML = openBrowserLabel;
              }
            }
            globalThis.CoriaHeaderColorManager?.applyAndBind?.(actor, toolbar);
          }
        }

        for (const el of root.querySelectorAll("[data-item-id]")) {
          const itemId = el.getAttribute("data-item-id");
          const item = actor.items.get(itemId);
          if (!item) continue;

          if (
            item.flags?.["altarion-aitusa"]?.isSecondaryClass ||
            item.flags?.["altarion-aitusa"]?.isSecondaryClassItem
          ) {
            setAttrIfDiff(el, "data-item-secondary", "true");
          }
          if (
            item.flags?.["altarion-aitusa"]?.isPrimaryClass ||
            item.flags?.["altarion-aitusa"]?.isPrimaryClassItem
          ) {
            setAttrIfDiff(el, "data-item-ancestral", "true");
          }

          // Flinn: Color-code Wizard (Blue) vs Cleric (Yellow/Gold) spells and Prepared status
          if (isFlinnActor && item.type === "spell") {
            const origin =
              item.flags?.[MODULE_ID]?.flinnSpellOrigin ||
              (item.system?.sourceItem === "class:cleric" ? "cleric" : "wizard");
            const spLevel = Number(item.system?.level ?? 0);
            const prepMode = item.system?.method || item.system?.preparation?.mode || "prepared";
            const prepVal = Number(item.system?.prepared ?? item.system?.preparation?.prepared ?? 0);
            const isCantrip = spLevel === 0;
            const isAlways =
              !isCantrip &&
              (prepVal === 2 ||
                prepMode === "always" ||
                prepMode === "atwill" ||
                prepMode === "innate" ||
                Boolean(item.flags?.[MODULE_ID]?.isDomainSpell));
            const isPrep = isCantrip || isAlways || prepVal >= 1;
            const prepState = isCantrip
              ? "cantrip"
              : isAlways
                ? "always"
                : isPrep
                  ? "prepared"
                  : "unprepared";

            setAttrIfDiff(el, "data-flinn-spell-class", origin);
            setAttrIfDiff(el, "data-flinn-spell-prepared", isPrep ? "true" : "false");
            setAttrIfDiff(el, "data-flinn-spell-prep-state", prepState);

            const innerRow = el.querySelector(".tidy-table-row, .item-table-row");
            if (innerRow) {
              setAttrIfDiff(innerRow, "data-flinn-spell-class", origin);
              setAttrIfDiff(innerRow, "data-flinn-spell-prepared", isPrep ? "true" : "false");
              setAttrIfDiff(innerRow, "data-flinn-spell-prep-state", prepState);
            }

            const contextCell = el.querySelector(".cell-context");
            if (contextCell) {
              setAttrIfDiff(contextCell, "data-flinn-context-class", origin);
            }

            // Style and annotate the preparation toggle button on the right
            const prepIcon = el.querySelector(
              "i.spell-row-icon, [data-action='prepare'] i, .item-control[data-action='prepare'] i"
            );
            const prepBtn =
              prepIcon?.closest("a, button") ||
              el.querySelector(".item-control[data-action='prepare'], [data-action='prepare']");
            if (prepBtn) {
              setAttrIfDiff(prepBtn, "data-flinn-prep-btn", origin);
              setAttrIfDiff(prepBtn, "data-flinn-prep-state", prepState);
            }

            const nameCell =
              el.querySelector(
                ".cell-name, .item-name .title, .item-name .name-stacked .title, .item-name, .name"
              ) || el;
            if (nameCell) {
              let pill = nameCell.querySelector(".flinn-spell-class-pill");
              if (!pill) {
                pill = document.createElement("span");
                nameCell.appendChild(pill);
              }
              const targetClass = `flinn-spell-class-pill ${
                origin === "cleric" ? "is-cleric" : "is-wizard"
              } ${
                isAlways
                  ? "is-always"
                  : isPrep
                    ? "is-prepared"
                    : "is-unprepared"
              }`;
              if (pill.className !== targetClass) pill.className = targetClass;

              const targetTitle =
                origin === "cleric"
                  ? `Magia de Clérigo (${
                      isCantrip
                        ? "Truque"
                        : isAlways
                          ? "Magia de Domínio — Sempre Preparada"
                          : isPrep
                            ? "Preparada (Amarelo)"
                            : "Não Preparada"
                    }) — Clique para alternar classificação Wizard/Cleric`
                  : `Magia de Mago (${
                      isCantrip
                        ? "Truque"
                        : isAlways
                          ? "Sempre Preparada"
                          : isPrep
                            ? "Preparada (Azul)"
                            : "Não Preparada — Usa Intuitive Arcanum se conjurada"
                    }) — Clique para alternar classificação Wizard/Cleric`;
              if (pill.title !== targetTitle) pill.title = targetTitle;

              const statusLabel = isCantrip
                ? " • Truque"
                : isAlways
                  ? origin === "cleric"
                    ? " ★ DOMÍNIO"
                    : " ★ SEMPRE PREP."
                  : isPrep
                    ? " ★ PREPARADA"
                    : " (Não Prep.)";
              const targetHtml =
                origin === "cleric"
                  ? `<i class="fas fa-pray"></i> Cleric${statusLabel}`
                  : `<i class="fas fa-hat-wizard"></i> Wizard${statusLabel}`;
              if (pill.innerHTML !== targetHtml) pill.innerHTML = targetHtml;

              if (actor.isOwner && pill.dataset.boundClick !== "true") {
                pill.dataset.boundClick = "true";
                pill.addEventListener("click", async (ev) => {
                  ev.preventDefault();
                  ev.stopPropagation();
                  const curOrigin =
                    item.flags?.[MODULE_ID]?.flinnSpellOrigin ||
                    (item.system?.sourceItem === "class:cleric" ? "cleric" : "wizard");
                  const nextOrigin = curOrigin === "cleric" ? "wizard" : "cleric";
                  await item.update({
                    "system.sourceItem": nextOrigin === "cleric" ? "class:cleric" : "class:wizard",
                    "system.ability": nextOrigin === "cleric" ? "wis" : "int",
                    [`flags.${MODULE_ID}.flinnSpellOrigin`]: nextOrigin,
                    [`flags.${MODULE_ID}.isSecondaryClassItem`]: nextOrigin === "cleric",
                    [`flags.${MODULE_ID}.isPrimaryClassItem`]: nextOrigin === "wizard"
                  });
                });
              }
            }
          }
        }

        // Apply Dual Races & Dual Creature Types display on the Character tab (Kyrion, Flinn, Parva)
        this.decorateDualRacesCharacterTab(actor, root, handler);

        // Apply custom class colors & universal Spellbook highlighting across Flinn, Parva, and Kyrion
        globalThis.CoriaHeaderColorManager?.decorateUniversalSpellbook?.(actor, root);
      } finally {
        root._flinnDecorating = false;
      }
    };

    decorateItemsAndFlinnSpellbook();

    if (!root._flinnSpellbookObserver) {
      let debounceTimer = null;
      const observer = new MutationObserver(() => {
        if (root._flinnDecorating) return;
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          decorateItemsAndFlinnSpellbook();
        }, 40);
      });
      observer.observe(root, {
        childList: true,
        subtree: true
      });
      root._flinnSpellbookObserver = observer;
    }
  }

  /**
   * Display BOTH Races and BOTH Creature Types cleanly in Tidy5e's Character tab for Kyrion, Flinn, and Parva:
   * - Kyrion: Tiefling + Reborn | Creature Type: Humanoid (Tiefling) & Undead (Reborn)
   * - Flinn: Halfling (Mark of Healing) + Aasimar (Protector) | Creature Type: Humanoid (Halfling) & Humanoid (Aasimar)
   * - Parva: Human + Aasimar (Fallen) | Creature Type: Humanoid (Human) & Humanoid (Aasimar)
   */
  static _dualRacePrimaryCorrected = new Set();

  static decorateDualRacesCharacterTab(actor, root, handler) {
    if (!actor || !root || !handler) return;
    const charKey = String(handler.CHARACTER_NAME || "").trim().toLowerCase();

    const DUAL_CFG = {
      kyrion: {
        races: [
          { match: "tiefling", fallbackName: "Tiefling (Mephistopheles)", fallbackImg: "icons/creatures/unholy/demon-horned-winged-laughing.webp" },
          { match: "reborn", fallbackName: "Reborn", fallbackImg: "icons/magic/death/skull-horned-white-purple.webp" }
        ],
        creatureTypes: [
          { title: "Humanoid", subtitle: "(Tiefling)" },
          { title: "Undead", subtitle: "(Reborn)" }
        ]
      },
      flinn: {
        races: [
          { match: "halfling", fallbackName: "Halfling (Mark of Healing)", fallbackImg: "icons/magic/life/heart-cross-green.webp" },
          { match: "aasimar", fallbackName: "Aasimar (Protector)", fallbackImg: "icons/magic/holy/angel-winged-humanoid-blue.webp" }
        ],
        creatureTypes: [
          { title: "Humanoid", subtitle: "(Halfling)" },
          { title: "Humanoid", subtitle: "(Aasimar)" }
        ]
      },
      parva: {
        races: [
          { match: "human", fallbackName: "Human", fallbackImg: "icons/environment/people/commoner.webp" },
          { match: "aasimar", fallbackName: "Aasimar (Fallen)", fallbackImg: "icons/magic/holy/angel-wings-gray.webp" }
        ],
        creatureTypes: [
          { title: "Humanoid", subtitle: "(Human)" },
          { title: "Humanoid", subtitle: "(Aasimar)" }
        ]
      }
    };

    const cfg = DUAL_CFG[charKey];
    if (!cfg) return;

    const raceItems = actor.items.filter(i => i.type === "race");
    if (raceItems.length === 0) return;

    // Ensure actor's primary Species (`system.details.race` + sort) matches `cfg.races[0]` (e.g. Halfling on Flinn, Human on Parva, Tiefling on Kyrion)
    const primaryMatch = cfg.races[0].match;
    const preferredPrimary = raceItems.find(i => String(i.name || "").toLowerCase().includes(primaryMatch)) || null;
    const preferredSecond = preferredPrimary
      ? raceItems.find(i => i.id !== preferredPrimary.id) || null
      : null;
    if (preferredPrimary && actor.isOwner) {
      const curRaceId =
        typeof actor._source?.system?.details?.race === "string"
          ? actor._source.system.details.race
          : actor.system?.details?.race?.id || "";
      const corrKey = `${actor.id}:${preferredPrimary.id}`;
      if (curRaceId !== preferredPrimary.id && !this._dualRacePrimaryCorrected.has(corrKey)) {
        this._dualRacePrimaryCorrected.add(corrKey);
        Promise.resolve().then(async () => {
          try {
            await actor.update({ "system.details.race": preferredPrimary.id });
            if (preferredSecond) {
              await actor.updateEmbeddedDocuments("Item", [
                { _id: preferredPrimary.id, sort: 100000 },
                { _id: preferredSecond.id, sort: 200000 }
              ]);
            }
          } catch (_e) {}
        });
      }
    }

    // 1. Find the Species `.list-entry[data-item-id]` on the Character tab
    let speciesEntry = null;
    let shownRaceId = null;
    for (const rItem of raceItems) {
      const candidate = root.querySelector(`.list-entry[data-item-id="${rItem.id}"]`);
      if (candidate) {
        speciesEntry = candidate;
        shownRaceId = rItem.id;
        break;
      }
    }

    if (speciesEntry) {
      const secondRaceItem =
        raceItems.find(i => i.id !== shownRaceId) || null;
      const shownNameLow = String(actor.items.get(shownRaceId)?.name || "").toLowerCase();
      const fallbackSpec =
        cfg.races.find(r => !shownNameLow.includes(r.match)) || cfg.races[1];
      const secondName = secondRaceItem?.name || fallbackSpec.fallbackName;
      const secondImg = secondRaceItem?.img || fallbackSpec.fallbackImg;

      let dualRow = speciesEntry.parentElement?.querySelector(".coria-dual-race-entry");
      if (!dualRow) {
        dualRow = document.createElement("div");
        dualRow.className = "list-entry list-sub-entry coria-dual-race-entry";
        dualRow.setAttribute("role", "listitem");
        speciesEntry.insertAdjacentElement("afterend", dualRow);
      }
      if (dualRow.previousElementSibling !== speciesEntry) {
        speciesEntry.insertAdjacentElement("afterend", dualRow);
      }

      const desiredKey = `${secondRaceItem?.id || "fallback"}:${secondName}:${secondImg}`;
      if (dualRow.dataset.coriaDualRaceKey !== desiredKey) {
        dualRow.dataset.coriaDualRaceKey = desiredKey;
        dualRow.innerHTML = `
          <div class="list-label">
            <h4 class="font-weight-label">Raça (2ª)</h4>
          </div>
          <div class="list-content">
            <a role="button" tabindex="0" class="list-values trait-item coria-dual-race-link" title="Abrir ficha da raça ${foundry.utils.escapeHTML(secondName)}">
              <i class="sub-entry-icon fa-solid fa-arrow-turn-down-right"></i>
              <span class="item-image-link"><img class="item-image flex0" src="${secondImg}" alt="${foundry.utils.escapeHTML(secondName)}" /></span>
              <span class="font-weight-label trait-name">${foundry.utils.escapeHTML(secondName)}</span>
            </a>
          </div>
        `;
        const link = dualRow.querySelector(".coria-dual-race-link");
        link?.addEventListener("click", (ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          if (secondRaceItem?.sheet) secondRaceItem.sheet.render(true);
        });
      }
    }

    // 2. Find the Creature Type entry (`a[data-config="creatureType"]`) and display BOTH Creature Types cleanly
    const cTypeAnchor = root.querySelector('a[data-config="creatureType"]');
    const cTypeContent = cTypeAnchor?.closest(".list-content");
    if (cTypeAnchor && cTypeContent) {
      if (cTypeContent.getAttribute("data-coria-dual-ctype") !== "true") {
        cTypeContent.setAttribute("data-coria-dual-ctype", "true");
      }
      let dualCtypeEl = cTypeContent.querySelector(".coria-dual-ctype-display");
      if (!dualCtypeEl) {
        dualCtypeEl = document.createElement("a");
        dualCtypeEl.className = "list-values trait-item coria-dual-ctype-display";
        dualCtypeEl.setAttribute("role", "button");
        dualCtypeEl.setAttribute("tabindex", "0");
        dualCtypeEl.title = "Creature Types (Dupla Raça) — Clique para abrir configuração";
        dualCtypeEl.addEventListener("click", (ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          cTypeAnchor.click();
        });
        cTypeAnchor.insertAdjacentElement("afterend", dualCtypeEl);
      }

      const desiredHtml = `
        <i class="sub-entry-icon fa-solid fa-arrow-turn-down-right"></i>
        <span class="coria-dual-ctype-stack">
          ${cfg.creatureTypes
            .map(
              (ct, idx) => `
              <span class="coria-dual-ctype-item">
                ${idx > 0 ? `<span class="coria-dual-ctype-sep">&bull;</span>` : ""}
                <span class="trait-name font-label-medium">${foundry.utils.escapeHTML(ct.title)}</span>
                <span class="font-body-medium color-text-lighter">${foundry.utils.escapeHTML(ct.subtitle)}</span>
              </span>
            `
            )
            .join("")}
        </span>
      `;
      if (dualCtypeEl.dataset.coriaCtypeKey !== charKey) {
        dualCtypeEl.dataset.coriaCtypeKey = charKey;
        dualCtypeEl.innerHTML = desiredHtml;
      }
    }
  }
}

globalThis.OtherPlayersBase = OtherPlayersBase;

if (globalThis.CONFIG?.Actor?.dataModels?.character?.prototype) {
  OtherPlayersBase.init();
} else {
  Hooks.once("init", () => {
    OtherPlayersBase.init();
  });
}

