/**
 * Sistema Completo da Praga Arcana — Altarion, Flinn, Kyrion & Parva
 * Baseado integralmente em "Praga Arcana (Nova).txt" e na identidade visual Coria ("automacao_praga.js").
 *
 * Funcionalidades:
 * - Segunda linha no cabeçalho das fichas de Altarion, Flinn, Parva e Kyrion (excluindo Aitusa).
 * - Janela interativa de Informações Gerais + Regras Específicas da ficha ao clicar no indicador de EC Atual.
 * - Automação cumulativa dos Estágios de Contaminação (EC 0 a EC 6):
 *   - EC 0: Incubação (visual).
 *   - EC 1: Rejeição Natural (bloqueia cura por gasto de Dados de Vida).
 *   - EC 2: Letargia Sanguínea (recupera apenas metade dos PV máximos no Descanso Longo).
 *   - EC 3: Mente Fragmentada (Desvantagem em Testes de Resistência de INT, SAB e CAR).
 *   - EC 4: Trama Corrompida (Desvantagem em Concentração + 1d4 de dano de Força por nível de magia de 1º+ nível; ou 1d4 Força marcial).
 *   - EC 5: Cristalização Corporal (Deslocamento reduzido pela metade + Desvantagem em Testes de Resistência de FOR, DES e CON).
 *   - EC 6: O Estágio Terminal (Falha automática em Testes de Morte + CON CD 15 pós-Descanso Longo ou 8d6 Força + alerta de Zumbi Arcano).
 * - Especificidades de Personagem:
 *   - Flinn: Diálogo "Reescrever o Destino" no Descanso Longo (sacrificar 1 Portent -> sucesso automático e -1d4 na CD, mín. 10).
 *   - Parva: Diálogo "O Dízimo Arcano" / "Canalização Instável" no Descanso Longo (Persuasão CD da Praga -> sacrifica 1 slot de Pacto bloqueado pelo dia seguinte).
 *   - Kyrion: Botão "Alimentar a Fome" no cabeçalho (seletor "+" de itens mágicos do inventário com prévia por raridade) + botão no chat ao falhar em CON para rolar Sabedoria (e 1d4h de controle por ???? em falha).
 *   - Altarion: Indicadores de ECs Armazenados e EC Atual (max(0, Armazenados - ceil(BP/2))), botão "Absorver Praga" ("O Custo da Absorção" consumindo 1 Dado de Vida), limite de Dados de Vida no Descanso Longo (total - armazenados), e opção "Dispersão Contagiosa" (+1d6 Force) em toda rolagem de dano.
 * - Botão flutuante de Controle Global da Praga para o Mestre (#coria-plague-floating-btn) + sincronização via Socket.
 */

import { createV2Dialog } from "./dialog-v2.js";
import { CoriaRollLedger } from "./roll-ledger.js";
import { isIgnoredBackupActor } from "./sync-guard.js";

const MODULE_ID = "altarion-aitusa";
const SOCKET_NAME = `module.${MODULE_ID}`;

export class ArcanePlagueManager {
  static _initialized = false;
  static _activeRestPrompts = new Set();
  static _lastSpellBacklashKey = null;

  /**
   * Tabela oficial dos Estágios de Contaminação (EC 0 a EC 6) — Praga Arcana (Nova).txt
   */
  static STAGE_DATA = {
    0: {
      code: "EC 0",
      title: "Incubação",
      flavor: "As veias do personagem escurecem levemente e minúsculos fragmentos cristalinos aparecem sob a pele.",
      summary: "<strong>EC 0 — Incubação:</strong> Apenas visual. Nenhuma implicação mecânica.",
      effects: ["Apenas visual. Nenhuma implicação mecânica."]
    },
    1: {
      code: "EC 1",
      title: "Rejeição Natural",
      flavor: "A praga começa a substituir as funções biológicas, tornando a cura natural ineficiente.",
      summary: "<strong>EC 1 — Rejeição Natural:</strong> Não pode mais recuperar PV por meio do gasto de Dados de Vida.",
      effects: ["A criatura não pode mais recuperar Pontos de Vida (PV) por meio do gasto de Dados de Vida."]
    },
    2: {
      code: "EC 2",
      title: "Letargia Sanguínea",
      flavor: "O corpo gasta a maior parte de suas energias apenas para conter o avanço dos cristais.",
      summary: "<strong>EC 2 — Letargia Sanguínea:</strong> Recupera apenas metade dos PV máximos ao realizar um descanso longo.",
      effects: ["A criatura recupera apenas metade dos seus Pontos de Vida máximos ao realizar um descanso longo."]
    },
    3: {
      code: "EC 3",
      title: "Mente Fragmentada",
      flavor: "A magia corrompida no sangue começa a sussurrar e a atrapalhar a linha de raciocínio.",
      summary: "<strong>EC 3 — Mente Fragmentada:</strong> Desvantagem em todos os Testes de Resistência de Inteligência, Sabedoria e Carisma.",
      effects: ["Desvantagem em todos os Testes de Resistência de Inteligência, Sabedoria e Carisma."]
    },
    4: {
      code: "EC 4",
      title: "Trama Corrompida",
      flavor: "A praga agora está enraizada no corpo da criatura. Canalizar magia pura ou forçar os limites físicos quebra os cristais internamente, causando dor excruciante.",
      summary: "<strong>EC 4 — Trama Corrompida:</strong> Desvantagem em Concentração; sofre 1d4 de dano de Força por nível de magia conjurada (1º+ nível) ou 1d4 de Força ao usar recurso marcial limitado.",
      effects: [
        "Desvantagem em todos os testes de Concentração.",
        "Toda vez que conjurar uma magia de 1º nível ou superior, sofre 1d4 de dano de Força para cada nível da magia conjurada.",
        "Efeito Marcial: Se não possuir magias, sofre 1d4 de dano de Força toda vez que utilizar uma Habilidade de Classe que consuma um recurso limitado."
      ]
    },
    5: {
      code: "EC 5",
      title: "Cristalização Corporal",
      flavor: "As articulações endurecem e a corrupção mental enfraquece os reflexos básicos de sobrevivência.",
      summary: "<strong>EC 5 — Cristalização Corporal:</strong> Deslocamento reduzido pela metade; Desvantagem em Testes de Resistência de Força, Destreza e Constituição.",
      effects: [
        "O deslocamento da criatura é reduzido pela metade.",
        "Desvantagem em todos os Testes de Resistência de Força, Destreza e Constituição."
      ]
    },
    6: {
      code: "EC 6",
      title: "O Estágio Terminal",
      flavor: "O corpo não suporta mais a dualidade entre vida orgânica e a praga.",
      summary: "<strong>EC 6 — O Estágio Terminal:</strong> Falha automática em Testes de Morte; CON CD 15 após descanso longo ou 8d6 de dano de Força; morte de conjurador transforma em \"Zumbi Arcano\".",
      effects: [
        "Falha automaticamente em todos os Testes de Morte.",
        "Após terminar um descanso longo, deve fazer um teste de resistência de Constituição (CD 15). Caso falhe, recebe 8d6 de dano de Força.",
        "Efeito Letal: Se for um conjurador de qualquer tipo e morrer neste estágio, transforma-se instantaneamente em um \"Zumbi Arcano\"."
      ]
    }
  };

  /**
   * Mapeamento de raridades para "Alimentar a Fome" do Kyrion
   */
  static RARITY_CONFIG = {
    common: {
      label: "Comum",
      reduction: 0,
      color: "#9ca3af",
      valid: false
    },
    uncommon: {
      label: "Incomum",
      reduction: 1,
      color: "#4ade80",
      valid: true
    },
    rare: {
      label: "Raro",
      reduction: 2,
      color: "#60a5fa",
      valid: true
    },
    veryRare: {
      label: "Muito Raro",
      reduction: 3,
      color: "#c084fc",
      valid: true
    },
    legendary: {
      label: "Lendário",
      reduction: 4,
      color: "#fbbf24",
      valid: true
    },
    artifact: {
      label: "Artefato",
      reduction: 5,
      color: "#f87171",
      valid: true
    }
  };

  /* -------------------------------------------- */
  /*  Inicialização                               */
  /* -------------------------------------------- */

  static init() {
    if (this._initialized) return;
    this._initialized = true;

    this.registerSettings();
    this.registerDataModelWrappers();
    this.registerRestAndStageHooks();
    this.registerDamageDialogHooks();
    this.registerChatHooks();
    this.registerReadyHooks();

    console.log("[Altarion & Aitusa] ArcanePlagueManager initialized.");
  }

  static registerSettings() {
    try {
      game.settings.register(MODULE_ID, "plagueDormancy", {
        name: "Praga Arcana: Dormência em Ambiente Seguro",
        hint: "Quando ativado, suspende os testes automáticos diários da Praga Arcana ao finalizar descansos longos (downtime seguro; testar apenas a cada 7 dias pelo painel do Mestre).",
        scope: "world",
        config: true,
        type: Boolean,
        default: false,
        onChange: () => {
          for (const actor of game.actors || []) {
            if (this.isSheetPlagueCharacter(actor) && actor.sheet?.rendered) {
              actor.sheet.render(false);
            }
          }
        }
      });
    } catch (_) {
      // Ignore if already registered
    }
  }

  /* -------------------------------------------- */
  /*  Identificação de Personagens & Estado       */
  /* -------------------------------------------- */

  static getAltarionName() {
    try {
      if (game?.settings?.settings?.has(`${MODULE_ID}.altarionName`)) {
        return (game.settings.get(MODULE_ID, "altarionName") || "Altarion").trim();
      }
    } catch (_) {
      // ignore
    }
    return "Altarion";
  }

  static getAitusaName() {
    try {
      if (game?.settings?.settings?.has(`${MODULE_ID}.aitusaName`)) {
        return (game.settings.get(MODULE_ID, "aitusaName") || "Aitusa").trim();
      }
    } catch (_) {
      // ignore
    }
    return "Aitusa";
  }

  /**
   * Retorna o papel do ator no sistema da Praga:
   * "altarion" | "flinn" | "parva" | "kyrion" | "infected-npc" | null
   */
  static getPlagueRole(actor) {
    if (!actor || !actor.name || isIgnoredBackupActor(actor)) return null;
    const norm = actor.name.trim().toLowerCase();
    if (norm === this.getAitusaName().toLowerCase() || norm === "aitusa" || norm.startsWith("aitusa ")) return null;
    if (norm === this.getAltarionName().toLowerCase() || norm === "altarion" || norm.startsWith("altarion ")) return "altarion";
    if (norm === "flinn" || norm.startsWith("flinn ")) return "flinn";
    if (norm === "parva" || norm.startsWith("parva ")) return "parva";
    if (norm === "kyrion" || norm.startsWith("kyrion ")) return "kyrion";
    if (actor.flags?.[MODULE_ID]?.plague?.infected) return "infected-npc";
    return null;
  }

  static isSheetPlagueCharacter(actor) {
    const role = this.getPlagueRole(actor);
    return role === "altarion" || role === "flinn" || role === "parva" || role === "kyrion";
  }

  static isNaturalPlagueBearer(actor) {
    const role = this.getPlagueRole(actor);
    return role === "flinn" || role === "parva" || role === "kyrion";
  }

  static isDormant() {
    try {
      return Boolean(game.settings.get(MODULE_ID, "plagueDormancy"));
    } catch (_) {
      return false;
    }
  }

  /**
   * Retorna o estado completo e calculado da Praga Arcana para o ator.
   */
  static getPlagueState(actor) {
    const role = this.getPlagueRole(actor);
    if (!role) {
      return {
        role: null,
        infected: false,
        ec: 0,
        effectiveEC: 0,
        dc: 10,
        storedEC: 0,
        safeLimit: 0,
        parvaBlockedPactSlots: 0
      };
    }

    const raw = actor.flags?.[MODULE_ID]?.plague || {};

    if (role === "altarion") {
      const storedEC = Math.max(0, Math.floor(Number(raw.storedEC ?? 0) || 0));
      const prof = Math.max(2, Number(actor.system?.attributes?.prof ?? 2));
      const safeLimit = Math.ceil(prof / 2);
      const rawExcess = Math.max(0, storedEC - safeLimit);
      const effectiveEC = Math.clamp(rawExcess, 0, 6);
      return {
        role,
        infected: true,
        ec: rawExcess, // Exibido como Estágio de Contaminação Atual (mínimo 0)
        effectiveEC,   // Limitado a 0..6 para lookup na tabela de estágios
        dc: null,
        storedEC,
        safeLimit,
        parvaBlockedPactSlots: 0
      };
    }

    const ec = Math.clamp(Math.floor(Number(raw.ec ?? 0) || 0), 0, 6);
    const defaultDc = 10 + ec;
    const dc = Math.max(10, Math.floor(Number(raw.dc ?? defaultDc) || defaultDc));
    const parvaBlockedPactSlots =
      role === "parva" ? Math.max(0, Math.floor(Number(raw.parvaBlockedPactSlots ?? 0) || 0)) : 0;

    return {
      role,
      infected: true,
      ec,
      effectiveEC: ec,
      dc,
      storedEC: 0,
      safeLimit: 0,
      parvaBlockedPactSlots
    };
  }

  /**
   * Atualiza os flags da Praga Arcana no ator (com relay via Socket para o Mestre caso o jogador não seja dono do alvo).
   */
  static async updatePlagueState(actor, patch = {}) {
    if (!actor) return;
    const current = foundry.utils.deepClone(actor.flags?.[MODULE_ID]?.plague || {});
    const merged = foundry.utils.mergeObject(current, patch, { inplace: false });

    if (actor.isOwner || game.user?.isGM) {
      await actor.update(
        { [`flags.${MODULE_ID}.plague`]: merged },
        { altarionPlagueInternal: true }
      );
      return;
    }

    // Enviar via socket para um GM conectado aplicar
    if (game.socket) {
      game.socket.emit(SOCKET_NAME, {
        action: "updatePlagueActor",
        actorUuid: actor.uuid,
        actorId: actor.id,
        patch: merged
      });
    } else {
      ui.notifications.warn(`Sem permissão para atualizar a ficha de ${actor.name} (Mestre precisa estar conectado).`);
    }
  }

  /**
   * Calcula Dados de Vida totais e disponíveis do Altarion (apenas Classe Primária).
   */
  static getAltarionHitDiceInfo(actor) {
    if (!actor) return { primaryClass: null, total: 0, spent: 0, available: 0 };
    const classes = actor.items.filter(i => i.type === "class");
    const primaryClass =
      classes.find(
        c =>
          !c.flags?.[MODULE_ID]?.isSecondaryClass &&
          (c.system?.identifier === "dragon-rider" || c.name?.toLowerCase() === "dragon rider")
      ) ||
      classes.find(c => !c.flags?.[MODULE_ID]?.isSecondaryClass) ||
      classes[0] ||
      null;

    if (!primaryClass) {
      const total = Math.max(0, Number(actor.system?.attributes?.hd?.max ?? 0));
      const available = Math.max(0, Number(actor.system?.attributes?.hd?.value ?? 0));
      return { primaryClass: null, total, spent: Math.max(0, total - available), available };
    }

    const total = Math.max(0, Number(primaryClass.system?.levels ?? 0));
    const spent = Math.clamp(Number(primaryClass.system?.hd?.spent ?? 0), 0, total);
    const available = Math.max(0, total - spent);
    return { primaryClass, total, spent, available };
  }

  /**
   * Verifica se uma criatura possui magias (conjurador de qualquer tipo).
   */
  static isSpellcaster(actor) {
    if (!actor) return false;
    if (actor.items?.some(i => i.type === "spell")) return true;
    const spells = actor.system?.spells || {};
    for (const [k, v] of Object.entries(spells)) {
      if (k.startsWith("spell") || k === "pact") {
        if (Number(v?.max || 0) > 0) return true;
      }
    }
    return false;
  }

  /* -------------------------------------------- */
  /*  Utilitário de Mensagens no Chat (CSS Coria) */
  /* -------------------------------------------- */

