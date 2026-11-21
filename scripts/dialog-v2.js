/**
 * CoriaDialogV2 — Foundry VTT v13 ApplicationV2 (`DialogV2`) compatibility factory.
 *
 * Replaces all deprecated V1 `new Dialog(data, options)` usages across the module
 * with native `foundry.applications.api.DialogV2`, eliminating all V1 Application
 * framework deprecation warnings while preserving full CSS/callback compatibility.
 */

let _CoriaDialogV2Class = null;

function extractIconClass(rawIcon) {
  if (!rawIcon || typeof rawIcon !== "string") return "";
  const trimmed = rawIcon.trim();
  const match = /class\s*=\s*["']([^"']+)["']/i.exec(trimmed);
  if (match) return match[1].trim();
  if (!trimmed.startsWith("<")) return trimmed;
  return "";
}

function getCoriaDialogV2Class() {
  if (_CoriaDialogV2Class) return _CoriaDialogV2Class;
  const BaseDialogV2 = foundry?.applications?.api?.DialogV2;
  if (!BaseDialogV2) return null;

  _CoriaDialogV2Class = class CoriaDialogV2 extends BaseDialogV2 {
    constructor(v2Config, hooks = {}) {
      super(v2Config);
      this._coriaRenderCb = typeof hooks.render === "function" ? hooks.render : null;
      this._coriaCloseCb = typeof hooks.close === "function" ? hooks.close : null;
      this._coriaCloseFired = false;
    }

    render(options = {}, _options = {}) {
      if (typeof options === "boolean") {
        const extra = typeof _options === "object" && _options ? _options : {};
        return super.render({ ...extra, force: options });
      }
      return super.render(options, _options);
    }

    _onRender(context, options) {
      super._onRender(context, options);
      const el = this.element;
      if (el) {
        const footer = el.querySelector("footer.form-footer");
        if (footer) {
          footer.classList.add("dialog-buttons");
          for (const btn of footer.querySelectorAll("button[data-action]")) {
            const act = btn.getAttribute("data-action");
            if (act && !btn.hasAttribute("data-button")) {
              btn.setAttribute("data-button", act);
            }
          }
        }
        if (this._coriaRenderCb) {
          try {
            this._coriaRenderCb(el);
          } catch (err) {
            console.warn("[Altarion & Aitusa] Error in DialogV2 render callback:", err);
          }
        }
      }
    }

    _onClose(options) {
      super._onClose(options);
      if (this._coriaCloseCb && !this._coriaCloseFired) {
        this._coriaCloseFired = true;
        try {
          this._coriaCloseCb(this.element);
        } catch (err) {
          console.warn("[Altarion & Aitusa] Error in DialogV2 close callback:", err);
        }
      }
    }
  };

  return _CoriaDialogV2Class;
}

/**
 * Create a Foundry V13 `DialogV2` instance using the familiar `{ title, content, buttons, default, render, close }`
 * and `{ width, height, classes, resizable }` options structure.
 *
 * @param {object} data
 * @param {object} [options={}]
 * @returns {foundry.applications.api.DialogV2|Dialog}
 */
export function createV2Dialog(data = {}, options = {}) {
  const DialogV2Cls = getCoriaDialogV2Class();
  if (!DialogV2Cls) {
    return new Dialog(data, options);
  }

  const rawButtons = data.buttons || {};
  const buttonEntries = Array.isArray(rawButtons)
    ? rawButtons
    : Object.entries(rawButtons).map(([action, cfg]) => ({ action, ...(cfg || {}) }));

  const v2Buttons = buttonEntries.map(btn => {
    const action = btn.action || "ok";
    const userCb = typeof btn.callback === "function" ? btn.callback : null;
    return {
      action,
      label: btn.label || action,
      icon: extractIconClass(btn.icon),
      default: Boolean(btn.default || (data.default && data.default === action)),
      callback: (event, button, dialog) => {
        if (!userCb) return action;
        const rootEl = dialog?.element || button?.closest?.(".application, dialog") || null;
        try {
          const res = userCb(rootEl, event, button, dialog);
          if (res && typeof res.catch === "function") {
            res.catch(err => console.warn("[Altarion & Aitusa] Error in DialogV2 button callback:", err));
          }
        } catch (err) {
          console.warn("[Altarion & Aitusa] Error in DialogV2 button callback:", err);
        }
        return action;
      }
    };
  });

  if (v2Buttons.length === 0) {
    v2Buttons.push({
      action: "close",
      label: "Fechar",
      icon: "fas fa-times",
      default: true
    });
  }

  const position = {};
  if (options.width !== undefined && options.width !== null) position.width = options.width;
  if (options.height !== undefined && options.height !== null) position.height = options.height;

  const classes = Array.isArray(options.classes) ? [...options.classes] : [];

  const v2Config = {
    window: {
      title: data.title || "",
      resizable: Boolean(options.resizable)
    },
    content: data.content || "",
    buttons: v2Buttons,
    modal: false,
    rejectClose: false,
    classes
  };

  if (Object.keys(position).length > 0) {
    v2Config.position = position;
  }

  return new DialogV2Cls(v2Config, {
    render: data.render,
    close: data.close
  });
}

const MODULE_ID = "altarion-aitusa";

/**
 * Complete set of 5e Wizard spell names (lowercase) + Altarion's custom Wizard spells (`abjuration bulwark`,
 * `arcane armor`, `altarion's echoing ward`, `arcane bolt`, `arcane blade`).
 * Used on Altarion to distinguish Wizard spells (`secondary`) from Dragon Rider Ancestral Magic spells (`primary`).
 */
