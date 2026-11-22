/**
 * CoriaAttunementSlots — Baldur's Gate 3-Style Paper-Doll Magic Item Attunement Interface
 * - Replaces D&D 5e's flat 3-item attunement cap with 13 visual equipment slots around the
 *   character's transparent-background full-body Idle art:
 *     Left column (with body callout arrows): Head, Cloak, Gloves/Wrist, Shoes
 *     Right column top (with body callout arrows): Necklace/Amulet, Armor, Belt/Waist
 *     Right column bottom (no arrows): Rings (x2), Trinkets (x2)
 *     Bottom center (no arrows): Main-Hand / Off-Hand (x2 — automatically collapses to 1 centered slot for Two-Handed weapons!)
 * - `[+]` slot button styled & working like Kyrion's "Alimentar a Fome" item picker:
 *   clicking `[+]` opens a visual item picker; selecting an item replaces `[+]` with the item's icon + name
 *   and switches the side button between "Sintonizar" (purple) and "Quebrar Sintonização" (red unlink icon).
 * - Dedicated Right-Click Header Color Customizer with a bespoke real-time Paper-Doll live preview.
 */

import { createV2Dialog, CoriaHeaderColorManager } from "./dialog-v2.js";
import { isIgnoredBackupActor, shouldThisClientRunAutoSync } from "./sync-guard.js";

const MODULE_ID = "altarion-aitusa";

export class CoriaAttunementSlots {
  static SLOTS = [
    // Left column (with SVG callout arrows)
    { id: "head", category: "head", side: "left", hasArrow: true, label: "Head", hint: "Elmos, tiaras, coroas, chapéus, óculos", icon: "fa-hat-wizard" },
    { id: "cloak", category: "cloak", side: "left", hasArrow: true, label: "Cloak", hint: "Capas, mantos, asas", icon: "fa-user-secret" },
    { id: "hands", category: "hands", side: "left", hasArrow: true, label: "Gloves/Wrist", hint: "Luvas, manoplas, braçadeiras", icon: "fa-hand-fist" },
    { id: "feet", category: "feet", side: "left", hasArrow: true, label: "Shoes", hint: "Botas, sapatos, sandálias, grevas", icon: "fa-shoe-prints" },

    // Right column top (with SVG callout arrows)
    { id: "neck", category: "neck", side: "right", hasArrow: true, label: "Necklace/Amulet", hint: "Amuletos, colares, medalhões, periaptos", icon: "fa-gem" },
    { id: "armor", category: "armor", side: "right", hasArrow: true, label: "Armor", hint: "Armaduras mágicas, vestes, robes", icon: "fa-shield-halved" },
    { id: "belt", category: "belt", side: "right", hasArrow: true, label: "Belt/Waist", hint: "Cintos, faixas, cinturões", icon: "fa-ribbon" },

    // Right column bottom (no arrows)
    { id: "ring1", category: "ring", side: "rings", hasArrow: false, label: "Ring 1", hint: "Anéis mágicos", icon: "fa-ring" },
    { id: "ring2", category: "ring", side: "rings", hasArrow: false, label: "Ring 2", hint: "Anéis mágicos", icon: "fa-ring" },
    { id: "trinket1", category: "trinket", side: "trinkets", hasArrow: false, label: "Trinket 1", hint: "Itens maravilhosos, cartas arcanas, talismãs", icon: "fa-star" },
    { id: "trinket2", category: "trinket", side: "trinkets", hasArrow: false, label: "Trinket 2", hint: "Itens maravilhosos, cartas arcanas, talismãs", icon: "fa-star" },

    // Bottom center (no arrows — collapses to 1 centered slot if a Two-Handed weapon is placed!)
    { id: "weapon1", category: "weapon", side: "hands-gear", hasArrow: false, label: "Main-Hand", hint: "Arma principal, grimório, cajado, varinha ou foco", icon: "fa-wand-magic-sparkles" },
    { id: "weapon2", category: "weapon", side: "hands-gear", hasArrow: false, label: "Off-Hand", hint: "Arma secundária, escudo mágico ou segundo foco", icon: "fa-khanda" }
  ];

  // Transparent-background full-body Idle portraits + custom body anchor points (x%, y% inside character figure box)
  static PARTY_IDLE_PROFILES = {
    altarion: {
      img: "modules/altarion-aitusa/party_idle/altarion-idle.png",
      anchors: {
        head: { x: 35, y: 9 },
        cloak: { x: 34, y: 24 },
        hands: { x: 25, y: 46 },
        feet: { x: 36, y: 90 },
        neck: { x: 52, y: 17 },
        armor: { x: 55, y: 29 },
        belt: { x: 50, y: 42 }
      }
    },
    aitusa: {
      img: "modules/altarion-aitusa/party_idle/aitusa-idle.png",
      anchors: {
        head: { x: 53, y: 19 },
        cloak: { x: 32, y: 34 },
        hands: { x: 54, y: 66 },
        feet: { x: 26, y: 88 },
        neck: { x: 70, y: 37 },
        armor: { x: 74, y: 54 },
        belt: { x: 58, y: 62 }
      }
    },
    kyrion: {
      img: "modules/altarion-aitusa/party_idle/kyrion-idle.png",
      anchors: {
        head: { x: 33, y: 12 },
        cloak: { x: 34, y: 27 },
        hands: { x: 20, y: 49 },
        feet: { x: 33, y: 91 },
        neck: { x: 53, y: 22 },
        armor: { x: 56, y: 34 },
        belt: { x: 51, y: 44 }
      }
    },
    flinn: {
      img: "modules/altarion-aitusa/party_idle/flinn-idle-v2.png",
      isSmallStature: true,
      anchors: {
        head: { x: 32, y: 13 },
        cloak: { x: 26, y: 31 },
        hands: { x: 11, y: 56 },
        feet: { x: 31, y: 90 },
        neck: { x: 47, y: 26 },
        armor: { x: 49, y: 40 },
        belt: { x: 48, y: 52 }
      }
    },
    parva: {
      img: "modules/altarion-aitusa/party_idle/parva-idle.png",
      anchors: {
        head: { x: 37, y: 9 },
        cloak: { x: 34, y: 23 },
        hands: { x: 21, y: 47 },
        feet: { x: 36, y: 91 },
        neck: { x: 54, y: 18 },
        armor: { x: 56, y: 30 },
        belt: { x: 53, y: 43 }
      }
    }
  };

  static DEFAULT_ATTUNEMENT_THEME = {
    windowBg: { mode: "gradient", color1: "#181426", color2: "#0d0b17" },
    headerBg: { mode: "gradient", color1: "#2a1d44", color2: "#191229" },
    accentColor: "#38bdf8",
    slotBg: { mode: "gradient", color1: "#261f3d", color2: "#18132a" },
    attuneBtnBg: { mode: "gradient", color1: "#7c3aed", color2: "#5b21b6" },
    unattuneBtnBg: { mode: "gradient", color1: "#dc2626", color2: "#991b1b" },
    textColor: "#f1f5f9"
  };

  static _internalAttuneBypass = new Set();
  static _openDialogsByActor = new Map();

  static init() {
    globalThis.CoriaAttunementSlots = this;
    this.registerHooks();
  }

  static getTotalSlotCount() {
    return this.SLOTS.length;
  }

  static getSlotDef(slotId) {
    return this.SLOTS.find(s => s.id === slotId) || null;
  }

  static getIdleProfileForActor(actor) {
    if (!actor || isIgnoredBackupActor(actor)) {
      return {
        img: actor?.img || "icons/svg/mystery-man.svg",
        anchors: this.PARTY_IDLE_PROFILES.altarion.anchors
      };
    }
    const n = String(actor?.name || "").trim().toLowerCase();
    if (n === "aitusa" || n.startsWith("aitusa ")) return this.PARTY_IDLE_PROFILES.aitusa;
    if (n === "altarion" || n === "altarion talendris" || n.startsWith("altarion ")) return this.PARTY_IDLE_PROFILES.altarion;
    if (n === "flinn" || n === "flinn encantor" || n.startsWith("flinn ")) return this.PARTY_IDLE_PROFILES.flinn;
    if (n === "kyrion" || n.startsWith("kyrion ")) return this.PARTY_IDLE_PROFILES.kyrion;
    if (n === "parva" || n.startsWith("parva ")) return this.PARTY_IDLE_PROFILES.parva;
    return {
      img: actor?.img || "icons/svg/mystery-man.svg",
      anchors: this.PARTY_IDLE_PROFILES.altarion.anchors
    };
  }

