"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import {
    Heart,
    ArrowRight,
    Sparkles,
    HandHeart,
    Stethoscope,
    Home,
    Truck,
    Star,
    Milk,
    Flame,
    Leaf,
    Package,
    ChevronRight,
} from "lucide-react";
import { DonationPopup } from "@/components/services/donation-popup";

/* ── Fade-In On Scroll ──────────────────────────────────────── */
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
const steps = [
    {
        number: "01",
        title: "Choose Your Donation",
        desc: "Select a one-time amount or set up a monthly recurring donation that fits your capacity.",
        icon: Heart,
    },
    {
        number: "02",
        title: "We Deliver the Care",
        desc: "Your funds directly provide food, medicine, shelter and rescue operations for cows in need.",
        icon: HandHeart,
    },
    {
        number: "03",
        title: "See Your Impact",
        desc: "Receive updates and photos showing exactly how your donation is making a difference.",
        icon: Sparkles,
    },
];

const breakdown = [
    {
        icon: Leaf,
        title: "Food & Fodder",
        percentage: 40,
        desc: "Nutritious fodder, green grass, and clean drinking water for daily feeding.",
        gradient: "linear-gradient(135deg, #00E676 0%, #00D2FF 100%)",
    },
    {
        icon: Stethoscope,
        title: "Medical Care",
        percentage: 25,
        desc: "Regular health check-ups, vaccinations, emergency surgery, and treatments.",
        gradient: "linear-gradient(135deg, #6C5CE7 0%, #00D2FF 100%)",
    },
    {
        icon: Home,
        title: "Shelter & Space",
        percentage: 20,
        desc: "Clean, ventilated shelters with comfortable bedding and adequate space.",
        gradient: "linear-gradient(135deg, #FFD93D 0%, #FF6B6B 100%)",
    },
    {
        icon: Truck,
        title: "Rescue Operations",
        percentage: 15,
        desc: "Rescue injured, abandoned, and abused cows from across the region.",
        gradient: "linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%)",
    },
];

const products = [
    {
        name: "Pure Desi Ghee",
        desc: "Traditional A2 ghee made from pure cow milk using the Bilona method.",
        icon: Flame,
    },
    {
        name: "Fresh Cow Milk",
        desc: "Organic, farm-fresh A2 cow milk delivered daily to your doorstep.",
        icon: Milk,
    },
    {
        name: "Cow Dung Cakes",
        desc: "Eco-friendly, handmade cow dung cakes for puja and organic farming.",
        icon: Leaf,
    },
    {
        name: "Panchgavya Products",
        desc: "Ayurvedic products made from five sacred elements of the cow.",
        icon: Package,
    },
];

const testimonials = [
    {
        name: "Sunita Devi",
        role: "Monthly Donor",
        quote: "Knowing that my small monthly contribution feeds and shelters cows gives me immense peace. The updates I receive are heartwarming.",
        stars: 5,
        gradient: "linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%)",
    },
    {
        name: "Rajesh Sharma",
        role: "One-Time Donor",
        quote: "I donated during Diwali and was amazed at the transparency. I could see exactly where my money went. Truly a noble cause.",
        stars: 5,
        gradient: "linear-gradient(135deg, #6C5CE7 0%, #00D2FF 100%)",
    },
    {
        name: "Meera Patel",
        role: "Regular Supporter",
        quote: "TIVA makes it so easy to give back. The rescue stories they share are incredible. These cows deserve our love and care.",
        stars: 5,
        gradient: "linear-gradient(135deg, #00E676 0%, #00D2FF 100%)",
    },
];

