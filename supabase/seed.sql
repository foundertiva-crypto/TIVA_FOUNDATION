-- ═══════════════════════════════════════════════════════════════
-- Seed Data — Run after schema.sql and rls_policies.sql
-- ═══════════════════════════════════════════════════════════════

-- Default challenge template
INSERT INTO challenges (title, target_referrals, duration_hours, cooldown_hours, is_active)
VALUES ('24-Hour Referral Challenge', 100, 24, 1, true)
ON CONFLICT DO NOTHING;

-- Reward tiers
INSERT INTO rewards (threshold, label, amount, reward_type, is_active)
VALUES
  (25,  'Bonus Credits',    0,   'credits',    true),
  (50,  '₹100 Reward',     100, 'cash',       true),
  (75,  '₹250 Reward',     250, 'cash',       true),
  (100, '₹500 + Badge',    500, 'cash_badge', true)
ON CONFLICT DO NOTHING;

-- Services registry
INSERT INTO services (slug, name, description, icon, gradient, category, is_active, is_featured, sort_order, route_path)
VALUES
  (
    'cow-donation',
    'Donation for Cow Help Cause',
    'Support the sacred cause of cow welfare. Your donations help provide food, shelter, and medical care to cows across India. Every contribution makes a difference.',
    'Heart',
    'linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%)',
    'donation',
    true,
    true,
    1,
    '/cow-donation'
  ),
  (
    'referral-challenge',
    'Referral Challenge',
    'Compete in 24-hour referral challenges, climb the leaderboard, and earn exclusive rewards for your network growth.',
    'Share2',
    'linear-gradient(135deg, #6C5CE7 0%, #00D2FF 100%)',
    'general',
    true,
    false,
    2,
    '/dashboard'
  ),
  (
    'kyc-verification',
    'KYC Verification',
    'Complete your identity verification to unlock premium features, higher withdrawal limits, and trusted member status.',
    'Shield',
    'linear-gradient(135deg, #00E676 0%, #00D2FF 100%)',
    'verification',
    true,
    false,
    3,
    '/dashboard/kyc'
  ),
  (
    'digital-wallet',
    'Digital Wallet',
    'Manage your earnings, track transactions, and withdraw rewards seamlessly through our secure digital wallet system.',
    'Wallet',
    'linear-gradient(135deg, #FFD93D 0%, #FF6B6B 100%)',
    'finance',
    false,
    false,
    4,
    NULL
  ),
  (
    'community-forum',
    'Community Forum',
    'Connect with other TIVA members, share strategies, discuss causes, and collaborate on community-driven initiatives.',
    'MessageCircle',
    'linear-gradient(135deg, #00D2FF 0%, #6C5CE7 100%)',
    'community',
    false,
    false,
    5,
    NULL
  ),
  (
    'rewards-store',
    'Rewards Store',
    'Redeem your earned points for exclusive merchandise, vouchers, gift cards, and special access to TIVA events.',
    'Gift',
    'linear-gradient(135deg, #A855F7 0%, #EC4899 100%)',
    'finance',
    true,
    false,
    6,
    '/dashboard/rewards'
  )
ON CONFLICT (slug) DO NOTHING;
