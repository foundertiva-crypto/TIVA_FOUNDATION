// ── Reward Tiers ──────────────────────────────────────────────
export const REWARD_TIERS = [
    { threshold: 25, label: "Bonus Credits", amount: 0, type: "credits" as const },
    { threshold: 50, label: "₹100 Reward", amount: 100, type: "cash" as const },
    { threshold: 75, label: "₹250 Reward", amount: 250, type: "cash" as const },
    { threshold: 100, label: "₹500 + Badge", amount: 500, type: "cash_badge" as const },
] as const;

// ── Challenge Config ──────────────────────────────────────────
export const CHALLENGE_CONFIG = {
    /** Duration in milliseconds (24 hours) */
    DURATION_MS: 24 * 60 * 60 * 1000,
    /** Target number of valid referrals */
    TARGET_REFERRALS: 100,
    /** Cooldown before restart (in milliseconds — 1 hour) */
    COOLDOWN_MS: 1 * 60 * 60 * 1000,
} as const;

// ── KYC Status ────────────────────────────────────────────────
export const KYC_STATUS = {
    PENDING: "pending",
    APPROVED: "approved",
    REJECTED: "rejected",
} as const;

// ── Referral Status ───────────────────────────────────────────
export const REFERRAL_STATUS = {
    PENDING: "pending",
    VALID: "valid",
    INVALID: "invalid",
} as const;

// ── Challenge Status ──────────────────────────────────────────
export const CHALLENGE_STATUS = {
    ACTIVE: "active",
    COMPLETED: "completed",
    EXPIRED: "expired",
    PAUSED: "paused",
} as const;

// ── User Roles ────────────────────────────────────────────────
export const USER_ROLES = {
    USER: "user",
    ADMIN: "admin",
} as const;
