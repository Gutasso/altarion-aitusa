/**
 * CoriaSyncGuard — Centralized Backup Actor Exclusion & Single-Authority Auto-Sync Protection
 *
 * 1. Excludes all Backup sheets (`Aitusa_Bakcup`, `Altarion_Backup`, `Flinn_Backup`, `Parva_Backup`,
 *    `Kyrion_Backup`, and any actor ending with / containing `_backup` or `_bakcup`) from ALL module
 *    automations, syncs, UI decorators, auras, roll-ledger hooks, and attunement slots.
 *
 * 2. Prevents cross-client recursive sync storms when a player joins the GM's Foundry session:
 *    - Document lifecycle hooks (`createActor`, `updateActor`, `createItem`, `updateItem`, `deleteItem`)
 *      only fire on the client that initiated the change (`hookUserId === game.user.id`).
 *    - Whenever an active GM is connected (`game.users?.activeGM`), ONLY that single active GM runs
 *      background automatic synchronization (`ready`, sheet open, class sync, JSON sync).
 *    - Connected players never push background sync writes onto the GM's world!
 */

const EXACT_BACKUP_ACTOR_NAMES = new Set([
  "aitusa_bakcup",
  "aitusa_backup",
  "altarion_backup",
  "altarion_bakcup",
  "flinn_backup",
  "flinn_bakcup",
  "parva_backup",
  "parva_bakcup",
  "kyrion_backup",
  "kyrion_bakcup"
]);

/**
 * Returns true if the given Actor (or actor name string) is a saved Backup sheet that must be
 * completely ignored by ALL module automations and synchronizers.
 */
export function isIgnoredBackupActor(actorOrName) {
  const raw = typeof actorOrName === "string" ? actorOrName : actorOrName?.name;
  const norm = String(raw || "").trim().toLowerCase();
  if (!norm) return false;
  if (EXACT_BACKUP_ACTOR_NAMES.has(norm)) return true;
  if (/(?:_|\s|-|\()(?:backup|bakcup)(?:\b|_|\)|$)/i.test(norm)) return true;
  return false;
}

/**
 * Reconcile Foundry User <-> Character assignments & Actor ownerships on the active GM client:
 * - Completely UNLINKS all Backup sheets (`Altarion_Backup`, `Aitusa_Backup` / `Aitusa_Bakcup`,
 *   `Parva_Backup`, `Kyrion_Backup`, `Flinn_Backup`, etc.) from ALL non-GM player users
 *   (clears `user.character` if pointing to a Backup, sets Backup actor ownership to NONE for players).
 * - Strictly binds each player user to their exact live character(s):
 *   - User "Altarion" -> Primary: `Altarion Talendris`, Owner of: `Altarion Talendris` & `Aitusa`
 *   - User "Parva"    -> Primary: `Parva`, Owner of: `Parva`
 *   - User "Kyrion"   -> Primary: `Kyrion`, Owner of: `Kyrion`
 *   - User "Flinn"    -> Primary: `Flinn Encantor`, Owner of: `Flinn Encantor`
 */