  static buildCoriaChatCardHtml({ theme = "plague", icon = "fa-biohazard", title, bodyHtml, footerHtml = "" }) {
    const themeClass =
      theme === "success"
        ? "chat-success"
        : theme === "arcane"
          ? "chat-arcane"
          : theme === "shadow"
            ? "chat-shadow"
            : "chat-failure";

    return `
      <div class="coria-chat-card ${themeClass}">
        <div class="coria-chat-header"><i class="fas ${icon}"></i> ${title}</div>
        <div class="coria-chat-body">
          ${bodyHtml}
        </div>
        ${footerHtml ? `<div class="coria-chat-footer">${footerHtml}</div>` : ""}
      </div>
    `;
  }

  static async sendCoriaChatCard(actor, { theme = "plague", icon = "fa-biohazard", title, bodyHtml, footerHtml = "", flags = {} }) {
    const content = this.buildCoriaChatCardHtml({ theme, icon, title, bodyHtml, footerHtml });
    return ChatMessage.create({
      speaker: actor ? ChatMessage.getSpeaker({ actor }) : ChatMessage.getSpeaker(),
      content,
      flags: {
        [MODULE_ID]: flags
      }
    });
  }

  static async updateCoriaChatCard(existingMsg, { theme = "plague", icon = "fa-biohazard", title, bodyHtml, footerHtml = "", flags = {} }) {
    if (!existingMsg?.update) return null;
    const content = this.buildCoriaChatCardHtml({ theme, icon, title, bodyHtml, footerHtml });
    const mergedFlags = foundry.utils.mergeObject(
      foundry.utils.deepClone(existingMsg.flags?.[MODULE_ID] || {}),
      flags || {},
      { inplace: false }
    );
    return existingMsg.update({
      content,
      [`flags.${MODULE_ID}`]: mergedFlags
    });
  }

  /* -------------------------------------------- */
  /*  Wrappers de Dados Derivados (EC 5 & Parva)  */
  /* -------------------------------------------- */

  static registerDataModelWrappers() {
    const wrapPrototypes = () => {
      const charProto = CONFIG.Actor?.dataModels?.character?.prototype;
      const npcProto = CONFIG.Actor?.dataModels?.npc?.prototype;

      if (charProto && !charProto._altarionPlagueWrapped) {
        charProto._altarionPlagueWrapped = true;
        const origCharDerived = charProto.prepareDerivedData;
        charProto.prepareDerivedData = function (...args) {
          origCharDerived.apply(this, args);
          ArcanePlagueManager.applyDerivedPlagueEffects(this);
        };
      }

      if (npcProto && !npcProto._altarionPlagueWrapped) {
        npcProto._altarionPlagueWrapped = true;
        const origNpcDerived = npcProto.prepareDerivedData;
        npcProto.prepareDerivedData = function (...args) {
          origNpcDerived.apply(this, args);
          ArcanePlagueManager.applyDerivedPlagueEffects(this);
        };
      }
    };

    if (CONFIG.Actor?.dataModels?.character) {
      wrapPrototypes();
    } else {
      Hooks.once("setup", wrapPrototypes);
    }
  }

  /**
   * Aplica modificadores contínuos em prepareDerivedData:
   * - EC 5 ("Cristalização Corporal"): reduz todo deslocamento pela metade.
   */
  static applyDerivedPlagueEffects(systemData) {
    const actor = systemData?.parent;
    if (!actor) return;

    const state = this.getPlagueState(actor);
    if (!state.infected) return;

    // EC 5: Cristalização Corporal — Deslocamento reduzido pela metade
    if (state.effectiveEC >= 5 && systemData.attributes?.movement) {
      for (const key of ["walk", "fly", "swim", "climb", "burrow"]) {
        const val = systemData.attributes.movement[key];
        if (typeof val === "number" && val > 0) {
          systemData.attributes.movement[key] = Math.floor(val * 0.5);
        }
      }
    }
  }

  /* -------------------------------------------- */
  /*  Hooks de Efeitos de EC & Descanso Longo     */
  /* -------------------------------------------- */

  static registerRestAndStageHooks() {
    // EC 1: Rejeição Natural — Impede recuperar PV por meio do gasto de Dados de Vida
    const onPreRollHitDie = (config) => {
      const actor = config?.subject;
      if (!actor) return;
      const state = this.getPlagueState(actor);
      if (state.infected && state.effectiveEC >= 1) {
        ui.notifications.warn(
          `${actor.name} está no EC ${state.effectiveEC} (Rejeição Natural) e não pode recuperar PV gastando Dados de Vida!`
        );
        this.sendCoriaChatCard(actor, {
          theme: "failure",
          icon: "fa-ban",
          title: "Rejeição Natural (EC 1)",
          bodyHtml: `<p>A Praga Arcana substituiu as funções biológicas de <strong>${actor.name}</strong>, impedindo qualquer recuperação de Pontos de Vida por gasto de Dados de Vida.</p>`
        });
        return false;
      }
    };
    Hooks.on("dnd5e.preRollHitDieV2", onPreRollHitDie);

    // Fallback caso algum módulo force rolagem de Dado de Vida sem passar por preRollHitDieV2
    Hooks.on("dnd5e.rollHitDieV2", (rolls, data) => {
      const actor = data?.subject;
      if (!actor) return;
      const state = this.getPlagueState(actor);
      if (state.infected && state.effectiveEC >= 1 && data?.updates?.actor) {
        delete data.updates.actor["system.attributes.hp.value"];
      }
    });

    // EC 3 (INT, SAB, CAR), EC 4 (Concentração) & EC 5 (FOR, DES, CON): Desvantagem em Testes de Resistência
    Hooks.on("dnd5e.preRollSavingThrowV2", (config) => {
      const actor = config?.subject;
      if (!actor) return;
      const state = this.getPlagueState(actor);
      if (!state.infected || state.effectiveEC < 3) return;

      // Não interferir em Testes de Morte aqui (tratados no EC 6)
      const isDeathSave = Boolean(config?.hookNames?.includes?.("deathSave"));
      if (isDeathSave) return;

      const ability = String(config?.ability || config?.rolls?.[0]?.data?.abilityId || "").toLowerCase();
      const isConc = Boolean(config?.isConcentration || config?.hookNames?.includes?.("concentration"));

      let forceDisadvantage = false;
      if (isConc && state.effectiveEC >= 4) {
        forceDisadvantage = true;
      } else if (["int", "wis", "cha"].includes(ability) && state.effectiveEC >= 3) {
        forceDisadvantage = true;
      } else if (["str", "dex", "con"].includes(ability) && state.effectiveEC >= 5) {
        forceDisadvantage = true;
      }

      if (forceDisadvantage) {
        config.disadvantage = true;
        if (Array.isArray(config.rolls)) {
          for (const r of config.rolls) {
            r.options = r.options || {};
            r.options.disadvantage = true;
          }
        }
      }
    });

    Hooks.on("dnd5e.preRollConcentrationV2", (config) => {
      const actor = config?.subject;
      if (!actor) return;
      const state = this.getPlagueState(actor);
      if (!state.infected || state.effectiveEC < 4) return;

      config.disadvantage = true;
      if (Array.isArray(config.rolls)) {
        for (const r of config.rolls) {
          r.options = r.options || {};
          r.options.disadvantage = true;
        }
      }
    });

    // EC 4 (Trama Corrompida) + Imunidade de Cura Mágica da Praga
    Hooks.on("dnd5e.postUseActivity", async (activity, usageConfig, results) => {
      const item = activity?.item;
      const actor = item?.actor;
      if (!item || !actor) return;

      // Aviso se alguém tentar usar Restauração Menor / Maior ou Cura para curar a Praga num alvo infectado
      const itemLower = String(item.name || "").trim().toLowerCase();
      if (
        [
          "lesser restoration",
          "restauração menor",
          "greater restoration",
          "restauração maior",
          "heal",
          "cura"
        ].includes(itemLower)
      ) {
        const targets = Array.from(game.user?.targets || [])
          .map(t => t.actor)
          .filter(a => a && this.getPlagueState(a).infected);
        if (targets.length > 0) {
          ui.notifications.warn(
            `A Praga Arcana não pode ser curada com magias como ${item.name}!`
          );
        }
      }

      const state = this.getPlagueState(actor);
      if (!state.infected || state.effectiveEC < 4) return;

      // 1. Conjurador usando magia de 1º nível ou superior -> 1d4 de dano de Força por nível da magia
      if (item.type === "spell") {
        const baseLevel = Number(item.system?.level ?? 0);
        if (baseLevel < 1) return; // Truques (cantrips) não causam dano do EC 4

        const slotLevel = this.resolveCastSpellSlotLevel(actor, item, usageConfig, results?.message);
        if (slotLevel < 1) return;

        const dedupKey = `${actor.id}:${item.id}:${results?.message?.id || Math.floor(Date.now() / 500)}`;
        if (this._lastSpellBacklashKey === dedupKey) return;
        this._lastSpellBacklashKey = dedupKey;

        const RL = globalThis.CoriaRollLedger;
        const beforeLayers = RL?.captureActorVitalLayers ? RL.captureActorVitalLayers(actor) : null;
        const preHp = Number(actor.system?.attributes?.hp?.value ?? 0);
        const preTemp = Number(actor.system?.attributes?.hp?.temp ?? 0);
        const dmgRoll = await new Roll(`${slotLevel}d4`).evaluate();
        if (game.dice3d) {
          try {
            await game.dice3d.showForRoll(dmgRoll, game.user, true);
          } catch (_) {
            // ignore
          }
        }
        const dmgTotal = Math.max(1, Number(dmgRoll.total || 1));
        await this.applyDirectForceDamage(actor, dmgTotal);
        const afterLayers = RL?.captureActorVitalLayers ? RL.captureActorVitalLayers(actor) : null;
        const ec4Layers =
          beforeLayers && afterLayers && RL?.computeDamageLayersDiff
            ? RL.computeDamageLayersDiff(beforeLayers, afterLayers, dmgTotal)
            : null;
        if (ec4Layers && RL?.pushActorDamageLayerEvent) {
          RL.pushActorDamageLayerEvent(actor, ec4Layers, "");
        }

        await this.sendCoriaChatCard(actor, {
          theme: "failure",
          icon: "fa-bolt",
          title: "Trama Corrompida (EC 4)",
          bodyHtml: `
            <p>Canalizar <strong>${item.name}</strong> (${slotLevel}º nível) estilhaça os cristais internos de <strong>${actor.name}</strong>!</p>
            <div class="coria-plague-val" style="margin: 10px auto; width: fit-content; border-color: #ff3333;">
              <span>Dano de Força (${slotLevel}d4)</span><em class="coria-plague-dmg-num" style="font-style:normal;">${dmgTotal}</em>
            </div>
          `,
          footerHtml: this.STAGE_DATA[4].summary,
          flags: {
            coriaCustomDamage: {
              cardKind: "plague-ec4",
              sourceName: "Trama Corrompida (EC 4)",
              attackerActorId: actor.id,
              attackerUuid: actor.uuid,
              attackerName: actor.name,
              targetActorId: actor.id,
              targetUuid: actor.uuid,
              targetName: actor.name,
              damageType: "force",
              damageTypeLabel: "Force",
              origDamage: dmgTotal,
              currentDamage: dmgTotal,
              autoApplied: true,
              preHp,
              preTemp,
              damageLayers: ec4Layers
            }
          }
        });
        return;
      }

      // 2. Efeito Marcial: Se a criatura NÃO possuir magias e usar habilidade que consuma recurso limitado -> 1d4 Força
      if (item.type === "feat" && !this.isSpellcaster(actor)) {
        const consumesResource =
          (Array.isArray(activity?.consumption?.targets) && activity.consumption.targets.length > 0) ||
          Boolean(item.system?.uses?.max && Number(item.system?.uses?.max) > 0);
        if (!consumesResource) return;

        const RL = globalThis.CoriaRollLedger;
        const beforeLayers = RL?.captureActorVitalLayers ? RL.captureActorVitalLayers(actor) : null;
        const preHp = Number(actor.system?.attributes?.hp?.value ?? 0);
        const preTemp = Number(actor.system?.attributes?.hp?.temp ?? 0);
        const dmgRoll = await new Roll("1d4").evaluate();
        if (game.dice3d) {
          try {
            await game.dice3d.showForRoll(dmgRoll, game.user, true);
          } catch (_) {
            // ignore
          }
        }
        const dmgTotal = Math.max(1, Number(dmgRoll.total || 1));
        await this.applyDirectForceDamage(actor, dmgTotal);
        const afterLayers = RL?.captureActorVitalLayers ? RL.captureActorVitalLayers(actor) : null;
        const ec4MartialLayers =
          beforeLayers && afterLayers && RL?.computeDamageLayersDiff
            ? RL.computeDamageLayersDiff(beforeLayers, afterLayers, dmgTotal)
            : null;
        if (ec4MartialLayers && RL?.pushActorDamageLayerEvent) {
          RL.pushActorDamageLayerEvent(actor, ec4MartialLayers, "");
        }

        await this.sendCoriaChatCard(actor, {
          theme: "failure",
          icon: "fa-fist-raised",
          title: "Trama Corrompida — Efeito Marcial (EC 4)",
          bodyHtml: `
            <p>Forçar os limites físicos com <strong>${item.name}</strong> quebra os cristais internos de <strong>${actor.name}</strong>!</p>
            <div class="coria-plague-val" style="margin: 10px auto; width: fit-content; border-color: #ff3333;">
              <span>Dano de Força (1d4)</span><em class="coria-plague-dmg-num" style="font-style:normal;">${dmgTotal}</em>
            </div>
          `,
          footerHtml: this.STAGE_DATA[4].summary,
          flags: {
            coriaCustomDamage: {
              cardKind: "plague-ec4",
              sourceName: "Trama Corrompida — Efeito Marcial (EC 4)",
              attackerActorId: actor.id,
              attackerUuid: actor.uuid,
              attackerName: actor.name,
              targetActorId: actor.id,
              targetUuid: actor.uuid,
              targetName: actor.name,
              damageType: "force",
              damageTypeLabel: "Force",
              origDamage: dmgTotal,
              currentDamage: dmgTotal,
              autoApplied: true,
              preHp,
              preTemp,
              damageLayers: ec4MartialLayers
            }
          }
        });
      }
    });

    // EC 6 (O Estágio Terminal): Falha automática em todos os Testes de Morte + Zumbi Arcano ao morrer
    Hooks.on("dnd5e.rollDeathSaveV2", (rolls, details) => {
      const actor = details?.subject;
      if (!actor) return;
      const state = this.getPlagueState(actor);
      if (!state.infected || state.effectiveEC < 6) return;

      const curFailures = Number(actor.system?.attributes?.death?.failure ?? 0);
      const roll = rolls?.[0];
      const deltaFail = roll?.isFumble ? 2 : 1;
      const newFailures = Math.clamp(curFailures + deltaFail, 0, 3);

      details.updates = {
        "system.attributes.death.failure": newFailures
      };
      details.chatString = newFailures >= 3 ? "DND5E.DeathSaveFailure" : "";

      const becomesArcaneZombie = newFailures >= 3 && this.isSpellcaster(actor);
      if (becomesArcaneZombie) {
        this._lastZombieAlertKey = `${actor.id}:${Math.floor(Date.now() / 3000)}`;
      }

      this.sendCoriaChatCard(actor, {
        theme: "failure",
        icon: "fa-skull-crossbones",
        title: becomesArcaneZombie
          ? "EC 6 — Ascensão do Zumbi Arcano!"
          : "Estágio Terminal (EC 6) — Falha Automática!",
        bodyHtml: `
          <p>O corpo de <strong>${actor.name}</strong> não suporta mais a dualidade entre vida orgânica e a Praga Arcana, falhando automaticamente no Teste de Morte (<strong>${newFailures} / 3 falhas</strong>).</p>
          ${
            becomesArcaneZombie
              ? `<hr style="border-color: rgba(255,80,80,0.35); margin: 10px 0;">
                 <p style="color: #ff6666; font-weight: bold;">EFEITO LETAL: Como conjurador morto no EC 6, <strong>${actor.name}</strong> se transforma instantaneamente em um <strong>"Zumbi Arcano"</strong>!</p>`
              : ""
          }
        `,
        footerHtml: this.STAGE_DATA[6].summary
      });
    });

    // EC 6 Efeito Letal também quando o conjurador recebe diretamente o status "dead" (morte instantânea)
    Hooks.on("createActiveEffect", (effect) => {
      const actor = effect?.parent;
      if (!actor || actor.documentName !== "Actor" || !actor.isOwner) return;
      const isDeadEffect = Boolean(effect.statuses?.has?.("dead"));
      if (!isDeadEffect) return;

      const state = this.getPlagueState(actor);
      if (!state.infected || state.effectiveEC < 6 || !this.isSpellcaster(actor)) return;

      // Evita duplicar se já veio de 3 falhas de morte há menos de 2s
      const now = Date.now();
      if (this._lastZombieAlertKey === `${actor.id}:${Math.floor(now / 3000)}`) return;
      this._lastZombieAlertKey = `${actor.id}:${Math.floor(now / 3000)}`;

      this.sendCoriaChatCard(actor, {
        theme: "failure",
        icon: "fa-skull-crossbones",
        title: "EC 6 — Ascensão do Zumbi Arcano!",
        bodyHtml: `
          <p style="color: #ff6666; font-weight: bold;">
            EFEITO LETAL: Como conjurador morto no <strong>EC 6</strong>, <strong>${actor.name}</strong> se transforma instantaneamente em um <strong>"Zumbi Arcano"</strong>!
          </p>
        `,
        footerHtml: this.STAGE_DATA[6].summary
      });
    });

    // Pré-conclusão do Descanso:
    // - Descanso Curto (Parva): impede recuperar espaços de magia de Pacto bloqueados pelo Dízimo Arcano
    // - Descanso Longo (Parva): limpa o espaço de magia de Pacto bloqueado do dia anterior
    // - EC 2 (Letargia Sanguínea): limita recuperação de PV a metade dos PV máximos
    // - Altarion: limita Dados de Vida disponíveis a (Total de Dados de Vida - ECs Armazenados)
    Hooks.on("dnd5e.preRestCompleted", (actor, result, config) => {
      if (!actor || !result) return;
      const state = this.getPlagueState(actor);
      if (!state.infected) return;

      const isLongRest = Boolean(result.longRest || config?.type === "long" || config?.longRest || result.newDay);
      result.updateData = result.updateData || {};
      result.updateItems = Array.isArray(result.updateItems) ? result.updateItems : [];

      if (!isLongRest) {
        if (state.role === "parva" && state.parvaBlockedPactSlots > 0) {
          const pactMax = Number(actor.system?.spells?.pact?.max ?? 0);
          result.updateData["system.spells.pact.value"] = Math.max(0, pactMax - state.parvaBlockedPactSlots);
        }
        return;
      }

      // 1. Parva: libera o espaço de Pacto bloqueado no dia anterior para recuperar normalmente antes do novo Dízimo
      if (state.role === "parva" && state.parvaBlockedPactSlots > 0) {
        result.updateData[`flags.${MODULE_ID}.plague.parvaBlockedPactSlots`] = 0;
        const fullPactMax = Number(actor.system?.spells?.pact?.max || 0);
        result.updateData["system.spells.pact.value"] = fullPactMax;
      }

      // 2. EC 2 (Letargia Sanguínea): recupera apenas metade dos Pontos de Vida máximos no descanso longo
      if (state.effectiveEC >= 2) {
        const hp = actor.system?.attributes?.hp;
        const curHp = Number(hp?.value ?? 0);
        const effectiveMax = Number(hp?.effectiveMax ?? hp?.max ?? curHp);
        const halfMax = Math.floor(effectiveMax / 2);
        const cappedHp = Math.min(effectiveMax, curHp + halfMax);
        result.updateData["system.attributes.hp.value"] = cappedHp;
        result.dhp = cappedHp - curHp;
      }

      // 3. Altarion: Dados de Vida disponíveis nunca podem exceder (Total de Dados de Vida - ECs Armazenados)
      if (state.role === "altarion" && state.storedEC > 0) {
        const hdInfo = this.getAltarionHitDiceInfo(actor);
        if (hdInfo.primaryClass) {
          const minSpent = Math.min(hdInfo.total, state.storedEC);
          const existingIdx = result.updateItems.findIndex(u => u._id === hdInfo.primaryClass.id);
          if (existingIdx >= 0) {
            const plannedSpent = Number(
              result.updateItems[existingIdx]["system.hd.spent"] ?? hdInfo.spent
            );
            if (plannedSpent < minSpent) {
              const blockedDelta = minSpent - plannedSpent;
              result.updateItems[existingIdx]["system.hd.spent"] = minSpent;
              if (typeof result.dhd === "number") {
                result.dhd = Math.max(0, result.dhd - blockedDelta);
              }
            }
          } else if (hdInfo.spent < minSpent) {
            result.updateItems.push({
              _id: hdInfo.primaryClass.id,
              "system.hd.spent": minSpent
            });
          }
        }
      }
    });

    // Pós-conclusão do Descanso Longo:
    // - Aviso de EC 2 se aplicou Letargia Sanguínea
    // - Garantia de trava de Dados de Vida do Altarion
    // - EC 6: Teste de Constituição CD 15 ou 8d6 de dano de Força
    // - Flinn, Parva e Kyrion: fluxo de progressão/resistência da Praga Arcana
    Hooks.on("dnd5e.restCompleted", async (actor, result, config) => {
      if (!actor || !actor.isOwner) return;
      const isLongRest = Boolean(result?.longRest || config?.type === "long" || config?.longRest || result?.newDay);
      if (!isLongRest) return;

      const state = this.getPlagueState(actor);
      if (!state.infected) return;

      // Garantir trava pós-descanso dos Dados de Vida do Altarion
      if (state.role === "altarion" && state.storedEC > 0) {
        const hdInfo = this.getAltarionHitDiceInfo(actor);
        const minSpent = Math.min(hdInfo.total, state.storedEC);
        if (hdInfo.primaryClass && hdInfo.spent < minSpent) {
          await hdInfo.primaryClass.update({ "system.hd.spent": minSpent });
        }
      }

      if (state.effectiveEC >= 2) {
        await this.sendCoriaChatCard(actor, {
          theme: "failure",
          icon: "fa-tint",
          title: "Letargia Sanguínea (EC 2)",
          bodyHtml: `<p>Devido ao <strong>EC ${state.effectiveEC}</strong>, o corpo de <strong>${actor.name}</strong> recuperou no máximo metade de seus Pontos de Vida máximos neste Descanso Longo.</p>`,
          footerHtml: this.STAGE_DATA[2].summary
        });
      }

      // EC 6: Teste de Constituição CD 15 ao fim do Descanso Longo (8d6 de Força em falha)
      if (state.effectiveEC >= 6) {
        await this.promptStage6TerminalSave(actor);
      }

      // Flinn: Rolar automaticamente os dados de Portent em modo Blind GM Roll ANTES da janela "Reescrever o Destino"
      if (state.role === "flinn" && typeof globalThis.FlinnManager?.rollFlinnPortentsBlind === "function") {
        await globalThis.FlinnManager.rollFlinnPortentsBlind(actor);
      }

      // Progressão natural da Praga para Flinn, Parva e Kyrion (Altarion é imune à infecção natural)
      if (this.isNaturalPlagueBearer(actor)) {
        if (this.isDormant()) {
          ui.notifications.info(
            `[Praga Arcana] Dormência em Ambiente Seguro ativa — teste diário de ${actor.name} suspenso.`
          );
          return;
        }
        await this.triggerLongRestPlagueFlow(actor);
      }
    });
  }

