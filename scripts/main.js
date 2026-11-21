/**
 * FoundryVTT Module: Altarion & Aitusa - Dragon Rider & Companion
 */

import { SecondaryClassManager } from "./secondary-class.js";
import { FeatureSyncManager } from "./auto-sync-features.js";
import { DragonScalingManager } from "./dragon-scaling.js";
import { AltarionAutomationManager } from "./automations.js";
import { ArcanePlagueManager } from "./arcane-plague.js";
import { CoriaAuraEngine } from "./aura-engine.js";
import { CoriaRollLedger } from "./roll-ledger.js";
import { CoriaSpellImporter } from "./spell-importer.js";
import { PartyJsonSyncManager } from "./party-json-sync.js";
import { CoriaAttunementSlots } from "./attunement-slots.js";

/**
 * Prevent dnd5e 5.3's `SensesField._shim` from defining `darkvision`, `blindsight`, `tremorsense`,
 * and `truesight` as `enumerable: true` on `actor.system.attributes.senses`.
 * When `enumerable: true`, `foundry.utils.deepClone` inside `RollConfigurationDialog` enumerates
 * all 4 deprecated getters on every roll and generates 4 expensive stack-trace warnings.
 */
function patchDnd5eSensesShimAndTokenHpBar() {
  // 1. Prevent Foundry V13's deprecated `renderTemplate` compatibility warning from constructing
  //    expensive Error stack traces on every Tidy5e Handlebars tab render.
  try {
    if (
      foundry?.utils &&
      typeof foundry.utils.logCompatibilityWarning === "function" &&
      !foundry.utils.logCompatibilityWarning._coriaPatched
    ) {
      const origLogCompat = foundry.utils.logCompatibilityWarning.bind(foundry.utils);
      const patchedLogCompat = function (message, options) {
        const msgStr = String(message || "");
        if (
          msgStr.includes("foundry.applications.handlebars.renderTemplate") ||
          msgStr.includes('"renderTemplate"')
        ) {
          return;
        }
        return origLogCompat(message, options);
      };
      patchedLogCompat._coriaPatched = true;
      foundry.utils.logCompatibilityWarning = patchedLogCompat;
    }
  } catch (_e) {
    // ignore
  }

  // 2. Option B (Tidy5e Svelte 5 Table & Handlebars Render Performance): suppress repetitive
  //    `svelte.dev/e/derived_inert` and `renderTemplate` console.warn messages (including Error instances).
  try {
    if (typeof console?.warn === "function" && !console.warn._coriaDerivedInertFiltered) {
      const origWarn = console.warn.bind(console);
      const filteredWarn = function (...args) {
        const first = args[0];
        const msgStr = typeof first === "string" ? first : String(first?.message || first || "");
        if (
          msgStr.includes("svelte.dev/e/derived_inert") ||
          msgStr.includes("foundry.applications.handlebars.renderTemplate") ||
          msgStr.includes('accessing the global "renderTemplate"')
        ) {
          return;
        }
        return origWarn(...args);
      };
      filteredWarn._coriaDerivedInertFiltered = true;
      console.warn = filteredWarn;
    }
  } catch (_e) {
    // ignore
  }

  try {
    const SensesField = globalThis.dnd5e?.dataModels?.shared?.SensesField;
    if (SensesField && typeof SensesField._shim === "function" && !SensesField._coriaNonEnumerablePatched) {
      SensesField._coriaNonEnumerablePatched = true;
      SensesField._shim = function (senses) {
        if (!senses || typeof senses !== "object") return;
        for (const key of ["darkvision", "blindsight", "tremorsense", "truesight"]) {
          Object.defineProperty(senses, key, {
            get() {
              return this.ranges?.[key];
            },
            set(value) {
              if (this.ranges) this.ranges[key] = value;
            },
            enumerable: false,
            configurable: true
          });
        }
      };
    }
  } catch (_e) {
    // ignore
  }

  // Ensure Token5e._drawHPBar always renders the Temporary Max HP (tempmax / Aid) segment visibly
  // on ALL tokens (even when current HP equals effectiveMax, where vanilla dnd5e paints green over tempmax)
  try {
    const tokenProto = CONFIG.Token?.objectClass?.prototype;
    if (tokenProto && typeof tokenProto._drawHPBar === "function" && !tokenProto._coriaTempMaxBarPatched) {
      tokenProto._coriaTempMaxBarPatched = true;
      const origDrawHPBar = tokenProto._drawHPBar;
      tokenProto._drawHPBar = function (number, bar, data) {
        const res = origDrawHPBar.call(this, number, bar, data);
        try {
          const hp = this.document?.actor?.system?.attributes?.hp;
          if (!hp || !bar) return res;
          const value = Number(hp.value || 0);
          const max = Number(hp.max || 0);
          const temp = Number(hp.temp || 0);
          const tempmax = Number(hp.tempmax || 0);
          const effectiveMax = Math.max(0, Number(hp.effectiveMax ?? (max + tempmax)));
          if (tempmax > 0 && effectiveMax > 0 && max > 0) {
            const displayMax = max + tempmax;
            const pctBase = Math.clamp(max / displayMax, 0, 1);
            const pctCur = Math.clamp(value / displayMax, 0, 1);
            const s = canvas?.dimensions?.uiScale || 1;
            const bw = this.w;
            const bh = 8 * (this.document.height >= 2 ? 1.5 : 1) * s;
            const bs = s;
            const bs1 = bs + s;
            const blk = 0x000000;
            const c = CONFIG.DND5E?.tokenHPColors || {};

            // Draw the unfilled tempmax background from pctBase to 1.0
            bar
              .beginFill(c.tempmax ?? 0x440066, 0.85)
              .lineStyle(1, blk, 1.0)
              .drawRoundedRect(pctBase * bw, 0, (1 - pctBase) * bw, bh, 2 * s);

            // If current HP extends into the bonus tempmax region (value > max), draw the filled bonus HP in vibrant violet
            if (pctCur > pctBase) {
              bar
                .beginFill(0x9333ea, 1.0)
                .lineStyle(1, blk, 1.0)
                .drawRoundedRect(pctBase * bw, 0, (pctCur - pctBase) * bw, bh, 2 * s);
            }

            // Re-draw Temporary HP inner bar on top if temp > 0
            if (temp > 0) {
              const tempPct = Math.clamp(temp, 0, displayMax) / displayMax;
              bar
                .beginFill(c.temp ?? 0x66ccff, 1.0)
                .lineStyle(0)
                .drawRoundedRect(bs1, bs1, tempPct * bw - 2 * bs1, bh - 2 * bs1, s);
            }
          }
        } catch (_barErr) {
          // ignore
        }
        return res;
      };
    }
  } catch (_e) {
    // ignore
  }

  // Guard dnd5e 5.3 ChatMessage5e._onTargetHoverIn & _onTargetMouseDown against TokenDocument / non-Actor UUIDs
  // (prevents `Uncaught TypeError: actor?.getActiveTokens is not a function` when hovering chat targets/buttons)
  try {
    const chatProto = CONFIG.ChatMessage?.documentClass?.prototype;
    if (chatProto && !chatProto._coriaTargetHoverPatched) {
      chatProto._coriaTargetHoverPatched = true;
      const resolveTokenAndActorFromUuid = (uuid) => {
        if (!uuid || typeof fromUuidSync !== "function") return { doc: null, actor: null, token: null };
        let doc = null;
        try {
          doc = fromUuidSync(uuid);
        } catch (_e) {
          doc = null;
        }
        if (!doc) return { doc: null, actor: null, token: null };
        if (doc.documentName === "Token") {
          return { doc, actor: doc.actor || null, token: doc.object || null };
        }
        const token =
          doc?.token?.object ??
          (typeof doc?.getActiveTokens === "function" ? doc.getActiveTokens()[0] : null) ??
          null;
        return { doc, actor: doc?.documentName === "Actor" ? doc : doc?.actor || null, token };
      };

      if (typeof chatProto._onTargetHoverIn === "function") {
        chatProto._onTargetHoverIn = function (event) {
          const uuid = event?.currentTarget?.dataset?.uuid;
          const { token } = resolveTokenAndActorFromUuid(uuid);
          if (token && token.isVisible) {
            if (!token.controlled) token._onHoverIn(event, { hoverOutOthers: true });
            this._highlighted = token;
          }
        };
      }

      if (typeof chatProto._onTargetMouseDown === "function") {
        chatProto._onTargetMouseDown = async function (event) {
          event.stopPropagation();
          const uuid = event?.currentTarget?.dataset?.uuid;
          const { actor, token } = resolveTokenAndActorFromUuid(uuid);
          if (!token || !actor?.testUserPermission?.(game.user, "OBSERVER")) return;
          const releaseOthers = !event.shiftKey;
          if (token.controlled) token.release();
          else {
            token.control({ releaseOthers });
            return canvas.animatePan(token.center);
          }
        };
      }
    }
  } catch (_e) {
    // ignore
  }
}

