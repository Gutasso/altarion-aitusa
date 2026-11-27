/**
 * CoriaSpellImporter — Split-Pane Spellbook Importer for Altarion, Kyrion, Flinn, and Parva.
 * (Aitusa automatically mirrors Altarion's Spellbook and therefore does not need this button/window.)
 *
 * Features:
 * - Injects a customizable "Importar Magias" button (right-click color picker) in the Spellbook toolbar
 *   at the exact same location as Flinn's Spellbook toolbar buttons.
 * - Loads authentic 2014 5e spells from Plutonium / 5etools data (`sources.json` + spell JSONs) and
 *   filters them by each character's spellcasting class(es) and current maximum spell slot level:
 *   - Flinn: Single list (Wizard) — Cleric spells are auto-imported.
 *   - Kyrion: Single list (Warlock).
 *   - Parva: Two tabs — Bruxo (Warlock, Primary) & Feiticeiro (Sorcerer, Secondary).
 *   - Altarion: Two tabs — Dragon Rider (Ancestral Spell List, Primary) & Mago (Wizard, Secondary).
 * - Split-pane UI matching Flinn's "Magias Escondidas" browser:
 *   - Left pane: Spell icons, names, Concentration/Ritual tags, Level & School pills, and mini Import button.
 *   - Right pane: Full Rich Text formatted spell description, header metadata box, and bottom Import button.
 *   - Right-click on the window title bar opens CoriaWindowThemeManager to customize window colors (Solid / Gradient).
 */

import { createV2Dialog, CoriaHeaderColorManager, CoriaWindowThemeManager } from "./dialog-v2.js";

const MODULE_ID = "altarion-aitusa";

/**
 * Altarion's Dragon Rider — Ancestral Magic Spell List (`AncestralSpellsList.txt`)
 */
const ANCESTRAL_SPELLS_LIST = new Set([
  // Cantrips
  "acid splash",
  "booming blade",
  "chill touch",
  "fire bolt",
  "light",
  "mage hand",
  "message",
  "mind sliver",
  "minor illusion",
  "poison spray",
  "prestidigitation",
  "ray of frost",
  "shocking grasp",
  "thunderclap",
  // 1st Level
  "absorb elements",
  "armor of agathys",
  "cure wounds",
  "heroism",
  "identify",
  "shield",
  // 2nd Level
  "aid",
  "blur",
  "mirror image",
  "enlarge/reduce",
  "hold person",
  "lesser restoration",
  "prayer of healing",
  "warding bond",
  "warding wind",
  // 3rd Level
  "aura of vitality",
  "blink",
  "dispel magic",
  "fly",
  "fireball",
  "haste",
  "sending",
  // 4th Level
  "aura of purity",
  "fire shield",
  "locate creature",
  "otiluke's resilient sphere",
  "wall of fire"
]);

const SCHOOL_CODE_MAP = {
  A: "abj",
  C: "con",
  D: "div",
  E: "enc",
  V: "evo",
  I: "ill",
  N: "nec",
  T: "trs"
};

const SCHOOL_LABELS_PT = {
  abj: "Abjuração",
  con: "Conjuração",
  div: "Adivinhação",
  enc: "Encantamento",
  evo: "Evocação",
  ill: "Ilusão",
  nec: "Necromancia",
  trs: "Transmutação"
};

const SCHOOL_FALLBACK_ICONS = {
  abj: "icons/magic/defensive/shield-barrier-glowing-blue.webp",
  con: "icons/magic/symbols/runes-star-blue.webp",
  div: "icons/magic/perception/eye-ringed-glow-angry-teal.webp",
  enc: "icons/magic/control/hypnosis-mesmerism-eye.webp",
  evo: "icons/magic/fire/flame-burning-orb.webp",
  ill: "icons/magic/perception/silhouette-stealth-shadow.webp",
  nec: "icons/magic/death/skull-energy-light-purple.webp",
  trs: "icons/magic/time/hourglass-tilted-glowing-gold.webp"
};

const EXCLUDED_2024_SOURCES = new Set(["XPHB", "XDMG", "XMM", "EFA", "FRHoF"]);
const SOURCE_PRIORITY = {
  PHB: 100,
  XGE: 90,
  TCE: 88,
  SCAG: 82,
  FTD: 80,
  SCC: 78,
  EGW: 75,
  AAG: 72,
  IDRotF: 70,
  BMT: 68,
  AI: 65,
  GGR: 62,
  LLK: 60,
  SatO: 58
};

export class CoriaSpellImporter {
  static _catalogPromise = null;
  static _catalogCache = null;
  static _iconMapPromise = null;
  static _iconMapCache = null;
  static _descHtmlCache = new Map();
  static _activeDialogsByActor = new Map();

  static normalizeSpellName(name) {
    return String(name || "")
      .trim()
      .toLowerCase()
      .replace(/[\u2018\u2019\u201A\u201B]/g, "'");
  }

  static getSchoolKey(rawSchool) {
    const s = String(rawSchool || "").trim();
    if (SCHOOL_CODE_MAP[s.toUpperCase()]) return SCHOOL_CODE_MAP[s.toUpperCase()];
    const low = s.toLowerCase();
    if (SCHOOL_LABELS_PT[low]) return low;
    return "evo";
  }

  static getSchoolIcon(schoolKey) {
    return SCHOOL_FALLBACK_ICONS[schoolKey] || "icons/magic/symbols/runes-star-blue.webp";
  }

  /**
   * Build a fast lowercase-name -> icon path lookup map from installed Foundry Item compendiums (e.g. `dnd5e.spells`).
   */
  static async ensureIconMap() {
    if (this._iconMapCache) return this._iconMapCache;
    if (this._iconMapPromise) return this._iconMapPromise;

    this._iconMapPromise = (async () => {
      const map = new Map();
      try {
        for (const pack of game.packs || []) {
          if (pack.documentName !== "Item") continue;
          const coll = String(pack.collection || "").toLowerCase();
          if (!coll.includes("spell")) continue;
          try {
            const idx = await pack.getIndex({ fields: ["img", "name", "type"] });
            for (const entry of idx) {
              if (entry.type && entry.type !== "spell") continue;
              const k = this.normalizeSpellName(entry.name);
              if (k && entry.img && !map.has(k)) {
                map.set(k, entry.img);
              }
            }
          } catch (_e) {
            // ignore pack errors
          }
        }
      } catch (_e) {
        // ignore
      }
      this._iconMapCache = map;
      return map;
    })();

    return this._iconMapPromise;
  }