  /**
   * Resolve o nível efetivo do slot usado ao conjurar uma magia (1º a 9º nível, incluindo Pact Magic / Upcast).
   */
  static resolveCastSpellSlotLevel(actor, spellItem, usageConfig, message) {
    const baseLevel = Number(spellItem?.system?.level ?? 0);
    if (baseLevel <= 0) return 0;

    const msgScaling = Number(message?.flags?.dnd5e?.scaling ?? NaN);
    if (Number.isFinite(msgScaling) && msgScaling >= 0) {
      return baseLevel + msgScaling;
    }

    const msgSpellLvl = Number(
      message?.flags?.[MODULE_ID]?.castSlotLevel ?? message?.flags?.dnd5e?.use?.spellLevel ?? NaN
    );
    if (Number.isFinite(msgSpellLvl) && msgSpellLvl >= 1) {
      return msgSpellLvl;
    }

    const cfgSlot = usageConfig?.spell?.slot;
    if (typeof cfgSlot === "string") {
      if (cfgSlot === "pact") {
        return Math.max(baseLevel, Number(actor?.system?.spells?.pact?.level || baseLevel));
      }
      const m = cfgSlot.match(/^spell(\d+)$/);
      if (m) return Math.max(baseLevel, Number(m[1]));
    }

    if (spellItem?.system?.method === "pact") {
      return Math.max(baseLevel, Number(actor?.system?.spells?.pact?.level || baseLevel));
    }

    return baseLevel;
  }

  /**
   * Aplica dano de Força diretamente ao ator (compatível com dnd5e 5.x).
   */
  static async applyDirectForceDamage(actor, amount) {
    const dmg = Math.max(0, Math.floor(Number(amount) || 0));
    if (!actor || dmg <= 0) return;

    if (typeof actor.applyDamage === "function") {
      try {
        await actor.applyDamage([{ value: dmg, type: "force" }]);
        return;
      } catch (_) {
        // fallback below
      }
    }

    const curTemp = Number(actor.system?.attributes?.hp?.temp ?? 0);
    const curHp = Number(actor.system?.attributes?.hp?.value ?? 0);
    const remAfterTemp = Math.max(0, dmg - curTemp);
    const newTemp = Math.max(0, curTemp - dmg);
    const newHp = Math.max(0, curHp - remAfterTemp);
    await actor.update({
      "system.attributes.hp.temp": newTemp,
      "system.attributes.hp.value": newHp
    });
  }

  /* -------------------------------------------- */
  /*  Fluxos de Descanso Longo (Flinn/Parva/CON)  */
  /* -------------------------------------------- */

  static async triggerLongRestPlagueFlow(actor, { force = false } = {}) {
    if (!actor) return;
    if (!force && this._activeRestPrompts.has(actor.id)) return;
    this._activeRestPrompts.add(actor.id);

    try {
      const state = this.getPlagueState(actor);
      if (state.role === "flinn") {
        await this.openFlinnRewriteDestinyDialog(actor);
      } else {
        // Parva, Kyrion e demais portadores fazem primeiro o Teste de Constituição.
        // Para Parva, a escolha do Dízimo Arcano aparece APENAS se falhar no teste de Constituição!
        await this.openConstitutionPlagueDialog(actor);
      }
    } finally {
      setTimeout(() => this._activeRestPrompts.delete(actor.id), 800);
    }
  }

  /**
   * Flinn: Janela "Reescrever o Destino" antes do teste de Constituição no descanso longo.
   */
  static async openFlinnRewriteDestinyDialog(actor) {
    const state = this.getPlagueState(actor);
    const flinnMgr = globalThis.FlinnManager;
    const portentItem = actor.items.find(
      i => i.type === "feat" && i.name?.trim().toLowerCase().includes("portent")
    );
    const wizardCls = actor.items.find(
      i => i.type === "class" && (i.system?.identifier === "wizard" || i.name?.toLowerCase() === "wizard")
    );
    const defaultPortentMax = Number(wizardCls?.system?.levels || 4) >= 14 ? 3 : 2;
    const maxPortents = Math.max(defaultPortentMax, Number(portentItem?.system?.uses?.max || defaultPortentMax));
    const spentPortents = Number(portentItem?.system?.uses?.spent || 0);

    // Ensure Portent dice have been rolled if none exist yet and spentPortents === 0
    if (flinnMgr && typeof flinnMgr.getPortentDice === "function") {
      const existingDice = flinnMgr.getPortentDice(actor);
      if (existingDice.length === 0 && spentPortents === 0 && typeof flinnMgr.rollFlinnPortentsBlind === "function") {
        await flinnMgr.rollFlinnPortentsBlind(actor);
      }
    }

    const currentPortentDice =
      flinnMgr && typeof flinnMgr.getPortentDice === "function" ? flinnMgr.getPortentDice(actor) : [];
    const availablePortents =
      currentPortentDice.length > 0 ? currentPortentDice.length : Math.max(0, maxPortents - spentPortents);

    let resolved = false;
    const d = createV2Dialog(
      {
        title: "Reescrever o Destino",
        content: `
          <div class="coria-arcane-box">
            <h3>Reescrever o Destino</h3>
            <p style="color:#dceeff; margin-bottom: 10px;">
              <strong>${actor.name}</strong> sente as ramificações da Praga Arcana se entrelaçando com o seu destino.
              Deseja sacrificar <strong>1 Portent</strong> deste dia para evitar os efeitos da praga, obter sucesso automático e reduzir sua CD atual em <strong>1d4</strong> (mínimo 10)?
            </p>
            <div class="coria-plague-stats-row">
              <div class="coria-plague-val"><span>Estágio</span>EC ${state.ec}</div>
              <div class="coria-plague-val"><span>Teste CD</span>${state.dc}</div>
              <div class="coria-plague-val"><span>Portents</span>${availablePortents} / ${maxPortents}</div>
            </div>
            ${
              availablePortents <= 0
                ? `<p style="color:#ff6666; font-weight:bold; margin-top:10px;">Você não possui usos de Portent disponíveis hoje.</p>`
                : ""
            }
          </div>
        `,
        buttons: {
          yes: {
            icon: '<i class="fas fa-hourglass-half"></i>',
            label: "Sim, Sacrificar 1 Portent",
            callback: async () => {
              resolved = true;
              if (availablePortents <= 0) {
                ui.notifications.warn("Flinn não possui usos de Portent disponíveis!");
                await this.openConstitutionPlagueDialog(actor);
                return;
              }

              // Se FlinnManager suportar a janela interativa de Portent Rolls, abre-a em modo "sacrifice"
              if (flinnMgr && typeof flinnMgr.openPortentRollsDialog === "function") {
                await flinnMgr.openPortentRollsDialog(actor, {
                  mode: "sacrifice",
                  promptText:
                    "Clique em um dos dados de Portent abaixo para sacrificá-lo e Reescrever o Destino contra a Praga Arcana:",
                  onSelectDie: async (sacrificedDie) => {
                    const reductionRoll = await new Roll("1d4").evaluate();
                    if (game.dice3d) {
                      try {
                        await game.dice3d.showForRoll(reductionRoll, game.user, true);
                      } catch (_) {
                        // ignore
                      }
                    }

                    const newDC = Math.max(10, state.dc - reductionRoll.total);
                    await this.updatePlagueState(actor, { dc: newDC });

                    const colorLabel =
                      sacrificedDie?.color === "green"
                        ? "Verde (Maior Valor)"
                        : sacrificedDie?.color === "red"
                          ? "Vermelho (Menor Valor)"
                          : "Amarelo (Intermediário/Igual)";

                    await this.sendCoriaChatCard(actor, {
                      theme: "arcane",
                      icon: "fa-eye",
                      title: "Reescrever o Destino!",
                      bodyHtml: `
                        <p><strong>${actor.name}</strong> sacrificou um de seus vislumbres de <strong>Portent [${colorLabel}]</strong> para forçar uma linha temporal onde a Praga Arcana regride!</p>
                        <hr style="border-color: rgba(100,180,255,0.2); margin: 10px 0;">
                        <p>Sucesso automático! Redução rolada (1d4): <strong>-${reductionRoll.total}</strong></p>
                        <p>A Dificuldade da Praga caiu de <strong>CD ${state.dc}</strong> para <strong>CD ${newDC}</strong> (Estágio mantido em <strong>EC ${state.ec}</strong>).</p>
                      `
                    });
                  },
                  onCancel: async () => {
                    await this.openConstitutionPlagueDialog(actor);
                  }
                });
                return;
              }

              if (portentItem) {
                await portentItem.update({
                  "system.uses.max": String(maxPortents),
                  "system.uses.spent": Math.min(maxPortents, spentPortents + 1)
                });
              }

              const reductionRoll = await new Roll("1d4").evaluate();
              if (game.dice3d) {
                try {
                  await game.dice3d.showForRoll(reductionRoll, game.user, true);
                } catch (_) {
                  // ignore
                }
              }

              const newDC = Math.max(10, state.dc - reductionRoll.total);
              await this.updatePlagueState(actor, { dc: newDC });

              await this.sendCoriaChatCard(actor, {
                theme: "arcane",
                icon: "fa-eye",
                title: "Reescrever o Destino!",
                bodyHtml: `
                  <p><strong>${actor.name}</strong> sacrificou um de seus vislumbres de <strong>Portent</strong> para forçar uma linha temporal onde a Praga Arcana regride!</p>
                  <hr style="border-color: rgba(100,180,255,0.2); margin: 10px 0;">
                  <p>Sucesso automático! Redução rolada (1d4): <strong>-${reductionRoll.total}</strong></p>
                  <p>A Dificuldade da Praga caiu de <strong>CD ${state.dc}</strong> para <strong>CD ${newDC}</strong> (Estágio mantido em <strong>EC ${state.ec}</strong>).</p>
                `
              });
            }
          },
          no: {
            icon: '<i class="fas fa-dice-d20"></i>',
            label: "Não, Rolar Constituição",
            callback: async () => {
              resolved = true;
              await this.sendCoriaChatCard(actor, {
                theme: "arcane",
                icon: "fa-dice-d20",
                title: "Destino Preservado",
                bodyHtml: `<p><strong>${actor.name}</strong> decidiu preservar seus usos de <strong>Portent</strong> e enfrentar diretamente o Teste de Resistência de Constituição contra a Praga Arcana (<strong>CD ${state.dc}</strong>).</p>`
              });
              await this.openConstitutionPlagueDialog(actor);
            }
          }
        },
        default: availablePortents > 0 ? "yes" : "no",
        render: (html) => {
          const root = html instanceof HTMLElement ? html : html?.[0];
          const yesBtn = root?.querySelector('button[data-button="yes"]');
          const noBtn = root?.querySelector('button[data-button="no"]');
          yesBtn?.classList.add("btn-arcane");
          noBtn?.classList.add("btn-plague");
          if (availablePortents <= 0 && yesBtn) {
            yesBtn.disabled = true;
            yesBtn.style.opacity = "0.45";
            yesBtn.style.cursor = "not-allowed";
          }
        },
        close: () => {
          if (!resolved) {
            // Se fechar no X sem escolher, abre o teste padrão para não pular acidentalmente
            this.openConstitutionPlagueDialog(actor);
          }
        }
      },
      { classes: ["coria-dialog"], width: 460 }
    );
    d.render(true);
  }