/**
 * Helper: Match Altarion whether named "Altarion", "Altarion Talendris", or configured via module setting.
 */
function matchesAltarionName(name) {
  const norm = String(name || "").trim().toLowerCase();
  if (!norm) return false;
  let settingName = "altarion";
  try {
    if (game?.settings?.settings?.has("altarion-aitusa.altarionName")) {
      settingName = (game.settings.get("altarion-aitusa", "altarionName") || "Altarion").trim().toLowerCase();
    }
  } catch (_) {
    settingName = "altarion";
  }
  return (
    norm === settingName ||
    norm === "altarion" ||
    norm === "altarion talendris" ||
    norm.startsWith("altarion ")
  );
}

function matchesAitusaName(name) {
  const norm = String(name || "").trim().toLowerCase();
  if (!norm) return false;
  let settingName = "aitusa";
  try {
    if (game?.settings?.settings?.has("altarion-aitusa.aitusaName")) {
      settingName = (game.settings.get("altarion-aitusa", "aitusaName") || "Aitusa").trim().toLowerCase();
    }
  } catch (_) {
    settingName = "aitusa";
  }
  return norm === settingName || norm === "aitusa" || norm.startsWith("aitusa ");
}

Hooks.once("init", () => {
  console.log("Altarion & Aitusa | Initializing Dragon Rider & Companion module...");

  patchDnd5eSensesShimAndTokenHpBar();

  // Register Module Settings
  game.settings.register("altarion-aitusa", "altarionName", {
    name: "Altarion Actor Name",
    hint: "Exact name of the Dragon Rider player character actor in FoundryVTT.",
    scope: "world",
    config: true,
    type: String,
    default: "Altarion"
  });

  game.settings.register("altarion-aitusa", "aitusaName", {
    name: "Aitusa Actor Name",
    hint: "Exact name of the companion Dragon actor in FoundryVTT.",
    scope: "world",
    config: true,
    type: String,
    default: "Aitusa"
  });

  game.settings.register("altarion-aitusa", "autoSync", {
    name: "Auto-Sync on Load",
    hint: "Automatically sync class features and scaling when the world loads.",
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });

  // Initialize Secondary Class mechanics, Aura Engine, Roll Ledger, Advanced Automations, Arcane Plague, Party JSON Sync & Attunement Slots
  SecondaryClassManager.init();
  CoriaAuraEngine.init();
  CoriaRollLedger.init();
  AltarionAutomationManager.init();
  ArcanePlagueManager.init();
  PartyJsonSyncManager.init();
  CoriaAttunementSlots.init();
});

Hooks.once("ready", async () => {
  console.log("Altarion & Aitusa | Module ready. Checking character synchronization...");

  patchDnd5eSensesShimAndTokenHpBar();

  // Ensure SecondaryClassManager is initialized and recalculate actor data safely
  SecondaryClassManager.init();

  // Seed 2014 School of Abjuration subclass and features into Compendium pack
  await FeatureSyncManager.ensureCompendiumContent();

  const altarion = game.actors.find(a => matchesAltarionName(a.name));
  const aitusa = game.actors.find(a => matchesAitusaName(a.name));

  if (altarion) {
    SecondaryClassManager.refreshActor(altarion);
    if (altarion.sheet?.rendered) altarion.sheet.render(false);
  }
  if (aitusa) {
    SecondaryClassManager.refreshActor(aitusa);
    if (aitusa.sheet?.rendered) aitusa.sheet.render(false);
  }

  if (game.settings.get("altarion-aitusa", "autoSync")) {
    if (altarion?.isOwner) await FeatureSyncManager.syncAltarion(altarion);
    if (aitusa?.isOwner) await FeatureSyncManager.syncAitusa(aitusa);
  }

  // Expose module API helpers
  const mod = game.modules?.get("altarion-aitusa");
  if (mod) {
    mod.api = {
      ...(mod.api || {}),
      syncPartyFromJson: (opts = {}) => PartyJsonSyncManager.syncAllPartyActors(opts),
      syncActorFromJson: (actor, opts = {}) => PartyJsonSyncManager.syncActorFromJson(actor, opts),
      openAttunementSlots: (actor) => CoriaAttunementSlots.openAttunementSlotsDialog(actor)
    };
  }

  // Run curated 5-character JSON Sync (one-time per version) after OtherPlayersBase finishes its initial sync
  setTimeout(async () => {
    try {
      await PartyJsonSyncManager.syncAllPartyActors({ force: false, silent: false });
    } catch (err) {
      console.warn("[Altarion & Aitusa] Delayed Party JSON Sync warning:", err);
    }
  }, 1800);
});

/**
 * Helper: Check if an actor currently has the Ancestral Ward status/ActiveEffect active
 */
function hasAncestralWardActive(actor) {
  if (!actor) return false;
  if (actor.statuses?.has("ancestral-ward")) return true;
  return actor.effects?.some(
    e =>
      !e.disabled &&
      (e.flags?.["altarion-aitusa"]?.isAncestralWardEffect ||
        e.statuses?.has?.("ancestral-ward") ||
        e.name?.toLowerCase() === "ancestral ward")
  );
}

/**
 * Helper: Apply or refresh the "Ancestral Ward" status ActiveEffect on Altarion (10 minutes duration)
 */