  /**
   * Load and cache all 2014 5e spells + class membership (`wizard`, `warlock`, `sorcerer`, `ancestral`)
   * from Plutonium's local data files / DataLoader.
   */
  static async ensureSpellCatalog() {
    if (this._catalogCache) return this._catalogCache;
    if (this._catalogPromise) return this._catalogPromise;

    this._catalogPromise = (async () => {
      const iconMap = await this.ensureIconMap();

      // 1. Load Plutonium spell class sources map (`sources.json`)
      let sourcesLookup = {};
      try {
        const res = await fetch("modules/plutonium/data/spells/sources.json");
        if (res.ok) sourcesLookup = await res.json();
      } catch (err) {
        console.warn("[CoriaSpellImporter] Could not fetch Plutonium sources.json:", err);
      }

      // 2. Load raw spell objects via DataLoader or direct Plutonium JSON fetch
      let allRawSpells = [];
      try {
        if (globalThis.DataLoader?.pCacheAndGetAllSite) {
          const pageSpells = globalThis.UrlUtil?.PG_SPELLS || "spells.html";
          const loaded = await globalThis.DataLoader.pCacheAndGetAllSite(pageSpells);
          if (Array.isArray(loaded) && loaded.length > 0) {
            allRawSpells = loaded;
          }
        }
      } catch (_e) {
        // fallback below
      }

      if (allRawSpells.length === 0) {
        try {
          const idxRes = await fetch("modules/plutonium/data/spells/index.json");
          if (idxRes.ok) {
            const idxJson = await idxRes.json();
            const fetches = Object.entries(idxJson)
              .filter(([src]) => !EXCLUDED_2024_SOURCES.has(src) && !String(src).toUpperCase().startsWith("UA"))
              .map(async ([_src, fileName]) => {
                try {
                  const r = await fetch(`modules/plutonium/data/spells/${fileName}`);
                  if (!r.ok) return [];
                  const j = await r.json();
                  return Array.isArray(j?.spell) ? j.spell : [];
                } catch (_e2) {
                  return [];
                }
              });
            const chunks = await Promise.all(fetches);
            allRawSpells = chunks.flat();
          }
        } catch (err) {
          console.warn("[CoriaSpellImporter] Could not load Plutonium spell JSONs:", err);
        }
      }

      // 3. Deduplicate by normalized spell name, preferring authentic 2014 5e sources
      const byNormName = new Map();
      for (const sp of allRawSpells) {
        if (!sp?.name || !sp?.source) continue;
        const srcUpper = String(sp.source).toUpperCase();
        if (EXCLUDED_2024_SOURCES.has(sp.source) || srcUpper.startsWith("UA")) continue;

        const norm = this.normalizeSpellName(sp.name);
        if (!norm) continue;

        const prio = SOURCE_PRIORITY[sp.source] || 20;
        const existing = byNormName.get(norm);
        if (!existing || prio > existing.prio) {
          byNormName.set(norm, { raw: sp, prio });
        }
      }

      // 4. Build normalized catalog records with class memberships & metadata
      const catalog = [];
      for (const [norm, { raw }] of byNormName.entries()) {
        const schoolKey = this.getSchoolKey(raw.school);
        const classes = new Set();

        // Check `sources.json` lookup (handles PHB, XGE, TCE, SCAG, FTD, SCC, etc.)
        const srcEntry = sourcesLookup?.[raw.source]?.[raw.name] || null;
        const checkClassArr = (arr) => {
          if (!Array.isArray(arr)) return;
          for (const c of arr) {
            const cName = String(c?.name || "").trim().toLowerCase();
            const cSrc = String(c?.source || "").toUpperCase();
            if (cSrc === "XPHB") continue;
            if (cName === "wizard" || cName === "warlock" || cName === "sorcerer") {
              classes.add(cName);
            }
          }
        };
        if (srcEntry) {
          checkClassArr(srcEntry.class);
          checkClassArr(srcEntry.classVariant);
        }
        if (raw.classes) {
          checkClassArr(raw.classes.fromClassList);
          checkClassArr(raw.classes.fromClassListVariant);
        }

        if (ANCESTRAL_SPELLS_LIST.has(norm)) {
          classes.add("ancestral");
        }

        const isConc = Boolean(Array.isArray(raw.duration) && raw.duration.some(d => d?.concentration));
        const isRit = Boolean(raw.meta?.ritual);
        const img = iconMap.get(norm) || this.getSchoolIcon(schoolKey);

        catalog.push({
          key: `${norm}::${raw.source}`,
          normName: norm,
          name: raw.name,
          source: raw.source,
          level: Number(raw.level ?? 0),
          schoolKey,
          schoolLabel: SCHOOL_LABELS_PT[schoolKey] || schoolKey.toUpperCase(),
          isConc,
          isRit,
          img,
          classes,
          raw
        });
      }

      catalog.sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));
      this._catalogCache = catalog;
      return catalog;
    })();

    return this._catalogPromise;
  }

  /**
   * Compute the character's maximum spell slot level (1..9) from their active spell slots / Pact Magic.
   */
  static getActorMaxSpellSlotLevel(actor) {
    if (!actor) return 1;
    let maxLvl = 0;

    // 1. Standard leveled spell slots (`spell1` .. `spell9`)
    for (let lvl = 1; lvl <= 9; lvl++) {
      const slot = actor.system?.spells?.[`spell${lvl}`];
      if (Number(slot?.max || 0) > 0) {
        maxLvl = Math.max(maxLvl, lvl);
      }
    }

    // 2. Pact Magic slots (`pact`)
    const pactSlot = actor.system?.spells?.pact;
    if (Number(pactSlot?.max || 0) > 0) {
      maxLvl = Math.max(maxLvl, Number(pactSlot?.level || 0));
    }

    // 3. Warlock Mystic Arcanum fallback (Warlock level 11+ grants 6th..9th spells)
    const warlockCls = actor.items?.find(
      i => i.type === "class" && (i.system?.identifier === "warlock" || i.name?.trim().toLowerCase() === "warlock")
    );
    const warlockLvl = Number(warlockCls?.system?.levels || 0);
    if (warlockLvl >= 11) {
      maxLvl = Math.max(maxLvl, Math.min(9, Math.ceil(warlockLvl / 2)));
    }

    return Math.max(1, maxLvl);
  }

  /**
   * Return the tab configuration for the actor (`flinn`, `kyrion`, `parva`, `altarion`).
   */
  static getTabsForActor(actor) {
    const charKey = CoriaHeaderColorManager.getCharacterKey(actor);
    if (charKey === "flinn") {
      return [
        {
          id: "wizard",
          classKey: "wizard",
          tier: "primary",
          label: "Magias de Mago (Wizard)",
          icon: "fa-hat-wizard",
          showTabsBar: false
        }
      ];
    }
    if (charKey === "kyrion") {
      return [
        {
          id: "warlock",
          classKey: "warlock",
          tier: "secondary",
          label: "Magias de Bruxo (Warlock)",
          icon: "fa-book-dead",
          showTabsBar: false
        }
      ];
    }
    if (charKey === "parva") {
      return [
        {
          id: "warlock",
          classKey: "warlock",
          tier: "primary",
          label: "Magias de Bruxo (Warlock)",
          icon: "fa-book-dead",
          showTabsBar: true
        },
        {
          id: "sorcerer",
          classKey: "sorcerer",
          tier: "secondary",
          label: "Magias de Feiticeiro (Sorcerer)",
          icon: "fa-fire",
          showTabsBar: true
        }
      ];
    }
    if (charKey === "altarion") {
      return [
        {
          id: "ancestral",
          classKey: "ancestral",
          tier: "primary",
          label: "Dragon Rider (Ancestral Magic)",
          icon: "fa-dragon",
          showTabsBar: true
        },
        {
          id: "wizard",
          classKey: "wizard",
          tier: "secondary",
          label: "Magias de Mago (Wizard)",
          icon: "fa-hat-wizard",
          showTabsBar: true
        }
      ];
    }
    return [];
  }

  /**
   * Inject the customizable "Importar Magias" button into the Spellbook toolbar
   * on Altarion, Kyrion, Flinn, and Parva (NEVER Aitusa).
   */
  static ensureImportButtonInToolbar(actor, rootEl) {
    if (!actor || !rootEl) return;
    const charKey = CoriaHeaderColorManager.getCharacterKey(actor);
    if (!["altarion", "kyrion", "flinn", "parva"].includes(charKey)) return;

    const spellbookTab =
      rootEl.querySelector('[data-tab-contents-for="spellbook"]') ||
      rootEl.querySelector(".tidy-tab.spellbook") ||
      rootEl.querySelector('.tab.spellbook[data-tab="spellbook"]') ||
      rootEl.querySelector(".spellbook-footer")?.parentElement;

    if (!spellbookTab) return;

    let toolbar = spellbookTab.querySelector(".flinn-spellbook-toolbar");
    if (!toolbar) {
      toolbar = document.createElement("div");
      toolbar.className = "flinn-spellbook-toolbar";
      spellbookTab.prepend(toolbar);
    }

    let importBtn = toolbar.querySelector(".coria-import-spells-btn");
    if (!importBtn) {
      importBtn = document.createElement("button");
      importBtn.type = "button";
      importBtn.className = "coria-import-spells-btn";
      importBtn.setAttribute("data-coria-color-key", "coria-btn-import-spells");
      importBtn.setAttribute("data-coria-color-label", "Botão Importar Magias");
      importBtn.title = "Abrir janela para importar magias da sua classe para o Spellbook | Clique direito para personalizar cor";
      importBtn.innerHTML = `<i class="fas fa-file-import"></i> Importar Magias`;
      importBtn.addEventListener("click", (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        this.openSpellImporterDialog(actor);
      });
      toolbar.appendChild(importBtn);
    }

    CoriaHeaderColorManager.applyAndBind(actor, toolbar);
  }

  /**
   * Check whether the actor already has a spell in their Spellbook
   * (also accounting for Altarion's upgraded Fire Bolt -> Arcane Bolt, Booming Blade -> Arcane Blade, Armor of Agathys -> Arcane Armor).
   */
  static actorHasSpell(actor, normName) {
    if (!actor || !normName) return false;
    const charKey = CoriaHeaderColorManager.getCharacterKey(actor);
    const aliases = new Set([normName]);
    if (charKey === "altarion") {
      if (normName === "fire bolt") aliases.add("arcane bolt");
      if (normName === "booming blade") aliases.add("arcane blade");
      if (normName === "armor of agathys") aliases.add("arcane armor");
    }
    return actor.items.some(i => i.type === "spell" && aliases.has(this.normalizeSpellName(i.name)));
  }

  /**
   * Format raw 5etools spell metadata (Casting Time, Range, Duration, Components) in Portuguese,
   * matching Flinn's "Magias Escondidas" metadata box.
   */
  static formatRawSpellMeta(entry) {
    const raw = entry.raw || {};

    // Casting Time
    let castTimeStr = "1 Ação";
    if (Array.isArray(raw.time) && raw.time.length > 0) {
      const t = raw.time[0];
      const uMap = {
        action: "Ação",
        bonus: "Ação Bônus",
        reaction: "Reação",
        minute: "Minuto(s)",
        hour: "Hora(s)",
        special: "Especial"
      };
      const uLabel = uMap[t.unit] || t.unit || "Ação";
      castTimeStr = t.unit === "special" ? "Especial" : `${t.number ?? 1} ${uLabel}`;
      if (t.condition) castTimeStr += ` (${t.condition})`;
    }

    // Range
    let rangeStr = "Pessoal";
    if (raw.range) {
      const dist = raw.range.distance || {};
      if (raw.range.type === "special") {
        rangeStr = "Especial";
      } else if (dist.type === "self") {
        rangeStr = raw.range.type && raw.range.type !== "point" ? `Pessoal (${raw.range.type})` : "Pessoal";
      } else if (dist.type === "touch") {
        rangeStr = "Toque";
      } else if (dist.type === "sight") {
        rangeStr = "Linha de Visão";
      } else if (dist.type === "unlimited") {
        rangeStr = "Ilimitado";
      } else if (dist.amount) {
        const unitMap = { feet: "ft", miles: "milha(s)" };
        const areaStr =
          raw.range.type && raw.range.type !== "point" ? ` (${raw.range.type})` : "";
        rangeStr = `${dist.amount} ${unitMap[dist.type] || dist.type || "ft"}${areaStr}`;
      }
    }

    // Duration
    let durationStr = "Instantânea";
    if (Array.isArray(raw.duration) && raw.duration.length > 0) {
      const d = raw.duration[0];
      if (d.type === "instant") {
        durationStr = "Instantânea";
      } else if (d.type === "permanent") {
        durationStr = "Permanente";
      } else if (d.type === "special") {
        durationStr = "Especial";
      } else if (d.type === "timed" && d.duration) {
        const duMap = {
          round: "Rodada(s)",
          turn: "Turno(s)",
          minute: "Minuto(s)",
          hour: "Hora(s)",
          day: "Dia(s)"
        };
        const base = `${d.duration.amount ?? 1} ${duMap[d.duration.type] || d.duration.type || ""}`.trim();
        durationStr = d.concentration ? `Concentração, até ${base}` : base;
      }
    }

    // Components
    const comps = [];
    if (raw.components?.v) comps.push("V");
    if (raw.components?.s) comps.push("S");
    if (raw.components?.m) {
      const mTxt = typeof raw.components.m === "string" ? raw.components.m : raw.components.m?.text || "";
      comps.push(mTxt ? `M (${mTxt})` : "M");
    }
    const compStr = comps.length > 0 ? comps.join(", ") : "Nenhum";

    return {
      castTimeStr,
      rangeStr,
      durationStr,
      compStr
    };
  }

  /**
   * Render a 5etools raw spell description into Rich Text HTML (using Plutonium's 5etools Renderer
   * or clean recursive 5etools entries renderer + Foundry TextEditor.enrichHTML).
   */
  static async renderSpellDescriptionHtml(entry, actor) {
    if (this._descHtmlCache.has(entry.key)) {
      return this._descHtmlCache.get(entry.key);
    }

    const raw = entry.raw || {};
    let html = "";

    // 1. Prefer 5etools Renderer (loaded globally by Plutonium!)
    try {
      if (globalThis.Renderer?.get) {
        const r = globalThis.Renderer.get().setFirstSection(true);
        const parts = [];
        if (Array.isArray(raw.entries) && raw.entries.length > 0) {
          parts.push(r.render({ entries: raw.entries }, 2));
        }
        if (Array.isArray(raw.entriesHigherLevel) && raw.entriesHigherLevel.length > 0) {
          parts.push(r.render({ entries: raw.entriesHigherLevel }, 2));
        }
        html = parts.join("");
      }
    } catch (_e) {
      html = "";
    }

    // 2. Fallback recursive 5etools entries formatter (strips {@tag text|...} cleanly into rich HTML)
    if (!html) {
      const stripTags = (txt) =>
        String(txt || "").replace(/\{@([a-zA-Z]+)\s+([^}]+)\}/g, (_m, tag, body) => {
          const first = body.split("|")[0];
          const tLow = tag.toLowerCase();
          if (tLow === "damage" || tLow === "dice" || tLow === "scaledamage" || tLow === "scaledice") {
            return `<strong>${foundry.utils.escapeHTML(first)}</strong>`;
          }
          if (tLow === "condition" || tLow === "spell" || tLow === "status") {
            return `<em>${foundry.utils.escapeHTML(first)}</em>`;
          }
          return foundry.utils.escapeHTML(first);
        });

      const renderNode = (node) => {
        if (!node) return "";
        if (typeof node === "string") return `<p>${stripTags(node)}</p>`;
        if (Array.isArray(node)) return node.map(renderNode).join("");
        if (node.type === "list" && Array.isArray(node.items)) {
          return `<ul>${node.items.map(it => `<li>${typeof it === "string" ? stripTags(it) : renderNode(it)}</li>`).join("")}</ul>`;
        }
        if (node.type === "entries") {
          const heading = node.name ? `<p><strong>${foundry.utils.escapeHTML(node.name)}.</strong></p>` : "";
          return `${heading}${renderNode(node.entries || [])}`;
        }
        if (node.type === "item") {
          return `<strong>${foundry.utils.escapeHTML(node.name || "")}</strong> ${stripTags(node.entry || "")}${renderNode(node.entries || [])}`;
        }
        if (node.type === "table") {
          const cols = Array.isArray(node.colLabels)
            ? `<thead><tr>${node.colLabels.map(c => `<th>${stripTags(c)}</th>`).join("")}</tr></thead>`
            : "";
          const rows = Array.isArray(node.rows)
            ? `<tbody>${node.rows.map(rw => `<tr>${(Array.isArray(rw) ? rw : []).map(cell => `<td>${typeof cell === "string" ? stripTags(cell) : renderNode(cell)}</td>`).join("")}</tr>`).join("")}</tbody>`
            : "";
          return `<table style="width:100%; border-collapse:collapse; margin:6px 0;">${cols}${rows}</table>`;
        }
        if (node.entries) return renderNode(node.entries);
        return "";
      };

      html = `${renderNode(raw.entries || [])}${renderNode(raw.entriesHigherLevel || [])}`;
    }

    if (!html) html = "<p>Sem descrição disponível.</p>";

    // 3. Enrich with Foundry TextEditor if available
    try {
      const enrichFn =
        foundry?.applications?.ux?.TextEditor?.implementation?.enrichHTML?.bind(
          foundry.applications.ux.TextEditor.implementation
        ) ||
        globalThis.TextEditor?.enrichHTML?.bind(globalThis.TextEditor);
      if (enrichFn) {
        html = await enrichFn(html, {
          async: true,
          relativeTo: actor,
          rollData: actor?.getRollData?.() || {}
        });
      }
    } catch (_e) {
      // keep raw html
    }

    this._descHtmlCache.set(entry.key, html);
    return html;
  }

  /**
   * Import a chosen catalog spell onto `actor` using Plutonium's spell converter
   * (preserving full activities, scaling, icons, and descriptions) and assign class tags.
   */
  static async importSpellToActor(actor, entry, tabConfig) {
    if (!actor || !entry) return false;
    if (!actor.isOwner && !game.user?.isGM) {
      ui.notifications?.warn?.(`Apenas o jogador de ${actor.name} ou o Mestre pode importar magias.`);
      return false;
    }

    if (this.actorHasSpell(actor, entry.normName)) {
      ui.notifications?.info?.(`[${actor.name}] "${entry.name}" já está no Spellbook!`);
      return false;
    }

    const charKey = CoriaHeaderColorManager.getCharacterKey(actor);

    // Special Altarion custom spell replacements (Fire Bolt -> Arcane Bolt, Booming Blade -> Arcane Blade, Armor of Agathys -> Arcane Armor)
    if (charKey === "altarion") {
      const PDB = globalThis.PlutoniumDataBridge;
      const FSM = globalThis.FeatureSyncManager;
      if (entry.normName === "fire bolt" && PDB?.pBuildArcaneBoltSpell) {
        const boltData = await PDB.pBuildArcaneBoltSpell({ forAitusa: false });
        if (boltData) {
          boltData.flags = foundry.utils.mergeObject(boltData.flags || {}, {
            [MODULE_ID]: { coriaSpellClassOrigin: tabConfig.tier }
          });
          await actor.createEmbeddedDocuments("Item", [boltData]);
          const aitusa = globalThis.AltarionAutomationManager?.getAitusaActor?.();
          if (aitusa && FSM?.syncAitusaSpellsFromAltarion) {
            await FSM.syncAitusaSpellsFromAltarion(actor, aitusa);
          }
          ui.notifications?.info?.(`[${actor.name}] "Arcane Bolt" (Dragon Ancestry) importada para o Spellbook e sincronizada com Aitusa!`);
          return true;
        }
      } else if (entry.normName === "booming blade" && PDB?.pBuildArcaneBladeSpell) {
        const bladeData = await PDB.pBuildArcaneBladeSpell();
        if (bladeData) {
          bladeData.flags = foundry.utils.mergeObject(bladeData.flags || {}, {
            [MODULE_ID]: { coriaSpellClassOrigin: tabConfig.tier }
          });
          await actor.createEmbeddedDocuments("Item", [bladeData]);
          const aitusa = globalThis.AltarionAutomationManager?.getAitusaActor?.();
          if (aitusa && FSM?.syncAitusaSpellsFromAltarion) {
            await FSM.syncAitusaSpellsFromAltarion(actor, aitusa);
          }
          ui.notifications?.info?.(`[${actor.name}] "Arcane Blade" (Dragon Ancestry) importada para o Spellbook e sincronizada com Aitusa!`);
          return true;
        }
      } else if (entry.normName === "armor of agathys" && PDB?.pBuildArcaneArmorSpell) {
        const armorData = await PDB.pBuildArcaneArmorSpell();
        if (armorData) {
          armorData.flags = foundry.utils.mergeObject(armorData.flags || {}, {
            [MODULE_ID]: { coriaSpellClassOrigin: tabConfig.tier }
          });
          await actor.createEmbeddedDocuments("Item", [armorData]);
          const aitusa = globalThis.AltarionAutomationManager?.getAitusaActor?.();
          if (aitusa && FSM?.syncAitusaSpellsFromAltarion) {
            await FSM.syncAitusaSpellsFromAltarion(actor, aitusa);
          }
          ui.notifications?.info?.(`[${actor.name}] "Arcane Armor" (Dragon Ancestry) importada para o Spellbook e sincronizada com Aitusa!`);
          return true;
        }
      }
    }

    // Special Parva Armor of Agathys
    if (charKey === "parva" && entry.normName === "armor of agathys" && globalThis.ParvaManager?.syncArmorOfAgathys) {
      await globalThis.ParvaManager.syncArmorOfAgathys(actor);
      ui.notifications?.info?.(`[${actor.name}] "Armor of Agathys" importada para o Spellbook!`);
      return true;
    }

    // Convert via Plutonium (`OtherPlayersBase.pConvertSpell` / `DataConverterSpell`)
    let spellDoc = null;
    try {
      const OPB = globalThis.OtherPlayersBase;
      if (OPB?.waitForPlutonium) {
        const ok = await OPB.waitForPlutonium();
        if (ok && OPB._converters?.DataConverterSpell && entry.raw) {
          spellDoc = await OPB._converters.DataConverterSpell.pGetDocumentJson(
            foundry.utils.deepClone(entry.raw),
            { actor, isActorItem: true }
          );
          if (spellDoc) {
            delete spellDoc._id;
            OPB.sanitizeConvertedDoc?.(spellDoc);
          }
        }
      }
    } catch (err) {
      console.warn(`[CoriaSpellImporter] Direct Plutonium conversion warning for ${entry.name}:`, err);
    }

    if (!spellDoc && globalThis.OtherPlayersBase?.pConvertSpell) {
      spellDoc = await globalThis.OtherPlayersBase.pConvertSpell({
        name: entry.name,
        source: entry.source,
        actor
      });
    }

    // Clean fallback if Plutonium is unavailable
    if (!spellDoc) {
      const descHtml = await this.renderSpellDescriptionHtml(entry, actor);
      spellDoc = {
        name: entry.name,
        type: "spell",
        img: entry.img,
        system: {
          description: { value: descHtml },
          level: entry.level,
          school: entry.schoolKey,
          source: { book: entry.source, rules: "2014" },
          properties: [
            ...(entry.raw?.components?.v ? ["vocal"] : []),
            ...(entry.raw?.components?.s ? ["somatic"] : []),
            ...(entry.raw?.components?.m ? ["material"] : []),
            ...(entry.isConc ? ["concentration"] : []),
            ...(entry.isRit ? ["ritual"] : [])
          ]
        },
        flags: {}
      };
    }

    spellDoc.system = spellDoc.system || {};
    const isCantrip = Number(entry.level || 0) === 0;

    // Homebrew: Longstrider always carries the `ritual` tag!
    if (entry.normName === "longstrider") {
      const curProps = Array.isArray(spellDoc.system.properties)
        ? [...spellDoc.system.properties]
        : spellDoc.system.properties instanceof Set
          ? Array.from(spellDoc.system.properties)
          : [];
      if (!curProps.includes("ritual")) curProps.push("ritual");
      spellDoc.system.properties = curProps;
    }

    if (charKey === "flinn") {
      spellDoc.system.method = "spell";
      spellDoc.system.sourceItem = "class:wizard";
      spellDoc.system.ability = "int";
      spellDoc.system.prepared = isCantrip ? 1 : 0;
      spellDoc.flags = foundry.utils.mergeObject(spellDoc.flags || {}, {
        [MODULE_ID]: {
          flinnSpellOrigin: "wizard",
          isPrimaryClassItem: true,
          isSecondaryClassItem: false,
          coriaSpellClassOrigin: "primary"
        }
      });
    } else if (charKey === "kyrion") {
      spellDoc.system.method = "spell";
      spellDoc.system.sourceItem = "class:warlock";
      spellDoc.system.ability = "cha";
      spellDoc.system.prepared = 1;
      spellDoc.flags = foundry.utils.mergeObject(spellDoc.flags || {}, {
        [MODULE_ID]: {
          isSecondaryClassItem: true,
          coriaSpellClassOrigin: "secondary"
        }
      });
    } else if (charKey === "parva") {
      const isWarlockTab = tabConfig.classKey === "warlock";
      spellDoc.system.method = "spell";
      spellDoc.system.sourceItem = isWarlockTab ? "class:warlock" : "class:sorcerer";
      spellDoc.system.ability = "cha";
      spellDoc.system.prepared = 1;
      spellDoc.flags = foundry.utils.mergeObject(spellDoc.flags || {}, {
        [MODULE_ID]: {
          isPrimaryClassItem: isWarlockTab,
          isSecondaryClassItem: !isWarlockTab,
          coriaSpellClassOrigin: tabConfig.tier
        }
      });
    } else if (charKey === "altarion") {
      const isAncestralTab = tabConfig.classKey === "ancestral";
      spellDoc.system.method = "spell";
      spellDoc.system.sourceItem = isAncestralTab ? "class:dragon-rider" : "class:wizard";
      spellDoc.system.ability = "int";
      spellDoc.system.prepared = 1;
      spellDoc.flags = foundry.utils.mergeObject(spellDoc.flags || {}, {
        [MODULE_ID]: {
          isPrimaryClassItem: isAncestralTab,
          isSecondaryClassItem: !isAncestralTab,
          coriaSpellClassOrigin: tabConfig.tier
        }
      });
    }

    await actor.createEmbeddedDocuments("Item", [spellDoc]);

    // Ensure Altarion's newly imported spell immediately mirrors to Aitusa!
    if (charKey === "altarion") {
      const aitusa = globalThis.AltarionAutomationManager?.getAitusaActor?.();
      if (aitusa?.isOwner && globalThis.FeatureSyncManager?.syncAitusaSpellsFromAltarion) {
        await globalThis.FeatureSyncManager.syncAitusaSpellsFromAltarion(actor, aitusa);
        if (aitusa.sheet?.rendered) aitusa.sheet.render(false);
      }
    }

    // If Flinn imported Spiritual Weapon, configure it automatically
    if (charKey === "flinn" && entry.normName === "spiritual weapon") {
      await globalThis.FlinnManager?.ensureSpiritualWeaponConfigured?.(actor);
    }

    ui.notifications?.info?.(
      `[${actor.name}] Magia "${entry.name}" importada para o Spellbook${
        charKey === "altarion" ? " (e sincronizada com Aitusa)" : ""
      }!`
    );
    return true;
  }

  /**
   * Open the Split-Pane "Importar Magias" DialogV2 window for `actor`.
   */
  static async openSpellImporterDialog(actor) {
    if (!actor) return;
    const tabs = this.getTabsForActor(actor);
    if (tabs.length === 0) return;

    const prev = this._activeDialogsByActor.get(actor.id);
    if (prev?.rendered) {
      try {
        prev.bringToFront?.();
        return;
      } catch (_e) {
        // reopen below
      }
    }

    const maxSlotLvl = this.getActorMaxSpellSlotLevel(actor);
    const showTabsBar = tabs.length > 1 && tabs[0].showTabsBar !== false;
    let activeTabId = tabs[0].id;
    let selectedLevel = "all";
    let selectedSchool = "all";
    let searchQuery = "";
    let selectedSpellKey = null;

    const levelOptionsHtml = [
      `<option value="all">Todos os Níveis (0º – ${maxSlotLvl}º)</option>`,
      `<option value="0">Truques (0º Nível)</option>`,
      ...Array.from({ length: maxSlotLvl }, (_, idx) => {
        const l = idx + 1;
        return `<option value="${l}">${l}º Nível</option>`;
      })
    ].join("");

    const tabsBarHtml = showTabsBar
      ? `
        <div class="flinn-hs-tabs-bar">
          ${tabs
            .map(
              (t, idx) => `
              <button type="button"
                      class="flinn-hs-tab-btn ${t.tier === "primary" ? "is-wizard" : "is-cleric"} ${idx === 0 ? "active" : ""}"
                      data-imp-tab="${t.id}">
                <i class="fas ${t.icon}"></i>
                <span class="flinn-hs-tab-title">${t.label}</span>
                <span class="flinn-hs-tab-badge" data-imp-count="${t.id}">...</span>
              </button>
            `
            )
            .join("")}
        </div>
      `
      : `
        <div class="flinn-hs-tabs-bar" style="justify-content:center;">
          <button type="button"
                  class="flinn-hs-tab-btn ${tabs[0].tier === "primary" ? "is-wizard" : "is-cleric"} active"
                  data-imp-tab="${tabs[0].id}"
                  style="cursor:default;">
            <i class="fas ${tabs[0].icon}"></i>
            <span class="flinn-hs-tab-title">${tabs[0].label} (Até ${maxSlotLvl}º Círculo)</span>
            <span class="flinn-hs-tab-badge" data-imp-count="${tabs[0].id}">...</span>
          </button>
        </div>
      `;

    const d = createV2Dialog(
      {
        title: `Importar Magias — ${actor.name}`,
        content: `
          <div class="flinn-hs-browser-root coria-spell-importer-root">
            ${tabsBarHtml}

            <div class="flinn-hs-filters-bar">
              <select class="flinn-hs-level-select" title="Filtrar por Nível da Magia">
                ${levelOptionsHtml}
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
              <div class="flinn-hs-left-list">
                <div class="flinn-hs-empty-list">
                  <i class="fas fa-spinner fa-spin"></i>
                  <p>Carregando grimório de magias...</p>
                </div>
              </div>
              <div class="flinn-hs-right-detail">
                <div class="flinn-hs-empty-detail">
                  <i class="fas fa-book-open"></i>
                  <p>Selecione uma magia à esquerda para visualizar seus detalhes e importá-la para o Spellbook.</p>
                </div>
              </div>
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
        render: async (html) => {
          const root = html instanceof HTMLElement ? html : html?.[0];
          if (!root) return;

          const dlgEl = d?.element instanceof HTMLElement ? d.element : d?.element?.[0];
          CoriaHeaderColorManager.applyClassCssVarsToElement(actor, root);
          if (dlgEl && dlgEl !== root) {
            CoriaHeaderColorManager.applyClassCssVarsToElement(actor, dlgEl);
          }
          CoriaWindowThemeManager.bindTitleBarRightClick(
            actor,
            dlgEl || root,
            "spell-importer",
            "Importar Magias"
          );

          const tabBtns = root.querySelectorAll(".flinn-hs-tab-btn[data-imp-tab]");
          const lvlSelect = root.querySelector(".flinn-hs-level-select");
          const schoolSelect = root.querySelector(".flinn-hs-school-select");
          const nameInput = root.querySelector(".flinn-hs-name-input");
          const leftList = root.querySelector(".flinn-hs-left-list");
          const rightDetail = root.querySelector(".flinn-hs-right-detail");

          const catalog = await this.ensureSpellCatalog();

          const getActiveTab = () => tabs.find(t => t.id === activeTabId) || tabs[0];
          const getTabSpells = (tabCfg) =>
            catalog.filter(sp => sp.level <= maxSlotLvl && sp.classes.has(tabCfg.classKey));

          const renderRightPane = async (entry, tabCfg) => {
            if (!rightDetail) return;
            if (!entry) {
              rightDetail.innerHTML = `
                <div class="flinn-hs-empty-detail">
                  <i class="fas fa-book-open"></i>
                  <p>Selecione uma magia na lista à esquerda para visualizar seus detalhes e importá-la para o seu Spellbook.</p>
                </div>
              `;
              return;
            }

            const meta = this.formatRawSpellMeta(entry);
            const tierCls = tabCfg.tier === "primary" ? "is-wizard" : "is-cleric";
            const alreadyOwned = this.actorHasSpell(actor, entry.normName);
            const lvlText = entry.level === 0 ? "Truque" : `${entry.level}º Nível`;
            const descHtml = await this.renderSpellDescriptionHtml(entry, actor);

            rightDetail.innerHTML = `
              <div class="flinn-hs-detail-card ${tierCls}">
                <div class="flinn-hs-detail-top">
                  <div class="flinn-hs-detail-header-row">
                    <img class="flinn-hs-detail-icon" src="${entry.img}" alt="${foundry.utils.escapeHTML(entry.name)}" />
                    <div class="flinn-hs-detail-title-block">
                      <div class="flinn-hs-detail-name-line">
                        <h3>${foundry.utils.escapeHTML(entry.name)}</h3>
                        <span class="flinn-hs-detail-subtitle">${lvlText} — ${entry.schoolLabel}</span>
                      </div>
                      <div class="flinn-hs-detail-source">
                        Fonte: <strong>${foundry.utils.escapeHTML(entry.source)}</strong> &bull; Lista: <strong>${foundry.utils.escapeHTML(tabCfg.label)}</strong>
                      </div>
                    </div>
                  </div>
                </div>

                <div class="flinn-hs-detail-meta-box">
                  <div class="flinn-hs-meta-row">
                    <span><i class="fas fa-clock"></i> <strong>Conjuração:</strong> ${foundry.utils.escapeHTML(meta.castTimeStr)}</span>
                    <span><i class="fas fa-ruler-combined"></i> <strong>Alcance:</strong> ${foundry.utils.escapeHTML(meta.rangeStr)}</span>
                    <span><i class="fas fa-hourglass-half"></i> <strong>Duração:</strong> ${foundry.utils.escapeHTML(meta.durationStr)}</span>
                  </div>
                  <div class="flinn-hs-meta-row">
                    <span><i class="fas fa-mortar-pestle"></i> <strong>Comp:</strong> ${foundry.utils.escapeHTML(meta.compStr)}</span>
                    <span><i class="fas fa-brain"></i> <strong>Concentração:</strong> ${entry.isConc ? "Sim" : "Não"}</span>
                    <span><i class="fas fa-book"></i> <strong>Ritual:</strong> ${entry.isRit ? "Sim" : "Não"}</span>
                  </div>
                </div>

                <div class="flinn-hs-detail-body rd__b">
                  ${descHtml}
                </div>

                <div class="flinn-hs-detail-actions">
                  <button type="button"
                          class="flinn-hs-action-prepare ${tierCls} coria-imp-detail-btn"
                          ${alreadyOwned ? "disabled" : ""}>
                    <i class="fas ${alreadyOwned ? "fa-check-circle" : "fa-file-import"}"></i>
                    ${alreadyOwned ? "Já está no Spellbook" : `Importar Magia para o Spellbook (${actor.name})`}
                  </button>
                </div>
              </div>
            `;

            const impBtn = rightDetail.querySelector(".coria-imp-detail-btn");
            impBtn?.addEventListener("click", async (ev) => {
              ev.preventDefault();
              if (alreadyOwned) return;
              impBtn.disabled = true;
              impBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Importando...`;
              await this.importSpellToActor(actor, entry, tabCfg);
              renderBrowser();
            });
          };

          const renderBrowser = () => {
            const tabCfg = getActiveTab();
            const tierCls = tabCfg.tier === "primary" ? "is-wizard" : "is-cleric";

            for (const t of tabs) {
              const badge = root.querySelector(`[data-imp-count="${t.id}"]`);
              if (badge) {
                const cnt = getTabSpells(t).length;
                badge.textContent = `${cnt} magias`;
              }
            }
            for (const tb of tabBtns) {
              tb.classList.toggle("active", tb.getAttribute("data-imp-tab") === activeTabId);
            }

            const matching = getTabSpells(tabCfg).filter(sp => {
              if (selectedLevel !== "all" && sp.level !== Number(selectedLevel)) return false;
              if (selectedSchool !== "all" && sp.schoolKey !== selectedSchool) return false;
              if (searchQuery && !sp.normName.includes(searchQuery)) return false;
              return true;
            });

            if (!matching.some(s => s.key === selectedSpellKey)) {
              selectedSpellKey = matching[0]?.key || null;
            }

            if (leftList) {
              if (matching.length === 0) {
                leftList.innerHTML = `
                  <div class="flinn-hs-empty-list">
                    <i class="fas fa-sparkles"></i>
                    <p>Nenhuma magia encontrada para este filtro.</p>
                  </div>
                `;
              } else {
                leftList.innerHTML = matching
                  .map(sp => {
                    const isSel = sp.key === selectedSpellKey;
                    const owned = this.actorHasSpell(actor, sp.normName);
                    const lvlShort = sp.level === 0 ? "Truque" : `${sp.level}º`;
                    return `
                      <div class="flinn-hs-spell-row ${tierCls} ${isSel ? "is-selected" : ""}"
                           data-spell-key="${foundry.utils.escapeHTML(sp.key)}">
                        <img class="flinn-hs-row-icon" src="${sp.img}" alt="${foundry.utils.escapeHTML(sp.name)}" />
                        <div class="flinn-hs-row-main">
                          <span class="flinn-hs-row-name">${foundry.utils.escapeHTML(sp.name)}</span>
                          ${sp.isConc ? `<span class="flinn-hs-mini-tag conc" title="Concentração"><i class="fas fa-brain"></i> Conc.</span>` : ""}
                          ${sp.isRit ? `<span class="flinn-hs-mini-tag rit" title="Ritual"><i class="fas fa-book"></i> Rit.</span>` : ""}
                        </div>
                        <div class="flinn-hs-row-right">
                          <span class="flinn-hs-row-school-pill">${lvlShort} • ${sp.schoolLabel}</span>
                          <button type="button"
                                  class="flinn-hs-mini-btn is-prepare ${tierCls} ${owned ? "is-owned" : ""}"
                                  data-imp-mini-key="${foundry.utils.escapeHTML(sp.key)}"
                                  title="${owned ? "Já está no Spellbook" : `Importar ${foundry.utils.escapeHTML(sp.name)} para o Spellbook`}"
                                  ${owned ? "disabled" : ""}>
                            <i class="fas ${owned ? "fa-check" : "fa-file-import"}"></i>
                          </button>
                        </div>
                      </div>
                    `;
                  })
                  .join("");

                const entryByKey = new Map(matching.map(m => [m.key, m]));

                for (const row of leftList.querySelectorAll(".flinn-hs-spell-row")) {
                  row.addEventListener("click", (ev) => {
                    ev.preventDefault();
                    selectedSpellKey = row.getAttribute("data-spell-key");
                    for (const r of leftList.querySelectorAll(".flinn-hs-spell-row")) {
                      r.classList.toggle("is-selected", r === row);
                    }
                    renderRightPane(entryByKey.get(selectedSpellKey) || null, tabCfg);
                  });
                }

                for (const miniBtn of leftList.querySelectorAll("[data-imp-mini-key]")) {
                  miniBtn.addEventListener("click", async (ev) => {
                    ev.preventDefault();
                    ev.stopPropagation();
                    const sKey = miniBtn.getAttribute("data-imp-mini-key");
                    const entry = sKey ? entryByKey.get(sKey) : null;
                    if (!entry || miniBtn.disabled) return;
                    miniBtn.disabled = true;
                    miniBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i>`;
                    await this.importSpellToActor(actor, entry, tabCfg);
                    renderBrowser();
                  });
                }
              }
            }

            const selEntry = matching.find(m => m.key === selectedSpellKey) || null;
            renderRightPane(selEntry, tabCfg);
          };

          if (showTabsBar) {
            for (const tb of tabBtns) {
              tb.addEventListener("click", (ev) => {
                ev.preventDefault();
                activeTabId = tb.getAttribute("data-imp-tab") || tabs[0].id;
                selectedSpellKey = null;
                renderBrowser();
              });
            }
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
            searchQuery = this.normalizeSpellName(nameInput.value || "");
            renderBrowser();
          });

          renderBrowser();
        },
        close: () => {
          if (this._activeDialogsByActor.get(actor.id) === d) {
            this._activeDialogsByActor.delete(actor.id);
          }
        }
      },
      { classes: ["coria-dialog", "flinn-hs-dialog", "coria-spell-importer-dialog"], width: 940, height: 650, resizable: true }
    );
    this._activeDialogsByActor.set(actor.id, d);
    d.render(true);
  }
}

globalThis.CoriaSpellImporter = CoriaSpellImporter;
