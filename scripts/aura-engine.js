/**
 * CoriaAuraEngine — Modular, Zero-Lag (60 FPS) Visual & Mechanical Aura Engine for FoundryVTT v13 (dnd5e 5.x)
 *
 * Features:
 * 1. Real-Time 60 FPS Visual Tracking:
 *    - Synchronizes aura containers directly inside `refreshToken` and `canvas.app.ticker` so auras glide
 *      frame-by-frame with the token during drag and movement animations (zero database/template lag).
 * 2. Unlimited Simultaneous Overlapping Auras per Token:
 *    - A single token can maintain any number of active auras simultaneously (e.g., Spirit Guardians 15 ft
 *      + Spirit Shroud 10 ft), each rendered with its own radius, animated style, grid footprint, and border.
 * 3. Multi-Layered 60 FPS PIXI.Graphics Coloration Techniques (Non-Vision):
 *    - Renders vibrant, animated procedural layers ("sunburst", "necrotic", "frost", "arcane", "emerald")
 *      with counter-rotating celestial/spectral geometry and expanding harmonic waves — without revealing
 *      Fog of War or altering token vision/darkness.
 * 4. Foundry V13 Grid-Diagonal & Footprint Geometry:
 *    - Measures edge-to-edge token distance across occupied grid squares using Foundry V13's native
 *      `canvas.grid.measurePath` (respecting 5-5-5 Equidistant, 5-10-5 Alternating, or Euclidean rules)
 *      and always reads destination coordinates (`tokenDoc.x`, `tokenDoc.y`) so mechanical triggers
 *      never lag 1 movement behind.
 * 5. Clean Public API:
 *    - `CoriaAuraEngine.getTokensInAura(casterTokenOrActor, radiusFt, options)`
 *    - `CoriaAuraEngine.measureTokenDistanceFt(tokenA, tokenB)`
 *    - `CoriaAuraEngine.buildAuraFlag(config)`
 */

const MODULE_ID = "altarion-aitusa";

export class CoriaAuraEngine {
  static _initialized = false;

  /**
   * Root PIXI.Container placed on the canvas to hold all active aura visuals
   * @type {PIXI.Container|null}
   */
  static _rootContainer = null;

  /**
   * Map of `tokenId -> Map<auraId, AuraVisualInstance>`
   */
  static _visualsByToken = new Map();

  /**
   * Programmatic aura definitions `actorOrTokenId -> Map<auraId, AuraConfig>`
   */
  static _customAuras = new Map();

  /**
   * Presets for Coloration Technique visual styles
   */
  static STYLE_PRESETS = {
    radiant: {
      styleIndex: 0,
      primaryColor: 0xfacc15,
      secondaryColor: 0xfef08a,
      borderColor: 0xfde047,
      opacity: 0.75
    },
    sunburst: {
      styleIndex: 0,
      primaryColor: 0xfacc15,
      secondaryColor: 0xfef08a,
      borderColor: 0xfde047,
      opacity: 0.75
    },
    necrotic: {
      styleIndex: 1,
      primaryColor: 0xa855f7,
      secondaryColor: 0x581c87,
      borderColor: 0xd8b4fe,
      opacity: 0.8
    },
    cold: {
      styleIndex: 2,
      primaryColor: 0x38bdf8,
      secondaryColor: 0x0284c7,
      borderColor: 0x7dd3fc,
      opacity: 0.75
    },
    frost: {
      styleIndex: 2,
      primaryColor: 0x38bdf8,
      secondaryColor: 0x0284c7,
      borderColor: 0x7dd3fc,
      opacity: 0.75
    },
    arcane: {
      styleIndex: 3,
      primaryColor: 0x8b5cf6,
      secondaryColor: 0x4c1d95,
      borderColor: 0xc4b5fd,
      opacity: 0.75
    },
    force: {
      styleIndex: 3,
      primaryColor: 0x8b5cf6,
      secondaryColor: 0x4c1d95,
      borderColor: 0xc4b5fd,
      opacity: 0.75
    },
    emerald: {
      styleIndex: 4,
      primaryColor: 0x22c55e,
      secondaryColor: 0x14532d,
      borderColor: 0x86efac,
      opacity: 0.72
    }
  };

  static init() {
    if (this._initialized) return;
    this._initialized = true;
    globalThis.CoriaAuraEngine = this;

    this._registerCanvasAndDocumentHooks();
    console.log("[Altarion & Aitusa] CoriaAuraEngine initialized.");
  }

  /* -------------------------------------------- */
  /*  Public Configuration & Helper Builders      */
  /* -------------------------------------------- */

