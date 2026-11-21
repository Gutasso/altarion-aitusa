/**
 * Party JSON Synchronizer (Aitusa, Altarion Talendris, Flinn Encantor, Kyrion, Parva)
 * Imports curated Inventory, Currency, Tool Proficiencies, Languages, Missing Feats, Backgrounds,
 * Card of the Resonant Arcana, Equipped/Attuned States + ActiveEffects, and `professions-reworked-5e` flags
 * (remapping container IDs and `ferramentasEquipadas` tool IDs cleanly without duplicating existing items
 * or overwriting future player progress).
 */

import { PARTY_JSON_DATA, PARTY_JSON_SYNC_VERSION } from "./party-json-data.js";

const MODULE_ID = "altarion-aitusa";
const FALLBACK_CARD_IMG = "icons/sundries/gaming/playing-cards.webp";

export class PartyJsonSyncManager {
  static _syncInFlight = new Set();

  static init() {
    globalThis.PartyJsonSyncManager = this;
  }

  static getCharKeyForActor(actor) {
    const n = String(actor?.name || "").trim().toLowerCase();
    if (!n) return null;
    if (n === "aitusa" || n.startsWith("aitusa ")) return "aitusa";
    if (n === "altarion" || n === "altarion talendris" || n.startsWith("altarion ")) return "altarion";
    if (n === "flinn" || n === "flinn encantor" || n.startsWith("flinn ")) return "flinn";
    if (n === "kyrion" || n.startsWith("kyrion ")) return "kyrion";
    if (n === "parva" || n.startsWith("parva ")) return "parva";
    return null;
  }

  static _sanitizeItemImg(img) {
    const s = String(img || "").trim();
    if (!s || s === "360_F_539323090_rgemn9ld3PWY4BTQ7X2Gz9gxHIblEjld.jpg") {
      return FALLBACK_CARD_IMG;
    }
    return s;
  }

  static async syncAllPartyActors({ force = false, silent = false } = {}) {
    if (!game.actors) return [];
    const results = [];
    for (const actor of game.actors) {
      const charKey = this.getCharKeyForActor(actor);
      if (!charKey) continue;
      if (!actor.isOwner) continue;
      const res = await this.syncActorFromJson(actor, { force, silent });
      if (res) results.push(res);
    }
    return results;
  }

