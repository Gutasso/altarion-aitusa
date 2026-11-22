/**
 * CoriaResonantArcana — Full Automation for the 5 "Card of the Resonant Arcana" Magic Items
 * (Each card has 1 charge that recovers after a Long Rest.)
 *
 *  1. The Hierophant (Altarion):
 *     - Reaction button in chat when a creature within 30 ft of Altarion FAILS a Saving Throw against a spell.
 *     - Consumes 1 charge (1/LR), rerolls the saving throw keeping the same flat bonus — rolling with
 *       Advantage (2d20kh1) if the originating spell is from the Enchantment or Illusion school — and edits
 *       the original roll in-place via CoriaRollLedger.
 *     - If the modified roll becomes a Success, applies a 1-minute symbolic status effect stating the creature
 *       is immune to illusions created by that source (no mechanical changes).
 *
 *  2. The High Priestess (Aitusa):
 *     - Used from Inventory (consumes 1 charge, 1/LR).
 *     - Casts Detect Magic (without expending a spell slot or components) AND applies a 10-minute status effect
 *       granting Truesight 30 ft (`system.attributes.senses.ranges.truesight` UPGRADE 30).
 *
 *  3. The Fool (Flinn):
 *     - Reaction button in the damage reactions bar when Flinn takes damage.
 *     - Consumes 1 charge (1/LR) and rolls 1d4:
 *       * 1–2: Halves the damage via roll-ledger (in-place edit + layer-aware refund if auto-applied) and posts
 *              a chat card stating Flinn can teleport up to 10 feet.
 *       * 3–4: Reduces the damage to 0 via roll-ledger AND deals Force damage to the damage source equal to
 *              the reduced damage (max 15 Force damage), with Undo / Re-apply controls.
 *
 *  4. The Strength (Kyrion):
 *     - Used from Inventory (Bonus Action, consumes 1 charge, 1/LR).
 *     - Rolls 1d8 + Proficiency Bonus + Constitution modifier Temporary Hit Points and applies to Kyrion.
 *     - Applies status effect `resonant-strength` that automatically appends `+1d4[psychic]` to all melee weapon
 *       attack damage rolls (`preRollDamageV2`), and automatically removes itself when Kyrion drops to 0 Temp HP.
 *
 *  5. The Moon (Parva):
 *     - Used from Inventory (Action, consumes 1 charge, 1/LR).
 *     - Targets 1 creature within 30 ft (uses targeted token or 1-click picker) and posts an interactive Wisdom
 *       Saving Throw card vs Parva's Spell Save DC:
 *       * Failure: 3d6 Psychic damage + Frightened condition until the end of Parva's next turn.
 *       * Success: Half Psychic damage, not Frightened.
 *       * Full roll-ledger support (Portent, Lucky, Silvery Barbs, Paths of Destiny, Legendary Resistance, Hierophant).
 */

import { createV2Dialog } from "./dialog-v2.js";
import { isIgnoredBackupActor } from "./sync-guard.js";

const MODULE_ID = "altarion-aitusa";
const CARD_ICON = "icons/sundries/gaming/rune-card.webp";

export class CoriaResonantArcana {
  static _initialized = false;
  static _recentUseGuard = new Map();

  static init() {
    if (this._initialized) return;
    this._initialized = true;
    globalThis.CoriaResonantArcana = this;

    this._registerHooks();
    console.log("[Altarion & Aitusa] CoriaResonantArcana initialized (all 5 Major Arcana cards).");
  }

  /* -------------------------------------------- */
  /*  Shared Card Lookup & Charge Helpers         */
  /* -------------------------------------------- */

  static getCardKeyFromItem(item) {
    if (!item) return null;
    const flagKey = item.flags?.[MODULE_ID]?.resonantArcanaKey;
    if (flagKey) return String(flagKey).toLowerCase();
    const low = String(item.name || "").trim().toLowerCase();
    if (!low.startsWith("card of the resonant arcana")) return null;
    if (low.includes("hierophant")) return "hierophant";
    if (low.includes("high priestess")) return "high-priestess";
    if (low.includes("the fool") || low.includes("(fool)")) return "fool";
    if (low.includes("strength")) return "strength";
    if (low.includes("the moon") || low.includes("(moon)")) return "moon";
    return null;
  }

  static findCardItem(actor, cardKey) {
    if (!actor || !cardKey || isIgnoredBackupActor(actor)) return null;
    return (
      actor.items?.find(i => this.getCardKeyFromItem(i) === cardKey) || null
    );
  }

  static getCardChargeInfo(item) {
    if (!item) return { max: 0, spent: 0, remaining: 0 };
    const max = Math.max(1, Number(item.system?.uses?.max || 1));
    const spent = Math.max(0, Number(item.system?.uses?.spent || 0));
    const remaining = Math.max(0, max - spent);
    return { max, spent, remaining };
  }

  static async consumeCardCharge(item) {
    if (!item) return false;
    const { max, spent, remaining } = this.getCardChargeInfo(item);
    if (remaining <= 0) return false;
    await item.update({
      "system.uses.max": String(max),
      "system.uses.spent": Math.min(max, spent + 1)
    });
    return true;
  }

  static _isDuplicateActivation(actorId, cardKey) {
    const key = `${actorId}:${cardKey}`;
    const now = Date.now();
    const prev = this._recentUseGuard.get(key) || 0;
    if (now - prev < 1800) return true;
    this._recentUseGuard.set(key, now);
    return false;
  }

