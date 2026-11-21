/**
 * CoriaAttunementSlots — Slot-Based Magic Item Attunement Interface
 * Replaces D&D 5e's flat 3-item attunement cap with RPG body/equipment attunement slots:
 * - Head, Neck/Amulet, Cloak/Back, Armor/Chest, Hands/Wrists, Belt/Waist, Feet/Boots,
 *   Rings (x2), Weapons/Foci (x2), and Trinkets/Wondrous (x3) -> 14 total slots.
 * - Automatically syncs `actor.system.attributes.attunement.max` to the total slot count
 *   so Foundry dnd5e never blocks attuning > 3 items across distinct equipment slots.
 * - Enforces per-slot uniqueness when clicking native Inventory attunement toggles,
 *   auto-allocates attuned items into their best matching slot, and provides a rich
 *   DialogV2 "Slots de Sintonização" management window accessible right from the Inventory tab.
 */

import { createV2Dialog, CoriaHeaderColorManager, CoriaWindowThemeManager } from "./dialog-v2.js";

const MODULE_ID = "altarion-aitusa";

export class CoriaAttunementSlots {
  static SLOTS = [
    // Body / Worn Slots
    { id: "head", category: "head", group: "body", label: "Cabeça", hint: "Elmos, tiaras, coroas, chapéus, óculos", icon: "fa-hat-wizard" },
    { id: "neck", category: "neck", group: "body", label: "Pescoço / Amuleto", hint: "Amuletos, colares, medalhões, periaptos", icon: "fa-gem" },
    { id: "cloak", category: "cloak", group: "body", label: "Capa / Costas", hint: "Capas, mantos, asas", icon: "fa-user-secret" },
    { id: "armor", category: "armor", group: "body", label: "Armadura / Peito", hint: "Armaduras mágicas, vestes, robes", icon: "fa-shield-halved" },
    { id: "hands", category: "hands", group: "body", label: "Mãos / Pulsos", hint: "Luvas, manoplas, braçadeiras", icon: "fa-hand-fist" },
    { id: "belt", category: "belt", group: "body", label: "Cintura / Cinto", hint: "Cintos, faixas, cinturões", icon: "fa-ribbon" },
    { id: "feet", category: "feet", group: "body", label: "Pés / Sapatos", hint: "Botas, sapatos, sandálias, grevas", icon: "fa-shoe-prints" },

    // Rings & Weapons / Arcane Foci
    { id: "ring1", category: "ring", group: "gear", label: "Anel 1 (Mão Esq.)", hint: "Anéis mágicos", icon: "fa-ring" },
    { id: "ring2", category: "ring", group: "gear", label: "Anel 2 (Mão Dir.)", hint: "Anéis mágicos", icon: "fa-ring" },
    { id: "weapon1", category: "weapon", group: "gear", label: "Arma / Foco 1", hint: "Armas, varinhas, cajados, grimórios, focos, escudos", icon: "fa-wand-magic-sparkles" },
    { id: "weapon2", category: "weapon", group: "gear", label: "Arma / Foco 2", hint: "Segunda arma, escudo mágico ou segundo foco", icon: "fa-khanda" },

    // Trinkets & Wondrous Relics
    { id: "trinket1", category: "trinket", group: "trinket", label: "Trinket 1", hint: "Itens maravilhosos, cartas arcanas, pedras, talismãs", icon: "fa-star" },
    { id: "trinket2", category: "trinket", group: "trinket", label: "Trinket 2", hint: "Itens maravilhosos, cartas arcanas, pedras, talismãs", icon: "fa-star" },
    { id: "trinket3", category: "trinket", group: "trinket", label: "Trinket 3", hint: "Itens maravilhosos, cartas arcanas, pedras, talismãs", icon: "fa-star" }
  ];

  static SLOT_GROUPS = [
    { id: "body", label: "Equipamentos Corporais", icon: "fa-vest" },
    { id: "gear", label: "Anéis, Armas & Focos Arcanos", icon: "fa-wand-magic-sparkles" },
    { id: "trinket", label: "Trinkets & Relíquias Maravilhosas", icon: "fa-sparkles" }
  ];

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