async function applyAncestralWardStatus(actor, sourceItem = null) {
  if (!actor || !actor.isOwner) return;

  const existingEffect = actor.effects.find(
    e =>
      e.flags?.["altarion-aitusa"]?.isAncestralWardEffect ||
      e.statuses?.has?.("ancestral-ward") ||
      e.name?.toLowerCase() === "ancestral ward"
  );

  const effectData = {
    name: "Ancestral Ward",
    img: sourceItem?.img || "modules/altarion-aitusa/dr_icons/ancestral-ward.jpg",
    origin: sourceItem?.uuid || actor.uuid,
    disabled: false,
    statuses: ["ancestral-ward"],
    duration: {
      seconds: 600,
      rounds: 100
    },
    description:
      "<p>While you have temporary hit points from <strong>Ancestral Ward</strong>, hitting a creature with your <strong>Ancestral Weapon</strong> forces them to make a Wisdom saving throw against your spell save DC or have disadvantage on all attack rolls made against any creature other than you or your dragon until the end of your next turn. Ends early if you drop to 0 temporary hit points.</p>",
    flags: {
      "altarion-aitusa": {
        isAncestralWardEffect: true
      }
    }
  };

  if (existingEffect) {
    await existingEffect.update(effectData);
  } else {
    await actor.createEmbeddedDocuments("ActiveEffect", [effectData]);
  }
}

/**
 * Helper: Place two circular MeasuredTemplates on the active canvas scene for "Ancestral Marking"
 * — one centered on Altarion's token and one centered on Aitusa's token (scaled by Dragon size) —
 * and automatically target creatures inside either template.
 */
async function placeAncestralMarkingDualTemplates(actor) {
  if (!canvas?.ready || !canvas?.scene) return;

  const aitusaActor = game.actors.find(a => matchesAitusaName(a.name));
  const dragonLevel = aitusaActor?.items.find(i => i.type === "class")?.system?.levels || 4;
  const sizeData = DragonScalingManager.getSizeData(dragonLevel);
  const markingRangeFt = Number(sizeData.markingRange || 15);

  const placeables = canvas.tokens?.placeables || [];
  const altarionToken = placeables.find(
    t => t.actor?.id === actor?.id || matchesAltarionName(t.name) || matchesAltarionName(t.actor?.name)
  );
  const aitusaToken = placeables.find(
    t =>
      (aitusaActor && t.actor?.id === aitusaActor.id) ||
      matchesAitusaName(t.name) ||
      matchesAitusaName(t.actor?.name)
  );

  const sourceTokens = [altarionToken, aitusaToken].filter(Boolean);
  if (sourceTokens.length === 0) return;

  const gridDist = Number(canvas.scene.grid?.distance || 5);
  const gridSizePx = Number(canvas.scene.grid?.size || 100);
  const pxPerFoot = gridSizePx / gridDist;

  // Remove previous Ancestral Marking templates created by this user if any exist
  const oldTemplates = canvas.scene.templates
    .filter(t => t.flags?.["altarion-aitusa"]?.isAncestralMarkingTemplate && t.author?.id === game.user?.id)
    .map(t => t.id);
  if (oldTemplates.length > 0) {
    try {
      await canvas.scene.deleteEmbeddedDocuments("MeasuredTemplate", oldTemplates);
    } catch (_e) {
      // ignore
    }
  }

  const templatesToCreate = [];
  const circleAreas = [];

  for (const tok of sourceTokens) {
    const tokenWidthSquares = Number(tok.document?.width || 1);
    const tokenRadiusFt = (tokenWidthSquares * gridDist) / 2;
    const totalRadiusFt = markingRangeFt + tokenRadiusFt;

    templatesToCreate.push({
      t: "circle",
      user: game.user?.id,
      x: tok.center.x,
      y: tok.center.y,
      distance: totalRadiusFt,
      direction: 0,
      fillColor: game.user?.color?.css || game.user?.color || "#3b82f6",
      flags: {
        "altarion-aitusa": {
          isAncestralMarkingTemplate: true,
          sourceTokenId: tok.id
        }
      }
    });

    circleAreas.push({
      cx: tok.center.x,
      cy: tok.center.y,
      radiusPx: totalRadiusFt * pxPerFoot
    });
  }

  if (templatesToCreate.length > 0) {
    try {
      await canvas.scene.createEmbeddedDocuments("MeasuredTemplate", templatesToCreate);
    } catch (err) {
      console.warn("[Altarion & Aitusa] Could not create Ancestral Marking templates:", err);
    }
  }

  // Automatically target other tokens within either circle
  const excludedIds = new Set(sourceTokens.map(t => t.id));
  const targetIds = [];
  for (const tok of placeables) {
    if (excludedIds.has(tok.id) || tok.document?.hidden) continue;
    const insideAny = circleAreas.some(area => {
      const dx = tok.center.x - area.cx;
      const dy = tok.center.y - area.cy;
      const tokHalfPx = ((Number(tok.document?.width || 1) * gridSizePx) / 2) * 0.5;
      return Math.hypot(dx, dy) <= area.radiusPx + tokHalfPx;
    });
    if (insideAny) {
      targetIds.push(tok.id);
    }
  }

  if (targetIds.length > 0 && game.user?.updateTokenTargets) {
    game.user.updateTokenTargets(targetIds);
  }
}

/**
 * Hook into dnd5e activity usage for Ancestral Ward
 */
Hooks.on("dnd5e.postUseActivity", async (activity) => {
  const item = activity?.item;
  const actor = item?.actor;
  if (!item || !actor) return;

  const itemName = item.name?.trim().toLowerCase();
  if (itemName === "ancestral ward") {
    await applyAncestralWardStatus(actor, item);
  }
});

/**
 * Automatically detect when Altarion or Aitusa actor is created or renamed
 */
Hooks.on("createActor", async (actor) => {
  if (!actor || !actor.isOwner || FeatureSyncManager.isSyncing(actor.id)) return;
  if (!game.settings.get("altarion-aitusa", "autoSync")) return;

  if (matchesAltarionName(actor.name)) {
    await FeatureSyncManager.syncAltarion(actor);
  } else if (matchesAitusaName(actor.name)) {
    await FeatureSyncManager.syncAitusa(actor);
  }
});

