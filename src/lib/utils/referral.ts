import { nanoid } from "../utils/nanoid";

/**
 * Generates a unique referral code for a user.
 * Format: TIVA-XXXXXX (uppercase alphanumeric)
 */
export function generateReferralCode(): string {
    return `TIVA-${nanoid(8).toUpperCase()}`;
}

/**
 * Builds a full referral link from a referral code.
 */
export function buildReferralLink(referralCode: string): string {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    return `${baseUrl}/register?ref=${referralCode}`;
}
