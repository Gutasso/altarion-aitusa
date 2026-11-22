/**
 * CoriaRollLedger — Transactional Roll Outcome & Consequence Re-Evaluation Engine for FoundryVTT v13 (dnd5e 5.x)
 *
 * Ensures that whenever a roll or its outcome is modified by a reaction/feature:
 *   - Portent (Flinn)
 *   - Lucky Feat (Flinn)
 *   - Halfling Lucky (Flinn)
 *   - Paths of Destiny (Flinn)
 *   - Silvery Barbs (Flinn / Altarion / any caster)
 *   - Shield (Altarion / Aitusa / Flinn / Parva / any caster)
 *
 * 1. The ORIGINAL Roll ChatMessage (`originMsgId`) is edited in-place:
 *    - Its `D20Roll` active d20 face and total are updated in the database (`message.rolls`).
 *    - Its visual total, Critical/Fumble/Success/Failure/Hit/Miss styling, and target evaluation badge are updated.
 *    - A clear Modification History Banner is rendered inside the original roll card.
 *
 * 2. The Roll's Automated Consequences are transactionally reverted and recalculated using a per-message
 *    ledger (`message.flags["altarion-aitusa"].rollLedger`), working reliably even if multiple other rolls
 *    were made afterwards (e.g., modifying the 2nd of 3 consecutive saving throws while preserving the 1st and 3rd):
 *    - Arcane Plague:
 *      * Long Rest Constitution Save (EC & DC progression + Kyrion Wisdom save trigger)
 *      * Parva's "O Dízimo Arcano" Persuasion Check (Warlock Pact slot block vs CON save fallback)
 *      * Stage 6 Terminal Collapse CON Save (8d6 Force damage rollback / application)
 *      * Kyrion's Wisdom Save against ???? (1d4 hours control outcome card)
 *    - Flinn's Intuitive Arcanum (Accidental Casting) Arcana Check:
 *      * DC progression (+2 on success vs reset to 10 on failure), spell execution vs Wild Magic Surge
 *    - Spirit Guardians & Ancestral Marking Interactive Save Cards:
 *      * Exact target row matched by `(rollMessageId, cardMessageId, targetKey)`
 *      * Full <-> Half damage rollback & re-application; Ancestral Marking status apply <-> remove
 *    - Standard / Sheet Saving Throws:
 *      * Ancestral Ward, Ancestral Marking, Enchanter's Echo (Beguiling Step)
 *      * Concentration Saving Throws (auto-end concentration on new failure; auto-restore concentration & aura on new success)
 *      * Death Saving Throws (auto-adjust death save successes/failures & nat-20 1 HP heal)
 *    - Attack Rolls:
 *      * Hit <-> Miss re-evaluation (including Shield +5 AC against the triggering attack)
 *      * Automatic rollback / trigger of Ancestral Shielding (+Temp HP & AC buff restoration)
 *      * Automatic rollback / trigger of Arcane Armor / Shadow Armor / Armor of Agathys melee retaliation damage
 */

import { isIgnoredBackupActor } from "./sync-guard.js";

const MODULE_ID = "altarion-aitusa";

export class CoriaRollLedger {
  static _initialized = false;
  static _interventionLock = Promise.resolve();

  static init() {
    if (this._initialized) return;
    this._initialized = true;
    globalThis.CoriaRollLedger = this;

    this._registerHooks();
    console.log("[Altarion & Aitusa] CoriaRollLedger initialized.");
  }

  /* -------------------------------------------- */
  /*  Core Hooks: Capture & Render Decoration     */
  /* -------------------------------------------- */

  static _registerHooks() {
    // 1. Snapshot active Concentration effects right before a Concentration Saving Throw is rolled
    Hooks.on("dnd5e.preRollSavingThrowV2", (config) => {
      try {
        const actor = config?.subject;
        if (!actor) return;
        const isConc = Boolean(config?.isConcentration || config?.options?.isConcentration);
        if (!isConc) return;
        this._snapshotActorConcentration(actor);
      } catch (_e) {
        // ignore
      }
    });

    Hooks.on("dnd5e.preRollConcentrationV2", (config) => {
      try {
        const actor = config?.subject;
        if (!actor) return;
        this._snapshotActorConcentration(actor);
      } catch (_e) {
        // ignore
      }
    });

    // 2. Decorate any modified roll/damage message in chat & inject damage reaction buttons
    Hooks.on("renderChatMessageHTML", (message, html) => {
      try {
        const rootEl = html instanceof HTMLElement ? html : html?.[0];
        if (!rootEl || !message) return;
        this.decorateModifiedRollMessage(message, rootEl, { refreshReactionBar: false });
        this.decorateModifiedDamageMessage(message, rootEl);
        this.renderDamageReactionsBar(message, rootEl);
        this.bindEchoingWardUndoReapplyButtons(message, rootEl);
      } catch (err) {
        console.warn("[CoriaRollLedger] Error decorating modified roll message:", err);
      }
    });

    Hooks.on("updateChatMessage", (message) => {
      try {
        if (!message) return;
        const hasRollMod = Boolean(message.flags?.[MODULE_ID]?.rollModState);
        const hasDmgMod = Boolean(
          message.flags?.[MODULE_ID]?.damageModState ||
            message.flags?.[MODULE_ID]?.damageLedger ||
            message.flags?.[MODULE_ID]?.coriaCustomDamage
        );
        if (!hasRollMod && !hasDmgMod) return;
        for (const el of document.querySelectorAll(`[data-message-id="${message.id}"]`)) {
          if (hasRollMod) {
            this.decorateModifiedRollMessage(message, el, { refreshReactionBar: true });
          }
          if (hasDmgMod) {
            this.decorateModifiedDamageMessage(message, el);
            this.renderDamageReactionsBar(message, el, { forceRefresh: true });
          }
        }
      } catch (err) {
        console.warn("[CoriaRollLedger] Error updating modified roll message DOM:", err);
      }
    });

    // 3. Snapshot initial damage info whenever a Damage Roll ChatMessage is created
    Hooks.on("createChatMessage", async (message) => {
      try {
        if (!message || !this.isDamageRollMessage(message)) return;
        await this.captureDamageRollSnapshot(message);
      } catch (err) {
        console.warn("[CoriaRollLedger] Error capturing damage roll snapshot:", err);
      }
    });

    const registerSocket = () => {
      if (!game.socket) return;
      game.socket.on(`module.${MODULE_ID}`, async (payload) => {
        try {
          if (payload?.type === "coriaRollIntervention") {
            if (!game.user?.isGM || game.users?.activeGM?.id !== game.user.id) return;
            await this.applyRollIntervention({ ...(payload.params || {}), _fromSocket: true });
          } else if (payload?.type === "coriaDamageReaction") {
            if (!game.user?.isGM || game.users?.activeGM?.id !== game.user.id) return;
            await this.applyDamageReactionModification({ ...(payload.params || {}), _fromSocket: true });
          }
        } catch (err) {
          console.warn("[CoriaRollLedger] Error handling socket roll/damage intervention:", err);
        }
      });
    };
    if (game?.ready) registerSocket();
    else Hooks.once("ready", registerSocket);
  }

  static _concSnapshotsByActor = new Map();

  static _snapshotActorConcentration(actor) {
    if (!actor) return;
    const concEffects = [];
    const dependentEffects = [];
    for (const eff of actor.effects || []) {
      if (eff.disabled) continue;
      const nameLower = String(eff.name || "").trim().toLowerCase();
      const isConc = nameLower.startsWith("concentrating") || eff.statuses?.has?.("concentrating");
      if (isConc) {
        concEffects.push(eff.toObject());
      } else if (
        eff.flags?.[MODULE_ID]?.isSpiritGuardiansCaster ||
        eff.flags?.[MODULE_ID]?.isSpiritShroudEffect ||
        eff.flags?.[MODULE_ID]?.isPathsOfDestinyEffect ||
        eff.statuses?.has?.("spirit-guardians-caster") ||
        eff.statuses?.has?.("spirit-shroud") ||
        eff.statuses?.has?.("paths-of-destiny")
      ) {
        dependentEffects.push(eff.toObject());
      }
    }
    if (concEffects.length > 0 || dependentEffects.length > 0) {
      this._concSnapshotsByActor.set(actor.uuid || actor.id, {
        concEffects,
        dependentEffects,
        timestamp: Date.now()
      });
    }
  }

  /* -------------------------------------------- */
  /*  Helper: Capture Next Roll ChatMessage       */
  /* -------------------------------------------- */

  static _capturingActorIds = new Set();

  /**
   * Execute an async roll function `rollFn()` while capturing the `ChatMessage` created for `actor`.
   * Returns `{ roll, rollMessage }`.
   */
  static async runAndCaptureRollMessage(actor, rollFn) {
    let capturedMsg = null;
    const hookId = Hooks.on("createChatMessage", (msg) => {
      try {
        if (!msg?.rolls?.length) return;
        const spkActorId = msg.speaker?.actor;
        if (!actor || spkActorId === actor.id || msg.author?.id === game.user?.id) {
          capturedMsg = msg;
        }
      } catch (_e) {
        // ignore
      }
    });

    if (actor?.id) this._capturingActorIds.add(actor.id);
    let rollResult = null;
    try {
      rollResult = await rollFn();
    } finally {
      if (actor?.id) this._capturingActorIds.delete(actor.id);
      Hooks.off("createChatMessage", hookId);
    }

    let roll = Array.isArray(rollResult) ? rollResult[0] : rollResult?.rolls?.[0] || rollResult;
    if (!capturedMsg && rollResult?.message) {
      capturedMsg = rollResult.message;
    }
    if (!capturedMsg && actor) {
      // Fallback: check the very last message in game.messages if created within the last 3s
      const lastMsg = Array.from(game.messages || []).slice(-4).reverse().find(
        m => m?.rolls?.length && m.speaker?.actor === actor.id && Date.now() - Number(m.timestamp || 0) < 3000
      );
      if (lastMsg) capturedMsg = lastMsg;
    }
    if ((!roll || typeof roll.total !== "number") && capturedMsg?.rolls?.length) {
      roll = capturedMsg.rolls[0];
    }

    return { roll, rollMessage: capturedMsg };
  }

  /**
   * Extract `{ nat, total, flatBonus }` from a `Roll` or `ChatMessage`.
   */
  static extractD20Stats(rollOrMsg) {
    const roll = rollOrMsg?.rolls ? rollOrMsg.rolls[0] : rollOrMsg;
    if (!roll) return { nat: 10, total: 10, flatBonus: 0 };
    const d20Term =
      roll.terms?.find(t => t?.faces === 20) ||
      roll.dice?.find(d => d?.faces === 20) ||
      null;
    const nat = Number(
      d20Term?.results?.find(r => r.active)?.result ??
        d20Term?.results?.[0]?.result ??
        d20Term?.total ??
        10
    );
    const total = Number(roll.total ?? nat);
    const flatBonus = total - nat;
    return { nat, total, flatBonus };
  }

  /* -------------------------------------------- */
  /*  Master Entry Point: Apply Roll Intervention */
  /* -------------------------------------------- */

  /**
   * Apply a roll modification or AC intervention (`Portent`, `Lucky Feat`, `Halfling Lucky`,
   * `Paths of Destiny`, `Silvery Barbs`, or `Shield`) to an original roll message (`rollMessageId`)
   * and/or interactive save card (`cardMessageId`, `targetKey`).
   *
   * Serialized via `_interventionLock` so rapid clicks never race.
   */
  static async applyRollIntervention(params = {}) {
    const next = this._interventionLock
      .catch(() => {})
      .then(() => this._applyRollInterventionImpl(params));
    this._interventionLock = next;
    return next;
  }

  static async _applyRollInterventionImpl(params = {}) {
    const {
      rollMessageId = "",
      cardMessageId = "",
      targetKey = "",
      rollerActorId = "",
      newTotal = null,
      newNat = null,
      shieldAcBonus = null,
      shieldDefenderId = "",
      shieldDefenderName = "",
      forceSuccess = false,
      sourceLabel = "Reaction",
      _fromSocket = false
    } = params;

    let rollMessage = rollMessageId ? game.messages?.get(rollMessageId) : null;

    // If invoked from an inline button on an interactive save card that knows `cardMessageId` + `targetKey`
    // but `rollMessageId` wasn't passed on the DOM attribute, check the card's target entry for `rollMessageId`
    if (!rollMessage && cardMessageId && targetKey) {
      const cardMsg = game.messages?.get(cardMessageId);
      const savedRollMsgId = cardMsg?.flags?.[MODULE_ID]?.interactiveSaveCard?.targets?.[targetKey]?.rollMessageId;
      if (savedRollMsgId) {
        rollMessage = game.messages?.get(savedRollMsgId) || null;
      }
    }

    // If a non-GM player triggered an intervention on a roll message or actor they don't own, delegate to active GM via socket
    if (!_fromSocket && !game.user?.isGM && game.users?.activeGM && game.socket) {
      const canModifyRollMsg = !rollMessage || Boolean(rollMessage.canUserModify?.(game.user, "update") || rollMessage.isAuthor);
      const ledger = rollMessage?.flags?.[MODULE_ID]?.rollLedger;
      const ledgerActor = ledger?.actorId ? game.actors?.get(ledger.actorId) : null;
      const canModifyLedgerActor = !ledgerActor || Boolean(ledgerActor.isOwner);
      if (!canModifyRollMsg || !canModifyLedgerActor) {
        game.socket.emit(`module.${MODULE_ID}`, {
          type: "coriaRollIntervention",
          params
        });
        return;
      }
    }

    // 1. Update the Original Roll ChatMessage in-place (if found)
    let updatedLedger = null;
    if (rollMessage) {
      updatedLedger = await this._editOriginalRollChatMessage(rollMessage, {
        newTotal,
        newNat,
        shieldAcBonus,
        shieldDefenderId,
        shieldDefenderName,
        forceSuccess,
        sourceLabel
      });
    }

    const effectiveTotal = Number.isFinite(Number(newTotal))
      ? Number(newTotal)
      : Number(updatedLedger?.currentTotal ?? rollMessage?.rolls?.[0]?.total ?? NaN);
    const effectiveNat = Number.isFinite(Number(newNat))
      ? Number(newNat)
      : Number(updatedLedger?.currentNat ?? NaN);

    // 2. If this roll is linked to an interactive save card (`Spirit Guardians` or `Ancestral Marking`),
    //    or if `cardMessageId` was explicitly provided, update that specific target row & its damage/status!
    const linkedCardInfo = rollMessage?.flags?.[MODULE_ID]?.linkedSaveCard || {};
    const resolvedCardMsgId = cardMessageId || linkedCardInfo.cardMessageId || "";
    const resolvedTargetKey = targetKey || linkedCardInfo.targetKey || "";

    if (
      (resolvedCardMsgId || rollMessageId) &&
      (Number.isFinite(effectiveTotal) || forceSuccess) &&
      typeof globalThis.AltarionAutomationManager?.onSavingThrowTotalModified === "function"
    ) {
      await globalThis.AltarionAutomationManager.onSavingThrowTotalModified({
        rollMessageId: rollMessage?.id || rollMessageId,
        cardMessageId: resolvedCardMsgId,
        targetKey: resolvedTargetKey,
        rollerActorId,
        newTotal: effectiveTotal,
        newNat: effectiveNat,
        forceSuccess,
        sourceLabel
      });
    }

    // 3. Re-evaluate the per-message `rollLedger` stored on `rollMessage` (Plague, Intuitive Arcanum,
    //    Standard Saves, Concentration Saves, Death Saves, and Attack Rolls!)
    if (rollMessage) {
      await this._reEvaluateMessageLedger(rollMessage, {
        newTotal: effectiveTotal,
        newNat: effectiveNat,
        shieldAcBonus,
        shieldDefenderId,
        shieldDefenderName,
        forceSuccess,
        sourceLabel
      });
    }
  }

  /* -------------------------------------------- */
  /*  In-Place Original Roll ChatMessage Editor   */
  /* -------------------------------------------- */

  static async _editOriginalRollChatMessage(
    rollMessage,
    {
      newTotal = null,
      newNat = null,
      shieldAcBonus = null,
      shieldDefenderId = "",
      shieldDefenderName = "",
      forceSuccess = false,
      sourceLabel = "Reaction"
    } = {}
  ) {
    if (!rollMessage?.rolls?.length) return null;

    const prevMod = foundry.utils.deepClone(rollMessage.flags?.[MODULE_ID]?.rollModState || null);
    const baseStats = this.extractD20Stats(rollMessage);

    const origNat = Number(prevMod?.origNat ?? baseStats.nat);
    const origTotal = Number(prevMod?.origTotal ?? baseStats.total);
    const flatBonus = Number(prevMod?.flatBonus ?? (origTotal - origNat));

    const prevNat = Number(prevMod?.currentNat ?? baseStats.nat);
    const prevTotal = Number(prevMod?.currentTotal ?? baseStats.total);

    const hasNewD20 = Number.isFinite(Number(newNat)) || Number.isFinite(Number(newTotal));
    const updatedNat = Number.isFinite(Number(newNat))
      ? Number(newNat)
      : Number.isFinite(Number(newTotal))
        ? Number(newTotal) - flatBonus
        : prevNat;
    const updatedTotal = Number.isFinite(Number(newTotal))
      ? Number(newTotal)
      : Number.isFinite(Number(newNat))
        ? Number(newNat) + flatBonus
        : prevTotal;

    const rollData = foundry.utils.deepClone(rollMessage.rolls[0].toJSON());
    const rawType = String(
      rollMessage.flags?.dnd5e?.roll?.type ||
        rollMessage.flags?.dnd5e?.activity?.type ||
        rollData.options?.type ||
        ""
    ).toLowerCase();

    const isAttackRoll = rawType === "attack";
    const isSavingThrow =
      rawType === "save" || rawType === "savingthrow" || rawType === "concentration" || rawType === "death";
    const isAbilityCheck = !isAttackRoll && !isSavingThrow;

    // Update serialized D20Roll terms & total if the d20 roll itself was modified
    if (hasNewD20) {
      const d20Term = (rollData.terms || []).find(t => t?.faces === 20 || t?.class === "Die");
      if (d20Term && Array.isArray(d20Term.results)) {
        for (const r of d20Term.results) {
          r.active = false;
          r.discarded = true;
        }
        d20Term.results.push({
          result: updatedNat,
          active: true
        });
      }
      rollData.total = updatedTotal;
    }

    // Determine target DC or AC threshold
    const ledger = foundry.utils.deepClone(rollMessage.flags?.[MODULE_ID]?.rollLedger || null);
    let targetThreshold = Number(
      prevMod?.targetThreshold ??
        rollData.options?.target ??
        rollMessage.flags?.dnd5e?.roll?.target ??
        rollMessage.flags?.[MODULE_ID]?.linkedSaveCard?.saveDc ??
        ledger?.dc ??
        NaN
    );

    if (isAttackRoll && !Number.isFinite(targetThreshold)) {
      if (ledger?.defenders?.length) {
        const def =
          (shieldDefenderId && ledger.defenders.find(d => d.defenderActorId === shieldDefenderId)) ||
          ledger.defenders[0];
        targetThreshold = Number(def?.currentAc ?? def?.baseAc ?? NaN);
      } else if (rollMessage.flags?.dnd5e?.targets?.[0]?.ac !== undefined) {
        targetThreshold = Number(rollMessage.flags.dnd5e.targets[0].ac);
      }
    }

    if (Number.isFinite(Number(shieldAcBonus)) && Number(shieldAcBonus) > 0) {
      const matchedDef =
        ledger?.defenders?.find(d => !shieldDefenderId || d.defenderActorId === shieldDefenderId) || null;
      if (matchedDef && Number.isFinite(Number(matchedDef.baseAc))) {
        targetThreshold = Number(matchedDef.baseAc) + Number(shieldAcBonus);
      } else if (Number.isFinite(targetThreshold)) {
        targetThreshold += Number(shieldAcBonus);
      } else if (shieldDefenderId) {
        const defActor = game.actors?.get(shieldDefenderId);
        const curAc = Number(defActor?.system?.attributes?.ac?.value ?? NaN);
        if (Number.isFinite(curAc)) targetThreshold = curAc;
      }
      rollData.options ??= {};
      if (Number.isFinite(targetThreshold)) {
        rollData.options.target = targetThreshold;
      }
    }

    let isSuccess = null;
    if (forceSuccess) {
      isSuccess = true;
    } else if (isAttackRoll) {
      if (updatedNat === 20) isSuccess = true;
      else if (updatedNat === 1) isSuccess = false;
      else if (Number.isFinite(targetThreshold)) isSuccess = updatedTotal >= targetThreshold;
    } else if (rawType === "death") {
      isSuccess = updatedNat === 20 || (updatedNat !== 1 && updatedTotal >= 10);
    } else if (Number.isFinite(targetThreshold)) {
      isSuccess = updatedTotal >= targetThreshold;
    }

    const historyEntry = {
      sourceLabel,
      prevNat,
      prevTotal,
      newNat: updatedNat,
      newTotal: updatedTotal,
      targetThreshold: Number.isFinite(targetThreshold) ? targetThreshold : null,
      shieldAcBonus: Number.isFinite(Number(shieldAcBonus)) ? Number(shieldAcBonus) : null,
      shieldDefenderName: shieldDefenderName || "",
      forceSuccess: Boolean(forceSuccess),
      isSuccess,
      timestamp: Date.now()
    };

    const modState = {
      origNat,
      origTotal,
      flatBonus,
      currentNat: updatedNat,
      currentTotal: updatedTotal,
      currentTarget: Number.isFinite(targetThreshold) ? targetThreshold : null,
      targetThreshold: Number.isFinite(targetThreshold) ? targetThreshold : null,
      forceSuccess: Boolean(forceSuccess || prevMod?.forceSuccess),
      isSuccess,
      isAttackRoll,
      isSavingThrow,
      isAbilityCheck,
      rawType,
      lastSourceLabel: sourceLabel,
      history: [...(Array.isArray(prevMod?.history) ? prevMod.history : []), historyEntry]
    };

    try {
      await rollMessage.update({
        rolls: [rollData],
        [`flags.${MODULE_ID}.rollModState`]: modState
      });
    } catch (err) {
      console.warn("[CoriaRollLedger] Could not update original roll ChatMessage:", err);
    }

    try {
      for (const el of document.querySelectorAll(`[data-message-id="${rollMessage.id}"]`)) {
        this.decorateModifiedRollMessage(rollMessage, el, { refreshReactionBar: true });
      }
    } catch (_e) {
      // ignore
    }

    return modState;
  }