const WIZARD_SPELLS_SET = new Set([
  // Altarion Custom Wizard Spells & Abjuration Bulwark
  "abjuration bulwark",
  "arcane armor",
  "altarion's echoing ward",
  "arcane bolt",
  "arcane blade",
  // Cantrips
  "acid splash",
  "blade ward",
  "booming blade",
  "chill touch",
  "control flames",
  "create bonfire",
  "dancing lights",
  "encode thoughts",
  "fire bolt",
  "friends",
  "frostbite",
  "green-flame blade",
  "gust",
  "infestation",
  "light",
  "lightning lure",
  "mage hand",
  "mending",
  "message",
  "mind sliver",
  "minor illusion",
  "mold earth",
  "poison spray",
  "prestidigitation",
  "ray of frost",
  "Sapping Sting",
  "shape water",
  "shocking grasp",
  "sword burst",
  "thunderclap",
  "toll the dead",
  "true strike",
  // 1st Level
  "absorb elements",
  "alarm",
  "burning hands",
  "catapult",
  "cause fear",
  "charm person",
  "chromatic orb",
  "color spray",
  "comprehend languages",
  "detect magic",
  "disguise self",
  "earth tremor",
  "expeditious retreat",
  "false life",
  "feather fall",
  "find familiar",
  "fog cloud",
  "frost fingers",
  "gift of alacrity",
  "grease",
  "ice knife",
  "identify",
  "illusory script",
  "jim's magic missile",
  "jump",
  "longstrider",
  "mage armor",
  "magic missile",
  "magnify gravity",
  "protection from evil and good",
  "ray of sickness",
  "shield",
  "silent image",
  "silvery barbs",
  "sleep",
  "snare",
  "tasha's caustic brew",
  "tasha's hideous laughter",
  "tenser's floating disk",
  "thunderwave",
  "unseen servant",
  "witch bolt",
  // 2nd Level
  "aganazzar's scorcher",
  "air bubble",
  "alter self",
  "arcane lock",
  "augury",
  "blindness/deafness",
  "blur",
  "borrowed knowledge",
  "cloud of daggers",
  "Continual Flame",
  "continual flame",
  "crown of madness",
  "darkness",
  "darkvision",
  "detect thoughts",
  "dragon's breath",
  "dust devil",
  "earthbind",
  "enhance ability",
  "enlarge/reduce",
  "flaming sphere",
  "flock of familiars",
  "fortune's favor",
  "gentle repose",
  "gift of gab",
  "gust of wind",
  "hold person",
  "immovable object",
  "invisibility",
  "jim's glowing coin",
  "kinetic jaunt",
  "knock",
  "levitate",
  "locate object",
  "magic mouth",
  "magic weapon",
  "maximilian's earthen grasp",
  "melf's acid arrow",
  "mind spike",
  "mirror image",
  "misty step",
  "nathair's mischief",
  "nystul's magic aura",
  "phantasmal force",
  "pyrotechnics",
  "ray of enfeeblement",
  "rime's binding ice",
  "rope trick",
  "scorching ray",
  "see invisibility",
  "shadow blade",
  "shatter",
  "skywrite",
  "snilloc's snowball swarm",
  "spider climb",
  "spray of cards",
  "suggestion",
  "tasha's mind whip",
  "vortex warp",
  "warding wind",
  "warp sense",
  "web",
  "wither and bloom",
  "wristpocket",
  // 3rd Level
  "animate dead",
  "antagonize",
  "ashardalon's stride",
  "bestow curse",
  "blink",
  "catnap",
  "clairvoyance",
  "counterspell",
  "dispel magic",
  "enemies abound",
  "erupting earth",
  "fast friends",
  "fear",
  "feign death",
  "fireball",
  "flame arrows",
  "fly",
  "galder's tower",
  "gaseous form",
  "glyph of warding",
  "haste",
  "hypnotic pattern",
  "incite greed",
  "intellect fortress",
  "leomund's tiny hut",
  "life transference",
  "lightning bolt",
  "magic circle",
  "major image",
  "melf's minute meteors",
  "nondetection",
  "phantom steed",
  "protection from energy",
  "pulse wave",
  "remove curse",
  "sending",
  "sleet storm",
  "slow",
  "speak with dead",
  "spirit shroud",
  "stinking cloud",
  "summon fey",
  "summon lesser demons",
  "summon shadowspawn",
  "summon undead",
  "thunder step",
  "tidal wave",
  "tiny servant",
  "tongues",
  "vampiric touch",
  "wall of sand",
  "wall of water",
  "water breathing",
  // 4th Level
  "arcane eye",
  "banishment",
  "blight",
  "charm monster",
  "confusion",
  "conjure minor elementals",
  "control water",
  "dimension door",
  "divination",
  "elemental bane",
  "evard's black tentacles",
  "fabricate",
  "fire shield",
  "galder's speedy courier",
  "gravity sinkhole",
  "greater invisibility",
  "hallucinatory terrain",
  "ice storm",
  "leomund's secret chest",
  "locate creature",
  "mordenkainen's faithful hound",
  "mordenkainen's private sanctum",
  "otiluke's resilient sphere",
  "phantasmal killer",
  "polymorph",
  "raulothim's psychic lance",
  "sickening radiance",
  "spirit of death",
  "stone shape",
  "stoneskin",
  "storm sphere",
  "summon aberration",
  "summon construct",
  "summon elemental",
  "summon greater demon",
  "vitriolic sphere",
  "wall of fire",
  "watery sphere",
  // 5th Level
  "animate objects",
  "bigby's hand",
  "cloudkill",
  "cone of cold",
  "conjure elemental",
  "contact other plane",
  "control winds",
  "creation",
  "danse macabre",
  "dawn",
  "dominate person",
  "dream",
  "enervation",
  "far step",
  "geas",
  "hold monster",
  "immolation",
  "infernal calling",
  "legend lore",
  "mislead",
  "modify memory",
  "negative energy flood",
  "passwall",
  "planar binding",
  "rary's telepathic bond",
  "scrying",
  "seeming",
  "skill empowerment",
  "steel wind strike",
  "summon draconic spirit",
  "synaptic static",
  "telekinesis",
  "teleportation circle",
  "temporal shunt",
  "transmute rock",
  "wall of force",
  "wall of light",
  "wall of stone",
  // 6th - 9th Level
  "arcane gate",
  "chain lightning",
  "circle of death",
  "contingency",
  "create homunculus",
  "create undead",
  "disintegrate",
  "drawmij's instant summons",
  "eyebite",
  "flesh to stone",
  "fizban's platinum shield",
  "globe of invulnerability",
  "guards and wards",
  "investiture of flame",
  "investiture of ice",
  "investiture of stone",
  "investiture of wind",
  "magic jar",
  "mass suggestion",
  "mental prison",
  "move earth",
  "otiluke's freezing sphere",
  "otto's irresistible dance",
  "programmed illusion",
  "scatter",
  "soul cage",
  "summon fiend",
  "sunbeam",
  "tasha's otherworldly guise",
  "tenser's transformation",
  "true seeing",
  "wall of ice",
  "crown of stars",
  "delayed blast fireball",
  "draconic transformation",
  "dream of the blue veil",
  "etherealness",
  "finger of death",
  "forcecage",
  "mirage arcane",
  "mordenkainen's magnificent mansion",
  "mordenkainen's sword",
  "plane shift",
  "power word pain",
  "prismatic spray",
  "project image",
  "reverse gravity",
  "sequester",
  "simulacrum",
  "symbol",
  "teleport",
  "Tether Essence",
  "whirlwind",
  "abi-dalzim's horrid wilting",
  "antimagic field",
  "antipathy/sympathy",
  "clone",
  "control weather",
  "dark star",
  "demiplane",
  "dominate monster",
  "feeblemind",
  "illusory dragon",
  "incendiary cloud",
  "maddening darkness",
  "maze",
  "mighty fortress",
  "mind blank",
  "power word stun",
  "reality break",
  "sunburst",
  "telepathy",
  "astral projection",
  "blade of disaster",
  "foresight",
  "gate",
  "imprisonment",
  "invulnerability",
  "mass polymorph",
  "meteor swarm",
  "power word kill",
  "prismatic wall",
  "psychic scream",
  "ravenous void",
  "shapechange",
  "time ravage",
  "time stop",
  "true polymorph",
  "weird",
  "wish"
]);

/**
 * Complete set of Warlock + Fathomless Expanded spell names (lowercase) for Parva's default Warlock classification.
 */
const WARLOCK_SPELLS_SET = new Set([
  "armor of agathys",
  "arms of hadar",
  "blade ward",
  "booming blade",
  "cause fear",
  "charm person",
  "chill touch",
  "comprehend languages",
  "create bonfire",
  "create or destroy water",
  "crown of madness",
  "darkness",
  "earthbind",
  "eldritch blast",
  "enhrall",
  "enthrall",
  "expeditious retreat",
  "flock of familiars",
  "friends",
  "frostbite",
  "green-flame blade",
  "gust of wind",
  "hellish rebuke",
  "hex",
  "hold person",
  "hunger of hadar",
  "Hypnotic Pattern",
  "hypnotic pattern",
  "illusory script",
  "infestation",
  "invisibility",
  "lightning bolt",
  "lightning lure",
  "mage hand",
  "magic stone",
  "mind sliver",
  "mind spike",
  "minor illusion",
  "mirror image",
  "misty step",
  "poison spray",
  "prestidigitation",
  "protection from evil and good",
  "ray of enfeeblement",
  "shadow blade",
  "shatter",
  "silence",
  "sleet storm",
  "spider climb",
  "spirit shroud",
  "suggestion",
  "summon fey",
  "summon lesser demons",
  "summon shadowspawn",
  "summon undead",
  "sword burst",
  "thunder step",
  "thunderclap",
  "thunderwave",
  "toll the dead",
  "tongues",
  "true strike",
  "unseen servant",
  "vampiric touch",
  "witch bolt",
  "banishment",
  "blight",
  "charm monster",
  "control water",
  "dimension door",
  "elemental bane",
  "evard's black tentacles",
  "galder's speedy courier",
  "hallucinatory terrain",
  "raulothim's psychic lance",
  "shadow of moil",
  "sickening radiance",
  "spirit of death",
  "summon aberration",
  "summon elemental",
  "summon greater demon",
  "bigby's hand",
  "cone of cold",
  "contact other plane",
  "danse macabre",
  "dream",
  "enervation",
  "far step",
  "hold monster",
  "infernal calling",
  "mislead",
  "negative energy flood",
  "planar binding",
  "scrying",
  "synaptic static",
  "teleportation circle",
  "wall of light"
]);