  /* -------------------------------------------- */
  /*  Core Hooks                                  */
  /* -------------------------------------------- */

  static _registerHooks() {
    // 1. Inventory Activation for The High Priestess, The Strength, and The Moon
    Hooks.on("dnd5e.postUseActivity", async (activity, usageConfig, _results) => {
      try {
        const item = activity?.item;
        const actor = item?.actor;
        if (!item || !actor || !actor.isOwner || isIgnoredBackupActor(actor)) return;

        const cardKey = this.getCardKeyFromItem(item);
        if (!cardKey) return;

        // Only inventory-activated cards trigger automatically on use
        if (cardKey !== "high-priestess" && cardKey !== "strength" && cardKey !== "moon") return;
        if (this._isDuplicateActivation(actor.id, cardKey)) return;

        // If the activity didn't automatically consume the item's charge, consume it now
        const activityConsumedItemUses = Boolean(
          usageConfig?.consume?.resources !== false &&
            Array.isArray(activity?.consumption?.targets) &&
            activity.consumption.targets.some(t => t?.type === "itemUses")
        );
        if (!activityConsumedItemUses) {
          const { remaining } = this.getCardChargeInfo(item);
          if (remaining <= 0) {
            ui.notifications?.warn?.(`${item.name} has no charges remaining (recovers on Long Rest).`);
            return;
          }
          await this.consumeCardCharge(item);
        }

        if (cardKey === "high-priestess") {
          await this.activateHighPriestess(actor, item);
        } else if (cardKey === "strength") {
          await this.activateStrength(actor, item);
        } else if (cardKey === "moon") {
          await this.activateMoon(actor, item);
        }
      } catch (err) {
        console.warn("[CoriaResonantArcana] Error in postUseActivity:", err);
      }
    });

    // 2. The Strength (Kyrion): Automatically add +1d4[psychic] to all melee weapon attacks while status & Temp HP active
    Hooks.on("dnd5e.preRollDamageV2", (config, _dialog, message) => {
      try {
        const activity = config?.subject;
        const item = activity?.item;
        const actor = activity?.actor || item?.actor;
        if (!actor || !item || isIgnoredBackupActor(actor)) return;

        const AM = globalThis.AltarionAutomationManager;
        if (!AM?.hasStatus?.(actor, "resonant-strength")) return;

        // Must still have Temporary Hit Points > 0
        const curTemp = Number(actor.system?.attributes?.hp?.temp ?? 0);
        if (curTemp <= 0) return;

        // Check if this is a Melee Weapon Attack
        const atkTypeVal = String(activity?.attack?.type?.value || "").toLowerCase();
        const atkClass = String(activity?.attack?.type?.classification || "").toLowerCase();
        const actionType = String(activity?.actionType || item.system?.actionType || "").toLowerCase();
        const weaponType = String(item.system?.type?.value || "").toLowerCase();

        const isExplicitMeleeWeapon =
          (atkTypeVal === "melee" && atkClass === "weapon") || actionType === "mwak";
        const isMeleeWeaponItem =
          item.type === "weapon" &&
          atkTypeVal !== "ranged" &&
          (atkTypeVal === "melee" ||
            weaponType === "simplem" ||
            weaponType === "martialm" ||
            weaponType === "natural");

        if (!isExplicitMeleeWeapon && !isMeleeWeaponItem) return;

        if (config.rolls?.[0]) {
          config.rolls[0].parts = config.rolls[0].parts || [];
          const alreadyHas = config.rolls[0].parts.some(p => String(p).includes("1d4[psychic]"));
          if (!alreadyHas) {
            config.rolls[0].parts.push("1d4[psychic]");
          }
          if (message?.data) {
            const curFlavor = String(message.data.flavor || item.name || "");
            if (!curFlavor.includes("The Strength")) {
              message.data.flavor = `${curFlavor} [The Strength +1d4 Psychic]`;
            }
          }
        }
      } catch (err) {
        console.warn("[CoriaResonantArcana] preRollDamageV2 error (The Strength):", err);
      }
    });

    // 3. The Strength (Kyrion): Auto-remove status effect when Temporary Hit Points drop to 0
    Hooks.on("updateActor", async (actor, changed, _options, userId) => {
      try {
        if (game.user?.id !== userId) return;
        if (!actor?.isOwner || isIgnoredBackupActor(actor)) return;
        if (!changed?.system?.attributes?.hp || !("temp" in changed.system.attributes.hp)) return;

        const newTemp = Number(actor.system?.attributes?.hp?.temp ?? 0);
        if (newTemp > 0) return;

        const AM = globalThis.AltarionAutomationManager;
        if (!AM?.hasStatus?.(actor, "resonant-strength")) return;

        await AM.removeStatusEffect(actor, "resonant-strength");
        ui.notifications?.info?.(
          `[The Strength] ${actor.name} reached 0 Temporary Hit Points — "+1d4 Psychic Melee" effect ended.`
        );
      } catch (_e) {}
    });

    // 4. Bind manual "Apply Illusion Immunity (1 min)" fallback button on The Hierophant chat cards
    Hooks.on("renderChatMessageHTML", (_message, html) => {
      try {
        const rootEl = html instanceof HTMLElement ? html : html?.[0];
        if (!rootEl) return;
        for (const btn of rootEl.querySelectorAll(".coria-hierophant-immunity-btn")) {
          if (btn.dataset.boundHierophantImm) continue;
          btn.dataset.boundHierophantImm = "true";
          btn.addEventListener("click", async (ev) => {
            ev.preventDefault();
            ev.stopPropagation();
            const targetUuid = btn.getAttribute("data-target-uuid") || "";
            const targetActorId = btn.getAttribute("data-target-actor-id") || "";
            const sourceName = btn.getAttribute("data-source-name") || "the caster";
            const AM = globalThis.AltarionAutomationManager;
            const targetActor = await AM?.resolveActorFromUuidOrId?.(targetUuid, targetActorId);
            if (!targetActor || !targetActor.isOwner) {
              ui.notifications?.warn?.("Apenas o Mestre ou o dono da criatura pode aplicar este efeito.");
              return;
            }
            await this.applyHierophantIllusionImmunity(targetActor, sourceName);
            btn.disabled = true;
            btn.innerHTML = `<i class="fas fa-check"></i> Immunity Applied (1 min)`;
          });
        }
      } catch (_e) {}
    });
  }