  /**
   * Check whether an item is strictly Two-Handed (`two` property in D&D 5e).
   * Note: Versatile (`ver`) weapons like Quarterstaff are NOT strictly two-handed.
   */
  static isTwoHandedItem(item) {
    if (!item) return false;
    const props = item.system?.properties;
    if (props instanceof Set) return props.has("two");
    if (Array.isArray(props)) return props.includes("two");
    if (props && typeof props === "object") return Boolean(props.two);
    return false;
  }

  /**
   * Auto-detect the best matching equipment slot category for a D&D 5e Item.
   */
  static detectCategoryForItem(item) {
    if (!item) return "trinket";
    const nameLow = String(item.name || "").trim().toLowerCase();
    const itemType = String(item.type || "").toLowerCase();
    const equipSubType = String(item.system?.type?.value || "").toLowerCase();

    if (nameLow.startsWith("card of the resonant arcana")) return "trinket";
    if (/(cloak|mantle|cape|wings|shroud|capa|manto|asas)\b/i.test(nameLow)) return "cloak";
    if (/(amulet|necklace|periapt|medallion|brooch|choker|scarab|pendant|talisman of|amuleto|colar|medalh)/i.test(nameLow)) return "neck";
    if (/(helm|helmet|hat|circlet|crown|headband|goggles|eyes of|diadem|mask|hood|cap of|elmo|chap[eé]u|coroa|tiara|m[aá]scara|capuz)/i.test(nameLow)) return "head";
    if (/(boots|boot|shoes|shoe|slippers|sandals|greaves|botas|sapatos|sand[aá]lias)/i.test(nameLow)) return "feet";
    if (/(gloves|glove|gauntlets|gauntlet|bracers|bracer|vambraces|mittens|luvas|manoplas|bra[cç]adeiras)/i.test(nameLow)) return "hands";
    if (/(belt|girdle|sash|baldric|cinto|cintur[aã]o|faixa)/i.test(nameLow)) return "belt";
    if (/\b(ring|signet|band of|anel)\b/i.test(nameLow)) return "ring";
    if (
      equipSubType === "light" ||
      equipSubType === "medium" ||
      equipSubType === "heavy" ||
      /(armor|robe|vestment|breastplate|half plate|full plate|chain mail|scale mail|splint|studded leather|armadura|t[uú]nica|veste)/i.test(nameLow)
    ) {
      return "armor";
    }
    if (
      itemType === "weapon" ||
      equipSubType === "shield" ||
      /(rod|wand|staff|grimoire|spellbook|orb|crystal|focus|pact keeper|shield|buckler|sword|dagger|rapier|axe|mace|bow|crossbow|spear|halberd|glaive|hammer|whip|flail|escudo|cajado|varinha|grim[oó]rio|cetro)/i.test(nameLow)
    ) {
      return "weapon";
    }
    if (equipSubType === "clothing") return "armor";
    return "trinket";
  }

  static isItemAttuned(item) {
    if (!item) return false;
    return Boolean(item.system?.attuned === true || Number(item.system?.attunement) === 2);
  }

  static doesItemRequireAttunement(item) {
    if (!item) return false;
    const att = item.system?.attunement;
    return att === "required" || att === "optional" || Number(att) === 1 || Number(att) === 2 || Boolean(item.system?.attuned);
  }

  static getSlotMap(actor) {
    const raw = actor?.flags?.[MODULE_ID]?.attunementSlots || {};
    const validMap = {};
    const usedItemIds = new Set();

    for (const slot of this.SLOTS) {
      const itemId = raw[slot.id];
      if (!itemId || usedItemIds.has(itemId)) continue;
      const item = actor.items?.get(itemId);
      if (item && this.isItemAttuned(item)) {
        validMap[slot.id] = itemId;
        usedItemIds.add(itemId);
      }
    }
    return validMap;
  }

  static findSlotForItem(actor, itemId) {
    const map = this.getSlotMap(actor);
    for (const [slotId, assignedId] of Object.entries(map)) {
      if (assignedId === itemId) return slotId;
    }
    return null;
  }

  static findFreeSlotForItem(actor, item, { slotMap = null, allowFallback = false } = {}) {
    const map = slotMap || this.getSlotMap(actor);
    const cat = this.detectCategoryForItem(item);

    // Respect Two-Handed weapon occupying both weapon slots
    const w1 = map.weapon1 ? actor.items?.get(map.weapon1) : null;
    const w2 = map.weapon2 ? actor.items?.get(map.weapon2) : null;
    const has2H = this.isTwoHandedItem(w1) || this.isTwoHandedItem(w2);

    const isSlotAvailable = (s) => {
      if (map[s.id]) return false;
      if (s.category === "weapon" && has2H) return false;
      if (s.category === "weapon" && this.isTwoHandedItem(item) && (map.weapon1 || map.weapon2)) return false;
      return true;
    };

    const catSlots = this.SLOTS.filter(s => s.category === cat);
    const freeInCat = catSlots.find(isSlotAvailable);
    if (freeInCat) return freeInCat;

    if (allowFallback) {
      const freeTrinket = this.SLOTS.find(s => s.category === "trinket" && isSlotAvailable(s));
      if (freeTrinket) return freeTrinket;
      return this.SLOTS.find(isSlotAvailable) || null;
    }
    return null;
  }

  static async syncActorAttunementSlots(actor) {
    if (!actor || actor.type !== "character" || !actor.isOwner || isIgnoredBackupActor(actor)) return;

    const totalSlots = this.getTotalSlotCount();
    const curMax = Number(actor.system?.attributes?.attunement?.max ?? 3);

    const rawSaved = actor.flags?.[MODULE_ID]?.attunementSlots || {};
    const map = this.getSlotMap(actor);
    const assignedItemIds = new Set(Object.values(map));

    const attunedItems = actor.items.filter(i => this.isItemAttuned(i));
    for (const item of attunedItems) {
      if (assignedItemIds.has(item.id)) continue;
      const freeSlot = this.findFreeSlotForItem(actor, item, { slotMap: map, allowFallback: true });
      if (freeSlot) {
        map[freeSlot.id] = item.id;
        assignedItemIds.add(item.id);
      }
    }

    const mapChanged = JSON.stringify(rawSaved) !== JSON.stringify(map);
    const updateData = {};
    if (curMax !== totalSlots) {
      updateData["system.attributes.attunement.max"] = totalSlots;
    }
    if (mapChanged) {
      const cleanedFlag = {};
      for (const slot of this.SLOTS) {
        if (map[slot.id]) cleanedFlag[slot.id] = map[slot.id];
        else if (rawSaved[slot.id]) cleanedFlag[`-=${slot.id}`] = null;
      }
      // Clean legacy trinket3 key if it existed from previous version
      if (rawSaved.trinket3) cleanedFlag["-=trinket3"] = null;
      updateData[`flags.${MODULE_ID}.attunementSlots`] = cleanedFlag;
    }

    if (Object.keys(updateData).length > 0) {
      try {
        await actor.update(updateData, { altarionBypassWard: true, coriaDamageReactionInternal: true });
      } catch (_e) {}
    }
  }

