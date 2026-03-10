"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard,
    Users,
    Shield,
    AlertTriangle,
    Gift,
    Trophy,
    Sparkles,
    LogOut,
    Menu,
    X,
    LayoutGrid,
} from "lucide-react";
import { signOut } from "@/app/actions/auth";

const navItems = [
    { href: "/admin", label: "Overview", icon: LayoutDashboard },
    { href: "/admin/users", label: "Users", icon: Users },
    { href: "/admin/kyc", label: "KYC", icon: Shield },
    { href: "/admin/fraud", label: "Fraud", icon: AlertTriangle },
    { href: "/admin/rewards", label: "Rewards", icon: Gift },
    { href: "/admin/challenges", label: "Challenges", icon: Trophy },
    { href: "/admin/services/cow-donation", label: "Services", icon: LayoutGrid },
];


export function AdminSidebar() {
    const pathname = usePathname();
    const [menuOpen, setMenuOpen] = useState(false);

    const isActive = (href: string) =>
        pathname === href || (href !== "/admin" && pathname.startsWith(href));

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
                            background: "var(--gradient-danger)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                        }}
                    >
                        <Sparkles size={18} color="white" />
                    </div>
                    <div>
                        <span
                            className="gradient-text"
                            style={{ fontSize: "18px", fontWeight: 800, display: "block" }}
                        >
                            TIVA
                        </span>
                        <span
                            style={{
                                fontSize: "10px",
                                color: "var(--brand-accent)",
                                fontWeight: 600,
                                textTransform: "uppercase",
                                letterSpacing: "1px",
                            }}
                        >
                            Admin Panel
                        </span>
                    </div>
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
                    <button
                        onClick={() => signOut()}
                        style={{
                            width: "100%",
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            color: "var(--text-muted)",
                            display: "flex",
                            alignItems: "center",
                            gap: "12px",
                            padding: "10px 12px",
                            borderRadius: "var(--radius-sm)",
                            fontSize: "14px",
                            transition: "all 0.2s",
                        }}
                    >
                        <LogOut size={18} />
                        <span>Logout</span>
                    </button>
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
                            background: "var(--gradient-danger)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                        }}
                    >
                        <Sparkles size={16} color="white" />
                    </div>
                    <div>
                        <span
                            className="gradient-text"
                            style={{ fontSize: "16px", fontWeight: 800, display: "block", lineHeight: 1 }}
                        >
                            TIVA
                        </span>
                        <span
                            style={{
                                fontSize: "8px",
                                color: "var(--brand-accent)",
                                fontWeight: 600,
                                textTransform: "uppercase",
                                letterSpacing: "0.5px",
                            }}
                        >
                            Admin
                        </span>
                    </div>
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
            <nav className="mobile-bottom-nav" aria-label="Admin navigation">
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
                                        background: "var(--gradient-danger)",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                    }}
                                >
                                    <Sparkles size={16} color="white" />
                                </div>
                                <div>
                                    <span className="gradient-text" style={{ fontSize: "16px", fontWeight: 800, display: "block", lineHeight: 1 }}>
                                        TIVA
                                    </span>
                                    <span style={{ fontSize: "9px", color: "var(--brand-accent)", fontWeight: 600, textTransform: "uppercase" }}>
                                        Admin
                                    </span>
                                </div>
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
                                <span>Logout</span>
                            </button>
                        </div>
                    </div>
                </>
            )}
        </>
    );
}