  /* -------------------------------------------- */
  /*  1. THE HIEROPHANT (Altarion — Spell Save)   */
  /* -------------------------------------------- */

  /**
   * Detect whether a Saving Throw message was triggered by a Spell, and extract its Spell School & Source Name.
   * Checks originatingMessage -> item flags -> linkedSaveCard -> recent spell chat card (within 45s).
   */
  static detectSpellSaveContext(message) {
    if (!message) return { isSpell: false, school: "", spellName: "", sourceName: "" };

    const resolveFromSpellDoc = (doc, fallbackSource = "") => {
      if (!doc || doc.type !== "spell") return null;
      return {
        isSpell: true,
        school: String(doc.system?.school || "").toLowerCase(),
        spellName: doc.name || "Spell",
        sourceName: doc.actor?.name || fallbackSource || "the spellcaster"
      };
    };

    // 1. Direct linkedSaveCard (e.g., Spirit Guardians, Shadow Rebuke)
    const linked = message.flags?.[MODULE_ID]?.linkedSaveCard;
    if (linked?.cardType === "spirit-guardians" || linked?.cardType === "shadow-rebuke") {
      const cardMsg = linked.cardMessageId ? game.messages?.get(linked.cardMessageId) : null;
      const casterId = cardMsg?.flags?.[MODULE_ID]?.interactiveSaveCard?.casterActorId;
      const caster = casterId ? game.actors?.get(casterId) : null;
      return {
        isSpell: true,
        school: linked.cardType === "spirit-guardians" ? "con" : "evo",
        spellName: linked.cardType === "spirit-guardians" ? "Spirit Guardians" : "Shadow Rebuke",
        sourceName: caster?.name || "the spellcaster"
      };
    }

    // 2. Originating message via dnd5e flags
    const origMsgId = message.flags?.dnd5e?.originatingMessage;
    if (origMsgId) {
      const origMsg = game.messages?.get(origMsgId);
      if (origMsg) {
        const origSpeaker = origMsg.speaker?.alias || game.actors?.get(origMsg.speaker?.actor)?.name || "";
        const itemUuid = origMsg.flags?.dnd5e?.use?.itemUuid || origMsg.flags?.dnd5e?.item?.uuid;
        if (itemUuid && typeof fromUuidSync === "function") {
          try {
            const doc = fromUuidSync(itemUuid);
            const res = resolveFromSpellDoc(doc, origSpeaker);
            if (res) return res;
          } catch (_e) {}
        }
        if (origMsg.flags?.dnd5e?.item?.type === "spell") {
          const spId = origMsg.flags?.dnd5e?.item?.id;
          const origActor =
            ChatMessage.getSpeakerActor?.(origMsg.speaker) ||
            (origMsg.speaker?.actor ? game.actors?.get(origMsg.speaker.actor) : null);
          const spDoc = spId && origActor?.items?.get(spId);
          if (spDoc) {
            const res = resolveFromSpellDoc(spDoc, origSpeaker);
            if (res) return res;
          }
          return {
            isSpell: true,
            school: String(origMsg.flags?.dnd5e?.item?.school || "").toLowerCase(),
            spellName: origMsg.flags?.dnd5e?.item?.name || "Spell",
            sourceName: origSpeaker || "the spellcaster"
          };
        }
      }
    }

    // 3. Item UUID directly on the save message
    const directUuid = message.flags?.dnd5e?.use?.itemUuid || message.flags?.dnd5e?.item?.uuid;
    if (directUuid && typeof fromUuidSync === "function") {
      try {
        const doc = fromUuidSync(directUuid);
        const res = resolveFromSpellDoc(doc, "");
        if (res) return res;
      } catch (_e) {}
    }

    // 4. Fallback: Look back through recent messages (last 45s) for a spell card preceding a manual save roll
    const msgTs = Number(message.timestamp || Date.now());
    const recentMsgs = Array.from(game.messages || []).slice(-12).reverse();
    for (const m of recentMsgs) {
      if (!m || m.id === message.id) continue;
      const mTs = Number(m.timestamp || 0);
      if (mTs > msgTs) continue;
      if (msgTs - mTs > 45000) break;

      const mItemUuid = m.flags?.dnd5e?.use?.itemUuid || m.flags?.dnd5e?.item?.uuid;
      const mSpeaker = m.speaker?.alias || game.actors?.get(m.speaker?.actor)?.name || "";
      if (mItemUuid && typeof fromUuidSync === "function") {
        try {
          const doc = fromUuidSync(mItemUuid);
          if (doc?.type === "spell") {
            return resolveFromSpellDoc(doc, mSpeaker);
          }
          // If a non-spell weapon/feat activity was cast more recently, stop looking further back
          if (doc && doc.type !== "spell" && (m.flags?.dnd5e?.activity || m.flags?.dnd5e?.use)) {
            break;
          }
        } catch (_e) {}
      }
      if (m.flags?.dnd5e?.item?.type === "spell") {
        const origActor =
          ChatMessage.getSpeakerActor?.(m.speaker) ||
          (m.speaker?.actor ? game.actors?.get(m.speaker.actor) : null);
        const spDoc = m.flags?.dnd5e?.item?.id ? origActor?.items?.get(m.flags.dnd5e.item.id) : null;
        if (spDoc) return resolveFromSpellDoc(spDoc, mSpeaker);
        return {
          isSpell: true,
          school: String(m.flags?.dnd5e?.item?.school || "").toLowerCase(),
          spellName: m.flags?.dnd5e?.item?.name || "Spell",
          sourceName: mSpeaker || "the spellcaster"
        };
      }
    }

    return { isSpell: false, school: "", spellName: "", sourceName: "" };
  }

