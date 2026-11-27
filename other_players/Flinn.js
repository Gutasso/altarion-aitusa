/**
 * Character Synchronizer & Homebrew Configuration for: FLINN
 * - Dual Races: Halfling (Mark of Healing) (ERLW) + Aasimar (Protector) (VGM)
 * - Primary Class: Wizard (Default Level 4) — Subclass: School of Divination (PHB)
 * - Secondary Class: Cleric (Default Level 2) — Subclass: Knowledge Domain (PHB)
 * - Special Spellcasting Rule:
 *   - Cleric secondary class contributes as a Half-Caster to Flinn's spell slot progression:
 *     `effectiveCasterLevel = wizardLevel + Math.floor(clericLevel / 2)`
 *     (e.g., at Wizard 4 / Cleric 2 -> Caster Level 5 -> 4 Lvl-1, 3 Lvl-2, 2 Lvl-3 slots).
 *   - Flinn can prepare both Cleric and Wizard spells up to his maximum spell slot level (`maxSlotLevel`).
 *   - All PHB Cleric spells for levels `1..maxSlotLevel` are automatically imported and tagged as Cleric (Yellow/Gold),
 *     while Wizard spells are tagged as Wizard (Blue).
 * - Exclusive Feature: "Intuitive Arcanum" (Fortune's Knowledge + Accidental Casting with scaling DC & Wild Magic Surge on failure).
 * - Exclusive Spell: "Paths of Destiny" (2nd-level Divination, 1/Long Rest Free Cast + Spell Slot Cast, Reaction d20 Twist in chat).
 * - Interactive Choice Dialog: Blessings of Knowledge (2 skills from Arcana, History, Nature, Religion gain Expertise).
 */

import { OtherPlayersBase } from "./OtherPlayersBase.js";
import { ArcanePlagueManager } from "../scripts/arcane-plague.js";
import { AltarionAutomationManager } from "../scripts/automations.js";
import { createV2Dialog } from "../scripts/dialog-v2.js";
import { CoriaRollLedger } from "../scripts/roll-ledger.js";
import { isIgnoredBackupActor, shouldThisClientRunAutoSync } from "../scripts/sync-guard.js";

const MODULE_ID = "altarion-aitusa";

export class FlinnManager {
  static CHARACTER_NAME = "Flinn";
  static _hooksInitialized = false;

  static PRIMARY_CLASS = {
    name: "Wizard",
    identifier: "wizard",
    source: "PHB",
    defaultLevel: 4,
    saves: ["int", "wis"],
    subclass: {
      name: "School of Divination",
      shortName: "Divination",
      source: "PHB",
      unlockLevel: 2
    }
  };

  static SECONDARY_CLASS = {
    name: "Cleric",
    identifier: "cleric",
    source: "PHB",
    defaultLevel: 2,
    subclass: {
      name: "Knowledge Domain",
      shortName: "Knowledge",
      source: "PHB",
      unlockLevel: 1
    }
  };

  static WIZARD_CLASS_FEATURES = [
    { name: "Spellcasting", level: 1, source: "PHB" },
    { name: "Arcane Recovery", level: 1, source: "PHB" },
    { name: "Arcane Tradition", level: 2, source: "PHB" },
    { name: "Cantrip Formulas", level: 3, source: "TCE" },
    { name: "Ability Score Improvement", level: 4, source: "PHB" },
    { name: "Ability Score Improvement", level: 8, source: "PHB" },
    { name: "Ability Score Improvement", level: 12, source: "PHB" },
    { name: "Ability Score Improvement", level: 16, source: "PHB" },
    { name: "Spell Mastery", level: 18, source: "PHB" },
    { name: "Ability Score Improvement", level: 19, source: "PHB" },
    { name: "Signature Spells", level: 20, source: "PHB" }
  ];

  static DIVINATION_SUBCLASS_FEATURES = [
    { name: "Divination Savant", level: 2, source: "PHB" },
    { name: "Portent", level: 2, source: "PHB" },
    { name: "Expert Divination", level: 6, source: "PHB" },
    { name: "The Third Eye", level: 10, source: "PHB" },
    { name: "Greater Portent", level: 14, source: "PHB" }
  ];

  static CLERIC_CLASS_FEATURES = [
    { name: "Spellcasting", level: 1, source: "PHB" },
    { name: "Divine Domain", level: 1, source: "PHB" },
    { name: "Channel Divinity", level: 2, source: "PHB" },
    { name: "Channel Divinity: Turn Undead", level: 2, source: "PHB" },
    { name: "Channel Divinity: Harness Divine Power", level: 2, source: "TCE" },
    { name: "Ability Score Improvement", level: 4, source: "PHB" },
    { name: "Cantrip Versatility", level: 4, source: "TCE" },
    { name: "Destroy Undead", level: 5, source: "PHB" },
    { name: "Ability Score Improvement", level: 8, source: "PHB" },
    { name: "Blessed Strikes", level: 8, source: "TCE" },
    { name: "Divine Intervention", level: 10, source: "PHB" },
    { name: "Ability Score Improvement", level: 12, source: "PHB" },
    { name: "Ability Score Improvement", level: 16, source: "PHB" },
    { name: "Ability Score Improvement", level: 19, source: "PHB" }
  ];

  static KNOWLEDGE_SUBCLASS_FEATURES = [
    { name: "Domain Spells", level: 1, source: "PHB" },
    { name: "Blessings of Knowledge", level: 1, source: "PHB" },
    { name: "Channel Divinity: Knowledge of the Ages", level: 2, source: "PHB" },
    { name: "Channel Divinity: Read Thoughts", level: 6, source: "PHB" },
    { name: "Potent Spellcasting", level: 8, source: "PHB" },
    { name: "Visions of the Past", level: 17, source: "PHB" }
  ];

  /**
   * Complete 2014 PHB Cleric Spell List by Spell Level (1 to 9).
   */
  static PHB_CLERIC_SPELLS_BY_LEVEL = {
    1: [
      "Bane",
      "Bless",
      "Command",
      "Create or Destroy Water",
      "Cure Wounds",
      "Detect Evil and Good",
      "Detect Magic",
      "Detect Poison and Disease",
      "Guiding Bolt",
      "Healing Word",
      "Inflict Wounds",
      "Protection from Evil and Good",
      "Purify Food and Drink",
      "Sanctuary",
      "Shield of Faith"
    ],
    2: [
      "Aid",
      "Augury",
      "Blindness/Deafness",
      "Calm Emotions",
      "Continual Flame",
      "Enhance Ability",
      "Find Traps",
      "Gentle Repose",
      "Hold Person",
      "Lesser Restoration",
      "Locate Object",
      "Prayer of Healing",
      "Protection from Poison",
      "Silence",
      "Spiritual Weapon",
      "Warding Bond",
      "Zone of Truth"
    ],
    3: [
      "Animate Dead",
      "Beacon of Hope",
      "Bestow Curse",
      "Clairvoyance",
      "Create Food and Water",
      "Daylight",
      "Dispel Magic",
      "Feign Death",
      "Glyph of Warding",
      "Magic Circle",
      "Mass Healing Word",
      "Meld into Stone",
      "Protection from Energy",
      "Remove Curse",
      "Revivify",
      "Sending",
      "Speak with Dead",
      "Spirit Guardians",
      "Tongues",
      "Water Walk"
    ],
    4: [
      "Banishment",
      "Control Water",
      "Death Ward",
      "Divination",
      "Freedom of Movement",
      "Guardian of Faith",
      "Locate Creature",
      "Stone Shape"
    ],
    5: [
      "Commune",
      "Contagion",
      "Dispel Evil and Good",
      "Flame Strike",
      "Geas",
      "Greater Restoration",
      "Hallow",
      "Insect Plague",
      "Legend Lore",
      "Mass Cure Wounds",
      "Planar Binding",
      "Raise Dead",
      "Scrying"
    ],
    6: [
      "Blade Barrier",
      "Create Undead",
      "Find the Path",
      "Forbiddance",
      "Harm",
      "Heal",
      "Heroes' Feast",
      "Planar Ally",
      "True Seeing",
      "Word of Recall"
    ],
    7: [
      "Conjure Celestial",
      "Divine Word",
      "Etherealness",
      "Fire Storm",
      "Plane Shift",
      "Regenerate",
      "Resurrection",
      "Symbol"
    ],
    8: [
      "Antimagic Field",
      "Control Weather",
      "Earthquake",
      "Holy Aura"
    ],
    9: [
      "Astral Projection",
      "Gate",
      "Mass Heal",
      "True Resurrection"
    ]
  };

  /**
   * Official 5e Wild Magic Surge Table (1d100) for Intuitive Arcanum failures.
   */
  static WILD_MAGIC_SURGE_TABLE = [
    [1, 2, "Roll on this table at the start of each of your turns for the next minute, ignoring this result on subsequent rolls."],
    [3, 4, "For the next minute, you can see any invisible creature if you have line of sight to it."],
    [5, 6, "A modron chosen and controlled by the DM appears in an unoccupied space within 5 feet of you, then disappears 1 minute later."],
    [7, 8, "You cast Fireball as a 3rd-level spell centered on yourself."],
    [9, 10, "You cast Magic Missile as a 5th-level spell."],
    [11, 12, "Roll a d10. Your height changes by a number of inches equal to the roll. If the roll is odd, you shrink. If the roll is even, you grow."],
    [13, 14, "You cast Confusion centered on yourself."],
    [15, 16, "For the next minute, you regain 5 hit points at the start of each of your turns."],
    [17, 18, "You grow a long beard made of feathers that remains until you sneeze, at which point the feathers explode out from your face."],
    [19, 20, "You cast Grease centered on yourself."],
    [21, 22, "Creatures have disadvantage on saving throws against the next spell you cast in the next minute that involves a saving throw."],
    [23, 24, "Your skin turns a vibrant shade of blue. A Remove Curse spell can end this effect."],
    [25, 26, "An eye appears on your forehead for the next minute. During that time, you have advantage on Wisdom (Perception) checks that rely on sight."],
    [27, 28, "For the next minute, all your spells with a casting time of 1 action have a casting time of 1 bonus action."],
    [29, 30, "You teleport up to 60 feet to an unoccupied space of your choice that you can see."],
    [31, 32, "You are transported to the Astral Plane until the end of your next turn, after which time you return to the space you previously occupied."],
    [33, 34, "Maximize the damage of the next damaging spell you cast within the next minute."],
    [35, 36, "Roll a d10. Your age changes by a number of years equal to the roll. If the roll is odd, you get younger (minimum 1 year old). If the roll is even, you get older."],
    [37, 38, "1d6 flumphs controlled by the DM appear in unoccupied spaces within 60 feet of you and are frightened of you. They vanish after 1 minute."],
    [39, 40, "You regain 2d10 hit points."],
    [41, 42, "You turn into a potted plant until the start of your next turn. While a plant, you are incapacitated and have vulnerability to all damage."],
    [43, 44, "For the next minute, you can teleport up to 20 feet as a bonus action on each of your turns."],
    [45, 46, "You cast Levitate on yourself."],
    [47, 48, "A unicorn controlled by the DM appears in a space within 5 feet of you, then disappears 1 minute later."],
    [49, 50, "You can't speak for the next minute. Whenever you try, pink bubbles float out of your mouth."],
    [51, 52, "A spectral shield hovers near you for the next minute, granting you a +2 bonus to AC and immunity to Magic Missile."],
    [53, 54, "You are immune to being intoxicated by alcohol for the next 5d6 days."],
    [55, 56, "Your hair falls out but grows back within 24 hours."],
    [57, 58, "For the next minute, any flammable object you touch that isn't being worn or carried by another creature bursts into flame."],
    [59, 60, "You regain your lowest-level expended spell slot."],
    [61, 62, "For the next minute, you must shout when you speak."],
    [63, 64, "You cast Fog Cloud centered on yourself."],
    [65, 66, "Up to three creatures you choose within 30 feet of you take 4d10 lightning damage."],
    [67, 68, "You are frightened by the nearest creature until the end of your next turn."],
    [69, 70, "Each creature within 30 feet of you becomes invisible for the next minute. The invisibility ends on a creature when it attacks or casts a spell."],
    [71, 72, "You gain resistance to all damage for the next minute."],
    [73, 74, "A random creature within 60 feet of you becomes poisoned for 1d4 hours."],
    [75, 76, "You glow with bright light in a 30-foot radius for the next minute. Any creature that ends its turn within 5 feet of you is blinded until the end of its next turn."],
    [77, 78, "You cast Polymorph on yourself. If you fail the saving throw, you turn into a sheep for the spell's duration."],
    [79, 80, "Illusory butterflies and flower petals flutter in the air within 10 feet of you for the next minute."],
    [81, 82, "You can take one additional action immediately."],
    [83, 84, "Each creature within 30 feet of you takes 1d10 necrotic damage. You regain hit points equal to the sum of the necrotic damage dealt."],
    [85, 86, "You cast Mirror Image."],
    [87, 88, "You cast Fly on a random creature within 60 feet of you."],
    [89, 90, "You become invisible for the next minute. During that time, other creatures can't hear you. The invisibility ends if you attack or cast a spell."],
    [91, 92, "If you die within the next minute, you immediately come back to life as if by the Reincarnate spell."],
    [93, 94, "Your size increases by one size category for the next minute."],
    [95, 96, "You and all creatures within 30 feet of you gain vulnerability to piercing damage for the next minute."],
    [97, 98, "You are surrounded by faint, ethereal music for the next minute."],
    [99, 100, "You regain all expended Sorcery Points / regain 1 expended spell slot of your highest level."]
  ];

  static register() {
    globalThis.FlinnManager = this;
    OtherPlayersBase.registerCharacterHandler(this.CHARACTER_NAME, this);
    this.registerFlinnHooks();
    Hooks.once("ready", async () => {
      try {
        if (!shouldThisClientRunAutoSync(null)) return;
        const flinn = this.getFlinnActor();
        if (flinn && shouldThisClientRunAutoSync(flinn)) {
          await this.ensureSpiritualWeaponConfigured(flinn);
          await this.ensureHarnessDivinePowerConfigured(flinn);
          await this.ensureAidSpellConfigured(flinn);
        }
      } catch (_e) {
        // ignore
      }
    });
  }

  static isFlinn(actor) {
    if (!actor || isIgnoredBackupActor(actor)) return false;
    const norm = String(actor.name || "").trim().toLowerCase();
    const base = this.CHARACTER_NAME.toLowerCase();
    return norm === base || norm === "flinn encantor" || norm.startsWith(`${base} `);
  }

  static getFlinnActor() {
    const candidates = (game.actors ? Array.from(game.actors) : []).filter(a => this.isFlinn(a));
    return (
      candidates.find(a => String(a.name || "").trim().toLowerCase() === "flinn encantor") ||
      candidates[0] ||
      null
    );
  }

  /**
   * Check whether the current connected user (`game.user`) is the GM or the player who controls `actor`.
   * Used to restrict scene widgets and chat reaction buttons to ONLY the GM and the involved player(s).
   * Explicitly ignores Backup actors (`*_Backup` / `*_Bakcup`) even if a user's `character` still pointed to one!
   */
  static isUserControllerOf(actor) {
    if (!actor || !game.user) return false;
    if (isIgnoredBackupActor(actor)) return false;
    if (game.user.isGM) return true;

    const actorLower = String(actor.name || "").trim().toLowerCase();

    // 1. Check Foundry user's assigned character (ignoring any Backup sheet assignment!)
    const rawAssigned = game.user.character;
    const assignedChar = rawAssigned && !isIgnoredBackupActor(rawAssigned) ? rawAssigned : null;
    if (assignedChar) {
      if (assignedChar.id === actor.id) return true;
      // Allow Altarion's controller to control BOTH Altarion (Talendris) & companion Aitusa
      const assignedLower = String(assignedChar.name || "").trim().toLowerCase();
      const assignedIsAltarionPair =
        assignedLower === "altarion" ||
        assignedLower.startsWith("altarion ") ||
        assignedLower === "aitusa" ||
        assignedLower.startsWith("aitusa ");
      const actorIsAltarionPair =
        actorLower === "altarion" ||
        actorLower.startsWith("altarion ") ||
        actorLower === "aitusa" ||
        actorLower.startsWith("aitusa ");
      if (assignedIsAltarionPair && actorIsAltarionPair) {
        return true;
      }
    }

    // 2. Match explicit Foundry User Name -> Live Character binding
    //    (guarantees player users "Altarion", "Parva", "Kyrion", "Flinn" ALWAYS see their buttons even if user.character was stale!)
    const userLower = String(game.user.name || "").trim().toLowerCase();
    const isAltarionUser = userLower === "altarion" || userLower.startsWith("altarion ");
    const isParvaUser = userLower === "parva" || userLower.startsWith("parva ");
    const isKyrionUser = userLower === "kyrion" || userLower.startsWith("kyrion ");
    const isFlinnUser = userLower === "flinn" || userLower.startsWith("flinn ");

    if (
      isAltarionUser &&
      (actorLower === "altarion" ||
        actorLower.startsWith("altarion ") ||
        actorLower === "aitusa" ||
        actorLower.startsWith("aitusa "))
    ) {
      return true;
    }
    if (isParvaUser && (actorLower === "parva" || actorLower.startsWith("parva "))) {
      return true;
    }
    if (isKyrionUser && (actorLower === "kyrion" || actorLower.startsWith("kyrion "))) {
      return true;
    }
    if (isFlinnUser && (actorLower === "flinn" || actorLower.startsWith("flinn "))) {
      return true;
    }

    // 3. Direct per-user OWNER permission on the actor (not merely world default)
    const directPerm = Number(actor.ownership?.[game.user.id] ?? -1);
    if (directPerm >= (CONST.DOCUMENT_OWNERSHIP_LEVELS?.OWNER ?? 3)) {
      return true;
    }

    // 4. Fallback when user has no live assigned character at all
    if (!assignedChar) {
      return Boolean(actor.isOwner);
    }

    return false;
  }

  static isUserFlinnController(flinn = null) {
    flinn = flinn || this.getFlinnActor();
    if (!game.user) return false;
    if (game.user.isGM) return true;
    if (!flinn) return false;
    return this.isUserControllerOf(flinn);
  }

  /* -------------------------------------------- */
  /*  Flinn's Portent Rolls Homebrew System       */
  /* -------------------------------------------- */

  static _activePortentDialog = null;

  static getMaxPortents(actor = null) {
    actor = actor || this.getFlinnActor();
    if (!actor) return 2;
    const { wizardLevel } = this.getLevels(actor);
    return wizardLevel >= 14 ? 3 : 2;
  }

  /**
   * Compute glow color for each Portent die:
   * - "green": strictly highest value (when not tied)
   * - "red": strictly lowest value (when not tied)
   * - "yellow": intermediate value OR any value shared by 2 or more dice
   */
  static computePortentColors(diceList = []) {
    if (!Array.isArray(diceList) || diceList.length === 0) return [];
    const values = diceList.map(d => Number(d.value || 10));
    const freq = new Map();
    for (const v of values) {
      freq.set(v, (freq.get(v) || 0) + 1);
    }
    const maxVal = Math.max(...values);
    const minVal = Math.min(...values);

    return diceList.map(d => {
      const v = Number(d.value || 10);
      let color = "yellow";
      if ((freq.get(v) || 0) >= 2) {
        color = "yellow";
      } else if (v === maxVal && maxVal !== minVal) {
        color = "green";
      } else if (v === minVal && maxVal !== minVal) {
        color = "red";
      } else {
        color = "yellow";
      }
      return {
        id: d.id || foundry.utils.randomID(),
        value: v,
        color
      };
    });
  }

  static getPortentDice(actor = null) {
    actor = actor || this.getFlinnActor();
    if (!actor) return [];
    const raw = actor.flags?.[MODULE_ID]?.portentDice;
    if (!Array.isArray(raw)) return [];
    return raw.filter(d => d && Number.isFinite(Number(d.value)));
  }

  /**
   * Roll Flinn's Portent dice automatically as a Blind GM Roll (only GM sees the rolled values;
   * Flinn only sees the colors in "Flinn's Portent Rolls").
   */
  static async rollFlinnPortentsBlind(actor = null) {
    actor = actor || this.getFlinnActor();
    if (!actor) return [];

    const maxPortents = this.getMaxPortents(actor);
    const roll = await new Roll(`${maxPortents}d20`).evaluate();

    const rawDiceResults =
      roll.dice?.[0]?.results?.map(r => Number(r.result || 10)) ||
      Array.from({ length: maxPortents }, () => 10);

    const coloredDice = this.computePortentColors(
      rawDiceResults.map(v => ({ id: foundry.utils.randomID(), value: v }))
    );

    const portentItem = actor.items.find(
      i => i.type === "feat" && i.name?.trim().toLowerCase().includes("portent")
    );
    if (portentItem) {
      await portentItem.update({
        "system.uses.max": String(maxPortents),
        "system.uses.spent": 0
      });
    }

    await actor.update({
      [`flags.${MODULE_ID}.portentDice`]: coloredDice
    });

    // Send GM-only Portent Rolls message so ONLY the Gamemaster can EVER see the numeric results in chat.
    // When triggered by a non-GM player (e.g. Flinn completing a Long Rest), relay via socket to the active GM
    // so the ChatMessage is authored BY the GM and whispered strictly TO GMs (never visible to Flinn or other players!).
    if (game.user?.isGM) {
      await this.createPortentGmOnlyChatMessage({
        actor,
        actorName: actor.name,
        maxPortents,
        coloredDice
      });
    } else if (game.socket && game.users?.activeGM) {
      game.socket.emit(`module.${MODULE_ID}`, {
        type: "coriaCreatePortentGmMessage",
        params: {
          actorId: actor.id,
          actorName: actor.name,
          maxPortents,
          coloredDice
        }
      });
    }

    this.refreshPortentFloatingButton();
    if (actor.sheet?.rendered) actor.sheet.render(false);
    return coloredDice;
  }

  /**
   * Create the strictly GM-only whisper ChatMessage for Flinn's Portent Rolls.
   * Must run on a GM client so `author` is GM and `whisper` contains ONLY GM user IDs.
   */
  static async createPortentGmOnlyChatMessage({ actor = null, actorId = "", actorName = "Flinn", maxPortents = 2, coloredDice = [] } = {}) {
    if (!game.user?.isGM) return null;
    const resolvedActor = actor || (actorId ? game.actors?.get(actorId) : null) || this.getFlinnActor();
    const displayName = resolvedActor?.name || actorName || "Flinn";
    const gmIds = game.users?.filter(u => u.isGM)?.map(u => u.id) || [];
    if (gmIds.length === 0 && game.user?.id) gmIds.push(game.user.id);

    const colorNameMap = {
      green: "Verde (Maior valor)",
      red: "Vermelho (Menor valor)",
      yellow: "Amarelo (Intermediário / Igual)"
    };
    const gmBreakdownHtml = (Array.isArray(coloredDice) ? coloredDice : [])
      .map(
        (d, idx) =>
          `<div style="display:flex; align-items:center; justify-content:space-between; padding:4px 8px; margin:3px 0; border-radius:5px; background:rgba(0,0,0,0.45); border-left:4px solid ${
            d.color === "green" ? "#22c55e" : d.color === "red" ? "#ef4444" : "#eab308"
          };">
            <span>Dado #${idx + 1} (${colorNameMap[d.color] || "Amarelo"}):</span>
            <strong style="font-size:1.05rem; color:#fff;">d20 = ${d.value}</strong>
          </div>`
      )
      .join("");

    return ChatMessage.create({
      speaker: resolvedActor ? ChatMessage.getSpeaker({ actor: resolvedActor }) : ChatMessage.getSpeaker({ alias: displayName }),
      whisper: gmIds,
      blind: false,
      content: `
        <div class="coria-chat-card chat-arcane">
          <div class="coria-chat-header"><i class="fas fa-eye"></i> Portent Rolls — ${foundry.utils.escapeHTML(displayName)} (Somente Mestre)</div>
          <div class="coria-chat-body" style="text-align:left;">
            <p style="text-align:center; margin-bottom:8px;">
              <strong>${foundry.utils.escapeHTML(displayName)}</strong> rolou seus <strong>${maxPortents} dados de Portent</strong> após o Descanso Longo (visíveis apenas para o Mestre):
            </p>
            ${gmBreakdownHtml}
          </div>
        </div>
      `,
      flags: {
        [MODULE_ID]: {
          isPortentBlindRoll: true,
          gmOnlySecret: true,
          chatChannel: "combat"
        }
      }
    });
  }

  /**
   * Consume a specific Portent die by its `id` and update Flinn's actor flags & Portent feature uses.
   */
  static async consumePortentDie(actor, dieId) {
    actor = actor || this.getFlinnActor();
    if (!actor) return null;

    const currentDice = foundry.utils.deepClone(this.getPortentDice(actor));
    const idx = currentDice.findIndex(d => d.id === dieId);
    if (idx === -1) return null;

    const [consumed] = currentDice.splice(idx, 1);
    const maxPortents = this.getMaxPortents(actor);
    const newSpent = Math.clamp(maxPortents - currentDice.length, 0, maxPortents);

    const portentItem = actor.items.find(
      i => i.type === "feat" && i.name?.trim().toLowerCase().includes("portent")
    );
    if (portentItem) {
      await portentItem.update({
        "system.uses.max": String(maxPortents),
        "system.uses.spent": newSpent
      });
    }

    await actor.update({
      [`flags.${MODULE_ID}.portentDice`]: currentDice
    });

    this.refreshPortentFloatingButton();
    if (actor.sheet?.rendered) actor.sheet.render(false);
    return consumed;
  }