Hooks.on("updateActor", async (actor, changed) => {
  if (!actor || !actor.isOwner) return;

  const isAltarion = matchesAltarionName(actor.name);
  const isAitusa = matchesAitusaName(actor.name);

  // 1. If Altarion's temporary hit points drop to 0, automatically remove Ancestral Ward status
  if (isAltarion && changed?.system?.attributes?.hp && "temp" in changed.system.attributes.hp) {
    const newTemp = Number(actor.system?.attributes?.hp?.temp ?? 0);
    if (newTemp <= 0) {
      const wardEffects = actor.effects.filter(
        e =>
          e.flags?.["altarion-aitusa"]?.isAncestralWardEffect ||
          e.statuses?.has?.("ancestral-ward") ||
          e.name?.toLowerCase() === "ancestral ward"
      );
      if (wardEffects.length > 0) {
        await actor.deleteEmbeddedDocuments(
          "ActiveEffect",
          wardEffects.map(e => e.id)
        );
        ui.notifications.info("[Altarion & Aitusa] Ancestral Ward ended (0 Temporary Hit Points).");
      }
    }
  }

  // 2. If Altarion's primary resource (Ancestral Attacks) value was edited on the sheet, sync it with the Ancestral Attacks item
  if (isAltarion && changed?.system?.resources?.primary && "value" in changed.system.resources.primary) {
    const ancestralAttacksItem = actor.items.find(
      i => i.type === "feat" && i.name.toLowerCase() === "ancestral attacks"
    );
    if (ancestralAttacksItem) {
      const intMod = Math.max(1, Number(actor.system?.abilities?.int?.mod ?? 3));
      const newVal = Math.clamp(Number(changed.system.resources.primary.value ?? 0), 0, intMod);
      const targetSpent = Math.max(0, intMod - newVal);
      if (Number(ancestralAttacksItem.system?.uses?.spent ?? 0) !== targetSpent) {
        await ancestralAttacksItem.update({ "system.uses.spent": targetSpent });
      }
    }
  }

  // 3. If Altarion's Intelligence score changed, update Ancestral Attacks & Arcane Ward max resources
  if (isAltarion && changed?.system?.abilities?.int && !FeatureSyncManager.isSyncing(actor.id)) {
    await FeatureSyncManager.syncAncestralAttacksResource(actor);
    await FeatureSyncManager.syncArcaneWardResource(actor);
  }

  // 4. If actor was renamed to Altarion or Aitusa, trigger full sync
  if (!("name" in (changed ?? {}))) return;
  if (FeatureSyncManager.isSyncing(actor.id)) return;
  if (!game.settings.get("altarion-aitusa", "autoSync")) return;

  if (isAltarion) {
    await FeatureSyncManager.syncAltarion(actor);
  } else if (isAitusa) {
    await FeatureSyncManager.syncAitusa(actor);
  }
});

/**
 * When an actor's class, subclass, or Ancestral Attacks item is updated, keep sheet state synchronized
 */
for (const hookName of ["createItem", "updateItem", "deleteItem"]) {
  Hooks.on(hookName, async (item, changed) => {
    const actor = item.parent;
    if (!actor || FeatureSyncManager.isSyncing(actor.id)) return;

    const isAltarion = matchesAltarionName(actor.name);
    const isAitusa = matchesAitusaName(actor.name);

    // Keep Ancestral Attacks primary resource & Draconic Focus header counters in sync when item uses are consumed/recovered
    if (
      hookName === "updateItem" &&
      isAltarion &&
      item.type === "feat" &&
      changed?.system?.uses !== undefined &&
      actor.isOwner
    ) {
      const lowerFeatName = item.name?.trim().toLowerCase() || "";
      if (lowerFeatName === "ancestral attacks") {
        const intMod = Math.max(1, Number(actor.system?.abilities?.int?.mod ?? 3));
        const spent = Number(item.system?.uses?.spent ?? 0);
        const remaining = Math.max(0, intMod - spent);
        if (actor.system?.resources?.primary?.value !== remaining || actor.system?.resources?.primary?.max !== intMod) {
          await actor.update({
            "system.resources.primary.label": "Ancestral Attacks",
            "system.resources.primary.value": remaining,
            "system.resources.primary.max": intMod,
            "system.resources.primary.lr": true
          });
        }
        return;
      }
      if (lowerFeatName === "draconic focus") {
        const aitusa = game.actors.find(a => matchesAitusaName(a.name));
        if (aitusa?.sheet?.rendered) aitusa.sheet.render(false);
        return;
      }
    }

    // Keep Aitusa's spell list 100% synchronized in real time whenever spells are added/edited/removed on Altarion
    if (item.type === "spell") {
      if (isAltarion && actor.isOwner && !FeatureSyncManager._mirroringSpells) {
        const aitusa = game.actors.find(a => matchesAitusaName(a.name));
        await FeatureSyncManager.handleAltarionSpellHook(hookName, actor, item, aitusa);
      } else if (
        hookName === "createItem" &&
        isAitusa &&
        actor.isOwner &&
        !FeatureSyncManager._mirroringSpells
      ) {
        const altarion = game.actors.find(a => matchesAltarionName(a.name));
        if (altarion) {
          await FeatureSyncManager.syncAitusaSpellsFromAltarion(altarion, actor);
        }
      }
      return;
    }

    if (item.type !== "class" && item.type !== "subclass") return;

    if (isAltarion) {
      SecondaryClassManager.refreshActor(actor);
      if (actor.isOwner && hookName !== "deleteItem") {
        await FeatureSyncManager.syncAltarion(actor);
        const aitusa = game.actors.find(a => matchesAitusaName(a.name));
        if (aitusa?.isOwner) {
          await FeatureSyncManager.syncAitusa(aitusa);
        }
      }
    } else if (isAitusa) {
      SecondaryClassManager.refreshActor(actor);
      if (actor.isOwner && hookName !== "deleteItem") {
        await FeatureSyncManager.syncAitusa(actor);
        const altarion = game.actors.find(a => matchesAltarionName(a.name));
        if (altarion?.isOwner) await FeatureSyncManager.syncAltarion(altarion);
      }
    }
  });
}

/**
 * Detect chat messages from Ancestral Ward (fallback status application) and Ancestral Weapon attacks
 * while Altarion has Ancestral Ward active + Temporary HP > 0.
 */
Hooks.on("createChatMessage", async (message) => {
  try {
    const speakerActor = ChatMessage.getSpeakerActor?.(message.speaker) || game.actors.get(message.speaker?.actor);
    if (!speakerActor || !speakerActor.isOwner) return;

    if (!matchesAltarionName(speakerActor.name)) return;

    const dndFlags = message.flags?.dnd5e || {};
    const itemId = dndFlags.item?.id || dndFlags.use?.itemId;
    const item = message.getAssociatedItem?.() || (itemId ? speakerActor.items.get(itemId) : null);
    if (!item) return;

    const itemNameLower = item.name?.trim().toLowerCase();

    // Ensure Ancestral Ward status is applied if triggered from chat
    if (itemNameLower === "ancestral ward") {
      await applyAncestralWardStatus(speakerActor, item);
      return;
    }

    // Check if this is an Attack roll or item use of "Ancestral Weapon"
    const isAncestralWeapon =
      item.flags?.["altarion-aitusa"]?.isAncestralWeapon || itemNameLower === "ancestral weapon";
    if (!isAncestralWeapon) return;

    const rollType = dndFlags.roll?.type || dndFlags.activity?.type;
    if (rollType === "damage") return; // Only tag the attack / use card, not the separate damage roll card

    const wardActive = hasAncestralWardActive(speakerActor);
    const tempHp = Number(speakerActor.system?.attributes?.hp?.temp ?? 0);
    if (wardActive && tempHp > 0 && !message.flags?.["altarion-aitusa"]?.ancestralWardActive) {
      const spellDc =
        speakerActor.system?.attributes?.spell?.dc ||
        8 + Number(speakerActor.system?.abilities?.int?.mod ?? 3) + Number(speakerActor.system?.attributes?.prof ?? 2);

      await message.update({
        "flags.altarion-aitusa.ancestralWardActive": true,
        "flags.altarion-aitusa.ancestralWardDc": spellDc
      });
    }
  } catch (err) {
    console.warn("[Altarion & Aitusa] Error checking Ancestral Weapon chat message:", err);
  }
});