export class CoriaHeaderColorManager {
  static hexToRgb(hex) {
    const clean = String(hex || "#38bdf8").replace("#", "").trim();
    if (clean.length === 3) {
      const r = parseInt(clean[0] + clean[0], 16) || 56;
      const g = parseInt(clean[1] + clean[1], 16) || 189;
      const b = parseInt(clean[2] + clean[2], 16) || 248;
      return { r, g, b };
    }
    const num = parseInt(clean.slice(0, 6), 16);
    if (Number.isNaN(num)) return { r: 56, g: 189, b: 248 };
    return {
      r: (num >> 16) & 255,
      g: (num >> 8) & 255,
      b: num & 255
    };
  }

  static brightenHex(hex, mixWhite = 0.55) {
    const { r, g, b } = this.hexToRgb(hex);
    const nr = Math.round(r + (255 - r) * mixWhite);
    const ng = Math.round(g + (255 - g) * mixWhite);
    const nb = Math.round(b + (255 - b) * mixWhite);
    return `#${[nr, ng, nb].map(v => Math.clamp(v, 0, 255).toString(16).padStart(2, "0")).join("")}`;
  }

  static getCharacterKey(actor) {
    const n = String(actor?.name || "").trim().toLowerCase();
    if (n.includes("flinn")) return "flinn";
    if (n.includes("altarion")) return "altarion";
    if (n.includes("aitusa")) return "aitusa";
    if (n.includes("parva")) return "parva";
    if (n.includes("kyrion")) return "kyrion";
    return "other";
  }

  static getDefaultClassColors(actor) {
    const charKey = this.getCharacterKey(actor);
    if (charKey === "flinn") {
      return {
        primary: { mode: "solid", color1: "#38bdf8", color2: "#38bdf8", label: "Wizard", icon: "fa-hat-wizard" },
        secondary: { mode: "solid", color1: "#facc15", color2: "#facc15", label: "Cleric", icon: "fa-pray" }
      };
    }
    if (charKey === "altarion") {
      return {
        primary: { mode: "solid", color1: "#3b82f6", color2: "#3b82f6", label: "Dragon Rider", icon: "fa-dragon" },
        secondary: { mode: "solid", color1: "#a855f7", color2: "#a855f7", label: "Wizard", icon: "fa-hat-wizard" }
      };
    }
    if (charKey === "aitusa") {
      return {
        primary: { mode: "solid", color1: "#10b981", color2: "#10b981", label: "Dragon Companion", icon: "fa-paw" },
        secondary: { mode: "solid", color1: "#3b82f6", color2: "#3b82f6", label: "Dragon Companion", icon: "fa-paw" }
      };
    }
    if (charKey === "parva") {
      return {
        primary: { mode: "solid", color1: "#3b82f6", color2: "#3b82f6", label: "Warlock", icon: "fa-eye" },
        secondary: { mode: "solid", color1: "#a855f7", color2: "#a855f7", label: "Sorcerer", icon: "fa-sun" }
      };
    }
    if (charKey === "kyrion") {
      return {
        primary: { mode: "solid", color1: "#3b82f6", color2: "#3b82f6", label: "Rogue", icon: "fa-user-ninja" },
        secondary: { mode: "solid", color1: "#a855f7", color2: "#a855f7", label: "Warlock", icon: "fa-eye" }
      };
    }
    return {
      primary: { mode: "solid", color1: "#3b82f6", color2: "#3b82f6", label: "Primary", icon: "fa-star" },
      secondary: { mode: "solid", color1: "#a855f7", color2: "#a855f7", label: "Secondary", icon: "fa-magic" }
    };
  }

  static getSavedIndicatorColors(actor) {
    return actor?.flags?.[MODULE_ID]?.headerIndicatorColors || {};
  }

  static applyColorConfigToElement(el, cfg) {
    if (!el || !cfg || !cfg.color1) return;
    const mode = cfg.mode === "gradient" ? "gradient" : "solid";
    const c1 = cfg.color1 || "#38bdf8";
    const c2 = mode === "gradient" ? cfg.color2 || "#facc15" : c1;
    const rgb1 = this.hexToRgb(c1);
    const rgb2 = this.hexToRgb(c2);
    const text1 = this.brightenHex(c1, 0.58);
    const text2 = this.brightenHex(c2, 0.58);

    if (mode === "solid") {
      el.style.setProperty(
        "background",
        `linear-gradient(135deg, rgba(${rgb1.r}, ${rgb1.g}, ${rgb1.b}, 0.36) 0%, rgba(${rgb1.r}, ${rgb1.g}, ${rgb1.b}, 0.18) 100%), rgba(10, 14, 24, 0.86)`,
        "important"
      );
      el.style.setProperty("border", `1px solid ${c1}`, "important");
      el.style.setProperty(
        "box-shadow",
        `0 0 8px rgba(${rgb1.r}, ${rgb1.g}, ${rgb1.b}, 0.32), inset 0 0 6px rgba(${rgb1.r}, ${rgb1.g}, ${rgb1.b}, 0.14)`,
        "important"
      );
      el.style.setProperty("color", text1, "important");
      for (const child of el.querySelectorAll("i, strong")) {
        child.style.setProperty("color", text1, "important");
      }
    } else {
      el.style.setProperty(
        "background",
        `linear-gradient(90deg, rgba(${rgb1.r}, ${rgb1.g}, ${rgb1.b}, 0.42) 0%, rgba(${rgb2.r}, ${rgb2.g}, ${rgb2.b}, 0.42) 100%), rgba(10, 14, 24, 0.88)`,
        "important"
      );
      el.style.setProperty("border-top", `1px solid ${c1}`, "important");
      el.style.setProperty("border-left", `1px solid ${c1}`, "important");
      el.style.setProperty("border-right", `1px solid ${c2}`, "important");
      el.style.setProperty("border-bottom", `1px solid ${c2}`, "important");
      el.style.setProperty(
        "box-shadow",
        `-3px 0 8px rgba(${rgb1.r}, ${rgb1.g}, ${rgb1.b}, 0.28), 3px 0 8px rgba(${rgb2.r}, ${rgb2.g}, ${rgb2.b}, 0.28)`,
        "important"
      );
      el.style.setProperty("color", text1, "important");
      for (const icon of el.querySelectorAll("i")) {
        icon.style.setProperty("color", text1, "important");
      }
      for (const strong of el.querySelectorAll("strong")) {
        strong.style.setProperty("color", text2, "important");
      }
    }
  }

  /**
   * Apply saved indicator colors and bind right-click (`contextmenu`) color customizer to all
   * `[data-coria-color-key]` elements inside `containerEl`.
   */
  static applyAndBind(actor, containerEl) {
    if (!actor || !containerEl) return;
    const savedMap = this.getSavedIndicatorColors(actor);
    const elements = containerEl.matches?.("[data-coria-color-key]")
      ? [containerEl]
      : Array.from(containerEl.querySelectorAll("[data-coria-color-key]"));

    for (const el of elements) {
      const key = el.getAttribute("data-coria-color-key");
      if (!key) continue;
      if (savedMap[key]) {
        this.applyColorConfigToElement(el, savedMap[key]);
      } else {
        for (const prop of [
          "background",
          "border",
          "border-top",
          "border-left",
          "border-right",
          "border-bottom",
          "box-shadow",
          "color"
        ]) {
          el.style.removeProperty(prop);
        }
      }

      if (el.dataset.boundCoriaColorMenu === "true") continue;
      el.dataset.boundCoriaColorMenu = "true";
      el.addEventListener("contextmenu", (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        if (!actor.isOwner && !game.user?.isGM) return;
        const label =
          el.getAttribute("data-coria-color-label") ||
          el.textContent?.replace(/\s+/g, " ")?.trim() ||
          key;
        this.openIndicatorColorPicker(actor, key, label, el);
      });
    }
  }