  /**
   * Build the chat reaction button HTML for Altarion's "The Hierophant" if eligible:
   * - Saving throw against a spell (failed, or unknown DC and not marked success)
   * - Target creature is within 30 ft of Altarion
   * - Altarion has The Hierophant with >= 1 charge remaining
   * - Current user is GM or controls Altarion
   */
  static buildHierophantButtonHtml({
    message = null,
    isSavingThrow = false,
    rawType = "",
    rollerActor = null,
    rollerTok = null,
    rollerName = "Creature",
    origNat = 10,
    origTotal = 10,
    saveDc = NaN,
    domHasSuccess = false,
    modState = null,
    inlineCardSpellInfo = null,
    inlineDataAttrs = ""
  } = {}) {
    if (!isSavingThrow || rawType === "death" || rawType === "concentration") return "";
    if (modState?.forceSuccess || modState?.isSuccess === true) return "";

    const AM = globalThis.AltarionAutomationManager;
    const FM = globalThis.FlinnManager;
    if (!AM || !FM) return "";

    const altarion = AM.getAltarionActor?.();
    if (!altarion || !FM.isUserControllerOf(altarion)) return "";

    const cardItem = this.findCardItem(altarion, "hierophant");
    const charge = this.getCardChargeInfo(cardItem);
    if (!cardItem || charge.remaining <= 0) return "";

    // Check failure status
    const hasKnownDc = Number.isFinite(Number(saveDc));
    const failedSave = hasKnownDc
      ? origNat === 1 || origTotal < Number(saveDc)
      : !domHasSuccess;
    if (!failedSave) return "";

    // Check spell context
    const spellCtx = inlineCardSpellInfo || this.detectSpellSaveContext(message);
    if (!spellCtx?.isSpell) return "";

    // Check distance <= 30 ft from Altarion
    const altarionTok = AM.getActorCanvasToken(altarion);
    const rTok = rollerTok || (rollerActor ? AM.getActorCanvasToken(rollerActor) : null);
    if (altarionTok && rTok && altarionTok.id !== rTok.id) {
      const dist = AM.getTokenDistanceFt(altarionTok, rTok);
      if (dist !== null && dist > 30) return "";
    }

    const schoolLow = String(spellCtx.school || "").toLowerCase();
    const isAdvSchool =
      schoolLow === "enc" ||
      schoolLow === "ill" ||
      schoolLow === "enchantment" ||
      schoolLow === "illusion";
    const advTag = isAdvSchool ? " [Advantage!]" : "";
    const extraCls = inlineDataAttrs ? "coria-inline-save-react-btn" : "";

    return `
      <button type="button" class="coria-d20-react-btn ${extraCls} btn-cleric-gold"
              data-react-type="the-hierophant"
              data-caster-id="${altarion.id}"
              data-spell-school="${foundry.utils.escapeHTML(schoolLow)}"
              data-spell-name="${foundry.utils.escapeHTML(spellCtx.spellName || "Spell")}"
              data-spell-source="${foundry.utils.escapeHTML(spellCtx.sourceName || "the spellcaster")}"
              data-save-dc="${hasKnownDc ? Number(saveDc) : ""}"
              ${inlineDataAttrs}
              title="Card of the Resonant Arcana (The Hierophant — ${charge.remaining}/${charge.max}): Reroll ${foundry.utils.escapeHTML(rollerName)}'s failed save against ${foundry.utils.escapeHTML(spellCtx.spellName || "this spell")}${isAdvSchool ? " WITH ADVANTAGE (Enchantment/Illusion)!" : ""}. On success, grants 1-minute immunity to illusions from ${foundry.utils.escapeHTML(spellCtx.sourceName || "the source")}.">
        <i class="fas fa-scroll"></i> The Hierophant${advTag} (${charge.remaining}/${charge.max})
      </button>
    `;
  }