  /**
   * Inject or update the floating scene button "Flinn's Portent Rolls" (#flinn-portent-floating-btn).
   * Visible ONLY to the GM and the player who controls Flinn.
   */
  static refreshPortentFloatingButton() {
    const existingBtn = document.getElementById("flinn-portent-floating-btn");
    const flinn = this.getFlinnActor();

    if (!this.isUserFlinnController(flinn)) {
      if (existingBtn) existingBtn.remove();
      return;
    }

    const diceCount = flinn ? this.getPortentDice(flinn).length : 0;
    let btn = existingBtn;
    if (!btn) {
      btn = document.createElement("button");
      btn.type = "button";
      btn.id = "flinn-portent-floating-btn";
      btn.title = "Flinn's Portent Rolls";
      btn.addEventListener("click", (ev) => {
        ev.preventDefault();
        const liveFlinn = this.getFlinnActor();
        if (!liveFlinn) {
          ui.notifications.warn("Ficha de Flinn não encontrada no mundo.");
          return;
        }
        this.openPortentRollsDialog(liveFlinn, { mode: "view" });
      });
      document.body.appendChild(btn);
      globalThis.CoriaMakeFloatingButtonDraggable?.(btn, "flinn-portent");
    }

    btn.innerHTML = `
      <span class="flinn-portent-btn-icon"><i class="fas fa-dice-d20"></i></span>
      <span class="flinn-portent-btn-label">Flinn's Portent Rolls</span>
      <span class="flinn-portent-btn-count">${diceCount}</span>
    `;
  }

  /**
   * Open the "Flinn's Portent Rolls" dialog window:
   * - Left side: Color Legend (Green = Maior valor, Red = Menor valor, Yellow = Valor intermediário/igual)
   * - Center: Glowing d20 icons (numbers visible ONLY to GM; Flinn sees ONLY colors)
   * - Modes:
   *   - "view": Inspect available Portent dice (GM also has a button to re-roll blind Portents)
   *   - "sacrifice": Top prompt asking Flinn to click a die to sacrifice it for "Reescrever o Destino"
   *   - "use-on-roll": Top prompt asking Flinn to click a die to replace a d20 roll in chat
   */
  static async openPortentRollsDialog(
    actor = null,
    { mode = "view", promptText = "", onSelectDie = null, onCancel = null } = {}
  ) {
    actor = actor || this.getFlinnActor();
    if (!actor) return;

    if (!this.isUserFlinnController(actor)) {
      ui.notifications.warn("Apenas o Mestre e o jogador de Flinn podem visualizar os Portents de Flinn.");
      return;
    }

    const isGM = Boolean(game.user?.isGM);
    const isInteractive = mode === "sacrifice" || mode === "use-on-roll";
    const dice = this.getPortentDice(actor);

    const buildContentHtml = (currentDice) => {
      const promptBannerHtml = promptText
        ? `<div class="flinn-portent-prompt-banner">
             <i class="fas fa-hand-pointer"></i>
             <span>${promptText}</span>
           </div>`
        : "";

      const diceElementsHtml =
        currentDice.length === 0
          ? `<div class="flinn-portent-empty">
               <i class="fas fa-dice-d20"></i>
               <p>Nenhum dado de Portent disponível no momento.</p>
               <span>Os dados de Portent serão rolados automaticamente no próximo Descanso Longo.</span>
             </div>`
          : currentDice
              .map((d, idx) => {
                const colorClass =
                  d.color === "green"
                    ? "is-green"
                    : d.color === "red"
                      ? "is-red"
                      : "is-yellow";
                const colorTitle =
                  d.color === "green"
                    ? "Brilho Verde — Maior valor"
                    : d.color === "red"
                      ? "Brilho Vermelho — Menor valor"
                      : "Brilho Amarelo — Valor intermediário / igual";
                const gmNumberHtml = isGM
                  ? `<span class="flinn-portent-die-number" title="Valor rolado (Visível apenas para o Mestre)">${d.value}</span>`
                  : "";
                return `
                  <div class="flinn-portent-die-card ${colorClass} ${isInteractive ? "is-selectable" : ""}"
                       data-die-id="${d.id}"
                       title="${colorTitle}${isGM ? ` (Valor: ${d.value})` : ""}${isInteractive ? " — Clique para escolher este dado" : ""}">
                    <div class="flinn-portent-die-emblem">
                      <i class="fas fa-dice-d20"></i>
                      ${gmNumberHtml}
                    </div>
                    <span class="flinn-portent-die-caption">Portent #${idx + 1}</span>
                  </div>
                `;
              })
              .join("");

      return `
        <div class="flinn-portent-modal-root">
          ${promptBannerHtml}
          <div class="flinn-portent-main-layout">
            <aside class="flinn-portent-legend">
              <h4><i class="fas fa-palette"></i> Legenda de Cores</h4>
              <div class="flinn-portent-legend-item">
                <span class="flinn-portent-color-box is-green"></span>
                <div class="flinn-portent-legend-text">
                  <strong>Verde</strong>
                  <span>Maior valor</span>
                </div>
              </div>
              <div class="flinn-portent-legend-item">
                <span class="flinn-portent-color-box is-red"></span>
                <div class="flinn-portent-legend-text">
                  <strong>Vermelho</strong>
                  <span>Menor valor</span>
                </div>
              </div>
              <div class="flinn-portent-legend-item">
                <span class="flinn-portent-color-box is-yellow"></span>
                <div class="flinn-portent-legend-text">
                  <strong>Amarelo</strong>
                  <span>Valor intermediário / igual</span>
                </div>
              </div>
              <div class="flinn-portent-legend-note">
                ${
                  isGM
                    ? `<i class="fas fa-user-shield"></i> <strong>Visão do Mestre:</strong> Os números rolados estão visíveis sobre cada d20.`
                    : `<i class="fas fa-eye-slash"></i> <strong>Visão de Flinn:</strong> Os valores numéricos permanecem ocultos; guie-se pelo brilho de cada d20.`
                }
              </div>
            </aside>

            <section class="flinn-portent-center-stage">
              <div class="flinn-portent-dice-row">
                ${diceElementsHtml}
              </div>
            </section>
          </div>
        </div>
      `;
    };

    let dieChosen = false;
    const buttons = {};
    if (isGM && mode === "view") {
      buttons.reroll = {
        icon: '<i class="fas fa-sync-alt"></i>',
        label: "Rolar Novos Portents (Blind GM)",
        callback: async () => {
          dieChosen = true;
          await this.rollFlinnPortentsBlind(actor);
          await this.openPortentRollsDialog(actor, { mode: "view" });
        }
      };
    }
    buttons.close = {
      icon: '<i class="fas fa-times"></i>',
      label: isInteractive ? "Cancelar" : "Fechar",
      callback: async () => {
        if (!dieChosen && typeof onCancel === "function") {
          dieChosen = true;
          await onCancel();
        }
      }
    };

    const d = createV2Dialog(
      {
        title: "Flinn's Portent Rolls",
        content: buildContentHtml(dice),
        buttons,
        default: "close",
        render: (html) => {
          const root = html instanceof HTMLElement ? html : html?.[0];
          if (!root) return;
          root.querySelector('button[data-button="reroll"]')?.classList.add("btn-arcane");

          for (const dieCard of root.querySelectorAll(".flinn-portent-die-card")) {
            dieCard.addEventListener("click", async (ev) => {
              ev.preventDefault();
              ev.stopPropagation();
              if (!isInteractive) return;
              const dieId = dieCard.getAttribute("data-die-id");
              if (!dieId || dieChosen) return;

              dieChosen = true;
              const consumed = await this.consumePortentDie(actor, dieId);
              try {
                d.close();
              } catch (_) {
                // ignore
              }
              if (consumed && typeof onSelectDie === "function") {
                await onSelectDie(consumed);
              }
            });
          }
        },
        close: () => {
          if (this._activePortentDialog === d) {
            this._activePortentDialog = null;
          }
          if (!dieChosen && typeof onCancel === "function") {
            dieChosen = true;
            onCancel();
          }
        }
      },
      { classes: ["coria-dialog", "flinn-portent-dialog"], width: 640 }
    );

    this._activePortentDialog = d;
    d.render(true);
  }

  /* -------------------------------------------- */
  /*  Flinn's Hidden Spells Browser Window        */
  /* -------------------------------------------- */

  static SCHOOL_LABELS_PT = {
    abj: "Abjuração",
    con: "Conjuração",
    div: "Adivinhação",
    enc: "Encantamento",
    evo: "Evocação",
    ill: "Ilusão",
    nec: "Necromancia",
    trs: "Transmutação"
  };

  /**
   * Open the interactive split-pane window displaying Flinn's unprepared/hidden Cleric & Wizard spells:
   * - Two tabs at the top: "Magias de Clérigo" and "Magias de Mago"
   * - Filter bar: Spell Level dropdown, Magic School dropdown, and Name search input
   * - Left pane: List of spells (icon, name, Concentration/Ritual badges, Level • School pill)
   * - Right pane: Rich header (icon, name, school, casting time, range, target, duration, components,
   *   "Preparar Magia" button, and "Conjurar com Intuitive Arcanum" button for Wizard spells) +
   *   Enriched Rich Text description below.
   */
  static async openHiddenSpellsBrowser(actor = null) {
    actor = actor || this.getFlinnActor();
    if (!actor) return;

    let activeTab = "cleric"; // "cleric" | "wizard"
    let selectedLevel = "all";
    let selectedSchool = "all";
    let searchQuery = "";
    let selectedSpellId = null;

    const getSpellOrigin = (sp) =>
      sp.flags?.[MODULE_ID]?.flinnSpellOrigin ||
      (sp.system?.sourceItem === "class:cleric" ? "cleric" : "wizard");

    const isSpellUnprepared = (sp) => {
      if (sp.type !== "spell") return false;
      const lvl = Number(sp.system?.level ?? 0);
      if (lvl <= 0) return false;
      const prepMode = sp.system?.method || sp.system?.preparation?.mode || "prepared";
      const prepVal = Number(sp.system?.prepared ?? sp.system?.preparation?.prepared ?? 0);
      const isAlways =
        prepVal === 2 ||
        prepMode === "always" ||
        prepMode === "atwill" ||
        prepMode === "innate" ||
        Boolean(sp.flags?.[MODULE_ID]?.isDomainSpell);
      return !isAlways && prepVal < 1;
    };

    const getPrepStats = () => {
      const { wizardLevel, clericLevel } = this.getLevels(actor);
      const intMod = Number(actor.system?.abilities?.int?.mod ?? 0);
      const wizMax = Math.max(1, wizardLevel + intMod);
      const clrMax = Math.max(1, clericLevel + intMod);
      let wizPrep = 0;
      let clrPrep = 0;
      let wizHidden = 0;
      let clrHidden = 0;

      for (const sp of actor.items) {
        if (sp.type !== "spell") continue;
        const lvl = Number(sp.system?.level ?? 0);
        if (lvl <= 0) continue;
        const prepMode = sp.system?.method || sp.system?.preparation?.mode || "prepared";
        const prepVal = Number(sp.system?.prepared ?? sp.system?.preparation?.prepared ?? 0);
        const isAlways =
          prepVal === 2 ||
          prepMode === "always" ||
          prepMode === "atwill" ||
          prepMode === "innate" ||
          Boolean(sp.flags?.[MODULE_ID]?.isDomainSpell);
        if (isAlways) continue;
        const origin = getSpellOrigin(sp);
        if (prepVal >= 1) {
          if (origin === "cleric") clrPrep += 1;
          else wizPrep += 1;
        } else {
          if (origin === "cleric") clrHidden += 1;
          else wizHidden += 1;
        }
      }
      return { wizPrep, wizMax, clrPrep, clrMax, wizHidden, clrHidden };
    };

    const formatSpellMeta = (sp) => {
      const sys = sp.system || {};
      const lvl = Number(sys.level ?? 1);
      const schoolKey = String(sys.school || "abj").toLowerCase();
      const schoolLabel = this.SCHOOL_LABELS_PT[schoolKey] || schoolKey.toUpperCase();
      const props = sys.properties;
      const hasProp = (p) =>
        typeof props?.has === "function" ? props.has(p) : Array.isArray(props) && props.includes(p);

      const isConc = hasProp("concentration") || Boolean(sys.duration?.concentration);
      const isRit = hasProp("ritual");
      const compParts = [];
      if (hasProp("vocal")) compParts.push("V");
      if (hasProp("somatic")) compParts.push("S");
      if (hasProp("material")) {
        const matTxt = sys.materials?.value ? ` (${sys.materials.value})` : "";
        compParts.push(`M${matTxt}`);
      }
      const compStr = compParts.length > 0 ? compParts.join(", ") : "Nenhum";

      const actType = String(sys.activation?.type || "action").toLowerCase();
      const actVal = sys.activation?.value ?? 1;
      const actMap = {
        action: `${actVal} Ação`,
        bonus: `${actVal} Ação Bônus`,
        reaction: `${actVal} Reação`,
        minute: `${actVal} Minuto(s)`,
        hour: `${actVal} Hora(s)`,
        special: "Especial"
      };
      const castTimeStr = actMap[actType] || `${actVal || 1} ${actType}`;

      const rngUnits = String(sys.range?.units || "").toLowerCase();
      const rngVal = sys.range?.value;
      const rangeStr =
        rngUnits === "self"
          ? "Pessoal"
          : rngUnits === "touch"
            ? "Toque"
            : rngVal
              ? `${rngVal} ${rngUnits || "ft"}`
              : rngUnits || "Pessoal";

      const tgtAffects = sys.target?.affects || {};
      const tgtTemplate = sys.target?.template || {};
      let targetStr = "Pessoal";
      if (tgtTemplate?.size && tgtTemplate?.type) {
        targetStr = `${tgtTemplate.type} (${tgtTemplate.size} ${tgtTemplate.units || "ft"})`;
      } else if (tgtAffects?.type) {
        targetStr = `${tgtAffects.count || 1} ${tgtAffects.type}`;
      } else if (rngUnits !== "self") {
        targetStr = "1 criatura / alvo";
      }

      const durUnits = String(sys.duration?.units || "inst").toLowerCase();
      const durVal = sys.duration?.value;
      const durMap = {
        inst: "Instantânea",
        round: `${durVal || 1} Rodada(s)`,
        turn: `${durVal || 1} Turno(s)`,
        minute: `${durVal || 1} Minuto(s)`,
        hour: `${durVal || 1} Hora(s)`,
        day: `${durVal || 1} Dia(s)`,
        perm: "Permanente",
        spec: "Especial"
      };
      const baseDur = durMap[durUnits] || `${durVal || ""} ${durUnits}`.trim();
      const durationStr = isConc ? `Concentração, até ${baseDur}` : baseDur;

      const sourceBook = sys.source?.book || sys.source?.custom || "PHB";
      return {
        lvl,
        schoolKey,
        schoolLabel,
        isConc,
        isRit,
        compStr,
        castTimeStr,
        rangeStr,
        targetStr,
        durationStr,
        sourceBook
      };
    };

    const d = createV2Dialog(
      {
        title: `Magias Escondidas (Não Preparadas) — ${actor.name}`,
        content: `
          <div class="flinn-hs-browser-root">
            <div class="flinn-hs-tabs-bar">
              <button type="button" class="flinn-hs-tab-btn is-cleric active" data-hs-tab="cleric">
                <i class="fas fa-pray"></i>
                <span class="flinn-hs-tab-title">Magias de Clérigo</span>
                <span class="flinn-hs-tab-badge" data-hs-count="cleric">0</span>
              </button>
              <button type="button" class="flinn-hs-tab-btn is-wizard" data-hs-tab="wizard">
                <i class="fas fa-hat-wizard"></i>
                <span class="flinn-hs-tab-title">Magias de Mago</span>
                <span class="flinn-hs-tab-badge" data-hs-count="wizard">0</span>
              </button>
            </div>

            <div class="flinn-hs-filters-bar">
              <select class="flinn-hs-level-select" title="Filtrar por Nível da Magia">
                <option value="all">Todos os Níveis</option>
                <option value="1">1º Nível</option>
                <option value="2">2º Nível</option>
                <option value="3">3º Nível</option>
                <option value="4">4º Nível</option>
                <option value="5">5º Nível</option>
                <option value="6">6º Nível</option>
                <option value="7">7º Nível</option>
                <option value="8">8º Nível</option>
                <option value="9">9º Nível</option>
              </select>

              <select class="flinn-hs-school-select" title="Filtrar por Escola de Magia">
                <option value="all">Todas as Escolas</option>
                <option value="abj">Abjuração</option>
                <option value="div">Adivinhação</option>
                <option value="con">Conjuração</option>
                <option value="enc">Encantamento</option>
                <option value="evo">Evocação</option>
                <option value="ill">Ilusão</option>
                <option value="nec">Necromancia</option>
                <option value="trs">Transmutação</option>
              </select>

              <div class="flinn-hs-search-wrap">
                <i class="fas fa-search"></i>
                <input type="text" class="flinn-hs-name-input" placeholder="Filtrar magia pelo nome..." />
              </div>
            </div>

            <div class="flinn-hs-split-pane">
              <div class="flinn-hs-left-list"></div>
              <div class="flinn-hs-right-detail"></div>
            </div>
          </div>
        `,
        buttons: {
          close: {
            icon: '<i class="fas fa-check"></i>',
            label: "Fechar"
          }
        },
        default: "close",
        render: (html) => {
          const root = html instanceof HTMLElement ? html : html?.[0];
          if (!root) return;
          globalThis.CoriaHeaderColorManager?.applyClassCssVarsToElement?.(actor, root);
          const dlgEl = d?.element instanceof HTMLElement ? d.element : d?.element?.[0];
          if (dlgEl && dlgEl !== root) {
            globalThis.CoriaHeaderColorManager?.applyClassCssVarsToElement?.(actor, dlgEl);
          }
          globalThis.CoriaWindowThemeManager?.bindTitleBarRightClick?.(
            actor,
            dlgEl || root,
            "hidden-spells",
            "Magias Escondidas (Não Preparadas)"
          );

          const tabBtns = root.querySelectorAll(".flinn-hs-tab-btn");
          const lvlSelect = root.querySelector(".flinn-hs-level-select");
          const schoolSelect = root.querySelector(".flinn-hs-school-select");
          const nameInput = root.querySelector(".flinn-hs-name-input");
          const leftList = root.querySelector(".flinn-hs-left-list");
          const rightDetail = root.querySelector(".flinn-hs-right-detail");

          const renderRightPane = async (spell) => {
            if (!rightDetail) return;
            if (!spell) {
              rightDetail.innerHTML = `
                <div class="flinn-hs-empty-detail">
                  <i class="fas fa-book-open"></i>
                  <p>Selecione uma magia na lista à esquerda para visualizar seus detalhes e opções de preparo ou conjuração.</p>
                </div>
              `;
              return;
            }

            const meta = formatSpellMeta(spell);
            const origin = getSpellOrigin(spell);
            const stats = getPrepStats();
            const currentDC = this.getIntuitiveArcanumDC(actor);

            let enrichedDesc = spell.system?.description?.value || "<p>Sem descrição disponível.</p>";
            try {
              if (foundry?.applications?.ux?.TextEditor?.implementation?.enrichHTML) {
                enrichedDesc = await foundry.applications.ux.TextEditor.implementation.enrichHTML(enrichedDesc, {
                  async: true,
                  relativeTo: spell,
                  rollData: spell.getRollData?.() || actor.getRollData?.() || {}
                });
              } else if (globalThis.TextEditor?.enrichHTML) {
                enrichedDesc = await globalThis.TextEditor.enrichHTML(enrichedDesc, {
                  async: true,
                  relativeTo: spell,
                  rollData: spell.getRollData?.() || actor.getRollData?.() || {}
                });
              }
            } catch (_) {
              // fallback to raw HTML
            }

            const isCleric = origin === "cleric";
            const prepCounterText = isCleric
              ? `Preparadas de Clérigo: ${stats.clrPrep} / ${stats.clrMax}`
              : `Preparadas de Mago: ${stats.wizPrep} / ${stats.wizMax}`;

            rightDetail.innerHTML = `
              <div class="flinn-hs-detail-card ${isCleric ? "is-cleric" : "is-wizard"}">
                <div class="flinn-hs-detail-top">
                  <div class="flinn-hs-detail-header-row">
                    <img class="flinn-hs-detail-icon" src="${spell.img}" alt="${spell.name}" />
                    <div class="flinn-hs-detail-title-block">
                      <div class="flinn-hs-detail-name-line">
                        <h3>${spell.name}</h3>
                        <span class="flinn-hs-detail-subtitle">${meta.lvl}º Nível — ${meta.schoolLabel}</span>
                      </div>
                      <div class="flinn-hs-detail-source">
                        Fonte: ${meta.sourceBook} • <strong>${prepCounterText}</strong>
                      </div>
                    </div>
                  </div>
                </div>

                <div class="flinn-hs-detail-meta-box">
                  <div class="flinn-hs-meta-row">
                    <span><i class="fas fa-clock"></i> <strong>Conjuração:</strong> ${meta.castTimeStr}</span>
                    <span><i class="fas fa-ruler-combined"></i> <strong>Alcance:</strong> ${meta.rangeStr}</span>
                    <span><i class="fas fa-hourglass-half"></i> <strong>Duração:</strong> ${meta.durationStr}</span>
                  </div>
                  <div class="flinn-hs-meta-row">
                    <span><i class="fas fa-bullseye"></i> <strong>Alvo:</strong> ${meta.targetStr}</span>
                    <span><i class="fas fa-mortar-pestle"></i> <strong>Comp:</strong> ${meta.compStr}</span>
                    <span><i class="fas fa-brain"></i> <strong>Concentração:</strong> ${meta.isConc ? "Sim" : "Não"}</span>
                    <span><i class="fas fa-book"></i> <strong>Ritual:</strong> ${meta.isRit ? "Sim" : "Não"}</span>
                  </div>
                </div>

                <div class="flinn-hs-detail-body rd__b">
                  ${enrichedDesc}
                </div>

                <div class="flinn-hs-detail-actions">
                  <button type="button" class="flinn-hs-action-prepare ${isCleric ? "is-cleric" : "is-wizard"}">
                    <i class="fas fa-book-medical"></i> Preparar Magia (${isCleric ? "Cleric" : "Wizard"})
                  </button>
                  ${
                    !isCleric
                      ? `<button type="button" class="flinn-hs-action-intuitive">
                           <i class="fas fa-dice-d20"></i> Conjurar via Intuitive Arcanum (CD ${currentDC})
                         </button>`
                      : ""
                  }
                </div>
              </div>
            `;

            const prepBtn = rightDetail.querySelector(".flinn-hs-action-prepare");
            prepBtn?.addEventListener("click", async (ev) => {
              ev.preventDefault();
              await spell.update({ "system.prepared": 1 });
              ui.notifications.info(`[${actor.name}] "${spell.name}" foi preparada e adicionada às magias ativas!`);
              renderBrowser();
            });

            const intuitiveBtn = rightDetail.querySelector(".flinn-hs-action-intuitive");
            intuitiveBtn?.addEventListener("click", async (ev) => {
              ev.preventDefault();
              await this.openIntuitiveArcanumDialog(actor, { spellItem: spell });
            });
          };

          const renderBrowser = () => {
            const stats = getPrepStats();
            const clrBadge = root.querySelector('[data-hs-count="cleric"]');
            const wizBadge = root.querySelector('[data-hs-count="wizard"]');
            if (clrBadge) clrBadge.textContent = `${stats.clrHidden} (Prep: ${stats.clrPrep}/${stats.clrMax})`;
            if (wizBadge) wizBadge.textContent = `${stats.wizHidden} (Prep: ${stats.wizPrep}/${stats.wizMax})`;

            for (const tb of tabBtns) {
              tb.classList.toggle("active", tb.getAttribute("data-hs-tab") === activeTab);
            }

            const matchingSpells = actor.items
              .filter(sp => {
                if (!isSpellUnprepared(sp)) return false;
                if (getSpellOrigin(sp) !== activeTab) return false;
                const lvl = Number(sp.system?.level ?? 0);
                if (selectedLevel !== "all" && lvl !== Number(selectedLevel)) return false;
                const sch = String(sp.system?.school || "").toLowerCase();
                if (selectedSchool !== "all" && sch !== selectedSchool) return false;
                if (searchQuery && !sp.name.toLowerCase().includes(searchQuery)) return false;
                return true;
              })
              .sort((a, b) => Number(a.system?.level || 0) - Number(b.system?.level || 0) || a.name.localeCompare(b.name));

            if (!matchingSpells.some(s => s.id === selectedSpellId)) {
              selectedSpellId = matchingSpells[0]?.id || null;
            }

            if (leftList) {
              const currentDC = this.getIntuitiveArcanumDC(actor);
              if (matchingSpells.length === 0) {
                leftList.innerHTML = `
                  <div class="flinn-hs-empty-list">
                    <i class="fas fa-sparkles"></i>
                    <p>Nenhuma magia não preparada encontrada para este filtro.</p>
                  </div>
                `;
              } else {
                leftList.innerHTML = matchingSpells
                  .map(sp => {
                    const meta = formatSpellMeta(sp);
                    const isSel = sp.id === selectedSpellId;
                    const isClericRow = activeTab === "cleric";
                    return `
                      <div class="flinn-hs-spell-row ${isClericRow ? "is-cleric" : "is-wizard"} ${isSel ? "is-selected" : ""}"
                           data-spell-id="${sp.id}">
                        <img class="flinn-hs-row-icon" src="${sp.img}" alt="${sp.name}" />
                        <div class="flinn-hs-row-main">
                          <span class="flinn-hs-row-name">${sp.name}</span>
                          ${meta.isConc ? `<span class="flinn-hs-mini-tag conc" title="Concentração"><i class="fas fa-brain"></i> Conc.</span>` : ""}
                          ${meta.isRit ? `<span class="flinn-hs-mini-tag rit" title="Ritual"><i class="fas fa-book"></i> Rit.</span>` : ""}
                        </div>
                        <div class="flinn-hs-row-right">
                          <span class="flinn-hs-row-school-pill">${meta.lvl}º • ${meta.schoolLabel}</span>
                          <button type="button"
                                  class="flinn-hs-mini-btn is-prepare ${isClericRow ? "is-cleric" : "is-wizard"}"
                                  data-mini-action="prepare"
                                  data-spell-id="${sp.id}"
                                  title="Preparar Magia (${sp.name})">
                            <i class="fas fa-book-medical"></i>
                          </button>
                          ${
                            !isClericRow
                              ? `<button type="button"
                                         class="flinn-hs-mini-btn is-intuitive"
                                         data-mini-action="intuitive"
                                         data-spell-id="${sp.id}"
                                         title="Conjurar ${sp.name} via Intuitive Arcanum (CD ${currentDC})">
                                   <i class="fas fa-dice-d20"></i> CD: ${currentDC}
                                 </button>`
                              : ""
                          }
                        </div>
                      </div>
                    `;
                  })
                  .join("");

                for (const row of leftList.querySelectorAll(".flinn-hs-spell-row")) {
                  row.addEventListener("click", (ev) => {
                    ev.preventDefault();
                    selectedSpellId = row.getAttribute("data-spell-id");
                    for (const r of leftList.querySelectorAll(".flinn-hs-spell-row")) {
                      r.classList.toggle("is-selected", r === row);
                    }
                    const selSpell = actor.items.get(selectedSpellId);
                    renderRightPane(selSpell);
                  });
                }

                for (const miniBtn of leftList.querySelectorAll(".flinn-hs-mini-btn")) {
                  miniBtn.addEventListener("click", async (ev) => {
                    ev.preventDefault();
                    ev.stopPropagation();
                    const spId = miniBtn.getAttribute("data-spell-id");
                    const action = miniBtn.getAttribute("data-mini-action");
                    const targetSpell = spId ? actor.items.get(spId) : null;
                    if (!targetSpell) return;

                    if (action === "prepare") {
                      await targetSpell.update({ "system.prepared": 1 });
                      ui.notifications.info(
                        `[${actor.name}] "${targetSpell.name}" foi preparada e adicionada às magias ativas!`
                      );
                      renderBrowser();
                    } else if (action === "intuitive") {
                      await this.openIntuitiveArcanumDialog(actor, { spellItem: targetSpell });
                      renderBrowser();
                    }
                  });
                }
              }
            }

            const currentSelectedSpell = selectedSpellId ? actor.items.get(selectedSpellId) : null;
            renderRightPane(currentSelectedSpell);
          };

          for (const tb of tabBtns) {
            tb.addEventListener("click", (ev) => {
              ev.preventDefault();
              activeTab = tb.getAttribute("data-hs-tab") || "cleric";
              selectedSpellId = null;
              renderBrowser();
            });
          }

          lvlSelect?.addEventListener("change", () => {
            selectedLevel = lvlSelect.value || "all";
            renderBrowser();
          });

          schoolSelect?.addEventListener("change", () => {
            selectedSchool = schoolSelect.value || "all";
            renderBrowser();
          });

          nameInput?.addEventListener("input", () => {
            searchQuery = (nameInput.value || "").trim().toLowerCase();
            renderBrowser();
          });

          renderBrowser();
        },
        close: () => {
          if (this._activeHiddenSpellsDialog === d) {
            this._activeHiddenSpellsDialog = null;
          }
        }
      },
      { classes: ["coria-dialog", "flinn-hs-dialog"], width: 920, height: 640, resizable: true }
    );
    this._activeHiddenSpellsDialog = d;
    d.render(true);
  }