  /**
   * Open the Right-Click Color & Gradient Picker Dialog (`Cor Sólida` vs `Gradiente`) for a header indicator/button.
   */
  static openIndicatorColorPicker(actor, key, label, targetEl = null) {
    if (!actor || !key) return;
    const savedMap = foundry.utils.deepClone(this.getSavedIndicatorColors(actor));
    const defaults = this.getDefaultClassColors(actor);
    const defaultC1 =
      key === "class-primary"
        ? defaults.primary.color1
        : key === "class-secondary"
          ? defaults.secondary.color1
          : key === "flinn-intuitive-dc"
            ? "#38bdf8"
            : key === "flinn-luck-points"
              ? "#1ea61c"
              : key === "parva-tentacle-uses"
                ? "#0ea5e9"
                : key === "res-arcane-step"
                  ? "#8b5cf6"
                  : key === "flinn-btn-toggle-unprep"
                    ? "#0284c7"
                    : key === "flinn-btn-hidden-spells"
                      ? "#ca8a04"
                      : key === "coria-btn-import-spells"
                        ? "#7c3aed"
                        : "#3b82f6";
    const defaultC2 =
      key === "flinn-intuitive-dc"
        ? "#facc15"
        : key === "flinn-btn-toggle-unprep"
          ? "#2563eb"
          : key === "flinn-btn-hidden-spells"
            ? "#a16207"
            : key === "coria-btn-import-spells"
              ? "#2563eb"
              : "#a855f7";

    const current = savedMap[key] || {
      mode: key === "flinn-intuitive-dc" ? "gradient" : "solid",
      color1: defaultC1,
      color2: defaultC2
    };

    const sampleHtml = targetEl ? targetEl.innerHTML : `<i class="fas fa-sparkles"></i> ${foundry.utils.escapeHTML(label)}`;
    const isClassKey = key === "class-primary" || key === "class-secondary";

    const d = createV2Dialog(
      {
        title: `Personalizar Cor — ${label}`,
        content: `
          <div class="coria-arcane-box" style="text-align:left; padding:12px 14px;">
            <h3 style="text-align:center; margin-bottom:8px;">Cor do Indicador</h3>
            <p style="font-size:0.83rem; color:#cbd5e1; margin-bottom:10px; text-align:center;">
              <strong>${foundry.utils.escapeHTML(label)}</strong> (${foundry.utils.escapeHTML(actor.name)})
              ${isClassKey ? `<br><span style="color:#fde047; font-size:0.78rem;"><i class="fas fa-book-spells"></i> Também altera a cor de destaque das magias desta classe no Spellbook!</span>` : ""}
            </p>

            <div style="display:flex; gap:10px; justify-content:center; margin-bottom:12px;">
              <label style="display:flex; align-items:center; gap:6px; padding:6px 12px; border-radius:6px; background:rgba(15,23,42,0.85); border:1px solid rgba(56,189,248,0.45); cursor:pointer; font-weight:700; color:#f8fafc;">
                <input type="radio" name="coriaColorMode" value="solid" ${current.mode !== "gradient" ? "checked" : ""} />
                <span><i class="fas fa-circle"></i> Cor Sólida</span>
              </label>
              <label style="display:flex; align-items:center; gap:6px; padding:6px 12px; border-radius:6px; background:rgba(15,23,42,0.85); border:1px solid rgba(250,204,21,0.45); cursor:pointer; font-weight:700; color:#f8fafc;">
                <input type="radio" name="coriaColorMode" value="gradient" ${current.mode === "gradient" ? "checked" : ""} />
                <span><i class="fas fa-adjust"></i> Gradiente (2 Cores)</span>
              </label>
            </div>

            <div style="display:flex; gap:12px; align-items:stretch; justify-content:center; margin-bottom:14px;">
              <div class="coria-color-col-1" style="flex:1; background:rgba(10,14,24,0.75); border:1px solid rgba(255,255,255,0.15); border-radius:6px; padding:8px; text-align:center;">
                <label class="coria-color1-label" style="display:block; font-size:0.8rem; font-weight:700; color:#bae6fd; margin-bottom:6px;">
                  ${current.mode === "gradient" ? "Cor Principal (Esquerda)" : "Cor do Indicador"}
                </label>
                <input type="color" class="coria-color1-input" value="${current.color1 || defaultC1}" style="width:100%; height:36px; border:none; border-radius:4px; cursor:pointer; background:transparent;" />
              </div>

              <div class="coria-color-col-2" style="flex:1; background:rgba(10,14,24,0.75); border:1px solid rgba(255,255,255,0.15); border-radius:6px; padding:8px; text-align:center; display:${current.mode === "gradient" ? "block" : "none"};">
                <label style="display:block; font-size:0.8rem; font-weight:700; color:#fef08a; margin-bottom:6px;">
                  Cor Secundária (Direita)
                </label>
                <input type="color" class="coria-color2-input" value="${current.color2 || defaultC2}" style="width:100%; height:36px; border:none; border-radius:4px; cursor:pointer; background:transparent;" />
              </div>
            </div>

            <div style="text-align:center; padding:10px; background:rgba(7,10,18,0.85); border:1px dashed rgba(255,255,255,0.2); border-radius:6px;">
              <div style="font-size:0.74rem; color:#94a3b8; margin-bottom:6px; text-transform:uppercase; letter-spacing:0.6px;">Pré-visualização</div>
              <span class="altarion-aitusa-badge coria-color-preview-badge" style="display:inline-flex; align-items:center; gap:5px; padding:4px 10px; border-radius:5px; font-size:12px; font-weight:700;">
                ${sampleHtml}
              </span>
            </div>
          </div>
        `,
        buttons: {
          save: {
            icon: '<i class="fas fa-save"></i>',
            label: "Salvar Cor",
            callback: async (html) => {
              const root = html instanceof HTMLElement ? html : html?.[0];
              const mode = root?.querySelector('input[name="coriaColorMode"]:checked')?.value || "solid";
              const color1 = root?.querySelector(".coria-color1-input")?.value || defaultC1;
              const color2 = root?.querySelector(".coria-color2-input")?.value || defaultC2;

              const latestMap = foundry.utils.deepClone(this.getSavedIndicatorColors(actor));
              latestMap[key] = { mode, color1, color2 };
              await actor.setFlag(MODULE_ID, "headerIndicatorColors", latestMap);
              if (actor.sheet?.rendered) actor.sheet.render(false);
              const hsRoot = globalThis.FlinnManager?._activeHiddenSpellsDialog?.element;
              if (hsRoot) {
                const hsEl = hsRoot instanceof HTMLElement ? hsRoot : hsRoot[0];
                if (hsEl) this.applyClassCssVarsToElement(actor, hsEl);
              }
              const impRoot = globalThis.CoriaSpellImporter?._activeDialogsByActor?.get?.(actor.id)?.element;
              if (impRoot) {
                const impEl = impRoot instanceof HTMLElement ? impRoot : impRoot[0];
                if (impEl) this.applyClassCssVarsToElement(actor, impEl);
              }
            }
          },
          reset: {
            icon: '<i class="fas fa-undo"></i>',
            label: "Restaurar Padrão",
            callback: async () => {
              const latestMap = foundry.utils.deepClone(this.getSavedIndicatorColors(actor));
              delete latestMap[key];
              await actor.unsetFlag(MODULE_ID, "headerIndicatorColors");
              if (Object.keys(latestMap).length > 0) {
                await actor.setFlag(MODULE_ID, "headerIndicatorColors", latestMap);
              }
              if (actor.sheet?.rendered) actor.sheet.render(false);
              const hsRoot = globalThis.FlinnManager?._activeHiddenSpellsDialog?.element;
              if (hsRoot) {
                const hsEl = hsRoot instanceof HTMLElement ? hsRoot : hsRoot[0];
                if (hsEl) this.applyClassCssVarsToElement(actor, hsEl);
              }
              const impRoot = globalThis.CoriaSpellImporter?._activeDialogsByActor?.get?.(actor.id)?.element;
              if (impRoot) {
                const impEl = impRoot instanceof HTMLElement ? impRoot : impRoot[0];
                if (impEl) this.applyClassCssVarsToElement(actor, impEl);
              }
            }
          },
          cancel: {
            icon: '<i class="fas fa-times"></i>',
            label: "Cancelar"
          }
        },
        default: "save",
        render: (html) => {
          const root = html instanceof HTMLElement ? html : html?.[0];
          if (!root) return;
          root.querySelector('button[data-button="save"]')?.classList.add("btn-arcane");
          const radios = root.querySelectorAll('input[name="coriaColorMode"]');
          const col2 = root.querySelector(".coria-color-col-2");
          const label1 = root.querySelector(".coria-color1-label");
          const input1 = root.querySelector(".coria-color1-input");
          const input2 = root.querySelector(".coria-color2-input");
          const preview = root.querySelector(".coria-color-preview-badge");

          const refreshPreview = () => {
            const mode = root.querySelector('input[name="coriaColorMode"]:checked')?.value || "solid";
            if (col2) col2.style.display = mode === "gradient" ? "block" : "none";
            if (label1) {
              label1.textContent = mode === "gradient" ? "Cor Principal (Esquerda)" : "Cor do Indicador";
            }
            this.applyColorConfigToElement(preview, {
              mode,
              color1: input1?.value || defaultC1,
              color2: input2?.value || defaultC2
            });
          };

          for (const r of radios) r.addEventListener("change", refreshPreview);
          input1?.addEventListener("input", refreshPreview);
          input2?.addEventListener("input", refreshPreview);
          refreshPreview();
        }
      },
      { classes: ["coria-dialog"], width: 430 }
    );
    d.render(true);
  }

