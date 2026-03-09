-- ═══════════════════════════════════════════════════════════════
-- Row-Level Security Policies
-- Run this AFTER schema.sql in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE kyc_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE deposits ENABLE ROW LEVEL SECURITY;
ALTER TABLE rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE reward_claims ENABLE ROW LEVEL SECURITY;

-- ── Helper: Check if user is admin ────────────────────────────
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- ═══════════════════════════════════════════════════════════════
-- PROFILES
-- ═══════════════════════════════════════════════════════════════
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  USING (is_admin());

CREATE POLICY "Admins can update all profiles"
  ON profiles FOR UPDATE
  USING (is_admin());

-- ═══════════════════════════════════════════════════════════════
-- KYC DOCUMENTS
-- ═══════════════════════════════════════════════════════════════
CREATE POLICY "Users can view own KYC"
  ON kyc_documents FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can upload own KYC"
  ON kyc_documents FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all KYC"
  ON kyc_documents FOR SELECT
  USING (is_admin());

CREATE POLICY "Admins can update KYC status"
  ON kyc_documents FOR UPDATE
  USING (is_admin());

-- ═══════════════════════════════════════════════════════════════
-- REFERRALS
-- ═══════════════════════════════════════════════════════════════
CREATE POLICY "Referrers can view own referrals"
  ON referrals FOR SELECT
  USING (auth.uid() = referrer_id);

CREATE POLICY "System can insert referrals"
  ON referrals FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can view all referrals"
  ON referrals FOR SELECT
  USING (is_admin());

CREATE POLICY "Admins can update referrals"
  ON referrals FOR UPDATE
  USING (is_admin());

-- ═══════════════════════════════════════════════════════════════
-- CHALLENGES
-- ═══════════════════════════════════════════════════════════════
CREATE POLICY "Anyone can view active challenges"
  ON challenges FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage challenges"
  ON challenges FOR ALL
  USING (is_admin());

-- ═══════════════════════════════════════════════════════════════
-- USER CHALLENGES
-- ═══════════════════════════════════════════════════════════════
CREATE POLICY "Users can view own challenges"
  ON user_challenges FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own challenges"
  ON user_challenges FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Public view for leaderboard"
  ON user_challenges FOR SELECT
  USING (status = 'active');

CREATE POLICY "Admins can manage user challenges"
  ON user_challenges FOR ALL
  USING (is_admin());

-- ═══════════════════════════════════════════════════════════════
-- DEPOSITS
-- ═══════════════════════════════════════════════════════════════
CREATE POLICY "Users can view own deposits"
  ON deposits FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all deposits"
  ON deposits FOR SELECT
  USING (is_admin());

-- ═══════════════════════════════════════════════════════════════
-- REWARDS
-- ═══════════════════════════════════════════════════════════════
CREATE POLICY "Anyone can view active rewards"
  ON rewards FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage rewards"
  ON rewards FOR ALL
  USING (is_admin());

-- ═══════════════════════════════════════════════════════════════
-- REWARD CLAIMS
-- ═══════════════════════════════════════════════════════════════
CREATE POLICY "Users can view own claims"
  ON reward_claims FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all claims"
  ON reward_claims FOR SELECT
  USING (is_admin());

-- ═══════════════════════════════════════════════════════════════
-- SERVICES
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active services"
  ON services FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage services"
  ON services FOR ALL
  USING (is_admin());

-- ═══════════════════════════════════════════════════════════════
-- DONATION SUBSCRIPTIONS
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE donation_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscriptions"
  ON donation_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own subscriptions"
  ON donation_subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own subscriptions"
  ON donation_subscriptions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all subscriptions"
  ON donation_subscriptions FOR SELECT
  USING (is_admin());

CREATE POLICY "Admins can manage subscriptions"
  ON donation_subscriptions FOR ALL
  USING (is_admin());

-- ═══════════════════════════════════════════════════════════════
-- DONATIONS
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE donations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own donations"
  ON donations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own donations"
  ON donations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all donations"
  ON donations FOR SELECT
  USING (is_admin());

CREATE POLICY "Admins can update donations"
  ON donations FOR UPDATE
  USING (is_admin());