  /* -------------------------------------------- */
  /*  Helper: Reaction Spell & Luck Eligibility   */
  /* -------------------------------------------- */

  static getFlinnLuckyFeatItem(flinn = null) {
    flinn = flinn || this.getFlinnActor();
    if (!flinn) return null;
    return (
      flinn.items.find(
        i =>
          i.type === "feat" &&
          (i.flags?.[MODULE_ID]?.isFlinnLuckyFeat ||
            i.flags?.[MODULE_ID]?.featureKey === "feat:lucky:phb" ||
            (i.name?.trim().toLowerCase() === "lucky" && i.system?.type?.value !== "race"))
      ) || null
    );
  }

  static getAvailableLuckPoints(flinn = null) {
    const feat = this.getFlinnLuckyFeatItem(flinn);
    if (!feat) return 0;
    const max = Math.max(3, Number(feat.system?.uses?.max || 3));
    const spent = Number(feat.system?.uses?.spent || 0);
    return Math.max(0, max - spent);
  }

  /**
   * Check whether `actor` (typically an NPC / Monster) has `Legendary Resistance` uses remaining.
   * Supports both feature items (`"Legendary Resistance"` / `"Resistência Lendária"`) and `actor.system.resources.legres`.
   */
  static getLegendaryResistanceInfo(actor) {
    if (!actor) return null;
    const legItem =
      actor.items?.find(i => {
        if (i.type !== "feat") return false;
        const n = String(i.name || "").trim().toLowerCase();
        return n.includes("legendary resistance") || n.includes("resistência lendária");
      }) || null;

    const legRes = actor.system?.resources?.legres;
    const resMax = Number(legRes?.max || 0);
    const resVal = Number(legRes?.value ?? 0);

    let itemMax = Number(legItem?.system?.uses?.max || 0);
    const itemSpent = Number(legItem?.system?.uses?.spent || 0);
    if (!itemMax && legItem) {
      const m = String(legItem.name || "").match(/\((\d+)\s*\/\s*day\)/i);
      if (m) itemMax = Number(m[1]);
    }
    const itemVal = itemMax > 0 ? Math.max(0, itemMax - itemSpent) : 0;

    if (!legItem && resMax <= 0) return null;

    const usesMax = Math.max(resMax, itemMax, 3);
    const usesLeft =
      resMax > 0 && itemMax > 0
        ? Math.min(resVal, itemVal)
        : resMax > 0
          ? resVal
          : itemMax > 0
            ? itemVal
            : 0;

    if (usesLeft <= 0) return null;
    return {
      item: legItem,
      usesLeft,
      usesMax,
      hasLegResResource: resMax > 0,
      hasItemUses: itemMax > 0
    };
  }

  static _usingLegendaryResistanceReactionBtn = false;

  /**
   * Check whether an actor has a given spell (`"shield"` or `"silvery barbs"`) prepared
   * AND ready to be cast (either free/innate uses remaining OR available spell slots / Pact Magic slots).
   */
  static getReadyReactionSpellInfo(actor, spellNameLower) {
    if (!actor || !actor.items) return null;
    // Aitusa can NEVER cast spells as a Reaction (Draconic Focus only channels Action/Bonus Action spells as her Action)
    if (globalThis.AltarionAutomationManager?.isAitusa?.(actor)) return null;
    const cleanTarget = String(spellNameLower || "").trim().toLowerCase().replace(/’/g, "'");
    const spellItem = actor.items.find(
      i => i.type === "spell" && i.name?.trim().toLowerCase().replace(/’/g, "'") === cleanTarget
    );
    if (!spellItem) return null;

    const prepMode = String(spellItem.system?.method || spellItem.system?.preparation?.mode || "spell").toLowerCase();
    const prepVal = Number(spellItem.system?.prepared ?? spellItem.system?.preparation?.prepared ?? 0);

    // Check if the actor has any prepared-caster classes (Wizard, Cleric, Druid, Paladin)
    const isPreparedCaster = actor.items.some(
      i =>
        i.type === "class" &&
        ["wizard", "cleric", "druid", "paladin"].includes(String(i.system?.identifier || "").toLowerCase())
    );
    const isPrepared =
      prepVal >= 1 ||
      ["always", "innate", "atwill", "pact"].includes(prepMode) ||
      Boolean(spellItem.flags?.[MODULE_ID]?.isDomainSpell) ||
      !isPreparedCaster;

    let requiresIntuitiveArcanum = false;
    if (!isPrepared) {
      // Flinn can still cast unprepared Wizard spells from his spellbook via Intuitive Arcanum!
      if (this.isFlinn(actor)) {
        const origin =
          spellItem.flags?.[MODULE_ID]?.flinnSpellOrigin ||
          (spellItem.system?.sourceItem === "class:cleric" ? "cleric" : "wizard");
        if (origin === "wizard") {
          requiresIntuitiveArcanum = true;
        } else {
          return null;
        }
      } else {
        return null;
      }
    }

    // 1. Check innate/item uses that don't require a spell slot (only when prepared/innate)
    if (!requiresIntuitiveArcanum) {
      const maxUses = Number(spellItem.system?.uses?.max || 0);
      const spentUses = Number(spellItem.system?.uses?.spent || 0);
      const hasFreeCastActivity = Array.from(spellItem.system?.activities?.values?.() || []).some(
        a => a?.consumption?.spellSlot === false
      );
      if (maxUses > 0 && spentUses < maxUses && (prepMode === "innate" || prepMode === "atwill" || hasFreeCastActivity)) {
        return {
          spellItem,
          consumeType: "uses",
          slotKey: null,
          slotLevel: Number(spellItem.system?.level || 1),
          requiresIntuitiveArcanum: false
        };
      }
      if (prepMode === "atwill") {
        return {
          spellItem,
          consumeType: "atwill",
          slotKey: null,
          slotLevel: Number(spellItem.system?.level || 1),
          requiresIntuitiveArcanum: false
        };
      }
    }

    // 2. Check leveled spell slots (from spell.system.level up to 9)
    const minLvl = Math.max(1, Number(spellItem.system?.level || 1));
    for (let lvl = minLvl; lvl <= 9; lvl++) {
      const slotKey = `spell${lvl}`;
      const avail = Number(actor.system?.spells?.[slotKey]?.value || 0);
      if (avail > 0) {
        return {
          spellItem,
          consumeType: "slot",
          slotKey,
          slotLevel: lvl,
          requiresIntuitiveArcanum
        };
      }
    }

    // 3. Check Pact Magic slots
    if (!requiresIntuitiveArcanum) {
      const pactAvail = Number(actor.system?.spells?.pact?.value || 0);
      const pactLvl = Number(actor.system?.spells?.pact?.level || 0);
      if (pactAvail > 0 && pactLvl >= minLvl) {
        return {
          spellItem,
          consumeType: "pact",
          slotKey: "pact",
          slotLevel: pactLvl,
          requiresIntuitiveArcanum: false
        };
      }
    }

    return null;
  }

  /**
   * Consume the spell slot or innate use for a reaction spell cast from chat (`Shield` or `Silvery Barbs`).
   */
  static async consumeReactionSpellResource(actor, spellInfo) {
    if (!actor || !spellInfo?.spellItem) return;
    const { spellItem, consumeType, slotKey, slotLevel } = spellInfo;

    if (consumeType === "uses") {
      const spent = Number(spellItem.system?.uses?.spent || 0);
      await spellItem.update({ "system.uses.spent": spent + 1 });
    } else if (consumeType === "slot" && slotKey) {
      const cur = Number(actor.system?.spells?.[slotKey]?.value || 0);
      await actor.update({ [`system.spells.${slotKey}.value`]: Math.max(0, cur - 1) });
    } else if (consumeType === "pact") {
      const cur = Number(actor.system?.spells?.pact?.value || 0);
      await actor.update({ "system.spells.pact.value": Math.max(0, cur - 1) });
    }

    // If Altarion casts an Abjuration spell (like Shield), recharge Arcane Ward (+2 * slotLevel)
    const school = String(spellItem.system?.school || "").toLowerCase();
    if (
      school === "abj" &&
      AltarionAutomationManager.isAltarion(actor) &&
      typeof AltarionAutomationManager.rechargeArcaneWard === "function"
    ) {
      await AltarionAutomationManager.rechargeArcaneWard(actor, slotLevel || 1, spellItem.name);
    }
  }

  /**
   * Open Foundry's standard spell casting dialog (`activity.use` / `spellItem.use`) for a Reaction spell
   * (`Shield`, `Silvery Barbs`, `Shadow Rebuke`, `Absorb Elements`, `Altarion's Echoing Ward`)
   * — or if `spellInfo.requiresIntuitiveArcanum` is true on Flinn, open the Intuitive Arcanum dialog!
   */
  static async castReactionSpellWithFoundryDialog(
    actor,
    spellInfo,
    { returnDetails = false, reactionContext = null } = {}
  ) {
    if (!actor || !spellInfo?.spellItem) {
      return returnDetails ? { completed: false, slotLevel: 1, viaIntuitiveArcanum: false } : false;
    }
    const spellItem = spellInfo.spellItem;
    const activities = Array.from(spellItem.system?.activities?.values?.() || []);
    const primaryActivity = activities[0] || null;

    // If this is an unprepared Wizard spell on Flinn, route through Intuitive Arcanum!
    if (spellInfo.requiresIntuitiveArcanum && this.isFlinn(actor)) {
      const iaResult = await this.openIntuitiveArcanumDialog(actor, {
        spellItem,
        activity: primaryActivity,
        reactionContext
      });
      return returnDetails ? iaResult : Boolean(iaResult?.completed);
    }

    let capturedSlotLevel = Number(spellInfo.slotLevel || spellItem.system?.level || 1);
    const hookId = Hooks.on("dnd5e.postUseActivity", (act, usageConfig, results) => {
      try {
        if (act?.item?.id !== spellItem.id) return;
        const PM = globalThis.ArcanePlagueManager;
        if (PM && typeof PM.resolveCastSpellSlotLevel === "function") {
          const resolved = PM.resolveCastSpellSlotLevel(actor, spellItem, usageConfig, results?.message);
          if (resolved >= 1) capturedSlotLevel = resolved;
        }
      } catch (_e) {
        // ignore
      }
    });

    try {
      let usageResult = null;
      if (primaryActivity && typeof primaryActivity.use === "function") {
        usageResult = await primaryActivity.use({}, { configure: true });
      } else if (typeof spellItem.use === "function") {
        usageResult = await spellItem.use({}, { configure: true });
      } else {
        await this.consumeReactionSpellResource(actor, spellInfo);
        return returnDetails
          ? { completed: true, slotLevel: capturedSlotLevel, viaIntuitiveArcanum: false }
          : true;
      }
      if (!usageResult) {
        return returnDetails
          ? { completed: false, slotLevel: capturedSlotLevel, viaIntuitiveArcanum: false }
          : false;
      }
      if (Array.isArray(usageResult) && usageResult.length === 0) {
        return returnDetails
          ? { completed: false, slotLevel: capturedSlotLevel, viaIntuitiveArcanum: false }
          : false;
      }
      if (
        typeof usageResult === "object" &&
        "message" in usageResult &&
        !usageResult.message &&
        !usageResult.rolls?.length
      ) {
        return returnDetails
          ? { completed: false, slotLevel: capturedSlotLevel, viaIntuitiveArcanum: false }
          : false;
      }
      return returnDetails
        ? { completed: true, slotLevel: capturedSlotLevel, viaIntuitiveArcanum: false }
        : true;
    } catch (err) {
      console.warn(`[Reaction Spell] Error opening standard cast dialog for ${spellItem.name}:`, err);
      return returnDetails
        ? { completed: false, slotLevel: capturedSlotLevel, viaIntuitiveArcanum: false }
        : false;
    } finally {
      Hooks.off("dnd5e.postUseActivity", hookId);
    }
  }

  /**
   * Open a dialog listing all creatures within 60 ft of `caster` on the canvas (showing each creature's
   * token/portrait icon and name, plus canvas hover highlight) so the caster of `Silvery Barbs` can
   * grant Advantage on the next ability check, attack roll, or saving throw within 1 minute.
   */
  static async openSilveryBarbsAdvantageTargetDialog(caster, spellImg = null) {
    if (!caster) return;
    const casterTok = AltarionAutomationManager.getActorCanvasToken(caster);
    const candidates = [];
    const seenIds = new Set();

    for (const tok of canvas?.tokens?.placeables || []) {
      const tokActor = tok?.actor;
      if (!tokActor) continue;
      const hp = Number(tokActor.system?.attributes?.hp?.value ?? 1);
      if (hp <= 0) continue;

      let dist = null;
      if (casterTok && tok.id !== casterTok.id) {
        dist = AltarionAutomationManager.getTokenDistanceFt(casterTok, tok);
        if (dist !== null && dist > 60) continue;
      } else if (casterTok && tok.id === casterTok.id) {
        dist = 0;
      }

      const key = tok.id || tokActor.id;
      if (seenIds.has(key)) continue;
      seenIds.add(key);

      candidates.push({
        tokenId: tok.id || "",
        actorId: tokActor.id,
        name: tok.name || tokActor.name,
        img: tok.document?.texture?.src || tokActor.img || "icons/svg/mystery-man.svg",
        dist
      });
    }

    if (candidates.length === 0) {
      candidates.push({
        tokenId: casterTok?.id || "",
        actorId: caster.id,
        name: caster.name,
        img: caster.img || "icons/svg/mystery-man.svg",
        dist: 0
      });
    }

    const rowsHtml = candidates
      .map(
        (c, idx) => `
          <label class="coria-creature-pick-row" data-token-id="${c.tokenId}" style="display:flex; align-items:center; gap:10px; padding:6px 10px; margin:4px 0; border-radius:6px; background:rgba(15,23,42,0.75); border:1px solid rgba(56,189,248,0.35); cursor:pointer;">
            <input type="radio" name="silvery-barbs-ally" value="${c.actorId}" data-token-id="${c.tokenId}" data-target-name="${c.name}" ${idx === 0 ? "checked" : ""} />
            <img src="${c.img}" style="width:32px; height:32px; border-radius:4px; object-fit:cover; border:1px solid #38bdf8; flex-shrink:0;" />
            <span style="flex:1; font-weight:700; color:#f1f5f9; text-align:left;">${c.name}</span>
            <span style="font-size:0.76rem; color:#94a3b8;">${c.dist !== null ? `${c.dist} ft` : "No Mapa"}</span>
          </label>
        `
      )
      .join("");

    createV2Dialog(
      {
        title: `Silvery Barbs — Conceder Vantagem (60 ft)`,
        content: `
          <div class="coria-arcane-box" style="text-align:left;">
            <h3 style="text-align:center;">Escolher Criatura para Receber Vantagem</h3>
            <p style="font-size:0.86rem; color:#cbd5e1; margin-bottom:8px;">
              Escolha uma criatura a até <strong>60 ft</strong> de <strong>${caster.name}</strong> para receber <strong>Vantagem</strong> no próximo teste de atributo, jogada de ataque ou salvaguarda que realizar em até <strong>1 minuto</strong>:
            </p>
            <div style="max-height:240px; overflow-y:auto; padding-right:4px;">
              ${rowsHtml}
            </div>
          </div>
        `,
        buttons: {
          confirm: {
            icon: '<i class="fas fa-feather-alt"></i>',
            label: "Conceder Vantagem (1 Minuto)",
            callback: async (html) => {
              const root = html instanceof HTMLElement ? html : html?.[0];
              const checked = root?.querySelector('input[name="silvery-barbs-ally"]:checked');
              if (!checked) return;
              const targetActorId = checked.value;
              const targetTokenId = checked.getAttribute("data-token-id") || "";
              const targetTok = targetTokenId ? canvas?.tokens?.get?.(targetTokenId) : null;
              const targetActor = targetTok?.actor || game.actors?.get(targetActorId);
              if (!targetActor) return;

              await AltarionAutomationManager.applyOrUpdateStatusEffect(targetActor, {
                statusId: "silvery-barbs-advantage",
                name: "Silvery Barbs (Advantage on Next Roll)",
                img: spellImg || "icons/magic/air/wind-stream-blue-gray.webp",
                description: `<p><strong>Silvery Barbs:</strong> You have <strong>Advantage</strong> on the next ability check, attack roll, or saving throw you make within 1 minute. A magia encerra este efeito assim que a rolagem é feita.</p>`,
                durationSeconds: 60,
                durationRounds: 10,
                extraFlags: {
                  isSilveryBarbsAdvantageEffect: true,
                  casterId: caster.id
                }
              });

              await AltarionAutomationManager.sendMinimalistFeatureCard(caster, {
                icon: "fa-feather-alt",
                title: `Silvery Barbs — Advantage Granted!`,
                bodyHtml: `
                  <strong>${foundry.utils.escapeHTML(caster.name)}</strong> redirected the silver threads of fate to bolster <strong>${foundry.utils.escapeHTML(targetActor.name)}</strong>!<br>
                  &bull; <strong>Effect:</strong> <strong>${foundry.utils.escapeHTML(targetActor.name)}</strong> has <strong>Advantage</strong> on the next ability check, attack roll, or saving throw made within 1 minute!
                `,
                flags: { isD20ReactionCard: true }
              });
            }
          },
          cancel: {
            icon: '<i class="fas fa-times"></i>',
            label: "Cancelar"
          }
        },
        default: "confirm",
        render: (html) => {
          const root = html instanceof HTMLElement ? html : html?.[0];
          if (!root) return;
          root.querySelector('button[data-button="confirm"]')?.classList.add("btn-arcane");
          AltarionAutomationManager.bindTokenHoverHighlightListeners(root, ".coria-creature-pick-row");
        }
      },
      { classes: ["coria-dialog"], width: 440 }
    ).render(true);
  }

  /**
   * Resolve target Actors and their ACs from an Attack Roll ChatMessage (or active canvas targets).
   */
  static resolveAttackRollTargets(message) {
    const results = [];
    const seenActorIds = new Set();

    const flagTargets = message?.flags?.dnd5e?.targets;
    if (Array.isArray(flagTargets) && flagTargets.length > 0) {
      for (const t of flagTargets) {
        let actor = null;
        let token = null;
        if (t?.uuid && typeof fromUuidSync === "function") {
          try {
            const doc = fromUuidSync(t.uuid);
            if (doc?.documentName === "Token") {
              token = doc.object || null;
              actor = doc.actor || null;
            } else if (doc?.documentName === "Actor") {
              actor = doc;
              token = AltarionAutomationManager.getActorCanvasToken(actor);
            }
          } catch (_) {
            // ignore
          }
        }
        if (!actor && t?.name) {
          const lower = String(t.name).trim().toLowerCase();
          actor = game.actors?.find(a => a.name?.trim().toLowerCase() === lower) || null;
          token = actor ? AltarionAutomationManager.getActorCanvasToken(actor) : null;
        }
        if (actor && !seenActorIds.has(actor.id)) {
          seenActorIds.add(actor.id);
          const ac = Number(actor.system?.attributes?.ac?.value ?? t?.ac ?? 10);
          results.push({ actor, token, ac, name: t?.name || actor.name });
        }
      }
    }

    if (results.length === 0) {
      for (const tok of Array.from(game.user?.targets || [])) {
        const actor = tok?.actor;
        if (actor && !seenActorIds.has(actor.id)) {
          seenActorIds.add(actor.id);
          const ac = Number(actor.system?.attributes?.ac?.value ?? 10);
          results.push({ actor, token: tok, ac, name: tok.name || actor.name });
        }
      }
    }

    return results;
  }

  /* -------------------------------------------- */
  /*  Runtime Hooks (Spells, Portent & Chat d20)  */
  /* -------------------------------------------- */