  static async assignItemToSlot(actor, slotId, itemId) {
    if (!actor || !actor.isOwner) return false;
    const slotDef = this.getSlotDef(slotId);
    const item = actor.items?.get(itemId);
    if (!slotDef || !item) return false;

    const map = this.getSlotMap(actor);
    const is2H = this.isTwoHandedItem(item);

    // If placing a Two-Handed weapon into weapon1 or weapon2, normalize it to weapon1 and unattune any Off-Hand item!
    const effectiveSlotId = is2H && (slotId === "weapon1" || slotId === "weapon2") ? "weapon1" : slotId;
    const itemsToUnattune = [];

    const prevOccupantId = map[effectiveSlotId] || null;
    if (prevOccupantId && prevOccupantId !== item.id) {
      itemsToUnattune.push(prevOccupantId);
    }

    if (is2H && (effectiveSlotId === "weapon1" || effectiveSlotId === "weapon2")) {
      const otherHand = effectiveSlotId === "weapon1" ? "weapon2" : "weapon1";
      if (map[otherHand] && map[otherHand] !== item.id) {
        itemsToUnattune.push(map[otherHand]);
        delete map[otherHand];
      }
    }

    // Remove item from any other slot it previously occupied
    for (const [k, v] of Object.entries(map)) {
      if (v === item.id && k !== effectiveSlotId) {
        delete map[k];
      }
    }

    for (const oldId of itemsToUnattune) {
      const oldItem = actor.items.get(oldId);
      if (oldItem && this.isItemAttuned(oldItem)) {
        this._internalAttuneBypass.add(oldItem.id);
        try {
          await oldItem.update({ "system.attuned": false });
        } finally {
          this._internalAttuneBypass.delete(oldItem.id);
        }
      }
    }

    // Attune the target item
    if (!this.isItemAttuned(item)) {
      this._internalAttuneBypass.add(item.id);
      try {
        const itemUpdate = { "system.attuned": true };
        if (!item.system?.attunement || item.system.attunement === "") {
          itemUpdate["system.attunement"] = "required";
        }
        await item.update(itemUpdate);
      } finally {
        this._internalAttuneBypass.delete(item.id);
      }
    }

    map[effectiveSlotId] = item.id;
    const rawSaved = actor.flags?.[MODULE_ID]?.attunementSlots || {};
    const flagPatch = {};
    for (const s of this.SLOTS) {
      if (map[s.id]) flagPatch[s.id] = map[s.id];
      else if (rawSaved[s.id]) flagPatch[`-=${s.id}`] = null;
    }

    await actor.update(
      {
        "system.attributes.attunement.max": this.getTotalSlotCount(),
        [`flags.${MODULE_ID}.attunementSlots`]: flagPatch
      },
      { altarionBypassWard: true, coriaDamageReactionInternal: true }
    );

    const effectiveDef = this.getSlotDef(effectiveSlotId) || slotDef;
    ui.notifications?.info?.(
      `[Slots de Sintonização] ${item.name} sintonizado em "${is2H ? "Two-Handed (Main/Off-Hand)" : effectiveDef.label}" (${actor.name}).`
    );
    return true;
  }

  static async clearSlot(actor, slotId) {
    if (!actor || !actor.isOwner) return false;
    const slotDef = this.getSlotDef(slotId);
    if (!slotDef) return false;

    const map = this.getSlotMap(actor);
    const itemId = map[slotId];
    if (itemId) {
      const item = actor.items?.get(itemId);
      if (item && this.isItemAttuned(item)) {
        this._internalAttuneBypass.add(item.id);
        try {
          await item.update({ "system.attuned": false });
        } finally {
          this._internalAttuneBypass.delete(item.id);
        }
      }
    }

    await actor.update(
      { [`flags.${MODULE_ID}.attunementSlots.-=${slotId}`]: null },
      { altarionBypassWard: true, coriaDamageReactionInternal: true }
    );

    if (itemId) {
      const itemName = actor.items?.get(itemId)?.name || "Item";
      ui.notifications?.info?.(
        `[Slots de Sintonização] Sintonização quebrada: ${itemName} removido de "${slotDef.label}" (${actor.name}).`
      );
    }
    return true;
  }

  /* ============================================================================
   * Dedicated Attunement Window Theme Manager (with bespoke Live Paper-Doll Preview)
   * ============================================================================ */

  static getSavedAttunementTheme(actor) {
    const raw = actor?.flags?.[MODULE_ID]?.attunementTheme;
    const def = foundry.utils.deepClone(this.DEFAULT_ATTUNEMENT_THEME);
    if (!raw || typeof raw !== "object") return def;
    return foundry.utils.mergeObject(def, foundry.utils.deepClone(raw));
  }

  static _buildBg(cfg, fb1, fb2) {
    const c1 = cfg?.color1 || fb1;
    const c2 = cfg?.color2 || fb2 || c1;
    return cfg?.mode === "gradient" ? `linear-gradient(135deg, ${c1} 0%, ${c2} 100%)` : c1;
  }

  static _hexToRgb(hex) {
    return CoriaHeaderColorManager.hexToRgb(hex || "#38bdf8");
  }

  static _isDark(hex) {
    const { r, g, b } = this._hexToRgb(hex || "#181426");
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255 < 0.5;
  }

  static applyAttunementTheme(dialogEl, theme) {
    if (!dialogEl || !theme) return;
    const el = dialogEl instanceof HTMLElement ? dialogEl : dialogEl?.[0];
    if (!el) return;

    const accent = theme.accentColor || "#38bdf8";
    const accentRgb = this._hexToRgb(accent);
    const textCol = theme.textColor || "#f1f5f9";
    const textDark = this._isDark(textCol);
    const mutedCol = textDark ? "rgba(30, 41, 59, 0.72)" : "rgba(226, 232, 240, 0.76)";
    const borderCol = `rgba(${accentRgb.r}, ${accentRgb.g}, ${accentRgb.b}, 0.52)`;
    const softGlow = `rgba(${accentRgb.r}, ${accentRgb.g}, ${accentRgb.b}, 0.22)`;

    el.style.setProperty("--coria-at-win-bg", this._buildBg(theme.windowBg, "#181426", "#0d0b17"));
    el.style.setProperty("--coria-at-header-bg", this._buildBg(theme.headerBg, "#2a1d44", "#191229"));
    el.style.setProperty("--coria-at-accent", accent);
    el.style.setProperty("--coria-at-border", borderCol);
    el.style.setProperty("--coria-at-glow", softGlow);
    el.style.setProperty("--coria-at-slot-bg", this._buildBg(theme.slotBg, "#261f3d", "#18132a"));
    el.style.setProperty("--coria-at-attune-bg", this._buildBg(theme.attuneBtnBg, "#7c3aed", "#5b21b6"));
    el.style.setProperty("--coria-at-unattune-bg", this._buildBg(theme.unattuneBtnBg, "#dc2626", "#991b1b"));
    el.style.setProperty("--coria-at-text", textCol);
    el.style.setProperty("--coria-at-text-muted", mutedCol);
  }

