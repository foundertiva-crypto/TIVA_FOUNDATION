import {
    Heart,
    Share2,
    Shield,
    Wallet,
    MessageCircle,
    Gift,
    Sparkles,
    ArrowRight,
} from "lucide-react";
import Link from "next/link";

const services = [
    {
        id: "cow-donation",
        name: "Donation for Cow Help Cause",
        description:
            "Support the sacred cause of cow welfare. Your donations help provide food, shelter, and medical care to cows across India. Every contribution makes a difference.",
        icon: Heart,
        gradient: "linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%)",
        featured: true,
        href: "/cow-donation",
        tag: "Featured",
    },
    {
        id: "referral-challenge",
        name: "Referral Challenge",
        description:
            "Compete in 24-hour referral challenges, climb the leaderboard, and earn exclusive rewards for your network growth.",
        icon: Share2,
        gradient: "linear-gradient(135deg, #6C5CE7 0%, #00D2FF 100%)",
        featured: false,
        href: "/dashboard",
        tag: "Active",
    },
    {
        id: "kyc-verification",
        name: "KYC Verification",
        description:
            "Complete your identity verification to unlock premium features, higher withdrawal limits, and trusted member status.",
        icon: Shield,
        gradient: "linear-gradient(135deg, #00E676 0%, #00D2FF 100%)",
        featured: false,
        href: "/dashboard/kyc",
        tag: "Required",
    },
    {
        id: "digital-wallet",
        name: "Digital Wallet",
        description:
            "Manage your earnings, track transactions, and withdraw rewards seamlessly through our secure digital wallet system.",
        icon: Wallet,
        gradient: "linear-gradient(135deg, #FFD93D 0%, #FF6B6B 100%)",
        featured: false,
        href: "/services",
        tag: "Coming Soon",
    },
    {
        id: "community-forum",
        name: "Community Forum",
        description:
            "Connect with other TIVA members, share strategies, discuss causes, and collaborate on community-driven initiatives.",
        icon: MessageCircle,
        gradient: "linear-gradient(135deg, #00D2FF 0%, #6C5CE7 100%)",
        featured: false,
        href: "/services",
        tag: "Coming Soon",
    },
    {
        id: "rewards-store",
        name: "Rewards Store",
        description:
            "Redeem your earned points for exclusive merchandise, vouchers, gift cards, and special access to TIVA events.",
        icon: Gift,
        gradient: "linear-gradient(135deg, #A855F7 0%, #EC4899 100%)",
        featured: false,
        href: "/dashboard/rewards",
        tag: "Active",
    },
];

export default function ServicesPage() {
    const featured = services.find((s) => s.featured);
    const others = services.filter((s) => !s.featured);

    return (
        <div className="services-page">
            {/* Page Header */}
            <div className="services-page-header">
                <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
                    <div
                        style={{
                            width: "40px",
                            height: "40px",
                            borderRadius: "var(--radius-md)",
                            background: "var(--gradient-brand)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                        }}
                    >
                        <Sparkles size={20} color="white" />
                    </div>
                    <h1
                        style={{
                            fontSize: "clamp(24px, 4vw, 32px)",
                            fontWeight: 800,
                            color: "var(--text-primary)",
                        }}
                    >
                        TIVA Services
                    </h1>
                </div>
                <p style={{ color: "var(--text-secondary)", fontSize: "15px", maxWidth: "600px" }}>
                    Explore our suite of services designed to empower communities, reward participation, and drive positive change.
                </p>
            </div>

            {/* Featured Service Card */}
            {featured && (
                <Link href={featured.href} className="service-card-featured" target="_blank">
                    <div className="service-card-featured-glow" />
                    <div className="service-card-featured-content">
                        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "16px", flexWrap: "wrap" }}>
                            <div
                                className="service-card-icon"
                                style={{ background: featured.gradient, width: "56px", height: "56px" }}
                            >
                                <featured.icon size={28} color="white" />
                            </div>
                            <span className="service-card-tag featured-tag">{featured.tag}</span>
                        </div>
                        <h2 className="service-card-featured-title">{featured.name}</h2>
                        <p className="service-card-featured-desc">{featured.description}</p>
                        <div className="service-card-featured-action">
                            <span>Learn More</span>
                            <ArrowRight size={18} />
                        </div>
                    </div>
                </Link>
            )}

            {/* Service Cards Grid */}
            <div className="services-grid">
                {others.map((service) => {
                    const Icon = service.icon;
                    return (
                        <Link
                            key={service.id}
                            href={service.href}
                            className="service-card"
                        >
                            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px" }}>
                                <div
                                    className="service-card-icon"
                                    style={{ background: service.gradient }}
                                >
                                    <Icon size={22} color="white" />
                                </div>
                                <span className="service-card-tag">{service.tag}</span>
                            </div>
                            <h3 className="service-card-title">{service.name}</h3>
                            <p className="service-card-desc">{service.description}</p>
                            <div className="service-card-arrow">
                                <ArrowRight size={16} />
                            </div>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}
