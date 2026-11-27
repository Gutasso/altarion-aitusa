/**
 * Secondary Class Manager for Altarion & Aitusa
 * Enforces secondary class rules in dnd5e 5.x / Foundry v13:
 * - Secondary class levels (Wizard) do NOT count toward total Character Level (`system.details.level`).
 * - Secondary class levels do NOT count toward Proficiency Bonus (`system.attributes.prof`).
 * - Secondary class levels do NOT count toward Max Hit Points (`system.attributes.hp.max`) or Hit Dice (`system.attributes.hd`).
 * - Secondary class levels DO count toward Class/Subclass Features and Spellcasting Slot Progression (`_prepareSpellcasting`).
 */

import { isIgnoredBackupActor } from "./sync-guard.js";

export class SecondaryClassManager {
  static _initialized = false;

  static init() {
    if (this._initialized) return;

    const charProto = CONFIG.Actor?.dataModels?.character?.prototype;
    const classProto = CONFIG.Item?.dataModels?.class?.prototype;

    if (!charProto || !classProto) {
      console.warn("[Altarion & Aitusa] CharacterData or ClassData dataModels not yet available in init, retrying in setup...");
      Hooks.once("setup", () => this.init());
      return;
    }

    this._initialized = true;

    // 1. Wrap CharacterData.prototype.prepareBaseData
    // In dnd5e 5.x, prepareBaseData sums all class levels into `this.details.level`,
    // calculates `this.attributes.prof`, and computes `this.details.xp`.
    const origPrepareBaseData = charProto.prepareBaseData;
    charProto.prepareBaseData = function (...args) {
      origPrepareBaseData.apply(this, args);
      SecondaryClassManager.onPrepareCharacterBaseData(this);
    };

    // 2. Wrap CharacterData.prototype.prepareDerivedData
    // In dnd5e 5.x, prepareDerivedData calculates Max HP from class HitPoints advancements.
    // We exclude secondary classes from contributing HitPoints advancements.
    const origPrepareDerivedData = charProto.prepareDerivedData;
    charProto.prepareDerivedData = function (...args) {
      SecondaryClassManager.onPrepareCharacterDerivedData(this, origPrepareDerivedData, args);
    };

    // 3. Wrap ClassData.prototype.prepareFinalData
    // Ensures the secondary class item itself reports 0 Hit Dice while keeping its Spellcasting Save DC
    // and Wizard Prepared Spells formula (Wizard Level + INT mod) accurate, while Dragon Rider has no preparation cap.
    const origClassPrepareFinalData = classProto.prepareFinalData;
    classProto.prepareFinalData = function (...args) {
      const item = this.parent;
      const actor = item?.actor;
      const isAltarion = Boolean(item && actor && SecondaryClassManager.isAltarion(actor));
      const ident = String(this.identifier || item?.name || "").trim().toLowerCase();

      if (isAltarion && this.spellcasting) {
        if (ident === "wizard" || ident.includes("mago")) {
          this.spellcasting.ability = "int";
          if (this.spellcasting.preparation && !this.spellcasting.preparation.formula) {
            this.spellcasting.preparation.formula = "max(1, @classes.wizard.levels + @abilities.int.mod)";
          }
        } else if (ident === "dragon-rider" || ident === "dragon rider" || ident.includes("cavaleiro")) {
          this.spellcasting.ability = "int";
          if (this.spellcasting.preparation) {
            this.spellcasting.preparation.formula = "";
          }
        }
      }

      origClassPrepareFinalData.apply(this, args);

      if (item && actor && SecondaryClassManager.isSecondaryClass(item, actor)) {
        this.hd.max = 0;
        this.hd.value = 0;
      }

      if (isAltarion && this.spellcasting?.preparation) {
        const intMod = Number(actor.system?.abilities?.int?.mod ?? 0);
        if (ident === "wizard" || ident.includes("mago")) {
          const wizLvl = Number(this.levels || 0);
          this.spellcasting.preparation.max = Math.max(1, wizLvl + intMod);
        } else if (ident === "dragon-rider" || ident === "dragon rider" || ident.includes("cavaleiro")) {
          this.spellcasting.preparation.max = 0;
        }
      }
    };

    // 4. Wrap ClassData.prototype._preUpdate
    // Allows leveling up the secondary class independently without summing against total character level cap.
    const origClassPreUpdate = classProto._preUpdate;
    classProto._preUpdate = async function (changed, options, user) {
      const item = this.parent;
      const actor = item?.actor;
      if (item && actor && SecondaryClassManager.isSecondaryClass(item, actor)) {
        if ("levels" in (changed.system ?? {})) {
          if (changed.system.levels <= 0) changed.system.levels = 1;
          if (changed.system.levels > CONFIG.DND5E.maxLevel) changed.system.levels = CONFIG.DND5E.maxLevel;
          return;
        }
      }
      return origClassPreUpdate.call(this, changed, options, user);
    };

    // 5. Synchronize Aitusa's spellcasting slot table with Altarion's combined caster level
    // (without giving Aitusa the Wizard class or Wizard class features)
    for (const hookName of ["dnd5e.prepareSpellSlots", "dnd5e.prepareLeveledSlots"]) {
      Hooks.on(hookName, (spells, actor, progression) => {
        if (!actor || !this.isAitusa(actor)) return;
        const altarionCasterLevel = this.getAltarionCasterLevel();
        if (altarionCasterLevel > 0) {
          if (typeof progression.spell === "number" || "spell" in progression) {
            progression.spell = Math.max(progression.spell || 0, altarionCasterLevel);
          }
          if (typeof progression.leveled === "number" || "leveled" in progression) {
            progression.leveled = Math.max(progression.leveled || 0, altarionCasterLevel);
          }
          if (typeof progression.slot === "number" || "slot" in progression) {
            progression.slot = Math.max(progression.slot || 0, altarionCasterLevel);
          }
        }
      });
    }

    console.log("[Altarion & Aitusa] SecondaryClassManager hooks registered on CharacterData and ClassData.");
  }

