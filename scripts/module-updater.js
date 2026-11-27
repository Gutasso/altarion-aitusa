/**
 * GM-Only Module Auto-Updater & Patch Notes Viewer for Altarion & Aitusa
 *
 * - Runs strictly for the Gamemaster (`game.user.isGM`) AFTER all startup synchronizations settle.
 * - Opens a sleek modal saying "Buscando Atualizações do Módulo..." while querying GitHub (`Gutasso/altarion-aitusa`).
 * - Compares the installed module version / `patchId` against remote `module.json` & commit history on `main`.
 * - Displays human-readable Patch Notes extracted directly from the Git commit messages (`Altarion-aitusa_Patch_yymmdd`).
 * - Provides 1-click update actions compliant with Foundry V13's sandbox (Native Setup Update, `git pull` script/command,
 *   and cache-busting Foundry Hard Reload equivalent to Ctrl+F5).
 */

import { createV2Dialog } from "./dialog-v2.js";

const MODULE_ID = "altarion-aitusa";
const DEFAULT_REPO_OWNER = "Gutasso";
const DEFAULT_REPO_NAME = "altarion-aitusa";
const DEFAULT_BRANCH = "main";

export class CoriaModuleUpdater {
  static _startupChecked = false;
  static _activeDialog = null;

  static init() {
    if (!game?.settings?.register) return;
    try {
      if (!game.settings.settings?.has(`${MODULE_ID}.autoCheckUpdates`)) {
        game.settings.register(MODULE_ID, "autoCheckUpdates", {
          name: "Buscar Atualizações do Módulo ao Iniciar (Somente Mestre)",
          hint: "Verifica automaticamente no GitHub se há uma nova versão do módulo Altarion & Aitusa após todas as sincronizações concluírem.",
          scope: "world",
          config: true,
          type: Boolean,
          default: true
        });
      }
    } catch (_e) {
      // ignore if already registered
    }
  }

  /**
   * Read local installed module metadata (version, patchId, repo info).
   */
  static getLocalModuleInfo() {
    const mod = game.modules?.get(MODULE_ID);
    const modFlags = mod?.flags?.[MODULE_ID] || {};
    return {
      version: String(mod?.version || "1.0.0").trim(),
      patchId: String(modFlags.patchId || "").trim(),
      repoOwner: String(modFlags.repoOwner || DEFAULT_REPO_OWNER).trim(),
      repoName: String(modFlags.repoName || DEFAULT_REPO_NAME).trim(),
      branch: String(modFlags.branch || DEFAULT_BRANCH).trim(),
      manifestUrl:
        String(mod?.manifest || "").trim() ||
        `https://raw.githubusercontent.com/${DEFAULT_REPO_OWNER}/${DEFAULT_REPO_NAME}/${DEFAULT_BRANCH}/module.json`,
      downloadUrl:
        String(mod?.download || "").trim() ||
        `https://github.com/${DEFAULT_REPO_OWNER}/${DEFAULT_REPO_NAME}/archive/refs/heads/${DEFAULT_BRANCH}.zip`
    };
  }

  /**
   * Compare two dotted version strings numerically (returns 1 if a > b, -1 if a < b, 0 if equal).
   */
  static compareVersions(a, b) {
    const pa = String(a || "0")
      .split(".")
      .map(n => parseInt(n, 10) || 0);
    const pb = String(b || "0")
      .split(".")
      .map(n => parseInt(n, 10) || 0);
    const len = Math.max(pa.length, pb.length);
    for (let i = 0; i < len; i++) {
      const va = pa[i] || 0;
      const vb = pb[i] || 0;
      if (va > vb) return 1;
      if (va < vb) return -1;
    }
    return 0;
  }

  /**
   * Extract a numeric YYMMDD date stamp from a patch title like `Altarion-aitusa_Patch_261127` (or null).
   */
  static extractPatchDateNum(title) {
    const m = /Patch_(\d{6})/i.exec(String(title || ""));
    return m ? Number(m[1]) : null;
  }

