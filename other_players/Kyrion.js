/**
 * Character Synchronizer & Homebrew Configuration for: KYRION
 * - Dual Races: Reborn (VRGR) + Tiefling (Mephistopheles) (MTF)
 *   - Custom Racial Trait: "Legacy of Cania" links directly to Kyrion's custom "Shadow Hands" (Lvl 3, as 2nd-level 1/LR)
 *     and "Shadow Blade" (Lvl 5, 1/LR), both with dual Innate (1/LR) + Pact Magic / Spell Slot casting activities
 * - Primary Class: Rogue (Default Level 4) — Subclass: Swashbuckler (XGE)
 * - Secondary Class: Warlock (Default Level 2) — Subclass: The Hexblade (XGE)
 * - Custom Necrotic Spells: Shadow Blast (Eldritch Blast + Invocations), Dark Blade (Booming Blade),
 *   Shadow Hands (Burning Hands), Shadow Armor (Armor of Agathys), Shadow Rebuke (Hellish Rebuke), Shadow Blade
 * - Special Features & Resources: Shadow Essence (Essence Points = PB + CHA mod, LR),
 *   Shadow Extraction (Shadow Storage = PB + CHA mod, persistent), and Shadow Summoning
 * - Interactive Choice Dialogs: Eldritch Invocations, Pact Boon (at Warlock Lvl 3+), and Rogue Expertise
 */

import { OtherPlayersBase } from "./OtherPlayersBase.js";

export class KyrionManager {
  static CHARACTER_NAME = "Kyrion";

  static PRIMARY_CLASS = {
    name: "Rogue",
    identifier: "rogue",
    source: "PHB",
    defaultLevel: 4,
    saves: ["dex", "int"],
    subclass: {
      name: "Swashbuckler",
      shortName: "Swashbuckler",
      source: "XGE",
      unlockLevel: 3
    }
  };

  static SECONDARY_CLASS = {
    name: "Warlock",
    identifier: "warlock",
    source: "PHB",
    defaultLevel: 2,
    subclass: {
      name: "The Hexblade",
      shortName: "Hexblade",
      source: "XGE",
      unlockLevel: 1
    }
  };

  static ROGUE_CLASS_FEATURES = [
    { name: "Expertise", level: 1, source: "PHB" },
    { name: "Sneak Attack", level: 1, source: "PHB" },
    { name: "Thieves' Cant", level: 1, source: "PHB" },
    { name: "Cunning Action", level: 2, source: "PHB" },
    { name: "Roguish Archetype", level: 3, source: "PHB" },
    { name: "Ability Score Improvement", level: 4, source: "PHB" },
    { name: "Uncanny Dodge", level: 5, source: "PHB" },
    { name: "Expertise", level: 6, source: "PHB" },
    { name: "Evasion", level: 7, source: "PHB" },
    { name: "Ability Score Improvement", level: 8, source: "PHB" },
    { name: "Ability Score Improvement", level: 10, source: "PHB" },
    { name: "Reliable Talent", level: 11, source: "PHB" },
    { name: "Ability Score Improvement", level: 12, source: "PHB" },
    { name: "Blindsense", level: 14, source: "PHB" },
    { name: "Slippery Mind", level: 15, source: "PHB" },
    { name: "Ability Score Improvement", level: 16, source: "PHB" },
    { name: "Elusive", level: 18, source: "PHB" },
    { name: "Ability Score Improvement", level: 19, source: "PHB" },
    { name: "Stroke of Luck", level: 20, source: "PHB" }
  ];

  static SWASHBUCKLER_SUBCLASS_FEATURES = [
    { name: "Fancy Footwork", level: 3, source: "XGE" },
    { name: "Rakish Audacity", level: 3, source: "XGE" },
    { name: "Panache", level: 9, source: "XGE" },
    { name: "Elegant Maneuver", level: 13, source: "XGE" },
    { name: "Master Duelist", level: 17, source: "XGE" }
  ];

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

  static HEXBLADE_SUBCLASS_FEATURES = [
    { name: "Expanded Spell List", level: 1, source: "XGE" },
    { name: "Hexblade's Curse", level: 1, source: "XGE" },
    { name: "Hex Warrior", level: 1, source: "XGE" },
    { name: "Accursed Specter", level: 6, source: "XGE" },
    { name: "Armor of Hexes", level: 10, source: "XGE" },
    { name: "Master of Hexes", level: 14, source: "XGE" }
  ];

  /**
   * Legacy spell names automatically upgraded to Kyrion's custom Necrotic spells
   */
  static LEGACY_SPELL_NAMES = new Set([
    "eldritch blast",
    "booming blade",
    "burning hands",
    "armor of agathys",
    "hellish rebuke",
    "flame blade"
  ]);

  static register() {
    OtherPlayersBase.registerCharacterHandler(this.CHARACTER_NAME, this);
    Hooks.once("ready", async () => {
      try {
        const kyrion = game.actors?.find(a => {
          const n = String(a.name || "").trim().toLowerCase();
          return n === "kyrion" || n.startsWith("kyrion ");
        });
        if (kyrion?.isOwner) {
          await this.syncCustomSpells(kyrion);
          await this.syncSpecialShadowFeatures(kyrion);
          await globalThis.AltarionAutomationManager?.ensureKyrionDarkVitalityEffect?.(kyrion);
        }
      } catch (_e) {
        // ignore
      }
    });
  }