  static openAttunementThemePicker(actor, targetDialogEl = null) {
    if (!actor) return;
    const saved = this.getSavedAttunementTheme(actor);
    const draft = foundry.utils.deepClone(saved);
    const idleProfile = this.getIdleProfileForActor(actor);

    const sections = [
      { key: "windowBg", label: "Fundo da Janela", hint: "Fundo principal do painel Paper-Doll" },
      { key: "headerBg", label: "Cabeçalho", hint: "Barra superior de título da janela" },
      { key: "slotBg", label: "Botões [+] / Moldura dos Slots", hint: "Fundo interno das caixas de equipamento" },
      { key: "attuneBtnBg", label: "Botão Sintonizar", hint: "Botão roxo para confirmar sintonização" },
      { key: "unattuneBtnBg", label: "Botão Quebrar Sintonização", hint: "Botão vermelho para dessintonizar o item" }
    ];

    const sectionRowsHtml = sections
      .map(sec => {
        const cfg = draft[sec.key] || this.DEFAULT_ATTUNEMENT_THEME[sec.key];
        const isGrad = cfg.mode === "gradient";
        return `
          <div class="coria-at-tp-sec" data-at-sec="${sec.key}">
            <div class="coria-at-tp-sec-head">
              <div>
                <strong>${sec.label}</strong>
                <div class="coria-at-tp-hint">${sec.hint}</div>
              </div>
              <div class="coria-at-tp-modes">
                <label><input type="radio" name="atMode_${sec.key}" value="solid" ${!isGrad ? "checked" : ""} /> Sólida</label>
                <label><input type="radio" name="atMode_${sec.key}" value="gradient" ${isGrad ? "checked" : ""} /> Gradiente</label>
              </div>
            </div>
            <div class="coria-at-tp-pickers">
              <label><span class="at-c1-lbl">${isGrad ? "Cor 1:" : "Cor:"}</span><input type="color" class="at-c1" value="${cfg.color1}" /></label>
              <label class="at-c2-wrap" style="display:${isGrad ? "flex" : "none"};"><span>Cor 2:</span><input type="color" class="at-c2" value="${cfg.color2 || cfg.color1}" /></label>
            </div>
          </div>
        `;
      })
      .join("");

    const content = `
      <div class="coria-at-theme-editor">
        <div class="coria-at-tp-preview-pane">
          <div class="coria-at-tp-preview-title"><i class="fas fa-eye"></i> Preview em Tempo Real</div>
          <div class="coria-at-tp-live-mock">
            <div class="mock-header">
              <span><i class="fas fa-gem"></i> Slots de Sintonização — ${foundry.utils.escapeHTML(actor.name)}</span>
              <span class="mock-x">&times;</span>
            </div>
            <div class="mock-topbar">
              <span><strong>2 / 13</strong> Ocupados</span>
              <div class="mock-progress"><div class="mock-progress-fill"></div></div>
            </div>
            <div class="mock-body">
              <div class="mock-col-left">
                <div class="mock-slot-block">
                  <div class="mock-slot-label">Head:</div>
                  <div class="mock-slot-row">
                    <span class="mock-btn-attune"><i class="fas fa-link"></i> Sintonizar</span>
                    <span class="mock-plus-box">+</span>
                  </div>
                </div>
                <div class="mock-slot-block">
                  <div class="mock-slot-label">Cloak:</div>
                  <div class="mock-slot-row">
                    <span class="mock-btn-unattune"><i class="fas fa-unlink"></i></span>
                    <span class="mock-plus-box is-filled"><i class="fas fa-user-secret"></i></span>
                  </div>
                  <div class="mock-item-name">Cloak of Protection</div>
                </div>
              </div>
              <div class="mock-center">
                <svg class="mock-arrows" viewBox="0 0 180 140" preserveAspectRatio="none">
                  <polyline points="2,24 58,24 78,34" fill="none" stroke="var(--coria-at-accent)" stroke-width="2" />
                  <circle cx="78" cy="34" r="3" fill="var(--coria-at-accent)" />
                  <polyline points="2,86 52,86 68,54" fill="none" stroke="var(--coria-at-accent)" stroke-width="2" />
                  <circle cx="68" cy="54" r="3" fill="var(--coria-at-accent)" />
                  <polyline points="178,38 122,38 104,44" fill="none" stroke="var(--coria-at-accent)" stroke-width="2" />
                  <circle cx="104" cy="44" r="3" fill="var(--coria-at-accent)" />
                </svg>
                <img src="${idleProfile.img}" class="mock-idle-img" alt="" />
              </div>
              <div class="mock-col-right">
                <div class="mock-slot-block">
                  <div class="mock-slot-label">Necklace:</div>
                  <div class="mock-slot-row">
                    <span class="mock-plus-box is-filled"><i class="fas fa-gem"></i></span>
                    <span class="mock-btn-unattune"><i class="fas fa-unlink"></i></span>
                  </div>
                  <div class="mock-item-name">+1 Amulet</div>
                </div>
                <div class="mock-slot-block">
                  <div class="mock-slot-label">Armor:</div>
                  <div class="mock-slot-row">
                    <span class="mock-plus-box">+</span>
                    <span class="mock-btn-attune"><i class="fas fa-link"></i> Sintonizar</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="coria-at-tp-controls-pane">
          <div class="coria-at-tp-inline-colors">
            <label class="coria-at-tp-single">
              <span><strong>Setas & Barra de Progresso</strong><small>Cor de destaque das setas SVG e rótulos</small></span>
              <input type="color" class="at-accent-picker" value="${draft.accentColor}" />
            </label>
            <label class="coria-at-tp-single">
              <span><strong>Cor dos Textos</strong><small>Nomes dos itens, títulos e contador</small></span>
              <input type="color" class="at-text-picker" value="${draft.textColor}" />
            </label>
          </div>
          ${sectionRowsHtml}
        </div>
      </div>
    `;

    let savedClicked = false;
    const dlg = createV2Dialog(
      {
        title: `Personalizar Cores — Slots de Sintonização (${actor.name})`,
        content,
        buttons: {
          save: {
            icon: '<i class="fas fa-save"></i>',
            label: "Salvar Cores",
            callback: async () => {
              savedClicked = true;
              await actor.update(
                { [`flags.${MODULE_ID}.attunementTheme`]: foundry.utils.deepClone(draft) },
                { altarionBypassWard: true, coriaDamageReactionInternal: true }
              );
              if (targetDialogEl) this.applyAttunementTheme(targetDialogEl, draft);
              ui.notifications?.info?.(`[Slots de Sintonização] Cores salvas para ${actor.name}!`);
            }
          },
          reset: {
            icon: '<i class="fas fa-undo"></i>',
            label: "Restaurar Padrão",
            callback: async () => {
              savedClicked = true;
              await actor.update(
                { [`flags.${MODULE_ID}.-=attunementTheme`]: null },
                { altarionBypassWard: true, coriaDamageReactionInternal: true }
              );
              if (targetDialogEl) this.applyAttunementTheme(targetDialogEl, this.DEFAULT_ATTUNEMENT_THEME);
              ui.notifications?.info?.(`[Slots de Sintonização] Cores padrão restauradas para ${actor.name}.`);
            }
          },
          cancel: {
            icon: '<i class="fas fa-times"></i>',
            label: "Cancelar"
          }
        },
        default: "save",
        close: () => {
          if (!savedClicked && targetDialogEl) {
            this.applyAttunementTheme(targetDialogEl, saved);
          }
        },
        render: (root) => {
          const mockEl = root.querySelector(".coria-at-tp-live-mock");
          const syncLive = () => {
            if (mockEl) this.applyAttunementTheme(mockEl, draft);
            if (targetDialogEl) this.applyAttunementTheme(targetDialogEl, draft);
          };
          syncLive();

          const accentInp = root.querySelector(".at-accent-picker");
          accentInp?.addEventListener("input", () => {
            draft.accentColor = accentInp.value;
            syncLive();
          });
          const textInp = root.querySelector(".at-text-picker");
          textInp?.addEventListener("input", () => {
            draft.textColor = textInp.value;
            syncLive();
          });

          for (const secEl of root.querySelectorAll(".coria-at-tp-sec")) {
            const key = secEl.getAttribute("data-at-sec");
            const c1 = secEl.querySelector(".at-c1");
            const c2 = secEl.querySelector(".at-c2");
            const c2Wrap = secEl.querySelector(".at-c2-wrap");
            const c1Lbl = secEl.querySelector(".at-c1-lbl");
            for (const rad of secEl.querySelectorAll(`input[name="atMode_${key}"]`)) {
              rad.addEventListener("change", () => {
                const isGrad = rad.value === "gradient";
                draft[key].mode = rad.value;
                if (c2Wrap) c2Wrap.style.display = isGrad ? "flex" : "none";
                if (c1Lbl) c1Lbl.textContent = isGrad ? "Cor 1:" : "Cor:";
                syncLive();
              });
            }
            c1?.addEventListener("input", () => {
              draft[key].color1 = c1.value;
              syncLive();
            });
            c2?.addEventListener("input", () => {
              draft[key].color2 = c2.value;
              syncLive();
            });
          }
        }
      },
      {
        classes: ["coria-dialog", "coria-at-theme-dialog"],
        width: 780,
        height: 620,
        resizable: true
      }
    );
    dlg.render(true);
  }

  /* ============================================================================
   * Foundry Hooks & Inventory Tab Controls
   * ============================================================================ */

