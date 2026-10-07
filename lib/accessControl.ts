/**
 * Central Access Control Service
 * 
 * Single source of truth for all access-level decisions.
 * Derives all decisions from UserContext state — no network calls.
 */

export type AccessLevel = 'FREE' | 'VIP';
export type UserTier = 'FREE' | 'VIP' | 'ADMIN';

/**
 * Derive the user's tier from their subscription/admin state.
 */
export function getUserTier(params: {
  isPro: boolean | undefined;
  isAdmin: boolean;
}): UserTier {
  if (params.isAdmin) return 'ADMIN';
  if (params.isPro === true) return 'VIP';
  return 'FREE';
}

/**
 * Can the user see the topic in the list?
 * Yes — all users can SEE topics (for navigation).
 * The lock icon / badge is handled by the UI layer.
 */
export function canAccessTopic(_params: {
  topicAccessLevel: AccessLevel;
  userTier: UserTier;
}): boolean {
  // All users can see topic rows (metadata is always visible)
  return true;
}

/**
 * Can the user open the topic and view its content blocks?
 * - ADMIN → always true
 * - VIP   → always true
 * - FREE  → only if the topic is marked FREE
 */
export function canAccessTopicContent(params: {
  topicAccessLevel: AccessLevel;
  userTier: UserTier;
}): boolean {
  if (params.userTier === 'ADMIN') return true;
  if (params.userTier === 'VIP') return true;
  // FREE user
  return params.topicAccessLevel === 'FREE';
}

/**
 * Can the user access paper solutions?
 * Solutions are always VIP-only (no per-paper access level).
 */
export function canAccessPaperSolution(params: {
  userTier: UserTier;
}): boolean {
  return params.userTier === 'ADMIN' || params.userTier === 'VIP';
}

/**
 * Should a topic row show a VIP lock badge?
 * Returns true when the topic is VIP AND the user is FREE.
 */
export function shouldShowTopicLock(params: {
  topicAccessLevel: AccessLevel;
  userTier: UserTier;
}): boolean {
  if (params.userTier === 'ADMIN' || params.userTier === 'VIP') return false;
  return params.topicAccessLevel === 'VIP';
}
