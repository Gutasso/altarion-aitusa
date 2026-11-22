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
  if (/(?:_|\s|-)(?:backup|bakcup)(?:\b|_|$)/i.test(norm)) return true;
  return false;
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
  shouldThisClientRunAutoSync
};