  static registerFlinnHooks() {
    if (this._hooksInitialized) return;
    this._hooksInitialized = true;

    // 0. Inject "Flinn's Portent Rolls" floating button when Foundry is ready & keep it updated
    Hooks.once("ready", async () => {
      const flinn = this.getFlinnActor();
      if (flinn && shouldThisClientRunAutoSync(flinn)) {
        const { wizardLevel, clericLevel } = this.getLevels(flinn);
        if (!Array.isArray(flinn.flags?.[MODULE_ID]?.portentDice) && wizardLevel >= 2) {
          await this.rollFlinnPortentsBlind(flinn);
        }
        // One-shot migration: switch Flinn's Cleric Spellcasting Ability to Intelligence & enforce strict Cleric-level Domain Spells (1/3/5/7/9)
        if (!flinn.getFlag(MODULE_ID, "flinnClericIntDomainV1")) {
          try {
            const clericCls = flinn.items.find(
              i => i.type === "class" && (i.system?.identifier?.toLowerCase() === "cleric" || i.name?.trim().toLowerCase() === "cleric")
            );
            if (clericCls) {
              await clericCls.update({
                "system.spellcasting.ability": "int",
                "system.spellcasting.preparation.formula": "max(1, @classes.cleric.levels + @abilities.int.mod)"
              });
            }
            await this.syncFlinnSpellsAndClericList(flinn, {
              wizardLevel: wizardLevel || this.PRIMARY_CLASS.defaultLevel,
              clericLevel: clericLevel || this.SECONDARY_CLASS.defaultLevel
            });
            await flinn.setFlag(MODULE_ID, "flinnClericIntDomainV1", true);
            OtherPlayersBase.refreshActor(flinn);
            if (flinn.sheet?.rendered) flinn.sheet.render(false);
          } catch (err) {
            console.warn("[Flinn] Non-fatal warning migrating Cleric INT & Domain Spells:", err);
          }
        }
      }
      this.refreshPortentFloatingButton();
    });

    Hooks.on("updateActor", (actor, changed) => {
      if (this.isFlinn(actor)) {
        this.refreshPortentFloatingButton();
        if (changed?.flags?.[MODULE_ID]?.portentDice && this._activePortentDialog?.rendered) {
          try {
            this._activePortentDialog.close();
          } catch (_) {
            // ignore
          }
        }
      }
    });

    Hooks.on("createActor", (actor) => {
      if (this.isFlinn(actor)) this.refreshPortentFloatingButton();
    });

    // 1. Tag any newly dragged/created spell on Flinn as Wizard by default if it lacks flinnSpellOrigin
    Hooks.on("createItem", async (item) => {
      const actor = item?.parent;
      if (!actor || !actor.isOwner || !this.isFlinn(actor) || OtherPlayersBase.isSyncing(actor.id)) return;
      if (item.type !== "spell") return;
      if (!item.flags?.[MODULE_ID]?.flinnSpellOrigin) {
        await item.update({
          "system.sourceItem": "class:wizard",
          [`flags.${MODULE_ID}.flinnSpellOrigin`]: "wizard"
        });
      }
    });

    // 2. Intercept unprepared leveled Wizard spell casts on Flinn -> Intuitive Arcanum (Accidental Casting)
    Hooks.on("dnd5e.preUseActivity", (activity, usageConfig, dialogConfig, messageConfig) => {
      const item = activity?.item;
      const actor = item?.actor;
      if (!item || !actor || !this.isFlinn(actor)) return;

      // Direct click on the "Intuitive Arcanum" feature item
      if (
        item.type === "feat" &&
        (item.flags?.[MODULE_ID]?.isIntuitiveArcanumFeature ||
          item.name?.trim().toLowerCase() === "intuitive arcanum")
      ) {
        this.openIntuitiveArcanumDialog(actor);
        return false;
      }

      // Direct click on "Portent" feature item -> open "Flinn's Portent Rolls"
      if (item.type === "feat" && item.name?.trim().toLowerCase().includes("portent")) {
        this.openPortentRollsDialog(actor, { mode: "view" });
        return false;
      }

      // Casting an unprepared leveled Wizard spell triggers Accidental Casting
      if (item.type === "spell" && Number(item.system?.level || 0) >= 1) {
        const isPrepared = Number(item.system?.prepared || 0) >= 1;
        const origin =
          item.flags?.[MODULE_ID]?.flinnSpellOrigin ||
          (item.system?.sourceItem === "class:cleric" ? "cleric" : "wizard");

        if (
          !isPrepared &&
          origin === "wizard" &&
          !usageConfig?.intuitiveArcanumApproved &&
          !this._approvingIntuitiveArcanumCast
        ) {
          this.openIntuitiveArcanumDialog(actor, { spellItem: item, activity });
          return false;
        }
      }
    });

    // 3. When Flinn casts "Paths of Destiny" or uses "Channel Divinity: Harness Divine Power"
    Hooks.on("dnd5e.postUseActivity", async (activity) => {
      const item = activity?.item;
      const actor = item?.actor;
      if (!item || !actor || !actor.isOwner || !this.isFlinn(actor)) return;

      const nameLow = String(item.name || "").trim().toLowerCase();

      // 3a. Channel Divinity: Harness Divine Power (TCE) — Spell Slot Recovery Dialog
      const isHarnessDivinePower =
        Boolean(item.flags?.[MODULE_ID]?.isHarnessDivinePowerFeat) ||
        nameLow.includes("harness divine power");
      if (isHarnessDivinePower) {
        await this.openHarnessDivinePowerDialog(actor, item);
        return;
      }

      // 3b. Paths of Destiny — 1-minute status effect
      const isPaths =
        Boolean(item.flags?.[MODULE_ID]?.isPathsOfDestinySpell) ||
        nameLow === "paths of destiny";
      if (!isPaths) return;

      await AltarionAutomationManager.applyOrUpdateStatusEffect(actor, {
        statusId: "paths-of-destiny",
        name: "Paths of Destiny (60 ft Reaction d20 Twist)",
        img: "modules/altarion-aitusa/flinn_icons/paths-of-destiny.jpg",
        description: `<div class="rd__b  rd__b--2"><p><strong>Paths of Destiny (Concentration, up to 1 minute):</strong> As a reaction whenever a creature you can see within 60 feet of you makes an attack roll, an ability check, or a saving throw, you can force an additional <strong>d20</strong> to be rolled and choose whether the creature uses its original d20 roll or the new d20.</p></div>`,
        durationSeconds: 60,
        durationRounds: 10,
        extraFlags: {
          isPathsOfDestinyEffect: true,
          casterId: actor.id
        }
      });

      ui.notifications.info(
        `[Paths of Destiny] Active on ${actor.name} for 1 minute! Reaction buttons will appear on d20 rolls within 60 ft.`
      );
    });

    // 4. Unified Chat Hook for d20 Roll Reactions:
    //    - Paths of Destiny (Flinn & GM only)
    //    - Portent (Flinn & GM only)
    //    - Lucky Feat (Flinn & GM only)
    //    - Halfling Lucky (Flinn & GM only, when Flinn rolls natural 1)
    //    - Shield (Targeted player & GM only, when attack hits/exceeds AC & Shield is prepared + castable)
    //    - Silvery Barbs (Each eligible player within 60 ft & GM only, on ability check or successful attack/save)
    const onRenderChatMsg = (message, html) => {
      const rootEl = html instanceof HTMLElement ? html : html?.[0];
      if (!rootEl) return;

      // 4a. Choice buttons inside a Paths of Destiny or Lucky Feat Twist Card
      for (const choiceBtn of rootEl.querySelectorAll(".coria-paths-choice-btn")) {
        if (choiceBtn.dataset.boundListener) continue;
        choiceBtn.dataset.boundListener = "true";
        choiceBtn.addEventListener("click", async (ev) => {
          ev.preventDefault();
          ev.stopPropagation();

          const flinn = this.getFlinnActor();
          if (!this.isUserFlinnController(flinn)) {
            ui.notifications.warn("Apenas o jogador de Flinn ou o Mestre pode escolher o dado.");
            return;
          }

          const cardSource = choiceBtn.getAttribute("data-card-source") || "Paths of Destiny";
          const chosenLabel = choiceBtn.getAttribute("data-choice-label") || "Novo d20";
          const chosenTotal = Number(choiceBtn.getAttribute("data-chosen-total") || 0);
          const chosenNat = Number(choiceBtn.getAttribute("data-chosen-nat") || 0);
          const targetName = choiceBtn.getAttribute("data-target-name") || "A criatura";
          const originMsgId = choiceBtn.getAttribute("data-origin-msg-id") || "";
          const cardMsgId = choiceBtn.getAttribute("data-card-msg-id") || "";
          const targetKey = choiceBtn.getAttribute("data-target-key") || "";
          const rollerActorId = choiceBtn.getAttribute("data-roller-actor-id") || "";

          const choiceChatChannel =
            globalThis.CoriaChatTabs?.getChannelForOriginRoll?.({
              originMsgId,
              cardMsgId,
              defaultChannel: "combat"
            }) || "combat";

          await AltarionAutomationManager.sendMinimalistFeatureCard(flinn, {
            icon: cardSource === "Lucky Feat" ? "fa-clover" : "fa-hourglass-end",
            title: `${cardSource} — Die Selected (${chosenTotal})!`,
            bodyHtml: `
              <strong>${foundry.utils.escapeHTML(flinn?.name || "Flinn")}</strong> selected <strong>${foundry.utils.escapeHTML(targetName)}</strong>'s roll outcome (<strong>${foundry.utils.escapeHTML(chosenLabel)}</strong>)!<br>
              &bull; <strong>Final Result (d20 = ${chosenNat}):</strong> <strong>${chosenTotal}</strong>
            `,
            flags: {
              isPathsOfDestinyCard: true,
              isD20ReactionCard: true,
              chatChannel: choiceChatChannel,
              originRollMessageId: originMsgId
            }
          });

          await CoriaRollLedger.applyRollIntervention({
            rollMessageId: originMsgId,
            cardMessageId: cardMsgId,
            targetKey,
            rollerActorId,
            newTotal: chosenTotal,
            newNat: chosenNat,
            sourceLabel: `${cardSource} (${chosenLabel})`
          });
        });
      }

      // Skip injecting reaction buttons on non-roll cards, blind rolls (for non-GM), or our own reaction cards
      if (message.blind && !game.user?.isGM) return;
      if (
        message.flags?.[MODULE_ID]?.isPathsOfDestinyCard ||
        message.flags?.[MODULE_ID]?.isD20ReactionCard ||
        message.flags?.[MODULE_ID]?.isPortentBlindRoll
      ) {
        return;
      }
      if (rootEl.querySelector(".coria-d20-reactions-bar")) return;

      const roll = message.rolls?.[0];
      if (!roll) return;
      const rawType = String(
        message.flags?.dnd5e?.roll?.type ||
          message.flags?.dnd5e?.activity?.type ||
          roll.options?.type ||
          ""
      ).toLowerCase();
      if (rawType === "damage" || rawType === "healing") return;

      const d20Term =
        roll.terms?.find(t => t?.faces === 20) ||
        roll.dice?.find(d => d?.faces === 20) ||
        null;
      if (!d20Term) return;

      const isAttackRoll = rawType === "attack";
      const isSavingThrow =
        rawType === "save" ||
        rawType === "savingthrow" ||
        rawType === "concentration" ||
        rawType === "death";
      const isAbilityCheck = !isAttackRoll && !isSavingThrow;

      const allD20Results = (d20Term.results || [])
        .filter(r => !r.discarded)
        .map(r => Number(r.result))
        .filter(n => Number.isFinite(n));
      const activeD20Result =
        d20Term.results?.find(r => r.active)?.result ??
        d20Term.results?.[0]?.result ??
        Number(d20Term.total || 10);
      const modState = message.flags?.[MODULE_ID]?.rollModState;
      const origNat = Number(modState?.currentNat ?? activeD20Result ?? 10);
      const origTotal = Number(modState?.currentTotal ?? roll.total ?? origNat);
      const flatBonus = Number(modState?.flatBonus ?? (origTotal - origNat));
      const bonusStr = flatBonus >= 0 ? `+ ${flatBonus}` : `- ${Math.abs(flatBonus)}`;

      const spkScene = message.speaker?.scene ? game.scenes?.get(message.speaker.scene) : canvas?.scene;
      const spkTokDoc =
        message.speaker?.token && spkScene ? spkScene.tokens?.get(message.speaker.token) : null;
      const speakerActor =
        spkTokDoc?.actor ||
        ChatMessage.getSpeakerActor?.(message.speaker) ||
        (message.speaker?.actor ? game.actors?.get(message.speaker.actor) : null);
      const rollerName = message.speaker?.alias || spkTokDoc?.name || speakerActor?.name || "Creature";
      const rollerTok =
        (message.speaker?.token && canvas?.tokens?.get?.(message.speaker.token)) ||
        (speakerActor ? AltarionAutomationManager.getActorCanvasToken(speakerActor) : null);

      const attackTargets = isAttackRoll ? this.resolveAttackRollTargets(message) : [];
      const flinn = this.getFlinnActor();
      const userControlsFlinn = this.isUserFlinnController(flinn);

      const buttonsHtmlList = [];

      // ----------------------------------------------------------------------
      // 1. FLINN-ONLY REACTIONS (Visible ONLY to Flinn's controller and GM)
      // ----------------------------------------------------------------------
      if (flinn && userControlsFlinn) {
        const flinnTok = AltarionAutomationManager.getActorCanvasToken(flinn);
        const distToFlinn =
          flinnTok && rollerTok && flinnTok.id !== rollerTok.id
            ? AltarionAutomationManager.getTokenDistanceFt(flinnTok, rollerTok)
            : 0;
        const within60FtOfFlinn = distToFlinn === null || distToFlinn <= 60;

        // 1A. Paths of Destiny (Active status + within 60 ft)
        if (AltarionAutomationManager.hasStatus(flinn, "paths-of-destiny") && within60FtOfFlinn) {
          buttonsHtmlList.push(`
            <button type="button" class="coria-d20-react-btn btn-arcane" data-react-type="paths-of-destiny" title="Paths of Destiny: Forçar +1d20 com Reação e escolher qual resultado será usado">
              <i class="fas fa-hourglass-half"></i> Paths of Destiny (+1d20)
            </button>
          `);
        }

        // 1B. Portent (Any d20 roll while Flinn has Portent dice available)
        const portentDice = this.getPortentDice(flinn);
        if (portentDice.length > 0) {
          buttonsHtmlList.push(`
            <button type="button" class="coria-d20-react-btn btn-arcane" data-react-type="portent" title="Portent: Substituir o d20 por um dos seus dados de Portent (${portentDice.length} disponível/is)">
              <i class="fas fa-eye"></i> Portent (${portentDice.length} dado${portentDice.length > 1 ? "s" : ""})
            </button>
          `);
        }

        // 1C. Halfling Lucky (Flinn's own roll when natural d20 === 1)
        if (speakerActor?.id === flinn.id && origNat === 1) {
          buttonsHtmlList.push(`
            <button type="button" class="coria-d20-react-btn btn-cleric-gold" data-react-type="halfling-lucky" title="Halfling Lucky: Rerolar o 1 natural no d20 mantendo os mesmos bônus">
              <i class="fas fa-dice-one"></i> Halfling Lucky (Rerolar 1 Natural)
            </button>
          `);
        }

        // 1D. Lucky Feat (Flinn's own attack/check/save OR attack roll targeting Flinn, while Luck Points > 0)
        const availLuck = this.getAvailableLuckPoints(flinn);
        const isFlinnRoller = speakerActor?.id === flinn.id;
        const isFlinnAttackTarget = isAttackRoll && attackTargets.some(t => t.actor?.id === flinn.id);
        if (availLuck > 0 && (isFlinnRoller || isFlinnAttackTarget)) {
          buttonsHtmlList.push(`
            <button type="button" class="coria-d20-react-btn btn-cleric-gold" data-react-type="lucky-feat" title="Lucky Feat: Gastar 1 Ponto de Sorte (${availLuck} restantes) para rolar +1d20 e escolher qualquer um dos dados rolados">
              <i class="fas fa-clover"></i> Lucky Feat (${availLuck}/3)
            </button>
          `);
        }
      }

      // ----------------------------------------------------------------------
      // 2. SHIELD SPELL (Targeted actor whose AC was hit/exceeded & has Shield ready)
      //    Visible ONLY to GM and the player who controls the targeted actor
      // ----------------------------------------------------------------------
      if (isAttackRoll && origNat !== 1) {
        for (const tgt of attackTargets) {
          const tgtActor = tgt.actor;
          if (!tgtActor || AltarionAutomationManager.isAitusa(tgtActor) || !this.isUserControllerOf(tgtActor)) continue;
          const ledgerDef = message.flags?.[MODULE_ID]?.rollLedger?.defenders?.find(
            d => d.defenderActorId === tgtActor.id
          );
          const effectiveAc = Number(ledgerDef?.currentAc ?? modState?.currentTarget ?? tgt.ac);
          const hitsTarget = origNat === 20 || origTotal >= effectiveAc;
          if (!hitsTarget) continue;

          const shieldInfo = this.getReadyReactionSpellInfo(tgtActor, "shield");
          if (!shieldInfo) continue;

          const shIaSuffix = shieldInfo.requiresIntuitiveArcanum ? " [Intuitive Arcanum]" : "";
          buttonsHtmlList.push(`
            <button type="button" class="coria-d20-react-btn btn-arcane"
                    data-react-type="shield"
                    data-caster-id="${tgtActor.id}"
                    data-target-ac="${effectiveAc}"
                    title="Conjurar Shield como Reação para ${tgtActor.name}${shIaSuffix} (+5 CA até o início do próximo turno)">
              <i class="fas fa-shield-alt"></i> Shield (+5 CA — ${tgtActor.name}${shIaSuffix})
            </button>
          `);
        }
      }

      // ----------------------------------------------------------------------
      // 3. SILVERY BARBS SPELL (Ability check, OR successful attack >= AC, OR successful save >= DC)
      //    Visible ONLY to GM and each player within 60 ft who has Silvery Barbs prepared & castable
      // ----------------------------------------------------------------------
      let qualifiesForSilveryBarbs = false;
      if (isAbilityCheck) {
        const checkDc = Number(
          message.flags?.[MODULE_ID]?.rollLedger?.dc ??
            roll.options?.target ??
            message.flags?.dnd5e?.roll?.target ??
            NaN
        );
        qualifiesForSilveryBarbs = Number.isFinite(checkDc) ? origTotal >= checkDc : true;
      } else if (isAttackRoll && origNat !== 1) {
        if (attackTargets.length > 0) {
          qualifiesForSilveryBarbs = attackTargets.some(t => {
            const ledgerDef = message.flags?.[MODULE_ID]?.rollLedger?.defenders?.find(
              d => d.defenderActorId === t.actor?.id
            );
            const effAc = Number(ledgerDef?.currentAc ?? modState?.currentTarget ?? t.ac);
            return origNat === 20 || origTotal >= effAc;
          });
        } else {
          const optTargetAc = Number(modState?.currentTarget ?? roll.options?.target ?? NaN);
          qualifiesForSilveryBarbs = Number.isFinite(optTargetAc)
            ? origNat === 20 || origTotal >= optTargetAc
            : origNat > 1;
        }
      } else if (isSavingThrow && origNat !== 1) {
        const saveDc = Number(
          modState?.currentTarget ??
            message.flags?.[MODULE_ID]?.rollLedger?.dc ??
            message.flags?.[MODULE_ID]?.linkedSaveCard?.saveDc ??
            roll.options?.target ??
            message.flags?.dnd5e?.roll?.target ??
            AltarionAutomationManager._pendingSaveContext?.dc ??
            NaN
        );
        const domHasSuccess = Boolean(rootEl.querySelector(".dice-total.success, .roll.success"));
        if (Number.isFinite(saveDc)) {
          qualifiesForSilveryBarbs = origNat === 20 || origTotal >= saveDc;
        } else if (domHasSuccess) {
          qualifiesForSilveryBarbs = true;
        } else {
          qualifiesForSilveryBarbs = true;
        }
      }

      if (qualifiesForSilveryBarbs) {
        for (const candidateActor of game.actors || []) {
          if (candidateActor.type !== "character") continue;
          if (isIgnoredBackupActor(candidateActor)) continue;
          if (AltarionAutomationManager.isAitusa(candidateActor)) continue;
          if (!this.isUserControllerOf(candidateActor)) continue;

          const sbInfo = this.getReadyReactionSpellInfo(candidateActor, "silvery barbs");
          if (!sbInfo) continue;

          const candTok = AltarionAutomationManager.getActorCanvasToken(candidateActor);
          if (candTok && rollerTok && candTok.id !== rollerTok.id) {
            const dist = AltarionAutomationManager.getTokenDistanceFt(candTok, rollerTok);
            if (dist !== null && dist > 60) continue;
          }

          const sbIaSuffix = sbInfo.requiresIntuitiveArcanum ? " [Intuitive Arcanum]" : "";
          buttonsHtmlList.push(`
            <button type="button" class="coria-d20-react-btn btn-pact"
                    data-react-type="silvery-barbs"
                    data-caster-id="${candidateActor.id}"
                    title="Cast Silvery Barbs (${candidateActor.name}${sbIaSuffix}): Force ${rollerName} to reroll the d20 and use the lower result">
              <i class="fas fa-feather-alt"></i> Silvery Barbs (${candidateActor.name}${sbIaSuffix})
            </button>
          `);
        }
      }

      // ----------------------------------------------------------------------
      // 4. LEGENDARY RESISTANCE (Monster / NPC failed saving throws)
      //    Visible to GM or controller of the monster when uses > 0
      // ----------------------------------------------------------------------
      const resolvedSaveDc = Number(
        modState?.currentTarget ??
          message.flags?.[MODULE_ID]?.rollLedger?.dc ??
          message.flags?.[MODULE_ID]?.linkedSaveCard?.saveDc ??
          roll.options?.target ??
          message.flags?.dnd5e?.roll?.target ??
          AltarionAutomationManager._pendingSaveContext?.dc ??
          NaN
      );
      const domSucceededSave = Boolean(rootEl.querySelector(".dice-total.success, .roll.success"));

      if (isSavingThrow && rawType !== "death" && speakerActor && this.isUserControllerOf(speakerActor)) {
        const legInfo = this.getLegendaryResistanceInfo(speakerActor);
        if (legInfo && !modState?.forceSuccess && modState?.isSuccess !== true) {
          const canUseLegRes = Number.isFinite(resolvedSaveDc)
            ? origNat === 1 || origTotal < resolvedSaveDc
            : !domSucceededSave;
          if (canUseLegRes) {
            buttonsHtmlList.push(`
              <button type="button" class="coria-d20-react-btn btn-cleric-gold"
                      data-react-type="legendary-resistance"
                      data-caster-id="${speakerActor.id}"
                      data-roller-uuid="${speakerActor.uuid || ""}"
                      title="Legendary Resistance (${rollerName}): Expend 1 use (${legInfo.usesLeft}/${legInfo.usesMax}) to turn this failed Saving Throw into an Automatic Success!">
                <i class="fas fa-crown"></i> Legendary Resistance (${legInfo.usesLeft}/${legInfo.usesMax})
              </button>
            `);
          }
        }
      }

      // ----------------------------------------------------------------------
      // 5. CARD OF THE RESONANT ARCANA — THE HIEROPHANT (Altarion & GM only)
      //    When a creature within 30 ft of Altarion FAILS a save against a spell
      // ----------------------------------------------------------------------
      if (isSavingThrow && globalThis.CoriaResonantArcana?.buildHierophantButtonHtml) {
        const hieroBtnHtml = globalThis.CoriaResonantArcana.buildHierophantButtonHtml({
          message,
          isSavingThrow,
          rawType,
          rollerActor: speakerActor,
          rollerTok,
          rollerName,
          origNat,
          origTotal,
          saveDc: resolvedSaveDc,
          domHasSuccess: domSucceededSave,
          modState
        });
        if (hieroBtnHtml) {
          buttonsHtmlList.push(hieroBtnHtml);
        }
      }

      if (buttonsHtmlList.length === 0) return;

      const bar = document.createElement("div");
      bar.className = "coria-d20-reactions-bar coria-paths-of-destiny-bar";
      bar.innerHTML = buttonsHtmlList.join("");

      const linkedSaveInfo = message.flags?.[MODULE_ID]?.linkedSaveCard || {};
      const originMsgId = message.id || "";
      const cardMsgId = linkedSaveInfo.cardMessageId || "";
      const targetKey = linkedSaveInfo.targetKey || "";
      const rollerActorId = speakerActor?.id || "";

      for (const btn of bar.querySelectorAll(".coria-d20-react-btn")) {
        btn.addEventListener("click", async (ev) => {
          ev.preventDefault();
          ev.stopPropagation();

          const reactType = btn.getAttribute("data-react-type");

          await this.executeD20ReactionButton({
            reactType,
            casterId: btn.getAttribute("data-caster-id") || "",
            rollerUuid: btn.getAttribute("data-roller-uuid") || speakerActor?.uuid || "",
            targetAcAttr: btn.getAttribute("data-target-ac"),
            spellSchool: btn.getAttribute("data-spell-school") || "",
            spellName: btn.getAttribute("data-spell-name") || "",
            spellSource: btn.getAttribute("data-spell-source") || "",
            saveDcAttr: btn.getAttribute("data-save-dc") || "",
            flinn,
            speakerActor,
            rollerName,
            rollerActorId,
            origNat,
            origTotal,
            flatBonus,
            bonusStr,
            allD20Results,
            originMsgId,
            cardMsgId,
            targetKey
          });
        });
      }

      if (typeof CoriaRollLedger?.placeReactionBarBelowRollResult === "function") {
        CoriaRollLedger.placeReactionBarBelowRollResult(rootEl, bar);
      } else {
        const contentContainer = rootEl.querySelector(".message-content") || rootEl;
        contentContainer.appendChild(bar);
      }
    };

    Hooks.on("renderChatMessageHTML", onRenderChatMsg);
  }

