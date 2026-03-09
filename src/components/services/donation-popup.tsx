"use client";

import { useState } from "react";
import { X, Heart, RefreshCw, Check, IndianRupee } from "lucide-react";

type TabType = "one-time" | "monthly";

const tiers = [
    {
        id: "tier-1",
        amount: 101,
        label: "Seva",
        description: "Feed a cow for one day with nutritious fodder and clean water.",
    },
    {
        id: "tier-2",
        amount: 501,
        label: "Poshak",
        description: "Provide a week of care including food, shelter & basic medical check-up.",
        popular: true,
    },
    {
        id: "tier-3",
        amount: 1001,
        label: "Raksha",
        description: "Sponsor a full month of comprehensive care, medicine & rescue support.",
    },
];

interface DonationPopupProps {
    isOpen: boolean;
    onClose: () => void;
}

export function DonationPopup({ isOpen, onClose }: DonationPopupProps) {
    const [activeTab, setActiveTab] = useState<TabType>("one-time");
    const [selectedTier, setSelectedTier] = useState<string>("tier-2");
    const [monthlyAmount, setMonthlyAmount] = useState("");
    const [monthlyError, setMonthlyError] = useState("");
    const [showSuccess, setShowSuccess] = useState(false);

    if (!isOpen) return null;

    const handleMonthlyAmountChange = (val: string) => {
        setMonthlyAmount(val);
        const num = Number(val);
        if (val && (isNaN(num) || num < 10)) {
            setMonthlyError("Minimum amount is ₹10");
        } else {
            setMonthlyError("");
        }
    };

    const handleProceed = () => {
        if (activeTab === "monthly") {
            const num = Number(monthlyAmount);
            if (!monthlyAmount || isNaN(num) || num < 10) {
                setMonthlyError("Please enter at least ₹10");
                return;
            }
        }
        setShowSuccess(true);
        setTimeout(() => {
            setShowSuccess(false);
            onClose();
        }, 2500);
    };

    const getSelectedAmount = () => {
        if (activeTab === "one-time") {
            return tiers.find((t) => t.id === selectedTier)?.amount || 0;
        }
        return Number(monthlyAmount) || 0;
    };

    return (
        <>
            {/* Overlay */}
            <div className="donation-popup-overlay" onClick={onClose} />

            {/* Modal */}
            <div className="donation-popup-modal">
                {/* Success State */}
                {showSuccess ? (
                    <div className="donation-popup-success">
                        <div className="donation-popup-success-icon">
                            <Check size={32} color="white" />
                        </div>
                        <h3 style={{ fontSize: "22px", fontWeight: 700, marginBottom: "8px" }}>
                            Thank You! 🙏
                        </h3>
                        <p style={{ color: "var(--text-secondary)", fontSize: "14px" }}>
                            Your donation of ₹{getSelectedAmount().toLocaleString()} will make a real difference.
                        </p>
                    </div>
                ) : (
                    <>
                        {/* Header */}
                        <div className="donation-popup-header">
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
                                <div>
                                    <h3 style={{ fontSize: "18px", fontWeight: 700, color: "var(--text-primary)" }}>
                                        Donate for Cow Seva
                                    </h3>
                                    <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                                        Every rupee counts
                                    </p>
                                </div>
                            </div>
                            <button className="donation-popup-close" onClick={onClose}>
                                <X size={20} />
                            </button>
                        </div>

                        {/* Tab Switcher */}
                        <div className="donation-tab-switcher">
                            <button
                                className={`donation-tab ${activeTab === "one-time" ? "active" : ""}`}
                                onClick={() => setActiveTab("one-time")}
                            >
                                <Heart size={16} />
                                <span>One-Time</span>
                            </button>
                            <button
                                className={`donation-tab ${activeTab === "monthly" ? "active" : ""}`}
                                onClick={() => setActiveTab("monthly")}
                            >
                                <RefreshCw size={16} />
                                <span>Monthly Autopay</span>
                            </button>
                        </div>

                        {/* Content */}
                        <div className="donation-popup-body">
                            {activeTab === "one-time" ? (
                                <div className="donation-tiers">
                                    {tiers.map((tier) => (
                                        <button
                                            key={tier.id}
                                            className={`donation-tier-card ${selectedTier === tier.id ? "selected" : ""}`}
                                            onClick={() => setSelectedTier(tier.id)}
                                        >
                                            {tier.popular && (
                                                <span className="donation-tier-popular">Most Popular</span>
                                            )}
                                            <div className="donation-tier-amount">
                                                <IndianRupee size={18} />
                                                <span>{tier.amount.toLocaleString()}</span>
                                            </div>
                                            <div className="donation-tier-label">{tier.label}</div>
                                            <p className="donation-tier-desc">{tier.description}</p>
                                            {selectedTier === tier.id && (
                                                <div className="donation-tier-check">
                                                    <Check size={14} />
                                                </div>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <div className="donation-monthly">
                                    <p style={{ color: "var(--text-secondary)", fontSize: "14px", marginBottom: "16px", lineHeight: 1.6 }}>
                                        Set up a recurring monthly donation. Your card will be charged automatically
                                        every month until you cancel. Minimum ₹10/month.
                                    </p>
                                    <label className="donation-monthly-label">
                                        Monthly Amount (₹)
                                    </label>
                                    <div className="donation-monthly-input-wrap">
                                        <IndianRupee
                                            size={18}
                                            style={{
                                                position: "absolute",
                                                left: "14px",
                                                top: "50%",
                                                transform: "translateY(-50%)",
                                                color: "var(--text-muted)",
                                            }}
                                        />
                                        <input
                                            type="number"
                                            className="input-field"
                                            placeholder="Enter amount (min ₹10)"
                                            value={monthlyAmount}
                                            onChange={(e) => handleMonthlyAmountChange(e.target.value)}
                                            min={10}
                                            style={{ paddingLeft: "42px" }}
                                        />
                                    </div>
                                    {monthlyError && (
                                        <p style={{ color: "var(--brand-accent)", fontSize: "12px", marginTop: "6px" }}>
                                            {monthlyError}
                                        </p>
                                    )}

                                    {/* Quick amount buttons */}
                                    <div className="donation-monthly-quick">
                                        {[50, 100, 251, 500].map((amt) => (
                                            <button
                                                key={amt}
                                                className={`donation-quick-btn ${monthlyAmount === String(amt) ? "active" : ""}`}
                                                onClick={() => {
                                                    setMonthlyAmount(String(amt));
                                                    setMonthlyError("");
                                                }}
                                            >
                                                ₹{amt}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="donation-popup-footer">
                            <button
                                className="btn-primary"
                                onClick={handleProceed}
                                disabled={activeTab === "monthly" && (!monthlyAmount || !!monthlyError)}
                                style={{
                                    width: "100%",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    gap: "8px",
                                    fontSize: "16px",
                                    padding: "14px 28px",
                                    background: "linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%)",
                                    boxShadow: "0 4px 20px rgba(255, 107, 107, 0.3)",
                                }}
                            >
                                <Heart size={18} />
                                <span>
                                    {activeTab === "one-time"
                                        ? `Donate ₹${(tiers.find((t) => t.id === selectedTier)?.amount || 0).toLocaleString()}`
                                        : monthlyAmount
                                        ? `Subscribe ₹${Number(monthlyAmount).toLocaleString()}/month`
                                        : "Proceed to Pay"}
                                </span>
                            </button>
                            <p style={{ color: "var(--text-muted)", fontSize: "11px", textAlign: "center", marginTop: "10px" }}>
                                🔒 Payments are secure and encrypted. You can cancel anytime.
                            </p>
                        </div>
                    </>
                )}
            </div>
        </>
    );
}
