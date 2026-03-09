"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
    Sparkles,
    Heart,
    Users,
    Shield,
    BookOpen,
    ArrowRight,
    Star,
    Briefcase,
    HandHeart,
    ChevronRight,
    Banknote,
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
    { value: 15000, suffix: "+", label: "Lives Impacted" },
    { value: 3200, suffix: "+", label: "Jobs Created" },
    { value: 8500, suffix: "+", label: "People Trained" },
];

const steps = [
    {
        icon: HandHeart,
        number: "01",
        title: "Connect With Us",
        desc: "Register with TIVA Foundation to access our full range of social upliftment programmes.",
    },
    {
        icon: BookOpen,
        number: "02",
        title: "Choose a Programme",
        desc: "Select from charity support, employment assistance, skills training, or financial services.",
    },
    {
        icon: Briefcase,
        number: "03",
        title: "Build Your Future",
        desc: "Receive hands-on support, funding opportunities, and insurance coverage to thrive.",
    },
];

const features = [
    {
        icon: Heart,
        title: "Charity & Relief",
        desc: "We provide essential aid, food, education, and healthcare support to underprivileged communities.",
        gradient: "linear-gradient(135deg, #FF6B6B 0%, #ee0979 100%)",
    },
    {
        icon: Briefcase,
        title: "Employment Services",
        desc: "Connecting job-seekers with livelihood opportunities through partnerships with leading employers.",
        gradient: "linear-gradient(135deg, #6C5CE7 0%, #a855f7 100%)",
    },
    {
        icon: BookOpen,
        title: "Skills Development",
        desc: "Vocational training, digital literacy, and professional upskilling programmes for all age groups.",
        gradient: "linear-gradient(135deg, #00D2FF 0%, #6C5CE7 100%)",
    },
    {
        icon: Banknote,
        title: "Financial & Insurance",
        desc: "Micro-finance, savings schemes, and affordable insurance plans designed for every income level.",
        gradient: "linear-gradient(135deg, #00E676 0%, #00D2FF 100%)",
    },
    {
        icon: Users,
        title: "Community Building",
        desc: "Fostering inclusive communities through outreach, mentorship, and grassroots development initiatives.",
        gradient: "linear-gradient(135deg, #FFD93D 0%, #FF6B6B 100%)",
    },
    {
        icon: Shield,
        title: "Transparent Operations",
        desc: "Full accountability with verified KYC, audited funds, and real-time impact reporting.",
        gradient: "linear-gradient(135deg, #a855f7 0%, #6C5CE7 100%)",
    },
];

const testimonials = [
    {
        name: "Priya S.",
        role: "Skills Development Beneficiary",
        quote: "TIVA Foundation's vocational training programme gave me the skills to start my own tailoring business. I am forever grateful.",
        stars: 5,
    },
    {
        name: "Rahul M.",
        role: "Employment Programme Participant",
        quote: "Within two weeks of joining TIVA's employment service, I had three interviews lined up. I landed my dream job!",
        stars: 5,
    },
    {
        name: "Ananya K.",
        role: "Micro-Finance Member",
        quote: "The micro-finance scheme helped me grow my small business. Their insurance plan gave me peace of mind I never had before.",
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
                            <Heart size={14} />
                            <span>Empowering Communities Since Inception</span>
                        </div>
                    </FadeIn>

                    <FadeIn delay={100}>
                        <h1 className="landing-hero-title">
                            Uplift. Empower.{" "}
                            <span className="gradient-text">Transform Lives.</span>
                        </h1>
                    </FadeIn>

                    <FadeIn delay={200}>
                        <p className="landing-hero-subtitle">
                            TIVA Foundation provides charity relief, employment assistance, skills
                            development, and financial &amp; insurance services to build stronger,
                            self-reliant communities.
                        </p>
                    </FadeIn>

                    <FadeIn delay={300}>
                        <div className="landing-hero-actions">
                            <Link href="/login" className="btn-primary landing-hero-btn">
                                Get Involved
                                <ArrowRight size={18} />
                            </Link>
                            <a href="#how-it-works" className="btn-secondary landing-hero-btn-secondary">
                                Our Services
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
                        <span className="landing-section-tag">Simple &amp; Impactful</span>
                        <h2 className="landing-section-title">How We Help</h2>
                        <p className="landing-section-desc">
                            Three simple steps to access TIVA Foundation&apos;s life-changing programmes.
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
                        <span className="landing-section-tag">Our Services</span>
                        <h2 className="landing-section-title">What We Offer</h2>
                        <p className="landing-section-desc">
                            Comprehensive social-impact services designed to uplift individuals and communities across every walk of life.
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
                        <span className="landing-section-tag">Real Stories</span>
                        <h2 className="landing-section-title">Lives We&apos;ve Changed</h2>
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
                            Ready to Make a <span className="gradient-text">Difference?</span>
                        </h2>
                        <p className="landing-cta-desc">
                            Join TIVA Foundation today — as a beneficiary, volunteer, or donor.
                            Every step forward counts toward a brighter community.
                        </p>
                        <Link href="/login" className="btn-primary landing-hero-btn">
                            Join TIVA Foundation
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
                        <span style={{ fontWeight: 700, fontSize: "14px" }}>TIVA Foundation</span>
                    </div>
                    <p style={{ color: "var(--text-muted)", fontSize: "13px" }}>
                        © {new Date().getFullYear()} TIVA Foundation. All rights reserved. Empowering communities through charity, employment, skills &amp; financial services.
                    </p>
                </div>
            </footer>
        </div>
    );
}