  /**
   * Format an ISO timestamp into pt-BR display string (`dd/mm/yyyy HH:mm`).
   */
  static formatCommitDatePtBr(isoStr) {
    if (!isoStr) return "";
    try {
      const dt = new Date(isoStr);
      if (Number.isNaN(dt.getTime())) return String(isoStr);
      return dt.toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch (_e) {
      return String(isoStr);
    }
  }

  /**
   * Convert a raw Git commit message into structured `{ title, bodyLines }` for readable Patch Notes.
   */
  static parseCommitMessage(rawMessage) {
    const lines = String(rawMessage || "")
      .replace(/\r\n/g, "\n")
      .split("\n");
    const title = (lines[0] || "Atualização do Módulo").trim();
    const bodyLines = lines
      .slice(1)
      .map(l => l.trim())
      .filter((l, idx, arr) => l.length > 0 || (idx > 0 && idx < arr.length - 1));
    return { title, bodyLines };
  }

  /**
   * Render safe HTML for the patch notes body lines of a commit.
   */
  static renderCommitBodyHtml(bodyLines) {
    if (!Array.isArray(bodyLines) || bodyLines.length === 0) {
      return `<p style="margin: 4px 0 0; color: #94a3b8; font-style: italic; font-size: 0.82rem;">Sem notas detalhadas neste commit.</p>`;
    }
    const items = [];
    let inList = false;

    const closeList = () => {
      if (inList) {
        items.push("</ul>");
        inList = false;
      }
    };

    for (const rawLine of bodyLines) {
      const line = String(rawLine || "").trim();
      if (!line) {
        closeList();
        continue;
      }
      const bulletMatch = /^(?:[-*•]\s+|\d+[.)]\s+)(.+)$/.exec(line);
      if (bulletMatch) {
        if (!inList) {
          items.push('<ul style="margin: 4px 0 6px 16px; padding: 0; list-style: disc; color: #e2e8f0;">');
          inList = true;
        }
        items.push(
          `<li style="margin: 3px 0; line-height: 1.4;">${foundry.utils.escapeHTML(bulletMatch[1])}</li>`
        );
      } else {
        closeList();
        const isHeading = line.endsWith(":") && line.length <= 72;
        items.push(
          `<p style="margin: ${isHeading ? "7px 0 2px" : "4px 0"}; line-height: 1.4; color: ${
            isHeading ? "#fde68a" : "#e2e8f0"
          }; ${isHeading ? "font-weight: 700;" : ""}">${foundry.utils.escapeHTML(line)}</p>`
        );
      }
    }
    closeList();
    return items.join("");
  }