  /**
   * Decorate a rendered ChatMessage DOM element when `flags["altarion-aitusa"].rollModState` is present:
   * - Updates `.dice-total` text and `.success` / `.failure` / `.critical` / `.fumble` classes.
   * - Updates `dnd5e` attack target hit/miss rows (`.evaluation .target`).
   * - Appends a sleek visual Modification History Banner showing original vs modified roll & new outcome.
   */
  static decorateModifiedRollMessage(message, rootEl, { refreshReactionBar = false } = {}) {
    const modState = message.flags?.[MODULE_ID]?.rollModState;
    if (!modState) return;

    const {
      origNat,
      origTotal,
      currentNat,
      currentTotal,
      targetThreshold,
      isSuccess,
      isAttackRoll,
      history = []
    } = modState;

    // 1. Update `.dice-total` element(s) in the roll card
    for (const totalEl of rootEl.querySelectorAll(".dice-total")) {
      totalEl.textContent = String(currentTotal);
      totalEl.classList.toggle("critical", currentNat === 20);
      totalEl.classList.toggle("fumble", currentNat === 1);
      if (isSuccess !== null && isSuccess !== undefined) {
        totalEl.classList.toggle("success", Boolean(isSuccess));
        totalEl.classList.toggle("failure", !isSuccess);
      }
    }

    // 2. Update dnd5e v5.x attack target evaluation row(s) if present
    for (const targetRow of rootEl.querySelectorAll(".evaluation .target, ul.targets li.target")) {
      if (isSuccess !== null && isSuccess !== undefined) {
        targetRow.classList.toggle("hit", Boolean(isSuccess));
        targetRow.classList.toggle("miss", !isSuccess);
        targetRow.classList.toggle("success", Boolean(isSuccess));
        targetRow.classList.toggle("failure", !isSuccess);
      }
      if (Number.isFinite(Number(targetThreshold))) {
        const acEl = targetRow.querySelector(".ac span, .ac");
        if (acEl && acEl.childNodes.length === 1 && acEl.childNodes[0].nodeType === Node.TEXT_NODE) {
          acEl.textContent = String(targetThreshold);
        }
      }
    }

    // 3. Inject or refresh `.coria-roll-mod-banner`
    let banner = rootEl.querySelector(".coria-roll-mod-banner");
    if (!banner) {
      banner = document.createElement("div");
      banner.className = "coria-roll-mod-banner";
      const contentEl = rootEl.querySelector(".message-content") || rootEl;
      const reactBar = contentEl.querySelector(".coria-d20-reactions-bar");
      if (reactBar) {
        reactBar.insertAdjacentElement("beforebegin", banner);
      } else {
        contentEl.appendChild(banner);
      }
    }

    const outcomeWord =
      isSuccess === null || isSuccess === undefined
        ? `Total ${currentTotal}`
        : isAttackRoll
          ? isSuccess
            ? currentNat === 20
              ? "CRITICAL HIT!"
              : "HIT!"
            : currentNat === 1
              ? "CRITICAL MISS!"
              : "MISS!"
          : isSuccess
            ? "SUCCESS!"
            : "FAILURE!";

    const borderCol =
      isSuccess === true ? "#16a34a" : isSuccess === false ? "#dc2626" : "#0284c7";
    const bgCol =
      isSuccess === true
        ? "linear-gradient(135deg, rgba(16, 48, 30, 0.94), rgba(10, 28, 19, 0.96))"
        : isSuccess === false
          ? "linear-gradient(135deg, rgba(58, 16, 20, 0.94), rgba(34, 9, 13, 0.96))"
          : "linear-gradient(135deg, rgba(12, 24, 44, 0.94), rgba(8, 15, 30, 0.96))";
    const outcomeClass =
      isSuccess === true ? "coria-hl-success" : isSuccess === false ? "coria-hl-failure" : "coria-hl-info";

    const stepsHtml = history
      .map(h => {
        if (h.forceSuccess) {
          return `<div class="coria-mod-step-line">&bull; <strong class="coria-hl-gold">${foundry.utils.escapeHTML(h.sourceLabel)}</strong>: <strong class="coria-hl-success">Automatic Save Success!</strong> (Roll: <strong>${h.prevTotal}</strong>)</div>`;
        }
        if (h.shieldAcBonus) {
          return `<div class="coria-mod-step-line">&bull; <strong class="coria-hl-info">${foundry.utils.escapeHTML(h.sourceLabel)}</strong>: AC ${
            h.targetThreshold ? `${h.targetThreshold - h.shieldAcBonus} &rarr; <strong>${h.targetThreshold}</strong>` : "+5 AC"
          }</div>`;
        }
        return `<div class="coria-mod-step-line">&bull; <strong class="coria-hl-info">${foundry.utils.escapeHTML(h.sourceLabel)}</strong>: d20 (${h.prevNat} &rarr; <strong>${h.newNat}</strong>) | Total: ${h.prevTotal} &rarr; <strong>${h.newTotal}</strong></div>`;
      })
      .join("");

    const vsText = Number.isFinite(Number(targetThreshold))
      ? ` vs ${isAttackRoll ? "AC" : "DC"} ${targetThreshold}`
      : "";

    banner.style.cssText = `margin: 6px 0; padding: 7px 10px; border-radius: 6px; border: 1.5px solid ${borderCol}; border-left: 4px solid ${borderCol}; background: ${bgCol}; color: #f8fafc; font-size: 12px; box-shadow: 0 2px 6px rgba(0,0,0,0.45);`;
    banner.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;gap:6px;margin-bottom:3px;border-bottom:1px solid rgba(255,255,255,0.18);padding-bottom:3px;">
        <span class="coria-hl-info"><i class="fas fa-bolt"></i> Modified Roll</span>
        <span class="${outcomeClass}">${outcomeWord}${vsText}</span>
      </div>
      <div class="coria-mod-orig-line">
        Original: d20 = <strong>${origNat}</strong> &rarr; Total <strong>${origTotal}</strong>
      </div>
      ${stepsHtml}
    `;

    // 4. Refresh the d20 reaction buttons bar so closures and eligibility (Shield / Silvery Barbs / Halfling Lucky) match the modified state
    if (refreshReactionBar && typeof globalThis.FlinnManager?.onRenderChatMsg === "function") {
      for (const oldBar of rootEl.querySelectorAll(".coria-d20-reactions-bar")) {
        oldBar.remove();
      }
      globalThis.FlinnManager.onRenderChatMsg(message, rootEl);
    }
  }

  /* -------------------------------------------- */
  /*  Ledger Dispatcher & Consequence Handlers    */
  /* -------------------------------------------- */

  static async _reEvaluateMessageLedger(
    rollMessage,
    { newTotal, newNat, shieldAcBonus, shieldDefenderId, forceSuccess = false, sourceLabel } = {}
  ) {
    const ledger = foundry.utils.deepClone(rollMessage.flags?.[MODULE_ID]?.rollLedger || null);
    if (!ledger || !ledger.kind) return;

    switch (ledger.kind) {
      case "plague-con-save":
        await this.evaluatePlagueConSaveLedger(rollMessage, ledger, { newTotal, newNat, forceSuccess, sourceLabel });
        break;
      case "plague-parva-tithe":
        await this.evaluateParvaTitheLedger(rollMessage, ledger, { newTotal, newNat, sourceLabel });
        break;
      case "plague-stage6-save":
        await this.evaluatePlagueStage6Ledger(rollMessage, ledger, { newTotal, newNat, forceSuccess, sourceLabel });
        break;
      case "plague-kyrion-wis-save":
        await this.evaluateKyrionWisSaveLedger(rollMessage, ledger, { newTotal, newNat, forceSuccess, sourceLabel });
        break;
      case "flinn-intuitive-arcanum":
        await this.evaluateIntuitiveArcanumLedger(rollMessage, ledger, { newTotal, newNat, sourceLabel });
        break;
      case "standard-save":
        await this.evaluateStandardSaveLedger(rollMessage, ledger, { newTotal, newNat, forceSuccess, sourceLabel });
        break;
      case "concentration-save":
        await this.evaluateConcentrationSaveLedger(rollMessage, ledger, { newTotal, newNat, forceSuccess, sourceLabel });
        break;
      case "death-save":
        await this.evaluateDeathSaveLedger(rollMessage, ledger, { newTotal, newNat, sourceLabel });
        break;
      case "attack-roll":
        await this.evaluateAttackRollLedger(rollMessage, ledger, {
          newTotal,
          newNat,
          shieldAcBonus,
          shieldDefenderId,
          sourceLabel
        });
        break;
      default:
        break;
    }
  }

  /* -------------------------------------------- */
  /*  1. Arcane Plague: Long Rest CON Save        */
  /* -------------------------------------------- */

  static async registerAndEvaluatePlagueConSave({ rollMessage, roll, actor, beforeState }) {
    const stats = this.extractD20Stats(roll || rollMessage);
    const ledger = {
      kind: "plague-con-save",
      actorId: actor.id,
      actorUuid: actor.uuid,
      dc: Number(beforeState.dc || 10),
      beforeState: {
        ec: Number(beforeState.ec || 0),
        dc: Number(beforeState.dc || 10),
        role: beforeState.role || ""
      },
      origNat: stats.nat,
      origTotal: stats.total,
      currentNat: stats.nat,
      currentTotal: stats.total,
      outcomeCardMsgId: ""
    };

    await this.evaluatePlagueConSaveLedger(rollMessage, ledger, {
      newTotal: stats.total,
      newNat: stats.nat,
      sourceLabel: ""
    });
  }

  static async evaluatePlagueConSaveLedger(
    rollMessage,
    ledger,
    { newTotal, newNat, forceSuccess = false, sourceLabel = "" } = {}
  ) {
    const PM = globalThis.ArcanePlagueManager;
    if (!PM) return;
    const actor =
      (ledger.actorId && game.actors?.get(ledger.actorId)) ||
      (ledger.actorUuid && typeof fromUuidSync === "function" ? fromUuidSync(ledger.actorUuid) : null);
    if (!actor) return;

    const total = Number.isFinite(Number(newTotal)) ? Number(newTotal) : Number(ledger.currentTotal ?? 10);
    const nat = Number.isFinite(Number(newNat)) ? Number(newNat) : Number(ledger.currentNat ?? 10);
    const dc = Number(ledger.dc || ledger.beforeState?.dc || 10);
    const baseEc = Number(ledger.beforeState?.ec ?? 0);
    const baseDc = Number(ledger.beforeState?.dc ?? 10);
    const role = ledger.beforeState?.role || PM.getPlagueRole(actor);

    const isSuccess = Boolean(forceSuccess) || total >= dc;
    ledger.currentTotal = total;
    ledger.currentNat = nat;
    ledger.currentSuccess = isSuccess;

    const modTag = sourceLabel
      ? `<p style="color:#38bdf8;font-size:0.84rem;margin-bottom:6px;"><i class="fas fa-bolt"></i> <strong>Resultado Modificado por ${foundry.utils.escapeHTML(sourceLabel)}:</strong> Total <strong>${total}</strong> (d20 = ${nat}) vs CD <strong>${dc}</strong></p>`
      : "";

    let cardPayload = null;
    if (isSuccess) {
      const targetEc = baseEc;
      const targetDc = baseDc + 1;
      await PM.updatePlagueState(actor, { ec: targetEc, dc: targetDc });

      cardPayload = {
        theme: "success",
        icon: "fa-shield-alt",
        title: sourceLabel ? `Resistiu à Praga! (${sourceLabel})` : "Resistiu à Praga!",
        bodyHtml: `
          ${modTag}
          <p>A infecção foi contida e suprimida temporariamente no corpo de <strong>${actor.name}</strong> (Total <strong>${total}</strong> vs CD <strong>${dc}</strong>).</p>
          <hr style="border-color: rgba(255,255,255,0.1); margin: 10px 0;">
          <p>Estágio mantido em <strong>EC ${targetEc}</strong>. A Dificuldade subiu para <strong>CD ${targetDc}</strong>.</p>
        `,
        footerHtml: "",
        flags: { isKyrionPlagueFailureCard: false }
      };
    } else {
      const targetEc = Math.min(6, baseEc + 1);
      const targetDc = 10 + targetEc;
      await PM.updatePlagueState(actor, { ec: targetEc, dc: targetDc });

      const isKyrion = role === "kyrion";
      const kyrionWisBtnHtml = isKyrion
        ? `
          <hr style="border-color: rgba(153,51,255,0.35); margin: 12px 0;">
          <p style="color: #e9d5ff; font-size: 0.9rem; margin-bottom: 8px;">
            A praga consome a energia de <strong>????</strong>, tornando-o agressivo! <strong>${actor.name}</strong> deve fazer imediatamente um Teste de Resistência de Sabedoria (<strong>CD ${baseDc}</strong>) para impedir que <strong>????</strong> assuma o controle de seu corpo por 1d4 horas!
          </p>
          <button type="button" class="coria-kyrion-wis-save-btn btn-shadow" data-actor-id="${actor.id}" data-dc="${baseDc}">
            <i class="fas fa-dice-d20"></i> Rolar Teste de Sabedoria (CD ${baseDc})
          </button>
        `
        : "";

      cardPayload = {
        theme: "failure",
        icon: "fa-skull",
        title: sourceLabel ? `A PRAGA AVANÇOU! (${sourceLabel})` : "A PRAGA AVANÇOU!",
        bodyHtml: `
          ${modTag}
          <p style="font-style: italic; color: #ffcccc;">"A infecção se alastrou implacavelmente."</p>
          <div class="coria-plague-val" style="margin: 12px auto; width: fit-content; border-color: #ff3333;">
            <span>Estágio Atingido</span>EC ${targetEc}
          </div>
          <p style="font-size: 0.82rem; color: #aaa;">(Nova Dificuldade Base: CD ${targetDc})</p>
          ${kyrionWisBtnHtml}
        `,
        footerHtml: PM.STAGE_DATA?.[targetEc]?.summary || "",
        flags: isKyrion
          ? {
              isKyrionPlagueFailureCard: true,
              kyrionActorId: actor.id,
              kyrionWisDc: baseDc
            }
          : {}
      };
    }

    const existingCard = ledger.outcomeCardMsgId ? game.messages?.get(ledger.outcomeCardMsgId) : null;
    if (existingCard) {
      await PM.updateCoriaChatCard(existingCard, cardPayload);
    } else {
      const created = await PM.sendCoriaChatCard(actor, cardPayload);
      if (created?.id) ledger.outcomeCardMsgId = created.id;
    }

    if (rollMessage?.update) {
      await rollMessage.update({ [`flags.${MODULE_ID}.rollLedger`]: ledger });
    }
  }

  /* -------------------------------------------- */
  /*  2. Arcane Plague: Parva's Arcane Tithe      */
  /* -------------------------------------------- */

  static async registerAndEvaluateParvaTithe({ rollMessage, roll, actor, beforeState }) {
    const stats = this.extractD20Stats(roll || rollMessage);
    const ledger = {
      kind: "plague-parva-tithe",
      actorId: actor.id,
      actorUuid: actor.uuid,
      dc: Number(beforeState.dc || 10),
      beforeState: {
        ec: Number(beforeState.ec || 0),
        dc: Number(beforeState.dc || 10),
        prevBlocked: Number(beforeState.prevBlocked || 0),
        prevPactVal: Number(beforeState.prevPactVal || 0)
      },
      origNat: stats.nat,
      origTotal: stats.total,
      currentNat: stats.nat,
      currentTotal: stats.total,
      outcomeCardMsgId: ""
    };

    await this.evaluateParvaTitheLedger(rollMessage, ledger, {
      newTotal: stats.total,
      newNat: stats.nat,
      sourceLabel: ""
    });
  }

  static async evaluateParvaTitheLedger(rollMessage, ledger, { newTotal, newNat, sourceLabel = "" } = {}) {
    const PM = globalThis.ArcanePlagueManager;
    if (!PM) return;
    const actor = ledger.actorId ? game.actors?.get(ledger.actorId) : null;
    if (!actor) return;

    const total = Number.isFinite(Number(newTotal)) ? Number(newTotal) : Number(ledger.currentTotal ?? 10);
    const nat = Number.isFinite(Number(newNat)) ? Number(newNat) : Number(ledger.currentNat ?? 10);
    const dc = Number(ledger.dc || ledger.beforeState?.dc || 10);
    const { ec, prevBlocked = 0, prevPactVal = 1 } = ledger.beforeState || {};

    const isSuccess = total >= dc;
    ledger.currentTotal = total;
    ledger.currentNat = nat;
    ledger.currentSuccess = isSuccess;

    const modTag = sourceLabel
      ? `<p style="color:#38bdf8;font-size:0.84rem;margin-bottom:6px;"><i class="fas fa-bolt"></i> <strong>Resultado Modificado por ${foundry.utils.escapeHTML(sourceLabel)}:</strong> Total <strong>${total}</strong> (d20 = ${nat}) vs CD <strong>${dc}</strong></p>`
      : "";

    let cardPayload = null;
    if (isSuccess) {
      const newBlocked = prevBlocked + 1;
      const newPactVal = Math.max(0, prevPactVal - 1);
      await actor.update(
        {
          [`flags.${MODULE_ID}.plague.parvaBlockedPactSlots`]: newBlocked,
          "system.spells.pact.value": newPactVal
        },
        { altarionPlagueInternal: true }
      );
      if (actor.sheet?.rendered) actor.sheet.render(false);

      // If a fallback Constitution Plague dialog was opened for Parva, close it automatically
      const openConDlg = PM._activeConPlagueDialogs?.get?.(actor.id);
      if (openConDlg) {
        try {
          openConDlg.close();
        } catch (_e) {}
        PM._activeConPlagueDialogs.delete(actor.id);
      }

      cardPayload = {
        theme: "success",
        icon: "fa-check-circle",
        title: sourceLabel ? `Dízimo Aceito pelo Patrono! (${sourceLabel})` : "Dízimo Aceito pelo Patrono!",
        bodyHtml: `
          ${modTag}
          <p>Com persuasão total de <strong>${total}</strong> (CD ${dc}), o Patrono de <strong>${actor.name}</strong> absorveu a energia corrompida!</p>
          <hr style="border-color: rgba(100,255,100,0.2); margin: 10px 0;">
          <p><strong>1 Espaço de Magia de Warlock</strong> foi sacrificado (bloqueado por todo o dia seguinte) e o Estágio permanece em <strong>EC ${ec}</strong>.</p>
        `
      };
    } else {
      // Restore Pact slot if it had been consumed by a previous Success state
      await actor.update(
        {
          [`flags.${MODULE_ID}.plague.parvaBlockedPactSlots`]: prevBlocked,
          "system.spells.pact.value": prevPactVal
        },
        { altarionPlagueInternal: true }
      );
      if (actor.sheet?.rendered) actor.sheet.render(false);

      cardPayload = {
        theme: "failure",
        icon: "fa-times-circle",
        title: sourceLabel ? `Canalização Instável Falhou! (${sourceLabel})` : "Canalização Instável Falhou!",
        bodyHtml: `
          ${modTag}
          <p>O Patrono recusou a energia corrompida (Persuasão <strong>${total}</strong> vs CD <strong>${dc}</strong>).</p>
          <p>O espaço de magia de Warlock <strong>não foi consumido</strong>, mas <strong>${actor.name}</strong> deve agora rolar seu Teste de Resistência de Constituição!</p>
        `
      };
    }

    const existingCard = ledger.outcomeCardMsgId ? game.messages?.get(ledger.outcomeCardMsgId) : null;
    if (existingCard) {
      await PM.updateCoriaChatCard(existingCard, cardPayload);
    } else {
      const created = await PM.sendCoriaChatCard(actor, cardPayload);
      if (created?.id) ledger.outcomeCardMsgId = created.id;
    }

    if (rollMessage?.update) {
      await rollMessage.update({ [`flags.${MODULE_ID}.rollLedger`]: ledger });
    }

    if (!isSuccess) {
      await PM.openConstitutionPlagueDialog(actor);
    }
  }

  /* -------------------------------------------- */
  /*  3. Arcane Plague: Stage 6 Terminal Save     */
  /* -------------------------------------------- */

  static async registerAndEvaluatePlagueStage6Save({ rollMessage, roll, actor }) {
    const stats = this.extractD20Stats(roll || rollMessage);
    const ledger = {
      kind: "plague-stage6-save",
      actorId: actor.id,
      actorUuid: actor.uuid,
      dc: 15,
      beforeState: {
        prevHp: Number(actor.system?.attributes?.hp?.value ?? 0),
        prevTemp: Number(actor.system?.attributes?.hp?.temp ?? 0)
      },
      origNat: stats.nat,
      origTotal: stats.total,
      currentNat: stats.nat,
      currentTotal: stats.total,
      rolledDamage: 0,
      damageApplied: 0,
      outcomeCardMsgId: ""
    };

    await this.evaluatePlagueStage6Ledger(rollMessage, ledger, {
      newTotal: stats.total,
      newNat: stats.nat,
      sourceLabel: ""
    });
  }

  static async evaluatePlagueStage6Ledger(
    rollMessage,
    ledger,
    { newTotal, newNat, forceSuccess = false, sourceLabel = "" } = {}
  ) {
    const PM = globalThis.ArcanePlagueManager;
    if (!PM) return;
    const actor = ledger.actorId ? game.actors?.get(ledger.actorId) : null;
    if (!actor) return;

    const total = Number.isFinite(Number(newTotal)) ? Number(newTotal) : Number(ledger.currentTotal ?? 10);
    const nat = Number.isFinite(Number(newNat)) ? Number(newNat) : Number(ledger.currentNat ?? 10);
    const dc = 15;
    const isSuccess = Boolean(forceSuccess) || total >= dc;

    const modTag = sourceLabel
      ? `<p style="color:#38bdf8;font-size:0.84rem;margin-bottom:6px;"><i class="fas fa-bolt"></i> <strong>Resultado Modificado por ${foundry.utils.escapeHTML(sourceLabel)}:</strong> Total <strong>${total}</strong> (d20 = ${nat}) vs CD 15</p>`
      : "";

    let cardPayload = null;
    if (isSuccess) {
      // If 8d6 damage had been applied on an earlier Failure state, restore the actor's pre-save Arcane Ward, TempHP & HP!
      if (Number(ledger.damageApplied || 0) > 0) {
        if (ledger.damageLayers) {
          await this.revertActorDamageLayered(actor, Number(ledger.damageApplied || 0), {
            mode: "undo",
            damageLayers: ledger.damageLayers
          });
        } else if (ledger.beforeState) {
          const restoreData = {
            "system.attributes.hp.value": Number(ledger.beforeState.prevHp ?? actor.system?.attributes?.hp?.value ?? 0),
            "system.attributes.hp.temp": Number(ledger.beforeState.prevTemp ?? actor.system?.attributes?.hp?.temp ?? 0)
          };
          if (ledger.beforeState.prevWard !== undefined && globalThis.AltarionAutomationManager?.isAltarion?.(actor)) {
            restoreData["system.resources.tertiary.value"] = Number(ledger.beforeState.prevWard);
          }
          await actor.update(restoreData, {
            altarionBypassWard: true,
            wardingBondTransfer: true,
            altarionTetherTransfer: true,
            coriaDamageReactionInternal: true,
            coriaDarkVitalityBypass: true,
            coriaLayeredUndo: true
          });
        }
        ledger.damageApplied = 0;
        ledger.damageLayers = null;
      }

      cardPayload = {
        theme: "success",
        icon: "fa-heartbeat",
        title: sourceLabel ? `Sobreviveu ao Colapso Terminal! (${sourceLabel})` : "Sobreviveu ao Colapso Terminal!",
        bodyHtml: `
          ${modTag}
          <p><strong>${actor.name}</strong> suportou a agonia cristalina do EC 6 (Total <strong>${total}</strong> vs CD 15), evitando os 8d6 de dano de Força.</p>
        `,
        footerHtml: "",
        flags: {
          coriaCustomDamage: null
        }
      };
    } else {
      let dmgAmount = Number(ledger.rolledDamage || 0);
      if (dmgAmount <= 0) {
        const dmgRoll = await new Roll("8d6").evaluate();
        if (game.dice3d) {
          try {
            await game.dice3d.showForRoll(dmgRoll, game.user, true);
          } catch (_e) {}
        }
        dmgAmount = Math.max(1, Number(dmgRoll.total || 8));
        ledger.rolledDamage = dmgAmount;
      }

      if (Number(ledger.damageApplied || 0) <= 0) {
        const beforeLayers = this.captureActorVitalLayers(actor);
        ledger.beforeState = {
          prevHp: beforeLayers.hp,
          prevTemp: beforeLayers.temp,
          prevWard: beforeLayers.ward
        };
        await PM.applyDirectForceDamage(actor, dmgAmount);
        const afterLayers = this.captureActorVitalLayers(actor);
        ledger.damageLayers = this.computeDamageLayersDiff(beforeLayers, afterLayers, dmgAmount);
        this.pushActorDamageLayerEvent(actor, ledger.damageLayers, ledger.outcomeCardMsgId || "");
        ledger.damageApplied = dmgAmount;
      }

      cardPayload = {
        theme: "failure",
        icon: "fa-skull-crossbones",
        title: sourceLabel ? `Ruptura Cristalina (EC 6)! (${sourceLabel})` : "Ruptura Cristalina (EC 6)!",
        bodyHtml: `
          ${modTag}
          <p><strong>${actor.name}</strong> falhou no teste de Constituição CD 15 (Total <strong>${total}</strong>) e sofre uma ruptura interna devastadora!</p>
          <div class="coria-plague-val" style="margin: 12px auto; width: fit-content; border-color: #ff3333;">
            <span>Dano de Força (8d6)</span><em class="coria-plague-dmg-num" style="font-style:normal;">${dmgAmount}</em>
          </div>
        `,
        footerHtml: PM.STAGE_DATA?.[6]?.summary || "",
        flags: {
          coriaCustomDamage: {
            cardKind: "plague-ec6",
            sourceName: "Ruptura Cristalina (EC 6)",
            attackerActorId: actor.id,
            attackerUuid: actor.uuid,
            attackerName: actor.name,
            targetActorId: actor.id,
            targetUuid: actor.uuid,
            targetName: actor.name,
            damageType: "force",
            damageTypeLabel: "Force",
            origDamage: dmgAmount,
            currentDamage: dmgAmount,
            autoApplied: true,
            preHp: Number(ledger.beforeState?.prevHp ?? actor.system?.attributes?.hp?.value ?? 0),
            preTemp: Number(ledger.beforeState?.prevTemp ?? actor.system?.attributes?.hp?.temp ?? 0),
            preWard: Number(ledger.beforeState?.prevWard ?? 0),
            damageLayers: ledger.damageLayers ? foundry.utils.deepClone(ledger.damageLayers) : null
          }
        }
      };
    }

    ledger.currentTotal = total;
    ledger.currentNat = nat;
    ledger.currentSuccess = isSuccess;

    const existingCard = ledger.outcomeCardMsgId ? game.messages?.get(ledger.outcomeCardMsgId) : null;
    if (existingCard) {
      await PM.updateCoriaChatCard(existingCard, cardPayload);
    } else {
      const created = await PM.sendCoriaChatCard(actor, cardPayload);
      if (created?.id) ledger.outcomeCardMsgId = created.id;
    }

    if (rollMessage?.update) {
      await rollMessage.update({ [`flags.${MODULE_ID}.rollLedger`]: ledger });
    }
  }

  /* -------------------------------------------- */
  /*  4. Arcane Plague: Kyrion Wisdom Save        */
  /* -------------------------------------------- */

  static async registerAndEvaluateKyrionWisSave({ rollMessage, roll, actor, dc }) {
    const stats = this.extractD20Stats(roll || rollMessage);
    const ledger = {
      kind: "plague-kyrion-wis-save",
      actorId: actor.id,
      actorUuid: actor.uuid,
      dc: Number(dc || 10),
      origNat: stats.nat,
      origTotal: stats.total,
      currentNat: stats.nat,
      currentTotal: stats.total,
      hoursRolled: 0,
      outcomeCardMsgId: ""
    };

    await this.evaluateKyrionWisSaveLedger(rollMessage, ledger, {
      newTotal: stats.total,
      newNat: stats.nat,
      sourceLabel: ""
    });
  }

  static async evaluateKyrionWisSaveLedger(
    rollMessage,
    ledger,
    { newTotal, newNat, forceSuccess = false, sourceLabel = "" } = {}
  ) {
    const PM = globalThis.ArcanePlagueManager;
    if (!PM) return;
    const actor = ledger.actorId ? game.actors?.get(ledger.actorId) : null;
    if (!actor) return;

    const total = Number.isFinite(Number(newTotal)) ? Number(newTotal) : Number(ledger.currentTotal ?? 10);
    const nat = Number.isFinite(Number(newNat)) ? Number(newNat) : Number(ledger.currentNat ?? 10);
    const dc = Number(ledger.dc || 10);
    const isSuccess = Boolean(forceSuccess) || total >= dc;

    const modTag = sourceLabel
      ? `<p style="color:#38bdf8;font-size:0.84rem;margin-bottom:6px;"><i class="fas fa-bolt"></i> <strong>Resultado Modificado por ${foundry.utils.escapeHTML(sourceLabel)}:</strong> Total <strong>${total}</strong> (d20 = ${nat}) vs CD <strong>${dc}</strong></p>`
      : "";

    let cardPayload = null;
    if (isSuccess) {
      cardPayload = {
        theme: "success",
        icon: "fa-brain",
        title: sourceLabel ? `Kyrion Conteve ????! (${sourceLabel})` : "Kyrion Conteve ????!",
        bodyHtml: `
          ${modTag}
          <p>Com Sabedoria total de <strong>${total}</strong> (CD <strong>${dc}</strong>), <strong>${actor.name}</strong> reprimiu a fúria faminta de <strong>????</strong> e manteve o controle de seu próprio corpo!</p>
        `
      };
    } else {
      let hours = Number(ledger.hoursRolled || 0);
      if (hours <= 0) {
        const hoursRoll = await new Roll("1d4").evaluate();
        if (game.dice3d) {
          try {
            await game.dice3d.showForRoll(hoursRoll, game.user, true);
          } catch (_e) {}
        }
        hours = Math.max(1, Number(hoursRoll.total || 1));
        ledger.hoursRolled = hours;
      }

      cardPayload = {
        theme: "shadow",
        icon: "fa-user-secret",
        title: sourceLabel ? `???? Assumiu o Controle! (${sourceLabel})` : "???? Assumiu o Controle!",
        bodyHtml: `
          ${modTag}
          <p><strong>${actor.name}</strong> falhou no Teste de Resistência de Sabedoria (Total <strong>${total}</strong> vs CD <strong>${dc}</strong>)!</p>
          <div class="coria-plague-val" style="margin: 12px auto; width: fit-content; border-color: #9933ff;">
            <span>Duração (1d4 Horas)</span>${hours}h
          </div>
          <p style="color:#e9d5ff;"><strong>????</strong> passa a controlar o corpo de <strong>${actor.name}</strong> por <strong>${hours} hora(s)</strong> ou até que ele fique inconsciente!</p>
        `
      };
    }

    ledger.currentTotal = total;
    ledger.currentNat = nat;
    ledger.currentSuccess = isSuccess;

    const existingCard = ledger.outcomeCardMsgId ? game.messages?.get(ledger.outcomeCardMsgId) : null;
    if (existingCard) {
      await PM.updateCoriaChatCard(existingCard, cardPayload);
    } else {
      const created = await PM.sendCoriaChatCard(actor, cardPayload);
      if (created?.id) ledger.outcomeCardMsgId = created.id;
    }

    if (rollMessage?.update) {
      await rollMessage.update({ [`flags.${MODULE_ID}.rollLedger`]: ledger });
    }
  }

  /* -------------------------------------------- */
  /*  5. Flinn: Intuitive Arcanum Arcana Check    */
  /* -------------------------------------------- */

  static async registerAndEvaluateIntuitiveArcanum({
    rollMessage,
    roll,
    actor,
    currentDC,
    slotLvl,
    slotKey,
    prevSlotVal,
    targetSpell,
    targetActivity,
    reactionContext = null
  }) {
    const stats = this.extractD20Stats(roll || rollMessage);
    const ledger = {
      kind: "flinn-intuitive-arcanum",
      actorId: actor.id,
      actorUuid: actor.uuid,
      dc: Number(currentDC || 10),
      beforeState: {
        dc: Number(currentDC || 10),
        slotLvl: Number(slotLvl || 1),
        slotKey: slotKey || `spell${slotLvl || 1}`,
        prevSlotVal: Number(prevSlotVal || 1),
        spellItemId: targetSpell?.id || "",
        spellName: targetSpell?.name || `Magia de ${slotLvl || 1}º Círculo`,
        activityId: targetActivity?.id || ""
      },
      reactionContext: reactionContext || null,
      reactionExecuted: false,
      origNat: stats.nat,
      origTotal: stats.total,
      currentNat: stats.nat,
      currentTotal: stats.total,
      spellCastExecuted: false,
      surgeInfo: null,
      outcomeCardMsgId: ""
    };

    await this.evaluateIntuitiveArcanumLedger(rollMessage, ledger, {
      newTotal: stats.total,
      newNat: stats.nat,
      sourceLabel: ""
    });
    return Boolean(ledger.currentSuccess);
  }

  static async evaluateIntuitiveArcanumLedger(rollMessage, ledger, { newTotal, newNat, sourceLabel = "" } = {}) {
    const FM = globalThis.FlinnManager;
    const PM = globalThis.ArcanePlagueManager;
    if (!FM || !PM) return;
    const actor = ledger.actorId ? game.actors?.get(ledger.actorId) : null;
    if (!actor) return;

    const total = Number.isFinite(Number(newTotal)) ? Number(newTotal) : Number(ledger.currentTotal ?? 10);
    const nat = Number.isFinite(Number(newNat)) ? Number(newNat) : Number(ledger.currentNat ?? 10);
    const baseDc = Number(ledger.beforeState?.dc ?? ledger.dc ?? 10);
    const { slotLvl = 1, slotKey = "spell1", prevSlotVal = 1, spellItemId = "", spellName = "Magia", activityId = "" } =
      ledger.beforeState || {};

    const isSuccess = total >= baseDc;
    ledger.currentTotal = total;
    ledger.currentNat = nat;
    ledger.currentSuccess = isSuccess;

    const targetSpell = spellItemId ? actor.items?.get(spellItemId) : null;
    const targetActivity =
      (activityId && targetSpell?.system?.activities?.get?.(activityId)) ||
      (targetSpell?.system?.activities ? Array.from(targetSpell.system.activities.values())[0] : null);

    const modTag = sourceLabel
      ? `<p style="color:#38bdf8;font-size:0.84rem;margin-bottom:6px;"><i class="fas fa-bolt"></i> <strong>Resultado Modificado por ${foundry.utils.escapeHTML(sourceLabel)}:</strong> Total <strong>${total}</strong> (d20 = ${nat}) vs CD <strong>${baseDc}</strong></p>`
      : "";

    let cardPayload = null;
    let shouldExecuteSpellNow = false;
    let shouldExecuteReactionNow = false;

    if (isSuccess) {
      const newDC = baseDc + 2;
      await FM.setIntuitiveArcanumDC(actor, newDC);

      cardPayload = {
        theme: "success",
        icon: "fa-magic",
        title: sourceLabel
          ? `Sucesso Arcano! (Intuitive Arcanum — ${sourceLabel})`
          : "Sucesso Arcano! (Intuitive Arcanum)",
        bodyHtml: `
          ${modTag}
          <p><strong>${actor.name}</strong> reuniu os fios da Trama no último instante (Arcanismo <strong>${total}</strong> vs CD <strong>${baseDc}</strong>)!</p>
          <p>Conjurou <strong>${targetSpell ? targetSpell.name : spellName}</strong> utilizando um espaço de <strong>${slotLvl}º Círculo</strong>.</p>
          <hr style="border-color: rgba(255,255,255,0.1); margin: 10px 0;">
          <p>A dificuldade do <em>Intuitive Arcanum</em> subiu para <strong>CD ${newDC}</strong>.</p>
        `
      };

      if (!ledger.spellCastExecuted) {
        ledger.spellCastExecuted = true;
        shouldExecuteSpellNow = true;
      }
      if (ledger.reactionContext && !ledger.reactionExecuted) {
        ledger.reactionExecuted = true;
        shouldExecuteReactionNow = true;
      }
    } else {
      await actor.update({
        [`system.spells.${slotKey}.value`]: Math.max(0, prevSlotVal - 1),
        [`flags.${MODULE_ID}.intuitiveArcanumDC`]: 10
      });
      if (actor.sheet?.rendered) actor.sheet.render(false);

      if (!ledger.surgeInfo) {
        ledger.surgeInfo = await FM.rollWildMagicSurge(actor);
      }
      const surgeInfo = ledger.surgeInfo;

      cardPayload = {
        theme: "failure",
        icon: "fa-bomb",
        title: sourceLabel
          ? `Falha Catastrófica! (Surto de Magia Selvagem — ${sourceLabel})`
          : "Falha Catastrófica! (Surto de Magia Selvagem)",
        bodyHtml: `
          ${modTag}
          <p style="font-style: italic; color: #ffcccc;">"A magia escapa por entre seus dedos e explode em caos!"</p>
          <p>Arcanismo <strong>${total}</strong> vs CD <strong>${baseDc}</strong> — <strong>${actor.name}</strong> falha ao conjurar <strong>${targetSpell ? targetSpell.name : spellName}</strong> e perde o espaço de <strong>${slotLvl}º Círculo</strong>!</p>
          <div class="coria-plague-val" style="margin: 10px auto; width: fit-content; border-color: #ff3333;">
            <span>Wild Magic Surge (1d100)</span>${surgeInfo.rollTotal}
          </div>
          <p style="color: #fecaca; font-size: 0.9rem; background: rgba(60, 0, 0, 0.45); border: 1px solid rgba(255, 80, 80, 0.4); border-radius: 6px; padding: 8px;">
            <strong>Efeito (Centrado em ${actor.name}):</strong> ${surgeInfo.text}
          </p>
          <hr style="border-color: rgba(255,100,100,0.2); margin: 10px 0;">
          <p style="font-size: 0.85em; color: #ccc;">A dificuldade do <em>Intuitive Arcanum</em> resetou para <strong>CD 10</strong>.</p>
        `
      };
    }

    const existingCard = ledger.outcomeCardMsgId ? game.messages?.get(ledger.outcomeCardMsgId) : null;
    if (existingCard) {
      await PM.updateCoriaChatCard(existingCard, cardPayload);
    } else {
      const created = await PM.sendCoriaChatCard(actor, cardPayload);
      if (created?.id) ledger.outcomeCardMsgId = created.id;
    }

    if (rollMessage?.update) {
      await rollMessage.update({ [`flags.${MODULE_ID}.rollLedger`]: ledger });
    }

    if (shouldExecuteSpellNow) {
      // Restore pre-check slot value first so exactly 1 slot is consumed (even if converting Failure -> Success!)
      await actor.update({ [`system.spells.${slotKey}.value`]: prevSlotVal });
      FM._approvingIntuitiveArcanumCast = true;
      try {
        if (targetActivity && typeof targetActivity.use === "function") {
          await targetActivity.use(
            {
              intuitiveArcanumApproved: true,
              spell: { slot: slotKey },
              consume: { spellSlot: true }
            },
            { configure: false }
          );
        } else if (targetSpell && typeof targetSpell.use === "function") {
          await targetSpell.use(
            {
              intuitiveArcanumApproved: true,
              spell: { slot: slotKey },
              consume: { spellSlot: true }
            },
            { configure: false }
          );
        }
      } catch (err) {
        console.warn("[Intuitive Arcanum] Error executing spell activity:", err);
      } finally {
        FM._approvingIntuitiveArcanumCast = false;
      }

      // Ensure the selected spell slot was actually decremented by 1
      const afterSlotVal = Number(actor.system?.spells?.[slotKey]?.value ?? prevSlotVal);
      if (afterSlotVal >= prevSlotVal) {
        await actor.update({
          [`system.spells.${slotKey}.value`]: Math.max(0, prevSlotVal - 1)
        });
      }
      if (actor.sheet?.rendered) actor.sheet.render(false);
    }

    if (shouldExecuteReactionNow && typeof FM.executeDeferredIntuitiveReaction === "function") {
      await FM.executeDeferredIntuitiveReaction(actor, ledger.reactionContext, slotLvl);
    }
  }

  /* -------------------------------------------- */
  /*  6. Standard / Feature Saving Throws         */
  /* -------------------------------------------- */

  static async registerAndEvaluateStandardSave({
    rollMessage,
    actor,
    actorUuid,
    saveType,
    dc,
    sourceActorId,
    img,
    hadStatusBeforeRoll = false
  }) {
    const stats = this.extractD20Stats(rollMessage);
    const ledger = {
      kind: "standard-save",
      saveType, // "ancestral-ward" | "ancestral-marking" | "ancestral-marking-repeat" | "enchanter-echo"
      actorId: actor.id,
      actorUuid: actorUuid || actor.uuid,
      dc: Number(dc || 14),
      sourceActorId: sourceActorId || "",
      img: img || "",
      hadStatusBeforeRoll: Boolean(hadStatusBeforeRoll),
      origNat: stats.nat,
      origTotal: stats.total,
      currentNat: stats.nat,
      currentTotal: stats.total
    };

    await this.evaluateStandardSaveLedger(rollMessage, ledger, {
      newTotal: stats.total,
      newNat: stats.nat,
      sourceLabel: ""
    });
  }

  static async evaluateStandardSaveLedger(
    rollMessage,
    ledger,
    { newTotal, newNat, forceSuccess = false, sourceLabel = "" } = {}
  ) {
    const AM = globalThis.AltarionAutomationManager;
    if (!AM) return;
    const actor = await AM.resolveActorFromUuidOrId(ledger.actorUuid, ledger.actorId);
    if (!actor || !actor.isOwner) return;

    const total = Number.isFinite(Number(newTotal)) ? Number(newTotal) : Number(ledger.currentTotal ?? 10);
    const nat = Number.isFinite(Number(newNat)) ? Number(newNat) : Number(ledger.currentNat ?? 10);
    const dc = Number(ledger.dc || 14);
    const isSuccess = Boolean(forceSuccess) || total >= dc;

    ledger.currentTotal = total;
    ledger.currentNat = nat;
    ledger.currentSuccess = isSuccess;

    const tag = sourceLabel ? ` [${sourceLabel}]` : "";

    if (ledger.saveType === "ancestral-ward") {
      if (!isSuccess) {
        await AM.applyOrUpdateStatusEffect(actor, {
          statusId: "ancestral-ward-marked",
          name: "Ancestral Ward: Disadvantage vs Others",
          img: ledger.img || "modules/altarion-aitusa/dr_icons/ancestral-ward.jpg",
          description: `<p>Failed Wisdom Save against <strong>Ancestral Ward</strong>: This creature has <strong>disadvantage</strong> on all attack rolls made against any creature other than Altarion or Aitusa until the end of Altarion's next turn.</p>`,
          durationRounds: 1,
          durationTurns: 1,
          expiresAtEndOfTurnOf: ledger.sourceActorId
        });
        ui.notifications.info(
          `[Ancestral Ward${tag}] ${actor.name} failed the Wisdom Save (${total} vs DC ${dc}) — Disadvantage vs Others applied!`
        );
      } else if (!ledger.hadStatusBeforeRoll) {
        await AM.removeStatusEffect(actor, "ancestral-ward-marked");
        if (sourceLabel) {
          ui.notifications.info(
            `[Ancestral Ward${tag}] ${actor.name} now succeeded on the Wisdom Save (${total} vs DC ${dc}) — Disadvantage vs Others removed!`
          );
        }
      }
    } else if (ledger.saveType === "ancestral-marking" || ledger.saveType === "ancestral-marking-repeat") {
      if (!isSuccess) {
        await AM.applyOrUpdateStatusEffect(actor, {
          statusId: "ancestral-marking",
          name: "Ancestral Marking: Disadvantage vs Others",
          img: ledger.img || "modules/altarion-aitusa/dr_icons/ancestral-marking.jpg",
          description: `<p>Failed Wisdom Save against <strong>Ancestral Marking</strong>: For 1 minute, this creature has <strong>disadvantage</strong> on all attack rolls made against any creature other than Altarion or Aitusa. Repeats the Wisdom Save at the end of each of its turns, ending the effect on a success.</p>`,
          durationSeconds: 60,
          durationRounds: 10
        });
        ui.notifications.info(
          `[Ancestral Marking${tag}] ${actor.name} failed the Wisdom Save (${total} vs DC ${dc}) — Marked for 1 minute!`
        );
      } else {
        await AM.removeStatusEffect(actor, "ancestral-marking");
        ui.notifications.info(
          `[Ancestral Marking${tag}] ${actor.name} succeeded on the Wisdom Save (${total} vs DC ${dc}) and is no longer marked!`
        );
      }
    } else if (ledger.saveType === "enchanter-echo") {
      if (!isSuccess) {
        await AM.applyOrUpdateStatusEffect(actor, {
          statusId: "charmed",
          name: "Charmed (Beguiling Step)",
          img: ledger.img || "modules/altarion-aitusa/dr_icons/ancestral-marking.jpg",
          description: `<p>Failed Wisdom Save against <strong>Enchanter's Echo (Beguiling Step)</strong>: Charmed by Altarion until the start of Altarion's next turn.</p>`,
          durationRounds: 1,
          expiresAtStartOfTurnOf: ledger.sourceActorId
        });
        ui.notifications.info(
          `[Enchanter's Echo${tag}] ${actor.name} failed the Wisdom Save (${total} vs DC ${dc}) and is Charmed!`
        );
      } else if (!ledger.hadStatusBeforeRoll) {
        await AM.removeStatusEffect(actor, "charmed");
        if (sourceLabel) {
          ui.notifications.info(
            `[Enchanter's Echo${tag}] ${actor.name} now succeeded on the Wisdom Save (${total} vs DC ${dc}) — Charmed removed!`
          );
        }
      }
    }

    if (rollMessage?.update) {
      await rollMessage.update({ [`flags.${MODULE_ID}.rollLedger`]: ledger });
    }
  }

  /* -------------------------------------------- */
  /*  7. Concentration & Death Saving Throws      */
  /* -------------------------------------------- */

  static async registerConcentrationSaveLedger(rollMessage, actor, dc) {
    if (!rollMessage || !actor) return;
    const stats = this.extractD20Stats(rollMessage);
    const snapKey = actor.uuid || actor.id;
    let snap = this._concSnapshotsByActor.get(snapKey);
    if (!snap || Date.now() - (snap.timestamp || 0) > 30000) {
      this._snapshotActorConcentration(actor);
      snap = this._concSnapshotsByActor.get(snapKey);
    }

    const ledger = {
      kind: "concentration-save",
      actorId: actor.id,
      actorUuid: actor.uuid,
      dc: Number(dc || 10),
      origNat: stats.nat,
      origTotal: stats.total,
      currentNat: stats.nat,
      currentTotal: stats.total,
      currentSuccess: stats.total >= Number(dc || 10),
      concSnapshot: snap || null
    };

    if (rollMessage.update) {
      await rollMessage.update({ [`flags.${MODULE_ID}.rollLedger`]: ledger });
    }
  }

  static async evaluateConcentrationSaveLedger(
    rollMessage,
    ledger,
    { newTotal, newNat, forceSuccess = false, sourceLabel = "" } = {}
  ) {
    const AM = globalThis.AltarionAutomationManager;
    if (!AM) return;
    const actor = await AM.resolveActorFromUuidOrId(ledger.actorUuid, ledger.actorId);
    if (!actor || !actor.isOwner) return;

    const total = Number.isFinite(Number(newTotal)) ? Number(newTotal) : Number(ledger.currentTotal ?? 10);
    const nat = Number.isFinite(Number(newNat)) ? Number(newNat) : Number(ledger.currentNat ?? 10);
    const dc = Number(ledger.dc || 10);
    const wasSuccess = Boolean(ledger.currentSuccess);
    const nowSuccess = Boolean(forceSuccess) || total >= dc;

    ledger.currentTotal = total;
    ledger.currentNat = nat;
    ledger.currentSuccess = nowSuccess;

    if (wasSuccess && !nowSuccess) {
      // Concentration save turned from Success -> Failure: end concentration!
      if (typeof actor.endConcentration === "function") {
        await actor.endConcentration();
      } else {
        const concIds = actor.effects
          .filter(e => String(e.name || "").toLowerCase().startsWith("concentrating") || e.statuses?.has?.("concentrating"))
          .map(e => e.id);
        if (concIds.length > 0) await AM.safeDeleteActorEffects(actor, concIds);
      }
      ui.notifications.warn(
        `[Concentration — ${sourceLabel}] ${actor.name} failed the Concentration save (${total} vs DC ${dc}) and lost concentration!`
      );
    } else if (!wasSuccess && nowSuccess && ledger.concSnapshot) {
      // Concentration save turned from Failure -> Success: restore snapshotted concentration & aura effects!
      const toRestore = [
        ...(ledger.concSnapshot.concEffects || []),
        ...(ledger.concSnapshot.dependentEffects || [])
      ];
      for (const effData of toRestore) {
        const cleanData = foundry.utils.deepClone(effData);
        delete cleanData._id;
        const alreadyPresent = actor.effects.some(e => e.name === cleanData.name);
        if (!alreadyPresent) {
          await actor.createEmbeddedDocuments("ActiveEffect", [cleanData]);
        }
      }
      if (typeof globalThis.CoriaAuraEngine?.syncAllSceneAuras === "function") {
        globalThis.CoriaAuraEngine.syncAllSceneAuras();
      }
      ui.notifications.info(
        `[Concentration — ${sourceLabel}] ${actor.name} succeeded on the Concentration save (${total} vs DC ${dc}) — Concentration restored!`
      );
    }

    if (rollMessage?.update) {
      await rollMessage.update({ [`flags.${MODULE_ID}.rollLedger`]: ledger });
    }
  }

  static async registerDeathSaveLedger(rollMessage, actor) {
    if (!rollMessage || !actor) return;
    const stats = this.extractD20Stats(rollMessage);
    const delta = this._computeDeathSaveDelta(stats.nat, stats.total);

    const ledger = {
      kind: "death-save",
      actorId: actor.id,
      actorUuid: actor.uuid,
      dc: 10,
      origNat: stats.nat,
      origTotal: stats.total,
      currentNat: stats.nat,
      currentTotal: stats.total,
      appliedDelta: delta
    };

    if (rollMessage.update) {
      await rollMessage.update({ [`flags.${MODULE_ID}.rollLedger`]: ledger });
    }
  }

  static _computeDeathSaveDelta(nat, total) {
    if (nat === 20) return { successes: 0, failures: 0, heal1Hp: true };
    if (nat === 1) return { successes: 0, failures: 2, heal1Hp: false };
    if (total >= 10) return { successes: 1, failures: 0, heal1Hp: false };
    return { successes: 0, failures: 1, heal1Hp: false };
  }

  static async evaluateDeathSaveLedger(rollMessage, ledger, { newTotal, newNat, sourceLabel = "" } = {}) {
    const AM = globalThis.AltarionAutomationManager;
    if (!AM) return;
    const actor = await AM.resolveActorFromUuidOrId(ledger.actorUuid, ledger.actorId);
    if (!actor || !actor.isOwner) return;

    const total = Number.isFinite(Number(newTotal)) ? Number(newTotal) : Number(ledger.currentTotal ?? 10);
    const nat = Number.isFinite(Number(newNat)) ? Number(newNat) : Number(ledger.currentNat ?? 10);

    const prevDelta = ledger.appliedDelta || this._computeDeathSaveDelta(ledger.currentNat, ledger.currentTotal);
    const nextDelta = this._computeDeathSaveDelta(nat, total);

    const curSucc = Number(actor.system?.attributes?.death?.success ?? 0);
    const curFail = Number(actor.system?.attributes?.death?.failure ?? 0);
    const curHp = Number(actor.system?.attributes?.hp?.value ?? 0);

    const nextSucc = Math.clamp(curSucc - Number(prevDelta.successes || 0) + Number(nextDelta.successes || 0), 0, 3);
    const nextFail = Math.clamp(curFail - Number(prevDelta.failures || 0) + Number(nextDelta.failures || 0), 0, 3);
    let nextHp = curHp;
    if (prevDelta.heal1Hp && !nextDelta.heal1Hp && curHp === 1) {
      nextHp = 0;
    } else if (!prevDelta.heal1Hp && nextDelta.heal1Hp && curHp === 0) {
      nextHp = 1;
    }

    await actor.update(
      {
        "system.attributes.death.success": nextSucc,
        "system.attributes.death.failure": nextFail,
        "system.attributes.hp.value": nextHp
      },
      { altarionBypassWard: true }
    );

    ledger.currentNat = nat;
    ledger.currentTotal = total;
    ledger.appliedDelta = nextDelta;

    ui.notifications.info(
      `[Death Save — ${sourceLabel}] Updated ${actor.name}'s Death Saves (Successes: ${nextSucc}/3, Failures: ${nextFail}/3${
        nextDelta.heal1Hp ? ", Regained 1 HP!" : ""
      }).`
    );

    if (rollMessage?.update) {
      await rollMessage.update({ [`flags.${MODULE_ID}.rollLedger`]: ledger });
    }
  }

  /* -------------------------------------------- */
  /*  8. Attack Rolls (Shield, Silvery Barbs, etc)*/
  /* -------------------------------------------- */

  static async evaluateAttackRollLedger(
    rollMessage,
    ledger,
    { newTotal, newNat, shieldAcBonus, shieldDefenderId, sourceLabel = "Reaction" } = {}
  ) {
    const AM = globalThis.AltarionAutomationManager;
    if (!AM || !Array.isArray(ledger.defenders)) return;

    const total = Number.isFinite(Number(newTotal)) ? Number(newTotal) : Number(ledger.currentTotal ?? 10);
    const nat = Number.isFinite(Number(newNat)) ? Number(newNat) : Number(ledger.currentNat ?? 10);
    const isCrit = nat === 20;
    const isFumble = nat === 1;

    ledger.currentTotal = total;
    ledger.currentNat = nat;

    for (const defEntry of ledger.defenders) {
      const defender = await AM.resolveActorFromUuidOrId(defEntry.defenderUuid, defEntry.defenderActorId);
      if (!defender) continue;

      if (
        Number.isFinite(Number(shieldAcBonus)) &&
        Number(shieldAcBonus) > 0 &&
        (!shieldDefenderId || defEntry.defenderActorId === shieldDefenderId)
      ) {
        defEntry.currentAc = Number(defEntry.baseAc || 10) + Number(shieldAcBonus);
      } else {
        // Also sync currentAc if Shield status effect is currently active on defender
        const liveAc = Number(defender.system?.attributes?.ac?.value ?? defEntry.currentAc ?? defEntry.baseAc ?? 10);
        if (liveAc > Number(defEntry.currentAc || 0)) {
          defEntry.currentAc = liveAc;
        }
      }

      const targetAc = Number(defEntry.currentAc ?? defEntry.baseAc ?? 10);
      const wasHit = Boolean(defEntry.wasHit);
      const nowHit = isCrit || (!isFumble && total >= targetAc);

      // --- Transition A: HIT -> MISS (Undo On-Hit Automations!) ---
      if (wasHit && !nowHit) {
        // A1. Undo Ancestral Shielding if it triggered on this attack
        const sh = defEntry.ancestralShielding;
        if (sh?.triggered && defender.isOwner) {
          const prevTemp = Math.max(0, Number(sh.prevTempHp || 0));
          const acBonus = Math.max(1, Number(sh.acBonus || 2));
          const intMod = Number(sh.intMod || 3);
          const riderLevel = Number(sh.riderLevel || 4);
          const altarion = (sh.casterActorId && game.actors?.get(sh.casterActorId)) || AM.getAltarionActor();

          await defender.update({ "system.attributes.hp.temp": prevTemp }, { altarionBypassWard: true });
          await AM.applyOrUpdateStatusEffect(defender, {
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
            expiresAtEndOfTurnOf: altarion?.id || defender.id,
            extraFlags: {
              isAncestralShieldingEffect: true,
              casterActorId: altarion?.id || defender.id,
              acBonus,
              intMod,
              riderLevel
            }
          });
          sh.triggered = false;

          const shCard = sh.cardMsgId ? game.messages?.get(sh.cardMsgId) : null;
          if (shCard?.update) {
            await shCard.update({
              content: `
                <div class="altarion-aitusa-ward-chat-tag altarion-arcane-armor-chat-card">
                  <div class="altarion-ward-header">
                    <i class="fas fa-undo"></i>
                    <span>Ancestral Shielding — Reverted (${foundry.utils.escapeHTML(sourceLabel)})</span>
                  </div>
                  <div class="altarion-ward-body">
                    <strong>${foundry.utils.escapeHTML(ledger.attackerName || "Attacker")}</strong>'s attack became a <strong class="coria-hl-failure">MISS</strong> (${total} vs AC ${targetAc}) after <strong>${foundry.utils.escapeHTML(sourceLabel)}</strong>!<br>
                    &bull; <strong>Temporary HP Reverted</strong> (${prevTemp} Temp HP) and <strong>Ancestral Shielding (+${acBonus} AC)</strong> restored on <strong>${foundry.utils.escapeHTML(defender.name)}</strong>.
                  </div>
                </div>
              `
            });
          }
        }

        // A2. Undo Arcane Armor / Shadow Armor / Armor of Agathys melee retaliation if it triggered on this attack
        const ret = defEntry.retaliation;
        if (ret?.triggered) {
          if (ret.autoApplied) {
            await AM.undoRetaliationDamageOnTarget({
              attackerUuid: ledger.attackerUuid,
              attackerActorId: ledger.attackerActorId,
              damage: Number(ret.damage || 5),
              armorLabel: `${ret.armorLabel || "Arcane Armor"} (${sourceLabel} → Miss)`
            });
            ret.autoApplied = false;
          }
          ret.triggered = false;

          const retCard = ret.cardMsgId ? game.messages?.get(ret.cardMsgId) : null;
          if (retCard?.update) {
            await retCard.update({
              content: `
                <div class="altarion-aitusa-ward-chat-tag altarion-arcane-armor-chat-card">
                  <div class="altarion-ward-header">
                    <i class="fas fa-undo"></i>
                    <span>${foundry.utils.escapeHTML(ret.armorLabel || "Arcane Armor")} — Retaliation Reverted (${foundry.utils.escapeHTML(sourceLabel)})</span>
                  </div>
                  <div class="altarion-ward-body">
                    <strong>${foundry.utils.escapeHTML(ledger.attackerName || "Attacker")}</strong>'s melee attack against <strong>${foundry.utils.escapeHTML(defender.name)}</strong> became a <strong class="coria-hl-failure">MISS</strong> (${total} vs AC ${targetAc}) after <strong>${foundry.utils.escapeHTML(sourceLabel)}</strong>!<br>
                    &bull; The retaliation damage (<strong>${ret.damage} ${ret.damageTypeLabel || "Force"}</strong>) was automatically undone (<strong class="coria-hl-success">+${ret.damage} HP restored</strong>).
                  </div>
                </div>
              `
            });
          }
        }
      }

      // --- Transition B: MISS -> HIT (Trigger On-Hit Automations!) ---
      if (!wasHit && nowHit && AM.isAuthoritativeClientFor(defender)) {
        // B1. Trigger Ancestral Shielding if active on defender
        if (!defEntry.ancestralShielding?.triggered && AM.hasStatus(defender, "ancestral-shielding")) {
          const shResult = await AM.triggerAncestralShieldingOnHit({
            defender,
            attackerName: ledger.attackerName || "Attacker",
            total,
            defenderAc: targetAc,
            isCrit
          });
          if (shResult) {
            defEntry.ancestralShielding = shResult;
          }
        }

        // B2. Trigger Arcane Armor / Shadow Armor / Armor of Agathys melee retaliation if melee and active
        if (ledger.isMelee && !defEntry.retaliation?.triggered) {
          const armEff = AM.getRetaliatoryArmorEffect(defender);
          const curTemp = Number(defender.system?.attributes?.hp?.temp ?? 0);
          if (armEff && curTemp > 0) {
            const attackerActor = await AM.resolveActorFromUuidOrId(ledger.attackerUuid, ledger.attackerActorId);
            const retResult = await AM.triggerRetaliatoryArmorOnMeleeHit({
              defender,
              armEff,
              curTemp,
              attackerActor,
              attackerUuid: ledger.attackerUuid,
              attackerName: ledger.attackerName || "Attacker",
              total,
              defenderAc: targetAc,
              isCrit
            });
            if (retResult) {
              defEntry.retaliation = retResult;
            }
          }
        }
      }

      defEntry.wasHit = nowHit;
    }

    // Also re-evaluate Spiritual Weapon / Tentacle of the Deeps summon attack outcome if this attack was a summon attack
    if (
      rollMessage?.flags?.[MODULE_ID]?.summonAttackContext &&
      typeof AM.evaluateSummonAttackOutcome === "function"
    ) {
      const updatedAc = Number(ledger.defenders?.[0]?.currentAc ?? ledger.defenders?.[0]?.baseAc ?? NaN);
      await AM.evaluateSummonAttackOutcome({
        attackMessage: rollMessage,
        total,
        nat,
        targetAc: Number.isFinite(updatedAc) ? updatedAc : null,
        sourceLabel
      });
    }

    if (rollMessage?.update) {
      await rollMessage.update({ [`flags.${MODULE_ID}.rollLedger`]: ledger });
    }
  }

  /* ========================================================================== */
  /*  9. DAMAGE ROLL LEDGER & 4 DAMAGE REACTIONS                                */
  /*     - Shadow Rebuke (Kyrion)                                               */
  /*     - Absorb Elements (Any Caster + Flinn Intuitive Arcanum)               */
  /*     - Project Ward / Projected Ward (Altarion Arcane Ward)                 */
  /*     - Altarion's Echoing Ward (Altarion 1d8/slot + INT Temp HP Shield)     */
  /* ========================================================================== */

  static ELEMENTAL_TYPES = ["acid", "cold", "fire", "lightning", "thunder"];

  static ELEMENTAL_LABELS = {
    acid: "Acid",
    cold: "Cold",
    fire: "Fire",
    lightning: "Lightning",
    thunder: "Thunder"
  };

  static _damageLedgersByMsgId = new Map();

  /**
   * Check whether a ChatMessage is a Damage Roll card OR a module custom damage card (`coriaCustomDamage`).
   */
  static isDamageRollMessage(message) {
    if (!message) return false;
    if (message.blind && !game.user?.isGM) return false;

    const modFlags = message.flags?.[MODULE_ID] || {};
    if (
      modFlags.isArcaneWardCard ||
      modFlags.isAncestralShieldingCard ||
      modFlags.isPathsOfDestinyCard ||
      modFlags.isD20ReactionCard ||
      modFlags.isDamageReactionCard ||
      modFlags.isPortentBlindRoll
    ) {
      return false;
    }

    // Module custom damage cards (Spirit Guardians, Tentacle of the Deeps, Spiritual Weapon,
    // Shadow Rebuke, Arcane/Dark Blade movement, Retaliatory Armor, Plague EC4/EC6, Dark Vitality)
    if (modFlags.coriaCustomDamage && Number(modFlags.coriaCustomDamage.origDamage || 0) > 0) {
      return true;
    }

    if (!message.rolls?.length) return false;

    if (
      modFlags.isArcaneArmorRetaliationCard ||
      modFlags.isSpiritGuardiansDamageCard ||
      modFlags.isShadowRebukeDamageCard
    ) {
      return false;
    }

    const dndFlags = message.flags?.dnd5e || {};
    const rawType = String(
      dndFlags.roll?.type || dndFlags.activity?.type || message.rolls[0]?.options?.type || ""
    ).toLowerCase();

    if (rawType === "healing" || rawType === "temphp") return false;
    if (
      rawType === "attack" ||
      rawType === "save" ||
      rawType === "savingthrow" ||
      rawType === "concentration" ||
      rawType === "death" ||
      rawType === "skill" ||
      rawType === "ability" ||
      rawType === "tool"
    ) {
      return false;
    }

    if (rawType === "damage") return true;

    const dmgTypesConfig = CONFIG?.DND5E?.damageTypes || {};
    for (const r of message.rolls) {
      if (r?.constructor?.name === "DamageRoll") {
        const optType = String(r.options?.type || "").toLowerCase();
        if (optType === "healing" || optType === "temphp") return false;
        return true;
      }
      const optType = String(r?.options?.type || "").toLowerCase();
      if (optType && optType in dmgTypesConfig) return true;
      if (Array.isArray(r?.options?.types) && r.options.types.some(t => String(t).toLowerCase() in dmgTypesConfig)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Extract total damage and damage-by-type breakdown from a Damage Roll ChatMessage.
   */
  static extractDamageRollInfo(message) {
    const modState = message?.flags?.[MODULE_ID]?.damageModState;
    const ledger = this.getDamageLedger(message);
    const customDmg = message?.flags?.[MODULE_ID]?.coriaCustomDamage;

    if (customDmg && Number(customDmg.origDamage || 0) > 0) {
      const origTotalDamage = Math.max(
        0,
        Number(modState?.origTotalDamage ?? customDmg.origDamage ?? 0)
      );
      const currentTotalDamage = Math.max(
        0,
        Number(modState?.currentTotalDamage ?? customDmg.currentDamage ?? origTotalDamage)
      );
      const dType = String(customDmg.damageType || "untyped").trim().toLowerCase();
      const byType = { [dType]: currentTotalDamage };
      const elementalTypes = this.ELEMENTAL_TYPES.filter(t => Number(byType[t] || 0) > 0);
      const primaryElementalType = elementalTypes[0] || null;
      return {
        origTotalDamage,
        currentTotalDamage,
        byType,
        elementalTypes,
        primaryElementalType,
        primaryElementalDamage: primaryElementalType ? currentTotalDamage : 0
      };
    }

    const rolls = message?.rolls || [];

    const byType = {};
    let rawTotal = 0;

    const addTypeDmg = (t, amt) => {
      const clean = String(t || "").trim().toLowerCase();
      if (!clean) return;
      byType[clean] = (byType[clean] || 0) + Math.max(0, Number(amt || 0));
    };

    for (const r of rolls) {
      const rTotal = Math.max(0, Number(r?.total ?? 0));
      rawTotal += rTotal;

      const rType =
        r?.options?.type ||
        (Array.isArray(r?.options?.types) && r.options.types.length > 0 ? r.options.types[0] : null);
      if (rType) {
        addTypeDmg(rType, rTotal);
      } else if (Array.isArray(r?.terms)) {
        let termTypedSum = 0;
        for (const term of r.terms) {
          const flav = String(term?.options?.flavor || "").trim().toLowerCase();
          if (flav && Number.isFinite(Number(term?.total))) {
            addTypeDmg(flav, Number(term.total));
            termTypedSum += Number(term.total);
          }
        }
        if (termTypedSum === 0 && rTotal > 0) {
          byType.untyped = (byType.untyped || 0) + rTotal;
        }
      }
    }

    // Also inspect associated item / activity and flavor text if no explicit damage type was tagged on the roll
    const assocItem = message?.getAssociatedItem?.();
    const dndFlags = message?.flags?.dnd5e || {};
    const actId = dndFlags.activity?.id;
    const activity =
      (actId && assocItem?.system?.activities?.get?.(actId)) ||
      assocItem?.system?.activities?.contents?.[0] ||
      null;

    if (activity?.damage?.parts?.length) {
      for (const part of activity.damage.parts) {
        const typesArr = Array.from(part?.types || []);
        for (const t of typesArr) {
          const clean = String(t || "").toLowerCase();
          if (clean && !(clean in byType)) {
            byType[clean] = rawTotal;
          }
        }
      }
    } else if (Array.isArray(assocItem?.system?.damage?.parts)) {
      for (const part of assocItem.system.damage.parts) {
        const t = String(part?.[1] || "").toLowerCase();
        if (t && !(t in byType)) {
          byType[t] = rawTotal;
        }
      }
    }

    const textToScan = `${message?.flavor || ""} ${message?.content || ""} ${assocItem?.name || ""}`.toLowerCase();
    const keywordMap = {
      acid: ["acid", "ácido", "acido"],
      cold: ["cold", "frio", "gelo"],
      fire: ["fire", "fogo", "ígneo", "igneo"],
      lightning: ["lightning", "elétrico", "eletrico", "relâmpago", "relampago"],
      thunder: ["thunder", "trovão", "trovao", "trovejante"]
    };
    for (const [elemKey, words] of Object.entries(keywordMap)) {
      if (!(elemKey in byType) && words.some(w => new RegExp(`\\b${w}\\b`, "i").test(textToScan))) {
        byType[elemKey] = rawTotal;
      }
    }

    const elementalTypes = this.ELEMENTAL_TYPES.filter(t => Number(byType[t] || 0) > 0);
    let primaryElementalType = null;
    let primaryElementalDamage = 0;
    for (const t of elementalTypes) {
      const amt = Number(byType[t] || 0);
      if (amt > primaryElementalDamage) {
        primaryElementalType = t;
        primaryElementalDamage = amt;
      }
    }

    const origTotalDamage = Number(
      modState?.origTotalDamage ?? ledger?.origTotalDamage ?? rawTotal
    );
    const currentTotalDamage = Number(
      modState?.currentTotalDamage ?? ledger?.currentTotalDamage ?? rawTotal
    );

    return {
      origTotalDamage,
      currentTotalDamage,
      byType,
      elementalTypes,
      primaryElementalType,
      primaryElementalDamage: primaryElementalDamage || (primaryElementalType ? currentTotalDamage : 0)
    };
  }

  /**
   * Resolve the attacker and targeted/candidate victims for a Damage Roll ChatMessage.
   */
  static resolveDamageRollParticipants(message) {
    const AM = globalThis.AltarionAutomationManager;
    const dndFlags = message?.flags?.dnd5e || {};
    const ledger = this.getDamageLedger(message);
    const customDmg = message?.flags?.[MODULE_ID]?.coriaCustomDamage;

    const resolveSyncActor = (uuid, id) => {
      if (uuid && typeof fromUuidSync === "function") {
        try {
          const doc = fromUuidSync(uuid);
          if (doc?.documentName === "Token" && doc.actor) return doc.actor;
          if (doc?.documentName === "Actor") return doc;
          if (doc?.actor) return doc.actor;
        } catch (_e) {}
      }
      if (id) {
        const worldAct = game.actors?.get(id);
        if (worldAct) return worldAct;
        const tokMatch = canvas?.tokens?.placeables?.find(t => t.actor?.id === id || t.id === id);
        if (tokMatch?.actor) return tokMatch.actor;
      }
      return null;
    };

    // 1. Resolve Attacker
    const scene = message?.speaker?.scene ? game.scenes?.get(message.speaker.scene) : canvas?.scene;
    const attackerTokenDoc =
      message?.speaker?.token && scene ? scene.tokens?.get(message.speaker.token) : null;
    const customAttacker = customDmg
      ? resolveSyncActor(customDmg.attackerUuid, customDmg.attackerActorId)
      : null;
    const attackerActor =
      customAttacker ||
      attackerTokenDoc?.actor ||
      ChatMessage.getSpeakerActor?.(message?.speaker) ||
      (message?.speaker?.actor ? game.actors?.get(message.speaker.actor) : null);
    const attackerTok =
      (attackerActor && AM ? AM.getActorCanvasToken(attackerActor) : null) ||
      (message?.speaker?.token && canvas?.tokens?.get?.(message.speaker.token)) ||
      null;
    const attackerName =
      customDmg?.attackerName ||
      attackerTokenDoc?.name ||
      attackerTok?.name ||
      attackerActor?.name ||
      message?.speaker?.alias ||
      "Attacker";
    const attackerUuid =
      customDmg?.attackerUuid || attackerActor?.uuid || attackerTokenDoc?.uuid || "";

    // 2. Resolve Explicit Victim Actors (deduplicating synthetic token actors vs world base actors!)
    const explicitVictims = [];
    const addVictim = (act) => {
      if (!act || !act.id) return;
      const actIsTok = Boolean(act.isToken);
      const actUuid = String(act.uuid || "");
      for (let i = 0; i < explicitVictims.length; i++) {
        const v = explicitVictims[i];
        const vIsTok = Boolean(v.isToken);
        const vUuid = String(v.uuid || "");
        if (vUuid && actUuid && vUuid === actUuid) return;
        if (v.id === act.id) {
          // Two distinct unlinked tokens on canvas from the same prototype NPC -> keep both!
          if (vIsTok && actIsTok) continue;
          // Synthetic token actor already registered -> ignore duplicate world base actor!
          if (vIsTok && !actIsTok) return;
          // World base actor was registered first -> upgrade it in-place to the actual synthetic token actor!
          if (!vIsTok && actIsTok) {
            explicitVictims[i] = act;
            return;
          }
          // Both are world base actors with the same ID -> duplicate!
          return;
        }
      }
      explicitVictims.push(act);
    };

    let hasCustomExplicitVictims = false;
    if (customDmg) {
      const cTarget = resolveSyncActor(customDmg.targetUuid, customDmg.targetActorId);
      if (cTarget) {
        addVictim(cTarget);
        hasCustomExplicitVictims = true;
      }
      if (Array.isArray(customDmg.targets)) {
        for (const t of customDmg.targets) {
          const act = resolveSyncActor(t?.targetUuid, t?.targetActorId);
          if (act) {
            addVictim(act);
            hasCustomExplicitVictims = true;
          }
        }
      }
    }

    // Priority A: `dndFlags.targets` on the damage message itself (skip if `coriaCustomDamage` already defined explicit targets)
    if (!hasCustomExplicitVictims && Array.isArray(dndFlags.targets)) {
      for (const tEntry of dndFlags.targets) {
        let act = null;
        if (tEntry?.uuid && typeof fromUuidSync === "function") {
          try {
            const doc = fromUuidSync(tEntry.uuid);
            act = doc?.documentName === "Token" ? doc.actor : doc?.actor || doc;
          } catch (_e) {}
        }
        if (!act && tEntry?.name) {
          const low = tEntry.name.trim().toLowerCase();
          act = game.actors?.find(a => a.name?.trim().toLowerCase() === low) || null;
        }
        if (act) addVictim(act);
      }
    }

    // Priority B: Victims recorded in `damageLedger.targetActorUuids` / `targetActorIds` (skip if `coriaCustomDamage` already defined explicit targets)
    if (!hasCustomExplicitVictims) {
      if (Array.isArray(ledger?.targetActorUuids)) {
        for (const aUuid of ledger.targetActorUuids) {
          const act = resolveSyncActor(aUuid, "");
          if (act) addVictim(act);
        }
      }
      if (Array.isArray(ledger?.targetActorIds)) {
        for (const aId of ledger.targetActorIds) {
          const act = game.actors?.get(aId);
          if (act) addVictim(act);
        }
      }
    }

    // Priority C: Originating message or recent Attack/Save message from the same speaker within the last 60s
    if (explicitVictims.length === 0) {
      const origMsgId = dndFlags.originatingMessage;
      const origMsg = origMsgId ? game.messages?.get(origMsgId) : null;
      const messagesToCheck = origMsg
        ? [origMsg]
        : Array.from(game.messages || [])
            .slice(-12)
            .reverse()
            .filter(
              m =>
                m.id !== message.id &&
                (m.speaker?.token === message.speaker?.token || m.speaker?.actor === message.speaker?.actor) &&
                Math.abs(Number(message.timestamp || Date.now()) - Number(m.timestamp || 0)) < 60000
            );

      for (const m of messagesToCheck) {
        const mTargets = m?.flags?.dnd5e?.targets;
        if (Array.isArray(mTargets) && mTargets.length > 0) {
          for (const tEntry of mTargets) {
            let act = null;
            if (tEntry?.uuid && typeof fromUuidSync === "function") {
              try {
                const doc = fromUuidSync(tEntry.uuid);
                act = doc?.documentName === "Token" ? doc.actor : doc?.actor || doc;
              } catch (_e) {}
            }
            if (!act && tEntry?.name) {
              const low = tEntry.name.trim().toLowerCase();
              act = game.actors?.find(a => a.name?.trim().toLowerCase() === low) || null;
            }
            if (act) addVictim(act);
          }
          if (explicitVictims.length > 0) break;
        }
      }
    }

    // Priority D: Author's or current user's targeted tokens on canvas (if message is very recent)
    if (explicitVictims.length === 0 && Date.now() - Number(message?.timestamp || 0) < 120000) {
      const authorUser = message.author || (message.user ? game.users?.get(message.user) : null);
      for (const tok of authorUser?.targets || []) {
        if (tok?.actor) addVictim(tok.actor);
      }
    }

    // 3. Candidate Victims (if explicitVictims exist, use them; otherwise include friendly PCs/companions on canvas)
    const hasExplicitVictims = explicitVictims.length > 0;
    const candidateVictims = [...explicitVictims];
    if (!hasExplicitVictims) {
      for (const tok of canvas?.tokens?.placeables || []) {
        const act = tok?.actor;
        if (!act) continue;
        if (attackerActor && act.id === attackerActor.id && act.type !== "character") continue;
        if (act.type === "character" || AM?.isAitusa?.(act)) {
          if (!candidateVictims.some(v => v.id === act.id)) {
            candidateVictims.push(act);
          }
        }
      }
      if (candidateVictims.length === 0) {
        for (const act of game.actors || []) {
          if (act.type === "character" || AM?.isAitusa?.(act)) {
            if (!candidateVictims.some(v => v.id === act.id)) {
              candidateVictims.push(act);
            }
          }
        }
      }
    }

    return {
      attackerActor,
      attackerTok,
      attackerName,
      attackerUuid,
      explicitVictims,
      candidateVictims,
      hasExplicitVictims
    };
  }

  static getDamageLedger(message) {
    if (!message) return null;
    return (
      message.flags?.[MODULE_ID]?.damageLedger ||
      this._damageLedgersByMsgId.get(message.id) ||
      null
    );
  }

  /**
   * Snapshot pre-damage HP / Temp HP / Arcane Ward HP when a Damage Roll ChatMessage is created.
   */
  static async captureDamageRollSnapshot(message) {
    if (!message || !this.isDamageRollMessage(message)) return null;
    const existing = message.flags?.[MODULE_ID]?.damageLedger;
    if (existing) {
      this._damageLedgersByMsgId.set(message.id, existing);
      return existing;
    }

    const dmgInfo = this.extractDamageRollInfo(message);
    const {
      attackerActor,
      attackerName,
      attackerUuid,
      explicitVictims,
      candidateVictims
    } = this.resolveDamageRollParticipants(message);

    const actorsState = {};
    const toSnapshot = new Map();
    for (const v of [...explicitVictims, ...candidateVictims]) {
      if (v?.id) toSnapshot.set(v.id, v);
    }
    for (const tok of canvas?.tokens?.placeables || []) {
      if (tok?.actor?.id) toSnapshot.set(tok.actor.id, tok.actor);
    }
    for (const act of game.actors || []) {
      if (act?.type === "character") toSnapshot.set(act.id, act);
    }

    for (const [id, act] of toSnapshot.entries()) {
      actorsState[id] = {
        actorId: act.id,
        actorUuid: act.uuid,
        actorName: act.name,
        preHp: Number(act.system?.attributes?.hp?.value ?? 0),
        preTemp: Number(act.system?.attributes?.hp?.temp ?? 0),
        preWard: Number(act.system?.resources?.tertiary?.value ?? 0),
        damageApplied: false,
        appliedDamageTotal: 0
      };
    }

    const ledger = {
      messageId: message.id,
      timestamp: Date.now(),
      origTotalDamage: dmgInfo.origTotalDamage,
      currentTotalDamage: dmgInfo.currentTotalDamage,
      byType: dmgInfo.byType,
      primaryElementalType: dmgInfo.primaryElementalType,
      primaryElementalDamage: dmgInfo.primaryElementalDamage,
      attackerUuid,
      attackerActorId: attackerActor?.id || "",
      attackerName,
      targetActorIds: explicitVictims.map(v => v.id),
      actorsState,
      usedReactions: {}
    };

    this._damageLedgersByMsgId.set(message.id, ledger);

    if (game.user?.isGM || message.isAuthor) {
      try {
        await message.update({
          [`flags.${MODULE_ID}.damageLedger`]: ledger
        });
      } catch (_e) {
        // ignore
      }
    }

    return ledger;
  }

  /**
   * Called from `Hooks.on("preUpdateActor")` / `updateActor` whenever an actor loses HP, Temp HP, or Arcane Ward HP.
   * Associates that damage (and its exact Ward / Temp HP / HP breakdown!) with the most recent Damage Roll ChatMessage
   * (within 2 minutes) and records it in `_actorDamageLayerHistory` for accurate layered Undo & Reaction reversals!
   */
  static recordActorDamageTakenFromRecentRoll(
    actor,
    { preHp, preTemp, preWard, postHp, postTemp, postWard, wardMax, wardActive, totalLost }
  ) {
    if (!actor || totalLost <= 0) return;

    const curHp = Number(postHp ?? actor.system?.attributes?.hp?.value ?? 0);
    const curTemp = Number(postTemp ?? actor.system?.attributes?.hp?.temp ?? 0);
    const curWard = Number(postWard ?? actor.system?.resources?.tertiary?.value ?? 0);
    const beforeLayers = {
      hp: Number(preHp ?? curHp),
      temp: Number(preTemp ?? curTemp),
      ward: Number(preWard ?? curWard),
      wardMax: Number(wardMax ?? actor.system?.resources?.tertiary?.max ?? 0),
      wardActive: Boolean(
        wardActive ?? (Number(preWard ?? 0) > 0 || actor.getFlag?.(MODULE_ID, "arcaneWardActive"))
      )
    };
    const afterLayers = {
      hp: curHp,
      temp: curTemp,
      ward: curWard,
      wardMax: beforeLayers.wardMax,
      wardActive: beforeLayers.wardActive
    };
    const damageLayers = this.computeDamageLayersDiff(beforeLayers, afterLayers, totalLost);

    const recentMsgs = Array.from(game.messages || []).slice(-10).reverse();
    const dmgMsg = recentMsgs.find(
      m =>
        this.isDamageRollMessage(m) &&
        Date.now() - Number(m.timestamp || 0) < 120000
    );

    this.pushActorDamageLayerEvent(actor, damageLayers, dmgMsg?.id || "");
    if (!dmgMsg) return;

    let ledger = foundry.utils.deepClone(this.getDamageLedger(dmgMsg));
    if (!ledger) return;

    ledger.actorsState ??= {};
    const stateKey = actor.isToken && actor.uuid ? actor.uuid : actor.id;
    const prevEntry = ledger.actorsState[stateKey] || ledger.actorsState[actor.id];
    if (!prevEntry || !prevEntry.damageApplied) {
      const entryObj = {
        actorId: actor.id,
        actorUuid: actor.uuid,
        actorName: actor.name,
        preHp: beforeLayers.hp,
        preTemp: beforeLayers.temp,
        preWard: beforeLayers.ward,
        damageApplied: true,
        appliedDamageTotal: totalLost,
        damageLayers
      };
      ledger.actorsState[stateKey] = entryObj;
      if (actor.uuid && stateKey !== actor.uuid) ledger.actorsState[actor.uuid] = entryObj;
    }

    ledger.targetActorUuids ??= [];
    if (actor.uuid && !ledger.targetActorUuids.includes(actor.uuid)) {
      ledger.targetActorUuids.push(actor.uuid);
    }
    ledger.targetActorIds ??= [];
    if (!ledger.targetActorIds.includes(actor.id)) {
      ledger.targetActorIds.push(actor.id);
    }

    this._damageLedgersByMsgId.set(dmgMsg.id, ledger);

    if (game.user?.isGM || dmgMsg.isAuthor) {
      setTimeout(async () => {
        try {
          await dmgMsg.update({ [`flags.${MODULE_ID}.damageLedger`]: ledger });
        } catch (_e) {}
      }, 60);
    } else {
      for (const el of document.querySelectorAll(`[data-message-id="${dmgMsg.id}"]`)) {
        this.renderDamageReactionsBar(dmgMsg, el, { forceRefresh: true });
      }
    }
  }

  /**
   * Render the Damage Reaction Buttons Bar (`.coria-damage-reactions-bar`) on a Damage Roll ChatMessage:
   * - Shadow Rebuke (Kyrion & GM only, when Kyrion takes damage from creature within 60 ft)
   * - Absorb Elements (Victim & GM only, on Acid/Cold/Fire/Lightning/Thunder damage, including Flinn Intuitive Arcanum)
   * - Project Ward (Altarion & GM only, when creature != Altarion within 30 ft takes damage & Arcane Ward > 0 HP)
   * - Altarion's Echoing Ward (Altarion & GM only, when Altarion or creature within 30 ft takes damage)
   */
  static renderDamageReactionsBar(message, rootEl, { forceRefresh = false } = {}) {
    if (!message || !rootEl || !this.isDamageRollMessage(message)) return;
    if (!this._damageLedgersByMsgId.has(message.id) && !message.flags?.[MODULE_ID]?.damageLedger) {
      this.captureDamageRollSnapshot(message);
    }

    if (forceRefresh) {
      for (const oldBar of rootEl.querySelectorAll(".coria-damage-reactions-bar")) {
        oldBar.remove();
      }
    } else if (rootEl.querySelector(".coria-damage-reactions-bar")) {
      return;
    }

    const FM = globalThis.FlinnManager;
    const AM = globalThis.AltarionAutomationManager;
    if (!FM || !AM) return;

    const dmgInfo = this.extractDamageRollInfo(message);
    if (dmgInfo.origTotalDamage <= 0 && dmgInfo.currentTotalDamage <= 0) return;

    const {
      attackerActor,
      attackerTok,
      attackerName,
      attackerUuid,
      candidateVictims
    } = this.resolveDamageRollParticipants(message);

    const buttonsHtmlList = [];
    const emittedBtnKeys = new Set();
    const pushBtnUnique = (key, htmlStr) => {
      if (emittedBtnKeys.has(key)) return;
      emittedBtnKeys.add(key);
      buttonsHtmlList.push(htmlStr);
    };

    // ------------------------------------------------------------------------
    // 1. SHADOW REBUKE (Kyrion only: damaged by creature within 60 ft & has slots)
    // ------------------------------------------------------------------------
    const kyrion =
      AM.getKyrionActor?.() ||
      game.actors?.find(a => !isIgnoredBackupActor(a) && (a.name?.trim().toLowerCase() === "kyrion" || a.name?.trim().toLowerCase().startsWith("kyrion ")));
    if (kyrion && FM.isUserControllerOf(kyrion)) {
      const kyrionIsVictim = candidateVictims.some(v => v.id === kyrion.id);
      if (kyrionIsVictim && (!attackerActor || attackerActor.id !== kyrion.id)) {
        const kyrionTok = AM.getActorCanvasToken(kyrion);
        const distToKyrion =
          kyrionTok && attackerTok && kyrionTok.id !== attackerTok.id
            ? AM.getTokenDistanceFt(kyrionTok, attackerTok)
            : 0;
        const within60Ft = distToKyrion === null || distToKyrion <= 60;
        const rebukeInfo = FM.getReadyReactionSpellInfo(kyrion, "shadow rebuke");

        if (within60Ft && rebukeInfo) {
          pushBtnUnique(
            `shadow-rebuke:${kyrion.id}:${kyrion.id}`,
            `
            <button type="button" class="coria-dmg-react-btn btn-shadow"
                    data-dmg-react="shadow-rebuke"
                    data-caster-id="${kyrion.id}"
                    data-victim-id="${kyrion.id}"
                    title="Conjurar Shadow Rebuke (${kyrion.name}): Retaliar ${foundry.utils.escapeHTML(attackerName)} com sombras abissais (Salvaguarda de Destreza)">
              <i class="fas fa-fire-alt"></i> Shadow Rebuke (${kyrion.name})
            </button>
          `
          );
        }
      }
    }

    // ------------------------------------------------------------------------
    // 2. ABSORB ELEMENTS (Acid, Cold, Fire, Lightning, or Thunder damage)
    //    Includes Flinn's Intuitive Arcanum if unprepared in his Wizard spellbook!
    // ------------------------------------------------------------------------
    const elemType = dmgInfo.primaryElementalType;
    if (elemType) {
      const elemLabel = this.ELEMENTAL_LABELS[elemType] || elemType;
      for (const victim of candidateVictims) {
        if (!victim || !FM.isUserControllerOf(victim)) continue;
        const aeInfo = FM.getReadyReactionSpellInfo(victim, "absorb elements");
        if (!aeInfo) continue;

        const vKey = victim.isToken ? victim.uuid || victim.id : victim.id;
        const iaSuffix = aeInfo.requiresIntuitiveArcanum ? " [Intuitive Arcanum]" : "";
        pushBtnUnique(
          `absorb-elements:${victim.id}:${vKey}:${elemType}`,
          `
          <button type="button" class="coria-dmg-react-btn btn-arcane"
                  data-dmg-react="absorb-elements"
                  data-caster-id="${victim.id}"
                  data-victim-id="${victim.id}"
                  data-victim-uuid="${victim.uuid || ""}"
                  data-element-type="${elemType}"
                  title="Conjurar Absorb Elements (${victim.name}${iaSuffix}): Resistência a ${elemLabel} até o final do próximo turno, reduzindo o dano pela metade e adicionando +1d6/nível ${elemLabel} no próximo ataque">
            <i class="fas fa-shield-virus"></i> Absorb Elements (${elemLabel} — ${victim.name}${iaSuffix})
          </button>
        `
        );
      }
    }

    // ------------------------------------------------------------------------
    // 3. PROJECT WARD & 4. ALTARION'S ECHOING WARD (Altarion & GM only)
    // ------------------------------------------------------------------------
    const altarion = AM.getAltarionActor?.();
    if (altarion && FM.isUserControllerOf(altarion)) {
      const altarionTok = AM.getActorCanvasToken(altarion);
      const wardState = AM.getArcaneWardState?.(altarion);
      const wardActiveAndPositive = Boolean(
        wardState && wardState.eligible && wardState.active && wardState.current > 0
      );
      const echoingInfo = FM.getReadyReactionSpellInfo(altarion, "altarion's echoing ward");

      for (const victim of candidateVictims) {
        if (!victim) continue;
        const victimTok = AM.getActorCanvasToken(victim);
        const distToAltarion =
          victim.id === altarion.id
            ? 0
            : altarionTok && victimTok
              ? AM.getTokenDistanceFt(altarionTok, victimTok)
              : 0;
        const within30Ft = distToAltarion === null || distToAltarion <= 30;
        if (!within30Ft) continue;

        const vKey = victim.isToken ? victim.uuid || victim.id : victim.id;

        // 3. Project Ward: only for creatures OTHER than Altarion within 30 ft when Arcane Ward > 0 HP
        if (victim.id !== altarion.id && wardActiveAndPositive && dmgInfo.currentTotalDamage > 0) {
          pushBtnUnique(
            `project-ward:${altarion.id}:${vKey}`,
            `
            <button type="button" class="coria-dmg-react-btn btn-arcane"
                    data-dmg-react="project-ward"
                    data-caster-id="${altarion.id}"
                    data-victim-id="${victim.id}"
                    data-victim-uuid="${victim.uuid || ""}"
                    title="Project Ward (${altarion.name} → ${victim.name}): Absorver até ${wardState.current} de dano com a Arcane Ward do Altarion">
              <i class="fas fa-shield-alt"></i> Project Ward (${victim.name} — Ward ${wardState.current} PV)
            </button>
          `
          );
        }

        // 4. Altarion's Echoing Ward: for Altarion or any creature within 30 ft
        if (echoingInfo) {
          pushBtnUnique(
            `echoing-ward:${altarion.id}:${vKey}`,
            `
            <button type="button" class="coria-dmg-react-btn btn-cleric-gold"
                    data-dmg-react="echoing-ward"
                    data-caster-id="${altarion.id}"
                    data-victim-id="${victim.id}"
                    data-victim-uuid="${victim.uuid || ""}"
                    title="Conjurar Altarion's Echoing Ward em ${victim.name}: Rolar 1d8/nível + INT de PV Temporários para absorver o dano">
              <i class="fas fa-hand-sparkles"></i> Altarion's Echoing Ward (${victim.name})
            </button>
          `
          );
        }
      }
    }

    // ------------------------------------------------------------------------
    // 5. CARD OF THE RESONANT ARCANA — THE FOOL (Flinn & GM only, when Flinn takes damage)
    // ------------------------------------------------------------------------
    const flinn = FM.getFlinnActor?.();
    if (flinn && globalThis.CoriaResonantArcana?.buildTheFoolButtonHtml) {
      const foolBtnHtml = globalThis.CoriaResonantArcana.buildTheFoolButtonHtml({
        flinn,
        candidateVictims,
        dmgInfo
      });
      if (foolBtnHtml) {
        pushBtnUnique(`the-fool:${flinn.id}`, foolBtnHtml);
      }
    }

    if (buttonsHtmlList.length === 0) return;

    const bar = document.createElement("div");
    bar.className = "coria-damage-reactions-bar coria-d20-reactions-bar coria-paths-of-destiny-bar";
    bar.innerHTML = buttonsHtmlList.join("");

    for (const btn of bar.querySelectorAll(".coria-dmg-react-btn")) {
      btn.addEventListener("click", async (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        await this.executeDamageReactionButton({
          reactType: btn.getAttribute("data-dmg-react") || "",
          damageMessageId: message.id,
          casterId: btn.getAttribute("data-caster-id") || "",
          victimId: btn.getAttribute("data-victim-id") || "",
          victimUuid: btn.getAttribute("data-victim-uuid") || "",
          elementType: btn.getAttribute("data-element-type") || ""
        });
      });
    }

    this.placeReactionBarBelowRollResult(rootEl, bar);
  }

  /**
   * Ensure `.coria-damage-reactions-bar` and `.coria-d20-reactions-bar` always render BELOW the `.dice-roll`
   * result box, even when `dnd5e` injects or enriches `.dice-roll` / `<damage-application>` asynchronously.
   */
  static placeReactionBarBelowRollResult(rootEl, bar) {
    if (!rootEl || !bar) return;
    const place = () => {
      if (!rootEl.isConnected && !bar.parentElement) return;
      const contentContainer = rootEl.querySelector(".message-content") || rootEl;
      const diceRolls = contentContainer.querySelectorAll(".dice-roll, .dnd5e2.roll-card, .roll-card");
      const banner = contentContainer.querySelector(".coria-roll-mod-banner");
      if (diceRolls.length > 0) {
        const lastRoll = diceRolls[diceRolls.length - 1];
        if (banner) {
          lastRoll.insertAdjacentElement("afterend", banner);
          banner.insertAdjacentElement("afterend", bar);
        } else {
          lastRoll.insertAdjacentElement("afterend", bar);
        }
      } else {
        if (banner) contentContainer.appendChild(banner);
        contentContainer.appendChild(bar);
      }
    };
    place();
    requestAnimationFrame(place);
    setTimeout(place, 40);
    setTimeout(place, 150);
  }

  /**
   * Handle a click on one of the 4 Damage Reaction buttons (`shadow-rebuke`, `absorb-elements`, `project-ward`, `echoing-ward`).
   */
  static async executeDamageReactionButton({
    reactType,
    damageMessageId,
    casterId,
    victimId,
    victimUuid = "",
    elementType = ""
  } = {}) {
    const FM = globalThis.FlinnManager;
    const AM = globalThis.AltarionAutomationManager;
    if (!FM || !AM) return;

    const damageMessage = damageMessageId ? game.messages?.get(damageMessageId) : null;
    if (!damageMessage) return;

    const caster = casterId ? game.actors?.get(casterId) : null;
    const victim =
      (await AM.resolveActorFromUuidOrId?.(victimUuid, victimId)) ||
      (victimId && game.actors?.get(victimId)) ||
      caster;
    if (!caster || !FM.isUserControllerOf(caster)) return;

    const { attackerActor, attackerName, attackerUuid } =
      this.resolveDamageRollParticipants(damageMessage);

    // --- 0. CARD OF THE RESONANT ARCANA: THE FOOL (Flinn) ---
    if (reactType === "the-fool") {
      await globalThis.CoriaResonantArcana?.executeTheFoolReaction?.({
        flinn: caster,
        damageMessageId
      });
      return;
    }

    // --- 1. SHADOW REBUKE (Kyrion) ---
    if (reactType === "shadow-rebuke") {
      const rebukeInfo = FM.getReadyReactionSpellInfo(caster, "shadow rebuke");
      if (!rebukeInfo) {
        ui.notifications.warn(`${caster.name} não possui espaços de magia disponíveis para conjurar Shadow Rebuke!`);
        return;
      }

      const castRes = await FM.castReactionSpellWithFoundryDialog(caster, rebukeInfo, {
        returnDetails: true
      });
      if (!castRes?.completed) return;

      const slotLevel = Math.max(1, Number(castRes.slotLevel || rebukeInfo.slotLevel || 1));
      await AM.postShadowRebukeInteractiveSaveCard({
        kyrion: caster,
        attackerActor,
        attackerUuid,
        attackerName,
        slotLevel
      });
      return;
    }

    // --- 2. ABSORB ELEMENTS ---
    if (reactType === "absorb-elements") {
      const aeInfo = FM.getReadyReactionSpellInfo(caster, "absorb elements");
      if (!aeInfo) {
        ui.notifications.warn(`${caster.name} não possui espaços de magia disponíveis para conjurar Absorb Elements!`);
        return;
      }

      const reactionContext = {
        kind: "damage-reaction",
        reactType: "absorb-elements",
        damageMessageId,
        casterId: caster.id,
        victimId: victim.id,
        victimUuid: victim.uuid || victimUuid || "",
        elementType: elementType || "fire"
      };

      const castRes = await FM.castReactionSpellWithFoundryDialog(caster, aeInfo, {
        returnDetails: true,
        reactionContext
      });
      if (!castRes?.completed) return;
      // If cast via Intuitive Arcanum, `evaluateIntuitiveArcanumLedger` already called `executeDeferredIntuitiveReaction`!
      if (castRes.viaIntuitiveArcanum) return;

      const slotLevel = Math.max(1, Number(castRes.slotLevel || aeInfo.slotLevel || 1));
      await this.applyDamageReactionModification({
        reactType: "absorb-elements",
        damageMessageId,
        casterId: caster.id,
        victimId: victim.id,
        victimUuid: victim.uuid || victimUuid || "",
        elementType: elementType || "fire",
        slotLevel
      });
      return;
    }

    // --- 3. PROJECT WARD (Altarion's Arcane Ward) ---
    if (reactType === "project-ward") {
      const wardState = AM.getArcaneWardState?.(caster);
      if (!wardState || !wardState.eligible || !wardState.active || wardState.current <= 0) {
        ui.notifications.warn("A Arcane Ward do Altarion não está ativa ou está com 0 PV!");
        return;
      }

      await this.applyDamageReactionModification({
        reactType: "project-ward",
        damageMessageId,
        casterId: caster.id,
        victimId: victim.id,
        victimUuid: victim.uuid || victimUuid || ""
      });
      return;
    }

    // --- 4. ALTARION'S ECHOING WARD ---
    if (reactType === "echoing-ward") {
      const echoingInfo = FM.getReadyReactionSpellInfo(caster, "altarion's echoing ward");
      if (!echoingInfo) {
        ui.notifications.warn(`${caster.name} não possui espaços de magia disponíveis para conjurar Altarion's Echoing Ward!`);
        return;
      }

      this._castingEchoingWardReaction = true;
      this._pendingEchoingWardVictim = victim;
      let castRes = null;
      try {
        castRes = await FM.castReactionSpellWithFoundryDialog(caster, echoingInfo, {
          returnDetails: true
        });
      } finally {
        this._castingEchoingWardReaction = false;
      }
      if (!castRes?.completed) {
        this._pendingEchoingWardVictim = null;
        return;
      }

      const slotLevel = Math.max(1, Number(castRes.slotLevel || echoingInfo.slotLevel || 1));
      await this.rollAndApplyEchoingWardTempHp({
        caster,
        victim,
        slotLevel,
        damageMessageId
      });
      return;
    }
  }

  static _castingEchoingWardReaction = false;
  static _pendingEchoingWardVictim = null;
  static _lastEchoingWardRollTime = 0;

  /* -------------------------------------------------------------------------- */
  /*  LAYERED DAMAGE TRACKING & REVERSAL ENGINE (Arcane Ward -> Temp HP -> HP)  */
  /* -------------------------------------------------------------------------- */

  static _actorDamageLayerHistory = new Map();

  /**
   * Capture a live snapshot of an actor's damage-absorbing layers (Arcane Ward, Temporary HP, HP).
   */
  static captureActorVitalLayers(actor) {
    if (!actor) {
      return {
        actorId: "",
        actorUuid: "",
        hp: 0,
        maxHp: 0,
        temp: 0,
        ward: 0,
        wardMax: 0,
        wardActive: false
      };
    }
    const AM = globalThis.AltarionAutomationManager;
    const isAltarion = Boolean(AM?.isAltarion?.(actor));
    const wardState = isAltarion ? AM.getArcaneWardState?.(actor) : null;
    const hpVal = Number(actor.system?.attributes?.hp?.value ?? 0);
    const maxHp = Number(
      actor.system?.attributes?.hp?.effectiveMax || actor.system?.attributes?.hp?.max || hpVal
    );
    const tempVal = Number(actor.system?.attributes?.hp?.temp ?? 0);
    const wardVal = wardState?.eligible && wardState?.active ? Number(wardState.current ?? 0) : 0;
    const wardMax = wardState?.eligible ? Number(wardState.max ?? 0) : 0;
    return {
      actorId: actor.id || "",
      actorUuid: actor.uuid || "",
      hp: hpVal,
      maxHp,
      temp: tempVal,
      ward: wardVal,
      wardMax,
      wardActive: Boolean(wardState?.eligible && wardState?.active)
    };
  }

  /**
   * Compute the exact damage absorbed by each vital layer (`Arcane Ward`, `Temp HP`, `HP`)
   * between a `before` and `after` vital snapshot, including whether Ward or Temp HP hit 0!
   */
  static computeDamageLayersDiff(before, after, expectedTotal = 0) {
    const wardBefore = Math.max(0, Number(before?.ward ?? 0));
    const wardAfter = Math.max(0, Number(after?.ward ?? 0));
    const wardMax = Math.max(0, Number(before?.wardMax ?? after?.wardMax ?? 0));
    const wardActive = Boolean(before?.wardActive || after?.wardActive || wardBefore > 0);
    const wardAbsorbed = Math.max(0, wardBefore - wardAfter);

    const tempBefore = Math.max(0, Number(before?.temp ?? 0));
    const tempAfter = Math.max(0, Number(after?.temp ?? 0));
    const tempAbsorbed = Math.max(0, tempBefore - tempAfter);

    const hpBefore = Math.max(0, Number(before?.hp ?? 0));
    const hpAfter = Math.max(0, Number(after?.hp ?? 0));
    const hpLost = Math.max(0, hpBefore - hpAfter);

    const measuredTotal = wardAbsorbed + tempAbsorbed + hpLost;
    return {
      timestamp: Date.now(),
      wardBefore,
      wardAfter,
      wardMax,
      wardActive,
      wardReducedToZero: wardBefore > 0 && wardAfter === 0,
      wardAbsorbed,
      tempBefore,
      tempAfter,
      tempReducedToZero: tempBefore > 0 && tempAfter === 0,
      tempAbsorbed,
      hpBefore,
      hpAfter,
      hpLost,
      totalApplied: measuredTotal > 0 ? measuredTotal : Math.max(0, Number(expectedTotal || 0)),
      remainingWardToUndo: wardAbsorbed,
      remainingTempToUndo: tempAbsorbed,
      remainingHpToUndo: hpLost
    };
  }

  /**
   * Store a damage-layer event in the per-actor ring buffer (last 15 events) so Undo buttons
   * and Roll Ledger reactions always know if Arcane Ward or Temp HP absorbed (or got reduced to 0 by) that hit.
   */
  static pushActorDamageLayerEvent(actor, layerEvent, messageId = "") {
    if (!actor || !layerEvent) return;
    const total =
      Number(layerEvent.wardAbsorbed || 0) +
      Number(layerEvent.tempAbsorbed || 0) +
      Number(layerEvent.hpLost || 0);
    if (total <= 0) return;

    const entry = {
      ...foundry.utils.deepClone(layerEvent),
      messageId: messageId || layerEvent.messageId || "",
      timestamp: Number(layerEvent.timestamp || Date.now())
    };
    const keys = [actor.uuid, !actor.isToken ? actor.id : null].filter(Boolean);
    for (const k of keys) {
      let arr = this._actorDamageLayerHistory.get(k);
      if (!Array.isArray(arr)) {
        arr = [];
        this._actorDamageLayerHistory.set(k, arr);
      }
      // Deduplicate identical event recorded within 350ms (e.g. both preUpdateActor and custom card wrapper)
      const prev = arr[arr.length - 1];
      if (
        prev &&
        Math.abs(entry.timestamp - prev.timestamp) < 350 &&
        prev.wardAbsorbed === entry.wardAbsorbed &&
        prev.tempAbsorbed === entry.tempAbsorbed &&
        prev.hpLost === entry.hpLost &&
        prev.hpAfter === entry.hpAfter &&
        prev.tempAfter === entry.tempAfter &&
        prev.wardAfter === entry.wardAfter
      ) {
        if (entry.messageId && !prev.messageId) prev.messageId = entry.messageId;
        continue;
      }
      arr.push(entry);
      if (arr.length > 15) arr.splice(0, arr.length - 15);
    }
  }

  /**
   * Locate the best matching `damageLayers` record for `actor` (checking explicit `damageLayers`,
   * `damageMessage.flags.coriaCustomDamage.damageLayers`, `damageLedger.actorsState`, and `_actorDamageLayerHistory`).
   */
  static findBestDamageLayerEvent(actor, { damageMessage = null, damageLayers = null, amount = 0 } = {}) {
    if (damageLayers && typeof damageLayers === "object") {
      return { source: "explicit", layers: damageLayers };
    }

    const customDmg = damageMessage?.flags?.[MODULE_ID]?.coriaCustomDamage;
    if (customDmg?.damageLayers) {
      return { source: "custom-msg", layers: customDmg.damageLayers };
    }

    const ledger = damageMessage ? this.getDamageLedger(damageMessage) : null;
    if (ledger?.actorsState && actor) {
      const st = ledger.actorsState[actor.uuid] || ledger.actorsState[actor.id];
      if (st?.damageLayers) {
        return { source: "damage-ledger", layers: st.damageLayers };
      }
    }

    if (actor) {
      const keys = [actor.uuid, !actor.isToken ? actor.id : null].filter(Boolean);
      const now = Date.now();
      for (const k of keys) {
        const arr = this._actorDamageLayerHistory.get(k);
        if (!Array.isArray(arr) || arr.length === 0) continue;
        // Prefer exact messageId match first
        if (damageMessage?.id) {
          const byMsg = [...arr]
            .reverse()
            .find(
              e =>
                e.messageId === damageMessage.id &&
                e.remainingWardToUndo + e.remainingTempToUndo + e.remainingHpToUndo > 0
            );
          if (byMsg) return { source: "history", layers: byMsg };
        }
        // Prefer exact amount match within 10 minutes
        if (amount > 0) {
          const byAmt = [...arr]
            .reverse()
            .find(
              e =>
                now - (e.timestamp || 0) < 600000 &&
                e.remainingWardToUndo + e.remainingTempToUndo + e.remainingHpToUndo > 0 &&
                (e.totalApplied === amount ||
                  e.remainingWardToUndo + e.remainingTempToUndo + e.remainingHpToUndo === amount)
            );
          if (byAmt) return { source: "history", layers: byAmt };
        }
        // Fallback: most recent event with remaining undoable layers within 5 minutes
        const latest = [...arr]
          .reverse()
          .find(
            e =>
              now - (e.timestamp || 0) < 300000 &&
              e.remainingWardToUndo + e.remainingTempToUndo + e.remainingHpToUndo > 0
          );
        if (latest) return { source: "history", layers: latest };
      }
    }

    return { source: "none", layers: null };
  }

  /**
   * Format a concise human-readable breakdown string of restored layers (e.g. "+6 Arcane Ward, +5 Temp HP, +4 HP").
   */
  static formatRestoredLayersSummary({ wardRestored = 0, tempRestored = 0, hpRestored = 0 } = {}) {
    const parts = [];
    if (wardRestored > 0) parts.push(`+${wardRestored} Arcane Ward`);
    if (tempRestored > 0) parts.push(`+${tempRestored} Temp HP`);
    if (hpRestored > 0) parts.push(`+${hpRestored} HP`);
    return parts.length > 0 ? parts.join(", ") : "+0 HP";
  }

  /**
   * Layer-aware damage reversal on `actor`:
   * 1. Restores Altarion's Arcane Ward if it absorbed damage (including if it was reduced to 0 HP by that hit!)
   * 2. Restores Temporary Hit Points if Temp HP absorbed damage (including if Temp HP was reduced to 0 by that hit!)
   * 3. Restores regular Hit Points for any remaining/overflow damage.
   *
   * Modes:
   * - `onlyHp: true` -> strictly restores HP only (used for Dark Vitality Necrotic/Poison Absorption undo).
   * - `mode: "undo"` -> restores exact lost layers up to `amount` (Ward -> Temp HP -> HP).
   * - `mode: "reaction-reduction"` -> reverses partial damage reduction so resulting state matches taking `(D - amount)` originally!
   */
  static async revertActorDamageLayered(
    actor,
    amount,
    { mode = "undo", damageMessage = null, damageLayers = null, onlyHp = false, persistMessageUpdate = false } = {}
  ) {
    const refund = Math.max(0, Math.floor(Number(amount || 0)));
    if (!actor || refund <= 0 || !actor.isOwner) {
      return {
        applied: false,
        wardRestored: 0,
        tempRestored: 0,
        hpRestored: 0,
        totalRestored: 0,
        summaryText: "+0 HP"
      };
    }

    const AM = globalThis.AltarionAutomationManager;
    const isAltarion = Boolean(AM?.isAltarion?.(actor));
    const wardState = isAltarion ? AM.getArcaneWardState?.(actor) : null;
    const curWard = wardState?.eligible && wardState?.active ? Number(wardState.current ?? 0) : 0;
    const maxWard = wardState?.eligible ? Number(wardState.max ?? 0) : 0;
    const curTemp = Math.max(0, Number(actor.system?.attributes?.hp?.temp ?? 0));
    const curHp = Math.max(0, Number(actor.system?.attributes?.hp?.value ?? 0));
    const maxHp = Number(
      actor.system?.attributes?.hp?.effectiveMax || actor.system?.attributes?.hp?.max || curHp + refund
    );

    let wardRestore = 0;
    let tempRestore = 0;
    let hpRestore = 0;
    let matchedSource = "none";
    let matchedLayers = null;

    if (onlyHp) {
      hpRestore = Math.min(Math.max(0, maxHp - curHp), refund);
    } else {
      const found = this.findBestDamageLayerEvent(actor, { damageMessage, damageLayers, amount: refund });
      matchedSource = found.source;
      matchedLayers = found.layers ? foundry.utils.deepClone(found.layers) : null;

        const remWard = Math.max(0, Number(matchedLayers?.remainingWardToUndo ?? 0));
        const remTemp = Math.max(0, Number(matchedLayers?.remainingTempToUndo ?? 0));
        const remHp = Math.max(0, Number(matchedLayers?.remainingHpToUndo ?? 0));
        const totalRem = remWard + remTemp + remHp;

        if (matchedLayers && totalRem === 0 && (matchedSource === "custom-msg" || matchedSource === "explicit")) {
          // This exact damage event was ALREADY 100% reversed — never fall through and double-heal Arcane Ward/HP!
          return {
            applied: false,
            alreadyUndone: true,
            wardRestored: 0,
            tempRestored: 0,
            hpRestored: 0,
            totalRestored: 0,
            summaryText: "+0 HP",
            layers: matchedLayers
          };
        }

        if (matchedLayers && totalRem > 0) {
        if (mode === "reaction-reduction" && refund < totalRem) {
          // Exact partial reduction: compute what damage `(totalRem - refund)` would still have absorbed
          // through Ward -> Temp HP -> HP, and refund the difference from each layer!
          const remainingIncoming = Math.max(0, totalRem - refund);
          const stillWard = Math.min(remWard, remainingIncoming);
          const afterWardRem = Math.max(0, remainingIncoming - stillWard);
          const stillTemp = Math.min(remTemp, afterWardRem);
          const afterTempRem = Math.max(0, afterWardRem - stillTemp);
          const stillHp = Math.min(remHp, afterTempRem);

          wardRestore = isAltarion ? Math.max(0, remWard - stillWard) : 0;
          tempRestore = Math.max(0, remTemp - stillTemp);
          hpRestore = Math.max(0, remHp - stillHp);
        } else {
          // Full Undo (or refund >= totalRem): restore Arcane Ward first (up to what Ward absorbed),
          // then overflow into Temp HP (up to what Temp HP absorbed), then overflow into HP!
          let left = refund;
          if (isAltarion && remWard > 0 && left > 0) {
            wardRestore = Math.min(left, remWard);
            left -= wardRestore;
          }
          if (remTemp > 0 && left > 0) {
            tempRestore = Math.min(left, remTemp);
            left -= tempRestore;
          }
          if (remHp > 0 && left > 0) {
            hpRestore = Math.min(left, remHp);
            left -= hpRestore;
          }
          if (left > 0) {
            hpRestore += left;
          }
        }

        // Update remaining counters in the live layer object
        const nextRemWard = Math.max(0, remWard - wardRestore);
        const nextRemTemp = Math.max(0, remTemp - tempRestore);
        const nextRemHp = Math.max(0, remHp - hpRestore);
        matchedLayers.remainingWardToUndo = nextRemWard;
        matchedLayers.remainingTempToUndo = nextRemTemp;
        matchedLayers.remainingHpToUndo = nextRemHp;

        // Also mutate in-memory history / explicit object so consecutive reversals don't double-refund
        if (found.layers) {
          found.layers.remainingWardToUndo = nextRemWard;
          found.layers.remainingTempToUndo = nextRemTemp;
          found.layers.remainingHpToUndo = nextRemHp;
        }
      } else {
        // Fallback when no layer snapshot exists (e.g. legacy chat card created before this update):
        // 1) Active Arcane Ward missing HP -> restore Ward up to maxWard
        // 2) Active Temp HP > 0 -> restore Temp HP
        // 3) Remaining -> restore regular HP
        let left = refund;
        if (isAltarion && wardState?.eligible && wardState?.active && curWard < maxWard && left > 0) {
          const wardRoom = Math.max(0, maxWard - curWard);
          wardRestore = Math.min(left, wardRoom);
          left -= wardRestore;
        }
        if (left > 0 && curTemp > 0) {
          tempRestore = left;
          left = 0;
        }
        if (left > 0) {
          hpRestore = left;
        }
      }
    }

    // Build atomic update payload
    const updateData = {};
    let actualWardRestored = 0;
    let actualTempRestored = 0;
    let actualHpRestored = 0;

    if (wardRestore > 0 && isAltarion && wardState?.eligible) {
      const nextWard = Math.clamp(curWard + wardRestore, 0, Math.max(maxWard, curWard + wardRestore));
      actualWardRestored = Math.max(0, nextWard - curWard);
      if (actualWardRestored > 0) {
        updateData["system.resources.tertiary.value"] = nextWard;
        if (!actor.getFlag(MODULE_ID, "arcaneWardActive")) {
          updateData[`flags.${MODULE_ID}.arcaneWardActive`] = true;
        }
      }
    }
    if (tempRestore > 0) {
      const nextTemp = curTemp + tempRestore;
      actualTempRestored = Math.max(0, nextTemp - curTemp);
      updateData["system.attributes.hp.temp"] = nextTemp;
    }
    if (hpRestore > 0) {
      const nextHp = Math.min(maxHp, curHp + hpRestore);
      actualHpRestored = Math.max(0, nextHp - curHp);
      if (actualHpRestored > 0) {
        updateData["system.attributes.hp.value"] = nextHp;
      }
    }

    if (Object.keys(updateData).length > 0) {
      await actor.update(updateData, {
        altarionBypassWard: true,
        coriaDamageReactionInternal: true,
        coriaDarkVitalityBypass: true,
        coriaLayeredUndo: true
      });
    }

    // Persist updated `damageLayers` back onto custom damage message ONLY when explicitly requested
    // (skipping `damageMessage.update()` during Undo clicks prevents Foundry from re-rendering the chat card DOM
    // and wiping out the just-disabled "Undone" button state!).
    if (
      persistMessageUpdate &&
      matchedSource === "custom-msg" &&
      matchedLayers &&
      damageMessage?.update &&
      (game.user?.isGM || damageMessage.isAuthor || damageMessage.canUserModify?.(game.user, "update"))
    ) {
      try {
        await damageMessage.update({
          [`flags.${MODULE_ID}.coriaCustomDamage.damageLayers`]: matchedLayers
        });
      } catch (_e) {}
    }

    const summaryText = this.formatRestoredLayersSummary({
      wardRestored: actualWardRestored,
      tempRestored: actualTempRestored,
      hpRestored: actualHpRestored
    });

    return {
      applied: actualWardRestored + actualTempRestored + actualHpRestored > 0,
      wardRestored: actualWardRestored,
      tempRestored: actualTempRestored,
      hpRestored: actualHpRestored,
      totalRestored: actualWardRestored + actualTempRestored + actualHpRestored,
      summaryText,
      layers: matchedLayers
    };
  }

  /**
   * Backward-compatible wrapper: refunds `amount` using the full layered reversal engine.
   */
  static async _refundAbsorbedDamageToActor(actor, amount, options = {}) {
    return this.revertActorDamageLayered(actor, amount, {
      mode: "reaction-reduction",
      ...options
    });
  }

  /**
   * Persist an in-place damage edit on a custom damage ChatMessage (`coriaCustomDamage`) and refresh its DOM.
   */
  static async _recordCustomDamageCardEdit(
    damageMessage,
    { prevTotalDamage, newTotalDamage, damageReduction, sourceLabel, stepDescription, updatedLayers = null } = {}
  ) {
    if (!damageMessage) return;
    const customDmg = foundry.utils.deepClone(damageMessage.flags?.[MODULE_ID]?.coriaCustomDamage || null);
    if (!customDmg) return;

    const origTotalDamage = Number(
      damageMessage.flags?.[MODULE_ID]?.damageModState?.origTotalDamage ?? customDmg.origDamage ?? prevTotalDamage
    );
    customDmg.currentDamage = Math.max(0, Number(newTotalDamage ?? 0));
    if (updatedLayers) {
      customDmg.damageLayers = foundry.utils.deepClone(updatedLayers);
    }

    let ledger = foundry.utils.deepClone(this.getDamageLedger(damageMessage));
    if (ledger) {
      ledger.currentTotalDamage = customDmg.currentDamage;
      this._damageLedgersByMsgId.set(damageMessage.id, ledger);
    }

    const prevDmgMod = foundry.utils.deepClone(damageMessage.flags?.[MODULE_ID]?.damageModState || null);
    const historyEntry = {
      sourceLabel,
      stepDescription,
      prevTotal: prevTotalDamage,
      newTotal: customDmg.currentDamage,
      damageReduction,
      timestamp: Date.now()
    };
    const damageModState = {
      origTotalDamage,
      currentTotalDamage: customDmg.currentDamage,
      history: [...(Array.isArray(prevDmgMod?.history) ? prevDmgMod.history : []), historyEntry]
    };

    try {
      await damageMessage.update({
        [`flags.${MODULE_ID}.coriaCustomDamage`]: customDmg,
        ...(ledger ? { [`flags.${MODULE_ID}.damageLedger`]: ledger } : {}),
        [`flags.${MODULE_ID}.damageModState`]: damageModState
      });
    } catch (err) {
      console.warn("[CoriaRollLedger] Could not update custom damage card:", err);
    }

    for (const el of document.querySelectorAll(`[data-message-id="${damageMessage.id}"]`)) {
      this.decorateModifiedDamageMessage(damageMessage, el);
      this.renderDamageReactionsBar(damageMessage, el, { forceRefresh: true });
    }
  }

  /**
   * Compute and apply `Altarion's Echoing Ward` (+rolledTempHp applied BEFORE triggering damage)
   * on an auto-applied custom damage card, respecting existing Arcane Ward and pre-damage Temp HP!
   * Returns `{ absorbedFromCustom, leftoverTempHp, hpRestored, wardRestored, prevTemp, finalTemp, nextDmg, updatedLayers }`.
   */
  static async _applyEchoingWardOnCustomDamage(target, damageMessage, customDmg, rolledTempHp) {
    const prevDmg = Math.max(0, Number(customDmg?.currentDamage || 0));
    const curTemp = Math.max(0, Number(target.system?.attributes?.hp?.temp ?? 0));
    const curHp = Math.max(0, Number(target.system?.attributes?.hp?.value ?? 0));
    const maxHp = Number(
      target.system?.attributes?.hp?.effectiveMax || target.system?.attributes?.hp?.max || curHp + prevDmg
    );

    const found = this.findBestDamageLayerEvent(target, { damageMessage, amount: prevDmg });
    const layers = found.layers ? foundry.utils.deepClone(found.layers) : null;

    let absorbedFromCustom = 0;
    let hpRestored = 0;
    let wardRestored = 0;
    let leftoverTempHp = rolledTempHp;
    let finalTemp = Math.max(curTemp, rolledTempHp);
    let nextDmg = prevDmg;

    if (layers && layers.remainingWardToUndo + layers.remainingTempToUndo + layers.remainingHpToUndo > 0) {
      // Arcane Ward always absorbs before Temporary HP in D&D 5e!
      // Any damage AFTER Arcane Ward (`postWardDmg`) is what Echoing Ward's Temporary HP absorbs.
      const remWard = Math.max(0, Number(layers.remainingWardToUndo || 0));
      const remTemp = Math.max(0, Number(layers.remainingTempToUndo || 0));
      const remHp = Math.max(0, Number(layers.remainingHpToUndo || 0));
      const postWardDmg = remTemp + remHp;

      if (postWardDmg > 0) {
        // Temp HP doesn't stack with pre-existing Temp HP (`tempBefore`): effective pre-hit Temp HP is max(tempBefore, rolledTempHp)
        const preHitTemp = Math.max(0, Number(layers.tempBefore ?? curTemp + remTemp));
        const effectiveTempPool = Math.max(preHitTemp, rolledTempHp);
        const newTempAbsorbed = Math.min(effectiveTempPool, postWardDmg);
        const newHpLost = Math.max(0, postWardDmg - newTempAbsorbed);
        leftoverTempHp = Math.max(0, effectiveTempPool - postWardDmg);

        hpRestored = Math.max(0, remHp - newHpLost);
        absorbedFromCustom = Math.min(postWardDmg, Math.max(0, rolledTempHp));
        nextDmg = Math.max(0, prevDmg - hpRestored);
        finalTemp = Math.max(curTemp, leftoverTempHp);

        layers.remainingHpToUndo = newHpLost;
        layers.remainingTempToUndo = newTempAbsorbed;
        layers.tempBefore = effectiveTempPool;
        layers.tempAfter = finalTemp;
        if (found.layers) {
          found.layers.remainingHpToUndo = newHpLost;
          found.layers.remainingTempToUndo = newTempAbsorbed;
          found.layers.tempBefore = effectiveTempPool;
          found.layers.tempAfter = finalTemp;
        }
      } else {
        // 100% of damage was already absorbed by Altarion's Arcane Ward -> full Echoing Ward Temp HP stays intact!
        absorbedFromCustom = 0;
        hpRestored = 0;
        leftoverTempHp = rolledTempHp;
        finalTemp = Math.max(curTemp, rolledTempHp);
        nextDmg = prevDmg;
      }
    } else {
      // Fallback when no layer snapshot exists
      absorbedFromCustom = Math.min(rolledTempHp, prevDmg);
      leftoverTempHp = Math.max(0, rolledTempHp - absorbedFromCustom);
      hpRestored = absorbedFromCustom;
      nextDmg = Math.max(0, prevDmg - absorbedFromCustom);
      finalTemp = Math.max(curTemp, leftoverTempHp);
    }

    if (target.isOwner) {
      const updateData = {};
      if (hpRestored > 0) {
        const nextHp = Math.min(maxHp, curHp + hpRestored);
        hpRestored = Math.max(0, nextHp - curHp);
        if (hpRestored > 0) updateData["system.attributes.hp.value"] = nextHp;
      }
      if (finalTemp !== curTemp) {
        updateData["system.attributes.hp.temp"] = finalTemp;
      }
      if (Object.keys(updateData).length > 0) {
        await target.update(updateData, {
          altarionBypassWard: true,
          coriaDamageReactionInternal: true,
          coriaDarkVitalityBypass: true,
          coriaLayeredUndo: true
        });
      }
    }

    return {
      absorbedFromCustom,
      leftoverTempHp,
      hpRestored,
      wardRestored,
      prevTemp: curTemp,
      finalTemp,
      nextDmg,
      updatedLayers: layers
    };
  }

  /**
   * Roll `1d8/slot + INT` Temporary Hit Points for `Altarion's Echoing Ward`, apply it directly as
   * Temporary Hit Points to `victim`, and post the Arcane-Armor-style chat card with Undo & Re-apply buttons.
   * If triggered from an auto-applied custom damage card (`coriaCustomDamage.autoApplied`), retroactively absorbs
   * post-Ward damage using layered HP/Temp HP rules, refunds HP, leaves any surplus Temp HP, and edits the card in-place!
   */
  static async rollAndApplyEchoingWardTempHp({ caster, victim, slotLevel = 1, damageMessageId = "" } = {}) {
    if (!caster) return;
    const now = Date.now();
    if (this._lastEchoingWardRollTime && now - this._lastEchoingWardRollTime < 2500) {
      return;
    }
    this._lastEchoingWardRollTime = now;

    const target = this._pendingEchoingWardVictim || victim || caster;
    this._pendingEchoingWardVictim = null;
    const effSlot = Math.max(1, Number(slotLevel || 1));
    const intMod = Number(caster.system?.abilities?.int?.mod ?? 3);
    const formula = `${effSlot}d8 + ${intMod}`;

    const tempRoll = await new Roll(formula).evaluate();
    try {
      if (game.dice3d) await game.dice3d.showForRoll(tempRoll, game.user, true);
    } catch (_e) {}

    const rolledTempHp = Math.max(1, Number(tempRoll.total ?? (1 + intMod)));
    const prevTemp = Number(target.system?.attributes?.hp?.temp ?? 0);

    const damageMessage = damageMessageId ? game.messages?.get(damageMessageId) : null;
    const customDmg = damageMessage?.flags?.[MODULE_ID]?.coriaCustomDamage || null;
    let absorbedFromCustom = 0;
    let hpRestored = 0;
    let wardRestored = 0;
    let leftoverTempHp = rolledTempHp;
    let finalTemp = Math.max(prevTemp, rolledTempHp);
    let wardOnlyNote = "";

    if (customDmg && customDmg.autoApplied && Number(customDmg.currentDamage || 0) > 0) {
      const prevDmg = Number(customDmg.currentDamage || 0);
      if (target.isOwner && (game.user?.isGM || damageMessage.isAuthor || damageMessage.canUserModify?.(game.user, "update"))) {
        const res = await this._applyEchoingWardOnCustomDamage(target, damageMessage, customDmg, rolledTempHp);
        absorbedFromCustom = res.absorbedFromCustom;
        hpRestored = res.hpRestored;
        wardRestored = res.wardRestored;
        leftoverTempHp = res.leftoverTempHp;
        finalTemp = res.finalTemp;

        if (absorbedFromCustom > 0 || hpRestored > 0) {
          await this._recordCustomDamageCardEdit(damageMessage, {
            prevTotalDamage: prevDmg,
            newTotalDamage: res.nextDmg,
            damageReduction: hpRestored > 0 ? hpRestored : absorbedFromCustom,
            sourceLabel: `Altarion's Echoing Ward (Lvl ${effSlot})`,
            stepDescription: `Echoing Ward (+${rolledTempHp} Temp HP) absorbed ${absorbedFromCustom} damage (${prevDmg} &rarr; ${res.nextDmg}${hpRestored > 0 ? `, refunded +${hpRestored} HP` : ""}${leftoverTempHp > 0 ? `, +${leftoverTempHp} Temp HP remaining` : ""})`,
            updatedLayers: res.updatedLayers
          });
        } else {
          wardOnlyNote = `<br>&bull; <em>Arcane Ward already absorbed the triggering hit, so all <strong>+${rolledTempHp} Temp HP</strong> remain intact on <strong>${foundry.utils.escapeHTML(target.name)}</strong>!</em>`;
        }
      } else if (game.users?.activeGM && game.socket) {
        game.socket.emit(`module.${MODULE_ID}`, {
          type: "coriaDamageReaction",
          params: {
            reactType: "echoing-ward-custom-edit",
            damageMessageId,
            casterId: caster.id,
            victimId: target.id,
            victimUuid: target.uuid || "",
            slotLevel: effSlot,
            rolledTempHp
          }
        });
      }
    } else {
      if (target.isOwner) {
        if (typeof target.applyTempHP === "function") {
          await target.applyTempHP(rolledTempHp);
        } else if (rolledTempHp > prevTemp) {
          await target.update(
            { "system.attributes.hp.temp": rolledTempHp },
            { altarionBypassWard: true, coriaDamageReactionInternal: true, coriaDarkVitalityBypass: true }
          );
        }
      } else if (game.users?.activeGM && game.socket) {
        game.socket.emit(`module.${MODULE_ID}`, {
          type: "coriaApplyTempHp",
          params: {
            targetActorId: target.id,
            targetUuid: target.uuid || "",
            amount: rolledTempHp
          }
        });
      }
    }

    const absorbedLine =
      absorbedFromCustom > 0 || hpRestored > 0
        ? `<br>&bull; <strong>Damage Absorbed:</strong> Absorbed <strong>${absorbedFromCustom}</strong> damage (${hpRestored > 0 ? `refunded <strong>+${hpRestored} HP</strong>` : `preserved Temp HP`}${leftoverTempHp > 0 ? `, <strong>+${leftoverTempHp} Temp HP</strong> remaining` : ""})!`
        : wardOnlyNote;

    const undoLabel =
      hpRestored > 0
        ? `Undo (-${hpRestored} HP, Temp &rarr; ${prevTemp})`
        : `Undo Temp HP (${prevTemp} Temp HP)`;

    const echoCardHtml = `
      <div class="altarion-aitusa-ward-chat-tag altarion-arcane-armor-chat-card">
        <div class="altarion-ward-header">
          <i class="fas fa-hand-sparkles"></i>
          <span>Altarion's Echoing Ward (Lvl ${effSlot}) — +${rolledTempHp} Temp HP!</span>
        </div>
        <div class="altarion-ward-body">
          <strong>${foundry.utils.escapeHTML(caster.name)}</strong> projected <strong>Altarion's Echoing Ward</strong> onto <strong>${foundry.utils.escapeHTML(target.name)}</strong>!<br>
          &bull; <strong>Temp HP Roll (${formula}):</strong> Rolled <strong>${rolledTempHp}</strong> &rarr; Applied <strong>+${leftoverTempHp} Temporary Hit Points</strong> to <strong>${foundry.utils.escapeHTML(target.name)}</strong>!${absorbedLine}
        </div>
        <div class="altarion-arcane-armor-btn-row">
          <button type="button" class="altarion-echoing-ward-undo-btn coria-min-card-btn-secondary"
                  data-victim-uuid="${target.uuid}"
                  data-victim-id="${target.id}"
                  data-prev-temp="${prevTemp}"
                  data-final-temp="${finalTemp}"
                  data-rolled-temp="${leftoverTempHp}"
                  data-hp-restored="${hpRestored}"
                  data-ward-restored="${wardRestored}">
            <i class="fas fa-undo"></i> ${undoLabel}
          </button>
          <button type="button" class="altarion-echoing-ward-reapply-btn coria-min-card-btn-primary"
                  data-victim-uuid="${target.uuid}"
                  data-victim-id="${target.id}"
                  data-prev-temp="${prevTemp}"
                  data-final-temp="${finalTemp}"
                  data-rolled-temp="${rolledTempHp}"
                  data-hp-restored="${hpRestored}"
                  data-ward-restored="${wardRestored}">
            <i class="fas fa-shield-heart"></i> Re-apply +${rolledTempHp} Temp HP
          </button>
        </div>
      </div>
    `;

    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: caster }),
      content: echoCardHtml,
      flags: {
        [MODULE_ID]: {
          isDamageReactionCard: true
        }
      }
    });
  }

  /**
   * Apply the pre-application damage edit and post the reaction chat card for `absorb-elements` or `project-ward`.
   * Assumes damage has not yet been applied to the victim: edits the original damage roll in-place so the
   * resulting damage is displayed and ready to be applied.
   */
  static async applyDamageReactionModification(params = {}) {
    const {
      reactType,
      damageMessageId,
      casterId,
      victimId,
      victimUuid = "",
      elementType = "fire",
      slotLevel = 1,
      rolledTempHp = 0,
      foolRoll = 0,
      _fromSocket = false
    } = params;

    const AM = globalThis.AltarionAutomationManager;
    const damageMessage = damageMessageId ? game.messages?.get(damageMessageId) : null;
    const caster = casterId ? game.actors?.get(casterId) : null;
    const victim =
      (await AM?.resolveActorFromUuidOrId?.(victimUuid, victimId)) ||
      (victimId && game.actors?.get(victimId)) ||
      caster;
    if (!damageMessage || !caster || !victim || !AM) return;

    // If a non-GM player doesn't have permission to update `damageMessage` or `victim`, delegate to active GM via socket
    const canModifyMsg = Boolean(
      game.user?.isGM || damageMessage.isAuthor || damageMessage.canUserModify?.(game.user, "update")
    );
    const canModifyVictim = Boolean(game.user?.isGM || victim.isOwner);
    if (!_fromSocket && (!canModifyMsg || !canModifyVictim) && game.users?.activeGM && game.socket) {
      game.socket.emit(`module.${MODULE_ID}`, {
        type: "coriaDamageReaction",
        params
      });
      return;
    }

    let ledger = foundry.utils.deepClone(this.getDamageLedger(damageMessage));
    if (!ledger) {
      ledger = await this.captureDamageRollSnapshot(damageMessage);
      ledger = foundry.utils.deepClone(ledger);
    }

    const customDmg = damageMessage.flags?.[MODULE_ID]?.coriaCustomDamage
      ? foundry.utils.deepClone(damageMessage.flags[MODULE_ID].coriaCustomDamage)
      : null;

    const dmgInfo = this.extractDamageRollInfo(damageMessage);
    const prevTotalDamage = Number(dmgInfo.currentTotalDamage ?? dmgInfo.origTotalDamage ?? 0);
    const origTotalDamage = Number(dmgInfo.origTotalDamage ?? prevTotalDamage);

    // Special GM socket path for Echoing Ward custom-card edit
    if (reactType === "echoing-ward-custom-edit" && customDmg && customDmg.autoApplied && prevTotalDamage > 0) {
      const tempVal = Math.max(1, Number(rolledTempHp || 1));
      const res = await this._applyEchoingWardOnCustomDamage(victim, damageMessage, customDmg, tempVal);
      if (res.absorbedFromCustom > 0 || res.hpRestored > 0) {
        await this._recordCustomDamageCardEdit(damageMessage, {
          prevTotalDamage,
          newTotalDamage: res.nextDmg,
          damageReduction: res.hpRestored > 0 ? res.hpRestored : res.absorbedFromCustom,
          sourceLabel: `Altarion's Echoing Ward (Lvl ${slotLevel})`,
          stepDescription: `Echoing Ward (+${tempVal} Temp HP) absorbed ${res.absorbedFromCustom} damage (${prevTotalDamage} &rarr; ${res.nextDmg}${res.hpRestored > 0 ? `, refunded +${res.hpRestored} HP` : ""}${res.leftoverTempHp > 0 ? `, +${res.leftoverTempHp} Temp HP remaining` : ""})`,
          updatedLayers: res.updatedLayers
        });
      }
      return;
    }

    let newTotalDamage = prevTotalDamage;
    let damageReduction = 0;
    let sourceLabel = "";
    let stepDescription = "";

    // ========================================================================
    // A. ABSORB ELEMENTS (Apply Resistance Status Effect & Post Card;
    //    On custom auto-applied elemental cards, also refund resisted half & edit card in-place!)
    // ========================================================================
    if (reactType === "absorb-elements") {
      const elemKey = String(elementType || dmgInfo.primaryElementalType || "fire").toLowerCase();
      const elemLabel = this.ELEMENTAL_LABELS[elemKey] || elemKey;

      const aeSpell = victim.items?.find(
        i => i.type === "spell" && i.name?.trim().toLowerCase() === "absorb elements"
      );

      const hadPermanentDrBefore = Array.from(victim._source?.system?.traits?.dr?.value || []).includes(elemKey);

      // 1. Apply Absorb Elements Status Effect (Resistance until end of next turn + +Xd6 on next attack hit)
      await AM.applyOrUpdateStatusEffect(victim, {
        statusId: "absorb-elements",
        name: `Absorb Elements (${elemLabel} Resistance & +${slotLevel}d6 Melee)`,
        img: aeSpell?.img || "icons/magic/defensive/armor-shield-barrier-steel.webp",
        description: `<p><strong>Absorb Elements (Slot Level ${slotLevel}):</strong> You have <strong>resistance to ${elemLabel} damage</strong> until the start/end of your next turn. Also, the first time you hit with a melee attack on your next turn, the target takes an extra <strong>${slotLevel}d6 ${elemLabel} damage</strong>, and the spell ends.</p>`,
        changes: [
          {
            key: "system.traits.dr.value",
            mode: CONST.ACTIVE_EFFECT_MODES.ADD,
            value: elemKey,
            priority: 20
          }
        ],
        durationRounds: 1,
        durationTurns: 1,
        expiresAtEndOfTurnOf: victim.id,
        extraFlags: {
          isAbsorbElementsEffect: true,
          elementType: elemKey,
          elementLabel: elemLabel,
          hadPermanentDrBefore,
          slotLevel,
          casterActorId: victim.id
        }
      });

      let customHalfNote = "";
      if (customDmg && customDmg.autoApplied && prevTotalDamage > 0) {
        const halved = Math.floor(prevTotalDamage / 2);
        const refund = Math.max(0, prevTotalDamage - halved);
        let refundSummary = `+${refund} HP`;
        let updatedLayers = null;
        if (refund > 0) {
          const revRes = await this.revertActorDamageLayered(victim, refund, {
            mode: "reaction-reduction",
            damageMessage
          });
          if (revRes?.summaryText) refundSummary = revRes.summaryText;
          updatedLayers = revRes?.layers || null;
        }
        await this._recordCustomDamageCardEdit(damageMessage, {
          prevTotalDamage,
          newTotalDamage: halved,
          damageReduction: refund,
          sourceLabel: `Absorb Elements (${elemLabel} — ${victim.name})`,
          stepDescription: `${elemLabel} Resistance halved damage (${prevTotalDamage} &rarr; ${halved}, refunded ${refundSummary})`,
          updatedLayers
        });
        customHalfNote = `<br>&bull; <strong>Damage Halved:</strong> Reduced ${elemLabel} damage from <strong>${prevTotalDamage} &rarr; ${halved}</strong> (refunded <strong>${refundSummary}</strong>).`;
      }

      // 2. Post Spirit-Guardians-style minimalist English chat card
      const cardHtml = `
        <div class="altarion-aitusa-ward-chat-tag altarion-arcane-armor-chat-card">
          <div class="altarion-ward-header">
            <i class="fas fa-shield-virus"></i>
            <span>Absorb Elements (Lvl ${slotLevel}) — ${elemLabel} Resistance!</span>
          </div>
          <div class="altarion-ward-body">
            <strong>${foundry.utils.escapeHTML(victim.name)}</strong> cast <strong>Absorb Elements</strong> as a Reaction against <strong>${elemLabel}</strong> damage!<br>
            &bull; <strong>Resistance Applied:</strong> <strong>${foundry.utils.escapeHTML(victim.name)}</strong> now has <strong>resistance to ${elemLabel} damage</strong> until the end of their next turn.${customHalfNote}<br>
            &bull; <strong>Elemental Strike Armed:</strong> Next attack hit deals an extra <strong>+${slotLevel}d6 ${elemLabel} damage</strong> (status effect ends after rolling damage).
          </div>
        </div>
      `;

      await ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor: victim }),
        content: cardHtml,
        flags: {
          [MODULE_ID]: {
            isDamageReactionCard: true
          }
        }
      });
      return;
    }

    // ========================================================================
    // B. PROJECT WARD (Altarion's Arcane Ward absorbs damage for an ally <= 30 ft)
    // ========================================================================
    else if (reactType === "project-ward") {
      const wardState = AM.getArcaneWardState?.(caster);
      if (!wardState || !wardState.active || wardState.current <= 0) return;

      // Exact requested calculation:
      // 1) (PV resultante da Arcane Ward) = max(0, (PV anterior da Arcane Ward) - (Dano rolado))
      // 2) (Dano absorvido) = (PV anterior da Arcane Ward) - (PV resultante da Arcane Ward)
      // 3) (Dano resultante) = max(0, (Dano original) - (Dano absorvido))
      const prevWardHp = Number(wardState.current);
      const maxWardHp = Number(wardState.max || prevWardHp);
      const newWardHp = Math.max(0, prevWardHp - prevTotalDamage);
      const absorbed = Math.max(0, prevWardHp - newWardHp);
      damageReduction = absorbed;
      newTotalDamage = Math.max(0, prevTotalDamage - absorbed);

      sourceLabel = `Projected Ward (${caster.name} → ${victim.name})`;
      stepDescription = `Arcane Ward absorbed ${absorbed} damage (${prevTotalDamage} &rarr; ${newTotalDamage})`;

      // 1. Update Altarion's Arcane Ward HP to `newWardHp`
      await caster.update(
        {
          "system.resources.tertiary.value": newWardHp
        },
        { altarionBypassWard: true, coriaDamageReactionInternal: true }
      );

      // 1b. If this was a custom auto-applied damage card, retroactively refund `absorbed` using layered Ward/Temp/HP logic!
      let refundSummary = `+${absorbed} HP`;
      if (customDmg && customDmg.autoApplied && absorbed > 0) {
        const revRes = await this.revertActorDamageLayered(victim, absorbed, {
          mode: "reaction-reduction",
          damageMessage
        });
        if (revRes?.summaryText) refundSummary = revRes.summaryText;
        if (revRes?.layers) customDmg.damageLayers = foundry.utils.deepClone(revRes.layers);
      }

      // 2. Post Arcane-Ward-style chat card with visual ward meter
      const pct = Math.round((newWardHp / Math.max(1, maxWardHp)) * 100);
      const overflowNote =
        newTotalDamage === 0
          ? `<strong>0</strong> remaining damage — <strong>${foundry.utils.escapeHTML(victim.name)}</strong> takes no damage${
              customDmg?.autoApplied ? ` (refunded ${refundSummary})` : ""
            }!`
          : `<strong>${newTotalDamage}</strong> remaining damage${
              customDmg?.autoApplied ? ` (refunded ${refundSummary})` : ` to be applied`
            } to <strong>${foundry.utils.escapeHTML(victim.name)}</strong>.`;

      const wardCardHtml = `
        <div class="altarion-aitusa-ward-chat-tag altarion-arcane-ward-chat-card">
          <div class="altarion-ward-header">
            <i class="fas fa-shield-alt"></i>
            <span>Projected Ward — Absorbed ${absorbed} Damage for ${foundry.utils.escapeHTML(victim.name)}</span>
          </div>
          <div class="altarion-ward-body">
            <strong>${foundry.utils.escapeHTML(caster.name)}</strong> projected his <strong>Arcane Ward</strong> to shield <strong>${foundry.utils.escapeHTML(victim.name)}</strong>!<br>
            Incoming Damage: <strong>${prevTotalDamage}</strong> &bull; Absorbed by Ward: <strong>-${absorbed}</strong> (<strong>${prevWardHp} &rarr; ${newWardHp} / ${maxWardHp} HP</strong>)<br>
            ${overflowNote}${
              newWardHp === 0
                ? `<br><em>The Arcane Ward is now at 0 HP, but its magic remains until a Long Rest.</em>`
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
        speaker: ChatMessage.getSpeaker({ actor: caster }),
        content: wardCardHtml,
        flags: {
          [MODULE_ID]: {
            isArcaneWardCard: true,
            isDamageReactionCard: true
          }
        }
      });
    }

    // ========================================================================
    // C. CARD OF THE RESONANT ARCANA — THE FOOL (Flinn, 1d4 Reaction)
    //    1–2: Halve damage via roll-ledger + teleport up to 10 ft
    //    3–4: Reduce damage to 0 via roll-ledger + reflect Force damage (max 15)
    // ========================================================================
    else if (reactType === "the-fool") {
      const d4Val = Math.clamp(Number(foolRoll || 1), 1, 4);

      if (d4Val <= 2) {
        newTotalDamage = Math.floor(prevTotalDamage / 2);
        damageReduction = Math.max(0, prevTotalDamage - newTotalDamage);
        sourceLabel = `The Fool (1d4 = ${d4Val} — Halved)`;
        stepDescription = `The Fool warped probability (1d4 = ${d4Val}): halved damage (${prevTotalDamage} &rarr; ${newTotalDamage}) + Teleport 10 ft`;

        let refundSummary = `+${damageReduction} HP`;
        if (customDmg && customDmg.autoApplied && damageReduction > 0) {
          const revRes = await this.revertActorDamageLayered(victim, damageReduction, {
            mode: "reaction-reduction",
            damageMessage
          });
          if (revRes?.summaryText) refundSummary = revRes.summaryText;
          if (revRes?.layers) customDmg.damageLayers = foundry.utils.deepClone(revRes.layers);
        }

        const foolHalfHtml = `
          <div class="altarion-aitusa-ward-chat-tag altarion-arcane-armor-chat-card">
            <div class="altarion-ward-header">
              <i class="fas fa-hat-wizard"></i>
              <span>The Fool (1d4 = ${d4Val}) — Damage Halved &amp; Teleport 10 ft!</span>
            </div>
            <div class="altarion-ward-body">
              <strong>${foundry.utils.escapeHTML(victim.name)}</strong> expended <strong>Card of the Resonant Arcana (The Fool)</strong> (0/1 charge left, recovers on Long Rest) and rolled <strong>1d4 = ${d4Val} (1–2)</strong>!<br>
              &bull; <strong>Damage Halved:</strong> Incoming damage reduced from <strong>${prevTotalDamage} &rarr; ${newTotalDamage}</strong>${
                customDmg?.autoApplied ? ` (refunded <strong>${refundSummary}</strong>)` : ""
              }.<br>
              &bull; <strong>Probability Shift:</strong> <strong>${foundry.utils.escapeHTML(victim.name)}</strong> can immediately <strong>teleport up to 10 feet</strong> to an unoccupied space he can see!
            </div>
          </div>
        `;

        await ChatMessage.create({
          speaker: ChatMessage.getSpeaker({ actor: victim }),
          content: foolHalfHtml,
          flags: {
            [MODULE_ID]: {
              isDamageReactionCard: true,
              isResonantArcanaCard: true,
              chatChannel: "combat"
            }
          }
        });
      } else {
        // 3–4: Reduce damage to 0 + reflect Force damage (up to 15) to the damage source!
        newTotalDamage = 0;
        damageReduction = prevTotalDamage;
        const reflectedForce = Math.min(15, prevTotalDamage);
        sourceLabel = `The Fool (1d4 = ${d4Val} — Negated & Reflected)`;
        stepDescription = `The Fool warped probability (1d4 = ${d4Val}): negated all damage (${prevTotalDamage} &rarr; 0) & reflected ${reflectedForce} Force damage`;

        let refundSummary = `+${damageReduction} HP`;
        if (customDmg && customDmg.autoApplied && damageReduction > 0) {
          const revRes = await this.revertActorDamageLayered(victim, damageReduction, {
            mode: "reaction-reduction",
            damageMessage
          });
          if (revRes?.summaryText) refundSummary = revRes.summaryText;
          if (revRes?.layers) customDmg.damageLayers = foundry.utils.deepClone(revRes.layers);
        }

        const { attackerActor, attackerName, attackerUuid } =
          this.resolveDamageRollParticipants(damageMessage);

        let reflectAutoApplied = false;
        let reflectLayers = null;
        let preAttHp = Number(attackerActor?.system?.attributes?.hp?.value ?? 0);
        let preAttTemp = Number(attackerActor?.system?.attributes?.hp?.temp ?? 0);

        if (attackerActor && attackerActor.id !== victim.id && reflectedForce > 0) {
          const refRes = await AM.applyRetaliationDamageToTarget({
            attackerUuid: attackerUuid || attackerActor.uuid || "",
            attackerActorId: attackerActor.id,
            damage: reflectedForce,
            damageType: "force",
            armorLabel: "The Fool (Reflected Force)"
          });
          reflectAutoApplied = Boolean(refRes?.applied);
          reflectLayers = refRes?.damageLayers || null;
        }

        const reflectBtnRow =
          attackerActor && attackerActor.id !== victim.id && reflectedForce > 0
            ? `
              <div class="altarion-arcane-armor-btn-row">
                <button type="button" class="altarion-arcane-armor-undo-btn"
                        data-attacker-uuid="${attackerUuid || attackerActor.uuid || ""}"
                        data-attacker-id="${attackerActor.id}"
                        data-damage="${reflectedForce}"
                        data-armor-label="The Fool (Reflected Force)"
                        ${reflectAutoApplied ? "" : "disabled"}>
                  <i class="fas fa-undo"></i> Undo (+${reflectedForce} HP)
                </button>
                <button type="button" class="altarion-arcane-armor-apply-btn"
                        data-attacker-uuid="${attackerUuid || attackerActor.uuid || ""}"
                        data-attacker-id="${attackerActor.id}"
                        data-damage="${reflectedForce}"
                        data-damage-type="force"
                        data-armor-label="The Fool (Reflected Force)">
                  <i class="fas fa-bolt"></i> Re-apply (${reflectedForce} Force)
                </button>
              </div>
            `
            : "";

        const foolReflectHtml = `
          <div class="altarion-aitusa-ward-chat-tag altarion-arcane-armor-chat-card">
            <div class="altarion-ward-header">
              <i class="fas fa-hat-wizard"></i>
              <span>The Fool (1d4 = ${d4Val}) — Damage Negated &amp; ${reflectedForce} Force Reflected!</span>
            </div>
            <div class="altarion-ward-body">
              <strong>${foundry.utils.escapeHTML(victim.name)}</strong> expended <strong>Card of the Resonant Arcana (The Fool)</strong> (0/1 charge left, recovers on Long Rest) and rolled <strong>1d4 = ${d4Val} (3–4)</strong>!<br>
              &bull; <strong>Damage Negated:</strong> Incoming damage reduced from <strong>${prevTotalDamage} &rarr; 0</strong>${
                customDmg?.autoApplied ? ` (refunded <strong>${refundSummary}</strong>)` : ""
              } — <strong>${foundry.utils.escapeHTML(victim.name)}</strong> takes <strong>no damage</strong>!<br>
              &bull; <strong>Force Backlash (max 15):</strong> <strong>${foundry.utils.escapeHTML(attackerName || "The attacker")}</strong> takes <strong class="coria-custom-dmg-num">${reflectedForce}</strong> <strong>Force damage</strong>${
                reflectAutoApplied ? " (auto-applied!)" : ""
              }!
            </div>
            ${reflectBtnRow}
          </div>
        `;

        await ChatMessage.create({
          speaker: ChatMessage.getSpeaker({ actor: victim }),
          content: foolReflectHtml,
          flags: {
            [MODULE_ID]: {
              isDamageReactionCard: true,
              isResonantArcanaCard: true,
              chatChannel: "combat",
              ...(attackerActor && attackerActor.id !== victim.id && reflectedForce > 0
                ? {
                    coriaCustomDamage: {
                      cardKind: "the-fool-reflect",
                      sourceName: "The Fool (Reflected Force)",
                      attackerActorId: victim.id,
                      attackerUuid: victim.uuid || "",
                      attackerName: victim.name,
                      targetActorId: attackerActor.id,
                      targetUuid: attackerUuid || attackerActor.uuid || "",
                      targetName: attackerName || attackerActor.name,
                      damageType: "force",
                      damageTypeLabel: "Force",
                      origDamage: reflectedForce,
                      currentDamage: reflectedForce,
                      autoApplied: reflectAutoApplied,
                      preHp: preAttHp,
                      preTemp: preAttTemp,
                      damageLayers: reflectLayers
                    }
                  }
                : {})
            }
          }
        });
      }
    } else {
      return;
    }

    // Update the Original Damage Roll / Custom Damage ChatMessage in-place
    if (ledger) {
      ledger.currentTotalDamage = newTotalDamage;
      this._damageLedgersByMsgId.set(damageMessage.id, ledger);
    }
    if (customDmg) {
      customDmg.currentDamage = newTotalDamage;
    }

    const prevDmgMod = foundry.utils.deepClone(damageMessage.flags?.[MODULE_ID]?.damageModState || null);
    const historyEntry = {
      sourceLabel,
      stepDescription,
      prevTotal: prevTotalDamage,
      newTotal: newTotalDamage,
      damageReduction,
      timestamp: Date.now()
    };

    const damageModState = {
      origTotalDamage,
      currentTotalDamage: newTotalDamage,
      history: [...(Array.isArray(prevDmgMod?.history) ? prevDmgMod.history : []), historyEntry]
    };

    // Subtract `damageReduction` from the serialized DamageRoll terms AND total so Foundry dnd5e's
    // `aggregateDamageRolls`, `.dice-total`, and `<damage-application>` tray all see `newTotalDamage`!
    let remainingToSubtract = damageReduction;
    const updatedRolls = (damageMessage.rolls || []).map((r) => {
      const json = foundry.utils.deepClone(r.toJSON());
      const rTotal = Math.max(0, Number(json.total ?? 0));
      if (remainingToSubtract > 0 && rTotal > 0) {
        const deduct = Math.min(rTotal, remainingToSubtract);
        remainingToSubtract -= deduct;
        const nextRollTotal = Math.max(0, rTotal - deduct);
        if (deduct > 0 && Array.isArray(json.terms)) {
          const primaryFlavor =
            json.options?.type ||
            json.terms.find(t => t?.options?.flavor)?.options?.flavor ||
            "";
          json.terms.push(
            { class: "OperatorTerm", options: {}, evaluated: true, operator: "-" },
            {
              class: "NumericTerm",
              options: primaryFlavor ? { flavor: primaryFlavor } : {},
              evaluated: true,
              number: deduct
            }
          );
          json.formula = json.formula ? `${json.formula} - ${deduct}` : String(nextRollTotal);
        }
        json.total = nextRollTotal;
      }
      return json;
    });

    try {
      await damageMessage.update({
        ...(updatedRolls.length > 0 ? { rolls: updatedRolls } : {}),
        ...(customDmg ? { [`flags.${MODULE_ID}.coriaCustomDamage`]: customDmg } : {}),
        ...(ledger ? { [`flags.${MODULE_ID}.damageLedger`]: ledger } : {}),
        [`flags.${MODULE_ID}.damageModState`]: damageModState
      });
    } catch (err) {
      console.warn("[CoriaRollLedger] Could not update original damage ChatMessage:", err);
    }

    for (const el of document.querySelectorAll(`[data-message-id="${damageMessage.id}"]`)) {
      this.decorateModifiedDamageMessage(damageMessage, el);
      this.renderDamageReactionsBar(damageMessage, el, { forceRefresh: true });
    }
  }

  /**
   * Decorate a modified Damage Roll or Custom Damage ChatMessage in the DOM with its updated totals,
   * `<damage-application>` tray values, custom Undo/Apply button values, and `.coria-roll-mod-banner`.
   */
  static decorateModifiedDamageMessage(message, rootEl) {
    const modState = message?.flags?.[MODULE_ID]?.damageModState;
    if (!modState) return;

    const { origTotalDamage, currentTotalDamage, history = [] } = modState;
    const customDmg = message?.flags?.[MODULE_ID]?.coriaCustomDamage || null;

    // 1. Update `.dice-total` / `.subtotal` elements in standard dnd5e damage cards
    for (const totalEl of rootEl.querySelectorAll(".dice-total, .subtotal .total")) {
      const valSpan = totalEl.querySelector(".value, .total");
      if (valSpan) {
        valSpan.textContent = String(currentTotalDamage);
      } else if (totalEl.children.length === 0) {
        totalEl.textContent = String(currentTotalDamage);
      } else {
        for (const node of totalEl.childNodes) {
          if (node.nodeType === Node.TEXT_NODE && node.textContent.trim().length > 0) {
            node.textContent = String(currentTotalDamage);
            break;
          }
        }
      }
    }

    // 1b. Update custom damage card numbers & action buttons (`coriaCustomDamage`) in-place
    if (customDmg) {
      const dmgLabel = customDmg.damageTypeLabel || "Damage";
      for (const numEl of rootEl.querySelectorAll(".coria-plague-dmg-num, .coria-custom-dmg-num")) {
        numEl.textContent = String(currentTotalDamage);
      }
      for (const btn of rootEl.querySelectorAll(
        ".coria-summon-atk-undo-btn, .coria-summon-atk-reapply-btn, .altarion-arcane-armor-undo-btn, .altarion-arcane-armor-apply-btn, .coria-dv-undo-btn, .coria-dv-reapply-btn"
      )) {
        btn.setAttribute("data-damage", String(currentTotalDamage));
        if (btn.classList.contains("coria-summon-atk-undo-btn") || btn.classList.contains("altarion-arcane-armor-undo-btn") || btn.classList.contains("coria-dv-undo-btn")) {
          if (!btn.disabled) {
            btn.innerHTML = `<i class="fas fa-undo"></i> Undo (+${currentTotalDamage} HP)`;
          }
        } else {
          btn.innerHTML = `<i class="fas fa-bolt"></i> Re-apply (${currentTotalDamage} ${foundry.utils.escapeHTML(dmgLabel)})`;
        }
      }
      for (const moveBtn of rootEl.querySelectorAll(".coria-blade-move-apply-btn")) {
        moveBtn.setAttribute("data-amount", String(currentTotalDamage));
        moveBtn.innerHTML = `<i class="fas fa-bolt"></i> Apply ${currentTotalDamage} ${foundry.utils.escapeHTML(dmgLabel)} Damage to Selected Target`;
      }
    }

    // 2. Sync any mounted `<damage-application>` custom element inside the card so clicking Apply Damage uses `currentTotalDamage`
    for (const dmgApp of rootEl.querySelectorAll("damage-application")) {
      if (Array.isArray(dmgApp.damages) && dmgApp.damages.length > 0) {
        const curSum = dmgApp.damages.reduce((s, d) => s + Math.max(0, Number(d?.value || 0)), 0);
        if (curSum !== currentTotalDamage) {
          let diff = Math.max(0, curSum - currentTotalDamage);
          dmgApp.damages = dmgApp.damages.map(d => {
            const copy = { ...d };
            const val = Math.max(0, Number(copy.value || 0));
            if (diff > 0 && val > 0) {
              const take = Math.min(val, diff);
              copy.value = val - take;
              diff -= take;
            }
            return copy;
          });
          try {
            dmgApp.requestUpdate?.();
            dmgApp.buildTargetsList?.();
          } catch (_e) {}
        }
      }
    }

    // 3. Inject or refresh `.coria-roll-mod-banner`
    let banner = rootEl.querySelector(".coria-roll-mod-banner");
    if (!banner) {
      banner = document.createElement("div");
      banner.className = "coria-roll-mod-banner";
      const contentEl = rootEl.querySelector(".message-content") || rootEl;
      const reactBar = contentEl.querySelector(".coria-damage-reactions-bar, .coria-d20-reactions-bar");
      if (reactBar) {
        reactBar.insertAdjacentElement("beforebegin", banner);
      } else {
        contentEl.appendChild(banner);
      }
    }

    const stepsHtml = history
      .map(
        h =>
          `<div class="coria-mod-step-line">&bull; <strong class="coria-hl-info">${foundry.utils.escapeHTML(h.sourceLabel)}</strong>: ${h.stepDescription}</div>`
      )
      .join("");

    banner.style.cssText = `margin: 6px 0; padding: 7px 10px; border-radius: 6px; border: 1.5px solid #0284c7; border-left: 4px solid #0284c7; background: linear-gradient(135deg, rgba(12, 24, 44, 0.94), rgba(8, 15, 30, 0.96)); color: #f8fafc; font-size: 12px; box-shadow: 0 2px 6px rgba(0,0,0,0.45);`;
    banner.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;gap:6px;margin-bottom:3px;border-bottom:1px solid rgba(255,255,255,0.18);padding-bottom:3px;">
        <span class="coria-hl-info"><i class="fas fa-shield-alt"></i> Modified Damage</span>
        <span class="coria-hl-success">Resulting Damage: ${currentTotalDamage}</span>
      </div>
      <div class="coria-mod-orig-line">
        Original Damage: <strong>${origTotalDamage}</strong> &rarr; Resulting Damage: <strong>${currentTotalDamage}</strong>
      </div>
      ${stepsHtml}
    `;
  }

  /**
   * Bind Undo & Re-apply buttons on `Altarion's Echoing Ward` chat cards.
   */
  static bindEchoingWardUndoReapplyButtons(message, rootEl) {
    const AM = globalThis.AltarionAutomationManager;
    if (!AM || !rootEl) return;

    for (const undoBtn of rootEl.querySelectorAll(".altarion-echoing-ward-undo-btn")) {
      if (undoBtn.dataset.bound) continue;
      undoBtn.dataset.bound = "true";
      undoBtn.addEventListener("click", async (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        const victimUuid = undoBtn.getAttribute("data-victim-uuid") || "";
        const victimId = undoBtn.getAttribute("data-victim-id") || "";
        const prevTemp = Math.max(0, Number(undoBtn.getAttribute("data-prev-temp") || 0));
        const hpRestored = Math.max(0, Number(undoBtn.getAttribute("data-hp-restored") || 0));
        const wardRestored = Math.max(0, Number(undoBtn.getAttribute("data-ward-restored") || 0));

        const victim = await AM.resolveActorFromUuidOrId(victimUuid, victimId);
        if (!victim || !victim.isOwner) {
          ui.notifications.warn("[Altarion's Echoing Ward] Apenas o Mestre ou dono da ficha pode desfazer.");
          return;
        }

        const updateData = {
          "system.attributes.hp.temp": prevTemp
        };
        if (hpRestored > 0) {
          const curHp = Math.max(0, Number(victim.system?.attributes?.hp?.value ?? 0));
          updateData["system.attributes.hp.value"] = Math.max(0, curHp - hpRestored);
        }
        if (wardRestored > 0 && AM.isAltarion?.(victim)) {
          const curWard = Math.max(0, Number(victim.system?.resources?.tertiary?.value ?? 0));
          updateData["system.resources.tertiary.value"] = Math.max(0, curWard - wardRestored);
        }

        await victim.update(updateData, {
          altarionBypassWard: true,
          coriaDamageReactionInternal: true,
          coriaDarkVitalityBypass: true,
          coriaLayeredUndo: true
        });

        undoBtn.disabled = true;
        undoBtn.innerHTML = `<i class="fas fa-check"></i> Undone`;
        const row = undoBtn.closest(".altarion-arcane-armor-btn-row") || rootEl;
        const reapplyBtn = row.querySelector(".altarion-echoing-ward-reapply-btn");
        if (reapplyBtn) reapplyBtn.disabled = false;
        ui.notifications.info(
          `[Altarion's Echoing Ward] Restored ${victim.name}'s Temporary HP to ${prevTemp}${
            hpRestored > 0 ? ` and reversed +${hpRestored} HP` : ""
          }.`
        );
      });
    }

    for (const reapplyBtn of rootEl.querySelectorAll(".altarion-echoing-ward-reapply-btn")) {
      if (reapplyBtn.dataset.bound) continue;
      reapplyBtn.dataset.bound = "true";
      reapplyBtn.addEventListener("click", async (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        const victimUuid = reapplyBtn.getAttribute("data-victim-uuid") || "";
        const victimId = reapplyBtn.getAttribute("data-victim-id") || "";
        const prevTemp = Math.max(0, Number(reapplyBtn.getAttribute("data-prev-temp") || 0));
        const finalTempAttr = reapplyBtn.getAttribute("data-final-temp");
        const rolledTemp = Math.max(1, Number(reapplyBtn.getAttribute("data-rolled-temp") || 1));
        const hpRestored = Math.max(0, Number(reapplyBtn.getAttribute("data-hp-restored") || 0));
        const wardRestored = Math.max(0, Number(reapplyBtn.getAttribute("data-ward-restored") || 0));

        const victim = await AM.resolveActorFromUuidOrId(victimUuid, victimId);
        if (!victim || !victim.isOwner) {
          ui.notifications.warn("[Altarion's Echoing Ward] Apenas o Mestre ou dono da ficha pode reaplicar.");
          return;
        }

        if (hpRestored > 0 || wardRestored > 0) {
          const curHp = Math.max(0, Number(victim.system?.attributes?.hp?.value ?? 0));
          const maxHp = Number(
            victim.system?.attributes?.hp?.effectiveMax || victim.system?.attributes?.hp?.max || curHp + hpRestored
          );
          const targetTemp = finalTempAttr !== null ? Math.max(0, Number(finalTempAttr)) : rolledTemp;
          const updateData = {
            "system.attributes.hp.temp": Math.max(Number(victim.system?.attributes?.hp?.temp ?? 0), targetTemp)
          };
          if (hpRestored > 0) {
            updateData["system.attributes.hp.value"] = Math.min(maxHp, curHp + hpRestored);
          }
          if (wardRestored > 0 && AM.isAltarion?.(victim)) {
            const wardState = AM.getArcaneWardState?.(victim);
            const curWard = Number(wardState?.current ?? 0);
            const maxWard = Number(wardState?.max ?? curWard + wardRestored);
            updateData["system.resources.tertiary.value"] = Math.min(maxWard, curWard + wardRestored);
          }
          await victim.update(updateData, {
            altarionBypassWard: true,
            coriaDamageReactionInternal: true,
            coriaDarkVitalityBypass: true,
            coriaLayeredUndo: true
          });
        } else if (typeof victim.applyTempHP === "function") {
          await victim.applyTempHP(rolledTemp);
        } else {
          await victim.update(
            {
              "system.attributes.hp.temp": rolledTemp
            },
            { altarionBypassWard: true, coriaDamageReactionInternal: true }
          );
        }

        const row = reapplyBtn.closest(".altarion-arcane-armor-btn-row") || rootEl;
        const undoBtn = row.querySelector(".altarion-echoing-ward-undo-btn");
        if (undoBtn) {
          undoBtn.disabled = false;
          undoBtn.innerHTML =
            hpRestored > 0
              ? `<i class="fas fa-undo"></i> Undo (-${hpRestored} HP, Temp &rarr; ${prevTemp})`
              : `<i class="fas fa-undo"></i> Undo Temp HP (${prevTemp} Temp HP)`;
        }
        ui.notifications.info(`[Altarion's Echoing Ward] Re-applied +${rolledTemp} Temporary HP to ${victim.name}.`);
      });
    }
  }
}