  /**
   * Determine whether a spell on `actor` belongs to the Primary Class (`"primary"`) or Secondary Class (`"secondary"`).
   */
  static classifyActorSpellTier(actor, spellItem) {
    const charKey = this.getCharacterKey(actor);
    const flags = spellItem?.flags?.[MODULE_ID] || {};
    const lowerName = String(spellItem?.name || "").trim().toLowerCase().replace(/’/g, "'");

    // 1. Flinn: Wizard = primary, Cleric = secondary
    if (charKey === "flinn") {
      const origin = flags.flinnSpellOrigin || (spellItem.system?.sourceItem === "class:cleric" ? "cleric" : "wizard");
      return origin === "cleric" ? "secondary" : "primary";
    }

    // 2. Kyrion: Only secondary class (Warlock) is a spellcaster -> ALL spells use secondary class color
    if (charKey === "kyrion") {
      return "secondary";
    }

    // 3. Aitusa: All spells use her primary class (Dragon Companion) color
    if (charKey === "aitusa") {
      return "primary";
    }

    // Explicit manual override if toggled by user
    if (flags.coriaSpellClassOrigin === "primary" || flags.coriaSpellClassOrigin === "secondary") {
      return flags.coriaSpellClassOrigin;
    }

    // 4. Altarion: Spells NOT on the Wizard spell list are Dragon Rider (Ancestral Magic) = primary,
    //    EXCEPT Abjuration Bulwark (and his custom Wizard spells), which are Wizard = secondary!
    if (charKey === "altarion") {
      if (lowerName === "abjuration bulwark") return "secondary";
      if (WIZARD_SPELLS_SET.has(lowerName)) return "secondary";
      return "primary";
    }

    // 5. Parva: Warlock = primary, Sorcerer (Divine Soul) = secondary
    if (charKey === "parva") {
      if (
        flags.choiceCategory === "divine-magic" ||
        flags.isSecondaryClassItem ||
        spellItem.system?.sourceItem === "class:sorcerer"
      ) {
        return "secondary";
      }
      if (
        flags.isArmorOfAgathysSpell ||
        flags.choiceCategory === "pact-of-the-tome" ||
        flags.choiceCategory === "book-of-ancient-secrets" ||
        flags.isPrimaryClassItem ||
        spellItem.system?.method === "pact" ||
        spellItem.system?.sourceItem === "class:warlock" ||
        WARLOCK_SPELLS_SET.has(lowerName)
      ) {
        return "primary";
      }
      return "secondary";
    }

    return "primary";
  }

  /**
   * Apply `--coria-prim-*` and `--coria-sec-*` CSS custom properties to a target root element
   * (either an ActorSheet root or Flinn's `Magias Escondidas` dialog root).
   */
  static applyClassCssVarsToElement(actor, targetEl) {
    if (!actor || !targetEl) return null;
    const savedMap = this.getSavedIndicatorColors(actor);
    const defaults = this.getDefaultClassColors(actor);

    const primCfg = {
      ...defaults.primary,
      ...(savedMap["class-primary"] || {})
    };
    const secCfg = {
      ...defaults.secondary,
      ...(savedMap["class-secondary"] || {})
    };

    const setTierCssVars = (prefix, cfg) => {
      const c1 = cfg.color1 || "#38bdf8";
      const c2 = cfg.mode === "gradient" ? cfg.color2 || c1 : c1;
      const rgb1 = this.hexToRgb(c1);
      const rgb2 = this.hexToRgb(c2);
      const text1 = this.brightenHex(c1, 0.58);
      const text2 = this.brightenHex(c2, 0.58);

      targetEl.style.setProperty(`--coria-${prefix}-c1`, c1);
      targetEl.style.setProperty(`--coria-${prefix}-c2`, c2);
      targetEl.style.setProperty(`--coria-${prefix}-text`, text1);
      targetEl.style.setProperty(`--coria-${prefix}-text2`, text2);
      targetEl.style.setProperty(
        `--coria-${prefix}-row-bg`,
        `linear-gradient(90deg, rgba(${rgb1.r}, ${rgb1.g}, ${rgb1.b}, 0.34) 0%, rgba(${rgb2.r}, ${rgb2.g}, ${rgb2.b}, 0.18) 55%, rgba(${rgb2.r}, ${rgb2.g}, ${rgb2.b}, 0.06) 100%)`
      );
      targetEl.style.setProperty(
        `--coria-${prefix}-row-bg-unprep`,
        `linear-gradient(90deg, rgba(${rgb1.r}, ${rgb1.g}, ${rgb1.b}, 0.14) 0%, rgba(${rgb2.r}, ${rgb2.g}, ${rgb2.b}, 0.05) 60%, transparent 100%)`
      );
      targetEl.style.setProperty(
        `--coria-${prefix}-pill-bg`,
        `linear-gradient(135deg, rgba(${rgb1.r}, ${rgb1.g}, ${rgb1.b}, 0.45) 0%, rgba(${rgb2.r}, ${rgb2.g}, ${rgb2.b}, 0.32) 100%), rgba(10, 14, 24, 0.85)`
      );
      targetEl.style.setProperty(
        `--coria-${prefix}-btn-bg`,
        `linear-gradient(135deg, ${c1} 0%, ${c2} 100%)`
      );
      targetEl.style.setProperty(
        `--coria-${prefix}-sel-bg`,
        `linear-gradient(90deg, rgba(${rgb1.r}, ${rgb1.g}, ${rgb1.b}, 0.52), rgba(${rgb2.r}, ${rgb2.g}, ${rgb2.b}, 0.80))`
      );
      targetEl.style.setProperty(
        `--coria-${prefix}-footer-bg`,
        `linear-gradient(90deg, rgba(${rgb1.r}, ${rgb1.g}, ${rgb1.b}, 0.32) 0%, rgba(${rgb2.r}, ${rgb2.g}, ${rgb2.b}, 0.16) 55%, rgba(15, 23, 42, 0.72) 100%)`
      );
    };

    setTierCssVars("prim", primCfg);
    setTierCssVars("sec", secCfg);

    const hasCustomPrim = Boolean(savedMap["class-primary"]);
    const hasCustomSec = Boolean(savedMap["class-secondary"]);
    targetEl.toggleAttribute("data-coria-custom-prim-color", hasCustomPrim);
    targetEl.toggleAttribute("data-coria-custom-sec-color", hasCustomSec);

    return { primCfg, secCfg, hasCustomPrim, hasCustomSec };
  }