  /**
   * Fetch with timeout & cache bypass.
   */
  static async fetchJsonNoCache(url, timeoutMs = 10000) {
    const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
    const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
    try {
      const res = await fetch(url, {
        method: "GET",
        cache: "no-store",
        headers: { Accept: "application/json" },
        ...(controller ? { signal: controller.signal } : {})
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status} (${res.statusText || "erro"})`);
      }
      return await res.json();
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  /**
   * Query GitHub for remote `module.json` and recent commits on `main`, and compute the list of newer commits.
   */
  static async fetchRemoteUpdateInfo() {
    const local = this.getLocalModuleInfo();
    const bust = Date.now();
    const rawManifestUrl = `https://raw.githubusercontent.com/${local.repoOwner}/${local.repoName}/${local.branch}/module.json?t=${bust}`;
    const commitsUrl = `https://api.github.com/repos/${local.repoOwner}/${local.repoName}/commits?sha=${encodeURIComponent(
      local.branch
    )}&per_page=25`;

    const [remoteManifest, commitsData] = await Promise.all([
      this.fetchJsonNoCache(rawManifestUrl, 10000).catch(() => null),
      this.fetchJsonNoCache(commitsUrl, 10000)
    ]);

    const commits = Array.isArray(commitsData) ? commitsData : [];
    const remoteVersion = String(remoteManifest?.version || local.version).trim();
    const remotePatchId = String(remoteManifest?.flags?.[MODULE_ID]?.patchId || "").trim();

    const localPatchIdLower = local.patchId.toLowerCase();
    const localPatchDate = this.extractPatchDateNum(local.patchId);
    const versionCmp = this.compareVersions(remoteVersion, local.version);

    const parsedCommits = commits.map(c => {
      const sha = String(c?.sha || "");
      const shortSha = sha.slice(0, 7);
      const dateIso = c?.commit?.committer?.date || c?.commit?.author?.date || "";
      const authorName = c?.commit?.author?.name || c?.author?.login || "Desenvolvedor";
      const htmlUrl = c?.html_url || `https://github.com/${local.repoOwner}/${local.repoName}/commit/${sha}`;
      const { title, bodyLines } = this.parseCommitMessage(c?.commit?.message || "");
      return {
        sha,
        shortSha,
        dateIso,
        dateDisplay: this.formatCommitDatePtBr(dateIso),
        authorName,
        htmlUrl,
        title,
        bodyLines,
        patchDateNum: this.extractPatchDateNum(title)
      };
    });

    // Collect every commit strictly newer than the installed patchId / version
    const newerCommits = [];
    let matchedLocalCommit = false;
    for (const c of parsedCommits) {
      const cTitleLower = c.title.trim().toLowerCase();
      if (localPatchIdLower && cTitleLower === localPatchIdLower) {
        matchedLocalCommit = true;
        break;
      }
      if (!localPatchIdLower && versionCmp <= 0) {
        break;
      }
      // If localPatchId wasn't in the top 25 commits, stop once commit patch date <= localPatchDate and versions match
      if (
        !matchedLocalCommit &&
        versionCmp <= 0 &&
        localPatchDate !== null &&
        c.patchDateNum !== null &&
        c.patchDateNum <= localPatchDate &&
        (!remotePatchId || remotePatchId.toLowerCase() === localPatchIdLower)
      ) {
        break;
      }
      newerCommits.push(c);
    }

    // If localPatchId was not found in recent commits AND remote version/patchId equals local, treat as up-to-date
    const patchIdDiffers = Boolean(
      remotePatchId && localPatchIdLower && remotePatchId.toLowerCase() !== localPatchIdLower
    );
    const hasUpdate =
      versionCmp > 0 ||
      patchIdDiffers ||
      (matchedLocalCommit && newerCommits.length > 0);

    const effectiveNewerCommits = hasUpdate
      ? newerCommits.length > 0
        ? newerCommits
        : parsedCommits.slice(0, 1)
      : [];

    return {
      local,
      remoteVersion,
      remotePatchId: remotePatchId || parsedCommits[0]?.title || remoteVersion,
      hasUpdate,
      newerCommits: effectiveNewerCommits,
      latestCommit: parsedCommits[0] || null
    };
  }

  /**
   * Wait until all module startup synchronizations have settled before checking for updates.
   */
  static async waitForAllStartupSyncs(maxWaitMs = 15000) {
    const startTs = Date.now();
    while (Date.now() - startTs < maxWaitMs) {
      const fsmSyncing = globalThis.FeatureSyncManager?._syncing?.size || 0;
      const mirroring = Boolean(globalThis.FeatureSyncManager?._mirroringSpells);
      const otherSyncing = globalThis.OtherPlayersBase?._syncing?.size || 0;
      const partySyncing = Boolean(globalThis.PartyJsonSyncManager?._syncing);
      if (fsmSyncing === 0 && !mirroring && otherSyncing === 0 && !partySyncing) {
        break;
      }
      await new Promise(r => setTimeout(r, 300));
    }
    // Brief extra settle period so initial canvas/sheet renders stay silky smooth
    await new Promise(r => setTimeout(r, 500));
  }

  /**
   * Perform a hard cache-busting reload of the Foundry VTT browser page (Ctrl+F5 equivalent).
   */
  static async performHardReloadFoundry() {
    try {
      if (typeof caches !== "undefined" && typeof caches.keys === "function") {
        const keys = await caches.keys();
        await Promise.all(keys.map(k => caches.delete(k).catch(() => {})));
      }
    } catch (_e) {
      // ignore Cache API errors
    }
    try {
      const url = new URL(window.location.href);
      url.searchParams.set("_coriaReload", String(Date.now()));
      window.location.replace(url.toString());
    } catch (_e) {
      window.location.reload();
    }
  }

  /**
   * Triggered automatically after all module syncs finish on startup (GM ONLY).
   */
  static async checkForUpdatesOnStartup() {
    if (!game.user?.isGM) return;
    if (this._startupChecked) return;
    this._startupChecked = true;

    let enabled = true;
    try {
      enabled = Boolean(game.settings.get(MODULE_ID, "autoCheckUpdates"));
    } catch (_e) {
      enabled = true;
    }
    if (!enabled) return;

    await this.waitForAllStartupSyncs();
    await this.checkForUpdates({ manual: false });
  }

  /**
   * Open the GM-only "Buscando Atualizações do Módulo..." dialog, fetch GitHub state,
   * and render either Up-to-Date status or full Patch Notes + Update controls.
   */
  static async checkForUpdates({ manual = false } = {}) {
    if (!game.user?.isGM) {
      if (manual) {
        ui.notifications?.warn?.("Apenas o Mestre pode buscar atualizações do módulo.");
      }
      return;
    }

    if (this._activeDialog) {
      try {
        await this._activeDialog.close();
      } catch (_e) {
        // ignore
      }
      this._activeDialog = null;
    }

    const local = this.getLocalModuleInfo();
    const containerId = `coria-updater-body-${foundry.utils.randomID()}`;
    let autoCloseTimer = null;

    const clearAutoClose = () => {
      if (autoCloseTimer) {
        clearTimeout(autoCloseTimer);
        autoCloseTimer = null;
      }
    };

    const initialContent = `
      <div id="${containerId}" class="coria-updater-root" style="padding: 8px 4px; color: #f8fafc; font-size: 0.88rem;">
        <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; gap: 10px; padding: 22px 12px; text-align:center;">
          <i class="fas fa-sync fa-spin" style="font-size: 2rem; color: #60a5fa;"></i>
          <div style="font-size: 1.05rem; font-weight: 700; color: #f8fafc;">
            Buscando Atualizações do Módulo...
          </div>
          <div style="font-size: 0.8rem; color: #94a3b8;">
            Consultando <strong>${foundry.utils.escapeHTML(local.repoOwner)}/${foundry.utils.escapeHTML(local.repoName)}</strong> (${foundry.utils.escapeHTML(local.branch)}) &bull; Versão local: <strong>v${foundry.utils.escapeHTML(local.version)}</strong>
          </div>
        </div>
      </div>
    `;

    const dlg = createV2Dialog(
      {
        title: "Atualizador — Altarion & Aitusa",
        content: initialContent,
        buttons: {
          close: {
            icon: '<i class="fas fa-times"></i>',
            label: "Fechar",
            callback: () => {
              clearAutoClose();
            }
          }
        },
        default: "close",
        close: () => {
          clearAutoClose();
          if (this._activeDialog === dlg) this._activeDialog = null;
        }
      },
      { width: 560 }
    );

    this._activeDialog = dlg;
    await dlg.render(true);

    const runCheckAndRender = async () => {
      const rootEl = document.getElementById(containerId);
      if (!rootEl) return;

      try {
        const info = await this.fetchRemoteUpdateInfo();
        const container = document.getElementById(containerId);
        if (!container) return;

        if (!info.hasUpdate) {
          const latestTitle = info.latestCommit?.title || info.local.patchId || `v${info.local.version}`;
          const latestDate = info.latestCommit?.dateDisplay || "";
          const latestBodyHtml = info.latestCommit ? this.renderCommitBodyHtml(info.latestCommit.bodyLines) : "";

          container.innerHTML = `
            <div style="display:flex; flex-direction:column; gap:10px;">
              <div style="display:flex; align-items:center; gap:12px; padding:12px 14px; border-radius:8px; background:linear-gradient(135deg, rgba(20, 83, 45, 0.45), rgba(15, 23, 42, 0.92)); border:1px solid rgba(74, 222, 128, 0.5);">
                <i class="fas fa-check-circle" style="font-size:1.75rem; color:#4ade80;"></i>
                <div style="flex:1;">
                  <div style="font-size:1rem; font-weight:700; color:#bbf7d0;">
                    O módulo está na versão mais atual!
                  </div>
                  <div style="font-size:0.8rem; color:#cbd5e1; margin-top:2px;">
                    Patch atual: <strong>${foundry.utils.escapeHTML(latestTitle)}</strong> (v${foundry.utils.escapeHTML(info.local.version)})${
                      latestDate ? ` &bull; ${foundry.utils.escapeHTML(latestDate)}` : ""
                    }
                  </div>
                </div>
              </div>
              ${
                info.latestCommit
                  ? `<details style="border:1px solid rgba(148, 163, 184, 0.28); border-radius:7px; padding:8px 11px; background:rgba(15, 23, 42, 0.72);">
                       <summary style="cursor:pointer; font-weight:700; color:#bae6fd; font-size:0.82rem;">
                         <i class="fas fa-scroll"></i> Ver Patch Notes da versão instalada
                       </summary>
                       <div style="margin-top:8px; max-height:220px; overflow-y:auto; font-size:0.82rem;">
                         ${latestBodyHtml}
                       </div>
                     </details>`
                  : ""
              }
              ${
                !manual
                  ? `<div style="text-align:right; font-size:0.74rem; color:#94a3b8;">
                       Esta janela fechará automaticamente em alguns segundos (passe o mouse para manter aberta).
                     </div>`
                  : ""
              }
            </div>
          `;

          if (!manual) {
            const scheduleClose = () => {
              clearAutoClose();
              autoCloseTimer = setTimeout(() => {
                if (this._activeDialog === dlg) {
                  dlg.close().catch(() => {});
                }
              }, 5500);
            };
            container.addEventListener("mouseenter", clearAutoClose);
            container.addEventListener("click", clearAutoClose);
            scheduleClose();
          }
          return;
        }

        // UPDATE AVAILABLE — render full Patch Notes for every newer commit + Update Actions
        const commitsHtml = info.newerCommits
          .map(
            c => `
              <div style="margin-bottom: 10px; padding: 10px 12px; border-radius: 7px; background: rgba(15, 23, 42, 0.85); border: 1px solid rgba(96, 165, 250, 0.35); border-left: 4px solid #60a5fa;">
                <div style="display:flex; align-items:center; justify-content:space-between; gap:8px; flex-wrap:wrap; margin-bottom:6px; padding-bottom:5px; border-bottom:1px solid rgba(148, 163, 184, 0.2);">
                  <strong style="color:#fde68a; font-size:0.9rem;">
                    <i class="fas fa-code-branch"></i> ${foundry.utils.escapeHTML(c.title)}
                  </strong>
                  <span style="font-size:0.74rem; color:#94a3b8;">
                    <a href="${foundry.utils.escapeHTML(c.htmlUrl)}" target="_blank" rel="noopener" style="color:#7dd3fc; text-decoration:none;">#${foundry.utils.escapeHTML(c.shortSha)}</a>
                    ${c.dateDisplay ? ` &bull; ${foundry.utils.escapeHTML(c.dateDisplay)}` : ""}
                  </span>
                </div>
                <div style="font-size:0.83rem;">
                  ${this.renderCommitBodyHtml(c.bodyLines)}
                </div>
              </div>
            `
          )
          .join("");

        const gitPullCmd = `git pull --rebase --autostash origin ${info.local.branch}`;

        container.innerHTML = `
          <div style="display:flex; flex-direction:column; gap:10px;">
            <div style="display:flex; align-items:center; gap:12px; padding:11px 14px; border-radius:8px; background:linear-gradient(135deg, rgba(30, 58, 138, 0.65), rgba(88, 28, 135, 0.45)); border:1px solid rgba(96, 165, 250, 0.65);">
              <i class="fas fa-cloud-download-alt" style="font-size:1.85rem; color:#fde047;"></i>
              <div style="flex:1;">
                <div style="font-size:1.02rem; font-weight:700; color:#fef08a;">
                  Nova versão disponível! (${info.newerCommits.length} ${info.newerCommits.length === 1 ? "atualização" : "atualizações"})
                </div>
                <div style="font-size:0.8rem; color:#e2e8f0; margin-top:2px;">
                  Instalada: <strong>v${foundry.utils.escapeHTML(info.local.version)}</strong>${
                    info.local.patchId ? ` (${foundry.utils.escapeHTML(info.local.patchId)})` : ""
                  }<br>
                  Mais recente: <strong style="color:#86efac;">v${foundry.utils.escapeHTML(info.remoteVersion)}</strong> (${foundry.utils.escapeHTML(info.remotePatchId)})
                </div>
              </div>
            </div>

            <div style="font-size:0.8rem; font-weight:700; color:#93c5fd; text-transform:uppercase; letter-spacing:0.4px;">
              <i class="fas fa-list-ul"></i> Patch Notes das Novas Versões
            </div>

            <div style="max-height: 290px; overflow-y: auto; padding-right: 4px;">
              ${commitsHtml}
            </div>

            <div class="coria-updater-action-area" style="display:flex; flex-direction:column; gap:8px; padding-top:6px; border-top:1px solid rgba(148, 163, 184, 0.25);">
              <div style="display:flex; gap:8px; flex-wrap:wrap;">
                <button type="button" class="coria-updater-btn-primary" data-action="update-now" style="flex:1.3; min-width:200px; padding:8px 12px; border-radius:6px; border:1px solid #4ade80; background:linear-gradient(135deg, #15803d, #166534); color:#ffffff; font-weight:700; cursor:pointer; font-size:0.86rem;">
                  <i class="fas fa-download"></i> Atualizar Módulo (Setup / Git)
                </button>
                <button type="button" class="coria-updater-btn-reload" data-action="hard-reload" style="flex:1; min-width:170px; padding:8px 12px; border-radius:6px; border:1px solid #38bdf8; background:linear-gradient(135deg, #0369a1, #075985); color:#ffffff; font-weight:700; cursor:pointer; font-size:0.84rem;">
                  <i class="fas fa-redo-alt"></i> Recarregar Foundry (Ctrl+F5)
                </button>
              </div>
              <div class="coria-updater-guide" style="display:none; padding:10px 12px; border-radius:7px; background:rgba(15, 23, 42, 0.92); border:1px solid rgba(250, 204, 21, 0.45); font-size:0.8rem; line-height:1.45; color:#e2e8f0;">
                <div style="font-weight:700; color:#fde047; margin-bottom:5px;">
                  <i class="fas fa-info-circle"></i> Escolha como concluir a atualização (proteção de segurança do Foundry V13):
                </div>
                <div style="margin-bottom:7px;">
                  Por segurança, o Foundry V13 não permite que um mundo ativo grave arquivos diretamente dentro da pasta <code>modules/</code>. Você pode atualizar em 1 clique por qualquer um dos métodos abaixo:
                </div>
                <div style="display:flex; flex-direction:column; gap:6px;">
                  <button type="button" data-action="go-setup" style="padding:7px 10px; border-radius:5px; border:1px solid #60a5fa; background:rgba(30, 64, 175, 0.7); color:#fff; font-weight:700; cursor:pointer; text-align:left;">
                    <i class="fas fa-cogs"></i> 1. Ir para a Tela de Setup do Foundry (Add-on Modules &rarr; Update)
                  </button>
                  <button type="button" data-action="copy-git-pull" style="padding:7px 10px; border-radius:5px; border:1px solid #c084fc; background:rgba(88, 28, 135, 0.65); color:#fff; font-weight:700; cursor:pointer; text-align:left;">
                    <i class="fas fa-terminal"></i> 2. Copiar comando <code>${foundry.utils.escapeHTML(gitPullCmd)}</code> (ou execute <code>tools/atualizar-modulo.bat</code>)
                  </button>
                  <button type="button" data-action="check-and-reload" style="padding:7px 10px; border-radius:5px; border:1px solid #4ade80; background:rgba(21, 128, 61, 0.7); color:#fff; font-weight:700; cursor:pointer; text-align:left;">
                    <i class="fas fa-bolt"></i> 3. Já executei o Git Pull &mdash; Verificar e Recarregar Foundry (Ctrl+F5)
                  </button>
                </div>
              </div>
            </div>
          </div>
        `;

        const guideBox = container.querySelector(".coria-updater-guide");

        container.querySelector('[data-action="update-now"]')?.addEventListener("click", async () => {
          // Check if local files on disk ALREADY got updated (e.g., GM already ran git pull / bat!)
          try {
            const diskManifest = await this.fetchJsonNoCache(`/modules/${MODULE_ID}/module.json?t=${Date.now()}`, 4000);
            const diskPatchId = String(diskManifest?.flags?.[MODULE_ID]?.patchId || "").trim();
            const diskVer = String(diskManifest?.version || "").trim();
            if (
              (diskPatchId && diskPatchId === info.remotePatchId) ||
              this.compareVersions(diskVer, info.local.version) > 0
            ) {
              ui.notifications?.info?.(
                `[Altarion & Aitusa] Nova versão (${diskPatchId || diskVer}) detectada em disco! Recarregando o Foundry (Ctrl+F5)...`
              );
              await this.performHardReloadFoundry();
              return;
            }
          } catch (_e) {
            // ignore
          }
          if (guideBox) guideBox.style.display = "block";
        });

        container.querySelector('[data-action="go-setup"]')?.addEventListener("click", async () => {
          try {
            await navigator.clipboard?.writeText?.(info.local.manifestUrl);
          } catch (_e) {
            // ignore clipboard permissions
          }
          ui.notifications?.info?.(
            "Retornando à tela de Setup do Foundry (Manifest URL copiado). Vá em Add-on Modules → Update no Altarion & Aitusa!"
          );
          if (typeof game.shutDown === "function") {
            await game.shutDown();
          } else {
            window.location.href = "/setup";
          }
        });

        container.querySelector('[data-action="copy-git-pull"]')?.addEventListener("click", async () => {
          try {
            await navigator.clipboard?.writeText?.(gitPullCmd);
            ui.notifications?.info?.(
              `Comando copiado: "${gitPullCmd}" — ou dê duplo clique em tools/atualizar-modulo.bat na pasta do módulo e clique em Recarregar!`
            );
          } catch (_e) {
            ui.notifications?.info?.(
              `Execute na pasta do módulo: ${gitPullCmd} (ou duplo clique em tools/atualizar-modulo.bat).`
            );
          }
        });

        const handleReloadClick = async () => {
          try {
            const diskManifest = await this.fetchJsonNoCache(`/modules/${MODULE_ID}/module.json?t=${Date.now()}`, 4000);
            const diskPatchId = String(diskManifest?.flags?.[MODULE_ID]?.patchId || "").trim();
            if (diskPatchId && diskPatchId !== info.local.patchId) {
              ui.notifications?.info?.(
                `[Altarion & Aitusa] Atualização confirmada (${diskPatchId})! Recarregando o Foundry...`
              );
            } else {
              ui.notifications?.info?.("[Altarion & Aitusa] Recarregando o Foundry (Ctrl+F5)...");
            }
          } catch (_e) {
            ui.notifications?.info?.("[Altarion & Aitusa] Recarregando o Foundry (Ctrl+F5)...");
          }
          await this.performHardReloadFoundry();
        };

        container.querySelector('[data-action="hard-reload"]')?.addEventListener("click", handleReloadClick);
        container.querySelector('[data-action="check-and-reload"]')?.addEventListener("click", handleReloadClick);
      } catch (err) {
        console.warn("[Altarion & Aitusa] Module update check failed:", err);
        const container = document.getElementById(containerId);
        if (!container) return;
        container.innerHTML = `
          <div style="display:flex; flex-direction:column; gap:10px; padding:8px 2px;">
            <div style="display:flex; align-items:center; gap:12px; padding:12px 14px; border-radius:8px; background:rgba(127, 29, 29, 0.35); border:1px solid rgba(248, 113, 113, 0.55);">
              <i class="fas fa-exclamation-triangle" style="font-size:1.5rem; color:#fca5a5;"></i>
              <div style="flex:1;">
                <div style="font-weight:700; color:#fecaca;">Não foi possível verificar atualizações no GitHub</div>
                <div style="font-size:0.78rem; color:#cbd5e1; margin-top:2px;">
                  ${foundry.utils.escapeHTML(err?.message || "Sem conexão ou limite da API do GitHub atingido.")}
                </div>
              </div>
            </div>
            <button type="button" data-action="retry-check" style="padding:7px 12px; border-radius:6px; border:1px solid #60a5fa; background:rgba(30, 64, 175, 0.65); color:#fff; font-weight:700; cursor:pointer;">
              <i class="fas fa-sync"></i> Tentar Novamente
            </button>
          </div>
        `;
        container.querySelector('[data-action="retry-check"]')?.addEventListener("click", () => {
          container.innerHTML = `
            <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; gap: 10px; padding: 20px 12px; text-align:center;">
              <i class="fas fa-sync fa-spin" style="font-size: 1.8rem; color: #60a5fa;"></i>
              <div style="font-weight: 700;">Buscando Atualizações do Módulo...</div>
            </div>
          `;
          runCheckAndRender();
        });
      }
    };

    // Slight defer to guarantee dialog DOM is mounted
    setTimeout(runCheckAndRender, 60);
  }
}

globalThis.CoriaModuleUpdater = CoriaModuleUpdater;