  /**
   * Checks if the given actor is Aitusa.
   * @param {Actor} actor
   * @returns {boolean}
   */
  static isAitusa(actor) {
    if (!actor || isIgnoredBackupActor(actor)) return false;
    let targetName = "Aitusa";
    try {
      if (game?.settings?.settings?.has("altarion-aitusa.aitusaName")) {
        targetName = game.settings.get("altarion-aitusa", "aitusaName") || "Aitusa";
      }
    } catch (_) {
      targetName = "Aitusa";
    }
    return actor.name?.trim().toLowerCase() === targetName.trim().toLowerCase();
  }

  /**
   * Computes Altarion's effective spellcaster level (Dragon Rider 1/3 caster + Wizard full caster).
   * @returns {number}
   */
  static getAltarionCasterLevel() {
    if (!game?.actors) return 0;
    const altarion = game.actors.find(a => this.isAltarion(a));
    if (!altarion) return 0;

    let riderLvl = 0;
    let wizardLvl = 0;
    for (const item of altarion.items) {
      if (item.type !== "class") continue;
      const lvl = Number(item.system?.levels) || 0;
      if (this.isSecondaryClass(item, altarion)) {
        wizardLvl += lvl;
      } else {
        riderLvl += lvl;
      }
    }

    const hasRiderCasting = riderLvl >= 3;
    const hasWizardCasting = wizardLvl >= 1;

    if (hasRiderCasting && hasWizardCasting) {
      return Math.min(20, wizardLvl + Math.floor(riderLvl / 3));
    } else if (hasWizardCasting) {
      return Math.min(20, wizardLvl);
    } else if (hasRiderCasting) {
      return Math.min(20, Math.ceil(riderLvl / 3));
    }
    return 0;
  }

  /**
   * Checks if the given actor is Altarion.
   * @param {Actor} actor
   * @returns {boolean}
   */
  static isAltarion(actor) {
    if (!actor || actor.type !== "character" || isIgnoredBackupActor(actor)) return false;
    let targetName = "Altarion";
    try {
      if (game?.settings?.settings?.has("altarion-aitusa.altarionName")) {
        targetName = game.settings.get("altarion-aitusa", "altarionName") || "Altarion";
      }
    } catch (_) {
      targetName = "Altarion";
    }
    const norm = String(actor.name || "").trim().toLowerCase();
    const targetNorm = targetName.trim().toLowerCase();
    return (
      norm === targetNorm ||
      norm === "altarion" ||
      norm === "altarion talendris" ||
      norm.startsWith("altarion ")
    );
  }