  static async applyHierophantIllusionImmunity(targetActor, sourceName = "the spellcaster") {
    const AM = globalThis.AltarionAutomationManager;
    if (!AM || !targetActor) return;
    await AM.applyOrUpdateStatusEffect(targetActor, {
      statusId: "hierophant-illusion-immunity",
      name: `The Hierophant: Immune to Illusions (${sourceName})`,
      img: CARD_ICON,
      description: `<p><strong>Card of the Resonant Arcana (The Hierophant):</strong> Having succeeded on the rerolled saving throw, <strong>${foundry.utils.escapeHTML(targetActor.name)}</strong> is <strong>immune to illusions created by ${foundry.utils.escapeHTML(sourceName)}</strong> for <strong>1 minute</strong>.</p>`,
      changes: [],
      durationSeconds: 60,
      durationRounds: 10,
      extraFlags: {
        isHierophantIllusionImmunity: true,
        illusionSourceName: sourceName
      }
    });
  }

  static async executeHierophantReaction({
    casterId = "",
    speakerActor = null,
    rollerUuid = "",
    rollerActorId = "",
    rollerName = "Creature",
    origNat = 10,
    origTotal = 10,
    flatBonus = 0,
    bonusStr = "+ 0",
    originMsgId = "",
    cardMsgId = "",
    targetKey = "",
    spellSchool = "",
    spellName = "Spell",
    spellSource = "the spellcaster",
    saveDcAttr = ""
  } = {}) {
    const AM = globalThis.AltarionAutomationManager;
    const FM = globalThis.FlinnManager;
    const RL = globalThis.CoriaRollLedger;
    if (!AM || !FM || !RL) return;

    const altarion = (casterId && game.actors?.get(casterId)) || AM.getAltarionActor?.();
    if (!altarion || !FM.isUserControllerOf(altarion)) return;

    const cardItem = this.findCardItem(altarion, "hierophant");
    const charge = this.getCardChargeInfo(cardItem);
    if (!cardItem || charge.remaining <= 0) {
      ui.notifications?.warn?.("Card of the Resonant Arcana (The Hierophant) has no charges remaining!");
      return;
    }

    const okSpent = await this.consumeCardCharge(cardItem);
    if (!okSpent) return;

    const schoolLow = String(spellSchool || "").toLowerCase();
    const isAdvSchool =
      schoolLow === "enc" ||
      schoolLow === "ill" ||
      schoolLow === "enchantment" ||
      schoolLow === "illusion";
    const schoolDisplay =
      schoolLow === "enc" || schoolLow === "enchantment"
        ? "Enchantment"
        : schoolLow === "ill" || schoolLow === "illusion"
          ? "Illusion"
          : "";

    // Roll 2d20kh1 if Enchantment/Illusion, otherwise 1d20
    const rollFormula = isAdvSchool ? "2d20kh1" : "1d20";
    const reroll = await new Roll(rollFormula).evaluate();
    try {
      if (game.dice3d) await game.dice3d.showForRoll(reroll, game.user, true);
    } catch (_e) {}

    const dieResults = (reroll.dice?.[0]?.results || []).map(r => Number(r.result));
    const newNat = Number(reroll.total || 10);
    const newTotal = newNat + Number(flatBonus || 0);

    const originMsg = originMsgId ? game.messages?.get(originMsgId) : null;
    const parsedDc = Number(
      saveDcAttr ||
        originMsg?.flags?.[MODULE_ID]?.rollModState?.currentTarget ||
        originMsg?.flags?.[MODULE_ID]?.rollLedger?.dc ||
        originMsg?.flags?.[MODULE_ID]?.linkedSaveCard?.saveDc ||
        originMsg?.rolls?.[0]?.options?.target ||
        originMsg?.flags?.dnd5e?.roll?.target ||
        NaN
    );
    const hasDc = Number.isFinite(parsedDc);

    const sourceLabel = isAdvSchool
      ? `The Hierophant (Advantage — ${schoolDisplay})`
      : "The Hierophant";

    // Edit original roll & re-evaluate consequences via roll-ledger!
    await RL.applyRollIntervention({
      rollMessageId: originMsgId,
      cardMessageId: cardMsgId,
      targetKey,
      rollerActorId: rollerActorId || speakerActor?.id || "",
      newTotal,
      newNat,
      sourceLabel
    });

    // Determine whether the rerolled save succeeded
    const refreshedOrigMsg = originMsgId ? game.messages?.get(originMsgId) : null;
    const updatedMod = refreshedOrigMsg?.flags?.[MODULE_ID]?.rollModState || null;
    const succeeded =
      updatedMod?.isSuccess === true || (hasDc && newTotal >= parsedDc);

    const targetActor =
      speakerActor ||
      (await AM.resolveActorFromUuidOrId?.(rollerUuid, rollerActorId));

    let immunityLine = "";
    let fallbackBtnHtml = "";

    if (succeeded) {
      if (targetActor?.isOwner) {
        await this.applyHierophantIllusionImmunity(targetActor, spellSource || "the spellcaster");
        immunityLine = `<br>&bull; <strong class="coria-hl-success">Save Succeeded!</strong> Applied <strong>1-minute Illusion Immunity</strong> against illusions created by <strong>${foundry.utils.escapeHTML(spellSource)}</strong>!`;
      } else {
        immunityLine = `<br>&bull; <strong class="coria-hl-success">Save Succeeded!</strong> <strong>${foundry.utils.escapeHTML(rollerName)}</strong> is immune to illusions created by <strong>${foundry.utils.escapeHTML(spellSource)}</strong> for 1 minute.`;
        fallbackBtnHtml = `
          <button type="button" class="coria-hierophant-immunity-btn coria-min-card-btn-primary"
                  data-target-uuid="${targetActor?.uuid || rollerUuid || ""}"
                  data-target-actor-id="${targetActor?.id || rollerActorId || ""}"
                  data-source-name="${foundry.utils.escapeHTML(spellSource)}">
            <i class="fas fa-eye-slash"></i> Apply Illusion Immunity (1 min)
          </button>
        `;
      }
    } else if (!hasDc && targetActor) {
      // Unknown hidden GM DC: provide a 1-click button so GM/player can apply the symbolic immunity if it passed
      fallbackBtnHtml = `
        <button type="button" class="coria-hierophant-immunity-btn coria-min-card-btn-secondary"
                data-target-uuid="${targetActor?.uuid || rollerUuid || ""}"
                data-target-actor-id="${targetActor?.id || rollerActorId || ""}"
                data-source-name="${foundry.utils.escapeHTML(spellSource)}">
          <i class="fas fa-eye-slash"></i> If Save Succeeded: Apply Illusion Immunity (1 min)
        </button>
      `;
    } else {
      immunityLine = `<br>&bull; <strong class="coria-hl-failure">Save Still Failed (${newTotal} vs DC ${parsedDc}).</strong>`;
    }

    const diceNote = isAdvSchool
      ? `<strong>Advantage (${schoolDisplay} Spell)</strong> — rolled [${dieResults.join(", ")}] &rarr; kept <strong>${newNat}</strong>`
      : `rolled <strong>${newNat}</strong>`;

    await AM.sendMinimalistFeatureCard(altarion, {
      icon: "fa-scroll",
      title: `The Hierophant — Spell Save Rerolled (${newTotal})!`,
      bodyHtml: `
        <strong>${foundry.utils.escapeHTML(altarion.name)}</strong> expended <strong>Card of the Resonant Arcana (The Hierophant)</strong> (0/1 charge left) to let <strong>${foundry.utils.escapeHTML(rollerName)}</strong> reroll their failed save against <strong>${foundry.utils.escapeHTML(spellName)}</strong>!<br>
        &bull; <strong>Original Save (d20 = ${origNat}):</strong> ${origNat} ${bonusStr} = <strong>${origTotal}</strong><br>
        &bull; <strong>New Save (${diceNote}):</strong> ${newNat} ${bonusStr} = <strong>${newTotal}</strong>${hasDc ? ` (vs DC ${parsedDc})` : ""}${immunityLine}
      `,
      buttonsHtml: fallbackBtnHtml,
      flags: {
        isD20ReactionCard: true,
        isResonantArcanaCard: true,
        chatChannel: "combat",
        originRollMessageId: originMsgId
      }
    });
  }