  static _activeParvaTitheDialogs = new Map();

  /**
   * Parva: Janela "O Dízimo Arcano" / "Canalização Instável" exibida SOMENTE após falhar no teste de Constituição.
   * Se passar na Persuasão (CD atual da Praga), sacrifica 1 Espaço de Warlock e remove o +1 EC recém-adquirido.
   * Se falhar na Persuasão (ou recusar), o espaço não é consumido e a corrupção aumenta normalmente.
   */
  static async openParvaArcaneTitheDialog(
    actor,
    { prevEc = null, prevDc = null, failedEc = null, failedDc = null, conRollMsgId = "" } = {}
  ) {
    if (!actor) return;
    const state = this.getPlagueState(actor);
    const effPrevEc = prevEc !== null && prevEc !== undefined ? Number(prevEc) : Math.max(0, state.ec - 1);
    const effFailedEc = failedEc !== null && failedEc !== undefined ? Number(failedEc) : state.ec;
    const effPrevDc = prevDc !== null && prevDc !== undefined ? Number(prevDc) : state.dc;
    const effFailedDc = failedDc !== null && failedDc !== undefined ? Number(failedDc) : 10 + effFailedEc;

    const prevDlg = this._activeParvaTitheDialogs.get(actor.id);
    if (prevDlg) {
      try {
        prevDlg.close();
      } catch (_e) {}
      this._activeParvaTitheDialogs.delete(actor.id);
    }

    const pactMax = Number(actor.system?.spells?.pact?.max ?? 0);
    const pactVal = Number(actor.system?.spells?.pact?.value ?? pactMax);

    const d = createV2Dialog(
      {
        title: "O Dízimo Arcano — Canalização Instável",
        content: `
          <div class="coria-pact-box">
            <h3>O Dízimo Arcano</h3>
            <p style="color:#f5d0fe; margin-bottom: 10px;">
              <strong>${actor.name}</strong> falhou no Teste de Resistência de Constituição contra a Praga Arcana (<strong>EC ${effPrevEc} &rarr; EC ${effFailedEc}</strong>).<br>
              Deseja barganhar com seu Patrono oferecendo <strong>1 Espaço de Magia de Warlock</strong> (bloqueado durante o dia seguinte) através da <strong>Canalização Instável</strong> (Teste de Persuasão <strong>CD ${effPrevDc}</strong>) para conter o avanço e <strong>remover este +1 EC</strong>?
            </p>
            <div class="coria-plague-stats-row">
              <div class="coria-plague-val"><span>Estágio</span>EC ${effPrevEc} &rarr; ${effFailedEc}</div>
              <div class="coria-plague-val"><span>Persuasão CD</span>${effPrevDc}</div>
              <div class="coria-plague-val"><span>Slots Warlock</span>${pactVal} / ${pactMax}</div>
            </div>
            ${
              pactVal <= 0
                ? `<p style="color:#ff6666; font-weight:bold; margin-top:10px;">Você não possui Espaços de Magia de Warlock disponíveis para sacrificar.</p>`
                : ""
            }
          </div>
        `,
        buttons: {
          yes: {
            icon: '<i class="fas fa-hand-holding-magic"></i>',
            label: "Sim, Sacrificar Espaço de Warlock",
            callback: async () => {
              this._activeParvaTitheDialogs.delete(actor.id);
              if (pactVal <= 0) {
                ui.notifications.warn("Parva não possui espaços de magia de Warlock disponíveis!");
                return;
              }

              await this.sendCoriaChatCard(actor, {
                theme: "shadow",
                icon: "fa-comments",
                title: "O Dízimo Arcano — Canalização Instável",
                bodyHtml: `<p><strong>${actor.name}</strong> inicia a barganha volátil com seu Patrono após falhar na resistência, oferecendo um Espaço de Magia de Warlock para impedir o avanço da Praga Arcana (<strong>Carisma [Persuasão] CD ${effPrevDc}</strong>)...</p>`
              });

              const livePactMax = Number(actor.system?.spells?.pact?.max ?? pactMax);
              const livePactVal = Number(actor.system?.spells?.pact?.value ?? livePactMax);
              const prevBlocked = Number(state.parvaBlockedPactSlots || 0);

              const { roll, rollMessage } = await CoriaRollLedger.runAndCaptureRollMessage(actor, async () => {
                if (typeof actor.rollSkill === "function") {
                  return actor.rollSkill({ skill: "per", target: effPrevDc });
                } else if (typeof actor.rollSkillTest === "function") {
                  return actor.rollSkillTest("per");
                }
                return null;
              });

              if (!roll) return;

              await CoriaRollLedger.registerAndEvaluateParvaTithe({
                rollMessage,
                roll,
                actor,
                beforeState: {
                  ec: effPrevEc,
                  prevEc: effPrevEc,
                  prevDc: effPrevDc,
                  failedEc: effFailedEc,
                  failedDc: effFailedDc,
                  dc: effPrevDc,
                  prevBlocked,
                  prevPactVal: livePactVal,
                  fromFailedConSave: true,
                  conRollMsgId
                }
              });
            }
          },
          no: {
            icon: '<i class="fas fa-skull"></i>',
            label: "Não, Aceitar o Avanço da Praga",
            callback: async () => {
              this._activeParvaTitheDialogs.delete(actor.id);
              await this.sendCoriaChatCard(actor, {
                theme: "failure",
                icon: "fa-biohazard",
                title: "Dízimo Recusado",
                bodyHtml: `<p><strong>${actor.name}</strong> optou por não oferecer um Espaço de Magia de Warlock ao seu Patrono. A corrupção da Praga Arcana avança normalmente para <strong>EC ${effFailedEc}</strong> (Nova CD Base: <strong>CD ${effFailedDc}</strong>).</p>`
              });
            }
          }
        },
        default: pactVal > 0 ? "yes" : "no",
        render: (html) => {
          const root = html instanceof HTMLElement ? html : html?.[0];
          const yesBtn = root?.querySelector('button[data-button="yes"]');
          const noBtn = root?.querySelector('button[data-button="no"]');
          yesBtn?.classList.add("btn-pact");
          noBtn?.classList.add("btn-plague");
          if (pactVal <= 0 && yesBtn) {
            yesBtn.disabled = true;
            yesBtn.style.opacity = "0.45";
            yesBtn.style.cursor = "not-allowed";
          }
        },
        close: () => {
          if (this._activeParvaTitheDialogs.get(actor.id) === d) {
            this._activeParvaTitheDialogs.delete(actor.id);
          }
        }
      },
      { classes: ["coria-dialog"], width: 470 }
    );
    this._activeParvaTitheDialogs.set(actor.id, d);
    d.render(true);
  }

  static _activeConPlagueDialogs = new Map();

  /**
   * Diálogo padrão de Teste de Resistência de Constituição contra a Praga Arcana (Flinn, Parva, Kyrion).
   */
  static async openConstitutionPlagueDialog(actor) {
    const state = this.getPlagueState(actor);

    const prevDlg = this._activeConPlagueDialogs.get(actor.id);
    if (prevDlg) {
      try {
        prevDlg.close();
      } catch (_e) {}
      this._activeConPlagueDialogs.delete(actor.id);
    }

    const d = createV2Dialog(
      {
        title: `A Praga Arcana: ${actor.name}`,
        content: `
          <div class="coria-plague-box">
            <h3>Resistência à Praga</h3>
            <p style="color:#ccc; margin-bottom: 5px;">A infecção corre nas veias de <strong>${actor.name}</strong>.</p>
            <div class="stats">
              <div class="coria-plague-val"><span>Estágio</span>EC ${state.ec}</div>
              <div class="coria-plague-val"><span>Teste CD</span>${state.dc}</div>
            </div>
          </div>
        `,
        buttons: {
          roll: {
            icon: '<i class="fas fa-dice-d20"></i>',
            label: "Rolar Constituição",
            callback: async () => {
              this._activeConPlagueDialogs.delete(actor.id);
              const { roll, rollMessage } = await CoriaRollLedger.runAndCaptureRollMessage(actor, async () => {
                if (typeof actor.rollSavingThrow === "function") {
                  return actor.rollSavingThrow({ ability: "con", target: state.dc });
                } else if (typeof actor.rollAbilitySave === "function") {
                  return actor.rollAbilitySave("con", { chatMessage: true });
                }
                return null;
              });

              if (!roll) return;

              await CoriaRollLedger.registerAndEvaluatePlagueConSave({
                rollMessage,
                roll,
                actor,
                beforeState: {
                  ec: state.ec,
                  dc: state.dc,
                  role: state.role
                }
              });
            }
          }
        },
        default: "roll",
        render: (html) => {
          const root = html instanceof HTMLElement ? html : html?.[0];
          root?.querySelector('button[data-button="roll"]')?.classList.add("btn-plague");
        },
        close: () => {
          if (this._activeConPlagueDialogs.get(actor.id) === d) {
            this._activeConPlagueDialogs.delete(actor.id);
          }
        }
      },
      { classes: ["coria-dialog"], width: 420 }
    );
    this._activeConPlagueDialogs.set(actor.id, d);
    d.render(true);
  }

  /**
   * EC 6: Teste de Constituição (CD 15) após finalizar um Descanso Longo (8d6 de dano de Força em falha).
   */
  static async promptStage6TerminalSave(actor) {
    const d = createV2Dialog(
      {
        title: `Estágio Terminal (EC 6): ${actor.name}`,
        content: `
          <div class="coria-plague-box">
            <h3>Colapso Terminal (EC 6)</h3>
            <p style="color:#ffcccc;">
              Ao terminar o descanso longo no <strong>EC 6</strong>, <strong>${actor.name}</strong> deve fazer um Teste de Resistência de Constituição (<strong>CD 15</strong>) ou sofrer <strong>8d6 de dano de Força</strong>!
            </p>
          </div>
        `,
        buttons: {
          roll: {
            icon: '<i class="fas fa-dice-d20"></i>',
            label: "Rolar Constituição (CD 15)",
            callback: async () => {
              const { roll, rollMessage } = await CoriaRollLedger.runAndCaptureRollMessage(actor, async () => {
                if (typeof actor.rollSavingThrow === "function") {
                  return actor.rollSavingThrow({ ability: "con", target: 15 });
                }
                return null;
              });
              if (!roll) return;

              await CoriaRollLedger.registerAndEvaluatePlagueStage6Save({
                rollMessage,
                roll,
                actor
              });
            }
          }
        },
        default: "roll",
        render: (html) => {
          const root = html instanceof HTMLElement ? html : html?.[0];
          root?.querySelector('button[data-button="roll"]')?.classList.add("btn-plague");
        }
      },
      { classes: ["coria-dialog"], width: 420 }
    );
    d.render(true);
  }

  /* -------------------------------------------- */
  /*  Kyrion: "Alimentar a Fome" & Sabedoria Chat */
  /* -------------------------------------------- */

  /**
   * Coleta todos os itens mágicos elegíveis no inventário do Kyrion.
   */
  static getKyrionMagicItems(actor) {
    if (!actor) return [];
    const physicalTypes = new Set(["weapon", "equipment", "consumable", "tool", "loot", "container"]);
    const results = [];

    for (const item of actor.items) {
      if (!physicalTypes.has(item.type)) continue;
      if (item.flags?.[MODULE_ID]?.isShadowBladeWeapon) continue;
      if (Number(item.system?.quantity ?? 1) <= 0) continue;

      const props = item.system?.properties;
      const hasMgcProp =
        typeof props?.has === "function"
          ? props.has("mgc")
          : Array.isArray(props) && props.includes("mgc");
      const rawRarity = String(item.system?.rarity || "").trim();
      const isMagical = hasMgcProp || (rawRarity !== "" && rawRarity !== "none");
      if (!isMagical) continue;

      const rarityKey = this.RARITY_CONFIG[rawRarity] ? rawRarity : "common";
      results.push({
        item,
        id: item.id,
        name: item.name,
        img: item.img || "icons/svg/item-bag.svg",
        quantity: Number(item.system?.quantity ?? 1),
        rarityKey,
        rarityCfg: this.RARITY_CONFIG[rarityKey]
      });
    }

    return results.sort((a, b) => b.rarityCfg.reduction - a.rarityCfg.reduction || a.name.localeCompare(b.name));
  }

