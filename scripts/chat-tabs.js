/**
 * CoriaChatTabs — Dual Chat Tab System for FoundryVTT v13 (`General Chat` & `Combat Log`)
 *
 * Keeps the chat sidebar organized during combat and roleplay without ever modifying or deleting
 * Foundry ChatMessages:
 *  - General Chat: Player speech (IC/OOC/emotes/whispers), GM narration, Ability Checks, Skill Checks,
 *    Tool Checks, and any reroll/reaction cards (Lucky, Halfling Lucky, Paths of Destiny, Portent,
 *    Silvery Barbs, etc.) that target an Ability/Skill/Tool check.
 *  - Combat Log: Attack rolls, Damage rolls, Healing rolls, Saving Throws (incl. Concentration & Death),
 *    Initiative, Combat spell/item/feature cards, Damage/Temp HP/Ward/Aura/Summon/Resonant Arcana cards,
 *    and any reroll/reaction cards that target an Attack Roll or Saving Throw.
 */

const MODULE_ID = "altarion-aitusa";
const STORAGE_KEY = "coria-chat-active-tab-v1";

export class CoriaChatTabs {
  static _initialized = false;
  static _activeTab = "general";
  static _unread = { general: 0, combat: 0 };
  static _delegatedBound = false;

  static init() {
    if (this._initialized) return;
    this._initialized = true;
    globalThis.CoriaChatTabs = this;

    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === "general" || saved === "combat") {
        this._activeTab = saved;
      }
    } catch (_e) {
      this._activeTab = "general";
    }

    this._bindDelegatedClicks();
    this._registerHooks();
    console.log("[Altarion & Aitusa] CoriaChatTabs initialized (General Chat / Combat Log).");
  }

  static _bindDelegatedClicks() {
    if (this._delegatedBound || typeof document === "undefined") return;
    this._delegatedBound = true;

    // Delegated capture + bubble listener guarantees clicks ALWAYS work even across Foundry v13 re-renders
    document.addEventListener(
      "click",
      (ev) => {
        const btn = ev.target?.closest?.(".coria-chat-tab-btn");
        if (!btn) return;
        ev.preventDefault();
        ev.stopPropagation();
        const tab = btn.getAttribute("data-coria-tab");
        if (tab === "general" || tab === "combat") {
          this.setActiveTab(tab);
        }
      },
      true
    );
  }

  static _registerHooks() {
    Hooks.on("renderChatLog", (app, html) => {
      try {
        const rootEl = html instanceof HTMLElement ? html : html?.[0] || app?.element;
        if (rootEl) this.mountTabsOnChatContainer(rootEl);
      } catch (err) {
        console.warn("[CoriaChatTabs] renderChatLog error:", err);
      }
    });

    Hooks.on("renderChatPopout", (app, html) => {
      try {
        const rootEl = html instanceof HTMLElement ? html : html?.[0] || app?.element;
        if (rootEl) this.mountTabsOnChatContainer(rootEl);
      } catch (_e) {}
    });

    Hooks.once("ready", () => {
      this._bindDelegatedClicks();
      const mountNow = () => {
        const chatEl = document.getElementById("chat") || document.querySelector(".chat-sidebar");
        if (chatEl) this.mountTabsOnChatContainer(chatEl);
      };
      mountNow();
      setTimeout(mountNow, 300);
      setTimeout(mountNow, 1200);
    });

    Hooks.on("renderChatMessageHTML", (message, html) => {
      try {
        const rootEl = html instanceof HTMLElement ? html : html?.[0];
        if (!rootEl || !message) return;
        const channel = this.classifyMessageChannel(message);
        rootEl.dataset.coriaChatChannel = channel;
      } catch (_e) {}
    });

    Hooks.on("updateChatMessage", (message) => {
      try {
        if (!message?.id) return;
        const channel = this.classifyMessageChannel(message);
        for (const el of document.querySelectorAll(`li.chat-message[data-message-id="${message.id}"]`)) {
          el.dataset.coriaChatChannel = channel;
        }
      } catch (_e) {}
    });

    Hooks.on("createChatMessage", (message) => {
      try {
        if (!message) return;
        if (!this._isMessageVisibleToCurrentUser(message)) return;

        const channel = this.classifyMessageChannel(message);

        // If the local user typed a plain regular chat message while currently on Combat Log,
        // automatically switch to General Chat so they immediately see their own message!
        const isLocalPlainChat =
          message.author?.id === game.user?.id &&
          channel === "general" &&
          (!message.rolls || message.rolls.length === 0) &&
          !message.flags?.[MODULE_ID] &&
          !message.flags?.dnd5e?.activity &&
          !message.flags?.dnd5e?.use;

        if (isLocalPlainChat && this._activeTab !== "general") {
          this.setActiveTab("general");
          return;
        }

        if (channel !== this._activeTab) {
          this._unread[channel] = Math.min(99, Number(this._unread[channel] || 0) + 1);
          this._refreshAllTabBars();
        }
      } catch (_e) {}
    });
  }

  static _isMessageVisibleToCurrentUser(message) {
    if (!message || !game.user) return false;
    if (game.user.isGM) return true;
    if (message.blind) return false;
    const whispers = Array.isArray(message.whisper) ? message.whisper : [];
    if (whispers.length > 0) {
      return whispers.includes(game.user.id) || message.author?.id === game.user.id;
    }
    return true;
  }

  /**
   * Determine the exact chat channel (`"general"` or `"combat"`) for a Foundry `ChatMessage`.
   */
  static classifyMessageChannel(message) {
    if (!message) return "general";
    const modFlags = message.flags?.[MODULE_ID] || {};

    // 1. Explicit channel tag stamped by our automations / reroll cards
    if (modFlags.chatChannel === "general" || modFlags.chatChannel === "combat") {
      return modFlags.chatChannel;
    }

    // 2. If this is a reroll / d20 reaction card linked to an originating roll message, inherit its channel!
    if (modFlags.originRollMessageId) {
      const originMsg = game.messages?.get(modFlags.originRollMessageId);
      if (originMsg && originMsg.id !== message.id) {
        return this.classifyMessageChannel(originMsg);
      }
    }

    // 3. Explicit dnd5e 5.x roll type classification
    const dndRoll = message.flags?.dnd5e?.roll || {};
    const rollType = String(dndRoll.type || message.rolls?.[0]?.options?.type || "").toLowerCase();

    if (rollType === "ability" || rollType === "skill" || rollType === "tool") {
      return "general";
    }
    if (
      rollType === "attack" ||
      rollType === "damage" ||
      rollType === "healing" ||
      rollType === "save" ||
      rollType === "savingthrow" ||
      rollType === "saving-throw" ||
      rollType === "concentration" ||
      rollType === "death" ||
      rollType === "initiative" ||
      rollType === "hitdie" ||
      rollType === "hitdice"
    ) {
      return "combat";
    }

    if (message.flags?.core?.initiativeRoll) {
      return "combat";
    }

    // 4. Module-generated combat / automation cards
    if (
      modFlags.isDamageReactionCard ||
      modFlags.isArcaneWardCard ||
      modFlags.coriaCustomDamage ||
      modFlags.interactiveSaveCard ||
      modFlags.isSpiritGuardiansDamageCard ||
      modFlags.isShadowRebukeDamageCard ||
      modFlags.isAncestralMarkingCard ||
      modFlags.isResonantMoonCard ||
      modFlags.isResonantArcanaCard ||
      modFlags.isArcaneArmorCard ||
      modFlags.isEchoingWardCard ||
      modFlags.isDarkVitalityCard ||
      modFlags.isSummonAttackCard ||
      modFlags.isPlagueDamageCard ||
      modFlags.isMirrorImageCard ||
      modFlags.isBlurCard ||
      modFlags.isHeroismCard ||
      modFlags.isPortentBlindRoll ||
      modFlags.isD20ReactionCard ||
      modFlags.isPathsOfDestinyCard ||
      modFlags.linkedSaveCard
    ) {
      return "combat";
    }

    // 5. Inspect dnd5e Activity / Item / Spell use cards
    if (message.flags?.dnd5e?.activity || message.flags?.dnd5e?.use || message.flags?.dnd5e?.item) {
      return "combat";
    }

    const content = String(message.content || "");
    const flavor = String(message.flavor || "");

    if (
      content.includes("altarion-aitusa-ward-chat-tag") ||
      content.includes("altarion-arcane-armor-chat-card") ||
      content.includes("coria-summon-atk-card") ||
      content.includes("dnd5e2 chat-card") ||
      content.includes('data-action="rollAttack"') ||
      content.includes('data-action="rollDamage"') ||
      content.includes('data-action="rollSave"')
    ) {
      if (modFlags.isParvaTithePrompt || /o d[íi]zimo arcano.*persuas/i.test(content)) {
        return "general";
      }
      return "combat";
    }

    // 6. Inspect manual / untyped rolls by flavor text
    if (Array.isArray(message.rolls) && message.rolls.length > 0) {
      if (
        /\b(saving throw|concentration|death saving|attack roll|damage roll|initiative|salvaguarda|teste de resist[êe]ncia|rolagem de ataque|rolagem de dano|iniciativa|dano|healing|cura)\b/i.test(
          flavor
        )
      ) {
        return "combat";
      }
      return "general";
    }

    // 7. Default: normal player chat, IC speech, OOC, whispers, emotes -> General Chat
    return "general";
  }

  /**
   * Helper for reroll reaction scripts (`Flinn.js`, `resonant-arcana.js`) to determine the target
   * chat channel (`"general"` vs `"combat"`) for a reaction card given the roll it is modifying.
   */
  static getChannelForOriginRoll({ originMsgId = "", cardMsgId = "", defaultChannel = "combat" } = {}) {
    if (originMsgId) {
      const originMsg = game.messages?.get(originMsgId);
      if (originMsg) return this.classifyMessageChannel(originMsg);
    }
    if (cardMsgId) return "combat";
    return defaultChannel;
  }

  static mountTabsOnChatContainer(containerEl) {
    if (!containerEl) return;
    const chatLog = containerEl.querySelector("ol.chat-log, #chat-log");
    if (!chatLog) return;

    containerEl.setAttribute("data-coria-chat-tab", this._activeTab);
    chatLog.setAttribute("data-coria-chat-tab", this._activeTab);

    let bar = containerEl.querySelector(".coria-chat-tabs-bar");
    if (!bar) {
      bar = document.createElement("div");
      bar.className = "coria-chat-tabs-bar";
      bar.innerHTML = `
        <button type="button" class="coria-chat-tab-btn" data-coria-tab="general"
                title="General Chat: Conversas dos jogadores, sussurros, emotes e Testes de Habilidade/Perícia (inclui re-rolagens em testes de habilidade)">
          <i class="fas fa-comments"></i>
          <span>General Chat</span>
          <span class="coria-chat-tab-badge" data-badge-for="general"></span>
        </button>
        <button type="button" class="coria-chat-tab-btn" data-coria-tab="combat"
                title="Combat Log Chat: Ataques, Danos, Testes de Resistência, Iniciativa, Magias, PV Temporário e automações de combate">
          <i class="fas fa-swords"></i>
          <span>Combat Log</span>
          <span class="coria-chat-tab-badge" data-badge-for="combat"></span>
        </button>
      `;

      // Insert flush at the very top of the chat container (above `.chat-scroll` / `ol.chat-log`)
      const scrollWrap = chatLog.closest(".chat-scroll");
      if (scrollWrap && scrollWrap.parentElement) {
        scrollWrap.parentElement.insertBefore(bar, scrollWrap);
      } else if (chatLog.parentElement) {
        chatLog.parentElement.insertBefore(bar, chatLog);
      } else {
        containerEl.prepend(bar);
      }
    }

    // Tag all already-rendered messages inside this log
    for (const li of chatLog.querySelectorAll("li.chat-message[data-message-id]")) {
      const msgId = li.getAttribute("data-message-id");
      const msg = msgId ? game.messages?.get(msgId) : null;
      if (msg) {
        li.dataset.coriaChatChannel = this.classifyMessageChannel(msg);
      }
    }

    this._refreshAllTabBars();
  }

  static setActiveTab(tab) {
    if (tab !== "general" && tab !== "combat") return;
    this._activeTab = tab;
    this._unread[tab] = 0;

    try {
      localStorage.setItem(STORAGE_KEY, tab);
    } catch (_e) {}

    // Update all mounted containers & chat logs (sidebar + popout)
    for (const container of document.querySelectorAll("[data-coria-chat-tab], #chat, .chat-sidebar, .chat-popout")) {
      if (container.querySelector("ol.chat-log, #chat-log") || container.matches("ol.chat-log, #chat-log")) {
        container.setAttribute("data-coria-chat-tab", tab);
      }
    }

    // Ensure every visible chat message currently in the DOM has its channel classified
    for (const li of document.querySelectorAll("ol.chat-log li.chat-message[data-message-id], #chat-log li.chat-message[data-message-id]")) {
      if (!li.dataset.coriaChatChannel) {
        const msgId = li.getAttribute("data-message-id");
        const msg = msgId ? game.messages?.get(msgId) : null;
        if (msg) li.dataset.coriaChatChannel = this.classifyMessageChannel(msg);
      }
    }

    this._refreshAllTabBars();

    // Smoothly scroll chat log to the latest message in the newly selected tab
    requestAnimationFrame(() => {
      for (const scrollEl of document.querySelectorAll("#chat .chat-scroll, #chat ol.chat-log, .chat-popout .chat-scroll, .chat-popout ol.chat-log")) {
        try {
          scrollEl.scrollTop = scrollEl.scrollHeight;
        } catch (_e) {}
      }
    });
  }

  static _refreshAllTabBars() {
    for (const bar of document.querySelectorAll(".coria-chat-tabs-bar")) {
      for (const btn of bar.querySelectorAll(".coria-chat-tab-btn")) {
        const t = btn.getAttribute("data-coria-tab");
        const isActive = t === this._activeTab;
        btn.classList.toggle("is-active", isActive);
        btn.setAttribute("aria-selected", isActive ? "true" : "false");

        const badge = btn.querySelector(".coria-chat-tab-badge");
        if (badge) {
          const count = isActive ? 0 : Number(this._unread[t] || 0);
          if (count > 0) {
            badge.textContent = count >= 99 ? "99+" : String(count);
            badge.classList.add("is-visible");
          } else {
            badge.textContent = "";
            badge.classList.remove("is-visible");
          }
        }
      }
    }
  }
}