export async function reconcilePartyUserAssignments({ silent = true } = {}) {
  if (!game?.user?.isGM || !game?.users || !game?.actors) return { changed: false };
  const activeGM = game.users.activeGM;
  if (activeGM && activeGM.id !== game.user.id) return { changed: false };

  const OWNER = CONST.DOCUMENT_OWNERSHIP_LEVELS?.OWNER ?? 3;
  const NONE = CONST.DOCUMENT_OWNERSHIP_LEVELS?.NONE ?? 0;

  const findLiveActor = (exactNames = [], prefix = "") => {
    const liveActors = Array.from(game.actors).filter(a => a && !isIgnoredBackupActor(a));
    for (const exact of exactNames) {
      const hit = liveActors.find(a => String(a.name || "").trim().toLowerCase() === exact);
      if (hit) return hit;
    }
    if (prefix) {
      return (
        liveActors.find(a => String(a.name || "").trim().toLowerCase().startsWith(prefix)) ||
        null
      );
    }
    return null;
  };

  const findPlayerUser = (exactName) => {
    const players = Array.from(game.users).filter(u => u && !u.isGM);
    return (
      players.find(u => String(u.name || "").trim().toLowerCase() === exactName) ||
      players.find(u => String(u.name || "").trim().toLowerCase().startsWith(`${exactName} `)) ||
      null
    );
  };

  const altarionActor = findLiveActor(["altarion talendris", "altarion"], "altarion ");
  const aitusaActor = findLiveActor(["aitusa"], "aitusa ");
  const parvaActor = findLiveActor(["parva"], "parva ");
  const kyrionActor = findLiveActor(["kyrion"], "kyrion ");
  const flinnActor = findLiveActor(["flinn encantor", "flinn"], "flinn ");

  const bindings = [
    {
      userKey: "altarion",
      user: findPlayerUser("altarion"),
      primaryActor: altarionActor,
      ownedActors: [altarionActor, aitusaActor].filter(Boolean)
    },
    {
      userKey: "parva",
      user: findPlayerUser("parva"),
      primaryActor: parvaActor,
      ownedActors: [parvaActor].filter(Boolean)
    },
    {
      userKey: "kyrion",
      user: findPlayerUser("kyrion"),
      primaryActor: kyrionActor,
      ownedActors: [kyrionActor].filter(Boolean)
    },
    {
      userKey: "flinn",
      user: findPlayerUser("flinn"),
      primaryActor: flinnActor,
      ownedActors: [flinnActor].filter(Boolean)
    }
  ];

  const nonGmUsers = Array.from(game.users).filter(u => u && !u.isGM);
  let changesCount = 0;

  // 1. Completely unlink ALL Backup actors from non-GM users (remove ownership & default owner!)
  for (const actor of game.actors) {
    if (!isIgnoredBackupActor(actor)) continue;
    const curOwnership = foundry.utils.deepClone(actor.ownership || {});
    let dirty = false;

    if (Number(curOwnership.default ?? 0) > NONE) {
      curOwnership.default = NONE;
      dirty = true;
    }
    for (const u of nonGmUsers) {
      if (u.id in curOwnership && Number(curOwnership[u.id]) !== NONE) {
        curOwnership[u.id] = NONE;
        dirty = true;
      }
    }
    if (dirty) {
      try {
        await actor.update({ ownership: curOwnership });
        changesCount++;
      } catch (err) {
        console.warn(`[CoriaSyncGuard] Could not unlink backup actor ${actor.name}:`, err);
      }
    }
  }

  // 2. Bind each of the 4 player users strictly to their real live character(s)
  const boundUserIds = new Set();
  for (const b of bindings) {
    if (!b.user) continue;
    boundUserIds.add(b.user.id);

    // 2a. Ensure primary `user.character` points to their live character (never a Backup!)
    if (b.primaryActor) {
      const curCharId =
        typeof b.user._source?.character === "string"
          ? b.user._source.character
          : b.user.character?.id || "";
      if (curCharId !== b.primaryActor.id) {
        try {
          await b.user.update({ character: b.primaryActor.id });
          changesCount++;
        } catch (err) {
          console.warn(`[CoriaSyncGuard] Could not assign ${b.primaryActor.name} to user ${b.user.name}:`, err);
        }
      }
    }

    // 2b. Ensure OWNER permission on their assigned live actor(s)
    for (const liveActor of b.ownedActors) {
      const curLevel = Number(liveActor.ownership?.[b.user.id] ?? -1);
      if (curLevel !== OWNER) {
        try {
          await liveActor.update({ [`ownership.${b.user.id}`]: OWNER });
          changesCount++;
        } catch (err) {
          console.warn(`[CoriaSyncGuard] Could not set OWNER on ${liveActor.name} for ${b.user.name}:`, err);
        }
      }
    }
  }

  // 3. Safety net: if any other non-GM user's `character` still points to a Backup actor, clear it
  for (const u of nonGmUsers) {
    if (boundUserIds.has(u.id)) continue;
    if (u.character && isIgnoredBackupActor(u.character)) {
      try {
        await u.update({ character: null });
        changesCount++;
      } catch (_e) {}
    }
  }

  if (changesCount > 0) {
    console.log(`[CoriaSyncGuard] Reconciled party user assignments & unlinked Backup actors (${changesCount} update(s)).`);
    if (!silent) {
      ui.notifications?.info?.(
        `[Altarion & Aitusa] Vínculos dos jogadores atualizados e fichas Backup desvinculadas (${changesCount} ajuste(s)).`
      );
    }
  }
  return { changed: changesCount > 0, changesCount };
}

/**
 * Single-Authority Guard for automatic background synchronizations.
 *
 * @param {Actor|null} actor - Optional actor being synchronized.
 * @param {object} [opts]
 * @param {string|null} [opts.hookUserId=null] - The `userId` passed by a Foundry CRUD hook.
 * @param {boolean} [opts.allowPlayerWhenNoGM=true] - Allow owner sync if no GM is online (local solo testing).
 * @returns {boolean}
 */
export function shouldThisClientRunAutoSync(
  actor = null,
  { hookUserId = null, allowPlayerWhenNoGM = true } = {}
) {
  if (!game?.user) return false;
  if (actor && isIgnoredBackupActor(actor)) return false;
  if (actor && !actor.isOwner) return false;

  // Never react to document changes triggered by ANOTHER connected client (kills GM <-> Player ping-pong!)
  if (hookUserId && hookUserId !== game.user.id) return false;

  // When an active GM is connected to the session, ONLY that single active GM runs automatic background syncs.
  // Players joining the GM's table will NEVER trigger automatic sync loops!
  const activeGM = game.users?.activeGM || null;
  if (activeGM) {
    return Boolean(game.user.isGM && activeGM.id === game.user.id);
  }

  // No GM online (solo local testing): allow owner if permitted
  return Boolean(allowPlayerWhenNoGM);
}

// Expose globally for convenience & debugging
globalThis.CoriaSyncGuard = {
  isIgnoredBackupActor,
  shouldThisClientRunAutoSync,
  reconcilePartyUserAssignments
};
