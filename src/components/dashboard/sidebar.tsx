"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard,
    Link2,
    Trophy,
    Shield,
    Gift,
    Users,
    LogOut,
    Sparkles,
    Menu,
    X,
    LayoutGrid,
    User,
} from "lucide-react";
import { signOut } from "@/app/actions/auth";

const navItems = [
    { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
    { href: "/dashboard/challenge", label: "Challenge", icon: Trophy },
    { href: "/dashboard/referrals", label: "Referrals", icon: Link2 },
    { href: "/dashboard/leaderboard", label: "Board", icon: Users },
    { href: "/dashboard/rewards", label: "Rewards", icon: Gift },
    { href: "/dashboard/kyc", label: "KYC", icon: Shield },
    { href: "/services", label: "Services", icon: LayoutGrid },
    { href: "/services/profile", label: "Profile", icon: User },
];

interface Props {
    userName: string;
    phone: string;
}

export function DashboardSidebar({ userName, phone }: Props) {
    const pathname = usePathname();
    const [menuOpen, setMenuOpen] = useState(false);

    const isActive = (href: string) =>
        pathname === href || (href !== "/dashboard" && pathname.startsWith(href));

    return (
        <>
            {/* ─── Desktop Sidebar ──────────────────────────── */}
            <aside className="sidebar">
                <div className="sidebar-logo">
                    <div
                        style={{
                            width: "36px",
                            height: "36px",
                            borderRadius: "var(--radius-sm)",
                            background: "var(--gradient-brand)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                        }}
                    >
                        <Sparkles size={18} color="white" />
                    </div>
                    <span
                        className="gradient-text"
                        style={{ fontSize: "20px", fontWeight: 800 }}
                    >
                        TIVA
                    </span>
                </div>

                <nav className="sidebar-nav">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`sidebar-link ${isActive(item.href) ? "active" : ""}`}
                            >
                                <Icon size={18} />
                                <span>{item.label}</span>
                            </Link>
                        );
                    })}
                </nav>

                <div className="sidebar-footer">
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                        }}
                    >
                        <div>
                            <p
                                style={{
                                    fontSize: "14px",
                                    fontWeight: 600,
                                    color: "var(--text-primary)",
                                }}
                            >
                                {userName}
                            </p>
                            <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                                {phone}
                            </p>
                        </div>
                        <button
                            onClick={() => signOut()}
                            style={{
                                background: "none",
                                border: "none",
                                color: "var(--text-muted)",
                                cursor: "pointer",
                                padding: "8px",
                                borderRadius: "var(--radius-sm)",
                                transition: "all 0.2s",
                            }}
                            title="Sign out"
                        >
                            <LogOut size={18} />
                        </button>
                    </div>
                </div>
            </aside>

            {/* ─── Mobile Header ────────────────────────────── */}
            <header className="mobile-header">
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <div
                        style={{
                            width: "32px",
                            height: "32px",
                            borderRadius: "var(--radius-sm)",
                            background: "var(--gradient-brand)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                        }}
                    >
                        <Sparkles size={16} color="white" />
                    </div>
                    <span
                        className="gradient-text"
                        style={{ fontSize: "18px", fontWeight: 800 }}
                    >
                        TIVA
                    </span>
                </div>
                <button
                    className="hamburger-btn"
                    onClick={() => setMenuOpen(true)}
                    aria-label="Open menu"
                >
                    <Menu size={24} />
                </button>
            </header>

            {/* ─── Mobile Bottom Nav ────────────────────────── */}
            <nav className="mobile-bottom-nav" aria-label="Main navigation">
                <div className="mobile-bottom-nav-inner">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`mobile-nav-link ${isActive(item.href) ? "active" : ""}`}
                            >
                                <Icon size={20} />
                                <span>{item.label}</span>
                            </Link>
                        );
                    })}
                </div>
            </nav>

            {/* ─── Mobile Slide-Out Menu ────────────────────── */}
            {menuOpen && (
                <>
                    <div
                        className="mobile-menu-overlay"
                        style={{ display: "block" }}
                        onClick={() => setMenuOpen(false)}
                    />
                    <div className="mobile-menu-panel">
                        <div
                            style={{
                                padding: "0 20px 20px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                borderBottom: "1px solid var(--border-subtle)",
                                marginBottom: "16px",
                            }}
                        >
                            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                <div
                                    style={{
                                        width: "32px",
                                        height: "32px",
                                        borderRadius: "var(--radius-sm)",
                                        background: "var(--gradient-brand)",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                    }}
                                >
                                    <Sparkles size={16} color="white" />
                                </div>
                                <span className="gradient-text" style={{ fontSize: "18px", fontWeight: 800 }}>
                                    TIVA
                                </span>
                            </div>
                            <button
                                className="hamburger-btn"
                                onClick={() => setMenuOpen(false)}
                                aria-label="Close menu"
                            >
                                <X size={22} />
                            </button>
                        </div>

                        <nav style={{ flex: 1 }}>
                            {navItems.map((item) => {
                                const Icon = item.icon;
                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        className={`sidebar-link ${isActive(item.href) ? "active" : ""}`}
                                        onClick={() => setMenuOpen(false)}
                                        style={{ display: "flex" }}
                                    >
                                        <Icon size={18} />
                                        <span>{item.label}</span>
                                    </Link>
                                );
                            })}
                        </nav>

                        <div
                            style={{
                                padding: "16px 20px",
                                borderTop: "1px solid var(--border-subtle)",
                            }}
                        >
                            <div style={{ marginBottom: "12px" }}>
                                <p style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-primary)" }}>
                                    {userName}
                                </p>
                                <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                                    {phone}
                                </p>
                            </div>
                            <button
                                onClick={() => signOut()}
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "8px",
                                    background: "none",
                                    border: "none",
                                    color: "var(--text-muted)",
                                    cursor: "pointer",
                                    fontSize: "14px",
                                    padding: "8px 0",
                                }}
                            >
                                <LogOut size={18} />
                                <span>Sign out</span>
                            </button>
                        </div>
                    </div>
                </>
            )}
        </>
    );
}