  /* -------------------------------------------- */
  /*  2. THE HIGH PRIESTESS (Aitusa)              */
  /* -------------------------------------------- */

  static async activateHighPriestess(actor, item) {
    const AM = globalThis.AltarionAutomationManager;
    if (!AM || !actor) return;

    // 1. Apply 10-minute Truesight 30 ft ActiveEffect
    await AM.applyOrUpdateStatusEffect(actor, {
      statusId: "high-priestess-truesight",
      name: "The High Priestess — Truesight (30 ft)",
      img: CARD_ICON,
      description: `<p><strong>Card of the Resonant Arcana (The High Priestess):</strong> You cast <em>Detect Magic</em> without expending a spell slot or requiring components, and gain <strong>Truesight out to 30 feet</strong> for <strong>10 minutes</strong>.</p>`,
      changes: [
        {
          key: "system.attributes.senses.ranges.truesight",
          mode: CONST.ACTIVE_EFFECT_MODES.UPGRADE,
          value: "30",
          priority: 20
        }
      ],
      durationSeconds: 600,
      durationRounds: 100,
      extraFlags: {
        isHighPriestessTruesight: true
      }
    });

    // 2. Cast Detect Magic (without expending a spell slot or requiring components!)
    const detectMagicSpell = actor.items?.find(
      i => i.type === "spell" && String(i.name || "").trim().toLowerCase() === "detect magic"
    );
    let detectMagicConcNote = "";
    try {
      if (detectMagicSpell && typeof actor.beginConcentrating === "function") {
        await actor.beginConcentrating(detectMagicSpell);
        detectMagicConcNote = " (Concentration started automatically)";
      } else {
        await AM.applyOrUpdateStatusEffect(actor, {
          statusId: "detect-magic-card",
          name: "Detect Magic (The High Priestess)",
          img: detectMagicSpell?.img || "icons/magic/unholy/hands-cloud-light-pink.webp",
          description: `<p><strong>Detect Magic (Concentration, 10 minutes):</strong> For the duration, you sense the presence of magic within 30 feet of you. If you sense magic in this way, you can use your action to see a faint aura around any visible creature or object in the area that bears magic, and you learn its school of magic, if any.</p>`,
          changes: [],
          durationSeconds: 600,
          durationRounds: 100,
          extraFlags: { isDetectMagicCardEffect: true }
        });
      }
    } catch (_e) {
      // ignore if concentration helper differs
    }

    await AM.sendMinimalistFeatureCard(actor, {
      icon: "fa-eye",
      title: "The High Priestess — Detect Magic & Truesight (30 ft)!",
      bodyHtml: `
        <strong>${foundry.utils.escapeHTML(actor.name)}</strong> expended <strong>Card of the Resonant Arcana (The High Priestess)</strong> (0/1 charge left, recovers on Long Rest)!<br>
        &bull; <strong>Detect Magic Cast:</strong> Cast <em>Detect Magic</em> without expending a spell slot or requiring components (10 minutes, 30 ft aura detection)${detectMagicConcNote}.<br>
        &bull; <strong>Truesight Applied:</strong> Status effect applied granting <strong>Truesight 30 ft</strong> for <strong>10 minutes</strong>!
      `,
      flags: {
        isResonantArcanaCard: true,
        chatChannel: "combat"
      }
    });
  }