  /**
   * Build a standardized `coriaAura` flag object to embed inside an `ActiveEffect`'s `flags["altarion-aitusa"].coriaAura`.
   * Any ActiveEffect carrying this flag is automatically rendered and tracked by `CoriaAuraEngine`!
   */
  static buildAuraFlag({
    auraId = "custom-aura",
    label = "Aura",
    radiusFt = 15,
    style = "radiant",
    primaryColor = null,
    secondaryColor = null,
    borderColor = null,
    opacity = null,
    showGridHighlight = true,
    showCircularBorder = true
  } = {}) {
    const preset = this.STYLE_PRESETS[String(style || "radiant").toLowerCase()] || this.STYLE_PRESETS.radiant;
    return {
      enabled: true,
      auraId,
      label,
      radiusFt: Math.max(5, Number(radiusFt || 15)),
      style: String(style || "radiant").toLowerCase(),
      styleIndex: preset.styleIndex,
      primaryColor: primaryColor ?? preset.primaryColor,
      secondaryColor: secondaryColor ?? preset.secondaryColor,
      borderColor: borderColor ?? preset.borderColor,
      opacity: opacity ?? preset.opacity,
      showGridHighlight: Boolean(showGridHighlight),
      showCircularBorder: Boolean(showCircularBorder)
    };
  }

  /**
   * Programmatically register or update a standalone aura on an Actor or Token.
   */
  static registerAura(actorOrToken, auraConfig) {
    const key = actorOrToken?.id || actorOrToken?.document?.id;
    if (!key || !auraConfig?.auraId) return;
    if (!this._customAuras.has(key)) this._customAuras.set(key, new Map());
    this._customAuras.get(key).set(auraConfig.auraId, this.buildAuraFlag(auraConfig));
    this.syncAllSceneAuras();
  }

  /**
   * Programmatically remove a standalone aura from an Actor or Token.
   */
  static unregisterAura(actorOrToken, auraId) {
    const key = actorOrToken?.id || actorOrToken?.document?.id;
    if (!key) return;
    this._customAuras.get(key)?.delete(auraId);
    this.syncAllSceneAuras();
  }

  /* -------------------------------------------- */
  /*  Grid Geometry & Token Detection API         */
  /* -------------------------------------------- */

