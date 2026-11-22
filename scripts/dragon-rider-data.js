/**
 * Plutonium Runtime Converter Bridge & Fallback Data Definitions
 * Converts 2014 PHB Wizard, School of Abjuration, Fighting Style: Defense,
 * and the homebrew Dragon Rider (DR-Altarion) & Dragon (DR-Aitusa) JSON files
 * directly through Plutonium's own DataConverter pipeline, while dynamically
 * consolidating repeated dragon-size features according to current dragon level.
 */

export class PlutoniumDataBridge {
  static _ready = false;
  static _rawAltarionJson = null;
  static _rawAitusaJson = null;
  static _registeredSizeLabel = null;
  static _converters = null;
  static _resolvedIconCache = new Map();

  static DR_ICON_SLUGS = {
    "dragon rider": "dragon-rider-class",
    "dragon": "dragon-class",
    "ancestral magic": "ancestral-magic",
    "ancestral weapon": "ancestral-weapon",
    "obtaining your dragon": "obtaining-your-dragon",
    "dragon ancestry": "dragon-ancestry",
    "dragon care": "dragon-care",
    "draconic bond": "draconic-bond",
    "coordinated assault": "coordinated-assault",
    "dragon's breath": "dragons-breath",
    "draconic body": "draconic-body",
    "legacy of the dragon": "legacy-of-the-dragon",
    "ancient connection": "ancient-connection",
    "draconic enhancement": "draconic-enhancement",
    "spellcasting": "ancestral-spellcasting",
    "ancestral awakening": "ancestral-awakening",
    "ancestral attacks": "ancestral-attacks",
    "ancestral ward": "ancestral-ward",
    "ancestral ray": "ancestral-ray",
    "ancestral shielding": "ancestral-shielding",
    "draconic focus": "draconic-focus",
    "ancestral elevation": "ancestral-elevation",
    "elevated ancestral attacks": "elevated-ancestral-attacks",
    "bursting strike": "bursting-strike",
    "ancestral surge": "ancestral-surge",
    "ancestral marking": "ancestral-marking",
    "ancestral tether": "ancestral-tether",
    "ancestral form": "ancestral-form",
    "dragon statistics": "dragon-statistics",
    "dragon's size": "dragons-size",
    "dragon's flight": "dragons-flight",
    "dragon's food": "dragons-food",
    "breath weapon": "breath-weapon",
    "titanic roar": "titanic-roar",
    "small dragon": "small-dragon",
    "medium dragon": "medium-dragon",
    "claw attack": "claw-attack",
    "bite attack": "bite-attack",
    "tail attack": "tail-attack",
    "wing attack": "wing-attack",
    // Race, Racial Features, Echoes & Exclusive Spell
    "ivarian high elf": "ivarian-high-elf",
    "aitusa dragon race": "aitusa-dragon-race",
    "keen senses": "keen-senses",
    "fey ancestry": "fey-ancestry",
    "arcane knowledge": "arcane-knowledge",
    "ancestral trance": "ancestral-trance",
    "ivarian high magic": "ivarian-high-magic",
    "arcane step": "arcane-step",
    "essence harvest": "essence-harvest",
    "abjurer's echo (warding step)": "abjurers-echo",
    "abjurer's echo": "abjurers-echo",
    "necromancer's echo (weakening step)": "necromancers-echo",
    "necromancer's echo": "necromancers-echo",
    "evoker's echo (forceful step)": "evokers-echo",
    "evoker's echo": "evokers-echo",
    "illusionist's echo (veiled step)": "illusionists-echo",
    "illusionist's echo": "illusionists-echo",
    "conjurer's echo (bounding step)": "conjurers-echo",
    "conjurer's echo": "conjurers-echo",
    "transmuter's echo (warping step)": "transmuters-echo",
    "transmuter's echo": "transmuters-echo",
    "diviner's echo (fated step)": "diviners-echo",
    "diviner's echo": "diviners-echo",
    "enchanter's echo (beguiling step)": "enchanters-echo",
    "enchanter's echo": "enchanters-echo",
    "altarion's echoing ward": "altarions-echoing-ward",
    "arcane armor": "arcane-armor",
    "arcane blade": "arcane-blade",
    "abjuration bulwark": "abjuration-bulwark"
  };

  static DR_ICON_FALLBACK_JPG = {
    "small-dragon": "dragon-class",
    "medium-dragon": "dragons-size",
    "ancestral-elevation": "ancestral-awakening",
    "ancestral-attacks": "ancestral-attacks-v2",
    "elevated-ancestral-attacks": "ancestral-attacks-v2",
    "aitusa-dragon-race": "dragon-class",
    "keen-senses": "ancestral-trance",
    "fey-ancestry": "ivarian-high-elf",
    "necromancers-echo": "necromancers-echo",
    "transmuters-echo": "transmuters-echo",
    "altarions-echoing-ward": "abjurers-echo"
  };

  /**
   * Resolve the best available HD icon file in `modules/altarion-aitusa/dr_icons/`
   * for a given feature/class/subclass/weapon name, preferring `.jpg` / `.png` / `.webp`.
   */
  static async pResolveDrIcon(name) {
    if (!name) return null;
    const key = String(name).trim().toLowerCase().replace(/’/g, "'");
    const slug = this.DR_ICON_SLUGS[key];
    if (!slug) return null;

    if (this._resolvedIconCache.has(slug)) {
      return this._resolvedIconCache.get(slug);
    }

    const baseDir = "modules/altarion-aitusa/dr_icons";
    const resolvedSlug = this.DR_ICON_FALLBACK_JPG[slug] || slug;
    const resolvedPath = `${baseDir}/${resolvedSlug}.jpg`;
    this._resolvedIconCache.set(slug, resolvedPath);
    return resolvedPath;
  }

  /**
   * Determine the 5etools size suffix from dragon level.
   */
  static getSizeLabel(dragonLevel = 4) {
    if (dragonLevel < 4) return "Tiny";
    if (dragonLevel < 8) return "Small";
    if (dragonLevel < 13) return "Medium";
    if (dragonLevel < 18) return "Large";
    return "Huge";
  }