  /**
   * Auto-detect the best matching equipment slot category for a D&D 5e Item.
   */
  static detectCategoryForItem(item) {
    if (!item) return "trinket";
    const nameLow = String(item.name || "").trim().toLowerCase();
    const itemType = String(item.type || "").toLowerCase();
    const equipSubType = String(item.system?.type?.value || "").toLowerCase();

    // Explicit keyword rules (EN + PT-BR)
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

  /**
   * Read the actor's cleaned slot map (`{ [slotId]: itemId }`), pruning deleted or unattuned items.
   */
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

  static isItemAttuned(item) {
    if (!item) return false;
    return Boolean(item.system?.attuned === true || Number(item.system?.attunement) === 2);
  }

  static doesItemRequireAttunement(item) {
    if (!item) return false;
    const att = item.system?.attunement;
    return att === "required" || att === "optional" || Number(att) === 1 || Number(att) === 2 || Boolean(item.system?.attuned);
  }

  static findSlotForItem(actor, itemId) {
    const map = this.getSlotMap(actor);
    for (const [slotId, assignedId] of Object.entries(map)) {
      if (assignedId === itemId) return slotId;
    }
    return null;
  }

  /**
   * Pick the best free slot for `item` (preferring its detected category; optional fallback to trinket if `allowFallback`).
   */
  static findFreeSlotForItem(actor, item, { slotMap = null, allowFallback = false } = {}) {
    const map = slotMap || this.getSlotMap(actor);
    const cat = this.detectCategoryForItem(item);

    const catSlots = this.SLOTS.filter(s => s.category === cat);
    const freeInCat = catSlots.find(s => !map[s.id]);
    if (freeInCat) return freeInCat;

    if (allowFallback) {
      const freeTrinket = this.SLOTS.find(s => s.category === "trinket" && !map[s.id]);
      if (freeTrinket) return freeTrinket;
      return this.SLOTS.find(s => !map[s.id]) || null;
    }
    return null;
  }

  /**
   * Ensure `actor.system.attributes.attunement.max` matches total equipment slots
   * and auto-allocate any currently attuned items that aren't assigned to a slot yet.
   */
  static async syncActorAttunementSlots(actor) {
    if (!actor || actor.type !== "character" || !actor.isOwner) return;

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
      // Clear removed keys cleanly using Foundry -= deletion syntax or replace whole flag object
      const cleanedFlag = {};
      for (const slot of this.SLOTS) {
        if (map[slot.id]) cleanedFlag[slot.id] = map[slot.id];
        else if (rawSaved[slot.id]) cleanedFlag[`-=${slot.id}`] = null;
      }
      updateData[`flags.${MODULE_ID}.attunementSlots`] = cleanedFlag;
    }

    if (Object.keys(updateData).length > 0) {
      try {
        await actor.update(updateData, { altarionBypassWard: true, coriaDamageReactionInternal: true });
      } catch (_e) {}
    }
  }

  /**
   * Assign `item` to `slotId`, attuning `item` (and unattuning any previous occupant of `slotId`).
   */
  static async assignItemToSlot(actor, slotId, itemId) {
    if (!actor || !actor.isOwner) return false;
    const slotDef = this.getSlotDef(slotId);
    const item = actor.items?.get(itemId);
    if (!slotDef || !item) return false;

    const map = this.getSlotMap(actor);
    const prevOccupantId = map[slotId] || null;

    // Remove item from any other slot it previously occupied
    for (const [k, v] of Object.entries(map)) {
      if (v === item.id && k !== slotId) {
        delete map[k];
      }
    }

    // Unattune previous occupant in `slotId` if different
    if (prevOccupantId && prevOccupantId !== item.id) {
      const prevItem = actor.items.get(prevOccupantId);
      if (prevItem && this.isItemAttuned(prevItem)) {
        this._internalAttuneBypass.add(prevItem.id);
        try {
          await prevItem.update({ "system.attuned": false });
        } finally {
          this._internalAttuneBypass.delete(prevItem.id);
        }
      }
    }

    // Ensure item is attuned (if it's a homebrew/untagged item without attunement="required", set it cleanly)
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

    map[slotId] = item.id;
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

    ui.notifications?.info?.(
      `[Slots de Sintonização] ${item.name} sintonizado no slot "${slotDef.label}" (${actor.name}).`
    );
    return true;
  }