  static async syncActorFromJson(actor, { force = false, silent = false } = {}) {
    if (!actor || !actor.isOwner) return null;
    const charKey = this.getCharKeyForActor(actor);
    if (!charKey) return null;
    const data = PARTY_JSON_DATA[charKey];
    if (!data) return null;

    const syncedVer = Number(actor.getFlag(MODULE_ID, "partyJsonSyncVersion") || 0);
    if (!force && syncedVer >= PARTY_JSON_SYNC_VERSION) {
      return { actorName: actor.name, charKey, skipped: true };
    }

    if (this._syncInFlight.has(actor.id)) return null;
    this._syncInFlight.add(actor.id);

    try {
      const origIdToRealId = new Map();
      const matchedExistingIds = new Set();

      const findExistingItem = (origId, doc) => {
        const key = `${charKey}:${origId}`;
        const byKey = actor.items.find(
          i => !matchedExistingIds.has(i.id) && i.flags?.[MODULE_ID]?.partyJsonItemKey === key
        );
        if (byKey) return byKey;

        const nameLow = String(doc.name || "").trim().toLowerCase();
        const byNameAndType = actor.items.find(
          i =>
            !matchedExistingIds.has(i.id) &&
            i.type === doc.type &&
            String(i.name || "").trim().toLowerCase() === nameLow
        );
        return byNameAndType || null;
      };

      const rawItems = Array.isArray(data.items) ? data.items : [];
      const containerEntries = rawItems.filter(
        x => x.doc?.type === "container" || x.doc?.type === "backpack"
      );
      const otherEntries = rawItems.filter(
        x => x.doc?.type !== "container" && x.doc?.type !== "backpack"
      );

      let createdCount = 0;
      const toCreateContainers = [];
      const containerOrigOrder = [];

      // Pass 1: Containers (so we know their real embedded Item IDs before creating contained items!)
      for (const entry of containerEntries) {
        const existing = findExistingItem(entry.origId, entry.doc);
        if (existing) {
          matchedExistingIds.add(existing.id);
          origIdToRealId.set(entry.origId, existing.id);
          continue;
        }
        const clone = foundry.utils.deepClone(entry.doc);
        clone.img = this._sanitizeItemImg(clone.img);
        clone.flags ??= {};
        clone.flags[MODULE_ID] = {
          ...(clone.flags[MODULE_ID] || {}),
          partyJsonItemKey: `${charKey}:${entry.origId}`
        };
        toCreateContainers.push(clone);
        containerOrigOrder.push(entry.origId);
      }

      if (toCreateContainers.length > 0) {
        const createdCont = await actor.createEmbeddedDocuments("Item", toCreateContainers);
        for (let idx = 0; idx < createdCont.length; idx++) {
          const item = createdCont[idx];
          const origId = containerOrigOrder[idx];
          if (item?.id) {
            matchedExistingIds.add(item.id);
            origIdToRealId.set(origId, item.id);
            createdCount++;
          }
        }
      }

      // Pass 2: All other items (Weapons, Equipment, Consumables, Tools, Loot, Feats, Backgrounds)
      const toCreateOthers = [];
      const otherOrigOrder = [];
      let backgroundItemId = null;

      for (const entry of otherEntries) {
        const existing = findExistingItem(entry.origId, entry.doc);
        if (existing) {
          matchedExistingIds.add(existing.id);
          origIdToRealId.set(entry.origId, existing.id);
          if (existing.type === "background") backgroundItemId = existing.id;
          continue;
        }
        const clone = foundry.utils.deepClone(entry.doc);
        clone.img = this._sanitizeItemImg(clone.img);
        if (clone.system && "container" in clone.system) {
          const origCont = clone.system.container;
          if (origCont && origIdToRealId.has(origCont)) {
            clone.system.container = origIdToRealId.get(origCont);
          } else {
            clone.system.container = null;
          }
        }
        clone.flags ??= {};
        clone.flags[MODULE_ID] = {
          ...(clone.flags[MODULE_ID] || {}),
          partyJsonItemKey: `${charKey}:${entry.origId}`
        };
        toCreateOthers.push(clone);
        otherOrigOrder.push(entry.origId);
      }

      if (toCreateOthers.length > 0) {
        const createdOthers = await actor.createEmbeddedDocuments("Item", toCreateOthers);
        for (let idx = 0; idx < createdOthers.length; idx++) {
          const item = createdOthers[idx];
          const origId = otherOrigOrder[idx];
          if (item?.id) {
            matchedExistingIds.add(item.id);
            origIdToRealId.set(origId, item.id);
            if (item.type === "background") backgroundItemId = item.id;
            createdCount++;
          }
        }
      }

      // Build Actor-level updates (Currency, Tool Proficiencies, Languages, Background ref, professions-reworked-5e)
      const actorUpdates = {};

      // 1. Background reference
      const curBg =
        typeof actor._source?.system?.details?.background === "string"
          ? actor._source.system.details.background
          : actor.system?.details?.background?.id || "";
      if (!curBg && backgroundItemId) {
        actorUpdates["system.details.background"] = backgroundItemId;
      }

      // 2. Currency (apply on first sync or force if current currency is empty or force=true)
      if (data.currency && typeof data.currency === "object") {
        const curC = actor.system?.currency || {};
        const curTotalCoins =
          Number(curC.pp || 0) +
          Number(curC.gp || 0) +
          Number(curC.ep || 0) +
          Number(curC.sp || 0) +
          Number(curC.cp || 0);
        const srcTotalCoins =
          Number(data.currency.pp || 0) +
          Number(data.currency.gp || 0) +
          Number(data.currency.ep || 0) +
          Number(data.currency.sp || 0) +
          Number(data.currency.cp || 0);

        if (srcTotalCoins > 0 && (force || curTotalCoins === 0)) {
          for (const denom of ["pp", "gp", "ep", "sp", "cp"]) {
            actorUpdates[`system.currency.${denom}`] = Number(data.currency[denom] || 0);
          }
        }
      }

      // 3. Tool Proficiencies (merge without downgrading existing proficiencies)
      if (data.tools && typeof data.tools === "object") {
        const curTools = actor.system?.tools || {};
        for (const [toolKey, toolCfg] of Object.entries(data.tools)) {
          if (!toolCfg || typeof toolCfg !== "object") continue;
          const existingTool = curTools[toolKey];
          const existingProf = Number(existingTool?.value ?? -1);
          const incomingProf = Number(toolCfg.value ?? 0);
          if (!existingTool || incomingProf > existingProf) {
            actorUpdates[`system.tools.${toolKey}`] = foundry.utils.deepClone(toolCfg);
          }
        }
      }

      // 4. Languages (union of existing + JSON languages)
      if (data.languages) {
        const curLangVal = Array.from(actor.system?.traits?.languages?.value || []);
        const mergedLangs = Array.from(new Set([...curLangVal, ...(data.languages.value || [])]));
        actorUpdates["system.traits.languages.value"] = mergedLangs;
        if (data.languages.custom && !actor.system?.traits?.languages?.custom) {
          actorUpdates["system.traits.languages.custom"] = data.languages.custom;
        }
      }

      // 5. `professions-reworked-5e` flags (remap `ferramentasEquipadas` to the real embedded Tool Item IDs!)
      if (data.professionsFlags && typeof data.professionsFlags === "object") {
        const existingProf = actor.flags?.["professions-reworked-5e"] || null;
        const hasExistingProfProgress = Boolean(
          existingProf &&
            ((Array.isArray(existingProf.profissoesAtivas) && existingProf.profissoesAtivas.length > 0) ||
              (Array.isArray(existingProf.projetos) && existingProf.projetos.length > 0) ||
              (Array.isArray(existingProf.listaTreinamentos) &&
                existingProf.listaTreinamentos.some(t => Number(t?.progresso || t?.atual || 0) > 0)))
        );

        if (force || !hasExistingProfProgress) {
          const profClone = foundry.utils.deepClone(data.professionsFlags);
          if (profClone.ferramentasEquipadas && typeof profClone.ferramentasEquipadas === "object") {
            const remapped = {};
            for (const [profName, origToolId] of Object.entries(profClone.ferramentasEquipadas)) {
              if (origToolId && origIdToRealId.has(origToolId)) {
                remapped[profName] = origIdToRealId.get(origToolId);
              } else {
                // Fallback: locate matching tool on actor by profession keyword
                const profLow = profName.toLowerCase();
                const toolMatch = actor.items.find(i => {
                  if (i.type !== "tool") return false;
                  const n = String(i.name || "").toLowerCase();
                  if (profLow.includes("escrib") && n.includes("calligrapher")) return true;
                  if (profLow.includes("cart") && n.includes("cartographer")) return true;
                  if (profLow.includes("oleir") && n.includes("potter")) return true;
                  if (profLow.includes("sic") && n.includes("poison")) return true;
                  return false;
                });
                remapped[profName] = toolMatch?.id || origToolId;
              }
            }
            profClone.ferramentasEquipadas = remapped;
          }
          actorUpdates["flags.professions-reworked-5e"] = profClone;
        }
      }

      actorUpdates[`flags.${MODULE_ID}.partyJsonSyncVersion`] = PARTY_JSON_SYNC_VERSION;

      await actor.update(actorUpdates, { altarionBypassWard: true, coriaDamageReactionInternal: true });

      // 6. Auto-allocate newly synced Attuned magic items into equipment Attunement Slots!
      try {
        await globalThis.CoriaAttunementSlots?.syncActorAttunementSlots?.(actor);
      } catch (_e) {}

      console.log(
        `[Altarion & Aitusa] Party JSON Sync completed for ${actor.name} (+${createdCount} items synced).`
      );
      if (!silent && createdCount > 0) {
        ui.notifications?.info?.(
          `[Sync JSON] ${actor.name}: ${createdCount} itens, moedas, proficiências e dados de profissões sincronizados!`
        );
      }
      return { actorName: actor.name, charKey, createdCount };
    } catch (err) {
      console.error(`[Altarion & Aitusa] Party JSON Sync failed for ${actor.name}:`, err);
      return null;
    } finally {
      this._syncInFlight.delete(actor.id);
    }
  }
}
