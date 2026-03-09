"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
    Sparkles,
    Trophy,
    Users,
    Shield,
    Zap,
    ArrowRight,
    Star,
    Gift,
    Target,
    ChevronRight,
} from "lucide-react";

/* ── Animated Counter ──────────────────────────────────────── */
function AnimatedCounter({ end, suffix = "", duration = 2000 }: { end: number; suffix?: string; duration?: number }) {
    const [count, setCount] = useState(0);
    const ref = useRef<HTMLSpanElement>(null);
    const started = useRef(false);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting && !started.current) {
                    started.current = true;
                    const startTime = performance.now();
                    const animate = (now: number) => {
                        const elapsed = now - startTime;
                        const progress = Math.min(elapsed / duration, 1);
                        const eased = 1 - Math.pow(1 - progress, 3);
                        setCount(Math.floor(eased * end));
                        if (progress < 1) requestAnimationFrame(animate);
                    };
                    requestAnimationFrame(animate);
                }
            },
            { threshold: 0.3 }
        );

        observer.observe(el);
        return () => observer.disconnect();
    }, [end, duration]);

    return (
        <span ref={ref}>
            {count.toLocaleString()}
            {suffix}
        </span>
    );
}

/* ── Fade-In On Scroll Wrapper ─────────────────────────────── */
function FadeIn({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
    const ref = useRef<HTMLDivElement>(null);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setTimeout(() => setVisible(true), delay);
                    observer.unobserve(el);
                }
            },
            { threshold: 0.15 }
        );

        observer.observe(el);
        return () => observer.disconnect();
    }, [delay]);

    return (
        <div
            ref={ref}
            style={{
                opacity: visible ? 1 : 0,
                transform: visible ? "translateY(0)" : "translateY(30px)",
                transition: `opacity 0.7s cubic-bezier(0.4, 0, 0.2, 1) ${delay}ms, transform 0.7s cubic-bezier(0.4, 0, 0.2, 1) ${delay}ms`,
            }}
        >
            {children}
        </div>
    );
}

/* ── Data ───────────────────────────────────────────────────── */
const stats = [
    { value: 10000, suffix: "+", label: "Active Users" },
    { value: 500000, suffix: "+", label: "Rewards Given" },
    { value: 2400, suffix: "+", label: "Challenges Completed" },
];

const steps = [
    {
        icon: Target,
        number: "01",
        title: "Join a Challenge",
        desc: "Sign up and enter a 24-hour referral challenge with a single tap.",
    },
    {
        icon: Users,
        number: "02",
        title: "Refer Friends",
        desc: "Share your unique link. Every verified referral earns you points on the leaderboard.",
    },
    {
        icon: Gift,
        number: "03",
        title: "Earn Rewards",
        desc: "Top the leaderboard and claim real rewards — cash, vouchers, and exclusive perks.",
    },
];

const features = [
    {
        icon: Zap,
        title: "24-Hour Challenges",
        desc: "Fast-paced daily challenges keep the excitement high and rewards flowing.",
        gradient: "linear-gradient(135deg, #6C5CE7 0%, #a855f7 100%)",
    },
    {
        icon: Trophy,
        title: "Live Leaderboard",
        desc: "Watch your rank climb in real-time as your referrals convert.",
        gradient: "linear-gradient(135deg, #00D2FF 0%, #6C5CE7 100%)",
    },
    {
        icon: Gift,
        title: "Instant Rewards",
        desc: "No waiting — rewards are credited the moment the challenge ends.",
        gradient: "linear-gradient(135deg, #00E676 0%, #00D2FF 100%)",
    },
    {
        icon: Shield,
        title: "Fraud-Proof",
        desc: "Advanced KYC and anti-fraud systems ensure fair play for everyone.",
        gradient: "linear-gradient(135deg, #FFD93D 0%, #FF6B6B 100%)",
    },
];