  /* -------------------------------------------- */
  /*  3. THE FOOL (Flinn — Damage Reaction 1d4)   */
  /* -------------------------------------------- */

  static buildTheFoolButtonHtml({ flinn, candidateVictims, dmgInfo } = {}) {
    const FM = globalThis.FlinnManager;
    if (!flinn || !FM?.isUserControllerOf?.(flinn)) return "";
    if (!candidateVictims?.some(v => v?.id === flinn.id)) return "";
    if (!dmgInfo || Number(dmgInfo.currentTotalDamage || 0) <= 0) return "";

    const cardItem = this.findCardItem(flinn, "fool");
    const charge = this.getCardChargeInfo(cardItem);
    if (!cardItem || charge.remaining <= 0) return "";

    return `
      <button type="button" class="coria-dmg-react-btn btn-cleric-gold"
              data-dmg-react="the-fool"
              data-caster-id="${flinn.id}"
              data-victim-id="${flinn.id}"
              data-victim-uuid="${flinn.uuid || ""}"
              title="Card of the Resonant Arcana (The Fool — ${charge.remaining}/${charge.max}): Reação ao sofrer dano — Rola 1d4 (1-2: Metade do dano + teleporte 10 ft | 3-4: Dano 0 + reflete até 15 de dano Force no atacante)">
        <i class="fas fa-hat-wizard"></i> The Fool — Warp Probability (${charge.remaining}/${charge.max})
      </button>
    `;
  }

  static async executeTheFoolReaction({ flinn, damageMessageId } = {}) {
    const FM = globalThis.FlinnManager;
    const RL = globalThis.CoriaRollLedger;
    if (!flinn || !FM?.isUserControllerOf?.(flinn) || !RL) return;

    const cardItem = this.findCardItem(flinn, "fool");
    const charge = this.getCardChargeInfo(cardItem);
    if (!cardItem || charge.remaining <= 0) {
      ui.notifications?.warn?.("Card of the Resonant Arcana (The Fool) has no charges remaining!");
      return;
    }

    const okSpent = await this.consumeCardCharge(cardItem);
    if (!okSpent) return;

    const d4Roll = await new Roll("1d4").evaluate();
    try {
      if (game.dice3d) await game.dice3d.showForRoll(d4Roll, game.user, true);
    } catch (_e) {}

    const foolRoll = Math.clamp(Number(d4Roll.total || 1), 1, 4);

    await RL.applyDamageReactionModification({
      reactType: "the-fool",
      damageMessageId,
      casterId: flinn.id,
      victimId: flinn.id,
      victimUuid: flinn.uuid || "",
      foolRoll
    });
  }

  /* -------------------------------------------- */
  /*  4. THE STRENGTH (Kyrion — Temp HP + 1d4)    */
  /* -------------------------------------------- */

  static async activateStrength(actor, _item) {
    const AM = globalThis.AltarionAutomationManager;
    if (!AM || !actor) return;

    const prof = Number(actor.system?.attributes?.prof ?? 2);
    const conMod = Number(actor.system?.abilities?.con?.mod ?? 0);
    const conStr = conMod >= 0 ? `+ ${conMod}` : `- ${Math.abs(conMod)}`;
    const formula = `1d8 + ${prof} ${conStr}`;

    const roll = await new Roll(formula).evaluate();
    try {
      if (game.dice3d) await game.dice3d.showForRoll(roll, game.user, true);
    } catch (_e) {}

    const rolledTempHp = Math.max(1, Number(roll.total || 1));
    const curTemp = Number(actor.system?.attributes?.hp?.temp ?? 0);
    const finalTemp = Math.max(curTemp, rolledTempHp);

    if (typeof actor.applyTempHP === "function") {
      await actor.applyTempHP(rolledTempHp);
    } else if (finalTemp > curTemp) {
      await actor.update(
        { "system.attributes.hp.temp": finalTemp },
        { altarionBypassWard: true, coriaDamageReactionInternal: true, coriaDarkVitalityBypass: true }
      );
    }

    await AM.applyOrUpdateStatusEffect(actor, {
      statusId: "resonant-strength",
      name: "The Strength (+1d4 Psychic Melee)",
      img: CARD_ICON,
      description: `<p><strong>Card of the Resonant Arcana (The Strength):</strong> You tamed your inner essence for 1 minute, gaining <strong>+${rolledTempHp} Temporary Hit Points</strong>. While you have Temporary Hit Points, your melee weapon attacks automatically deal an extra <strong>+1d4 Psychic damage</strong> (ends automatically if your Temporary Hit Points drop to 0).</p>`,
      changes: [],
      durationSeconds: 60,
      durationRounds: 10,
      extraFlags: {
        isResonantStrengthEffect: true,
        rolledTempHp
      }
    });

    await AM.sendMinimalistFeatureCard(actor, {
      icon: "fa-fist-raised",
      title: `The Strength — +${rolledTempHp} Temp HP & +1d4 Psychic Melee!`,
      bodyHtml: `
        <strong>${foundry.utils.escapeHTML(actor.name)}</strong> expended <strong>Card of the Resonant Arcana (The Strength)</strong> (0/1 charge left, recovers on Long Rest)!<br>
        &bull; <strong>Temporary HP Roll (<code>${formula}</code>):</strong> Rolled <strong>${rolledTempHp}</strong> &rarr; Applied <strong>${finalTemp} Temporary Hit Points</strong>!<br>
        &bull; <strong>Inner Essence Armed:</strong> Status effect active for 1 minute — automatically adds <strong>+1d4 Psychic damage</strong> to all melee weapon attacks until Temporary Hit Points reach 0.
      `,
      flags: {
        isResonantArcanaCard: true,
        chatChannel: "combat"
      }
    });
  }

