-- ═══════════════════════════════════════════════════════════════
-- Gamified Referral Challenge Platform — Database Schema
-- Run this in your Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── 1. Profiles ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  phone         TEXT UNIQUE NOT NULL,
  full_name     TEXT,
  avatar_url    TEXT,
  referral_code TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(6), 'hex'),
  referred_by   UUID REFERENCES profiles(id),
  device_fingerprint TEXT,
  role          TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  is_flagged    BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_profiles_referral_code ON profiles(referral_code);
CREATE INDEX idx_profiles_referred_by ON profiles(referred_by);
CREATE INDEX idx_profiles_device_fingerprint ON profiles(device_fingerprint);
CREATE INDEX idx_profiles_role ON profiles(role);

-- ── 2. KYC Documents ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS kyc_documents (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL,
  document_url  TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_notes   TEXT,
  reviewed_by   UUID REFERENCES profiles(id),
  reviewed_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_kyc_user_id ON kyc_documents(user_id);
CREATE INDEX idx_kyc_status ON kyc_documents(status);

-- ── 3. Challenges (Templates) ─────────────────────────────────
CREATE TABLE IF NOT EXISTS challenges (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title            TEXT NOT NULL DEFAULT '24-Hour Referral Challenge',
  target_referrals INT NOT NULL DEFAULT 100,
  duration_hours   INT NOT NULL DEFAULT 24,
  cooldown_hours   INT NOT NULL DEFAULT 1,
  is_active        BOOLEAN NOT NULL DEFAULT true,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── 4. User Challenge Instances ───────────────────────────────
CREATE TABLE IF NOT EXISTS user_challenges (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  challenge_id     UUID NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  started_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  ends_at          TIMESTAMPTZ NOT NULL,
  valid_referrals  INT NOT NULL DEFAULT 0,
  status           TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'expired', 'paused')),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_user_challenges_user_id ON user_challenges(user_id);
CREATE INDEX idx_user_challenges_status ON user_challenges(status);
CREATE INDEX idx_user_challenges_ends_at ON user_challenges(ends_at);

-- ── 5. Referrals ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS referrals (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  referrer_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  referred_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status            TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'valid', 'invalid')),
  otp_verified      BOOLEAN NOT NULL DEFAULT false,
  kyc_approved      BOOLEAN NOT NULL DEFAULT false,
  deposit_completed BOOLEAN NOT NULL DEFAULT false,
  device_unique     BOOLEAN NOT NULL DEFAULT false,
  challenge_id      UUID REFERENCES user_challenges(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(referrer_id, referred_id)
);

CREATE INDEX idx_referrals_referrer ON referrals(referrer_id);
CREATE INDEX idx_referrals_referred ON referrals(referred_id);
CREATE INDEX idx_referrals_status ON referrals(status);
CREATE INDEX idx_referrals_challenge ON referrals(challenge_id);

-- ── 6. Deposits ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS deposits (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  razorpay_payment_id TEXT UNIQUE NOT NULL,
  razorpay_order_id   TEXT,
  amount              NUMERIC(10,2) NOT NULL,
  currency            TEXT NOT NULL DEFAULT 'INR',
  status              TEXT NOT NULL DEFAULT 'captured',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_deposits_user_id ON deposits(user_id);

-- ── 7. Rewards (Tier Definitions) ─────────────────────────────
CREATE TABLE IF NOT EXISTS rewards (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  threshold   INT NOT NULL,
  label       TEXT NOT NULL,
  amount      NUMERIC(10,2) NOT NULL DEFAULT 0,
  reward_type TEXT NOT NULL CHECK (reward_type IN ('credits', 'cash', 'cash_badge')),
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── 8. Reward Claims ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reward_claims (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reward_id         UUID NOT NULL REFERENCES rewards(id) ON DELETE CASCADE,
  user_challenge_id UUID NOT NULL REFERENCES user_challenges(id) ON DELETE CASCADE,
  claimed_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, reward_id, user_challenge_id)
);

CREATE INDEX idx_reward_claims_user ON reward_claims(user_id);

-- ── 9. Services (Master Registry) ─────────────────────────────
CREATE TABLE IF NOT EXISTS services (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug          TEXT UNIQUE NOT NULL,
  name          TEXT NOT NULL,
  description   TEXT,
  icon          TEXT,
  gradient      TEXT,
  category      TEXT NOT NULL DEFAULT 'general' CHECK (category IN ('donation', 'finance', 'community', 'verification', 'general')),
  is_active     BOOLEAN NOT NULL DEFAULT false,
  is_featured   BOOLEAN NOT NULL DEFAULT false,
  sort_order    INT NOT NULL DEFAULT 0,
  route_path    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_services_slug ON services(slug);
CREATE INDEX idx_services_active ON services(is_active);
CREATE INDEX idx_services_category ON services(category);

-- ── 10. Donation Subscriptions (Recurring Autopay) ────────────
CREATE TABLE IF NOT EXISTS donation_subscriptions (
  id                       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id                  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  service_id               UUID NOT NULL REFERENCES services(id),
  amount                   NUMERIC(10,2) NOT NULL CHECK (amount >= 10),
  currency                 TEXT NOT NULL DEFAULT 'INR',
  status                   TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'cancelled')),
  razorpay_subscription_id TEXT UNIQUE,
  next_charge_at           TIMESTAMPTZ,
  last_charged_at          TIMESTAMPTZ,
  cancelled_at             TIMESTAMPTZ,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_donation_subs_user ON donation_subscriptions(user_id);
CREATE INDEX idx_donation_subs_service ON donation_subscriptions(service_id);
CREATE INDEX idx_donation_subs_status ON donation_subscriptions(status);

-- ── 11. Donations ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS donations (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  service_id          UUID NOT NULL REFERENCES services(id),
  amount              NUMERIC(10,2) NOT NULL CHECK (amount > 0),
  currency            TEXT NOT NULL DEFAULT 'INR',
  donation_type       TEXT NOT NULL CHECK (donation_type IN ('one-time', 'recurring')),
  tier_label          TEXT,
  payment_id          TEXT UNIQUE,
  payment_status      TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'captured', 'failed', 'refunded')),
  subscription_id     UUID REFERENCES donation_subscriptions(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_donations_user_id ON donations(user_id);
CREATE INDEX idx_donations_service ON donations(service_id);
CREATE INDEX idx_donations_type ON donations(donation_type);
CREATE INDEX idx_donations_status ON donations(payment_status);
CREATE INDEX idx_donations_created ON donations(created_at);

-- ── Auto-update timestamps ────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_kyc_updated_at
  BEFORE UPDATE ON kyc_documents FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_challenges_updated_at
  BEFORE UPDATE ON challenges FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_user_challenges_updated_at
  BEFORE UPDATE ON user_challenges FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_referrals_updated_at
  BEFORE UPDATE ON referrals FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_rewards_updated_at
  BEFORE UPDATE ON rewards FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_services_updated_at
  BEFORE UPDATE ON services FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_donation_subs_updated_at
  BEFORE UPDATE ON donation_subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at();
