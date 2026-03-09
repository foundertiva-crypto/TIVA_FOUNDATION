"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    User,
    Share2,
    LayoutGrid,
    LogOut,
    ChevronLeft,
    ChevronRight,
    Sparkles,
    Menu,
    X,
} from "lucide-react";
import { signOut } from "@/app/actions/auth";

const navItems = [
    { href: "/services", label: "Services", icon: LayoutGrid },
    { href: "/services/profile", label: "Profile", icon: User },
    { href: "/dashboard", label: "Refer & Earn", icon: Share2 },
];

interface Props {
    userName: string;
    phone: string;
}

export function ServicesSidebar({ userName, phone }: Props) {
    const pathname = usePathname();
    const [collapsed, setCollapsed] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);

    const isActive = (href: string) =>
        pathname === href || (href !== "/services" && pathname.startsWith(href));

    return (
        <>
            {/* ─── Desktop Sidebar ──────────────────────────── */}
            <aside className={`services-sidebar ${collapsed ? "collapsed" : ""}`}>
                {/* Logo */}
                <div className="services-sidebar-logo">
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
                    {!collapsed && (
                        <span
                            className="gradient-text"
                            style={{ fontSize: "20px", fontWeight: 800 }}
                        >
                            TIVA
                        </span>
                    )}
                </div>

                {/* Nav Links */}
                <nav className="services-sidebar-nav">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`services-sidebar-link ${isActive(item.href) ? "active" : ""}`}
                                title={collapsed ? item.label : undefined}
                            >
                                <Icon size={20} />
                                {!collapsed && <span>{item.label}</span>}
                            </Link>
                        );
                    })}
                </nav>

                {/* Footer */}
                <div className="services-sidebar-footer">
                    {!collapsed && (
                        <div style={{ marginBottom: "12px" }}>
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
                    )}
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: collapsed ? "center" : "space-between",
                        }}
                    >
                        <button
                            onClick={() => signOut()}
                            className="services-sidebar-link"
                            title="Sign out"
                            style={{
                                background: "none",
                                border: "none",
                                cursor: "pointer",
                                width: collapsed ? "auto" : undefined,
                                padding: collapsed ? "12px" : undefined,
                            }}
                        >
                            <LogOut size={20} />
                            {!collapsed && <span>Log out</span>}
                        </button>
                    </div>
                </div>

                {/* Collapse Toggle */}
                <button
                    className="services-sidebar-toggle"
                    onClick={() => setCollapsed(!collapsed)}
                    aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                >
                    {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
                </button>
            </aside>

            {/* ─── Mobile Header ────────────────────────────── */}
            <header className="services-mobile-header">
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
                                <span>Log out</span>
                            </button>
                        </div>
                    </div>
                </>
            )}
        </>
    );
}