  /**
   * Apply Spellbook row highlighting, class pills, and bottom spellcasting class footer cards linked to
   * the character's `class-primary` and `class-secondary` header indicator colors across ALL 5 characters
   * (`Flinn`, `Altarion`, `Aitusa`, `Parva`, `Kyrion`).
   */
  static decorateUniversalSpellbook(actor, rootEl) {
    if (!actor || !rootEl) return;
    const charKey = this.getCharacterKey(actor);
    if (charKey === "other") return;

    const applied = this.applyClassCssVarsToElement(actor, rootEl);
    if (!applied) return;
    const { primCfg, secCfg } = applied;

    // Decorate bottom Spellbook footer cards (`.spellcasting-class-card`) on ALL 5 characters
    for (const card of rootEl.querySelectorAll(".spellcasting-class-card")) {
      const abil = (card.getAttribute("data-ability") || "").toLowerCase();
      const cardTxt = (card.textContent || "").toLowerCase();
      let footerTier = "primary";
      if (charKey === "flinn") {
        footerTier = abil === "wis" || cardTxt.includes("cleric") ? "secondary" : "primary";
      } else if (charKey === "altarion") {
        footerTier = cardTxt.includes("wizard") ? "secondary" : "primary";
      } else if (charKey === "aitusa") {
        footerTier = "primary";
      } else if (charKey === "parva") {
        footerTier = cardTxt.includes("sorcerer") ? "secondary" : "primary";
      } else if (charKey === "kyrion") {
        footerTier = "secondary";
      }
      if (card.getAttribute("data-coria-footer-tier") !== footerTier) {
        card.setAttribute("data-coria-footer-tier", footerTier);
      }
    }

    // Inject "Importar Magias" toolbar button on Altarion, Kyrion, Flinn, and Parva (NOT Aitusa)
    if (charKey !== "aitusa") {
      globalThis.CoriaSpellImporter?.ensureImportButtonInToolbar?.(actor, rootEl);
    }

    // Flinn's rows are already decorated with `data-flinn-spell-class="wizard" | "cleric"` in OtherPlayersBase,
    // which maps directly to `--coria-prim-*` and `--coria-sec-*`.
    if (charKey === "flinn") return;

    const canToggleClass = charKey === "altarion" || charKey === "parva";

    for (const el of rootEl.querySelectorAll("[data-item-id]")) {
      const itemId = el.getAttribute("data-item-id");
      const item = actor.items.get(itemId);
      if (!item || item.type !== "spell") continue;

      const tier = this.classifyActorSpellTier(actor, item);
      const tierCfg = tier === "secondary" ? secCfg : primCfg;

      const spLevel = Number(item.system?.level ?? 0);
      const prepMode = String(item.system?.method || item.system?.preparation?.mode || "spell").toLowerCase();
      const prepVal = Number(item.system?.prepared ?? item.system?.preparation?.prepared ?? 0);
      const isCantrip = spLevel === 0;
      const isAlways =
        !isCantrip &&
        (prepVal === 2 ||
          prepMode === "always" ||
          prepMode === "atwill" ||
          prepMode === "innate" ||
          prepMode === "pact");
      const isPrep = isCantrip || isAlways || prepVal >= 1;
      const prepState = isPrep ? "prepared" : "unprepared";

      if (el.getAttribute("data-coria-spell-tier") !== tier) {
        el.setAttribute("data-coria-spell-tier", tier);
      }
      if (el.getAttribute("data-coria-spell-prepared") !== (isPrep ? "true" : "false")) {
        el.setAttribute("data-coria-spell-prepared", isPrep ? "true" : "false");
      }

      const innerRow = el.querySelector(".tidy-table-row, .item-table-row");
      if (innerRow) {
        if (innerRow.getAttribute("data-coria-spell-tier") !== tier) {
          innerRow.setAttribute("data-coria-spell-tier", tier);
        }
        if (innerRow.getAttribute("data-coria-spell-prepared") !== (isPrep ? "true" : "false")) {
          innerRow.setAttribute("data-coria-spell-prepared", isPrep ? "true" : "false");
        }
      }

      // Highlight the Prepared Spell icon on the right side of the spell row with the class color
      const prepIcon = el.querySelector(
        "i.spell-row-icon, [data-action='prepare'] i, .item-control[data-action='prepare'] i"
      );
      const prepBtn =
        prepIcon?.closest("a, button") ||
        el.querySelector(".item-control[data-action='prepare'], [data-action='prepare']") ||
        prepIcon;
      if (prepBtn) {
        if (prepBtn.getAttribute("data-coria-prep-tier") !== tier) {
          prepBtn.setAttribute("data-coria-prep-tier", tier);
        }
        if (prepBtn.getAttribute("data-coria-prep-state") !== prepState) {
          prepBtn.setAttribute("data-coria-prep-state", prepState);
        }
      }

      const nameCell =
        el.querySelector(
          ".cell-name, .item-name .title, .item-name .name-stacked .title, .item-name, .name"
        ) || el;
      if (nameCell) {
        let pill = nameCell.querySelector(".coria-spell-class-pill");
        if (!pill) {
          pill = document.createElement("span");
          nameCell.appendChild(pill);
        }
        const targetClass = `coria-spell-class-pill is-${tier}`;
        if (pill.className !== targetClass) pill.className = targetClass;

        const subLabel =
          charKey === "altarion" && tier === "primary"
            ? " • Ancestral Magic"
            : "";
        const targetHtml = `<i class="fas ${tierCfg.icon}"></i> ${tierCfg.label}${subLabel}`;
        if (pill.innerHTML !== targetHtml) pill.innerHTML = targetHtml;

        const targetTitle = canToggleClass
          ? `Magia de ${tierCfg.label}${subLabel} — Clique para alternar entre ${primCfg.label} e ${secCfg.label}`
          : `Magia de ${tierCfg.label}`;
        if (pill.title !== targetTitle) pill.title = targetTitle;

        if (canToggleClass && actor.isOwner && pill.dataset.boundCoriaToggle !== "true") {
          pill.dataset.boundCoriaToggle = "true";
          pill.addEventListener("click", async (ev) => {
            ev.preventDefault();
            ev.stopPropagation();
            const curTier = this.classifyActorSpellTier(actor, item);
            const nextTier = curTier === "primary" ? "secondary" : "primary";
            await item.update({
              [`flags.${MODULE_ID}.coriaSpellClassOrigin`]: nextTier
            });
          });
        }
      }
    }
  }
}

globalThis.CoriaHeaderColorManager = CoriaHeaderColorManager;

/* ============================================================================
 * CoriaWindowThemeManager
 * Right-click title bar appearance customizer (Solid or 2-Color Gradient)
 * for split-pane spell windows ("Magias Escondidas" & "Importar Magias").
 * ============================================================================ */

export class CoriaWindowThemeManager {
  static DEFAULT_THEME = {
    windowBg: { mode: "gradient", color1: "#b8a890", color2: "#9c8c74" },
    headerBg: { mode: "gradient", color1: "#8b7559", color2: "#735f46" },
    panelBg: { mode: "solid", color1: "#cbbca5", color2: "#b6a68f" },
    rowBg: { mode: "solid", color1: "#d0c3ae", color2: "#c2b39c" },
    buttonBg: { mode: "gradient", color1: "#9c8b72", color2: "#85745b" },
    textColor: "#1f1209"
  };

  static THEME_SECTIONS = [
    { key: "windowBg", label: "Cor de Fundo da Janela", hint: "Fundo principal e moldura externa da janela" },
    { key: "headerBg", label: "Cor do Cabeçalho", hint: "Barra de título no topo da janela" },
    { key: "panelBg", label: "Cor dos Painéis Internos", hint: "Fundo da lista de magias (esquerda) e da descrição (direita)" },
    { key: "rowBg", label: "Cor das Linhas da Lista", hint: "Fundo de cada magia listada na coluna da esquerda" },
    { key: "buttonBg", label: "Cor dos Botões", hint: "Botão Fechar e botões de abas inativas" }
  ];

  static getSavedTheme(actor, themeKey = "hidden-spells") {
    const raw = actor?.flags?.[MODULE_ID]?.windowThemes?.[themeKey];
    const defaults = foundry.utils.deepClone(this.DEFAULT_THEME);
    if (!raw || typeof raw !== "object") return defaults;
    return foundry.utils.mergeObject(defaults, foundry.utils.deepClone(raw));
  }

  static _buildBgValue(cfg, fallback1, fallback2) {
    const c1 = cfg?.color1 || fallback1;
    const c2 = cfg?.color2 || fallback2 || c1;
    if (cfg?.mode === "gradient") {
      return `linear-gradient(135deg, ${c1} 0%, ${c2} 100%)`;
    }
    return c1;
  }

