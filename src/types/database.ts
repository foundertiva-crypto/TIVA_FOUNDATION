// ── Database type definitions mirroring Supabase schema ──────

export type UserRole = "user" | "admin";
export type KycStatus = "pending" | "approved" | "rejected";
export type ReferralStatus = "pending" | "valid" | "invalid";
export type ChallengeStatus = "active" | "completed" | "expired" | "paused";
export type RewardType = "credits" | "cash" | "cash_badge";

// ── Profiles ──────────────────────────────────────────────────
export interface Profile {
    id: string;
    phone: string;
    full_name: string | null;
    avatar_url: string | null;
    referral_code: string;
    referred_by: string | null;
    device_fingerprint: string | null;
    role: UserRole;
    is_flagged: boolean;
    created_at: string;
    updated_at: string;
}

// ── KYC Documents ─────────────────────────────────────────────
export interface KycDocument {
    id: string;
    user_id: string;
    document_type: string;
    document_url: string;
    status: KycStatus;
    admin_notes: string | null;
    reviewed_by: string | null;
    reviewed_at: string | null;
    created_at: string;
    updated_at: string;
}

// ── Referrals ─────────────────────────────────────────────────
export interface Referral {
    id: string;
    referrer_id: string;
    referred_id: string;
    status: ReferralStatus;
    otp_verified: boolean;
    kyc_approved: boolean;
    deposit_completed: boolean;
    device_unique: boolean;
    challenge_id: string | null;
    created_at: string;
    updated_at: string;
}

// ── Challenges (template) ─────────────────────────────────────
export interface Challenge {
    id: string;
    title: string;
    target_referrals: number;
    duration_hours: number;
    cooldown_hours: number;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

// ── User Challenge Instances ──────────────────────────────────
export interface UserChallenge {
    id: string;
    user_id: string;
    challenge_id: string;
    started_at: string;
    ends_at: string;
    valid_referrals: number;
    status: ChallengeStatus;
    created_at: string;
    updated_at: string;
}

// ── Deposits ──────────────────────────────────────────────────
export interface Deposit {
    id: string;
    user_id: string;
    razorpay_payment_id: string;
    razorpay_order_id: string | null;
    amount: number;
    currency: string;
    status: string;
    created_at: string;
}

// ── Rewards ───────────────────────────────────────────────────
export interface Reward {
    id: string;
    threshold: number;
    label: string;
    amount: number;
    reward_type: RewardType;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

// ── Reward Claims ─────────────────────────────────────────────
export interface RewardClaim {
    id: string;
    user_id: string;
    reward_id: string;
    user_challenge_id: string;
    claimed_at: string;
}

// ── Extended types for UI ─────────────────────────────────────
export interface ReferralWithProfile extends Referral {
    referred_profile?: Pick<Profile, "id" | "phone" | "full_name">;
}

export interface UserChallengeWithDetails extends UserChallenge {
    challenge?: Challenge;
    profile?: Pick<Profile, "id" | "full_name" | "referral_code">;
}

export interface LeaderboardEntry {
    user_id: string;
    full_name: string | null;
    valid_referrals: number;
    rank: number;
}