  static registerHooks() {
    Hooks.once("ready", async () => {
      if (!shouldThisClientRunAutoSync(null)) return;
      for (const actor of game.actors || []) {
        if (actor.type === "character" && actor.isOwner && !isIgnoredBackupActor(actor)) {
          await this.syncActorAttunementSlots(actor);
        }
      }
    });

    Hooks.on("preUpdateItem", (item, changed, _options, userId) => {
      if (game.user?.id !== userId) return;
      if (this._internalAttuneBypass.has(item.id)) return;
      const actor = item?.parent;
      if (!actor || actor.documentName !== "Actor" || actor.type !== "character" || isIgnoredBackupActor(actor)) return;
      if (!foundry.utils.hasProperty(changed, "system.attuned")) return;

      const nextAttuned = Boolean(foundry.utils.getProperty(changed, "system.attuned"));
      if (!nextAttuned) return;

      const map = this.getSlotMap(actor);
      if (Object.values(map).includes(item.id)) return;

      const freeInCat = this.findFreeSlotForItem(actor, item, { slotMap: map, allowFallback: false });
      if (freeInCat) return;

      const cat = this.detectCategoryForItem(item);
      const catSlotDefs = this.SLOTS.filter(s => s.category === cat);
      const occupants = catSlotDefs
        .map(s => `${s.label}: ${actor.items?.get(map[s.id])?.name || "Ocupado"}`)
        .join(" | ");

      ui.notifications?.warn?.(
        `[Slots de Sintonização] Slot cheio para "${item.name}" (${occupants}). Escolha ou substitua na janela de Slots de Sintonização!`
      );
      setTimeout(() => this.openAttunementSlotsDialog(actor, { highlightItemId: item.id }), 30);
      return false;
    });

    Hooks.on("updateItem", async (item, changed, _options, userId) => {
      if (game.user?.id !== userId) return;
      if (this._internalAttuneBypass.has(item.id)) return;
      const actor = item?.parent;
      if (!actor || actor.documentName !== "Actor" || actor.type !== "character" || !actor.isOwner) return;
      if (!foundry.utils.hasProperty(changed, "system.attuned")) return;

      await this.syncActorAttunementSlots(actor);
    });

    Hooks.on("deleteItem", async (item, _options, userId) => {
      if (game.user?.id !== userId) return;
      const actor = item?.parent;
      if (!actor || actor.documentName !== "Actor" || actor.type !== "character" || !actor.isOwner) return;
      const savedSlot = this.findSlotForItem(actor, item.id);
      if (savedSlot) {
        await actor.update(
          { [`flags.${MODULE_ID}.attunementSlots.-=${savedSlot}`]: null },
          { altarionBypassWard: true, coriaDamageReactionInternal: true }
        );
      }
    });

    const onRenderSheet = (app, htmlOrEl) => {
      const actor = app?.actor || app?.document;
      if (!actor || actor.type !== "character" || isIgnoredBackupActor(actor)) return;
      const rootEl = htmlOrEl instanceof HTMLElement ? htmlOrEl : htmlOrEl?.[0] || app?.element;
      if (!rootEl) return;

      const inject = () => this.injectInventorySlotControls(actor, rootEl);
      inject();
      requestAnimationFrame(inject);
      setTimeout(inject, 140);
      setTimeout(inject, 450);

      if (!rootEl.dataset.coriaAttuneTabBound) {
        rootEl.dataset.coriaAttuneTabBound = "true";
        rootEl.addEventListener("click", (ev) => {
          const tabClick = ev.target?.closest?.('[data-tab="inventory"], .tab-option[data-tab-id="inventory"], nav.tabs a, nav.tabs button');
          if (tabClick) {
            setTimeout(inject, 40);
            setTimeout(inject, 200);
          }
        });
      }
    };

    Hooks.on("renderActorSheetV2", onRenderSheet);
    Hooks.on("renderActorSheet", onRenderSheet);
    Hooks.on("renderTidy5eCharacterSheetQuadrone", onRenderSheet);
  }

  static injectInventorySlotControls(actor, rootEl) {
    if (!actor || !rootEl) return;

    const map = this.getSlotMap(actor);
    const usedCount = Object.keys(map).length;
    const totalCount = this.getTotalSlotCount();

    for (const tracker of rootEl.querySelectorAll(".attunement-tracker")) {
      if (!tracker.dataset.coriaAttuneTrackerBound) {
        tracker.dataset.coriaAttuneTrackerBound = "true";
        tracker.style.cursor = "pointer";
        tracker.title = `Slots de Sintonização (${usedCount}/${totalCount}) — Clique para abrir a janela de slots`;
        tracker.addEventListener("click", (ev) => {
          if (ev.target?.closest?.("input")) return;
          ev.preventDefault();
          ev.stopPropagation();
          this.openAttunementSlotsDialog(actor);
        });
      }
    }

    const inventoryTab =
      rootEl.querySelector('[data-tab-contents-for="inventory"]') ||
      rootEl.querySelector(".tidy-tab.inventory") ||
      rootEl.querySelector('.tab.inventory[data-tab="inventory"]');
    if (!inventoryTab) return;

    let toolbar = inventoryTab.querySelector(".coria-attunement-slots-toolbar");
    if (!toolbar) {
      toolbar = document.createElement("div");
      toolbar.className = "coria-attunement-slots-toolbar";
      inventoryTab.prepend(toolbar);
    }

    let btn = toolbar.querySelector(".coria-attunement-slots-btn");
    if (!btn) {
      btn = document.createElement("button");
      btn.type = "button";
      btn.className = "coria-attunement-slots-btn coria-customizable-btn";
      btn.setAttribute("data-coria-color-key", "attunement-slots-btn");
      btn.setAttribute("data-coria-color-label", "Botão Slots de Sintonização");
      btn.title = "Abrir janela de Slots de Sintonização | Clique direito para personalizar cor";
      btn.addEventListener("click", (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        this.openAttunementSlotsDialog(actor);
      });
      toolbar.appendChild(btn);
    }

    const desiredLabel = `<i class="fas fa-gem"></i> Slots de Sintonização (${usedCount}/${totalCount})`;
    if (btn.innerHTML !== desiredLabel) {
      btn.innerHTML = desiredLabel;
    }

    let pillsWrap = toolbar.querySelector(".coria-attune-summary-pills");
    if (!pillsWrap) {
      pillsWrap = document.createElement("div");
      pillsWrap.className = "coria-attune-summary-pills";
      toolbar.appendChild(pillsWrap);
    }

    const pillsKey = Object.entries(map)
      .map(([sId, iId]) => `${sId}:${iId}:${actor.items?.get(iId)?.name || ""}`)
      .join("|");
    if (pillsWrap.dataset.coriaPillsKey !== pillsKey) {
      pillsWrap.dataset.coriaPillsKey = pillsKey;
      if (usedCount === 0) {
        pillsWrap.innerHTML = `<span class="coria-attune-empty-hint">Nenhum item sintonizado</span>`;
      } else {
        pillsWrap.innerHTML = Object.entries(map)
          .map(([slotId, itemId]) => {
            const slotDef = this.getSlotDef(slotId);
            const item = actor.items?.get(itemId);
            if (!slotDef || !item) return "";
            return `
              <span class="coria-attune-pill" data-item-id="${item.id}" title="${foundry.utils.escapeHTML(slotDef.label)}: ${foundry.utils.escapeHTML(item.name)} (Clique para gerenciar)">
                <i class="fas ${slotDef.icon}"></i>
                <span class="coria-attune-pill-slot">${foundry.utils.escapeHTML(slotDef.label)}:</span>
                <span class="coria-attune-pill-name">${foundry.utils.escapeHTML(item.name)}</span>
              </span>
            `;
          })
          .join("");

        for (const pill of pillsWrap.querySelectorAll(".coria-attune-pill")) {
          pill.addEventListener("click", (ev) => {
            ev.preventDefault();
            ev.stopPropagation();
            this.openAttunementSlotsDialog(actor);
          });
        }
      }
    }

    CoriaHeaderColorManager.applyAndBind(actor, toolbar);
  }

  /* ============================================================================
   * Baldur's Gate 3 Paper-Doll Attunement DialogV2 Window
   * ============================================================================ */