  /**
   * Abre a janela interativa "Alimentar a Fome" para o Kyrion.
   */
  static openKyrionFeedHungerDialog(actor) {
    if (!actor) return;
    const state = this.getPlagueState(actor);
    const magicItems = this.getKyrionMagicItems(actor);
    let selectedEntry = null;
    let listOpen = false;

    const d = createV2Dialog(
      {
        title: "Alimentar a Fome",
        content: `
          <div class="coria-shadow-box coria-feed-hunger-container">
            <h3>Alimentar a Fome</h3>
            <p style="color:#e9d5ff; font-size: 0.92rem; line-height: 1.45; margin-bottom: 14px;">
              Você pode apaziguar a corrupção entregando magia pura ao <strong>????</strong>.
              Deseja escolher um item mágico do seu inventário para sacrificar permanentemente e reduzir seus Estágios de Contaminação?
            </p>

            <button type="button" class="coria-feed-plus-btn" title="Escolher um item mágico do inventário">
              <span>+</span>
            </button>

            <div class="coria-feed-item-list" style="display: none;">
              ${
                magicItems.length === 0
                  ? `<p class="coria-feed-empty">Nenhum item mágico encontrado no inventário de ${actor.name}.</p>`
                  : magicItems
                      .map(
                        entry => `
                    <div class="coria-feed-item-option" data-item-id="${entry.id}">
                      <img src="${entry.img}" alt="${entry.name}" />
                      <div class="coria-feed-item-meta">
                        <strong>${entry.name}</strong>${entry.quantity > 1 ? ` <small>(x${entry.quantity})</small>` : ""}
                        <span style="color: ${entry.rarityCfg.color};">${entry.rarityCfg.label}</span>
                      </div>
                      <div class="coria-feed-item-badge">
                        ${entry.rarityCfg.reduction > 0 ? `-${entry.rarityCfg.reduction} EC` : `0 EC`}
                      </div>
                    </div>
                  `
                      )
                      .join("")
              }
            </div>

            <div class="coria-feed-selected-panel" style="display: none;"></div>
          </div>
        `,
        buttons: {
          confirm: {
            icon: '<i class="fas fa-fire-alt"></i>',
            label: "Confirmar",
            callback: async () => {
              if (!selectedEntry) return;
              const liveItem = actor.items.get(selectedEntry.id);
              if (!liveItem) {
                ui.notifications.warn("O item selecionado não está mais no inventário.");
                return;
              }

              const curState = this.getPlagueState(actor);
              const reduction = selectedEntry.rarityCfg.reduction;
              const newEC = Math.max(0, curState.ec - reduction);
              const newDC = reduction > 0 ? Math.max(10, 10 + newEC) : curState.dc;

              // Consumir / destruir permanentemente 1 unidade do item mágico
              const qty = Number(liveItem.system?.quantity ?? 1);
              if (qty > 1) {
                await liveItem.update({ "system.quantity": qty - 1 });
              } else {
                await actor.deleteEmbeddedDocuments("Item", [liveItem.id]);
              }

              await this.updatePlagueState(actor, { ec: newEC, dc: newDC });

              await this.sendCoriaChatCard(actor, {
                theme: "shadow",
                icon: "fa-utensils",
                title: "Alimentar a Fome!",
                bodyHtml: `
                  <div style="display:flex; align-items:center; justify-content:center; gap:10px; margin-bottom:10px;">
                    <img src="${selectedEntry.img}" style="width:38px; height:38px; border-radius:6px; border:1px solid ${selectedEntry.rarityCfg.color};" />
                    <div style="text-align:left;">
                      <strong>${selectedEntry.name}</strong><br>
                      <span style="font-size:0.8rem; color:${selectedEntry.rarityCfg.color};">Raridade: ${selectedEntry.rarityCfg.label}</span>
                    </div>
                  </div>
                  <p><strong>${actor.name}</strong> entregou <strong>${selectedEntry.name}</strong> ao <strong>????</strong>, consumindo e destruindo permanentemente o item mágico!</p>
                  <hr style="border-color: rgba(153,51,255,0.3); margin: 10px 0;">
                  ${
                    reduction > 0
                      ? `<p>Estágio de Contaminação reduzido em <strong>-${reduction} EC</strong>: <strong>EC ${curState.ec} → EC ${newEC}</strong> (CD Atual: <strong>${newDC}</strong>).</p>`
                      : `<p style="color:#fca5a5;">Por ser de raridade <strong>Comum</strong>, o item não possuía magia pura suficiente para reduzir o EC (mantido em <strong>EC ${curState.ec}</strong>).</p>`
                  }
                `
              });
            }
          },
          cancel: {
            icon: '<i class="fas fa-times"></i>',
            label: "Cancelar"
          }
        },
        default: "cancel",
        render: (html) => {
          const root = html instanceof HTMLElement ? html : html?.[0];
          if (!root) return;

          const confirmBtn = root.querySelector('button[data-button="confirm"]');
          const plusBtn = root.querySelector(".coria-feed-plus-btn");
          const listEl = root.querySelector(".coria-feed-item-list");
          const selectedPanel = root.querySelector(".coria-feed-selected-panel");

          confirmBtn?.classList.add("btn-shadow");
          const setConfirmEnabled = (enabled) => {
            if (!confirmBtn) return;
            confirmBtn.disabled = !enabled;
            confirmBtn.style.opacity = enabled ? "1" : "0.42";
            confirmBtn.style.cursor = enabled ? "pointer" : "not-allowed";
          };
          setConfirmEnabled(false);

          plusBtn?.addEventListener("click", (ev) => {
            ev.preventDefault();
            listOpen = !listOpen;
            if (listEl) listEl.style.display = listOpen ? "flex" : "none";
          });

          for (const opt of root.querySelectorAll(".coria-feed-item-option")) {
            opt.addEventListener("click", (ev) => {
              ev.preventDefault();
              const itemId = opt.getAttribute("data-item-id");
              const entry = magicItems.find(m => m.id === itemId);
              if (!entry) return;

              selectedEntry = entry;
              for (const el of root.querySelectorAll(".coria-feed-item-option")) {
                el.classList.toggle("is-selected", el === opt);
              }

              const projectedEC = Math.max(0, state.ec - entry.rarityCfg.reduction);
              const effectDesc =
                entry.rarityCfg.reduction > 0
                  ? `Raridade <strong style="color:${entry.rarityCfg.color};">${entry.rarityCfg.label}</strong>: reduz <strong>${entry.rarityCfg.reduction} EC</strong> de ${actor.name} (<strong>EC ${state.ec} → EC ${projectedEC}</strong>). O item será consumido e destruído permanentemente.`
                  : `<span style="color:#ff6666;">Raridade <strong>Comum</strong>: itens comuns não possuem magia pura suficiente (requer <strong>Incomum ou maior</strong> para reduzir EC). Se confirmar, o item será destruído sem reduzir seu EC.</span>`;

              if (selectedPanel) {
                selectedPanel.style.display = "block";
                selectedPanel.innerHTML = `
                  <div class="coria-feed-selected-item">
                    <img src="${entry.img}" alt="${entry.name}" />
                    <span class="coria-feed-selected-name">${entry.name}</span>
                  </div>
                  <p class="coria-feed-selected-effect">${effectDesc}</p>
                `;
              }

              if (listEl) {
                listOpen = false;
                listEl.style.display = "none";
              }
              setConfirmEnabled(true);
            });
          }
        }
      },
      { classes: ["coria-dialog"], width: 470 }
    );
    d.render(true);
  }

  /**
   * Registra listener nos botões de chat (Teste de Sabedoria do Kyrion, Dano de Movimento de Arcane Blade / Dark Blade).
   */
  static registerChatHooks() {
    const onRenderMsg = (message, html) => {
      const rootEl = html instanceof HTMLElement ? html : html?.[0];
      if (!rootEl) return;

      const wisBtn = rootEl.querySelector(".coria-kyrion-wis-save-btn");
      if (wisBtn && !wisBtn.dataset.boundListener) {
        wisBtn.dataset.boundListener = "true";
        wisBtn.addEventListener("click", async (ev) => {
          ev.preventDefault();
          ev.stopPropagation();

          const actorId =
            wisBtn.getAttribute("data-actor-id") || message.flags?.[MODULE_ID]?.kyrionActorId;
          const dc = Number(
            wisBtn.getAttribute("data-dc") || message.flags?.[MODULE_ID]?.kyrionWisDc || 10
          );
          const actor =
            game.actors?.get(actorId) ||
            game.actors?.find(a => this.getPlagueRole(a) === "kyrion");

          if (!actor) {
            ui.notifications.warn("Ficha de Kyrion não encontrada.");
            return;
          }
          if (!actor.isOwner && !game.user?.isGM) {
            ui.notifications.warn("Apenas o jogador de Kyrion ou o Mestre pode rolar este teste.");
            return;
          }

          const { roll, rollMessage } = await CoriaRollLedger.runAndCaptureRollMessage(actor, async () => {
            if (typeof actor.rollSavingThrow === "function") {
              return actor.rollSavingThrow({ ability: "wis", target: dc }, { event: ev });
            } else if (typeof actor.rollAbilitySave === "function") {
              return actor.rollAbilitySave("wis", { dc, event: ev });
            }
            return null;
          });

          if (!roll) return;

          await CoriaRollLedger.registerAndEvaluateKyrionWisSave({
            rollMessage,
            roll,
            actor,
            dc
          });
        });
      }

      // Botão no card de falha da Praga de Parva para invocar "O Dízimo Arcano"
      const parvaTitheBtn = rootEl.querySelector(".coria-parva-tithe-btn");
      if (parvaTitheBtn && !parvaTitheBtn.dataset.boundListener) {
        parvaTitheBtn.dataset.boundListener = "true";
        parvaTitheBtn.addEventListener("click", async (ev) => {
          ev.preventDefault();
          ev.stopPropagation();

          const actorId =
            parvaTitheBtn.getAttribute("data-actor-id") || message.flags?.[MODULE_ID]?.parvaActorId;
          const prevEc = Number(parvaTitheBtn.getAttribute("data-prev-ec") ?? 0);
          const prevDc = Number(parvaTitheBtn.getAttribute("data-prev-dc") ?? 10);
          const failedEc = Number(parvaTitheBtn.getAttribute("data-failed-ec") ?? prevEc + 1);
          const failedDc = Number(parvaTitheBtn.getAttribute("data-failed-dc") ?? 10 + failedEc);

          const actor =
            game.actors?.get(actorId) ||
            game.actors?.find(a => this.getPlagueRole(a) === "parva");
          if (!actor) {
            ui.notifications.warn("Ficha de Parva não encontrada.");
            return;
          }
          if (!actor.isOwner && !game.user?.isGM) {
            ui.notifications.warn("Apenas o jogador de Parva ou o Mestre pode invocar O Dízimo Arcano.");
            return;
          }
          await this.openParvaArcaneTitheDialog(actor, {
            prevEc,
            prevDc,
            failedEc,
            failedDc
          });
        });
      }

      // Botão para rolar o Dano de Movimento de Arcane Blade (Altarion) ou Dark Blade (Kyrion)
      const moveRollBtn = rootEl.querySelector(".coria-blade-move-roll-btn");
      if (moveRollBtn && !moveRollBtn.dataset.boundListener) {
        moveRollBtn.dataset.boundListener = "true";
        moveRollBtn.addEventListener("click", async (ev) => {
          ev.preventDefault();
          ev.stopPropagation();

          const formula = moveRollBtn.getAttribute("data-formula") || "1d8";
          const dmgType = moveRollBtn.getAttribute("data-dmg-type") || "force";
          const dmgLabel = dmgType === "necrotic" ? "Necrotic" : "Force";
          const bladeName = moveRollBtn.getAttribute("data-blade-name") || "Arcane Blade";
          const actorId = moveRollBtn.getAttribute("data-actor-id") || "";
          const caster = game.actors?.get(actorId) || null;

          const moveRoll = await new Roll(formula).evaluate();
          if (game.dice3d) {
            try {
              await game.dice3d.showForRoll(moveRoll, game.user, true);
            } catch (_) {
              // ignore
            }
          }

          const curTargetTok = Array.from(game.user?.targets || [])[0] || null;
          const curTargetActor = curTargetTok?.actor || null;
          const rolledAmt = Math.max(1, Number(moveRoll.total || 1));

          await AltarionAutomationManager.sendMinimalistFeatureCard(caster, {
            icon: "fa-running",
            title: `${bladeName} — Movement Damage (+${rolledAmt} ${dmgLabel})!`,
            bodyHtml: `
              The target sheathed by <strong>${bladeName}</strong> willingly moved 5 feet or more!<br>
              &bull; <strong>${dmgLabel} Damage Roll (${formula}):</strong> Rolled <strong><span class="coria-custom-dmg-num">${rolledAmt}</span> ${dmgLabel} damage</strong>!
            `,
            buttonsHtml: `
              <button type="button" class="coria-blade-move-apply-btn coria-min-card-btn-primary"
                      data-amount="${rolledAmt}"
                      data-dmg-type="${dmgType}"
                      data-blade-name="${bladeName}"
                      style="width:100%;">
                <i class="fas fa-bolt"></i> Apply ${rolledAmt} ${dmgLabel} Damage to Selected Target
              </button>
            `,
            flags: {
              coriaCustomDamage: {
                cardKind: "blade-movement",
                sourceName: `${bladeName} (Movement Damage)`,
                attackerActorId: caster?.id || "",
                attackerUuid: caster?.uuid || "",
                attackerName: caster?.name || bladeName,
                targetActorId: curTargetActor?.id || "",
                targetUuid: curTargetActor?.uuid || "",
                targetName: curTargetTok?.name || curTargetActor?.name || "",
                damageType: dmgType,
                damageTypeLabel: dmgLabel,
                origDamage: rolledAmt,
                currentDamage: rolledAmt,
                autoApplied: false
              }
            }
          });
        });
      }

      // Botão para aplicar manualmente o Dano de Movimento de Arcane Blade / Dark Blade
      const moveApplyBtn = rootEl.querySelector(".coria-blade-move-apply-btn");
      if (moveApplyBtn && !moveApplyBtn.dataset.boundListener) {
        moveApplyBtn.dataset.boundListener = "true";
        moveApplyBtn.addEventListener("click", async (ev) => {
          ev.preventDefault();
          ev.stopPropagation();

          const liveCustomDmg = message?.flags?.[MODULE_ID]?.coriaCustomDamage;
          const amount = Math.max(
            0,
            Number(
              liveCustomDmg?.currentDamage !== undefined
                ? liveCustomDmg.currentDamage
                : moveApplyBtn.getAttribute("data-amount") || 0
            )
          );
          const dmgType = moveApplyBtn.getAttribute("data-dmg-type") || "force";
          const dmgLabel = dmgType === "necrotic" ? "Necrotic" : "Force";
          const bladeName = moveApplyBtn.getAttribute("data-blade-name") || "Arcane Blade";
          if (amount <= 0) {
            ui.notifications.info(`[${bladeName}] Dano resultante é 0 (totalmente absorvido).`);
            return;
          }

          const targets = Array.from(game.user?.targets || []);
          const controlled = Array.from(canvas?.tokens?.controlled || []);
          const recipientTokens = targets.length > 0 ? targets : controlled;

          if (recipientTokens.length === 0) {
            ui.notifications.warn("Selecione (ou marque como Target) o token do alvo para aplicar o dano de movimento.");
            return;
          }

          const appliedNames = [];
          for (const tok of recipientTokens) {
            const tActor = tok?.actor;
            if (!tActor) continue;
            if (typeof tActor.applyDamage === "function") {
              await tActor.applyDamage([{ value: amount, type: dmgType }]);
            } else {
              await this.applyDirectForceDamage(tActor, amount);
            }
            appliedNames.push(tok.name || tActor.name);
          }

          if (appliedNames.length > 0) {
            ui.notifications.info(
              `[${bladeName}] Aplicado ${amount} de dano (${dmgLabel}) em: ${appliedNames.join(", ")}.`
            );
          }
        });
      }
    };

    Hooks.on("renderChatMessageHTML", onRenderMsg);
  }

  /* -------------------------------------------- */
  /*  Altarion: "Absorver Praga" & "Dispersão"    */
  /* -------------------------------------------- */