  /**
   * Build HTML for reaction buttons (Paths of Destiny, Portent, Silvery Barbs) for a Saving Throw row
   * inside Spirit Guardians or Ancestral Marking interactive cards.
   */
  static buildSavingThrowReactionButtonsHtml({
    rollerActor = null,
    rollerTok = null,
    rollerName = "Criatura",
    origNat = 10,
    origTotal = 10,
    saveDc = 14,
    cardMessageId = "",
    targetKey = "",
    originMsgId = "",
    isSpellCard = false,
    spellCardName = "Spell",
    spellCardSchool = "",
    spellCardSourceName = ""
  } = {}) {
    const flinn = this.getFlinnActor();
    const userControlsFlinn = this.isUserFlinnController(flinn);
    const buttons = [];

    const flatBonus = origTotal - origNat;
    const dataAttrs = `
      data-roller-actor-id="${rollerActor?.id || ""}"
      data-roller-uuid="${rollerActor?.uuid || ""}"
      data-roller-name="${foundry.utils.escapeHTML(rollerName)}"
      data-orig-nat="${origNat}"
      data-orig-total="${origTotal}"
      data-flat-bonus="${flatBonus}"
      data-card-msg-id="${cardMessageId}"
      data-target-key="${targetKey}"
      data-origin-msg-id="${originMsgId}"
    `;

    if (flinn && userControlsFlinn) {
      const flinnTok = AltarionAutomationManager.getActorCanvasToken(flinn);
      const rTok = rollerTok || (rollerActor ? AltarionAutomationManager.getActorCanvasToken(rollerActor) : null);
      const distToFlinn =
        flinnTok && rTok && flinnTok.id !== rTok.id
          ? AltarionAutomationManager.getTokenDistanceFt(flinnTok, rTok)
          : 0;
      const within60FtOfFlinn = distToFlinn === null || distToFlinn <= 60;

      if (AltarionAutomationManager.hasStatus(flinn, "paths-of-destiny") && within60FtOfFlinn) {
        buttons.push(`
          <button type="button" class="coria-d20-react-btn coria-inline-save-react-btn btn-arcane"
                  data-react-type="paths-of-destiny" ${dataAttrs}
                  title="Paths of Destiny: Forçar +1d20 com Reação e escolher qual resultado será usado">
            <i class="fas fa-hourglass-half"></i> Paths of Destiny
          </button>
        `);
      }

      const portentDice = this.getPortentDice(flinn);
      if (portentDice.length > 0) {
        buttons.push(`
          <button type="button" class="coria-d20-react-btn coria-inline-save-react-btn btn-arcane"
                  data-react-type="portent" ${dataAttrs}
                  title="Portent: Substituir o d20 por um dos seus dados de Portent (${portentDice.length} disponível/is)">
            <i class="fas fa-eye"></i> Portent (${portentDice.length})
          </button>
        `);
      }
    }

    // Silvery Barbs: Eligible when saving throw succeeded (origTotal >= saveDc and origNat !== 1)
    if (origNat !== 1 && (origNat === 20 || origTotal >= saveDc)) {
      const rTok = rollerTok || (rollerActor ? AltarionAutomationManager.getActorCanvasToken(rollerActor) : null);
      for (const candidateActor of game.actors || []) {
        if (candidateActor.type !== "character") continue;
        if (isIgnoredBackupActor(candidateActor)) continue;
        if (AltarionAutomationManager.isAitusa(candidateActor)) continue;
        if (!this.isUserControllerOf(candidateActor)) continue;
        const sbInfo = this.getReadyReactionSpellInfo(candidateActor, "silvery barbs");
        if (!sbInfo) continue;

        const candTok = AltarionAutomationManager.getActorCanvasToken(candidateActor);
        if (candTok && rTok && candTok.id !== rTok.id) {
          const dist = AltarionAutomationManager.getTokenDistanceFt(candTok, rTok);
          if (dist !== null && dist > 60) continue;
        }

        const sbIaSuffix = sbInfo.requiresIntuitiveArcanum ? " [Intuitive Arcanum]" : "";
        buttons.push(`
          <button type="button" class="coria-d20-react-btn coria-inline-save-react-btn btn-pact"
                  data-react-type="silvery-barbs"
                  data-caster-id="${candidateActor.id}" ${dataAttrs}
                  title="Cast Silvery Barbs (${candidateActor.name}${sbIaSuffix}): Force ${foundry.utils.escapeHTML(rollerName)} to reroll the d20 and use the lower result">
            <i class="fas fa-feather-alt"></i> Silvery Barbs (${candidateActor.name}${sbIaSuffix})
          </button>
        `);
      }
    }

    // Legendary Resistance: Eligible when saving throw failed (origTotal < saveDc or origNat === 1)
    if (origNat === 1 || origTotal < saveDc) {
      if (rollerActor && this.isUserControllerOf(rollerActor)) {
        const legInfo = this.getLegendaryResistanceInfo(rollerActor);
        if (legInfo) {
          buttons.push(`
            <button type="button" class="coria-d20-react-btn coria-inline-save-react-btn btn-cleric-gold"
                    data-react-type="legendary-resistance"
                    data-caster-id="${rollerActor.id}" ${dataAttrs}
                    title="Legendary Resistance (${foundry.utils.escapeHTML(rollerName)}): Expend 1 use (${legInfo.usesLeft}/${legInfo.usesMax}) to turn this failed Saving Throw into an Automatic Success!">
              <i class="fas fa-crown"></i> Legendary Resistance (${legInfo.usesLeft}/${legInfo.usesMax})
            </button>
          `);
        }
      }

      // The Hierophant (Altarion): Eligible on failed spell saves within 30 ft
      if (isSpellCard && globalThis.CoriaResonantArcana?.buildHierophantButtonHtml) {
        const hieroInline = globalThis.CoriaResonantArcana.buildHierophantButtonHtml({
          isSavingThrow: true,
          rawType: "save",
          rollerActor,
          rollerTok,
          rollerName,
          origNat,
          origTotal,
          saveDc,
          inlineCardSpellInfo: {
            isSpell: true,
            school: spellCardSchool,
            spellName: spellCardName,
            sourceName: spellCardSourceName || "the spellcaster"
          },
          inlineDataAttrs: dataAttrs
        });
        if (hieroInline) buttons.push(hieroInline);
      }
    }

    if (buttons.length === 0) return "";
    return `<div class="coria-d20-reactions-bar coria-paths-of-destiny-bar" style="margin-top: 6px;">${buttons.join("")}</div>`;
  }

  /**
   * Bind click listeners to `.coria-inline-save-react-btn` inside a Spirit Guardians or Ancestral Marking chat card.
   */
  static bindInlineSavingThrowReactionButtons(rootEl, fallbackCardMessageId = "") {
    if (!rootEl) return;
    const flinn = this.getFlinnActor();
    for (const btn of rootEl.querySelectorAll(".coria-inline-save-react-btn")) {
      if (btn.dataset.boundInlineReact) continue;
      btn.dataset.boundInlineReact = "true";
      btn.addEventListener("click", async (ev) => {
        ev.preventDefault();
        ev.stopPropagation();

        const reactType = btn.getAttribute("data-react-type") || "";
        const casterId = btn.getAttribute("data-caster-id") || "";
        const rollerActorId = btn.getAttribute("data-roller-actor-id") || "";
        const rollerUuid = btn.getAttribute("data-roller-uuid") || "";
        const speakerActor =
          (rollerUuid && typeof fromUuidSync === "function" ? fromUuidSync(rollerUuid)?.actor || fromUuidSync(rollerUuid) : null) ||
          (rollerActorId ? game.actors?.get(rollerActorId) : null);
        const rollerName = btn.getAttribute("data-roller-name") || speakerActor?.name || "Creature";
        const origNat = Number(btn.getAttribute("data-orig-nat") || 10);
        const origTotal = Number(btn.getAttribute("data-orig-total") || 10);
        const flatBonus = Number(btn.getAttribute("data-flat-bonus") ?? (origTotal - origNat));
        const bonusStr = flatBonus >= 0 ? `+ ${flatBonus}` : `- ${Math.abs(flatBonus)}`;
        const cardMsgId = btn.getAttribute("data-card-msg-id") || fallbackCardMessageId || "";
        const targetKey = btn.getAttribute("data-target-key") || "";
        const originMsgId = btn.getAttribute("data-origin-msg-id") || "";

        await this.executeD20ReactionButton({
          reactType,
          casterId,
          rollerUuid,
          targetAcAttr: null,
          spellSchool: btn.getAttribute("data-spell-school") || "",
          spellName: btn.getAttribute("data-spell-name") || "",
          spellSource: btn.getAttribute("data-spell-source") || "",
          saveDcAttr: btn.getAttribute("data-save-dc") || "",
          flinn,
          speakerActor,
          rollerName,
          rollerActorId,
          origNat,
          origTotal,
          flatBonus,
          bonusStr,
          allD20Results: [origNat],
          originMsgId,
          cardMsgId,
          targetKey
        });
      });
    }
  }

  /**
   * Shared executor for d20 reaction buttons (Paths of Destiny, Portent, Halfling Lucky, Lucky Feat, Shield, Silvery Barbs, Legendary Resistance).
   * Automatically notifies `AltarionAutomationManager.onSavingThrowTotalModified` when a Saving Throw's total is modified.
   */
  static async executeD20ReactionButton({
    reactType,
    casterId = "",
    rollerUuid = "",
    targetAcAttr = null,
    spellSchool = "",
    spellName = "",
    spellSource = "",
    saveDcAttr = "",
    flinn = null,
    speakerActor = null,
    rollerName = "Creature",
    rollerActorId = "",
    origNat = 10,
    origTotal = 10,
    flatBonus = 0,
    bonusStr = "+ 0",
    allD20Results = [],
    originMsgId = "",
    cardMsgId = "",
    targetKey = ""
  } = {}) {
    flinn = flinn || this.getFlinnActor();
    const resolvedRollerActorId = rollerActorId || speakerActor?.id || "";
    const reactionChatChannel =
      globalThis.CoriaChatTabs?.getChannelForOriginRoll?.({
        originMsgId,
        cardMsgId,
        defaultChannel: "combat"
      }) || "combat";

    // --- 0. CARD OF THE RESONANT ARCANA: THE HIEROPHANT (Altarion) ---
    if (reactType === "the-hierophant") {
      await globalThis.CoriaResonantArcana?.executeHierophantReaction?.({
        casterId,
        speakerActor,
        rollerUuid,
        rollerActorId: resolvedRollerActorId,
        rollerName,
        origNat,
        origTotal,
        flatBonus,
        bonusStr,
        originMsgId,
        cardMsgId,
        targetKey,
        spellSchool,
        spellName,
        spellSource,
        saveDcAttr
      });
      return;
    }

    // --- A. PATHS OF DESTINY ---
    if (reactType === "paths-of-destiny") {
      if (!flinn || !this.isUserFlinnController(flinn)) return;
      const extraD20 = await new Roll("1d20").evaluate();
      if (game.dice3d) {
        try {
          await game.dice3d.showForRoll(extraD20, game.user, true);
        } catch (_) {}
      }
      const newNat = Number(extraD20.total || 10);
      const newTotal = newNat + flatBonus;

      await AltarionAutomationManager.sendMinimalistFeatureCard(flinn, {
        icon: "fa-hourglass-half",
        title: "Paths of Destiny — Twist Fate!",
        bodyHtml: `
          <strong>${foundry.utils.escapeHTML(flinn.name)}</strong> used his <strong>Reaction</strong> to open diverging paths of fate on <strong>${foundry.utils.escapeHTML(rollerName)}</strong>'s roll!<br>
          &bull; <strong>Original Roll (d20 = ${origNat}):</strong> ${origNat} ${bonusStr} = <strong>${origTotal}</strong><br>
          &bull; <strong>Forced d20 (d20 = ${newNat}):</strong> ${newNat} ${bonusStr} = <strong>${newTotal}</strong><br>
          <em>Choose which result <strong>${foundry.utils.escapeHTML(rollerName)}</strong> must use:</em>
        `,
        buttonsHtml: `
          <button type="button" class="coria-paths-choice-btn coria-min-card-btn-secondary"
                  data-card-source="Paths of Destiny"
                  data-choice-label="Original Roll"
                  data-chosen-total="${origTotal}"
                  data-chosen-nat="${origNat}"
                  data-target-name="${foundry.utils.escapeHTML(rollerName)}"
                  data-origin-msg-id="${originMsgId}"
                  data-card-msg-id="${cardMsgId}"
                  data-target-key="${targetKey}"
                  data-roller-actor-id="${resolvedRollerActorId}"
                  style="flex: 1 1 45%;">
            <i class="fas fa-undo"></i> Keep Original (${origTotal})
          </button>
          <button type="button" class="coria-paths-choice-btn coria-min-card-btn-primary"
                  data-card-source="Paths of Destiny"
                  data-choice-label="Forced d20"
                  data-chosen-total="${newTotal}"
                  data-chosen-nat="${newNat}"
                  data-target-name="${foundry.utils.escapeHTML(rollerName)}"
                  data-origin-msg-id="${originMsgId}"
                  data-card-msg-id="${cardMsgId}"
                  data-target-key="${targetKey}"
                  data-roller-actor-id="${resolvedRollerActorId}"
                  style="flex: 1 1 45%;">
            <i class="fas fa-dice-d20"></i> Use Forced d20 (${newTotal})
          </button>
        `,
        flags: {
          isPathsOfDestinyCard: true,
          isD20ReactionCard: true,
          chatChannel: reactionChatChannel,
          originRollMessageId: originMsgId
        }
      });
      return;
    }

    // --- B. PORTENT ---
    if (reactType === "portent") {
      if (!flinn || !this.isUserFlinnController(flinn)) return;
      await this.openPortentRollsDialog(flinn, {
        mode: "use-on-roll",
        promptText: `Clique em um dos dados de Portent abaixo para escolhê-lo e substituir o d20 da rolagem de ${rollerName}:`,
        onSelectDie: async (chosenDie) => {
          const portentNat = Number(chosenDie.value || 10);
          const portentTotal = portentNat + flatBonus;
          const colorName =
            chosenDie.color === "green"
              ? "Green (Highest)"
              : chosenDie.color === "red"
                ? "Red (Lowest)"
                : "Yellow (Middle/Tied)";

          await AltarionAutomationManager.sendMinimalistFeatureCard(flinn, {
            icon: "fa-eye",
            title: `Portent — Foreseen Roll Imposed (${portentTotal})!`,
            bodyHtml: `
              <strong>${foundry.utils.escapeHTML(flinn.name)}</strong> replaced <strong>${foundry.utils.escapeHTML(rollerName)}</strong>'s roll with a <strong>Portent Die [${colorName}]</strong>!<br>
              &bull; <strong>Original Roll (d20 = ${origNat}):</strong> ${origNat} ${bonusStr} = <strong>${origTotal}</strong><br>
              &bull; <strong>Portent Roll (d20 = ${portentNat}):</strong> ${portentNat} ${bonusStr} = <strong>${portentTotal}</strong>
            `,
            flags: {
              isD20ReactionCard: true,
              chatChannel: reactionChatChannel,
              originRollMessageId: originMsgId
            }
          });

          await CoriaRollLedger.applyRollIntervention({
            rollMessageId: originMsgId,
            cardMessageId: cardMsgId,
            targetKey,
            rollerActorId: resolvedRollerActorId,
            newTotal: portentTotal,
            newNat: portentNat,
            sourceLabel: `Portent (${portentNat})`
          });
        }
      });
      return;
    }

    // --- C. HALFLING LUCKY ---
    if (reactType === "halfling-lucky") {
      if (!flinn || !this.isUserFlinnController(flinn)) return;
      const rerollD20 = await new Roll("1d20").evaluate();
      if (game.dice3d) {
        try {
          await game.dice3d.showForRoll(rerollD20, game.user, true);
        } catch (_) {}
      }
      const newNat = Number(rerollD20.total || 10);
      const newTotal = newNat + flatBonus;

      await AltarionAutomationManager.sendMinimalistFeatureCard(flinn, {
        icon: "fa-dice-d20",
        title: `Halfling Lucky — Natural 1 Rerolled (${newTotal})!`,
        bodyHtml: `
          <strong>${foundry.utils.escapeHTML(flinn.name)}</strong> rolled a <strong>Natural 1</strong> and activated <strong>Halfling Lucky</strong> to reroll the die!<br>
          &bull; <strong>Original Roll (d20 = 1):</strong> 1 ${bonusStr} = <strong>${origTotal}</strong><br>
          &bull; <strong>New Roll (d20 = ${newNat}):</strong> ${newNat} ${bonusStr} = <strong>${newTotal}</strong>
        `,
        flags: {
          isD20ReactionCard: true,
          chatChannel: reactionChatChannel,
          originRollMessageId: originMsgId
        }
      });

      await CoriaRollLedger.applyRollIntervention({
        rollMessageId: originMsgId,
        cardMessageId: cardMsgId,
        targetKey,
        rollerActorId: resolvedRollerActorId,
        newTotal,
        newNat,
        sourceLabel: "Halfling Lucky"
      });
      return;
    }

    // --- D. LUCKY FEAT ---
    if (reactType === "lucky-feat") {
      if (!flinn || !this.isUserFlinnController(flinn)) return;
      const luckyItem = this.getFlinnLuckyFeatItem(flinn);
      const avail = this.getAvailableLuckPoints(flinn);
      if (!luckyItem || avail <= 0) {
        ui.notifications.warn("Flinn has no Luck Points (Lucky Feat) remaining!");
        return;
      }

      const curSpent = Number(luckyItem.system?.uses?.spent || 0);
      await luckyItem.update({ "system.uses.spent": curSpent + 1 });

      const extraD20 = await new Roll("1d20").evaluate();
      if (game.dice3d) {
        try {
          await game.dice3d.showForRoll(extraD20, game.user, true);
        } catch (_) {}
      }
      const luckyNat = Number(extraD20.total || 10);

      const baseDiceNats = allD20Results.length > 0 ? allD20Results : [origNat];
      const candidateDice = [
        ...baseDiceNats.map((nat, i) => ({
          label:
            baseDiceNats.length > 1
              ? `Original Die #${i + 1}`
              : "Original Die",
          nat,
          total: nat + flatBonus,
          isLucky: false
        })),
        {
          label: "Lucky Die",
          nat: luckyNat,
          total: luckyNat + flatBonus,
          isLucky: true
        }
      ];

      const statsHtml = candidateDice
        .map(
          c =>
            `&bull; <strong>${c.label} (d20 = ${c.nat}):</strong> ${c.nat} ${bonusStr} = <strong>${c.total}</strong>`
        )
        .join("<br>");

      const choiceBtnsHtml = candidateDice
        .map(
          c => `
          <button type="button" class="coria-paths-choice-btn ${c.isLucky ? "coria-min-card-btn-primary" : "coria-min-card-btn-secondary"}"
                  data-card-source="Lucky Feat"
                  data-choice-label="${c.label}"
                  data-chosen-total="${c.total}"
                  data-chosen-nat="${c.nat}"
                  data-target-name="${foundry.utils.escapeHTML(rollerName)}"
                  data-origin-msg-id="${originMsgId}"
                  data-card-msg-id="${cardMsgId}"
                  data-target-key="${targetKey}"
                  data-roller-actor-id="${resolvedRollerActorId}"
                  style="flex: 1 1 45%;">
            <i class="fas ${c.isLucky ? "fa-clover" : "fa-dice-d20"}"></i> Use ${c.label} (${c.total})
          </button>
        `
        )
        .join("");

      await AltarionAutomationManager.sendMinimalistFeatureCard(flinn, {
        icon: "fa-clover",
        title: `Lucky Feat — Luck Point Expended (${avail - 1}/3 Left)!`,
        bodyHtml: `
          <strong>${foundry.utils.escapeHTML(flinn.name)}</strong> spent <strong>1 Luck Point</strong> (${avail - 1}/3 remaining) on <strong>${foundry.utils.escapeHTML(rollerName)}</strong>'s roll and rolled an additional d20!<br>
          ${statsHtml}<br>
          <em>Choose which of the <strong>${candidateDice.length} dice</strong> will be used:</em>
        `,
        buttonsHtml: choiceBtnsHtml,
        flags: {
          isPathsOfDestinyCard: true,
          isD20ReactionCard: true,
          chatChannel: reactionChatChannel,
          originRollMessageId: originMsgId
        }
      });
      return;
    }

    // --- E. SHIELD SPELL ---
    if (reactType === "shield") {
      const caster = game.actors?.get(casterId);
      if (!caster || !this.isUserControllerOf(caster)) return;

      const shieldInfo = this.getReadyReactionSpellInfo(caster, "shield");
      if (!shieldInfo) {
        ui.notifications.warn(`${caster.name} has no available spell slots to cast Shield!`);
        return;
      }

      const originMsg = originMsgId ? game.messages?.get(originMsgId) : null;
      const ledgerDef = originMsg?.flags?.[MODULE_ID]?.rollLedger?.defenders?.find(
        d => d.defenderActorId === caster.id
      );
      const oldAc = Number(
        ledgerDef?.baseAc ?? targetAcAttr ?? caster.system?.attributes?.ac?.value ?? 10
      );

      const reactionContext = {
        kind: "d20-reaction",
        reactType: "shield",
        casterId: caster.id,
        oldAc,
        rollerName,
        origNat,
        origTotal,
        originMsgId,
        cardMsgId,
        targetKey,
        resolvedRollerActorId,
        spellImg: shieldInfo.spellItem?.img || ""
      };

      const castRes = await this.castReactionSpellWithFoundryDialog(caster, shieldInfo, {
        returnDetails: true,
        reactionContext
      });
      if (!castRes?.completed) return;
      if (castRes.viaIntuitiveArcanum) return;

      await this.applyShieldReactionEffect(caster, reactionContext);
      return;
    }

    // --- F. SILVERY BARBS SPELL ---
    if (reactType === "silvery-barbs") {
      const caster = game.actors?.get(casterId);
      if (!caster || !this.isUserControllerOf(caster)) return;

      const sbInfo = this.getReadyReactionSpellInfo(caster, "silvery barbs");
      if (!sbInfo) {
        ui.notifications.warn(`${caster.name} has no available spell slots to cast Silvery Barbs!`);
        return;
      }

      const reactionContext = {
        kind: "d20-reaction",
        reactType: "silvery-barbs",
        casterId: caster.id,
        rollerName,
        origNat,
        origTotal,
        flatBonus,
        bonusStr,
        originMsgId,
        cardMsgId,
        targetKey,
        resolvedRollerActorId,
        spellImg: sbInfo.spellItem?.img || ""
      };

      const castRes = await this.castReactionSpellWithFoundryDialog(caster, sbInfo, {
        returnDetails: true,
        reactionContext
      });
      if (!castRes?.completed) return;
      if (castRes.viaIntuitiveArcanum) return;

      await this.applySilveryBarbsReactionEffect(caster, reactionContext);
      return;
    }

    // --- G. LEGENDARY RESISTANCE (Monster / NPC) ---
    if (reactType === "legendary-resistance") {
      const targetActor =
        speakerActor ||
        (await AltarionAutomationManager.resolveActorFromUuidOrId(rollerUuid, resolvedRollerActorId || casterId));
      if (!targetActor || !this.isUserControllerOf(targetActor)) return;

      const legInfo = this.getLegendaryResistanceInfo(targetActor);
      if (!legInfo) {
        ui.notifications.warn(`${targetActor.name} has no Legendary Resistance uses remaining!`);
        return;
      }

      this._usingLegendaryResistanceReactionBtn = true;
      try {
        if (legInfo.item && legInfo.hasItemUses) {
          const curSpent = Number(legInfo.item.system?.uses?.spent || 0);
          await legInfo.item.update({ "system.uses.spent": curSpent + 1 });
        }
        if (legInfo.hasLegResResource) {
          const curVal = Number(targetActor.system?.resources?.legres?.value ?? legInfo.usesLeft);
          await targetActor.update({
            "system.resources.legres.value": Math.max(0, curVal - 1)
          });
        }
      } finally {
        this._usingLegendaryResistanceReactionBtn = false;
      }

      const remainingUses = Math.max(0, legInfo.usesLeft - 1);

      await AltarionAutomationManager.sendMinimalistFeatureCard(targetActor, {
        icon: "fa-crown",
        title: `Legendary Resistance — Automatic Save Success!`,
        bodyHtml: `
          <strong>${foundry.utils.escapeHTML(rollerName)}</strong> expended <strong>1 use of Legendary Resistance</strong> (<strong>${remainingUses}/${legInfo.usesMax}</strong> remaining) to turn a failed saving throw into an <strong>Automatic Success</strong>!<br>
          &bull; <strong>Original Roll (d20 = ${origNat}):</strong> Total <strong>${origTotal}</strong> &rarr; <strong class="coria-hl-success">AUTOMATIC SUCCESS!</strong>
        `,
        flags: { isD20ReactionCard: true }
      });

      await CoriaRollLedger.applyRollIntervention({
        rollMessageId: originMsgId,
        cardMessageId: cardMsgId,
        targetKey,
        rollerActorId: resolvedRollerActorId || targetActor.id,
        forceSuccess: true,
        sourceLabel: "Legendary Resistance"
      });
      return;
    }
  }