  /**
   * Wait for Plutonium (`game.modules.get("plutonium").api`) to finish its async ready initialization
   * and extract its internal DataConverter classes.
   */
  static async waitForPlutonium(timeoutMs = 20000) {
    if (this._ready && this._converters) return true;

    const mod = game.modules?.get("plutonium");
    if (!mod?.active) return false;

    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const plutApi = game.modules?.get("plutonium")?.api;
      if (
        plutApi?.importer?.pGetImporter &&
        globalThis.DataLoader &&
        globalThis.BrewUtil2 &&
        globalThis.UrlUtil &&
        globalThis.DataUtil
      ) {
        break;
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    const plutApi = game.modules?.get("plutonium")?.api || globalThis.plutonium;
    if (!plutApi?.importer?.pGetImporter) {
      console.warn("[Altarion & Aitusa] Plutonium API did not become ready within timeout.");
      return false;
    }

    if (globalThis.game && !globalThis.game.plutonium) {
      globalThis.game.plutonium = plutApi;
    }

    try {
      const impClass = await plutApi.importer.pGetImporter({ prop: "class" });
      const impFeature = await plutApi.importer.pGetImporter({ prop: "classFeature" });
      const impOptFeature = await plutApi.importer.pGetImporter({ prop: "optionalfeature" });

      this._converters = {
        DataConverterClass: impClass.constructor._DataConverter,
        DataConverterClassSubclassFeature: impFeature.constructor._DataConverter,
        DataConverterOptionalfeature: impOptFeature.constructor._DataConverter
      };
      this._ready = Boolean(
        this._converters.DataConverterClass &&
        this._converters.DataConverterClassSubclassFeature &&
        this._converters.DataConverterOptionalfeature
      );
      return this._ready;
    } catch (err) {
      console.error("[Altarion & Aitusa] Error initializing Plutonium converters:", err);
      return false;
    }
  }

  /**
   * Load the raw 5etools JSON files from modules/altarion-aitusa/class_reference/
   */
  static async loadRawReferenceJsons() {
    if (!this._rawAltarionJson) {
      const resp = await fetch("modules/altarion-aitusa/class_reference/class-dragonrider_Altarion.json");
      if (!resp.ok) throw new Error(`Failed to fetch class-dragonrider_Altarion.json (${resp.status})`);
      this._rawAltarionJson = await resp.json();
    }
    if (!this._rawAitusaJson) {
      const resp = await fetch("modules/altarion-aitusa/class_reference/class-dragonrider_Aitusa.json");
      if (!resp.ok) throw new Error(`Failed to fetch class-dragonrider_Aitusa.json (${resp.status})`);
      this._rawAitusaJson = await resp.json();
    }
    return {
      rawAltarion: this._rawAltarionJson,
      rawAitusa: this._rawAitusaJson
    };
  }

  /**
   * Build a consolidated copy of class-dragonrider_Altarion.json for the given dragon size tier,
   * merging the repeated size-suffixed features into single scaling features.
   */
  static buildConsolidatedAltarionBrew(rawJson, sizeLabel = "Small") {
    const brew = foundry.utils.deepClone(rawJson);
    const elevatedSize = (sizeLabel === "Large" || sizeLabel === "Huge") ? sizeLabel : "Medium";

    if (brew._meta) {
      brew._meta.dateLastModified = Date.now();
    }

    // 1. Clean up classFeatures references on Dragon Rider class
    const cls = brew.class?.[0];
    if (cls && Array.isArray(cls.classFeatures)) {
      const removedClassRefs = new Set([
        "Draconic Bond feature|Dragon Rider|DR-Altarion|4",
        "Draconic Bond feature|Dragon Rider|DR-Altarion|8",
        "Draconic Bond feature|Dragon Rider|DR-Altarion|13",
        "Dragon's Breath Large|Dragon Rider|DR-Altarion|13",
        "Dragon's Breath Huge|Dragon Rider|DR-Altarion|18"
      ]);
      cls.classFeatures = cls.classFeatures.filter(entry => {
        const uid = typeof entry === "string" ? entry : entry?.classFeature;
        return !removedClassRefs.has(uid);
      });
    }

    // 2. Consolidate Dragon's Breath (level 9 classFeature) with Large/Huge variants (from subclassFeature)
    if (Array.isArray(brew.classFeature)) {
      const breathLarge = brew.subclassFeature?.find(sf => sf.name === "Dragon's Breath Large");
      const breathHuge = brew.subclassFeature?.find(sf => sf.name === "Dragon's Breath Huge");
      const breathBase = brew.classFeature.find(cf => cf.name === "Dragon's Breath" && Number(cf.level) === 9);

      if (breathBase) {
        if (sizeLabel === "Large" && breathLarge?.entries) {
          breathBase.entries = foundry.utils.deepClone(breathLarge.entries);
        } else if (sizeLabel === "Huge" && breathHuge?.entries) {
          breathBase.entries = foundry.utils.deepClone(breathHuge.entries);
        }
      }

      brew.classFeature = brew.classFeature.filter(cf => {
        if (cf.name === "Draconic Bond feature" && [4, 8, 13].includes(Number(cf.level))) return false;
        return true;
      });

      // Keep Fighting Style classFeature description clean (matching PHB Fighter Fighting Style without dumping all options)
      const fsFeature = brew.classFeature.find(cf => cf.name === "Fighting Style");
      if (fsFeature && Array.isArray(fsFeature.entries)) {
        fsFeature.entries = fsFeature.entries.filter(e => typeof e === "string");
      }
    }

    // 3. Clean up subclassFeatures references on Ancestral Magic subclass
    const sc = brew.subclass?.[0];
    if (sc && Array.isArray(sc.subclassFeatures)) {
      const removedScRefs = new Set([
        "Ancestral Attacks Small|Dragon Rider|DR-Altarion|Ancestral Magic|DR-Altarion|4",
        "Ancestral Attacks Medium|Dragon Rider|DR-Altarion|Ancestral Magic|DR-Altarion|8",
        "Ancestral Attacks Large|Dragon Rider|DR-Altarion|Ancestral Magic|DR-Altarion|13",
        "Ancestral Attacks Huge|Dragon Rider|DR-Altarion|Ancestral Magic|DR-Altarion|18"
      ]);
      sc.subclassFeatures = sc.subclassFeatures.filter(uid => !removedScRefs.has(uid));
    }

    // 4. Consolidate Ancestral Ward, Ancestral Ray, Ancestral Shielding (level 3)
    //    and Bursting Strike, Ancestral Surge, Ancestral Marking (level 10)
    if (Array.isArray(brew.subclassFeature)) {
      // Fix Ancestral Shielding entries in raw JSON so they match Temporary HP mechanics and trigger on ANY attack ("an attack")
      const shieldDiceBySize = { Tiny: "2d6", Small: "3d6", Medium: "4d6", Large: "5d6", Huge: "6d6" };
      for (const [sz, dStr] of Object.entries(shieldDiceBySize)) {
        const sfShield = brew.subclassFeature.find(sf => sf.name === `Ancestral Shielding ${sz}`);
        if (sfShield) {
          sfShield.entries = [
            `Instead of making an Attack roll, you channel your Ancestral Weapon’s energy around a willing creature you can see within 30 feet of you, for protection. They gain a bonus to their AC equal to half your Dragon Ancestry Ability Score modifier rounded up (minimum bonus of +1) until the start of your next turn or until a creature hits them with an attack. If a creature hits them with an attack, before the start of your next turn, the protected creature gains temporary hit points equal to {@dice ${dStr}} plus half your Dragon Ancestry Ability Score modifier rounded up (minimum bonus of +1) for 10 minutes. The temporary hit points are applied before the creature receives the damage. The amount of temporary hit points gained from this Ancestral Attack increases as your dragon grows in size.`
          ];
        }
      }

      const baseAttackNames = ["Ancestral Ward", "Ancestral Ray", "Ancestral Shielding"];
      const elevatedAttackNames = ["Bursting Strike", "Ancestral Surge", "Ancestral Marking"];

      const consolidatedBase = [];
      for (const baseName of baseAttackNames) {
        const match =
          brew.subclassFeature.find(sf => sf.name === `${baseName} ${sizeLabel}`) ||
          brew.subclassFeature.find(sf => sf.name === `${baseName} Small`);
        if (match) {
          const cpy = foundry.utils.deepClone(match);
          cpy.name = baseName;
          cpy.level = 3;
          consolidatedBase.push(cpy);
        }
      }

      const consolidatedElevated = [];
      for (const elevName of elevatedAttackNames) {
        const match =
          brew.subclassFeature.find(sf => sf.name === `${elevName} ${elevatedSize}`) ||
          brew.subclassFeature.find(sf => sf.name === `${elevName} Medium`);
        if (match) {
          const cpy = foundry.utils.deepClone(match);
          cpy.name = elevName;
          cpy.level = 10;
          consolidatedElevated.push(cpy);
        }
      }

      // Update Ancestral Attacks (level 3) references while keeping original text paragraphs intact
      const ancestralAttacksParent = brew.subclassFeature.find(
        sf => sf.name === "Ancestral Attacks" && Number(sf.level) === 3
      );
      if (ancestralAttacksParent && Array.isArray(ancestralAttacksParent.entries)) {
        ancestralAttacksParent.entries = ancestralAttacksParent.entries
          .filter(e => typeof e === "string")
          .concat(
            baseAttackNames.map(name => ({
              type: "refSubclassFeature",
              subclassFeature: `${name}|Dragon Rider|DR-Altarion|Ancestral Magic|DR-Altarion|3`
            }))
          );
      }

      // Update Elevated Ancestral Attacks (level 10) references while keeping original text paragraphs intact
      const elevatedAttacksParent = brew.subclassFeature.find(
        sf => sf.name === "Elevated Ancestral Attacks" && Number(sf.level) === 10
      );
      if (elevatedAttacksParent && Array.isArray(elevatedAttacksParent.entries)) {
        elevatedAttacksParent.entries = elevatedAttacksParent.entries
          .filter(e => typeof e === "string")
          .concat(
            elevatedAttackNames.map(name => ({
              type: "refSubclassFeature",
              subclassFeature: `${name}|Dragon Rider|DR-Altarion|Ancestral Magic|DR-Altarion|10`
            }))
          );
      }

      const sizeSuffixRegex = /\b(Tiny|Small|Medium|Large|Huge)$/;
      brew.subclassFeature = brew.subclassFeature.filter(sf => !sizeSuffixRegex.test(sf.name || ""));
      brew.subclassFeature.push(...consolidatedBase, ...consolidatedElevated);
    }

    this.sanitizeDanglingFeatureRefs(brew);
    return brew;
  }

  /**
   * Build a consolidated copy of class-dragonrider_Aitusa.json for the given dragon size tier,
   * merging the repeated size-suffixed features into single scaling features.
   */
  static buildConsolidatedAitusaBrew(rawJson, sizeLabel = "Small") {
    const brew = foundry.utils.deepClone(rawJson);
    const clawBiteSize = sizeLabel === "Tiny" ? "Small" : sizeLabel;
    const tailWingSize = (sizeLabel === "Large" || sizeLabel === "Huge") ? sizeLabel : "Medium";

    if (brew._meta) {
      brew._meta.dateLastModified = Date.now();
    }

    // 1. Clean up classFeatures references on Dragon class and add Draconic Body at level 11
    const cls = brew.class?.[0];
    if (cls && Array.isArray(cls.classFeatures)) {
      const removedClassRefs = new Set([
        "Draconic Bond feature|Dragon|DR-Aitusa|13",
        "Draconic Bond feature|Dragon|DR-Aitusa|18"
      ]);
      cls.classFeatures = cls.classFeatures.filter(entry => {
        const uid = typeof entry === "string" ? entry : entry?.classFeature;
        return !removedClassRefs.has(uid);
      });
      if (!cls.classFeatures.includes("Draconic Body|Dragon|DR-Aitusa|11")) {
        cls.classFeatures.push("Draconic Body|Dragon|DR-Aitusa|11");
      }
    }

    // 2. Consolidate Breath Weapon (level 6 classFeature) with Medium/Large/Huge variants and add Draconic Body (level 11)
    if (Array.isArray(brew.classFeature) && Array.isArray(brew.subclassFeature)) {
      const breathBase = brew.classFeature.find(cf => cf.name === "Breath Weapon" && Number(cf.level) === 6);
      if (breathBase && ["Medium", "Large", "Huge"].includes(sizeLabel)) {
        const breathVariant = brew.subclassFeature.find(sf => sf.name === `Breath Weapon ${sizeLabel}`);
        if (breathVariant?.entries) {
          breathBase.entries = foundry.utils.deepClone(breathVariant.entries);
        }
      }

      brew.classFeature = brew.classFeature.filter(cf => {
        if (cf.name === "Draconic Bond feature" && [13, 18].includes(Number(cf.level))) return false;
        return true;
      });

      if (!brew.classFeature.some(cf => cf.name === "Draconic Body" && Number(cf.level) === 11)) {
        brew.classFeature.push({
          name: "Draconic Body",
          source: "DR-Aitusa",
          page: 72,
          className: "Dragon",
          classSource: "DR-Aitusa",
          level: 11,
          entries: [
            "At 11th level, your dragon’s scales and eyes fully mature and you take on some of their physical aspects. You gain immunity to your Dragon Ancestry Damage Type and the following benefits:",
            "{@b Scales.} As your dragon’s scales become more rigid, some of them also start to appear on your rider. Both of you gain a +1 bonus to your AC.",
            "{@b Eyes.} As your dragon’s eyes become sharper your senses are also enhanced. You and your rider gain advantage on any (Wisdom) {@skill Perception} or (Intelligence) {@skill Investigation} checks based on sight."
          ]
        });
      }
    }

    // 3. Clean up subclassFeatures on Dragon Ancestral Magic subclass
    const sc = brew.subclass?.[0];
    if (sc && Array.isArray(sc.subclassFeatures)) {
      const removedScRefs = new Set([
        "Large Dragon|Dragon|DR-Aitusa|Ancestral Magic|DR-Aitusa|13",
        "Huge Dragon|Dragon|DR-Aitusa|Ancestral Magic|DR-Aitusa|18"
      ]);
      sc.subclassFeatures = sc.subclassFeatures.filter(uid => !removedScRefs.has(uid));
    }

    // 4. Consolidate Claw Attack & Bite Attack (level 4) and Tail Attack & Wing Attack (level 8)
    if (Array.isArray(brew.subclassFeature)) {
      const biteDiceMap = {
        Tiny: { p: "1d4", f: "1d6" },
        Small: { p: "1d4", f: "1d6" },
        Medium: { p: "2d4", f: "2d6" },
        Large: { p: "2d6", f: "3d6" },
        Huge: { p: "2d8", f: "4d6" }
      };
      const bd = biteDiceMap[clawBiteSize] || biteDiceMap.Small;

      const consolidatedAttacks = [];

      for (const atkName of ["Claw Attack", "Bite Attack"]) {
        const match =
          brew.subclassFeature.find(sf => sf.name === `${atkName} ${clawBiteSize}`) ||
          brew.subclassFeature.find(sf => sf.name === `${atkName} Small`);
        if (match) {
          const cpy = foundry.utils.deepClone(match);
          cpy.name = atkName;
          cpy.level = 4;
          if (atkName === "Bite Attack") {
            cpy.entries = [
              "The dragon bites viciously at a target within 5 feet.",
              `{@b Bite.} {@i Melee Weapon Attack:} (Strength + Proficiency) to hit, reach 5ft., one target. On a hit the target takes {@dice ${bd.p}} + Strength modifier piercing damage plus {@dice ${bd.f}} Dragon Ancestry Damage Type.`,
              "Scaling: (1d4 piercing damage plus 1d6 Dragon Ancestry Damage Type as Small; 2d4 piercing damage plus 2d6 Dragon Ancestry Damage Type as Medium; 2d6 piercing damage plus 3d6 Dragon Ancestry Damage Type as Large; 2d8 piercing damage plus 4d6 Dragon Ancestry Damage Type as Huge)."
            ];
          }
          consolidatedAttacks.push(cpy);
        }
      }

      for (const atkName of ["Tail Attack", "Wing Attack"]) {
        const match =
          brew.subclassFeature.find(sf => sf.name === `${atkName} ${tailWingSize}`) ||
          brew.subclassFeature.find(sf => sf.name === `${atkName} Medium`);
        if (match) {
          const cpy = foundry.utils.deepClone(match);
          cpy.name = atkName;
          cpy.level = 8;
          if (atkName === "Tail Attack" && Array.isArray(cpy.entries)) {
            cpy.entries = cpy.entries.map(e => (typeof e === "string" ? e.replace(/(\d+)tf\./g, "$1 ft.") : e));
          }
          consolidatedAttacks.push(cpy);
        }
      }

      // Update Small Dragon (level 4) references
      const smallDragon = brew.subclassFeature.find(sf => sf.name === "Small Dragon" && Number(sf.level) === 4);
      if (smallDragon && Array.isArray(smallDragon.entries)) {
        smallDragon.entries = smallDragon.entries
          .filter(e => typeof e === "string")
          .concat([
            {
              type: "refSubclassFeature",
              subclassFeature: "Claw Attack|Dragon|DR-Aitusa|Ancestral Magic|DR-Aitusa|4"
            },
            {
              type: "refSubclassFeature",
              subclassFeature: "Bite Attack|Dragon|DR-Aitusa|Ancestral Magic|DR-Aitusa|4"
            }
          ]);
      }

      // Update Medium Dragon (level 8) references
      const mediumDragon = brew.subclassFeature.find(sf => sf.name === "Medium Dragon" && Number(sf.level) === 8);
      if (mediumDragon && Array.isArray(mediumDragon.entries)) {
        mediumDragon.entries = mediumDragon.entries
          .filter(e => typeof e === "string")
          .concat([
            {
              type: "refSubclassFeature",
              subclassFeature: "Tail Attack|Dragon|DR-Aitusa|Ancestral Magic|DR-Aitusa|8"
            },
            {
              type: "refSubclassFeature",
              subclassFeature: "Wing Attack|Dragon|DR-Aitusa|Ancestral Magic|DR-Aitusa|8"
            }
          ]);
      }

      const sizeSuffixRegex = /\b(Tiny|Small|Medium|Large|Huge)$/;
      brew.subclassFeature = brew.subclassFeature.filter(sf => {
        if (sf.name === "Large Dragon" || sf.name === "Huge Dragon") return false;
        if (sizeSuffixRegex.test(sf.name || "")) return false;
        return true;
      });
      brew.subclassFeature.push(...consolidatedAttacks);
    }

    this.sanitizeDanglingFeatureRefs(brew);
    return brew;
  }

  /**
   * Ensure no class, subclass, classFeature, or subclassFeature contains a refClassFeature
   * or refSubclassFeature pointing to a feature that was removed during size consolidation.
   */
  static sanitizeDanglingFeatureRefs(brew) {
    if (!brew || typeof brew !== "object") return;

    const validCfUids = new Set(
      (brew.classFeature || []).map(cf =>
        `${cf.name}|${cf.className}|${cf.classSource || cf.source}|${cf.level}`.toLowerCase()
      )
    );
    const validSfUids = new Set(
      (brew.subclassFeature || []).map(sf =>
        `${sf.name}|${sf.className}|${sf.classSource || sf.source}|${sf.subclassShortName}|${sf.subclassSource || sf.source}|${sf.level}`.toLowerCase()
      )
    );

    for (const cls of brew.class || []) {
      if (Array.isArray(cls.classFeatures)) {
        cls.classFeatures = cls.classFeatures.filter(entry => {
          const uid = typeof entry === "string" ? entry : entry?.classFeature;
          return uid && validCfUids.has(String(uid).toLowerCase());
        });
      }
    }

    for (const sc of brew.subclass || []) {
      if (Array.isArray(sc.subclassFeatures)) {
        sc.subclassFeatures = sc.subclassFeatures.filter(entry => {
          const uid = typeof entry === "string" ? entry : entry?.subclassFeature;
          return uid && validSfUids.has(String(uid).toLowerCase());
        });
      }
    }

    const cleanEntries = entries => {
      if (!Array.isArray(entries)) return entries;
      return entries
        .filter(entry => {
          if (!entry || typeof entry !== "object") return true;
          if (entry.type === "refClassFeature") {
            return validCfUids.has(String(entry.classFeature || "").toLowerCase());
          }
          if (entry.type === "refSubclassFeature") {
            return validSfUids.has(String(entry.subclassFeature || "").toLowerCase());
          }
          return true;
        })
        .map(entry => {
          if (entry && typeof entry === "object" && Array.isArray(entry.entries)) {
            entry.entries = cleanEntries(entry.entries);
          }
          return entry;
        });
    };

    for (const cf of brew.classFeature || []) {
      if (Array.isArray(cf.entries)) {
        cf.entries = cleanEntries(cf.entries);
      }
    }
    for (const sf of brew.subclassFeature || []) {
      if (Array.isArray(sf.entries)) {
        sf.entries = cleanEntries(sf.entries);
      }
    }
  }

  /**
   * Clear DR-Altarion and DR-Aitusa entries from Plutonium's DataLoader cache
   * so newly consolidated brew entries for the current dragon size are re-read immediately.
   */
  static clearBrewDataLoaderCache() {
    const cacheObj = globalThis.DataLoader?._CACHE;
    if (!cacheObj) return;

    const brewSources = ["dr-altarion", "dr-aitusa"];
    if (cacheObj._cache && typeof cacheObj._cache === "object") {
      for (const pageCache of Object.values(cacheObj._cache)) {
        if (!pageCache || typeof pageCache !== "object") continue;
        for (const src of brewSources) {
          delete pageCache[src];
        }
      }
    }

    if (cacheObj._cacheBrewLists && typeof cacheObj._cacheBrewLists === "object") {
      for (const [pageClean, listMap] of Object.entries(cacheObj._cacheBrewLists)) {
        if (!listMap || typeof listMap !== "object") continue;
        for (const [hash, ent] of Object.entries(listMap)) {
          const src = (ent?.source || ent?.classSource || "").toLowerCase();
          if (brewSources.includes(src)) {
            delete listMap[hash];
          }
        }
        if (cacheObj._isDirtyCachesAllBrew) cacheObj._isDirtyCachesAllBrew[pageClean] = true;
        if (cacheObj._isDirtyCachesAllAll) cacheObj._isDirtyCachesAllAll[pageClean] = true;
      }
    }
  }

  /**
   * Ensure the consolidated DR-Altarion and DR-Aitusa brews for the current dragonLevel
   * are registered in Plutonium's BrewUtil2.
   */
  static async ensureBrewsRegistered(dragonLevel = 4) {
    const isReady = await this.waitForPlutonium();
    if (!isReady) return false;

    const sizeLabel = this.getSizeLabel(dragonLevel);
    if (this._registeredSizeLabel === sizeLabel && this._consolidatedAltarion && this._consolidatedAitusa) {
      return true;
    }

    const { rawAltarion, rawAitusa } = await this.loadRawReferenceJsons();
    const altarionBrew = this.buildConsolidatedAltarionBrew(rawAltarion, sizeLabel);
    const aitusaBrew = this.buildConsolidatedAitusaBrew(rawAitusa, sizeLabel);

    this._consolidatedAltarion = altarionBrew;
    this._consolidatedAitusa = aitusaBrew;

    // Remove previous DR-Altarion / DR-Aitusa brews if already loaded in BrewUtil2
    try {
      const currentBrews = await globalThis.BrewUtil2.pGetBrew();
      const toRemove = (currentBrews || []).filter(b =>
        b?.body?._meta?.sources?.some(s => s?.json === "DR-Altarion" || s?.json === "DR-Aitusa")
      );
      if (toRemove.length > 0) {
        await globalThis.BrewUtil2.pDeleteBrews(toRemove);
      }
    } catch (err) {
      console.warn("[Altarion & Aitusa] Could not prune previous brews in BrewUtil2:", err);
    }

    await globalThis.BrewUtil2.pAddBrewsFromFiles([
      { json: altarionBrew, name: "class-dragonrider_Altarion.json" },
      { json: aitusaBrew, name: "class-dragonrider_Aitusa.json" }
    ]);

    this.clearBrewDataLoaderCache();
    this._registeredSizeLabel = sizeLabel;
    return true;
  }

  /**
   * Convert a single classFeature or subclassFeature via Plutonium's DataConverterClassSubclassFeature.
   */
  static async pConvertFeature(featureStub, { actor = null, isActorItem = true } = {}) {
    const { DataConverterClassSubclassFeature } = this._converters;
    const deref = await DataConverterClassSubclassFeature.pGetDereferencedFeatureItem(featureStub);
    if (!deref) return null;
    const docData = await DataConverterClassSubclassFeature.pGetDocumentJson(deref, {
      actor,
      isActorItem
    });
    if (docData) {
      delete docData._id;
    }
    return docData;
  }

  /**
   * Ensure a converted subclass item (with isActorItem: true) includes its 5etools introductory fluff
   * rendered via Plutonium's own _pGetSubclassDescription_getFakeFluff.
   */
  static _ensureSubclassFluffDescription(subclassData, scDereferenced) {
    if (!subclassData?.system?.description) return;
    const curVal = (subclassData.system.description.value || "").trim();
    if (!curVal || curVal === '<div class="ve-mb-2 ve-flex-col"></div>') {
      const { DataConverterClass } = this._converters || {};
      const fauxFluff = DataConverterClass?._pGetSubclassDescription_getFakeFluff?.({
        scDereferenced,
        isIncludeFeatures: true
      });
      if (fauxFluff) {
        subclassData.system.description.value = `<div class="ve-mb-2 ve-flex-col">${fauxFluff}</div>`;
      }
    }
  }

  /**
   * Convert 2014 PHB Wizard Class, School of Abjuration Subclass, and their features via Plutonium.
   */
  static async pGetWizard2014Bundle({ actor = null, level = 1 } = {}) {
    const isReady = await this.waitForPlutonium();
    if (!isReady) return null;

    const { DataConverterClass } = this._converters;

    // 1. 2014 PHB Wizard Class
    const wizHash = globalThis.UrlUtil.URL_TO_HASH_BUILDER["class"]({ name: "Wizard", source: "PHB" });
    const clsWizardRaw = await globalThis.DataLoader.pCacheAndGet("class", "PHB", wizHash, {
      isCopy: true,
      isRequired: true
    });
    const wizardClassData = await DataConverterClass.pGetDocumentJsonClass(clsWizardRaw, {
      actor,
      isActorItem: true,
      isClsDereferenced: true,
      level
    });
    delete wizardClassData._id;

    // 2. 2014 PHB School of Abjuration Subclass
    const abjHash = globalThis.UrlUtil.URL_TO_HASH_BUILDER["subclass"]({
      name: "School of Abjuration",
      shortName: "Abjuration",
      source: "PHB",
      className: "Wizard",
      classSource: "PHB"
    });
    const scAbjurationRaw = await globalThis.DataLoader.pCacheAndGet("subclass", "PHB", abjHash, {
      isCopy: true,
      isRequired: true
    });
    const abjurationSubclassData = await DataConverterClass.pGetDocumentJsonSubclass(
      clsWizardRaw,
      scAbjurationRaw,
      {
        isActorItem: true,
        isScDereferenced: true
      }
    );
    delete abjurationSubclassData._id;
    this._ensureSubclassFluffDescription(abjurationSubclassData, scAbjurationRaw);

    // 3. 2014 PHB Wizard Class Features
    const wizardFeatureDefs = [
      { name: "Spellcasting", level: 1 },
      { name: "Arcane Recovery", level: 1 },
      { name: "Spell Mastery", level: 18 },
      { name: "Signature Spells", level: 20 }
    ];
    const wizardFeatures = [];
    for (const def of wizardFeatureDefs) {
      const stub = {
        name: def.name,
        source: "PHB",
        className: "Wizard",
        classSource: "PHB",
        level: def.level,
        __prop: "classFeature"
      };
      const featData = await this.pConvertFeature(stub, { actor: null, isActorItem: false });
      if (featData) {
        featData.flags = foundry.utils.mergeObject(featData.flags || {}, {
          "altarion-aitusa": {
            isSecondaryClassItem: true,
            levelRequired: def.level,
            featureKey: `wizard:class:${def.name.toLowerCase()}:${def.level}`
          }
        });
        wizardFeatures.push({ level: def.level, data: featData });
      }
    }

    // 4. 2014 PHB School of Abjuration Subclass Features
    const abjurationFeatureDefs = [
      { name: "Abjuration Savant", level: 2 },
      { name: "Arcane Ward", level: 2 },
      { name: "Projected Ward", level: 6 },
      { name: "Improved Abjuration", level: 10 },
      { name: "Spell Resistance", level: 14 }
    ];
    const abjurationFeatures = [];
    for (const def of abjurationFeatureDefs) {
      const stub = {
        name: def.name,
        source: "PHB",
        className: "Wizard",
        classSource: "PHB",
        subclassShortName: "Abjuration",
        subclassSource: "PHB",
        level: def.level,
        __prop: "subclassFeature"
      };
      const featData = await this.pConvertFeature(stub, { actor: null, isActorItem: false });
      if (featData) {
        featData.flags = foundry.utils.mergeObject(featData.flags || {}, {
          "altarion-aitusa": {
            isSecondaryClassItem: true,
            levelRequired: def.level,
            featureKey: `wizard:abjuration:${def.name.toLowerCase()}:${def.level}`
          }
        });
        abjurationFeatures.push({ level: def.level, data: featData });
      }
    }

    return {
      wizardClassData,
      abjurationSubclassData,
      wizardFeatures,
      abjurationFeatures
    };
  }

  /**
   * Build a dnd5e v5.x DamagePartData object
   */
  static _makeDamagePart({ number, denomination, bonus = "", types = ["force"] }) {
    return {
      number: Number(number),
      denomination: Number(denomination),
      bonus: String(bonus || ""),
      types: Array.isArray(types) ? types : [types],
      custom: { enabled: false, formula: "" },
      scaling: { mode: "", number: null, formula: "" }
    };
  }

  /**
   * Build a dnd5e v5.x Attack Activity
   */
  static _makeAttackActivity({
    id = "altarionAttack01",
    name = "Attack",
    ability = "str",
    reach = 5,
    damageParts = [],
    chatFlavor = "",
    consumptionTargets = []
  }) {
    return {
      _id: id,
      type: "attack",
      name,
      activation: {
        type: "action",
        value: 1,
        condition: "",
        override: true
      },
      consumption: {
        targets: consumptionTargets,
        scaling: { allowed: false, max: "" },
        spellSlot: false
      },
      description: { chatFlavor },
      duration: {
        concentration: false,
        value: "",
        units: "inst",
        special: "",
        override: false
      },
      effects: [],
      range: {
        value: reach,
        units: "ft",
        special: "",
        override: true
      },
      target: {
        template: {
          count: "",
          contiguous: false,
          type: "",
          size: "",
          width: "",
          height: "",
          units: "ft"
        },
        affects: {
          count: "1",
          type: "creature",
          choice: false,
          special: ""
        },
        prompt: true,
        override: true
      },
      uses: { spent: 0, max: "", recovery: [] },
      attack: {
        ability,
        bonus: "",
        critical: { threshold: null },
        flat: false,
        type: {
          value: "melee",
          classification: "weapon"
        }
      },
      damage: {
        critical: { bonus: "" },
        includeBase: false,
        parts: damageParts
      },
      sort: 0
    };
  }

  /**
   * Build a dnd5e v5.x Save Activity (with optional area template)
   */
  static _makeSaveActivity({
    id = "altarionSave0001",
    name = "Save",
    activationType = "action",
    activationCondition = "",
    saveAbility = "dex",
    dcCalculation = "int",
    damageParts = [],
    onSave = "half",
    rangeValue = null,
    rangeUnits = "self",
    templateType = "",
    templateSize = "",
    templateWidth = "",
    templateCount = "",
    affectsType = "creature",
    affectsCount = "",
    affectsChoice = false,
    promptTemplate = true,
    consumptionTargets = []
  }) {
    return {
      _id: id,
      type: "save",
      name,
      activation: {
        type: activationType,
        value: activationType === "special" ? null : 1,
        condition: activationCondition,
        override: true
      },
      consumption: {
        targets: consumptionTargets,
        scaling: { allowed: false, max: "" },
        spellSlot: false
      },
      description: { chatFlavor: "" },
      duration: {
        concentration: false,
        value: "",
        units: "inst",
        special: "",
        override: false
      },
      effects: [],
      range: {
        value: rangeValue,
        units: rangeUnits,
        special: "",
        override: true
      },
      target: {
        template: {
          count: templateCount ? String(templateCount) : "",
          contiguous: false,
          type: templateType,
          size: templateSize ? String(templateSize) : "",
          width: templateWidth ? String(templateWidth) : "",
          height: "",
          units: "ft"
        },
        affects: {
          count: affectsCount ? String(affectsCount) : "",
          type: affectsType,
          choice: Boolean(affectsChoice),
          special: ""
        },
        prompt: Boolean(promptTemplate),
        override: true
      },
      uses: { spent: 0, max: "", recovery: [] },
      save: {
        ability: Array.isArray(saveAbility) ? saveAbility : [saveAbility],
        dc: {
          calculation: dcCalculation,
          formula: ""
        }
      },
      damage: {
        onSave,
        parts: damageParts
      },
      sort: 0
    };
  }

  /**
   * Build a dnd5e v5.x Heal Activity granting Temporary Hit Points (types: ["temphp"])
   */
  static _makeTempHpHealActivity({
    id = "altarionHeal0001",
    name = "Temporary Hit Points",
    diceNum = 3,
    diceFaces = 6,
    bonus = "max(1, ceil(@abilities.int.mod / 2))",
    rangeValue = null,
    rangeUnits = "self",
    affectsType = "self",
    consumptionTargets = []
  }) {
    return {
      _id: id,
      type: "heal",
      name,
      activation: {
        type: "special",
        value: null,
        condition: "Replaces one attack",
        override: true
      },
      consumption: {
        targets: consumptionTargets,
        scaling: { allowed: false, max: "" },
        spellSlot: false
      },
      description: { chatFlavor: "" },
      duration: {
        concentration: false,
        value: "10",
        units: "minute",
        special: "",
        override: true
      },
      effects: [],
      range: {
        value: rangeValue,
        units: rangeUnits,
        special: "",
        override: true
      },
      target: {
        template: {
          count: "",
          contiguous: false,
          type: "",
          size: "",
          width: "",
          height: "",
          units: "ft"
        },
        affects: {
          count: "1",
          type: affectsType,
          choice: false,
          special: ""
        },
        prompt: false,
        override: true
      },
      uses: { spent: 0, max: "", recovery: [] },
      healing: {
        number: Number(diceNum),
        denomination: Number(diceFaces),
        bonus: String(bonus || ""),
        types: ["temphp"],
        custom: { enabled: false, formula: "" },
        scaling: { mode: "", number: null, formula: "" }
      },
      sort: 0
    };
  }

  /**
   * Build a dnd5e v5.x Utility Activity
   */
  static _makeUtilityActivity({
    id = "altarionUtil0001",
    name = "Activate",
    activationType = "action",
    activationCondition = "",
    durationValue = "",
    durationUnits = "inst",
    rangeValue = null,
    rangeUnits = "self",
    affectsType = "self",
    affectsCount = "1",
    consumptionTargets = [],
    chatFlavor = ""
  }) {
    return {
      _id: id,
      type: "utility",
      name,
      activation: {
        type: activationType,
        value: activationType === "special" ? null : 1,
        condition: activationCondition,
        override: true
      },
      consumption: {
        targets: consumptionTargets,
        scaling: { allowed: false, max: "" },
        spellSlot: false
      },
      description: { chatFlavor },
      duration: {
        concentration: false,
        value: durationValue ? String(durationValue) : "",
        units: durationUnits,
        special: "",
        override: Boolean(durationValue)
      },
      effects: [],
      range: {
        value: rangeValue,
        units: rangeUnits,
        special: "",
        override: true
      },
      target: {
        template: {
          count: "",
          contiguous: false,
          type: "",
          size: "",
          width: "",
          height: "",
          units: "ft"
        },
        affects: {
          count: affectsCount ? String(affectsCount) : "",
          type: affectsType,
          choice: false,
          special: ""
        },
        prompt: false,
        override: true
      },
      uses: { spent: 0, max: "", recovery: [] },
      roll: {
        prompt: false,
        visible: false,
        name: "",
        formula: ""
      },
      sort: 0
    };
  }

  /**
   * Enhance Plutonium-converted Dragon Rider and Dragon features with exact dnd5e v5.3.3
   * activities, templates, damage parts, temporary HP rolls, and active effects.
   */
  static applyCustomFeatureMechanics(featData, { isAltarion = true, sizeLabel = "Small" } = {}) {
    if (!featData?.system) return featData;
    const name = featData.name;

    // Shared Draconic Body (+1 AC passive Active Effect at level 11 for both Altarion and Aitusa)
    if (name === "Draconic Body") {
      featData.system.uses = { spent: 0, max: "", recovery: [] };
      featData.system.activities = {};
      featData.effects = [
        {
          _id: "draconicBodyAc01",
          name: "Draconic Body: Scales (+1 AC)",
          img: featData.img || "icons/commodities/biological/scales-blue.webp",
          transfer: true,
          disabled: false,
          changes: [
            {
              key: "system.attributes.ac.bonus",
              mode: 2, // CONST.ACTIVE_EFFECT_MODES.ADD
              value: "+1",
              priority: 20
            }
          ]
        }
      ];
      return featData;
    }

    if (isAltarion) {
      if (name === "Ancestral Attacks") {
        featData.system.uses = {
          spent: 0,
          max: "max(1, @abilities.int.mod)",
          recovery: [{ period: "lr", type: "recoverAll" }]
        };
        featData.system.activities = {};
      } else if (name === "Ancestral Ward") {
        const wardDiceMap = { Tiny: 2, Small: 3, Medium: 4, Large: 5, Huge: 6 };
        const dNum = wardDiceMap[sizeLabel] || 3;
        featData.system.uses = { spent: 0, max: "", recovery: [] };
        featData.system.activities = {
          altarionHeal0001: this._makeTempHpHealActivity({
            id: "altarionHeal0001",
            name: "Ancestral Ward (Temp HP)",
            diceNum: dNum,
            diceFaces: 6,
            bonus: "max(1, ceil(@abilities.int.mod / 2))",
            rangeValue: null,
            rangeUnits: "self",
            affectsType: "self"
          })
        };
      } else if (name === "Ancestral Shielding") {
        const shieldDiceMap = { Tiny: 2, Small: 3, Medium: 4, Large: 5, Huge: 6 };
        const dNum = shieldDiceMap[sizeLabel] || 3;
        featData.system.uses = { spent: 0, max: "", recovery: [] };
        featData.system.activities = {
          altarionHeal0002: this._makeTempHpHealActivity({
            id: "altarionHeal0002",
            name: "Ancestral Shielding (Temp HP)",
            diceNum: dNum,
            diceFaces: 6,
            bonus: "max(1, ceil(@abilities.int.mod / 2))",
            rangeValue: 30,
            rangeUnits: "ft",
            affectsType: "willing"
          })
        };
      } else if (name === "Ancestral Ray") {
        const rayMap = {
          Tiny: { d: 4, r: 30 },
          Small: { d: 5, r: 45 },
          Medium: { d: 6, r: 60 },
          Large: { d: 7, r: 75 },
          Huge: { d: 8, r: 90 }
        };
        const rInfo = rayMap[sizeLabel] || rayMap.Small;
        featData.system.uses = { spent: 0, max: "", recovery: [] };
        featData.system.activities = {
          altarionSave0001: this._makeSaveActivity({
            id: "altarionSave0001",
            name: "Ancestral Ray",
            activationType: "special",
            activationCondition: "Replaces one attack",
            saveAbility: "dex",
            dcCalculation: "int",
            damageParts: [this._makeDamagePart({ number: rInfo.d, denomination: 6, types: ["force"] })],
            onSave: "half",
            rangeValue: rInfo.r,
            rangeUnits: "ft",
            affectsType: "creature",
            affectsCount: "1",
            promptTemplate: false
          })
        };
      } else if (name === "Bursting Strike") {
        const burstMap = { Tiny: 4, Small: 4, Medium: 4, Large: 5, Huge: 6 };
        const bNum = burstMap[sizeLabel] || 4;
        featData.system.uses = { spent: 0, max: "", recovery: [] };
        featData.system.activities = {
          altarionSave0002: this._makeSaveActivity({
            id: "altarionSave0002",
            name: "Bursting Strike",
            activationType: "special",
            activationCondition: "Before making an Ancestral Weapon attack",
            saveAbility: "dex",
            dcCalculation: "int",
            damageParts: [this._makeDamagePart({ number: bNum, denomination: 6, types: ["force"] })],
            onSave: "half",
            rangeValue: 5,
            rangeUnits: "ft",
            affectsType: "creature",
            affectsCount: "1",
            promptTemplate: false
          })
        };
      } else if (name === "Ancestral Surge") {
        const surgeMap = {
          Tiny: { d: 6, len: 30, w: 5 },
          Small: { d: 6, len: 30, w: 5 },
          Medium: { d: 6, len: 30, w: 5 },
          Large: { d: 7, len: 45, w: 10 },
          Huge: { d: 8, len: 60, w: 15 }
        };
        const sInfo = surgeMap[sizeLabel] || surgeMap.Medium;
        featData.system.uses = { spent: 0, max: "", recovery: [] };
        featData.system.target = {
          template: {
            count: "",
            contiguous: false,
            type: "line",
            size: String(sInfo.len),
            width: String(sInfo.w),
            height: "",
            units: "ft"
          },
          affects: { count: "", type: "creature", choice: false, special: "" }
        };
        featData.system.activities = {
          altarionSave0003: this._makeSaveActivity({
            id: "altarionSave0003",
            name: "Ancestral Surge",
            activationType: "special",
            activationCondition: "Replaces one attack",
            saveAbility: "dex",
            dcCalculation: "int",
            damageParts: [this._makeDamagePart({ number: sInfo.d, denomination: 6, types: ["force"] })],
            onSave: "half",
            rangeValue: null,
            rangeUnits: "self",
            templateType: "line",
            templateSize: sInfo.len,
            templateWidth: sInfo.w,
            affectsType: "creature",
            promptTemplate: true
          })
        };
      } else if (name === "Draconic Focus") {
        featData.system.uses = {
          spent: 0,
          max: "max(1, @abilities.int.mod)",
          recovery: [{ period: "lr", type: "recoverAll" }]
        };
      } else if (name === "Ancestral Marking") {
        const markMap = { Tiny: 15, Small: 15, Medium: 15, Large: 30, Huge: 60 };
        const mRange = markMap[sizeLabel] || 15;
        featData.system.uses = { spent: 0, max: "", recovery: [] };
        featData.system.target = {
          template: {
            count: "",
            contiguous: false,
            type: "",
            size: "",
            width: "",
            height: "",
            units: "ft"
          },
          affects: { count: "max(1, @abilities.int.mod)", type: "enemy", choice: true, special: `within ${mRange} ft of Altarion or Aitusa` }
        };
        featData.system.activities = {
          altarionUtilMark: this._makeUtilityActivity({
            id: "altarionUtilMark",
            name: "Ancestral Marking",
            activationType: "special",
            activationCondition: "Replaces one attack",
            durationValue: "1",
            durationUnits: "minute",
            rangeValue: mRange,
            rangeUnits: "ft",
            affectsType: "enemy",
            affectsCount: "max(1, @abilities.int.mod)",
            chatFlavor: `Select up to your Intelligence modifier creatures within ${mRange} ft of Altarion or Aitusa to make a Wisdom saving throw or be Marked for 1 minute.`
          })
        };
      } else if (name === "Dragon's Breath") {
        const dbMap = {
          Tiny: { d: 4, c: 30 },
          Small: { d: 4, c: 30 },
          Medium: { d: 4, c: 30 },
          Large: { d: 6, c: 60 },
          Huge: { d: 8, c: 90 }
        };
        const dbInfo = dbMap[sizeLabel] || dbMap.Medium;
        featData.system.uses = {
          spent: 0,
          max: "max(1, @abilities.con.mod)",
          recovery: [{ period: "lr", type: "recoverAll" }]
        };
        featData.system.target = {
          template: {
            count: "",
            contiguous: false,
            type: "cone",
            size: String(dbInfo.c),
            width: "",
            height: "",
            units: "ft"
          },
          affects: { count: "", type: "creature", choice: false, special: "" }
        };
        featData.system.activities = {
          altarionSave0005: this._makeSaveActivity({
            id: "altarionSave0005",
            name: "Dragon's Breath",
            activationType: "action",
            saveAbility: "dex",
            dcCalculation: "con",
            damageParts: [this._makeDamagePart({ number: dbInfo.d, denomination: 10, types: ["force"] })],
            onSave: "half",
            rangeValue: null,
            rangeUnits: "self",
            templateType: "cone",
            templateSize: dbInfo.c,
            affectsType: "creature",
            promptTemplate: true,
            consumptionTargets: [{ type: "itemUses", target: "", value: "1", scaling: { mode: "", formula: "" } }]
          })
        };
      } else if (name === "Ancestral Tether") {
        featData.system.uses = { spent: 0, max: "", recovery: [] };
        featData.system.activities = {
          altarionUtilTeth: this._makeUtilityActivity({
            id: "altarionUtilTeth",
            name: "Establish Ancestral Tether",
            activationType: "action",
            rangeValue: null,
            rangeUnits: "touch",
            affectsType: "ally",
            chatFlavor: "Select a spell slot of 1st level or higher to tether your Ancestral essence to Aitusa."
          })
        };
      } else if (name === "Draconic Enhancement") {
        featData.system.uses = { spent: 0, max: "", recovery: [] };
        featData.system.activities = {
          altarionUtilEnh1: this._makeUtilityActivity({
            id: "altarionUtilEnh1",
            name: "Toggle Draconic Enhancement (+1 AC & Flight)",
            activationType: "special",
            activationCondition: "Toggle Draconic Wings & Scales",
            rangeValue: null,
            rangeUnits: "self",
            affectsType: "self",
            chatFlavor: "Activate or dismiss your Draconic Enhancement (+1 AC, Fly Speed equal to Aitusa's, and 30 ft Truesight)."
          })
        };
      } else if (name === "Ancestral Form") {
        featData.system.uses = {
          spent: 0,
          max: "1",
          recovery: [{ period: "lr", type: "recoverAll" }]
        };
        featData.system.activities = {
          altarionUtilForm: this._makeUtilityActivity({
            id: "altarionUtilForm",
            name: "Assume Ancestral Form",
            activationType: "action",
            durationValue: "1",
            durationUnits: "minute",
            rangeValue: null,
            rangeUnits: "self",
            affectsType: "self",
            consumptionTargets: [{ type: "itemUses", target: "", value: "1", scaling: { mode: "", formula: "" } }],
            chatFlavor: "For 1 minute, while above half HP, your Ancestral Weapon attacks deal extra Force damage equal to your Intelligence modifier."
          })
        };
      }
    } else {
      // Aitusa features & attacks
      // Note: Bite Attack, Tail Attack, and Wing Attack share the "Dragon Attacks" resource (resources.primary.value, Max = STR modifier, SR/LR recovery)
      const dragonAttacksConsumption = [
        { type: "attribute", target: "resources.primary.value", value: "1", scaling: { mode: "", formula: "" } }
      ];

      if (name === "Claw Attack") {
        const clawMap = {
          Tiny: { n: 1, f: 4 },
          Small: { n: 1, f: 4 },
          Medium: { n: 2, f: 4 },
          Large: { n: 2, f: 6 },
          Huge: { n: 2, f: 8 }
        };
        const cInfo = clawMap[sizeLabel] || clawMap.Small;
        featData.system.uses = { spent: 0, max: "", recovery: [] };
        featData.system.activities = {
          aitusaAttack0001: this._makeAttackActivity({
            id: "aitusaAttack0001",
            name: "Claw Attack",
            ability: "str",
            reach: 5,
            damageParts: [
              this._makeDamagePart({ number: cInfo.n, denomination: cInfo.f, bonus: "@mod", types: ["slashing"] })
            ]
          })
        };
      } else if (name === "Bite Attack") {
        const biteMap = {
          Tiny: { pn: 1, pf: 4, fn: 1 },
          Small: { pn: 1, pf: 4, fn: 1 },
          Medium: { pn: 2, pf: 4, fn: 2 },
          Large: { pn: 2, pf: 6, fn: 3 },
          Huge: { pn: 2, pf: 8, fn: 4 }
        };
        const bInfo = biteMap[sizeLabel] || biteMap.Small;
        featData.system.uses = { spent: 0, max: "", recovery: [] };
        featData.system.activities = {
          aitusaAttack0002: this._makeAttackActivity({
            id: "aitusaAttack0002",
            name: "Bite Attack",
            ability: "str",
            reach: 5,
            damageParts: [
              this._makeDamagePart({ number: bInfo.pn, denomination: bInfo.pf, bonus: "@mod", types: ["piercing"] }),
              this._makeDamagePart({ number: bInfo.fn, denomination: 6, bonus: "", types: ["force"] })
            ],
            consumptionTargets: dragonAttacksConsumption
          })
        };
      } else if (name === "Tail Attack") {
        const tailMap = {
          Tiny: { n: 2, f: 4, r: 10 },
          Small: { n: 2, f: 4, r: 10 },
          Medium: { n: 2, f: 4, r: 10 },
          Large: { n: 2, f: 6, r: 15 },
          Huge: { n: 2, f: 8, r: 20 }
        };
        const tInfo = tailMap[sizeLabel] || tailMap.Medium;
        featData.system.uses = { spent: 0, max: "", recovery: [] };
        featData.system.activities = {
          aitusaAttack0003: this._makeAttackActivity({
            id: "aitusaAttack0003",
            name: "Tail Attack",
            ability: "str",
            reach: tInfo.r,
            damageParts: [
              this._makeDamagePart({ number: tInfo.n, denomination: tInfo.f, bonus: "@mod", types: ["bludgeoning"] })
            ],
            chatFlavor:
              "On a hit, the target must succeed on a Strength saving throw (DC = 8 + PB + STR) or be knocked Prone.",
            consumptionTargets: dragonAttacksConsumption
          })
        };
      } else if (name === "Wing Attack") {
        const wingMap = { Tiny: 10, Small: 10, Medium: 10, Large: 15, Huge: 20 };
        const wRad = wingMap[sizeLabel] || 10;
        featData.system.uses = { spent: 0, max: "", recovery: [] };
        featData.system.target = {
          template: {
            count: "",
            contiguous: false,
            type: "radius",
            size: String(wRad),
            width: "",
            height: "",
            units: "ft"
          },
          affects: { count: "", type: "creature", choice: true, special: "" }
        };
        featData.system.activities = {
          aitusaSave000001: this._makeSaveActivity({
            id: "aitusaSave000001",
            name: "Wing Attack",
            activationType: "action",
            saveAbility: "str",
            dcCalculation: "str",
            damageParts: [],
            onSave: "none",
            rangeValue: null,
            rangeUnits: "self",
            templateType: "radius",
            templateSize: wRad,
            affectsType: "creature",
            affectsChoice: true,
            promptTemplate: true,
            consumptionTargets: dragonAttacksConsumption
          })
        };
      } else if (name === "Breath Weapon") {
        const bwMap = {
          Tiny: { d: 2, c: 15 },
          Small: { d: 2, c: 15 },
          Medium: { d: 4, c: 30 },
          Large: { d: 6, c: 60 },
          Huge: { d: 8, c: 90 }
        };
        const bwInfo = bwMap[sizeLabel] || bwMap.Small;
        featData.system.uses = {
          spent: 0,
          max: "max(1, @abilities.con.mod)",
          recovery: [{ period: "lr", type: "recoverAll" }]
        };
        featData.system.target = {
          template: {
            count: "",
            contiguous: false,
            type: "cone",
            size: String(bwInfo.c),
            width: "",
            height: "",
            units: "ft"
          },
          affects: { count: "", type: "creature", choice: false, special: "" }
        };
        featData.system.activities = {
          aitusaSave000002: this._makeSaveActivity({
            id: "aitusaSave000002",
            name: "Breath Weapon",
            activationType: "action",
            saveAbility: "dex",
            dcCalculation: "con",
            damageParts: [this._makeDamagePart({ number: bwInfo.d, denomination: 10, types: ["force"] })],
            onSave: "half",
            rangeValue: null,
            rangeUnits: "self",
            templateType: "cone",
            templateSize: bwInfo.c,
            affectsType: "creature",
            promptTemplate: true,
            consumptionTargets: [{ type: "itemUses", target: "", value: "1", scaling: { mode: "", formula: "" } }]
          })
        };
      } else if (name === "Titanic Roar") {
        featData.system.uses = {
          spent: 0,
          max: "1",
          recovery: [{ period: "lr", type: "recoverAll" }]
        };
        featData.system.target = {
          template: {
            count: "",
            contiguous: false,
            type: "radius",
            size: "30",
            width: "",
            height: "",
            units: "ft"
          },
          affects: { count: "", type: "enemy", choice: true, special: "" }
        };
        featData.system.activities = {
          aitusaSave000003: this._makeSaveActivity({
            id: "aitusaSave000003",
            name: "Titanic Roar",
            activationType: "action",
            saveAbility: "wis",
            dcCalculation: "con",
            damageParts: [],
            onSave: "none",
            rangeValue: null,
            rangeUnits: "self",
            templateType: "radius",
            templateSize: 30,
            affectsType: "enemy",
            affectsChoice: true,
            promptTemplate: true,
            consumptionTargets: [{ type: "itemUses", target: "", value: "1", scaling: { mode: "", formula: "" } }]
          })
        };
      }
    }

    return featData;
  }

  /**
   * Build the "Ancestral Weapon" inventory item (Greatsword-based, Heavy, Two-Handed, 2d6 + STR Force damage)
   * granted by the level 3 Ancestral Awakening feature.
   */
  static async pBuildAncestralWeapon() {
    let baseImg = (await this.pResolveDrIcon("Ancestral Weapon")) || "modules/altarion-aitusa/dr_icons/ancestral-weapon.jpg";

    return {
      name: "Ancestral Weapon",
      type: "weapon",
      img: baseImg,
      system: {
        description: {
          value: `<div class="rd__b  rd__b--2"><p>When you choose this bond at 3rd level, you can use your action to create an <strong>Ancestral Weapon</strong>, a magical weapon that flows with your dragon's ancestral energies, in your empty hand. You are proficient with it while you wield it. This weapon's damage type is the same as your Dragon Ancestry Damage Type (<strong>Force</strong>) and you can use it as a spellcasting focus for your Ancestral spells. You can summon this weapon as a bonus action on your turn, causing it to teleport instantly to your hand.</p><p><strong>Ancestral Ward Synergy:</strong> While <em>Ancestral Ward</em> is active and you have temporary hit points, hitting a creature with your Ancestral Weapon forces them to make a Wisdom saving throw against your spell save DC or have disadvantage on all attack rolls made against any creature other than you or your dragon until the end of your next turn.</p></div>`
        },
        source: {
          book: "DR-Altarion",
          page: "74",
          custom: "Dragon Rider: Ancestral Magic",
          rules: "2014"
        },
        quantity: 1,
        weight: { value: 6, units: "lb" },
        price: { value: 0, denomination: "gp" },
        attunement: "",
        equipped: true,
        identified: true,
        proficient: 1,
        type: {
          value: "martialM",
          baseItem: "greatsword"
        },
        properties: ["hvy", "two", "mgc"],
        ability: "str",
        range: {
          value: 5,
          long: null,
          reach: 5,
          units: "ft"
        },
        damage: {
          base: {
            number: 2,
            denomination: 6,
            bonus: "",
            types: ["force"],
            custom: { enabled: false, formula: "" },
            scaling: { mode: "", number: null, formula: "" }
          },
          versatile: {
            number: null,
            denomination: null,
            bonus: "",
            types: [],
            custom: { enabled: false, formula: "" },
            scaling: { mode: "", number: null, formula: "" }
          }
        },
        activities: {
          ancestralWpnAtk1: {
            _id: "ancestralWpnAtk1",
            type: "attack",
            name: "Attack",
            activation: { type: "action", value: 1, condition: "", override: false },
            consumption: { targets: [], scaling: { allowed: false, max: "" }, spellSlot: false },
            description: { chatFlavor: "" },
            duration: { concentration: false, value: "", units: "inst", special: "", override: false },
            effects: [],
            range: { value: 5, units: "ft", special: "", override: false },
            target: {
              template: { count: "", contiguous: false, type: "", size: "", width: "", height: "", units: "ft" },
              affects: { count: "1", type: "creature", choice: false, special: "" },
              prompt: true,
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
              parts: []
            },
            sort: 0
          }
        }
      },
      flags: {
        plutonium: {
          page: "items.html",
          source: "DR-Altarion",
          hash: "ancestral_weapon_dr-altarion"
        },
        "altarion-aitusa": {
          isPrimaryClassItem: true,
          isAncestralWeapon: true,
          levelRequired: 3,
          featureKey: "dragon-rider:weapon:ancestral-weapon:3",
          syncSchemaVersion: 6
        }
      }
    };
  }

  /**
   * Build Altarion's exclusive 1st-level Abjuration spell: "Altarion's Echoing Ward"
   */
  static async pBuildEchoingWardSpell() {
    const img =
      (await this.pResolveDrIcon("Altarion's Echoing Ward")) ||
      "modules/altarion-aitusa/dr_icons/ancestral-ward.jpg";

    return {
      name: "Altarion's Echoing Ward",
      type: "spell",
      img,
      system: {
        description: {
          value: `<div class="rd__b  rd__b--2"><p>You project a fleeting echo of pure abjuration magic to shield you or an ally. The target of the spell (which can be you or the creature that took damage) gains temporary hit points equal to <strong>1d8 + your spellcasting ability modifier</strong>. These temporary hit points are applied before the triggering damage and last for the duration.</p><div class="rd__b  rd__b--3"><span class="rd__h rd__h--3" data-title-index="1"> <span class="entry-title-inner">At Higher Levels.</span></span> <p>When you cast this spell using a spell slot of 2nd level or higher, the temporary hit points gained increase by <strong>1d8</strong> for each slot level above 1st.</p></div></div>`
        },
        source: {
          book: "DR-Altarion",
          page: "1",
          custom: "Altarion Exclusive Spell",
          rules: "2014"
        },
        level: 1,
        school: "abj",
        properties: ["vocal", "somatic"],
        materials: {
          value: "",
          consumed: false,
          cost: 0,
          supply: 0
        },
        method: "spell",
        prepared: 1,
        activation: {
          type: "reaction",
          value: 1,
          condition: "which you take when you or a creature you can see within 30 feet of you takes damage"
        },
        duration: {
          value: "1",
          units: "hour"
        },
        range: {
          value: 30,
          units: "ft"
        },
        target: {
          template: { count: "", contiguous: false, type: "", size: "", width: "", height: "", units: "ft" },
          affects: { count: "1", type: "creature", choice: false, special: "you or the creature that took damage" }
        },
        activities: {
          echoingWardHeal1: {
            _id: "echoingWardHeal1",
            type: "heal",
            name: "Project Echoing Ward (Temp HP)",
            activation: {
              type: "reaction",
              value: 1,
              condition: "when you or a creature you can see within 30 feet of you takes damage",
              override: false
            },
            consumption: {
              targets: [],
              scaling: { allowed: false, max: "" },
              spellSlot: true
            },
            description: {
              chatFlavor: "Applies Temporary Hit Points (1d8 + Spellcasting Ability Modifier, +1d8 per slot level above 1st) before the triggering damage."
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
              value: 30,
              units: "ft",
              special: "",
              override: false
            },
            target: {
              template: { count: "", contiguous: false, type: "", size: "", width: "", height: "", units: "ft" },
              affects: { count: "1", type: "creature", choice: false, special: "" },
              prompt: false,
              override: false
            },
            uses: { spent: 0, max: "", recovery: [] },
            healing: {
              number: 1,
              denomination: 8,
              bonus: "@mod",
              types: ["temphp"],
              custom: { enabled: false, formula: "" },
              scaling: { mode: "whole", number: 1, formula: "" }
            },
            sort: 0
          }
        }
      },
      flags: {
        plutonium: {
          page: "spells.html",
          source: "DR-Altarion",
          hash: "altarions_echoing_ward_dr-altarion"
        },
        "altarion-aitusa": {
          isPrimaryClassItem: true,
          isExclusiveSpell: true,
          featureKey: "altarion:spell:echoing-ward:1",
          syncSchemaVersion: 7
        }
      }
    };
  }

  /**
   * Build Altarion's 1st-level Abjuration spell: "Arcane Armor"
   * (Rebuilt from Armor of Agathys via Ancestral Spells + Dragon Ancestry Force damage conversion,
   * fixing Temporary HP and Force Retaliation upcast scaling to 5 * Spell Slot Level).
   */
  static async pBuildArcaneArmorSpell() {
    const img =
      (await this.pResolveDrIcon("Arcane Armor")) ||
      "modules/altarion-aitusa/dr_icons/arcane-armor.jpg";

    return {
      name: "Arcane Armor",
      type: "spell",
      img,
      system: {
        description: {
          value: `<div class="rd__b  rd__b--2"><p>A protective magical force surrounds you, manifesting as crystalline plates of pure arcane energy that cover you and your gear. You gain <strong>5 temporary hit points</strong> for the duration. If a creature hits you with a melee attack while you have these temporary hit points, the creature takes <strong>5 force damage</strong> <em>(converted from cold damage via Dragon Ancestry)</em>.</p><div class="rd__b  rd__b--3"><span class="rd__h rd__h--3" data-title-index="1"> <span class="entry-title-inner">At Higher Levels.</span></span> <p>When you cast this spell using a spell slot of 2nd level or higher, both the temporary hit points and the force damage increase by <strong>5</strong> for each slot level above 1st (<strong>5 &times; Spell Slot Level</strong>).</p></div></div>`
        },
        source: {
          book: "DR-Altarion",
          page: "1",
          custom: "Ancestral Spells (Dragon Ancestry — Force)",
          rules: "2014"
        },
        level: 1,
        school: "abj",
        properties: ["vocal", "somatic", "material"],
        materials: {
          value: "a cup of water or shard of arcane crystal",
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
          arcaneArmorCast1: {
            _id: "arcaneArmorCast1",
            type: "utility",
            name: "Don Arcane Armor (Temp HP & Force Retaliation)",
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
                "Grants 5 × Spell Slot Level Temporary Hit Points for 1 hour. Any creature that hits you with a melee attack while these Temporary Hit Points remain takes 5 × Spell Slot Level Force damage."
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
          source: "DR-Altarion",
          hash: "arcane_armor_dr-altarion",
          isDirectImport: true,
          isStandardDragDrop: true
        },
        "altarion-aitusa": {
          isPrimaryClassItem: true,
          isArcaneArmorSpell: true,
          featureKey: "altarion:spell:arcane-armor:1",
          syncSchemaVersion: 10
        }
      }
    };
  }

  /**
   * Build Altarion's Evocation Cantrip: "Arcane Bolt" (Force-damage replacement for Fire Bolt).
   * Uses "icons/magic/fire/projectile-fireball-purple.webp" on Altarion
   * and "icons/magic/light/explosion-impact-purple.webp" on Aitusa.
   */
  static async pBuildArcaneBoltSpell({ forAitusa = false } = {}) {
    const img = forAitusa
      ? "icons/magic/light/explosion-impact-purple.webp"
      : "icons/magic/fire/projectile-fireball-purple.webp";

    return {
      name: "Arcane Bolt",
      type: "spell",
      img,
      system: {
        description: {
          value: `<div class="rd__b  rd__b--2"><p>You fire an arcane bolt at a creature or object within range. Make a ranged spell attack against the target. On a hit, the target takes [[/damage 1d10 type=force]] damage.</p><p>This spell's damage increases by [[/r 1d10]] when you reach 5th level ([[/damage 2d10]]), 11th level ([[/damage 3d10]]), and 17th level ([[/damage 4d10]]).</p></div>`
        },
        source: {
          book: "DR-Altarion",
          page: "1",
          custom: "Dragon Ancestry — Force Cantrip",
          rules: "2014"
        },
        level: 0,
        school: "evo",
        properties: ["vocal", "somatic"],
        materials: {
          value: "",
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
          value: "",
          units: "inst"
        },
        range: {
          value: 120,
          units: "ft"
        },
        target: {
          template: { count: "", contiguous: false, type: "", size: "", width: "", height: "", units: "ft" },
          affects: { count: "1", type: "creatureOrObject", choice: false, special: "" }
        },
        activities: {
          arcaneBoltAtk001: {
            _id: "arcaneBoltAtk001",
            type: "attack",
            name: "Arcane Bolt",
            activation: {
              type: "action",
              value: 1,
              condition: "",
              override: false
            },
            consumption: {
              targets: [],
              scaling: { allowed: false, max: "" },
              spellSlot: false
            },
            description: {
              chatFlavor: ""
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
              value: 120,
              units: "ft",
              special: "",
              override: false
            },
            target: {
              template: { count: "", contiguous: false, type: "", size: "", width: "", height: "", units: "ft" },
              affects: { count: "1", type: "creatureOrObject", choice: false, special: "" },
              prompt: false,
              override: false
            },
            uses: { spent: 0, max: "", recovery: [] },
            attack: {
              ability: "",
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
                  types: ["force"],
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
          source: "DR-Altarion",
          hash: "arcane_bolt_dr-altarion",
          isDirectImport: true,
          isStandardDragDrop: true
        },
        "altarion-aitusa": {
          isPrimaryClassItem: true,
          isArcaneBoltSpell: true,
          featureKey: "altarion:spell:arcane-bolt:0",
          syncSchemaVersion: 10
        }
      }
    };
  }

  /**
   * Build Altarion's Evocation Cantrip: "Arcane Blade" (Force-damage replacement for Booming Blade).
   */
  static async pBuildArcaneBladeSpell() {
    const img =
      (await this.pResolveDrIcon("Arcane Blade")) ||
      "modules/altarion-aitusa/dr_icons/arcane-blade.jpg";

    return {
      name: "Arcane Blade",
      type: "spell",
      img,
      system: {
        description: {
          value: `<div class="rd__b  rd__b--2"><p>You brandish the weapon used in the spell's casting and make a melee attack with it against one creature within 5 feet of you. On a hit, the target suffers the weapon attack's normal effects and then becomes sheathed in arcane energy until the start of your next turn. If the target willingly moves 5 feet or more before then, the target takes [[/damage 1d8 type=force]] damage, and the spell ends.</p><p>This spell's damage increases when you reach certain levels. At 5th level, the melee attack deals an extra [[/damage 1d8 type=force]] damage to the target on a hit, and the damage the target takes for moving increases to [[/damage 2d8]]. Both damage rolls increase by 1d8 at 11th level ([[/damage 2d8]] and [[/damage 3d8]]) and again at 17th level ([[/damage 3d8]] and [[/damage 4d8]]).</p></div>`
        },
        source: {
          book: "DR-Altarion",
          page: "1",
          custom: "Dragon Ancestry — Force Cantrip",
          rules: "2014"
        },
        level: 0,
        school: "evo",
        properties: ["somatic", "material"],
        materials: {
          value: "a melee weapon worth at least 1 sp",
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
          units: "round"
        },
        range: {
          value: 5,
          units: "ft"
        },
        target: {
          template: { count: "", contiguous: false, type: "", size: "", width: "", height: "", units: "ft" },
          affects: { count: "1", type: "creature", choice: false, special: "" }
        },
        activities: {
          arcaneBladeCast1: {
            _id: "arcaneBladeCast1",
            type: "damage",
            name: "Cast Arcane Blade (On-Hit Bonus Force @ Lvl 5+)",
            activation: {
              type: "action",
              value: 1,
              condition: "",
              override: false
            },
            consumption: {
              targets: [],
              scaling: { allowed: false, max: "" },
              spellSlot: false
            },
            description: {
              chatFlavor:
                "Make a melee weapon attack against a target within 5 ft. On hit, sheathes target in arcane energy until start of your next turn."
            },
            duration: {
              concentration: false,
              value: "1",
              units: "round",
              special: "",
              override: false
            },
            effects: [],
            range: {
              value: 5,
              units: "ft",
              special: "",
              override: false
            },
            target: {
              template: { count: "", contiguous: false, type: "", size: "", width: "", height: "", units: "ft" },
              affects: { count: "1", type: "creature", choice: false, special: "" },
              prompt: false,
              override: false
            },
            uses: { spent: 0, max: "", recovery: [] },
            damage: {
              critical: { allow: true, bonus: "" },
              parts: [
                {
                  number: null,
                  denomination: null,
                  bonus: "",
                  types: ["force"],
                  custom: { enabled: true, formula: "(floor((@details.level + 1) / 6))d8" },
                  scaling: { mode: "", number: null, formula: "" }
                }
              ]
            },
            sort: 0
          },
          arcaneBladeMove1: {
            _id: "arcaneBladeMove1",
            type: "damage",
            name: "Movement Trigger Damage (Willingly Moves 5+ ft)",
            activation: {
              type: "special",
              value: null,
              condition: "When the sheathed target willingly moves 5 feet or more before the start of your next turn",
              override: false
            },
            consumption: {
              targets: [],
              scaling: { allowed: false, max: "" },
              spellSlot: false
            },
            description: {
              chatFlavor: "Target willingly moved 5 ft or more while sheathed in Arcane Blade energy!"
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
              value: 5,
              units: "ft",
              special: "",
              override: false
            },
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
                  types: ["force"],
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
          source: "DR-Altarion",
          hash: "arcane_blade_dr-altarion",
          isDirectImport: true,
          isStandardDragDrop: true
        },
        "altarion-aitusa": {
          isPrimaryClassItem: true,
          isArcaneBladeSpell: true,
          featureKey: "altarion:spell:arcane-blade:0",
          syncSchemaVersion: 10
        }
      }
    };
  }

  /**
   * Build Altarion's 2nd-level Abjuration spell: "Abjuration Bulwark"
   * (1/Long Rest Free Cast without a spell slot + normal Spell Slot casting; stacks Temporary HP while current Temp HP < 4 * character level).
   */
  static async pBuildAbjurationBulwarkSpell() {
    const img =
      (await this.pResolveDrIcon("Abjuration Bulwark")) ||
      "modules/altarion-aitusa/dr_icons/abjuration-bulwark.jpg";

    return {
      name: "Abjuration Bulwark",
      type: "spell",
      img,
      system: {
        description: {
          value: `<div class="rd__b  rd__b--2"><p>You increase your body's capacity to gather Abjuration energy. For the duration, whenever you would gain temporary hit points while you already have an amount of temporary hit points that is fewer than <strong>4 times your character's level</strong>, you add the value to the total.</p><div class="rd__b  rd__b--3"><span class="rd__h rd__h--3" data-title-index="1"> <span class="entry-title-inner">At Higher Levels.</span></span> <p>When you cast this spell using a spell slot of 3rd level or higher, the duration increases by <strong>1 hour</strong> for each level above first.</p></div><hr><p><em><strong>Innate Mastery:</strong> You can cast this spell once without expending a spell slot, regaining the ability to do so when you finish a long rest. You can also cast it normally using spell slots of 2nd level or higher.</em></p></div>`
        },
        source: {
          book: "DR-Altarion",
          page: "1",
          custom: "Abjuration Mastery",
          rules: "2014"
        },
        level: 2,
        school: "abj",
        properties: ["vocal", "somatic"],
        materials: {
          value: "",
          consumed: false,
          cost: 0,
          supply: 0
        },
        method: "spell",
        prepared: 1,
        uses: {
          spent: 0,
          max: "1",
          recovery: [{ period: "lr", type: "recoverAll" }]
        },
        activation: {
          type: "action",
          value: 1,
          condition: ""
        },
        duration: {
          value: "2",
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
          abjBulwarkFree01: {
            _id: "abjBulwarkFree01",
            type: "utility",
            name: "Cast (Free 1/Long Rest — No Spell Slot)",
            activation: {
              type: "action",
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
                "Cast Abjuration Bulwark at 2nd level (2 hours) without expending a spell slot (1/Long Rest). Temporary HP stacks while current Temp HP < 4 × character level."
            },
            duration: {
              concentration: false,
              value: "2",
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
            roll: {
              prompt: false,
              visible: false,
              name: "",
              formula: ""
            },
            sort: 0
          },
          abjBulwarkSlot01: {
            _id: "abjBulwarkSlot01",
            type: "utility",
            name: "Cast with Spell Slot (2nd+ Level)",
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
                "Cast Abjuration Bulwark using a 2nd+ level spell slot (duration: 2 hours at 2nd level; +1 hour for each slot level above 1st when cast at 3rd+ level)."
            },
            duration: {
              concentration: false,
              value: "2",
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
          source: "DR-Altarion",
          hash: "abjuration_bulwark_dr-altarion",
          isDirectImport: true,
          isStandardDragDrop: true
        },
        "altarion-aitusa": {
          isPrimaryClassItem: true,
          isAbjurationBulwarkSpell: true,
          featureKey: "altarion:spell:abjuration-bulwark:2",
          syncSchemaVersion: 11
        }
      }
    };
  }

  /**
   * Build Altarion's Race ("Ivarian High Elf"), standard Elf traits (Keen Senses, Fey Ancestry),
   * Ivarian racial traits (Arcane Knowledge, Ancestral Trance, Ivarian High Magic, Arcane Step),
   * and "Essence Harvest" + the 8 Arcane Echoes.
   */
  static async pBuildAltarionRaceAndEchoes() {
    const raceIcon =
      (await this.pResolveDrIcon("Ivarian High Elf")) ||
      "modules/altarion-aitusa/dr_icons/ancestral-magic.jpg";

    const raceData = {
      name: "Ivarian High Elf",
      type: "race",
      img: raceIcon,
      system: {
        identifier: "ivarian-high-elf",
        description: {
          value: `<div class="rd__b  rd__b--2"><p>Centuries ago, the <strong>Ivarian High Elves</strong> ruled one of the grandest and most formidable empires in history. Steeped in arcane perfection, the Empire of Ivaria preached an unwavering doctrine of elven supremacy—viewing the High Elves of Ivaria as inherently superior to all other mortal peoples by virtue of their peerless mastery over the Weave.</p><p>At the apex of this magocratic civilization stood <strong>Emperor Taelion Valtoris</strong>, an Archmage and Magocrat of casi-divine power who embodied the empire's supremacist ideals and relentless arcane ambition. Through his command of the eight schools of magic, Ivaria's spires pierced the heavens and bent reality to the Emperor's design.</p><p>Over eight hundred years ago, that golden age ended in a single cataclysmic night. An apocalyptic magical calamity tore through the heart of the empire, shattering its cities and twisting the very land. Today, the ruins of Ivaria are known only as the <strong>Deadlands</strong>—a blighted, forsaken wasteland where nothing lives, saturated with a lethally virulent and infectious arcane plague that contaminates all who dare set foot within its borders.</p><hr><div class="rd__b  rd__b--3"><span class="rd__h rd__h--3" data-title-index="1"> <span class="entry-title-inner">Ivarian High Elf Traits</span></span><p><strong>Creature Type:</strong> Humanoid (Elf)</p><p><strong>Size:</strong> Medium</p><p><strong>Speed:</strong> 30 feet</p><p><strong>Darkvision:</strong> 60 feet</p><p><strong>Languages:</strong> Common, Elvish, and Old Ivarian</p><p><strong>Features:</strong> Keen Senses, Fey Ancestry, Arcane Knowledge, Ancestral Trance, Ivarian High Magic, Arcane Step, and Essence Harvest.</p></div></div>`
        },
        source: {
          book: "DR-Altarion",
          page: "1",
          custom: "Ivarian Empire",
          rules: "2014"
        },
        movement: {
          burrow: null,
          climb: null,
          fly: null,
          swim: null,
          walk: 30,
          units: "ft",
          hover: false
        },
        senses: {
          darkvision: 60,
          blindsight: null,
          tremorsense: null,
          truesight: null,
          units: "ft",
          special: ""
        },
        type: {
          value: "humanoid",
          subtype: "elf",
          swarm: "",
          custom: ""
        },
        advancement: []
      },
      flags: {
        plutonium: {
          page: "races.html",
          source: "DR-Altarion",
          hash: "ivarian_high_elf_dr-altarion"
        },
        "altarion-aitusa": {
          isAltarionRace: true,
          featureKey: "altarion:race:ivarian-high-elf",
          syncSchemaVersion: 6
        }
      }
    };

    const makeRacialFeat = async ({
      name,
      key,
      descriptionHtml,
      uses = { spent: 0, max: "", recovery: [] },
      activities = {},
      target = undefined,
      effects = [],
      isEcho = false,
      echoKey = ""
    }) => {
      const icon = (await this.pResolveDrIcon(name)) || raceIcon;
      const doc = {
        name,
        type: "feat",
        img: icon,
        system: {
          description: { value: `<div class="rd__b  rd__b--2">${descriptionHtml}</div>` },
          source: {
            book: "DR-Altarion",
            page: "1",
            custom: isEcho ? "Essence Harvest: Arcane Echo" : "Ivarian High Elf",
            rules: "2014"
          },
          type: {
            value: "race",
            subtype: ""
          },
          requirements: isEcho ? "Ivarian High Elf (Essence Harvest)" : "Ivarian High Elf",
          uses,
          activities
        },
        effects,
        flags: {
          plutonium: {
            page: "races.html",
            source: "DR-Altarion",
            hash: `${key}_dr-altarion`
          },
          "altarion-aitusa": {
            isPrimaryClassItem: true,
            isRacialFeature: true,
            isArcaneEcho: isEcho,
            echoKey: echoKey || key,
            originCategory: "race",
            levelRequired: 1,
            featureKey: `altarion:race-feat:${key}`,
            syncSchemaVersion: 9
          }
        }
      };
      if (target) doc.system.target = target;
      return doc;
    };

    const racialFeatures = [
      await makeRacialFeat({
        name: "Keen Senses",
        key: "keen-senses",
        descriptionHtml: `<p>You have proficiency in the Perception skill.</p>`
      }),
      await makeRacialFeat({
        name: "Fey Ancestry",
        key: "fey-ancestry",
        descriptionHtml: `<p>You have advantage on saving throws against being charmed, and magic can't put you to sleep.</p>`
      }),
      await makeRacialFeat({
        name: "Arcane Knowledge",
        key: "arcane-knowledge",
        descriptionHtml: `<p>You have proficiency in the Arcana skill.</p>`
      }),
      await makeRacialFeat({
        name: "Ancestral Trance",
        key: "ancestral-trance",
        descriptionHtml: `<p>You don’t need to sleep, and magic can’t put you to sleep. You can finish a long rest in 4 hours if you spend those hours in a trancelike meditation, during which you retain consciousness. Whenever you finish this trance, you can tap into the Weave to gain temporary magical knowledge. You learn one cantrip of your choice from any class's spell list. This cantrip counts as a wizard spell for you, and Intelligence, Wisdom, or Charisma is your spellcasting ability for it (choose when you select this race). You know this cantrip until you finish your next long rest.</p>`
      }),
      await makeRacialFeat({
        name: "Ivarian High Magic",
        key: "ivarian-high-magic",
        descriptionHtml: `<p>You know the <em>mage hand</em> cantrip. Starting at 3rd level, you can cast the <em>detect magic</em> spell with this trait. Starting at 5th level, you can cast the <em>see invisibility</em> spell with this trait. Once you cast a leveled spell with this trait, you can’t do so again until you finish a long rest. You can also cast either of those spells using any spell slots you have of the appropriate level. Intelligence, Wisdom, or Charisma is your spellcasting ability for these spells when you cast them with this trait (choose when you select this race).</p>`
      }),
      await makeRacialFeat({
        name: "Arcane Step",
        key: "arcane-step",
        descriptionHtml: `<p>As a bonus action, you can magically teleport up to 30 feet (60 feet with <em>Conjurer's Echo</em>) to an unoccupied space you can see. You can use this trait a number of times equal to your proficiency bonus, and you regain all expended uses when you finish a long rest.</p><p><strong>Essence Harvest Synergy:</strong> Whenever you use <em>Arcane Step</em>, you may choose one of your harvested <strong>Arcane Echoes</strong> to activate with the teleport.</p>`,
        uses: {
          spent: 0,
          max: "@prof",
          recovery: [{ period: "lr", type: "recoverAll" }]
        },
        activities: {
          arcaneStepUtil01: this._makeUtilityActivity({
            id: "arcaneStepUtil01",
            name: "Arcane Step (Teleport & Trigger Echo)",
            activationType: "bonus",
            rangeValue: 60,
            rangeUnits: "ft",
            affectsType: "self",
            consumptionTargets: [{ type: "itemUses", target: "", value: "1", scaling: { mode: "", formula: "" } }],
            chatFlavor: "Teleport up to 30 ft (60 ft with Conjurer's Echo) and optionally trigger one Arcane Echo."
          })
        }
      }),
      await makeRacialFeat({
        name: "Essence Harvest",
        key: "essence-harvest",
        descriptionHtml: `<p>You were one of eight simulacra created by the Archmage Taelion of Ivaria, each representing a school of magic. When you are within 100 feet of another of Taelion's simulacra when it is destroyed, its arcane energy is automatically absorbed by you. When this happens you gain a new <strong>Arcane Echo</strong> from the list below, which you may choose to activate (using its listed trigger) whenever you use your <em>Arcane Step</em> trait. You can gain a new Echo for each unique simulacrum essence you harvest (to a maximum of 7). You can only apply one Echo effect per use of <em>Arcane Step</em>.</p>`
      }),
      // 1. Abjurer's Echo
      await makeRacialFeat({
        name: "Abjurer's Echo (Warding Step)",
        key: "abjurers-echo",
        echoKey: "abjurer",
        isEcho: true,
        descriptionHtml: `<p><strong>Trigger:</strong> When you teleport using your <em>Arcane Step</em>.</p><p><strong>Effect:</strong> You gain temporary hit points equal to your proficiency bonus + your Intelligence modifier (minimum of 1 temporary hit point).</p>`,
        activities: {
          echoAbjurerUtil1: this._makeUtilityActivity({
            id: "echoAbjurerUtil1",
            name: "Warding Step (Gain Temp HP)",
            activationType: "special",
            activationCondition: "When you teleport using Arcane Step",
            rangeValue: null,
            rangeUnits: "self",
            affectsType: "self",
            chatFlavor: "Automatically grants Temporary Hit Points equal to Proficiency Bonus + Intelligence modifier."
          })
        }
      }),
      // 2. Necromancer's Echo
      await makeRacialFeat({
        name: "Necromancer's Echo (Weakening Step)",
        key: "necromancers-echo",
        echoKey: "necromancer",
        isEcho: true,
        descriptionHtml: `<p><strong>Trigger:</strong> When you teleport using your <em>Arcane Step</em>.</p><p><strong>Effect:</strong> You can choose one creature you can see within 15 feet of the space you arrive in. The next time that creature makes a saving throw against a spell you cast before the end of your next turn, it has disadvantage on the roll. Once you use this echo, you can't use it again until you finish a short or long rest.</p>`,
        uses: {
          spent: 0,
          max: "1",
          recovery: [
            { period: "sr", type: "recoverAll" },
            { period: "lr", type: "recoverAll" }
          ]
        },
        activities: {
          echoNecroUtil001: this._makeUtilityActivity({
            id: "echoNecroUtil001",
            name: "Weakening Step (Apply Save Disadvantage)",
            activationType: "special",
            activationCondition: "When you teleport using Arcane Step",
            durationValue: "1",
            durationUnits: "round",
            rangeValue: 15,
            rangeUnits: "ft",
            affectsType: "creature",
            affectsCount: "1",
            consumptionTargets: [{ type: "itemUses", target: "", value: "1", scaling: { mode: "", formula: "" } }],
            chatFlavor: "Target creature within 15 ft has disadvantage on the next saving throw it makes against a spell you cast before the end of your next turn."
          })
        }
      }),
      // 3. Evoker's Echo
      await makeRacialFeat({
        name: "Evoker's Echo (Forceful Step)",
        key: "evokers-echo",
        echoKey: "evoker",
        isEcho: true,
        descriptionHtml: `<p><strong>Trigger:</strong> Immediately after you use your <em>Arcane Step</em>.</p><p><strong>Effect:</strong> You can force each creature of your choice within 5 feet of the space you arrived in to make a Dexterity saving throw. The DC for this saving throw equals 8 + your proficiency bonus + your Intelligence modifier. On a failed save, a creature takes force damage equal to <strong>4d10 + your Intelligence modifier</strong>. On a successful save, it takes half as much damage. Once you use this echo, you can't use it again until you finish a short or long rest.</p>`,
        uses: {
          spent: 0,
          max: "1",
          recovery: [
            { period: "sr", type: "recoverAll" },
            { period: "lr", type: "recoverAll" }
          ]
        },
        target: {
          template: {
            count: "",
            contiguous: false,
            type: "radius",
            size: "5",
            width: "",
            height: "",
            units: "ft"
          },
          affects: { count: "", type: "creature", choice: true, special: "" }
        },
        activities: {
          echoEvokerSave01: this._makeSaveActivity({
            id: "echoEvokerSave01",
            name: "Forceful Step (5 ft Force Blast)",
            activationType: "special",
            activationCondition: "Immediately after using Arcane Step",
            saveAbility: "dex",
            dcCalculation: "int",
            damageParts: [
              this._makeDamagePart({
                number: 4,
                denomination: 10,
                bonus: "@abilities.int.mod",
                types: ["force"]
              })
            ],
            onSave: "half",
            rangeValue: null,
            rangeUnits: "self",
            templateType: "radius",
            templateSize: 5,
            affectsType: "creature",
            affectsChoice: true,
            promptTemplate: true,
            consumptionTargets: [{ type: "itemUses", target: "", value: "1", scaling: { mode: "", formula: "" } }]
          })
        }
      }),
      // 4. Illusionist's Echo
      await makeRacialFeat({
        name: "Illusionist's Echo (Veiled Step)",
        key: "illusionists-echo",
        echoKey: "illusionist",
        isEcho: true,
        descriptionHtml: `<p><strong>Trigger:</strong> Immediately after you use your <em>Arcane Step</em>.</p><p><strong>Effect:</strong> You can magically turn invisible. This invisibility lasts until the start of your next turn or until you attack, make a damage roll, or force a creature to make a saving throw.</p>`,
        activities: {
          echoIllusUtil001: this._makeUtilityActivity({
            id: "echoIllusUtil001",
            name: "Veiled Step (Turn Invisible)",
            activationType: "special",
            activationCondition: "Immediately after using Arcane Step",
            durationValue: "1",
            durationUnits: "round",
            rangeValue: null,
            rangeUnits: "self",
            affectsType: "self",
            chatFlavor: "You turn Invisible until the start of your next turn, or until you attack, deal damage, or force a saving throw."
          })
        }
      }),
      // 5. Conjurer's Echo
      await makeRacialFeat({
        name: "Conjurer's Echo (Bounding Step)",
        key: "conjurers-echo",
        echoKey: "conjurer",
        isEcho: true,
        descriptionHtml: `<p><strong>Trigger:</strong> When you use your <em>Arcane Step</em>.</p><p><strong>Effect:</strong> The teleportation range of your <em>Arcane Step</em> increases to 60 feet.</p>`,
        activities: {
          echoConjurUtil01: this._makeUtilityActivity({
            id: "echoConjurUtil01",
            name: "Bounding Step (60 ft Teleport Range)",
            activationType: "special",
            activationCondition: "When you use Arcane Step",
            rangeValue: 60,
            rangeUnits: "ft",
            affectsType: "self",
            chatFlavor: "Your Arcane Step teleportation range increases from 30 feet to 60 feet."
          })
        }
      }),
      // 6. Transmuter's Echo
      await makeRacialFeat({
        name: "Transmuter's Echo (Warping Step)",
        key: "transmuters-echo",
        echoKey: "transmuter",
        isEcho: true,
        descriptionHtml: `<p><strong>Trigger:</strong> Immediately after you use your <em>Arcane Step</em>.</p><p><strong>Effect:</strong> You can grant yourself and one willing creature you can see within 10 feet of you a <strong>+2 bonus to their AC</strong> until the end of your next turn, as their movement and reflexes become faster.</p>`,
        activities: {
          echoTransmUtil01: this._makeUtilityActivity({
            id: "echoTransmUtil01",
            name: "Warping Step (+2 AC to Self & Ally)",
            activationType: "special",
            activationCondition: "Immediately after using Arcane Step",
            durationValue: "1",
            durationUnits: "round",
            rangeValue: 10,
            rangeUnits: "ft",
            affectsType: "willing",
            affectsCount: "2",
            chatFlavor: "Grants +2 AC to Altarion and one willing creature within 10 feet until the end of Altarion's next turn."
          })
        }
      }),
      // 7. Diviner's Echo
      await makeRacialFeat({
        name: "Diviner's Echo (Fated Step)",
        key: "diviners-echo",
        echoKey: "diviner",
        isEcho: true,
        descriptionHtml: `<p><strong>Trigger:</strong> Immediately after you use your <em>Arcane Step</em>.</p><p><strong>Effect:</strong> You gain advantage on the next attack roll, ability check, or saving throw you make before the end of your next turn.</p>`,
        activities: {
          echoDivinUtil001: this._makeUtilityActivity({
            id: "echoDivinUtil001",
            name: "Fated Step (Advantage on Next Roll)",
            activationType: "special",
            activationCondition: "Immediately after using Arcane Step",
            durationValue: "1",
            durationUnits: "round",
            rangeValue: null,
            rangeUnits: "self",
            affectsType: "self",
            chatFlavor: "You gain advantage on the next attack roll, ability check, or saving throw you make before the end of your next turn."
          })
        }
      }),
      // 8. Enchanter's Echo
      await makeRacialFeat({
        name: "Enchanter's Echo (Beguiling Step)",
        key: "enchanters-echo",
        echoKey: "enchanter",
        isEcho: true,
        descriptionHtml: `<p><strong>Trigger:</strong> When you teleport using your <em>Arcane Step</em>.</p><p><strong>Effect:</strong> You can choose one creature you can see within 10 feet of the space you arrived in. The target must succeed on a Wisdom saving throw (DC 8 + your proficiency bonus + your Intelligence modifier) or be <strong>charmed</strong> by you until the start of your next turn.</p>`,
        activities: {
          echoEnchanSave01: this._makeSaveActivity({
            id: "echoEnchanSave01",
            name: "Beguiling Step (Wisdom Save or Charmed)",
            activationType: "special",
            activationCondition: "When you teleport using Arcane Step",
            saveAbility: "wis",
            dcCalculation: "int",
            damageParts: [],
            onSave: "none",
            rangeValue: 10,
            rangeUnits: "ft",
            affectsType: "creature",
            affectsCount: "1",
            promptTemplate: false
          })
        }
      })
    ];

    return {
      raceData,
      racialFeatures
    };
  }

  /**
   * Build Aitusa's Race ("Dragon", creature type: Dragon) with Mystra & Altarion lore fluff.
   */
  static async pBuildAitusaRace() {
    const raceIcon =
      (await this.pResolveDrIcon("Aitusa Dragon Race")) ||
      (await this.pResolveDrIcon("Dragon")) ||
      "modules/altarion-aitusa/dr_icons/dragon-class.jpg";

    return {
      name: "Dragon",
      type: "race",
      img: raceIcon,
      system: {
        identifier: "aitusa-dragon",
        description: {
          value: `<div class="rd__b  rd__b--2"><p><strong>Aitusa</strong> is a celestial Arcane Dragon of pure cosmic Force energy, sent to <strong>Altarion</strong> as a living manifestation of <strong>Mystra</strong>, the Goddess of Magic and Mother of the Weave.</p><p>Clad in deep sapphire-blue scales dusted with luminous violet stardust like a living nebula, Aitusa's soul is inextricably bound to Altarion through their Draconic Bond. Together, rider and dragon channel the raw starlight of the Weave—wielding pure arcane Force and ancient draconic magic as one.</p><hr><div class="rd__b  rd__b--3"><span class="rd__h rd__h--3" data-title-index="1"> <span class="entry-title-inner">Arcane Dragon Traits</span></span><p><strong>Creature Type:</strong> Dragon</p><p><strong>Ancestry:</strong> Arcane / Force (Manifestation of Mystra)</p><p><strong>Damage Immunity:</strong> Force</p><p><strong>Bond:</strong> Bound to Altarion via the Dragon Rider's Draconic Bond</p></div></div>`
        },
        source: {
          book: "DR-Aitusa",
          page: "1",
          custom: "Manifestation of Mystra",
          rules: "2014"
        },
        type: {
          value: "dragon",
          subtype: "",
          swarm: "",
          custom: ""
        },
        advancement: []
      },
      flags: {
        plutonium: {
          page: "races.html",
          source: "DR-Aitusa",
          hash: "dragon_race_dr-aitusa"
        },
        "altarion-aitusa": {
          isCompanionItem: true,
          isAitusaRace: true,
          featureKey: "aitusa:race:dragon",
          syncSchemaVersion: 6
        }
      }
    };
  }

  /**
   * Convert Altarion's Dragon Rider Class, Ancestral Magic Subclass, Fighting Style: Defense,
   * Ancestral Weapon, and all class/subclass features directly from the consolidated DR-Altarion JSON via Plutonium.
   */
  static async pGetAltarionBundle({ actor = null, riderLevel = 4, dragonLevel = 4 } = {}) {
    const ok = await this.ensureBrewsRegistered(dragonLevel);
    if (!ok) return null;

    const sizeLabel = this.getSizeLabel(dragonLevel);
    const { DataConverterClass, DataConverterOptionalfeature } = this._converters;

    // 1. Dragon Rider Class (DR-Altarion)
    const drHash = globalThis.UrlUtil.URL_TO_HASH_BUILDER["class"]({
      name: "Dragon Rider",
      source: "DR-Altarion"
    });
    const clsDrRaw = await globalThis.DataLoader.pCacheAndGet("class", "DR-Altarion", drHash, {
      isCopy: true,
      isRequired: true
    });
    const dragonRiderClassData = await DataConverterClass.pGetDocumentJsonClass(clsDrRaw, {
      actor,
      isActorItem: true,
      isClsDereferenced: true,
      level: riderLevel
    });
    delete dragonRiderClassData._id;
    const drClassIcon = await this.pResolveDrIcon("Dragon Rider");
    if (drClassIcon) dragonRiderClassData.img = drClassIcon;
    dragonRiderClassData.system.spellcasting = {
      progression: "third",
      ability: "int"
    };
    dragonRiderClassData.flags = foundry.utils.mergeObject(dragonRiderClassData.flags || {}, {
      "altarion-aitusa": {
        isPrimaryClass: true,
        dragonSizeLabel: sizeLabel
      }
    });

    // 2. Ancestral Magic Subclass (DR-Altarion)
    const scHash = globalThis.UrlUtil.URL_TO_HASH_BUILDER["subclass"]({
      name: "Ancestral Magic",
      shortName: "Ancestral Magic",
      source: "DR-Altarion",
      className: "Dragon Rider",
      classSource: "DR-Altarion"
    });
    const scDrRaw = await globalThis.DataLoader.pCacheAndGet("subclass", "DR-Altarion", scHash, {
      isCopy: true,
      isRequired: true
    });
    const ancestralSubclassData = await DataConverterClass.pGetDocumentJsonSubclass(clsDrRaw, scDrRaw, {
      actor,
      isActorItem: true,
      isScDereferenced: true
    });
    delete ancestralSubclassData._id;
    const scIcon = await this.pResolveDrIcon("Ancestral Magic");
    if (scIcon) ancestralSubclassData.img = scIcon;
    this._ensureSubclassFluffDescription(ancestralSubclassData, scDrRaw);
    ancestralSubclassData.flags = foundry.utils.mergeObject(ancestralSubclassData.flags || {}, {
      "altarion-aitusa": {
        isPrimaryClassItem: true,
        dragonSizeLabel: sizeLabel
      }
    });

    // 3. Convert Class & Subclass Features up to riderLevel directly from the consolidated brew
    const features = [];
    const scaledFeatureNames = new Set([
      "Ancestral Attacks",
      "Ancestral Ward",
      "Ancestral Ray",
      "Ancestral Shielding",
      "Ancestral Elevation",
      "Elevated Ancestral Attacks",
      "Bursting Strike",
      "Ancestral Surge",
      "Ancestral Marking",
      "Dragon's Breath"
    ]);
    const ancestralAttackNames = new Set([
      "Ancestral Ward",
      "Ancestral Ray",
      "Ancestral Shielding",
      "Bursting Strike",
      "Ancestral Surge",
      "Ancestral Marking"
    ]);

    for (const cf of this._consolidatedAltarion?.classFeature || []) {
      const lvl = Number(cf.level || 1);
      if (lvl > riderLevel) continue;
      if (cf.name === "Draconic Bond feature") continue;

      let featData = null;

      // For Fighting Style, import via PHB Fighter 1 Fighting Style through Plutonium so it gets
      // the exact Plutonium icon, clean single-paragraph description, and no spurious uses.
      if (cf.name === "Fighting Style") {
        const fsStub = {
          name: "Fighting Style",
          source: "PHB",
          className: "Fighter",
          classSource: "PHB",
          level: 1,
          __prop: "classFeature"
        };
        featData = await this.pConvertFeature(fsStub, { actor, isActorItem: true });
        if (featData) {
          featData.system.requirements = `Dragon Rider ${lvl}`;
          featData.system.description.value = `<div class="rd__b  rd__b--2"><p>You adopt a particular style of fighting as your specialty. Choose one of the following options. You can't take the same Fighting Style option more than once, even if you get to choose again.</p></div>`;
          featData.system.uses = { spent: 0, max: "", recovery: [] };
          featData.system.activities = {};
        }
      } else {
        const stub = {
          name: cf.name,
          source: cf.source || "DR-Altarion",
          className: cf.className || "Dragon Rider",
          classSource: cf.classSource || "DR-Altarion",
          level: lvl,
          __prop: "classFeature"
        };
        featData = await this.pConvertFeature(stub, { actor, isActorItem: true });
      }

      if (featData) {
        const customIcon = await this.pResolveDrIcon(cf.name);
        if (customIcon) featData.img = customIcon;
        this.applyCustomFeatureMechanics(featData, { isAltarion: true, sizeLabel });
        featData.system.type = foundry.utils.mergeObject(featData.system.type || {}, { value: "class" });
        featData.flags = foundry.utils.mergeObject(featData.flags || {}, {
          "altarion-aitusa": {
            isPrimaryClassItem: true,
            originCategory: "class",
            levelRequired: lvl,
            featureKey: `dragon-rider:class:${cf.name.toLowerCase()}:${lvl}`,
            isScaledByDragonSize: scaledFeatureNames.has(cf.name),
            dragonSizeLabel: sizeLabel,
            syncSchemaVersion: 6
          }
        });
        features.push(featData);
      }

      // Also convert Fighting Style: Defense (PHB optionalfeature) when Fighting Style is reached
      if (cf.name === "Fighting Style") {
        const defHash = globalThis.UrlUtil.URL_TO_HASH_BUILDER["optionalfeature"]({
          name: "Defense",
          source: "PHB"
        });
        const rawDefense = await globalThis.DataLoader.pCacheAndGet("optionalfeature", "PHB", defHash, {
          isCopy: true
        });
        if (rawDefense) {
          const defData = await DataConverterOptionalfeature.pGetDocumentJson(rawDefense, {
            actor,
            isActorItem: true
          });
          if (defData) {
            delete defData._id;
            defData.name = "Fighting Style: Defense";
            defData.system.type = foundry.utils.mergeObject(defData.system.type || {}, {
              value: "class",
              subtype: "fightingStyle"
            });
            defData.system.requirements = `Dragon Rider ${lvl}`;
            // Clean transfer ActiveEffect with valid 16-char alphanumeric _id & null origin
            // so dnd5e AC tooltip shows "+1 Fighting Style: Defense (+1 AC)" instead of "+1 Unknown"!
            defData.effects = [
              {
                _id: "fightStyleDef001",
                name: "Fighting Style: Defense (+1 AC)",
                img: defData.img || "icons/equipment/shield/heater-steel-worn.webp",
                origin: null,
                transfer: true,
                disabled: false,
                changes: [
                  {
                    key: "system.attributes.ac.bonus",
                    mode: 2, // CONST.ACTIVE_EFFECT_MODES.ADD
                    value: "+1",
                    priority: 20
                  }
                ]
              }
            ];
            defData.flags = foundry.utils.mergeObject(defData.flags || {}, {
              "altarion-aitusa": {
                isPrimaryClassItem: true,
                originCategory: "class",
                levelRequired: lvl,
                featureKey: "dragon-rider:optionalfeature:fighting-style-defense:2",
                syncSchemaVersion: 8
              }
            });
            features.push(defData);
          }
        }
      }
    }

    for (const sf of this._consolidatedAltarion?.subclassFeature || []) {
      const lvl = Number(sf.level || 3);
      if (lvl > riderLevel) continue;
      // Skip the top-level subclass header entry ("Ancestral Magic") since the Ancestral Magic subclass item itself holds that overview
      if (sf.name === "Ancestral Magic") continue;

      const stub = {
        name: sf.name,
        source: sf.source || "DR-Altarion",
        className: sf.className || "Dragon Rider",
        classSource: sf.classSource || "DR-Altarion",
        subclassShortName: sf.subclassShortName || "Ancestral Magic",
        subclassSource: sf.subclassSource || "DR-Altarion",
        level: lvl,
        __prop: "subclassFeature"
      };
      const featData = await this.pConvertFeature(stub, { actor, isActorItem: true });
      if (featData) {
        const customIcon = await this.pResolveDrIcon(sf.name);
        if (customIcon) featData.img = customIcon;
        this.applyCustomFeatureMechanics(featData, { isAltarion: true, sizeLabel });
        featData.system.type = foundry.utils.mergeObject(featData.system.type || {}, { value: "class" });
        featData.flags = foundry.utils.mergeObject(featData.flags || {}, {
          "altarion-aitusa": {
            isPrimaryClassItem: true,
            originCategory: "subclass",
            isAncestralAttack: ancestralAttackNames.has(sf.name),
            levelRequired: lvl,
            featureKey: `dragon-rider:subclass:${sf.name.toLowerCase()}:${lvl}`,
            isScaledByDragonSize: scaledFeatureNames.has(sf.name),
            dragonSizeLabel: sizeLabel,
            syncSchemaVersion: 8
          }
        });
        features.push(featData);
      }
    }

    const ancestralWeaponData = riderLevel >= 3 ? await this.pBuildAncestralWeapon() : null;
    const { raceData, racialFeatures } = await this.pBuildAltarionRaceAndEchoes();
    const echoingWardSpellData = await this.pBuildEchoingWardSpell();
    const arcaneArmorSpellData = await this.pBuildArcaneArmorSpell();
    const arcaneBoltSpellData = await this.pBuildArcaneBoltSpell({ forAitusa: false });
    const arcaneBladeSpellData = await this.pBuildArcaneBladeSpell();
    const abjurationBulwarkSpellData = await this.pBuildAbjurationBulwarkSpell();

    return {
      dragonRiderClassData,
      ancestralSubclassData,
      features,
      ancestralWeaponData,
      raceData,
      racialFeatures,
      echoingWardSpellData,
      arcaneArmorSpellData,
      arcaneBoltSpellData,
      arcaneBladeSpellData,
      abjurationBulwarkSpellData
    };
  }

  /**
   * Convert Aitusa's Dragon Class, Ancestral Magic Subclass, and all companion features/attacks
   * directly from the consolidated DR-Aitusa JSON via Plutonium.
   */
  static async pGetAitusaBundle({ actor = null, dragonLevel = 4 } = {}) {
    const ok = await this.ensureBrewsRegistered(dragonLevel);
    if (!ok) return null;

    const sizeLabel = this.getSizeLabel(dragonLevel);
    const { DataConverterClass } = this._converters;

    // 1. Dragon Class (DR-Aitusa)
    const drgHash = globalThis.UrlUtil.URL_TO_HASH_BUILDER["class"]({
      name: "Dragon",
      source: "DR-Aitusa"
    });
    const clsDragonRaw = await globalThis.DataLoader.pCacheAndGet("class", "DR-Aitusa", drgHash, {
      isCopy: true,
      isRequired: true
    });
    const dragonClassData = await DataConverterClass.pGetDocumentJsonClass(clsDragonRaw, {
      actor,
      isActorItem: true,
      isClsDereferenced: true,
      level: dragonLevel
    });
    delete dragonClassData._id;
    const drgClassIcon = await this.pResolveDrIcon("Dragon");
    if (drgClassIcon) dragonClassData.img = drgClassIcon;
    dragonClassData.flags = foundry.utils.mergeObject(dragonClassData.flags || {}, {
      "altarion-aitusa": {
        isCompanionClass: true,
        dragonSizeLabel: sizeLabel
      }
    });

    // 2. Ancestral Magic Subclass (DR-Aitusa)
    const scHash = globalThis.UrlUtil.URL_TO_HASH_BUILDER["subclass"]({
      name: "Ancestral Magic",
      shortName: "Ancestral Magic",
      source: "DR-Aitusa",
      className: "Dragon",
      classSource: "DR-Aitusa"
    });
    const scDragonRaw = await globalThis.DataLoader.pCacheAndGet("subclass", "DR-Aitusa", scHash, {
      isCopy: true,
      isRequired: true
    });
    const ancestralSubclassData = await DataConverterClass.pGetDocumentJsonSubclass(
      clsDragonRaw,
      scDragonRaw,
      {
        actor,
        isActorItem: true,
        isScDereferenced: true
      }
    );
    delete ancestralSubclassData._id;
    const scIcon = await this.pResolveDrIcon("Ancestral Magic");
    if (scIcon) ancestralSubclassData.img = scIcon;
    this._ensureSubclassFluffDescription(ancestralSubclassData, scDragonRaw);
    ancestralSubclassData.flags = foundry.utils.mergeObject(ancestralSubclassData.flags || {}, {
      "altarion-aitusa": {
        isCompanionItem: true,
        dragonSizeLabel: sizeLabel
      }
    });

    // 3. Convert Dragon Class & Subclass Features up to dragonLevel directly from the consolidated brew
    const features = [];
    const scaledFeatureNames = new Set([
      "Small Dragon",
      "Medium Dragon",
      "Claw Attack",
      "Bite Attack",
      "Tail Attack",
      "Wing Attack",
      "Breath Weapon",
      "Draconic Body",
      "Titanic Roar"
    ]);

    for (const cf of this._consolidatedAitusa?.classFeature || []) {
      const lvl = Number(cf.level || 1);
      if (lvl > dragonLevel) continue;
      if (cf.name === "Draconic Bond feature") continue;

      const stub = {
        name: cf.name,
        source: cf.source || "DR-Aitusa",
        className: cf.className || "Dragon",
        classSource: cf.classSource || "DR-Aitusa",
        level: lvl,
        __prop: "classFeature"
      };
      const featData = await this.pConvertFeature(stub, { actor, isActorItem: true });
      if (featData) {
        const customIcon = await this.pResolveDrIcon(cf.name);
        if (customIcon) featData.img = customIcon;
        this.applyCustomFeatureMechanics(featData, { isAltarion: false, sizeLabel });
        featData.system.type = foundry.utils.mergeObject(featData.system.type || {}, { value: "class" });
        featData.flags = foundry.utils.mergeObject(featData.flags || {}, {
          "altarion-aitusa": {
            isCompanionItem: true,
            originCategory: "class",
            levelRequired: lvl,
            featureKey: `dragon:class:${cf.name.toLowerCase()}:${lvl}`,
            isScaledByDragonSize: scaledFeatureNames.has(cf.name),
            dragonSizeLabel: sizeLabel,
            syncSchemaVersion: 6
          }
        });
        features.push(featData);
      }
    }

    for (const sf of this._consolidatedAitusa?.subclassFeature || []) {
      const lvl = Number(sf.level || 3);
      if (lvl > dragonLevel) continue;
      if (sf.name === "Ancestral Magic") continue;

      const stub = {
        name: sf.name,
        source: sf.source || "DR-Aitusa",
        className: sf.className || "Dragon",
        classSource: sf.classSource || "DR-Aitusa",
        subclassShortName: sf.subclassShortName || "Ancestral Magic",
        subclassSource: sf.subclassSource || "DR-Aitusa",
        level: lvl,
        __prop: "subclassFeature"
      };
      const featData = await this.pConvertFeature(stub, { actor, isActorItem: true });
      if (featData) {
        const customIcon = await this.pResolveDrIcon(sf.name);
        if (customIcon) featData.img = customIcon;
        this.applyCustomFeatureMechanics(featData, { isAltarion: false, sizeLabel });
        featData.system.type = foundry.utils.mergeObject(featData.system.type || {}, { value: "class" });
        featData.flags = foundry.utils.mergeObject(featData.flags || {}, {
          "altarion-aitusa": {
            isCompanionItem: true,
            originCategory: "subclass",
            levelRequired: lvl,
            featureKey: `dragon:subclass:${sf.name.toLowerCase()}:${lvl}`,
            isScaledByDragonSize: scaledFeatureNames.has(sf.name),
            dragonSizeLabel: sizeLabel,
            syncSchemaVersion: 6
          }
        });
        features.push(featData);
      }
    }

    const raceData = await this.pBuildAitusaRace();

    return {
      dragonClassData,
      ancestralSubclassData,
      features,
      raceData
    };
  }
}

/**
 * Minimal fallback definitions used ONLY if Plutonium is not installed/active in the world.
 */
export const DRAGON_RIDER_CLASS = {
  name: "Dragon Rider",
  type: "class",
  img: "icons/creatures/reptiles/dragon-horned-blue.webp",
  system: {
    identifier: "dragon-rider",
    description: { value: "" },
    hitDice: "d10",
    hd: { denomination: "d10", spent: 0 },
    levels: 4,
    spellcasting: { progression: "third", ability: "int" },
    saves: ["int", "con"]
  },
  flags: { "altarion-aitusa": { isPrimaryClass: true } }
};

export const WIZARD_CLASS = {
  name: "Wizard",
  type: "class",
  img: "systems/dnd5e/icons/classes/wizard.webp",
  system: {
    identifier: "wizard",
    description: { value: "" },
    source: { book: "PHB", page: "112", rules: "2014", revision: 1 },
    hitDice: "d6",
    hd: { denomination: "d6", spent: 0 },
    levels: 1,
    spellcasting: { progression: "full", ability: "int" },
    saves: ["int", "wis"]
  },
  flags: { "altarion-aitusa": { isSecondaryClass: true } }
};

export const DRAGON_CLASS = {
  name: "Dragon",
  type: "class",
  img: "icons/creatures/reptiles/dragon-winged-blue.webp",
  system: {
    identifier: "dragon",
    description: { value: "" },
    hitDice: "d10",
    hd: { denomination: "d10", spent: 0 },
    levels: 4,
    saves: ["int", "con"]
  },
  flags: { "altarion-aitusa": { isCompanionClass: true } }
};

export const ABJURATION_SUBCLASS = {
  name: "School of Abjuration",
  type: "subclass",
  img: "systems/dnd5e/icons/classes/wizard.webp",
  system: {
    identifier: "abjuration",
    classIdentifier: "wizard",
    description: { value: "" },
    source: { book: "PHB", page: "115", rules: "2014", revision: 1 }
  }
};

export const ABJURATION_SUBCLASS_FEATURES = [];
export const DRAGON_RIDER_FEATURES = {};
export const DRAGON_COMPANION_FEATURES = { base: [], attacks: [], unlockables: {} };

globalThis.PlutoniumDataBridge = PlutoniumDataBridge;