  /**
   * Fluxo do botão "Absorver Praga" no cabeçalho da ficha do Altarion.
   */
  static openAltarionAbsorbPlagueDialog(altarion) {
    if (!altarion) return;

    const targets = Array.from(game.user?.targets || []);
    const validAllies = targets
      .map(t => t.actor)
      .filter(a => a && this.isNaturalPlagueBearer(a));

    if (targets.length !== 1 || validAllies.length !== 1) {
      ui.notifications.warn(
        "Escolha exatamente 1 token aliado infectado (Flinn, Parva ou Kyrion) como Target antes de clicar em \"Absorver Praga\"."
      );
      return;
    }

    const targetActor = validAllies[0];
    const altState = this.getPlagueState(altarion);
    const tgtState = this.getPlagueState(targetActor);
    const hdInfo = this.getAltarionHitDiceInfo(altarion);

    const noHitDice = hdInfo.available <= 0;
    const targetHasNoEC = tgtState.ec <= 0;
    const canConfirm = !noHitDice && !targetHasNoEC;

    const nextStored = altState.storedEC + 1;
    const nextEffective = Math.max(0, nextStored - altState.safeLimit);
    const nextTargetEC = Math.max(0, tgtState.ec - 1);

    const d = createV2Dialog(
      {
        title: "O Custo da Absorção",
        content: `
          <div class="coria-arcane-box">
            <h3>O Custo da Absorção</h3>
            <p style="color:#dceeff; font-size:0.93rem; line-height:1.45;">
              Ao tocar <strong>${targetActor.name}</strong>, <strong>${altarion.name}</strong> drenará <strong>1 Estágio de Contaminação</strong> do aliado para o próprio corpo:
            </p>
            <div class="coria-plague-stats-row" style="margin: 12px 0;">
              <div class="coria-plague-val">
                <span>${targetActor.name}</span>EC ${tgtState.ec} → ${nextTargetEC}
              </div>
              <div class="coria-plague-val">
                <span>Armazenados</span>${altState.storedEC} → ${nextStored}
              </div>
              <div class="coria-plague-val">
                <span>EC Atual Altarion</span>EC ${nextEffective}
              </div>
            </div>
            <p style="color:#cbd5e1; font-size:0.85rem;">
              Dados de Vida Disponíveis: <strong>${hdInfo.available} / ${hdInfo.total}</strong>
              (1 Dado de Vida será consumido sem curar PV e ficará indisponível enquanto o EC permanecer armazenado).
            </p>
            ${
              noHitDice
                ? `<p style="color:#ff4d4d; font-weight:bold; margin-top:10px; background:rgba(80,0,0,0.45); border:1px solid #ff4d4d; border-radius:6px; padding:8px;">
                     Você precisa possuir Dados de Vida disponíveis, que serão consumidos, para poder absorver Estágios de Contaminação!
                   </p>`
                : targetHasNoEC
                  ? `<p style="color:#ff9999; font-weight:bold; margin-top:10px;">
                       ${targetActor.name} já está no EC 0 e não possui Estágios de Contaminação acima de 0 para serem absorvidos.
                     </p>`
                  : ""
            }
          </div>
        `,
        buttons: {
          confirm: {
            icon: '<i class="fas fa-hand-sparkles"></i>',
            label: "Confirmar",
            callback: async () => {
              const liveHd = this.getAltarionHitDiceInfo(altarion);
              const liveTgt = this.getPlagueState(targetActor);
              const liveAlt = this.getPlagueState(altarion);
              if (liveHd.available <= 0 || liveTgt.ec <= 0) return;

              // 1. Reduz 1 Dado de Vida disponível na ficha do Altarion
              if (liveHd.primaryClass) {
                await liveHd.primaryClass.update({
                  "system.hd.spent": Math.min(liveHd.total, liveHd.spent + 1)
                });
              }

              // 2. Aumenta ECs Armazenados do Altarion em 1
              const updatedStored = liveAlt.storedEC + 1;
              await this.updatePlagueState(altarion, { storedEC: updatedStored });

              // 3. Reduz EC Atual do alvo em 1 (e ajusta CD base)
              const updatedTgtEC = Math.max(0, liveTgt.ec - 1);
              const updatedTgtDC = Math.max(10, 10 + updatedTgtEC);
              await this.updatePlagueState(targetActor, {
                ec: updatedTgtEC,
                dc: updatedTgtDC
              });

              const finalAltState = this.getPlagueState(altarion);

              await this.sendCoriaChatCard(altarion, {
                theme: "arcane",
                icon: "fa-syringes",
                title: "Praga Absorvida — O Custo da Absorção",
                bodyHtml: `
                  <p><strong>${altarion.name}</strong> drenou a corrupção cristalina diretamente de <strong>${targetActor.name}</strong>, sacrificando <strong>1 Dado de Vida</strong> de sua própria vitalidade!</p>
                  <hr style="border-color: rgba(50,150,255,0.3); margin: 10px 0;">
                  <p><strong>${targetActor.name}:</strong> EC ${liveTgt.ec} → <strong>EC ${updatedTgtEC}</strong> (CD ${updatedTgtDC})</p>
                  <p><strong>${altarion.name}:</strong> ECs Armazenados: <strong>${updatedStored}</strong> | Limite Seguro: <strong>${finalAltState.safeLimit}</strong> | EC Atual: <strong>EC ${finalAltState.ec}</strong></p>
                `
              });
            }
          },
          cancel: {
            icon: '<i class="fas fa-times"></i>',
            label: "Cancelar"
          }
        },
        default: canConfirm ? "confirm" : "cancel",
        render: (html) => {
          const root = html instanceof HTMLElement ? html : html?.[0];
          const confirmBtn = root?.querySelector('button[data-button="confirm"]');
          confirmBtn?.classList.add("btn-arcane");
          if (!canConfirm && confirmBtn) {
            confirmBtn.disabled = true;
            confirmBtn.style.opacity = "0.42";
            confirmBtn.style.cursor = "not-allowed";
          }
        }
      },
      { classes: ["coria-dialog"], width: 470 }
    );
    d.render(true);
  }

  /**
   * Resolve o ator responsável por uma janela ou configuração de rolagem de dano.
   */
  static resolveDamageRollActor(appOrConfig) {
    const cfg = appOrConfig?.config || appOrConfig;
    const subject = cfg?.subject;
    if (subject) {
      if (subject.documentName === "Actor") return subject;
      if (subject.actor) return subject.actor;
      if (subject.item?.actor) return subject.item.actor;
    }
    const speaker = appOrConfig?.message?.data?.speaker;
    if (speaker) {
      return ChatMessage.getSpeakerActor?.(speaker) || game.actors?.get(speaker.actor) || null;
    }
    return null;
  }

  /**
   * Resolve o Item responsável por uma janela ou configuração de rolagem de dano.
   */
  static resolveDamageRollItem(appOrConfig, actor = null) {
    const cfg = appOrConfig?.config || appOrConfig;
    const subject = cfg?.subject;
    if (subject) {
      if (subject.documentName === "Item") return subject;
      if (subject.item) return subject.item;
    }
    if (cfg?.item) return cfg.item;
    if (appOrConfig?.item) return appOrConfig.item;

    const resolvedActor = actor || this.resolveDamageRollActor(appOrConfig);
    const msgItemId =
      appOrConfig?.message?.data?.flags?.dnd5e?.item?.id ||
      appOrConfig?.message?.flags?.dnd5e?.item?.id;
    if (resolvedActor && msgItemId) {
      return resolvedActor.items?.get(msgItemId) || null;
    }
    return null;
  }