/**
 * Inject the interactive "Ancestral Ward — Wisdom Save" tag into Ancestral Weapon attack chat cards
 */
function onRenderChatMessage(message, html) {
  const rootEl = html instanceof HTMLElement ? html : html?.[0];
  if (!rootEl) return;

  let wardFlag = message.flags?.["altarion-aitusa"]?.ancestralWardActive;
  let spellDc = message.flags?.["altarion-aitusa"]?.ancestralWardDc;

  // Live check in case render happens before message.update completes
  if (!wardFlag) {
    const speakerActor = ChatMessage.getSpeakerActor?.(message.speaker) || game.actors?.get(message.speaker?.actor);
    const dndFlags = message.flags?.dnd5e || {};
    const itemId = dndFlags.item?.id || dndFlags.use?.itemId;
    const item = message.getAssociatedItem?.() || (itemId ? speakerActor?.items?.get(itemId) : null);
    const rollType = dndFlags.roll?.type || dndFlags.activity?.type;

    if (
      speakerActor &&
      item &&
      (item.flags?.["altarion-aitusa"]?.isAncestralWeapon || item.name?.toLowerCase() === "ancestral weapon") &&
      rollType !== "damage" &&
      hasAncestralWardActive(speakerActor) &&
      Number(speakerActor.system?.attributes?.hp?.temp ?? 0) > 0
    ) {
      wardFlag = true;
      spellDc =
        speakerActor.system?.attributes?.spell?.dc ||
        8 + Number(speakerActor.system?.abilities?.int?.mod ?? 3) + Number(speakerActor.system?.attributes?.prof ?? 2);
    }
  }

  if (!wardFlag || rootEl.querySelector(".altarion-aitusa-ward-chat-tag")) return;
  const dcVal = Number(spellDc || 15);

  const tagDiv = document.createElement("div");
  tagDiv.className = "altarion-aitusa-ward-chat-tag";
  tagDiv.innerHTML = `
    <div class="altarion-ward-header">
      <i class="fas fa-shield-alt"></i>
      <span>Ancestral Ward Active</span>
    </div>
    <div class="altarion-ward-body">
      On a hit, the target must make a <strong>DC ${dcVal} Wisdom Saving Throw</strong>.
      On a failed save, the creature has <strong>disadvantage</strong> on all attack rolls made against any creature other than Altarion or Aitusa until the end of Altarion's next turn.
    </div>
    <button type="button" class="altarion-aitusa-ward-save-btn" data-dc="${dcVal}">
      <i class="fas fa-dice-d20"></i> Roll Wisdom Save (DC ${dcVal})
    </button>
  `;

  const btn = tagDiv.querySelector(".altarion-aitusa-ward-save-btn");
  btn?.addEventListener("click", async (ev) => {
    ev.preventDefault();
    ev.stopPropagation();

    const controlledActors = (canvas?.tokens?.controlled || []).map(t => t.actor).filter(Boolean);
    const targetedActors = Array.from(game.user?.targets || [])
      .map(t => t.actor)
      .filter(Boolean);
    const actorsToRoll =
      controlledActors.length > 0
        ? controlledActors
        : targetedActors.length > 0
          ? targetedActors
          : [game.user?.character].filter(Boolean);

    if (actorsToRoll.length === 0) {
      ui.notifications.warn("Select or target a token to roll the Wisdom Saving Throw.");
      return;
    }

    const speakerActor = ChatMessage.getSpeakerActor?.(message.speaker) || game.actors?.get(message.speaker?.actor);
    AltarionAutomationManager._pendingSaveContext = {
      type: "ancestral-ward",
      dc: dcVal,
      sourceActorId: speakerActor?.id || null,
      img: "modules/altarion-aitusa/dr_icons/ancestral-ward.jpg",
      timestamp: Date.now()
    };

    for (const targetActor of actorsToRoll) {
      if (typeof targetActor.rollSavingThrow === "function") {
        await targetActor.rollSavingThrow({ ability: "wis", target: dcVal }, { event: ev });
      } else if (typeof targetActor.rollAbilitySave === "function") {
        await targetActor.rollAbilitySave("wis", { dc: dcVal, event: ev });
      }
    }
  });

  const contentContainer = rootEl.querySelector(".message-content") || rootEl;
  contentContainer.appendChild(tagDiv);
}

Hooks.on("renderChatMessageHTML", onRenderChatMessage);

/**
 * Unified handler to inject class status badges, Ancestral Attacks resource tracker,
 * and sync button into Actor Sheet (AppV1 & AppV2)
 */