  /**
   * Clear `slotId` and unattune the item occupying it.
   */
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
        `[Slots de Sintonização] ${itemName} removido do slot "${slotDef.label}" (${actor.name}).`
      );
    }
    return true;
  }

  /**
   * Register Foundry hooks for Inventory tab UI injection, slot validation, and auto-sync.
   */
  static registerHooks() {
    Hooks.once("ready", async () => {
      for (const actor of game.actors || []) {
        if (actor.type === "character" && actor.isOwner) {
          await this.syncActorAttunementSlots(actor);
        }
      }
    });

    // Enforce slot-based attunement when a player clicks the native Attune toggle in the Inventory list
    Hooks.on("preUpdateItem", (item, changed, _options, userId) => {
      if (game.user?.id !== userId) return;
      if (this._internalAttuneBypass.has(item.id)) return;
      const actor = item?.parent;
      if (!actor || actor.documentName !== "Actor" || actor.type !== "character") return;
      if (!foundry.utils.hasProperty(changed, "system.attuned")) return;

      const nextAttuned = Boolean(foundry.utils.getProperty(changed, "system.attuned"));
      if (!nextAttuned) return; // Unattuning is always allowed; `updateItem` will free the slot

      const map = this.getSlotMap(actor);
      if (Object.values(map).includes(item.id)) return; // Already assigned to a slot

      const freeInCat = this.findFreeSlotForItem(actor, item, { slotMap: map, allowFallback: false });
      if (freeInCat) return; // `updateItem` will place it into `freeInCat`

      // No free slot in the item's natural category! Block native toggle and open Slot Manager to replace/choose!
      const cat = this.detectCategoryForItem(item);
      const catSlotDefs = this.SLOTS.filter(s => s.category === cat);
      const occupants = catSlotDefs
        .map(s => `${s.label}: ${actor.items?.get(map[s.id])?.name || "Ocupado"}`)
        .join(" | ");

      ui.notifications?.warn?.(
        `[Slots de Sintonização] Slot cheio para "${item.name}" (${occupants}). Escolha um slot ou substitua o item na janela de Slots de Sintonização!`
      );
      setTimeout(() => this.openAttunementSlotsDialog(actor, { highlightItemId: item.id }), 30);
      return false;
    });

    // Keep slot mapping synchronized whenever an item is attuned/unattuned or deleted
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

    // Inject "Slots de Sintonização" toolbar button + click binding on native `.attunement-tracker`
    const onRenderSheet = (app, htmlOrEl) => {
      const actor = app?.actor || app?.document;
      if (!actor || actor.type !== "character") return;
      const rootEl = htmlOrEl instanceof HTMLElement ? htmlOrEl : htmlOrEl?.[0] || app?.element;
      if (!rootEl) return;

      const inject = () => this.injectInventorySlotControls(actor, rootEl);
      inject();
      requestAnimationFrame(inject);
      setTimeout(inject, 140);
      setTimeout(inject, 450);

      // Re-inject when switching tabs inside Tidy5e Svelte sheet
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

  /**
   * Inject the compact "Slots de Sintonização (X/14)" button + active slot pills into the Inventory tab
   * and make Tidy5e's native `.attunement-tracker` open the Slot Manager on click.
   */
  static injectInventorySlotControls(actor, rootEl) {
    if (!actor || !rootEl) return;

    const map = this.getSlotMap(actor);
    const usedCount = Object.keys(map).length;
    const totalCount = this.getTotalSlotCount();

    // 1. Make native `.attunement-tracker` clickable to open our Slot Manager
    for (const tracker of rootEl.querySelectorAll(".attunement-tracker")) {
      if (!tracker.dataset.coriaAttuneTrackerBound) {
        tracker.dataset.coriaAttuneTrackerBound = "true";
        tracker.style.cursor = "pointer";
        tracker.title = `Slots de Sintonização (${usedCount}/${totalCount}) — Clique para gerenciar slots de equipamentos mágicos`;
        tracker.addEventListener("click", (ev) => {
          if (ev.target?.closest?.("input")) return;
          ev.preventDefault();
          ev.stopPropagation();
          this.openAttunementSlotsDialog(actor);
        });
      }
    }

    // 2. Locate the Inventory tab content pane
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
      btn.title = "Abrir gerenciador de Slots de Sintonização por equipamento | Clique direito para personalizar cor";
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

    // Compact summary pills of currently attuned slots right next to the button
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
                <span class="coria-attune-pill-slot">${foundry.utils.escapeHTML(slotDef.label.split(" ")[0])}:</span>
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

  /**
   * Open the interactive DialogV2 "Slots de Sintonização" equipment-slot manager for `actor`.
   */
  static async openAttunementSlotsDialog(actor, { highlightItemId = "" } = {}) {
    if (!actor) return;
    if (actor.isOwner) {
      await this.syncActorAttunementSlots(actor);
    }

    // Close existing open dialog for this actor to prevent duplicate windows
    const prevDlg = this._openDialogsByActor.get(actor.id);
    if (prevDlg?.rendered) {
      try {
        await prevDlg.close();
      } catch (_e) {}
    }

    let showAllItems = false;
    const candidateItemTypes = new Set(["equipment", "weapon", "tool", "loot", "container", "consumable", "feat"]);

    const dlg = createV2Dialog(
      {
        title: `Slots de Sintonização — ${actor.name}`,
        content: `<div class="coria-attune-root"></div>`,
        buttons: {
          close: {
            icon: '<i class="fas fa-times"></i>',
            label: "Fechar"
          }
        },
        default: "close",
        close: () => {
          if (this._openDialogsByActor.get(actor.id) === dlg) {
            this._openDialogsByActor.delete(actor.id);
          }
        },
        render: (root) => {
          const dialogRoot = root.closest(".application") || root.closest(".dialog") || root;
          CoriaWindowThemeManager.bindTitleBarRightClick(
            actor,
            dialogRoot,
            "attunement-slots",
            "Slots de Sintonização"
          );

          const container = root.querySelector(".coria-attune-root");
          if (!container) return;

        const renderBody = () => {
          const map = this.getSlotMap(actor);
          const assignedItemIds = new Set(Object.values(map));
          const usedCount = Object.keys(map).length;
          const totalCount = this.getTotalSlotCount();
          const pct = Math.round((usedCount / Math.max(1, totalCount)) * 100);
          const canEdit = Boolean(actor.isOwner);

          const highlightItem = highlightItemId ? actor.items?.get(highlightItemId) : null;
          const highlightCat = highlightItem ? this.detectCategoryForItem(highlightItem) : "";

          // Collect unattuned candidate items in actor's inventory/features
          const availableItems = actor.items
            .filter(i => {
              if (assignedItemIds.has(i.id)) return false;
              if (!candidateItemTypes.has(i.type)) return false;
              if (i.type === "feat") {
                const nLow = String(i.name || "").toLowerCase();
                return nLow.includes("card of the resonant arcana") || this.doesItemRequireAttunement(i);
              }
              if (showAllItems) return true;
              return this.doesItemRequireAttunement(i);
            })
            .sort((a, b) => a.name.localeCompare(b.name));

          const highlightBannerHtml = highlightItem
            ? `
              <div class="coria-attune-alert-banner">
                <i class="fas fa-exclamation-triangle"></i>
                <span>
                  O slot natural de <strong>${foundry.utils.escapeHTML(highlightItem.name)}</strong> está ocupado!
                  Dessintonize o item atual ou selecione <strong>${foundry.utils.escapeHTML(highlightItem.name)}</strong> em outro slot abaixo.
                </span>
              </div>
            `
            : "";

          const groupsHtml = this.SLOT_GROUPS.map(grp => {
            const grpSlots = this.SLOTS.filter(s => s.group === grp.id);
            const cardsHtml = grpSlots
              .map(slot => {
                const occId = map[slot.id];
                const occItem = occId ? actor.items?.get(occId) : null;
                const isHighlightSlot = Boolean(highlightCat && slot.category === highlightCat);

                if (occItem) {
                  const isEquipped = Boolean(occItem.system?.equipped);
                  return `
                    <div class="coria-attune-slot-card is-occupied ${isHighlightSlot ? "is-highlighted" : ""}" data-slot-id="${slot.id}">
                      <div class="coria-attune-slot-head">
                        <span class="coria-attune-slot-title">
                          <i class="fas ${slot.icon}"></i>
                          ${foundry.utils.escapeHTML(slot.label)}
                        </span>
                        <span class="coria-attune-status-badge is-active">Sintonizado</span>
                      </div>
                      <div class="coria-attune-slot-item-row">
                        <img class="coria-attune-item-img" src="${occItem.img || "icons/svg/item-bag.svg"}" alt="${foundry.utils.escapeHTML(occItem.name)}" />
                        <div class="coria-attune-item-info">
                          <a class="coria-attune-item-name" data-open-item="${occItem.id}" title="Abrir ficha do item">
                            ${foundry.utils.escapeHTML(occItem.name)}
                          </a>
                          <div class="coria-attune-item-meta">
                            ${isEquipped ? `<span class="coria-attune-mini-tag"><i class="fas fa-check"></i> Equipado</span>` : `<span class="coria-attune-mini-tag is-muted">Na mochila</span>`}
                          </div>
                        </div>
                        ${
                          canEdit
                            ? `<button type="button" class="coria-attune-remove-btn" data-clear-slot="${slot.id}" title="Dessintonizar e liberar este slot">
                                 <i class="fas fa-unlink"></i>
                               </button>`
                            : ""
                        }
                      </div>
                    </div>
                  `;
                }

                // Empty slot -> dropdown of matching & other attunable items
                const recommended = availableItems.filter(i => this.detectCategoryForItem(i) === slot.category);
                const others = availableItems.filter(i => this.detectCategoryForItem(i) !== slot.category);

                let optsHtml = `<option value="">— Selecionar item para ${foundry.utils.escapeHTML(slot.label)} —</option>`;
                if (recommended.length > 0) {
                  optsHtml += `<optgroup label="Recomendados para ${foundry.utils.escapeHTML(slot.label)}">`;
                  for (const it of recommended) {
                    const sel = highlightItem && it.id === highlightItem.id ? "selected" : "";
                    optsHtml += `<option value="${it.id}" ${sel}>${foundry.utils.escapeHTML(it.name)}</option>`;
                  }
                  optsHtml += `</optgroup>`;
                }
                if (others.length > 0) {
                  optsHtml += `<optgroup label="Outros itens disponíveis">`;
                  for (const it of others) {
                    const sel = !recommended.length && highlightItem && it.id === highlightItem.id ? "selected" : "";
                    optsHtml += `<option value="${it.id}" ${sel}>${foundry.utils.escapeHTML(it.name)}</option>`;
                  }
                  optsHtml += `</optgroup>`;
                }

                return `
                  <div class="coria-attune-slot-card is-empty ${isHighlightSlot ? "is-highlighted" : ""}" data-slot-id="${slot.id}">
                    <div class="coria-attune-slot-head">
                      <span class="coria-attune-slot-title">
                        <i class="fas ${slot.icon}"></i>
                        ${foundry.utils.escapeHTML(slot.label)}
                      </span>
                      <span class="coria-attune-status-badge is-empty">Livre</span>
                    </div>
                    <div class="coria-attune-slot-hint">${foundry.utils.escapeHTML(slot.hint)}</div>
                    ${
                      canEdit
                        ? `<div class="coria-attune-assign-row">
                             <select class="coria-attune-select" data-slot-select="${slot.id}" ${availableItems.length === 0 ? "disabled" : ""}>
                               ${availableItems.length === 0 ? `<option value="">Nenhum item sintonizável livre</option>` : optsHtml}
                             </select>
                             <button type="button" class="coria-attune-assign-btn" data-assign-slot="${slot.id}" ${availableItems.length === 0 ? "disabled" : ""}>
                               <i class="fas fa-link"></i> Sintonizar
                             </button>
                           </div>`
                        : `<div class="coria-attune-readonly-note">Somente o jogador ou Mestre pode alterar.</div>`
                    }
                  </div>
                `;
              })
              .join("");

            return `
              <section class="coria-attune-group">
                <h3 class="coria-attune-group-title">
                  <i class="fas ${grp.icon}"></i> ${foundry.utils.escapeHTML(grp.label)}
                </h3>
                <div class="coria-attune-grid">${cardsHtml}</div>
              </section>
            `;
          }).join("");

          container.innerHTML = `
            <div class="coria-attune-header-bar">
              <div class="coria-attune-counter-box">
                <div class="coria-attune-counter-text">
                  <i class="fas fa-gem"></i>
                  <strong>${usedCount} / ${totalCount}</strong> Slots de Sintonização Ocupados
                </div>
                <div class="coria-attune-progress-track">
                  <div class="coria-attune-progress-fill" style="width: ${pct}%;"></div>
                </div>
              </div>
              <div class="coria-attune-header-controls">
                <label class="coria-attune-toggle-all" title="Permite sintonizar qualquer equipamento, arma, loot ou carta homebrew mesmo sem a flag padrão 'Requires Attunement'">
                  <input type="checkbox" class="coria-attune-show-all-chk" ${showAllItems ? "checked" : ""} />
                  <span>Mostrar todos os equipamentos/itens</span>
                </label>
                ${
                  canEdit
                    ? `<button type="button" class="coria-attune-autosort-btn" title="Auto-alocar quaisquer itens sintonizados que estejam sem slot">
                         <i class="fas fa-wand-magic-sparkles"></i> Auto-Organizar
                       </button>`
                    : ""
                }
              </div>
            </div>
            ${highlightBannerHtml}
            <div class="coria-attune-scroll-area">
              ${groupsHtml}
            </div>
          `;

          // Wire events
          const chk = container.querySelector(".coria-attune-show-all-chk");
          chk?.addEventListener("change", () => {
            showAllItems = Boolean(chk.checked);
            renderBody();
          });

          const autoBtn = container.querySelector(".coria-attune-autosort-btn");
          autoBtn?.addEventListener("click", async (ev) => {
            ev.preventDefault();
            await this.syncActorAttunementSlots(actor);
            renderBody();
          });

          for (const link of container.querySelectorAll("[data-open-item]")) {
            link.addEventListener("click", (ev) => {
              ev.preventDefault();
              const it = actor.items?.get(link.getAttribute("data-open-item"));
              it?.sheet?.render?.(true);
            });
          }

          for (const rmBtn of container.querySelectorAll("[data-clear-slot]")) {
            rmBtn.addEventListener("click", async (ev) => {
              ev.preventDefault();
              const sId = rmBtn.getAttribute("data-clear-slot");
              await this.clearSlot(actor, sId);
              renderBody();
            });
          }

          for (const asBtn of container.querySelectorAll("[data-assign-slot]")) {
            asBtn.addEventListener("click", async (ev) => {
              ev.preventDefault();
              const sId = asBtn.getAttribute("data-assign-slot");
              const sel = container.querySelector(`[data-slot-select="${sId}"]`);
              const itemId = sel?.value || "";
              if (!itemId) {
                ui.notifications?.warn?.("Selecione um item na lista antes de clicar em Sintonizar.");
                return;
              }
              await this.assignItemToSlot(actor, sId, itemId);
              highlightItemId = "";
              renderBody();
            });
          }
        };

        renderBody();
        }
      },
      {
        classes: ["coria-attune-dialog", "flinn-hs-dialog"],
        width: 820,
        height: 680,
        resizable: true
      }
    );

    if (dlg) {
      this._openDialogsByActor.set(actor.id, dlg);
      dlg.render(true);
    }
  }
}