  /**
   * Injeta as opções de rolagem de dano:
   * - Altarion: "Dispersão Contagiosa" (qualquer dano) + "Arcane Blade" (rolagem de dano com Ancestral Weapon)
   * - Kyrion: "Hexblade's Curse" (qualquer dano) + "Dark Blade" (armas) + "Sneak Attack" (armas)
   */
  static registerDamageDialogHooks() {
    const injectDamageOptions = (app, element) => {
      const rootEl = element instanceof HTMLElement ? element : element?.[0];
      if (!rootEl || !app?.config?.rolls?.length) return;

      // Verificar se é uma rolagem de dano (e não apenas cura pura)
      const isDamageDialog =
        app.constructor?.name === "DamageRollConfigurationDialog" ||
        app.rollType === CONFIG.Dice?.DamageRoll;
      if (!isDamageDialog) return;

      const healingTypes = new Set(Object.keys(CONFIG.DND5E?.healingTypes || { healing: true, temphp: true }));
      const allHealing = app.config.rolls.every(r => {
        const t = r?.options?.type || r?.options?.types?.[0];
        return t && healingTypes.has(t);
      });
      if (allHealing) return;

      const actor = this.resolveDamageRollActor(app);
      if (!actor) return;
      const role = this.getPlagueRole(actor);
      if (role !== "altarion" && role !== "kyrion") return;

      const item = this.resolveDamageRollItem(app, actor);
      const subject = app.config?.subject;

      const configPart =
        rootEl.querySelector('[data-application-part="configuration"]') ||
        rootEl.querySelector("form .configuration") ||
        rootEl.querySelector("form");
      if (!configPart) return;

      // ======================================================================
      // ALTARION: "Dispersão Contagiosa" + "Arcane Blade" (Ancestral Weapon)
      // ======================================================================
      if (role === "altarion") {
        // 1. Dispersão Contagiosa (qualquer rolagem de dano)
        if (!rootEl.querySelector(".altarion-contagious-dispersion-box")) {
          const state = this.getPlagueState(actor);
          const hasStored = state.storedEC > 0;
          const alreadyActive = app.config.rolls.some(r => r?.options?.altarionContagiousDispersion);

          const box = document.createElement("fieldset");
          box.className = "altarion-contagious-dispersion-box";
          box.innerHTML = `
            <legend><i class="fas fa-biohazard"></i> Dispersão Contagiosa</legend>
            <label class="coria-dispersion-label ${hasStored ? "" : "is-disabled"}">
              <input type="checkbox" name="altarionContagiousDispersion" ${alreadyActive ? "checked" : ""} ${hasStored ? "" : "disabled"} />
              <div class="coria-dispersion-text">
                <strong>Consumir 1 EC Armazenado (+1d6 Force)</strong>
                <span>
                  ${
                    hasStored
                      ? `ECs Armazenados: ${state.storedEC} — Qualquer criatura que sofra este dano é infectada (+1 EC).`
                      : `Indisponível (0 ECs Armazenados).`
                  }
                </span>
              </div>
            </label>
          `;

          const checkbox = box.querySelector('input[name="altarionContagiousDispersion"]');
          checkbox?.addEventListener("change", (ev) => {
            const checked = Boolean(ev.currentTarget.checked);
            app.config.rolls = app.config.rolls.filter(r => !r?.options?.altarionContagiousDispersion);

            if (checked && hasStored) {
              app.config.rolls.push({
                parts: ["1d6"],
                data: {},
                situational: false,
                options: {
                  type: "force",
                  types: ["force"],
                  altarionContagiousDispersion: true,
                  altarionActorId: actor.id
                }
              });
            }
          });

          configPart.appendChild(box);
        }

        // 2. Arcane Blade (quando a rolagem de dano for com a Ancestral Weapon)
        const isAncestralWeapon =
          Boolean(item?.flags?.[MODULE_ID]?.isAncestralWeapon) ||
          item?.name?.trim().toLowerCase() === "ancestral weapon";

        if (isAncestralWeapon && !rootEl.querySelector(".altarion-arcane-blade-box")) {
          const charLvl = Math.max(1, Number(actor.system?.details?.level ?? 4));
          const onHitDice = Math.floor((charLvl + 1) / 6);
          const moveDice = onHitDice + 1;
          const alreadyBlade = app.config.rolls.some(r => r?.options?.altarionArcaneBlade);

          const bladeBox = document.createElement("fieldset");
          bladeBox.className = "altarion-contagious-dispersion-box altarion-arcane-blade-box";
          bladeBox.innerHTML = `
            <legend><i class="fas fa-bolt"></i> Arcane Blade</legend>
            <label class="coria-dispersion-label">
              <input type="checkbox" name="altarionArcaneBlade" ${alreadyBlade ? "checked" : ""} />
              <div class="coria-dispersion-text">
                <strong>Arcane Blade (${onHitDice > 0 ? `+${onHitDice}d8 Force no acerto` : `+0d8 no acerto [Nível ${charLvl}]`} + ${moveDice}d8 Force se mover)</strong>
                <span>
                  Envolve o alvo em energia arcana; gera opção no chat para rolar e aplicar os ${moveDice}d8 Force caso o alvo se mova.
                </span>
              </div>
            </label>
          `;

          const bladeCheckbox = bladeBox.querySelector('input[name="altarionArcaneBlade"]');
          bladeCheckbox?.addEventListener("change", (ev) => {
            const checked = Boolean(ev.currentTarget.checked);
            app.config.rolls = app.config.rolls.filter(r => !r?.options?.altarionArcaneBladeExtraRoll);
            if (app.config.rolls[0]?.options) {
              delete app.config.rolls[0].options.altarionArcaneBlade;
              delete app.config.rolls[0].options.altarionActorId;
              delete app.config.rolls[0].options.moveDice;
            }

            if (checked) {
              if (app.config.rolls[0]) {
                app.config.rolls[0].options = app.config.rolls[0].options || {};
                app.config.rolls[0].options.altarionArcaneBlade = true;
                app.config.rolls[0].options.altarionActorId = actor.id;
                app.config.rolls[0].options.moveDice = moveDice;
              }
              if (onHitDice > 0) {
                app.config.rolls.push({
                  parts: [`${onHitDice}d8`],
                  data: {},
                  situational: false,
                  options: {
                    type: "force",
                    types: ["force"],
                    altarionArcaneBlade: true,
                    altarionArcaneBladeExtraRoll: true,
                    altarionActorId: actor.id,
                    moveDice
                  }
                });
              }
            }
          });

          configPart.appendChild(bladeBox);
        }
      }

      // ======================================================================
      // KYRION: "Hexblade's Curse" (todas as fontes) + "Dark Blade" & "Sneak Attack" (armas)
      // ======================================================================
      if (role === "kyrion" && !rootEl.querySelector(".kyrion-damage-options-box")) {
        const charLvl = Math.max(1, Number(actor.system?.details?.level ?? 4));
        const prof = Math.max(2, Number(actor.system?.attributes?.prof ?? 2));
        const onHitDice = Math.floor((charLvl + 1) / 6);
        const moveDice = onHitDice + 1;

        const rogueCls = actor.items.find(
          i => i.type === "class" && (i.system?.identifier === "rogue" || i.name?.trim().toLowerCase() === "rogue")
        );
        const rogueLvl = Math.max(1, Number(rogueCls?.system?.levels ?? 2));
        const sneakDice = Math.max(1, Math.ceil(rogueLvl / 2));

        const isWeaponRoll =
          item?.type === "weapon" ||
          subject?.attack?.type?.classification === "weapon" ||
          Boolean(item?.flags?.[MODULE_ID]?.isShadowBladeWeapon);

        const baseDmgType =
          app.config.rolls[0]?.options?.type ||
          app.config.rolls[0]?.options?.types?.[0] ||
          "piercing";

        // Auto-enable Hexblade's Curse (+PB damage) whenever Kyrion targets a creature with active Hexblade's Curse status!
        const targetHasHexCurse = Array.from(game.user?.targets || []).some(
          t => t?.actor && globalThis.AltarionAutomationManager?.hasHexbladesCurseOnTarget?.(t.actor, actor)
        );
        const primaryRollInit = app.config.rolls[0];
        if (
          targetHasHexCurse &&
          primaryRollInit &&
          !primaryRollInit.options?.kyrionHexbladesCurse &&
          !primaryRollInit.options?.kyrionHexbladesCurseManuallyUnchecked
        ) {
          primaryRollInit.parts = Array.isArray(primaryRollInit.parts)
            ? primaryRollInit.parts.filter(p => p !== "@kyrionHexCurse")
            : [];
          primaryRollInit.parts.push("@kyrionHexCurse");
          primaryRollInit.data = primaryRollInit.data || {};
          primaryRollInit.data.kyrionHexCurse = prof;
          primaryRollInit.options = primaryRollInit.options || {};
          primaryRollInit.options.kyrionHexbladesCurse = true;
        }

        const hasHexCurse = Boolean(app.config.rolls[0]?.options?.kyrionHexbladesCurse);
        const hasDarkBlade = app.config.rolls.some(r => r?.options?.kyrionDarkBlade);
        const hasSneakAttack = app.config.rolls.some(r => r?.options?.kyrionSneakAttack);

        const kyrionBox = document.createElement("fieldset");
        kyrionBox.className = "altarion-contagious-dispersion-box kyrion-damage-options-box";
        kyrionBox.style.borderColor = "rgba(168, 85, 247, 0.45)";
        kyrionBox.innerHTML = `
          <legend style="color: #d8b4fe;"><i class="fas fa-skull"></i> Opções de Dano de Kyrion</legend>
          <div style="display: flex; flex-direction: column; gap: 6px;">
            ${
              isWeaponRoll
                ? `
              <label class="coria-dispersion-label">
                <input type="checkbox" name="kyrionDarkBlade" ${hasDarkBlade ? "checked" : ""} />
                <div class="coria-dispersion-text">
                  <strong>Dark Blade (${onHitDice > 0 ? `+${onHitDice}d8 Necrotic no acerto` : `+0d8 no acerto [Nível ${charLvl}]`} + ${moveDice}d8 Necrotic se mover)</strong>
                  <span>Envolve o alvo em sombras; gera botão no chat para rolar os ${moveDice}d8 Necrotic caso ele se mova.</span>
                </div>
              </label>
              <label class="coria-dispersion-label">
                <input type="checkbox" name="kyrionSneakAttack" ${hasSneakAttack ? "checked" : ""} />
                <div class="coria-dispersion-text">
                  <strong>Sneak Attack (+${sneakDice}d6 ${baseDmgType})</strong>
                  <span>Dano furtivo da classe secundária Rogue (Nível ${rogueLvl}).</span>
                </div>
              </label>
            `
                : ""
            }
            <label class="coria-dispersion-label">
              <input type="checkbox" name="kyrionHexbladesCurse" ${hasHexCurse ? "checked" : ""} />
              <div class="coria-dispersion-text">
                <strong>Hexblade's Curse (+${prof} Bônus de Proficiência)</strong>
                <span>Adiciona +${prof} ao dano contra o alvo amaldiçoado.</span>
              </div>
            </label>
          </div>
        `;

        const darkBladeCb = kyrionBox.querySelector('input[name="kyrionDarkBlade"]');
        darkBladeCb?.addEventListener("change", (ev) => {
          const checked = Boolean(ev.currentTarget.checked);
          app.config.rolls = app.config.rolls.filter(r => !r?.options?.kyrionDarkBladeExtraRoll);
          if (app.config.rolls[0]?.options) {
            delete app.config.rolls[0].options.kyrionDarkBlade;
            delete app.config.rolls[0].options.kyrionActorId;
            delete app.config.rolls[0].options.moveDice;
          }

          if (checked) {
            if (app.config.rolls[0]) {
              app.config.rolls[0].options = app.config.rolls[0].options || {};
              app.config.rolls[0].options.kyrionDarkBlade = true;
              app.config.rolls[0].options.kyrionActorId = actor.id;
              app.config.rolls[0].options.moveDice = moveDice;
            }
            if (onHitDice > 0) {
              app.config.rolls.push({
                parts: [`${onHitDice}d8`],
                data: {},
                situational: false,
                options: {
                  type: "necrotic",
                  types: ["necrotic"],
                  kyrionDarkBlade: true,
                  kyrionDarkBladeExtraRoll: true,
                  kyrionActorId: actor.id,
                  moveDice
                }
              });
            }
          }
        });

        const sneakCb = kyrionBox.querySelector('input[name="kyrionSneakAttack"]');
        sneakCb?.addEventListener("change", (ev) => {
          const checked = Boolean(ev.currentTarget.checked);
          app.config.rolls = app.config.rolls.filter(r => !r?.options?.kyrionSneakAttack);

          if (checked) {
            const currentBaseType =
              app.config.rolls[0]?.options?.type ||
              app.config.rolls[0]?.options?.types?.[0] ||
              baseDmgType;
            app.config.rolls.push({
              parts: [`${sneakDice}d6`],
              data: {},
              situational: false,
              options: {
                type: currentBaseType,
                types: [currentBaseType],
                kyrionSneakAttack: true,
                kyrionActorId: actor.id
              }
            });
          }
        });

        const hexCb = kyrionBox.querySelector('input[name="kyrionHexbladesCurse"]');
        hexCb?.addEventListener("change", (ev) => {
          const checked = Boolean(ev.currentTarget.checked);
          const primaryRoll = app.config.rolls[0];
          if (!primaryRoll) return;
          primaryRoll.parts = Array.isArray(primaryRoll.parts)
            ? primaryRoll.parts.filter(p => p !== "@kyrionHexCurse")
            : [];
          primaryRoll.data = primaryRoll.data || {};
          primaryRoll.options = primaryRoll.options || {};

          if (checked) {
            primaryRoll.parts.push("@kyrionHexCurse");
            primaryRoll.data.kyrionHexCurse = prof;
            primaryRoll.options.kyrionHexbladesCurse = true;
            delete primaryRoll.options.kyrionHexbladesCurseManuallyUnchecked;
          } else {
            delete primaryRoll.data.kyrionHexCurse;
            delete primaryRoll.options.kyrionHexbladesCurse;
            primaryRoll.options.kyrionHexbladesCurseManuallyUnchecked = true;
          }
        });

        configPart.appendChild(kyrionBox);
      }
    };

    Hooks.on("renderDamageRollConfigurationDialog", injectDamageOptions);
    Hooks.on("renderRollConfigurationDialog", injectDamageOptions);

    // Ao confirmar e avaliar a rolagem de dano:
    Hooks.on("dnd5e.rollDamageV2", async (rolls, data) => {
      if (!Array.isArray(rolls) || rolls.length === 0) return;

      // 1. Altarion: Arcane Blade (minimalist English card to roll and apply movement damage)
      const arcaneBladeRoll = rolls.find(r => r?.options?.altarionArcaneBlade);
      if (arcaneBladeRoll) {
        const actorId = arcaneBladeRoll.options?.altarionActorId;
        const altarion =
          (actorId && game.actors?.get(actorId)) ||
          this.resolveDamageRollActor({ config: { subject: data?.subject } }) ||
          game.actors?.find(a => this.getPlagueRole(a) === "altarion");
        const moveDice = Math.max(1, Number(arcaneBladeRoll.options?.moveDice || 1));

        if (altarion) {
          await AltarionAutomationManager.sendMinimalistFeatureCard(altarion, {
            icon: "fa-bolt",
            title: `Arcane Blade — Sheathed in Arcane Energy (${moveDice}d8 Force)`,
            bodyHtml: `
              The target hit by <strong>${foundry.utils.escapeHTML(altarion.name)}</strong>'s <strong>Ancestral Weapon</strong> is sheathed in unstable arcane energy until the start of ${foundry.utils.escapeHTML(altarion.name)}'s next turn.<br>
              &bull; <strong>Movement Trigger:</strong> If the target willingly moves 5 feet or more before then, click below to roll <strong>${moveDice}d8 Force damage</strong>:
            `,
            buttonsHtml: `
              <button type="button" class="coria-blade-move-roll-btn coria-min-card-btn-primary"
                      data-formula="${moveDice}d8"
                      data-dmg-type="force"
                      data-blade-name="Arcane Blade"
                      data-actor-id="${altarion.id}"
                      style="width:100%;">
                <i class="fas fa-dice-d20"></i> Roll Movement Damage (${moveDice}d8 Force)
              </button>
            `
          });
        }
      }

      // 2. Kyrion: Dark Blade (minimalist English card to roll and apply movement damage)
      const darkBladeRoll = rolls.find(r => r?.options?.kyrionDarkBlade);
      if (darkBladeRoll) {
        const actorId = darkBladeRoll.options?.kyrionActorId;
        const kyrion =
          (actorId && game.actors?.get(actorId)) ||
          this.resolveDamageRollActor({ config: { subject: data?.subject } }) ||
          game.actors?.find(a => this.getPlagueRole(a) === "kyrion");
        const moveDice = Math.max(1, Number(darkBladeRoll.options?.moveDice || 1));

        if (kyrion) {
          await AltarionAutomationManager.sendMinimalistFeatureCard(kyrion, {
            icon: "fa-skull",
            title: `Dark Blade — Shrouded in Shadow Energy (${moveDice}d8 Necrotic)`,
            bodyHtml: `
              The target hit by <strong>${foundry.utils.escapeHTML(kyrion.name)}</strong> is shrouded in dark energy until the start of ${foundry.utils.escapeHTML(kyrion.name)}'s next turn.<br>
              &bull; <strong>Movement Trigger:</strong> If the target willingly moves 5 feet or more before then, click below to roll <strong>${moveDice}d8 Necrotic damage</strong>:
            `,
            buttonsHtml: `
              <button type="button" class="coria-blade-move-roll-btn coria-min-card-btn-primary"
                      data-formula="${moveDice}d8"
                      data-dmg-type="necrotic"
                      data-blade-name="Dark Blade"
                      data-actor-id="${kyrion.id}"
                      style="width:100%;">
                <i class="fas fa-dice-d20"></i> Roll Movement Damage (${moveDice}d8 Necrotic)
              </button>
            `
          });
        }
      }

      // 3. Altarion: Dispersão Contagiosa
      const dispersionRoll = rolls.find(r => r?.options?.altarionContagiousDispersion);
      if (!dispersionRoll) return;

      const actorId = dispersionRoll.options?.altarionActorId;
      const altarion =
        (actorId && game.actors?.get(actorId)) ||
        this.resolveDamageRollActor({ config: { subject: data?.subject } }) ||
        game.actors?.find(a => this.getPlagueRole(a) === "altarion");
      if (!altarion) return;

      const state = this.getPlagueState(altarion);
      if (state.storedEC <= 0) return;

      const newStored = Math.max(0, state.storedEC - 1);
      await this.updatePlagueState(altarion, { storedEC: newStored });
      const updatedAltState = this.getPlagueState(altarion);

      // Infectar criaturas atualmente selecionadas como Target (exceto Altarion e Aitusa)
      const infectedTargetNames = [];
      for (const tok of Array.from(game.user?.targets || [])) {
        const tgtActor = tok?.actor;
        if (!tgtActor) continue;
        const role = this.getPlagueRole(tgtActor);
        if (role === "altarion" || tgtActor.name?.trim().toLowerCase() === this.getAitusaName().toLowerCase()) {
          continue;
        }
        const curTgt = this.getPlagueState(tgtActor);
        const nextEC = curTgt.infected ? Math.min(6, curTgt.ec + 1) : 1;
        const nextDC = Math.max(10, 10 + nextEC);
        await this.updatePlagueState(tgtActor, {
          infected: true,
          ec: nextEC,
          dc: nextDC
        });
        infectedTargetNames.push(`${tok.name || tgtActor.name} (EC ${nextEC})`);
      }

      await this.sendCoriaChatCard(altarion, {
        theme: "arcane",
        icon: "fa-biohazard",
        title: "Dispersão Contagiosa!",
        bodyHtml: `
          <p><strong>${altarion.name}</strong> expeliu <strong>1 Estágio de Contaminação Armazenado</strong> em seu golpe, canalizando <strong>+${dispersionRoll.total} de dano de Força</strong> altamente infeccioso!</p>
          <hr style="border-color: rgba(50,150,255,0.3); margin: 10px 0;">
          <p>ECs Armazenados restantes: <strong>${newStored}</strong> (EC Atual de Altarion: <strong>EC ${updatedAltState.ec}</strong>).</p>
          <p style="color:#ff9999; font-size:0.88rem;">
            Qualquer criatura que sofra este dano extra é imediatamente infectada pela Praga Arcana, adquirindo <strong>+1 EC</strong>!
            ${infectedTargetNames.length > 0 ? `<br><strong>Alvos Infectados:</strong> ${infectedTargetNames.join(", ")}` : ""}
          </p>
        `
      });
    });
  }

  /* -------------------------------------------- */
  /*  2ª Linha de Cabeçalho nas Fichas & Info     */
  /* -------------------------------------------- */

  /**
   * Renderiza a segunda linha do cabeçalho (logo abaixo de .altarion-aitusa-class-container)
   * nas fichas de Altarion, Flinn, Parva e Kyrion.
   */
  static renderPlagueHeaderRow(actor, rootEl) {
    if (!actor || !rootEl || !this.isSheetPlagueCharacter(actor)) return;

    const classContainer = rootEl.querySelector(".altarion-aitusa-class-container");
    if (!classContainer) return;

    let plagueRow = rootEl.querySelector(".altarion-plague-header-row");
    if (!plagueRow) {
      plagueRow = document.createElement("div");
      plagueRow.className = "altarion-plague-header-row";
      classContainer.insertAdjacentElement("afterend", plagueRow);
    }

    const state = this.getPlagueState(actor);
    const dormantTag = this.isDormant()
      ? `<span class="altarion-plague-badge is-dormant" data-coria-color-key="plague-dormant" data-coria-color-label="Dormência da Praga" title="Dormência em Ambiente Seguro ativa (testes diários suspensos) | Clique direito para personalizar cor"><i class="fas fa-bed"></i> Dormente</span>`
      : "";

    let plagueHtml = "";
    if (state.role === "altarion") {
      plagueHtml = `
        <span class="altarion-plague-badge stored" data-coria-color-key="plague-stored" data-coria-color-label="ECs Armazenados" title="Estágios de Contaminação Armazenados no corpo de Altarion (Limite Seguro = ceil(BP/2) = ${state.safeLimit}) | Clique direito para personalizar cor">
          <i class="fas fa-vial"></i> Estágios de Contaminação Armazenados: <strong>${state.storedEC}</strong>
        </span>
        <button type="button" class="altarion-plague-badge stage clickable ${state.ec > 0 ? "is-infected" : ""}" data-action="plague-info" data-coria-color-key="plague-stage" data-coria-color-label="Estágio de Contaminação Atual" title="Clique para ver as regras gerais e específicas da Praga Arcana | Clique direito para personalizar cor">
          <i class="fas fa-biohazard"></i> Estágio de Contaminação Atual: <strong>EC ${state.ec}</strong>
        </button>
        ${
          actor.isOwner
            ? `<button type="button" class="altarion-plague-action-btn absorb" data-action="absorb-plague" data-coria-color-key="plague-absorb" data-coria-color-label="Absorver Praga" title="Selecione o token de Flinn, Parva ou Kyrion como Target para absorver 1 EC | Clique direito para personalizar cor">
                <i class="fas fa-hand-sparkles"></i> Absorver Praga
              </button>`
            : ""
        }
      `;
    } else {
      const blockedPactNote =
        state.role === "parva" && state.parvaBlockedPactSlots > 0
          ? `<span class="altarion-plague-badge pact-blocked" data-coria-color-key="plague-pact-blocked" data-coria-color-label="Slot Sacrificado" title="Espaço de Magia de Warlock sacrificado pelo Dízimo Arcano até o próximo Descanso Longo | Clique direito para personalizar cor">
              <i class="fas fa-lock"></i> Slot Sacrificado: <strong>${state.parvaBlockedPactSlots}</strong>
            </span>`
          : "";

      const kyrionBtn =
        state.role === "kyrion" && actor.isOwner
          ? `<button type="button" class="altarion-plague-action-btn feed-hunger" data-action="feed-hunger" data-coria-color-key="plague-feed-hunger" data-coria-color-label="Alimentar a Fome" title="Sacrificar um item mágico do inventário para reduzir o EC | Clique direito para personalizar cor">
              <i class="fas fa-utensils"></i> Alimentar a Fome
            </button>`
          : "";

      plagueHtml = `
        <button type="button" class="altarion-plague-badge stage clickable ${state.ec > 0 ? "is-infected" : ""}" data-action="plague-info" data-coria-color-key="plague-stage" data-coria-color-label="Estágio de Contaminação Atual" title="Clique para abrir as informações gerais da Praga Arcana e as regras específicas de ${actor.name} | Clique direito para personalizar cor">
          <i class="fas fa-biohazard"></i> Estágio de Contaminação Atual: <strong>EC ${state.ec}</strong>
        </button>
        <span class="altarion-plague-badge dc" data-coria-color-key="plague-dc" data-coria-color-label="Dificuldade Atual da Praga" title="Dificuldade Atual dos Testes de Resistência de Constituição contra o avanço da Praga Arcana | Clique direito para personalizar cor">
          <i class="fas fa-shield-virus"></i> Dificuldade Atual: <strong>CD ${state.dc}</strong>
        </span>
        ${blockedPactNote}
        ${dormantTag}
        ${kyrionBtn}
      `;
    }

    const plagueSig = `${actor.id}|${actor.isOwner ? 1 : 0}|${plagueHtml}`;
    if (plagueRow.dataset.coriaPlagueSig !== plagueSig) {
      plagueRow.dataset.coriaPlagueSig = plagueSig;
      plagueRow.innerHTML = plagueHtml;

      plagueRow.querySelector('[data-action="plague-info"]')?.addEventListener("click", (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        this.openPlagueInfoDialog(actor);
      });

      plagueRow.querySelector('[data-action="absorb-plague"]')?.addEventListener("click", (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        this.openAltarionAbsorbPlagueDialog(actor);
      });

      plagueRow.querySelector('[data-action="feed-hunger"]')?.addEventListener("click", (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        this.openKyrionFeedHungerDialog(actor);
      });
    }

    globalThis.CoriaHeaderColorManager?.applyAndBind?.(actor, plagueRow);
  }