  /**
   * Get the exact destination bounds & occupied grid squares of a Token or TokenDocument.
   * CRITICAL (Foundry V13): During movement animations, `Token#animate` resets `doc.x` / `doc.y`
   * back to the starting coordinates `(fromX, fromY)` at `t = 0` BEFORE `Hooks.callAll("updateToken")` runs!
   * Therefore, we ALWAYS resolve destination coordinates from `positionOverrides` (from `changed` / `movement.destination`)
   * and `doc._source.x` / `doc._source.y` (which always store the committed destination and are never mutated by `Token#animate`),
   * guaranteeing ZERO-LAG token detection on the very first movement!
   */
  static getTokenDestinationBounds(tokenOrDoc, positionOverrides = null) {
    if (!tokenOrDoc || !canvas?.ready || !canvas?.scene) return null;
    const doc = tokenOrDoc.document || tokenOrDoc;
    const tokenId = doc.id || tokenOrDoc.id || null;
    const sceneDoc = tokenId ? canvas.scene.tokens?.get(tokenId) : null;
    const override =
      positionOverrides instanceof Map
        ? positionOverrides.get(tokenId)
        : positionOverrides && tokenId
          ? positionOverrides[tokenId]
          : null;

    const gridSizePx = Number(canvas.scene.grid?.size || 100);
    const gridDistFt = Number(canvas.scene.grid?.distance || 5);
    const widthBlocks = Math.max(0.5, Number(sceneDoc?._source?.width ?? doc._source?.width ?? doc.width ?? 1));
    const heightBlocks = Math.max(0.5, Number(sceneDoc?._source?.height ?? doc._source?.height ?? doc.height ?? 1));
    const x = Number(
      override?.x ??
        sceneDoc?._source?.x ??
        doc._source?.x ??
        doc.movement?.destination?.x ??
        doc.x ??
        tokenOrDoc.x ??
        0
    );
    const y = Number(
      override?.y ??
        sceneDoc?._source?.y ??
        doc._source?.y ??
        doc.movement?.destination?.y ??
        doc.y ??
        tokenOrDoc.y ??
        0
    );
    const wPx = widthBlocks * gridSizePx;
    const hPx = heightBlocks * gridSizePx;
    const centerX = x + wPx / 2;
    const centerY = y + hPx / 2;

    const occupiedCenters = [];
    const cols = Math.max(1, Math.round(widthBlocks));
    const rows = Math.max(1, Math.round(heightBlocks));
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        occupiedCenters.push({
          x: x + (c + 0.5) * gridSizePx,
          y: y + (r + 0.5) * gridSizePx
        });
      }
    }

    return {
      x,
      y,
      wPx,
      hPx,
      centerX,
      centerY,
      widthBlocks,
      heightBlocks,
      gridSizePx,
      gridDistFt,
      occupiedCenters
    };
  }

  /**
   * Measure the exact edge-to-edge distance in feet between two tokens on the active canvas,
   * obeying Foundry V13's `canvas.grid.measurePath` and the scene's configured diagonal rule
   * (5-5-5 Equidistant, 5-10-5 Alternating, or Euclidean).
   */
  static measureTokenDistanceFt(tokenA, tokenB, positionOverrides = null) {
    if (!tokenA || !tokenB || !canvas?.ready || !canvas?.scene) return null;
    const boundsA = this.getTokenDestinationBounds(tokenA, positionOverrides);
    const boundsB = this.getTokenDestinationBounds(tokenB, positionOverrides);
    if (!boundsA || !boundsB) return null;

    if (
      (tokenA.id && tokenA.id === tokenB.id) ||
      (tokenA.document?.id && tokenA.document.id === tokenB.document?.id)
    ) {
      return 0;
    }

    // Use Foundry V13's native grid path measurement across occupied squares when on a gridded scene
    const isGridless = canvas.grid?.type === CONST.GRID_TYPES?.GRIDLESS;
    if (!isGridless && typeof canvas.grid?.measurePath === "function") {
      let minDistanceFt = Infinity;
      for (const ptA of boundsA.occupiedCenters) {
        for (const ptB of boundsB.occupiedCenters) {
          try {
            const res = canvas.grid.measurePath([ptA, ptB]);
            const d = Number(res?.distance ?? NaN);
            if (Number.isFinite(d) && d < minDistanceFt) {
              minDistanceFt = d;
            }
          } catch (_e) {
            // fallback below
          }
        }
      }
      if (Number.isFinite(minDistanceFt)) {
        return Math.round(minDistanceFt);
      }
    }

    // Fallback: Euclidean edge-to-edge distance
    const pxPerFoot = boundsA.gridSizePx / boundsA.gridDistFt;
    const radAPx = ((boundsA.widthBlocks - 1) * boundsA.gridSizePx) / 2;
    const radBPx = ((boundsB.widthBlocks - 1) * boundsA.gridSizePx) / 2;
    const centerDistPx = Math.hypot(boundsA.centerX - boundsB.centerX, boundsA.centerY - boundsB.centerY);
    const effectiveDistPx = Math.max(0, centerDistPx - radAPx - radBPx);
    return Math.round(effectiveDistPx / pxPerFoot);
  }

  /**
   * Return all tokens on the active canvas that are currently within `radiusFt` feet of `casterTokenOrActor`.
   */
  static getTokensInAura(
    casterTokenOrActor,
    radiusFt = 15,
    {
      excludeSelf = true,
      excludeHidden = true,
      excludeTokenIds = [],
      excludeActorIds = [],
      predicate = null,
      positionOverrides = null
    } = {}
  ) {
    if (!canvas?.ready || !canvas?.tokens?.placeables) return [];

    let casterToken = null;
    if (casterTokenOrActor?.documentName === "Actor" || casterTokenOrActor instanceof Actor) {
      casterToken =
        canvas.tokens.placeables.find(t => t.actor?.uuid === casterTokenOrActor.uuid) ||
        canvas.tokens.placeables.find(t => t.actor?.id === casterTokenOrActor.id) ||
        canvas.tokens.placeables.find(
          t => t.name?.trim().toLowerCase() === casterTokenOrActor.name?.trim().toLowerCase()
        ) ||
        null;
    } else if (casterTokenOrActor?.object) {
      casterToken = casterTokenOrActor.object;
    } else {
      casterToken = casterTokenOrActor;
    }

    if (!casterToken) return [];
    const casterTokenId = casterToken.id || casterToken.document?.id;
    const casterActorUuid = casterToken.actor?.uuid;
    const results = [];

    for (const tok of canvas.tokens.placeables) {
      if (!tok?.actor) continue;
      if (excludeHidden && tok.document?.hidden) continue;
      if (excludeSelf && (tok.id === casterTokenId || (casterActorUuid && tok.actor.uuid === casterActorUuid))) continue;
      if (excludeTokenIds.includes(tok.id)) continue;
      if (excludeActorIds.includes(tok.actor.id)) continue;

      const distFt = this.measureTokenDistanceFt(casterToken, tok, positionOverrides);
      if (distFt === null || distFt > radiusFt) continue;
      if (typeof predicate === "function" && !predicate(tok, tok.actor, distFt)) continue;

      results.push({
        token: tok,
        actor: tok.actor,
        distanceFt: distFt
      });
    }

    results.sort((a, b) => a.distanceFt - b.distanceFt);
    return results;
  }

  /**
   * Inspect an Actor and return all active aura configurations currently on it
   * (from ActiveEffects with `coriaAura`, `isSpiritGuardiansCaster`, `isSpiritShroudEffect`, or custom registrations).
   */
  static getActiveAurasForToken(token) {
    const actor = token?.actor;
    if (!actor) return [];

    const aurasMap = new Map();

    // 1. Check ActiveEffects on the actor
    for (const eff of actor.effects || []) {
      if (eff.disabled || eff.isSuppressed) continue;
      const flags = eff.flags?.[MODULE_ID] || {};
      const effNameLower = String(eff.name || "").trim().toLowerCase();

      // Never treat a Concentration marker effect itself as an aura
      if (effNameLower.startsWith("concentrating") || eff.statuses?.has?.("concentrating")) continue;

      if (flags.coriaAura?.enabled) {
        const cfg = this.buildAuraFlag(flags.coriaAura);
        aurasMap.set(cfg.auraId, cfg);
        continue;
      }

      // Automatic support for Spirit Guardians caster effect
      if (
        flags.isSpiritGuardiansCaster ||
        eff.statuses?.has?.("spirit-guardians-caster") ||
        flags.statusId === "spirit-guardians-caster"
      ) {
        const dmgType = String(flags.damageType || (effNameLower.includes("necrotic") ? "necrotic" : "radiant")).toLowerCase();
        const cfg = this.buildAuraFlag({
          auraId: "spirit-guardians",
          label: `Spirit Guardians (15 ft)`,
          radiusFt: 15,
          style: dmgType === "necrotic" ? "necrotic" : "sunburst",
          showGridHighlight: true,
          showCircularBorder: true
        });
        aurasMap.set(cfg.auraId, cfg);
        continue;
      }

      // Automatic support for Spirit Shroud caster effect (10 ft aura)
      if (
        flags.isSpiritShroudEffect ||
        eff.statuses?.has?.("spirit-shroud") ||
        flags.statusId === "spirit-shroud"
      ) {
        const dmgType = String(
          flags.damageType ||
            (effNameLower.includes("necrotic") ? "necrotic" : effNameLower.includes("cold") ? "cold" : "radiant")
        ).toLowerCase();
        const style = dmgType === "necrotic" ? "necrotic" : dmgType === "cold" ? "frost" : "sunburst";
        const cfg = this.buildAuraFlag({
          auraId: "spirit-shroud",
          label: `Spirit Shroud (10 ft)`,
          radiusFt: 10,
          style,
          opacity: 0.65,
          showGridHighlight: true,
          showCircularBorder: true
        });
        aurasMap.set(cfg.auraId, cfg);
      }
    }

    // 2. Check programmatic custom auras registered on actor.id or token.id
    for (const key of [actor.id, token.id]) {
      const customMap = this._customAuras.get(key);
      if (customMap) {
        for (const [id, cfg] of customMap.entries()) {
          aurasMap.set(id, cfg);
        }
      }
    }

    return Array.from(aurasMap.values());
  }

  /* -------------------------------------------- */
  /*  PIXI / WebGL Visual Rendering Engine        */
  /* -------------------------------------------- */

  /**
   * Resolve a valid PIXI.Container on the active Foundry V13 canvas to host aura visuals.
   * Note: In Foundry V13, `canvas.grid` is a `BaseGrid` (`SquareGrid`) math instance, NOT a PIXI.Container!
   * We attach to `canvas.interface.grid` or `canvas.interface` or `canvas.primary` (verified via `typeof layer.addChild === "function"`).
   */
  static _ensureRootContainer() {
    if (!canvas?.ready) return null;

    const candidates = [
      canvas.interface?.grid,
      canvas.interface,
      canvas.tokens,
      canvas.primary,
      canvas.stage
    ];
    const parentLayer = candidates.find(layer => layer && typeof layer.addChild === "function" && !layer.destroyed);
    if (!parentLayer) return null;

    if (!this._rootContainer || this._rootContainer.destroyed || this._rootContainer.parent !== parentLayer) {
      if (this._rootContainer && !this._rootContainer.destroyed) {
        try {
          this._rootContainer.destroy({ children: true });
        } catch (_e) {
          // ignore
        }
      }
      const c = new PIXI.Container();
      c.name = "CoriaAuraEngineRoot";
      c.eventMode = "none";
      c.interactiveChildren = false;
      c.zIndex = -5;
      try {
        if (parentLayer === canvas.interface && typeof parentLayer.addChildAt === "function") {
          parentLayer.addChildAt(c, 0);
        } else {
          parentLayer.addChild(c);
        }
      } catch (err) {
        console.warn("[CoriaAuraEngine] Could not attach root container to canvas layer:", err);
        return null;
      }
      this._rootContainer = c;
    }
    return this._rootContainer;
  }

  /**
   * Synchronize all token aura visuals on the current canvas.
   * Completely exception-safe so it can never interrupt Foundry document/canvas hooks.
   */
  static syncAllSceneAuras() {
    try {
      if (!canvas?.ready || !canvas?.tokens?.placeables) return;
      const root = this._ensureRootContainer();
      if (!root) return;

      const activeTokenIds = new Set();

      for (const token of canvas.tokens.placeables) {
        if (!token || token.destroyed || token.document?.hidden || !token.visible) continue;
        const auras = this.getActiveAurasForToken(token);
        if (auras.length === 0) continue;

        activeTokenIds.add(token.id);
        this._syncTokenAuraVisuals(token, auras, root);
      }

      // Clean up visuals for tokens that no longer have any active auras or were removed
      for (const [tokenId, auraMap] of this._visualsByToken.entries()) {
        if (!activeTokenIds.has(tokenId)) {
          for (const vis of auraMap.values()) {
            this._destroyAuraVisual(vis);
          }
          this._visualsByToken.delete(tokenId);
        }
      }
    } catch (err) {
      console.warn("[CoriaAuraEngine] Error in syncAllSceneAuras:", err);
    }
  }

  static _syncTokenAuraVisuals(token, auras, root) {
    if (!this._visualsByToken.has(token.id)) {
      this._visualsByToken.set(token.id, new Map());
    }
    const tokenAuraMap = this._visualsByToken.get(token.id);
    const wantedIds = new Set(auras.map(a => a.auraId));

    // Remove auras that ended on this token
    for (const [auraId, vis] of tokenAuraMap.entries()) {
      if (!wantedIds.has(auraId)) {
        this._destroyAuraVisual(vis);
        tokenAuraMap.delete(auraId);
      }
    }

    // Create or update active auras on this token
    for (const cfg of auras) {
      const signature = JSON.stringify({
        r: cfg.radiusFt,
        s: cfg.styleIndex,
        p: cfg.primaryColor,
        sec: cfg.secondaryColor,
        b: cfg.borderColor,
        o: cfg.opacity,
        w: token.document?.width || 1,
        h: token.document?.height || 1
      });

      let vis = tokenAuraMap.get(cfg.auraId);
      if (vis && vis.signature !== signature) {
        this._destroyAuraVisual(vis);
        vis = null;
      }

      if (!vis) {
        vis = this._createAuraVisual(token, cfg, signature, root);
        tokenAuraMap.set(cfg.auraId, vis);
      }

      this._updateAuraVisualPosition(token, vis);
    }
  }

  static _createAuraVisual(token, cfg, signature, root) {
    const container = new PIXI.Container();
    container.name = `CoriaAura_${token.id}_${cfg.auraId}`;
    container.eventMode = "none";
    container.interactiveChildren = false;

    const gridSizePx = Number(canvas.scene?.grid?.size || 100);
    const gridDistFt = Number(canvas.scene?.grid?.distance || 5);
    const pxPerFoot = gridSizePx / gridDistFt;
    const tokenHalfWidthPx = (Number(token.document?.width || 1) * gridSizePx) / 2;
    const totalRadiusPx = cfg.radiusFt * pxPerFoot + tokenHalfWidthPx;
    const baseOpacity = Math.clamp(Number(cfg.opacity ?? 0.75), 0.25, 1.0);

    // 1. Base Layer: Soft Radial Glow Bands + D&D 5e Grid Footprint Cells + Crisp Double Border
    const baseGraphics = new PIXI.Graphics();
    this._drawStaticAuraBase(baseGraphics, token, cfg, tokenHalfWidthPx, totalRadiusPx, gridSizePx, gridDistFt, baseOpacity);
    container.addChild(baseGraphics);

    // 2. Clockwise Rotating Layer: Celestial Sunburst Rays / Necrotic Spiral Vortex / Crystalline Lattice
    const spinClockwise = new PIXI.Graphics();
    this._drawRotatingPattern(spinClockwise, cfg, tokenHalfWidthPx, totalRadiusPx, baseOpacity, true);
    container.addChild(spinClockwise);

    // 3. Counter-Clockwise Rotating Layer: Secondary Sacred Geometry / Spectral Undertow
    const spinCounter = new PIXI.Graphics();
    this._drawRotatingPattern(spinCounter, cfg, tokenHalfWidthPx, totalRadiusPx, baseOpacity, false);
    container.addChild(spinCounter);

    // 4. Harmonic Expanding Wave Layer (animated every frame in ticker)
    const pulseRingGraphics = new PIXI.Graphics();
    container.addChild(pulseRingGraphics);

    // 5. Register 60 FPS Ticker callback for smooth rotation, breathing glow, and harmonic wave rings
    const startTime = performance.now();
    const tickerFn = () => {
      try {
        if (container.destroyed || !canvas?.ready) return;
        if (!token || token.destroyed || token.document?.hidden || !token.visible) {
          container.visible = false;
          return;
        }
        container.visible = true;

        // Keep locked to token's exact visual frame coordinates at 60 FPS
        const cx = Number(token.x || 0) + Number(token.w || gridSizePx) / 2;
        const cy = Number(token.y || 0) + Number(token.h || gridSizePx) / 2;
        container.position.set(cx, cy);

        const elapsedSec = (performance.now() - startTime) / 1000;

        // Smooth counter-rotations (zero geometry rebuild cost!)
        spinClockwise.rotation = elapsedSec * 0.38;
        spinCounter.rotation = -elapsedSec * 0.26;
        spinClockwise.alpha = 0.78 + 0.22 * Math.sin(elapsedSec * 2.1);
        spinCounter.alpha = 0.72 + 0.25 * Math.cos(elapsedSec * 1.7);

        // Dual staggered expanding harmonic waves
        pulseRingGraphics.clear();
        const span = Math.max(10, totalRadiusPx - tokenHalfWidthPx);
        for (const offset of [0, 0.5]) {
          const phase = (elapsedSec * 0.38 + offset) % 1;
          const waveRadius = tokenHalfWidthPx + phase * span;
          const waveAlpha = Math.sin(phase * Math.PI) * 0.45 * baseOpacity;
          pulseRingGraphics.lineStyle(2.2, cfg.borderColor, waveAlpha);
          pulseRingGraphics.drawCircle(0, 0, waveRadius);
        }
      } catch (_e) {
        // ignore frame error
      }
    };

    if (canvas?.app?.ticker) {
      canvas.app.ticker.add(tickerFn);
    }

    root.addChild(container);
    this._updateAuraVisualPosition(token, { container });

    return {
      auraId: cfg.auraId,
      signature,
      container,
      baseGraphics,
      spinClockwise,
      spinCounter,
      pulseRingGraphics,
      tickerFn
    };
  }

  /**
   * Draw the static aura radial glow, D&D 5e grid-footprint cells covered by the aura,
   * and the crisp outer circular boundary.
   */
  static _drawStaticAuraBase(g, token, cfg, tokenHalfWidthPx, totalRadiusPx, gridSizePx, gridDistFt, baseOpacity) {
    g.clear();

    // A. Concentric radial glow bands from inner token edge out to totalRadiusPx
    const steps = 10;
    const span = Math.max(10, totalRadiusPx - tokenHalfWidthPx);
    for (let i = steps; i >= 1; i--) {
      const ratio = i / steps;
      const r = tokenHalfWidthPx + span * ratio;
      const color = i % 2 === 0 ? cfg.primaryColor : cfg.secondaryColor;
      const bandAlpha = (0.028 + 0.018 * (1 - ratio)) * baseOpacity;
      g.beginFill(color, bandAlpha);
      g.drawCircle(0, 0, r);
      g.endFill();
    }

    // Soft glowing rim band just inside the outer boundary
    g.lineStyle(10, cfg.primaryColor, 0.16 * baseOpacity);
    g.drawCircle(0, 0, Math.max(10, totalRadiusPx - 6));

    // B. Grid-cell highlights showing exact D&D 5e grid squares inside the aura
    const isGridless = canvas.grid?.type === CONST.GRID_TYPES?.GRIDLESS;
    if (cfg.showGridHighlight && !isGridless && typeof canvas.grid?.measurePath === "function") {
      const wBlocks = Math.max(1, Math.round(Number(token.document?.width || 1)));
      const hBlocks = Math.max(1, Math.round(Number(token.document?.height || 1)));
      const maxSteps = Math.ceil(cfg.radiusFt / gridDistFt) + 1;

      const localTokenCenters = [];
      const startX = -(wBlocks * gridSizePx) / 2;
      const startY = -(hBlocks * gridSizePx) / 2;
      for (let r = 0; r < hBlocks; r++) {
        for (let c = 0; c < wBlocks; c++) {
          localTokenCenters.push({
            x: startX + (c + 0.5) * gridSizePx,
            y: startY + (r + 0.5) * gridSizePx
          });
        }
      }

      const baseWorldX = Number(token.document?._source?.x ?? token.document?.x ?? 0);
      const baseWorldY = Number(token.document?._source?.y ?? token.document?.y ?? 0);
      const worldCenterX = baseWorldX + (wBlocks * gridSizePx) / 2;
      const worldCenterY = baseWorldY + (hBlocks * gridSizePx) / 2;

      for (let dr = -maxSteps; dr < hBlocks + maxSteps; dr++) {
        for (let dc = -maxSteps; dc < wBlocks + maxSteps; dc++) {
          if (dr >= 0 && dr < hBlocks && dc >= 0 && dc < wBlocks) continue;

          const cellLocalX = startX + dc * gridSizePx;
          const cellLocalY = startY + dr * gridSizePx;
          const cellCenterWorld = {
            x: worldCenterX + cellLocalX + gridSizePx / 2,
            y: worldCenterY + cellLocalY + gridSizePx / 2
          };

          let minDist = Infinity;
          for (const lc of localTokenCenters) {
            const originWorld = { x: worldCenterX + lc.x, y: worldCenterY + lc.y };
            try {
              const res = canvas.grid.measurePath([originWorld, cellCenterWorld]);
              const d = Number(res?.distance ?? Infinity);
              if (d < minDist) minDist = d;
            } catch (_e) {
              // ignore
            }
          }

          if (minDist <= cfg.radiusFt) {
            g.lineStyle(1.4, cfg.borderColor, 0.28 * baseOpacity);
            g.beginFill(cfg.primaryColor, 0.045 * baseOpacity);
            g.drawRoundedRect(cellLocalX + 3, cellLocalY + 3, gridSizePx - 6, gridSizePx - 6, 8);
            g.endFill();
          }
        }
      }
    }

    // C. Crisp outer circular boundary
    if (cfg.showCircularBorder !== false) {
      g.lineStyle(3, cfg.borderColor, 0.9 * baseOpacity);
      g.drawCircle(0, 0, totalRadiusPx);
      g.lineStyle(1.2, 0xffffff, 0.45 * baseOpacity);
      g.drawCircle(0, 0, Math.max(4, totalRadiusPx - 4));
    }
  }

  /**
   * Draw rotating procedural aura geometry according to `cfg.styleIndex`:
   *   0 = Sunburst / Radiant (Golden solar beams + celestial rune arcs)
   *   1 = Necrotic (Dark violet-amethyst vortex tendrils + spectral arcs)
   *   2 = Frost / Cold (Crystalline 6-pointed star lattice + frost chevrons)
   *   3+ = Arcane / Emerald (8-pointed arcane sigil ring + resonance spokes)
   */
  static _drawRotatingPattern(g, cfg, innerR, outerR, baseOpacity, isClockwise) {
    g.clear();
    const styleIdx = Number(cfg.styleIndex ?? 0);
    const r0 = Math.max(12, innerR * 0.95);
    const r1 = Math.max(r0 + 20, outerR - 6);
    const midR = (r0 + r1) / 2;

    if (styleIdx === 0) {
      // 0: Sunburst / Radiant
      const rayCount = isClockwise ? 12 : 8;
      const spread = isClockwise ? 0.11 : 0.08;
      const color = isClockwise ? cfg.primaryColor : cfg.secondaryColor;
      const alpha = (isClockwise ? 0.16 : 0.12) * baseOpacity;

      for (let i = 0; i < rayCount; i++) {
        const a = (i * Math.PI * 2) / rayCount;
        g.beginFill(color, alpha);
        g.moveTo(Math.cos(a - spread) * r0, Math.sin(a - spread) * r0);
        g.lineTo(Math.cos(a) * r1, Math.sin(a) * r1);
        g.lineTo(Math.cos(a + spread) * r0, Math.sin(a + spread) * r0);
        g.closePath();
        g.endFill();

        // Segmented celestial arc along mid/outer ring
        g.lineStyle(2, cfg.borderColor, 0.35 * baseOpacity);
        const arcR = isClockwise ? r1 - 10 : midR;
        g.arc(0, 0, arcR, a - spread * 1.4, a + spread * 1.4);
      }
    } else if (styleIdx === 1) {
      // 1: Necrotic / Swirling Vortex
      const armCount = isClockwise ? 8 : 6;
      const twist = isClockwise ? 0.65 : -0.5;
      const color = isClockwise ? cfg.primaryColor : cfg.borderColor;
      const alpha = (isClockwise ? 0.18 : 0.12) * baseOpacity;

      for (let i = 0; i < armCount; i++) {
        const a = (i * Math.PI * 2) / armCount;
        const aMid = a + twist * 0.5;
        const aTip = a + twist;
        g.beginFill(color, alpha);
        g.moveTo(Math.cos(a - 0.14) * r0, Math.sin(a - 0.14) * r0);
        g.quadraticCurveTo(
          Math.cos(aMid - 0.1) * midR,
          Math.sin(aMid - 0.1) * midR,
          Math.cos(aTip) * r1,
          Math.sin(aTip) * r1
        );
        g.quadraticCurveTo(
          Math.cos(aMid + 0.1) * midR,
          Math.sin(aMid + 0.1) * midR,
          Math.cos(a + 0.14) * r0,
          Math.sin(a + 0.14) * r0
        );
        g.closePath();
        g.endFill();

        g.lineStyle(1.8, cfg.borderColor, 0.32 * baseOpacity);
        g.arc(0, 0, isClockwise ? midR : r1 - 12, a, a + 0.35);
      }
    } else if (styleIdx === 2) {
      // 2: Frost / Crystalline Lattice
      const points = 6;
      const color = isClockwise ? cfg.primaryColor : cfg.borderColor;
      g.lineStyle(2, color, 0.32 * baseOpacity);
      for (let i = 0; i < points; i++) {
        const a1 = (i * Math.PI * 2) / points;
        const a2 = (((i + 2) % points) * Math.PI * 2) / points;
        const rad = isClockwise ? r1 - 8 : midR;
        g.moveTo(Math.cos(a1) * rad, Math.sin(a1) * rad);
        g.lineTo(Math.cos(a2) * rad, Math.sin(a2) * rad);
      }
    } else {
      // 3+: Arcane / Emerald Sigil
      const spokes = 8;
      g.lineStyle(2, cfg.borderColor, 0.3 * baseOpacity);
      for (let i = 0; i < spokes; i++) {
        const a = (i * Math.PI * 2) / spokes;
        g.moveTo(Math.cos(a) * r0, Math.sin(a) * r0);
        g.lineTo(Math.cos(a) * (r1 - 6), Math.sin(a) * (r1 - 6));
      }
    }
  }

  static _updateAuraVisualPosition(token, vis) {
    if (!vis?.container || vis.container.destroyed || !token) return;
    const gridSizePx = Number(canvas.scene?.grid?.size || 100);
    const cx = Number(token.x || 0) + Number(token.w || gridSizePx) / 2;
    const cy = Number(token.y || 0) + Number(token.h || gridSizePx) / 2;
    vis.container.position.set(cx, cy);
  }

  static _destroyAuraVisual(vis) {
    if (!vis) return;
    if (vis.tickerFn && canvas?.app?.ticker) {
      try {
        canvas.app.ticker.remove(vis.tickerFn);
      } catch (_e) {
        // ignore
      }
    }
    if (vis.container && !vis.container.destroyed) {
      try {
        vis.container.destroy({ children: true });
      } catch (_e) {
        // ignore
      }
    }
  }

  /* -------------------------------------------- */
  /*  Hooks Registration                          */
  /* -------------------------------------------- */

  static _registerCanvasAndDocumentHooks() {
    Hooks.on("canvasReady", () => {
      this._visualsByToken.clear();
      this._rootContainer = null;
      this.syncAllSceneAuras();
    });

    Hooks.on("canvasTearDown", () => {
      for (const auraMap of this._visualsByToken.values()) {
        for (const vis of auraMap.values()) {
          this._destroyAuraVisual(vis);
        }
      }
      this._visualsByToken.clear();
      this._rootContainer = null;
    });

    // Real-time 60 FPS position sync during token drag & movement animations
    Hooks.on("refreshToken", token => {
      const auraMap = this._visualsByToken.get(token?.id);
      if (auraMap) {
        for (const vis of auraMap.values()) {
          this._updateAuraVisualPosition(token, vis);
        }
      }
    });

    Hooks.on("createToken", () => this.syncAllSceneAuras());
    Hooks.on("updateToken", (_tokenDoc, changed) => {
      if ("hidden" in changed || "width" in changed || "height" in changed || "x" in changed || "y" in changed) {
        this.syncAllSceneAuras();
      }
    });
    Hooks.on("moveToken", () => this.syncAllSceneAuras());
    Hooks.on("deleteToken", tokenDoc => {
      const auraMap = this._visualsByToken.get(tokenDoc?.id);
      if (auraMap) {
        for (const vis of auraMap.values()) {
          this._destroyAuraVisual(vis);
        }
        this._visualsByToken.delete(tokenDoc.id);
      }
    });

    Hooks.on("createActiveEffect", () => this.syncAllSceneAuras());
    Hooks.on("updateActiveEffect", () => this.syncAllSceneAuras());
    Hooks.on("deleteActiveEffect", () => this.syncAllSceneAuras());
  }
}
