"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { sendOtp } from "@/app/actions/auth";
import { Phone, ArrowRight, Sparkles } from "lucide-react";
import Turnstile from "@/components/turnstile";

export default function LoginPage() {
    const [phone, setPhone] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
    const router = useRouter();

    const handleTurnstileVerify = useCallback((token: string) => {
        setTurnstileToken(token);
    }, []);

    const handleTurnstileExpire = useCallback(() => {
        setTurnstileToken(null);
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        if (!turnstileToken) {
            setError("Please complete the security check.");
            setLoading(false);
            return;
        }

        const formatted = phone.startsWith("+") ? phone : `+91${phone}`;
        const result = await sendOtp(formatted, turnstileToken);

        if (result.error) {
            setError(result.error);
            setLoading(false);
        } else {
            sessionStorage.setItem("otp_phone", formatted);
            router.push("/verify");
        }
    };

    return (
        <div
            style={{
                minHeight: "100vh",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "24px",
                background: "var(--bg-primary)",
                position: "relative",
                overflow: "hidden",
            }}
        >
            {/* Background glow effects */}
            <div
                style={{
                    position: "absolute",
                    width: "500px",
                    height: "500px",
                    borderRadius: "50%",
                    background: "radial-gradient(circle, rgba(108,92,231,0.15) 0%, transparent 70%)",
                    top: "-200px",
                    right: "-100px",
                    pointerEvents: "none",
                }}
            />
            <div
                style={{
                    position: "absolute",
                    width: "400px",
                    height: "400px",
                    borderRadius: "50%",
                    background: "radial-gradient(circle, rgba(0,210,255,0.1) 0%, transparent 70%)",
                    bottom: "-150px",
                    left: "-100px",
                    pointerEvents: "none",
                }}
            />

            <div
                className="glass-card animate-fade-in"
                style={{
                    maxWidth: "440px",
                    width: "100%",
                    padding: "clamp(24px, 5vw, 48px) clamp(20px, 5vw, 40px)",
                    position: "relative",
                    zIndex: 1,
                }}
            >
                {/* Logo */}
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        marginBottom: "8px",
                    }}
                >
                    <div
                        style={{
                            width: "48px",
                            height: "48px",
                            borderRadius: "var(--radius-md)",
                            background: "var(--gradient-brand)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                        }}
                    >
                        <Sparkles size={24} color="white" />
                    </div>
                    <span
                        className="gradient-text"
                        style={{ fontSize: "28px", fontWeight: 800 }}
                    >
                        TIVA
                    </span>
                </div>

                <h1
                    style={{
                        fontSize: "24px",
                        fontWeight: 700,
                        marginBottom: "8px",
                        color: "var(--text-primary)",
                    }}
                >
                    Welcome back
                </h1>
                <p
                    style={{
                        color: "var(--text-secondary)",
                        fontSize: "14px",
                        marginBottom: "32px",
                    }}
                >
                    Enter your phone number to start the referral challenge
                </p>

                <form onSubmit={handleSubmit}>
                    <label
                        style={{
                            display: "block",
                            fontSize: "13px",
                            fontWeight: 600,
                            color: "var(--text-secondary)",
                            marginBottom: "8px",
                            textTransform: "uppercase",
                            letterSpacing: "0.5px",
                        }}
                    >
                        Phone Number
                    </label>
                    <div style={{ position: "relative", marginBottom: "20px" }}>
                        <Phone
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
                            type="tel"
                            className="input-field"
                            placeholder="+91 9876543210"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            required
                            style={{ paddingLeft: "42px" }}
                        />
                    </div>

                    {/* Cloudflare Turnstile Captcha */}
                    <Turnstile
                        onVerify={handleTurnstileVerify}
                        onExpire={handleTurnstileExpire}
                    />

                    {error && (
                        <div
                            style={{
                                padding: "12px 16px",
                                borderRadius: "var(--radius-sm)",
                                background: "rgba(255, 107, 107, 0.1)",
                                border: "1px solid rgba(255, 107, 107, 0.3)",
                                color: "var(--brand-accent)",
                                fontSize: "13px",
                                marginBottom: "20px",
                            }}
                        >
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        className="btn-primary"
                        disabled={loading || !phone || !turnstileToken}
                        style={{
                            width: "100%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "8px",
                            fontSize: "16px",
                        }}
                    >
                        {loading ? (
                            <span>Sending OTP...</span>
                        ) : (
                            <>
                                <span>Continue</span>
                                <ArrowRight size={18} />
                            </>
                        )}
                    </button>
                </form>

                <p
                    style={{
                        color: "var(--text-muted)",
                        fontSize: "12px",
                        textAlign: "center",
                        marginTop: "24px",
                    }}
                >
                    By continuing, you agree to our Terms of Service & Privacy Policy
                </p>
            </div>
        </div>
    );
}