const testimonials = [
    {
        name: "Priya S.",
        role: "Top Referrer",
        quote: "I earned ₹5,000 in my very first challenge. The leaderboard makes it so addictive!",
        stars: 5,
    },
    {
        name: "Rahul M.",
        role: "Community Leader",
        quote: "TIVA turned my network into real income. The daily challenges keep me coming back.",
        stars: 5,
    },
    {
        name: "Ananya K.",
        role: "Consistent Winner",
        quote: "Simple to use, instant payouts, and the competition is thrilling. Love it!",
        stars: 5,
    },
];

/* ── Main Component ────────────────────────────────────────── */
export default function LandingPage() {
    return (
        <div className="landing-root">
            {/* ─── NAV ─── */}
            <nav className="landing-nav">
                <div className="landing-nav-inner">
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <div
                            style={{
                                width: "36px",
                                height: "36px",
                                borderRadius: "var(--radius-sm)",
                                background: "var(--gradient-brand)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                            }}
                        >
                            <Sparkles size={18} color="white" />
                        </div>
                        <span className="gradient-text" style={{ fontSize: "22px", fontWeight: 800 }}>
                            TIVA
                        </span>
                    </div>
                    <Link href="/login" className="btn-primary" style={{ padding: "10px 24px", fontSize: "14px" }}>
                        Get Started
                    </Link>
                </div>
            </nav>

            {/* ─── HERO ─── */}
            <section className="landing-hero">
                <div className="landing-hero-orb landing-hero-orb-1" />
                <div className="landing-hero-orb landing-hero-orb-2" />
                <div className="landing-hero-orb landing-hero-orb-3" />

                <div className="landing-hero-content">
                    <FadeIn>
                        <div className="landing-hero-badge">
                            <Zap size={14} />
                            <span>24-Hour Referral Challenges</span>
                        </div>
                    </FadeIn>

                    <FadeIn delay={100}>
                        <h1 className="landing-hero-title">
                            Compete. Refer.{" "}
                            <span className="gradient-text">Earn Rewards.</span>
                        </h1>
                    </FadeIn>

                    <FadeIn delay={200}>
                        <p className="landing-hero-subtitle">
                            Join daily challenges, climb the leaderboard by referring friends, and
                            win real cash rewards — all in 24 hours.
                        </p>
                    </FadeIn>

                    <FadeIn delay={300}>
                        <div className="landing-hero-actions">
                            <Link href="/login" className="btn-primary landing-hero-btn">
                                Start Your Challenge
                                <ArrowRight size={18} />
                            </Link>
                            <a href="#how-it-works" className="btn-secondary landing-hero-btn-secondary">
                                See How It Works
                                <ChevronRight size={16} />
                            </a>
                        </div>
                    </FadeIn>
                </div>
            </section>

            {/* ─── SOCIAL PROOF STATS ─── */}
            <section className="landing-section landing-stats-section">
                <div className="landing-stats-grid">
                    {stats.map((s, i) => (
                        <FadeIn key={i} delay={i * 120}>
                            <div className="landing-stat-card">
                                <span className="landing-stat-value gradient-text">
                                    <AnimatedCounter end={s.value} suffix={s.suffix} />
                                </span>
                                <span className="landing-stat-label">{s.label}</span>
                            </div>
                        </FadeIn>
                    ))}
                </div>
            </section>

            {/* ─── HOW IT WORKS ─── */}
            <section className="landing-section" id="how-it-works">
                <FadeIn>
                    <div className="landing-section-header">
                        <span className="landing-section-tag">Simple & Powerful</span>
                        <h2 className="landing-section-title">How It Works</h2>
                        <p className="landing-section-desc">
                            Three simple steps to start earning rewards today.
                        </p>
                    </div>
                </FadeIn>

                <div className="landing-steps-grid">
                    {steps.map((step, i) => (
                        <FadeIn key={i} delay={i * 150}>
                            <div className="landing-step-card">
                                <div className="landing-step-number">{step.number}</div>
                                <div
                                    className="landing-step-icon"
                                    style={{ background: "var(--gradient-brand)" }}
                                >
                                    <step.icon size={24} color="white" />
                                </div>
                                <h3 className="landing-step-title">{step.title}</h3>
                                <p className="landing-step-desc">{step.desc}</p>
                            </div>
                        </FadeIn>
                    ))}
                </div>
            </section>

            {/* ─── FEATURES ─── */}
            <section className="landing-section">
                <FadeIn>
                    <div className="landing-section-header">
                        <span className="landing-section-tag">Why TIVA</span>
                        <h2 className="landing-section-title">Built for Winners</h2>
                        <p className="landing-section-desc">
                            Everything you need to compete, grow your network, and earn — all in one platform.
                        </p>
                    </div>
                </FadeIn>

                <div className="landing-features-grid">
                    {features.map((f, i) => (
                        <FadeIn key={i} delay={i * 120}>
                            <div className="landing-feature-card glass-card">
                                <div className="landing-feature-icon" style={{ background: f.gradient }}>
                                    <f.icon size={22} color="white" />
                                </div>
                                <h3 className="landing-feature-title">{f.title}</h3>
                                <p className="landing-feature-desc">{f.desc}</p>
                            </div>
                        </FadeIn>
                    ))}
                </div>
            </section>

            {/* ─── TESTIMONIALS ─── */}
            <section className="landing-section">
                <FadeIn>
                    <div className="landing-section-header">
                        <span className="landing-section-tag">Loved by Users</span>
                        <h2 className="landing-section-title">What Players Say</h2>
                    </div>
                </FadeIn>

                <div className="landing-testimonials-grid">
                    {testimonials.map((t, i) => (
                        <FadeIn key={i} delay={i * 150}>
                            <div className="landing-testimonial-card glass-card">
                                <div className="landing-testimonial-stars">
                                    {Array.from({ length: t.stars }, (_, j) => (
                                        <Star key={j} size={16} fill="#FFD93D" color="#FFD93D" />
                                    ))}
                                </div>
                                <p className="landing-testimonial-quote">&ldquo;{t.quote}&rdquo;</p>
                                <div className="landing-testimonial-author">
                                    <div
                                        className="landing-testimonial-avatar"
                                        style={{ background: features[i % features.length].gradient }}
                                    >
                                        {t.name[0]}
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: 600, fontSize: "14px" }}>{t.name}</div>
                                        <div style={{ color: "var(--text-muted)", fontSize: "12px" }}>{t.role}</div>
                                    </div>
                                </div>
                            </div>
                        </FadeIn>
                    ))}
                </div>
            </section>

            {/* ─── FINAL CTA ─── */}
            <section className="landing-cta-section">
                <div className="landing-cta-orb landing-cta-orb-1" />
                <div className="landing-cta-orb landing-cta-orb-2" />
                <FadeIn>
                    <div className="landing-cta-content">
                        <h2 className="landing-cta-title">
                            Ready to Start <span className="gradient-text">Winning?</span>
                        </h2>
                        <p className="landing-cta-desc">
                            Join thousands of players already competing in daily referral challenges.
                            Your first reward is just one challenge away.
                        </p>
                        <Link href="/login" className="btn-primary landing-hero-btn">
                            Join Now — It&apos;s Free
                            <ArrowRight size={18} />
                        </Link>
                    </div>
                </FadeIn>
            </section>

            {/* ─── FOOTER ─── */}
            <footer className="landing-footer">
                <div className="landing-footer-inner">
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <Sparkles size={16} style={{ color: "var(--brand-primary)" }} />
                        <span style={{ fontWeight: 700, fontSize: "14px" }}>TIVA</span>
                    </div>
                    <p style={{ color: "var(--text-muted)", fontSize: "13px" }}>
                        © {new Date().getFullYear()} TIVA. All rights reserved.
                    </p>
                </div>
            </footer>
        </div>
    );
}
