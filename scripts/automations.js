/**
 * Advanced Feature, Spell, Status Effect & Companion Automations for Altarion & Aitusa
 * Handles:
 * - Draconic Focus (Consume Altarion's spell slot when Aitusa casts a spell; +Altarion INT mod to Aitusa's cantrip damage)
 * - Linked Casting (Altarion resource max = Aitusa INT mod; option when casting Self / 1-creature spells to also affect Aitusa)
 * - Ancestral Tether (Spell slot selection, dual status effects, Aitusa resistance to ALL damage, shared damage to Altarion, Aitusa Reaction Hit Die heal button)
 * - Draconic Enhancement (+1 AC, Fly Speed = Aitusa's Fly Speed, 30 ft Truesight status effect)
 * - Ancestral Shielding (+ceil(INT/2) AC status effect until end of Altarion's next turn + automatic Temp HP application)
 * - Ancestral Ward & Ancestral Marking (Automatic status effects on failed Wisdom saves; auto-removal on successful repeat save for Marking)
 * - Ancestral Form (Status effect on Altarion; +INT mod Force damage on Ancestral Weapon when above 50% HP)
 * - Ancient Connection (Automatic +ceil(partner CON/2) bonus to Saving Throws when conscious & within 30 ft on canvas)
 * - Arcane Step & Essence Harvest (8 Arcane Echoes: Abjurer, Necromancer, Evoker, Illusionist, Conjurer, Transmuter, Diviner, Enchanter)
 * - Altarion's Echoing Ward (Automatic Temporary HP application to target)
 * - Arcane Armor (Rebuilt Armor of Agathys with 5 * Slot Level Temp HP & retaliatory Force damage on melee hits, 1-hour / 0-TempHP status)
 * - Arcane Ward (School of Abjuration: Max = 2 * Wizard Level + INT mod, Token Bar 2 + Sheet Bar, damage absorption before Temp HP & HP, +2 * Slot Level recharge on 1st+ level Abjuration spells, Long Rest reset)
 */

import { DragonScalingManager } from "./dragon-scaling.js";
import { CoriaAuraEngine } from "./aura-engine.js";
import { createV2Dialog } from "./dialog-v2.js";
import { CoriaRollLedger } from "./roll-ledger.js";

export class AltarionAutomationManager {
  static _initialized = false;

  /**
   * Track pre-update HP values on actors to detect exact damage taken for Ancestral Tether
   */
  static _preUpdateHp = new Map();

  /**
   * Bridge unclamped `dnd5e.preApplyDamage` Arcane Ward absorptions into `preUpdateActor` / `updateActor`
   */
  static _pendingWardAbsorption = new Map();

  /**
   * Track most recent spell cast slot level & school across consumption/post-use/roll hooks
   */
  static _lastSpellCastContext = null;

  /**
   * Prevent duplicate Arcane Ward triggers
   */
  static _lastArcaneWardSpellTriggerKey = null;

  /**
   * Track most recent Save DC & feature context so failed saving throws automatically receive status effects
   */
  static _pendingSaveContext = null;

  /**
   * Track most recent Linked Casting spell usage so subsequent rolls / ActiveEffects apply to both Altarion & Aitusa
   */
  static _activeLinkedCast = null;

  static init() {
    if (this._initialized) return;
    this._initialized = true;

    this.registerStatusEffects();
    this.registerTempHpStackingWrappers();
    this.registerDialogHooks();
    this.registerActivityHooks();
    this.registerRollHooks();
    this.registerActorAndCombatHooks();
    this.registerChatHooks();
    this.registerSummonTokenHooks();
    this.registerEssenceHarvestEchoesGM();
    this.registerKyrionDarkVitalityHooks();

    console.log("[Altarion & Aitusa] AltarionAutomationManager initialized.");
  }

  /**
   * Wrap `Actor5e#applyTempHP` and `Actor5e#applyDamage` so that when an actor has
   * "Abjuration Bulwark" active and their current Temporary Hit Points are > 0 and < 4 * character level,
   * newly gained Temporary Hit Points are ADDED to the current total instead of replacing it.
   */
  static registerTempHpStackingWrappers() {
    const wrapActorProto = () => {
      const proto = CONFIG.Actor?.documentClass?.prototype || Actor?.implementation?.prototype;
      if (!proto || proto._altarionAbjurationBulwarkWrapped) return;
      proto._altarionAbjurationBulwarkWrapped = true;

      if (typeof proto.applyTempHP === "function") {
        const origApplyTempHP = proto.applyTempHP;
        proto.applyTempHP = async function (amount = 0, options = {}) {
          const gained = Math.floor(Number(amount) || 0);
          if (gained > 0 && AltarionAutomationManager.hasStatus(this, "abjuration-bulwark")) {
            const curTemp = Math.max(0, Number(this.system?.attributes?.hp?.temp ?? 0));
            const charLvl = Math.max(1, Number(this.system?.details?.level ?? 4));
            const threshold = 4 * charLvl;
            if (curTemp > 0 && curTemp < threshold) {
              const newTemp = curTemp + gained;
              ui.notifications?.info?.(
                `[Abjuration Bulwark] Stacked +${gained} Temporary HP on ${this.name} (${curTemp} → ${newTemp} Temp HP)!`
              );
              return this.update({ "system.attributes.hp.temp": newTemp }, options);
            }
          }
          return origApplyTempHP.call(this, amount, options);
        };
      }

      if (typeof proto.applyDamage === "function") {
        const origApplyDamage = proto.applyDamage;
        proto.applyDamage = async function (damages = [], options = {}) {
          if (Array.isArray(damages) && AltarionAutomationManager.hasStatus(this, "abjuration-bulwark")) {
            const curTemp = Math.max(0, Number(this.system?.attributes?.hp?.temp ?? 0));
            const charLvl = Math.max(1, Number(this.system?.details?.level ?? 4));
            const threshold = 4 * charLvl;
            if (curTemp > 0 && curTemp < threshold) {
              let hasTempHpEntry = false;
              let totalGainedTemp = 0;
              for (const d of damages) {
                if (d?.type === "temphp" && Number(d.value) > 0) {
                  hasTempHpEntry = true;
                  totalGainedTemp += Math.floor(Number(d.value));
                }
              }
              if (hasTempHpEntry && totalGainedTemp > 0) {
                const stackedTotal = curTemp + totalGainedTemp;
                let assigned = false;
                damages = damages.map(d => {
                  if (d?.type === "temphp" && Number(d.value) > 0) {
                    if (!assigned) {
                      assigned = true;
                      return { ...d, value: stackedTotal };
                    }
                    return { ...d, value: 0 };
                  }
                  return d;
                });
                ui.notifications?.info?.(
                  `[Abjuration Bulwark] Stacked +${totalGainedTemp} Temporary HP on ${this.name} (${curTemp} → ${stackedTotal} Temp HP)!`
                );
              }
            }
          }
          return origApplyDamage.call(this, damages, options);
        };
      }
    };

    if (CONFIG.Actor?.documentClass) {
      wrapActorProto();
    } else {
      Hooks.once("setup", wrapActorProto);
    }
  }

  /* -------------------------------------------- */
  /*  Actor & Token Resolution Helpers            */
  /* -------------------------------------------- */

  static getAltarionName() {
    try {
      return (game.settings.get("altarion-aitusa", "altarionName") || "Altarion").trim();
    } catch (_) {
      return "Altarion";
    }
  }

  static getAitusaName() {
    try {
      return (game.settings.get("altarion-aitusa", "aitusaName") || "Aitusa").trim();
    } catch (_) {
      return "Aitusa";
    }
  }

  static isAltarion(actor) {
    if (!actor) return false;
    const norm = String(actor.name || "").trim().toLowerCase();
    const settingNorm = this.getAltarionName().toLowerCase();
    return norm === settingNorm || norm === "altarion" || norm === "altarion talendris" || norm.startsWith("altarion ");
  }

  static isAitusa(actor) {
    if (!actor) return false;
    const norm = String(actor.name || "").trim().toLowerCase();
    const settingNorm = this.getAitusaName().toLowerCase();
    return norm === settingNorm || norm === "aitusa" || norm.startsWith("aitusa ");
  }

  static isKyrion(actor) {
    if (!actor) return false;
    const norm = String(actor.name || "").trim().toLowerCase();
    return norm === "kyrion" || norm.startsWith("kyrion ");
  }

  static isParva(actor) {
    if (!actor) return false;
    const norm = String(actor.name || "").trim().toLowerCase();
    return norm === "parva" || norm.startsWith("parva ");
  }

  static isFlinn(actor) {
    if (!actor) return false;
    const norm = String(actor.name || "").trim().toLowerCase();
    return norm === "flinn" || norm === "flinn encantor" || norm.startsWith("flinn ");
  }

  static getAltarionActor() {
    return game.actors?.find(a => this.isAltarion(a)) || null;
  }

  static getAitusaActor() {
    return game.actors?.find(a => this.isAitusa(a)) || null;
  }

  static getKyrionActor() {
    return game.actors?.find(a => this.isKyrion(a)) || null;
  }

  static getParvaActor() {
    return game.actors?.find(a => this.isParva(a)) || null;
  }

  static getFlinnActor() {
    return game.actors?.find(a => this.isFlinn(a)) || null;
  }

  static getRiderLevel(altarion = null) {
    altarion = altarion || this.getAltarionActor();
    if (!altarion) return 0;
    const drClass = altarion.items.find(
      i => i.type === "class" && (i.system?.identifier === "dragon-rider" || i.name?.toLowerCase() === "dragon rider")
    );
    return Number(drClass?.system?.levels || 0);
  }

  static getWizardLevel(altarion = null) {
    altarion = altarion || this.getAltarionActor();
    if (!altarion) return 0;
    const wizClass = altarion.items.find(
      i => i.type === "class" && (i.system?.identifier === "wizard" || i.name?.trim().toLowerCase() === "wizard")
    );
    return Number(wizClass?.system?.levels || 0);
  }

  static hasArcaneWardFeature(altarion = null) {
    altarion = altarion || this.getAltarionActor();
    if (!altarion || !this.isAltarion(altarion)) return false;
    const wizLvl = this.getWizardLevel(altarion);
    if (wizLvl < 2) return false;
    const hasAbjuration = altarion.items.some(
      i =>
        i.type === "subclass" &&
        i.system?.classIdentifier === "wizard" &&
        (i.system?.identifier === "abjuration" || i.name?.trim().toLowerCase() === "school of abjuration")
    );
    const hasFeat = altarion.items.some(
      i => i.type === "feat" && i.name?.trim().toLowerCase() === "arcane ward"
    );
    return hasAbjuration || hasFeat;
  }

  static getArcaneWardMaxHp(altarion = null) {
    altarion = altarion || this.getAltarionActor();
    if (!altarion) return 0;
    const wizLvl = this.getWizardLevel(altarion);
    const intMod = Number(altarion.system?.abilities?.int?.mod ?? 0);
    return Math.max(1, 2 * wizLvl + intMod);
  }

  static getArcaneWardState(altarion = null) {
    altarion = altarion || this.getAltarionActor();
    const eligible = this.hasArcaneWardFeature(altarion);
    if (!eligible || !altarion) {
      return { eligible: false, active: false, current: 0, max: 0, wizardLevel: 0, intMod: 0 };
    }
    const wizardLevel = this.getWizardLevel(altarion);
    const intMod = Number(altarion.system?.abilities?.int?.mod ?? 0);
    const max = Math.max(1, 2 * wizardLevel + intMod);
    const tert = altarion.system?.resources?.tertiary || {};
    const rawCur = tert.label === "Arcane Ward" ? Number(tert.value ?? 0) : 0;
    const current = Math.clamp(Number.isFinite(rawCur) ? rawCur : 0, 0, max);
    const active = Boolean(altarion.getFlag("altarion-aitusa", "arcaneWardActive")) || current > 0;
    return { eligible: true, active, current, max, wizardLevel, intMod };
  }

  static isAuthoritativeClientFor(actor) {
    const activeGm = game.users?.activeGM;
    if (activeGm) return game.user?.id === activeGm.id;
    if (!actor || !actor.isOwner) return false;
    const firstActiveOwner = game.users?.find(
      u => u.active && actor.testUserPermission?.(u, CONST.DOCUMENT_OWNERSHIP_LEVELS?.OWNER ?? 3)
    );
    return firstActiveOwner ? game.user?.id === firstActiveOwner.id : Boolean(actor.isOwner);
  }

  static getEffectiveSpellSlotLevel(actor, item, usageConfig = null, message = null, activity = null) {
    const baseLevel = Math.max(0, Number(item?.system?.level ?? 0));
    if (activity?.consumption?.spellSlot === false) return baseLevel;

    // 1. Explicit spell slot key in usageConfig (e.g. "spell1", "spell3", "pact")
    const slotKey = usageConfig?.spell?.slot;
    if (typeof slotKey === "string" && slotKey) {
      if (slotKey === "pact") {
        return Math.max(baseLevel, Number(actor?.system?.spells?.pact?.level || baseLevel || 1));
      }
      const m = /^spell(\d+)$/i.exec(slotKey);
      if (m) return Math.max(baseLevel, Number(m[1]));
    }

    // 2. Explicit scaling delta in usageConfig
    if (usageConfig?.scaling !== undefined && usageConfig?.scaling !== null && usageConfig?.scaling !== false) {
      const scaled = baseLevel + Number(usageConfig.scaling || 0);
      if (Number.isFinite(scaled) && scaled >= baseLevel) return scaled;
    }

    // 3. Usage ChatMessage dnd5e flags
    const msgSpellLvl = Number(
      message?.flags?.dnd5e?.use?.spellLevel ??
        message?.flags?.dnd5e?.spellLevel ??
        NaN
    );
    if (Number.isFinite(msgSpellLvl) && msgSpellLvl >= baseLevel) {
      return msgSpellLvl;
    }
    if (message?.flags?.dnd5e?.scaling !== undefined) {
      const msgScaled = baseLevel + Number(message.flags.dnd5e.scaling || 0);
      if (Number.isFinite(msgScaled) && msgScaled >= baseLevel) return msgScaled;
    }

    // 4. Cached _lastSpellCastContext from preActivityConsumption
    if (
      this._lastSpellCastContext &&
      this._lastSpellCastContext.itemId === item?.id &&
      Date.now() - (this._lastSpellCastContext.timestamp || 0) < 30000
    ) {
      return Math.max(baseLevel, Number(this._lastSpellCastContext.slotLevel || baseLevel));
    }

    // 5. Pure Pact Magic caster fallback (e.g. Kyrion casting with Warlock Pact Magic slots)
    if (baseLevel >= 1 && Number(actor?.system?.spells?.pact?.max || 0) > 0) {
      let hasRegularSlots = false;
      for (let lvl = 1; lvl <= 9; lvl++) {
        if (Number(actor?.system?.spells?.[`spell${lvl}`]?.max || 0) > 0) {
          hasRegularSlots = true;
          break;
        }
      }
      if (!hasRegularSlots) {
        return Math.max(baseLevel, Number(actor?.system?.spells?.pact?.level || baseLevel));
      }
    }

    return baseLevel;
  }

  static getArcaneArmorEffect(actor) {
    if (!actor) return null;
    return (
      actor.effects?.find(
        e =>
          !e.disabled &&
          (e.flags?.["altarion-aitusa"]?.isArcaneArmorEffect ||
            e.statuses?.has?.("arcane-armor") ||
            e.flags?.["altarion-aitusa"]?.statusId === "arcane-armor")
      ) || null
    );
  }

  static getShadowArmorEffect(actor) {
    if (!actor) return null;
    return (
      actor.effects?.find(
        e =>
          !e.disabled &&
          (e.flags?.["altarion-aitusa"]?.isShadowArmorEffect ||
            e.statuses?.has?.("shadow-armor") ||
            e.flags?.["altarion-aitusa"]?.statusId === "shadow-armor")
      ) || null
    );
  }

  static getArmorOfAgathysEffect(actor) {
    if (!actor) return null;
    return (
      actor.effects?.find(
        e =>
          !e.disabled &&
          (e.flags?.["altarion-aitusa"]?.isArmorOfAgathysEffect ||
            e.statuses?.has?.("armor-of-agathys") ||
            e.flags?.["altarion-aitusa"]?.statusId === "armor-of-agathys")
      ) || null
    );
  }

  static getRetaliatoryArmorEffect(actor) {
    return (
      this.getArcaneArmorEffect(actor) ||
      this.getShadowArmorEffect(actor) ||
      this.getArmorOfAgathysEffect(actor) ||
      null
    );
  }

  static getActorCanvasToken(actor) {
    if (!actor || !canvas?.ready) return null;
    const placeables = canvas.tokens?.placeables || [];
    const nameLower = actor.name?.trim().toLowerCase();
    return (
      placeables.find(t => t.actor?.id === actor.id) ||
      placeables.find(t => t.name?.trim().toLowerCase() === nameLower) ||
      null
    );
  }

  /**
   * Compute the exact destination center `{ x, y }` in pixels of a Token or TokenDocument,
   * prioritizing `positionOverrides` and `document._source` so it is NEVER 1 movement behind
   * when `Token#animate` temporarily resets `document.x` / `document.y` to the start position.
   */
  static getTokenDestinationCenter(tokenOrDoc, positionOverrides = null) {
    if (!tokenOrDoc || !canvas?.ready || !canvas?.scene) return null;
    if (typeof CoriaAuraEngine?.getTokenDestinationBounds === "function") {
      const b = CoriaAuraEngine.getTokenDestinationBounds(tokenOrDoc, positionOverrides);
      if (b) return { x: b.centerX, y: b.centerY, widthBlocks: b.widthBlocks, heightBlocks: b.heightBlocks };
    }
    const doc = tokenOrDoc.document || tokenOrDoc;
    const tokenId = doc.id || tokenOrDoc.id || null;
    const override =
      positionOverrides instanceof Map
        ? positionOverrides.get(tokenId)
        : positionOverrides && tokenId
          ? positionOverrides[tokenId]
          : null;
    const gridSizePx = Number(canvas.scene.grid?.size || 100);
    const wBlocks = Number(doc._source?.width ?? doc.width ?? 1);
    const hBlocks = Number(doc._source?.height ?? doc.height ?? 1);
    const x = Number(override?.x ?? doc._source?.x ?? doc.x ?? tokenOrDoc.x ?? 0) + (wBlocks * gridSizePx) / 2;
    const y = Number(override?.y ?? doc._source?.y ?? doc.y ?? tokenOrDoc.y ?? 0) + (hBlocks * gridSizePx) / 2;
    return { x, y, widthBlocks: wBlocks, heightBlocks: hBlocks };
  }

  /**
   * Compute minimum edge-to-edge distance in feet between two tokens on the active canvas,
   * using `CoriaAuraEngine.measureTokenDistanceFt` (Foundry V13 grid-diagonal path measurement
   * across occupied grid squares at committed destination coordinates).
   */
  static getTokenDistanceFt(tokenA, tokenB, positionOverrides = null) {
    if (!tokenA || !tokenB || !canvas?.ready || !canvas?.scene) return null;
    if (typeof CoriaAuraEngine?.measureTokenDistanceFt === "function") {
      return CoriaAuraEngine.measureTokenDistanceFt(tokenA, tokenB, positionOverrides);
    }
    const gridDist = Number(canvas.scene.grid?.distance || 5);
    const gridSizePx = Number(canvas.scene.grid?.size || 100);
    const pxPerFoot = gridSizePx / gridDist;

    const centerA = this.getTokenDestinationCenter(tokenA, positionOverrides);
    const centerB = this.getTokenDestinationCenter(tokenB, positionOverrides);
    if (!centerA || !centerB) return null;

    const radAPx = ((centerA.widthBlocks - 1) * gridSizePx) / 2;
    const radBPx = ((centerB.widthBlocks - 1) * gridSizePx) / 2;
    const centerDistPx = Math.hypot(centerA.x - centerB.x, centerA.y - centerB.y);
    const effectiveDistPx = Math.max(0, centerDistPx - radAPx - radBPx);

    return Math.round(effectiveDistPx / pxPerFoot);
  }

  static isActorConscious(actor) {
    if (!actor) return false;
    const hp = Number(actor.system?.attributes?.hp?.value ?? 0);
    if (hp <= 0) return false;
    if (actor.statuses?.has("unconscious") || actor.statuses?.has("dead")) return false;
    return true;
  }

  static clearAllTokenHoverRings() {
    if (!canvas?.ready) return;
    for (const tok of canvas.tokens?.placeables || []) {
      if (tok?._coriaHoverRing) {
        try {
          tok.removeChild(tok._coriaHoverRing);
          tok._coriaHoverRing.destroy?.();
        } catch (_e) {
          // ignore
        }
        tok._coriaHoverRing = null;
      }
    }
  }

  /**
   * Bind hover listeners on dialog list items (`[data-token-id]`) so hovering over a row
   * highlights and outlines the corresponding Token on the active Foundry canvas.
   */
  static bindTokenHoverHighlightListeners(rootEl, rowSelector = ".coria-creature-pick-row") {
    if (!rootEl) return;
    const rows = rootEl.querySelectorAll(rowSelector);
    for (const row of rows) {
      if (row.dataset.hoverBound) continue;
      row.dataset.hoverBound = "true";

      row.addEventListener("mouseenter", (ev) => {
        const tokenId = row.getAttribute("data-token-id");
        const tok = tokenId && canvas?.ready ? canvas.tokens?.get(tokenId) : null;
        if (!tok) return;
        try {
          tok._onHoverIn?.(ev, { hoverOutOthers: true });
          if (window.PIXI?.Graphics && !tok._coriaHoverRing) {
            const g = new PIXI.Graphics();
            const w = Number(tok.w || (tok.document?.width || 1) * (canvas.grid?.size || 100));
            const h = Number(tok.h || (tok.document?.height || 1) * (canvas.grid?.size || 100));
            g.lineStyle(4, 0xfbbf24, 0.95);
            g.beginFill(0xfbbf24, 0.16);
            g.drawRoundedRect(-4, -4, w + 8, h + 8, 10);
            g.endFill();
            tok.addChild(g);
            tok._coriaHoverRing = g;
          }
        } catch (_e) {
          // ignore
        }
      });

      row.addEventListener("mouseleave", (ev) => {
        const tokenId = row.getAttribute("data-token-id");
        const tok = tokenId && canvas?.ready ? canvas.tokens?.get(tokenId) : null;
        if (!tok) return;
        try {
          if (tok._coriaHoverRing) {
            tok.removeChild(tok._coriaHoverRing);
            tok._coriaHoverRing.destroy?.();
            tok._coriaHoverRing = null;
          }
          tok._onHoverOut?.(ev);
        } catch (_e) {
          // ignore
        }
      });
    }
  }

  /* -------------------------------------------- */
  /*  Status Effects Registration & Management    */
  /* -------------------------------------------- */

  static registerStatusEffects() {
    if (!Array.isArray(CONFIG.statusEffects)) return;

    const customStatuses = [
      {
        id: "ancestral-ward",
        name: "Ancestral Ward",
        img: "modules/altarion-aitusa/dr_icons/ancestral-ward.jpg"
      },
      {
        id: "ancestral-ward-marked",
        name: "Ancestral Ward: Disadvantage vs Others",
        img: "modules/altarion-aitusa/dr_icons/ancestral-ward.jpg"
      },
      {
        id: "ancestral-marking",
        name: "Ancestral Marking: Disadvantage vs Others",
        img: "modules/altarion-aitusa/dr_icons/ancestral-marking.jpg"
      },
      {
        id: "ancestral-shielding",
        name: "Ancestral Shielding (+AC)",
        img: "modules/altarion-aitusa/dr_icons/ancestral-shielding.jpg"
      },
      {
        id: "ancestral-tether",
        name: "Ancestral Tether",
        img: "modules/altarion-aitusa/dr_icons/ancestral-tether.jpg"
      },
      {
        id: "draconic-enhancement",
        name: "Draconic Enhancement (+1 AC & Flight)",
        img: "modules/altarion-aitusa/dr_icons/draconic-enhancement.jpg"
      },
      {
        id: "ancestral-form",
        name: "Ancestral Form",
        img: "modules/altarion-aitusa/dr_icons/ancestral-form.jpg"
      },
      {
        id: "weakening-step",
        name: "Weakening Step (Save Disadvantage)",
        img: "modules/altarion-aitusa/dr_icons/ancestral-marking.jpg"
      },
      {
        id: "warping-step",
        name: "Warping Step (+2 AC)",
        img: "modules/altarion-aitusa/dr_icons/ancestral-shielding.jpg"
      },
      {
        id: "fated-step",
        name: "Fated Step (Advantage on Next Roll)",
        img: "modules/altarion-aitusa/dr_icons/ancestral-spellcasting.jpg"
      },
      {
        id: "arcane-armor",
        name: "Arcane Armor",
        img: "modules/altarion-aitusa/dr_icons/arcane-armor.jpg"
      },
      {
        id: "abjuration-bulwark",
        name: "Abjuration Bulwark",
        img: "modules/altarion-aitusa/dr_icons/abjuration-bulwark.jpg"
      },
      {
        id: "paths-of-destiny",
        name: "Paths of Destiny",
        img: "modules/altarion-aitusa/flinn_icons/paths-of-destiny.jpg"
      },
      {
        id: "shadow-armor",
        name: "Shadow Armor",
        img: "modules/altarion-aitusa/kyrion_icons/shadow-armor.jpg"
      },
      {
        id: "armor-of-agathys",
        name: "Armor of Agathys",
        img: "icons/magic/water/barrier-ice-crystal-wall-jagged-blue.webp"
      },
      {
        id: "silvery-barbs-advantage",
        name: "Silvery Barbs (Advantage on Next Roll)",
        img: "icons/magic/air/wind-stream-blue-gray.webp"
      },
      {
        id: "aid-buff",
        name: "Aid (+Max HP)",
        img: "icons/magic/life/heart-cross-strong-flame-blue.webp"
      },
      {
        id: "spirit-shroud",
        name: "Spirit Shroud",
        img: "icons/magic/unholy/silhouette-robe-evil-glow.webp"
      },
      {
        id: "warding-bond",
        name: "Warding Bond",
        img: "icons/magic/defensive/shield-barrier-flaming-diamond-gold.webp"
      },
      {
        id: "warding-bond-caster",
        name: "Warding Bond (Caster)",
        img: "icons/magic/defensive/shield-barrier-flaming-diamond-gold.webp"
      },
      {
        id: "spirit-guardians-caster",
        name: "Spirit Guardians (Aura)",
        img: "icons/magic/light/explosion-star-glow-yellow.webp"
      },
      {
        id: "spirit-guardians-immune",
        name: "Spirit Guardians - Immune",
        img: "icons/magic/defensive/shield-barrier-glowing-blue.webp"
      },
      {
        id: "spirit-guardians-affected",
        name: "Spirit Guardians - Affected",
        img: "icons/magic/light/beam-rays-yellow-blue.webp"
      },
      {
        id: "tentacle-of-the-deeps-slow",
        name: "Tentacle of the Deeps (-10 ft Speed)",
        img: "modules/altarion-aitusa/flinn_icons/tentacle-of-the-deeps-spectral.jpg"
      },
      {
        id: "dark-vitality",
        name: "Dark Vitality",
        img: "modules/altarion-aitusa/kyrion_icons/dark-vitality.jpg"
      }
    ];

    for (const st of customStatuses) {
      if (!CONFIG.statusEffects.some(e => e.id === st.id)) {
        CONFIG.statusEffects.push(st);
      }
    }
  }

  static hasStatus(actor, statusId) {
    if (!actor) return false;
    if (actor.statuses?.has(statusId)) return true;
    return Boolean(
      actor.effects?.some(
        e =>
          !e.disabled &&
          (e.statuses?.has?.(statusId) || e.flags?.["altarion-aitusa"]?.statusId === statusId)
      )
    );
  }

  static _actorEffectLocks = new Map();

  static doesEffectMatchStatusFamily(eff, statusId, targetName = "") {
    if (!eff) return false;
    const flags = eff.flags?.["altarion-aitusa"] || {};
    if (eff.statuses?.has?.(statusId) || flags.statusId === statusId) return true;

    const effNameLower = String(eff.name || "").trim().toLowerCase().replace(/’/g, "'");
    if (!effNameLower) return false;

    // Never match or overwrite Foundry's Concentration marker effect
    if (effNameLower.startsWith("concentrating") || eff.statuses?.has?.("concentrating")) return false;

    const targetNameLower = String(targetName || "").trim().toLowerCase().replace(/’/g, "'");
    if (targetNameLower && effNameLower === targetNameLower) return true;

    switch (statusId) {
      case "aid-buff":
        return (
          Boolean(flags.isAidBuffEffect) ||
          effNameLower === "aid" ||
          effNameLower.startsWith("aid (") ||
          effNameLower.startsWith("aid -") ||
          flags.statusId === "linked-spell-aid"
        );
      case "arcane-armor":
        return (
          Boolean(flags.isArcaneArmorEffect) ||
          effNameLower.startsWith("arcane armor") ||
          effNameLower.startsWith("armor of agathys") ||
          flags.statusId === "linked-spell-arcane-armor" ||
          flags.statusId === "linked-spell-armor-of-agathys"
        );
      case "shadow-armor":
        return Boolean(flags.isShadowArmorEffect) || effNameLower.startsWith("shadow armor");
      case "armor-of-agathys":
        return Boolean(flags.isArmorOfAgathysEffect) || effNameLower.startsWith("armor of agathys");
      case "abjuration-bulwark":
        return (
          Boolean(flags.isAbjurationBulwarkEffect) ||
          effNameLower.startsWith("abjuration bulwark") ||
          flags.statusId === "linked-spell-abjuration-bulwark"
        );
      case "spirit-shroud":
        return (
          Boolean(flags.isSpiritShroudEffect) ||
          effNameLower.startsWith("spirit shroud") ||
          flags.statusId === "linked-spell-spirit-shroud"
        );
      case "spirit-guardians-caster":
        return (
          Boolean(flags.isSpiritGuardiansCaster) ||
          (effNameLower.startsWith("spirit guardians") &&
            !effNameLower.includes("immune") &&
            !effNameLower.includes("affected"))
        );
      case "spirit-guardians-immune":
        return Boolean(flags.isSpiritGuardiansImmune) || effNameLower.includes("spirit guardians - immune");
      case "spirit-guardians-affected":
        return Boolean(flags.isSpiritGuardiansAffected) || effNameLower.includes("spirit guardians - affected");
      case "warding-bond":
        return Boolean(flags.isWardingBondTargetEffect) || effNameLower.startsWith("warding bond (");
      case "warding-bond-caster":
        return Boolean(flags.isWardingBondCasterEffect) || effNameLower.startsWith("warding bond: linked");
      case "tentacle-of-the-deeps-slow":
        return Boolean(flags.isTentacleOfTheDeepsSlow) || effNameLower.includes("tentacle of the deeps");
      case "dark-vitality":
        return Boolean(flags.isDarkVitalityEffect) || effNameLower === "dark vitality";
      default:
        return false;
    }
  }

  static _withActorEffectLock(actor, fn) {
    const lockKey = actor?.uuid || actor?.id;
    if (!lockKey) return Promise.resolve(null);
    const prevLock = this._actorEffectLocks.get(lockKey) || Promise.resolve();
    let result = null;
    const nextLock = prevLock
      .catch(() => {})
      .then(async () => {
        result = await fn();
      });
    this._actorEffectLocks.set(lockKey, nextLock);
    return nextLock.then(() => result);
  }

  /**
   * Safely delete one or more ActiveEffects from an Actor inside the per-actor lock,
   * re-verifying that every ID still exists on `actor.effects` right before sending the DB request
   * so breaking Concentration or concurrent cleanups never throw `ActiveEffect "<id>" does not exist!`.
   */
  static async safeDeleteActorEffects(actor, ids, options = {}) {
    if (!actor || !Array.isArray(ids) || ids.length === 0) return [];
    const uniqueIds = Array.from(new Set(ids.filter(Boolean)));
    if (uniqueIds.length === 0) return [];
    return this._withActorEffectLock(actor, async () => {
      const stillExistingIds = uniqueIds.filter(id => Boolean(actor.effects?.has?.(id)));
      if (stillExistingIds.length === 0) return [];
      try {
        return await actor.deleteEmbeddedDocuments("ActiveEffect", stillExistingIds, options);
      } catch (err) {
        const msg = String(err?.message || err || "");
        if (msg.includes("does not exist")) return [];
        throw err;
      }
    });
  }

  static async applyOrUpdateStatusEffect(actor, config) {
    if (!actor) return null;
    return this._withActorEffectLock(actor, () => this._applyOrUpdateStatusEffectImpl(actor, config));
  }

  static async _applyOrUpdateStatusEffectImpl(
    actor,
    {
      statusId,
      name,
      img,
      description = "",
      changes = [],
      durationSeconds = null,
      durationRounds = null,
      durationTurns = null,
      expiresAtEndOfTurnOf = null,
      expiresAtStartOfTurnOf = null,
      extraFlags = {}
    }
  ) {
    if (!actor) return null;

    // Find all existing effects matching this statusId or spell family and remove any accidental/legacy duplicates
    const matchingEffects = actor.effects.filter(e => this.doesEffectMatchStatusFamily(e, statusId, name));
    // Sort so the authoritative effect with the highest potency / exact statusId is kept first
    matchingEffects.sort((a, b) => {
      const aExact = a.flags?.["altarion-aitusa"]?.statusId === statusId ? 1 : 0;
      const bExact = b.flags?.["altarion-aitusa"]?.statusId === statusId ? 1 : 0;
      if (aExact !== bExact) return bExact - aExact;
      const aPot = Number(a.flags?.["altarion-aitusa"]?.potency ?? a.flags?.["altarion-aitusa"]?.slotLevel ?? 0);
      const bPot = Number(b.flags?.["altarion-aitusa"]?.potency ?? b.flags?.["altarion-aitusa"]?.slotLevel ?? 0);
      return bPot - aPot;
    });

    if (matchingEffects.length > 1) {
      try {
        await actor.deleteEmbeddedDocuments(
          "ActiveEffect",
          matchingEffects.slice(1).map(e => e.id)
        );
      } catch (_e) {
        // ignore if already deleted
      }
    }
    const existing = matchingEffects[0] || null;
    const combat = game.combat;

    // Enforce D&D 5e "Combining Magical Effects":
    // "The effects of the same spell cast multiple times do not combine. Instead, only the most potent effect
    //  (or the highest-level version) applies while their durations overlap."
    if (existing && !existing.disabled) {
      const exFlags = existing.flags?.["altarion-aitusa"] || {};
      const existingPotency = Number(
        exFlags.potency ??
          exFlags.aidHpBonus ??
          exFlags.retaliationDamage ??
          exFlags.bonusDice ??
          exFlags.acBonus ??
          exFlags.slotLevel ??
          0
      );
      const newPotency = Number(
        extraFlags.potency ??
          extraFlags.aidHpBonus ??
          extraFlags.retaliationDamage ??
          extraFlags.bonusDice ??
          extraFlags.acBonus ??
          extraFlags.slotLevel ??
          0
      );

      if (existingPotency > 0 && newPotency > 0 && newPotency < existingPotency) {
        // Keep the higher-level / more potent effect's changes, name, description, and flags!
        // Only refresh duration if the new duration is longer.
        const keepSeconds = Math.max(Number(existing.duration?.seconds || 0), Number(durationSeconds || 0)) || null;
        const keepRounds = Math.max(Number(existing.duration?.rounds || 0), Number(durationRounds || 0)) || null;
        await existing.update({
          disabled: false,
          "duration.seconds": keepSeconds,
          "duration.rounds": keepRounds,
          "duration.startRound": combat?.round ?? existing.duration?.startRound ?? null,
          "duration.startTurn": combat?.turn ?? existing.duration?.startTurn ?? null
        });
        ui.notifications?.info?.(
          `[Combining Magical Effects] A more potent version of "${existing.name}" is already active on ${actor.name} — keeping the higher-level effect!`
        );
        return existing;
      }
    }

    const effectData = {
      name,
      img: img || "modules/altarion-aitusa/dr_icons/ancestral-magic.jpg",
      origin: actor.uuid,
      disabled: false,
      statuses: [statusId],
      changes,
      description,
      duration: {
        seconds: durationSeconds,
        rounds: durationRounds,
        turns: durationTurns,
        startRound: combat?.round ?? null,
        startTurn: combat?.turn ?? null
      },
      flags: {
        "altarion-aitusa": {
          statusId,
          expiresAtEndOfTurnOf,
          expiresAtStartOfTurnOf,
          appliedRound: combat?.round ?? 0,
          appliedTurn: combat?.turn ?? 0,
          ...extraFlags
        }
      }
    };

    if (existing) {
      await existing.update(effectData);
      return existing;
    } else {
      const created = await actor.createEmbeddedDocuments("ActiveEffect", [effectData]);
      return created?.[0] || null;
    }
  }

  static async removeStatusEffect(actor, statusId, options = {}) {
    if (!actor) return;
    const ids = actor.effects
      .filter(e => this.doesEffectMatchStatusFamily(e, statusId))
      .map(e => e.id);
    if (ids.length > 0) {
      await this.safeDeleteActorEffects(actor, ids, options);
    }
  }

  /* -------------------------------------------- */
  /*  Spell Qualifying & Target Helpers           */
  /* -------------------------------------------- */

  static isSpellEligibleForLinkedCasting(item, activity) {
    if (!item || item.type !== "spell") return false;
    const rangeUnits = String(activity?.range?.units || item.system?.range?.units || "").toLowerCase();
    const affectsType = String(activity?.target?.affects?.type || item.system?.target?.affects?.type || "").toLowerCase();
    const affectsCount = String(activity?.target?.affects?.count ?? item.system?.target?.affects?.count ?? "1").trim();
    const templateType = String(activity?.target?.template?.type || item.system?.target?.template?.type || "").toLowerCase();

    // All Self spells (even if they have a self-emanation or no explicit target type) qualify
    if (rangeUnits === "self" || affectsType === "self") return true;
    if (templateType) return false;
    if (
      ["creature", "ally", "willing", "any", ""].includes(affectsType) &&
      (affectsCount === "" || affectsCount === "1" || Number(affectsCount) === 1)
    ) {
      return true;
    }
    return false;
  }

  /**
   * Select both Altarion and Aitusa as targets on the active canvas (and return both actors & tokens)
   */
  static selectAltarionAndAitusaTargets(altarion = null, aitusa = null) {
    altarion = altarion || this.getAltarionActor();
    aitusa = aitusa || this.getAitusaActor();

    const altarionTok = this.getActorCanvasToken(altarion);
    const aitusaTok = this.getActorCanvasToken(aitusa);

    try {
      if (altarionTok?.setTarget) {
        altarionTok.setTarget(true, { user: game.user, releaseOthers: false, groupSelection: true });
      }
      if (aitusaTok?.setTarget) {
        aitusaTok.setTarget(true, { user: game.user, releaseOthers: false, groupSelection: true });
      }
      if (game.user?.updateTokenTargets) {
        const currentIds = new Set(Array.from(game.user.targets || []).map(t => t.id));
        if (altarionTok) currentIds.add(altarionTok.id);
        if (aitusaTok) currentIds.add(aitusaTok.id);
        if (currentIds.size > 0) {
          game.user.updateTokenTargets(Array.from(currentIds));
        }
      }
    } catch (err) {
      console.warn("[Altarion & Aitusa] Could not set canvas token targets for Linked Casting:", err);
    }

    const recipientSet = new Set();
    for (const tok of game.user?.targets || []) {
      if (tok?.actor) recipientSet.add(tok.actor);
    }
    if (altarion) recipientSet.add(altarion);
    if (aitusa) recipientSet.add(aitusa);

    return {
      recipientActors: Array.from(recipientSet),
      altarionTok,
      aitusaTok
    };
  }

  /**
   * Determine if a given spell/activity roll belongs to an active Linked Casting cast
   */
  static isRollFromLinkedCasting(item) {
    if (!item || item.type !== "spell") return false;
    const itemNameLower = item.name?.trim().toLowerCase().replace(/’/g, "'");

    // 1. Check in-memory tracker (within 2 minutes)
    if (
      this._activeLinkedCast &&
      Date.now() - (this._activeLinkedCast.timestamp || 0) < 120000 &&
      (this._activeLinkedCast.itemId === item.id || this._activeLinkedCast.itemNameLower === itemNameLower)
    ) {
      return true;
    }

    // 2. Check recent ChatMessages for this spell that have the linkedCastingUsed flag
    const recentMsgs = Array.from(game.messages || []).slice(-15).reverse();
    for (const msg of recentMsgs) {
      const linkedFlag = msg.flags?.["altarion-aitusa"]?.linkedCastingUsed;
      if (!linkedFlag) continue;
      const dndItem = msg.flags?.dnd5e?.item;
      const msgItemId = dndItem?.id || dndItem?._id || (typeof msg.flags?.dnd5e?.use?.itemUuid === "string" && msg.flags.dnd5e.use.itemUuid.split(".").pop());
      if (msgItemId === item.id || linkedFlag.spellNameLower === itemNameLower) {
        if (Date.now() - Number(msg.timestamp || 0) < 120000) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Apply a spell's ActiveEffects (or create a duration buff status effect for Self/buff spells without embedded effects)
   * to both Altarion and Aitusa when Linked Casting is used.
   */
  static async applyLinkedCastingSpellEffects(item, activity, recipientActors) {
    if (!item || !recipientActors?.length) return;
    const itemNameLower = item.name?.trim().toLowerCase().replace(/’/g, "'");

    // Skip pure instant Temp HP spells or spells with dedicated custom status handlers
    if (
      itemNameLower === "altarion's echoing ward" ||
      itemNameLower === "false life" ||
      itemNameLower === "armor of agathys" ||
      itemNameLower === "arcane armor" ||
      itemNameLower === "shadow armor" ||
      itemNameLower === "abjuration bulwark" ||
      itemNameLower === "aid" ||
      itemNameLower === "spirit shroud" ||
      itemNameLower === "spirit guardians" ||
      itemNameLower === "warding bond" ||
      itemNameLower === "shield" ||
      itemNameLower === "silvery barbs" ||
      item.flags?.["altarion-aitusa"]?.isArcaneArmorSpell ||
      item.flags?.["altarion-aitusa"]?.isShadowArmorSpell ||
      item.flags?.["altarion-aitusa"]?.isArmorOfAgathysSpell ||
      item.flags?.["altarion-aitusa"]?.isAbjurationBulwarkSpell
    ) {
      return;
    }

    // 1. If the spell has embedded ActiveEffects in item.effects, apply them to all recipients (Altarion & Aitusa)
    const embeddedEffects = Array.from(item.effects || []);
    if (embeddedEffects.length > 0) {
      for (const targetActor of recipientActors) {
        if (!targetActor) continue;
        for (const eff of embeddedEffects) {
          const alreadyHas = targetActor.effects.some(
            e => !e.disabled && (e.name === eff.name || e.origin === item.uuid)
          );
          if (!alreadyHas) {
            const effData = eff.toObject();
            delete effData._id;
            effData.disabled = false;
            effData.transfer = false;
            effData.origin = item.uuid;
            await targetActor.createEmbeddedDocuments("ActiveEffect", [effData], {
              altarionLinkedMirror: true
            });
          }
        }
      }
      return;
    }

    // 2. If the spell has no embedded ActiveEffects, but has a duration (round, turn, minute, hour, day),
    //    create an ActiveEffect representing the spell buff on both Altarion and Aitusa
    const durUnits = String(activity?.duration?.units || item.system?.duration?.units || "").toLowerCase();
    const durVal = Number(activity?.duration?.value || item.system?.duration?.value || 1) || 1;
    if (!["round", "turn", "minute", "hour", "day"].includes(durUnits)) return;

    let durationSeconds = null;
    let durationRounds = null;
    let durationTurns = null;
    if (durUnits === "round") {
      durationRounds = durVal;
      durationSeconds = durVal * 6;
    } else if (durUnits === "turn") {
      durationTurns = durVal;
      durationSeconds = 6;
    } else if (durUnits === "minute") {
      durationSeconds = durVal * 60;
      durationRounds = durVal * 10;
    } else if (durUnits === "hour") {
      durationSeconds = durVal * 3600;
    } else if (durUnits === "day") {
      durationSeconds = durVal * 86400;
    }

    // Add known mechanical changes for common Self/1-creature spells if they lacked embedded ActiveEffects
    const changes = [];
    if (itemNameLower === "shield") {
      changes.push({
        key: "system.attributes.ac.bonus",
        mode: CONST.ACTIVE_EFFECT_MODES.ADD,
        value: "+5",
        priority: 20
      });
    } else if (itemNameLower === "haste" || itemNameLower === "shield of faith") {
      changes.push({
        key: "system.attributes.ac.bonus",
        mode: CONST.ACTIVE_EFFECT_MODES.ADD,
        value: "+2",
        priority: 20
      });
    } else if (itemNameLower === "longstrider") {
      changes.push({
        key: "system.attributes.movement.walk",
        mode: CONST.ACTIVE_EFFECT_MODES.ADD,
        value: "+10",
        priority: 20
      });
    }

    const statusSlug = `linked-spell-${itemNameLower.replace(/[^a-z0-9]+/g, "-")}`;
    for (const targetActor of recipientActors) {
      if (!targetActor) continue;
      await this.applyOrUpdateStatusEffect(targetActor, {
        statusId: statusSlug,
        name: `${item.name} (Linked Casting)`,
        img: item.img || "modules/altarion-aitusa/dr_icons/ancestral-spellcasting.jpg",
        description: item.system?.description?.value || `<p>Affected by <strong>${item.name}</strong> via Linked Casting.</p>`,
        changes,
        durationSeconds,
        durationRounds,
        durationTurns,
        extraFlags: { isLinkedSpellEffect: true, spellId: item.id }
      });
    }
  }

  /* -------------------------------------------- */
  /*  Activity Usage Dialog Injection             */
  /* -------------------------------------------- */

  static registerDialogHooks() {
    Hooks.on("renderActivityUsageDialog", (dialog, html) => {
      try {
        const actor = dialog?.actor;
        const item = dialog?.item;
        const activity = dialog?.activity;
        if (!actor || !item || !activity) return;

        const rootEl = html instanceof HTMLElement ? html : html?.[0];
        if (!rootEl) return;

        // 1. AITUSA SPELLCASTING: Draconic Focus option to consume Altarion's Spell Slot
        //    Dynamically updates its label whenever the player changes the "Cast at Level" dropdown!
        if (this.isAitusa(actor) && item.type === "spell" && Number(item.system?.level || 0) > 0) {
          const altarion = this.getAltarionActor();
          const riderLvl = this.getRiderLevel(altarion);
          if (altarion && riderLvl >= 7) {
            const resolveSelectedSpellLevel = () => {
              const baseLvl = Math.max(1, Number(item.system?.level || 1));
              const slotSelect = rootEl.querySelector('select[name="spell.slot"]');
              const rawSlotVal = slotSelect?.value || dialog.config?.spell?.slot || "";
              if (typeof rawSlotVal === "string" && rawSlotVal) {
                if (rawSlotVal === "pact") {
                  return Math.max(
                    baseLvl,
                    Number(altarion.system?.spells?.pact?.level || actor.system?.spells?.pact?.level || baseLvl)
                  );
                }
                const m = /^spell(\d+)$/i.exec(rawSlotVal);
                if (m) return Math.max(baseLvl, Number(m[1]));
                const num = Number(rawSlotVal);
                if (Number.isFinite(num) && num >= baseLvl) return num;
              }
              const scalingInput = rootEl.querySelector('[name="scaling"]');
              if (scalingInput && scalingInput.value !== undefined && scalingInput.value !== "") {
                const sc = Number(scalingInput.value || 0);
                if (Number.isFinite(sc)) return Math.max(baseLvl, baseLvl + sc);
              }
              if (dialog.config?.scaling) {
                return Math.max(baseLvl, baseLvl + Number(dialog.config.scaling || 0));
              }
              return baseLvl;
            };

            let wrapper = rootEl.querySelector(".altarion-draconic-focus-opt");
            if (!wrapper) {
              wrapper = document.createElement("fieldset");
              wrapper.className = "altarion-draconic-focus-opt";
              wrapper.style.margin = "6px 0";
              wrapper.style.border = "1px solid rgba(139, 92, 246, 0.5)";
              wrapper.style.borderRadius = "6px";
              wrapper.style.padding = "6px 10px";
              wrapper.style.background = "rgba(88, 28, 135, 0.15)";
              wrapper.innerHTML = `
                <legend class="altarion-df-legend" style="color: #c4b5fd; font-weight: 700; font-size: 12px;"></legend>
                <div class="form-group">
                  <label class="checkbox" style="display: flex; align-items: center; gap: 6px; cursor: pointer;">
                    <input type="checkbox" name="altarionConsumeSlot">
                    <span class="altarion-df-label-text"></span>
                  </label>
                </div>
              `;

              const checkbox = wrapper.querySelector('input[name="altarionConsumeSlot"]');
              checkbox?.addEventListener("change", (ev) => {
                const checked = Boolean(ev.currentTarget.checked);
                dialog.config.consumeAltarionSlot = checked;
                const ownSlotCheckbox = rootEl.querySelector('input[name="consume.spellSlot"]');
                if (ownSlotCheckbox && checked) {
                  ownSlotCheckbox.checked = false;
                  if (typeof dialog.config.consume === "object" && dialog.config.consume) {
                    dialog.config.consume.spellSlot = false;
                  }
                }
              });

              const footer = rootEl.querySelector("footer, .form-footer");
              if (footer) footer.insertAdjacentElement("beforebegin", wrapper);
              else rootEl.querySelector("form")?.appendChild(wrapper);
            }

            const refreshDraconicFocusBox = () => {
              const spellLvl = resolveSelectedSpellLevel();
              const slotObj = altarion.system?.spells?.[`spell${spellLvl}`];
              const availSlots = Number(slotObj?.value || 0);
              const maxSlots = Number(slotObj?.max || 0);

              const focusItem = altarion.items.find(
                i => i.type === "feat" && i.name?.trim().toLowerCase() === "draconic focus"
              );
              const focusMax = Math.max(
                1,
                Number(focusItem?.system?.uses?.max || altarion.system?.abilities?.int?.mod || 3)
              );
              const focusSpent = Math.clamp(Number(focusItem?.system?.uses?.spent || 0), 0, focusMax);
              const focusAvail = Math.max(0, focusMax - focusSpent);
              const canUseFocus = availSlots > 0 && focusAvail > 0;

              const legendEl = wrapper.querySelector(".altarion-df-legend");
              if (legendEl) {
                legendEl.innerHTML = `<i class="fas fa-dragon"></i> Draconic Focus (${focusAvail}/${focusMax} uses left)`;
              }
              const textEl = wrapper.querySelector(".altarion-df-label-text");
              if (textEl) {
                textEl.innerHTML = `Consume <strong>Altarion's Level ${spellLvl} Spell Slot</strong> (${availSlots}/${maxSlots} available) &amp; 1 <strong>Draconic Focus</strong> use (${focusAvail}/${focusMax})`;
              }
              const checkbox = wrapper.querySelector('input[name="altarionConsumeSlot"]');
              if (checkbox) {
                checkbox.disabled = !canUseFocus;
                if (!canUseFocus && checkbox.checked) {
                  checkbox.checked = false;
                  dialog.config.consumeAltarionSlot = false;
                } else {
                  checkbox.checked = Boolean(dialog.config?.consumeAltarionSlot) && canUseFocus;
                }
              }
            };

            refreshDraconicFocusBox();

            for (const ctrl of rootEl.querySelectorAll('select[name="spell.slot"], [name="scaling"]')) {
              if (ctrl.dataset.boundDraconicFocusSync) continue;
              ctrl.dataset.boundDraconicFocusSync = "true";
              ctrl.addEventListener("change", refreshDraconicFocusBox);
              ctrl.addEventListener("input", refreshDraconicFocusBox);
            }
          }
        }

        // 2. ALTARION SPELLCASTING: Linked Casting option to also target Aitusa
        if (this.isAltarion(actor) && this.isSpellEligibleForLinkedCasting(item, activity)) {
          const aitusa = this.getAitusaActor();
          const riderLvl = this.getRiderLevel(actor);
          if (aitusa && riderLvl >= 3 && !rootEl.querySelector(".altarion-linked-casting-opt")) {
            const maxCharges = Math.max(1, Number(aitusa.system?.abilities?.int?.mod ?? 3));
            const curCharges = Number(actor.system?.resources?.secondary?.value ?? maxCharges);
            const isChecked = Boolean(dialog.config?.useLinkedCasting);

            const altarionTok = this.getActorCanvasToken(actor);
            const aitusaTok = this.getActorCanvasToken(aitusa);
            const distFt = this.getTokenDistanceFt(altarionTok, aitusaTok);
            const distText = distFt !== null ? `${distFt} ft away` : "within 30 ft";

            const wrapper = document.createElement("fieldset");
            wrapper.className = "altarion-linked-casting-opt";
            wrapper.style.margin = "6px 0";
            wrapper.style.border = "1px solid rgba(96, 165, 250, 0.5)";
            wrapper.style.borderRadius = "6px";
            wrapper.style.padding = "6px 10px";
            wrapper.style.background = "rgba(30, 58, 138, 0.15)";
            wrapper.innerHTML = `
              <legend style="color: #93c5fd; font-weight: 700; font-size: 12px;">
                <i class="fas fa-link"></i> Linked Casting (Ancestral Spellcasting)
              </legend>
              <div class="form-group">
                <label class="checkbox" style="display: flex; align-items: center; gap: 6px; cursor: pointer;">
                  <input type="checkbox" name="altarionUseLinkedCasting" ${isChecked ? "checked" : ""} ${curCharges <= 0 ? "disabled" : ""}>
                  <span>Also target <strong>${aitusa.name}</strong> (${distText}) — Consumes 1 <strong>Linked Casting</strong> (${curCharges}/${maxCharges} left)</span>
                </label>
              </div>
            `;

            const checkbox = wrapper.querySelector('input[name="altarionUseLinkedCasting"]');
            checkbox?.addEventListener("change", (ev) => {
              const checked = Boolean(ev.currentTarget.checked);
              dialog.config.useLinkedCasting = checked;
              if (checked) {
                this.selectAltarionAndAitusaTargets(actor, aitusa);
              }
            });

            const footer = rootEl.querySelector("footer, .form-footer");
            if (footer) footer.insertAdjacentElement("beforebegin", wrapper);
            else rootEl.querySelector("form")?.appendChild(wrapper);
          }
        }

        // 3. Suppress MeasuredTemplate checkbox for CoriaAuraEngine / custom-automated spells (Spirit Guardians, Spirit Shroud, Spiritual Weapon, Tentacle of the Deeps, Aid, etc.)
        const dlgSpellName = item.name?.trim().toLowerCase().replace(/’/g, "'") || "";
        if (
          (item.type === "spell" &&
            [
              "spirit guardians",
              "spirit shroud",
              "spiritual weapon",
              "aid",
              "warding bond",
              "arcane armor",
              "shadow armor",
              "armor of agathys",
              "abjuration bulwark"
            ].includes(dlgSpellName)) ||
          dlgSpellName === "tentacle of the deeps"
        ) {
          if (dialog.config) {
            dialog.config.create ??= {};
            dialog.config.create.measuredTemplate = false;
          }
          const tplInput = rootEl.querySelector('input[name="create.measuredTemplate"]');
          if (tplInput) {
            tplInput.checked = false;
            const grp = tplInput.closest(".form-group") || tplInput.parentElement;
            if (grp) grp.style.display = "none";
          }
        }
      } catch (err) {
        console.warn("[Altarion & Aitusa] Error injecting ActivityUsageDialog options:", err);
      }
    });
  }

  /* -------------------------------------------- */
  /*  Activity Pre/Post & Consumption Hooks       */
  /* -------------------------------------------- */

  static registerActivityHooks() {
    // 1. Pre-use activity: Sanitize fixed-value & aura spells (Aid, Arcane Armor, Shadow Armor, Armor of Agathys,
    //    Abjuration Bulwark, Spirit Shroud, Spirit Guardians, Spiritual Weapon, Warding Bond, Tentacle of the Deeps)
    //    so they NEVER trigger an unnecessary healing/damage roll dialog, MeasuredTemplate placement prompt, or duplicate compendium ActiveEffect!
    Hooks.on("dnd5e.preUseActivity", async (activity, usageConfig, dialogConfig) => {
      const item = activity?.item;
      const actor = item?.actor;
      if (!item || !actor) return;

      const itemNameLower = item.name?.trim().toLowerCase().replace(/’/g, "'") || "";
      const isNoRollOrAuraSpell =
        (item.type === "spell" &&
          (itemNameLower === "spirit guardians" ||
            itemNameLower === "spirit shroud" ||
            itemNameLower === "spiritual weapon" ||
            itemNameLower === "aid" ||
            itemNameLower === "warding bond" ||
            itemNameLower === "arcane armor" ||
            itemNameLower === "shadow armor" ||
            itemNameLower === "armor of agathys" ||
            itemNameLower === "abjuration bulwark" ||
            Boolean(item.flags?.["altarion-aitusa"]?.isArcaneArmorSpell) ||
            Boolean(item.flags?.["altarion-aitusa"]?.isShadowArmorSpell) ||
            Boolean(item.flags?.["altarion-aitusa"]?.isArmorOfAgathysSpell) ||
            Boolean(item.flags?.["altarion-aitusa"]?.isAbjurationBulwarkSpell) ||
            Boolean(item.flags?.["altarion-aitusa"]?.isSpiritualWeaponSpell))) ||
        (item.type === "feat" &&
          (itemNameLower === "tentacle of the deeps" ||
            itemNameLower.includes("abjurer's echo") ||
            Boolean(item.flags?.["altarion-aitusa"]?.isTentacleOfTheDeepsFeat)));

      if (isNoRollOrAuraSpell) {
        // 1a. Prevent MeasuredTemplate placement on cast (CoriaAuraEngine & Summon Token placement handle map visuals!)
        if (usageConfig) {
          usageConfig.create ??= {};
          usageConfig.create.measuredTemplate = false;
        }

        // 1b. Prevent HealActivity / DamageActivity / SaveActivity / AttackActivity from opening a second Roll Dialog after the Cast Spell dialog
        if (activity && typeof activity === "object") {
          activity._triggerSubsequentActions = async () => {};
        }

        try {
          if (actor.isOwner) {
            if (itemNameLower === "spiritual weapon") {
              await globalThis.FlinnManager?.ensureSpiritualWeaponConfigured?.(actor);
            } else if (itemNameLower === "tentacle of the deeps") {
              await globalThis.ParvaManager?.ensureTentacleOfTheDeepsConfigured?.(actor);
            } else if (itemNameLower.includes("abjurer's echo")) {
              await this.sanitizeAbjurersEchoItem(item);
            }

            // 1c. Delete any raw compendium embedded ActiveEffects on the spell item so dnd5e never applies duplicates
            const rawEffectIds = Array.from(item.effects || []).map(e => e.id).filter(Boolean);
            if (rawEffectIds.length > 0) {
              await item.deleteEmbeddedDocuments("ActiveEffect", rawEffectIds);
            }

            // 1d. Clear template type on Spirit Guardians / Spirit Shroud / Spiritual Weapon / Tentacle of the Deeps and clear heal/damage formulas on fixed buff spells
            const itemUpdates = {};
            if (
              (itemNameLower === "spirit guardians" ||
                itemNameLower === "spirit shroud" ||
                itemNameLower === "spiritual weapon" ||
                itemNameLower === "tentacle of the deeps") &&
              item.system?.target?.template?.type
            ) {
              itemUpdates["system.target.template.type"] = "";
            }

            if (item.system?.activities && itemNameLower !== "spirit guardians") {
              const entries =
                typeof item.system.activities.entries === "function"
                  ? Array.from(item.system.activities.entries())
                  : Object.entries(item.system.activities);
              for (const [actId, actDoc] of entries) {
                if (!actDoc) continue;
                const hasDmgParts = Array.isArray(actDoc.damage?.parts) && actDoc.damage.parts.length > 0;
                const hasHealBonus = Boolean(actDoc.healing?.bonus || actDoc.healing?.number || actDoc.healing?.custom?.formula);
                if (hasDmgParts || hasHealBonus) {
                  itemUpdates[`system.activities.${actId}.damage.parts`] = [];
                  itemUpdates[`system.activities.${actId}.healing.bonus`] = "";
                  itemUpdates[`system.activities.${actId}.healing.number`] = null;
                  itemUpdates[`system.activities.${actId}.healing.denomination`] = null;
                  itemUpdates[`system.activities.${actId}.healing.custom.enabled`] = false;
                  itemUpdates[`system.activities.${actId}.healing.custom.formula`] = "";
                }
              }
            }
            if (!foundry.utils.isEmpty(itemUpdates)) {
              await item.update(itemUpdates);
            }
          }
        } catch (_e) {
          // ignore
        }
      }

      // If Altarion is casting a Self / 1-creature spell that normally skips the configuration dialog (e.g. Self spell or cantrip),
      // force the dialog to open if Linked Casting charges are available so the player can toggle Linked Casting
      if (
        this.isAltarion(actor) &&
        this.isSpellEligibleForLinkedCasting(item, activity) &&
        Number(actor.system?.resources?.secondary?.value ?? 0) > 0 &&
        dialogConfig
      ) {
        usageConfig.hasConsumption = true;
        dialogConfig.configure = true;
      }

      // Evoker's Echo (Forceful Step): Place a 5 ft circular template centered on Altarion and target creatures inside
      if (this.isAltarion(actor) && itemNameLower.includes("evoker's echo")) {
        await this.placeSelfRadiusTemplate(actor, 5, { excludeSelf: true });
      }

      // Shadow Blast (Kyrion): Dynamically apply Eldritch Spear range (300 ft vs 120 ft)
      if (item.flags?.["altarion-aitusa"]?.isShadowBlastSpell || itemNameLower === "shadow blast") {
        const hasEldritchSpear = Boolean(
          actor.items?.some(i => i.type === "feat" && i.name?.trim().toLowerCase().includes("eldritch spear"))
        );
        const targetRange = hasEldritchSpear ? 300 : 120;
        if (Number(item.system?.range?.value) !== targetRange && actor.isOwner) {
          await item.update({
            "system.range.value": targetRange,
            "system.activities.shadowBlastAtk01.range.value": targetRange
          });
        }
      }
    });

    // 2. Pre-Activity Consumption: Handle Draconic Focus (Altarion slot) & Linked Casting resource consumption
    Hooks.on("dnd5e.preActivityConsumption", async (activity, usageConfig, messageConfig) => {
      const item = activity?.item;
      const actor = item?.actor;
      if (!item || !actor) return;

      // Record exact effective spell slot level before consumption mutates usageConfig
      if (item.type === "spell") {
        const itemNameLower = item.name?.trim().toLowerCase().replace(/’/g, "'") || "";
        if (
          [
            "spirit guardians",
            "spirit shroud",
            "spiritual weapon",
            "aid",
            "warding bond",
            "arcane armor",
            "shadow armor",
            "armor of agathys",
            "abjuration bulwark"
          ].includes(itemNameLower)
        ) {
          if (usageConfig) {
            usageConfig.create ??= {};
            usageConfig.create.measuredTemplate = false;
          }
          if (activity && typeof activity === "object") {
            activity._triggerSubsequentActions = async () => {};
          }
        }

        const slotLevel = this.getEffectiveSpellSlotLevel(actor, item, usageConfig, null, activity);
        this._lastSpellCastContext = {
          actorId: actor.id,
          itemId: item.id,
          itemNameLower,
          school: String(item.system?.school || "").toLowerCase(),
          baseLevel: Number(item.system?.level || 0),
          slotLevel,
          useLinkedCasting: Boolean(usageConfig?.useLinkedCasting),
          timestamp: Date.now()
        };
        if (messageConfig) {
          foundry.utils.setProperty(messageConfig, "data.flags.altarion-aitusa.castSlotLevel", slotLevel);
        }
      }

      // A. Aitusa consuming Altarion's Spell Slot via Draconic Focus
      if (this.isAitusa(actor) && usageConfig?.consumeAltarionSlot) {
        const altarion = this.getAltarionActor();
        if (!altarion) return;

        const focusItem = altarion.items.find(
          i => i.type === "feat" && i.name?.trim().toLowerCase() === "draconic focus"
        );
        const focusMax = Math.max(
          1,
          Number(focusItem?.system?.uses?.max || altarion.system?.abilities?.int?.mod || 3)
        );
        const focusSpent = Math.clamp(Number(focusItem?.system?.uses?.spent || 0), 0, focusMax);
        const focusAvail = Math.max(0, focusMax - focusSpent);
        if (focusAvail <= 0) {
          ui.notifications.warn(`[Draconic Focus] No Draconic Focus uses remaining (0/${focusMax})!`);
          return false;
        }

        const effectiveLevel = this.getEffectiveSpellSlotLevel(actor, item, usageConfig, null, activity);
        const slotKey = usageConfig.spell?.slot || `spell${effectiveLevel}`;
        const slotObj = altarion.system?.spells?.[slotKey];
        const curSlots = Number(slotObj?.value || 0);

        if (curSlots <= 0) {
          ui.notifications.warn(
            `[Draconic Focus] ${altarion.name} has no Level ${effectiveLevel} spell slots remaining!`
          );
          return false;
        }

        // Prevent Aitusa from consuming her own spell slot
        if (usageConfig.consume === true) {
          usageConfig.consume = { resources: true, spellSlot: false };
        } else if (typeof usageConfig.consume === "object" && usageConfig.consume) {
          usageConfig.consume.spellSlot = false;
        }

        if (focusItem) {
          await focusItem.update({ "system.uses.spent": Math.min(focusMax, focusSpent + 1) });
        }
        await altarion.update({
          [`system.spells.${slotKey}.value`]: Math.max(0, curSlots - 1)
        });

        foundry.utils.setProperty(
          messageConfig,
          "data.flags.altarion-aitusa.draconicFocusUsed",
          {
            altarionName: altarion.name,
            slotLevel: slotObj?.level || effectiveLevel,
            remainingFocus: Math.max(0, focusAvail - 1),
            maxFocus: focusMax
          }
        );
      }

      // B. Altarion using Linked Casting to also target Aitusa
      if (this.isAltarion(actor) && usageConfig?.useLinkedCasting) {
        const aitusa = this.getAitusaActor();
        const curCharges = Number(actor.system?.resources?.secondary?.value ?? 0);
        if (curCharges <= 0) {
          ui.notifications.warn("[Linked Casting] No Linked Casting uses remaining!");
          return false;
        }

        const altarionTok = this.getActorCanvasToken(actor);
        const aitusaTok = this.getActorCanvasToken(aitusa);
        const distFt = this.getTokenDistanceFt(altarionTok, aitusaTok);
        if (distFt !== null && distFt > 30) {
          ui.notifications.warn(
            `[Linked Casting] ${aitusa?.name || "Aitusa"} is ${distFt} ft away (must be within 30 ft)!`
          );
          return false;
        }

        await actor.update({
          "system.resources.secondary.value": Math.max(0, curCharges - 1)
        });

        // Automatically select both Altarion and Aitusa as targets on the canvas and record active Linked Cast
        const { recipientActors, altarionTok: altTok, aitusaTok: aitTok } = this.selectAltarionAndAitusaTargets(
          actor,
          aitusa
        );

        this._activeLinkedCast = {
          itemId: item.id,
          itemNameLower: item.name?.trim().toLowerCase().replace(/’/g, "'"),
          actorId: actor.id,
          recipientActorIds: recipientActors.map(a => a.id),
          timestamp: Date.now()
        };

        // Ensure both Altarion and Aitusa are listed in the chat message's dnd5e targets (even for Self spells)
        const existingTargets = Array.isArray(foundry.utils.getProperty(messageConfig, "data.flags.dnd5e.targets"))
          ? [...foundry.utils.getProperty(messageConfig, "data.flags.dnd5e.targets")]
          : [];
        for (const [act, tok] of [
          [actor, altTok],
          [aitusa, aitTok]
        ]) {
          if (!act) continue;
          const uuid = tok?.actor?.uuid || act.uuid;
          if (!existingTargets.some(t => t.uuid === uuid || t.name === act.name)) {
            existingTargets.push({
              name: tok?.name || act.name,
              img: tok?.document?.texture?.src || act.img,
              uuid,
              ac: act.system?.attributes?.ac?.value ?? null
            });
          }
        }
        foundry.utils.setProperty(messageConfig, "data.flags.dnd5e.targets", existingTargets);

        foundry.utils.setProperty(
          messageConfig,
          "data.flags.altarion-aitusa.linkedCastingUsed",
          {
            altarionName: actor.name,
            aitusaName: aitusa?.name || "Aitusa",
            spellNameLower: item.name?.trim().toLowerCase().replace(/’/g, "'"),
            remainingUses: Math.max(0, curCharges - 1),
            maxUses: Number(actor.system?.resources?.secondary?.max ?? 3)
          }
        );
      }
    });

    // 2b. Pre-Create Usage Message: Ensure Linked Casting targets (both Altarion & Aitusa) persist on the chat card
    Hooks.on("dnd5e.preCreateUsageMessage", (activity, messageConfig) => {
      const linkedUsed = foundry.utils.getProperty(messageConfig, "data.flags.altarion-aitusa.linkedCastingUsed");
      if (!linkedUsed) return;

      const altarion = this.getAltarionActor();
      const aitusa = this.getAitusaActor();
      const { altarionTok, aitusaTok } = this.selectAltarionAndAitusaTargets(altarion, aitusa);

      const existingTargets = Array.isArray(foundry.utils.getProperty(messageConfig, "data.flags.dnd5e.targets"))
        ? [...foundry.utils.getProperty(messageConfig, "data.flags.dnd5e.targets")]
        : [];

      for (const [act, tok] of [
        [altarion, altarionTok],
        [aitusa, aitusaTok]
      ]) {
        if (!act) continue;
        const uuid = tok?.actor?.uuid || act.uuid;
        if (!existingTargets.some(t => t.uuid === uuid || t.name === act.name)) {
          existingTargets.push({
            name: tok?.name || act.name,
            img: tok?.document?.texture?.src || act.img,
            uuid,
            ac: act.system?.attributes?.ac?.value ?? null
          });
        }
      }
      foundry.utils.setProperty(messageConfig, "data.flags.dnd5e.targets", existingTargets);
    });

    // 3. Post-Use Activity: Handle feature activations, status effects & Echo prompts
    Hooks.on("dnd5e.postUseActivity", async (activity, usageConfig, results) => {
      const item = activity?.item;
      const actor = item?.actor;
      if (!item || !actor) return;

      const itemNameLower = item.name?.trim().toLowerCase().replace(/’/g, "'");
      const spellDc =
        actor.system?.attributes?.spell?.dc ||
        8 + Number(actor.system?.abilities?.int?.mod ?? 3) + Number(actor.system?.abilities?.prof ?? 2);

      // Break Veiled Step invisibility if Altarion forces a saving throw
      if (this.isAltarion(actor) && activity.type === "save" && this.hasStatus(actor, "invisible")) {
        await this.removeStatusEffect(actor, "invisible");
      }

      // 0. Linked Casting: Ensure both Altarion & Aitusa are targeted and apply the spell's ActiveEffects/buffs to both
      if (this.isAltarion(actor) && usageConfig?.useLinkedCasting) {
        const aitusa = this.getAitusaActor();
        const { recipientActors } = this.selectAltarionAndAitusaTargets(actor, aitusa);
        await this.applyLinkedCastingSpellEffects(item, activity, recipientActors);
      }

      // 0b. Arcane Armor (Altarion / Aitusa), Shadow Armor (Kyrion), & Armor of Agathys (Parva / others):
      //     Automatically apply 5 * Slot Level Temporary Hit Points AND 1-hour status effect (with Linked Casting & Combining Magical Effects)!
      const isArcaneArmor =
        Boolean(item.flags?.["altarion-aitusa"]?.isArcaneArmorSpell) || itemNameLower === "arcane armor";
      const isShadowArmor =
        Boolean(item.flags?.["altarion-aitusa"]?.isShadowArmorSpell) || itemNameLower === "shadow armor";
      const isArmorOfAgathys =
        Boolean(item.flags?.["altarion-aitusa"]?.isArmorOfAgathysSpell) || itemNameLower === "armor of agathys";

      if (
        ((this.isAltarion(actor) || this.isAitusa(actor)) && isArcaneArmor) ||
        (this.isKyrion(actor) && isShadowArmor) ||
        isArmorOfAgathys
      ) {
        const msgFlagLvl = Number(results?.message?.flags?.["altarion-aitusa"]?.castSlotLevel ?? NaN);
        const slotLevel = Math.max(
          1,
          Number.isFinite(msgFlagLvl)
            ? msgFlagLvl
            : this.getEffectiveSpellSlotLevel(actor, item, usageConfig, results?.message, activity)
        );
        const tempHpAmount = 5 * slotLevel;
        const armorLabel = isShadowArmor
          ? "Shadow Armor"
          : isArmorOfAgathys
            ? "Armor of Agathys"
            : "Arcane Armor";
        const statusId = isShadowArmor
          ? "shadow-armor"
          : isArmorOfAgathys
            ? "armor-of-agathys"
            : "arcane-armor";
        const dmgType = isShadowArmor ? "necrotic" : isArmorOfAgathys ? "cold" : "force";
        const dmgTypeLabel = isShadowArmor ? "Necrotic" : isArmorOfAgathys ? "Cold" : "Force";
        const defaultIcon = isShadowArmor
          ? "modules/altarion-aitusa/kyrion_icons/shadow-armor.jpg"
          : isArmorOfAgathys
            ? item.img || "icons/magic/water/barrier-ice-crystal-wall-jagged-blue.webp"
            : "modules/altarion-aitusa/dr_icons/arcane-armor.jpg";

        this._lastSpellCastContext = {
          actorId: actor.id,
          itemId: item.id,
          itemNameLower,
          school: "abj",
          baseLevel: 1,
          slotLevel,
          useLinkedCasting: Boolean(usageConfig?.useLinkedCasting),
          timestamp: Date.now()
        };

        const aitusa = this.getAitusaActor();
        const isLinked = Boolean(this.isAltarion(actor) && usageConfig?.useLinkedCasting);
        const recipients = isLinked ? [actor, aitusa].filter(Boolean) : [actor];

        const arcaneArmorFullDesc = `<div class="rd__b  rd__b--2"><p>A protective magical force surrounds you, manifesting as crystalline plates of pure arcane energy that cover you and your gear. You gain <strong>${tempHpAmount} temporary hit points</strong> for the duration (Slot Level ${slotLevel}). If a creature hits you with a melee attack while you have these temporary hit points, the creature takes <strong>${tempHpAmount} force damage</strong> <em>(converted from cold damage via Dragon Ancestry)</em>.</p><div class="rd__b  rd__b--3"><span class="rd__h rd__h--3" data-title-index="1"> <span class="entry-title-inner">At Higher Levels.</span></span> <p>When you cast this spell using a spell slot of 2nd level or higher, both the temporary hit points and the force damage increase by <strong>5</strong> for each slot level above 1st (<strong>5 &times; Spell Slot Level</strong>).</p></div></div>`;

        const shadowArmorFullDesc = `<p><strong>Shadow Armor (Slot Level ${slotLevel}):</strong> Protected for 1 hour with <strong>${tempHpAmount} Temporary Hit Points</strong>. While you have these Temporary Hit Points, any creature that hits you with a melee attack takes <strong>${tempHpAmount} Necrotic damage</strong>.</p>`;

        const agathysArmorFullDesc = `<p><strong>Armor of Agathys (Slot Level ${slotLevel}):</strong> Protected for 1 hour with <strong>${tempHpAmount} Temporary Hit Points</strong>. While you have these Temporary Hit Points, any creature that hits you with a melee attack takes <strong>${tempHpAmount} Cold damage</strong>.</p>`;

        for (const targetActor of recipients) {
          if (!isArmorOfAgathys) {
            const legacyAgathysEffIds = targetActor.effects
              .filter(e => {
                const en = String(e.name || "").trim().toLowerCase();
                return (
                  en.includes("armor of agathys") ||
                  e.flags?.["altarion-aitusa"]?.statusId === "linked-spell-armor-of-agathys"
                );
              })
              .map(e => e.id);
            if (legacyAgathysEffIds.length > 0) {
              await targetActor.deleteEmbeddedDocuments("ActiveEffect", legacyAgathysEffIds);
            }
          }

          // Apply 5 * Slot Level Temporary Hit Points immediately upon casting!
          if (typeof targetActor.applyTempHP === "function") {
            await targetActor.applyTempHP(tempHpAmount);
          } else {
            const curTemp = Number(targetActor.system?.attributes?.hp?.temp ?? 0);
            if (tempHpAmount > curTemp) {
              await targetActor.update({ "system.attributes.hp.temp": tempHpAmount }, { altarionBypassWard: true });
            }
          }

          const effectDisplayName = isShadowArmor
            ? `Shadow Armor (${tempHpAmount} Necrotic Retaliation)`
            : isArmorOfAgathys
              ? `Armor of Agathys (${tempHpAmount} Cold Retaliation)`
              : isLinked
                ? "Arcane Armor (Linked Casting)"
                : "Arcane Armor";

          await this.applyOrUpdateStatusEffect(targetActor, {
            statusId,
            name: effectDisplayName,
            img: isShadowArmor || isArmorOfAgathys ? (item.img || defaultIcon) : defaultIcon,
            description: isShadowArmor
              ? shadowArmorFullDesc
              : isArmorOfAgathys
                ? agathysArmorFullDesc
                : arcaneArmorFullDesc,
            durationSeconds: 3600,
            durationRounds: 600,
            extraFlags: {
              ...(isShadowArmor
                ? { isShadowArmorEffect: true }
                : isArmorOfAgathys
                   ? { isArmorOfAgathysEffect: true }
                  : { isArcaneArmorEffect: true }),
              armorLabel,
              slotLevel,
              potency: tempHpAmount,
              retaliationDamage: tempHpAmount,
              retaliationDamageType: dmgType,
              casterId: actor.id,
              isLinkedCast: isLinked,
              awaitingInitialTempHpRoll: false
            }
          });
        }

        const cardHtml = `
          <div class="altarion-aitusa-ward-chat-tag altarion-arcane-armor-chat-card">
            <div class="altarion-ward-header">
              <i class="fas fa-shield-alt"></i>
              <span>${armorLabel} (Slot Level ${slotLevel}) — +${tempHpAmount} Temporary HP</span>
            </div>
            <div class="altarion-ward-body">
              <strong>${recipients.map(r => r.name).join(" & ")}</strong> gained <strong>+${tempHpAmount} Temporary Hit Points</strong> for 1 hour!<br>
              While these Temporary Hit Points remain, any creature that hits ${
                recipients.length > 1 ? "them" : recipients[0].name
              } with a melee attack takes <strong>${tempHpAmount} ${dmgTypeLabel} damage</strong>.
            </div>
          </div>
        `;
        await ChatMessage.create({
          speaker: ChatMessage.getSpeaker({ actor }),
          content: cardHtml
        });

        ui.notifications.info(
          `[${armorLabel} — Level ${slotLevel}] Applied +${tempHpAmount} Temporary Hit Points and ${tempHpAmount} ${dmgTypeLabel} melee retaliation to ${recipients.map(r => r.name).join(" and ")}!`
        );
      }

      // 0b-1b. Abjuration Bulwark (Altarion / Aitusa):
      //        Applies "Abjuration Bulwark" status effect (2 hours at 2nd level; +1 hour per level above 1st at 3rd+ level)
      const isAbjurationBulwark =
        Boolean(item.flags?.["altarion-aitusa"]?.isAbjurationBulwarkSpell) ||
        itemNameLower === "abjuration bulwark";

      if ((this.isAltarion(actor) || this.isAitusa(actor)) && isAbjurationBulwark) {
        const isFreeCast = activity.consumption?.spellSlot === false;
        const msgFlagLvl = Number(results?.message?.flags?.["altarion-aitusa"]?.castSlotLevel ?? NaN);
        const slotLevel = isFreeCast
          ? 2
          : Math.max(
              2,
              Number.isFinite(msgFlagLvl)
                ? msgFlagLvl
                : this.getEffectiveSpellSlotLevel(actor, item, usageConfig, results?.message, activity)
            );
        const durationHours = slotLevel >= 3 ? 2 + (slotLevel - 1) : 2;
        const durationSeconds = durationHours * 3600;
        const durationRounds = durationHours * 600;

        const aitusa = this.getAitusaActor();
        const isLinked = Boolean(this.isAltarion(actor) && usageConfig?.useLinkedCasting);
        const recipients = isLinked ? [actor, aitusa].filter(Boolean) : [actor];

        for (const targetActor of recipients) {
          const charLvl = Math.max(1, Number(targetActor.system?.details?.level ?? 4));
          const maxStackThreshold = 4 * charLvl;
          await this.applyOrUpdateStatusEffect(targetActor, {
            statusId: "abjuration-bulwark",
            name: isLinked ? "Abjuration Bulwark (Linked Casting)" : "Abjuration Bulwark",
            img: "modules/altarion-aitusa/dr_icons/abjuration-bulwark.jpg",
            description: `<div class="rd__b  rd__b--2"><p><strong>Abjuration Bulwark (Duration: ${durationHours} hours):</strong> You increase your body's capacity to gather Abjuration energy. For the duration, whenever you would gain temporary hit points while you already have an amount of temporary hit points that is fewer than <strong>4 times your character's level (${maxStackThreshold} Temp HP)</strong>, you add the value to the total.</p></div>`,
            durationSeconds,
            durationRounds,
            extraFlags: {
              isAbjurationBulwarkEffect: true,
              slotLevel,
              durationHours,
              casterId: actor.id
            }
          });
        }

        ui.notifications.info(
          `[Abjuration Bulwark] Active on ${recipients.map(r => r.name).join(" and ")} for ${durationHours} hours (stacks Temp HP while current Temp HP < 4 × character level)!`
        );
      }

      // 0b-2. Kyrion Shadow Extraction: Tag usage message so interactive Shadow Storage buttons appear in chat
      if (this.isKyrion(actor) && itemNameLower === "shadow extraction" && results?.message?.update) {
        try {
          await results.message.update({
            "flags.altarion-aitusa.kyrionShadowExtraction": {
              actorId: actor.id
            }
          });
        } catch (_e) {
          // ignore
        }
      }

      // 0c. Arcane Ward (School of Abjuration): Weave or Recharge (+2 * Slot Level) when Altarion casts a 1st+ level Abjuration spell
      if (
        this.isAltarion(actor) &&
        item.type === "spell" &&
        Number(item.system?.level || 0) >= 1 &&
        String(item.system?.school || "").toLowerCase() === "abj" &&
        this.hasArcaneWardFeature(actor)
      ) {
        const triggerKey = results?.message?.id || `${actor.id}:${item.id}:${Math.floor(Date.now() / 600)}`;
        if (this._lastArcaneWardSpellTriggerKey !== triggerKey) {
          this._lastArcaneWardSpellTriggerKey = triggerKey;
          const msgFlagLvl = Number(results?.message?.flags?.["altarion-aitusa"]?.castSlotLevel ?? NaN);
          const slotLevel = Math.max(
            Number(item.system?.level || 1),
            Number.isFinite(msgFlagLvl)
              ? msgFlagLvl
              : this.getEffectiveSpellSlotLevel(actor, item, usageConfig, results?.message)
          );
          await this.handleArcaneWardAbjurationCast(actor, item, slotLevel);
        }
      }

      // 0d. Aid Spell Automation (+5 * (Slot Level - 1) Max HP & Current HP for 8 hours)
      if (item.type === "spell" && itemNameLower === "aid") {
        await this.handleAidSpellCast(actor, item, usageConfig, results, activity);
      }

      // 0e. Spirit Shroud Spell Automation (Choose Radiant / Necrotic / Cold; +Xd8 on attacks within 10 ft for 1 min)
      if (item.type === "spell" && itemNameLower === "spirit shroud") {
        await this.handleSpiritShroudSpellCast(actor, item, usageConfig, results, activity);
      }

      // 0f. Warding Bond Spell Automation (+1 AC, +1 Saves, All Damage Resistance, Damage Replication, 60 ft limit)
      if (item.type === "spell" && itemNameLower === "warding bond") {
        await this.handleWardingBondSpellCast(actor, item, usageConfig, results, activity);
      }

      // 0g. Spirit Guardians Spell Automation (Choose Radiant / Necrotic, Immune tokens dialog, 15 ft moving aura & save/damage)
      if (item.type === "spell" && itemNameLower === "spirit guardians") {
        await this.handleSpiritGuardiansSpellCast(actor, item, usageConfig, results, activity);
      }

      // 0h. Altarion's Echoing Ward direct sheet cast (when not already handled by a Damage Reaction button click)
      if (
        item.type === "spell" &&
        itemNameLower === "altarion's echoing ward" &&
        !CoriaRollLedger._castingEchoingWardReaction
      ) {
        const msgFlagLvl = Number(results?.message?.flags?.["altarion-aitusa"]?.castSlotLevel ?? NaN);
        const slotLevel = Math.max(
          1,
          Number.isFinite(msgFlagLvl)
            ? msgFlagLvl
            : this.getEffectiveSpellSlotLevel(actor, item, usageConfig, results?.message, activity)
        );
        const targets = Array.from(game.user?.targets || [])
          .map(t => t.actor)
          .filter(Boolean);
        const targetActor = targets[0] || actor;
        await CoriaRollLedger.rollAndApplyEchoingWardTempHp({
          caster: actor,
          victim: targetActor,
          slotLevel
        });
      }

      // 0i. Monster Legendary Resistance direct sheet use (applies Automatic Save Success via CoriaRollLedger to most recent saving throw)
      if (
        item.type === "feat" &&
        (itemNameLower.includes("legendary resistance") || itemNameLower.includes("resistência lendária")) &&
        !globalThis.FlinnManager?._usingLegendaryResistanceReactionBtn
      ) {
        const recentSaveMsg = Array.from(game.messages || [])
          .slice(-25)
          .reverse()
          .find(m => {
            if (!m?.rolls?.length) return false;
            const rType = String(
              m.flags?.dnd5e?.roll?.type ||
                m.flags?.dnd5e?.activity?.type ||
                m.rolls[0]?.options?.type ||
                ""
            ).toLowerCase();
            const isSave = rType === "save" || rType === "savingthrow" || rType === "concentration";
            if (!isSave) return false;
            return m.speaker?.actor === actor.id;
          });
        if (recentSaveMsg) {
          const linked = recentSaveMsg.flags?.["altarion-aitusa"]?.linkedSaveCard || {};
          await CoriaRollLedger.applyRollIntervention({
            rollMessageId: recentSaveMsg.id,
            cardMessageId: linked.cardMessageId || "",
            targetKey: linked.targetKey || "",
            rollerActorId: actor.id,
            forceSuccess: true,
            sourceLabel: "Legendary Resistance"
          });
        }
      }

      // 0j. Spiritual Weapon (Flinn / Cleric): Interactive map token placement + Double-click token spell attack!
      if (
        item.type === "spell" &&
        (itemNameLower === "spiritual weapon" || Boolean(item.flags?.["altarion-aitusa"]?.isSpiritualWeaponSpell))
      ) {
        const msgFlagLvl = Number(results?.message?.flags?.["altarion-aitusa"]?.castSlotLevel ?? NaN);
        const slotLevel = Math.max(
          2,
          Number.isFinite(msgFlagLvl)
            ? msgFlagLvl
            : this.getEffectiveSpellSlotLevel(actor, item, usageConfig, results?.message, activity)
        );
        await this.handleSummonTokenPlacement(actor, item, {
          summonType: "spiritual-weapon",
          slotLevel
        });
      }

      // 0k. Tentacle of the Deeps (Parva / Fathomless Warlock): Interactive map token placement + Double-click token spell attack!
      if (
        item.type === "feat" &&
        (itemNameLower === "tentacle of the deeps" ||
          Boolean(item.flags?.["altarion-aitusa"]?.isTentacleOfTheDeepsFeat))
      ) {
        await this.handleSummonTokenPlacement(actor, item, {
          summonType: "tentacle-of-the-deeps",
          slotLevel: 1
        });
      }

      // 1. Ancestral Shielding: Apply +ceil(INT/2) AC status effect to target (or Altarion) until end of Altarion's next turn
      if (this.isAltarion(actor) && itemNameLower === "ancestral shielding") {
        const intMod = Number(actor.system?.abilities?.int?.mod ?? 3);
        const acBonus = Math.max(1, Math.ceil(intMod / 2));
        const riderLevel = this.getRiderLevel(actor);
        const targets = Array.from(game.user?.targets || [])
          .map(t => t.actor)
          .filter(Boolean);
        const recipients = targets.length > 0 ? targets : [actor];

        for (const targetActor of recipients) {
          await this.applyOrUpdateStatusEffect(targetActor, {
            statusId: "ancestral-shielding",
            name: `Ancestral Shielding (+${acBonus} AC)`,
            img: item.img || "modules/altarion-aitusa/dr_icons/ancestral-shielding.jpg",
            description: `<p>Granted by <strong>Ancestral Shielding</strong>: You gain a <strong>+${acBonus} bonus to AC</strong> until the end of ${actor.name}'s next turn. If an attack hits you before then, you gain temporary hit points equal to <strong>${riderLevel >= 18 ? "6d6" : riderLevel >= 14 ? "5d6" : riderLevel >= 10 ? "4d6" : riderLevel >= 6 ? "3d6" : "2d6"} + ${acBonus}</strong>, and this bonus to AC ends.</p>`,
            changes: [
              {
                key: "system.attributes.ac.bonus",
                mode: CONST.ACTIVE_EFFECT_MODES.ADD,
                value: `+${acBonus}`,
                priority: 20
              }
            ],
            durationRounds: 1,
            durationTurns: 1,
            expiresAtEndOfTurnOf: actor.id,
            extraFlags: {
              isAncestralShieldingEffect: true,
              casterActorId: actor.id,
              acBonus,
              intMod,
              riderLevel
            }
          });
        }
      }

      // 2. Ancestral Marking: Open target picker dialog (within range of Altarion OR Aitusa) & post interactive Wisdom Save card
      if (this.isAltarion(actor) && itemNameLower === "ancestral marking") {
        this._pendingSaveContext = {
          type: "ancestral-marking",
          dc: spellDc,
          sourceActorId: actor.id,
          img: item.img || "modules/altarion-aitusa/dr_icons/ancestral-marking.jpg",
          timestamp: Date.now()
        };
        await this.handleAncestralMarkingActivation(actor, item, spellDc);
      }

      // 3. Ancestral Tether: Open Spell Slot Selection Dialog & apply Tether status to Altarion and Aitusa
      if (this.isAltarion(actor) && itemNameLower === "ancestral tether") {
        await this.promptAncestralTetherDialog(actor, item);
      }

      // 4. Draconic Enhancement: Toggle +1 AC & Fly Speed = Aitusa's Fly Speed & 30 ft Truesight on Altarion
      if (this.isAltarion(actor) && itemNameLower === "draconic enhancement") {
        await this.toggleDraconicEnhancementStatus(actor, item);
      }

      // 5. Ancestral Form: Apply 1-minute status effect on Altarion (+INT mod Force damage on Ancestral Weapon when >50% HP)
      if (this.isAltarion(actor) && itemNameLower === "ancestral form") {
        const intMod = Math.max(1, Number(actor.system?.abilities?.int?.mod ?? 3));
        await this.applyOrUpdateStatusEffect(actor, {
          statusId: "ancestral-form",
          name: `Ancestral Form (+${intMod} Force Damage >50% HP)`,
          img: item.img || "modules/altarion-aitusa/dr_icons/draconic-enhancement.jpg",
          description: `<p>For 1 minute, while you have more than half of your hit points remaining, your <strong>Ancestral Weapon</strong> attacks deal an extra <strong>+${intMod} Force damage</strong> (Intelligence modifier).</p>`,
          durationSeconds: 60,
          durationRounds: 10
        });
        ui.notifications.info(`[Ancestral Form] Activated on ${actor.name} for 1 minute!`);
      }

      // 6. Arcane Step: Prompt to optionally trigger one of the 8 Arcane Echoes
      if (this.isAltarion(actor) && itemNameLower === "arcane step") {
        await this.promptArcaneStepEchoDialog(actor);
      }

      // 7. Individual Arcane Echoes when activated directly (or via Arcane Step)
      if (this.isAltarion(actor)) {
        if (itemNameLower.includes("abjurer's echo")) {
          const prof = Number(actor.system?.attributes?.prof ?? 2);
          const intMod = Number(actor.system?.abilities?.int?.mod ?? 3);
          const tempHp = Math.max(1, prof + intMod);
          await actor.applyTempHP(tempHp);
          ui.notifications.info(`[Abjurer's Echo] Applied ${tempHp} Temporary Hit Points to ${actor.name}!`);
        } else if (itemNameLower.includes("necromancer's echo")) {
          const targets = Array.from(game.user?.targets || [])
            .map(t => t.actor)
            .filter(Boolean);
          for (const tActor of targets) {
            await this.applyOrUpdateStatusEffect(tActor, {
              statusId: "weakening-step",
              name: "Weakening Step (Save Disadvantage)",
              img: item.img,
              description: `<p>The next time this creature makes a saving throw against a spell cast by ${actor.name} before the end of ${actor.name}'s next turn, it has <strong>disadvantage</strong> on the roll.</p>`,
              durationRounds: 1,
              durationTurns: 1,
              expiresAtEndOfTurnOf: actor.id
            });
          }
          if (targets.length > 0) {
            ui.notifications.info(
              `[Necromancer's Echo] Applied Weakening Step (Save Disadvantage) to ${targets.map(a => a.name).join(", ")}.`
            );
          }
        } else if (itemNameLower.includes("illusionist's echo")) {
          await this.applyOrUpdateStatusEffect(actor, {
            statusId: "invisible",
            name: "Invisible (Veiled Step)",
            img: item.img,
            description: `<p>You are <strong>Invisible</strong> until the start of your next turn, or until you attack, make a damage roll, or force a creature to make a saving throw.</p>`,
            durationRounds: 1,
            expiresAtStartOfTurnOf: actor.id,
            extraFlags: { isVeiledStepInvisibility: true }
          });
          ui.notifications.info(`[Illusionist's Echo] ${actor.name} is now Invisible until the start of next turn!`);
        } else if (itemNameLower.includes("transmuter's echo")) {
          const targets = Array.from(game.user?.targets || [])
            .map(t => t.actor)
            .filter(a => a && a.id !== actor.id);
          const aitusa = this.getAitusaActor();
          const ally = targets[0] || aitusa;
          const recipients = [actor, ally].filter(Boolean);
          for (const rActor of recipients) {
            await this.applyOrUpdateStatusEffect(rActor, {
              statusId: "warping-step",
              name: "Warping Step (+2 AC)",
              img: item.img,
              description: `<p>Granted by <strong>Transmuter's Echo (Warping Step)</strong>: +2 bonus to AC until the end of ${actor.name}'s next turn.</p>`,
              changes: [
                {
                  key: "system.attributes.ac.bonus",
                  mode: CONST.ACTIVE_EFFECT_MODES.ADD,
                  value: "+2",
                  priority: 20
                }
              ],
              durationRounds: 1,
              durationTurns: 1,
              expiresAtEndOfTurnOf: actor.id
            });
          }
          ui.notifications.info(
            `[Transmuter's Echo] Granted +2 AC to ${recipients.map(r => r.name).join(" and ")}!`
          );
        } else if (itemNameLower.includes("diviner's echo")) {
          await this.applyOrUpdateStatusEffect(actor, {
            statusId: "fated-step",
            name: "Fated Step (Advantage on Next Roll)",
            img: item.img,
            description: `<p>You have <strong>advantage</strong> on the next attack roll, ability check, or saving throw you make before the end of your next turn.</p>`,
            durationRounds: 1,
            durationTurns: 1,
            expiresAtEndOfTurnOf: actor.id
          });
          ui.notifications.info(`[Diviner's Echo] ${actor.name} gains Advantage on the next d20 roll!`);
        } else if (itemNameLower.includes("enchanter's echo")) {
          this._pendingSaveContext = {
            type: "enchanter-echo",
            dc: spellDc,
            sourceActorId: actor.id,
            img: item.img,
            timestamp: Date.now()
          };
        }
      }
    });
  }

  /* -------------------------------------------- */
  /*  Roll Hooks (Damage, Attack, Saves, Checks)  */
  /* -------------------------------------------- */

  static registerRollHooks() {
    // 1. Pre-Roll Attack: Fated Step / Silvery Barbs advantage & Veiled Step invisibility removal
    Hooks.on("dnd5e.preRollAttackV2", (config, dialog, message) => {
      const activity = config?.subject;
      const actor = activity?.actor || activity?.item?.actor;
      if (!actor) return;

      if (this.hasStatus(actor, "silvery-barbs-advantage")) {
        if (config.rolls?.[0]) {
          config.rolls[0].options ??= {};
          config.rolls[0].options.advantage = true;
        }
        this.removeStatusEffect(actor, "silvery-barbs-advantage");
        ui.notifications.info(`[Silvery Barbs] Advantage applied to ${actor.name}'s attack roll!`);
      }

      if (this.isAltarion(actor) && this.hasStatus(actor, "fated-step")) {
        if (config.rolls?.[0]) {
          config.rolls[0].options ??= {};
          config.rolls[0].options.advantage = true;
        }
        this.removeStatusEffect(actor, "fated-step");
        ui.notifications.info(`[Fated Step] Advantage applied to ${actor.name}'s attack roll!`);
      }

      if (this.isAltarion(actor) && this.hasStatus(actor, "invisible")) {
        const eff = actor.effects.find(e => e.flags?.["altarion-aitusa"]?.isVeiledStepInvisibility);
        if (eff) setTimeout(() => eff.delete(), 250);
      }

      // Shadow Blast (Kyrion): Surface active Eldritch Invocation riders (Repelling Blast, Grasp of Hadar, Lance of Lethargy)
      const atkItem = activity?.item;
      if (
        atkItem &&
        (atkItem.flags?.["altarion-aitusa"]?.isShadowBlastSpell ||
          atkItem.name?.trim().toLowerCase() === "shadow blast")
      ) {
        const activeRiders = [];
        for (const feat of actor.items || []) {
          if (feat.type !== "feat") continue;
          const fn = feat.name?.trim().toLowerCase() || "";
          if (fn.includes("repelling blast")) {
            activeRiders.push("<strong>Repelling Blast:</strong> Push target up to 10 ft straight away on a hit.");
          } else if (fn.includes("grasp of hadar")) {
            activeRiders.push("<strong>Grasp of Hadar (1/turn):</strong> Move target 10 ft closer to you on a hit.");
          } else if (fn.includes("lance of lethargy")) {
            activeRiders.push("<strong>Lance of Lethargy (1/turn):</strong> Reduce target's speed by 10 ft until end of your next turn.");
          }
        }
        if (activeRiders.length > 0 && message?.data) {
          foundry.utils.setProperty(message.data, "flags.altarion-aitusa.shadowBlastInvocations", activeRiders);
        }
      }
    });

    // 2. Pre-Roll Ability Check: Fated Step / Silvery Barbs advantage
    Hooks.on("dnd5e.preRollAbilityCheckV2", (config, dialog, message) => {
      const actor = config?.subject;
      if (!actor) return;

      if (this.hasStatus(actor, "silvery-barbs-advantage")) {
        if (config.rolls?.[0]) {
          config.rolls[0].options ??= {};
          config.rolls[0].options.advantage = true;
        }
        this.removeStatusEffect(actor, "silvery-barbs-advantage");
        ui.notifications.info(`[Silvery Barbs] Advantage applied to ${actor.name}'s ability check!`);
      }

      if (this.isAltarion(actor) && this.hasStatus(actor, "fated-step")) {
        if (config.rolls?.[0]) {
          config.rolls[0].options ??= {};
          config.rolls[0].options.advantage = true;
        }
        this.removeStatusEffect(actor, "fated-step");
        ui.notifications.info(`[Fated Step] Advantage applied to ${actor.name}'s ability check!`);
      }
    });

    // 3. Pre-Roll Saving Throw:
    //    - Ancient Connection (+ceil(partner CON / 2), min +1 when within 30 ft & conscious)
    //    - Fated Step / Silvery Barbs (Advantage on next save)
    //    - Weakening Step (Disadvantage on target's next save against Altarion)
    Hooks.on("dnd5e.preRollSavingThrowV2", (config, dialog, message) => {
      const actor = config?.subject;
      if (!actor) return;

      // A0. Silvery Barbs: Advantage on next saving throw
      if (this.hasStatus(actor, "silvery-barbs-advantage")) {
        if (config.rolls?.[0]) {
          config.rolls[0].options ??= {};
          config.rolls[0].options.advantage = true;
        }
        this.removeStatusEffect(actor, "silvery-barbs-advantage");
        ui.notifications.info(`[Silvery Barbs] Advantage applied to ${actor.name}'s saving throw!`);
      }

      // A. Weakening Step (Necromancer's Echo): Disadvantage on next saving throw
      if (this.hasStatus(actor, "weakening-step")) {
        if (config.rolls?.[0]) {
          config.rolls[0].options ??= {};
          config.rolls[0].options.disadvantage = true;
        }
        this.removeStatusEffect(actor, "weakening-step");
        ui.notifications.info(`[Weakening Step] Disadvantage applied to ${actor.name}'s saving throw!`);
      }

      // B. Fated Step (Diviner's Echo): Advantage on Altarion's next saving throw
      if (this.isAltarion(actor) && this.hasStatus(actor, "fated-step")) {
        if (config.rolls?.[0]) {
          config.rolls[0].options ??= {};
          config.rolls[0].options.advantage = true;
        }
        this.removeStatusEffect(actor, "fated-step");
        ui.notifications.info(`[Fated Step] Advantage applied to ${actor.name}'s saving throw!`);
      }

      // C. Ancient Connection (Level 17+): Automatic bonus when Altarion and Aitusa are within 30 ft and conscious
      if (this.isAltarion(actor) || this.isAitusa(actor)) {
        const altarion = this.getAltarionActor();
        const aitusa = this.getAitusaActor();
        const riderLvl = this.getRiderLevel(altarion);
        const hasAncientConnection =
          riderLvl >= 17 ||
          actor.items?.some(i => i.name?.toLowerCase() === "ancient connection") ||
          altarion?.items?.some(i => i.name?.toLowerCase() === "ancient connection");

        if (hasAncientConnection && altarion && aitusa) {
          const partner = this.isAltarion(actor) ? aitusa : altarion;
          if (this.isActorConscious(partner) && this.isActorConscious(actor)) {
            const tokA = this.getActorCanvasToken(actor);
            const tokB = this.getActorCanvasToken(partner);
            const distFt = this.getTokenDistanceFt(tokA, tokB);

            // Apply if tokens are within 30 ft (or if no canvas tokens are placed, apply by default)
            if (distFt === null || distFt <= 30) {
              const partnerConMod = Number(partner.system?.abilities?.con?.mod ?? 0);
              const saveBonus = Math.max(1, Math.ceil(partnerConMod / 2));
              if (config.rolls?.[0]) {
                config.rolls[0].parts = config.rolls[0].parts || [];
                config.rolls[0].data = config.rolls[0].data || {};
                if (!config.rolls[0].parts.includes("@ancientConnection")) {
                  config.rolls[0].parts.push("@ancientConnection");
                  config.rolls[0].data.ancientConnection = saveBonus;
                }
              }
              if (message?.data) {
                message.data.flavor = `${message.data.flavor || "Saving Throw"} [Ancient Connection +${saveBonus}]`;
                foundry.utils.setProperty(message.data, "flags.altarion-aitusa.ancientConnectionBonus", {
                  bonus: saveBonus,
                  partnerName: partner.name,
                  distanceFt: distFt
                });
              }
            }
          }
        }
      }
    });

    // 4. Post-Roll Saving Throw: Handled transactionally per ChatMessage via `CoriaRollLedger` inside `createChatMessage`
    //    so that every Saving Throw roll message carries its own isolated `rollLedger` (allowing 3+ consecutive
    //    saving throws to be rolled and any individual one to be modified later via Portent/Silvery Barbs/Lucky/Paths of Destiny).

    // 5. Pre-Roll Damage:
    //    - Cancel automatic roll dialog for fixed-value / aura spells (Aid, Arcane Armor, Shadow Armor, Armor of Agathys, Abjuration Bulwark, Spirit Shroud, Spirit Guardians)
    //    - Aitusa Cantrip damage bonus (+Altarion's INT modifier via Draconic Focus at level 7+)
    //    - Altarion Ancestral Form damage bonus (+Altarion's INT modifier on Ancestral Weapon when >50% HP)
    //    - Veiled Step invisibility removal on damage roll
    Hooks.on("dnd5e.preRollDamageV2", (config, dialog, message) => {
      const activity = config?.subject;
      const item = activity?.item;
      const actor = activity?.actor || item?.actor;
      if (!item || !actor) return;

      const spellNameLower = item.name?.trim().toLowerCase().replace(/’/g, "'") || "";
      if (
        item.type === "spell" &&
        (spellNameLower === "aid" ||
          spellNameLower === "arcane armor" ||
          spellNameLower === "shadow armor" ||
          spellNameLower === "armor of agathys" ||
          spellNameLower === "abjuration bulwark" ||
          spellNameLower === "spirit shroud" ||
          spellNameLower === "spirit guardians" ||
          spellNameLower === "altarion's echoing ward" ||
          spellNameLower === "shadow rebuke" ||
          Boolean(item.flags?.["altarion-aitusa"]?.isArcaneArmorSpell) ||
          Boolean(item.flags?.["altarion-aitusa"]?.isShadowArmorSpell) ||
          Boolean(item.flags?.["altarion-aitusa"]?.isArmorOfAgathysSpell) ||
          Boolean(item.flags?.["altarion-aitusa"]?.isAbjurationBulwarkSpell))
      ) {
        return false;
      }

      // A. Aitusa Cantrip Bonus from Draconic Focus (Level 7+)
      if (this.isAitusa(actor) && item.type === "spell" && Number(item.system?.level ?? -1) === 0) {
        const altarion = this.getAltarionActor();
        const riderLvl = this.getRiderLevel(altarion);
        const hasDraconicFocus =
          riderLvl >= 7 || altarion?.items?.some(i => i.name?.toLowerCase() === "draconic focus");

        if (hasDraconicFocus && altarion) {
          const altarionIntMod = Math.max(0, Number(altarion.system?.abilities?.int?.mod ?? 0));
          if (altarionIntMod > 0 && config.rolls?.[0]) {
            config.rolls[0].parts = config.rolls[0].parts || [];
            config.rolls[0].data = config.rolls[0].data || {};
            if (!config.rolls[0].parts.includes("@draconicFocus")) {
              config.rolls[0].parts.push("@draconicFocus");
              config.rolls[0].data.draconicFocus = altarionIntMod;
            }
            if (message?.data) {
              message.data.flavor = `${message.data.flavor || item.name} [Draconic Focus +${altarionIntMod}]`;
            }
          }
        }
      }

      // B. Altarion Ancestral Form Bonus (+INT mod on Ancestral Weapon attacks while >50% HP)
      const isAncestralWeapon =
        item.flags?.["altarion-aitusa"]?.isAncestralWeapon || item.name?.toLowerCase() === "ancestral weapon";
      if (this.isAltarion(actor) && isAncestralWeapon && this.hasStatus(actor, "ancestral-form")) {
        const curHp = Number(actor.system?.attributes?.hp?.value ?? 0);
        const maxHp = Number(
          actor.system?.attributes?.hp?.effectiveMax || actor.system?.attributes?.hp?.max || 1
        );
        if (curHp > maxHp / 2) {
          const intMod = Math.max(1, Number(actor.system?.abilities?.int?.mod ?? 3));
          if (config.rolls?.[0]) {
            config.rolls[0].parts = config.rolls[0].parts || [];
            config.rolls[0].data = config.rolls[0].data || {};
            if (!config.rolls[0].parts.includes("@ancestralForm")) {
              config.rolls[0].parts.push("@ancestralForm");
              config.rolls[0].data.ancestralForm = intMod;
            }
            if (message?.data) {
              message.data.flavor = `${message.data.flavor || item.name} [Ancestral Form +${intMod}]`;
              foundry.utils.setProperty(message.data, "flags.altarion-aitusa.ancestralFormBonus", intMod);
            }
          }
        }
      }

      // C. Shadow Blast (Kyrion): Apply Agonizing Blast (+CHA Modifier to necrotic beam damage)
      const isShadowBlast =
        Boolean(item.flags?.["altarion-aitusa"]?.isShadowBlastSpell) ||
        item.name?.trim().toLowerCase() === "shadow blast";
      if (isShadowBlast && config.rolls?.[0]) {
        const hasAgonizingBlast = Boolean(
          actor.items?.some(i => i.type === "feat" && i.name?.trim().toLowerCase().includes("agonizing blast"))
        );
        if (hasAgonizingBlast) {
          const chaMod = Number(actor.system?.abilities?.cha?.mod ?? 0);
          if (chaMod !== 0) {
            config.rolls[0].parts = config.rolls[0].parts || [];
            config.rolls[0].data = config.rolls[0].data || {};
            const alreadyAdded = config.rolls[0].parts.some(p =>
              ["@agonizingBlast", "@abilities.cha.mod", "@mod"].includes(String(p).trim())
            );
            if (!alreadyAdded) {
              config.rolls[0].parts.push("@agonizingBlast");
              config.rolls[0].data.agonizingBlast = chaMod;
              if (message?.data) {
                message.data.flavor = `${message.data.flavor || item.name} [Agonizing Blast ${chaMod >= 0 ? `+${chaMod}` : chaMod}]`;
              }
            }
          }
        }
      }

      // D. Arcane Armor, Shadow Armor & Armor of Agathys exact upcast Temporary HP formula (5 * Spell Slot Level)
      const isArcaneArmor =
        Boolean(item.flags?.["altarion-aitusa"]?.isArcaneArmorSpell) ||
        item.name?.trim().toLowerCase() === "arcane armor";
      const isShadowArmor =
        Boolean(item.flags?.["altarion-aitusa"]?.isShadowArmorSpell) ||
        item.name?.trim().toLowerCase() === "shadow armor";
      const isArmorOfAgathys =
        Boolean(item.flags?.["altarion-aitusa"]?.isArmorOfAgathysSpell) ||
        item.name?.trim().toLowerCase() === "armor of agathys";
      if ((isArcaneArmor || isShadowArmor || isArmorOfAgathys) && config.rolls?.[0]) {
        let slotLevel = null;
        if (config.scaling !== undefined && config.scaling !== null && config.scaling !== false) {
          slotLevel = 1 + Number(config.scaling || 0);
        } else if (
          this._lastSpellCastContext &&
          this._lastSpellCastContext.itemId === item.id &&
          Date.now() - (this._lastSpellCastContext.timestamp || 0) < 120000
        ) {
          slotLevel = Number(this._lastSpellCastContext.slotLevel || 1);
        } else {
          const activeEff = this.getRetaliatoryArmorEffect(actor);
          slotLevel = Number(
            activeEff?.flags?.["altarion-aitusa"]?.slotLevel ||
              this.getEffectiveSpellSlotLevel(actor, item, null, null, activity) ||
              1
          );
        }
        const exactAmount = 5 * Math.max(1, Number(slotLevel || 1));
        config.rolls[0].parts = [String(exactAmount)];
        config.rolls[0].options ??= {};
        config.rolls[0].options.type = "temphp";
      }

      // E. Remove Veiled Step invisibility if Altarion makes a damage roll
      if (this.isAltarion(actor) && this.hasStatus(actor, "invisible")) {
        const eff = actor.effects.find(e => e.flags?.["altarion-aitusa"]?.isVeiledStepInvisibility);
        if (eff) setTimeout(() => eff.delete(), 250);
      }

      // F. Spirit Shroud: +Xd8 (Radiant / Necrotic / Cold) on any attack damage roll against a creature within 10 ft
      const spiritShroudEff = actor.effects?.find(
        e =>
          !e.disabled &&
          (e.flags?.["altarion-aitusa"]?.isSpiritShroudEffect ||
            e.statuses?.has?.("spirit-shroud") ||
            e.flags?.["altarion-aitusa"]?.statusId === "spirit-shroud")
      );
      if (spiritShroudEff && config.rolls?.[0]) {
        const isAttackActivity =
          activity?.type === "attack" ||
          Boolean(activity?.attack) ||
          ["mwak", "rwak", "msak", "rsak"].includes(String(item.system?.actionType || "").toLowerCase());
        const itemNameNow = item.name?.trim().toLowerCase() || "";
        if (isAttackActivity && itemNameNow !== "spirit shroud") {
          const attackerTok = this.getActorCanvasToken(actor);
          const targetTokens = Array.from(game.user?.targets || []);
          let within10Ft = false;
          if (attackerTok && targetTokens.length > 0) {
            within10Ft = targetTokens.some(t => {
              const d = this.getTokenDistanceFt(attackerTok, t);
              return d !== null && d <= 10;
            });
          } else if (attackerTok && canvas?.tokens?.placeables) {
            within10Ft = canvas.tokens.placeables.some(t => {
              if (t.id === attackerTok.id) return false;
              const d = this.getTokenDistanceFt(attackerTok, t);
              return d !== null && d <= 10;
            });
          }

          if (within10Ft) {
            const shroudFlags = spiritShroudEff.flags?.["altarion-aitusa"] || {};
            const bonusDice = Math.max(1, Number(shroudFlags.bonusDice || 1));
            const dmgType = String(shroudFlags.damageType || "radiant").toLowerCase();
            const dmgTypeLabel = shroudFlags.damageTypeLabel || "Radiant";
            const shroudPart = `${bonusDice}d8[${dmgType}]`;
            config.rolls[0].parts = config.rolls[0].parts || [];
            if (!config.rolls[0].parts.includes(shroudPart)) {
              config.rolls[0].parts.push(shroudPart);
              if (message?.data) {
                message.data.flavor = `${message.data.flavor || item.name} [Spirit Shroud +${bonusDice}d8 ${dmgTypeLabel}]`;
              }
            }
          }
        }
      }

      // G. Absorb Elements: +Xd6 (Acid / Cold / Fire / Lightning / Thunder) on the next attack damage roll, then end status effect
      const absorbEff = actor.effects?.find(
        e =>
          !e.disabled &&
          (e.flags?.["altarion-aitusa"]?.isAbsorbElementsEffect ||
            e.statuses?.has?.("absorb-elements") ||
            e.flags?.["altarion-aitusa"]?.statusId === "absorb-elements")
      );
      if (absorbEff && config.rolls?.[0]) {
        const isAttackActivity =
          activity?.type === "attack" ||
          Boolean(activity?.attack) ||
          ["mwak", "rwak", "msak", "rsak"].includes(String(item.system?.actionType || "").toLowerCase());
        const itemNameNow = item.name?.trim().toLowerCase() || "";
        if (isAttackActivity && itemNameNow !== "absorb elements") {
          const absFlags = absorbEff.flags?.["altarion-aitusa"] || {};
          const slotLevel = Math.max(1, Number(absFlags.slotLevel || 1));
          const elemType = String(absFlags.elementType || "fire").toLowerCase();
          const elemLabel = absFlags.elementLabel || "Fire";
          const absPart = `${slotLevel}d6[${elemType}]`;
          config.rolls[0].parts = config.rolls[0].parts || [];
          if (!config.rolls[0].parts.includes(absPart)) {
            config.rolls[0].parts.push(absPart);
            config.rolls[0].options ??= {};
            config.rolls[0].options.coriaConsumeAbsorbElements = true;
            config.rolls[0].options.coriaAbsorbElementsActorId = actor.id;
            config.rolls[0].options.coriaAbsorbElementsLabel = `+${slotLevel}d6 ${elemLabel}`;
            if (message?.data) {
              message.data.flavor = `${message.data.flavor || item.name} [Absorb Elements +${slotLevel}d6 ${elemLabel}]`;
            }
          }
        }
      }
    });

    // 6. Post-Roll Damage / Healing: Automatically apply Temporary HP (or Linked Casting Healing) & end Absorb Elements
    //    Note: Ancestral Shielding does NOT auto-apply Temp HP here (since Temp HP is only gained if hit before end of next turn).
    const consumeAbsorbElementsOnDamageRoll = async (rolls, subject) => {
      try {
        if (!Array.isArray(rolls) || !rolls.length) return;
        const absRoll = rolls.find(r => r?.options?.coriaConsumeAbsorbElements);
        const actor =
          (absRoll?.options?.coriaAbsorbElementsActorId &&
            game.actors?.get(absRoll.options.coriaAbsorbElementsActorId)) ||
          subject?.actor ||
          subject?.item?.actor ||
          null;
        if (!actor || !actor.isOwner) return;
        const hasAbsorb = this.hasStatus(actor, "absorb-elements");
        if (absRoll && hasAbsorb) {
          await this.removeStatusEffect(actor, "absorb-elements");
          ui.notifications.info(
            `[Absorb Elements] Unleashed ${absRoll.options?.coriaAbsorbElementsLabel || "elemental bonus damage"} on ${actor.name}'s attack — Absorb Elements has ended!`
          );
        }
      } catch (_e) {
        // ignore
      }
    };

    Hooks.on("dnd5e.rollDamageV2", async (rolls, data) => {
      await consumeAbsorbElementsOnDamageRoll(rolls, data?.subject);
    });

    Hooks.on("dnd5e.rollDamage", async (rolls, { subject } = {}) => {
      try {
        await consumeAbsorbElementsOnDamageRoll(rolls, subject);
        const activity = subject;
        const item = activity?.item;
        const actor = activity?.actor || item?.actor;
        if (!item || !actor || !rolls?.length) return;

        const itemNameLower = item.name?.trim().toLowerCase().replace(/’/g, "'");
        const total = rolls.reduce((sum, r) => sum + Number(r.total || 0), 0);
        if (total <= 0) return;

        const isLinkedCast = this.isRollFromLinkedCasting(item);
        const healingTypes = activity?.healing?.types;
        const isTempHpActivity =
          Boolean(healingTypes?.has?.("temphp")) ||
          (Array.isArray(healingTypes) && healingTypes.includes("temphp")) ||
          rolls.some(r => r.options?.type === "temphp");
        const isRegularHealActivity = activity?.type === "heal" && !isTempHpActivity;

        const shouldAutoApplyTempHp =
          itemNameLower === "altarion's echoing ward" ||
          itemNameLower === "arcane armor" ||
          itemNameLower === "shadow armor" ||
          itemNameLower === "armor of agathys" ||
          Boolean(item.flags?.["altarion-aitusa"]?.isArcaneArmorSpell) ||
          Boolean(item.flags?.["altarion-aitusa"]?.isShadowArmorSpell) ||
          Boolean(item.flags?.["altarion-aitusa"]?.isArmorOfAgathysSpell) ||
          itemNameLower === "ancestral ward" ||
          itemNameLower.includes("abjurer's echo") ||
          (isLinkedCast && (isTempHpActivity || itemNameLower === "false life" || itemNameLower === "armor of agathys"));

        if (shouldAutoApplyTempHp) {
          const activeArmorEff = this.getRetaliatoryArmorEffect(actor);
          const armorLinked = Boolean(activeArmorEff?.flags?.["altarion-aitusa"]?.isLinkedCast);
          let recipients = [];
          if (itemNameLower === "ancestral ward" || itemNameLower.includes("abjurer's echo")) {
            recipients = [actor];
          } else if (isLinkedCast || armorLinked) {
            const altarion = this.getAltarionActor() || actor;
            const aitusa = this.getAitusaActor();
            const { recipientActors } = this.selectAltarionAndAitusaTargets(altarion, aitusa);
            recipients = recipientActors;
          } else if (
            itemNameLower === "arcane armor" ||
            itemNameLower === "shadow armor" ||
            itemNameLower === "armor of agathys" ||
            item.flags?.["altarion-aitusa"]?.isArcaneArmorSpell ||
            item.flags?.["altarion-aitusa"]?.isShadowArmorSpell ||
            item.flags?.["altarion-aitusa"]?.isArmorOfAgathysSpell
          ) {
            recipients = [actor];
          } else {
            const targets = Array.from(game.user?.targets || [])
              .map(t => t.actor)
              .filter(Boolean);
            recipients = targets.length > 0 ? targets : [actor];
          }

          for (const targetActor of recipients) {
            const armEff = this.getRetaliatoryArmorEffect(targetActor);
            if (armEff?.flags?.["altarion-aitusa"]?.awaitingInitialTempHpRoll) {
              try {
                await armEff.update({ "flags.altarion-aitusa.awaitingInitialTempHpRoll": false });
              } catch (_e) {
                // ignore
              }
            }
            if (typeof targetActor.applyTempHP === "function") {
              await targetActor.applyTempHP(total);
            } else {
              const curTemp = Number(targetActor.system?.attributes?.hp?.temp ?? 0);
              if (total > curTemp) {
                await targetActor.update({ "system.attributes.hp.temp": total });
              }
            }
          }
          ui.notifications.info(
            `[${item.name}] Automatically applied ${total} Temporary Hit Points to ${recipients.map(r => r.name).join(", ")}!`
          );
        } else if (isLinkedCast && isRegularHealActivity) {
          const altarion = this.getAltarionActor() || actor;
          const aitusa = this.getAitusaActor();
          const { recipientActors } = this.selectAltarionAndAitusaTargets(altarion, aitusa);
          for (const targetActor of recipientActors) {
            const curHp = Number(targetActor.system?.attributes?.hp?.value ?? 0);
            const maxHp = Number(
              targetActor.system?.attributes?.hp?.effectiveMax || targetActor.system?.attributes?.hp?.max || 1
            );
            await targetActor.update({ "system.attributes.hp.value": Math.min(maxHp, curHp + total) });
          }
          ui.notifications.info(
            `[${item.name} — Linked Casting] Restored ${total} Hit Points to ${recipientActors.map(r => r.name).join(" and ")}!`
          );
        }
      } catch (err) {
        console.warn("[Altarion & Aitusa] Error auto-applying Temporary HP / Linked Healing:", err);
      }
    });
  }

  /* -------------------------------------------- */
  /*  Ancestral Tether & Turn Expiration Hooks    */
  /* -------------------------------------------- */

  static registerActorAndCombatHooks() {
    // Mirror any ActiveEffect applied from a Linked Casting spell onto both Altarion and Aitusa
    Hooks.on("createActiveEffect", async (effect, options, userId) => {
      try {
        if (options?.altarionLinkedMirror) return;
        if (game.user?.id !== userId) return;
        const parentActor = effect?.parent;
        if (!parentActor || parentActor.documentName !== "Actor") return;
        if (!this.isAltarion(parentActor) && !this.isAitusa(parentActor)) return;

        // Never mirror effects already managed by AltarionAutomationManager or Concentration markers
        if (effect.flags?.["altarion-aitusa"]?.statusId) return;
        const effNameLower = effect.name?.trim().toLowerCase().replace(/’/g, "'") || "";
        if (effNameLower.startsWith("concentrating") || effect.statuses?.has?.("concentrating")) return;

        const linked = this._activeLinkedCast;
        if (!linked || Date.now() - (linked.timestamp || 0) > 120000) return;

        if (
          [
            "arcane armor",
            "shadow armor",
            "armor of agathys",
            "abjuration bulwark",
            "aid",
            "spirit shroud",
            "spirit guardians",
            "warding bond",
            "altarion's echoing ward",
            "false life",
            "shield",
            "silvery barbs"
          ].includes(linked.itemNameLower)
        ) {
          return;
        }

        const originMatches = Boolean(linked.itemId && effect.origin?.includes(linked.itemId));
        const nameMatches = Boolean(linked.itemNameLower && effNameLower.includes(linked.itemNameLower));
        if (!originMatches && !nameMatches) return;

        const partner = this.isAltarion(parentActor) ? this.getAitusaActor() : this.getAltarionActor();
        if (!partner) return;

        const alreadyOnPartner = partner.effects.some(
          e => !e.disabled && (e.name === effect.name || (effect.origin && e.origin === effect.origin))
        );
        if (!alreadyOnPartner) {
          const effData = effect.toObject();
          delete effData._id;
          await partner.createEmbeddedDocuments("ActiveEffect", [effData], {
            altarionLinkedMirror: true
          });
        }
      } catch (err) {
        console.warn("[Altarion & Aitusa] Could not mirror Linked Casting ActiveEffect:", err);
      }
    });

    // Intercept incoming damage via `actor.applyDamage(...)` for Altarion's Arcane Ward BEFORE clamping to 0 HP
    Hooks.on("dnd5e.preApplyDamage", (actor, amount, updates, options) => {
      try {
        if (!actor || !this.isAltarion(actor)) return;
        if (options?.altarionBypassWard || options?.altarionTetherTransfer) return;

        const totalDamage = Number(amount ?? 0);
        if (!Number.isFinite(totalDamage) || totalDamage <= 0) return;

        const wardState = this.getArcaneWardState(actor);
        if (!wardState.eligible || !wardState.active || wardState.current <= 0) return;

        const absorbed = Math.min(wardState.current, totalDamage);
        const newWardHp = Math.max(0, wardState.current - absorbed);
        const remainingDamage = Math.max(0, totalDamage - absorbed);

        const curTemp = Number(actor.system?.attributes?.hp?.temp ?? 0);
        const curHp = Number(actor.system?.attributes?.hp?.value ?? 0);
        const maxHp = Number(
          actor.system?.attributes?.hp?.effectiveMax || actor.system?.attributes?.hp?.max || Math.max(1, curHp)
        );

        const tempLost = Math.min(curTemp, remainingDamage);
        const newTemp = Math.max(0, curTemp - tempLost);
        const hpLost = Math.max(0, remainingDamage - tempLost);
        const newHp = Math.clamp(curHp - hpLost, 0, maxHp);

        updates["system.resources.tertiary.value"] = newWardHp;
        updates["system.attributes.hp.temp"] = newTemp;
        updates["system.attributes.hp.value"] = newHp;

        this._pendingWardAbsorption.set(actor.id, {
          absorbed,
          prevWardHp: wardState.current,
          newWardHp,
          maxWardHp: wardState.max,
          remainingDamage,
          totalIncoming: totalDamage,
          tempLost,
          hpLost: curHp - newHp,
          timestamp: Date.now()
        });
      } catch (err) {
        console.warn("[Altarion & Aitusa] Error intercepting Arcane Ward damage in preApplyDamage:", err);
      }
    });

    // Record pre-update HP & intercept manual Sheet/Token HP damage edits for Altarion's Arcane Ward
    Hooks.on("preUpdateActor", (actor, changed, options) => {
      if (!actor) return;

      // 1. If user manually edited Altarion's `resources.tertiary.value` on Token Bar 2 or Sheet, clamp & awaken Arcane Ward
      if (
        this.isAltarion(actor) &&
        !options?.altarionBypassWard &&
        foundry.utils.hasProperty(changed, "system.resources.tertiary.value") &&
        !this._pendingWardAbsorption.has(actor.id) &&
        this.hasArcaneWardFeature(actor)
      ) {
        const maxWardHp = this.getArcaneWardMaxHp(actor);
        const rawVal = Number(foundry.utils.getProperty(changed, "system.resources.tertiary.value") ?? 0);
        const clampedVal = Math.clamp(Number.isFinite(rawVal) ? rawVal : 0, 0, maxWardHp);
        foundry.utils.setProperty(changed, "system.resources.tertiary.value", clampedVal);
        if (clampedVal > 0 && !actor.getFlag("altarion-aitusa", "arcaneWardActive")) {
          foundry.utils.setProperty(changed, "flags.altarion-aitusa.arcaneWardActive", true);
        }
      }

      // 3. Arcane Ward Damage Interception (consume pending `preApplyDamage` result OR intercept manual HP/TempHP edits)
      if (this.isAltarion(actor) && changed?.system?.attributes?.hp) {
        const pending = this._pendingWardAbsorption.get(actor.id);
        if (pending && Date.now() - (pending.timestamp || 0) < 3000) {
          options.altarionWardAbsorbed = pending;
          this._pendingWardAbsorption.delete(actor.id);
        } else {
          if (pending) this._pendingWardAbsorption.delete(actor.id);

          const shouldInterceptManual =
            !options?.altarionBypassWard &&
            !options?.altarionTetherTransfer &&
            !options?.isRest &&
            !options?.isAdvancement &&
            !foundry.utils.hasProperty(changed, "system.resources.tertiary.value");

          if (shouldInterceptManual) {
            const wardState = this.getArcaneWardState(actor);
            if (wardState.eligible && wardState.active && wardState.current > 0) {
              const curTemp = Number(actor.system?.attributes?.hp?.temp ?? 0);
              const curHp = Number(actor.system?.attributes?.hp?.value ?? 0);
              const hasNewTemp = "temp" in changed.system.attributes.hp;
              const hasNewHp = "value" in changed.system.attributes.hp;
              const newTemp = hasNewTemp ? Number(changed.system.attributes.hp.temp ?? 0) : curTemp;
              const newHp = hasNewHp ? Number(changed.system.attributes.hp.value ?? curHp) : curHp;

              // Only intercept damage (never healing or temp HP increases)
              if (newHp <= curHp && newTemp <= curTemp) {
                const tempLost = Math.max(0, curTemp - newTemp);
                const hpLost = Math.max(0, curHp - newHp);
                const totalLost = tempLost + hpLost;

                if (totalLost > 0) {
                  const absorbed = Math.min(wardState.current, totalLost);
                  const newWardHp = Math.max(0, wardState.current - absorbed);
                  const remainingDamage = Math.max(0, totalLost - absorbed);

                  const afterTemp = Math.max(0, curTemp - remainingDamage);
                  const afterHpOverflow = Math.max(0, remainingDamage - curTemp);
                  const afterHp = Math.max(0, curHp - afterHpOverflow);

                  foundry.utils.setProperty(changed, "system.resources.tertiary.value", newWardHp);
                  foundry.utils.setProperty(changed, "system.attributes.hp.temp", afterTemp);
                  foundry.utils.setProperty(changed, "system.attributes.hp.value", afterHp);

                  options.altarionWardAbsorbed = {
                    absorbed,
                    prevWardHp: wardState.current,
                    newWardHp,
                    maxWardHp: wardState.max,
                    remainingDamage,
                    totalIncoming: totalLost,
                    tempLost: curTemp - afterTemp,
                    hpLost: curHp - afterHp
                  };
                }
              }
            }
          }
        }
      }

      // 4. Snapshot pre-update HP, Temp HP & Arcane Ward HP so `updateActor` knows exact layered damage taken
      if (changed?.system?.attributes?.hp || foundry.utils.hasProperty(changed, "system.resources.tertiary.value")) {
        this._preUpdateHp.set(actor.id, Number(actor.system?.attributes?.hp?.value ?? 0));
        this._preUpdateTempHp ??= new Map();
        this._preUpdateTempHp.set(actor.id, Number(actor.system?.attributes?.hp?.temp ?? 0));
        if (this.isAltarion(actor)) {
          this._preUpdateWardHp ??= new Map();
          this._preUpdateWardHp.set(actor.id, Number(actor.system?.resources?.tertiary?.value ?? 0));
        }
      }
    });

    Hooks.on("updateActor", async (actor, changed, options, userId) => {
      if (!actor || !actor.isOwner) return;
      if (game.user?.id !== userId) return;

      // Sync Aitusa's "Dragon Attacks" max if her STR changed
      if (this.isAitusa(actor) && changed?.system?.abilities?.str) {
        const strMod = Math.max(1, Number(actor.system?.abilities?.str?.mod ?? 2));
        if (actor.system?.resources?.primary?.max !== strMod) {
          await actor.update({ "system.resources.primary.max": strMod });
        }
      }

      // Sync Altarion's "Linked Casting" max if Aitusa's INT changed
      if (this.isAitusa(actor) && changed?.system?.abilities?.int) {
        const altarion = this.getAltarionActor();
        const intMod = Math.max(1, Number(actor.system?.abilities?.int?.mod ?? 3));
        if (altarion && altarion.system?.resources?.secondary?.max !== intMod) {
          await altarion.update({ "system.resources.secondary.max": intMod });
        }
      }

      // Sync Altarion's "Arcane Ward" max if Altarion's INT changed
      if (this.isAltarion(actor) && changed?.system?.abilities?.int && this.hasArcaneWardFeature(actor)) {
        const maxWardHp = this.getArcaneWardMaxHp(actor);
        const curWardHp = Math.clamp(Number(actor.system?.resources?.tertiary?.value ?? 0), 0, maxWardHp);
        if (
          actor.system?.resources?.tertiary?.max !== maxWardHp ||
          actor.system?.resources?.tertiary?.value !== curWardHp
        ) {
          await actor.update(
            {
              "system.resources.tertiary.label": "Arcane Ward",
              "system.resources.tertiary.max": maxWardHp,
              "system.resources.tertiary.value": curWardHp
            },
            { altarionBypassWard: true }
          );
        }
      }

      // 1. Post Arcane Ward Damage Absorption card if Arcane Ward absorbed incoming damage
      if (this.isAltarion(actor) && options?.altarionWardAbsorbed) {
        await this.postArcaneWardAbsorptionChatCard(actor, options.altarionWardAbsorbed);
      }

      // 1b. Record exact damage layer breakdown (Arcane Ward / Temp HP / HP) in CoriaRollLedger
      //     for every non-internal damage event so Roll Ledger & Undo buttons always know whether
      //     Arcane Ward or Temporary HP absorbed (or got reduced to 0 by) this specific hit!
      if (
        !options?.coriaDamageReactionInternal &&
        !options?.coriaLayeredUndo &&
        !options?.isRest &&
        !options?.isAdvancement &&
        (options?.altarionWardAbsorbed ||
          changed?.system?.attributes?.hp ||
          foundry.utils.hasProperty(changed, "system.resources.tertiary.value"))
      ) {
        try {
          const RL = globalThis.CoriaRollLedger;
          if (RL?.recordActorDamageTakenFromRecentRoll) {
            const wardAbsInfo = options?.altarionWardAbsorbed || null;
            const postHp = Number(actor.system?.attributes?.hp?.value ?? 0);
            const postTemp = Number(actor.system?.attributes?.hp?.temp ?? 0);
            const isAlt = this.isAltarion(actor);
            const wardStateNow = isAlt ? this.getArcaneWardState(actor) : null;
            const postWard = wardStateNow?.eligible ? Number(wardStateNow.current ?? 0) : 0;

            const preHp = Number(this._preUpdateHp.get(actor.id) ?? postHp);
            const preTemp = Number(this._preUpdateTempHp?.get(actor.id) ?? postTemp);
            const preWard = wardAbsInfo
              ? Number(wardAbsInfo.prevWardHp ?? postWard)
              : isAlt
                ? Number(this._preUpdateWardHp?.get(actor.id) ?? postWard)
                : 0;

            const wardLost = Math.max(0, preWard - postWard);
            const tempLost = Math.max(0, preTemp - postTemp);
            const hpLost = Math.max(0, preHp - postHp);
            const totalLost = wardLost + tempLost + hpLost;

            if (totalLost > 0) {
              RL.recordActorDamageTakenFromRecentRoll(actor, {
                preHp,
                preTemp,
                preWard,
                postHp,
                postTemp,
                postWard,
                wardMax: wardAbsInfo?.maxWardHp ?? wardStateNow?.max ?? 0,
                wardActive: Boolean(wardAbsInfo || wardStateNow?.active || preWard > 0),
                totalLost
              });
            }
          }
        } catch (_layerErr) {}
      }

      // 2. Remove Arcane Armor / Shadow Armor / Armor of Agathys status effect automatically if Temporary Hit Points reach 0
      //    (Ignore while `awaitingInitialTempHpRoll` is true before the user clicks "Roll" in chat)
      if (changed?.system?.attributes?.hp && "temp" in changed.system.attributes.hp) {
        const newTemp = Number(actor.system?.attributes?.hp?.temp ?? 0);
        if (newTemp <= 0) {
          const arcEff = this.getArcaneArmorEffect(actor);
          if (arcEff && !arcEff.flags?.["altarion-aitusa"]?.awaitingInitialTempHpRoll) {
            await this.removeStatusEffect(actor, "arcane-armor");
            ui.notifications.info(`[Arcane Armor] Ended on ${actor.name} (0 Temporary Hit Points).`);
          }
          const shdEff = this.getShadowArmorEffect(actor);
          if (shdEff && !shdEff.flags?.["altarion-aitusa"]?.awaitingInitialTempHpRoll) {
            await this.removeStatusEffect(actor, "shadow-armor");
            ui.notifications.info(`[Shadow Armor] Ended on ${actor.name} (0 Temporary Hit Points).`);
          }
          const agaEff = this.getArmorOfAgathysEffect(actor);
          if (agaEff && !agaEff.flags?.["altarion-aitusa"]?.awaitingInitialTempHpRoll) {
            await this.removeStatusEffect(actor, "armor-of-agathys");
            ui.notifications.info(`[Armor of Agathys] Ended on ${actor.name} (0 Temporary Hit Points).`);
          }
        }
      }

      // 3. Check HP / Temp HP reduction for Ancestral Tether & Warding Bond (with strict anti-recursion guards!)
      if (
        changed?.system?.attributes?.hp &&
        ("value" in changed.system.attributes.hp || "temp" in changed.system.attributes.hp) &&
        !options?.altarionTetherTransfer &&
        !options?.wardingBondTransfer &&
        !options?.isRest &&
        !options?.isAdvancement
      ) {
        const hasValChange = "value" in changed.system.attributes.hp;
        const hasTempChange = "temp" in changed.system.attributes.hp;

        const oldHp = hasValChange
          ? (this._preUpdateHp.get(actor.id) ?? Number(actor.system?.attributes?.hp?.value ?? 0))
          : Number(actor.system?.attributes?.hp?.value ?? 0);
        const newHp = hasValChange ? Number(changed.system.attributes.hp.value ?? oldHp) : oldHp;
        const hpDamageTaken = Math.max(0, oldHp - newHp);

        const oldTemp = hasTempChange
          ? (this._preUpdateTempHp?.get(actor.id) ?? Number(actor.system?.attributes?.hp?.temp ?? 0))
          : Number(actor.system?.attributes?.hp?.temp ?? 0);
        const newTemp = hasTempChange ? Number(changed.system.attributes.hp.temp ?? oldTemp) : oldTemp;
        const tempDamageTaken = Math.max(0, oldTemp - newTemp);

        const totalDamageTaken = hpDamageTaken + tempDamageTaken;

        // 3a. Ancestral Tether (Altarion <-> Aitusa)
        if (hpDamageTaken > 0) {
          // Case 1: Aitusa took damage while Ancestral Tether is active -> Reduce Altarion's HP by the same amount!
          if (this.isAitusa(actor) && this.hasStatus(actor, "ancestral-tether")) {
            const altarion = this.getAltarionActor();
            if (altarion && this.hasStatus(altarion, "ancestral-tether")) {
              const altOldHp = Number(altarion.system?.attributes?.hp?.value ?? 0);
              const altNewHp = Math.max(0, altOldHp - hpDamageTaken);
              await altarion.update(
                { "system.attributes.hp.value": altNewHp },
                { altarionTetherTransfer: true, wardingBondTransfer: true }
              );
              await this.postAncestralTetherDamageChatCard({
                altarion,
                aitusa: actor,
                damageTaken: hpDamageTaken,
                fromAitusaTransfer: true
              });
            }
          }
          // Case 2: Altarion took damage directly while Ancestral Tether is active -> Post reaction heal prompt!
          else if (this.isAltarion(actor) && this.hasStatus(actor, "ancestral-tether")) {
            const aitusa = this.getAitusaActor();
            if (aitusa) {
              await this.postAncestralTetherDamageChatCard({
                altarion: actor,
                aitusa,
                damageTaken: hpDamageTaken,
                fromAitusaTransfer: false
              });
            }
          }
        }

        // 3b. Warding Bond: When the warded target takes damage, the caster takes the same amount of damage!
        //     Strict anti-recursion: passes `{ wardingBondTransfer: true, altarionTetherTransfer: true }`
        //     so neither Warding Bond nor Ancestral Tether can ever bounce this damage back!
        if (totalDamageTaken > 0) {
          const wbEff = actor.effects?.find(
            e =>
              !e.disabled &&
              (e.flags?.["altarion-aitusa"]?.isWardingBondTargetEffect ||
                e.statuses?.has?.("warding-bond") ||
                e.flags?.["altarion-aitusa"]?.statusId === "warding-bond")
          );
          if (wbEff) {
            const casterId = wbEff.flags?.["altarion-aitusa"]?.casterActorId;
            const casterActor = casterId ? game.actors?.get(casterId) : null;
            if (casterActor && casterActor.id !== actor.id && casterActor.isOwner) {
              const cTemp = Number(casterActor.system?.attributes?.hp?.temp ?? 0);
              const cHp = Number(casterActor.system?.attributes?.hp?.value ?? 0);
              const cTempLost = Math.min(cTemp, totalDamageTaken);
              const cHpLost = Math.max(0, totalDamageTaken - cTempLost);
              await casterActor.update(
                {
                  "system.attributes.hp.temp": Math.max(0, cTemp - cTempLost),
                  "system.attributes.hp.value": Math.max(0, cHp - cHpLost)
                },
                { wardingBondTransfer: true, altarionTetherTransfer: true }
              );
              await this.postWardingBondDamageChatCard({
                caster: casterActor,
                target: actor,
                damageTaken: totalDamageTaken
              });
            }
          }
        }
      }
    });

    // Clean up Aid Max HP clamping, Warding Bond partner effects, and Spirit Guardians templates when an ActiveEffect is deleted
    Hooks.on("deleteActiveEffect", async (effect, options, userId) => {
      try {
        if (game.user?.id !== userId) return;
        const parentActor = effect?.parent;
        if (!parentActor || parentActor.documentName !== "Actor") return;

        const flags = effect.flags?.["altarion-aitusa"] || {};
        const statuses = effect.statuses || new Set();

        // 1. Aid Buff removed: Clamp current HP to restored effectiveMax if needed
        if (flags.isAidBuffEffect || statuses.has?.("aid-buff") || flags.statusId === "aid-buff") {
          setTimeout(async () => {
            try {
              if (!parentActor.isOwner) return;
              const curHp = Number(parentActor.system?.attributes?.hp?.value ?? 0);
              const maxHp = Number(
                parentActor.system?.attributes?.hp?.effectiveMax ||
                  parentActor.system?.attributes?.hp?.max ||
                  curHp
              );
              if (curHp > maxHp) {
                await parentActor.update(
                  { "system.attributes.hp.value": maxHp },
                  { altarionBypassWard: true, wardingBondTransfer: true, altarionTetherTransfer: true }
                );
              }
            } catch (_e) {
              // ignore
            }
          }, 100);
        }

        // 2. Warding Bond removed on either partner: Clean up the linked partner's effect
        if (!options?.wardingBondCleanup) {
          if (flags.isWardingBondTargetEffect || statuses.has?.("warding-bond") || flags.statusId === "warding-bond") {
            const casterActor = flags.casterActorId ? game.actors?.get(flags.casterActorId) : null;
            if (casterActor?.isOwner) {
              const partnerIds = casterActor.effects
                .filter(
                  e =>
                    e.flags?.["altarion-aitusa"]?.isWardingBondCasterEffect ||
                    e.statuses?.has?.("warding-bond-caster") ||
                    e.flags?.["altarion-aitusa"]?.statusId === "warding-bond-caster"
                )
                .map(e => e.id);
              if (partnerIds.length > 0) {
                await this.safeDeleteActorEffects(casterActor, partnerIds, { wardingBondCleanup: true });
              }
            }
          } else if (
            flags.isWardingBondCasterEffect ||
            statuses.has?.("warding-bond-caster") ||
            flags.statusId === "warding-bond-caster"
          ) {
            const targetActor = flags.targetActorId ? game.actors?.get(flags.targetActorId) : null;
            if (targetActor?.isOwner) {
              const partnerIds = targetActor.effects
                .filter(
                  e =>
                    e.flags?.["altarion-aitusa"]?.isWardingBondTargetEffect ||
                    e.statuses?.has?.("warding-bond") ||
                    e.flags?.["altarion-aitusa"]?.statusId === "warding-bond"
                )
                .map(e => e.id);
              if (partnerIds.length > 0) {
                await this.safeDeleteActorEffects(targetActor, partnerIds, { wardingBondCleanup: true });
              }
            }
          }
        }

        const delNameLower = String(effect.name || "").trim().toLowerCase().replace(/’/g, "'");
        const isConcSpiritGuardians =
          delNameLower.startsWith("concentrating") && delNameLower.includes("spirit guardians");
        const isConcSpiritShroud =
          delNameLower.startsWith("concentrating") && delNameLower.includes("spirit shroud");
        const isSgCasterEffect =
          Boolean(flags.isSpiritGuardiansCaster) ||
          Boolean(statuses.has?.("spirit-guardians-caster")) ||
          flags.statusId === "spirit-guardians-caster";

        // 3. Spirit Guardians Caster (or Concentration on Spirit Guardians) removed:
        //    Clean up aura and Affected/Immune statuses EXACTLY ONCE (never racing across nested hooks!)
        if (!options?.skipSpiritGuardiansCleanup && (isSgCasterEffect || isConcSpiritGuardians)) {
          if (isConcSpiritGuardians && parentActor.isOwner) {
            await this.removeStatusEffect(parentActor, "spirit-guardians-caster", {
              skipSpiritGuardiansCleanup: true
            });
          }
          await this.cleanupSpiritGuardiansForCaster(parentActor.id, flags.templateId);
        }

        // 4. Concentration on Spirit Shroud removed: Clean up Spirit Shroud aura status safely
        if (isConcSpiritShroud && parentActor.isOwner) {
          await this.removeStatusEffect(parentActor, "spirit-shroud");
        }
      } catch (err) {
        console.warn("[Altarion & Aitusa] Error in deleteActiveEffect hook:", err);
      }
    });

    // Track Token movement on Canvas for Warding Bond (60 ft limit) & Spirit Guardians (moving 15 ft aura + entry/exit).
    // Listens to BOTH `updateToken` (with explicit `changed.x` / `changed.y` destination overrides) and Foundry V13's
    // `moveToken` hook so detection ALWAYS uses committed destination coordinates with ZERO movement lag!
    const handleMovedTokenDoc = async (tokenDoc, destX, destY) => {
      if (!tokenDoc || !canvas?.ready || !canvas?.scene) return;
      const resolvedX = destX ?? tokenDoc._source?.x ?? tokenDoc.x ?? 0;
      const resolvedY = destY ?? tokenDoc._source?.y ?? tokenDoc.y ?? 0;
      const moveSig = `${tokenDoc.id}:${resolvedX}:${resolvedY}`;
      const now = Date.now();
      this._recentTokenMoveSig ??= new Map();
      const prevTs = this._recentTokenMoveSig.get(moveSig) || 0;
      if (now - prevTs < 120) return;
      this._recentTokenMoveSig.set(moveSig, now);

      const positionOverrides = new Map([[tokenDoc.id, { x: resolvedX, y: resolvedY }]]);
      await this.checkWardingBondTokenDistanceOnMove(tokenDoc, positionOverrides);
      await this.handleSpiritGuardiansTokenMove(tokenDoc, positionOverrides);
    };

    Hooks.on("updateToken", async (tokenDoc, changed, _options, userId) => {
      try {
        if (!("x" in changed) && !("y" in changed) && !("elevation" in changed)) return;
        if (!canvas?.ready || !canvas?.scene) return;
        if (game.user?.id !== userId) return;

        const destX = "x" in changed ? changed.x : tokenDoc._source?.x;
        const destY = "y" in changed ? changed.y : tokenDoc._source?.y;
        await handleMovedTokenDoc(tokenDoc, destX, destY);
      } catch (err) {
        console.warn("[Altarion & Aitusa] Error in updateToken hook:", err);
      }
    });

    Hooks.on("moveToken", async (tokenDoc, movement, _operation, user) => {
      try {
        if (!canvas?.ready || !canvas?.scene) return;
        const userId = typeof user === "string" ? user : user?.id;
        if (userId && game.user?.id !== userId) return;

        const destX = movement?.destination?.x ?? tokenDoc._source?.x;
        const destY = movement?.destination?.y ?? tokenDoc._source?.y;
        await handleMovedTokenDoc(tokenDoc, destX, destY);
      } catch (err) {
        console.warn("[Altarion & Aitusa] Error in moveToken hook:", err);
      }
    });

    // Combat turn expiration for turn-based ActiveEffects + Spirit Guardians Start-of-Turn Save & Ancestral Marking End-of-Turn Save
    Hooks.on("updateCombat", async (combat, changed) => {
      if (!("turn" in changed) && !("round" in changed)) return;
      const currentCombatant = combat.combatant;
      const currentActor = currentCombatant?.actor;
      if (!currentActor) return;

      // 0. Spirit Guardians: If the creature starting its turn has "Spirit Guardians - Affected", trigger Save & Damage!
      if (this.hasStatus(currentActor, "spirit-guardians-affected") && this.isAuthoritativeClientFor(currentActor)) {
        const tokObj = currentCombatant?.token?.object || this.getActorCanvasToken(currentActor);
        await this.triggerSpiritGuardiansSaveAndDamage(tokObj, currentActor, "Start of Turn");
      }

      // Collect both world actors and unlinked token actors on the active scene
      const allCandidateActors = new Set(Array.from(game.actors || []));
      for (const tok of canvas?.tokens?.placeables || []) {
        if (tok?.actor) allCandidateActors.add(tok.actor);
      }

      // 1. Expire "expiresAtStartOfTurnOf" effects when that actor's turn starts
      for (const actor of allCandidateActors) {
        if (!actor.isOwner) continue;
        const toDeleteStart = actor.effects
          .filter(e => {
            const flag = e.flags?.["altarion-aitusa"];
            return (
              flag?.expiresAtStartOfTurnOf === currentActor.id &&
              (combat.round > (flag.appliedRound || 0) || combat.turn !== (flag.appliedTurn || 0))
            );
          })
          .map(e => e.id);
        if (toDeleteStart.length > 0) {
          await this.safeDeleteActorEffects(actor, toDeleteStart);
        }
      }

      // 2. Expire "expiresAtEndOfTurnOf" effects when the previous turn belonged to that actor in a later round
      const prevTurnIndex = (combat.turn - 1 + combat.turns.length) % combat.turns.length;
      const prevCombatant = combat.turns[prevTurnIndex];
      const prevActor = prevCombatant?.actor;
      if (prevActor) {
        // 2a. Ancestral Marking: At the end of a marked creature's turn, post an interactive repeat Wisdom Save card
        if (
          prevCombatant?.id !== currentCombatant?.id &&
          this.hasStatus(prevActor, "ancestral-marking") &&
          this.isAuthoritativeClientFor(prevActor)
        ) {
          const prevTokObj = prevCombatant?.token?.object || this.getActorCanvasToken(prevActor);
          await this.postAncestralMarkingEndOfTurnSaveCard(prevTokObj, prevActor);
        }

        for (const actor of allCandidateActors) {
          if (!actor.isOwner) continue;
          const toDeleteEnd = actor.effects
            .filter(e => {
              const flag = e.flags?.["altarion-aitusa"];
              return flag?.expiresAtEndOfTurnOf === prevActor.id && combat.round > (flag.appliedRound || 0);
            })
            .map(e => e.id);
          if (toDeleteEnd.length > 0) {
            await actor.deleteEmbeddedDocuments("ActiveEffect", toDeleteEnd);
          }
        }
      }
    });

    // Reset Altarion's Arcane Ward when he finishes a Long Rest
    Hooks.on("dnd5e.restCompleted", async (actor, result, config) => {
      try {
        if (!actor || !actor.isOwner || !this.isAltarion(actor)) return;
        const isLongRest = Boolean(result?.longRest || config?.type === "long");
        if (!isLongRest || !this.hasArcaneWardFeature(actor)) return;

        const wasActive =
          Boolean(actor.getFlag("altarion-aitusa", "arcaneWardActive")) ||
          Number(actor.system?.resources?.tertiary?.value ?? 0) > 0;
        const maxWardHp = this.getArcaneWardMaxHp(actor);

        await actor.update(
          {
            "flags.altarion-aitusa.arcaneWardActive": false,
            "system.resources.tertiary.label": "Arcane Ward",
            "system.resources.tertiary.value": 0,
            "system.resources.tertiary.max": maxWardHp,
            "system.resources.tertiary.sr": false,
            "system.resources.tertiary.lr": false
          },
          { altarionBypassWard: true }
        );

        if (wasActive) {
          ui.notifications.info(
            `[Arcane Ward] ${actor.name}'s Arcane Ward faded at the end of the Long Rest (cast a 1st+ level Abjuration spell to weave it anew).`
          );
        }
      } catch (err) {
        console.warn("[Altarion & Aitusa] Error resetting Arcane Ward on Long Rest:", err);
      }
    });

    // Ensure newly placed tokens of Altarion display Token Bar 2 (`resources.tertiary`) for Arcane Ward
    Hooks.on("createToken", async (tokenDoc, _options, userId) => {
      try {
        if (game.user?.id !== userId) return;
        const actor = tokenDoc?.actor;
        if (!actor || !this.isAltarion(actor) || !this.hasArcaneWardFeature(actor) || !tokenDoc.isOwner) return;

        const tokUpdates = {};
        if (tokenDoc.bar2?.attribute !== "resources.tertiary") {
          tokUpdates["bar2.attribute"] = "resources.tertiary";
        }
        if (Number(tokenDoc.displayBars ?? 0) === 0) {
          tokUpdates.displayBars = CONST.TOKEN_DISPLAY_MODES?.OWNER ?? 40;
        }
        if (!foundry.utils.isEmpty(tokUpdates)) {
          await tokenDoc.update(tokUpdates);
        }
      } catch (err) {
        console.warn("[Altarion & Aitusa] Error setting Arcane Ward bar2 on created token:", err);
      }
    });
  }

  /* -------------------------------------------- */
  /*  Interactive Dialogs & Chat Cards            */
  /* -------------------------------------------- */

  static async promptAncestralTetherDialog(altarion, item) {
    const aitusa = this.getAitusaActor();
    if (!aitusa) {
      ui.notifications.warn("[Ancestral Tether] Could not find Aitusa actor in the world.");
      return;
    }

    const availableSlots = [];
    for (let lvl = 1; lvl <= 9; lvl++) {
      const slot = altarion.system?.spells?.[`spell${lvl}`];
      const val = Number(slot?.value || 0);
      const max = Number(slot?.max || 0);
      if (val > 0) {
        availableSlots.push({ level: lvl, value: val, max });
      }
    }

    const alreadyTethered = this.hasStatus(altarion, "ancestral-tether") || this.hasStatus(aitusa, "ancestral-tether");

    if (availableSlots.length === 0 && !alreadyTethered) {
      ui.notifications.warn(`[Ancestral Tether] ${altarion.name} has no spell slots of 1st level or higher remaining!`);
      return;
    }

    const optionsHtml = availableSlots
      .map(
        s =>
          `<option value="${s.level}">Level ${s.level} Spell Slot (${s.value}/${s.max} left) — Duration: ${s.level * 2} Hours</option>`
      )
      .join("");

    const content = `
      <div style="padding: 6px 0;">
        <p style="margin-bottom: 8px;">Select a spell slot of 1st level or higher to tether <strong>${altarion.name}</strong>'s Ancestral essence to <strong>${aitusa.name}</strong>:</p>
        ${
          availableSlots.length > 0
            ? `<div class="form-group" style="margin-bottom: 10px;">
                <label style="font-weight: 600;">Spell Slot to Expend:</label>
                <select id="altarion-tether-slot-select" style="width: 100%; margin-top: 4px;">
                  ${optionsHtml}
                </select>
              </div>`
            : `<p style="color: #f87171;">No spell slots available.</p>`
        }
      </div>
    `;

    const buttons = {};
    if (availableSlots.length > 0) {
      buttons.establish = {
        icon: '<i class="fas fa-link"></i>',
        label: "Establish Tether",
        callback: async (html) => {
          const root = html instanceof HTMLElement ? html : html?.[0];
          const selectEl = root?.querySelector("#altarion-tether-slot-select");
          const chosenLvl = Number(selectEl?.value || availableSlots[0].level);
          const hours = chosenLvl * 2;
          const seconds = hours * 3600;

          const curVal = Number(altarion.system?.spells?.[`spell${chosenLvl}`]?.value || 0);
          if (curVal <= 0) return;

          await altarion.update({
            [`system.spells.spell${chosenLvl}.value`]: Math.max(0, curVal - 1)
          });

          const img = item?.img || "modules/altarion-aitusa/dr_icons/draconic-bond.jpg";

          // Apply Ancestral Tether status to Altarion
          await this.applyOrUpdateStatusEffect(altarion, {
            statusId: "ancestral-tether",
            name: `Ancestral Tether (${hours}h)`,
            img,
            description: `<p>Tethered to <strong>${aitusa.name}</strong> (${hours} hours). While tethered, ${aitusa.name} has resistance to all damage, and whenever ${aitusa.name} takes damage, your hit points are reduced by the same amount. Whenever you take damage, ${aitusa.name} can use their reaction and expend 1 Hit Die to heal you both.</p>`,
            durationSeconds: seconds
          });

          // Apply Ancestral Tether status (+ Resistance to ALL damage) to Aitusa
          await this.applyOrUpdateStatusEffect(aitusa, {
            statusId: "ancestral-tether",
            name: `Ancestral Tether: Resistance to All Damage (${hours}h)`,
            img,
            description: `<p>Tethered to <strong>${altarion.name}</strong> (${hours} hours). You have <strong>Resistance to All Damage</strong>. Whenever you take damage, ${altarion.name}'s current hit points are reduced by the same amount.</p>`,
            changes: [
              {
                key: "system.traits.dr.all",
                mode: CONST.ACTIVE_EFFECT_MODES.CUSTOM,
                value: "1",
                priority: 20
              },
              {
                key: "system.traits.dr.value",
                mode: CONST.ACTIVE_EFFECT_MODES.ADD,
                value: "ALL",
                priority: 20
              }
            ],
            durationSeconds: seconds
          });

          ui.notifications.info(
            `[Ancestral Tether] Expended Level ${chosenLvl} Spell Slot — ${altarion.name} and ${aitusa.name} are tethered for ${hours} hours!`
          );
        }
      };
    }

    if (alreadyTethered) {
      buttons.dismiss = {
        icon: '<i class="fas fa-unlink"></i>',
        label: "Dismiss Active Tether",
        callback: async () => {
          await this.removeStatusEffect(altarion, "ancestral-tether");
          await this.removeStatusEffect(aitusa, "ancestral-tether");
          ui.notifications.info(`[Ancestral Tether] Tether dismissed on ${altarion.name} and ${aitusa.name}.`);
        }
      };
    }

    createV2Dialog({
      title: "Ancestral Tether — Select Spell Slot",
      content,
      buttons,
      default: availableSlots.length > 0 ? "establish" : "dismiss"
    }).render(true);
  }

  static async postAncestralTetherDamageChatCard({ altarion, aitusa, damageTaken, fromAitusaTransfer }) {
    const dragonClass = aitusa.items.find(i => i.type === "class");
    const dragonLvl = Number(dragonClass?.system?.levels || 4);
    const sizeData = DragonScalingManager.getSizeData(dragonLvl);
    const hitDie = dragonClass?.system?.hd?.denomination || sizeData.hitDie || "d8";
    const maxHd = Number(dragonClass?.system?.levels || 4);
    const spentHd = Number(dragonClass?.system?.hd?.spent || 0);
    const remainingHd = Math.max(0, maxHd - spentHd);
    const aitusaIntMod = Number(aitusa.system?.abilities?.int?.mod ?? 3);

    const headerMsg = fromAitusaTransfer
      ? `<strong>${aitusa.name}</strong> took <strong>${damageTaken}</strong> damage while tethered — <strong>${altarion.name}</strong>'s Hit Points were automatically reduced by <strong>${damageTaken}</strong>!`
      : `<strong>${altarion.name}</strong> took <strong>${damageTaken}</strong> damage while tethered to <strong>${aitusa.name}</strong>!`;

    const content = `
      <div class="altarion-aitusa-ward-chat-tag altarion-tether-chat-card" data-altarion-id="${altarion.id}" data-aitusa-id="${aitusa.id}">
        <div class="altarion-ward-header">
          <i class="fas fa-link"></i>
          <span>Ancestral Tether — Shared Essence</span>
        </div>
        <div class="altarion-ward-body">
          ${headerMsg}
          <hr style="margin: 6px 0; border-color: rgba(139, 92, 246, 0.3);">
          <em>Reaction (${aitusa.name}):</em> Expend <strong>1 Hit Die (1${hitDie} + ${aitusaIntMod})</strong> to heal ${altarion.name} (and ${aitusa.name})!
          <div style="margin-top: 4px; font-size: 11px; color: #c4b5fd;">
            ${aitusa.name}'s Hit Dice Remaining: <strong>${remainingHd} / ${maxHd}</strong>
          </div>
        </div>
        <button type="button" class="altarion-aitusa-tether-heal-btn" data-altarion-id="${altarion.id}" data-aitusa-id="${aitusa.id}">
          <i class="fas fa-heart"></i> Use ${aitusa.name}'s Reaction: Expend 1 Hit Die (1${hitDie} + ${aitusaIntMod})
        </button>
      </div>
    `;

    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: altarion }),
      content,
      flags: {
        "altarion-aitusa": {
          isTetherReactionCard: true,
          altarionId: altarion.id,
          aitusaId: aitusa.id
        }
      }
    });
  }

  static async executeTetherHitDieHeal(altarion, aitusa) {
    if (!altarion || !aitusa) return;

    const dragonClass = aitusa.items.find(i => i.type === "class");
    const dragonLvl = Number(dragonClass?.system?.levels || 4);
    const sizeData = DragonScalingManager.getSizeData(dragonLvl);
    const hitDie = dragonClass?.system?.hd?.denomination || sizeData.hitDie || "d8";
    const maxHd = Number(dragonClass?.system?.levels || 4);
    const spentHd = Number(dragonClass?.system?.hd?.spent || 0);
    const remainingHd = Math.max(0, maxHd - spentHd);

    if (remainingHd <= 0) {
      ui.notifications.warn(`[Ancestral Tether] ${aitusa.name} has no Hit Dice remaining!`);
      await ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor: aitusa }),
        content: `<div class="altarion-aitusa-ward-chat-tag"><div class="altarion-ward-header"><i class="fas fa-exclamation-triangle"></i> <span>Ancestral Tether — No Hit Dice Left</span></div><div class="altarion-ward-body"><strong>${aitusa.name}</strong> has <strong>0 / ${maxHd}</strong> Hit Dice remaining and cannot expend a Hit Die to heal!</div></div>`
      });
      return;
    }

    const aitusaIntMod = Number(aitusa.system?.abilities?.int?.mod ?? 3);
    const formula = `1${hitDie} + ${aitusaIntMod}`;
    const roll = await new Roll(formula).evaluate();
    const healAmount = Math.max(1, Number(roll.total || 1));

    if (dragonClass) {
      await dragonClass.update({ "system.hd.spent": spentHd + 1 });
    }

    // Heal Altarion & Aitusa
    const altCurHp = Number(altarion.system?.attributes?.hp?.value ?? 0);
    const altMaxHp = Number(altarion.system?.attributes?.hp?.effectiveMax || altarion.system?.attributes?.hp?.max || 1);
    const altNewHp = Math.min(altMaxHp, altCurHp + healAmount);
    await altarion.update({ "system.attributes.hp.value": altNewHp });

    const aitCurHp = Number(aitusa.system?.attributes?.hp?.value ?? 0);
    const aitMaxHp = Number(aitusa.system?.attributes?.hp?.effectiveMax || aitusa.system?.attributes?.hp?.max || 1);
    const aitNewHp = Math.min(aitMaxHp, aitCurHp + healAmount);
    await aitusa.update({ "system.attributes.hp.value": aitNewHp });

    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: aitusa }),
      flavor: `<strong>Ancestral Tether (Reaction Heal)</strong> — ${aitusa.name} expends 1 Hit Die (${remainingHd - 1}/${maxHd} left) and restores <strong>${healAmount} HP</strong> to ${altarion.name} (and ${aitusa.name})!`
    });
  }

  static async toggleDraconicEnhancementStatus(altarion, item) {
    if (this.hasStatus(altarion, "draconic-enhancement")) {
      await this.removeStatusEffect(altarion, "draconic-enhancement");
      ui.notifications.info(`[Draconic Enhancement] Dismissed on ${altarion.name}.`);
      return;
    }

    const aitusa = this.getAitusaActor();
    const dragonLvl = aitusa?.items.find(i => i.type === "class")?.system?.levels || 18;
    const sizeData = DragonScalingManager.getSizeData(dragonLvl);
    const flySpeed = Number(aitusa?.system?.attributes?.movement?.fly || sizeData.flySpeed || 90);

    await this.applyOrUpdateStatusEffect(altarion, {
      statusId: "draconic-enhancement",
      name: `Draconic Enhancement (+1 AC & ${flySpeed} ft Fly)`,
      img: item?.img || "modules/altarion-aitusa/dr_icons/draconic-enhancement.jpg",
      description: `<p>Your body is enhanced by your bond with <strong>${aitusa?.name || "Aitusa"}</strong>: You gain a <strong>+1 bonus to AC</strong>, a <strong>Flying Speed of ${flySpeed} feet</strong> (equal to your dragon's flying speed), and <strong>Truesight out to 30 feet</strong>.</p>`,
      changes: [
        {
          key: "system.attributes.ac.bonus",
          mode: CONST.ACTIVE_EFFECT_MODES.ADD,
          value: "+1",
          priority: 20
        },
        {
          key: "system.attributes.movement.fly",
          mode: CONST.ACTIVE_EFFECT_MODES.UPGRADE,
          value: String(flySpeed),
          priority: 20
        },
        {
          key: "system.attributes.senses.ranges.truesight",
          mode: CONST.ACTIVE_EFFECT_MODES.UPGRADE,
          value: "30",
          priority: 20
        }
      ]
    });

    ui.notifications.info(
      `[Draconic Enhancement] Activated on ${altarion.name} (+1 AC, ${flySpeed} ft Fly Speed, 30 ft Truesight)!`
    );
  }

  static async promptArcaneStepEchoDialog(altarion) {
    const echoItems = altarion.items.filter(
      i => i.type === "feat" && i.flags?.["altarion-aitusa"]?.isArcaneEcho
    );
    if (echoItems.length === 0) return;

    const enrichFn =
      foundry?.applications?.ux?.TextEditor?.implementation?.enrichHTML?.bind(
        foundry.applications.ux.TextEditor.implementation
      ) ||
      TextEditor?.enrichHTML?.bind(TextEditor) ||
      (async html => html);

    const arcaneStepItem = altarion.items.find(
      i => i.type === "feat" && i.name?.trim().toLowerCase() === "arcane step"
    );
    const defaultStepDesc = await enrichFn(
      arcaneStepItem?.system?.description?.value ||
        `<p>As a bonus action, you can magically teleport up to <strong>30 feet</strong> to an unoccupied space you can see.</p>`,
      { async: true, relativeTo: arcaneStepItem || altarion, rollData: altarion.getRollData?.() || {} }
    );
    const defaultStepIcon =
      arcaneStepItem?.img || "modules/altarion-aitusa/dr_icons/bursting-strike.jpg";

    const echoMetaById = new Map();
    const optionsHtmlParts = [];

    for (const item of echoItems) {
      const maxUses = Number(item.system?.uses?.max || 0);
      const spentUses = Number(item.system?.uses?.spent || 0);
      const remUses = maxUses > 0 ? Math.max(0, maxUses - spentUses) : null;
      const disabled = remUses !== null && remUses <= 0;
      const usesLabel = remUses !== null ? ` (${remUses}/${maxUses} left)` : " (At Will)";
      const usesBadge =
        remUses !== null
          ? `<span style="background: rgba(139, 92, 246, 0.25); border: 1px solid rgba(167, 139, 250, 0.5); border-radius: 4px; padding: 1px 6px; font-size: 11px; color: #ddd6fe;">${remUses}/${maxUses} Uses (Long Rest)</span>`
          : `<span style="background: rgba(56, 189, 248, 0.2); border: 1px solid rgba(56, 189, 248, 0.5); border-radius: 4px; padding: 1px 6px; font-size: 11px; color: #bae6fd;">At Will</span>`;

      const enrichedDesc = await enrichFn(item.system?.description?.value || "", {
        async: true,
        relativeTo: item,
        rollData: typeof item.getRollData === "function" ? item.getRollData() : altarion.getRollData?.() || {}
      });

      echoMetaById.set(item.id, {
        id: item.id,
        name: item.name,
        img: item.img || defaultStepIcon,
        usesBadge,
        enrichedDesc
      });

      optionsHtmlParts.push(
        `<option value="${item.id}" ${disabled ? "disabled" : ""}>${item.name}${usesLabel}</option>`
      );
    }

    const content = `
      <div style="padding: 6px 0;">
        <p style="margin-bottom: 8px;">Choose an <strong>Arcane Echo (Essence Harvest)</strong> to activate with your <strong>Arcane Step</strong> teleport:</p>
        <div class="form-group" style="margin-bottom: 10px;">
          <select id="altarion-echo-select" style="width: 100%; font-weight: 600;">
            <option value="">— None (Teleport 30 ft only) —</option>
            ${optionsHtmlParts.join("")}
          </select>
        </div>
        <div id="altarion-echo-preview-card" style="
          border: 1px solid rgba(139, 92, 246, 0.45);
          border-radius: 8px;
          background: rgba(30, 18, 56, 0.35);
          padding: 10px 12px;
          max-height: 240px;
          overflow-y: auto;
          margin-bottom: 6px;
        ">
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; border-bottom: 1px solid rgba(139, 92, 246, 0.3); padding-bottom: 6px; margin-bottom: 8px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <img id="altarion-echo-preview-img" src="${defaultStepIcon}" style="width: 32px; height: 32px; border-radius: 6px; border: 1px solid #c4b5fd; object-fit: cover;" />
              <strong id="altarion-echo-preview-title" style="font-size: 13px; color: #ede9fe;">Arcane Step (Teleport Only)</strong>
            </div>
            <div id="altarion-echo-preview-badge">
              <span style="background: rgba(148, 163, 184, 0.2); border: 1px solid rgba(148, 163, 184, 0.4); border-radius: 4px; padding: 1px 6px; font-size: 11px; color: #cbd5e1;">No Echo Expended</span>
            </div>
          </div>
          <div id="altarion-echo-preview-desc" class="editor-content" style="font-size: 12.5px; line-height: 1.45;">
            ${defaultStepDesc}
          </div>
        </div>
      </div>
    `;

    createV2Dialog(
      {
        title: "Arcane Step — Trigger Arcane Echo",
        content,
        render: (html) => {
          const root = html instanceof HTMLElement ? html : html?.[0];
          if (!root) return;
          const selectEl = root.querySelector("#altarion-echo-select");
          const imgEl = root.querySelector("#altarion-echo-preview-img");
          const titleEl = root.querySelector("#altarion-echo-preview-title");
          const badgeEl = root.querySelector("#altarion-echo-preview-badge");
          const descEl = root.querySelector("#altarion-echo-preview-desc");

          selectEl?.addEventListener("change", (ev) => {
            const val = ev.currentTarget.value;
            const meta = echoMetaById.get(val);
            if (!meta) {
              if (imgEl) imgEl.src = defaultStepIcon;
              if (titleEl) titleEl.textContent = "Arcane Step (Teleport Only)";
              if (badgeEl) {
                badgeEl.innerHTML = `<span style="background: rgba(148, 163, 184, 0.2); border: 1px solid rgba(148, 163, 184, 0.4); border-radius: 4px; padding: 1px 6px; font-size: 11px; color: #cbd5e1;">No Echo Expended</span>`;
              }
              if (descEl) descEl.innerHTML = defaultStepDesc;
            } else {
              if (imgEl) imgEl.src = meta.img;
              if (titleEl) titleEl.textContent = meta.name;
              if (badgeEl) badgeEl.innerHTML = meta.usesBadge;
              if (descEl) descEl.innerHTML = meta.enrichedDesc;
            }
          });
        },
        buttons: {
          trigger: {
            icon: '<i class="fas fa-sparkles"></i>',
            label: "Complete Arcane Step",
            callback: async (html) => {
              const root = html instanceof HTMLElement ? html : html?.[0];
              const echoId = root?.querySelector("#altarion-echo-select")?.value;
              if (!echoId) return;
              const echoItem = altarion.items.get(echoId);
              if (!echoItem) return;

              const firstActivity = echoItem.system?.activities?.contents?.[0];
              if (firstActivity && typeof firstActivity.use === "function") {
                await firstActivity.use({}, { configure: false });
              } else if (typeof echoItem.use === "function") {
                await echoItem.use({}, { configure: false });
              }
            }
          }
        },
        default: "trigger"
      },
      { width: 480 }
    ).render(true);
  }

  static async placeSelfRadiusTemplate(actor, radiusFt, { excludeSelf = true } = {}) {
    if (!canvas?.ready || !canvas?.scene) return;
    const tok = this.getActorCanvasToken(actor);
    if (!tok) return;

    const gridDist = Number(canvas.scene.grid?.distance || 5);
    const gridSizePx = Number(canvas.scene.grid?.size || 100);
    const pxPerFoot = gridSizePx / gridDist;
    const tokRadiusFt = (Number(tok.document?.width || 1) * gridDist) / 2;
    const totalRadiusFt = radiusFt + tokRadiusFt;

    try {
      await canvas.scene.createEmbeddedDocuments("MeasuredTemplate", [
        {
          t: "circle",
          user: game.user?.id,
          x: tok.center.x,
          y: tok.center.y,
          distance: totalRadiusFt,
          direction: 0,
          fillColor: game.user?.color?.css || game.user?.color || "#8b5cf6"
        }
      ]);
    } catch (_e) {
      // ignore
    }

    const radiusPx = totalRadiusFt * pxPerFoot;
    const targetIds = [];
    for (const other of canvas.tokens?.placeables || []) {
      if (other.document?.hidden) continue;
      if (excludeSelf && other.id === tok.id) continue;
      const dx = other.center.x - tok.center.x;
      const dy = other.center.y - tok.center.y;
      const otherHalfPx = ((Number(other.document?.width || 1) * gridSizePx) / 2) * 0.5;
      if (Math.hypot(dx, dy) <= radiusPx + otherHalfPx) {
        targetIds.push(other.id);
      }
    }
    if (targetIds.length > 0 && game.user?.updateTokenTargets) {
      game.user.updateTokenTargets(targetIds);
    }
  }

  /* -------------------------------------------- */
  /*  Arcane Ward & Arcane Armor Helper Methods   */
  /* -------------------------------------------- */

  static async ensureArcaneWardTokenBar(altarion) {
    if (!altarion || !this.isAltarion(altarion) || !this.hasArcaneWardFeature(altarion)) return;

    const actorUpdates = {};
    if (altarion.prototypeToken?.bar2?.attribute !== "resources.tertiary") {
      actorUpdates["prototypeToken.bar2.attribute"] = "resources.tertiary";
    }
    if (Number(altarion.prototypeToken?.displayBars ?? 0) === 0) {
      actorUpdates["prototypeToken.displayBars"] = CONST.TOKEN_DISPLAY_MODES?.OWNER ?? 40;
    }
    if (!foundry.utils.isEmpty(actorUpdates)) {
      await altarion.update(actorUpdates, { altarionBypassWard: true });
    }

    for (const scene of game.scenes || []) {
      for (const tokDoc of scene.tokens || []) {
        if (tokDoc.actorId !== altarion.id || !tokDoc.isOwner) continue;
        const tokUpdates = {};
        if (tokDoc.bar2?.attribute !== "resources.tertiary") {
          tokUpdates["bar2.attribute"] = "resources.tertiary";
        }
        if (Number(tokDoc.displayBars ?? 0) === 0) {
          tokUpdates.displayBars = CONST.TOKEN_DISPLAY_MODES?.OWNER ?? 40;
        }
        if (!foundry.utils.isEmpty(tokUpdates)) {
          await tokDoc.update(tokUpdates);
        }
      }
    }
  }

  static async handleArcaneWardAbjurationCast(altarion, spellItem, slotLevel) {
    if (!altarion || !this.hasArcaneWardFeature(altarion)) return;

    await this.ensureArcaneWardTokenBar(altarion);

    const maxWardHp = this.getArcaneWardMaxHp(altarion);
    const wasActive = Boolean(altarion.getFlag("altarion-aitusa", "arcaneWardActive"));
    const curWardHp = Math.clamp(Number(altarion.system?.resources?.tertiary?.value ?? 0), 0, maxWardHp);

    let newWardHp = maxWardHp;
    let headerTitle = "";
    let bodyHtml = "";

    if (!wasActive) {
      newWardHp = maxWardHp;
      await altarion.update(
        {
          "flags.altarion-aitusa.arcaneWardActive": true,
          "system.resources.tertiary": {
            label: "Arcane Ward",
            value: newWardHp,
            max: maxWardHp,
            sr: false,
            lr: false
          }
        },
        { altarionBypassWard: true }
      );
      headerTitle = `Arcane Ward — Woven (${newWardHp} / ${maxWardHp} HP)`;
      bodyHtml = `<strong>${altarion.name}</strong> wove an <strong>Arcane Ward</strong> using a strand of <strong>${spellItem.name}</strong> (Slot Level ${slotLevel})! The ward lasts until a Long Rest and absorbs damage before Temporary HP and Hit Points.`;
      ui.notifications.info(`[Arcane Ward] Woven at full strength (${newWardHp} / ${maxWardHp} HP)!`);
    } else {
      const gain = Math.max(2, 2 * Number(slotLevel || 1));
      newWardHp = Math.min(maxWardHp, curWardHp + gain);
      const actualGain = newWardHp - curWardHp;
      await altarion.update(
        {
          "flags.altarion-aitusa.arcaneWardActive": true,
          "system.resources.tertiary.label": "Arcane Ward",
          "system.resources.tertiary.value": newWardHp,
          "system.resources.tertiary.max": maxWardHp
        },
        { altarionBypassWard: true }
      );
      headerTitle = `Arcane Ward — Recharged (+${gain} HP → ${newWardHp} / ${maxWardHp} HP)`;
      bodyHtml = `Casting <strong>${spellItem.name}</strong> (Slot Level ${slotLevel}) restored <strong>+${gain} HP</strong>${
        actualGain < gain ? ` <em>(${actualGain} effective, capped at max)</em>` : ""
      } to <strong>${altarion.name}</strong>'s Arcane Ward (<strong>${curWardHp} → ${newWardHp} / ${maxWardHp} HP</strong>).`;
      ui.notifications.info(`[Arcane Ward] Recharged +${gain} HP (${newWardHp} / ${maxWardHp} HP)!`);
    }

    const pct = Math.round((newWardHp / Math.max(1, maxWardHp)) * 100);
    const content = `
      <div class="altarion-aitusa-ward-chat-tag altarion-arcane-ward-chat-card">
        <div class="altarion-ward-header">
          <i class="fas fa-shield-alt"></i>
          <span>${headerTitle}</span>
        </div>
        <div class="altarion-ward-body">
          ${bodyHtml}
          <div class="altarion-chat-ward-meter">
            <div class="altarion-chat-ward-meter-fill" style="width: ${pct}%;"></div>
            <span class="altarion-chat-ward-meter-label">Arcane Ward: ${newWardHp} / ${maxWardHp} HP</span>
          </div>
        </div>
      </div>
    `;

    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: altarion }),
      content,
      flags: {
        "altarion-aitusa": {
          isArcaneWardCard: true
        }
      }
    });
  }

  static async postArcaneWardAbsorptionChatCard(altarion, absorption) {
    if (!altarion || !absorption || absorption.absorbed <= 0) return;

    const { absorbed, prevWardHp, newWardHp, maxWardHp, remainingDamage, totalIncoming, tempLost, hpLost } =
      absorption;
    const pct = Math.round((newWardHp / Math.max(1, maxWardHp)) * 100);

    let overflowNote = `<strong>0</strong> overflow damage — ${altarion.name}'s Temporary HP and Hit Points remain untouched!`;
    if (remainingDamage > 0) {
      const parts = [];
      if (tempLost > 0) parts.push(`<strong>${tempLost}</strong> to Temporary HP`);
      if (hpLost > 0) parts.push(`<strong>${hpLost}</strong> to Hit Points`);
      overflowNote = `<strong>${remainingDamage}</strong> remaining damage transferred to <strong>${altarion.name}</strong> (${
        parts.join(", ") || `${remainingDamage} overflow`
      }).`;
    }

    const content = `
      <div class="altarion-aitusa-ward-chat-tag altarion-arcane-ward-chat-card">
        <div class="altarion-ward-header">
          <i class="fas fa-shield-alt"></i>
          <span>Arcane Ward — Absorbed ${absorbed} Damage</span>
        </div>
        <div class="altarion-ward-body">
          Incoming Damage: <strong>${totalIncoming}</strong> &bull; Absorbed by Ward: <strong>${absorbed}</strong> (<strong>${prevWardHp} → ${newWardHp} / ${maxWardHp} HP</strong>)<br>
          ${overflowNote}${
            newWardHp === 0
              ? `<br><em>The ward is at 0 HP, but its magic remains until a Long Rest (cast a 1st+ level Abjuration spell to restore 2 &times; Slot Level HP).</em>`
              : ""
          }
          <div class="altarion-chat-ward-meter">
            <div class="altarion-chat-ward-meter-fill" style="width: ${pct}%;"></div>
            <span class="altarion-chat-ward-meter-label">Arcane Ward: ${newWardHp} / ${maxWardHp} HP</span>
          </div>
        </div>
      </div>
    `;

    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: altarion }),
      content,
      flags: {
        "altarion-aitusa": {
          isArcaneWardCard: true
        }
      }
    });
  }

  static async resolveActorFromUuidOrId(actorUuid, actorId) {
    if (actorUuid) {
      try {
        const doc = (await fromUuid(actorUuid)) || null;
        if (doc?.documentName === "Token") return doc.actor || null;
        if (doc?.documentName === "Actor") return doc;
        if (doc?.actor) return doc.actor;
      } catch (_e) {
        // ignore
      }
    }
    if (actorId) {
      return game.actors?.get(actorId) || null;
    }
    return null;
  }

  static async applyRetaliationDamageToTarget({
    attackerUuid = "",
    attackerActorId = "",
    damage = 5,
    damageType = "force",
    armorLabel = "Arcane Armor"
  } = {}) {
    let targetActor = await this.resolveActorFromUuidOrId(attackerUuid, attackerActorId);
    const dmgTypeLower = String(damageType || "force").toLowerCase();
    const dmgTypeLabel =
      dmgTypeLower === "necrotic"
        ? "Necrotic"
        : dmgTypeLower === "cold"
          ? "Cold"
          : dmgTypeLower === "radiant"
            ? "Radiant"
            : "Force";

    // Fallback to currently targeted token or controlled token (excluding Altarion, Aitusa, Kyrion, and Parva)
    if (!targetActor) {
      const userTargets = Array.from(game.user?.targets || [])
        .map(t => t.actor)
        .filter(a => a && !this.isAltarion(a) && !this.isAitusa(a) && !this.isKyrion(a) && !this.isParva(a));
      if (userTargets.length > 0) {
        targetActor = userTargets[0];
      } else {
        const controlled = Array.from(canvas?.tokens?.controlled || [])
          .map(t => t.actor)
          .filter(a => a && !this.isAltarion(a) && !this.isAitusa(a) && !this.isKyrion(a) && !this.isParva(a));
        if (controlled.length > 0) targetActor = controlled[0];
      }
    }

    if (!targetActor) {
      ui.notifications.warn(`[${armorLabel}] Target or select an enemy token first to apply ${dmgTypeLabel} damage.`);
      return { applied: false, targetActor: null };
    }

    if (!targetActor.isOwner) {
      ui.notifications.warn(
        `[${armorLabel}] Only the GM (or an owner of ${targetActor.name}) can apply ${damage} ${dmgTypeLabel} damage to ${targetActor.name}.`
      );
      return { applied: false, targetActor };
    }

    const dmgVal = Math.max(1, Number(damage || 5));
    const RL = globalThis.CoriaRollLedger;
    const beforeLayers = RL?.captureActorVitalLayers ? RL.captureActorVitalLayers(targetActor) : null;

    if (typeof targetActor.applyDamage === "function") {
      await targetActor.applyDamage([{ value: dmgVal, type: dmgTypeLower }], {
        altarionArcaneArmorRetaliation: true
      });
    } else {
      const curTemp = Number(targetActor.system?.attributes?.hp?.temp ?? 0);
      const curHp = Number(targetActor.system?.attributes?.hp?.value ?? 0);
      const tempLost = Math.min(curTemp, dmgVal);
      const hpLost = Math.max(0, dmgVal - tempLost);
      await targetActor.update({
        "system.attributes.hp.temp": Math.max(0, curTemp - tempLost),
        "system.attributes.hp.value": Math.max(0, curHp - hpLost)
      });
    }

    const afterLayers = RL?.captureActorVitalLayers ? RL.captureActorVitalLayers(targetActor) : null;
    const damageLayers =
      beforeLayers && afterLayers && RL?.computeDamageLayersDiff
        ? RL.computeDamageLayersDiff(beforeLayers, afterLayers, dmgVal)
        : null;
    if (damageLayers && RL?.pushActorDamageLayerEvent) {
      RL.pushActorDamageLayerEvent(targetActor, damageLayers, "");
    }

    ui.notifications.info(`[${armorLabel}] Dealt ${dmgVal} ${dmgTypeLabel} damage to ${targetActor.name}!`);
    return { applied: true, targetActor, damageLayers };
  }

  static async applyForceDamageToTarget(opts = {}) {
    return this.applyRetaliationDamageToTarget({ ...opts, damageType: "force", armorLabel: "Arcane Armor" });
  }

  static async undoRetaliationDamageOnTarget({
    attackerUuid = "",
    attackerActorId = "",
    damage = 5,
    armorLabel = "Arcane Armor",
    damageMessage = null,
    damageLayers = null
  } = {}) {
    const targetActor = await this.resolveActorFromUuidOrId(attackerUuid, attackerActorId);
    if (!targetActor || !targetActor.isOwner) {
      ui.notifications.warn(`[${armorLabel}] Only the GM / owner can undo damage on this creature.`);
      return false;
    }
    const healVal = Math.max(1, Number(damage || 5));
    const RL = globalThis.CoriaRollLedger;
    if (RL?.revertActorDamageLayered) {
      const revRes = await RL.revertActorDamageLayered(targetActor, healVal, {
        mode: "undo",
        damageMessage,
        damageLayers
      });
      ui.notifications.info(
        `[${armorLabel}] Restored ${revRes?.summaryText || `+${healVal} HP`} to ${targetActor.name} (Undone).`
      );
      return true;
    }
    const curHp = Number(targetActor.system?.attributes?.hp?.value ?? 0);
    const maxHp = Number(
      targetActor.system?.attributes?.hp?.effectiveMax || targetActor.system?.attributes?.hp?.max || curHp + healVal
    );
    await targetActor.update(
      {
        "system.attributes.hp.value": Math.min(maxHp, curHp + healVal)
      },
      { altarionBypassWard: true, coriaDamageReactionInternal: true, coriaDarkVitalityBypass: true }
    );
    ui.notifications.info(`[${armorLabel}] Restored ${healVal} HP to ${targetActor.name} (Undone).`);
    return true;
  }

  static async undoForceDamageOnTarget(opts = {}) {
    return this.undoRetaliationDamageOnTarget({ ...opts, armorLabel: "Arcane Armor" });
  }

  /* -------------------------------------------- */
  /*  Aid, Spirit Shroud, Warding Bond &          */
  /*  Spirit Guardians Automation Helpers         */
  /* -------------------------------------------- */

  static async handleAidSpellCast(actor, item, usageConfig, results, activity) {
    const msgFlagLvl = Number(results?.message?.flags?.["altarion-aitusa"]?.castSlotLevel ?? NaN);
    const slotLevel = Math.max(
      2,
      Number.isFinite(msgFlagLvl)
        ? msgFlagLvl
        : this.getEffectiveSpellSlotLevel(actor, item, usageConfig, results?.message, activity)
    );
    const aidHpBonus = 5 * Math.max(1, slotLevel - 1);

    const casterTok = this.getActorCanvasToken(actor);
    const preTargetedTokenIds = new Set(Array.from(game.user?.targets || []).map(t => t.id));
    const candidates = [];

    if (canvas?.ready && canvas?.tokens?.placeables?.length) {
      for (const tok of canvas.tokens.placeables) {
        if (!tok?.actor || tok.document?.hidden) continue;
        const dist = casterTok && tok.id !== casterTok.id ? this.getTokenDistanceFt(casterTok, tok) : 0;
        if (dist !== null && dist <= 30) {
          candidates.push({
            tokenId: tok.id,
            actor: tok.actor,
            name: tok.name || tok.actor.name,
            img: tok.document?.texture?.src || tok.actor.img || "icons/svg/mystery-man.svg",
            dist: dist ?? 0,
            isFriendly: Number(tok.document?.disposition ?? 0) === 1 || tok.actor.hasPlayerOwner || tok.actor.id === actor.id
          });
        }
      }
    }

    let recipients = [];
    if (candidates.length > 0) {
      candidates.sort((a, b) => a.dist - b.dist);
      // Pre-select up to 3 currently targeted tokens (or the caster if none are targeted)
      const defaultSelectedIds = [];
      for (const c of candidates) {
        if (preTargetedTokenIds.has(c.tokenId) && defaultSelectedIds.length < 3) {
          defaultSelectedIds.push(c.tokenId);
        }
      }
      if (defaultSelectedIds.length === 0 && casterTok) {
        defaultSelectedIds.push(casterTok.id);
      }

      const rowsHtml = candidates
        .map(c => {
          const checked = defaultSelectedIds.includes(c.tokenId) ? "checked" : "";
          const badge = c.isFriendly
            ? `<span style="font-size:10px;padding:1px 6px;border-radius:4px;background:rgba(34,197,94,0.2);color:#86efac;">Ally</span>`
            : `<span style="font-size:10px;padding:1px 6px;border-radius:4px;background:rgba(239,68,68,0.2);color:#fca5a5;">Creature</span>`;
          return `
            <label class="coria-creature-pick-row" data-token-id="${c.tokenId}" style="display:flex;align-items:center;gap:10px;padding:6px 10px;border-radius:6px;border:1px solid rgba(56,189,248,0.35);background:rgba(15,23,42,0.78);cursor:pointer;margin-bottom:5px;">
              <input type="checkbox" name="aidTargetToken" value="${c.tokenId}" ${checked} />
              <img src="${c.img}" style="width:28px;height:28px;border-radius:4px;object-fit:cover;border:1px solid rgba(255,255,255,0.2);" />
              <span style="flex:1;font-weight:700;color:#f8fafc;">${foundry.utils.escapeHTML(c.name)}</span>
              ${badge}
              <span style="font-size:11px;color:#cbd5e1;">${c.dist === 0 && c.actor.id === actor.id ? "Self" : `${c.dist} ft`}</span>
            </label>
          `;
        })
        .join("");

      const selectedTokenIds = await new Promise(resolve => {
        let settled = false;
        const finish = ids => {
          if (settled) return;
          settled = true;
          this.clearAllTokenHoverRings();
          resolve(ids);
        };
        createV2Dialog(
          {
            title: `Aid (Slot Level ${slotLevel}) — Select up to 3 Targets (within 30 ft)`,
            content: `
              <div style="padding: 6px 2px;">
                <p style="margin: 0 0 6px; font-size: 12px;">
                  Choose <strong>up to 3 creatures within 30 feet</strong> to gain <strong>+${aidHpBonus} Max HP</strong> and <strong>+${aidHpBonus} Current HP</strong> for 8 hours (hover to highlight on canvas):
                </p>
                <div style="margin-bottom: 6px; font-size: 11.5px; color: #93c5fd; font-weight: 700;">
                  Selected: <span class="coria-aid-count">${defaultSelectedIds.length}</span> / 3
                </div>
                <div style="max-height: 280px; overflow-y: auto; padding-right: 4px;">
                  ${rowsHtml}
                </div>
              </div>
            `,
            render: html => {
              const root = html instanceof HTMLElement ? html : html?.[0];
              if (!root) return;
              this.bindTokenHoverHighlightListeners(root, ".coria-creature-pick-row");
              const countEl = root.querySelector(".coria-aid-count");
              const checkboxes = Array.from(root.querySelectorAll('input[name="aidTargetToken"]'));
              for (const cb of checkboxes) {
                cb.addEventListener("change", () => {
                  const checkedBoxes = checkboxes.filter(el => el.checked);
                  if (checkedBoxes.length > 3) {
                    cb.checked = false;
                    ui.notifications.warn("[Aid] You can select at most 3 creatures for Aid.");
                    return;
                  }
                  if (countEl) countEl.textContent = String(checkedBoxes.length);
                });
              }
            },
            buttons: {
              confirm: {
                icon: '<i class="fas fa-heart-pulse"></i>',
                label: `Apply Aid (+${aidHpBonus} HP)`,
                callback: html => {
                  const root = html instanceof HTMLElement ? html : html?.[0];
                  const checked = Array.from(root?.querySelectorAll('input[name="aidTargetToken"]:checked') || [])
                    .map(el => el.value)
                    .slice(0, 3);
                  finish(checked);
                }
              }
            },
            default: "confirm",
            close: () => finish(defaultSelectedIds)
          },
          { width: 440 }
        ).render(true);
      });

      for (const tokId of selectedTokenIds) {
        const cand = candidates.find(c => c.tokenId === tokId);
        if (cand?.actor && !recipients.some(r => r.id === cand.actor.id)) {
          recipients.push(cand.actor);
        }
      }
    }

    if (recipients.length === 0) {
      const targetedActors = [];
      for (const tok of game.user?.targets || []) {
        if (tok?.actor && !targetedActors.some(a => a.id === tok.actor.id)) {
          targetedActors.push(tok.actor);
        }
      }
      recipients = targetedActors.slice(0, 3);
      if (recipients.length === 0) {
        if (this.isAltarion(actor) && usageConfig?.useLinkedCasting) {
          recipients = [actor, this.getAitusaActor()].filter(Boolean);
        } else {
          recipients = [actor];
        }
      }
    }

    for (const targetActor of recipients) {
      if (!targetActor.isOwner) continue;

      // Check if target already had an Aid buff so we enforce "Combining Magical Effects":
      // - If a higher-level Aid is already active (prevBonus > aidHpBonus), keep the higher-level Aid and do not add extra HP.
      // - If an equal or higher-level Aid is cast (aidHpBonus >= prevBonus), upgrade the effect and heal only the net difference (aidHpBonus - prevBonus).
      const prevAidEff = targetActor.effects?.find(
        e =>
          !e.disabled &&
          (e.flags?.["altarion-aitusa"]?.isAidBuffEffect ||
            e.statuses?.has?.("aid-buff") ||
            e.flags?.["altarion-aitusa"]?.statusId === "aid-buff")
      );
      const prevBonus = Number(prevAidEff?.flags?.["altarion-aitusa"]?.aidHpBonus || 0);

      await this.applyOrUpdateStatusEffect(targetActor, {
        statusId: "aid-buff",
        name: `Aid (+${aidHpBonus} Max HP)`,
        img: item.img || "icons/magic/life/heart-cross-strong-flame-blue.webp",
        description: `<p><strong>Aid (Slot Level ${slotLevel}):</strong> Your hit point maximum and current hit points increase by <strong>+${aidHpBonus}</strong> for 8 hours.</p>`,
        changes: [
          {
            key: "system.attributes.hp.tempmax",
            mode: CONST.ACTIVE_EFFECT_MODES.ADD,
            value: `+${aidHpBonus}`,
            priority: 20
          }
        ],
        durationSeconds: 28800,
        durationRounds: 4800,
        extraFlags: {
          isAidBuffEffect: true,
          potency: aidHpBonus,
          aidHpBonus,
          slotLevel,
          casterId: actor.id
        }
      });

      const activeBonus = Math.max(prevBonus, aidHpBonus);
      const curHp = Number(targetActor.system?.attributes?.hp?.value ?? 0);
      const baseMax = Number(targetActor.system?.attributes?.hp?.max ?? curHp);
      const netGain = Math.max(0, aidHpBonus - prevBonus);
      const effectiveMax = baseMax + activeBonus;
      const nextHp = Math.min(effectiveMax, curHp + netGain);

      if (nextHp !== curHp) {
        await targetActor.update(
          { "system.attributes.hp.value": nextHp },
          { altarionBypassWard: true, wardingBondTransfer: true, altarionTetherTransfer: true }
        );
      }

      // Ensure all canvas tokens of this recipient have Bar 1 tracking `attributes.hp` and redraw their HP bar
      // so the Aid temporary Max HP indicator appears on ALL affected tokens (Altarion, Aitusa, Kyrion, NPCs, etc.)
      if (canvas?.ready) {
        for (const tok of canvas.tokens?.placeables || []) {
          if (tok?.actor?.id !== targetActor.id) continue;
          try {
            if (tok.document?.isOwner && tok.document.bar1?.attribute !== "attributes.hp") {
              await tok.document.update({ "bar1.attribute": "attributes.hp" });
            }
            tok.drawBars?.();
          } catch (_e) {
            // ignore
          }
        }
      }
    }

    const content = `
      <div class="altarion-aitusa-ward-chat-tag altarion-arcane-armor-chat-card">
        <div class="altarion-ward-header">
          <i class="fas fa-heart-pulse"></i>
          <span>Aid (Slot Level ${slotLevel}) — +${aidHpBonus} Max &amp; Current HP</span>
        </div>
        <div class="altarion-ward-body">
          <strong>${recipients.map(r => r.name).join(", ")}</strong> gained <strong>+${aidHpBonus} Maximum HP</strong> and <strong>+${aidHpBonus} Current HP</strong> for 8 hours!
        </div>
      </div>
    `;
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor }),
      content
    });
    ui.notifications.info(
      `[Aid — Level ${slotLevel}] Granted +${aidHpBonus} Max HP and +${aidHpBonus} Current HP to ${recipients.map(r => r.name).join(", ")}!`
    );
  }

  static async handleSpiritShroudSpellCast(actor, item, usageConfig, results, activity) {
    const msgFlagLvl = Number(results?.message?.flags?.["altarion-aitusa"]?.castSlotLevel ?? NaN);
    const slotLevel = Math.max(
      3,
      Number.isFinite(msgFlagLvl)
        ? msgFlagLvl
        : this.getEffectiveSpellSlotLevel(actor, item, usageConfig, results?.message, activity)
    );
    // 1d8 at slot 3-4, 2d8 at 5-6, 3d8 at 7-8, 4d8 at 9
    const bonusDice = Math.max(1, Math.floor((slotLevel - 1) / 2));

    const chosenType = await new Promise(resolve => {
      let settled = false;
      const finish = val => {
        if (settled) return;
        settled = true;
        resolve(val);
      };
      createV2Dialog(
        {
          title: `${item.name} (Slot Level ${slotLevel}) — Choose Damage Type`,
          content: `
            <div style="padding: 8px 4px;">
              <p style="margin: 0 0 10px; font-size: 13px;">
                Choose the bonus damage type for <strong>Spirit Shroud (+${bonusDice}d8 within 10 ft)</strong>:
              </p>
              <div style="display: flex; flex-direction: column; gap: 6px;">
                <label style="display: flex; align-items: center; gap: 8px; padding: 6px 10px; border-radius: 6px; background: rgba(250, 204, 21, 0.12); border: 1px solid rgba(250, 204, 21, 0.4); cursor: pointer;">
                  <input type="radio" name="spiritShroudDmgType" value="radiant" checked />
                  <strong><i class="fas fa-sun" style="color: #facc15;"></i> Radiant (+${bonusDice}d8)</strong>
                </label>
                <label style="display: flex; align-items: center; gap: 8px; padding: 6px 10px; border-radius: 6px; background: rgba(168, 85, 247, 0.12); border: 1px solid rgba(168, 85, 247, 0.4); cursor: pointer;">
                  <input type="radio" name="spiritShroudDmgType" value="necrotic" />
                  <strong><i class="fas fa-skull" style="color: #c084fc;"></i> Necrotic (+${bonusDice}d8)</strong>
                </label>
                <label style="display: flex; align-items: center; gap: 8px; padding: 6px 10px; border-radius: 6px; background: rgba(56, 189, 248, 0.12); border: 1px solid rgba(56, 189, 248, 0.4); cursor: pointer;">
                  <input type="radio" name="spiritShroudDmgType" value="cold" />
                  <strong><i class="fas fa-snowflake" style="color: #38bdf8;"></i> Cold (+${bonusDice}d8)</strong>
                </label>
              </div>
            </div>
          `,
          buttons: {
            confirm: {
              icon: '<i class="fas fa-check"></i>',
              label: "Apply Spirit Shroud",
              callback: html => {
                const root = html instanceof HTMLElement ? html : html?.[0];
                const checked = root?.querySelector('input[name="spiritShroudDmgType"]:checked');
                finish(checked?.value || "radiant");
              }
            }
          },
          default: "confirm",
          close: () => finish("radiant")
        },
        { width: 380 }
      ).render(true);
    });

    const damageType = String(chosenType || "radiant").toLowerCase();
    const damageTypeLabel =
      damageType === "necrotic" ? "Necrotic" : damageType === "cold" ? "Cold" : "Radiant";
    const auraStyle = damageType === "necrotic" ? "necrotic" : damageType === "cold" ? "frost" : "sunburst";

    await this.applyOrUpdateStatusEffect(actor, {
      statusId: "spirit-shroud",
      name: `Spirit Shroud (+${bonusDice}d8 ${damageTypeLabel})`,
      img: item.img || "icons/magic/unholy/silhouette-robe-evil-glow.webp",
      description: `<p><strong>Spirit Shroud (Slot Level ${slotLevel}):</strong> Until the spell ends (1 minute), any attack you make deals an extra <strong>${bonusDice}d8 ${damageTypeLabel} damage</strong> when you hit a creature within 10 feet of you.</p>`,
      durationSeconds: 60,
      durationRounds: 10,
      extraFlags: {
        isSpiritShroudEffect: true,
        potency: bonusDice,
        damageType,
        damageTypeLabel,
        bonusDice,
        slotLevel,
        casterId: actor.id,
        coriaAura: CoriaAuraEngine.buildAuraFlag({
          auraId: "spirit-shroud",
          label: `Spirit Shroud (10 ft)`,
          radiusFt: 10,
          style: auraStyle,
          opacity: 0.58,
          showGridHighlight: true,
          showCircularBorder: true
        })
      }
    });

    CoriaAuraEngine.syncAllSceneAuras();

    ui.notifications.info(
      `[Spirit Shroud — Level ${slotLevel}] Active on ${actor.name} (+${bonusDice}d8 ${damageTypeLabel} damage on attacks within 10 ft)!`
    );
  }

  static async handleWardingBondSpellCast(actor, item, _usageConfig, _results, _activity) {
    let targetActor = Array.from(game.user?.targets || [])
      .map(t => t.actor)
      .find(a => a && a.id !== actor.id);

    if (!targetActor && this.isAitusa(actor)) {
      targetActor = this.getAltarionActor();
    }

    // If still no target selected, prompt from tokens within 60 ft on canvas
    if (!targetActor && canvas?.ready) {
      const casterTok = this.getActorCanvasToken(actor);
      const candidates = [];
      for (const tok of canvas.tokens?.placeables || []) {
        if (!tok?.actor || tok.actor.id === actor.id || tok.document?.hidden) continue;
        const dist = casterTok ? this.getTokenDistanceFt(casterTok, tok) : 0;
        if (dist !== null && dist <= 60) {
          candidates.push({
            tokenId: tok.id,
            actor: tok.actor,
            name: tok.name || tok.actor.name,
            img: tok.document?.texture?.src || tok.actor.img,
            dist
          });
        }
      }
      if (candidates.length > 0) {
        const rowsHtml = candidates
          .map(
            (c, idx) => `
            <label class="coria-creature-pick-row" data-token-id="${c.tokenId}" style="display:flex;align-items:center;gap:10px;padding:6px 10px;border-radius:6px;border:1px solid rgba(250,204,21,0.35);background:rgba(15,23,42,0.75);cursor:pointer;margin-bottom:5px;">
              <input type="radio" name="wardingBondTarget" value="${idx}" ${idx === 0 ? "checked" : ""} />
              <img src="${c.img}" style="width:28px;height:28px;border-radius:4px;object-fit:cover;" />
              <span style="flex:1;font-weight:700;color:#f8fafc;">${foundry.utils.escapeHTML(c.name)}</span>
              <span style="font-size:11px;color:#cbd5e1;">${c.dist} ft</span>
            </label>`
          )
          .join("");

        targetActor = await new Promise(resolve => {
          let settled = false;
          const finish = val => {
            if (settled) return;
            settled = true;
            this.clearAllTokenHoverRings();
            resolve(val);
          };
          createV2Dialog(
            {
              title: "Warding Bond — Select Target Creature (within 60 ft)",
              content: `<div style="padding:6px 2px;"><p style="margin:0 0 8px;font-size:12px;">Hover to highlight on canvas and choose the willing creature to bond with:</p>${rowsHtml}</div>`,
              render: html => {
                const root = html instanceof HTMLElement ? html : html?.[0];
                this.bindTokenHoverHighlightListeners(root, ".coria-creature-pick-row");
              },
              buttons: {
                confirm: {
                  icon: '<i class="fas fa-link"></i>',
                  label: "Apply Warding Bond",
                  callback: html => {
                    const root = html instanceof HTMLElement ? html : html?.[0];
                    const checked = root?.querySelector('input[name="wardingBondTarget"]:checked');
                    const idx = Number(checked?.value ?? 0);
                    finish(candidates[idx]?.actor || candidates[0]?.actor || null);
                  }
                }
              },
              default: "confirm",
              close: () => finish(candidates[0]?.actor || null)
            },
            { width: 420 }
          ).render(true);
        });
      }
    }

    if (!targetActor) {
      ui.notifications.warn("[Warding Bond] Please target a willing creature (T) before casting Warding Bond.");
      return;
    }

    const allDamageTypes = [
      "acid",
      "bludgeoning",
      "cold",
      "fire",
      "force",
      "lightning",
      "necrotic",
      "piercing",
      "poison",
      "psychic",
      "radiant",
      "slashing",
      "thunder"
    ];

    const drChanges = allDamageTypes.map(dt => ({
      key: "system.traits.dr.value",
      mode: CONST.ACTIVE_EFFECT_MODES.ADD,
      value: dt,
      priority: 20
    }));

    await this.applyOrUpdateStatusEffect(targetActor, {
      statusId: "warding-bond",
      name: `Warding Bond (+1 AC, +1 Saves, Resistance All — ${actor.name})`,
      img: item.img || "icons/magic/defensive/shield-barrier-flaming-diamond-gold.webp",
      description: `<p><strong>Warding Bond (Caster: ${actor.name}):</strong> While within 60 feet of ${actor.name}, you gain a <strong>+1 bonus to AC and saving throws</strong>, and you have <strong>resistance to all damage</strong>. Also, each time you take damage, ${actor.name} takes the same amount of damage.</p>`,
      changes: [
        {
          key: "system.attributes.ac.bonus",
          mode: CONST.ACTIVE_EFFECT_MODES.ADD,
          value: "+1",
          priority: 20
        },
        {
          key: "system.bonuses.abilities.save",
          mode: CONST.ACTIVE_EFFECT_MODES.ADD,
          value: "+1",
          priority: 20
        },
        {
          key: "system.traits.dr.all",
          mode: CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
          value: "true",
          priority: 20
        },
        ...drChanges
      ],
      durationSeconds: 3600,
      durationRounds: 600,
      extraFlags: {
        isWardingBondTargetEffect: true,
        casterActorId: actor.id,
        casterName: actor.name,
        targetActorId: targetActor.id
      }
    });

    await this.applyOrUpdateStatusEffect(actor, {
      statusId: "warding-bond-caster",
      name: `Warding Bond: Linked to ${targetActor.name}`,
      img: item.img || "icons/magic/defensive/shield-barrier-flaming-diamond-gold.webp",
      description: `<p><strong>Warding Bond (Warding ${targetActor.name}):</strong> While ${targetActor.name} is within 60 feet of you, ${targetActor.name} has +1 AC, +1 saving throws, and resistance to all damage. Each time ${targetActor.name} takes damage, you take the same amount of damage. Ends if you drop to 0 HP or move more than 60 feet apart.</p>`,
      durationSeconds: 3600,
      durationRounds: 600,
      extraFlags: {
        isWardingBondCasterEffect: true,
        casterActorId: actor.id,
        targetActorId: targetActor.id,
        targetName: targetActor.name
      }
    });

    const content = `
      <div class="altarion-aitusa-ward-chat-tag altarion-arcane-armor-chat-card">
        <div class="altarion-ward-header">
          <i class="fas fa-link"></i>
          <span>Warding Bond Active — ${actor.name} &amp; ${targetActor.name}</span>
        </div>
        <div class="altarion-ward-body">
          <strong>${targetActor.name}</strong> gains <strong>+1 AC</strong>, <strong>+1 to all Saving Throws</strong>, and <strong>Resistance to All Damage</strong> (1 hour, within 60 ft).<br>
          Whenever <strong>${targetActor.name}</strong> takes damage, <strong>${actor.name}</strong> takes the same amount of damage.
        </div>
      </div>
    `;
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor }),
      content
    });
    ui.notifications.info(`[Warding Bond] Linked ${actor.name} and ${targetActor.name} for 1 hour!`);
  }

  static async postWardingBondDamageChatCard({ caster, target, damageTaken }) {
    const content = `
      <div class="altarion-aitusa-ward-chat-tag altarion-arcane-armor-chat-card">
        <div class="altarion-ward-header">
          <i class="fas fa-link"></i>
          <span>Warding Bond — Shared Damage (${damageTaken})</span>
        </div>
        <div class="altarion-ward-body">
          <strong>${target.name}</strong> took <strong>${damageTaken}</strong> damage while protected by <strong>Warding Bond</strong>.<br>
          <strong>${caster.name}</strong> automatically takes <strong>${damageTaken}</strong> shared damage!
        </div>
      </div>
    `;
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: caster }),
      content
    });
  }

  static async checkWardingBondTokenDistanceOnMove(_movedTokenDoc, positionOverrides = null) {
    if (!canvas?.ready) return;
    for (const actor of game.actors || []) {
      const wbEff = actor.effects?.find(
        e =>
          !e.disabled &&
          (e.flags?.["altarion-aitusa"]?.isWardingBondTargetEffect ||
            e.statuses?.has?.("warding-bond") ||
            e.flags?.["altarion-aitusa"]?.statusId === "warding-bond")
      );
      if (!wbEff) continue;
      const casterId = wbEff.flags?.["altarion-aitusa"]?.casterActorId;
      const casterActor = casterId ? game.actors?.get(casterId) : null;
      if (!casterActor) continue;

      const targetTok = this.getActorCanvasToken(actor);
      const casterTok = this.getActorCanvasToken(casterActor);
      if (!targetTok || !casterTok) continue;

      const distFt = this.getTokenDistanceFt(casterTok, targetTok, positionOverrides);
      if (distFt !== null && distFt > 60) {
        if (actor.isOwner) {
          await this.removeStatusEffect(actor, "warding-bond");
        }
        if (casterActor.isOwner) {
          await this.removeStatusEffect(casterActor, "warding-bond-caster");
        }
        const content = `
          <div class="altarion-aitusa-ward-chat-tag altarion-arcane-armor-chat-card">
            <div class="altarion-ward-header">
              <i class="fas fa-unlink"></i>
              <span>Warding Bond Ended — Distance Exceeded 60 ft (${distFt} ft)</span>
            </div>
            <div class="altarion-ward-body">
              <strong>${casterActor.name}</strong> and <strong>${actor.name}</strong> moved more than 60 feet apart (<strong>${distFt} ft</strong>). The <strong>Warding Bond</strong> spell ends!
            </div>
          </div>
        `;
        await ChatMessage.create({
          speaker: ChatMessage.getSpeaker({ actor: casterActor }),
          content
        });
        ui.notifications.warn(
          `[Warding Bond] Ended between ${casterActor.name} and ${actor.name} (distance ${distFt} ft > 60 ft)!`
        );
      }
    }
  }

  static async handleSpiritGuardiansSpellCast(actor, item, usageConfig, results, activity) {
    const msgFlagLvl = Number(results?.message?.flags?.["altarion-aitusa"]?.castSlotLevel ?? NaN);
    const slotLevel = Math.max(
      3,
      Number.isFinite(msgFlagLvl)
        ? msgFlagLvl
        : this.getEffectiveSpellSlotLevel(actor, item, usageConfig, results?.message, activity)
    );
    const spellDc =
      Number(actor.system?.attributes?.spell?.dc) ||
      8 + Number(actor.system?.abilities?.wis?.mod ?? 3) + Number(actor.system?.attributes?.prof ?? 2);

    // 1. Dialog 1: Choose Damage Type (Radiant or Necrotic)
    const chosenDamageType = await new Promise(resolve => {
      let settled = false;
      const finish = val => {
        if (settled) return;
        settled = true;
        resolve(val);
      };
      createV2Dialog(
        {
          title: `Spirit Guardians (Slot Level ${slotLevel}) — Choose Damage Type`,
          content: `
            <div style="padding: 8px 4px;">
              <p style="margin: 0 0 10px; font-size: 13px;">
                Choose the damage type for <strong>Spirit Guardians (${slotLevel}d8, 15-ft aura)</strong>:
              </p>
              <div style="display: flex; flex-direction: column; gap: 6px;">
                <label style="display: flex; align-items: center; gap: 8px; padding: 8px 10px; border-radius: 6px; background: rgba(250, 204, 21, 0.14); border: 1px solid rgba(250, 204, 21, 0.45); cursor: pointer;">
                  <input type="radio" name="sgDmgType" value="radiant" checked />
                  <strong><i class="fas fa-sun" style="color: #facc15;"></i> Radiant (${slotLevel}d8)</strong>
                </label>
                <label style="display: flex; align-items: center; gap: 8px; padding: 8px 10px; border-radius: 6px; background: rgba(168, 85, 247, 0.14); border: 1px solid rgba(168, 85, 247, 0.45); cursor: pointer;">
                  <input type="radio" name="sgDmgType" value="necrotic" />
                  <strong><i class="fas fa-skull" style="color: #c084fc;"></i> Necrotic (${slotLevel}d8)</strong>
                </label>
              </div>
            </div>
          `,
          buttons: {
            next: {
              icon: '<i class="fas fa-arrow-right"></i>',
              label: "Next: Select Immune Creatures",
              callback: html => {
                const root = html instanceof HTMLElement ? html : html?.[0];
                const checked = root?.querySelector('input[name="sgDmgType"]:checked');
                finish(checked?.value || "radiant");
              }
            }
          },
          default: "next",
          close: () => finish("radiant")
        },
        { width: 390 }
      ).render(true);
    });

    const damageType = String(chosenDamageType || "radiant").toLowerCase();
    const damageTypeLabel = damageType === "necrotic" ? "Necrotic" : "Radiant";

    // 2. Dialog 2: Multi-select list of all tokens on canvas (hover highlights token on canvas)
    const casterTok = this.getActorCanvasToken(actor);
    const otherTokens = (canvas?.tokens?.placeables || []).filter(
      t => t?.actor && (!casterTok || t.id !== casterTok.id) && !t.document?.hidden
    );

    let selectedImmuneTokenIds = [];
    if (otherTokens.length > 0) {
      const tokenRowsHtml = otherTokens
        .map(t => {
          const disp = Number(t.document?.disposition ?? 0);
          const isFriendly = disp === 1 || t.actor?.hasPlayerOwner;
          const badge = isFriendly
            ? `<span style="font-size:10px;padding:1px 6px;border-radius:4px;background:rgba(34,197,94,0.2);color:#86efac;">Ally</span>`
            : `<span style="font-size:10px;padding:1px 6px;border-radius:4px;background:rgba(239,68,68,0.2);color:#fca5a5;">Creature</span>`;
          const img = t.document?.texture?.src || t.actor?.img || "icons/svg/mystery-man.svg";
          const dist = casterTok ? this.getTokenDistanceFt(casterTok, t) : null;
          return `
            <label class="coria-creature-pick-row" data-token-id="${t.id}" style="display:flex;align-items:center;gap:10px;padding:6px 10px;border-radius:6px;border:1px solid rgba(250,204,21,0.3);background:rgba(15,23,42,0.78);cursor:pointer;margin-bottom:5px;">
              <input type="checkbox" name="sgImmuneToken" value="${t.id}" ${isFriendly ? "checked" : ""} />
              <img src="${img}" style="width:28px;height:28px;border-radius:4px;object-fit:cover;border:1px solid rgba(255,255,255,0.2);" />
              <span style="flex:1;font-weight:700;color:#f8fafc;">${foundry.utils.escapeHTML(t.name || t.actor.name)}</span>
              ${badge}
              ${dist !== null ? `<span style="font-size:11px;color:#cbd5e1;">${dist} ft</span>` : ""}
            </label>
          `;
        })
        .join("");

      selectedImmuneTokenIds = await new Promise(resolve => {
        let settled = false;
        const finish = ids => {
          if (settled) return;
          settled = true;
          this.clearAllTokenHoverRings();
          resolve(ids);
        };
        createV2Dialog(
          {
            title: "Spirit Guardians — Designate Unaffected (Immune) Creatures",
            content: `
              <div style="padding: 6px 2px;">
                <p style="margin: 0 0 8px; font-size: 12px;">
                  Select any number of tokens on the canvas to receive <strong>"Spirit Guardians - Immune"</strong> (hover over a creature to highlight its token on the canvas):
                </p>
                <div style="max-height: 290px; overflow-y: auto; padding-right: 4px;">
                  ${tokenRowsHtml}
                </div>
              </div>
            `,
            render: html => {
              const root = html instanceof HTMLElement ? html : html?.[0];
              this.bindTokenHoverHighlightListeners(root, ".coria-creature-pick-row");
            },
            buttons: {
              confirm: {
                icon: '<i class="fas fa-shield-halved"></i>',
                label: "Confirm & Activate Aura",
                callback: html => {
                  const root = html instanceof HTMLElement ? html : html?.[0];
                  const checked = Array.from(root?.querySelectorAll('input[name="sgImmuneToken"]:checked') || []).map(
                    el => el.value
                  );
                  finish(checked);
                }
              }
            },
            default: "confirm",
            close: () => finish([])
          },
          { width: 440 }
        ).render(true);
      });
    }

    // Clean up any previous Spirit Guardians effects from this caster first
    await this.cleanupSpiritGuardiansForCaster(actor.id);

    // 3. Apply "Spirit Guardians - Immune" to selected tokens
    const immuneActorIds = [];
    for (const tokId of selectedImmuneTokenIds) {
      const tok = canvas?.tokens?.get(tokId);
      const tActor = tok?.actor;
      if (!tActor) continue;
      if (!immuneActorIds.includes(tActor.id)) immuneActorIds.push(tActor.id);
      if (tActor.isOwner) {
        await this.applyOrUpdateStatusEffect(tActor, {
          statusId: "spirit-guardians-immune",
          name: "Spirit Guardians - Immune",
          img: item.img || "icons/magic/light/projectiles-salvo-blue.webp",
          description: `<p>Designated by <strong>${actor.name}</strong> to be unaffected by <strong>Spirit Guardians</strong>.</p>`,
          durationSeconds: 600,
          durationRounds: 100,
          extraFlags: {
            isSpiritGuardiansImmune: true,
            casterActorId: actor.id,
            tokenId: tok.id
          }
        });
      }
    }

    // 4. Apply "Spirit Guardians (Aura Active)" on the caster (rendered at 60 FPS via CoriaAuraEngine!)
    await this.applyOrUpdateStatusEffect(actor, {
      statusId: "spirit-guardians-caster",
      name: `Spirit Guardians (${slotLevel}d8 ${damageTypeLabel}, DC ${spellDc})`,
      img: item.img || "icons/magic/light/projectiles-salvo-blue.webp",
      description: `<p><strong>Spirit Guardians (Slot Level ${slotLevel}, 15-ft radius):</strong> Affected creatures within 15 feet have their speed halved and must make a <strong>DC ${spellDc} Wisdom saving throw</strong> when affected or at the start of their turn, taking <strong>${slotLevel}d8 ${damageTypeLabel} damage</strong> on a failed save, or half as much on a successful one.</p>`,
      durationSeconds: 600,
      durationRounds: 100,
      extraFlags: {
        isSpiritGuardiansCaster: true,
        casterActorId: actor.id,
        casterTokenId: casterTok?.id || null,
        potency: slotLevel,
        slotLevel,
        damageType,
        damageTypeLabel,
        spellDc,
        immuneTokenIds: selectedImmuneTokenIds,
        immuneActorIds,
        coriaAura: CoriaAuraEngine.buildAuraFlag({
          auraId: "spirit-guardians",
          label: `Spirit Guardians (15 ft)`,
          radiusFt: 15,
          style: damageType === "necrotic" ? "necrotic" : "sunburst",
          showGridHighlight: true,
          showCircularBorder: true
        })
      }
    });

    CoriaAuraEngine.syncAllSceneAuras();

    // 5. Immediately evaluate all tokens on the canvas (apply "Spirit Guardians - Affected" & post Save + Damage card!)
    await this.evaluateSpiritGuardiansAuraForScene({ triggerEntryDamage: true });
  }

  static _sgEvalLock = Promise.resolve();

  static async cleanupSpiritGuardiansForCaster(casterActorId, templateId = null) {
    if (!canvas?.ready || !canvas?.scene) return;
    try {
      const templatesToDelete = canvas.scene.templates
        .filter(
          t =>
            t.id === templateId ||
            t.flags?.["altarion-aitusa"]?.spiritGuardiansCasterId === casterActorId
        )
        .map(t => t.id);
      if (templatesToDelete.length > 0) {
        await canvas.scene.deleteEmbeddedDocuments("MeasuredTemplate", templatesToDelete);
      }
    } catch (_e) {
      // ignore
    }

    const seenActorUuids = new Set();
    for (const tok of canvas.tokens?.placeables || []) {
      const tActor = tok?.actor;
      if (!tActor || !tActor.isOwner) continue;
      const actorKey = tActor.uuid || tActor.id;
      if (seenActorUuids.has(actorKey)) continue;
      seenActorUuids.add(actorKey);

      const effIds = tActor.effects
        .filter(e => {
          const f = e.flags?.["altarion-aitusa"];
          const isSgSubStatus =
            f?.isSpiritGuardiansAffected ||
            f?.isSpiritGuardiansImmune ||
            this.doesEffectMatchStatusFamily(e, "spirit-guardians-affected") ||
            this.doesEffectMatchStatusFamily(e, "spirit-guardians-immune");
          return isSgSubStatus && (!casterActorId || !f?.casterActorId || f.casterActorId === casterActorId);
        })
        .map(e => e.id);
      if (effIds.length > 0) {
        await this.safeDeleteActorEffects(tActor, effIds);
      }
    }

    CoriaAuraEngine.syncAllSceneAuras();
  }

  static async handleSpiritGuardiansTokenMove(_movedTokenDoc, positionOverrides = null) {
    if (!canvas?.ready || !canvas?.scene) return;
    CoriaAuraEngine.syncAllSceneAuras();
    // Re-evaluate all tokens on the scene using destination coordinates (zero movement lag!)
    await this.evaluateSpiritGuardiansAuraForScene({ triggerEntryDamage: true, positionOverrides });
  }

  static async evaluateSpiritGuardiansAuraForScene({ triggerEntryDamage = true, positionOverrides = null } = {}) {
    const run = this._sgEvalLock
      .catch(() => {})
      .then(() => this._evaluateSpiritGuardiansAuraForSceneImpl({ triggerEntryDamage, positionOverrides }));
    this._sgEvalLock = run;
    return run;
  }

  static async _evaluateSpiritGuardiansAuraForSceneImpl({ triggerEntryDamage = true, positionOverrides = null } = {}) {
    if (!canvas?.ready || !canvas?.scene) return;

    // Collect all active Spirit Guardians casters on the scene
    const activeCasters = [];
    for (const tok of canvas.tokens?.placeables || []) {
      const act = tok?.actor;
      if (!act) continue;
      const casterEff = act.effects?.find(
        e =>
          !e.disabled &&
          (e.flags?.["altarion-aitusa"]?.isSpiritGuardiansCaster ||
            e.statuses?.has?.("spirit-guardians-caster") ||
            e.flags?.["altarion-aitusa"]?.statusId === "spirit-guardians-caster")
      );
      if (casterEff) {
        activeCasters.push({
          casterToken: tok,
          casterActor: act,
          flags: casterEff.flags?.["altarion-aitusa"] || {}
        });
      }
    }

    if (activeCasters.length === 0) return;

    // Group non-hidden tokens by unique Actor UUID:
    // - Unlinked synthetic NPC tokens each have a unique `Scene.X.Token.Y.Actor.Z` UUID (tracked 100% independently!)
    // - Linked actors with multiple tokens share `Actor.Z`, so they are affected if ANY of their tokens is inside an aura
    //   and only leave when ALL of their tokens are outside all active auras.
    const actorTokenGroups = new Map();
    for (const tok of canvas.tokens?.placeables || []) {
      const tActor = tok?.actor;
      if (!tActor || !tActor.isOwner || tok.document?.hidden) continue;
      const key = tActor.uuid || tok.id;
      if (!actorTokenGroups.has(key)) {
        actorTokenGroups.set(key, { actor: tActor, tokens: [] });
      }
      actorTokenGroups.get(key).tokens.push(tok);
    }

    for (const { actor: tActor, tokens } of actorTokenGroups.values()) {
      let insideEntry = null;
      let isAnySelfCaster = false;

      for (const tok of tokens) {
        for (const casterEntry of activeCasters) {
          const { casterToken, casterActor, flags } = casterEntry;
          if (tok.id === casterToken.id || tActor.uuid === casterActor.uuid) {
            isAnySelfCaster = true;
            continue;
          }

          const immuneTokIds = Array.isArray(flags.immuneTokenIds) ? flags.immuneTokenIds : [];
          const isImmune =
            immuneTokIds.includes(tok.id) || this.hasStatus(tActor, "spirit-guardians-immune");
          if (isImmune) continue;

          const distFt = this.getTokenDistanceFt(casterToken, tok, positionOverrides);
          if (distFt !== null && distFt <= 15) {
            insideEntry = { tok, casterActor, flags };
            break;
          }
        }
        if (insideEntry) break;
      }

      if (isAnySelfCaster && !insideEntry) continue;

      const alreadyAffected = this.hasStatus(tActor, "spirit-guardians-affected");

      if (insideEntry && !alreadyAffected) {
        const { tok, casterActor, flags } = insideEntry;
        // Creature just entered (or started inside) the 15-ft aura -> Apply "Spirit Guardians - Affected" (speed halved)
        await this.applyOrUpdateStatusEffect(tActor, {
          statusId: "spirit-guardians-affected",
          name: "Spirit Guardians - Affected",
          img: "icons/magic/light/projectiles-salvo-blue.webp",
          description: `<p>Within 15 feet of <strong>${casterActor.name}</strong>'s <strong>Spirit Guardians</strong>: Movement speed is <strong>halved</strong>. Takes <strong>${flags.slotLevel || 3}d8 ${flags.damageTypeLabel || "Radiant"} damage</strong> (DC ${flags.spellDc || 14} Wisdom save for half) when affected and at the start of its turn.</p>`,
          changes: [
            {
              key: "system.attributes.movement.walk",
              mode: CONST.ACTIVE_EFFECT_MODES.MULTIPLY,
              value: "0.5",
              priority: 20
            },
            {
              key: "system.attributes.movement.fly",
              mode: CONST.ACTIVE_EFFECT_MODES.MULTIPLY,
              value: "0.5",
              priority: 20
            },
            {
              key: "system.attributes.movement.swim",
              mode: CONST.ACTIVE_EFFECT_MODES.MULTIPLY,
              value: "0.5",
              priority: 20
            },
            {
              key: "system.attributes.movement.climb",
              mode: CONST.ACTIVE_EFFECT_MODES.MULTIPLY,
              value: "0.5",
              priority: 20
            },
            {
              key: "system.attributes.movement.burrow",
              mode: CONST.ACTIVE_EFFECT_MODES.MULTIPLY,
              value: "0.5",
              priority: 20
            }
          ],
          durationSeconds: 600,
          durationRounds: 100,
          extraFlags: {
            isSpiritGuardiansAffected: true,
            casterActorId: casterActor.id,
            slotLevel: flags.slotLevel || 3,
            damageType: flags.damageType || "radiant",
            damageTypeLabel: flags.damageTypeLabel || "Radiant",
            spellDc: flags.spellDc || 14
          }
        });

        if (triggerEntryDamage && this.isAuthoritativeClientFor(tActor)) {
          await this.triggerSpiritGuardiansSaveAndDamage(tok, tActor, "Entered Aura", casterActor, flags);
        }
      } else if (!insideEntry && alreadyAffected) {
        const displayName = tokens[0]?.name || tActor.name;
        // Creature left the 15-ft aura -> Remove "Spirit Guardians - Affected"
        await this.removeStatusEffect(tActor, "spirit-guardians-affected");
        ui.notifications.info(`[Spirit Guardians] ${displayName} left the aura and is no longer affected.`);
      }
    }
  }

  /**
   * Build the HTML content for an interactive Saving Throw card (`spirit-guardians`, `shadow-rebuke`, or `ancestral-marking`).
   */
  static buildInteractiveSaveCardHtml(cardState, cardMessageId = "") {
    if (!cardState) return "";

    if (cardState.cardType === "spirit-guardians" || cardState.cardType === "shadow-rebuke") {
      const isShadowRebuke = cardState.cardType === "shadow-rebuke";
      const {
        slotLevel = isShadowRebuke ? 1 : 3,
        damageType = isShadowRebuke ? "necrotic" : "radiant",
        damageTypeLabel = isShadowRebuke ? "Necrotic" : "Radiant",
        spellDc = 14,
        triggerReason = isShadowRebuke ? "Damaged Kyrion" : "Entered Aura",
        rawDamage = 10
      } = cardState;
      const spellTitle = isShadowRebuke ? "Shadow Rebuke" : "Spirit Guardians";
      const iconClass = isShadowRebuke ? "fa-fire-alt" : "fa-dharmachakra";
      const saveLabel = isShadowRebuke ? "Dexterity Save" : "Wisdom Save";
      const diceFormula = cardState.diceFormula || (isShadowRebuke ? `${ Number(slotLevel || 1) + 1 }d10` : `${slotLevel}d8`);
      const t = cardState.targets?.sgTarget || {};
      const targetName = t.targetName || "Creature";
      const targetUuid = t.targetUuid || "";
      const targetActorId = t.targetActorId || "";
      const resolvedDoc = targetUuid && typeof fromUuidSync === "function" ? fromUuidSync(targetUuid) : null;
      const targetActor =
        resolvedDoc?.actor ||
        (resolvedDoc?.documentName === "Actor" ? resolvedDoc : null) ||
        (targetActorId ? game.actors?.get(targetActorId) : null);

      if (!t.rolled) {
        return `
          <div class="altarion-aitusa-ward-chat-tag altarion-arcane-armor-chat-card" data-interactive-card-id="${cardMessageId}">
            <div class="altarion-ward-header">
              <i class="fas ${iconClass}"></i>
              <span>${spellTitle} (Lvl ${slotLevel}) — ${foundry.utils.escapeHTML(triggerReason)}</span>
            </div>
            <div class="altarion-ward-body">
              <strong>${foundry.utils.escapeHTML(targetName)}</strong> (${foundry.utils.escapeHTML(triggerReason)}):<br>
              &bull; <strong>Base Damage Roll (${diceFormula} ${damageTypeLabel}):</strong> <strong>${rawDamage}</strong> <em>(${Math.max(1, Math.floor(rawDamage / 2))} on successful save)</em><br>
              &bull; <strong>${saveLabel} (DC ${spellDc}):</strong> <span class="coria-hl-gold">Awaiting roll...</span>
            </div>
            <div class="altarion-arcane-armor-btn-row">
              <button type="button" class="altarion-interactive-save-roll-btn coria-min-card-btn-primary"
                      data-card-msg-id="${cardMessageId}"
                      data-target-key="sgTarget">
                <i class="fas fa-dice-d20"></i> Roll ${saveLabel} (DC ${spellDc}) — ${foundry.utils.escapeHTML(targetName)}
              </button>
            </div>
          </div>
        `;
      }

      const saveSuccess = Boolean(t.saveSuccess);
      const saveTotal = Number(t.saveTotal ?? 10);
      const saveNat = Number(t.saveNat ?? 10);
      const appliedDamage = Number(t.appliedDamage ?? rawDamage);
      const modNote = t.modifiedBy ? ` <em class="coria-hl-info">[${foundry.utils.escapeHTML(t.modifiedBy)}]</em>` : "";
      const saveBadge = saveSuccess
        ? `<span class="coria-hl-success">Succeeded (${saveTotal} vs DC ${spellDc}) — Half Damage</span>${modNote}`
        : `<span class="coria-hl-failure">Failed (${saveTotal} vs DC ${spellDc}) — Full Damage</span>${modNote}`;

      const reactHtml =
        typeof globalThis.FlinnManager?.buildSavingThrowReactionButtonsHtml === "function"
          ? globalThis.FlinnManager.buildSavingThrowReactionButtonsHtml({
              rollerActor: targetActor,
              rollerName: targetName,
              origNat: saveNat,
              origTotal: saveTotal,
              saveDc: spellDc,
              cardMessageId,
              targetKey: "sgTarget",
              originMsgId: t.rollMessageId || ""
            })
          : "";

      return `
        <div class="altarion-aitusa-ward-chat-tag altarion-arcane-armor-chat-card" data-interactive-card-id="${cardMessageId}">
          <div class="altarion-ward-header">
            <i class="fas ${iconClass}"></i>
            <span>${spellTitle} (Lvl ${slotLevel}) — ${foundry.utils.escapeHTML(triggerReason)}</span>
          </div>
          <div class="altarion-ward-body">
            <strong>${foundry.utils.escapeHTML(targetName)}</strong> (${foundry.utils.escapeHTML(triggerReason)}):<br>
            &bull; <strong>${saveLabel}:</strong> ${saveBadge}<br>
            &bull; <strong>Damage Roll (${diceFormula} ${damageTypeLabel}):</strong> Rolled <strong>${rawDamage}</strong> &rarr; Applied <strong>${appliedDamage} ${damageTypeLabel} damage</strong>!
          </div>
          <div class="altarion-arcane-armor-btn-row">
            <button type="button" class="altarion-arcane-armor-undo-btn"
                    data-attacker-uuid="${targetUuid}"
                    data-attacker-id="${targetActorId}"
                    data-damage="${appliedDamage}"
                    data-armor-label="${spellTitle}"
                    ${t.autoApplied ? "" : "disabled"}>
              <i class="fas fa-undo"></i> Undo (+${appliedDamage} HP)
            </button>
            <button type="button" class="altarion-arcane-armor-apply-btn"
                    data-attacker-uuid="${targetUuid}"
                    data-attacker-id="${targetActorId}"
                    data-damage="${appliedDamage}"
                    data-damage-type="${damageType}"
                    data-armor-label="${spellTitle}">
              <i class="fas fa-burst"></i> Re-apply ${appliedDamage} ${damageTypeLabel}
            </button>
          </div>
          ${reactHtml}
        </div>
      `;
    }

    if (cardState.cardType === "ancestral-marking" || cardState.cardType === "ancestral-marking-eot") {
      const isEot = cardState.cardType === "ancestral-marking-eot";
      const spellDc = Number(cardState.spellDc || 14);
      const headerTitle = isEot
        ? `Ancestral Marking — End of Turn Save (DC ${spellDc})`
        : `Ancestral Marking — Wisdom Saves (DC ${spellDc})`;
      const targetEntries = Object.entries(cardState.targets || {});

      const rowsHtml = targetEntries
        .map(([tKey, t]) => {
          const targetName = t.targetName || "Creature";
          const targetActor = t.targetActorId ? game.actors?.get(t.targetActorId) : null;
          const img = t.img || targetActor?.img || "icons/svg/mystery-man.svg";

          if (!t.rolled) {
            return `
              <div style="padding: 6px 8px; margin: 5px 0; border-radius: 6px; background: rgba(15, 23, 42, 0.65); border: 1px solid rgba(139, 92, 246, 0.35);">
                <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 5px;">
                  <div style="display: flex; align-items: center; gap: 7px;">
                    <img src="${img}" style="width: 24px; height: 24px; border-radius: 4px; object-fit: cover;" />
                    <strong>${foundry.utils.escapeHTML(targetName)}</strong>
                  </div>
                  <span style="font-size: 11px; color: #fde047;">Awaiting Save...</span>
                </div>
                <button type="button" class="altarion-interactive-save-roll-btn coria-min-card-btn-primary"
                        style="width: 100%;"
                        data-card-msg-id="${cardMessageId}"
                        data-target-key="${tKey}">
                  <i class="fas fa-dice-d20"></i> Roll Wisdom Save (DC ${spellDc}) — ${foundry.utils.escapeHTML(targetName)}
                </button>
              </div>
            `;
          }

          const saveSuccess = Boolean(t.saveSuccess);
          const saveTotal = Number(t.saveTotal ?? 10);
          const saveNat = Number(t.saveNat ?? 10);
          const modNote = t.modifiedBy ? ` <em class="coria-hl-info">[${foundry.utils.escapeHTML(t.modifiedBy)}]</em>` : "";
          const outcomeBadge = saveSuccess
            ? isEot
              ? `<span class="coria-hl-success">Succeeded (${saveTotal} vs DC ${spellDc}) — Marking Ended!</span>${modNote}`
              : `<span class="coria-hl-success">Succeeded (${saveTotal} vs DC ${spellDc}) — Not Marked</span>${modNote}`
            : isEot
              ? `<span class="coria-hl-failure">Failed (${saveTotal} vs DC ${spellDc}) — Remains Marked!</span>${modNote}`
              : `<span class="coria-hl-failure">Failed (${saveTotal} vs DC ${spellDc}) — Ancestral Marking Applied!</span>${modNote}`;

          const reactHtml =
            typeof globalThis.FlinnManager?.buildSavingThrowReactionButtonsHtml === "function"
              ? globalThis.FlinnManager.buildSavingThrowReactionButtonsHtml({
                  rollerActor: targetActor,
                  rollerName: targetName,
                  origNat: saveNat,
                  origTotal: saveTotal,
                  saveDc: spellDc,
                  cardMessageId,
                  targetKey: tKey,
                  originMsgId: t.rollMessageId || ""
                })
              : "";

          return `
            <div style="padding: 6px 8px; margin: 5px 0; border-radius: 6px; background: rgba(15, 23, 42, 0.65); border: 1px solid ${saveSuccess ? "rgba(34, 197, 94, 0.45)" : "rgba(239, 68, 68, 0.45)"};">
              <div style="display: flex; align-items: center; gap: 7px; margin-bottom: 4px;">
                <img src="${img}" style="width: 24px; height: 24px; border-radius: 4px; object-fit: cover;" />
                <strong>${foundry.utils.escapeHTML(targetName)}</strong>
              </div>
              <div style="font-size: 12px;">
                &bull; <strong>Wisdom Save:</strong> ${outcomeBadge}
              </div>
              ${reactHtml}
            </div>
          `;
        })
        .join("");

      return `
        <div class="altarion-aitusa-ward-chat-tag altarion-arcane-armor-chat-card" data-interactive-card-id="${cardMessageId}">
          <div class="altarion-ward-header">
            <i class="fas fa-dragon"></i>
            <span>${headerTitle}</span>
          </div>
          <div class="altarion-ward-body">
            ${
              isEot
                ? `At the end of its turn, a creature marked by <strong>Ancestral Marking</strong> repeats the <strong>DC ${spellDc} Wisdom saving throw</strong>, ending the effect on a success:`
                : `Selected creatures must make a <strong>DC ${spellDc} Wisdom saving throw</strong> or have <strong>disadvantage</strong> on attacks against creatures other than Altarion or Aitusa for 1 minute:`
            }
            ${rowsHtml}
          </div>
        </div>
      `;
    }

    return "";
  }

  static async triggerSpiritGuardiansSaveAndDamage(
    targetToken,
    targetActor,
    triggerReason = "Entered Aura",
    casterActorOpt = null,
    sgFlagsOpt = null
  ) {
    if (!targetActor) return;

    const affEff = targetActor.effects?.find(
      e =>
        !e.disabled &&
        (e.flags?.["altarion-aitusa"]?.isSpiritGuardiansAffected ||
          e.statuses?.has?.("spirit-guardians-affected") ||
          e.flags?.["altarion-aitusa"]?.statusId === "spirit-guardians-affected")
    );
    const sgFlags = sgFlagsOpt || affEff?.flags?.["altarion-aitusa"] || {};
    const casterActor =
      casterActorOpt || (sgFlags.casterActorId ? game.actors?.get(sgFlags.casterActorId) : null);

    const slotLevel = Math.max(3, Number(sgFlags.slotLevel || 3));
    const damageType = String(sgFlags.damageType || "radiant").toLowerCase();
    const damageTypeLabel = sgFlags.damageTypeLabel || (damageType === "necrotic" ? "Necrotic" : "Radiant");
    const spellDc =
      Number(sgFlags.spellDc) ||
      Number(casterActor?.system?.attributes?.spell?.dc) ||
      14;

    const targetName = targetToken?.name || targetActor.name;
    const targetUuid = targetToken?.document?.uuid || targetActor.uuid || "";

    // Roll the base Spirit Guardians Damage (${slotLevel}d8) up front; the GM/player clicks the button to roll the Wisdom Save!
    const dmgRoll = await new Roll(`${slotLevel}d8`).evaluate();
    try {
      if (game.dice3d) await game.dice3d.showForRoll(dmgRoll, game.user, true);
    } catch (_e) {
      // ignore
    }
    const rawDamage = Math.max(1, Number(dmgRoll.total ?? slotLevel));

    const cardState = {
      cardType: "spirit-guardians",
      casterActorId: casterActor?.id || "",
      slotLevel,
      damageType,
      damageTypeLabel,
      spellDc,
      triggerReason,
      rawDamage,
      targets: {
        sgTarget: {
          targetKey: "sgTarget",
          targetActorId: targetActor.id,
          targetTokenId: targetToken?.id || "",
          targetUuid,
          targetName,
          rolled: false,
          saveTotal: null,
          saveNat: null,
          saveSuccess: false,
          appliedDamage: 0,
          autoApplied: false,
          rollMessageId: "",
          modifiedBy: ""
        }
      }
    };

    const msg = await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: casterActor || targetActor }),
      content: this.buildInteractiveSaveCardHtml(cardState, ""),
      flags: {
        "altarion-aitusa": {
          isSpiritGuardiansDamageCard: true,
          interactiveSaveCard: cardState
        }
      }
    });

    if (msg?.id) {
      await msg.update({
        content: this.buildInteractiveSaveCardHtml(cardState, msg.id)
      });
    }
  }

  /**
   * Ancestral Marking: Open target picker dialog for all creatures within range (`15/30/60 ft` based on Aitusa's size)
   * of Altarion OR Aitusa (up to Altarion's INT modifier), and post an interactive Wisdom Save chat card.
   */
  static async handleAncestralMarkingActivation(altarion, item, spellDc) {
    if (!altarion) return;
    const aitusa = this.getAitusaActor();
    const riderLvl = this.getRiderLevel(altarion);
    const dragonLvl = aitusa?.items.find(i => i.type === "class")?.system?.levels || riderLvl || 4;
    const sizeData = DragonScalingManager.getSizeData(dragonLvl);
    const markingRange = sizeData.sizeLabel === "Huge" ? 60 : sizeData.sizeLabel === "Large" ? 30 : 15;
    const maxTargets = Math.max(1, Number(altarion.system?.abilities?.int?.mod ?? 3));

    const altarionTok = this.getActorCanvasToken(altarion);
    const aitusaTok = aitusa ? this.getActorCanvasToken(aitusa) : null;
    const preTargetedTokenIds = new Set(Array.from(game.user?.targets || []).map(t => t.id));

    const candidates = [];
    if (canvas?.ready && canvas?.tokens?.placeables?.length) {
      for (const tok of canvas.tokens.placeables) {
        if (!tok?.actor || tok.document?.hidden) continue;
        if (this.isAltarion(tok.actor) || this.isAitusa(tok.actor)) continue;

        const distAlt = altarionTok ? this.getTokenDistanceFt(altarionTok, tok) : null;
        const distAit = aitusaTok ? this.getTokenDistanceFt(aitusaTok, tok) : null;
        const validAlt = distAlt !== null && distAlt <= markingRange;
        const validAit = distAit !== null && distAit <= markingRange;
        if (!validAlt && !validAit) continue;

        const minDist =
          distAlt !== null && distAit !== null
            ? Math.min(distAlt, distAit)
            : distAlt !== null
              ? distAlt
              : distAit ?? 0;
        const originLabel =
          distAlt !== null && distAit !== null
            ? distAlt <= distAit
              ? `${distAlt} ft (${altarion.name})`
              : `${distAit} ft (${aitusa.name})`
            : distAlt !== null
              ? `${distAlt} ft (${altarion.name})`
              : `${distAit} ft (${aitusa?.name || "Aitusa"})`;

        candidates.push({
          tokenId: tok.id,
          actor: tok.actor,
          uuid: tok.document?.uuid || tok.actor.uuid,
          name: tok.name || tok.actor.name,
          img: tok.document?.texture?.src || tok.actor.img || "icons/svg/mystery-man.svg",
          minDist,
          originLabel,
          isHostile: Number(tok.document?.disposition ?? -1) <= 0 && !tok.actor.hasPlayerOwner
        });
      }
    }

    if (candidates.length === 0) {
      ui.notifications.warn(
        `[Ancestral Marking] No creatures found within ${markingRange} ft of ${altarion.name} or ${aitusa?.name || "Aitusa"}!`
      );
      return;
    }

    candidates.sort((a, b) => a.minDist - b.minDist);
    const defaultSelectedIds = [];
    for (const c of candidates) {
      if (preTargetedTokenIds.has(c.tokenId) && defaultSelectedIds.length < maxTargets) {
        defaultSelectedIds.push(c.tokenId);
      }
    }
    if (defaultSelectedIds.length === 0) {
      for (const c of candidates) {
        if (c.isHostile && defaultSelectedIds.length < maxTargets) {
          defaultSelectedIds.push(c.tokenId);
        }
      }
    }

    const rowsHtml = candidates
      .map(c => {
        const checked = defaultSelectedIds.includes(c.tokenId) ? "checked" : "";
        return `
          <label class="coria-creature-pick-row" data-token-id="${c.tokenId}" style="display:flex;align-items:center;gap:10px;padding:6px 10px;border-radius:6px;border:1px solid rgba(167,139,250,0.4);background:rgba(15,23,42,0.78);cursor:pointer;margin-bottom:5px;">
            <input type="checkbox" name="ancestralMarkingTarget" value="${c.tokenId}" ${checked} />
            <img src="${c.img}" style="width:28px;height:28px;border-radius:4px;object-fit:cover;border:1px solid rgba(255,255,255,0.2);" />
            <span style="flex:1;font-weight:700;color:#f8fafc;">${foundry.utils.escapeHTML(c.name)}</span>
            <span style="font-size:11px;color:#c4b5fd;">${foundry.utils.escapeHTML(c.originLabel)}</span>
          </label>
        `;
      })
      .join("");

    const selectedTokenIds = await new Promise(resolve => {
      let settled = false;
      const finish = ids => {
        if (settled) return;
        settled = true;
        this.clearAllTokenHoverRings();
        resolve(ids);
      };
      createV2Dialog(
        {
          title: `Ancestral Marking — Select up to ${maxTargets} Targets (within ${markingRange} ft)`,
          content: `
            <div style="padding: 6px 2px;">
              <p style="margin: 0 0 6px; font-size: 12px;">
                Choose up to <strong>${maxTargets} creatures</strong> (INT modifier) within <strong>${markingRange} feet</strong> of <strong>${altarion.name}</strong> or <strong>${aitusa?.name || "Aitusa"}</strong> to make a <strong>DC ${spellDc} Wisdom saving throw</strong> (hover to highlight on canvas):
              </p>
              <div style="margin-bottom: 6px; font-size: 11.5px; color: #c4b5fd; font-weight: 700;">
                Selected: <span class="coria-marking-count">${defaultSelectedIds.length}</span> / ${maxTargets}
              </div>
              <div style="max-height: 280px; overflow-y: auto; padding-right: 4px;">
                ${rowsHtml}
              </div>
            </div>
          `,
          render: html => {
            const root = html instanceof HTMLElement ? html : html?.[0];
            if (!root) return;
            this.bindTokenHoverHighlightListeners(root, ".coria-creature-pick-row");
            const countEl = root.querySelector(".coria-marking-count");
            const checkboxes = Array.from(root.querySelectorAll('input[name="ancestralMarkingTarget"]'));
            for (const cb of checkboxes) {
              cb.addEventListener("change", () => {
                const checkedBoxes = checkboxes.filter(el => el.checked);
                if (checkedBoxes.length > maxTargets) {
                  cb.checked = false;
                  ui.notifications.warn(`[Ancestral Marking] You can select at most ${maxTargets} creatures (INT modifier).`);
                  return;
                }
                if (countEl) countEl.textContent = String(checkedBoxes.length);
              });
            }
          },
          buttons: {
            confirm: {
              icon: '<i class="fas fa-dragon"></i>',
              label: `Post Wisdom Save Card (DC ${spellDc})`,
              callback: html => {
                const root = html instanceof HTMLElement ? html : html?.[0];
                const checked = Array.from(root?.querySelectorAll('input[name="ancestralMarkingTarget"]:checked') || [])
                  .map(el => el.value)
                  .slice(0, maxTargets);
                finish(checked);
              }
            }
          },
          default: "confirm",
          close: () => finish([])
        },
        { width: 460 }
      ).render(true);
    });

    if (!selectedTokenIds || selectedTokenIds.length === 0) return;

    const targetsMap = {};
    for (const tokId of selectedTokenIds) {
      const c = candidates.find(cand => cand.tokenId === tokId);
      if (!c) continue;
      const tKey = `tok_${c.tokenId}`;
      targetsMap[tKey] = {
        targetKey: tKey,
        targetActorId: c.actor.id,
        targetTokenId: c.tokenId,
        targetUuid: c.uuid,
        targetName: c.name,
        img: c.img,
        rolled: false,
        saveTotal: null,
        saveNat: null,
        saveSuccess: false,
        rollMessageId: "",
        modifiedBy: ""
      };
    }

    const cardState = {
      cardType: "ancestral-marking",
      casterActorId: altarion.id,
      spellDc,
      icon: item?.img || "modules/altarion-aitusa/dr_icons/ancestral-marking.jpg",
      targets: targetsMap
    };

    const msg = await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: altarion }),
      content: this.buildInteractiveSaveCardHtml(cardState, ""),
      flags: {
        "altarion-aitusa": {
          isAncestralMarkingCard: true,
          interactiveSaveCard: cardState
        }
      }
    });

    if (msg?.id) {
      await msg.update({
        content: this.buildInteractiveSaveCardHtml(cardState, msg.id)
      });
    }
  }

  /**
   * At the end of a creature's turn in combat, if it is affected by `ancestral-marking`,
   * post an interactive card prompting it to repeat the Wisdom Save to end the effect.
   */
  static async postAncestralMarkingEndOfTurnSaveCard(targetToken, targetActor) {
    if (!targetActor) return;
    const altarion = this.getAltarionActor();
    const markEff = targetActor.effects?.find(
      e =>
        !e.disabled &&
        (e.statuses?.has?.("ancestral-marking") || e.flags?.["altarion-aitusa"]?.statusId === "ancestral-marking")
    );
    const spellDc =
      Number(markEff?.flags?.["altarion-aitusa"]?.saveDc) ||
      Number(altarion?.system?.attributes?.spell?.dc) ||
      8 + Number(altarion?.system?.abilities?.int?.mod ?? 3) + Number(altarion?.system?.attributes?.prof ?? 2);

    const targetName = targetToken?.name || targetActor.name;
    const tKey = `eot_${targetToken?.id || targetActor.id}`;
    const cardState = {
      cardType: "ancestral-marking-eot",
      casterActorId: altarion?.id || "",
      spellDc,
      icon: markEff?.img || "modules/altarion-aitusa/dr_icons/ancestral-marking.jpg",
      targets: {
        [tKey]: {
          targetKey: tKey,
          targetActorId: targetActor.id,
          targetTokenId: targetToken?.id || "",
          targetUuid: targetToken?.document?.uuid || targetActor.uuid || "",
          targetName,
          img: targetToken?.document?.texture?.src || targetActor.img || "icons/svg/mystery-man.svg",
          rolled: false,
          saveTotal: null,
          saveNat: null,
          saveSuccess: false,
          rollMessageId: "",
          modifiedBy: ""
        }
      }
    };

    const msg = await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: altarion || targetActor }),
      content: this.buildInteractiveSaveCardHtml(cardState, ""),
      flags: {
        "altarion-aitusa": {
          isAncestralMarkingCard: true,
          interactiveSaveCard: cardState
        }
      }
    });

    if (msg?.id) {
      await msg.update({
        content: this.buildInteractiveSaveCardHtml(cardState, msg.id)
      });
    }
  }

  /**
   * Post an interactive Spirit-Guardians-style Dexterity Save card for Kyrion's "Shadow Rebuke" reaction spell.
   */
  static async postShadowRebukeInteractiveSaveCard({
    kyrion,
    attackerActor,
    attackerUuid = "",
    attackerName = "Attacker",
    slotLevel = 1
  } = {}) {
    if (!kyrion) return;
    const effSlot = Math.max(1, Number(slotLevel || 1));
    const diceCount = effSlot + 1;
    const diceFormula = `${diceCount}d10`;
    const spellDc =
      Number(kyrion.system?.attributes?.spell?.dc) ||
      8 + Number(kyrion.system?.abilities?.cha?.mod ?? 3) + Number(kyrion.system?.attributes?.prof ?? 2);

    const dmgRoll = await new Roll(diceFormula).evaluate();
    try {
      if (game.dice3d) await game.dice3d.showForRoll(dmgRoll, game.user, true);
    } catch (_e) {
      // ignore
    }
    const rawDamage = Math.max(1, Number(dmgRoll.total || diceCount));

    const cardState = {
      cardType: "shadow-rebuke",
      saveAbility: "dex",
      casterActorId: kyrion.id,
      slotLevel: effSlot,
      diceFormula,
      damageType: "necrotic",
      damageTypeLabel: "Necrotic",
      spellDc,
      triggerReason: `Abyssal Retaliation vs ${attackerName}`,
      rawDamage,
      targets: {
        sgTarget: {
          targetKey: "sgTarget",
          targetActorId: attackerActor?.id || "",
          targetUuid: attackerUuid || attackerActor?.uuid || "",
          targetName: attackerName || attackerActor?.name || "Attacker",
          rolled: false,
          saveTotal: null,
          saveNat: null,
          saveSuccess: false,
          appliedDamage: 0,
          autoApplied: false,
          rollMessageId: "",
          modifiedBy: ""
        }
      }
    };

    const msg = await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: kyrion }),
      content: this.buildInteractiveSaveCardHtml(cardState, ""),
      flags: {
        "altarion-aitusa": {
          isSpiritGuardiansDamageCard: true,
          isShadowRebukeDamageCard: true,
          interactiveSaveCard: cardState
        }
      }
    });

    if (msg?.id) {
      await msg.update({
        content: this.buildInteractiveSaveCardHtml(cardState, msg.id)
      });
    }
    return msg;
  }

  /**
   * Execute a Saving Throw (Wisdom for Spirit Guardians / Ancestral Marking, Dexterity for Shadow Rebuke)
   * via Foundry's standard saving throw dialog when the GM or player clicks the "Roll Save (DC X)" button.
   */
  static async rollInteractiveCardWisdomSave(cardMessage, targetKey) {
    if (!cardMessage || !targetKey) return;
    const cardState = foundry.utils.deepClone(cardMessage.flags?.["altarion-aitusa"]?.interactiveSaveCard);
    if (!cardState || !cardState.targets?.[targetKey]) return;

    const t = cardState.targets[targetKey];
    const targetActor = await this.resolveActorFromUuidOrId(t.targetUuid, t.targetActorId);
    if (!targetActor || !targetActor.isOwner) {
      ui.notifications.warn("Apenas o Mestre ou o jogador responsável por esta criatura pode rolar sua salvaguarda.");
      return;
    }

    const spellDc = Number(cardState.spellDc || 14);
    const saveAbility = String(
      cardState.saveAbility || (cardState.cardType === "shadow-rebuke" ? "dex" : "wis")
    ).toLowerCase();
    let rollResult = null;
    let createdRollMsg = null;

    const hookId = Hooks.on("createChatMessage", (msg) => {
      const spkActor = msg?.speaker?.actor;
      if (spkActor === targetActor.id && msg?.rolls?.length) {
        createdRollMsg = msg;
      }
    });

    this._rollingInteractiveCardSaveForActor = targetActor.id;
    try {
      if (typeof targetActor.rollSavingThrow === "function") {
        const res = await targetActor.rollSavingThrow(
          { ability: saveAbility, target: spellDc },
          { configure: true },
          {
            data: {
              flags: {
                "altarion-aitusa": {
                  linkedSaveCard: {
                    cardMessageId: cardMessage.id,
                    targetKey,
                    cardType: cardState.cardType,
                    saveDc: spellDc
                  }
                }
              }
            }
          }
        );
        rollResult = Array.isArray(res) ? res[0] : res?.rolls?.[0] || res;
      }
    } catch (_e) {
      // Cancelled or fallback
    } finally {
      this._rollingInteractiveCardSaveForActor = null;
      Hooks.off("createChatMessage", hookId);
    }

    if ((!rollResult || typeof rollResult.total !== "number") && createdRollMsg?.rolls?.length) {
      rollResult = createdRollMsg.rolls[0];
    }
    if (!rollResult || typeof rollResult.total !== "number") return;

    if (createdRollMsg?.update && !createdRollMsg.flags?.["altarion-aitusa"]?.linkedSaveCard) {
      try {
        await createdRollMsg.update({
          "flags.altarion-aitusa.linkedSaveCard": {
            cardMessageId: cardMessage.id,
            targetKey,
            cardType: cardState.cardType,
            saveDc: spellDc
          }
        });
      } catch (_e) {
        // ignore
      }
    }

    const d20Term =
      rollResult.terms?.find(term => term?.faces === 20) ||
      rollResult.dice?.find(d => d?.faces === 20) ||
      null;
    const saveNat = Number(
      d20Term?.results?.find(r => r.active)?.result ??
        d20Term?.results?.[0]?.result ??
        d20Term?.total ??
        10
    );
    const saveTotal = Number(rollResult.total ?? 10);
    const saveSuccess = saveTotal >= spellDc;

    t.rolled = true;
    t.saveNat = saveNat;
    t.saveTotal = saveTotal;
    t.saveSuccess = saveSuccess;
    t.rollMessageId = createdRollMsg?.id || "";
    t.modifiedBy = "";

    let customDamageUpdate = null;
    if (cardState.cardType === "spirit-guardians" || cardState.cardType === "shadow-rebuke") {
      const isShadowRebuke = cardState.cardType === "shadow-rebuke";
      const spellLabel = isShadowRebuke ? "Shadow Rebuke" : "Spirit Guardians";
      const dmgType = cardState.damageType || (isShadowRebuke ? "necrotic" : "radiant");
      const dmgTypeLabel =
        cardState.damageTypeLabel ||
        (dmgType === "necrotic" ? "Necrotic" : dmgType === "radiant" ? "Radiant" : "Force");
      const rawDamage = Math.max(1, Number(cardState.rawDamage || 1));
      const appliedDamage = saveSuccess ? Math.max(1, Math.floor(rawDamage / 2)) : rawDamage;
      t.appliedDamage = appliedDamage;

      const preHp = Number(targetActor.system?.attributes?.hp?.value ?? 0);
      const preTemp = Number(targetActor.system?.attributes?.hp?.temp ?? 0);

      const res = await this.applyRetaliationDamageToTarget({
        attackerUuid: t.targetUuid,
        attackerActorId: targetActor.id,
        damage: appliedDamage,
        damageType: dmgType,
        armorLabel: spellLabel
      });
      t.autoApplied = Boolean(res.applied);
      t.damageLayers = res.damageLayers || null;

      const casterActor = cardState.casterActorId ? game.actors?.get(cardState.casterActorId) : null;
      customDamageUpdate = {
        cardKind: isShadowRebuke ? "shadow-rebuke" : "spirit-guardians",
        sourceName: spellLabel,
        attackerActorId: casterActor?.id || cardState.casterActorId || "",
        attackerUuid: casterActor?.uuid || "",
        attackerName: casterActor?.name || spellLabel,
        targetActorId: targetActor.id,
        targetUuid: targetActor.uuid || t.targetUuid || "",
        targetName: t.targetName || targetActor.name,
        damageType: dmgType,
        damageTypeLabel: dmgTypeLabel,
        origDamage: appliedDamage,
        currentDamage: appliedDamage,
        autoApplied: Boolean(res.applied),
        preHp,
        preTemp,
        damageLayers: res.damageLayers || null
      };
    } else if (cardState.cardType === "ancestral-marking") {
      if (!saveSuccess) {
        await this.applyOrUpdateStatusEffect(targetActor, {
          statusId: "ancestral-marking",
          name: "Ancestral Marking: Disadvantage vs Others",
          img: cardState.icon || "modules/altarion-aitusa/dr_icons/ancestral-marking.jpg",
          description: `<p>Failed Wisdom Save against <strong>Ancestral Marking (DC ${spellDc})</strong>: For 1 minute, this creature has <strong>disadvantage</strong> on all attack rolls made against any creature other than Altarion or Aitusa. Repeats the Wisdom Save at the end of each of its turns, ending the effect on a success.</p>`,
          durationSeconds: 60,
          durationRounds: 10,
          extraFlags: {
            casterActorId: cardState.casterActorId,
            saveDc: spellDc
          }
        });
      }
    } else if (cardState.cardType === "ancestral-marking-eot") {
      if (saveSuccess) {
        await this.removeStatusEffect(targetActor, "ancestral-marking");
        ui.notifications.info(`[Ancestral Marking] ${t.targetName} succeeded on the Wisdom Save and is no longer marked!`);
      }
    }

    await cardMessage.update({
      content: this.buildInteractiveSaveCardHtml(cardState, cardMessage.id),
      "flags.altarion-aitusa.interactiveSaveCard": cardState,
      ...(customDamageUpdate ? { "flags.altarion-aitusa.coriaCustomDamage": customDamageUpdate } : {})
    });
  }

  /**
   * Post a minimalist Arcane-Armor / Spirit-Guardians-style chat card for class features and spells.
   */
  static async sendMinimalistFeatureCard(
    actor,
    { icon = "fa-sparkles", title = "", bodyHtml = "", buttonsHtml = "", flags = {} } = {}
  ) {
    const content = `
      <div class="altarion-aitusa-ward-chat-tag altarion-arcane-armor-chat-card">
        <div class="altarion-ward-header">
          <i class="fas ${icon}"></i>
          <span>${title}</span>
        </div>
        <div class="altarion-ward-body">
          ${bodyHtml}
        </div>
        ${buttonsHtml ? `<div class="altarion-arcane-armor-btn-row" style="flex-wrap:wrap;">${buttonsHtml}</div>` : ""}
      </div>
    `;
    return ChatMessage.create({
      speaker: actor ? ChatMessage.getSpeaker({ actor }) : ChatMessage.getSpeaker(),
      content,
      flags: {
        "altarion-aitusa": {
          ...flags
        }
      }
    });
  }

  /**
   * Called automatically when `Paths of Destiny`, `Portent`, `Halfling Lucky`, `Lucky Feat`, `Silvery Barbs`, or `Legendary Resistance`
   * modifies a Saving Throw's total. Updates the corresponding `Spirit Guardians`, `Shadow Rebuke`, or `Ancestral Marking`
   * card in place and automatically adjusts the applied damage or status effect!
   */
  static async onSavingThrowTotalModified({
    rollMessageId = "",
    cardMessageId = "",
    targetKey = "",
    rollerActorId = "",
    newTotal,
    newNat,
    forceSuccess = false,
    sourceLabel = "Reaction"
  } = {}) {
    if (!Number.isFinite(Number(newTotal)) && !forceSuccess) return;

    let cardMessage = cardMessageId ? game.messages?.get(cardMessageId) : null;
    let resolvedTargetKey = targetKey;

    // Fallback: Locate the recent interactive save card matching `rollMessageId` or `rollerActorId`
    if (!cardMessage) {
      const recentMsgs = Array.from(game.messages || []).slice(-30).reverse();
      for (const m of recentMsgs) {
        const st = m.flags?.["altarion-aitusa"]?.interactiveSaveCard;
        if (!st?.targets) continue;
        for (const [k, tEntry] of Object.entries(st.targets)) {
          if (
            (rollMessageId && tEntry.rollMessageId === rollMessageId) ||
            (!rollMessageId && rollerActorId && tEntry.targetActorId === rollerActorId && tEntry.rolled)
          ) {
            cardMessage = m;
            resolvedTargetKey = k;
            break;
          }
        }
        if (cardMessage) break;
      }
    }

    if (!cardMessage || !resolvedTargetKey) return;
    const cardState = foundry.utils.deepClone(cardMessage.flags?.["altarion-aitusa"]?.interactiveSaveCard);
    if (!cardState?.targets?.[resolvedTargetKey]) return;

    const t = cardState.targets[resolvedTargetKey];
    const targetActor = await this.resolveActorFromUuidOrId(t.targetUuid, t.targetActorId);
    const spellDc = Number(cardState.spellDc || 14);
    const updatedTotal = Number.isFinite(Number(newTotal)) ? Number(newTotal) : Number(t.saveTotal ?? 10);
    const updatedNat = Number.isFinite(Number(newNat)) ? Number(newNat) : t.saveNat;
    const newSuccess = Boolean(forceSuccess) || updatedTotal >= spellDc;

    const prevAppliedDamage = Number(t.appliedDamage || 0);
    const prevAutoApplied = Boolean(t.autoApplied);

    t.rolled = true;
    t.saveTotal = updatedTotal;
    t.saveNat = updatedNat;
    t.saveSuccess = newSuccess;
    t.modifiedBy = forceSuccess ? `${sourceLabel} — Auto Success` : `${sourceLabel} → ${updatedTotal}`;

    let customDamageUpdate = null;
    if (cardState.cardType === "spirit-guardians" || cardState.cardType === "shadow-rebuke") {
      const isShadowRebuke = cardState.cardType === "shadow-rebuke";
      const spellLabel = isShadowRebuke ? "Shadow Rebuke" : "Spirit Guardians";
      const dmgType = cardState.damageType || (isShadowRebuke ? "necrotic" : "radiant");
      const dmgTypeLabel =
        cardState.damageTypeLabel ||
        (dmgType === "necrotic" ? "Necrotic" : dmgType === "radiant" ? "Radiant" : "Force");
      const rawDamage = Math.max(1, Number(cardState.rawDamage || 1));
      const newAppliedDamage = newSuccess ? Math.max(1, Math.floor(rawDamage / 2)) : rawDamage;
      t.appliedDamage = newAppliedDamage;

      let preHp = Number(targetActor?.system?.attributes?.hp?.value ?? 0);
      let preTemp = Number(targetActor?.system?.attributes?.hp?.temp ?? 0);
      let newDamageLayers = t.damageLayers || null;
      if (targetActor?.isOwner && prevAutoApplied && newAppliedDamage !== prevAppliedDamage) {
        await this.undoRetaliationDamageOnTarget({
          attackerUuid: t.targetUuid,
          attackerActorId: targetActor.id,
          damage: prevAppliedDamage,
          armorLabel: spellLabel,
          damageMessage: cardMessage,
          damageLayers: t.damageLayers || null
        });
        preHp = Number(targetActor.system?.attributes?.hp?.value ?? 0);
        preTemp = Number(targetActor.system?.attributes?.hp?.temp ?? 0);
        const res = await this.applyRetaliationDamageToTarget({
          attackerUuid: t.targetUuid,
          attackerActorId: targetActor.id,
          damage: newAppliedDamage,
          damageType: dmgType,
          armorLabel: spellLabel
        });
        t.autoApplied = Boolean(res.applied);
        t.damageLayers = res.damageLayers || null;
        newDamageLayers = res.damageLayers || null;
      }

      const casterActor = cardState.casterActorId ? game.actors?.get(cardState.casterActorId) : null;
      customDamageUpdate = {
        cardKind: isShadowRebuke ? "shadow-rebuke" : "spirit-guardians",
        sourceName: spellLabel,
        attackerActorId: casterActor?.id || cardState.casterActorId || "",
        attackerUuid: casterActor?.uuid || "",
        attackerName: casterActor?.name || spellLabel,
        targetActorId: targetActor?.id || t.targetActorId || "",
        targetUuid: targetActor?.uuid || t.targetUuid || "",
        targetName: t.targetName || targetActor?.name || "",
        damageType: dmgType,
        damageTypeLabel: dmgTypeLabel,
        origDamage: newAppliedDamage,
        currentDamage: newAppliedDamage,
        autoApplied: Boolean(t.autoApplied),
        preHp,
        preTemp,
        damageLayers: newDamageLayers
      };
    } else if (cardState.cardType === "ancestral-marking" || cardState.cardType === "ancestral-marking-eot") {
      if (targetActor?.isOwner) {
        if (!newSuccess) {
          await this.applyOrUpdateStatusEffect(targetActor, {
            statusId: "ancestral-marking",
            name: "Ancestral Marking: Disadvantage vs Others",
            img: cardState.icon || "modules/altarion-aitusa/dr_icons/ancestral-marking.jpg",
            description: `<p>Failed Wisdom Save against <strong>Ancestral Marking (DC ${spellDc})</strong>: For 1 minute, this creature has <strong>disadvantage</strong> on all attack rolls made against any creature other than Altarion or Aitusa. Repeats the Wisdom Save at the end of each of its turns, ending the effect on a success.</p>`,
            durationSeconds: 60,
            durationRounds: 10,
            extraFlags: {
              casterActorId: cardState.casterActorId,
              saveDc: spellDc
            }
          });
        } else {
          await this.removeStatusEffect(targetActor, "ancestral-marking");
        }
      }
    }

    await cardMessage.update({
      content: this.buildInteractiveSaveCardHtml(cardState, cardMessage.id),
      "flags.altarion-aitusa.interactiveSaveCard": cardState,
      ...(customDamageUpdate ? { "flags.altarion-aitusa.coriaCustomDamage": customDamageUpdate } : {})
    });
  }

  /* -------------------------------------------- */
  /*  Chat Message Rendering & Attack Hit Hooks   */
  /* -------------------------------------------- */

  static async triggerAncestralShieldingOnHit({ defender, attackerName, total, defenderAc, isCrit }) {
    if (!defender || !this.hasStatus(defender, "ancestral-shielding")) return null;

    const shEff = defender.effects?.find(
      e =>
        !e.disabled &&
        (e.flags?.["altarion-aitusa"]?.isAncestralShieldingEffect ||
          e.statuses?.has?.("ancestral-shielding") ||
          e.flags?.["altarion-aitusa"]?.statusId === "ancestral-shielding")
    );
    const shFlags = shEff?.flags?.["altarion-aitusa"] || {};
    const altarion =
      (shFlags.casterActorId && game.actors?.get(shFlags.casterActorId)) || this.getAltarionActor();
    const riderLevel = Number(shFlags.riderLevel || this.getRiderLevel(altarion) || 4);
    const intMod = Number(shFlags.intMod ?? altarion?.system?.abilities?.int?.mod ?? 3);
    const halfIntUp = Math.max(1, Math.ceil(intMod / 2));
    const shieldDice =
      riderLevel >= 18
        ? "6d6"
        : riderLevel >= 14
          ? "5d6"
          : riderLevel >= 10
            ? "4d6"
            : riderLevel >= 6
              ? "3d6"
              : "2d6";
    const formula = `${shieldDice} + ${halfIntUp}`;

    const tempRoll = await new Roll(formula).evaluate();
    try {
      if (game.dice3d) await game.dice3d.showForRoll(tempRoll, game.user, true);
    } catch (_e) {
      // ignore
    }
    const rolledTempHp = Math.max(1, Number(tempRoll.total ?? halfIntUp));
    const prevTempHp = Number(defender.system?.attributes?.hp?.temp ?? 0);

    // 1. Apply the rolled Temporary HP to the protected creature
    if (typeof defender.applyTempHP === "function") {
      await defender.applyTempHP(rolledTempHp);
    } else if (rolledTempHp > prevTempHp) {
      await defender.update({ "system.attributes.hp.temp": rolledTempHp }, { altarionBypassWard: true });
    }

    // 2. Remove the Ancestral Shielding status effect now that an attack hit
    await this.removeStatusEffect(defender, "ancestral-shielding");

    // 3. Post chat card with Undo / Re-apply buttons (which also re-apply / remove the Ancestral Shielding status effect)
    const shieldCardContent = `
      <div class="altarion-aitusa-ward-chat-tag altarion-arcane-armor-chat-card">
        <div class="altarion-ward-header">
          <i class="fas fa-shield-alt"></i>
          <span>Ancestral Shielding Triggered — +${rolledTempHp} Temp HP!</span>
        </div>
        <div class="altarion-ward-body">
          <strong>${foundry.utils.escapeHTML(attackerName)}</strong> hit <strong>${foundry.utils.escapeHTML(defender.name)}</strong> (${
            isCrit ? "Critical Hit!" : `Attack ${total} vs AC ${defenderAc}`
          }) while <strong>Ancestral Shielding</strong> was active.<br>
          &bull; <strong>Temp HP Roll (${formula}):</strong> Rolled <strong>${rolledTempHp}</strong> &rarr; Applied <strong>${rolledTempHp} Temporary HP</strong> to <strong>${foundry.utils.escapeHTML(defender.name)}</strong>!<br>
          &bull; <strong>Ancestral Shielding (+${halfIntUp} AC)</strong> has ended on <strong>${foundry.utils.escapeHTML(defender.name)}</strong>.
        </div>
        <div class="altarion-arcane-armor-btn-row">
          <button type="button" class="altarion-shielding-undo-btn"
                  data-defender-uuid="${defender.uuid}"
                  data-defender-id="${defender.id}"
                  data-prev-temp="${prevTempHp}"
                  data-rolled-temp="${rolledTempHp}"
                  data-ac-bonus="${halfIntUp}"
                  data-int-mod="${intMod}"
                  data-rider-level="${riderLevel}"
                  data-caster-id="${altarion?.id || ""}">
            <i class="fas fa-undo"></i> Undo Temp HP &amp; Restore +${halfIntUp} AC
          </button>
          <button type="button" class="altarion-shielding-reapply-btn"
                  data-defender-uuid="${defender.uuid}"
                  data-defender-id="${defender.id}"
                  data-prev-temp="${prevTempHp}"
                  data-rolled-temp="${rolledTempHp}"
                  data-ac-bonus="${halfIntUp}"
                  data-int-mod="${intMod}"
                  data-rider-level="${riderLevel}"
                  data-caster-id="${altarion?.id || ""}">
            <i class="fas fa-shield-heart"></i> Re-apply +${rolledTempHp} Temp HP
          </button>
        </div>
      </div>
    `;

    const createdCard = await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: altarion || defender }),
      content: shieldCardContent,
      flags: {
        "altarion-aitusa": {
          isAncestralShieldingCard: true
        }
      }
    });

    return {
      triggered: true,
      rolledTempHp,
      prevTempHp,
      acBonus: halfIntUp,
      intMod,
      riderLevel,
      casterActorId: altarion?.id || "",
      cardMsgId: createdCard?.id || ""
    };
  }

  static async triggerRetaliatoryArmorOnMeleeHit({
    defender,
    armEff,
    curTemp,
    attackerActor,
    attackerUuid,
    attackerName,
    total,
    defenderAc,
    isCrit
  }) {
    if (!defender || !armEff || curTemp <= 0) return null;

    const effFlags = armEff.flags?.["altarion-aitusa"] || {};
    const isShadow = Boolean(effFlags.isShadowArmorEffect || armEff.statuses?.has?.("shadow-armor"));
    const isAgathys = Boolean(effFlags.isArmorOfAgathysEffect || armEff.statuses?.has?.("armor-of-agathys"));
    const armorLabel =
      effFlags.armorLabel || (isShadow ? "Shadow Armor" : isAgathys ? "Armor of Agathys" : "Arcane Armor");
    const dmgType =
      effFlags.retaliationDamageType || (isShadow ? "necrotic" : isAgathys ? "cold" : "force");
    const dmgTypeLabel =
      dmgType === "necrotic" ? "Necrotic" : dmgType === "cold" ? "Cold" : "Force";
    const slotLevel = Number(effFlags.slotLevel || 1);
    const retalDmg = Number(effFlags.retaliationDamage || 5 * slotLevel);

    const preHp = Number(attackerActor?.system?.attributes?.hp?.value ?? 0);
    const preTemp = Number(attackerActor?.system?.attributes?.hp?.temp ?? 0);

    let autoApplied = false;
    let retalDamageLayers = null;
    if (attackerActor?.isOwner) {
      const res = await this.applyRetaliationDamageToTarget({
        attackerUuid,
        attackerActorId: attackerActor.id,
        damage: retalDmg,
        damageType: dmgType,
        armorLabel
      });
      autoApplied = Boolean(res.applied);
      retalDamageLayers = res.damageLayers || null;
    }

    const statusLine = autoApplied
      ? `Automatically dealt <strong><span class="coria-custom-dmg-num">${retalDmg}</span> ${dmgTypeLabel} damage</strong> to <strong>${attackerName}</strong>!`
      : `<strong>${attackerName}</strong> takes <strong><span class="coria-custom-dmg-num">${retalDmg}</span> ${dmgTypeLabel} damage</strong>!`;

    const actionButtonsHtml = autoApplied
      ? `<div class="altarion-arcane-armor-btn-row">
           <button type="button" class="altarion-arcane-armor-undo-btn" data-attacker-uuid="${attackerUuid}" data-attacker-id="${attackerActor?.id || ""}" data-damage="${retalDmg}" data-armor-label="${armorLabel}" title="Undo if Shield or another reaction turned the hit into a miss">
             <i class="fas fa-undo"></i> Undo (+${retalDmg} HP)
           </button>
           <button type="button" class="altarion-arcane-armor-apply-btn" data-attacker-uuid="${attackerUuid}" data-attacker-id="${attackerActor?.id || ""}" data-damage="${retalDmg}" data-damage-type="${dmgType}" data-armor-label="${armorLabel}">
             <i class="fas fa-burst"></i> Re-apply ${retalDmg} ${dmgTypeLabel}
           </button>
         </div>`
      : `<div class="altarion-arcane-armor-btn-row">
           <button type="button" class="altarion-arcane-armor-undo-btn" data-attacker-uuid="${attackerUuid}" data-attacker-id="${attackerActor?.id || ""}" data-damage="${retalDmg}" data-armor-label="${armorLabel}" disabled>
             <i class="fas fa-undo"></i> Undo (+${retalDmg} HP)
           </button>
           <button type="button" class="altarion-arcane-armor-apply-btn" data-attacker-uuid="${attackerUuid}" data-attacker-id="${attackerActor?.id || ""}" data-damage="${retalDmg}" data-damage-type="${dmgType}" data-armor-label="${armorLabel}">
             <i class="fas fa-burst"></i> Apply ${retalDmg} ${dmgTypeLabel} Damage to ${attackerName}
           </button>
         </div>`;

    const content = `
      <div class="altarion-aitusa-ward-chat-tag altarion-arcane-armor-chat-card">
        <div class="altarion-ward-header">
          <i class="fas fa-bolt"></i>
          <span>${armorLabel} (Lvl ${slotLevel}) — ${dmgTypeLabel} Retaliation!</span>
        </div>
        <div class="altarion-ward-body">
          <strong>${attackerName}</strong> hit <strong>${defender.name}</strong> in melee (${
            isCrit ? `Critical Hit!` : `Attack ${total} vs AC ${defenderAc}`
          }) while <strong>${armorLabel}</strong> (${curTemp} Temp HP) is active.<br>
          ${statusLine}
        </div>
        ${actionButtonsHtml}
      </div>
    `;

    const createdCard = await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: defender }),
      content,
      flags: {
        "altarion-aitusa": {
          isArcaneArmorRetaliationCard: true,
          armorLabel,
          damageType: dmgType,
          slotLevel,
          retaliationDamage: retalDmg,
          attackerUuid,
          attackerActorId: attackerActor?.id || "",
          autoApplied,
          coriaCustomDamage: {
            cardKind: "retaliation-armor",
            sourceName: `${armorLabel} (Retaliation)`,
            attackerActorId: defender.id,
            attackerUuid: defender.uuid,
            attackerName: defender.name,
            targetActorId: attackerActor?.id || "",
            targetUuid: attackerActor?.uuid || attackerUuid || "",
            targetName: attackerName,
            damageType: dmgType,
            damageTypeLabel: dmgTypeLabel,
            origDamage: retalDmg,
            currentDamage: retalDmg,
            autoApplied,
            preHp,
            preTemp,
            damageLayers: retalDamageLayers
          }
        }
      }
    });

    return {
      triggered: true,
      armorLabel,
      damage: retalDmg,
      damageType: dmgType,
      damageTypeLabel: dmgTypeLabel,
      slotLevel,
      autoApplied,
      cardMsgId: createdCard?.id || ""
    };
  }

  static registerChatHooks() {
    // Detect saving throws (Standard Saves, Concentration Saves, Death Saves) and attack rolls targeting protected creatures:
    //  1) Per-Message Saving Throw Ledger (Ancestral Ward, Ancestral Marking, Enchanter's Echo, Concentration, Death Saves)
    //  2) Ancestral Shielding (ANY attack hit -> roll Temp HP, apply Temp HP, remove Ancestral Shielding, post Undo/Re-apply card)
    //  3) Arcane Armor / Shadow Armor / Armor of Agathys (MELEE attack hit while Temp HP > 0 -> deal Force/Necrotic/Cold retaliation)
    Hooks.on("createChatMessage", async (message) => {
      try {
        if (!message) return;
        const modFlags = message.flags?.["altarion-aitusa"];
        if (
          modFlags?.isArcaneArmorRetaliationCard ||
          modFlags?.isArcaneWardCard ||
          modFlags?.isAncestralShieldingCard ||
          modFlags?.isSpiritGuardiansDamageCard
        ) {
          return;
        }

        const dndFlags = message.flags?.dnd5e || {};
        const rollType = String(dndFlags.roll?.type || "").toLowerCase();
        const actType = String(dndFlags.activity?.type || "").toLowerCase();
        const flavorLower = String(message.flavor || "").toLowerCase();

        // --- BRANCH 1: Standalone Saving Throws, Concentration Saves & Death Saves ---
        const isDeathSave =
          rollType === "death" ||
          flavorLower.includes("death saving throw") ||
          flavorLower.includes("teste de resistência contra a morte");
        const isConcentrationSave =
          !isDeathSave &&
          (rollType === "concentration" ||
            Boolean(dndFlags.roll?.isConcentration) ||
            flavorLower.includes("concentration") ||
            flavorLower.includes("concentração"));
        const isStandardSave =
          !isDeathSave &&
          !isConcentrationSave &&
          (rollType === "save" ||
            rollType === "savingthrow" ||
            (actType === "save" && message.isRoll && rollType !== "damage") ||
            flavorLower.includes("saving throw") ||
            flavorLower.includes("teste de resistência"));

        if ((isDeathSave || isConcentrationSave || isStandardSave) && message.rolls?.length > 0) {
          if (modFlags?.rollLedger || modFlags?.linkedSaveCard) return;

          const scene = message.speaker?.scene ? game.scenes?.get(message.speaker.scene) : canvas?.scene;
          const rollerTokenDoc =
            message.speaker?.token && scene ? scene.tokens?.get(message.speaker.token) : null;
          const rollerActor =
            rollerTokenDoc?.actor ||
            ChatMessage.getSpeakerActor?.(message.speaker) ||
            (message.speaker?.actor ? game.actors?.get(message.speaker.actor) : null);
          if (!rollerActor || !this.isAuthoritativeClientFor(rollerActor)) return;
          if (
            this._rollingInteractiveCardSaveForActor === rollerActor.id ||
            CoriaRollLedger._capturingActorIds?.has(rollerActor.id)
          ) {
            return;
          }

          const roll = message.rolls[0];
          if (isDeathSave) {
            await CoriaRollLedger.registerDeathSaveLedger(message, rollerActor);
            return;
          }

          if (isConcentrationSave) {
            const dc = Number(roll?.options?.target ?? dndFlags.roll?.target ?? 10);
            await CoriaRollLedger.registerConcentrationSaveLedger(message, rollerActor, dc);
            return;
          }

          // Standard Saving Throw: check if Wisdom save matching active _pendingSaveContext or Ancestral Marking repeat
          const abilityId = String(
            dndFlags.roll?.ability || roll?.options?.ability || ""
          ).toLowerCase();
          const isWisSave =
            abilityId === "wis" ||
            flavorLower.includes("wisdom") ||
            flavorLower.includes("sabedoria");

          if (isWisSave) {
            const ctx = this._pendingSaveContext;
            const hasValidCtx = ctx && Date.now() - (ctx.timestamp || 0) <= 2 * 60 * 1000;
            if (hasValidCtx) {
              const hadStatusBeforeRoll =
                ctx.type === "ancestral-ward"
                  ? this.hasStatus(rollerActor, "ancestral-ward-marked")
                  : ctx.type === "ancestral-marking"
                    ? this.hasStatus(rollerActor, "ancestral-marking")
                    : ctx.type === "enchanter-echo"
                      ? this.hasStatus(rollerActor, "charmed")
                      : false;

              await CoriaRollLedger.registerAndEvaluateStandardSave({
                rollMessage: message,
                actor: rollerActor,
                actorUuid: rollerActor.uuid,
                saveType: ctx.type,
                dc: Number(ctx.dc || roll?.options?.target || dndFlags.roll?.target || 14),
                sourceActorId: ctx.sourceActorId,
                img: ctx.img,
                hadStatusBeforeRoll
              });
              return;
            } else if (this.hasStatus(rollerActor, "ancestral-marking")) {
              const altarion = this.getAltarionActor();
              const dc = Number(
                roll?.options?.target ??
                  dndFlags.roll?.target ??
                  this.getDragonRiderSpellSaveDC(altarion)
              );
              await CoriaRollLedger.registerAndEvaluateStandardSave({
                rollMessage: message,
                actor: rollerActor,
                actorUuid: rollerActor.uuid,
                saveType: "ancestral-marking-repeat",
                dc,
                sourceActorId: altarion?.id || "",
                img: "modules/altarion-aitusa/dr_icons/ancestral-marking.jpg",
                hadStatusBeforeRoll: true
              });
              return;
            }
          }
          return;
        }

        // --- BRANCH 2: Attack Rolls ---
        const isAttackRoll =
          rollType === "attack" ||
          (actType === "attack" && message.isRoll && message.rolls?.length > 0 && rollType !== "damage");
        if (!isAttackRoll || !message.rolls?.length) return;

        // Resolve attacker (prefer specific canvas TokenActor so unlinked monster tokens take the retaliatory damage)
        const scene = message.speaker?.scene ? game.scenes?.get(message.speaker.scene) : canvas?.scene;
        const attackerTokenDoc =
          message.speaker?.token && scene ? scene.tokens?.get(message.speaker.token) : null;
        const attackerActor =
          attackerTokenDoc?.actor ||
          ChatMessage.getSpeakerActor?.(message.speaker) ||
          (message.speaker?.actor ? game.actors?.get(message.speaker.actor) : null);
        const attackerName = attackerTokenDoc?.name || attackerActor?.name || message.speaker?.alias || "Attacker";
        const attackerUuid = attackerTokenDoc?.uuid || attackerActor?.uuid || "";

        // Resolve targeted defenders from `dndFlags.targets` or author's active token targets
        const candidateDefenders = [];
        const targetEntries = Array.isArray(dndFlags.targets) ? dndFlags.targets : [];
        for (const tEntry of targetEntries) {
          let defActor = null;
          if (tEntry?.uuid && typeof fromUuidSync === "function") {
            try {
              const doc = fromUuidSync(tEntry.uuid);
              defActor = doc?.documentName === "Token" ? doc.actor : doc?.actor || doc;
            } catch (_e) {
              defActor = null;
            }
          }
          if (!defActor && tEntry?.name) {
            const tLower = tEntry.name.trim().toLowerCase();
            defActor =
              game.actors?.find(a => a.name?.trim().toLowerCase() === tLower) ||
              null;
          }
          if (defActor && !candidateDefenders.some(c => c.actor.id === defActor.id)) {
            candidateDefenders.push({ actor: defActor, acHint: tEntry?.ac ?? null });
          }
        }

        if (candidateDefenders.length === 0) {
          const authorUser = message.author || (message.user ? game.users?.get(message.user) : null);
          for (const tok of authorUser?.targets || []) {
            if (tok?.actor && !candidateDefenders.some(c => c.actor.id === tok.actor.id)) {
              candidateDefenders.push({ actor: tok.actor, acHint: null });
            }
          }
        }

        if (candidateDefenders.length === 0) return;

        const roll = message.rolls[0];
        const total = Number(roll?.total ?? 0);
        const d20Term = roll?.dice?.find(d => d.faces === 20) || roll?.dice?.[0];
        const activeD20 = Number(d20Term?.results?.find(r => r.active)?.result ?? 10);
        const isFumble = Boolean(roll?.isFumble) || activeD20 === 1;
        const isCrit = Boolean(roll?.isCritical) || activeD20 === 20;

        // Check if attack is explicitly Ranged (Arcane Armor / Shadow Armor / Armor of Agathys triggers strictly on melee attacks)
        const atkItemId = dndFlags.item?.id || dndFlags.use?.itemId;
        const atkActId = dndFlags.activity?.id;
        const atkItem =
          (atkItemId && attackerActor?.items?.get?.(atkItemId)) || message.getAssociatedItem?.() || null;
        const atkActivity =
          (atkActId && atkItem?.system?.activities?.get?.(atkActId)) ||
          atkItem?.system?.activities?.contents?.[0] ||
          null;
        const atkTypeVal = String(atkActivity?.attack?.type?.value || "").toLowerCase();
        const legacyActionType = String(atkItem?.system?.actionType || "").toLowerCase();
        const isExplicitlyRanged =
          (atkTypeVal === "ranged" || legacyActionType === "rwak" || legacyActionType === "rsak") &&
          atkTypeVal !== "melee";
        const isMelee = !isExplicitlyRanged;

        const ledgerDefenders = [];
        let anyAuthoritativeProcessed = false;

        for (const { actor: defender, acHint } of candidateDefenders) {
          if (!defender) continue;
          if (attackerActor && attackerActor.uuid === defender.uuid) continue;
          if (!this.isAuthoritativeClientFor(defender)) continue;

          anyAuthoritativeProcessed = true;
          const defenderAc = Number(defender.system?.attributes?.ac?.value ?? acHint ?? 10);
          const isHit = isCrit || (!isFumble && total >= defenderAc);

          const defEntry = {
            defenderUuid: defender.uuid,
            defenderActorId: defender.id,
            defenderName: defender.name,
            baseAc: defenderAc,
            currentAc: defenderAc,
            wasHit: isHit,
            ancestralShielding: null,
            retaliation: null
          };

          // A. Ancestral Shielding: Triggers when ANY attack (melee or ranged) hits a creature with `ancestral-shielding`
          if (isHit && this.hasStatus(defender, "ancestral-shielding")) {
            defEntry.ancestralShielding = await this.triggerAncestralShieldingOnHit({
              defender,
              attackerName,
              total,
              defenderAc,
              isCrit
            });
          }

          // B. Arcane Armor / Shadow Armor / Armor of Agathys melee retaliation
          if (isHit && isMelee) {
            const armEff = this.getRetaliatoryArmorEffect(defender);
            const curTemp = Number(defender.system?.attributes?.hp?.temp ?? 0);
            if (armEff && curTemp > 0) {
              defEntry.retaliation = await this.triggerRetaliatoryArmorOnMeleeHit({
                defender,
                armEff,
                curTemp,
                attackerActor,
                attackerUuid,
                attackerName,
                total,
                defenderAc,
                isCrit
              });
            }
          }

          ledgerDefenders.push(defEntry);
        }

        if (anyAuthoritativeProcessed && ledgerDefenders.length > 0 && (game.user?.isGM || message.isAuthor)) {
          const attackLedger = {
            kind: "attack-roll",
            attackerUuid,
            attackerActorId: attackerActor?.id || "",
            attackerName,
            isMelee,
            origNat: activeD20,
            origTotal: total,
            currentNat: activeD20,
            currentTotal: total,
            defenders: ledgerDefenders
          };
          await message.update({
            "flags.altarion-aitusa.rollLedger": attackLedger
          });
        }
      } catch (err) {
        console.warn("[Altarion & Aitusa] Error processing attack/save roll automations:", err);
      }
    });

    const onRender = (message, html) => {
      const rootEl = html instanceof HTMLElement ? html : html?.[0];
      if (!rootEl) return;

      // 0. Hide any unnecessary [data-action="rollDamage"] or [data-action="rollHealing"] button on fixed-value / reaction-automated spells
      const assocItem = message.getAssociatedItem?.();
      const assocNameLower = assocItem?.name?.trim().toLowerCase().replace(/’/g, "'") || "";
      const cardTitleText = String(rootEl.querySelector(".card-header h3, .item-name, .title")?.textContent || "")
        .trim()
        .toLowerCase()
        .replace(/’/g, "'");
      if (
        [
          "spirit shroud",
          "aid",
          "arcane armor",
          "shadow armor",
          "armor of agathys",
          "shadow rebuke",
          "altarion's echoing ward"
        ].includes(assocNameLower) ||
        [
          "spirit shroud",
          "aid",
          "arcane armor",
          "shadow armor",
          "armor of agathys",
          "shadow rebuke",
          "altarion's echoing ward"
        ].includes(cardTitleText)
      ) {
        for (const rollBtn of rootEl.querySelectorAll(
          '[data-action="rollDamage"], [data-action="rollHealing"], [data-action="rollSave"], button[data-action*="damage" i], button[data-action*="healing" i], button[data-action*="save" i]'
        )) {
          rollBtn.style.display = "none";
        }
      }

      // 0b. Bind Interactive Wisdom Save Roll buttons on Spirit Guardians & Ancestral Marking cards
      for (const saveRollBtn of rootEl.querySelectorAll(".altarion-interactive-save-roll-btn")) {
        if (saveRollBtn.dataset.bound) continue;
        saveRollBtn.dataset.bound = "true";
        saveRollBtn.addEventListener("click", async (ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          const tKey = saveRollBtn.getAttribute("data-target-key") || "";
          const msgId = saveRollBtn.getAttribute("data-card-msg-id") || message.id;
          const cardMsg = (msgId && game.messages?.get(msgId)) || message;
          await this.rollInteractiveCardWisdomSave(cardMsg, tKey);
        });
      }

      // 0c. Bind Inline Saving Throw Reaction buttons (Paths of Destiny, Portent, Silvery Barbs) on Spirit Guardians & Ancestral Marking cards
      if (typeof globalThis.FlinnManager?.bindInlineSavingThrowReactionButtons === "function") {
        globalThis.FlinnManager.bindInlineSavingThrowReactionButtons(rootEl, message.id);
      }

      // 1. Bind Ancestral Tether Reaction Hit Die Heal Button
      const tetherBtn = rootEl.querySelector(".altarion-aitusa-tether-heal-btn");
      if (tetherBtn && !tetherBtn.dataset.bound) {
        tetherBtn.dataset.bound = "true";
        tetherBtn.addEventListener("click", async (ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          const altarion = this.getAltarionActor();
          const aitusa = this.getAitusaActor();
          await this.executeTetherHitDieHeal(altarion, aitusa);
        });
      }

      // 1b. Render Arcane Armor / Shadow Armor / Armor of Agathys Cast Summary Badge
      const armorCast = message.flags?.["altarion-aitusa"]?.arcaneArmorCast;
      if (armorCast && !rootEl.querySelector(".altarion-arcane-armor-cast-badge")) {
        const armorLabel = armorCast.armorLabel || "Arcane Armor";
        const dmgTypeLabel = armorCast.damageTypeLabel || "Force";
        const div = document.createElement("div");
        div.className = "altarion-aitusa-ward-chat-tag altarion-arcane-armor-chat-card altarion-arcane-armor-cast-badge";
        div.innerHTML = `
          <div class="altarion-ward-header">
            <i class="fas fa-bolt"></i>
            <span>${armorLabel} (Slot Level ${armorCast.slotLevel}) Active</span>
          </div>
          <div class="altarion-ward-body">
            Click the roll button above to apply <strong>${armorCast.tempHpAmount} Temporary Hit Points</strong> (1 hour) to <strong>${(
              armorCast.recipients || ["Caster"]
            ).join(" & ")}</strong>.<br>
            Melee attackers that hit while Temp HP remain take <strong>${armorCast.retaliationDamage} ${dmgTypeLabel} damage</strong>.
          </div>
        `;
        (rootEl.querySelector(".message-content") || rootEl).appendChild(div);
      }

      // 1c. Bind Arcane Armor / Shadow Armor / Armor of Agathys / Spirit Guardians / Shadow Rebuke Apply & Undo Buttons (Toggleable!)
      // Strictly guard against non-retaliation buttons so other minimalist cards never trigger retaliation damage or undo.
      for (const applyBtn of rootEl.querySelectorAll(".altarion-arcane-armor-apply-btn")) {
        if (
          applyBtn.classList.contains("altarion-interactive-save-roll-btn") ||
          applyBtn.classList.contains("kyrion-storage-chat-btn") ||
          applyBtn.classList.contains("coria-paths-choice-btn") ||
          applyBtn.classList.contains("coria-blade-move-roll-btn") ||
          applyBtn.classList.contains("coria-blade-move-apply-btn") ||
          applyBtn.classList.contains("altarion-echoing-ward-reapply-btn") ||
          !applyBtn.hasAttribute("data-damage")
        ) {
          continue;
        }
        if (applyBtn.dataset.bound) continue;
        applyBtn.dataset.bound = "true";
        applyBtn.addEventListener("click", async (ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          const attackerUuid = applyBtn.getAttribute("data-attacker-uuid") || "";
          const attackerActorId = applyBtn.getAttribute("data-attacker-id") || "";
          const damage = Number(applyBtn.getAttribute("data-damage") || 5);
          const damageType = applyBtn.getAttribute("data-damage-type") || "force";
          const armorLabel = applyBtn.getAttribute("data-armor-label") || "Arcane Armor";
          const res = await this.applyRetaliationDamageToTarget({
            attackerUuid,
            attackerActorId,
            damage,
            damageType,
            armorLabel
          });
          if (res?.applied) {
            // Re-enable the paired Undo button so the user can toggle Undo / Re-apply repeatedly
            const row = applyBtn.closest(".altarion-arcane-armor-btn-row") || rootEl;
            const pairedUndoBtn = row.querySelector(".altarion-arcane-armor-undo-btn");
            if (pairedUndoBtn) {
              pairedUndoBtn.disabled = false;
              pairedUndoBtn.innerHTML = `<i class="fas fa-undo"></i> Undo (+${damage} HP)`;
            }
          }
        });
      }

      for (const undoBtn of rootEl.querySelectorAll(".altarion-arcane-armor-undo-btn")) {
        if (
          undoBtn.classList.contains("kyrion-storage-chat-btn") ||
          undoBtn.classList.contains("coria-paths-choice-btn") ||
          undoBtn.classList.contains("altarion-echoing-ward-undo-btn") ||
          !undoBtn.hasAttribute("data-damage")
        ) {
          continue;
        }
        if (undoBtn.dataset.bound) continue;
        undoBtn.dataset.bound = "true";
        undoBtn.addEventListener("click", async (ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          const attackerUuid = undoBtn.getAttribute("data-attacker-uuid") || "";
          const attackerActorId = undoBtn.getAttribute("data-attacker-id") || "";
          const damage = Number(undoBtn.getAttribute("data-damage") || 5);
          const armorLabel = undoBtn.getAttribute("data-armor-label") || "Arcane Armor";
          const ok = await this.undoRetaliationDamageOnTarget({
            attackerUuid,
            attackerActorId,
            damage,
            armorLabel,
            damageMessage: message
          });
          if (ok) {
            undoBtn.disabled = true;
            undoBtn.innerHTML = `<i class="fas fa-check"></i> Undone`;
            const row = undoBtn.closest(".altarion-arcane-armor-btn-row") || rootEl;
            const pairedApplyBtn = row.querySelector(".altarion-arcane-armor-apply-btn");
            if (pairedApplyBtn) {
              pairedApplyBtn.disabled = false;
            }
          }
        });
      }

      // 1c-2. Bind Ancestral Shielding Undo & Re-apply Temp HP Buttons (Toggleable: also re-applies/removes Ancestral Shielding status!)
      for (const shUndoBtn of rootEl.querySelectorAll(".altarion-shielding-undo-btn")) {
        if (shUndoBtn.dataset.bound) continue;
        shUndoBtn.dataset.bound = "true";
        shUndoBtn.addEventListener("click", async (ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          const defUuid = shUndoBtn.getAttribute("data-defender-uuid") || "";
          const defId = shUndoBtn.getAttribute("data-defender-id") || "";
          const prevTemp = Math.max(0, Number(shUndoBtn.getAttribute("data-prev-temp") || 0));
          const defActor = await this.resolveActorFromUuidOrId(defUuid, defId);
          if (!defActor || !defActor.isOwner) {
            ui.notifications.warn("[Ancestral Shielding] Only the owner or GM can undo Temporary HP.");
            return;
          }

          const altarion =
            (shUndoBtn.getAttribute("data-caster-id") && game.actors?.get(shUndoBtn.getAttribute("data-caster-id"))) ||
            this.getAltarionActor();
          const intMod = Number(shUndoBtn.getAttribute("data-int-mod") ?? altarion?.system?.abilities?.int?.mod ?? 3);
          const acBonus = Math.max(1, Number(shUndoBtn.getAttribute("data-ac-bonus") || Math.ceil(intMod / 2)));
          const riderLevel = Number(shUndoBtn.getAttribute("data-rider-level") || this.getRiderLevel(altarion) || 4);

          await defActor.update({ "system.attributes.hp.temp": prevTemp }, { altarionBypassWard: true });
          await this.applyOrUpdateStatusEffect(defActor, {
            statusId: "ancestral-shielding",
            name: `Ancestral Shielding (+${acBonus} AC)`,
            img: "modules/altarion-aitusa/dr_icons/ancestral-shielding.jpg",
            description: `<p>Granted by <strong>Ancestral Shielding</strong>: You gain a <strong>+${acBonus} bonus to AC</strong> until the end of ${altarion?.name || "Altarion"}'s next turn. If an attack hits you before then, you gain temporary hit points equal to <strong>${riderLevel >= 18 ? "6d6" : riderLevel >= 14 ? "5d6" : riderLevel >= 10 ? "4d6" : riderLevel >= 6 ? "3d6" : "2d6"} + ${acBonus}</strong>, and this bonus to AC ends.</p>`,
            changes: [
              {
                key: "system.attributes.ac.bonus",
                mode: CONST.ACTIVE_EFFECT_MODES.ADD,
                value: `+${acBonus}`,
                priority: 20
              }
            ],
            durationRounds: 1,
            durationTurns: 1,
            expiresAtEndOfTurnOf: altarion?.id || defActor.id,
            extraFlags: {
              isAncestralShieldingEffect: true,
              casterActorId: altarion?.id || defActor.id,
              acBonus,
              intMod,
              riderLevel
            }
          });

          shUndoBtn.disabled = true;
          shUndoBtn.innerHTML = `<i class="fas fa-check"></i> Undone (+${acBonus} AC Restored)`;
          const row = shUndoBtn.closest(".altarion-arcane-armor-btn-row") || rootEl;
          const reapplyBtn = row.querySelector(".altarion-shielding-reapply-btn");
          if (reapplyBtn) reapplyBtn.disabled = false;
          ui.notifications.info(
            `[Ancestral Shielding] Restored ${defActor.name}'s Temp HP to ${prevTemp} and re-applied Ancestral Shielding (+${acBonus} AC)!`
          );
        });
      }

      for (const shReapplyBtn of rootEl.querySelectorAll(".altarion-shielding-reapply-btn")) {
        if (shReapplyBtn.dataset.bound) continue;
        shReapplyBtn.dataset.bound = "true";
        shReapplyBtn.addEventListener("click", async (ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          const defUuid = shReapplyBtn.getAttribute("data-defender-uuid") || "";
          const defId = shReapplyBtn.getAttribute("data-defender-id") || "";
          const prevTemp = Math.max(0, Number(shReapplyBtn.getAttribute("data-prev-temp") || 0));
          const rolledTemp = Math.max(1, Number(shReapplyBtn.getAttribute("data-rolled-temp") || 1));
          const acBonus = Math.max(1, Number(shReapplyBtn.getAttribute("data-ac-bonus") || 2));
          const defActor = await this.resolveActorFromUuidOrId(defUuid, defId);
          if (!defActor || !defActor.isOwner) {
            ui.notifications.warn("[Ancestral Shielding] Only the owner or GM can re-apply Temporary HP.");
            return;
          }
          if (typeof defActor.applyTempHP === "function") {
            await defActor.applyTempHP(rolledTemp);
          } else {
            await defActor.update({ "system.attributes.hp.temp": rolledTemp }, { altarionBypassWard: true });
          }
          await this.removeStatusEffect(defActor, "ancestral-shielding");

          const row = shReapplyBtn.closest(".altarion-arcane-armor-btn-row") || rootEl;
          const undoBtn = row.querySelector(".altarion-shielding-undo-btn");
          if (undoBtn) {
            undoBtn.disabled = false;
            undoBtn.innerHTML = `<i class="fas fa-undo"></i> Undo Temp HP &amp; Restore +${acBonus} AC`;
          }
          ui.notifications.info(
            `[Ancestral Shielding] Re-applied ${rolledTemp} Temporary HP to ${defActor.name} and removed Ancestral Shielding (+${acBonus} AC)!`
          );
        });
      }

      // 1d. Render Shadow Blast Eldritch Invocation Riders (Kyrion)
      const sbRiders = message.flags?.["altarion-aitusa"]?.shadowBlastInvocations;
      if (Array.isArray(sbRiders) && sbRiders.length > 0 && !rootEl.querySelector(".kyrion-shadow-blast-riders")) {
        const div = document.createElement("div");
        div.className = "altarion-aitusa-ward-chat-tag altarion-arcane-armor-chat-card kyrion-shadow-blast-riders";
        div.innerHTML = `
          <div class="altarion-ward-header">
            <i class="fas fa-skull"></i>
            <span>Shadow Blast — Eldritch Invocations</span>
          </div>
          <div class="altarion-ward-body">
            ${sbRiders.join("<br>")}
          </div>
        `;
        (rootEl.querySelector(".message-content") || rootEl).appendChild(div);
      }

      // 1e. Render Kyrion Shadow Extraction interactive Shadow Storage management controls
      const shadowExt = message.flags?.["altarion-aitusa"]?.kyrionShadowExtraction;
      if (shadowExt && !rootEl.querySelector(".kyrion-shadow-extraction-card")) {
        const kyrion = game.actors?.get(shadowExt.actorId) || this.getKyrionActor();
        const prof = Number(kyrion?.system?.attributes?.prof ?? 2);
        const chaMod = Number(kyrion?.system?.abilities?.cha?.mod ?? 0);
        const maxStorage = Math.max(1, prof + chaMod);
        const curStorage = Math.clamp(Number(kyrion?.system?.resources?.secondary?.value ?? 0), 0, maxStorage);

        const div = document.createElement("div");
        div.className = "altarion-aitusa-ward-chat-tag altarion-arcane-armor-chat-card kyrion-shadow-extraction-card";
        div.innerHTML = `
          <div class="altarion-ward-header">
            <i class="fas fa-ghost"></i>
            <span>Shadow Storage (<strong class="kyrion-chat-storage-val">${curStorage} / ${maxStorage}</strong>)</span>
          </div>
          <div class="altarion-ward-body">
            On a failed Charisma Save, capture the creature's shadow into your Shadow Storage <em>(Shadow Lieutenant = 2 slots)</em>:
          </div>
          <div class="altarion-arcane-armor-btn-row" style="flex-wrap: wrap;">
            <button type="button" class="coria-min-card-btn-primary kyrion-storage-chat-btn" data-actor-id="${kyrion?.id || ""}" data-delta="1">
              <i class="fas fa-plus"></i> Capture Shadow (+1)
            </button>
            <button type="button" class="coria-min-card-btn-primary kyrion-storage-chat-btn" data-actor-id="${kyrion?.id || ""}" data-delta="2">
              <i class="fas fa-crown"></i> Lieutenant (+2)
            </button>
            <button type="button" class="coria-min-card-btn-secondary kyrion-storage-chat-btn" data-actor-id="${kyrion?.id || ""}" data-delta="-1">
              <i class="fas fa-trash-alt"></i> Release (-1)
            </button>
          </div>
        `;
        for (const btn of div.querySelectorAll(".kyrion-storage-chat-btn")) {
          btn.addEventListener("click", async (ev) => {
            ev.preventDefault();
            ev.stopPropagation();
            const act = game.actors?.get(btn.getAttribute("data-actor-id")) || this.getKyrionActor();
            if (!act || !act.isOwner) {
              ui.notifications.warn("[Shadow Storage] Only Kyrion's owner or the GM can modify Shadow Storage.");
              return;
            }
            const delta = Number(btn.getAttribute("data-delta") || 0);
            const p = Number(act.system?.attributes?.prof ?? 2);
            const c = Number(act.system?.abilities?.cha?.mod ?? 0);
            const cap = Math.max(1, p + c);
            const cur = Math.clamp(Number(act.system?.resources?.secondary?.value ?? 0), 0, cap);
            if (delta > 0 && cur + delta > cap) {
              ui.notifications.warn(
                `[Shadow Storage] Storage limit reached (${cur}/${cap})! Release a stored shadow first (permanently destroying it) before capturing a new one.`
              );
              return;
            }
            const nextVal = Math.clamp(cur + delta, 0, cap);
            await act.update({
              "system.resources.secondary.label": "Shadow Storage",
              "system.resources.secondary.value": nextVal,
              "system.resources.secondary.max": cap,
              "system.resources.secondary.sr": false,
              "system.resources.secondary.lr": false
            });
            const labelEl = div.querySelector(".kyrion-chat-storage-val");
            if (labelEl) labelEl.textContent = `${nextVal} / ${cap}`;
            ui.notifications.info(
              delta > 0
                ? `[Shadow Storage] Captured shadow! Storage: ${nextVal} / ${cap}.`
                : `[Shadow Storage] Released & destroyed 1 stored shadow. Storage: ${nextVal} / ${cap}.`
            );
          });
        }
        (rootEl.querySelector(".message-content") || rootEl).appendChild(div);
      }

      // 2. Render Draconic Focus badge if used
      const focusData = message.flags?.["altarion-aitusa"]?.draconicFocusUsed;
      if (focusData && !rootEl.querySelector(".altarion-focus-chat-badge")) {
        const div = document.createElement("div");
        div.className = "altarion-aitusa-ward-chat-tag altarion-focus-chat-badge";
        div.innerHTML = `
          <div class="altarion-ward-header">
            <i class="fas fa-dragon"></i>
            <span>Draconic Focus — Channeled Spell</span>
          </div>
          <div class="altarion-ward-body">
            Expended <strong>${focusData.altarionName}'s Level ${focusData.slotLevel} Spell Slot</strong> to cast this spell through Aitusa!
          </div>
        `;
        (rootEl.querySelector(".message-content") || rootEl).appendChild(div);
      }

      // 3. Render Linked Casting badge if used
      const linkedData = message.flags?.["altarion-aitusa"]?.linkedCastingUsed;
      if (linkedData && !rootEl.querySelector(".altarion-linked-chat-badge")) {
        const div = document.createElement("div");
        div.className = "altarion-aitusa-ward-chat-tag altarion-linked-chat-badge";
        div.innerHTML = `
          <div class="altarion-ward-header">
            <i class="fas fa-link"></i>
            <span>Linked Casting Active (${linkedData.remainingUses}/${linkedData.maxUses} left)</span>
          </div>
          <div class="altarion-ward-body">
            This spell also targets <strong>${linkedData.aitusaName}</strong>!
          </div>
        `;
        (rootEl.querySelector(".message-content") || rootEl).appendChild(div);
      }

      // 4. Render Ancient Connection Save Bonus badge if triggered
      const ancientConn = message.flags?.["altarion-aitusa"]?.ancientConnectionBonus;
      if (ancientConn && !rootEl.querySelector(".altarion-ancient-conn-badge")) {
        const div = document.createElement("div");
        div.className = "altarion-aitusa-ward-chat-tag altarion-ancient-conn-badge";
        div.innerHTML = `
          <div class="altarion-ward-header">
            <i class="fas fa-star"></i>
            <span>Ancient Connection (+${ancientConn.bonus} Save Bonus)</span>
          </div>
          <div class="altarion-ward-body">
            <strong>${ancientConn.partnerName}</strong> is conscious and within 30 ft${
              ancientConn.distanceFt !== null ? ` (${ancientConn.distanceFt} ft)` : ""
            }: Added <strong>+${ancientConn.bonus}</strong> to this Saving Throw!
          </div>
        `;
        (rootEl.querySelector(".message-content") || rootEl).appendChild(div);
      }

      // 5. Render Ancestral Form Damage Bonus badge if triggered
      const formBonus = message.flags?.["altarion-aitusa"]?.ancestralFormBonus;
      if (formBonus && !rootEl.querySelector(".altarion-form-bonus-badge")) {
        const div = document.createElement("div");
        div.className = "altarion-aitusa-ward-chat-tag altarion-form-bonus-badge";
        div.innerHTML = `
          <div class="altarion-ward-header">
            <i class="fas fa-fire-alt"></i>
            <span>Ancestral Form (+${formBonus} Force Damage)</span>
          </div>
          <div class="altarion-ward-body">
            Altarion has more than half of his Hit Points remaining: Added <strong>+${formBonus} Force damage</strong> (INT modifier)!
          </div>
        `;
        (rootEl.querySelector(".message-content") || rootEl).appendChild(div);
      }

      // 6. Bind Spiritual Weapon & Tentacle of the Deeps Roll Damage / Undo / Re-apply Buttons
      for (const sRollBtn of rootEl.querySelectorAll(".coria-summon-roll-dmg-btn")) {
        if (sRollBtn.dataset.bound) continue;
        sRollBtn.dataset.bound = "true";
        sRollBtn.addEventListener("click", async (ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          const atkMsgId = sRollBtn.getAttribute("data-attack-msg-id") || "";
          const cardMsgId = sRollBtn.getAttribute("data-card-msg-id") || message.id;
          await this.rollSummonHitDamageFromCard(atkMsgId, cardMsgId);
        });
      }

      for (const sUndoBtn of rootEl.querySelectorAll(".coria-summon-atk-undo-btn")) {
        if (sUndoBtn.dataset.bound) continue;
        sUndoBtn.dataset.bound = "true";
        sUndoBtn.addEventListener("click", async (ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          const targetUuid = sUndoBtn.getAttribute("data-target-uuid") || "";
          const targetActorId = sUndoBtn.getAttribute("data-target-actor-id") || "";
          const damage = Math.max(1, Number(sUndoBtn.getAttribute("data-damage") || 1));
          const summonLabel = sUndoBtn.getAttribute("data-summon-label") || "Spiritual Weapon";
          const removeSlow = sUndoBtn.getAttribute("data-remove-slow") === "true";

          await this.undoSummonAttackEffect({
            targetUuid,
            targetActorId,
            damage,
            summonLabel,
            removeSlow,
            cardMsgId: message?.id || ""
          });

          sUndoBtn.disabled = true;
          sUndoBtn.innerHTML = `<i class="fas fa-check"></i> Undone`;
          const row = sUndoBtn.closest(".altarion-arcane-armor-btn-row") || rootEl;
          const reapplyBtn = row.querySelector(".coria-summon-atk-reapply-btn");
          if (reapplyBtn) reapplyBtn.disabled = false;
        });
      }

      for (const sReapplyBtn of rootEl.querySelectorAll(".coria-summon-atk-reapply-btn")) {
        if (sReapplyBtn.dataset.bound) continue;
        sReapplyBtn.dataset.bound = "true";
        sReapplyBtn.addEventListener("click", async (ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          const targetUuid = sReapplyBtn.getAttribute("data-target-uuid") || "";
          const targetActorId = sReapplyBtn.getAttribute("data-target-actor-id") || "";
          const damage = Math.max(1, Number(sReapplyBtn.getAttribute("data-damage") || 1));
          const damageType = sReapplyBtn.getAttribute("data-damage-type") || "force";
          const summonLabel = sReapplyBtn.getAttribute("data-summon-label") || "Spiritual Weapon";
          const applySlow = sReapplyBtn.getAttribute("data-apply-slow") === "true";
          const casterActorId = sReapplyBtn.getAttribute("data-caster-actor-id") || "";

          await this.applySummonAttackEffect({
            targetUuid,
            targetActorId,
            damage,
            damageType,
            summonLabel,
            applySlow,
            casterActorId
          });

          sReapplyBtn.disabled = true;
          const row = sReapplyBtn.closest(".altarion-arcane-armor-btn-row") || rootEl;
          const undoBtn = row.querySelector(".coria-summon-atk-undo-btn");
          if (undoBtn) {
            undoBtn.disabled = false;
            undoBtn.innerHTML = `<i class="fas fa-undo"></i> Undo (+${damage} HP${applySlow ? " & Speed" : ""})`;
          }
        });
      }

      // 7. Bind Kyrion's Dark Vitality Undo / Re-apply Buttons (Healing Inversion & Necrotic/Poison Absorption)
      for (const dvUndoBtn of rootEl.querySelectorAll(".coria-dv-undo-btn")) {
        if (dvUndoBtn.dataset.bound) continue;
        dvUndoBtn.dataset.bound = "true";
        dvUndoBtn.addEventListener("click", async (ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          const targetUuid = dvUndoBtn.getAttribute("data-target-uuid") || "";
          const targetId = dvUndoBtn.getAttribute("data-target-actor-id") || "";
          const dmg = Math.max(0, Number(dvUndoBtn.getAttribute("data-damage") || 0));
          const target = await this.resolveActorFromUuidOrId(targetUuid, targetId);
          if (!target || !target.isOwner) {
            ui.notifications.warn("[Dark Vitality] Apenas o Mestre ou dono da ficha pode desfazer.");
            return;
          }
          if (dmg > 0) {
            const RL = globalThis.CoriaRollLedger;
            if (RL?.revertActorDamageLayered) {
              const revRes = await RL.revertActorDamageLayered(target, dmg, {
                mode: "undo",
                damageMessage: message
              });
              ui.notifications.info(
                `[Dark Vitality] Restored ${revRes?.summaryText || `+${dmg} HP`} to ${target.name} (Undone).`
              );
            } else {
              const curHp = Number(target.system?.attributes?.hp?.value ?? 0);
              const maxHp = Number(
                target.system?.attributes?.hp?.effectiveMax || target.system?.attributes?.hp?.max || curHp + dmg
              );
              await target.update(
                { "system.attributes.hp.value": Math.min(maxHp, curHp + dmg) },
                { altarionBypassWard: true, coriaDamageReactionInternal: true, coriaDarkVitalityBypass: true }
              );
            }
          }
          dvUndoBtn.disabled = true;
          dvUndoBtn.innerHTML = `<i class="fas fa-check"></i> Undone`;
          const row = dvUndoBtn.closest(".altarion-arcane-armor-btn-row") || rootEl;
          const reapply = row.querySelector(".coria-dv-reapply-btn");
          if (reapply) reapply.disabled = false;
        });
      }

      for (const dvReapplyBtn of rootEl.querySelectorAll(".coria-dv-reapply-btn")) {
        if (dvReapplyBtn.dataset.bound) continue;
        dvReapplyBtn.dataset.bound = "true";
        dvReapplyBtn.addEventListener("click", async (ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          const targetUuid = dvReapplyBtn.getAttribute("data-target-uuid") || "";
          const targetId = dvReapplyBtn.getAttribute("data-target-actor-id") || "";
          const dmg = Math.max(0, Number(dvReapplyBtn.getAttribute("data-damage") || 0));
          const target = await this.resolveActorFromUuidOrId(targetUuid, targetId);
          if (!target || !target.isOwner) {
            ui.notifications.warn("[Dark Vitality] Apenas o Mestre ou dono da ficha pode reaplicar.");
            return;
          }
          if (dmg > 0) {
            const curTemp = Number(target.system?.attributes?.hp?.temp ?? 0);
            const curHp = Number(target.system?.attributes?.hp?.value ?? 0);
            const remAfterTemp = Math.max(0, dmg - curTemp);
            await target.update(
              {
                "system.attributes.hp.temp": Math.max(0, curTemp - dmg),
                "system.attributes.hp.value": Math.max(0, curHp - remAfterTemp)
              },
              { altarionBypassWard: true, coriaDamageReactionInternal: true, coriaDarkVitalityBypass: true }
            );
          }
          dvReapplyBtn.disabled = true;
          const row = dvReapplyBtn.closest(".altarion-arcane-armor-btn-row") || rootEl;
          const undo = row.querySelector(".coria-dv-undo-btn");
          if (undo) {
            undo.disabled = false;
            undo.innerHTML = `<i class="fas fa-undo"></i> Undo (+${dmg} HP)`;
          }
        });
      }

      for (const dvAbsorbUndo of rootEl.querySelectorAll(".coria-dv-absorb-undo-btn")) {
        if (dvAbsorbUndo.dataset.bound) continue;
        dvAbsorbUndo.dataset.bound = "true";
        dvAbsorbUndo.addEventListener("click", async (ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          const targetUuid = dvAbsorbUndo.getAttribute("data-target-uuid") || "";
          const targetId = dvAbsorbUndo.getAttribute("data-target-actor-id") || "";
          const prevHp = Math.max(0, Number(dvAbsorbUndo.getAttribute("data-prev-hp") || 0));
          const target = await this.resolveActorFromUuidOrId(targetUuid, targetId);
          if (!target || !target.isOwner) {
            ui.notifications.warn("[Dark Vitality] Apenas o Mestre ou dono da ficha pode desfazer.");
            return;
          }
          await target.update(
            { "system.attributes.hp.value": prevHp },
            { altarionBypassWard: true, coriaDamageReactionInternal: true, coriaDarkVitalityBypass: true }
          );
          dvAbsorbUndo.disabled = true;
          dvAbsorbUndo.innerHTML = `<i class="fas fa-check"></i> Undone (HP → ${prevHp})`;
        });
      }
    };

    Hooks.on("renderChatMessageHTML", onRender);
  }

  /* -------------------------------------------------------------------------- */
  /*  SPIRITUAL WEAPON (Flinn) & TENTACLE OF THE DEEPS (Parva)                  */
  /*  Interactive Map Space Placement, Token Spawning & Double-Click Attack     */
  /* -------------------------------------------------------------------------- */

  static _cancelActiveSummonPlacement = null;

  static registerSummonTokenHooks() {
    const wrapTokenDoubleClick = () => {
      const tokenClass = CONFIG.Token?.objectClass;
      if (!tokenClass?.prototype || tokenClass.prototype._coriaSummonClick2Wrapped) return;
      tokenClass.prototype._coriaSummonClick2Wrapped = true;

      const origOnClickLeft2 = tokenClass.prototype._onClickLeft2;
      tokenClass.prototype._onClickLeft2 = function (event) {
        const summonData =
          this.document?.flags?.["altarion-aitusa"]?.summonData ||
          this.actor?.flags?.["altarion-aitusa"]?.summonData;
        if (summonData?.isCoriaSummonToken) {
          event?.preventDefault?.();
          event?.stopPropagation?.();
          AltarionAutomationManager.openSummonTokenAttackDialog(this, summonData);
          return;
        }
        return origOnClickLeft2.call(this, event);
      };
    };

    if (CONFIG.Token?.objectClass) wrapTokenDoubleClick();
    Hooks.once("ready", wrapTokenDoubleClick);
    Hooks.on("canvasReady", wrapTokenDoubleClick);

    // Safety net: if an ActorSheet ever tries to open for a Spiritual Weapon / Tentacle of the Deeps summon actor,
    // close it immediately and open the Summon Attack Dialog instead!
    const interceptSummonSheet = (sheet) => {
      try {
        const actor = sheet?.actor || sheet?.document;
        const summonData = actor?.flags?.["altarion-aitusa"]?.summonData;
        if (!summonData?.isCoriaSummonToken) return;
        setTimeout(() => {
          try {
            sheet.close?.();
          } catch (_e) {
            // ignore
          }
        }, 10);
        const tok =
          (canvas?.tokens?.placeables || []).find(
            t =>
              t.actor?.id === actor.id ||
              t.document?.flags?.["altarion-aitusa"]?.summonData?.summonType === summonData.summonType
          ) || null;
        this.openSummonTokenAttackDialog(tok, summonData);
      } catch (_e) {
        // ignore
      }
    };
    Hooks.on("renderActorSheet", interceptSummonSheet);
    Hooks.on("renderActorSheetV2", interceptSummonSheet);

    // GM Socket listener for spawning summon tokens and applying damage/slow to non-owned target tokens
    const bindSummonSocket = () => {
      if (!game.socket) return;
      game.socket.on("module.altarion-aitusa", async (payload) => {
        try {
          if (!game.user?.isGM || game.users?.activeGM?.id !== game.user.id) return;
          if (payload?.type === "coriaSpawnSummonToken") {
            await this._gmSpawnSummonedTokenPayload(payload.params || {});
          } else if (payload?.type === "coriaApplySummonAttackEffect") {
            await this._gmApplySummonAttackEffectPayload(payload.params || {});
          } else if (payload?.type === "coriaUndoSummonAttackEffect") {
            await this._gmUndoSummonAttackEffectPayload(payload.params || {});
          } else if (payload?.type === "coriaUpdateSummonCardMessages") {
            const p = payload.params || {};
            const cardMsg = p.cardMsgId ? game.messages?.get(p.cardMsgId) : null;
            if (cardMsg && p.cardContent) {
              await cardMsg.update({
                content: p.cardContent,
                ...(p.coriaCustomDamage
                  ? { "flags.altarion-aitusa.coriaCustomDamage": p.coriaCustomDamage }
                  : {})
              });
            }
            const atkMsg = p.attackMsgId ? game.messages?.get(p.attackMsgId) : null;
            if (atkMsg && p.summonAttackContext) {
              await atkMsg.update({
                "flags.altarion-aitusa.summonAttackContext": p.summonAttackContext
              });
            }
          }
        } catch (err) {
          console.warn("[Altarion & Aitusa] Error handling summon token socket:", err);
        }
      });
    };
    if (game?.ready) bindSummonSocket();
    else Hooks.once("ready", bindSummonSocket);
  }

  /**
   * Prompt the user (`Flinn` or `Parva` or `GM`) to click any space on the active canvas map
   * to place the `Spiritual Weapon` or `Tentacle of the Deeps` token.
   */
  static async handleSummonTokenPlacement(
    caster,
    item,
    { summonType = "spiritual-weapon", slotLevel = 2 } = {}
  ) {
    if (!caster || !canvas?.ready || !canvas?.scene) {
      ui.notifications?.warn?.("Open an active scene map to place the summoned token.");
      return;
    }

    // Cancel any previous placement preview
    if (typeof this._cancelActiveSummonPlacement === "function") {
      this._cancelActiveSummonPlacement();
    }

    const isSpiritualWeapon = summonType === "spiritual-weapon";
    const tokenName = isSpiritualWeapon ? "Spiritual Weapon" : "Tentacle of the Deeps";
    const actorName = `${tokenName} (${caster.name})`;
    const img = isSpiritualWeapon
      ? "modules/altarion-aitusa/flinn_icons/spiritual-weapon-tophat.jpg"
      : "modules/altarion-aitusa/flinn_icons/tentacle-of-the-deeps-spectral.jpg";
    const accentHex = isSpiritualWeapon ? "#facc15" : "#38bdf8";
    const accentColor = isSpiritualWeapon ? 0xfacc15 : 0x38bdf8;
    const effSlot = isSpiritualWeapon ? Math.max(2, Number(slotLevel || 2)) : 1;

    // Minimise caster sheet if open so the map is unobstructed
    const wasSheetMaximized = Boolean(caster.sheet?.rendered && !caster.sheet?._minimized);
    try {
      if (wasSheetMaximized && typeof caster.sheet?.minimize === "function") {
        await caster.sheet.minimize();
      }
    } catch (_e) {
      // ignore
    }

    // Floating top instruction banner
    let banner = document.getElementById("coria-summon-placement-banner");
    if (banner) banner.remove();
    banner = document.createElement("div");
    banner.id = "coria-summon-placement-banner";
    banner.style.cssText = `
      position: fixed;
      top: 72px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 2147483645;
      background: linear-gradient(135deg, rgba(7, 11, 22, 0.96) 0%, rgba(17, 25, 44, 0.96) 100%);
      border: 2px solid ${accentHex};
      border-radius: 10px;
      padding: 10px 18px;
      color: #f8fafc;
      font-size: 13.5px;
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 12px;
      box-shadow: 0 8px 28px rgba(0, 0, 0, 0.8), 0 0 16px ${accentHex}55;
      pointer-events: auto;
    `;
    banner.innerHTML = `
      <img src="${img}" style="width: 34px; height: 34px; border-radius: 50%; border: 1.5px solid ${accentHex}; object-fit: cover;" />
      <div>
        <div style="color: ${accentHex}; font-size: 14px; font-weight: 900;">
          ${tokenName}${isSpiritualWeapon ? ` (Slot Level ${effSlot})` : ""} — Posicionar no Mapa
        </div>
        <div style="font-size: 12px; color: #cbd5e1; font-weight: 600;">
          Clique com o <strong>botão esquerdo</strong> no espaço desejado do mapa para invocar o token (<strong>Clique direito</strong> ou <strong>ESC</strong> para cancelar).
        </div>
      </div>
      <button type="button" class="coria-summon-cancel-place-btn" style="padding: 5px 10px; border-radius: 6px; background: rgba(127, 29, 29, 0.85); border: 1px solid #f87171; color: #fecaca; font-weight: 800; cursor: pointer;">
        <i class="fas fa-times"></i> Cancelar
      </button>
    `;
    document.body.appendChild(banner);

    // Create PIXI ghost preview on canvas
    const gridSize = Number(canvas.grid?.size || canvas.scene?.grid?.size || 100);
    let previewContainer = null;
    if (window.PIXI) {
      previewContainer = new PIXI.Container();
      previewContainer.eventMode = "none";
      previewContainer.interactiveChildren = false;

      const ring = new PIXI.Graphics();
      ring.lineStyle(3, accentColor, 0.95);
      ring.beginFill(accentColor, 0.22);
      ring.drawRoundedRect(0, 0, gridSize, gridSize, 14);
      ring.endFill();
      previewContainer.addChild(ring);

      try {
        const tex = PIXI.Texture.from(img);
        if (tex) {
          const spr = new PIXI.Sprite(tex);
          spr.width = gridSize - 8;
          spr.height = gridSize - 8;
          spr.x = 4;
          spr.y = 4;
          spr.alpha = 0.78;
          previewContainer.addChild(spr);
        }
      } catch (_e) {
        // fallback to ring only
      }

      const casterTok = this.getActorCanvasToken(caster);
      previewContainer.x = casterTok ? casterTok.document.x : 0;
      previewContainer.y = casterTok ? casterTok.document.y : 0;
      (canvas.interface || canvas.stage)?.addChild(previewContainer);
    }

    const snapToGridTopLeft = (worldX, worldY) => {
      try {
        if (typeof canvas.grid?.getTopLeftPoint === "function") {
          const pt = canvas.grid.getTopLeftPoint({ x: worldX, y: worldY });
          if (pt && Number.isFinite(pt.x) && Number.isFinite(pt.y)) {
            return { x: Math.round(pt.x), y: Math.round(pt.y) };
          }
        }
        if (typeof canvas.grid?.getTopLeft === "function") {
          const [gx, gy] = canvas.grid.getTopLeft(worldX, worldY);
          if (Number.isFinite(gx) && Number.isFinite(gy)) {
            return { x: Math.round(gx), y: Math.round(gy) };
          }
        }
      } catch (_e) {
        // fallback below
      }
      return {
        x: Math.floor(worldX / gridSize) * gridSize,
        y: Math.floor(worldY / gridSize) * gridSize
      };
    };

    const getCanvasWorldPos = (clientX, clientY) => {
      if (canvas.stage?.toLocal) {
        const pt = canvas.stage.toLocal({ x: clientX, y: clientY });
        if (pt && Number.isFinite(pt.x) && Number.isFinite(pt.y)) return pt;
      }
      return { x: clientX, y: clientY };
    };

    let currentSnapped = {
      x: previewContainer?.x || 0,
      y: previewContainer?.y || 0
    };

    const onMouseMove = (ev) => {
      const worldPt = getCanvasWorldPos(ev.clientX, ev.clientY);
      currentSnapped = snapToGridTopLeft(worldPt.x, worldPt.y);
      if (previewContainer) {
        previewContainer.x = currentSnapped.x;
        previewContainer.y = currentSnapped.y;
      }
    };

    const cleanupPlacement = () => {
      window.removeEventListener("pointermove", onMouseMove, true);
      window.removeEventListener("pointerdown", onPointerDown, true);
      window.removeEventListener("keydown", onKeyDown, true);
      if (banner?.parentNode) banner.remove();
      if (previewContainer) {
        try {
          previewContainer.parent?.removeChild(previewContainer);
          previewContainer.destroy?.({ children: true });
        } catch (_e) {
          // ignore
        }
      }
      this._cancelActiveSummonPlacement = null;
      try {
        if (wasSheetMaximized && typeof caster.sheet?.maximize === "function") {
          caster.sheet.maximize();
        }
      } catch (_e) {
        // ignore
      }
    };

    const onKeyDown = (ev) => {
      if (ev.key === "Escape") {
        ev.preventDefault();
        cleanupPlacement();
        ui.notifications?.info?.(`[${tokenName}] Posicionamento cancelado.`);
      }
    };

    const onPointerDown = async (ev) => {
      if (banner && banner.contains(ev.target)) return;
      if (ev.button === 2) {
        ev.preventDefault();
        ev.stopPropagation();
        cleanupPlacement();
        ui.notifications?.info?.(`[${tokenName}] Posicionamento cancelado.`);
        return;
      }
      if (ev.button !== 0) return;

      // Ensure click is on the canvas board
      const boardEl = document.getElementById("board") || canvas?.app?.view;
      if (boardEl && ev.target !== boardEl && !boardEl.contains?.(ev.target)) return;

      ev.preventDefault();
      ev.stopPropagation();

      const worldPt = getCanvasWorldPos(ev.clientX, ev.clientY);
      const dest = snapToGridTopLeft(worldPt.x, worldPt.y);
      cleanupPlacement();

      await this.spawnSummonedTokenAt({
        caster,
        summonType,
        slotLevel: effSlot,
        tokenName,
        actorName,
        img,
        x: dest.x,
        y: dest.y
      });
    };

    banner.querySelector(".coria-summon-cancel-place-btn")?.addEventListener("click", (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      cleanupPlacement();
      ui.notifications?.info?.(`[${tokenName}] Posicionamento cancelado.`);
    });

    this._cancelActiveSummonPlacement = cleanupPlacement;
    window.addEventListener("pointermove", onMouseMove, true);
    window.addEventListener("pointerdown", onPointerDown, true);
    window.addEventListener("keydown", onKeyDown, true);
  }

  static async spawnSummonedTokenAt({
    caster,
    summonType,
    slotLevel = 2,
    tokenName,
    actorName,
    img,
    x,
    y
  }) {
    if (!caster || !canvas?.scene) return;
    const payload = {
      sceneId: canvas.scene.id,
      casterActorId: caster.id,
      casterName: caster.name,
      summonType,
      slotLevel: Number(slotLevel || 1),
      tokenName,
      actorName,
      img,
      x: Number(x || 0),
      y: Number(y || 0)
    };

    if (game.user?.isGM) {
      await this._gmSpawnSummonedTokenPayload(payload);
    } else if (game.socket && game.users?.activeGM) {
      game.socket.emit("module.altarion-aitusa", {
        type: "coriaSpawnSummonToken",
        params: payload
      });
    } else {
      // Fallback: attempt direct token creation if player has TOKEN_CREATE permission
      await this._gmSpawnSummonedTokenPayload(payload);
    }

    const isSpiritualWeapon = summonType === "spiritual-weapon";
    const diceCount = isSpiritualWeapon
      ? 1 + Math.floor((Math.max(2, Number(slotLevel || 2)) - 2) / 2)
      : Math.max(
          Number(caster.system?.details?.level || 0),
          Number(
            caster.items?.find(i => i.type === "class" && i.system?.identifier === "warlock")?.system?.levels || 4
          )
        ) >= 10
        ? 2
        : 1;
    const abilKey = isSpiritualWeapon ? "wis" : "cha";
    const abilMod = Number(caster.system?.abilities?.[abilKey]?.mod ?? 3);
    const dmgPreview = isSpiritualWeapon
      ? `${diceCount}d8 ${abilMod >= 0 ? `+ ${abilMod}` : `- ${Math.abs(abilMod)}`} Force`
      : `${diceCount}d8 Cold (+ -10 ft Speed)`;

    await this.sendMinimalistFeatureCard(caster, {
      icon: isSpiritualWeapon ? "fa-hat-wizard" : "fa-water",
      title: `${tokenName}${isSpiritualWeapon ? ` (Slot Level ${slotLevel})` : ""} — Summoned on Map`,
      bodyHtml: `
        <strong>${foundry.utils.escapeHTML(caster.name)}</strong> summoned <strong class="coria-hl-info">${foundry.utils.escapeHTML(tokenName)}</strong> onto the battlefield!<br>
        &bull; <strong>Movement:</strong> Move the token freely on your turn (${isSpiritualWeapon ? "up to 20 ft" : "up to 30 ft"}).<br>
        &bull; <strong>Attack (${dmgPreview}):</strong> <strong>Double-click</strong> the <strong>${foundry.utils.escapeHTML(tokenName)}</strong> token on the map to execute a Melee Spell Attack against a target!
      `
    });
  }

  static async _gmSpawnSummonedTokenPayload({
    sceneId,
    casterActorId,
    casterName,
    summonType,
    slotLevel = 2,
    tokenName,
    actorName,
    img,
    x = 0,
    y = 0
  }) {
    const scene = (sceneId && game.scenes?.get(sceneId)) || canvas?.scene;
    if (!scene) return;

    const summonData = {
      isCoriaSummonToken: true,
      summonType,
      casterActorId,
      casterName,
      slotLevel: Number(slotLevel || 1),
      tokenName,
      img
    };

    // 1. Ensure a dedicated world NPC Actor exists for this summon with OWNER permission for players
    let summonActor =
      game.actors?.find(
        a =>
          a.flags?.["altarion-aitusa"]?.summonData?.isCoriaSummonToken &&
          a.flags?.["altarion-aitusa"]?.summonData?.summonType === summonType &&
          a.flags?.["altarion-aitusa"]?.summonData?.casterActorId === casterActorId
      ) ||
      game.actors?.find(a => a.name === actorName) ||
      null;

    const ownership = {
      default: CONST.DOCUMENT_OWNERSHIP_LEVELS?.OWNER ?? 3
    };

    if (!summonActor) {
      try {
        summonActor = await Actor.create({
          name: actorName,
          type: "npc",
          img,
          ownership,
          system: {
            attributes: {
              hp: { value: 1, max: 1 },
              ac: { flat: 20, calc: "flat" },
              movement: {
                walk: summonType === "spiritual-weapon" ? 0 : 30,
                fly: summonType === "spiritual-weapon" ? 20 : 0,
                hover: summonType === "spiritual-weapon"
              }
            },
            details: {
              type: { value: "custom", custom: "Magical Construct / Summon" }
            }
          },
          prototypeToken: {
            name: tokenName,
            texture: { src: img },
            width: 1,
            height: 1,
            disposition: CONST.TOKEN_DISPOSITIONS?.FRIENDLY ?? 1,
            actorLink: true,
            displayName: CONST.TOKEN_DISPLAY_MODES?.HOVER ?? 30,
            displayBars: CONST.TOKEN_DISPLAY_MODES?.NONE ?? 0,
            flags: {
              "altarion-aitusa": {
                summonData
              }
            }
          },
          flags: {
            "altarion-aitusa": {
              summonData
            }
          }
        });
      } catch (err) {
        console.warn("[Altarion & Aitusa] Could not create world summon actor:", err);
      }
    } else if (summonActor.isOwner) {
      await summonActor.update({
        img,
        ownership,
        "prototypeToken.name": tokenName,
        "prototypeToken.texture.src": img,
        "prototypeToken.flags.altarion-aitusa.summonData": summonData,
        "flags.altarion-aitusa.summonData": summonData
      });
    }

    // 2. Remove any previous token of this same summonType + casterActorId on the scene
    const existingIds = (scene.tokens || [])
      .filter(t => {
        const tf =
          t.flags?.["altarion-aitusa"]?.summonData ||
          t.actor?.flags?.["altarion-aitusa"]?.summonData;
        return (
          tf?.isCoriaSummonToken &&
          tf?.summonType === summonType &&
          tf?.casterActorId === casterActorId
        );
      })
      .map(t => t.id);

    if (existingIds.length > 0) {
      try {
        await scene.deleteEmbeddedDocuments("Token", existingIds);
      } catch (_e) {
        // ignore
      }
    }

    // 3. Create the new Token on the scene at `{ x, y }`
    const tokenDocData = {
      name: tokenName,
      actorId: summonActor?.id || null,
      actorLink: true,
      x: Number(x || 0),
      y: Number(y || 0),
      width: 1,
      height: 1,
      texture: { src: img },
      disposition: CONST.TOKEN_DISPOSITIONS?.FRIENDLY ?? 1,
      displayName: CONST.TOKEN_DISPLAY_MODES?.HOVER ?? 30,
      displayBars: CONST.TOKEN_DISPLAY_MODES?.NONE ?? 0,
      flags: {
        "altarion-aitusa": {
          summonData
        }
      }
    };

    await scene.createEmbeddedDocuments("Token", [tokenDocData]);
  }

  /**
   * Open the Attack Dialog when the controller (`Flinn`, `Parva`, or `GM`) double-clicks
   * a `Spiritual Weapon` or `Tentacle of the Deeps` token on the canvas!
   */
  static async openSummonTokenAttackDialog(summonToken, summonData = null) {
    summonData =
      summonData ||
      summonToken?.document?.flags?.["altarion-aitusa"]?.summonData ||
      summonToken?.actor?.flags?.["altarion-aitusa"]?.summonData;
    if (!summonData?.isCoriaSummonToken) return;

    const isSpiritualWeapon = summonData.summonType === "spiritual-weapon";
    const caster =
      (summonData.casterActorId && game.actors?.get(summonData.casterActorId)) ||
      (isSpiritualWeapon ? globalThis.FlinnManager?.getFlinnActor?.() : this.getParvaActor());

    if (!caster) {
      ui.notifications?.warn?.("Could not locate the caster actor for this summoned token.");
      return;
    }

    if (!caster.isOwner && !game.user?.isGM) {
      ui.notifications?.warn?.(`Only ${caster.name}'s controller or the GM can attack with ${summonData.tokenName || "this token"}.`);
      return;
    }

    const tokenName = summonData.tokenName || (isSpiritualWeapon ? "Spiritual Weapon" : "Tentacle of the Deeps");
    const img = isSpiritualWeapon
      ? "modules/altarion-aitusa/flinn_icons/spiritual-weapon-tophat.jpg"
      : "modules/altarion-aitusa/flinn_icons/tentacle-of-the-deeps-spectral.jpg";

    // Compute caster's Spell Attack Modifier & Damage Formula
    const prof = Number(caster.system?.attributes?.prof ?? 2);
    let abilKey = isSpiritualWeapon ? "wis" : "cha";
    if (isSpiritualWeapon) {
      const swItem = caster.items?.find(
        i => i.type === "spell" && i.name?.trim().toLowerCase() === "spiritual weapon"
      );
      const origin =
        swItem?.flags?.["altarion-aitusa"]?.flinnSpellOrigin ||
        (swItem?.system?.sourceItem === "class:wizard" ? "wizard" : "cleric");
      abilKey = origin === "wizard" ? "int" : "wis";
    }
    const abilLabel = abilKey === "int" ? "INT" : abilKey === "wis" ? "WIS" : "CHA";
    const abilMod = Number(caster.system?.abilities?.[abilKey]?.mod ?? 3);
    const msakBonus =
      Number(caster.system?.bonuses?.msak?.attack || caster.system?.bonuses?.rsak?.attack || 0) || 0;
    const spellAttackMod = abilMod + prof + msakBonus;
    const spellAttackModStr = spellAttackMod >= 0 ? `+${spellAttackMod}` : `${spellAttackMod}`;

    const initialSlotLvl = isSpiritualWeapon ? Math.max(2, Number(summonData.slotLevel || 2)) : 1;
    const warlockCls = caster.items?.find(i => i.type === "class" && i.system?.identifier === "warlock");
    const parvaLevel = Math.max(
      Number(caster.system?.details?.level || 0),
      Number(warlockCls?.system?.levels || 4)
    );
    const tentacleDice = parvaLevel >= 10 ? 2 : 1;

    const getDamageFormulaForSlot = (lvl) => {
      if (!isSpiritualWeapon) return `${tentacleDice}d8`;
      const dice = 1 + Math.floor((Math.max(2, Number(lvl || 2)) - 2) / 2);
      if (abilMod === 0) return `${dice}d8`;
      return `${dice}d8 ${abilMod > 0 ? `+ ${abilMod}` : `- ${Math.abs(abilMod)}`}`;
    };

    const damageType = isSpiritualWeapon ? "force" : "cold";
    const damageTypeLabel = isSpiritualWeapon ? "Force" : "Cold";

    // Build candidate target list from active canvas tokens
    const currentUserTargetIds = new Set(Array.from(game.user?.targets || []).map(t => t.id));
    const placeables = (canvas?.tokens?.placeables || []).filter(t => {
      if (!t?.actor) return false;
      if (summonToken && t.id === summonToken.id) return false;
      if (t.document?.flags?.["altarion-aitusa"]?.summonData?.isCoriaSummonToken) return false;
      return true;
    });

    const candidates = placeables
      .map(tok => {
        const distFt = summonToken ? this.getTokenDistanceFt(summonToken, tok) : null;
        const isTargeted = currentUserTargetIds.has(tok.id);
        return {
          token: tok,
          tokenId: tok.id,
          actor: tok.actor,
          uuid: tok.actor?.uuid || tok.document?.uuid || "",
          name: tok.name || tok.actor.name,
          img: tok.document?.texture?.src || tok.actor.img || "icons/svg/mystery-man.svg",
          ac: Number(tok.actor?.system?.attributes?.ac?.value ?? 10),
          distFt,
          isTargeted
        };
      })
      .sort((a, b) => {
        if (a.isTargeted !== b.isTargeted) return a.isTargeted ? -1 : 1;
        return (a.distFt ?? 999) - (b.distFt ?? 999);
      });

    if (candidates.length === 0) {
      ui.notifications?.warn?.(`[${tokenName}] No targetable creature tokens found on the active scene.`);
      return;
    }

    const preselectedTokenId = candidates[0].tokenId;

    const targetsHtml = candidates
      .map(c => {
        const distBadge =
          c.distFt !== null
            ? `<span style="font-size: 0.75rem; padding: 1px 6px; border-radius: 4px; background: ${
                c.distFt <= 10 ? "rgba(22, 163, 74, 0.3)" : "rgba(71, 85, 105, 0.4)"
              }; border: 1px solid ${
                c.distFt <= 10 ? "#4ade80" : "#94a3b8"
              }; color: ${c.distFt <= 10 ? "#bbf7d0" : "#e2e8f0"};">${c.distFt} ft</span>`
            : "";
        return `
          <label class="coria-creature-pick-row" data-token-id="${c.tokenId}" style="display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 6px 10px; border-radius: 6px; background: rgba(15, 23, 42, 0.78); border: 1px solid ${
            c.isTargeted ? "#facc15" : "rgba(255, 255, 255, 0.14)"
          }; cursor: pointer;">
            <div style="display: flex; align-items: center; gap: 9px; min-width: 0;">
              <input type="radio" name="coriaSummonTargetToken" value="${c.tokenId}" ${
                c.tokenId === preselectedTokenId ? "checked" : ""
              } />
              <img src="${c.img}" style="width: 30px; height: 30px; border-radius: 5px; object-fit: cover; border: 1px solid rgba(255,255,255,0.25);" />
              <div style="display: flex; flex-direction: column; text-align: left;">
                <strong style="color: #f8fafc; font-size: 0.88rem;">${foundry.utils.escapeHTML(c.name)}</strong>
                ${
                  c.isTargeted
                    ? `<span style="color: #fde047; font-size: 0.72rem; font-weight: 700;"><i class="fas fa-crosshairs"></i> Alvo Atual (Targeted)</span>`
                    : ""
                }
              </div>
            </div>
            <div style="display: flex; align-items: center; gap: 6px; flex-shrink: 0;">
              ${distBadge}
            </div>
          </label>
        `;
      })
      .join("");

    const slotSelectHtml = isSpiritualWeapon
      ? `
        <div style="margin-bottom: 10px; text-align: left;">
          <label style="display: block; font-size: 0.8rem; font-weight: 700; color: #fde047; margin-bottom: 4px;">
            Nível do Espaço Conjurado (Escala +1d8 a cada 2 níveis acima do 2º):
          </label>
          <select id="coria-summon-slot-select" style="width: 100%; padding: 5px 8px; border-radius: 5px; background: #090e1a; color: #f8fafc; border: 1px solid #facc15; font-weight: 700;">
            ${[2, 3, 4, 5, 6, 7, 8, 9]
              .map(
                lvl =>
                  `<option value="${lvl}" ${lvl === initialSlotLvl ? "selected" : ""}>${lvl}º Círculo — ${getDamageFormulaForSlot(
                    lvl
                  )} Force</option>`
              )
              .join("")}
          </select>
        </div>
      `
      : "";

    const d = createV2Dialog(
      {
        title: `${tokenName} — Melee Spell Attack (${caster.name})`,
        content: `
          <div class="coria-arcane-box" style="text-align: left; padding: 12px 14px;">
            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 10px; padding-bottom: 8px; border-bottom: 1px solid rgba(255,255,255,0.12);">
              <img src="${img}" style="width: 44px; height: 44px; border-radius: 8px; border: 2px solid ${
                isSpiritualWeapon ? "#facc15" : "#38bdf8"
              }; object-fit: cover;" />
              <div>
                <h3 style="margin: 0; font-size: 1.05rem; color: #ffffff;">${foundry.utils.escapeHTML(tokenName)}</h3>
                <div style="font-size: 0.82rem; color: #cbd5e1;">
                  Conjurador: <strong>${foundry.utils.escapeHTML(caster.name)}</strong> &bull;
                  Ataque Mágico: <strong class="coria-hl-info">${spellAttackModStr}</strong> (${abilLabel}) &bull;
                  Dano: <strong id="coria-summon-dmg-preview" class="coria-hl-gold">${getDamageFormulaForSlot(
                    initialSlotLvl
                  )} ${damageTypeLabel}</strong>
                </div>
                ${
                  !isSpiritualWeapon
                    ? `<div style="font-size: 0.76rem; color: #7dd3fc; margin-top: 2px;">
                         <i class="fas fa-snowflake"></i> Ao acertar: reduz o deslocamento do alvo em <strong>10 ft</strong> até o início do próximo turno de ${foundry.utils.escapeHTML(
                           caster.name
                         )}.
                       </div>`
                    : ""
                }
              </div>
            </div>

            ${slotSelectHtml}

            <div style="margin-bottom: 10px;">
              <label style="display: block; font-size: 0.8rem; font-weight: 700; color: #bae6fd; margin-bottom: 5px;">
                Selecione o Alvo do Ataque (passe o mouse para destacar no mapa):
              </label>
              <div style="display: flex; flex-direction: column; gap: 5px; max-height: 195px; overflow-y: auto; padding: 4px;">
                ${targetsHtml}
              </div>
            </div>

            <div style="margin-bottom: 10px; text-align: left;">
              <label style="display: block; font-size: 0.8rem; font-weight: 700; color: #bae6fd; margin-bottom: 4px;">
                Bônus Situacional no Ataque (opcional — ex.: +1d4, +1d8, +2):
              </label>
              <input type="text" id="coria-summon-sit-bonus" placeholder="Ex.: +1d4, +1d8, +2, -1d4" style="width: 100%; padding: 5px 9px; border-radius: 5px; background: #090e1a; color: #f8fafc; border: 1px solid rgba(56, 189, 248, 0.55); font-weight: 700;" />
            </div>

            <div style="display: flex; gap: 8px; justify-content: center; margin-top: 8px;">
              <label style="flex: 1; display: flex; align-items: center; justify-content: center; gap: 5px; padding: 6px 8px; border-radius: 6px; background: rgba(15, 23, 42, 0.88); border: 1px solid rgba(148, 163, 184, 0.45); cursor: pointer; font-size: 0.82rem; font-weight: 700; color: #f8fafc;">
                <input type="radio" name="coriaSummonRollMode" value="normal" checked />
                <span>Normal</span>
              </label>
              <label style="flex: 1; display: flex; align-items: center; justify-content: center; gap: 5px; padding: 6px 8px; border-radius: 6px; background: rgba(15, 23, 42, 0.88); border: 1px solid rgba(74, 222, 128, 0.5); cursor: pointer; font-size: 0.82rem; font-weight: 700; color: #bbf7d0;">
                <input type="radio" name="coriaSummonRollMode" value="advantage" />
                <span>Vantagem</span>
              </label>
              <label style="flex: 1; display: flex; align-items: center; justify-content: center; gap: 5px; padding: 6px 8px; border-radius: 6px; background: rgba(15, 23, 42, 0.88); border: 1px solid rgba(248, 113, 113, 0.5); cursor: pointer; font-size: 0.82rem; font-weight: 700; color: #fecaca;">
                <input type="radio" name="coriaSummonRollMode" value="disadvantage" />
                <span>Desvantagem</span>
              </label>
            </div>
          </div>
        `,
        buttons: {
          attack: {
            icon: '<i class="fas fa-crosshairs"></i>',
            label: `Atacar com ${tokenName}`,
            callback: async (html) => {
              this.clearAllTokenHoverRings();
              const root = html instanceof HTMLElement ? html : html?.[0];
              const chosenTokId =
                root?.querySelector('input[name="coriaSummonTargetToken"]:checked')?.value || preselectedTokenId;
              const rollMode =
                root?.querySelector('input[name="coriaSummonRollMode"]:checked')?.value || "normal";
              const chosenSlotLvl = isSpiritualWeapon
                ? Number(root?.querySelector("#coria-summon-slot-select")?.value || initialSlotLvl)
                : 1;
              const situationalBonus = String(
                root?.querySelector("#coria-summon-sit-bonus")?.value || ""
              ).trim();

              const targetCand = candidates.find(c => c.tokenId === chosenTokId) || candidates[0];
              if (!targetCand) return;

              // Update stored slotLevel on the token if changed
              if (isSpiritualWeapon && chosenSlotLvl !== initialSlotLvl && summonToken?.document?.isOwner) {
                try {
                  await summonToken.document.update({
                    "flags.altarion-aitusa.summonData.slotLevel": chosenSlotLvl
                  });
                } catch (_e) {
                  // ignore
                }
              }

              await this.executeSummonTokenSpellAttack({
                caster,
                summonToken,
                summonType: summonData.summonType,
                tokenName,
                img,
                slotLevel: chosenSlotLvl,
                spellAttackMod,
                situationalBonus,
                damageFormula: getDamageFormulaForSlot(chosenSlotLvl),
                damageType,
                damageTypeLabel,
                targetCand,
                rollMode
              });
            }
          },
          cancel: {
            icon: '<i class="fas fa-times"></i>',
            label: "Cancelar",
            callback: () => {
              this.clearAllTokenHoverRings();
            }
          }
        },
        default: "attack",
        render: (html) => {
          const root = html instanceof HTMLElement ? html : html?.[0];
          if (!root) return;
          root.querySelector('button[data-button="attack"]')?.classList.add("btn-arcane");
          this.bindTokenHoverHighlightListeners(root, ".coria-creature-pick-row");

          const slotSel = root.querySelector("#coria-summon-slot-select");
          const dmgPrev = root.querySelector("#coria-summon-dmg-preview");
          if (slotSel && dmgPrev) {
            slotSel.addEventListener("change", () => {
              const lvl = Number(slotSel.value || initialSlotLvl);
              dmgPrev.textContent = `${getDamageFormulaForSlot(lvl)} ${damageTypeLabel}`;
            });
          }
        },
        close: () => {
          this.clearAllTokenHoverRings();
        }
      },
      { classes: ["coria-dialog"], width: 470 }
    );
    d.render(true);
  }

  /**
   * Execute the Melee Spell Attack roll for `Spiritual Weapon` or `Tentacle of the Deeps`,
   * post the Attack Roll ChatMessage (tagged as an attack roll so all `CoriaRollLedger` d20 reactions work on it!),
   * and evaluate its Hit / Miss outcome (showing a "Roll Damage" button on Hit instead of auto-rolling damage).
   */
  static async executeSummonTokenSpellAttack({
    caster,
    summonToken,
    summonType,
    tokenName,
    img,
    slotLevel = 2,
    spellAttackMod = 5,
    situationalBonus = "",
    damageFormula = "1d8",
    damageType = "force",
    damageTypeLabel = "Force",
    targetCand,
    rollMode = "normal"
  }) {
    if (!caster || !targetCand?.actor) return;

    // Select the target token on the canvas so dnd5e & reactions see it as the active target
    if (targetCand.token?.setTarget) {
      try {
        targetCand.token.setTarget(true, { user: game.user, releaseOthers: true, groupSelection: false });
      } catch (_e) {
        // ignore
      }
    }

    const d20Expr =
      rollMode === "advantage"
        ? "2d20kh"
        : rollMode === "disadvantage"
          ? "2d20kl"
          : "1d20";
    const modSign = spellAttackMod >= 0 ? `+ ${spellAttackMod}` : `- ${Math.abs(spellAttackMod)}`;

    let sitExpr = "";
    const cleanSit = String(situationalBonus || "").trim();
    if (cleanSit) {
      sitExpr = /^[+-]/.test(cleanSit) ? cleanSit : `+ ${cleanSit}`;
    }

    const baseFormula = `${d20Expr} ${modSign}`;
    const fullFormula = sitExpr ? `${baseFormula} ${sitExpr}` : baseFormula;
    const FormulaClass = CONFIG.Dice?.D20Roll || Roll;
    let atkRoll = null;
    try {
      atkRoll = await new FormulaClass(fullFormula, caster.getRollData?.() || {}).evaluate();
    } catch (_e) {
      try {
        atkRoll = await new Roll(fullFormula, caster.getRollData?.() || {}).evaluate();
      } catch (_e2) {
        ui.notifications?.warn?.(
          `[${tokenName}] Bônus situacional inválido ("${cleanSit}") — rolando sem o bônus situacional.`
        );
        atkRoll = await new FormulaClass(baseFormula).evaluate();
        sitExpr = "";
      }
    }

    const d20Term =
      atkRoll.terms?.find(t => t?.faces === 20) ||
      atkRoll.dice?.find(d => d?.faces === 20) ||
      null;
    const nat = Number(
      d20Term?.results?.find(r => r.active)?.result ??
        d20Term?.results?.[0]?.result ??
        10
    );
    const total = Number(atkRoll.total ?? 10);
    const targetAc = Number(targetCand.actor?.system?.attributes?.ac?.value ?? targetCand.ac ?? 10);

    const summonAttackContext = {
      summonType,
      tokenName,
      img,
      casterActorId: caster.id,
      casterName: caster.name,
      slotLevel: Number(slotLevel || 1),
      damageFormula,
      damageType,
      damageTypeLabel,
      targetUuid: targetCand.uuid,
      targetActorId: targetCand.actor.id,
      targetTokenId: targetCand.tokenId,
      targetName: targetCand.name,
      targetAc,
      lastTotal: total,
      lastNat: nat,
      lastSourceLabel: "",
      damageRolled: false,
      rolledFormulaText: "",
      appliedDamage: 0,
      slowApplied: false,
      outcomeCardMsgId: ""
    };

    const atkMsg = await atkRoll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: caster }),
      flavor: `<strong>${foundry.utils.escapeHTML(tokenName)} — Melee Spell Attack</strong> vs <strong>${foundry.utils.escapeHTML(
        targetCand.name
      )}</strong>${
        rollMode === "advantage"
          ? " (Advantage)"
          : rollMode === "disadvantage"
            ? " (Disadvantage)"
            : ""
      }${sitExpr ? ` <em>[Bonus: ${foundry.utils.escapeHTML(sitExpr)}]</em>` : ""}`,
      flags: {
        dnd5e: {
          roll: {
            type: "attack"
          },
          targets: [
            {
              name: targetCand.name,
              img: targetCand.img,
              uuid: targetCand.uuid,
              ac: targetAc
            }
          ]
        },
        "altarion-aitusa": {
          isSummonSpellAttack: true,
          summonAttackContext
        }
      }
    });

    await this.evaluateSummonAttackOutcome({
      attackMessage: atkMsg,
      total,
      nat,
      targetAc,
      sourceLabel: ""
    });
  }

  /**
   * Build the HTML for a Spiritual Weapon / Tentacle of the Deeps Hit/Miss Outcome Chat Card.
   * - On Hit before damage is rolled: shows a "Roll Damage" button (clickable by Flinn, Parva, or GM).
   * - On Hit after damage is rolled: displays the rolled damage breakdown, automatic application confirmation,
   *   and toggleable Undo / Re-apply buttons.
   * - On Miss: displays the Miss outcome cleanly.
   */
  static buildSummonOutcomeCardHtml(ctx, { attackMsgId = "", cardMsgId = "", isHit = false, isCrit = false, total = 10, nat = 10, effAc = 10, sourceLabel = "" } = {}) {
    const isTentacle = ctx.summonType === "tentacle-of-the-deeps";
    const damageRolled = Boolean(ctx.damageRolled && Number(ctx.appliedDamage || 0) > 0);
    const damageTotal = Number(ctx.appliedDamage || 0);

    const modBanner = sourceLabel
      ? `<div style="margin-bottom: 4px; color: #7dd3fc; font-weight: 700;"><i class="fas fa-bolt"></i> Modified by <strong>${foundry.utils.escapeHTML(
          sourceLabel
        )}</strong> &rarr; Total <strong>${total}</strong> (d20 = ${nat}) vs AC <strong>${effAc}</strong></div>`
      : "";

    let title = "";
    let bodyHtml = "";
    let buttonsHtml = "";

    if (!isHit) {
      title = `${ctx.tokenName} — Attack Missed${sourceLabel ? ` (${sourceLabel})` : ""}`;
      bodyHtml = `
        ${modBanner}
        <strong>${foundry.utils.escapeHTML(ctx.tokenName)}</strong> missed <strong>${foundry.utils.escapeHTML(
          ctx.targetName
        )}</strong> (<strong class="coria-hl-failure">${total}</strong> vs AC <strong>${effAc}</strong>).
      `;
    } else if (!damageRolled) {
      const displayFormula = isCrit
        ? String(ctx.damageFormula || "1d8").replace(/^(\d+)d(\d+)/i, (_m, c, f) => `${Number(c) * 2}d${f}`)
        : String(ctx.damageFormula || "1d8");
      title = `${ctx.tokenName} — ${isCrit ? "Critical Hit!" : "Attack Hit!"}`;
      bodyHtml = `
        ${modBanner}
        <strong>${foundry.utils.escapeHTML(ctx.tokenName)}</strong> hit <strong>${foundry.utils.escapeHTML(
          ctx.targetName
        )}</strong> (<strong class="coria-hl-success">${total}</strong> vs AC <strong>${effAc}</strong>${
          isCrit ? " — <strong class=\"coria-hl-gold\">CRITICAL!</strong>" : ""
        })!
        ${
          isTentacle
            ? `<br>&bull; <strong class="coria-hl-info">Tentacle of the Deeps:</strong> <strong>${foundry.utils.escapeHTML(
                ctx.targetName
              )}</strong>'s movement speed is reduced by <strong>10 feet</strong> until the start of <strong>${foundry.utils.escapeHTML(
                ctx.casterName
              )}</strong>'s next turn!`
            : ""
        }
      `;
      buttonsHtml = `
        <button type="button" class="coria-min-card-btn-primary coria-summon-roll-dmg-btn"
                data-attack-msg-id="${attackMsgId}"
                data-card-msg-id="${cardMsgId}">
          <i class="fas fa-dice-d20"></i> Roll Damage (${foundry.utils.escapeHTML(displayFormula)} ${foundry.utils.escapeHTML(
            ctx.damageTypeLabel
          )})
        </button>
      `;
    } else {
      title = `${ctx.tokenName} — ${isCrit ? "Critical Hit!" : "Attack Hit!"} (${damageTotal} ${ctx.damageTypeLabel})`;
      const breakdownLine = ctx.rolledFormulaText
        ? `<div class="coria-summon-roll-breakdown"><i class="fas fa-dice"></i> Roll: <code>${foundry.utils.escapeHTML(
            ctx.rolledFormulaText
          )}</code> &rarr; <strong class="coria-summon-dmg-val"><span class="coria-custom-dmg-num">${damageTotal}</span> ${foundry.utils.escapeHTML(
            ctx.damageTypeLabel
          )}</strong></div>`
        : "";
      bodyHtml = `
        ${modBanner}
        <strong>${foundry.utils.escapeHTML(ctx.tokenName)}</strong> hit <strong>${foundry.utils.escapeHTML(
          ctx.targetName
        )}</strong> (<strong class="coria-hl-success">${total}</strong> vs AC <strong>${effAc}</strong>) and automatically applied <strong><span class="coria-custom-dmg-num">${damageTotal}</span> ${foundry.utils.escapeHTML(
          ctx.damageTypeLabel
        )} damage</strong>!
        ${breakdownLine}
        ${
          isTentacle
            ? `<br>&bull; <strong class="coria-hl-info">Tentacle of the Deeps:</strong> <strong>${foundry.utils.escapeHTML(
                ctx.targetName
              )}</strong>'s movement speed is reduced by <strong>10 feet</strong> until the start of <strong>${foundry.utils.escapeHTML(
                ctx.casterName
              )}</strong>'s next turn!`
            : ""
        }
      `;
      buttonsHtml = `
        <button type="button" class="coria-min-card-btn-secondary coria-summon-atk-undo-btn"
                data-target-uuid="${ctx.targetUuid}"
                data-target-actor-id="${ctx.targetActorId}"
                data-damage="${damageTotal}"
                data-summon-label="${foundry.utils.escapeHTML(ctx.tokenName)}"
                data-remove-slow="${isTentacle ? "true" : "false"}">
          <i class="fas fa-undo"></i> Undo (+${damageTotal} HP${isTentacle ? " & Speed" : ""})
        </button>
        <button type="button" class="coria-min-card-btn-primary coria-summon-atk-reapply-btn"
                data-target-uuid="${ctx.targetUuid}"
                data-target-actor-id="${ctx.targetActorId}"
                data-damage="${damageTotal}"
                data-damage-type="${ctx.damageType}"
                data-summon-label="${foundry.utils.escapeHTML(ctx.tokenName)}"
                data-apply-slow="${isTentacle ? "true" : "false"}"
                data-caster-actor-id="${ctx.casterActorId}"
                disabled>
          <i class="fas fa-bolt"></i> Re-apply (${damageTotal} ${ctx.damageTypeLabel})
        </button>
      `;
    }

    return `
      <div class="altarion-aitusa-ward-chat-tag altarion-arcane-armor-chat-card">
        <div class="altarion-ward-header">
          <i class="fas ${isTentacle ? "fa-water" : "fa-hat-wizard"}"></i>
          <span>${foundry.utils.escapeHTML(title)}</span>
        </div>
        <div class="altarion-ward-body">
          ${bodyHtml}
        </div>
        ${buttonsHtml ? `<div class="altarion-arcane-armor-btn-row" style="flex-wrap:wrap;">${buttonsHtml}</div>` : ""}
      </div>
    `;
  }

  /**
   * Evaluate (or re-evaluate after a `CoriaRollLedger` reaction like `Portent`, `Lucky`, `Paths of Destiny`,
   * `Silvery Barbs`, or `Shield`) a `Spiritual Weapon` or `Tentacle of the Deeps` attack roll!
   */
  static async evaluateSummonAttackOutcome({
    attackMessage,
    total,
    nat,
    targetAc = null,
    sourceLabel = ""
  }) {
    if (!attackMessage) return;
    const ctx = foundry.utils.deepClone(attackMessage.flags?.["altarion-aitusa"]?.summonAttackContext);
    if (!ctx) return;

    const caster = game.actors?.get(ctx.casterActorId) || null;
    const effAc = Number.isFinite(Number(targetAc)) ? Number(targetAc) : Number(ctx.targetAc || 10);
    ctx.targetAc = effAc;
    ctx.lastTotal = Number(total);
    ctx.lastNat = Number(nat);
    ctx.lastSourceLabel = sourceLabel || "";

    const isCrit = Number(nat) === 20;
    const isFumble = Number(nat) === 1;
    const isHit = isCrit || (!isFumble && Number(total) >= effAc);
    const isTentacle = ctx.summonType === "tentacle-of-the-deeps";

    // Case 1: Previously Hit, Now Missed (e.g. after Shield / Silvery Barbs / Portent) -> Revert damage & speed reduction!
    if (!isHit && (Number(ctx.appliedDamage || 0) > 0 || ctx.slowApplied)) {
      const prevDmg = Number(ctx.appliedDamage || 0);
      await this.undoSummonAttackEffect({
        targetUuid: ctx.targetUuid,
        targetActorId: ctx.targetActorId,
        damage: prevDmg,
        summonLabel: ctx.tokenName,
        removeSlow: Boolean(ctx.slowApplied)
      });
      ctx.appliedDamage = 0;
      ctx.damageRolled = false;
      ctx.rolledFormulaText = "";
      ctx.slowApplied = false;
    }

    // Case 2: Hit! For Tentacle of the Deeps, apply -10 ft Speed immediately on hit (damage awaits the Roll Damage button!)
    if (isHit && isTentacle && !ctx.slowApplied) {
      await this.applySummonAttackEffect({
        targetUuid: ctx.targetUuid,
        targetActorId: ctx.targetActorId,
        damage: 0,
        damageType: ctx.damageType,
        summonLabel: ctx.tokenName,
        applySlow: true,
        casterActorId: ctx.casterActorId
      });
      ctx.slowApplied = true;
    }

    const existingCard = ctx.outcomeCardMsgId ? game.messages?.get(ctx.outcomeCardMsgId) : null;
    if (existingCard) {
      const cardContent = this.buildSummonOutcomeCardHtml(ctx, {
        attackMsgId: attackMessage.id,
        cardMsgId: existingCard.id,
        isHit,
        isCrit,
        total,
        nat,
        effAc,
        sourceLabel
      });
      if (existingCard.isOwner) {
        await existingCard.update({ content: cardContent });
      } else if (game.socket && game.users?.activeGM) {
        game.socket.emit("module.altarion-aitusa", {
          type: "coriaUpdateSummonCardMessages",
          params: {
            cardMsgId: existingCard.id,
            cardContent,
            attackMsgId: attackMessage.id,
            summonAttackContext: ctx
          }
        });
      }
    } else {
      const initialContent = this.buildSummonOutcomeCardHtml(ctx, {
        attackMsgId: attackMessage.id,
        cardMsgId: "",
        isHit,
        isCrit,
        total,
        nat,
        effAc,
        sourceLabel
      });
      const created = await ChatMessage.create({
        speaker: caster ? ChatMessage.getSpeaker({ actor: caster }) : ChatMessage.getSpeaker(),
        content: initialContent
      });
      if (created?.id) {
        ctx.outcomeCardMsgId = created.id;
        const finalizedContent = this.buildSummonOutcomeCardHtml(ctx, {
          attackMsgId: attackMessage.id,
          cardMsgId: created.id,
          isHit,
          isCrit,
          total,
          nat,
          effAc,
          sourceLabel
        });
        await created.update({ content: finalizedContent });
      }
    }

    if (attackMessage.isOwner && attackMessage.update) {
      await attackMessage.update({
        "flags.altarion-aitusa.summonAttackContext": ctx
      });
    }
  }

  /**
   * Triggered when Flinn, Parva, or the GM clicks the "Roll Damage" button on a Spiritual Weapon /
   * Tentacle of the Deeps Hit card:
   * - Opens Foundry dnd5e's standard Damage Roll Configuration Dialog (`DamageRoll.build`) with `{ create: false }`
   *   so NO default damage roll message is sent to chat.
   * - Automatically applies the rolled damage to the target (directly or via GM socket).
   * - Edits the Hit card in-place to show the rolled damage breakdown and Undo/Re-apply controls!
   */
  static async rollSummonHitDamageFromCard(attackMsgId, cardMsgId) {
    const attackMessage = attackMsgId ? game.messages?.get(attackMsgId) : null;
    if (!attackMessage) {
      ui.notifications?.warn?.("Could not find the originating attack message for this damage roll.");
      return;
    }
    const ctx = foundry.utils.deepClone(attackMessage.flags?.["altarion-aitusa"]?.summonAttackContext);
    if (!ctx) return;

    const caster = game.actors?.get(ctx.casterActorId) || null;
    if (!game.user?.isGM && (!caster || !caster.isOwner)) {
      ui.notifications?.warn?.(
        `Apenas ${ctx.casterName || "o conjurador"} ou o Mestre pode rolar o dano de ${ctx.tokenName}!`
      );
      return;
    }

    if (ctx.damageRolled && Number(ctx.appliedDamage || 0) > 0) return;

    const nat = Number(ctx.lastNat ?? 10);
    const total = Number(ctx.lastTotal ?? 10);
    const effAc = Number(ctx.targetAc ?? 10);
    const isCrit = nat === 20;
    const isTentacle = ctx.summonType === "tentacle-of-the-deeps";

    let dmgRoll = null;
    try {
      const DamageRollCls = CONFIG.Dice?.DamageRoll;
      if (DamageRollCls && typeof DamageRollCls.build === "function") {
        const rolls = await DamageRollCls.build(
          {
            rolls: [
              {
                parts: [ctx.damageFormula || "1d8"],
                data: caster?.getRollData?.() || {},
                options: {
                  type: ctx.damageType || "force",
                  properties: ["mgc"],
                  isCritical: isCrit
                }
              }
            ],
            isCritical: isCrit,
            subject: caster
          },
          {
            configure: true,
            options: {
              title: `${ctx.tokenName} — Damage Roll (${ctx.damageTypeLabel})`
            }
          },
          {
            create: false
          }
        );
        dmgRoll = Array.isArray(rolls) ? rolls[0] : rolls;
      } else {
        let rollFormula = ctx.damageFormula || "1d8";
        if (isCrit) {
          rollFormula = rollFormula.replace(/^(\d+)d(\d+)/i, (_m, c, f) => `${Number(c) * 2}d${f}`);
        }
        dmgRoll = await new Roll(rollFormula, caster?.getRollData?.() || {}).evaluate();
      }
    } catch (_e) {
      // User closed/cancelled the standard Damage Roll Dialog
      return;
    }

    if (!dmgRoll || typeof dmgRoll.total !== "number") return;

    // Show Dice So Nice 3D roll animation without posting a separate default chat message
    try {
      if (game.dice3d) await game.dice3d.showForRoll(dmgRoll, game.user, true);
    } catch (_e) {
      // ignore
    }

    const damageTotal = Math.max(1, Number(dmgRoll.total || 1));
    const rolledFormulaText = `${dmgRoll.formula || ctx.damageFormula} = ${dmgRoll.result || damageTotal}`;

    const targetActorPre = await this.resolveActorFromUuidOrId(ctx.targetUuid, ctx.targetActorId);
    const RL = globalThis.CoriaRollLedger;
    const beforeLayers =
      targetActorPre && RL?.captureActorVitalLayers ? RL.captureActorVitalLayers(targetActorPre) : null;
    const preHp = Number(targetActorPre?.system?.attributes?.hp?.value ?? 0);
    const preTemp = Number(targetActorPre?.system?.attributes?.hp?.temp ?? 0);

    await this.applySummonAttackEffect({
      targetUuid: ctx.targetUuid,
      targetActorId: ctx.targetActorId,
      damage: damageTotal,
      damageType: ctx.damageType,
      summonLabel: ctx.tokenName,
      applySlow: isTentacle && !ctx.slowApplied,
      casterActorId: ctx.casterActorId
    });

    const targetActorPost = await this.resolveActorFromUuidOrId(ctx.targetUuid, ctx.targetActorId);
    const afterLayers =
      targetActorPost && RL?.captureActorVitalLayers ? RL.captureActorVitalLayers(targetActorPost) : null;
    const summonDamageLayers =
      beforeLayers && afterLayers && RL?.computeDamageLayersDiff
        ? RL.computeDamageLayersDiff(beforeLayers, afterLayers, damageTotal)
        : null;

    ctx.damageRolled = true;
    ctx.appliedDamage = damageTotal;
    ctx.rolledFormulaText = rolledFormulaText;
    if (isTentacle) ctx.slowApplied = true;

    const coriaCustomDamage = {
      cardKind: "summon-attack",
      sourceName: ctx.tokenName,
      attackerActorId: caster?.id || ctx.casterActorId || "",
      attackerUuid: caster?.uuid || "",
      attackerName: ctx.casterName || caster?.name || ctx.tokenName,
      targetActorId: targetActorPre?.id || ctx.targetActorId || "",
      targetUuid: targetActorPre?.uuid || ctx.targetUuid || "",
      targetName: ctx.targetName,
      damageType: ctx.damageType || "force",
      damageTypeLabel: ctx.damageTypeLabel || "Force",
      origDamage: damageTotal,
      currentDamage: damageTotal,
      autoApplied: true,
      preHp,
      preTemp,
      damageLayers: summonDamageLayers
    };

    const targetCardId = cardMsgId || ctx.outcomeCardMsgId;
    const cardMsg = targetCardId ? game.messages?.get(targetCardId) : null;
    const updatedHtml = this.buildSummonOutcomeCardHtml(ctx, {
      attackMsgId: attackMessage.id,
      cardMsgId: targetCardId,
      isHit: true,
      isCrit,
      total,
      nat,
      effAc,
      sourceLabel: ctx.lastSourceLabel || ""
    });

    if (cardMsg?.isOwner) {
      await cardMsg.update({
        content: updatedHtml,
        "flags.altarion-aitusa.coriaCustomDamage": coriaCustomDamage
      });
      if (attackMessage.isOwner) {
        await attackMessage.update({ "flags.altarion-aitusa.summonAttackContext": ctx });
      }
    } else if (game.socket && game.users?.activeGM) {
      game.socket.emit("module.altarion-aitusa", {
        type: "coriaUpdateSummonCardMessages",
        params: {
          cardMsgId: targetCardId,
          cardContent: updatedHtml,
          coriaCustomDamage,
          attackMsgId: attackMessage.id,
          summonAttackContext: ctx
        }
      });
    }
  }

  static async applySummonAttackEffect({
    targetUuid = "",
    targetActorId = "",
    damage = 0,
    damageType = "force",
    summonLabel = "Spiritual Weapon",
    applySlow = false,
    casterActorId = ""
  }) {
    const targetActor = await this.resolveActorFromUuidOrId(targetUuid, targetActorId);
    if (targetActor?.isOwner) {
      await this._gmApplySummonAttackEffectPayload({
        targetUuid,
        targetActorId,
        damage,
        damageType,
        summonLabel,
        applySlow,
        casterActorId
      });
    } else if (game.socket && game.users?.activeGM) {
      game.socket.emit("module.altarion-aitusa", {
        type: "coriaApplySummonAttackEffect",
        params: {
          targetUuid,
          targetActorId,
          damage,
          damageType,
          summonLabel,
          applySlow,
          casterActorId
        }
      });
    }
  }

  static async undoSummonAttackEffect({
    targetUuid = "",
    targetActorId = "",
    damage = 0,
    summonLabel = "Spiritual Weapon",
    removeSlow = false,
    cardMsgId = ""
  }) {
    const targetActor = await this.resolveActorFromUuidOrId(targetUuid, targetActorId);
    if (targetActor?.isOwner) {
      await this._gmUndoSummonAttackEffectPayload({
        targetUuid,
        targetActorId,
        damage,
        summonLabel,
        removeSlow,
        cardMsgId
      });
    } else if (game.socket && game.users?.activeGM) {
      game.socket.emit("module.altarion-aitusa", {
        type: "coriaUndoSummonAttackEffect",
        params: {
          targetUuid,
          targetActorId,
          damage,
          summonLabel,
          removeSlow,
          cardMsgId
        }
      });
    }
  }

  static async _gmApplySummonAttackEffectPayload({
    targetUuid = "",
    targetActorId = "",
    damage = 0,
    damageType = "force",
    summonLabel = "Spiritual Weapon",
    applySlow = false,
    casterActorId = ""
  }) {
    const targetActor = await this.resolveActorFromUuidOrId(targetUuid, targetActorId);
    if (!targetActor || !targetActor.isOwner) return;

    const dmgVal = Math.max(0, Number(damage || 0));
    if (dmgVal > 0) {
      await this.applyRetaliationDamageToTarget({
        attackerUuid: targetUuid,
        attackerActorId: targetActor.id,
        damage: dmgVal,
        damageType,
        armorLabel: summonLabel
      });
    }

    if (applySlow) {
      const caster = (casterActorId && game.actors?.get(casterActorId)) || this.getParvaActor();
      await this.applyOrUpdateStatusEffect(targetActor, {
        statusId: "tentacle-of-the-deeps-slow",
        name: "Tentacle of the Deeps (-10 ft Speed)",
        img: "modules/altarion-aitusa/flinn_icons/tentacle-of-the-deeps-spectral.jpg",
        description: `<p>Hit by <strong>${caster?.name || "Parva"}</strong>'s <strong>Tentacle of the Deeps</strong>: Your movement speed is reduced by <strong>10 feet</strong> until the start of ${caster?.name || "Parva"}'s next turn.</p>`,
        changes: [
          {
            key: "system.attributes.movement.walk",
            mode: CONST.ACTIVE_EFFECT_MODES.ADD,
            value: "-10",
            priority: 20
          }
        ],
        durationRounds: 1,
        durationTurns: 1,
        expiresAtStartOfTurnOf: caster?.id || casterActorId,
        extraFlags: {
          isTentacleOfTheDeepsSlow: true,
          casterActorId: caster?.id || casterActorId
        }
      });
    }
  }

  static async _gmUndoSummonAttackEffectPayload({
    targetUuid = "",
    targetActorId = "",
    damage = 0,
    summonLabel = "Spiritual Weapon",
    removeSlow = false,
    cardMsgId = ""
  }) {
    const targetActor = await this.resolveActorFromUuidOrId(targetUuid, targetActorId);
    if (!targetActor || !targetActor.isOwner) return;

    const cardMessage = cardMsgId ? game.messages?.get(cardMsgId) : null;
    const dmgVal = Math.max(0, Number(damage || 0));
    if (dmgVal > 0) {
      await this.undoRetaliationDamageOnTarget({
        attackerUuid: targetUuid,
        attackerActorId: targetActor.id,
        damage: dmgVal,
        armorLabel: summonLabel,
        damageMessage: cardMessage
      });
    }

    if (removeSlow) {
      await this.removeStatusEffect(targetActor, "tentacle-of-the-deeps-slow");
    }
  }

  /* -------------------------------------------------------------------------- */
  /*  ALTARION: ESSENCE HARVEST — GM ARCANE ECHOES MANAGER & ABJURER FIX        */
  /* -------------------------------------------------------------------------- */

  static ESSENCE_HARVEST_ECHO_CATALOG = [
    {
      echoKey: "abjurer",
      name: "Abjurer's Echo (Warding Step)",
      school: "Abjuração (Inicial)",
      img: "modules/altarion-aitusa/dr_icons/abjurers-echo.jpg",
      summary: "Ao usar Arcane Step, ganha PV temporários iguais a Proficiência + modificador de Inteligência.",
      isDefault: true
    },
    {
      echoKey: "conjurer",
      name: "Conjurer's Echo (Bounding Step)",
      school: "Conjuração",
      img: "modules/altarion-aitusa/dr_icons/conjurers-echo.jpg",
      summary: "Aumenta o alcance do teleporte de Arcane Step de 30 ft para 60 ft."
    },
    {
      echoKey: "diviner",
      name: "Diviner's Echo (Fated Step)",
      school: "Adivinhação",
      img: "modules/altarion-aitusa/dr_icons/diviners-echo.jpg",
      summary: "Concede Vantagem na próxima jogada de ataque, teste de habilidade ou salvaguarda até o fim do próximo turno."
    },
    {
      echoKey: "enchanter",
      name: "Enchanter's Echo (Beguiling Step)",
      school: "Encantamento",
      img: "modules/altarion-aitusa/dr_icons/enchanters-echo.jpg",
      summary: "Uma criatura a até 10 ft do destino faz Salvaguarda de Sabedoria ou fica Enfeitiçada (Charmed) até o início do próximo turno."
    },
    {
      echoKey: "evoker",
      name: "Evoker's Echo (Forceful Step)",
      school: "Evocação",
      img: "modules/altarion-aitusa/dr_icons/evokers-echo.jpg",
      summary: "Criaturas escolhidas a até 5 ft fazem Salvaguarda de Destreza ou sofrem 4d10 + INT de dano de Força (metade se passar). 1/SR ou LR."
    },
    {
      echoKey: "illusionist",
      name: "Illusionist's Echo (Veiled Step)",
      school: "Ilusão",
      img: "modules/altarion-aitusa/dr_icons/illusionists-echo.jpg",
      summary: "Fica Invisível até o início do próximo turno (ou até atacar, rolar dano ou forçar uma salvaguarda)."
    },
    {
      echoKey: "necromancer",
      name: "Necromancer's Echo (Weakening Step)",
      school: "Necromancia",
      img: "modules/altarion-aitusa/dr_icons/necromancers-echo.jpg",
      summary: "Uma criatura a até 15 ft tem Desvantagem na próxima salvaguarda contra uma magia sua até o fim do próximo turno. 1/SR ou LR."
    },
    {
      echoKey: "transmuter",
      name: "Transmuter's Echo (Warping Step)",
      school: "Transmutação",
      img: "modules/altarion-aitusa/dr_icons/transmuters-echo.jpg",
      summary: "Concede +2 na CA para si mesmo e um aliado voluntário a até 10 ft até o fim do próximo turno."
    }
  ];

  static _activeGMEchoesDialog = null;

  static registerEssenceHarvestEchoesGM() {
    Hooks.once("ready", async () => {
      try {
        const altarion = this.getAltarionActor();
        if (altarion?.isOwner) {
          await this.ensureAltarionEchoesAndAbjurerSanitized(altarion);
        }
        if (game.user?.isGM) {
          this.injectGMEchoesFloatingButton();
        }
      } catch (err) {
        console.warn("[Altarion & Aitusa] Error initializing Essence Harvest GM Echoes:", err);
      }
    });
  }

  /**
   * Ensure `Abjurer's Echo (Warding Step)` uses a pure `utility` activity (never a `heal` activity)
   * so using it applies `PB + INT mod` Temp HP ONCE automatically without prompting an extra chat roll.
   */
  static async sanitizeAbjurersEchoItem(item) {
    if (!item || !item.actor?.isOwner) return;
    const rawActs = item.toObject().system?.activities || {};
    const hasHealOrLegacy =
      "echoAbjurerHeal1" in rawActs ||
      Object.values(rawActs).some(a => a?.type === "heal");
    if (!hasHealOrLegacy && "echoAbjurerUtil1" in rawActs) return;

    const actPatch = {
      echoAbjurerUtil1: {
        _id: "echoAbjurerUtil1",
        type: "utility",
        name: "Warding Step (Gain Temp HP)",
        activation: {
          type: "special",
          value: null,
          condition: "When you teleport using Arcane Step",
          override: true
        },
        consumption: {
          targets: [],
          scaling: { allowed: false, max: "" },
          spellSlot: false
        },
        description: {
          chatFlavor:
            "Automatically grants Temporary Hit Points equal to Proficiency Bonus + Intelligence modifier."
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
          override: true
        },
        target: {
          template: { count: "", contiguous: false, type: "", size: "", width: "", height: "", units: "ft" },
          affects: { count: "1", type: "self", choice: false, special: "" },
          prompt: false,
          override: true
        },
        uses: { spent: 0, max: "", recovery: [] },
        roll: { prompt: false, visible: false, name: "", formula: "" },
        sort: 0
      }
    };
    for (const oldKey of Object.keys(rawActs)) {
      if (oldKey !== "echoAbjurerUtil1") {
        actPatch[`-=${oldKey}`] = null;
      }
    }
    await item.update({
      "system.activities": actPatch,
      "flags.altarion-aitusa.syncSchemaVersion": 9
    });
  }

  /**
   * Ensure Altarion starts with ONLY `Abjurer's Echo (Warding Step)` unlocked until the GM unlocks others,
   * and sanitize `Abjurer's Echo` so it never double-applies Temp HP.
   */
  static async ensureAltarionEchoesAndAbjurerSanitized(altarion) {
    if (!altarion || !altarion.isOwner) return;

    let unlocked = altarion.getFlag("altarion-aitusa", "unlockedArcaneEchoes");
    if (!Array.isArray(unlocked)) {
      unlocked = ["abjurer"];
      await altarion.setFlag("altarion-aitusa", "unlockedArcaneEchoes", unlocked);
    }
    const unlockedSet = new Set(unlocked.map(k => String(k || "").trim().toLowerCase()));
    unlockedSet.add("abjurer");

    // Remove any locked Echo items on Altarion
    const lockedIds = altarion.items
      .filter(i => {
        if (i.type !== "feat") return false;
        const fl = i.flags?.["altarion-aitusa"] || {};
        if (!fl.isArcaneEcho) return false;
        const eKey = String(fl.echoKey || "").trim().toLowerCase();
        return !unlockedSet.has(eKey);
      })
      .map(i => i.id);
    if (lockedIds.length > 0) {
      await altarion.deleteEmbeddedDocuments("Item", lockedIds);
    }

    // Sanitize Abjurer's Echo if present
    const abjEcho = altarion.items.find(
      i => i.type === "feat" && i.name?.trim().toLowerCase().includes("abjurer's echo")
    );
    if (abjEcho) {
      await this.sanitizeAbjurersEchoItem(abjEcho);
    }
  }

  static injectGMEchoesFloatingButton() {
    if (!game.user?.isGM) return;
    if (document.getElementById("coria-echoes-floating-btn")) return;

    const btn = document.createElement("div");
    btn.id = "coria-echoes-floating-btn";
    btn.title = "Essence Harvest — Liberar Arcane Echoes para Altarion";
    btn.innerHTML = `<i class="fas fa-hat-wizard"></i>`;
    btn.addEventListener("click", () => this.openGMEssenceHarvestEchoesDialog());
    document.body.appendChild(btn);
  }

  static async grantOrRevokeAltarionEcho(altarion, echoKey, grant = true) {
    if (!altarion || !echoKey) return;
    const cleanKey = String(echoKey).trim().toLowerCase();

    let unlocked = altarion.getFlag("altarion-aitusa", "unlockedArcaneEchoes");
    if (!Array.isArray(unlocked)) unlocked = ["abjurer"];
    const nextSet = new Set(unlocked.map(k => String(k || "").trim().toLowerCase()));
    nextSet.add("abjurer");

    if (grant) nextSet.add(cleanKey);
    else if (cleanKey !== "abjurer") nextSet.delete(cleanKey);

    await altarion.setFlag("altarion-aitusa", "unlockedArcaneEchoes", Array.from(nextSet));

    if (grant) {
      // Check if the item already exists on Altarion
      const existing = altarion.items.find(
        i =>
          i.type === "feat" &&
          i.flags?.["altarion-aitusa"]?.isArcaneEcho &&
          String(i.flags?.["altarion-aitusa"]?.echoKey || "").toLowerCase() === cleanKey
      );
      if (!existing && globalThis.PlutoniumDataBridge?.pBuildAltarionRaceAndEchoes) {
        const { racialFeatures } = await globalThis.PlutoniumDataBridge.pBuildAltarionRaceAndEchoes();
        const echoDoc = racialFeatures?.find(
          f =>
            f.flags?.["altarion-aitusa"]?.isArcaneEcho &&
            String(f.flags?.["altarion-aitusa"]?.echoKey || "").toLowerCase() === cleanKey
        );
        if (echoDoc) {
          const raceItem = altarion.items.find(i => i.type === "race");
          const clone = foundry.utils.deepClone(echoDoc);
          if (raceItem?.id) {
            clone.flags = foundry.utils.mergeObject(clone.flags || {}, {
              dnd5e: {
                advancementOrigin: raceItem.id,
                advancementRoot: raceItem.id
              }
            });
          }
          await altarion.createEmbeddedDocuments("Item", [clone]);

          await this.sendMinimalistFeatureCard(altarion, {
            icon: "fa-sparkles",
            title: `Essence Harvest — ${clone.name} Unlocked!`,
            bodyHtml: `
              <strong>${foundry.utils.escapeHTML(altarion.name)}</strong> absorbed the arcane essence of a fallen simulacrum of Taelion!<br>
              &bull; New Arcane Echo added to sheet &amp; <strong>Arcane Step</strong> options: <strong class="coria-hl-gold">${foundry.utils.escapeHTML(
                clone.name
              )}</strong>.
            `
          });
        }
      }
      const meta = this.ESSENCE_HARVEST_ECHO_CATALOG.find(e => e.echoKey === cleanKey);
      ui.notifications?.info?.(
        `[Essence Harvest] "${meta?.name || cleanKey}" enviado para a ficha de ${altarion.name}!`
      );
    } else if (cleanKey !== "abjurer") {
      const toDelIds = altarion.items
        .filter(
          i =>
            i.type === "feat" &&
            i.flags?.["altarion-aitusa"]?.isArcaneEcho &&
            String(i.flags?.["altarion-aitusa"]?.echoKey || "").toLowerCase() === cleanKey
        )
        .map(i => i.id);
      if (toDelIds.length > 0) {
        await altarion.deleteEmbeddedDocuments("Item", toDelIds);
      }
      const meta = this.ESSENCE_HARVEST_ECHO_CATALOG.find(e => e.echoKey === cleanKey);
      ui.notifications?.info?.(
        `[Essence Harvest] "${meta?.name || cleanKey}" removido da ficha de ${altarion.name}.`
      );
    }

    if (altarion.sheet?.rendered) altarion.sheet.render(false);
  }

  static openGMEssenceHarvestEchoesDialog() {
    if (!game.user?.isGM) return;
    const altarion = this.getAltarionActor();
    if (!altarion) {
      ui.notifications?.warn?.("Ficha de Altarion não encontrada no mundo.");
      return;
    }

    if (this._activeGMEchoesDialog?.rendered) {
      try {
        this._activeGMEchoesDialog.close();
      } catch (_e) {
        // ignore
      }
    }

    const buildRowsHtml = () => {
      const unlockedRaw = altarion.getFlag("altarion-aitusa", "unlockedArcaneEchoes");
      const unlockedSet = new Set(
        (Array.isArray(unlockedRaw) ? unlockedRaw : ["abjurer"]).map(k => String(k || "").trim().toLowerCase())
      );
      unlockedSet.add("abjurer");

      return this.ESSENCE_HARVEST_ECHO_CATALOG.map(entry => {
        const isUnlocked = unlockedSet.has(entry.echoKey);
        const hasItemOnSheet = altarion.items.some(
          i =>
            i.type === "feat" &&
            i.flags?.["altarion-aitusa"]?.isArcaneEcho &&
            String(i.flags?.["altarion-aitusa"]?.echoKey || "").toLowerCase() === entry.echoKey
        );
        const active = isUnlocked && hasItemOnSheet;

        const actionBtn = entry.isDefault
          ? `<span style="padding:4px 9px; border-radius:5px; background:rgba(22,163,74,0.28); border:1px solid #4ade80; color:#bbf7d0; font-size:0.75rem; font-weight:800; white-space:nowrap;">
               <i class="fas fa-check-circle"></i> Inicial
             </span>`
          : active
            ? `<button type="button" class="coria-echo-gm-btn is-revoke" data-echo-key="${entry.echoKey}" data-echo-grant="false" style="padding:5px 10px; border-radius:5px; background:rgba(127,29,29,0.85); border:1px solid #f87171; color:#fecaca; font-size:0.76rem; font-weight:800; cursor:pointer; white-space:nowrap;">
                 <i class="fas fa-times"></i> Remover
               </button>`
            : `<button type="button" class="coria-echo-gm-btn is-grant" data-echo-key="${entry.echoKey}" data-echo-grant="true" style="padding:5px 10px; border-radius:5px; background:linear-gradient(135deg, #4f46e5, #7c3aed); border:1px solid #c4b5fd; color:#ffffff; font-size:0.76rem; font-weight:800; cursor:pointer; white-space:nowrap;">
                 <i class="fas fa-paper-plane"></i> Enviar para Ficha
               </button>`;

        return `
          <div style="display:flex; align-items:center; justify-content:space-between; gap:10px; padding:8px 10px; border-radius:7px; background:${
            active ? "rgba(30, 27, 75, 0.72)" : "rgba(10, 14, 24, 0.78)"
          }; border:1px solid ${active ? "rgba(167, 139, 250, 0.65)" : "rgba(255, 255, 255, 0.12)"};">
            <div style="display:flex; align-items:center; gap:10px; min-width:0; flex:1;">
              <img src="${entry.img}" style="width:38px; height:38px; border-radius:6px; object-fit:cover; border:1.5px solid ${
                active ? "#c4b5fd" : "#475569"
              }; flex-shrink:0;" />
              <div style="min-width:0;">
                <div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
                  <strong style="color:#f8fafc; font-size:0.88rem;">${foundry.utils.escapeHTML(entry.name)}</strong>
                  <span style="font-size:0.7rem; padding:1px 6px; border-radius:4px; background:rgba(139,92,246,0.22); border:1px solid rgba(167,139,250,0.45); color:#ddd6fe;">${foundry.utils.escapeHTML(
                    entry.school
                  )}</span>
                </div>
                <div style="font-size:0.75rem; color:#cbd5e1; margin-top:2px; line-height:1.3;">
                  ${foundry.utils.escapeHTML(entry.summary)}
                </div>
              </div>
            </div>
            <div style="flex-shrink:0;">
              ${actionBtn}
            </div>
          </div>
        `;
      }).join("");
    };

    const d = createV2Dialog(
      {
        title: `Essence Harvest — Arcane Echoes (${altarion.name})`,
        content: `
          <div class="coria-arcane-box" style="text-align:left; padding:12px 14px;">
            <h3 style="text-align:center; margin:0 0 6px 0;">Essence Harvest — Simulacros de Taelion</h3>
            <p style="font-size:0.82rem; color:#cbd5e1; text-align:center; margin:0 0 10px 0;">
              Libere os <strong>Arcane Echoes</strong> na ficha de <strong>${foundry.utils.escapeHTML(
                altarion.name
              )}</strong> conforme os simulacros de Taelion forem destruídos na campanha.
            </p>
            <div class="coria-gm-echoes-list" style="display:flex; flex-direction:column; gap:7px; max-height:430px; overflow-y:auto; padding-right:4px;">
              ${buildRowsHtml()}
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

          const bindRowButtons = () => {
            for (const btn of root.querySelectorAll(".coria-echo-gm-btn")) {
              btn.addEventListener("click", async (ev) => {
                ev.preventDefault();
                ev.stopPropagation();
                const echoKey = btn.getAttribute("data-echo-key");
                const grant = btn.getAttribute("data-echo-grant") === "true";
                btn.disabled = true;
                btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i>`;
                await this.grantOrRevokeAltarionEcho(altarion, echoKey, grant);
                const listEl = root.querySelector(".coria-gm-echoes-list");
                if (listEl) {
                  listEl.innerHTML = buildRowsHtml();
                  bindRowButtons();
                }
              });
            }
          };
          bindRowButtons();
        },
        close: () => {
          if (this._activeGMEchoesDialog === d) {
            this._activeGMEchoesDialog = null;
          }
        }
      },
      { classes: ["coria-dialog"], width: 590 }
    );
    this._activeGMEchoesDialog = d;
    d.render(true);
  }

  /* -------------------------------------------------------------------------- */
  /*  KYRION: DARK VITALITY (Passive Status Effect Automation)                  */
  /*  - Necrotic & Poison damage -> 0 damage taken, restores HP by same amount  */
  /*  - Healing effects -> 0 HP restored, deals equal damage + reaction buttons */
  /* -------------------------------------------------------------------------- */

  static isDarkVitalityActive(actor) {
    if (!actor) return false;
    return Boolean(
      actor.effects?.some(
        e =>
          !e.disabled &&
          (e.statuses?.has?.("dark-vitality") ||
            e.flags?.["altarion-aitusa"]?.statusId === "dark-vitality" ||
            e.flags?.["altarion-aitusa"]?.isDarkVitalityEffect ||
            e.name?.trim().toLowerCase() === "dark vitality")
      )
    );
  }

  static async ensureKyrionDarkVitalityEffect(actor) {
    if (!actor || !actor.isOwner || !this.isKyrion(actor)) return;
    const existing = actor.effects?.find(
      e =>
        e.statuses?.has?.("dark-vitality") ||
        e.flags?.["altarion-aitusa"]?.statusId === "dark-vitality" ||
        e.flags?.["altarion-aitusa"]?.isDarkVitalityEffect ||
        e.name?.trim().toLowerCase() === "dark vitality"
    );
    if (existing) {
      const targetImg = "modules/altarion-aitusa/kyrion_icons/dark-vitality.jpg";
      if (existing.img !== targetImg) {
        try {
          await existing.update({ img: targetImg });
        } catch (_e) {}
      }
      return;
    }

    try {
      await actor.createEmbeddedDocuments("ActiveEffect", [
        {
          name: "Dark Vitality",
          img: "modules/altarion-aitusa/kyrion_icons/dark-vitality.jpg",
          description:
            "<p><strong>Dark Vitality (Passive):</strong> Necrotic and Poison damage instead heal you for the same amount (0 damage taken). Healing effects instead deal damage to you equal to the amount of Hit Points you would have regained.</p>",
          disabled: false,
          statuses: ["dark-vitality"],
          changes: [],
          flags: {
            "altarion-aitusa": {
              statusId: "dark-vitality",
              isDarkVitalityEffect: true,
              isPassiveEffect: true
            }
          }
        }
      ]);
    } catch (err) {
      console.warn("[Dark Vitality] Could not create passive Dark Vitality effect on Kyrion:", err);
    }
  }

  static registerKyrionDarkVitalityHooks() {
    Hooks.once("ready", async () => {
      const kyrion = this.getKyrionActor();
      if (kyrion?.isOwner) {
        await this.ensureKyrionDarkVitalityEffect(kyrion);
      }
    });

    // 1. Intercept damage & healing BEFORE dnd5e applies resistances/immunities/negation
    Hooks.on("dnd5e.preCalculateDamage", (actor, damages, options) => {
      try {
        if (!actor || !this.isDarkVitalityActive(actor)) return;
        if (options?.coriaDarkVitalityBypass || options?.coriaDamageReactionInternal) return;
        if (!Array.isArray(damages) || damages.length === 0) return;

        const mult = Number(options?.multiplier ?? 1);
        if (mult === 0) return;

        const absorbedEntries = [];
        const invertedHealEntries = [];

        for (const d of damages) {
          if (!d || typeof d !== "object") continue;
          const val = Number(d.value || 0);
          if (val === 0) continue;
          const dType = String(d.type || "").trim().toLowerCase();

          // A. Necrotic or Poison damage -> Convert into full HP healing (ignores resistance/immunity)
          if ((dType === "necrotic" || dType === "poison") && val > 0 && mult > 0) {
            const effAmt = Math.max(1, Math.trunc(val * mult));
            absorbedEntries.push({
              origType: dType,
              origLabel: dType === "poison" ? "Poison" : "Necrotic",
              amount: effAmt
            });
            d.type = "healing";
            d._fromDarkVitality = true;
            if (options.only === "damage") options.only = undefined;
            continue;
          }

          // B. Healing effect -> Convert into unresisted damage of equal amount
          const isExplicitHealing = dType === "healing" && !d._fromDarkVitality && val > 0 && mult > 0;
          const isNegativeHealClick =
            !d._fromDarkVitality &&
            dType !== "temphp" &&
            dType !== "maximum" &&
            ((val > 0 && mult < 0) || (val < 0 && mult > 0));

          if (isExplicitHealing || isNegativeHealClick) {
            const healAmt = Math.max(1, Math.trunc(Math.abs(val * mult)));
            invertedHealEntries.push({ amount: healAmt });
            d.type = "darkvitality";
            d.value = mult < 0 ? -Math.abs(val) : Math.abs(val);
            if (options.only === "healing") options.only = undefined;
          }
        }

        if (absorbedEntries.length > 0) {
          options._darkVitalityAbsorbed = absorbedEntries;
          options._darkVitalityPreHp = Number(actor.system?.attributes?.hp?.value ?? 0);
        }
        if (invertedHealEntries.length > 0) {
          options._darkVitalityInvertedHeal = invertedHealEntries;
          options._darkVitalityPreHp = Number(actor.system?.attributes?.hp?.value ?? 0);
          options._darkVitalityPreTemp = Number(actor.system?.attributes?.hp?.temp ?? 0);
        }
      } catch (err) {
        console.warn("[Dark Vitality] preCalculateDamage error:", err);
      }
    });

    // 2. Post styled chat cards when Dark Vitality ACTUALLY applies (never on tooltip previews!)
    Hooks.on("dnd5e.applyDamage", async (actor, amount, options) => {
      try {
        if (!actor) return;

        // A. Necrotic / Poison Absorbed into HP Healing
        if (Array.isArray(options?._darkVitalityAbsorbed) && options._darkVitalityAbsorbed.length > 0) {
          const totalHealed = options._darkVitalityAbsorbed.reduce((s, e) => s + Number(e.amount || 0), 0);
          const preHp = Number(options._darkVitalityPreHp ?? actor.system?.attributes?.hp?.value ?? 0);
          const breakdown = options._darkVitalityAbsorbed
            .map(e => `<strong>${e.amount} ${foundry.utils.escapeHTML(e.origLabel)}</strong>`)
            .join(" + ");

          await this.sendMinimalistFeatureCard(actor, {
            icon: "fa-biohazard",
            title: `Dark Vitality — Absorbed +${totalHealed} HP!`,
            bodyHtml: `
              <strong>${foundry.utils.escapeHTML(actor.name)}</strong>'s <strong>Dark Vitality</strong> absorbed incoming ${breakdown} damage!<br>
              &bull; <strong>Damage Negated:</strong> <strong>0</strong> damage taken &rarr; Restored <strong class="coria-hl-success">+${totalHealed} HP</strong>!
            `,
            buttonsHtml: `
              <button type="button" class="coria-min-card-btn-secondary coria-dv-absorb-undo-btn"
                      data-target-uuid="${actor.uuid}"
                      data-target-actor-id="${actor.id}"
                      data-prev-hp="${preHp}"
                      style="width:100%;">
                <i class="fas fa-undo"></i> Undo Absorption (HP &rarr; ${preHp})
              </button>
            `,
            flags: {
              isDarkVitalityCard: true,
              isDamageReactionCard: true
            }
          });
        }

        // B. Healing Inverted into Damage -> Expose full Damage Reaction Buttons (Project Ward, Echoing Ward, Shadow Rebuke, etc.)!
        if (Array.isArray(options?._darkVitalityInvertedHeal) && options._darkVitalityInvertedHeal.length > 0) {
          const totalDmg = options._darkVitalityInvertedHeal.reduce((s, e) => s + Number(e.amount || 0), 0);
          if (totalDmg <= 0) return;

          const preHp = Number(options._darkVitalityPreHp ?? actor.system?.attributes?.hp?.value ?? 0);
          const preTemp = Number(options._darkVitalityPreTemp ?? actor.system?.attributes?.hp?.temp ?? 0);
          const RL = globalThis.CoriaRollLedger;
          const dvDamageLayers = RL?.computeDamageLayersDiff
            ? RL.computeDamageLayersDiff(
                { hp: preHp, temp: preTemp, ward: 0, wardMax: 0, wardActive: false },
                RL.captureActorVitalLayers(actor),
                totalDmg
              )
            : null;
          if (dvDamageLayers && RL?.pushActorDamageLayerEvent) {
            RL.pushActorDamageLayerEvent(actor, dvDamageLayers, "");
          }

          // Try to identify the creature that cast the healing effect
          let sourceMsg = options?.originatingMessage || null;
          if (!sourceMsg) {
            sourceMsg = Array.from(game.messages || [])
              .slice(-8)
              .reverse()
              .find(m => {
                if (!m || Date.now() - Number(m.timestamp || 0) > 20000) return false;
                const dndRollType = String(m.flags?.dnd5e?.roll?.type || "").toLowerCase();
                const rType = String(m.rolls?.[0]?.options?.type || "").toLowerCase();
                return dndRollType === "healing" || rType === "healing";
              }) || null;
          }

          const healerActor =
            (sourceMsg?.speaker && ChatMessage.getSpeakerActor?.(sourceMsg.speaker)) ||
            (sourceMsg?.speaker?.actor && game.actors?.get(sourceMsg.speaker.actor)) ||
            actor;
          const healerName = healerActor?.name || actor.name;

          await this.sendMinimalistFeatureCard(actor, {
            icon: "fa-skull",
            title: `Dark Vitality — Healing Inverted (-${totalDmg} HP)!`,
            bodyHtml: `
              Restorative magic violently backfired against <strong>${foundry.utils.escapeHTML(actor.name)}</strong>'s shadow-infused vessel!<br>
              &bull; <strong>Inverted Mending:</strong> Instead of regaining HP, <strong>${foundry.utils.escapeHTML(actor.name)}</strong> took <strong class="coria-hl-failure"><span class="coria-custom-dmg-num">${totalDmg}</span> Dark Vitality damage</strong>!
            `,
            buttonsHtml: `
              <button type="button" class="coria-min-card-btn-secondary coria-dv-undo-btn"
                      data-target-uuid="${actor.uuid}"
                      data-target-actor-id="${actor.id}"
                      data-damage="${totalDmg}">
                <i class="fas fa-undo"></i> Undo (+${totalDmg} HP)
              </button>
              <button type="button" class="coria-min-card-btn-primary coria-dv-reapply-btn"
                      data-target-uuid="${actor.uuid}"
                      data-target-actor-id="${actor.id}"
                      data-damage="${totalDmg}"
                      disabled>
                <i class="fas fa-bolt"></i> Re-apply (${totalDmg} Dark Vitality)
              </button>
            `,
            flags: {
              isDarkVitalityCard: true,
              coriaCustomDamage: {
                cardKind: "dark-vitality",
                sourceName: "Dark Vitality (Healing Inversion)",
                attackerActorId: healerActor?.id || actor.id,
                attackerUuid: healerActor?.uuid || actor.uuid,
                attackerName: healerName,
                targetActorId: actor.id,
                targetUuid: actor.uuid,
                targetName: actor.name,
                damageType: "untyped",
                damageTypeLabel: "Dark Vitality",
                origDamage: totalDmg,
                currentDamage: totalDmg,
                autoApplied: true,
                preHp,
                preTemp,
                damageLayers: dvDamageLayers
              }
            }
          });
        }
      } catch (err) {
        console.warn("[Dark Vitality] applyDamage post-hook error:", err);
      }
    });
  }
}

globalThis.AltarionAutomationManager = AltarionAutomationManager;