  static _adjustHexBrightness(hex, delta = 0) {
    const rgb = CoriaHeaderColorManager.hexToRgb(hex || "#888888");
    const clamp = (v) => Math.max(0, Math.min(255, Math.round(v)));
    const r = clamp(rgb.r + delta);
    const g = clamp(rgb.g + delta);
    const b = clamp(rgb.b + delta);
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
  }

  static _isDarkHex(hex) {
    const rgb = CoriaHeaderColorManager.hexToRgb(hex || "#b8a890");
    const lum = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
    return lum < 0.48;
  }

  static applyThemeToDialog(actor, dialogRootEl, themeKey = "hidden-spells") {
    if (!actor || !dialogRootEl) return;
    const savedRaw = actor.flags?.[MODULE_ID]?.windowThemes?.[themeKey];
    const el = dialogRootEl instanceof HTMLElement ? dialogRootEl : dialogRootEl?.[0];
    if (!el) return;

    if (!savedRaw) {
      for (const prop of [
        "--coria-win-bg",
        "--coria-win-border",
        "--coria-win-header-bg",
        "--coria-win-panel-bg",
        "--coria-win-list-bg",
        "--coria-win-row-bg",
        "--coria-win-row-hover-bg",
        "--coria-win-btn-bg",
        "--coria-win-btn-hover-bg",
        "--coria-win-text",
        "--coria-win-text-muted",
        "--coria-win-input-bg",
        "--coria-win-meta-bg"
      ]) {
        el.style.removeProperty(prop);
      }
      el.removeAttribute("data-coria-custom-win-theme");
      return;
    }

    const theme = this.getSavedTheme(actor, themeKey);
    const textCol = theme.textColor || "#1f1209";
    const textIsLight = !this._isDarkHex(textCol);
    const borderCol = textIsLight ? "rgba(255, 255, 255, 0.25)" : "rgba(74, 48, 25, 0.55)";
    const mutedCol = textIsLight ? "rgba(226, 232, 240, 0.78)" : "rgba(71, 51, 32, 0.85)";

    const winBg = this._buildBgValue(theme.windowBg, "#b8a890", "#9c8c74");
    const hdrBg = this._buildBgValue(theme.headerBg, "#8b7559", "#735f46");
    const panBg = this._buildBgValue(theme.panelBg, "#cbbca5", "#b6a68f");
    const listBg = this._buildBgValue(
      {
        mode: theme.panelBg?.mode || "solid",
        color1: this._adjustHexBrightness(theme.panelBg?.color1 || "#cbbca5", -14),
        color2: this._adjustHexBrightness(theme.panelBg?.color2 || "#b6a68f", -14)
      },
      "#94856f",
      "#827460"
    );
    const rowBg = this._buildBgValue(theme.rowBg, "#d0c3ae", "#c2b39c");
    const rowHoverBg = this._buildBgValue(
      {
        mode: theme.rowBg?.mode || "solid",
        color1: this._adjustHexBrightness(theme.rowBg?.color1 || "#d0c3ae", textIsLight ? 16 : 12),
        color2: this._adjustHexBrightness(theme.rowBg?.color2 || "#c2b39c", textIsLight ? 16 : 12)
      },
      "#ded2be",
      "#d0c3ae"
    );
    const btnBg = this._buildBgValue(theme.buttonBg, "#9c8b72", "#85745b");
    const btnHoverBg = this._buildBgValue(
      {
        mode: theme.buttonBg?.mode || "gradient",
        color1: this._adjustHexBrightness(theme.buttonBg?.color1 || "#9c8b72", textIsLight ? 18 : -12),
        color2: this._adjustHexBrightness(theme.buttonBg?.color2 || "#85745b", textIsLight ? 18 : -12)
      },
      "#8e7d64",
      "#76664e"
    );
    const metaBg = this._adjustHexBrightness(theme.panelBg?.color1 || "#cbbca5", textIsLight ? 12 : -14);

    el.setAttribute("data-coria-custom-win-theme", "true");
    el.style.setProperty("--coria-win-bg", winBg);
    el.style.setProperty("--coria-win-border", borderCol);
    el.style.setProperty("--coria-win-header-bg", hdrBg);
    el.style.setProperty("--coria-win-panel-bg", panBg);
    el.style.setProperty("--coria-win-list-bg", listBg);
    el.style.setProperty("--coria-win-row-bg", rowBg);
    el.style.setProperty("--coria-win-row-hover-bg", rowHoverBg);
    el.style.setProperty("--coria-win-btn-bg", btnBg);
    el.style.setProperty("--coria-win-btn-hover-bg", btnHoverBg);
    el.style.setProperty("--coria-win-text", textCol);
    el.style.setProperty("--coria-win-text-muted", mutedCol);
    el.style.setProperty("--coria-win-input-bg", theme.panelBg?.color1 || "#cbbca5");
    el.style.setProperty("--coria-win-meta-bg", metaBg);
  }

  static bindTitleBarRightClick(actor, dialogRootEl, themeKey = "hidden-spells", windowLabel = "Janela de Magias") {
    const el = dialogRootEl instanceof HTMLElement ? dialogRootEl : dialogRootEl?.[0];
    if (!actor || !el) return;

    this.applyThemeToDialog(actor, el, themeKey);

    const header = el.querySelector(".window-header") || el.closest(".application")?.querySelector(".window-header");
    if (!header || header.dataset.boundCoriaWinTheme === "true") return;
    header.dataset.boundCoriaWinTheme = "true";
    header.title = "Clique com o botão direito no título para personalizar as cores desta janela";
    header.style.cursor = "context-menu";

    header.addEventListener("contextmenu", (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      if (!actor.isOwner && !game.user?.isGM) return;
      this.openWindowThemePicker(actor, themeKey, windowLabel, el);
    });
  }