  /* -------------------------------------------- */
  /*  5. THE MOON (Parva — Interactive WIS Save)  */
  /* -------------------------------------------- */

  static async activateMoon(actor, _item) {
    const AM = globalThis.AltarionAutomationManager;
    if (!AM || !actor) return;

    const parvaTok = AM.getActorCanvasToken(actor);

    // 1. Check currently targeted tokens first
    let targetToken = Array.from(game.user?.targets || [])[0] || null;
    let targetActor = targetToken?.actor || null;

    // 2. If no token was targeted, let Parva pick any visible creature within 30 ft (or on scene) in 1 click!
    if (!targetActor) {
      const candidates = [];
      for (const tok of canvas?.tokens?.placeables || []) {
        if (!tok?.actor || !tok.visible) continue;
        if (tok.actor.id === actor.id) continue;
        const dist =
          parvaTok && tok.id !== parvaTok.id
            ? AM.getTokenDistanceFt(parvaTok, tok)
            : null;
        candidates.push({ tok, actor: tok.actor, dist });
      }
      candidates.sort((a, b) => {
        const aIn = a.dist !== null && a.dist <= 30 ? 0 : 1;
        const bIn = b.dist !== null && b.dist <= 30 ? 0 : 1;
        if (aIn !== bIn) return aIn - bIn;
        return (a.dist ?? 999) - (b.dist ?? 999);
      });

      if (candidates.length === 0) {
        ui.notifications?.warn?.("[The Moon] Target a creature within 30 feet on the map first!");
        return;
      }

      const chosenTokId = await new Promise((resolve) => {
        let settled = false;
        const optsHtml = candidates
          .map(c => {
            const distTxt = c.dist !== null ? ` (${Math.round(c.dist)} ft${c.dist <= 30 ? "" : " — >30 ft!"})` : "";
            return `<option value="${c.tok.id}">${foundry.utils.escapeHTML(c.tok.name || c.actor.name)}${distTxt}</option>`;
          })
          .join("");

        createV2Dialog(
          {
            title: "The Moon — Select Target (30 ft)",
            content: `
              <div style="padding: 6px 0;">
                <p style="margin-bottom: 8px;">Select the creature within <strong>30 feet</strong> to target with <strong>Card of the Resonant Arcana (The Moon)</strong> (WIS Save vs Spell Save DC, 3d6 Psychic + Frightened):</p>
                <div class="form-group">
                  <select id="coria-moon-target-select" style="width: 100%; font-weight: 600;">
                    ${optsHtml}
                  </select>
                </div>
              </div>
            `,
            buttons: {
              cast: {
                icon: '<i class="fas fa-moon"></i>',
                label: "Unleash The Moon",
                callback: (html) => {
                  const root = html instanceof HTMLElement ? html : html?.[0];
                  settled = true;
                  resolve(root?.querySelector("#coria-moon-target-select")?.value || null);
                }
              },
              cancel: {
                icon: '<i class="fas fa-times"></i>',
                label: "Cancel",
                callback: () => {
                  settled = true;
                  resolve(null);
                }
              }
            },
            default: "cast",
            close: () => {
              if (!settled) resolve(null);
            }
          },
          { width: 420 }
        ).render(true);
      });

      if (!chosenTokId) return;
      targetToken = canvas?.tokens?.get?.(chosenTokId) || null;
      targetActor = targetToken?.actor || null;
      if (!targetActor) return;
    }

    // Warn gently if target is beyond 30 ft, while still allowing execution
    if (parvaTok && targetToken && parvaTok.id !== targetToken.id) {
      const dist = AM.getTokenDistanceFt(parvaTok, targetToken);
      if (dist !== null && dist > 30) {
        ui.notifications?.warn?.(
          `[The Moon] Note: ${targetToken.name} is ${Math.round(dist)} ft away (card range is 30 ft).`
        );
      }
    }

    await AM.postResonantMoonInteractiveSaveCard({
      parva: actor,
      targetActor,
      targetUuid: targetActor.uuid || targetToken?.document?.uuid || "",
      targetName: targetToken?.name || targetActor.name || "Target"
    });
  }
}