/* ── Component ─────────────────────────────────────────────── */
export default function CowDonationPage() {
    const [showDonation, setShowDonation] = useState(false);

    return (
        <div className="cow-donation-root">
            {/* ─── NAV ─── */}
            <nav className="cow-nav">
                <div className="cow-nav-inner">
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <div
                            style={{
                                width: "36px",
                                height: "36px",
                                borderRadius: "var(--radius-sm)",
                                background: "linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                            }}
                        >
                            <Heart size={18} color="white" fill="white" />
                        </div>
                        <span style={{ fontSize: "22px", fontWeight: 800, color: "var(--text-primary)" }}>
                            TIVA <span style={{ color: "#FF8E53" }}>Cow Seva</span>
                        </span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                        <Link
                            href="/services"
                            style={{
                                color: "var(--text-secondary)",
                                textDecoration: "none",
                                fontSize: "14px",
                                fontWeight: 500,
                                display: "flex",
                                alignItems: "center",
                                gap: "4px",
                            }}
                        >
                            ← Services
                        </Link>
                        <button
                            className="btn-primary"
                            onClick={() => setShowDonation(true)}
                            style={{
                                padding: "10px 24px",
                                fontSize: "14px",
                                background: "linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%)",
                                boxShadow: "0 4px 15px rgba(255, 107, 107, 0.3)",
                            }}
                        >
                            Donate Now
                        </button>
                    </div>
                </div>
            </nav>

            {/* ─── HERO ─── */}
            <section className="cow-hero">
                <div className="cow-hero-orb cow-hero-orb-1" />
                <div className="cow-hero-orb cow-hero-orb-2" />

                <div className="cow-hero-inner">
                    <div className="cow-hero-content">
                        <FadeIn delay={100}>
                            <div className="cow-hero-badge">
                                <Heart size={14} fill="currentColor" />
                                <span>Cow Welfare Initiative</span>
                            </div>
                        </FadeIn>

                        <FadeIn delay={200}>
                            <h1 className="cow-hero-title">
                                Every Life is{" "}
                                <span style={{ color: "#FF8E53" }}>Sacred.</span>
                                <br />
                                <span style={{ color: "#FF6B6B" }}>Every Donation Matters.</span>
                            </h1>
                        </FadeIn>

                        <FadeIn delay={300}>
                            <p className="cow-hero-subtitle">
                                Join thousands of compassionate hearts in providing food, shelter, and medical care
                                to abandoned and injured cows. Your generosity gives them a second chance at life.
                            </p>
                        </FadeIn>

                        <FadeIn delay={400}>
                            <div className="cow-hero-actions">
                                <button
                                    className="btn-primary cow-donate-btn"
                                    onClick={() => setShowDonation(true)}
                                >
                                    <Heart size={18} fill="white" />
                                    <span>Donate Now</span>
                                    <ArrowRight size={18} />
                                </button>
                                <a href="#how-it-works" className="btn-secondary" style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                                    See How It Works
                                    <ChevronRight size={16} />
                                </a>
                            </div>
                        </FadeIn>
                    </div>

                    <FadeIn delay={300}>
                        <div className="cow-hero-image-wrap">
                            <Image
                                src="/images/cow-hero.png"
                                alt="A healthy cow in a green field at golden hour"
                                width={600}
                                height={400}
                                className="cow-hero-image"
                                priority
                            />
                        </div>
                    </FadeIn>
                </div>
            </section>

            {/* ─── HOW DONATION WORKS ─── */}
            <section className="cow-section" id="how-it-works">
                <div className="cow-container">
                    <FadeIn>
                        <div className="cow-section-header">
                            <span className="cow-section-tag">Simple & Transparent</span>
                            <h2 className="cow-section-title">How Your Donation Works</h2>
                            <p className="cow-section-desc">
                                Three simple steps to make a real impact in the lives of cows.
                            </p>
                        </div>
                    </FadeIn>

                    <div className="cow-steps-grid">
                        {steps.map((step, i) => (
                            <FadeIn key={i} delay={i * 150}>
                                <div className="cow-step-card">
                                    <div className="cow-step-number">{step.number}</div>
                                    <div className="cow-step-icon">
                                        <step.icon size={24} color="white" />
                                    </div>
                                    <h3 className="cow-step-title">{step.title}</h3>
                                    <p className="cow-step-desc">{step.desc}</p>
                                </div>
                            </FadeIn>
                        ))}
                    </div>
                </div>
            </section>

            {/* ─── WHERE YOUR MONEY GOES ─── */}
            <section className="cow-section cow-section-alt">
                <div className="cow-container">
                    <FadeIn>
                        <div className="cow-section-header">
                            <span className="cow-section-tag">Full Transparency</span>
                            <h2 className="cow-section-title">Where Your Money Goes</h2>
                            <p className="cow-section-desc">
                                Every rupee is accounted for. Here&apos;s how we use your generous donations.
                            </p>
                        </div>
                    </FadeIn>

                    <div className="cow-breakdown-grid">
                        {breakdown.map((item, i) => {
                            const Icon = item.icon;
                            return (
                                <FadeIn key={i} delay={i * 120}>
                                    <div className="cow-breakdown-card">
                                        <div className="cow-breakdown-icon" style={{ background: item.gradient }}>
                                            <Icon size={22} color="white" />
                                        </div>
                                        <div className="cow-breakdown-perc">{item.percentage}%</div>
                                        <h3 className="cow-breakdown-title">{item.title}</h3>
                                        <p className="cow-breakdown-desc">{item.desc}</p>
                                        <div className="cow-breakdown-bar">
                                            <div
                                                className="cow-breakdown-bar-fill"
                                                style={{ width: `${item.percentage}%`, background: item.gradient }}
                                            />
                                        </div>
                                    </div>
                                </FadeIn>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* ─── EMOTIONAL MESSAGE ─── */}
            <section className="cow-emotional">
                <div className="cow-emotional-orb" />
                <div className="cow-container">
                    <FadeIn>
                        <div className="cow-emotional-content">
                            <Heart size={40} style={{ color: "#FF6B6B", marginBottom: "20px" }} fill="#FF6B6B" />
                            <blockquote className="cow-emotional-quote">
                                &ldquo;The greatness of a nation and its moral progress can be judged by the way its animals are treated.&rdquo;
                            </blockquote>
                            <p className="cow-emotional-author">— Mahatma Gandhi</p>
                            <p className="cow-emotional-message">
                                In India, cows are revered as a symbol of life, nourishment, and motherhood. Yet thousands are
                                abandoned, injured, and left without care. Your donation is not just charity — it is an act of
                                dharma, a sacred duty to protect these gentle beings who give us so much.
                            </p>
                            <button
                                className="btn-primary cow-donate-btn"
                                onClick={() => setShowDonation(true)}
                                style={{ marginTop: "28px" }}
                            >
                                <Heart size={18} fill="white" />
                                <span>Make a Difference Today</span>
                            </button>
                        </div>
                    </FadeIn>
                </div>
            </section>

            {/* ─── PRODUCTS & COW IMAGES ─── */}
            <section className="cow-section">
                <div className="cow-container">
                    <FadeIn>
                        <div className="cow-section-header">
                            <span className="cow-section-tag">From the Gaushala</span>
                            <h2 className="cow-section-title">Gifts of the Cow</h2>
                            <p className="cow-section-desc">
                                Cows give us so much. Support the cause and discover pure, organic cow products.
                            </p>
                        </div>
                    </FadeIn>

                    <div className="cow-products-layout">
                        <FadeIn>
                            <div className="cow-products-image-wrap">
                                <Image
                                    src="/images/cow-products.png"
                                    alt="Traditional cow products — ghee, milk, curd"
                                    width={500}
                                    height={400}
                                    className="cow-products-image"
                                />
                            </div>
                        </FadeIn>
                        <div className="cow-products-grid">
                            {products.map((product, i) => {
                                const Icon = product.icon;
                                return (
                                    <FadeIn key={i} delay={i * 100}>
                                        <div className="cow-product-card">
                                            <div className="cow-product-icon">
                                                <Icon size={20} />
                                            </div>
                                            <div>
                                                <h4 className="cow-product-name">{product.name}</h4>
                                                <p className="cow-product-desc">{product.desc}</p>
                                            </div>
                                        </div>
                                    </FadeIn>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </section>

            {/* ─── TESTIMONIALS ─── */}
            <section className="cow-section cow-section-alt">
                <div className="cow-container">
                    <FadeIn>
                        <div className="cow-section-header">
                            <span className="cow-section-tag">Our Donors Speak</span>
                            <h2 className="cow-section-title">Loved by Donors</h2>
                        </div>
                    </FadeIn>

                    <div className="cow-testimonials-grid">
                        {testimonials.map((t, i) => (
                            <FadeIn key={i} delay={i * 150}>
                                <div className="cow-testimonial-card glass-card">
                                    <div className="landing-testimonial-stars">
                                        {Array.from({ length: t.stars }, (_, j) => (
                                            <Star key={j} size={16} fill="#FFD93D" color="#FFD93D" />
                                        ))}
                                    </div>
                                    <p className="landing-testimonial-quote">&ldquo;{t.quote}&rdquo;</p>
                                    <div className="landing-testimonial-author">
                                        <div
                                            className="landing-testimonial-avatar"
                                            style={{ background: t.gradient }}
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
                </div>
            </section>

            {/* ─── FINAL CTA ─── */}
            <section className="cow-cta-section">
                <div className="cow-cta-orb cow-cta-orb-1" />
                <div className="cow-cta-orb cow-cta-orb-2" />
                <div className="cow-container">
                    <FadeIn>
                        <div className="cow-cta-content">
                            <h2 className="cow-cta-title">
                                Be the Reason a Cow{" "}
                                <span style={{ color: "#FF8E53" }}>Finds Shelter</span> Today
                            </h2>
                            <p className="cow-cta-desc">
                                Even ₹10 a month can provide a day&apos;s meal for a cow. Start your journey
                                of compassion today and witness the impact of your generosity.
                            </p>
                            <button
                                className="btn-primary cow-donate-btn"
                                onClick={() => setShowDonation(true)}
                            >
                                <Heart size={18} fill="white" />
                                <span>Start Donating</span>
                                <ArrowRight size={18} />
                            </button>
                        </div>
                    </FadeIn>
                </div>
            </section>

            {/* ─── FOOTER ─── */}
            <footer className="cow-footer">
                <div className="cow-footer-inner cow-container">
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <Heart size={16} style={{ color: "#FF6B6B" }} fill="#FF6B6B" />
                        <span style={{ fontWeight: 700, fontSize: "14px" }}>TIVA Cow Seva</span>
                    </div>
                    <Link href="/services" style={{ color: "var(--text-secondary)", fontSize: "13px", textDecoration: "none" }}>
                        ← Back to All Services
                    </Link>
                    <p style={{ color: "var(--text-muted)", fontSize: "13px" }}>
                        © {new Date().getFullYear()} TIVA Foundation. All rights reserved.
                    </p>
                </div>
            </footer>

            {/* ─── DONATION POPUP ─── */}
            <DonationPopup isOpen={showDonation} onClose={() => setShowDonation(false)} />
        </div>
    );
}