  /**
   * Determines whether a class item is a Secondary Class on its owning actor.
   * @param {Item} item
   * @param {Actor} actor
   * @returns {boolean}
   */
  static isSecondaryClass(item, actor) {
    if (!item || item.type !== "class") return false;
    if (item.flags?.["altarion-aitusa"]?.isSecondaryClass === true) return true;
    if (item.flags?.["altarion-aitusa"]?.isPrimaryClass === true) return false;

    if (actor && this.isAltarion(actor)) {
      const identifier = (item.system?.identifier || "").toLowerCase();
      const name = (item.name || "").toLowerCase();

      // Dragon Rider is always the primary class on Altarion
      if (identifier === "dragon-rider" || name === "dragon rider" || name.includes("cavaleiro")) {
        return false;
      }

      // Wizard (or any second class on Altarion) is treated as secondary class
      if (identifier === "wizard" || name.includes("wizard") || name.includes("mago")) {
        return true;
      }

      // If originalClass is set to Dragon Rider, any other class is secondary
      const origId = actor.system?.details?.originalClass;
      if (origId && item.id !== origId) {
        return true;
      }
    }

    return false;
  }

  /**
   * Adjusts `details.level`, `attributes.prof`, `details.xp`, and `attributes.hd` during `CharacterData#prepareBaseData`.
   * @param {CharacterData} charData
   */
  static onPrepareCharacterBaseData(charData) {
    const actor = charData.parent;
    if (!actor || !this.isAltarion(actor)) return;

    let primaryLevel = 0;
    let secondaryLevel = 0;

    for (const item of actor.items) {
      if (item.type !== "class") continue;
      const lvl = Number(item.system.levels) || 0;
      if (this.isSecondaryClass(item, actor)) {
        secondaryLevel += lvl;
      } else {
        primaryLevel += lvl;
      }
    }

    // Only adjust if there is a secondary class and a primary class
    if (secondaryLevel <= 0 || primaryLevel <= 0) return;

    // 1. Set total Character Level strictly to Primary Class Level (e.g. Dragon Rider 4 -> Level 4)
    charData.details.level = primaryLevel;

    // 2. Recalculate Proficiency Bonus strictly from Primary Class Level (Level 4 -> PB +2)
    const calcMod = dnd5e?.documents?.Proficiency?.calculateMod;
    charData.attributes.prof = typeof calcMod === "function"
      ? calcMod(primaryLevel)
      : Math.floor((primaryLevel + 7) / 4);

    // 3. Recalculate XP thresholds based on Primary Class Level (Level 4 -> 6,500 XP instead of 14,000 XP)
    const { xp, level } = charData.details;
    if (xp && typeof actor.getLevelExp === "function") {
      xp.max = level >= CONFIG.DND5E.maxLevel ? Infinity : actor.getLevelExp(level || 1);
      xp.min = level ? actor.getLevelExp(level - 1) : 0;
      if (Number.isFinite(xp.max)) {
        const required = xp.max - xp.min;
        const pct = required > 0 ? Math.round((xp.value - xp.min) * 100 / required) : 0;
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
  }

  /**
   * Excludes secondary classes from contributing HitPoints advancements during `CharacterData#prepareDerivedData`.
   * @param {CharacterData} charData
   * @param {Function} origPrepareDerivedData
   * @param {Array} args
   */
  static onPrepareCharacterDerivedData(charData, origPrepareDerivedData, args) {
    const actor = charData.parent;
    if (!actor || !this.isAltarion(actor)) {
      const res = origPrepareDerivedData.apply(charData, args);
      if (actor && this.isAitusa(actor)) {
        const altarionCasterLevel = this.getAltarionCasterLevel();
        const spellModel = CONFIG.DND5E?.spellcasting?.spell;
        if (altarionCasterLevel > 0 && spellModel?.prepareSlots && charData.spells) {
          spellModel.prepareSlots(charData.spells, actor, { spell: altarionCasterLevel, leveled: altarionCasterLevel });
        }
      }
      return res;
    }

    // Temporarily hide HitPoints advancements on secondary classes so they don't add to Max HP
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

    // Ensure level and proficiency bonus remain strictly bound to Primary Class after derived data
    this.onPrepareCharacterBaseData(charData);
  }

  /**
   * Safely resets and recalculates an actor's DataModel without triggering duplicate shim property errors.
   * Never call `actor.prepareData()` directly on an already-initialized Actor in Foundry v12/v13.
   * @param {Actor} actor
   */
  static refreshActor(actor) {
    if (!actor) return;
    try {
      if (typeof actor.reset === "function") {
        actor.reset();
      }
    } catch (err) {
      console.warn(`[Altarion & Aitusa] Non-fatal warning while resetting actor ${actor.name}:`, err);
    }
  }
}