  static _drawPaperDollArrows(rootEl, idleProfile) {
    const stage = rootEl.querySelector(".coria-pd-stage");
    const svg = rootEl.querySelector(".coria-pd-arrows-svg");
    const figBox = rootEl.querySelector(".coria-pd-figure-box");
    const idleImg = rootEl.querySelector(".coria-pd-idle-img");
    if (!stage || !svg || !figBox) return;

    const stageRect = stage.getBoundingClientRect();
    if (stageRect.width < 50 || stageRect.height < 50) return;

    const targetBoxRect =
      idleImg && idleImg.getBoundingClientRect().width > 30
        ? idleImg.getBoundingClientRect()
        : figBox.getBoundingClientRect();

    svg.setAttribute("viewBox", `0 0 ${Math.round(stageRect.width)} ${Math.round(stageRect.height)}`);
    const anchors = idleProfile?.anchors || this.PARTY_IDLE_PROFILES.altarion.anchors;

    const paths = [];
    for (const slot of this.SLOTS) {
      if (!slot.hasArrow) continue;
      const box = stage.querySelector(`.coria-pd-plus-box[data-slot-id="${slot.id}"]`);
      const anc = anchors[slot.id];
      if (!box || !anc) continue;

      const bRect = box.getBoundingClientRect();
      const startX =
        slot.side === "left"
          ? bRect.right - stageRect.left + 4
          : bRect.left - stageRect.left - 4;
      const startY = bRect.top + bRect.height / 2 - stageRect.top;

      const endX = targetBoxRect.left - stageRect.left + (targetBoxRect.width * anc.x) / 100;
      const endY = targetBoxRect.top - stageRect.top + (targetBoxRect.height * anc.y) / 100;

      // Clean angled BG3-style callout line (horizontal elbow -> diagonal toward body anchor -> dot!)
      const figEdgeX =
        slot.side === "left"
          ? targetBoxRect.left - stageRect.left - 12
          : targetBoxRect.right - stageRect.left + 12;
      const elbowX =
        slot.side === "left"
          ? Math.max(startX + 18, Math.min(figEdgeX, endX - 14))
          : Math.min(startX - 18, Math.max(figEdgeX, endX + 14));

      const occupied = box.classList.contains("is-occupied");
      const opacity = occupied ? "0.95" : "0.72";
      const strokeW = occupied ? "2.4" : "1.9";

      paths.push(`
        <g class="coria-pd-arrow-group ${occupied ? "is-occupied" : ""}" opacity="${opacity}">
          <polyline points="${startX.toFixed(1)},${startY.toFixed(1)} ${elbowX.toFixed(1)},${startY.toFixed(1)} ${endX.toFixed(1)},${endY.toFixed(1)}"
                    fill="none" stroke="var(--coria-at-accent, #38bdf8)" stroke-width="${strokeW}" stroke-linecap="round" stroke-linejoin="round" />
          <circle cx="${startX.toFixed(1)}" cy="${startY.toFixed(1)}" r="3" fill="var(--coria-at-accent, #38bdf8)" />
          <circle cx="${endX.toFixed(1)}" cy="${endY.toFixed(1)}" r="4.2" fill="var(--coria-at-accent, #38bdf8)" stroke="#0f172a" stroke-width="1.3" />
        </g>
      `);
    }

    svg.innerHTML = paths.join("");
  }