  /**
   * Mutate Tiefling (Mephistopheles) raw 5etools data so "Legacy of Cania" uses Shadow Hands & Shadow Blade
   */
  static mutateLegacyOfCania(rawRace) {
    if (!rawRace) return;
    const mutateText = (str) =>
      str
        .replace(/\{@spell burning hands(?:\|[^}]*)?\}/gi, "Shadow Hands")
        .replace(/\bburning hands\b/gi, "Shadow Hands")
        .replace(/\{@spell flame blade(?:\|[^}]*)?\}/gi, "Shadow Blade")
        .replace(/\bflame blade\b/gi, "Shadow Blade");

    const walkObj = (obj) => {
      if (!obj || typeof obj !== "object") return;
      for (const [k, v] of Object.entries(obj)) {
        if (typeof v === "string") {
          obj[k] = mutateText(v);
        } else if (Array.isArray(v)) {
          obj[k] = v.map(item => (typeof item === "string" ? mutateText(item) : (walkObj(item), item)));
        } else if (typeof v === "object") {
          walkObj(v);
        }
      }
    };
    walkObj(rawRace);
  }

  /**
   * Build all 6 of Kyrion's custom Necrotic Shadow Spells
   */
  static buildCustomSpells(actor) {
    const hasEldritchSpear = Boolean(
      actor?.items?.some(i => i.type === "feat" && i.name?.trim().toLowerCase().includes("eldritch spear"))
    );
    const blastRange = hasEldritchSpear ? 300 : 120;

    // 1. Shadow Blast (replaces Eldritch Blast; affected by all Eldritch Blast effects/Invocations)
    const shadowBlast = {
      name: "Shadow Blast",
      type: "spell",
      img: "modules/altarion-aitusa/kyrion_icons/shadow-blast-v3.jpg",
      system: {
        identifier: "eldritch-blast",
        description: {
          value: `<div class="rd__b  rd__b--2"><p>A beam of crackling energy streaks toward a creature within range. Make a ranged spell attack against the target. On a hit, the target takes [[/damage 1d10 type=necrotic]] damage.</p><p>The spell creates more than one beam when you reach higher levels: two beams at 5th level, three beams at 11th level, and four beams at 17th level. You can direct the beams at the same target or at different ones. Make a separate attack roll for each beam.</p></div>`
        },
        source: { book: "Kyrion", page: "1", custom: "Kyrion Warlock Cantrip", rules: "2014" },
        level: 0,
        school: "evo",
        properties: ["vocal", "somatic"],
        materials: { value: "", consumed: false, cost: 0, supply: 0 },
        method: "spell",
        prepared: 1,
        activation: { type: "action", value: 1, condition: "" },
        duration: { value: "", units: "inst" },
        range: { value: blastRange, units: "ft" },
        target: {
          template: { count: "", contiguous: false, type: "", size: "", width: "", height: "", units: "ft" },
          affects: { count: "1", type: "creature", choice: false, special: "" }
        },
        activities: {
          shadowBlastAtk01: {
            _id: "shadowBlastAtk01",
            type: "attack",
            name: "Shadow Blast Beam",
            activation: { type: "action", value: 1, condition: "", override: false },
            consumption: { targets: [], scaling: { allowed: false, max: "" }, spellSlot: false },
            description: { chatFlavor: "" },
            duration: { concentration: false, value: "", units: "inst", special: "", override: false },
            effects: [],
            range: { value: blastRange, units: "ft", special: "", override: false },
            target: {
              template: { count: "", contiguous: false, type: "", size: "", width: "", height: "", units: "ft" },
              affects: { count: "1", type: "creature", choice: false, special: "" },
              prompt: false,
              override: false
            },
            uses: { spent: 0, max: "", recovery: [] },
            attack: {
              ability: "cha",
              bonus: "",
              critical: { threshold: null },
              flat: false,
              type: { value: "ranged", classification: "spell" }
            },
            damage: {
              critical: { bonus: "" },
              includeBase: true,
              parts: [
                {
                  number: 1,
                  denomination: 10,
                  bonus: "",
                  types: ["necrotic"],
                  custom: { enabled: false, formula: "" },
                  scaling: { mode: "", number: null, formula: "" }
                }
              ]
            },
            sort: 0
          }
        }
      },
      flags: {
        plutonium: {
          page: "spells.html",
          source: "Kyrion",
          hash: "shadow_blast_kyrion",
          isDirectImport: true,
          isStandardDragDrop: true
        },
        "altarion-aitusa": {
          isSecondaryClassItem: true,
          isKyrionCustomSpell: true,
          isShadowBlastSpell: true,
          featureKey: "kyrion:spell:shadow-blast:0",
          syncSchemaVersion: 4
        }
      }
    };

    // 2. Dark Blade (replaces Booming Blade)
    const darkBlade = {
      name: "Dark Blade",
      type: "spell",
      img: "modules/altarion-aitusa/kyrion_icons/dark-blade-v2.jpg",
      system: {
        description: {
          value: `<div class="rd__b  rd__b--2"><p>You brandish the weapon used in the spell's casting and make a melee attack with it against one creature within 5 feet of you. On a hit, the target suffers the weapon attack's normal effects and then becomes sheathed in shadow energy until the start of your next turn. If the target willingly moves 5 feet or more before then, the target takes [[/damage 1d8 type=necrotic]] damage, and the spell ends.</p><p>This spell's damage increases when you reach certain levels. At 5th level, the melee attack deals an extra [[/damage 1d8 type=necrotic]] damage to the target on a hit, and the damage the target takes for moving increases to [[/damage 2d8]]. Both damage rolls increase by 1d8 at 11th level ([[/damage 2d8]] and [[/damage 3d8]]) and again at 17th level ([[/damage 3d8]] and [[/damage 4d8]]).</p></div>`
        },
        source: { book: "Kyrion", page: "1", custom: "Kyrion Warlock Cantrip", rules: "2014" },
        level: 0,
        school: "evo",
        properties: ["somatic", "material"],
        materials: { value: "a melee weapon worth at least 1 sp", consumed: false, cost: 0, supply: 0 },
        method: "spell",
        prepared: 1,
        activation: { type: "action", value: 1, condition: "" },
        duration: { value: "1", units: "round" },
        range: { value: 5, units: "ft" },
        target: {
          template: { count: "", contiguous: false, type: "", size: "", width: "", height: "", units: "ft" },
          affects: { count: "1", type: "creature", choice: false, special: "" }
        },
        activities: {
          darkBladeHit0001: {
            _id: "darkBladeHit0001",
            type: "attack",
            name: "Weapon Attack (Sheathe in Shadow Energy)",
            activation: { type: "action", value: 1, condition: "", override: false },
            consumption: { targets: [], scaling: { allowed: false, max: "" }, spellSlot: false },
            description: {
              chatFlavor:
                "Make a melee weapon attack; on a hit, deals the weapon's normal effects (+ extra Necrotic damage at 5th+ level) and sheathes the target in shadow energy until the start of your next turn."
            },
            duration: { concentration: false, value: "1", units: "round", special: "", override: false },
            effects: [],
            range: { value: 5, units: "ft", special: "", override: false },
            target: {
              template: { count: "", contiguous: false, type: "", size: "", width: "", height: "", units: "ft" },
              affects: { count: "1", type: "creature", choice: false, special: "" },
              prompt: false,
              override: false
            },
            uses: { spent: 0, max: "", recovery: [] },
            attack: {
              ability: "",
              bonus: "",
              critical: { threshold: null },
              flat: false,
              type: { value: "melee", classification: "weapon" }
            },
            damage: {
              critical: { bonus: "" },
              includeBase: true,
              parts: [
                {
                  number: null,
                  denomination: null,
                  bonus: "",
                  types: ["necrotic"],
                  custom: { enabled: true, formula: "(floor((@details.level + 1) / 6))d8" },
                  scaling: { mode: "", number: null, formula: "" }
                }
              ]
            },
            sort: 0
          },
          darkBladeMove001: {
            _id: "darkBladeMove001",
            type: "damage",
            name: "Target Moves (Shadow Energy Damage)",
            activation: {
              type: "special",
              value: null,
              condition: "when the sheathed target willingly moves 5 feet or more before the start of your next turn",
              override: true
            },
            consumption: { targets: [], scaling: { allowed: false, max: "" }, spellSlot: false },
            description: {
              chatFlavor: "Triggered when the target willingly moves 5 feet or more before the start of your next turn."
            },
            duration: { concentration: false, value: "", units: "inst", special: "", override: true },
            effects: [],
            range: { value: 5, units: "ft", special: "", override: false },
            target: {
              template: { count: "", contiguous: false, type: "", size: "", width: "", height: "", units: "ft" },
              affects: { count: "1", type: "creature", choice: false, special: "" },
              prompt: false,
              override: false
            },
            uses: { spent: 0, max: "", recovery: [] },
            damage: {
              critical: { allow: false, bonus: "" },
              parts: [
                {
                  number: 1,
                  denomination: 8,
                  bonus: "",
                  types: ["necrotic"],
                  custom: { enabled: false, formula: "" },
                  scaling: { mode: "whole", number: 1, formula: "" }
                }
              ]
            },
            sort: 100
          }
        }
      },
      flags: {
        plutonium: {
          page: "spells.html",
          source: "Kyrion",
          hash: "dark_blade_kyrion",
          isDirectImport: true,
          isStandardDragDrop: true
        },
        "altarion-aitusa": {
          isSecondaryClassItem: true,
          isKyrionCustomSpell: true,
          isDarkBladeSpell: true,
          featureKey: "kyrion:spell:dark-blade:0",
          syncSchemaVersion: 4
        }
      }
    };

    // 3. Shadow Hands (replaces Burning Hands; includes both Pact Magic / Spell Slot AND Legacy of Cania 2nd-Lvl 1/LR Innate Cast)
    const shadowHands = {
      name: "Shadow Hands",
      type: "spell",
      img: "modules/altarion-aitusa/kyrion_icons/shadow-hands.jpg",
      system: {
        description: {
          value: `<div class="rd__b  rd__b--2"><p>As you hold your hands with thumbs touching and fingers spread, a thin sheet of fiery shadows shoots forth from your outstretched fingertips. Each creature in a 15-foot cone must make a Dexterity saving throw. A creature takes [[/damage 3d6 type=necrotic]] damage on a failed save, or half as much damage on a successful one.</p><p>The shadows ignites any flammable objects in the area that aren't being worn or carried.</p></div><div class="rd__b  rd__b--3"><div data-roll-name-ancestor="At Higher Levels" class="rd__b  rd__b--3"><p><span class="entry-title-inner">At Higher Levels.</span></p><p>When you cast this spell using a spell slot of 2nd level or higher, the damage increases by [[/damage 1d6]] for each slot level above 1st.</p></div></div>`
        },
        source: { book: "Kyrion", page: "1", custom: "Legacy of Cania & Pact Magic", rules: "2014" },
        level: 1,
        school: "evo",
        properties: ["vocal", "somatic"],
        materials: { value: "", consumed: false, cost: 0, supply: 0 },
        method: "spell",
        prepared: 1,
        activation: { type: "action", value: 1, condition: "" },
        duration: { value: "", units: "inst" },
        range: { value: null, units: "self" },
        target: {
          template: { count: "", contiguous: false, type: "cone", size: "15", width: "", height: "", units: "ft" },
          affects: { count: "", type: "creature", choice: false, special: "" }
        },
        activities: {
          shadowHandsSlot1: {
            _id: "shadowHandsSlot1",
            type: "save",
            name: "Cast Shadow Hands (Pact Magic / Spell Slot)",
            activation: { type: "action", value: 1, condition: "", override: false },
            consumption: { targets: [], scaling: { allowed: false, max: "" }, spellSlot: true },
            description: { chatFlavor: "" },
            duration: { concentration: false, value: "", units: "inst", special: "", override: false },
            effects: [],
            range: { value: null, units: "self", special: "", override: false },
            target: {
              template: { count: "", contiguous: false, type: "cone", size: "15", width: "", height: "", units: "ft" },
              affects: { count: "", type: "creature", choice: false, special: "" },
              prompt: true,
              override: false
            },
            uses: { spent: 0, max: "", recovery: [] },
            save: { ability: ["dex"], dc: { calculation: "cha", formula: "" } },
            damage: {
              onSave: "half",
              parts: [
                {
                  number: 3,
                  denomination: 6,
                  bonus: "",
                  types: ["necrotic"],
                  custom: { enabled: false, formula: "" },
                  scaling: { mode: "whole", number: 1, formula: "" }
                }
              ]
            },
            sort: 0
          },
          shadowHandsInna1: {
            _id: "shadowHandsInna1",
            type: "save",
            name: "Innate Cast — Legacy of Cania (2nd-Level, 1/Long Rest)",
            activation: { type: "action", value: 1, condition: "Legacy of Cania (3rd+ Level)", override: false },
            consumption: {
              targets: [{ type: "activityUses", value: "1", target: "", scaling: { mode: "", formula: "" } }],
              scaling: { allowed: false, max: "" },
              spellSlot: false
            },
            description: {
              chatFlavor: "Cast as a 2nd-level spell (4d6 Necrotic) once per Long Rest via Legacy of Cania without expending a spell slot."
            },
            duration: { concentration: false, value: "", units: "inst", special: "", override: false },
            effects: [],
            range: { value: null, units: "self", special: "", override: false },
            target: {
              template: { count: "", contiguous: false, type: "cone", size: "15", width: "", height: "", units: "ft" },
              affects: { count: "", type: "creature", choice: false, special: "" },
              prompt: true,
              override: false
            },
            uses: { spent: 0, max: "1", recovery: [{ period: "lr", type: "recoverAll" }] },
            save: { ability: ["dex"], dc: { calculation: "cha", formula: "" } },
            damage: {
              onSave: "half",
              parts: [
                {
                  number: 4,
                  denomination: 6,
                  bonus: "",
                  types: ["necrotic"],
                  custom: { enabled: false, formula: "" },
                  scaling: { mode: "", number: null, formula: "" }
                }
              ]
            },
            sort: 100
          }
        }
      },
      flags: {
        plutonium: {
          page: "spells.html",
          source: "Kyrion",
          hash: "shadow_hands_kyrion",
          isDirectImport: true,
          isStandardDragDrop: true
        },
        "altarion-aitusa": {
          isSecondaryClassItem: true,
          isKyrionCustomSpell: true,
          isShadowHandsSpell: true,
          featureKey: "kyrion:spell:shadow-hands:1",
          syncSchemaVersion: 2
        }
      }
    };

    // 4. Shadow Armor (replaces Armor of Agathys; automated identically to Altarion's Arcane Armor with Necrotic retaliation)
    const shadowArmor = {
      name: "Shadow Armor",
      type: "spell",
      img: "modules/altarion-aitusa/kyrion_icons/shadow-armor.jpg",
      system: {
        description: {
          value: `<div class="rd__b  rd__b--2"><p>A protective magical force surrounds you, manifesting as spectral shadow that covers you and your gear. You gain 5 temporary hit points for the duration. If a creature hits you with a melee attack while you have these hit points, the creature takes 5 necrotic damage.</p></div><div class="rd__b  rd__b--3"><div data-roll-name-ancestor="At Higher Levels" class="rd__b  rd__b--3"><p><span class="entry-title-inner">At Higher Levels.</span></p><p>When you cast this spell using a spell slot of 2nd level or higher, both the temporary hit points and the necrotic damage increase by 5 for each slot level above 1st.</p></div></div>`
        },
        source: { book: "Kyrion", page: "1", custom: "Kyrion Warlock Spell", rules: "2014" },
        level: 1,
        school: "abj",
        properties: ["vocal", "somatic", "material"],
        materials: { value: "a cup of shadow-touched water", consumed: false, cost: 0, supply: 0 },
        method: "spell",
        prepared: 1,
        activation: { type: "action", value: 1, condition: "" },
        duration: { value: "1", units: "hour" },
        range: { value: null, units: "self" },
        target: {
          template: { count: "", contiguous: false, type: "", size: "", width: "", height: "", units: "ft" },
          affects: { count: "", type: "self", choice: false, special: "" }
        },
        activities: {
          shadowArmorCast1: {
            _id: "shadowArmorCast1",
            type: "utility",
            name: "Don Shadow Armor (Temp HP & Necrotic Retaliation)",
            activation: { type: "action", value: 1, condition: "", override: false },
            consumption: { targets: [], scaling: { allowed: false, max: "" }, spellSlot: true },
            description: {
              chatFlavor:
                "Grants 5 × Spell Slot Level Temporary Hit Points for 1 hour. Any creature that hits you with a melee attack while these Temporary Hit Points remain takes 5 × Spell Slot Level Necrotic damage."
            },
            duration: { concentration: false, value: "1", units: "hour", special: "", override: false },
            effects: [],
            range: { value: null, units: "self", special: "", override: false },
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
          source: "Kyrion",
          hash: "shadow_armor_kyrion",
          isDirectImport: true,
          isStandardDragDrop: true
        },
        "altarion-aitusa": {
          isSecondaryClassItem: true,
          isKyrionCustomSpell: true,
          isShadowArmorSpell: true,
          featureKey: "kyrion:spell:shadow-armor:1",
          syncSchemaVersion: 3
        }
      }
    };

    // 5. Shadow Rebuke (replaces Hellish Rebuke)
    const shadowRebuke = {
      name: "Shadow Rebuke",
      type: "spell",
      img: "modules/altarion-aitusa/kyrion_icons/shadow-rebuke-v2.jpg",
      system: {
        description: {
          value: `<div class="rd__b  rd__b--2"><p>You point your finger, and the creature that damaged you is momentarily surrounded by abyssal shadows. The creature must make a Dexterity saving throw. It takes [[/damage 2d10 type=necrotic]] damage on a failed save, or half as much damage on a successful one.</p></div><div class="rd__b  rd__b--3"><div data-roll-name-ancestor="At Higher Levels" class="rd__b  rd__b--3"><p><span class="entry-title-inner">At Higher Levels.</span></p><p>When you cast this spell using a spell slot of 2nd level or higher, the damage increases by [[/damage 1d10]] for each slot level above 1st.</p></div></div>`
        },
        source: { book: "Kyrion", page: "1", custom: "Kyrion Warlock Spell", rules: "2014" },
        level: 1,
        school: "evo",
        properties: ["vocal", "somatic"],
        materials: { value: "", consumed: false, cost: 0, supply: 0 },
        method: "spell",
        prepared: 1,
        activation: {
          type: "reaction",
          value: 1,
          condition: "which you take in response to being damaged by a creature within 60 feet of you that you can see"
        },
        duration: { value: "", units: "inst" },
        range: { value: 60, units: "ft" },
        target: {
          template: { count: "", contiguous: false, type: "", size: "", width: "", height: "", units: "ft" },
          affects: { count: "1", type: "creature", choice: false, special: "the creature that damaged you" }
        },
        activities: {
          shadowRebukSave1: {
            _id: "shadowRebukSave1",
            type: "save",
            name: "Shadow Rebuke (DEX Save)",
            activation: {
              type: "reaction",
              value: 1,
              condition: "in response to being damaged by a creature within 60 feet of you that you can see",
              override: false
            },
            consumption: { targets: [], scaling: { allowed: false, max: "" }, spellSlot: true },
            description: { chatFlavor: "" },
            duration: { concentration: false, value: "", units: "inst", special: "", override: false },
            effects: [],
            range: { value: 60, units: "ft", special: "", override: false },
            target: {
              template: { count: "", contiguous: false, type: "", size: "", width: "", height: "", units: "ft" },
              affects: { count: "1", type: "creature", choice: false, special: "" },
              prompt: false,
              override: false
            },
            uses: { spent: 0, max: "", recovery: [] },
            save: { ability: ["dex"], dc: { calculation: "cha", formula: "" } },
            damage: {
              onSave: "half",
              parts: [
                {
                  number: 2,
                  denomination: 10,
                  bonus: "",
                  types: ["necrotic"],
                  custom: { enabled: false, formula: "" },
                  scaling: { mode: "whole", number: 1, formula: "" }
                }
              ]
            },
            sort: 0
          }
        }
      },
      flags: {
        plutonium: {
          page: "spells.html",
          source: "Kyrion",
          hash: "shadow_rebuke_kyrion",
          isDirectImport: true,
          isStandardDragDrop: true
        },
        "altarion-aitusa": {
          isSecondaryClassItem: true,
          isKyrionCustomSpell: true,
          isShadowRebukeSpell: true,
          featureKey: "kyrion:spell:shadow-rebuke:1",
          syncSchemaVersion: 4
        }
      }
    };

    // 6. Shadow Blade (Necrotic damage instead of Psychic; includes Pact Magic / Spell Slot, Legacy of Cania 1/LR Innate Cast, and Weapon Attack)
    const shadowBlade = {
      name: "Shadow Blade",
      type: "spell",
      img: "modules/altarion-aitusa/kyrion_icons/shadow-blade-v2.jpg",
      system: {
        description: {
          value: `<div class="rd__b  rd__b--2"><p>You weave together threads of shadow to create a sword of solidified gloom in your hand. This magic sword lasts until the spell ends. It counts as a simple melee weapon with which you are proficient. It deals [[/damage 2d8 type=necrotic]] damage on a hit and has the finesse, light, and thrown properties (range 20/60). In addition, when you use the sword to attack a target that is in dim light or darkness, you make the attack roll with advantage.</p><p>If you drop the weapon or throw it, it dissipates at the end of the turn. Thereafter, while the spell persists, you can use a bonus action to cause the sword to reappear in your hand.</p></div><div class="rd__b  rd__b--3"><div data-roll-name-ancestor="At Higher Levels" class="rd__b  rd__b--3"><p><span class="entry-title-inner">At Higher Levels.</span></p><p>When you cast this spell using a 3rd- or 4th-level spell slot, the damage increases to [[/damage 3d8]]. When you cast it using a 5th- or 6th-level spell slot, the damage increases to [[/damage 4d8]]. When you cast it using a spell slot of 7th level or higher, the damage increases to [[/damage 5d8]].</p></div></div>`
        },
        source: { book: "Kyrion", page: "1", custom: "Legacy of Cania & Pact Magic", rules: "2014" },
        level: 2,
        school: "ill",
        properties: ["vocal", "somatic", "concentration"],
        materials: { value: "", consumed: false, cost: 0, supply: 0 },
        method: "spell",
        prepared: 1,
        activation: { type: "bonus", value: 1, condition: "" },
        duration: { value: "1", units: "minute" },
        range: { value: null, units: "self" },
        target: {
          template: { count: "", contiguous: false, type: "", size: "", width: "", height: "", units: "ft" },
          affects: { count: "", type: "self", choice: false, special: "" }
        },
        activities: {
          shadowBladeSlot1: {
            _id: "shadowBladeSlot1",
            type: "utility",
            name: "Cast Shadow Blade (Pact Magic / Spell Slot)",
            activation: { type: "bonus", value: 1, condition: "", override: false },
            consumption: { targets: [], scaling: { allowed: false, max: "" }, spellSlot: true },
            description: {
              chatFlavor:
                "Weaves a solidified gloom blade (2d8 Necrotic; 3d8 at 3rd–4th slot, 4d8 at 5th–6th slot, 5d8 at 7th+ slot)."
            },
            duration: { concentration: true, value: "1", units: "minute", special: "", override: false },
            effects: [],
            range: { value: null, units: "self", special: "", override: false },
            target: {
              template: { count: "", contiguous: false, type: "", size: "", width: "", height: "", units: "ft" },
              affects: { count: "", type: "self", choice: false, special: "" },
              prompt: false,
              override: false
            },
            uses: { spent: 0, max: "", recovery: [] },
            roll: { prompt: false, visible: false, name: "", formula: "" },
            sort: 0
          },
          shadowBladeInna1: {
            _id: "shadowBladeInna1",
            type: "utility",
            name: "Innate Cast — Legacy of Cania (1/Long Rest)",
            activation: { type: "bonus", value: 1, condition: "Legacy of Cania (5th+ Level)", override: false },
            consumption: {
              targets: [{ type: "activityUses", value: "1", target: "", scaling: { mode: "", formula: "" } }],
              scaling: { allowed: false, max: "" },
              spellSlot: false
            },
            description: {
              chatFlavor: "Weaves a solidified gloom blade (2d8 Necrotic) once per Long Rest via Legacy of Cania without expending a spell slot."
            },
            duration: { concentration: true, value: "1", units: "minute", special: "", override: false },
            effects: [],
            range: { value: null, units: "self", special: "", override: false },
            target: {
              template: { count: "", contiguous: false, type: "", size: "", width: "", height: "", units: "ft" },
              affects: { count: "", type: "self", choice: false, special: "" },
              prompt: false,
              override: false
            },
            uses: { spent: 0, max: "1", recovery: [{ period: "lr", type: "recoverAll" }] },
            roll: { prompt: false, visible: false, name: "", formula: "" },
            sort: 100
          },
          shadowBladeAtk01: {
            _id: "shadowBladeAtk01",
            type: "attack",
            name: "Shadow Blade Strike (Finesse / Thrown 20/60)",
            activation: { type: "action", value: 1, condition: "", override: true },
            consumption: { targets: [], scaling: { allowed: false, max: "" }, spellSlot: false },
            description: {
              chatFlavor: "Advantage on the attack roll when attacking a target in dim light or darkness."
            },
            duration: { concentration: false, value: "", units: "inst", special: "", override: true },
            effects: [],
            range: { value: 20, units: "ft", special: "Melee 5 ft or Thrown 20/60 ft", override: true },
            target: {
              template: { count: "", contiguous: false, type: "", size: "", width: "", height: "", units: "ft" },
              affects: { count: "1", type: "creature", choice: false, special: "" },
              prompt: false,
              override: true
            },
            uses: { spent: 0, max: "", recovery: [] },
            attack: {
              ability: "dex",
              bonus: "",
              critical: { threshold: null },
              flat: false,
              type: { value: "melee", classification: "weapon" }
            },
            damage: {
              critical: { bonus: "" },
              includeBase: true,
              parts: [
                {
                  number: 2,
                  denomination: 8,
                  bonus: "@mod",
                  types: ["necrotic"],
                  custom: { enabled: false, formula: "" },
                  scaling: { mode: "", number: null, formula: "" }
                }
              ]
            },
            sort: 200
          }
        }
      },
      flags: {
        plutonium: {
          page: "spells.html",
          source: "Kyrion",
          hash: "shadow_blade_kyrion",
          isDirectImport: true,
          isStandardDragDrop: true
        },
        "altarion-aitusa": {
          isSecondaryClassItem: true,
          isKyrionCustomSpell: true,
          isShadowBladeSpell: true,
          featureKey: "kyrion:spell:shadow-blade:2",
          syncSchemaVersion: 4
        }
      }
    };

    return [shadowBlast, darkBlade, shadowHands, shadowArmor, shadowRebuke, shadowBlade];
  }

  /**
   * Build Kyrion's 4 Special Shadow Patron Features
   * (Dark Vitality, Shadow Essence, Shadow Extraction, Shadow Summoning)
   * Grouped into their own dedicated "Shadow Patron Features" section on Kyrion's sheet.
   */
  static buildSpecialShadowFeatures() {
    const darkVitality = {
      name: "Dark Vitality",
      type: "feat",
      img: "modules/altarion-aitusa/kyrion_icons/dark-vitality.jpg",
      system: {
        description: {
          value: `<div class="rd__b  rd__b--2"><p>Starting at 1st level, the abyssal shadow essence woven through your vessel reverses the natural flow of life and decay within your body.</p><p><strong>Abyssal Absorption.</strong> Whenever you would take <strong>Necrotic</strong> or <strong>Poison</strong> damage, you take <strong>no damage</strong> (as if immune) and instead regain a number of Hit Points equal to the damage that would have been dealt.</p><p><strong>Inverted Mending.</strong> Restorative magic and conventional healing are anathema to your shadow-bound form. Whenever you would regain Hit Points from a healing effect (such as a spell, potion, or restorative trait), you regain <strong>no Hit Points</strong> and instead take <strong>damage equal to the amount of Hit Points you would have regained</strong>.</p></div>`
        },
        source: { book: "Kyrion", page: "1", custom: "Shadow Patron Feature", rules: "2014" },
        requirements: "Shadow Patron 1",
        type: { value: "class", subtype: "" },
        uses: { spent: 0, max: "", recovery: [] },
        activities: {}
      },
      flags: {
        "tidy5e-sheet": {
          section: "Shadow Patron Features"
        },
        plutonium: {
          page: "feats.html",
          source: "Kyrion",
          hash: "dark_vitality_kyrion",
          isDirectImport: true,
          isStandardDragDrop: true
        },
        "altarion-aitusa": {
          isKyrionShadowFeature: true,
          isDarkVitalityFeature: true,
          originCategory: "shadow-patron",
          levelRequired: 1,
          featureKey: "kyrion:special:dark-vitality:1",
          syncSchemaVersion: 5
        }
      }
    };

    const shadowEssence = {
      name: "Shadow Essence",
      type: "feat",
      img: "modules/altarion-aitusa/kyrion_icons/shadow-essence-v2.jpg",
      system: {
        description: {
          value: `<div class="rd__b  rd__b--2"><p>Starting at 1st level, you gain a pool of dark energy represented by Essence Points. You have a number of Essence Points equal to your Proficiency Bonus + your spellcasting ability modifier. You regain all expended Essence Points when you finish a long rest.</p></div>`
        },
        source: { book: "Kyrion", page: "1", custom: "Shadow Patron Feature", rules: "2014" },
        requirements: "Shadow Patron 1",
        type: { value: "class", subtype: "" },
        uses: { spent: 0, max: "", recovery: [] },
        activities: {}
      },
      flags: {
        "tidy5e-sheet": {
          section: "Shadow Patron Features"
        },
        plutonium: {
          page: "feats.html",
          source: "Kyrion",
          hash: "shadow_essence_kyrion",
          isDirectImport: true,
          isStandardDragDrop: true
        },
        "altarion-aitusa": {
          isKyrionShadowFeature: true,
          originCategory: "shadow-patron",
          levelRequired: 1,
          featureKey: "kyrion:special:shadow-essence:1",
          syncSchemaVersion: 4
        }
      }
    };

    const shadowExtraction = {
      name: "Shadow Extraction",
      type: "feat",
      img: "modules/altarion-aitusa/kyrion_icons/shadow-extraction.jpg",
      system: {
        description: {
          value: `<div class="rd__b  rd__b--2"><p>When a creature other than a construct or undead dies within 60 feet of you, you can use your action and expend 1 Essence Point to attempt to extract its shadow.</p><p>The creature's shadow must make a Charisma Saving Throw. The DC for this saving throw is 8 + your Proficiency Bonus + your spellcasting ability modifier.</p><p>On a failed save, you capture the shadow, which is added to your shadow storage. On a successful save, the shadow resists extraction, and its essence dissipates. You cannot attempt to extract a shadow from the same creature more than once.</p><p><strong>Shadow Storage.</strong> You can store a number of shadows equal to your Proficiency Bonus + your spellcasting ability modifier. If you attempt to extract a new shadow while at your storage limit, you must first release a stored shadow, which is then permanently destroyed.</p></div>`
        },
        source: { book: "Kyrion", page: "1", custom: "Shadow Patron Feature", rules: "2014" },
        requirements: "Shadow Patron 1",
        type: { value: "class", subtype: "" },
        uses: { spent: 0, max: "", recovery: [] },
        activities: {
          shadowExtractSv1: {
            _id: "shadowExtractSv1",
            type: "save",
            name: "Extract Shadow (1 Essence Point — CHA Save)",
            activation: {
              type: "action",
              value: 1,
              condition: "when a creature other than a construct or undead dies within 60 feet of you",
              override: true
            },
            consumption: {
              targets: [
                {
                  type: "attribute",
                  target: "resources.primary.value",
                  value: "1",
                  scaling: { mode: "", formula: "" }
                }
              ],
              scaling: { allowed: false, max: "" },
              spellSlot: false
            },
            description: {
              chatFlavor:
                "Expends 1 Essence Point. Target's shadow makes a Charisma Saving Throw (DC = 8 + PB + CHA mod). On a failed save, add the shadow to Shadow Storage."
            },
            duration: { concentration: false, value: "", units: "inst", special: "", override: false },
            effects: [],
            range: { value: 60, units: "ft", special: "", override: true },
            target: {
              template: { count: "", contiguous: false, type: "", size: "", width: "", height: "", units: "ft" },
              affects: {
                count: "1",
                type: "creature",
                choice: false,
                special: "creature other than a construct or undead that died within 60 ft"
              },
              prompt: false,
              override: true
            },
            uses: { spent: 0, max: "", recovery: [] },
            save: { ability: ["cha"], dc: { calculation: "cha", formula: "" } },
            damage: { onSave: "none", parts: [] },
            sort: 0
          }
        }
      },
      flags: {
        "tidy5e-sheet": {
          section: "Shadow Patron Features"
        },
        plutonium: {
          page: "feats.html",
          source: "Kyrion",
          hash: "shadow_extraction_kyrion",
          isDirectImport: true,
          isStandardDragDrop: true
        },
        "altarion-aitusa": {
          isKyrionShadowFeature: true,
          originCategory: "shadow-patron",
          levelRequired: 1,
          featureKey: "kyrion:special:shadow-extraction:1",
          syncSchemaVersion: 4
        }
      }
    };

    const shadowSummoning = {
      name: "Shadow Summoning",
      type: "feat",
      img: "modules/altarion-aitusa/kyrion_icons/shadow-summoning.jpg",
      system: {
        description: {
          value: `<div class="rd__b  rd__b--2"><p>Also at 1st level, you can store and summon the shadows you capture.</p><p><strong>Summoning.</strong> As a bonus action on your turn, you can expend 1 Essence Point to summon one or more stored shadows. They appear in unoccupied spaces you can see within 30 feet of you. You can have a number of shadows active at one time equal to your spellcasting ability modifier (minimum of 1).</p><p>The summoned shadows are allies to you and your companions. They act on your initiative, immediately after your turn. They obey your mental commands (no action required by you). If you issue no commands, they take the dodge action and defend themselves from hostile creatures.</p><p>All summoned shadows use the Shadow Soldier stat block.</p><p><strong>Shadow Lieutenants.</strong> At the DM's discretion, if you successfully extract the shadow of a unique and powerful creature, it can become a Shadow Lieutenant. A Lieutenant uses the Shadow Soldier stat block but gains one or more special traits or actions from the original creature, as determined by the DM. A Lieutenant counts as two shadows toward your Shadow Storage limit and your active summons limit.</p></div>`
        },
        source: { book: "Kyrion", page: "1", custom: "Shadow Patron Feature", rules: "2014" },
        requirements: "Shadow Patron 1",
        type: { value: "class", subtype: "" },
        uses: { spent: 0, max: "", recovery: [] },
        activities: {
          shadowSummonUtl1: {
            _id: "shadowSummonUtl1",
            type: "utility",
            name: "Summon Stored Shadows (1 Essence Point)",
            activation: { type: "bonus", value: 1, condition: "", override: true },
            consumption: {
              targets: [
                {
                  type: "attribute",
                  target: "resources.primary.value",
                  value: "1",
                  scaling: { mode: "", formula: "" }
                }
              ],
              scaling: { allowed: false, max: "" },
              spellSlot: false
            },
            description: {
              chatFlavor:
                "Expends 1 Essence Point as a Bonus Action to summon stored shadows within 30 ft (max active shadows = CHA modifier, minimum 1; Shadow Lieutenant counts as 2)."
            },
            duration: { concentration: false, value: "", units: "inst", special: "", override: false },
            effects: [],
            range: { value: 30, units: "ft", special: "", override: true },
            target: {
              template: { count: "", contiguous: false, type: "", size: "", width: "", height: "", units: "ft" },
              affects: {
                count: "",
                type: "space",
                choice: false,
                special: "unoccupied spaces within 30 feet"
              },
              prompt: false,
              override: true
            },
            uses: { spent: 0, max: "", recovery: [] },
            roll: { prompt: false, visible: false, name: "", formula: "" },
            sort: 0
          }
        }
      },
      flags: {
        "tidy5e-sheet": {
          section: "Shadow Patron Features"
        },
        plutonium: {
          page: "feats.html",
          source: "Kyrion",
          hash: "shadow_summoning_kyrion",
          isDirectImport: true,
          isStandardDragDrop: true
        },
        "altarion-aitusa": {
          isKyrionShadowFeature: true,
          originCategory: "shadow-patron",
          levelRequired: 1,
          featureKey: "kyrion:special:shadow-summoning:1",
          syncSchemaVersion: 4
        }
      }
    };

    return [darkVitality, shadowEssence, shadowExtraction, shadowSummoning];
  }

  /**
   * Synchronize Kyrion's 4 Shadow Patron Features into their own "Shadow Patron Features" section
   * (decoupled from Rogue Features) and ensure his passive Dark Vitality ActiveEffect is present.
   */
  static async syncSpecialShadowFeatures(actor) {
    if (!actor) return;
    const defs = this.buildSpecialShadowFeatures();
    const toCreate = [];
    const toUpdate = [];

    for (const def of defs) {
      const fKey = def.flags["altarion-aitusa"].featureKey;
      const lowerName = def.name.trim().toLowerCase();
      const matches = actor.items.filter(
        i =>
          i.type === "feat" &&
          (i.flags?.["altarion-aitusa"]?.featureKey === fKey || i.name?.trim().toLowerCase() === lowerName)
      );
      const existing = matches[0] || null;
      if (matches.length > 1) {
        await actor.deleteEmbeddedDocuments(
          "Item",
          matches.slice(1).map(i => i.id)
        );
      }

      const clone = foundry.utils.deepClone(def);
      if (!existing) {
        toCreate.push(clone);
      } else {
        const curSection = existing.flags?.["tidy5e-sheet"]?.section;
        const hasRogueOrigin = Boolean(existing.flags?.dnd5e?.advancementOrigin);
        const curSchema = Number(existing.flags?.["altarion-aitusa"]?.syncSchemaVersion || 0);
        const needsUpdate =
          curSection !== "Shadow Patron Features" ||
          hasRogueOrigin ||
          existing.img !== clone.img ||
          existing.flags?.["altarion-aitusa"]?.isPrimaryClassItem === true ||
          (existing.system?.description?.value || "") !== (clone.system?.description?.value || "") ||
          curSchema < 4;

        if (needsUpdate) {
          const updateDoc = {
            _id: existing.id,
            name: clone.name,
            img: clone.img,
            "system.description": clone.system.description,
            "system.source": clone.system.source,
            "system.requirements": clone.system.requirements,
            "system.type": clone.system.type,
            ...(clone.system?.activities && Object.keys(clone.system.activities).length > 0
              ? { "system.activities": clone.system.activities }
              : {}),
            "flags.tidy5e-sheet.section": "Shadow Patron Features",
            "flags.altarion-aitusa": {
              ...clone.flags["altarion-aitusa"],
              isPrimaryClassItem: false,
              isSecondaryClassItem: false
            }
          };
          if (hasRogueOrigin) {
            updateDoc["flags.dnd5e.-=advancementOrigin"] = null;
          }
          toUpdate.push(updateDoc);
        }
      }
    }

    if (toCreate.length > 0) {
      await actor.createEmbeddedDocuments("Item", toCreate);
    }
    if (toUpdate.length > 0) {
      await actor.updateEmbeddedDocuments("Item", toUpdate);
    }

    await globalThis.AltarionAutomationManager?.ensureKyrionDarkVitalityEffect?.(actor);
  }

  /**
   * Sync Kyrion's 6 custom Necrotic spells, removing any legacy replaced spells and preserving 1/LR Innate spent uses.
   */
  static async syncCustomSpells(actor) {
    if (!actor) return;

    // 1. Delete legacy replaced spells ("Eldritch Blast", "Booming Blade", "Burning Hands", "Armor of Agathys", "Hellish Rebuke", "Flame Blade")
    //    and any non-custom "Shadow Blade" so Kyrion's Necrotic versions cleanly take their place
    const legacyIds = actor.items
      .filter(i => {
        if (i.type !== "spell") return false;
        const lower = i.name?.trim().toLowerCase() || "";
        if (this.LEGACY_SPELL_NAMES.has(lower)) return true;
        if (lower === "shadow blade" && !i.flags?.["altarion-aitusa"]?.isKyrionCustomSpell) return true;
        return false;
      })
      .map(i => i.id);

    if (legacyIds.length > 0) {
      await actor.deleteEmbeddedDocuments("Item", legacyIds);
    }

    // 2. Upsert Kyrion's 6 custom Necrotic spells
    const customDefs = this.buildCustomSpells(actor);
    const toCreate = [];
    const toUpdate = [];

    for (const def of customDefs) {
      const fKey = def.flags["altarion-aitusa"].featureKey;
      const lowerName = def.name.toLowerCase();
      const matches = actor.items.filter(
        i =>
          i.type === "spell" &&
          (i.flags?.["altarion-aitusa"]?.featureKey === fKey || i.name?.trim().toLowerCase() === lowerName)
      );
      const existing = matches[0] || null;
      if (matches.length > 1) {
        await actor.deleteEmbeddedDocuments(
          "Item",
          matches.slice(1).map(i => i.id)
        );
      }

      const clone = foundry.utils.deepClone(def);
      if (!existing) {
        toCreate.push(clone);
      } else {
        // Preserve spent 1/LR uses on Innate Cast activities across syncs
        const existingActs = existing.toObject().system?.activities || {};
        for (const [actId, actData] of Object.entries(clone.system.activities || {})) {
          if (existingActs[actId]?.uses?.spent !== undefined && actData?.uses?.max) {
            actData.uses.spent = existingActs[actId].uses.spent;
          }
        }

        const needsUpdate =
          existing.name !== clone.name ||
          existing.img !== clone.img ||
          Number(existing.system?.range?.value || 0) !== Number(clone.system?.range?.value || 0) ||
          (existing.system?.description?.value || "") !== (clone.system?.description?.value || "") ||
          Number(existing.flags?.["altarion-aitusa"]?.syncSchemaVersion || 0) < 4;

        if (needsUpdate) {
          toUpdate.push({
            _id: existing.id,
            name: clone.name,
            img: clone.img,
            "system.identifier": clone.system.identifier || "",
            "system.description": clone.system.description,
            "system.source": clone.system.source,
            "system.level": clone.system.level,
            "system.school": clone.system.school,
            "system.properties": clone.system.properties,
            "system.materials": clone.system.materials,
            "system.method": clone.system.method,
            "system.prepared": clone.system.prepared,
            "system.activation": clone.system.activation,
            "system.duration": clone.system.duration,
            "system.range": clone.system.range,
            "system.target": clone.system.target,
            "system.activities": clone.system.activities,
            flags: foundry.utils.mergeObject(existing.toObject().flags || {}, clone.flags || {})
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
  }

  /**
   * Update "Legacy of Cania" trait description & Eldritch Invocations on Kyrion so their spell links
   * point directly to Kyrion's custom "Shadow Hands", "Shadow Blade", and "Shadow Blast" items.
   */
  static async syncLegacyOfCaniaAndInvocationLinks(actor) {
    if (!actor) return;

    const findSpell = (name) =>
      actor.items.find(i => i.type === "spell" && i.name?.trim().toLowerCase() === name.toLowerCase()) || null;

    const mageHandItem = findSpell("Mage Hand");
    const shadowHandsItem = findSpell("Shadow Hands");
    const shadowBladeItem = findSpell("Shadow Blade");
    const shadowBlastItem = findSpell("Shadow Blast");

    const mageHandLink = mageHandItem ? `@UUID[${mageHandItem.uuid}]{Mage Hand}` : `<em>Mage Hand</em>`;
    const shadowHandsLink = shadowHandsItem ? `@UUID[${shadowHandsItem.uuid}]{Shadow Hands}` : `<em>Shadow Hands</em>`;
    const shadowBladeLink = shadowBladeItem ? `@UUID[${shadowBladeItem.uuid}]{Shadow Blade}` : `<em>Shadow Blade</em>`;
    const shadowBlastLink = shadowBlastItem ? `@UUID[${shadowBlastItem.uuid}]{Shadow Blast}` : `<em>Shadow Blast</em>`;

    const legacyOfCaniaHtml = `<div class="rd__b  rd__b--2"><p>You know the ${mageHandLink} cantrip. When you reach 3rd level, you can cast the ${shadowHandsLink} spell as a 2nd-level spell once with this trait and regain the ability to do so when you finish a long rest. When you reach 5th level, you can cast the ${shadowBladeLink} spell once with this trait and regain the ability to do so when you finish a long rest. Charisma is your spellcasting ability for these spells.</p></div>`;

    const updates = [];

    // 1. Update Legacy of Cania trait item(s)
    for (const item of actor.items) {
      if (item.type === "feat" && item.name?.trim().toLowerCase().includes("legacy of cania")) {
        if ((item.system?.description?.value || "") !== legacyOfCaniaHtml) {
          updates.push({
            _id: item.id,
            "system.description.value": legacyOfCaniaHtml
          });
        }
      }
    }

    // 2. Update any imported Eldritch Invocations that mention "eldritch blast" to reference Kyrion's "Shadow Blast"
    for (const item of actor.items) {
      if (item.type !== "feat") continue;
      const isInvocation =
        item.flags?.["altarion-aitusa"]?.choiceCategory === "eldritch-invocation" ||
        item.system?.type?.subtype === "eldritchInvocation";
      if (!isInvocation) continue;

      const curDesc = String(item.system?.description?.value || "");
      if (!/eldritch blast/i.test(curDesc)) continue;

      const newDesc = curDesc
        .replace(/@UUID\[[^\]]*\]\{eldritch blast\}/gi, shadowBlastLink)
        .replace(/@spell\[eldritch blast(?:\|[^\]]*)?\]/gi, shadowBlastLink)
        .replace(/\beldritch blast\b/gi, "Shadow Blast");

      if (newDesc !== curDesc) {
        updates.push({
          _id: item.id,
          "system.description.value": newDesc
        });
      }
    }

    if (updates.length > 0) {
      await actor.updateEmbeddedDocuments("Item", updates);
    }

    // Ensure Shadow Blast range matches Eldritch Spear if Kyrion has Eldritch Spear
    if (shadowBlastItem) {
      const hasSpear = actor.items.some(
        i => i.type === "feat" && i.name?.trim().toLowerCase().includes("eldritch spear")
      );
      const desiredRange = hasSpear ? 300 : 120;
      if (Number(shadowBlastItem.system?.range?.value) !== desiredRange) {
        await shadowBlastItem.update({
          "system.range.value": desiredRange,
          "system.activities.shadowBlastAtk01.range.value": desiredRange
        });
      }
    }
  }

  /**
   * Synchronize Kyrion's Essence Points (resources.primary, Long Rest recovery) and
   * Shadow Storage (resources.secondary, persistent across rests): Max = Proficiency Bonus + CHA Modifier.
   */
  static async syncShadowResources(actor) {
    if (!actor) return;
    const prof = Number(actor.system?.attributes?.prof ?? 2);
    const chaMod = Number(actor.system?.abilities?.cha?.mod ?? 0);
    const poolMax = Math.max(1, prof + chaMod);

    const prim = actor.system?.resources?.primary || {};
    const curEssence =
      (prim.label === "Essence Points" || prim.label === "Shadow Essence") && Number.isFinite(prim.value)
        ? Math.clamp(Number(prim.value), 0, poolMax)
        : poolMax;

    const sec = actor.system?.resources?.secondary || {};
    const curStorage =
      sec.label === "Shadow Storage" && Number.isFinite(sec.value)
        ? Math.clamp(Number(sec.value), 0, poolMax)
        : 0;

    const updates = {};
    if (
      prim.label !== "Essence Points" ||
      prim.max !== poolMax ||
      prim.value !== curEssence ||
      prim.sr !== false ||
      prim.lr !== true
    ) {
      updates["system.resources.primary"] = {
        label: "Essence Points",
        value: curEssence,
        max: poolMax,
        sr: false,
        lr: true
      };
    }

    if (
      sec.label !== "Shadow Storage" ||
      sec.max !== poolMax ||
      sec.value !== curStorage ||
      sec.sr !== false ||
      sec.lr !== false
    ) {
      updates["system.resources.secondary"] = {
        label: "Shadow Storage",
        value: curStorage,
        max: poolMax,
        sr: false,
        lr: false
      };
    }

    if (!foundry.utils.isEmpty(updates)) {
      await actor.update(updates);
    }
  }

  static async sync(actor, options = {}) {
    return OtherPlayersBase.runExclusiveSync(
      actor,
      this,
      async () => {
        const existingRogue = actor.items.find(
          i => i.type === "class" && (i.system?.identifier === "rogue" || i.name.toLowerCase() === "rogue")
        );
        const rogueLevel = Number(existingRogue?.system?.levels || this.PRIMARY_CLASS.defaultLevel);

        const existingWarlock = actor.items.find(
          i => i.type === "class" && (i.system?.identifier === "warlock" || i.name.toLowerCase() === "warlock")
        );
        const warlockLevel = Number(existingWarlock?.system?.levels || this.SECONDARY_CLASS.defaultLevel);

        // 1. Dual Races: Reborn (VRGR) + Tiefling (Mephistopheles) (MTF) with modified Legacy of Cania
        const rebornBundle = await OtherPlayersBase.pConvertRaceAndTraits(
          {
            name: "Reborn",
            source: "VRGR",
            alternateNames: ["Lineage; Reborn"]
          },
          { actor }
        );
        const mephTieflingBundle = await OtherPlayersBase.pConvertRaceAndTraits(
          {
            name: "Tiefling (Mephistopheles)",
            source: "MTF",
            alternateNames: ["Mephistopheles Tiefling", "Tiefling"]
          },
          {
            actor,
            customRaceMutator: (rawRace) => this.mutateLegacyOfCania(rawRace)
          }
        );

        await OtherPlayersBase.syncDualRaces(
          actor,
          [mephTieflingBundle, rebornBundle].filter(Boolean)
        );

        // 1b. Sync Legacy of Cania cantrip (Mage Hand) + Kyrion's 6 Custom Necrotic Shadow Spells
        await OtherPlayersBase.syncSpells(actor, [{ name: "Mage Hand", source: "PHB" }]);
        await this.syncCustomSpells(actor);

        // 2. Primary Class: Rogue + Subclass: Swashbuckler (XGE)
        const rogueConv = await OtherPlayersBase.pConvertClass({
          name: "Rogue",
          source: "PHB",
          level: rogueLevel,
          actor,
          isSecondary: false
        });
        let rogueClassItem = existingRogue;
        let swashbucklerSubclassItem = null;

        if (rogueConv) {
          const scConv = await OtherPlayersBase.pConvertSubclass({
            clsRaw: rogueConv.clsRaw,
            name: "Swashbuckler",
            shortName: "Swashbuckler",
            source: "XGE",
            className: "Rogue",
            classSource: "PHB",
            actor,
            isSecondary: false
          });
          const syncedPrimary = await OtherPlayersBase.syncClassAndSubclass(actor, {
            clsData: rogueConv.clsData,
            scData: scConv?.scData,
            subclassUnlockLevel: 3,
            isSecondary: false,
            classFeatureDefs: this.ROGUE_CLASS_FEATURES,
            subclassFeatureDefs: this.SWASHBUCKLER_SUBCLASS_FEATURES,
            clsRaw: rogueConv.clsRaw,
            scRaw: scConv?.scRaw,
            className: "Rogue",
            classSource: "PHB",
            subclassShortName: "Swashbuckler",
            subclassSource: "XGE"
          });
          rogueClassItem = syncedPrimary.classItem;
          swashbucklerSubclassItem = syncedPrimary.subclassItem;

          const rogueFeats = [];
          for (const def of this.ROGUE_CLASS_FEATURES) {
            if (def.level > rogueLevel) continue;
            const doc = await OtherPlayersBase.pConvertFeatureStub(
              {
                name: def.name,
                source: def.source,
                className: "Rogue",
                classSource: "PHB",
                level: def.level,
                __prop: "classFeature"
              },
              { actor, isSecondary: false, originCategory: "class", clsRaw: rogueConv.clsRaw }
            );
            if (doc) rogueFeats.push(doc);
          }

          if (rogueLevel >= 3) {
            for (const def of this.SWASHBUCKLER_SUBCLASS_FEATURES) {
              if (def.level > rogueLevel) continue;
              const doc = await OtherPlayersBase.pConvertFeatureStub(
                {
                  name: def.name,
                  source: def.source,
                  className: "Rogue",
                  classSource: "PHB",
                  subclassShortName: "Swashbuckler",
                  subclassSource: "XGE",
                  level: def.level,
                  __prop: "subclassFeature"
                },
                { actor, isSecondary: false, originCategory: "subclass", scRaw: scConv?.scRaw }
              );
              if (doc) rogueFeats.push(doc);
            }
          }

          await OtherPlayersBase.syncFeatureItems(actor, rogueFeats, {
            maxLevel: rogueLevel,
            classItemId: rogueClassItem?.id || null,
            subclassItemId: swashbucklerSubclassItem?.id || null
          });
        }

        // 2b. Sync Kyrion's 4 Shadow Patron Features into their dedicated "Shadow Patron Features" section
        await this.syncSpecialShadowFeatures(actor);

        // 3. Secondary Class: Warlock + Subclass: The Hexblade (XGE)
        const warlockConv = await OtherPlayersBase.pConvertClass({
          name: "Warlock",
          source: "PHB",
          level: warlockLevel,
          actor,
          isSecondary: true
        });
        let warlockClassItem = existingWarlock;
        let hexbladeSubclassItem = null;

        if (warlockConv) {
          const scConv = await OtherPlayersBase.pConvertSubclass({
            clsRaw: warlockConv.clsRaw,
            name: "The Hexblade",
            shortName: "Hexblade",
            source: "XGE",
            className: "Warlock",
            classSource: "PHB",
            actor,
            isSecondary: true
          });
          const syncedSec = await OtherPlayersBase.syncClassAndSubclass(actor, {
            clsData: warlockConv.clsData,
            scData: scConv?.scData,
            subclassUnlockLevel: 1,
            isSecondary: true,
            classFeatureDefs: this.WARLOCK_CLASS_FEATURES,
            subclassFeatureDefs: this.HEXBLADE_SUBCLASS_FEATURES,
            clsRaw: warlockConv.clsRaw,
            scRaw: scConv?.scRaw,
            className: "Warlock",
            classSource: "PHB",
            subclassShortName: "Hexblade",
            subclassSource: "XGE"
          });
          warlockClassItem = syncedSec.classItem;
          hexbladeSubclassItem = syncedSec.subclassItem;

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
              { actor, isSecondary: true, originCategory: "class", clsRaw: warlockConv.clsRaw }
            );
            if (doc) warlockFeats.push(doc);
          }

          for (const def of this.HEXBLADE_SUBCLASS_FEATURES) {
            if (def.level > warlockLevel) continue;
            const doc = await OtherPlayersBase.pConvertFeatureStub(
              {
                name: def.name,
                source: def.source,
                className: "Warlock",
                classSource: "PHB",
                subclassShortName: "Hexblade",
                subclassSource: "XGE",
                level: def.level,
                __prop: "subclassFeature"
              },
              { actor, isSecondary: true, originCategory: "subclass", scRaw: scConv?.scRaw }
            );
            if (doc) warlockFeats.push(doc);
          }

          await OtherPlayersBase.syncFeatureItems(actor, warlockFeats, {
            maxLevel: warlockLevel,
            classItemId: warlockClassItem?.id || null,
            subclassItemId: hexbladeSubclassItem?.id || null
          });
        }

        // 4. Actor Traits: Saving Throws (DEX & INT from Rogue, + WIS at Lvl 15 Slippery Mind),
        //    Darkvision 60 ft, Fire & Poison Resistance (Tiefling + Reborn), Rakish Audacity (+CHA mod to Initiative)
        const actorUpdates = {};
        if (rogueClassItem && actor.system.details?.originalClass !== rogueClassItem.id) {
          actorUpdates["system.details.originalClass"] = rogueClassItem.id;
        }
        const savesToGrant = [...this.PRIMARY_CLASS.saves, ...(rogueLevel >= 15 ? ["wis"] : [])];
        for (const saveKey of savesToGrant) {
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
        if (rogueLevel >= 3) {
          const curInitBonus = String(actor.system.attributes?.init?.bonus || "");
          if (!curInitBonus.includes("@abilities.cha.mod")) {
            actorUpdates["system.attributes.init.bonus"] = curInitBonus
              ? `${curInitBonus} + @abilities.cha.mod`
              : "@abilities.cha.mod";
          }
        }
        if (actor.system.traits?.dr) {
          const drSet = new Set(Array.from(actor._source?.system?.traits?.dr?.value || []));
          let drChanged = false;
          for (const d of ["fire", "poison"]) {
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

        // 4b. Sync Kyrion's Shadow Essence & Shadow Storage resources (now that PB & CHA mod are refreshed)
        await this.syncShadowResources(actor);

        // 4c. Link "Legacy of Cania" & Eldritch Invocations directly to Kyrion's custom Shadow Hands, Shadow Blade & Shadow Blast
        await this.syncLegacyOfCaniaAndInvocationLinks(actor);

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

        // 5. Interactive Choice Dialogs (Eldritch Invocations, Pact Boon at Warlock Lvl 3+, Rogue Expertise)
        const maxInvocations = OtherPlayersBase.getEldritchInvocationCount(warlockLevel);
        if (maxInvocations > 0) {
          await OtherPlayersBase.promptOptionalFeatureChoiceIfNeeded(actor, {
            featureType: "EI",
            choiceCategory: "eldritch-invocation",
            title: `Eldritch Invocations (Warlock Level ${warlockLevel})`,
            totalAllowed: maxInvocations,
            classItem: warlockClassItem,
            isSecondary: true,
            requirementsLabel: `Warlock ${warlockLevel}`,
            subtype: "eldritchInvocation"
          });
          await this.syncLegacyOfCaniaAndInvocationLinks(actor);
        }

        if (warlockLevel >= 3) {
          await OtherPlayersBase.promptOptionalFeatureChoiceIfNeeded(actor, {
            featureType: "PB",
            choiceCategory: "pact-boon",
            title: `Pact Boon (Warlock Level ${warlockLevel})`,
            totalAllowed: 1,
            classItem: warlockClassItem,
            isSecondary: true,
            requirementsLabel: `Warlock ${warlockLevel}`,
            subtype: "pact"
          });
        }

        const expertiseSlots = rogueLevel >= 6 ? 4 : 2;
        await OtherPlayersBase.promptSkillExpertiseChoiceIfNeeded(actor, {
          flagKey: "rogueExpertiseChosen",
          title: `Rogue Expertise (${expertiseSlots} Skills)`,
          description: `Choose ${expertiseSlots} skills to gain Expertise (double proficiency bonus):`,
          count: expertiseSlots
        });

        ui.notifications.info(
          `[Other Players] Synchronized ${actor.name}: Rogue (Lvl ${rogueLevel}) & Warlock (Lvl ${warlockLevel} - Secondary).`
        );
      },
      options
    );
  }
}

KyrionManager.register();