  /**
   * Abre a janela de informações completas da Praga Arcana + regras específicas da ficha clicada.
   */
  static openPlagueInfoDialog(actor) {
    if (!actor) return;
    const state = this.getPlagueState(actor);

    let specificBoxHtml = "";
    if (state.role === "altarion") {
      const hdInfo = this.getAltarionHitDiceInfo(actor);
      specificBoxHtml = `
        <div class="coria-arcane-box" style="text-align:left; margin-bottom:14px;">
          <h3 style="text-align:center;">Altarion — A Praga no Cavaleiro</h3>
          <p><strong>Imunidade Natural & Limite Seguro:</strong> Altarion é imune à infecção natural. Com uma ação, pode absorver 1 EC de uma criatura que tenha tocado. Ele pode armazenar sem penalidades um número de ECs igual a metade do seu Bônus de Proficiência arredondado para cima (Limite Seguro atual: <strong>${state.safeLimit}</strong>; Armazenados: <strong>${state.storedEC}</strong>; EC Atual Efetivo: <strong>EC ${state.ec}</strong>).</p>
          <p><strong>O Custo da Absorção:</strong> Para cada 1 EC absorvido de um aliado, Altarion deve gastar <strong>1 Dado de Vida</strong> (perdido sem curar PV e indisponível até o ponto de EC ser expelido; no Descanso Longo, Dados de Vida disponíveis não podem ultrapassar <em>Total - Armazenados</em> = <strong>${Math.max(0, hdInfo.total - state.storedEC)}</strong>).</p>
          <p><strong>Dispersão Contagiosa:</strong> Sem requerer ação, Altarion pode gastar 1 EC armazenado para adicionar <strong>+1d6 de dano de Força</strong> em qualquer rolagem de dano. Qualquer criatura que sofra esse dano extra é imediatamente infectada, adquirindo <strong>1 EC</strong>.</p>
        </div>
      `;
    } else if (state.role === "flinn") {
      specificBoxHtml = `
        <div class="coria-arcane-box" style="text-align:left; margin-bottom:14px;">
          <h3 style="text-align:center;">Flinn — Reescrever o Destino</h3>
          <p>Flinn é capaz de sentir as ramificações da praga se entrelaçando com o seu destino, podendo forçar uma realidade onde a doença regride.</p>
          <p><strong>Reescrever o Destino:</strong> Antes de rolar o seu teste de resistência contra a Praga Arcana no final de um descanso longo, Flinn pode escolher gastar <strong>1 uso da sua característica Portent</strong> daquele dia. Ao fazer isso, ele não sofre os efeitos do avanço da praga, é considerado automaticamente bem-sucedido, e a CD atual da Praga Arcana para ele é reduzida em <strong>1d4</strong> (até o mínimo de 10).</p>
        </div>
      `;
    } else if (state.role === "kyrion") {
      specificBoxHtml = `
        <div class="coria-shadow-box" style="text-align:left; margin-bottom:14px;">
          <h3 style="text-align:center;">Kyrion — A Fome de ????</h3>
          <p>A praga consome a energia do <strong>????</strong>, tornando <strong>????</strong> agressivo toda vez que a infecção avança. Sempre que Kyrion falhar no seu teste de Constituição contra a Praga Arcana (aumentando seu EC), ele precisa imediatamente fazer um <strong>Teste de Resistência de Sabedoria</strong> (utilizando a mesma CD atual da Praga). Em caso de falha, <strong>????</strong> passa a controlar o corpo por <strong>1d4 horas</strong> ou até que ele fique inconsciente.</p>
          <p><strong>Alimentar a Fome:</strong> Kyrion pode entregar magia pura ao <strong>????</strong>. Se um item mágico de raridade <strong>Incomum ou maior</strong> for entregue, o EC de Kyrion diminui em <strong>1</strong> (+1 para cada raridade acima de Incomum: Raro -2, Muito Raro -3, Lendário -4, Artefato -5). O item é consumido e destruído permanentemente.</p>
        </div>
      `;
    } else if (state.role === "parva") {
      specificBoxHtml = `
        <div class="coria-pact-box" style="text-align:left; margin-bottom:14px;">
          <h3 style="text-align:center;">Parva — O Dízimo Arcano</h3>
          <p>O patrono de Parva exige um sacrifício constante para manter a corrupção afastada.</p>
          <p><strong>O Dízimo Arcano:</strong> Caso falhe no teste de resistência de Constituição contra o avanço da praga, Parva pode optar por sacrificar <strong>1 Espaço de Magia de Warlock</strong> disponível (que fica bloqueado e indisponível durante todo o dia seguinte) para evitar o aumento de EC.</p>
          <p><strong>Canalização Instável:</strong> O processo de barganhar com o patrono para que ele absorva a praga é volátil. Antes de sacrificar o espaço de magia, Parva deve fazer um teste de Persuasão (CD igual à CD atual da Praga). Se passar, o espaço de magia é sacrificado e o EC não aumenta. Se falhar, o patrono recusa a energia corrompida (o espaço de magia não é consumido) e a corrupção aumenta normalmente.</p>
        </div>
      `;
    }

    const stagesHtml = Object.entries(this.STAGE_DATA)
      .map(([lvlStr, st]) => {
        const lvl = Number(lvlStr);
        const isActive = lvl <= state.effectiveEC;
        const isCurrent = lvl === state.effectiveEC;
        return `
          <div class="coria-info-stage-card ${isActive ? "is-active" : ""} ${isCurrent ? "is-current" : ""}">
            <div class="coria-info-stage-header">
              <span>${st.code}: ${st.title}</span>
              ${isCurrent ? `<span class="coria-stage-pill current">ATUAL</span>` : isActive ? `<span class="coria-stage-pill active">ATIVO</span>` : ""}
            </div>
            <p class="coria-info-stage-flavor">${st.flavor}</p>
            <ul>
              ${st.effects.map(eff => `<li>${eff}</li>`).join("")}
            </ul>
          </div>
        `;
      })
      .join("");

    const d = createV2Dialog(
      {
        title: `A Praga Arcana — ${actor.name}`,
        content: `
          <div class="coria-plague-info-modal">
            ${specificBoxHtml}

            <div class="coria-plague-box" style="text-align:left; padding:15px;">
              <h3 style="text-align:center;">Informações Gerais da Praga Arcana</h3>
              <p><strong>Vetores de Infecção:</strong> Permanecer 1 hora em área contaminada; beber água ou ingerir alimento contaminado; ou sofrer dano de uma criatura já reanimada pela Praga.</p>
              <p><strong>Resistência à Cura Mágica:</strong> Uma criatura <strong>não pode</strong> ser curada da infecção com magias como <em>Restauração Menor</em>, <em>Restauração Maior</em> ou <em>Cura</em>.</p>
              <p><strong>Progressão no Descanso Longo:</strong> Inicia no <strong>EC 0</strong>. Após cada descanso longo, faz-se um Teste de Resistência de Constituição (CD base <code>10 + EC atual</code>; +1 na CD a cada sucesso). Em caso de falha, recebe <strong>+1 de EC</strong>.</p>
              <p><strong>Dormência em Ambiente Seguro:</strong> Em períodos de downtime seguro (cidade, fortaleza ou base aliada) sem combates ou estresse extremo, os testes diários são suspensos e realizados apenas a cada <strong>7 dias</strong> (treinamento leve ou pesquisa mágica não quebram a dormência).</p>
            </div>

            <h4 class="coria-info-section-title">Estágios de Contaminação (Efeitos Cumulativos)</h4>
            <div class="coria-info-stages-list">
              ${stagesHtml}
            </div>
          </div>
        `,
        buttons: {
          close: {
            icon: '<i class="fas fa-check"></i>',
            label: "Fechar"
          }
        },
        default: "close"
      },
      { classes: ["coria-dialog"], width: 620, height: 680, resizable: true }
    );
    d.render(true);
  }

  /* -------------------------------------------- */
  /*  Socket Relay & Painel Flutuante do Mestre   */
  /* -------------------------------------------- */

  static registerReadyHooks() {
    Hooks.once("ready", () => {
      // 1. Listener de Socket para o Mestre aplicar atualizações cross-sheet (Absorver Praga / Dispersão Contagiosa)
      if (game.socket) {
        game.socket.on(SOCKET_NAME, async (payload) => {
          if (!game.user?.isGM || !payload) return;
          const activeGMs = game.users?.filter(u => u.isGM && u.active) || [];
          if (activeGMs.length > 0 && activeGMs[0].id !== game.user.id) return;

          if (payload.action === "updatePlagueActor") {
            let targetActor = null;
            if (payload.actorUuid) {
              try {
                targetActor = await fromUuid(payload.actorUuid);
              } catch (_) {
                targetActor = null;
              }
            }
            if (!targetActor && payload.actorId) {
              targetActor = game.actors?.get(payload.actorId) || null;
            }
            if (targetActor && payload.patch) {
              await targetActor.update(
                { [`flags.${MODULE_ID}.plague`]: payload.patch },
                { altarionPlagueInternal: true }
              );
              if (targetActor.sheet?.rendered) targetActor.sheet.render(false);
            }
          }
        });
      }

      // 2. Botão Flutuante Global do Mestre (#coria-plague-floating-btn)
      if (game.user?.isGM) {
        this.injectGMFloatingWidget();
      }
    });

    // Recalcula dados derivados quando flags da praga mudarem (o Foundry já re-renderiza a ficha automaticamente)
    Hooks.on("updateActor", (actor, changed) => {
      if (changed?.flags?.[MODULE_ID]?.plague) {
        if (typeof actor.reset === "function") actor.reset();
      }
    });
  }

  static injectGMFloatingWidget() {
    if (document.getElementById("coria-plague-floating-btn")) return;

    const widget = document.createElement("div");
    widget.id = "coria-plague-floating-btn";
    widget.title = "Central de Comando: Praga Arcana";
    widget.innerHTML = `<i class="fas fa-biohazard"></i>`;
    widget.addEventListener("click", () => this.openGMGlobalControlPanel());
    document.body.appendChild(widget);
  }

  /**
   * Central de Comando Global da Praga para o Mestre.
   */
  static openGMGlobalControlPanel() {
    const pcActors = (game.actors || []).filter(a => this.isSheetPlagueCharacter(a));
    if (pcActors.length === 0) {
      ui.notifications.warn("Nenhuma ficha de Altarion, Flinn, Parva ou Kyrion foi encontrada no mundo.");
      return;
    }

    const dormant = this.isDormant();

    const rowsHtml = pcActors
      .map(actor => {
        const st = this.getPlagueState(actor);
        if (st.role === "altarion") {
          return `
            <div class="coria-gm-actor-row" data-actor-id="${actor.id}">
              <div class="coria-gm-actor-ident">
                <img src="${actor.img}" alt="${actor.name}" />
                <div>
                  <strong>${actor.name}</strong>
                  <small>Limite Seguro: ${st.safeLimit} | EC Atual: EC ${st.ec}</small>
                </div>
              </div>
              <div class="coria-gm-actor-inputs">
                <div>
                  <span>Armazenados</span>
                  <input type="number" id="gm-plague-stored-${actor.id}" value="${st.storedEC}" min="0" />
                </div>
              </div>
            </div>
          `;
        }

        return `
          <div class="coria-gm-actor-row" data-actor-id="${actor.id}">
            <div class="coria-gm-actor-ident">
              <img src="${actor.img}" alt="${actor.name}" />
              <div>
                <strong>${actor.name}</strong>
                <small>Portador Natural</small>
              </div>
            </div>
            <div class="coria-gm-actor-inputs">
              <div>
                <span>Estágio (EC)</span>
                <input type="number" id="gm-plague-lvl-${actor.id}" value="${st.ec}" min="0" max="6" />
              </div>
              <div>
                <span>Teste CD</span>
                <input type="number" id="gm-plague-dc-${actor.id}" value="${st.dc}" min="10" />
              </div>
              <button type="button" class="coria-gm-test-btn btn-plague" data-trigger-actor="${actor.id}" title="Disparar fluxo de Teste da Praga agora para ${actor.name}">
                <i class="fas fa-dice-d20"></i>
              </button>
            </div>
          </div>
        `;
      })
      .join("");

    const d = createV2Dialog(
      {
        title: "Central de Comando da Praga",
        content: `
          <div class="coria-plague-box" style="text-align:left;">
            <h3 style="text-align:center;">Controle Global da Praga Arcana</h3>
            <p style="color:#ccc; text-align:center; font-size:0.88rem; margin-bottom:12px;">
              Ajuste simultaneamente os Estágios, CDs e estado de Dormência da campanha.
            </p>

            <label class="coria-checkbox-wrapper" style="margin-bottom: 12px;">
              <input type="checkbox" id="gm-plague-dormancy" ${dormant ? "checked" : ""} />
              <span><strong>Dormência em Ambiente Seguro</strong> (suspende testes diários; testar a cada 7 dias)</span>
            </label>

            <div class="coria-gm-actor-list">
              ${rowsHtml}
            </div>
          </div>
        `,
        buttons: {
          save: {
            icon: '<i class="fas fa-save"></i>',
            label: "Aplicar Alterações Globais",
            callback: async (html) => {
              const root = html instanceof HTMLElement ? html : html?.[0];
              const newDormancy = Boolean(root?.querySelector("#gm-plague-dormancy")?.checked);
              await game.settings.set(MODULE_ID, "plagueDormancy", newDormancy);

              for (const actor of pcActors) {
                const st = this.getPlagueState(actor);
                if (st.role === "altarion") {
                  const newStored = Math.max(
                    0,
                    Number(root?.querySelector(`#gm-plague-stored-${actor.id}`)?.value ?? st.storedEC)
                  );
                  if (newStored !== st.storedEC) {
                    await this.updatePlagueState(actor, { storedEC: newStored });
                  }
                } else {
                  const newEC = Math.clamp(
                    Number(root?.querySelector(`#gm-plague-lvl-${actor.id}`)?.value ?? st.ec),
                    0,
                    6
                  );
                  const newDC = Math.max(
                    10,
                    Number(root?.querySelector(`#gm-plague-dc-${actor.id}`)?.value ?? st.dc)
                  );
                  if (newEC !== st.ec || newDC !== st.dc) {
                    await this.updatePlagueState(actor, { ec: newEC, dc: newDC });
                  }
                }
                if (actor.sheet?.rendered) actor.sheet.render(false);
              }

              ui.notifications.info("Valores globais da Praga Arcana atualizados pelo Mestre.");
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
          root?.querySelector('button[data-button="save"]')?.classList.add("btn-plague");

          for (const trigBtn of root?.querySelectorAll("[data-trigger-actor]") || []) {
            trigBtn.addEventListener("click", async (ev) => {
              ev.preventDefault();
              const aId = trigBtn.getAttribute("data-trigger-actor");
              const target = game.actors?.get(aId);
              if (target) {
                await this.triggerLongRestPlagueFlow(target, { force: true });
              }
            });
          }
        }
      },
      { classes: ["coria-dialog"], width: 520 }
    );
    d.render(true);
  }
}

globalThis.ArcanePlagueManager = ArcanePlagueManager;