  static async openAttunementSlotsDialog(actor, { highlightItemId = "" } = {}) {
    if (!actor) return;
    if (actor.isOwner) {
      await this.syncActorAttunementSlots(actor);
    }

    const prevDlg = this._openDialogsByActor.get(actor.id);
    if (prevDlg?.rendered) {
      try {
        await prevDlg.close();
      } catch (_e) {}
    }

    let showAllItems = false;
    // Pending (selected-but-not-yet-attuned) item per slot: `{ [slotId]: itemId }`
    const pendingBySlot = {};
    // Currently open item-picker popup slotId (null when closed)
    let activePickerSlotId = null;

    if (highlightItemId) {
      const hItem = actor.items?.get(highlightItemId);
      if (hItem) {
        const hCat = this.detectCategoryForItem(hItem);
        const hSlot = this.SLOTS.find(s => s.category === hCat);
        if (hSlot) pendingBySlot[hSlot.id] = hItem.id;
      }
    }

    const candidateItemTypes = new Set(["equipment", "weapon", "tool", "loot", "container", "consumable"]);
    const idleProfile = this.getIdleProfileForActor(actor);
    let resizeObs = null;

    const dlg = createV2Dialog(
      {
        title: `Slots de Sintonização — ${actor.name}`,
        content: `<div class="coria-pd-root"></div>`,
        buttons: {
          close: {
            icon: '<i class="fas fa-times"></i>',
            label: "Fechar"
          }
        },
        default: "close",
        close: () => {
          if (resizeObs) {
            try {
              resizeObs.disconnect();
            } catch (_e) {}
            resizeObs = null;
          }
          if (this._openDialogsByActor.get(actor.id) === dlg) {
            this._openDialogsByActor.delete(actor.id);
          }
        },
        render: (root) => {
          const dialogRoot = root.closest(".application") || root.closest(".dialog") || root;
          const savedTheme = this.getSavedAttunementTheme(actor);
          this.applyAttunementTheme(dialogRoot, savedTheme);

          // Bind right-click on title bar to open our dedicated Attunement Paper-Doll Theme Editor!
          const header = dialogRoot.querySelector(".window-header");
          if (header && header.dataset.boundCoriaAtTheme !== "true") {
            header.dataset.boundCoriaAtTheme = "true";
            header.title = "Clique com o botão direito no cabeçalho para personalizar as cores desta janela";
            header.style.cursor = "context-menu";
            header.addEventListener("contextmenu", (ev) => {
              ev.preventDefault();
              ev.stopPropagation();
              if (!actor.isOwner && !game.user?.isGM) return;
              this.openAttunementThemePicker(actor, dialogRoot);
            });
          }

          const container = root.querySelector(".coria-pd-root");
          if (!container) return;

          const getAvailableItemsForSlot = (slotId, map) => {
            const assignedItemIds = new Set(Object.values(map));
            const currentSlotItemId = map[slotId] || null;
            return actor.items
              .filter(i => {
                if (!candidateItemTypes.has(i.type)) return false;
                if (assignedItemIds.has(i.id) && i.id !== currentSlotItemId) return false;
                if (showAllItems) return true;
                return this.doesItemRequireAttunement(i);
              })
              .sort((a, b) => a.name.localeCompare(b.name));
          };

          const renderSlotWidget = (slot, map, { layout = "left", labelInside = true, twoHandBadge = false } = {}) => {
            const attunedId = map[slot.id] || null;
            const attunedItem = attunedId ? actor.items?.get(attunedId) : null;
            const pendingId = !attunedItem ? pendingBySlot[slot.id] || null : null;
            const pendingItem = pendingId ? actor.items?.get(pendingId) : null;
            const displayItem = attunedItem || pendingItem;
            const isAttuned = Boolean(attunedItem);
            const canEdit = Boolean(actor.isOwner);

            const boxHtml = displayItem
              ? `
                <button type="button"
                        class="coria-pd-plus-box is-occupied ${isAttuned ? "is-attuned" : "is-pending"}"
                        data-slot-id="${slot.id}"
                        data-open-picker="${slot.id}"
                        title="${foundry.utils.escapeHTML(displayItem.name)} — Clique para trocar item | Clique direito para abrir ficha do item">
                  <img src="${displayItem.img || "icons/svg/item-bag.svg"}" alt="${foundry.utils.escapeHTML(displayItem.name)}" />
                </button>
              `
              : `
                <button type="button"
                        class="coria-pd-plus-box is-empty"
                        data-slot-id="${slot.id}"
                        data-open-picker="${slot.id}"
                        title="Adicionar item em ${foundry.utils.escapeHTML(slot.label)} (${foundry.utils.escapeHTML(slot.hint)})"
                        ${!canEdit ? "disabled" : ""}>
                  <span class="coria-pd-plus-sign">+</span>
                </button>
              `;

            const actionBtnHtml = isAttuned
              ? `
                <button type="button"
                        class="coria-pd-unattune-btn"
                        data-clear-slot="${slot.id}"
                        title="Quebrar sintonização de ${foundry.utils.escapeHTML(attunedItem.name)}"
                        ${!canEdit ? "disabled" : ""}>
                  <i class="fas fa-unlink"></i>
                </button>
              `
              : `
                <button type="button"
                        class="coria-pd-attune-btn ${pendingItem ? "is-ready" : "is-idle"}"
                        data-attune-slot="${slot.id}"
                        title="${pendingItem ? `Sintonizar ${foundry.utils.escapeHTML(pendingItem.name)} em ${foundry.utils.escapeHTML(slot.label)}` : `Escolher e sintonizar item em ${foundry.utils.escapeHTML(slot.label)}`}"
                        ${!canEdit ? "disabled" : ""}>
                  <i class="fas fa-link"></i> Sintonizar
                </button>
              `;

            const itemNameHtml = displayItem
              ? `<a class="coria-pd-item-name ${isAttuned ? "is-attuned" : "is-pending"}" data-open-item="${displayItem.id}" title="Abrir ficha de ${foundry.utils.escapeHTML(displayItem.name)}">${foundry.utils.escapeHTML(displayItem.name)}${twoHandBadge ? ` <span class="coria-pd-2h-tag">2H</span>` : ""}</a>`
              : `<span class="coria-pd-item-name is-empty-txt">${foundry.utils.escapeHTML(slot.hint.split(",")[0])}</span>`;

            // Left column: [ActionBtn + Name] [+]  (so [+] faces the character for the arrow!)
            // Right column: [+] [ActionBtn + Name] (so [+] faces the character for the arrow!)
            // Compact (Rings / Trinkets / Main-Off-Hand): [+] on top, [Name] + [ActionBtn] neatly below!
            if (layout === "left") {
              return `
                <div class="coria-pd-slot-unit is-left" data-unit-slot="${slot.id}">
                  ${labelInside ? `<div class="coria-pd-slot-label">${foundry.utils.escapeHTML(slot.label)}:</div>` : ""}
                  <div class="coria-pd-slot-row">
                    <div class="coria-pd-slot-side-col is-left">
                      ${itemNameHtml}
                      <div class="coria-pd-slot-actions">${actionBtnHtml}</div>
                    </div>
                    ${boxHtml}
                  </div>
                </div>
              `;
            }

            if (layout === "right") {
              return `
                <div class="coria-pd-slot-unit is-right" data-unit-slot="${slot.id}">
                  ${labelInside ? `<div class="coria-pd-slot-label">${foundry.utils.escapeHTML(slot.label)}:</div>` : ""}
                  <div class="coria-pd-slot-row">
                    ${boxHtml}
                    <div class="coria-pd-slot-side-col is-right">
                      ${itemNameHtml}
                      <div class="coria-pd-slot-actions">${actionBtnHtml}</div>
                    </div>
                  </div>
                </div>
              `;
            }

            // Compact vertical card for Rings, Trinkets, and Main-Hand/Off-Hand
            return `
              <div class="coria-pd-slot-compact ${twoHandBadge ? "is-two-handed" : ""}" data-unit-slot="${slot.id}">
                <div class="coria-pd-compact-top">
                  ${boxHtml}
                  <div class="coria-pd-compact-meta">
                    ${itemNameHtml}
                    <div class="coria-pd-slot-actions">${actionBtnHtml}</div>
                  </div>
                </div>
              </div>
            `;
          };

          const renderPickerOverlay = (slotId, map) => {
            if (!slotId) return "";
            const slotDef = this.getSlotDef(slotId);
            if (!slotDef) return "";
            const items = getAvailableItemsForSlot(slotId, map);
            const recommended = items.filter(i => this.detectCategoryForItem(i) === slotDef.category);
            const others = items.filter(i => this.detectCategoryForItem(i) !== slotDef.category);

            const renderItemOpt = (it, isRec) => {
              const is2H = this.isTwoHandedItem(it);
              const reqAtt = this.doesItemRequireAttunement(it);
              return `
                <button type="button" class="coria-pd-picker-item ${isRec ? "is-rec" : ""}" data-pick-slot="${slotId}" data-pick-item="${it.id}">
                  <img src="${it.img || "icons/svg/item-bag.svg"}" alt="${foundry.utils.escapeHTML(it.name)}" />
                  <div class="coria-pd-picker-meta">
                    <strong>${foundry.utils.escapeHTML(it.name)}</strong>
                    <span>
                      ${isRec ? `<em class="coria-pd-badge-rec">Recomendado</em>` : ""}
                      ${is2H ? `<em class="coria-pd-badge-2h">Duas Mãos</em>` : ""}
                      ${reqAtt ? `<em class="coria-pd-badge-att">Requer Sintonização</em>` : `<em class="coria-pd-badge-free">Equipamento</em>`}
                    </span>
                  </div>
                  <i class="fas fa-plus-circle coria-pd-picker-add-ic"></i>
                </button>
              `;
            };

            const listHtml =
              items.length === 0
                ? `<div class="coria-pd-picker-empty">Nenhum item sintonizável livre no inventário.<br><small>Ative "Mostrar todos os equipamentos/itens" no topo para exibir itens sem flag de sintonização.</small></div>`
                : `
                    ${recommended.length > 0 ? `<div class="coria-pd-picker-section-lbl">Recomendados para ${foundry.utils.escapeHTML(slotDef.label)}</div>${recommended.map(it => renderItemOpt(it, true)).join("")}` : ""}
                    ${others.length > 0 ? `<div class="coria-pd-picker-section-lbl">Outros Itens do Inventário</div>${others.map(it => renderItemOpt(it, false)).join("")}` : ""}
                  `;

            return `
              <div class="coria-pd-picker-backdrop">
                <div class="coria-pd-picker-modal">
                  <div class="coria-pd-picker-header">
                    <span><i class="fas ${slotDef.icon}"></i> Selecionar Item — ${foundry.utils.escapeHTML(slotDef.label)}</span>
                    <button type="button" class="coria-pd-picker-close" title="Fechar lista"><i class="fas fa-times"></i></button>
                  </div>
                  <div class="coria-pd-picker-list">${listHtml}</div>
                </div>
              </div>
            `;
          };

          const renderPaperDoll = () => {
            const map = this.getSlotMap(actor);
            const usedCount = Object.keys(map).length;
            const totalCount = this.getTotalSlotCount();
            const pct = Math.round((usedCount / Math.max(1, totalCount)) * 100);
            const canEdit = Boolean(actor.isOwner);

            const leftSlots = this.SLOTS.filter(s => s.side === "left");
            const rightBodySlots = this.SLOTS.filter(s => s.side === "right");
            const ringSlots = this.SLOTS.filter(s => s.side === "rings");
            const trinketSlots = this.SLOTS.filter(s => s.side === "trinkets");
            const w1Def = this.getSlotDef("weapon1");
            const w2Def = this.getSlotDef("weapon2");

            // Check Two-Handed weapon collapse on Main-Hand / Off-Hand!
            const w1Item = actor.items?.get(map.weapon1 || pendingBySlot.weapon1 || "");
            const w2Item = actor.items?.get(map.weapon2 || pendingBySlot.weapon2 || "");
            const w1Is2H = this.isTwoHandedItem(w1Item);
            const w2Is2H = !w1Is2H && this.isTwoHandedItem(w2Item);
            const isTwoHandedCollapsed = w1Is2H || w2Is2H;
            const active2HSlotDef = w2Is2H ? w2Def : w1Def;

            const handsHtml = isTwoHandedCollapsed
              ? `
                  <div class="coria-pd-hands-row is-single-2h">
                    ${renderSlotWidget(active2HSlotDef, map, { layout: "compact", labelInside: false, twoHandBadge: true })}
                  </div>
                `
              : `
                  <div class="coria-pd-hands-row">
                    ${renderSlotWidget(w1Def, map, { layout: "compact", labelInside: false })}
                    ${renderSlotWidget(w2Def, map, { layout: "compact", labelInside: false })}
                  </div>
                `;

            container.innerHTML = `
              <div class="coria-pd-topbar">
                <div class="coria-pd-progress-group">
                  <span class="coria-pd-counter-pill">
                    <i class="fas fa-gem"></i>
                    <strong>${usedCount}/${totalCount}</strong> Slots de Sintonização Ocupados
                  </span>
                  <div class="coria-pd-progress-bar">
                    <div class="coria-pd-progress-fill" style="width: ${pct}%;"></div>
                  </div>
                </div>
                <div class="coria-pd-top-controls">
                  <label class="coria-pd-show-all-lbl" title="Incluir equipamentos/armas sem a flag padrão 'Requires Attunement'">
                    <input type="checkbox" class="coria-pd-show-all-chk" ${showAllItems ? "checked" : ""} />
                    <span>Todos os itens</span>
                  </label>
                  ${
                    canEdit
                      ? `<button type="button" class="coria-pd-autosort-btn" title="Auto-alocar itens sintonizados nos slots correspondentes">
                           <i class="fas fa-wand-magic-sparkles"></i> Auto
                         </button>`
                      : ""
                  }
                </div>
              </div>

              <div class="coria-pd-stage">
                <svg class="coria-pd-arrows-svg" aria-hidden="true"></svg>

                <div class="coria-pd-col-left">
                  ${leftSlots.map(s => renderSlotWidget(s, map, { layout: "left" })).join("")}
                </div>

                <div class="coria-pd-col-center">
                  <div class="coria-pd-figure-box ${idleProfile.isSmallStature ? "is-small-stature" : ""}">
                    <div class="coria-pd-figure-aura"></div>
                    <img class="coria-pd-idle-img ${idleProfile.isSmallStature ? "is-small-stature" : ""}" src="${idleProfile.img}" alt="${foundry.utils.escapeHTML(actor.name)}" />
                  </div>
                  <div class="coria-pd-hands-section">
                    <div class="coria-pd-group-heading">
                      ${isTwoHandedCollapsed ? "Two-Handed Weapon:" : "Main-Hand / Off-Hand:"}
                    </div>
                    ${handsHtml}
                  </div>
                </div>

                <div class="coria-pd-col-right">
                  <div class="coria-pd-right-body-slots">
                    ${rightBodySlots.map(s => renderSlotWidget(s, map, { layout: "right" })).join("")}
                  </div>

                  <div class="coria-pd-right-cluster">
                    <div class="coria-pd-group-heading">Rings:</div>
                    <div class="coria-pd-cluster-pair">
                      ${ringSlots.map(s => renderSlotWidget(s, map, { layout: "compact", labelInside: false })).join("")}
                    </div>
                  </div>

                  <div class="coria-pd-right-cluster">
                    <div class="coria-pd-group-heading">Trinkets:</div>
                    <div class="coria-pd-cluster-pair">
                      ${trinketSlots.map(s => renderSlotWidget(s, map, { layout: "compact", labelInside: false })).join("")}
                    </div>
                  </div>
                </div>

                ${renderPickerOverlay(activePickerSlotId, map)}
              </div>
            `;

            // Draw callout SVG arrows once layout & Idle image settle
            const redraw = () => this._drawPaperDollArrows(container, idleProfile);
            requestAnimationFrame(redraw);
            setTimeout(redraw, 60);
            const idleImgEl = container.querySelector(".coria-pd-idle-img");
            if (idleImgEl && !idleImgEl.complete) {
              idleImgEl.addEventListener("load", redraw, { once: true });
            }

            if (typeof ResizeObserver === "function") {
              if (resizeObs) resizeObs.disconnect();
              const stageEl = container.querySelector(".coria-pd-stage");
              if (stageEl) {
                resizeObs = new ResizeObserver(() => redraw());
                resizeObs.observe(stageEl);
              }
            }

            // Wire controls
            const chk = container.querySelector(".coria-pd-show-all-chk");
            chk?.addEventListener("change", () => {
              showAllItems = Boolean(chk.checked);
              renderPaperDoll();
            });

            const autoBtn = container.querySelector(".coria-pd-autosort-btn");
            autoBtn?.addEventListener("click", async (ev) => {
              ev.preventDefault();
              await this.syncActorAttunementSlots(actor);
              renderPaperDoll();
            });

            // Clicking [+] (or occupied icon) opens item picker; right-clicking an occupied icon opens the Item sheet
            for (const box of container.querySelectorAll("[data-open-picker]")) {
              const sId = box.getAttribute("data-open-picker");
              box.addEventListener("click", (ev) => {
                ev.preventDefault();
                ev.stopPropagation();
                if (!canEdit) return;
                activePickerSlotId = sId;
                renderPaperDoll();
              });
              box.addEventListener("contextmenu", (ev) => {
                const itId = map[sId] || pendingBySlot[sId];
                if (!itId) return;
                ev.preventDefault();
                ev.stopPropagation();
                actor.items?.get(itId)?.sheet?.render?.(true);
              });
            }

            // Clicking item name opens Item sheet
            for (const link of container.querySelectorAll("[data-open-item]")) {
              link.addEventListener("click", (ev) => {
                ev.preventDefault();
                ev.stopPropagation();
                const it = actor.items?.get(link.getAttribute("data-open-item"));
                it?.sheet?.render?.(true);
              });
            }

            // Clicking purple "Sintonizar" button
            for (const attBtn of container.querySelectorAll("[data-attune-slot]")) {
              attBtn.addEventListener("click", async (ev) => {
                ev.preventDefault();
                ev.stopPropagation();
                const sId = attBtn.getAttribute("data-attune-slot");
                const chosenId = pendingBySlot[sId];
                if (!chosenId) {
                  // If nothing picked yet, open the [+] picker directly for effortless UX!
                  activePickerSlotId = sId;
                  renderPaperDoll();
                  return;
                }
                const ok = await this.assignItemToSlot(actor, sId, chosenId);
                if (ok) {
                  delete pendingBySlot[sId];
                  if (sId === "weapon1" || sId === "weapon2") {
                    const it = actor.items?.get(chosenId);
                    if (this.isTwoHandedItem(it)) {
                      delete pendingBySlot.weapon1;
                      delete pendingBySlot.weapon2;
                    }
                  }
                }
                renderPaperDoll();
              });
            }

            // Clicking red "Quebrar Sintonização" button
            for (const rmBtn of container.querySelectorAll("[data-clear-slot]")) {
              rmBtn.addEventListener("click", async (ev) => {
                ev.preventDefault();
                ev.stopPropagation();
                const sId = rmBtn.getAttribute("data-clear-slot");
                await this.clearSlot(actor, sId);
                delete pendingBySlot[sId];
                renderPaperDoll();
              });
            }

            // Picker overlay events
            const backdrop = container.querySelector(".coria-pd-picker-backdrop");
            const closePickerBtn = container.querySelector(".coria-pd-picker-close");
            closePickerBtn?.addEventListener("click", (ev) => {
              ev.preventDefault();
              activePickerSlotId = null;
              renderPaperDoll();
            });
            backdrop?.addEventListener("click", (ev) => {
              if (ev.target === backdrop) {
                activePickerSlotId = null;
                renderPaperDoll();
              }
            });

            for (const pickBtn of container.querySelectorAll("[data-pick-item]")) {
              pickBtn.addEventListener("click", async (ev) => {
                ev.preventDefault();
                ev.stopPropagation();
                const sId = pickBtn.getAttribute("data-pick-slot");
                const itId = pickBtn.getAttribute("data-pick-item");
                activePickerSlotId = null;

                // If slot already had an attuned item and the user swapped to a different item, clear old attunement & stage new item
                if (map[sId] && map[sId] !== itId) {
                  await this.clearSlot(actor, sId);
                }
                // Clear pending if same item was pending in another slot
                for (const [k, v] of Object.entries(pendingBySlot)) {
                  if (v === itId) delete pendingBySlot[k];
                }
                pendingBySlot[sId] = itId;
                renderPaperDoll();
              });
            }
          };

          renderPaperDoll();
        }
      },
      {
        classes: ["coria-dialog", "coria-attune-dialog"],
        width: 980,
        height: 700,
        resizable: true
      }
    );

    if (dlg) {
      this._openDialogsByActor.set(actor.id, dlg);
      dlg.render(true);
    }
  }
}