  static openWindowThemePicker(actor, themeKey, windowLabel, targetDialogEl = null) {
    if (!actor || !themeKey) return;
    const current = this.getSavedTheme(actor, themeKey);

    const sectionsHtml = this.THEME_SECTIONS.map(sec => {
      const cfg = current[sec.key] || this.DEFAULT_THEME[sec.key];
      const isGrad = cfg.mode === "gradient";
      return `
        <div class="coria-wt-section" data-wt-key="${sec.key}" style="background:rgba(10,14,24,0.78); border:1px solid rgba(255,255,255,0.14); border-radius:7px; padding:8px 10px; margin-bottom:8px;">
          <div style="display:flex; align-items:center; justify-content:space-between; gap:8px; margin-bottom:6px;">
            <div>
              <strong style="color:#f8fafc; font-size:0.86rem;">${sec.label}</strong>
              <div style="font-size:0.72rem; color:#94a3b8;">${sec.hint}</div>
            </div>
            <div style="display:flex; gap:6px; flex-shrink:0;">
              <label style="display:flex; align-items:center; gap:4px; padding:3px 7px; border-radius:4px; background:rgba(15,23,42,0.9); border:1px solid rgba(56,189,248,0.4); cursor:pointer; font-size:0.74rem; font-weight:700; color:#e0f2fe;">
                <input type="radio" name="wtMode_${sec.key}" value="solid" ${!isGrad ? "checked" : ""} /> Sólida
              </label>
              <label style="display:flex; align-items:center; gap:4px; padding:3px 7px; border-radius:4px; background:rgba(15,23,42,0.9); border:1px solid rgba(250,204,21,0.4); cursor:pointer; font-size:0.74rem; font-weight:700; color:#fef08a;">
                <input type="radio" name="wtMode_${sec.key}" value="gradient" ${isGrad ? "checked" : ""} /> Gradiente
              </label>
            </div>
          </div>
          <div style="display:flex; gap:10px; align-items:center;">
            <div style="flex:1; display:flex; align-items:center; gap:6px;">
              <span class="wt-c1-lbl" style="font-size:0.74rem; color:#bae6fd; font-weight:700; white-space:nowrap;">${isGrad ? "Cor 1:" : "Cor:"}</span>
              <input type="color" class="wt-c1" value="${cfg.color1}" style="flex:1; height:28px; border:none; border-radius:4px; cursor:pointer; background:transparent;" />
            </div>
            <div class="wt-c2-wrap" style="flex:1; display:${isGrad ? "flex" : "none"}; align-items:center; gap:6px;">
              <span style="font-size:0.74rem; color:#fef08a; font-weight:700; white-space:nowrap;">Cor 2:</span>
              <input type="color" class="wt-c2" value="${cfg.color2}" style="flex:1; height:28px; border:none; border-radius:4px; cursor:pointer; background:transparent;" />
            </div>
          </div>
        </div>
      `;
    }).join("");

    const d = createV2Dialog(
      {
        title: `Personalizar Cores da Janela — ${windowLabel}`,
        content: `
          <div class="coria-arcane-box" style="text-align:left; padding:10px 12px;">
            <p style="font-size:0.8rem; color:#cbd5e1; margin:0 0 8px 0; text-align:center;">
              Personalize a aparência de <strong>${foundry.utils.escapeHTML(windowLabel)}</strong> (${foundry.utils.escapeHTML(actor.name)}).
            </p>
            <div style="max-height:375px; overflow-y:auto; padding-right:4px;">
              ${sectionsHtml}
              <div style="background:rgba(10,14,24,0.78); border:1px solid rgba(255,255,255,0.14); border-radius:7px; padding:8px 10px; margin-bottom:8px; display:flex; align-items:center; justify-content:space-between; gap:10px;">
                <div>
                  <strong style="color:#f8fafc; font-size:0.86rem;">Cor do Texto Principal</strong>
                  <div style="font-size:0.72rem; color:#94a3b8;">Cor dos títulos, nomes das magias e descrições</div>
                </div>
                <input type="color" class="wt-text-color" value="${current.textColor || "#1f1209"}" style="width:72px; height:30px; border:none; border-radius:4px; cursor:pointer; background:transparent;" />
              </div>
            </div>

            <div class="wt-live-preview" style="margin-top:8px; border-radius:8px; overflow:hidden; border:2px solid rgba(255,255,255,0.25);">
              <div class="wt-prev-hdr" style="padding:5px 10px; font-size:0.78rem; font-weight:800;">
                Pré-visualização — ${foundry.utils.escapeHTML(windowLabel)}
              </div>
              <div class="wt-prev-body" style="padding:8px; display:flex; gap:8px;">
                <div class="wt-prev-panel" style="flex:1; padding:6px; border-radius:5px;">
                  <div class="wt-prev-row" style="padding:4px 6px; border-radius:4px; font-size:0.74rem; font-weight:700; margin-bottom:4px;">
                    Fireball (3º • Evocação)
                  </div>
                  <div class="wt-prev-row" style="padding:4px 6px; border-radius:4px; font-size:0.74rem; font-weight:700;">
                    Shield (1º • Abjuração)
                  </div>
                </div>
                <div class="wt-prev-panel" style="flex:1; padding:6px; border-radius:5px; font-size:0.74rem;">
                  <strong>Descrição da Magia</strong><br>Texto em Rich Text Format...
                </div>
              </div>
              <div class="wt-prev-foot" style="padding:5px 8px; text-align:right;">
                <span class="wt-prev-btn" style="display:inline-block; padding:3px 10px; border-radius:4px; font-size:0.74rem; font-weight:800;">Fechar</span>
              </div>
            </div>
          </div>
        `,
        buttons: {
          save: {
            icon: '<i class="fas fa-save"></i>',
            label: "Salvar Cores",
            callback: async (html) => {
              const root = html instanceof HTMLElement ? html : html?.[0];
              const nextTheme = {};
              for (const sec of this.THEME_SECTIONS) {
                const secEl = root?.querySelector(`.coria-wt-section[data-wt-key="${sec.key}"]`);
                const mode = secEl?.querySelector(`input[name="wtMode_${sec.key}"]:checked`)?.value || "solid";
                const color1 = secEl?.querySelector(".wt-c1")?.value || this.DEFAULT_THEME[sec.key].color1;
                const color2 = secEl?.querySelector(".wt-c2")?.value || this.DEFAULT_THEME[sec.key].color2;
                nextTheme[sec.key] = { mode, color1, color2 };
              }
              nextTheme.textColor = root?.querySelector(".wt-text-color")?.value || "#1f1209";

              const allThemes = foundry.utils.deepClone(actor.flags?.[MODULE_ID]?.windowThemes || {});
              allThemes[themeKey] = nextTheme;
              await actor.setFlag(MODULE_ID, "windowThemes", allThemes);
              if (targetDialogEl) this.applyThemeToDialog(actor, targetDialogEl, themeKey);
            }
          },
          reset: {
            icon: '<i class="fas fa-undo"></i>',
            label: "Restaurar Padrão",
            callback: async () => {
              const allThemes = foundry.utils.deepClone(actor.flags?.[MODULE_ID]?.windowThemes || {});
              delete allThemes[themeKey];
              await actor.unsetFlag(MODULE_ID, "windowThemes");
              if (Object.keys(allThemes).length > 0) {
                await actor.setFlag(MODULE_ID, "windowThemes", allThemes);
              }
              if (targetDialogEl) this.applyThemeToDialog(actor, targetDialogEl, themeKey);
            }
          },
          cancel: {
            icon: '<i class="fas fa-times"></i>',
            label: "Cancelar"
          }
        },
        default: "save",
        render: (html) => {
          const root = html instanceof HTMLElement ? html : html?.[0];
          if (!root) return;
          root.querySelector('button[data-button="save"]')?.classList.add("btn-arcane");

          const refreshPreview = () => {
            const readSec = (k) => {
              const secEl = root.querySelector(`.coria-wt-section[data-wt-key="${k}"]`);
              const mode = secEl?.querySelector(`input[name="wtMode_${k}"]:checked`)?.value || "solid";
              const c1 = secEl?.querySelector(".wt-c1")?.value || this.DEFAULT_THEME[k].color1;
              const c2 = secEl?.querySelector(".wt-c2")?.value || this.DEFAULT_THEME[k].color2;
              const c2Wrap = secEl?.querySelector(".wt-c2-wrap");
              const c1Lbl = secEl?.querySelector(".wt-c1-lbl");
              if (c2Wrap) c2Wrap.style.display = mode === "gradient" ? "flex" : "none";
              if (c1Lbl) c1Lbl.textContent = mode === "gradient" ? "Cor 1:" : "Cor:";
              return { mode, color1: c1, color2: c2 };
            };

            const wCfg = readSec("windowBg");
            const hCfg = readSec("headerBg");
            const pCfg = readSec("panelBg");
            const rCfg = readSec("rowBg");
            const bCfg = readSec("buttonBg");
            const tCol = root.querySelector(".wt-text-color")?.value || "#1f1209";

            const prevBox = root.querySelector(".wt-live-preview");
            const prevHdr = root.querySelector(".wt-prev-hdr");
            const prevPanels = root.querySelectorAll(".wt-prev-panel");
            const prevRows = root.querySelectorAll(".wt-prev-row");
            const prevBtn = root.querySelector(".wt-prev-btn");

            if (prevBox) {
              prevBox.style.background = this._buildBgValue(wCfg, "#b8a890", "#9c8c74");
              prevBox.style.color = tCol;
            }
            if (prevHdr) {
              prevHdr.style.background = this._buildBgValue(hCfg, "#8b7559", "#735f46");
              prevHdr.style.color = tCol;
            }
            for (const p of prevPanels) {
              p.style.background = this._buildBgValue(pCfg, "#cbbca5", "#b6a68f");
              p.style.color = tCol;
            }
            for (const r of prevRows) {
              r.style.background = this._buildBgValue(rCfg, "#d0c3ae", "#c2b39c");
              r.style.color = tCol;
            }
            if (prevBtn) {
              prevBtn.style.background = this._buildBgValue(bCfg, "#9c8b72", "#85745b");
              prevBtn.style.color = tCol;
            }
          };

          for (const inp of root.querySelectorAll('input[type="radio"], input[type="color"]')) {
            inp.addEventListener("change", refreshPreview);
            inp.addEventListener("input", refreshPreview);
          }
          refreshPreview();
        }
      },
      { classes: ["coria-dialog"], width: 510 }
    );
    d.render(true);
  }
}

globalThis.CoriaWindowThemeManager = CoriaWindowThemeManager;