  static async applyShieldReactionEffect(caster, ctx = {}) {
    if (!caster) return;
    const {
      oldAc = Number(caster.system?.attributes?.ac?.value ?? 10),
      rollerName = "Attacker",
      origNat = 10,
      origTotal = 10,
      originMsgId = "",
      cardMsgId = "",
      targetKey = "",
      resolvedRollerActorId = "",
      spellImg = ""
    } = ctx;

    await AltarionAutomationManager.applyOrUpdateStatusEffect(caster, {
      statusId: "shield-spell-ac",
      name: "Shield (+5 AC)",
      img: spellImg || "icons/magic/defensive/shield-barrier-glowing-triangle-blue.webp",
      description: `<p><strong>Shield:</strong> Until the start of your next turn, you have a <strong>+5 bonus to AC</strong>, including against the triggering attack, and you take no damage from <em>Magic Missile</em>.</p>`,
      changes: [
        {
          key: "system.attributes.ac.bonus",
          mode: CONST.ACTIVE_EFFECT_MODES.ADD,
          value: "+5",
          priority: 20
        }
      ],
      durationRounds: 1,
      durationSeconds: 6,
      expiresAtStartOfTurnOf: caster.id,
      extraFlags: { isShieldSpellEffect: true }
    });

    const newAc = oldAc + 5;
    const blockedAttack = origNat !== 20 && origTotal < newAc;

    await AltarionAutomationManager.sendMinimalistFeatureCard(caster, {
      icon: "fa-shield-alt",
      title: `Shield — Arcane Barrier (+5 AC → ${newAc} AC)!`,
      bodyHtml: `
        <strong>${foundry.utils.escapeHTML(caster.name)}</strong> cast <strong>Shield</strong> as a Reaction against <strong>${foundry.utils.escapeHTML(rollerName)}</strong>'s attack (Attack Roll: <strong>${origTotal}</strong>)!<br>
        &bull; <strong>Armor Class:</strong> <strong>${oldAc}</strong> &rarr; <strong>${newAc} AC</strong> <em>(+5 AC until start of next turn)</em><br>
        &bull; <strong>Outcome:</strong> <strong class="${blockedAttack ? "coria-hl-success" : "coria-hl-failure"}">${
          blockedAttack
            ? `The attack (${origTotal}) was BLOCKED by Shield!`
            : `${foundry.utils.escapeHTML(caster.name)}'s AC increased to ${newAc} until the start of their next turn!`
        }</strong>
      `,
      flags: { isD20ReactionCard: true }
    });

    await CoriaRollLedger.applyRollIntervention({
      rollMessageId: originMsgId,
      cardMessageId: cardMsgId,
      targetKey,
      rollerActorId: resolvedRollerActorId,
      shieldAcBonus: 5,
      shieldDefenderId: caster.id,
      shieldDefenderName: caster.name,
      sourceLabel: `Shield (+5 AC — ${caster.name})`
    });
  }

  static async applySilveryBarbsReactionEffect(caster, ctx = {}) {
    if (!caster) return;
    const {
      rollerName = "Creature",
      origNat = 10,
      origTotal = 10,
      flatBonus = 0,
      bonusStr = "+ 0",
      originMsgId = "",
      cardMsgId = "",
      targetKey = "",
      resolvedRollerActorId = "",
      spellImg = ""
    } = ctx;

    const rerollD20 = await new Roll("1d20").evaluate();
    if (game.dice3d) {
      try {
        await game.dice3d.showForRoll(rerollD20, game.user, true);
      } catch (_) {}
    }
    const newNat = Number(rerollD20.total || 10);
    const newTotal = newNat + flatBonus;
    const finalTotal = Math.min(origTotal, newTotal);
    const finalNat = finalTotal === newTotal ? newNat : origNat;

    const sbChatChannel =
      globalThis.CoriaChatTabs?.getChannelForOriginRoll?.({
        originMsgId,
        cardMsgId,
        defaultChannel: "combat"
      }) || "combat";

    await AltarionAutomationManager.sendMinimalistFeatureCard(caster, {
      icon: "fa-feather-alt",
      title: `Silvery Barbs — Silver Distraction (${finalTotal})!`,
      bodyHtml: `
        <strong>${foundry.utils.escapeHTML(caster.name)}</strong> cast <strong>Silvery Barbs</strong> as a Reaction, forcing <strong>${foundry.utils.escapeHTML(rollerName)}</strong> to reroll the d20 and use the <strong>lower result</strong>!<br>
        &bull; <strong>Original Roll (d20 = ${origNat}):</strong> ${origNat} ${bonusStr} = <strong>${origTotal}</strong><br>
        &bull; <strong>New Roll (d20 = ${newNat}):</strong> ${newNat} ${bonusStr} = <strong>${newTotal}</strong><br>
        &bull; <strong>Lowest Result Applied (d20 = ${finalNat}):</strong> <strong>${finalTotal}</strong>
      `,
      flags: {
        isD20ReactionCard: true,
        chatChannel: sbChatChannel,
        originRollMessageId: originMsgId
      }
    });

    await CoriaRollLedger.applyRollIntervention({
      rollMessageId: originMsgId,
      cardMessageId: cardMsgId,
      targetKey,
      rollerActorId: resolvedRollerActorId,
      newTotal: finalTotal,
      newNat: finalNat,
      sourceLabel: `Silvery Barbs (${caster.name})`
    });

    await this.openSilveryBarbsAdvantageTargetDialog(caster, spellImg || null);
  }

  /**
   * Called automatically by `CoriaRollLedger.evaluateIntuitiveArcanumLedger` when an Intuitive Arcanum
   * check triggered from a reaction button (`Shield`, `Silvery Barbs`, or `Absorb Elements`) succeeds
   * (either on the initial Arcana check OR after being turned into a success via Portent / Lucky / Paths of Destiny!).
   */
  static async executeDeferredIntuitiveReaction(actor, reactionContext, slotLevel = 1) {
    if (!actor || !reactionContext) return;
    if (reactionContext.kind === "d20-reaction") {
      if (reactionContext.reactType === "shield") {
        await this.applyShieldReactionEffect(actor, reactionContext);
      } else if (reactionContext.reactType === "silvery-barbs") {
        await this.applySilveryBarbsReactionEffect(actor, reactionContext);
      }
    } else if (reactionContext.kind === "damage-reaction") {
      if (reactionContext.reactType === "absorb-elements") {
        await CoriaRollLedger.applyDamageReactionModification({
          reactType: "absorb-elements",
          damageMessageId: reactionContext.damageMessageId,
          casterId: reactionContext.casterId || actor.id,
          victimId: reactionContext.victimId || actor.id,
          elementType: reactionContext.elementType || "fire",
          slotLevel: Math.max(1, Number(slotLevel || 1))
        });
      }
    }
  }

  /**
   * Helper: Get Flinn's current Wizard level and Cleric level
   */
  static getLevels(actor) {
    let wizardLevel = 0;
    let clericLevel = 0;
    for (const item of actor?.items || []) {
      if (item.type !== "class") continue;
      const ident = (item.system?.identifier || "").toLowerCase();
      const name = (item.name || "").toLowerCase();
      const lvl = Number(item.system?.levels || 0);
      if (ident === "wizard" || name === "wizard") {
        wizardLevel += lvl;
      } else if (ident === "cleric" || name === "cleric") {
        clericLevel += lvl;
      }
    }
    return { wizardLevel, clericLevel };
  }

  /**
   * Flinn's effective caster level = Wizard Level + floor(Cleric Level / 2)
   */
  static getEffectiveCasterLevel(actor) {
    const { wizardLevel, clericLevel } = this.getLevels(actor);
    return Math.max(0, wizardLevel + Math.floor(clericLevel / 2));
  }

  /**
   * Maximum spell slot level available to Flinn (`1..9`) based on effectiveCasterLevel.
   */
  static getMaxSpellSlotLevel(actor) {
    const effectiveCasterLevel = this.getEffectiveCasterLevel(actor);
    if (effectiveCasterLevel <= 0) return 0;
    return Math.min(9, Math.ceil(effectiveCasterLevel / 2));
  }

  /**
   * Get Flinn's current Intuitive Arcanum DC (default 10; +2 on each success; resets to 10 on failure).
   */
  static getIntuitiveArcanumDC(actor) {
    const raw = Number(actor?.flags?.[MODULE_ID]?.intuitiveArcanumDC ?? 10);
    return Number.isFinite(raw) && raw >= 10 ? Math.floor(raw) : 10;
  }

  static async setIntuitiveArcanumDC(actor, newDc) {
    if (!actor) return;
    const clamped = Math.max(10, Math.floor(Number(newDc) || 10));
    await actor.update({ [`flags.${MODULE_ID}.intuitiveArcanumDC`]: clamped });
    if (actor.sheet?.rendered) actor.sheet.render(false);
  }

  /**
   * Enforce Flinn's custom spellcasting progression during dnd5e slot preparation hooks:
   * - Leveled slots (`spell` / `leveled` / `slot`) equal `wizardLevel + Math.floor(clericLevel / 2)`
   * - Pact Magic slots (`pact`) are disabled (`0`).
   */
  static onPrepareSpellSlots(spells, actor, progression) {
    if (!actor || !progression) return;
    const effectiveCasterLevel = this.getEffectiveCasterLevel(actor);

    if (effectiveCasterLevel > 0) {
      if ("spell" in progression || typeof progression.spell === "number") {
        progression.spell = effectiveCasterLevel;
      }
      if ("leveled" in progression || typeof progression.leveled === "number") {
        progression.leveled = effectiveCasterLevel;
      }
      if ("slot" in progression || typeof progression.slot === "number") {
        progression.slot = effectiveCasterLevel;
      }
    }
    progression.pact = 0;
  }

  /**
   * Ensure Flinn's Leveled Spell Slots (`Wizard + floor(Cleric / 2)`) are exact after prepareDerivedData,
   * and Pact Magic slots are zeroed.
   */
  static onPostPrepareDerivedData(charData, actor) {
    const effectiveCasterLevel = this.getEffectiveCasterLevel(actor);
    if (!charData.spells) return;

    const spellModel = CONFIG.DND5E?.spellcasting?.spell;
    if (effectiveCasterLevel > 0 && spellModel?.prepareSlots) {
      spellModel.prepareSlots(charData.spells, actor, {
        spell: effectiveCasterLevel,
        leveled: effectiveCasterLevel
      });
    }

    if (charData.spells.pact) {
      charData.spells.pact.max = 0;
      charData.spells.pact.value = 0;
      charData.spells.pact.level = 0;
    }
  }

  /**
   * Build Flinn's custom feature: "Intuitive Arcanum" (Fortune's Knowledge + Accidental Casting).
   */
  static buildIntuitiveArcanumFeatureData(wizardClassItemId = null) {
    const img = "modules/altarion-aitusa/flinn_icons/intuitive-arcanum.jpg";
    return {
      name: "Intuitive Arcanum",
      type: "feat",
      img,
      system: {
        description: {
          value: `<div class="rd__b  rd__b--2"><p>Your connection to the Weave is governed more by chaotic luck and sudden flashes of insight than by rigid study, granting you the following benefits:</p><p><strong>Fortune's Knowledge:</strong> You gain proficiency in the Arcana skill. If you are already proficient in the skill, you add double your proficiency bonus to checks you make with it.</p><p><strong>Accidental Casting:</strong> You can attempt to cast a wizard spell from your spellbook even if you do not have it prepared, provided you have an unused spell slot of the appropriate level to cast it. To do so, you must use the normal casting time of the spell and make an Intelligence (Arcana) check. The base DC for this check is <strong>10</strong>, and the DC increases by <strong>2</strong> for each successful check you make with this feature.</p><ul><li><strong>On a Success:</strong> You successfully pull the magic together at the last second. You cast the spell as normal, expending the spell slot.</li><li><strong>On a Failure:</strong> The magic slips through your fingers and backfires. You fail to cast the intended spell, the spell slot is expended, and you must immediately roll on the <strong>Wild Magic Surge</strong> table. The magical surge is centered on you, and the DC for this feature resets to 10.</li></ul></div>`
        },
        source: {
          book: "Homebrew",
          page: "1",
          custom: "Flinn — Intuitive Arcanum",
          rules: "2014"
        },
        type: {
          value: "class",
          subtype: ""
        },
        requirements: "Wizard 1 (Flinn)",
        uses: { spent: 0, max: "", recovery: [] },
        activities: {
          intuitiveArcUtil: {
            _id: "intuitiveArcUtil",
            type: "utility",
            name: "Accidental Casting (Roll Arcana Check)",
            activation: {
              type: "special",
              value: null,
              condition: "Normal casting time of the unprepared Wizard spell",
              override: false
            },
            consumption: {
              targets: [],
              scaling: { allowed: false, max: "" },
              spellSlot: false
            },
            description: {
              chatFlavor:
                "Attempt to cast an unprepared Wizard spell from your spellbook by rolling an Intelligence (Arcana) check against your current Intuitive Arcanum DC."
            },
            duration: {
              concentration: false,
              value: "",
              units: "inst",
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
            roll: {
              prompt: false,
              visible: false,
              name: "",
              formula: ""
            },
            sort: 0
          }
        }
      },
      flags: {
        ...(wizardClassItemId
          ? {
              dnd5e: {
                advancementOrigin: wizardClassItemId,
                advancementRoot: wizardClassItemId
              }
            }
          : {}),
        [MODULE_ID]: {
          isPrimaryClassItem: true,
          isIntuitiveArcanumFeature: true,
          originCategory: "class",
          levelRequired: 1,
          featureKey: "flinn:class:intuitive-arcanum:1",
          syncSchemaVersion: 3
        }
      }
    };
  }

  /**
   * Build Flinn's 2nd-level Divination spell: "Paths of Destiny"
   * (1/Long Rest Free Cast without a spell slot + normal Spell Slot casting; Reaction d20 Twist within 60 ft).
   */
  static buildPathsOfDestinySpellData() {
    const img = "modules/altarion-aitusa/flinn_icons/paths-of-destiny.jpg";
    return {
      name: "Paths of Destiny",
      type: "spell",
      img,
      system: {
        description: {
          value: `<div class="rd__b  rd__b--2"><p>You open your mind to the diverging paths of fate, granting you temporary mastery over probability. After you cast this spell, as a <strong>reaction</strong> whenever a creature you can see within <strong>60 feet</strong> of you makes an <strong>attack roll, an ability check, or a saving throw</strong> during the spell's duration, you can twist destiny.</p><p>You force an additional <strong>d20</strong> to be rolled. You can choose to use this reaction after the creature makes its original roll, but before the DM determines whether the attack roll, ability check, or saving throw succeeds or fails. You then choose whether the creature uses its original d20 roll or the additional d20 you just forced to be rolled.</p><hr><p><em><strong>Innate Mastery:</strong> You can cast this spell once without expending a spell slot, regaining the ability to do so when you finish a long rest. You can also cast it normally using spell slots of 2nd level or higher.</em></p></div>`
        },
        source: {
          book: "Homebrew",
          page: "1",
          custom: "Flinn — Divination Mastery",
          rules: "2014"
        },
        level: 2,
        school: "div",
        properties: ["vocal", "somatic", "concentration"],
        materials: {
          value: "",
          consumed: false,
          cost: 0,
          supply: 0
        },
        method: "spell",
        prepared: 1,
        sourceItem: "class:wizard",
        uses: {
          spent: 0,
          max: "1",
          recovery: [{ period: "lr", type: "recoverAll" }]
        },
        activation: {
          type: "bonus",
          value: 1,
          condition: ""
        },
        duration: {
          value: "1",
          units: "minute"
        },
        range: {
          value: null,
          units: "self"
        },
        target: {
          template: {
            count: "",
            contiguous: false,
            type: "radius",
            size: "60",
            width: "",
            height: "",
            units: "ft"
          },
          affects: { count: "", type: "creature", choice: false, special: "Creatures you can see within 60 feet" }
        },
        activities: {
          pathsDestinyFree: {
            _id: "pathsDestinyFree",
            type: "utility",
            name: "Cast (Free 1/Long Rest — No Spell Slot)",
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
                  target: "",
                  value: "1",
                  scaling: { mode: "", formula: "" }
                }
              ],
              scaling: { allowed: false, max: "" },
              spellSlot: false
            },
            description: {
              chatFlavor:
                "Cast Paths of Destiny (Concentration, up to 1 minute) without expending a spell slot (1/Long Rest). Use your Reaction in chat whenever a creature within 60 ft makes an attack roll, ability check, or saving throw to roll an extra d20 and choose which result applies!"
            },
            duration: {
              concentration: true,
              value: "1",
              units: "minute",
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
              template: { count: "", contiguous: false, type: "radius", size: "60", width: "", height: "", units: "ft" },
              affects: { count: "", type: "creature", choice: false, special: "" },
              prompt: false,
              override: false
            },
            uses: { spent: 0, max: "", recovery: [] },
            roll: {
              prompt: false,
              visible: false,
              name: "",
              formula: ""
            },
            sort: 0
          },
          pathsDestinySlot: {
            _id: "pathsDestinySlot",
            type: "utility",
            name: "Cast with Spell Slot (2nd+ Level)",
            activation: {
              type: "bonus",
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
                "Cast Paths of Destiny using a 2nd+ level spell slot (Concentration, up to 1 minute). Use your Reaction in chat whenever a creature within 60 ft makes an attack roll, ability check, or saving throw to roll an extra d20 and choose which result applies!"
            },
            duration: {
              concentration: true,
              value: "1",
              units: "minute",
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
              template: { count: "", contiguous: false, type: "radius", size: "60", width: "", height: "", units: "ft" },
              affects: { count: "", type: "creature", choice: false, special: "" },
              prompt: false,
              override: false
            },
            uses: { spent: 0, max: "", recovery: [] },
            roll: {
              prompt: false,
              visible: false,
              name: "",
              formula: ""
            },
            sort: 100
          }
        }
      },
      flags: {
        plutonium: {
          page: "spells.html",
          source: "PHB",
          hash: "paths_of_destiny_flinn",
          isDirectImport: true,
          isStandardDragDrop: true
        },
        [MODULE_ID]: {
          isPrimaryClassItem: true,
          isPathsOfDestinySpell: true,
          flinnSpellOrigin: "wizard",
          featureKey: "flinn:spell:paths-of-destiny:2",
          syncSchemaVersion: 3
        }
      }
    };
  }

  /**
   * Synchronize Flinn's "Paths of Destiny" spell and all PHB Cleric spells up to `maxSlotLevel`,
   * while tagging every spell on Flinn's sheet as either `"cleric"` (Yellow) or `"wizard"` (Blue).
   */
  static async syncFlinnSpellsAndClericList(actor, { wizardLevel = 4, clericLevel = 2 } = {}) {
    if (!actor) return;

    const effectiveCasterLevel = Math.max(1, wizardLevel + Math.floor(clericLevel / 2));
    const maxSlotLevel = Math.min(9, Math.ceil(effectiveCasterLevel / 2));

    // 1. Sync "Paths of Destiny" (Wizard 2nd-level spell)
    const pathsData = this.buildPathsOfDestinySpellData();
    const existingPaths = actor.items.filter(
      i =>
        i.type === "spell" &&
        (i.flags?.[MODULE_ID]?.isPathsOfDestinySpell || i.name?.trim().toLowerCase() === "paths of destiny")
    );
    if (existingPaths.length > 1) {
      await actor.deleteEmbeddedDocuments("Item", existingPaths.slice(1).map(i => i.id));
    }
    const pathsItem = existingPaths[0] || null;
    if (!pathsItem) {
      await actor.createEmbeddedDocuments("Item", [pathsData]);
    } else if (
      Number(pathsItem.flags?.[MODULE_ID]?.syncSchemaVersion || 0) < 3 ||
      pathsItem.img !== pathsData.img ||
      pathsItem.system?.sourceItem !== "class:wizard"
    ) {
      await pathsItem.update({
        name: pathsData.name,
        img: pathsData.img,
        "system.description": pathsData.system.description,
        "system.source": pathsData.system.source,
        "system.level": pathsData.system.level,
        "system.school": pathsData.system.school,
        "system.properties": pathsData.system.properties,
        "system.sourceItem": "class:wizard",
        "system.uses": pathsData.system.uses,
        "system.activation": pathsData.system.activation,
        "system.duration": pathsData.system.duration,
        "system.range": pathsData.system.range,
        "system.target": pathsData.system.target,
        "system.activities": pathsData.system.activities,
        flags: foundry.utils.mergeObject(pathsItem.toObject().flags || {}, pathsData.flags || {})
      });
    }

    // 2. Knowledge Domain Spells (always prepared Cleric spells) — STRICTLY gated by Cleric level (1 / 3 / 5 / 7 / 9),
    //    NOT by combined spell slot level!
    const KNOWLEDGE_DOMAIN_SPELLS = [
      { name: "Command", level: 1, minClericLevel: 1, onBaseClericList: true },
      { name: "Identify", level: 1, minClericLevel: 1, onBaseClericList: false },
      { name: "Augury", level: 2, minClericLevel: 3, onBaseClericList: true },
      { name: "Suggestion", level: 2, minClericLevel: 3, onBaseClericList: false },
      { name: "Nondetection", level: 3, minClericLevel: 5, onBaseClericList: false },
      { name: "Speak with Dead", level: 3, minClericLevel: 5, onBaseClericList: true },
      { name: "Arcane Eye", level: 4, minClericLevel: 7, onBaseClericList: false },
      { name: "Confusion", level: 4, minClericLevel: 7, onBaseClericList: false },
      { name: "Legend Lore", level: 5, minClericLevel: 9, onBaseClericList: true },
      { name: "Scrying", level: 5, minClericLevel: 9, onBaseClericList: true }
    ];

    const domainSpellNames = new Set();
    const nonClericDomainNamesAll = new Set();
    for (const def of KNOWLEDGE_DOMAIN_SPELLS) {
      const lower = def.name.toLowerCase();
      if (!def.onBaseClericList) nonClericDomainNamesAll.add(lower);
      if (clericLevel >= def.minClericLevel) {
        domainSpellNames.add(lower);
      }
    }

    // 3. Collect all desired Cleric spells for levels 1..maxSlotLevel
    const desiredClericSpells = new Map(); // lowerName -> { name, level, isDomain }
    for (let lvl = 1; lvl <= maxSlotLevel; lvl++) {
      const names = this.PHB_CLERIC_SPELLS_BY_LEVEL[lvl] || [];
      for (const name of names) {
        const lower = name.trim().toLowerCase();
        desiredClericSpells.set(lower, {
          name,
          level: lvl,
          isDomain: domainSpellNames.has(lower)
        });
      }
    }
    // Include Knowledge Domain spells that aren't on the base Cleric list ONLY once Flinn reaches their Cleric level (1/3/5/7/9)
    for (const def of KNOWLEDGE_DOMAIN_SPELLS) {
      if (def.onBaseClericList) continue;
      const lower = def.name.toLowerCase();
      if (clericLevel >= def.minClericLevel && !desiredClericSpells.has(lower)) {
        desiredClericSpells.set(lower, { name: def.name, level: def.level, isDomain: true });
      }
    }

    // 4. Prune auto-imported Cleric spells above maxSlotLevel OR out-of-tier non-Cleric Knowledge Domain spells
    //    (e.g. Nondetection if Cleric < 5, Suggestion if Cleric < 3)
    const excessClericSpellIds = actor.items
      .filter(i => {
        if (i.type !== "spell" || !i.flags?.[MODULE_ID]?.isClericSpellListImport) return false;
        const lower = i.name.trim().toLowerCase();
        if (nonClericDomainNamesAll.has(lower) && !domainSpellNames.has(lower)) {
          return true;
        }
        return Number(i.system?.level || 0) > maxSlotLevel && !domainSpellNames.has(lower);
      })
      .map(i => i.id);
    if (excessClericSpellIds.length > 0) {
      await actor.deleteEmbeddedDocuments("Item", excessClericSpellIds);
    }

    // 5. Batch-import any missing Cleric spells for levels 1..maxSlotLevel (and unlocked Domain Spells)
    const existingSpellsByName = new Map();
    for (const sp of actor.items) {
      if (sp.type !== "spell") continue;
      const lower = sp.name.trim().toLowerCase();
      if (!existingSpellsByName.has(lower)) {
        existingSpellsByName.set(lower, sp);
      }
    }

    const spellsToCreate = [];
    for (const [lower, info] of desiredClericSpells.entries()) {
      if (existingSpellsByName.has(lower)) continue;
      const spellDoc = await OtherPlayersBase.pConvertSpell({
        name: info.name,
        source: "PHB",
        actor
      });
      if (spellDoc) {
        spellDoc.system = spellDoc.system || {};
        spellDoc.system.method = "spell";
        spellDoc.system.ability = "int";
        spellDoc.system.prepared = info.isDomain ? 2 : 0;
        spellDoc.system.sourceItem = "class:cleric";
        spellDoc.flags = foundry.utils.mergeObject(spellDoc.flags || {}, {
          [MODULE_ID]: {
            isGrantedSpell: true,
            isClericSpellListImport: true,
            flinnSpellOrigin: "cleric",
            isDomainSpell: info.isDomain,
            featureKey: `flinn:cleric-spell:${lower}:${info.level}`,
            syncSchemaVersion: 4
          }
        });
        spellsToCreate.push(spellDoc);
      }
    }

    if (spellsToCreate.length > 0) {
      await actor.createEmbeddedDocuments("Item", spellsToCreate);
    }

    // 6. Ensure all existing spells on Flinn have an explicit `flinnSpellOrigin` ("cleric" or "wizard"),
    //    matching `system.sourceItem`, Cleric spells use Intelligence (`"int"`), and Domain Spell status
    //    strictly reflects unlocked Cleric level (1 / 3 / 5 / 7 / 9).
    const allClericSpellNamesLower = new Set(
      Object.values(this.PHB_CLERIC_SPELLS_BY_LEVEL)
        .flat()
        .map(n => n.toLowerCase())
    );
    for (const dName of domainSpellNames) allClericSpellNamesLower.add(dName);

    const spellUpdates = [];
    for (const sp of actor.items) {
      if (sp.type !== "spell") continue;
      const lower = sp.name.trim().toLowerCase();
      const curOrigin = sp.flags?.[MODULE_ID]?.flinnSpellOrigin;
      const curSourceItem = sp.system?.sourceItem || "";
      const curAbility = sp.system?.ability || "";
      const wasDomainFlag = Boolean(sp.flags?.[MODULE_ID]?.isDomainSpell);

      // Determine whether this spell belongs to Cleric or Wizard
      let targetOrigin = curOrigin;
      if (!targetOrigin) {
        if (
          sp.flags?.[MODULE_ID]?.isPathsOfDestinySpell ||
          lower === "paths of destiny" ||
          curSourceItem === "class:wizard"
        ) {
          targetOrigin = "wizard";
        } else if (
          sp.flags?.[MODULE_ID]?.isClericSpellListImport ||
          curSourceItem === "class:cleric" ||
          allClericSpellNamesLower.has(lower) ||
          lower === "light"
        ) {
          targetOrigin = "cleric";
        } else {
          targetOrigin = "wizard";
        }
      }

      const targetSourceItem = targetOrigin === "cleric" ? "class:cleric" : "class:wizard";
      const isDom = domainSpellNames.has(lower) && targetOrigin === "cleric";
      const lostDomainStatus = wasDomainFlag && !isDom;
      const needsAbilityFix = targetOrigin === "cleric" && curAbility !== "int";

      if (
        curOrigin !== targetOrigin ||
        curSourceItem !== targetSourceItem ||
        needsAbilityFix ||
        (isDom && (sp.system?.prepared !== 2 || !wasDomainFlag)) ||
        lostDomainStatus
      ) {
        const patch = {
          _id: sp.id,
          "system.sourceItem": targetSourceItem,
          [`flags.${MODULE_ID}.flinnSpellOrigin`]: targetOrigin
        };
        if (needsAbilityFix) {
          patch["system.ability"] = "int";
        }
        if (isDom) {
          patch["system.prepared"] = 2;
          patch[`flags.${MODULE_ID}.isDomainSpell`] = true;
        } else if (lostDomainStatus) {
          patch[`flags.${MODULE_ID}.isDomainSpell`] = false;
          if (Number(sp.system?.prepared) === 2) {
            patch["system.prepared"] = 0;
          }
        }
        spellUpdates.push(patch);
      }
    }

    if (spellUpdates.length > 0) {
      await actor.updateEmbeddedDocuments("Item", spellUpdates);
    }

    await this.ensureSpiritualWeaponConfigured(actor);
    await this.ensureAidSpellConfigured(actor);
  }

  static configureSpiritualWeaponDoc(doc) {
    if (!doc) return doc;
    doc.img = "modules/altarion-aitusa/flinn_icons/spiritual-weapon-tophat.jpg";
    doc.system = doc.system || {};
    doc.system.target = {
      template: { count: "", contiguous: false, type: "", size: "", width: "", height: "", units: "ft" },
      affects: { count: "", type: "", choice: false, special: "" }
    };
    doc.system.activities = {
      spiritualWpnCst1: {
        _id: "spiritualWpnCst1",
        type: "utility",
        name: "Summon Spiritual Weapon (60 ft, 1 Minute)",
        activation: {
          type: "bonus",
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
            "You create a floating, spectral weapon (Flinn's Top Hat) within range that lasts for the duration (1 minute, no concentration). Click a space on the map to place the Spiritual Weapon token. Double-click the summoned Spiritual Weapon token on the map to make a melee spell attack (1d8 + spellcasting ability modifier Force damage; +1d8 per two slot levels above 2nd)."
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
      [MODULE_ID]: {
        isSpiritualWeaponSpell: true,
        syncSchemaVersion: 4
      }
    });
    return doc;
  }

  static async ensureSpiritualWeaponConfigured(actor) {
    if (!actor || !actor.isOwner) return null;
    const item = actor.items.find(
      i =>
        i.type === "spell" &&
        (i.flags?.[MODULE_ID]?.isSpiritualWeaponSpell ||
          i.name?.trim().toLowerCase() === "spiritual weapon")
    );
    if (!item) return null;
    if (
      Number(item.flags?.[MODULE_ID]?.syncSchemaVersion || 0) >= 4 &&
      item.img === "modules/altarion-aitusa/flinn_icons/spiritual-weapon-tophat.jpg" &&
      !item.system?.target?.template?.type
    ) {
      return item;
    }
    const stub = this.configureSpiritualWeaponDoc(item.toObject());
    const actPatch = foundry.utils.deepClone(stub.system.activities);
    const oldActs = item.toObject().system?.activities || {};
    for (const oldKey of Object.keys(oldActs)) {
      if (!(oldKey in actPatch)) {
        actPatch[`-=${oldKey}`] = null;
      }
    }
    await item.update({
      img: stub.img,
      "system.target": stub.system.target,
      "system.activities": actPatch,
      [`flags.${MODULE_ID}.isSpiritualWeaponSpell`]: true,
      [`flags.${MODULE_ID}.syncSchemaVersion`]: 4
    });
    return item;
  }

  /**
   * Build / normalize our automated `Aid` spell document (2nd-level Abjuration, Cleric / INT on Flinn)
   * with a single clean 16-char `utility` activity (`aidCastUtil00001`) and ZERO healing-roll activities
   * or raw compendium ActiveEffects, so casting Aid ALWAYS triggers our automated 3-target dialog & +Max/Current HP buff.
   */
  static configureAidSpellDoc(doc = null, { preservePrepared = null } = {}) {
    const base = doc ? foundry.utils.deepClone(doc) : { name: "Aid", type: "spell", system: {}, flags: {} };
    base.name = "Aid";
    base.type = "spell";
    base.img =
      base.img && !String(base.img).includes("mystery-man")
        ? base.img
        : "icons/magic/life/heart-cross-strong-flame-blue.webp";
    base.effects = [];
    base.system = base.system || {};
    base.system.level = 2;
    base.system.school = "abj";
    base.system.method = "spell";
    base.system.ability = "int";
    base.system.sourceItem = "class:cleric";
    if (preservePrepared !== null && preservePrepared !== undefined) {
      base.system.prepared = Number(preservePrepared);
    }
    base.system.properties = ["vocal", "somatic", "material"];
    base.system.materials = {
      value: "a tiny strip of white cloth",
      consumed: false,
      cost: 0,
      supply: 0
    };
    base.system.activation = { type: "action", value: 1, condition: "" };
    base.system.duration = { value: "8", units: "hour", concentration: false };
    base.system.range = { value: 30, units: "ft", special: "" };
    base.system.target = {
      template: { count: "", contiguous: false, type: "", size: "", width: "", height: "", units: "ft" },
      affects: { count: "3", type: "creature", choice: false, special: "" }
    };
    if (!String(base.system.description?.value || "").trim()) {
      base.system.description = {
        value:
          "<p>Your spell bolsters your allies with toughness and resolve. Choose up to three creatures within range. Each target's hit point maximum and current hit points increase by 5 for the duration (8 hours).</p><p><strong>At Higher Levels.</strong> When you cast this spell using a spell slot of 3rd level or higher, a target's hit points increase by an additional 5 for each slot level above 2nd.</p>"
      };
    }
    base.system.activities = {
      aidCastUtil00001: {
        _id: "aidCastUtil00001",
        type: "utility",
        name: "Cast Aid (+5 Max & Current HP, 8 Hours)",
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
            "Choose up to 3 creatures within 30 feet to gain +5 Maximum HP and +5 Current HP (+5 per slot level above 2nd) for 8 hours."
        },
        duration: {
          concentration: false,
          value: "8",
          units: "hour",
          special: "",
          override: false
        },
        effects: [],
        range: {
          value: 30,
          units: "ft",
          special: "",
          override: false
        },
        target: {
          template: { count: "", contiguous: false, type: "", size: "", width: "", height: "", units: "ft" },
          affects: { count: "3", type: "creature", choice: false, special: "" },
          prompt: false,
          override: false
        },
        uses: { spent: 0, max: "", recovery: [] },
        roll: { prompt: false, visible: false, name: "", formula: "" },
        sort: 0
      }
    };
    base.flags = foundry.utils.mergeObject(base.flags || {}, {
      [MODULE_ID]: {
        isAutomatedAidSpell: true,
        aidSchemaVersion: 2,
        flinnSpellOrigin: "cleric",
        isClericSpellListImport: true,
        isSecondaryClassItem: true
      }
    });
    return base;
  }

  /**
   * Inspect Flinn's sheet for any `Aid` (or `Ajuda`) spell. If it differs from our automated version
   * (e.g. still has a legacy `heal` activity, raw compendium ActiveEffects, or older schema),
   * replace its activities/effects/configuration in-place (preserving Prepared state) so Aid automation works cleanly.
   */
  static async ensureAidSpellConfigured(actor) {
    if (!actor || !actor.isOwner || isIgnoredBackupActor(actor)) return null;
    const aidMatches = actor.items.filter(i => {
      if (i.type !== "spell") return false;
      const n = String(i.name || "").trim().toLowerCase();
      return (
        Boolean(i.flags?.[MODULE_ID]?.isAutomatedAidSpell) ||
        n === "aid" ||
        n === "ajuda" ||
        n.startsWith("aid (") ||
        n.startsWith("aid -")
      );
    });
    if (aidMatches.length === 0) return null;

    // If duplicates exist, keep the prepared one (or first) and remove extras
    aidMatches.sort((a, b) => Number(b.system?.prepared || 0) - Number(a.system?.prepared || 0));
    const primaryItem = aidMatches[0];
    if (aidMatches.length > 1) {
      await actor.deleteEmbeddedDocuments(
        "Item",
        aidMatches.slice(1).map(i => i.id)
      );
    }

    const rawObj = primaryItem.toObject();
    const rawActs = rawObj.system?.activities || {};
    const actKeys = Object.keys(rawActs);
    const hasOnlyAutomatedUtility =
      actKeys.length === 1 &&
      actKeys[0] === "aidCastUtil00001" &&
      rawActs.aidCastUtil00001?.type === "utility";
    const hasRawEffects = (primaryItem.effects?.size || 0) > 0;
    const isAlreadyClean =
      primaryItem.name === "Aid" &&
      Boolean(primaryItem.flags?.[MODULE_ID]?.isAutomatedAidSpell) &&
      Number(primaryItem.flags?.[MODULE_ID]?.aidSchemaVersion || 0) >= 2 &&
      hasOnlyAutomatedUtility &&
      !hasRawEffects &&
      primaryItem.system?.ability === "int" &&
      primaryItem.system?.sourceItem === "class:cleric";

    if (isAlreadyClean) return primaryItem;

    // Delete any raw compendium ActiveEffects embedded on the Aid spell item
    if (hasRawEffects) {
      const rawEffIds = Array.from(primaryItem.effects || []).map(e => e.id).filter(Boolean);
      if (rawEffIds.length > 0) {
        await primaryItem.deleteEmbeddedDocuments("ActiveEffect", rawEffIds);
      }
    }

    const preservedPrepared = Number(primaryItem.system?.prepared ?? 0);
    const stub = this.configureAidSpellDoc(rawObj, { preservePrepared: preservedPrepared });
    const actPatch = foundry.utils.deepClone(stub.system.activities);
    for (const oldKey of actKeys) {
      if (!(oldKey in actPatch)) {
        actPatch[`-=${oldKey}`] = null;
      }
    }

    await primaryItem.update({
      name: stub.name,
      img: stub.img,
      "system.level": stub.system.level,
      "system.school": stub.system.school,
      "system.method": stub.system.method,
      "system.ability": stub.system.ability,
      "system.sourceItem": stub.system.sourceItem,
      "system.prepared": preservedPrepared,
      "system.properties": stub.system.properties,
      "system.materials": stub.system.materials,
      "system.activation": stub.system.activation,
      "system.duration": stub.system.duration,
      "system.range": stub.system.range,
      "system.target": stub.system.target,
      "system.description.value": stub.system.description.value,
      "system.activities": actPatch,
      [`flags.${MODULE_ID}.isAutomatedAidSpell`]: true,
      [`flags.${MODULE_ID}.aidSchemaVersion`]: 2,
      [`flags.${MODULE_ID}.flinnSpellOrigin`]: "cleric",
      [`flags.${MODULE_ID}.isClericSpellListImport`]: true,
      [`flags.${MODULE_ID}.isSecondaryClassItem`]: true
    });
    return primaryItem;
  }

  /**
   * Configure "Channel Divinity: Harness Divine Power" (Tasha's Cauldron of Everything, Cleric Level 2)
   * with clean uses (1 at Cleric 2, 2 at Cleric 6, 3 at Cleric 18; Long Rest recovery) and a 16-char utility activity.
   */
  static configureHarnessDivinePowerDoc(doc = null, existingItem = null) {
    const existingSpent = Number(existingItem?.system?.uses?.spent ?? doc?.system?.uses?.spent ?? 0);
    const out = doc
      ? foundry.utils.deepClone(doc)
      : {
          name: "Channel Divinity: Harness Divine Power",
          type: "feat",
          img: "icons/magic/holy/barrier-shield-winged-blue.webp",
          system: {
            description: {
              value: `<div class="rd__b rd__b--2"><p><em>2nd-level cleric optional class feature (Tasha's Cauldron of Everything)</em></p><p>You can expend a use of your Channel Divinity to fuel your spells. As a bonus action, you touch your holy symbol, utter a prayer, and regain one expended spell slot, the level of which can be no higher than half your proficiency bonus (rounded up). The number of times you can use this feature is based on the level you've reached in this class: 2nd level, once; 6th level, twice; and 18th level, thrice. You regain all expended uses when you finish a long rest.</p></div>`,
              chat: ""
            },
            source: { book: "TCE", page: "30", custom: "", rules: "2014" },
            requirements: "Cleric 2",
            type: { value: "class", subtype: "channelDivinity" }
          },
          flags: {}
        };

    out.name = "Channel Divinity: Harness Divine Power";
    out.img = out.img || "icons/magic/holy/barrier-shield-winged-blue.webp";
    out.system = out.system || {};
    out.system.requirements = "Cleric 2";
    out.system.type = { value: "class", subtype: "channelDivinity" };
    out.system.uses = {
      spent: existingSpent,
      max: "1 + min(floor(@classes.cleric.levels / 6), 1) + min(floor(@classes.cleric.levels / 18), 1)",
      recovery: [{ period: "lr", type: "recoverAll" }]
    };
    out.system.activities = {
      harnDivPwrAct001: {
        _id: "harnDivPwrAct001",
        type: "utility",
        name: "Harness Divine Power (Recover Spell Slot)",
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
            "As a bonus action, expend a use of Channel Divinity to regain one expended spell slot of a level no higher than half your Proficiency Bonus (rounded up)."
        },
        duration: { concentration: false, value: "", units: "inst", special: "", override: false },
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
    };
    out.flags = foundry.utils.mergeObject(out.flags || {}, {
      [MODULE_ID]: {
        isSecondaryClassItem: true,
        originCategory: "class",
        levelRequired: 2,
        featureKey: "cleric:class:channel divinity: harness divine power:2",
        isHarnessDivinePowerFeat: true,
        syncSchemaVersion: 2
      }
    });
    return out;
  }

  static async ensureHarnessDivinePowerConfigured(actor) {
    if (!actor || !actor.isOwner) return null;
    const item = actor.items.find(
      i =>
        i.type === "feat" &&
        (i.flags?.[MODULE_ID]?.isHarnessDivinePowerFeat ||
          i.name?.trim().toLowerCase().includes("harness divine power"))
    );
    if (!item) return null;
    if (
      Number(item.flags?.[MODULE_ID]?.syncSchemaVersion || 0) >= 2 &&
      item.flags?.[MODULE_ID]?.isHarnessDivinePowerFeat &&
      item.system?.activities?.harnDivPwrAct001
    ) {
      return item;
    }
    const stub = this.configureHarnessDivinePowerDoc(item.toObject(), item);
    const actPatch = foundry.utils.deepClone(stub.system.activities);
    const oldActs = item.toObject().system?.activities || {};
    for (const oldKey of Object.keys(oldActs)) {
      if (!(oldKey in actPatch)) {
        actPatch[`-=${oldKey}`] = null;
      }
    }
    await item.update({
      img: stub.img,
      "system.type": stub.system.type,
      "system.requirements": stub.system.requirements,
      "system.uses": stub.system.uses,
      "system.activities": actPatch,
      [`flags.${MODULE_ID}.isSecondaryClassItem`]: true,
      [`flags.${MODULE_ID}.originCategory`]: "class",
      [`flags.${MODULE_ID}.isHarnessDivinePowerFeat`]: true,
      [`flags.${MODULE_ID}.syncSchemaVersion`]: 2
    });
    return item;
  }

  static _hdpLastOpenAt = 0;

  /**
   * Interactive Dialog for Flinn's "Channel Divinity: Harness Divine Power":
   * Lets Flinn choose which expended Spell Slot to recover, capped at `Math.ceil(proficiencyBonus / 2)`.
   */
  static async openHarnessDivinePowerDialog(actor, _item = null) {
    if (!actor || !actor.isOwner) return;
    const now = Date.now();
    if (now - this._hdpLastOpenAt < 1200) return;
    this._hdpLastOpenAt = now;

    const profBonus = Math.max(2, Number(actor.system?.attributes?.prof ?? 2));
    const maxSlotLevel = Math.ceil(profBonus / 2);

    // Find Channel Divinity feature to show & consume 1 use if available
    const cdItem = actor.items.find(
      i =>
        i.type === "feat" &&
        i.name?.trim().toLowerCase() === "channel divinity"
    );
    const cdMax = Number(cdItem?.system?.uses?.max ?? 0);
    const cdSpent = Number(cdItem?.system?.uses?.spent ?? 0);
    const cdRemaining = Math.max(0, cdMax - cdSpent);

    const eligibleSlots = [];
    for (let lvl = 1; lvl <= maxSlotLevel; lvl++) {
      const slotObj = actor.system?.spells?.[`spell${lvl}`];
      const maxVal = Number(slotObj?.max || 0);
      const curVal = Number(slotObj?.value || 0);
      if (maxVal > 0) {
        eligibleSlots.push({
          lvl,
          curVal,
          maxVal,
          canRecover: curVal < maxVal
        });
      }
    }

    const recoverableSlots = eligibleSlots.filter(s => s.canRecover);
    const defaultLvl =
      recoverableSlots.length > 0
        ? recoverableSlots[recoverableSlots.length - 1].lvl
        : null;

    const cdBannerHtml = cdItem && cdMax > 0
      ? `<div style="margin-bottom: 10px; padding: 6px 10px; border-radius: 6px; background: rgba(250, 204, 21, 0.12); border: 1px solid rgba(250, 204, 21, 0.42); font-size: 12px; color: #fef08a;">
           <i class="fas fa-sun"></i> <strong>Channel Divinity:</strong> ${cdRemaining} / ${cdMax} uso(s) disponível(is)${
             cdRemaining > 0
               ? " <em>(1 uso será consumido ao confirmar)</em>"
               : " <em>(0 usos restantes — já gasto ou recarregue manualmente se necessário)</em>"
           }
         </div>`
      : "";

    let bodyListHtml = "";
    if (eligibleSlots.length === 0) {
      bodyListHtml = `<p style="color: #fca5a5; text-align: center; padding: 12px 0;">Nenhum espaço de magia elegível encontrado até o Nível ${maxSlotLevel}.</p>`;
    } else if (recoverableSlots.length === 0) {
      bodyListHtml = `
        <div style="padding: 12px; border-radius: 8px; background: rgba(16, 185, 129, 0.12); border: 1px solid rgba(16, 185, 129, 0.4); color: #a7f3d0; text-align: center;">
          <i class="fas fa-check-circle"></i> Todos os espaços de magia até o <strong>Nível ${maxSlotLevel}</strong> já estão cheios!
        </div>
      `;
    } else {
      bodyListHtml = eligibleSlots
        .map(s => {
          const isChecked = s.lvl === defaultLvl ? "checked" : "";
          const disabledAttr = s.canRecover ? "" : "disabled";
          const opacityStyle = s.canRecover ? "" : "opacity: 0.5; cursor: not-allowed;";
          const statusBadge = s.canRecover
            ? `<span style="color: #86efac; font-weight: 700;">${s.curVal} / ${s.maxVal} &rarr; ${s.curVal + 1} / ${s.maxVal}</span>`
            : `<span style="color: #94a3b8; font-weight: 600;">${s.curVal} / ${s.maxVal} (Completo)</span>`;
          return `
            <label style="display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 8px 12px; margin-bottom: 6px; border-radius: 7px; background: rgba(30, 22, 52, 0.72); border: 1px solid ${
              s.canRecover ? "rgba(250, 204, 21, 0.45)" : "rgba(148, 163, 184, 0.25)"
            }; cursor: pointer; ${opacityStyle}">
              <span style="display: flex; align-items: center; gap: 8px; font-weight: 700; color: #f8fafc;">
                <input type="radio" name="hdp-slot-level" value="${s.lvl}" ${isChecked} ${disabledAttr} />
                <i class="fas fa-sparkles" style="color: #facc15;"></i>
                Espaço de Magia — Nível ${s.lvl}
              </span>
              <span style="font-size: 12px;">${statusBadge}</span>
            </label>
          `;
        })
        .join("");
    }

    const content = `
      <div style="padding: 6px 2px;">
        <p style="margin-bottom: 8px; font-size: 13px;">
          <strong>${foundry.utils.escapeHTML(actor.name)}</strong> canalizou energia divina para recuperar <strong>1 espaço de magia gasto</strong>.<br>
          <span style="color: #cbd5e1; font-size: 12px;">
            Bônus de Proficiência: <strong>+${profBonus}</strong> &rarr; Nível máximo recuperável: <strong>Nível ${maxSlotLevel}</strong> <em>(metade do BP arredondado para cima)</em>.
          </span>
        </p>
        ${cdBannerHtml}
        <div style="margin-top: 8px;">${bodyListHtml}</div>
      </div>
    `;

    const buttons =
      recoverableSlots.length > 0
        ? {
            recover: {
              icon: '<i class="fas fa-sparkles"></i>',
              label: "Recuperar Espaço de Magia",
              callback: async (html) => {
                const root = html instanceof HTMLElement ? html : html?.[0];
                const chosenInput = root?.querySelector('input[name="hdp-slot-level"]:checked');
                const chosenLvl = Number(chosenInput?.value || defaultLvl || 0);
                if (!chosenLvl || chosenLvl < 1 || chosenLvl > maxSlotLevel) return;

                const slotKey = `spell${chosenLvl}`;
                const liveSlot = actor.system?.spells?.[slotKey];
                const curVal = Number(liveSlot?.value || 0);
                const maxVal = Number(liveSlot?.max || 0);
                if (curVal >= maxVal) {
                  ui.notifications?.warn?.(`Espaços de Nível ${chosenLvl} já estão completos!`);
                  return;
                }

                const newVal = Math.min(maxVal, curVal + 1);
                await actor.update(
                  { [`system.spells.${slotKey}.value`]: newVal },
                  { altarionBypassWard: true, coriaDamageReactionInternal: true }
                );

                // Consume 1 use of Channel Divinity if available
                let cdConsumedNote = "";
                if (cdItem && cdMax > 0 && cdRemaining > 0) {
                  const liveCdSpent = Number(cdItem.system?.uses?.spent ?? 0);
                  if (liveCdSpent < cdMax) {
                    await cdItem.update({ "system.uses.spent": Math.min(cdMax, liveCdSpent + 1) });
                    cdConsumedNote = `<br>&bull; <strong>Channel Divinity:</strong> ${Math.max(0, cdMax - (liveCdSpent + 1))} / ${cdMax} uso(s) restante(s).`;
                  }
                }

                if (actor.sheet?.rendered) actor.sheet.render(false);

                await AltarionAutomationManager.sendMinimalistFeatureCard(actor, {
                  icon: "fa-sun",
                  title: `Harness Divine Power — +1 Spell Slot (Level ${chosenLvl})!`,
                  bodyHtml: `
                    <strong>${foundry.utils.escapeHTML(actor.name)}</strong> used <strong>Channel Divinity: Harness Divine Power</strong> (Proficiency Bonus <strong>+${profBonus}</strong> &rarr; Max Slot Level <strong>${maxSlotLevel}</strong>)!<br>
                    &bull; <strong>Spell Slot Recovered:</strong> Level <strong>${chosenLvl}</strong> Spell Slots: <strong>${curVal} &rarr; ${newVal} / ${maxVal}</strong>!${cdConsumedNote}
                  `,
                  flags: {
                    isHarnessDivinePowerCard: true,
                    chatChannel: "combat"
                  }
                });
              }
            },
            cancel: {
              icon: '<i class="fas fa-times"></i>',
              label: "Cancelar"
            }
          }
        : {
            ok: {
              icon: '<i class="fas fa-check"></i>',
              label: "Fechar"
            }
          };

    createV2Dialog(
      {
        title: `${actor.name} — Harness Divine Power`,
        content,
        buttons,
        default: recoverableSlots.length > 0 ? "recover" : "ok"
      },
      { width: 460 }
    ).render(true);
  }

  /**
   * Open the "Intuitive Arcanum — Accidental Casting" dialog for Flinn.
   */
  static async openIntuitiveArcanumDialog(
    actor,
    { spellItem = null, activity = null, reactionContext = null } = {}
  ) {
    if (!actor) return { completed: false, slotLevel: 1, viaIntuitiveArcanum: true };
    const currentDC = this.getIntuitiveArcanumDC(actor);
    const minSlotLvl = Math.max(1, Number(spellItem?.system?.level || 1));

    // Collect unprepared Wizard spells in Flinn's spellbook if opened without a specific spellItem
    const unpreparedWizardSpells = actor.items.filter(i => {
      if (i.type !== "spell" || Number(i.system?.level || 0) < 1) return false;
      const isPrep = Number(i.system?.prepared || 0) >= 1;
      const origin =
        i.flags?.[MODULE_ID]?.flinnSpellOrigin ||
        (i.system?.sourceItem === "class:cleric" ? "cleric" : "wizard");
      return !isPrep && origin === "wizard";
    });

    // Build available spell slot options
    const buildSlotOptionsHtml = (minLevel = 1) => {
      let html = "";
      for (let i = minLevel; i <= 9; i++) {
        const slotData = actor.system?.spells?.[`spell${i}`];
        const val = Number(slotData?.value || 0);
        const max = Number(slotData?.max || 0);
        if (val > 0) {
          html += `<option value="${i}">${i}º Círculo (${val}/${max} restantes)</option>`;
        }
      }
      return html;
    };

    const initialSlotOptions = buildSlotOptionsHtml(minSlotLvl);
    if (!initialSlotOptions) {
      ui.notifications.warn(
        `${actor.name} não possui espaços de magia disponíveis de ${minSlotLvl}º círculo ou superior para conjurar via Intuitive Arcanum!`
      );
      return { completed: false, slotLevel: minSlotLvl, viaIntuitiveArcanum: true };
    }

    const spellSelectHtml = spellItem
      ? `
        <div style="text-align: left; margin-bottom: 10px; padding: 8px; background: rgba(15, 23, 42, 0.75); border: 1px solid rgba(56, 189, 248, 0.45); border-radius: 6px; display: flex; align-items: center; gap: 10px;">
          <img src="${spellItem.img}" style="width: 34px; height: 34px; border-radius: 4px; border: 1px solid #38bdf8;" />
          <div>
            <strong style="color: #bae6fd;">${spellItem.name}</strong><br>
            <span style="font-size: 0.78rem; color: #94a3b8;">Magia de Wizard Não Preparada (${spellItem.system.level}º Círculo)</span>
          </div>
        </div>
      `
      : unpreparedWizardSpells.length > 0
        ? `
          <div style="text-align: left; margin-bottom: 10px;">
            <label style="color: #88c0d0; font-size: 0.85em; font-weight: bold; display: block; margin-bottom: 4px;">Magia de Wizard Não Preparada:</label>
            <select id="flinn-intuitive-spell-select" style="width: 100%; background: #0a0f18; color: #fff; border: 1px solid #336699; padding: 6px; border-radius: 4px;">
              <option value="">-- Apenas Consumir Espaço de Magia --</option>
              ${unpreparedWizardSpells
                .map(s => `<option value="${s.id}" data-level="${s.system.level}">${s.name} (${s.system.level}º Círculo)</option>`)
                .join("")}
            </select>
          </div>
        `
        : "";

    return new Promise((resolve) => {
      let settled = false;
      let castClicked = false;
      const finish = (val) => {
        if (settled) return;
        settled = true;
        resolve(val);
      };

      const d = createV2Dialog(
        {
          title: `Intuitive Arcanum: ${actor.name}`,
          content: `
            <div class="coria-arcane-box">
              <h3>Accidental Casting</h3>
              <p style="color:#aaa; margin-bottom: 8px; font-size: 0.9em;">
                Forçar a Trama para conjurar uma magia de Wizard não preparada exige um teste de <strong>Inteligência (Arcanismo)</strong>.
              </p>
              <div class="coria-plague-stats-row" style="margin: 10px 0;">
                <div class="coria-plague-val">
                  <span>Dificuldade Atual</span>CD ${currentDC}
                </div>
              </div>
              ${spellSelectHtml}
              <div style="text-align: left; margin-top: 8px;">
                <label style="color: #88c0d0; font-size: 0.85em; font-weight: bold; display: block; margin-bottom: 4px;">Espaço de Magia a Utilizar:</label>
                <select id="flinn-intuitive-slot-select" style="width: 100%; background: #0a0f18; color: #fff; border: 1px solid #336699; padding: 6px; border-radius: 4px;">
                  ${initialSlotOptions}
                </select>
              </div>
            </div>
          `,
          buttons: {
            cast: {
              icon: '<i class="fas fa-sparkles"></i>',
              label: "Tentar Conjurar (Rolar Arcanismo)",
              callback: async (html) => {
                castClicked = true;
                const root = html instanceof HTMLElement ? html : html?.[0];
                const slotLvl = Number(root?.querySelector("#flinn-intuitive-slot-select")?.value || minSlotLvl);
                const selectedSpellId = root?.querySelector("#flinn-intuitive-spell-select")?.value || "";
                const targetSpell = spellItem || (selectedSpellId ? actor.items.get(selectedSpellId) : null);
                const targetActivity =
                  activity ||
                  (targetSpell?.system?.activities ? Array.from(targetSpell.system.activities.values())[0] : null);

                const slotKey = `spell${slotLvl}`;
                const currentSlots = Number(actor.system?.spells?.[slotKey]?.value || 0);

                const { roll, rollMessage } = await CoriaRollLedger.runAndCaptureRollMessage(actor, async () => {
                  if (typeof actor.rollSkill === "function") {
                    return actor.rollSkill({ skill: "arc", target: currentDC });
                  } else if (typeof actor.rollSkillTest === "function") {
                    return actor.rollSkillTest("arc");
                  }
                  return null;
                });

                if (!roll) {
                  finish({ completed: false, slotLevel: slotLvl, viaIntuitiveArcanum: true });
                  return;
                }

                const succeeded = await CoriaRollLedger.registerAndEvaluateIntuitiveArcanum({
                  rollMessage,
                  roll,
                  actor,
                  currentDC,
                  slotLvl,
                  slotKey,
                  prevSlotVal: currentSlots,
                  targetSpell,
                  targetActivity,
                  reactionContext
                });
                finish({ completed: Boolean(succeeded), slotLevel: slotLvl, viaIntuitiveArcanum: true });
              }
            }
          },
          default: "cast",
          render: (html) => {
            const root = html instanceof HTMLElement ? html : html?.[0];
            root?.querySelector('button[data-button="cast"]')?.classList.add("btn-arcane");
            const spellSel = root?.querySelector("#flinn-intuitive-spell-select");
            const slotSel = root?.querySelector("#flinn-intuitive-slot-select");
            if (spellSel && slotSel) {
              spellSel.addEventListener("change", () => {
                const opt = spellSel.selectedOptions?.[0];
                const minLvl = Math.max(1, Number(opt?.getAttribute("data-level") || 1));
                slotSel.innerHTML = buildSlotOptionsHtml(minLvl);
              });
            }
          },
          close: () => {
            if (!castClicked) {
              finish({ completed: false, slotLevel: minSlotLvl, viaIntuitiveArcanum: true });
            }
          }
        },
        { classes: ["coria-dialog"], width: 440 }
      );
      d.render(true);
    });
  }

  /**
   * Roll on a world RollTable named "Wild Magic Surge" / "Surto de Magia Selvagem" if present,
   * and resolve the 1d100 Wild Magic Surge effect text.
   */
  static async rollWildMagicSurge() {
    const worldTable = game.tables?.find(t => {
      const n = String(t.name || "").trim().toLowerCase();
      return n.includes("wild magic") || n.includes("magia selvagem");
    });

    if (worldTable) {
      try {
        const draw = await worldTable.draw({ displayChat: false });
        const total = Number(draw?.roll?.total || 1);
        const text =
          draw?.results?.map(r => r.text || r.description || r.name).filter(Boolean).join(" ") ||
          this.lookupWildMagicSurgeText(total);
        return { rollTotal: total, text };
      } catch (_) {
        // fallback below
      }
    }

    const d100Roll = await new Roll("1d100").evaluate();
    if (game.dice3d) {
      try {
        await game.dice3d.showForRoll(d100Roll, game.user, true);
      } catch (_) {
        // ignore
      }
    }
    const total = Number(d100Roll.total || 1);
    return {
      rollTotal: total,
      text: this.lookupWildMagicSurgeText(total)
    };
  }

  static lookupWildMagicSurgeText(d100) {
    for (const [min, max, text] of this.WILD_MAGIC_SURGE_TABLE) {
      if (d100 >= min && d100 <= max) return text;
    }
    return this.WILD_MAGIC_SURGE_TABLE[0][2];
  }

  static async sync(actor, options = {}) {
    return OtherPlayersBase.runExclusiveSync(
      actor,
      this,
      async () => {
        const existingWizard = actor.items.find(
          i => i.type === "class" && (i.system?.identifier === "wizard" || i.name.toLowerCase() === "wizard")
        );
        const wizardLevel = Number(existingWizard?.system?.levels || this.PRIMARY_CLASS.defaultLevel);

        const existingCleric = actor.items.find(
          i => i.type === "class" && (i.system?.identifier === "cleric" || i.name.toLowerCase() === "cleric")
        );
        const clericLevel = Number(existingCleric?.system?.levels || this.SECONDARY_CLASS.defaultLevel);
        const effectiveCasterLevel = wizardLevel + Math.floor(clericLevel / 2);

        // 1. Dual Races: Halfling (Mark of Healing) (ERLW) + Aasimar (Protector) (VGM) via Plutonium
        const markOfHealingBundle = await OtherPlayersBase.pConvertRaceAndTraits(
          {
            name: "Halfling (Mark of Healing)",
            source: "ERLW",
            alternateNames: ["Mark of Healing Halfling", "Halfling"]
          },
          { actor }
        );
        const protectorAasimarBundle = await OtherPlayersBase.pConvertRaceAndTraits(
          {
            name: "Aasimar (Protector)",
            source: "VGM",
            alternateNames: ["Protector Aasimar"]
          },
          { actor }
        );
        await OtherPlayersBase.syncDualRaces(
          actor,
          [markOfHealingBundle, protectorAasimarBundle].filter(Boolean)
        );

        // Sync Racial cantrip Light
        await OtherPlayersBase.syncSpells(actor, [{ name: "Light", source: "PHB" }]);

        // 2. Primary Class: Wizard + Subclass: School of Divination (PHB)
        const wizardConv = await OtherPlayersBase.pConvertClass({
          name: "Wizard",
          source: "PHB",
          level: wizardLevel,
          actor,
          isSecondary: false
        });
        let wizardClassItem = existingWizard;
        let divinationSubclassItem = null;

        if (wizardConv) {
          wizardConv.clsData.system.spellcasting = foundry.utils.mergeObject(
            wizardConv.clsData.system.spellcasting || {},
            {
              progression: "full",
              ability: "int",
              preparation: {
                formula: "max(1, @classes.wizard.levels + @abilities.int.mod)"
              }
            }
          );

          const scConv = await OtherPlayersBase.pConvertSubclass({
            clsRaw: wizardConv.clsRaw,
            name: "School of Divination",
            shortName: "Divination",
            source: "PHB",
            className: "Wizard",
            classSource: "PHB",
            actor,
            isSecondary: false
          });
          const syncedPrimary = await OtherPlayersBase.syncClassAndSubclass(actor, {
            clsData: wizardConv.clsData,
            scData: scConv?.scData,
            subclassUnlockLevel: 2,
            isSecondary: false,
            classFeatureDefs: this.WIZARD_CLASS_FEATURES,
            subclassFeatureDefs: this.DIVINATION_SUBCLASS_FEATURES,
            clsRaw: wizardConv.clsRaw,
            scRaw: scConv?.scRaw,
            className: "Wizard",
            classSource: "PHB",
            subclassShortName: "Divination",
            subclassSource: "PHB"
          });
          wizardClassItem = syncedPrimary.classItem;
          divinationSubclassItem = syncedPrimary.subclassItem;

          const wizardFeats = [];
          for (const def of this.WIZARD_CLASS_FEATURES) {
            if (def.level > wizardLevel) continue;
            const doc = await OtherPlayersBase.pConvertFeatureStub(
              {
                name: def.name,
                source: def.source,
                className: "Wizard",
                classSource: "PHB",
                level: def.level,
                __prop: "classFeature"
              },
              { actor, isSecondary: false, originCategory: "class", clsRaw: wizardConv.clsRaw }
            );
            if (doc) wizardFeats.push(doc);
          }

          // Include Flinn's custom feature: "Intuitive Arcanum"
          wizardFeats.push(this.buildIntuitiveArcanumFeatureData(wizardClassItem?.id || null));

          if (wizardLevel >= 2) {
            for (const def of this.DIVINATION_SUBCLASS_FEATURES) {
              if (def.level > wizardLevel) continue;
              const doc = await OtherPlayersBase.pConvertFeatureStub(
                {
                  name: def.name,
                  source: def.source,
                  className: "Wizard",
                  classSource: "PHB",
                  subclassShortName: "Divination",
                  subclassSource: "PHB",
                  level: def.level,
                  __prop: "subclassFeature"
                },
                { actor, isSecondary: false, originCategory: "subclass", scRaw: scConv?.scRaw }
              );
              if (doc) {
                if (def.name.toLowerCase() === "portent") {
                  doc.system = doc.system || {};
                  doc.system.uses = {
                    spent: Number(doc.system?.uses?.spent || 0),
                    max: wizardLevel >= 14 ? "3" : "2",
                    recovery: [{ period: "lr", type: "recoverAll" }]
                  };
                  doc.flags = foundry.utils.mergeObject(doc.flags || {}, {
                    "altarion-aitusa": { syncSchemaVersion: 2 }
                  });
                }
                wizardFeats.push(doc);
              }
            }
          }

          await OtherPlayersBase.syncFeatureItems(actor, wizardFeats, {
            maxLevel: wizardLevel,
            classItemId: wizardClassItem?.id || null,
            subclassItemId: divinationSubclassItem?.id || null
          });
        }

        // 3. Secondary Class: Cleric (Half-Caster progression contributing floor(clericLevel / 2) to spell slots!)
        //    + Subclass: Knowledge Domain (PHB)
        const clericConv = await OtherPlayersBase.pConvertClass({
          name: "Cleric",
          source: "PHB",
          level: clericLevel,
          actor,
          isSecondary: true
        });
        let clericClassItem = existingCleric;
        let knowledgeSubclassItem = null;

        if (clericConv) {
          // Cleric acts as a Half-Caster on Flinn (Wizard + 1/2 Cleric spell slot progression)
          // using Intelligence as its Spellcasting Ability (ClericLevel + INTMod prepared spells, min 1)
          clericConv.clsData.system.spellcasting = foundry.utils.mergeObject(
            clericConv.clsData.system.spellcasting || {},
            {
              progression: "half",
              ability: "int",
              preparation: {
                formula: "max(1, @classes.cleric.levels + @abilities.int.mod)"
              }
            }
          );

          const scConv = await OtherPlayersBase.pConvertSubclass({
            clsRaw: clericConv.clsRaw,
            name: "Knowledge Domain",
            shortName: "Knowledge",
            source: "PHB",
            className: "Cleric",
            classSource: "PHB",
            actor,
            isSecondary: true
          });
          const syncedSec = await OtherPlayersBase.syncClassAndSubclass(actor, {
            clsData: clericConv.clsData,
            scData: scConv?.scData,
            subclassUnlockLevel: 1,
            isSecondary: true,
            classFeatureDefs: this.CLERIC_CLASS_FEATURES,
            subclassFeatureDefs: this.KNOWLEDGE_SUBCLASS_FEATURES,
            clsRaw: clericConv.clsRaw,
            scRaw: scConv?.scRaw,
            className: "Cleric",
            classSource: "PHB",
            subclassShortName: "Knowledge",
            subclassSource: "PHB"
          });
          clericClassItem = syncedSec.classItem;
          knowledgeSubclassItem = syncedSec.subclassItem;

          const clericFeats = [];
          for (const def of this.CLERIC_CLASS_FEATURES) {
            if (def.level > clericLevel) continue;
            let doc = await OtherPlayersBase.pConvertFeatureStub(
              {
                name: def.name,
                source: def.source,
                className: "Cleric",
                classSource: "PHB",
                level: def.level,
                __prop: "classFeature"
              },
              { actor, isSecondary: true, originCategory: "class", clsRaw: clericConv.clsRaw }
            );
            if (def.name.toLowerCase().includes("harness divine power")) {
              const existingHdp = actor.items.find(
                i =>
                  i.type === "feat" &&
                  (i.flags?.[MODULE_ID]?.isHarnessDivinePowerFeat ||
                    i.name?.trim().toLowerCase().includes("harness divine power"))
              );
              doc = this.configureHarnessDivinePowerDoc(doc, existingHdp);
            }
            if (doc) clericFeats.push(doc);
          }

          for (const def of this.KNOWLEDGE_SUBCLASS_FEATURES) {
            if (def.level > clericLevel) continue;
            const doc = await OtherPlayersBase.pConvertFeatureStub(
              {
                name: def.name,
                source: def.source,
                className: "Cleric",
                classSource: "PHB",
                subclassShortName: "Knowledge",
                subclassSource: "PHB",
                level: def.level,
                __prop: "subclassFeature"
              },
              { actor, isSecondary: true, originCategory: "subclass", scRaw: scConv?.scRaw }
            );
            if (doc) clericFeats.push(doc);
          }

          await OtherPlayersBase.syncFeatureItems(actor, clericFeats, {
            maxLevel: clericLevel,
            classItemId: clericClassItem?.id || null,
            subclassItemId: knowledgeSubclassItem?.id || null
          });
        }

        // 3b. Sync Feat: Lucky (PHB) via Plutonium (3 Luck Points / Long Rest; distinct from Halfling Lucky)
        const luckyFeatDoc = await OtherPlayersBase.pConvertFeat({
          name: "Lucky",
          source: "PHB",
          actor
        });
        if (luckyFeatDoc) {
          const existingLuckyFeat = this.getFlinnLuckyFeatItem(actor);
          luckyFeatDoc.system = luckyFeatDoc.system || {};
          luckyFeatDoc.system.type = { value: "feat", subtype: "" };
          luckyFeatDoc.system.uses = {
            spent: Number(existingLuckyFeat?.system?.uses?.spent || 0),
            max: "3",
            recovery: [{ period: "lr", type: "recoverAll" }]
          };
          luckyFeatDoc.flags = foundry.utils.mergeObject(luckyFeatDoc.flags || {}, {
            [MODULE_ID]: {
              isOtherPlayerFeat: true,
              isFlinnLuckyFeat: true,
              originCategory: "feat",
              featureKey: "feat:lucky:phb",
              syncSchemaVersion: 2
            }
          });
          await OtherPlayersBase.syncFeatureItems(actor, [luckyFeatDoc], {
            maxLevel: wizardLevel + clericLevel
          });
        }

        // 3c. Sync "Paths of Destiny" + all PHB Cleric spells up to Flinn's max spell slot level
        await this.syncFlinnSpellsAndClericList(actor, { wizardLevel, clericLevel });

        // 3d. Initialize Portent Dice if Flinn is Wizard Lvl >= 2 and has never rolled Portents yet
        if (wizardLevel >= 2 && !Array.isArray(actor.flags?.[MODULE_ID]?.portentDice)) {
          await this.rollFlinnPortentsBlind(actor);
        }
        this.refreshPortentFloatingButton();

        // 4. Actor Traits:
        //    - Saving Throws (INT & WIS from Wizard)
        //    - Fortune's Knowledge (Intuitive Arcanum): Proficiency in Arcana, or Expertise (2) if already proficient
        //    - Darkvision 60 ft, Necrotic/Radiant Resistance (Aasimar)
        const actorUpdates = {};
        if (wizardClassItem && actor.system.details?.originalClass !== wizardClassItem.id) {
          actorUpdates["system.details.originalClass"] = wizardClassItem.id;
        }
        for (const saveKey of this.PRIMARY_CLASS.saves) {
          if (actor.system.abilities?.[saveKey] && Number(actor.system.abilities[saveKey].proficient || 0) < 1) {
            actorUpdates[`system.abilities.${saveKey}.proficient`] = 1;
          }
        }

        // Fortune's Knowledge: Arcana proficiency (1) or Expertise (2) if proficient
        const curArcVal = Number(actor.system?.skills?.arc?.value || 0);
        const fortuneApplied = Boolean(actor.getFlag(MODULE_ID, "fortuneKnowledgeApplied"));
        if (!fortuneApplied) {
          actorUpdates["system.skills.arc.value"] = curArcVal >= 1 ? 2 : 1;
          actorUpdates[`flags.${MODULE_ID}.fortuneKnowledgeApplied`] = true;
        } else if (curArcVal < 1) {
          actorUpdates["system.skills.arc.value"] = 1;
        }

        if (actor.getFlag(MODULE_ID, "intuitiveArcanumDC") === undefined) {
          actorUpdates[`flags.${MODULE_ID}.intuitiveArcanumDC`] = 10;
        }

        const sensesObj = actor.system.attributes?.senses;
        const curDarkvision =
          Number(sensesObj?.ranges ? sensesObj.ranges.darkvision : sensesObj?.darkvision) || 0;
        if (curDarkvision < 60) {
          actorUpdates["system.attributes.senses.ranges.darkvision"] = 60;
        }
        if (Number(actor.system.attributes?.movement?.walk || 0) < 30) {
          actorUpdates["system.attributes.movement.walk"] = 30;
        }
        if (actor.system.traits?.dr) {
          const drSet = new Set(Array.from(actor._source?.system?.traits?.dr?.value || []));
          let drChanged = false;
          for (const d of ["necrotic", "radiant"]) {
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

        // Initialize any newly unlocked Leveled Spell Slots (1..9) on Flinn to full value, and zero out Pact slots
        const slotUpdates = {};
        const prevMaxByLvl = actor.flags?.[MODULE_ID]?.flinnSyncedSpellMax || {};
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
        if (Number(actor.system?.spells?.pact?.value || 0) !== 0) {
          slotUpdates["system.spells.pact.value"] = 0;
        }
        if (!foundry.utils.isEmpty(slotUpdates)) {
          slotUpdates[`flags.${MODULE_ID}.flinnSyncedSpellMax`] = newMaxByLvl;
          await actor.update(slotUpdates);
          OtherPlayersBase.refreshActor(actor);
        }

        if (actor.sheet?.rendered) actor.sheet.render(false);

        // 5. Pre-seed Knowledge Domain Blessings of Knowledge from GM JSON (History & Religion)
        //    so initial sync does not open a choice popup (Arcana Expertise comes from Fortune's Knowledge).
        const existingBok = actor.getFlag(MODULE_ID, "blessingsOfKnowledgeChosen");
        if (!Array.isArray(existingBok) || existingBok.length === 0) {
          const inferredBok = ["his", "rel"];
          const bokPatch = { [`flags.${MODULE_ID}.blessingsOfKnowledgeChosen`]: inferredBok };
          for (const sk of inferredBok) {
            if (Number(actor.system?.skills?.[sk]?.value || 0) < 2) {
              bokPatch[`system.skills.${sk}.value`] = 2;
            }
          }
          await actor.update(bokPatch);
        }

        // Interactive Choice Dialog: Blessings of Knowledge (only opens if choices remain unpicked)
        await OtherPlayersBase.promptSkillExpertiseChoiceIfNeeded(actor, {
          flagKey: "blessingsOfKnowledgeChosen",
          title: "Blessings of Knowledge (Knowledge Domain)",
          description:
            "Choose 2 skills from Arcana, History, Nature, or Religion to become proficient and gain Expertise (double proficiency bonus):",
          allowedSkills: ["arc", "his", "nat", "rel"],
          count: 2,
          requireProficiency: false
        });

        ui.notifications.info(
          `[Other Players] Synchronized ${actor.name}: Wizard (Lvl ${wizardLevel}) & Cleric (Lvl ${clericLevel} Half-Caster -> Effective Caster Lvl ${effectiveCasterLevel}).`
        );
      },
      options
    );
  }
}

FlinnManager.register();