function onRenderActorSheet(sheet, html) {
  const actor = sheet?.actor || sheet?.document;
  if (!actor) return;

  const isAltarion = matchesAltarionName(actor.name);
  const isAitusa = matchesAitusaName(actor.name);

  if (!isAltarion && !isAitusa) return;

  // If the actor was just created/opened and has no classes yet (or has stub classes with empty descriptions), trigger auto-sync automatically
  if (actor.isOwner && game.settings.get("altarion-aitusa", "autoSync") && !FeatureSyncManager.isSyncing(actor.id)) {
    const classItems = actor.items.filter(i => i.type === "class");
    const needsClassSync =
      classItems.length === 0 || classItems.some(i => !(i.system?.description?.value || "").trim());
    if (needsClassSync && actor.type === "character") {
      if (isAltarion) FeatureSyncManager.syncAltarion(actor);
      else if (isAitusa) FeatureSyncManager.syncAitusa(actor);
    }
  }

  const rootEl = html instanceof HTMLElement ? html : html?.[0];
  if (!rootEl) return;

  const header = rootEl.querySelector(".sheet-header, .header-details, .tidy5e-header, .window-header");
  if (header) {
    let container = rootEl.querySelector(".altarion-aitusa-class-container");
    if (!container) {
      container = document.createElement("div");
      container.className = "altarion-aitusa-class-container";
      header.insertAdjacentElement("afterend", container);
    }

    container.innerHTML = "";

    if (isAltarion) {
      const riderClass = actor.items.find(i => i.type === "class" && !SecondaryClassManager.isSecondaryClass(i, actor));
      const wizardClass = actor.items.find(i => i.type === "class" && SecondaryClassManager.isSecondaryClass(i, actor));

      const riderLvl = riderClass?.system?.levels || 4;
      const wizardLvl = wizardClass?.system?.levels || 1;

      const ancestralAttacksItem = actor.items.find(
        i => i.type === "feat" && i.name.toLowerCase() === "ancestral attacks"
      );
      const maxAttacks = Math.max(1, Number(actor.system?.abilities?.int?.mod ?? 3));
      const spentAttacks = Number(ancestralAttacksItem?.system?.uses?.spent ?? 0);
      const remainingAttacks = Math.max(0, maxAttacks - spentAttacks);

      const arcaneStepItem = actor.items.find(
        i => i.type === "feat" && i.name?.trim().toLowerCase() === "arcane step"
      );
      const maxArcaneStep = Math.max(1, Number(actor.system?.attributes?.prof ?? 2));
      const spentArcaneStep = Number(arcaneStepItem?.system?.uses?.spent ?? 0);
      const remainingArcaneStep = Math.clamp(maxArcaneStep - spentArcaneStep, 0, maxArcaneStep);

      const aitusaActor = game.actors.find(a => matchesAitusaName(a.name));
      const maxLinked = Math.max(1, Number(aitusaActor?.system?.abilities?.int?.mod ?? 3));
      const remainingLinked = Math.clamp(
        Number(actor.system?.resources?.secondary?.value ?? maxLinked),
        0,
        maxLinked
      );

      const draconicFocusItem = actor.items.find(
        i => i.type === "feat" && i.name?.trim().toLowerCase() === "draconic focus"
      );
      const rawFocusMax = Number(draconicFocusItem?.system?.uses?.max);
      const maxDraconicFocus =
        Number.isFinite(rawFocusMax) && rawFocusMax > 0
          ? rawFocusMax
          : Math.max(1, Number(actor.system?.abilities?.int?.mod ?? 3));
      const spentDraconicFocus = Number(draconicFocusItem?.system?.uses?.spent ?? 0);
      const remainingDraconicFocus = Math.clamp(maxDraconicFocus - spentDraconicFocus, 0, maxDraconicFocus);
      const showDraconicFocus = Boolean(riderLvl >= 7 || draconicFocusItem);

      const wardActive = hasAncestralWardActive(actor) && Number(actor.system?.attributes?.hp?.temp ?? 0) > 0;
      const tetherActive = AltarionAutomationManager.hasStatus(actor, "ancestral-tether");
      const arcaneWardState = AltarionAutomationManager.getArcaneWardState(actor);
      const arcaneWardPct = arcaneWardState.eligible
        ? Math.round((arcaneWardState.current / Math.max(1, arcaneWardState.max)) * 100)
        : 0;
      const arcaneArmorEff = AltarionAutomationManager.getArcaneArmorEffect(actor);
      const arcaneArmorActive =
        Boolean(arcaneArmorEff) && Number(actor.system?.attributes?.hp?.temp ?? 0) > 0;
      const arcaneArmorDmg = Number(arcaneArmorEff?.flags?.["altarion-aitusa"]?.retaliationDamage || 5);

      container.innerHTML = `
        <span class="altarion-aitusa-badge primary" data-coria-color-key="class-primary" data-coria-color-label="Dragon Rider (Classe Principal)" title="Dragon Rider (Classe Principal) | Clique direito para personalizar cor">
          <i class="fas fa-dragon"></i> Dragon Rider (Lvl ${riderLvl})
        </span>
        <span class="altarion-aitusa-badge secondary" data-coria-color-key="class-secondary" data-coria-color-label="Wizard (Classe Secundária)" title="Wizard (Classe Secundária) | Clique direito para personalizar cor">
          <i class="fas fa-hat-wizard"></i> Wizard (Lvl ${wizardLvl} - Secondary)
        </span>
        ${
          arcaneWardState.eligible
            ? `<span class="altarion-aitusa-badge arcane-ward ${arcaneWardState.active ? "is-woven" : "is-dormant"}" data-coria-color-key="res-arcane-ward" data-coria-color-label="Arcane Ward" title="${
                arcaneWardState.active
                  ? `Arcane Ward Active (${arcaneWardState.current}/${arcaneWardState.max} HP = 2 × Wizard Lvl + INT Mod). Absorbs damage before Temp HP & HP. Recharges +2 × Slot Level when casting a 1st+ level Abjuration spell.`
                  : `Arcane Ward Dormant (0/${arcaneWardState.max} HP). Cast an Abjuration spell of 1st level or higher (or click +) to weave it at full HP.`
              } | Clique direito para personalizar cor">
                <i class="fas fa-shield-alt"></i> Arcane Ward:
                <span role="button" tabindex="0" class="altarion-res-step" data-res="arcane-ward" data-delta="-1" title="Reduce Arcane Ward HP by 1">-</span>
                <span class="altarion-ward-mini-bar">
                  <span class="altarion-ward-mini-fill" style="width: ${arcaneWardPct}%;"></span>
                  <strong class="altarion-ward-mini-text">${arcaneWardState.current} / ${arcaneWardState.max}</strong>
                </span>
                <span role="button" tabindex="0" class="altarion-res-step" data-res="arcane-ward" data-delta="1" title="Restore Arcane Ward HP by 1">+</span>
              </span>`
            : ""
        }
        ${
          ancestralAttacksItem
            ? `<span class="altarion-aitusa-badge resource" data-coria-color-key="res-ancestral-attacks" data-coria-color-label="Ancestral Attacks" title="Ancestral Attacks Remaining (Max = INT Modifier, Long Rest recovery) | Clique direito para personalizar cor">
                <i class="fas fa-bolt"></i> Ancestral Attacks:
                <span role="button" tabindex="0" class="altarion-res-step" data-res="ancestral" data-delta="-1" title="Spend 1 Ancestral Attack">-</span>
                <strong>${remainingAttacks} / ${maxAttacks}</strong>
                <span role="button" tabindex="0" class="altarion-res-step" data-res="ancestral" data-delta="1" title="Recover 1 Ancestral Attack">+</span>
              </span>`
            : ""
        }
        ${
          arcaneStepItem
            ? `<span class="altarion-aitusa-badge resource" data-coria-color-key="res-arcane-step" data-coria-color-label="Arcane Step" title="Arcane Step Uses Remaining (Max = Proficiency Bonus, Long Rest recovery) | Clique direito para personalizar cor">
                <i class="fas fa-shoe-prints"></i> Arcane Step:
                <span role="button" tabindex="0" class="altarion-res-step" data-res="arcane-step" data-delta="-1" title="Spend 1 Arcane Step">-</span>
                <strong>${remainingArcaneStep} / ${maxArcaneStep}</strong>
                <span role="button" tabindex="0" class="altarion-res-step" data-res="arcane-step" data-delta="1" title="Recover 1 Arcane Step">+</span>
              </span>`
            : ""
        }
        ${
          riderLvl >= 3
            ? `<span class="altarion-aitusa-badge resource" data-coria-color-key="res-linked-casting" data-coria-color-label="Linked Casting" title="Linked Casting Remaining (Max = Aitusa's INT Modifier, Long Rest recovery) | Clique direito para personalizar cor">
                <i class="fas fa-link"></i> Linked Casting:
                <span role="button" tabindex="0" class="altarion-res-step" data-res="linked" data-delta="-1" title="Spend 1 Linked Casting">-</span>
                <strong>${remainingLinked} / ${maxLinked}</strong>
                <span role="button" tabindex="0" class="altarion-res-step" data-res="linked" data-delta="1" title="Recover 1 Linked Casting">+</span>
              </span>`
            : ""
        }
        ${
          showDraconicFocus
            ? `<span class="altarion-aitusa-badge resource" data-coria-color-key="res-draconic-focus" data-coria-color-label="Draconic Focus" title="Draconic Focus Uses Remaining (Channel Spell through Aitusa, Long Rest recovery) | Clique direito para personalizar cor">
                <i class="fas fa-dragon"></i> Draconic Focus:
                <span role="button" tabindex="0" class="altarion-res-step" data-res="draconic-focus" data-delta="-1" title="Spend 1 Draconic Focus">-</span>
                <strong>${remainingDraconicFocus} / ${maxDraconicFocus}</strong>
                <span role="button" tabindex="0" class="altarion-res-step" data-res="draconic-focus" data-delta="1" title="Recover 1 Draconic Focus">+</span>
              </span>`
            : ""
        }
        ${
          arcaneArmorActive
            ? `<span class="altarion-aitusa-badge arcane-armor-active" data-coria-color-key="status-arcane-armor" data-coria-color-label="Arcane Armor Active" title="Arcane Armor active while Temp HP > 0 (${arcaneArmorDmg} Force damage retaliation on melee hits) | Clique direito para personalizar cor">
                <i class="fas fa-bolt"></i> Arcane Armor (${arcaneArmorDmg} Force)
              </span>`
            : ""
        }
        ${
          wardActive
            ? `<span class="altarion-aitusa-badge ward-active" data-coria-color-key="status-ancestral-ward" data-coria-color-label="Ancestral Ward Active" title="Ancestral Ward is active while Temp HP > 0 | Clique direito para personalizar cor">
                <i class="fas fa-shield-alt"></i> Ancestral Ward Active
              </span>`
            : ""
        }
        ${
          tetherActive
            ? `<span class="altarion-aitusa-badge ward-active" data-coria-color-key="status-tethered" data-coria-color-label="Tethered" title="Ancestral Tether is active | Clique direito para personalizar cor">
                <i class="fas fa-link"></i> Tethered
              </span>`
            : ""
        }
      `;

      if (actor.isOwner) {
        for (const stepBtn of container.querySelectorAll(".altarion-res-step")) {
          stepBtn.addEventListener("click", async (ev) => {
            ev.preventDefault();
            ev.stopPropagation();
            const delta = Number(stepBtn.getAttribute("data-delta") || 0);
            const resType = stepBtn.getAttribute("data-res");
            if (resType === "ancestral" && ancestralAttacksItem) {
              const newRemaining = Math.clamp(remainingAttacks + delta, 0, maxAttacks);
              const newSpent = Math.max(0, maxAttacks - newRemaining);
              await ancestralAttacksItem.update({ "system.uses.spent": newSpent });
            } else if (resType === "arcane-step" && arcaneStepItem) {
              const newRemaining = Math.clamp(remainingArcaneStep + delta, 0, maxArcaneStep);
              const newSpent = Math.max(0, maxArcaneStep - newRemaining);
              await arcaneStepItem.update({
                "system.uses.max": "@prof",
                "system.uses.spent": newSpent,
                "system.uses.recovery": [{ period: "lr", type: "recoverAll" }]
              });
            } else if (resType === "linked") {
              const newRemaining = Math.clamp(remainingLinked + delta, 0, maxLinked);
              await actor.update({
                "system.resources.secondary.label": "Linked Casting",
                "system.resources.secondary.value": newRemaining,
                "system.resources.secondary.max": maxLinked,
                "system.resources.secondary.lr": true
              });
            } else if (resType === "draconic-focus" && draconicFocusItem) {
              const newRemaining = Math.clamp(remainingDraconicFocus + delta, 0, maxDraconicFocus);
              const newSpent = Math.max(0, maxDraconicFocus - newRemaining);
              await draconicFocusItem.update({
                "system.uses.spent": newSpent,
                ...(draconicFocusItem.system?.uses?.max ? {} : { "system.uses.max": "max(1, @abilities.int.mod)", "system.uses.recovery": [{ period: "lr", type: "recoverAll" }] })
              });
            } else if (resType === "arcane-ward" && arcaneWardState.eligible) {
              const newWardHp = Math.clamp(arcaneWardState.current + delta, 0, arcaneWardState.max);
              await actor.update(
                {
                  "flags.altarion-aitusa.arcaneWardActive": arcaneWardState.active || newWardHp > 0,
                  "system.resources.tertiary.label": "Arcane Ward",
                  "system.resources.tertiary.value": newWardHp,
                  "system.resources.tertiary.max": arcaneWardState.max,
                  "system.resources.tertiary.sr": false,
                  "system.resources.tertiary.lr": false
                },
                { altarionBypassWard: true }
              );
            }
          });
        }
      }
    } else if (isAitusa) {
      const dragonClass = actor.items.find(i => i.type === "class");
      const dragonLvl = dragonClass?.system?.levels || 4;
      const sizeData = DragonScalingManager.getSizeData(dragonLvl);
      const maxDragonAtks = Math.max(1, Number(actor.system?.abilities?.str?.mod ?? 2));
      const remDragonAtks = Math.clamp(
        Number(actor.system?.resources?.primary?.value ?? maxDragonAtks),
        0,
        maxDragonAtks
      );
      const altarionActor = game.actors.find(a => matchesAltarionName(a.name));
      const riderClass = altarionActor?.items.find(
        i => i.type === "class" && !SecondaryClassManager.isSecondaryClass(i, altarionActor)
      );
      const riderLvl = riderClass?.system?.levels || 4;
      const draconicFocusItem = altarionActor?.items.find(
        i => i.type === "feat" && i.name?.trim().toLowerCase() === "draconic focus"
      );
      const rawFocusMax = Number(draconicFocusItem?.system?.uses?.max);
      const maxDraconicFocus =
        Number.isFinite(rawFocusMax) && rawFocusMax > 0
          ? rawFocusMax
          : Math.max(1, Number(altarionActor?.system?.abilities?.int?.mod ?? 3));
      const spentDraconicFocus = Number(draconicFocusItem?.system?.uses?.spent ?? 0);
      const remainingDraconicFocus = Math.clamp(maxDraconicFocus - spentDraconicFocus, 0, maxDraconicFocus);
      const showDraconicFocus = Boolean(riderLvl >= 7 || draconicFocusItem);

      const tetherActive = AltarionAutomationManager.hasStatus(actor, "ancestral-tether");
      const aitusaArmorEff = AltarionAutomationManager.getArcaneArmorEffect(actor);
      const aitusaArmorActive =
        Boolean(aitusaArmorEff) && Number(actor.system?.attributes?.hp?.temp ?? 0) > 0;
      const aitusaArmorDmg = Number(aitusaArmorEff?.flags?.["altarion-aitusa"]?.retaliationDamage || 5);

      container.innerHTML = `
        <span class="altarion-aitusa-badge companion" data-coria-color-key="class-primary" data-coria-color-label="Dragon Companion (Classe Principal)" title="Dragon Companion (Classe Principal) | Clique direito para personalizar cor">
          <i class="fas fa-paw"></i> Dragon Companion: ${sizeData.sizeLabel} (Lvl ${dragonLvl})
        </span>
        <span class="altarion-aitusa-badge resource" data-coria-color-key="res-dragon-attacks" data-coria-color-label="Dragon Attacks" title="Dragon Attacks Remaining for Bite, Tail & Wing Attacks (Max = STR Modifier, Short/Long Rest recovery) | Clique direito para personalizar cor">
          <i class="fas fa-claw-marks"></i> Dragon Attacks:
          <span role="button" tabindex="0" class="altarion-res-step" data-res="dragon-attacks" data-delta="-1" title="Spend 1 Dragon Attack">-</span>
          <strong>${remDragonAtks} / ${maxDragonAtks}</strong>
          <span role="button" tabindex="0" class="altarion-res-step" data-res="dragon-attacks" data-delta="1" title="Recover 1 Dragon Attack">+</span>
        </span>
        ${
          showDraconicFocus
            ? `<span class="altarion-aitusa-badge resource" data-coria-color-key="res-draconic-focus" data-coria-color-label="Draconic Focus" title="Altarion's Draconic Focus Uses Remaining (Channel Spell through Aitusa, Long Rest recovery) | Clique direito para personalizar cor">
                <i class="fas fa-dragon"></i> Draconic Focus:
                <span role="button" tabindex="0" class="altarion-res-step" data-res="draconic-focus" data-delta="-1" title="Spend 1 Draconic Focus">-</span>
                <strong>${remainingDraconicFocus} / ${maxDraconicFocus}</strong>
                <span role="button" tabindex="0" class="altarion-res-step" data-res="draconic-focus" data-delta="1" title="Recover 1 Draconic Focus">+</span>
              </span>`
            : ""
        }
        ${
          aitusaArmorActive
            ? `<span class="altarion-aitusa-badge arcane-armor-active" data-coria-color-key="status-arcane-armor" data-coria-color-label="Arcane Armor Active" title="Arcane Armor active via Linked Casting while Temp HP > 0 (${aitusaArmorDmg} Force damage retaliation on melee hits) | Clique direito para personalizar cor">
                <i class="fas fa-bolt"></i> Arcane Armor (${aitusaArmorDmg} Force)
              </span>`
            : ""
        }
        ${
          tetherActive
            ? `<span class="altarion-aitusa-badge ward-active" data-coria-color-key="status-tethered" data-coria-color-label="Tethered" title="Ancestral Tether active (Resistance to All Damage) | Clique direito para personalizar cor">
                <i class="fas fa-link"></i> Tethered (All Resistance)
              </span>`
            : ""
        }
      `;

      if (actor.isOwner) {
        for (const stepBtn of container.querySelectorAll('.altarion-res-step[data-res="dragon-attacks"]')) {
          stepBtn.addEventListener("click", async (ev) => {
            ev.preventDefault();
            ev.stopPropagation();
            const delta = Number(stepBtn.getAttribute("data-delta") || 0);
            const newRemaining = Math.clamp(remDragonAtks + delta, 0, maxDragonAtks);
            await actor.update({
              "system.resources.primary.label": "Dragon Attacks",
              "system.resources.primary.value": newRemaining,
              "system.resources.primary.max": maxDragonAtks,
              "system.resources.primary.sr": true,
              "system.resources.primary.lr": true
            });
          });
        }
        for (const stepBtn of container.querySelectorAll('.altarion-res-step[data-res="draconic-focus"]')) {
          stepBtn.addEventListener("click", async (ev) => {
            ev.preventDefault();
            ev.stopPropagation();
            if (!draconicFocusItem || !altarionActor?.isOwner) return;
            const delta = Number(stepBtn.getAttribute("data-delta") || 0);
            const newRemaining = Math.clamp(remainingDraconicFocus + delta, 0, maxDraconicFocus);
            const newSpent = Math.max(0, maxDraconicFocus - newRemaining);
            await draconicFocusItem.update({
              "system.uses.spent": newSpent,
              ...(draconicFocusItem.system?.uses?.max ? {} : { "system.uses.max": "max(1, @abilities.int.mod)", "system.uses.recovery": [{ period: "lr", type: "recoverAll" }] })
            });
          });
        }
      }
    }

    if (actor.isOwner) {
      const syncBtn = document.createElement("button");
      syncBtn.type = "button";
      syncBtn.className = "altarion-aitusa-sync-btn";
      syncBtn.innerHTML = `<i class="fas fa-sync"></i> Sync Features`;
      syncBtn.addEventListener("click", async (e) => {
        e.preventDefault();
        if (isAltarion) await FeatureSyncManager.syncAltarion(actor);
        if (isAitusa) await FeatureSyncManager.syncAitusa(actor);
      });
      container.appendChild(syncBtn);
    }

    if (isAltarion) {
      ArcanePlagueManager.renderPlagueHeaderRow(actor, rootEl);
    }
    globalThis.CoriaHeaderColorManager?.applyAndBind?.(actor, container);
  }

  const decorateAltarionAitusaItems = () => {
    if (rootEl._altarionDecorating) return;
    rootEl._altarionDecorating = true;
    try {
      // Highlight secondary class items and ancestral features in inventory
      for (const el of rootEl.querySelectorAll("[data-item-id]")) {
        const itemId = el.getAttribute("data-item-id");
        const item = actor.items.get(itemId);
        if (!item) continue;

        if (
          item.flags?.["altarion-aitusa"]?.isSecondaryClass ||
          item.flags?.["altarion-aitusa"]?.isSecondaryClassItem
        ) {
          if (el.getAttribute("data-item-secondary") !== "true") {
            el.setAttribute("data-item-secondary", "true");
          }
        }
        if (
          item.flags?.["altarion-aitusa"]?.isPrimaryClassItem ||
          item.flags?.["altarion-aitusa"]?.isAncestralAttack ||
          item.flags?.["altarion-aitusa"]?.isAncestralWeapon
        ) {
          if (el.getAttribute("data-item-ancestral") !== "true") {
            el.setAttribute("data-item-ancestral", "true");
          }
        }
      }

      // Highlight Spellbook rows with Dragon Rider vs Wizard (Altarion) or Dragon Companion (Aitusa) colors
      globalThis.CoriaHeaderColorManager?.decorateUniversalSpellbook?.(actor, rootEl);
    } finally {
      rootEl._altarionDecorating = false;
    }
  };

  decorateAltarionAitusaItems();

  if (!rootEl._altarionSpellbookObserver) {
    let debounceTimer = null;
    const observer = new MutationObserver(() => {
      if (rootEl._altarionDecorating) return;
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        decorateAltarionAitusaItems();
      }, 45);
    });
    observer.observe(rootEl, {
      childList: true,
      subtree: true
    });
    rootEl._altarionSpellbookObserver = observer;
  }
}

for (const renderHook of [
  "renderActorSheet",
  "renderActorSheetV2",
  "renderCharacterActorSheet",
  "renderNPCActorSheet",
  "renderTidy5eCharacterSheet",
  "renderTidy5eNpcSheet"
]) {
  Hooks.on(renderHook, onRenderActorSheet);
}

// Load isolated Other Players modules (Parva, Kyrion, Flinn) even on browser reload without server restart
import "../other_players/OtherPlayersBase.js";
import "../other_players/Parva.js";
import "../other_players/Kyrion.js";
import "../other_players/Flinn.js";

