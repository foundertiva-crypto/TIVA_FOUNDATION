"use client";

import { Suspense, useState, useRef, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { verifyOtp } from "@/app/actions/auth";
import { registerWithReferral } from "@/app/actions/referrals";
import { createClient } from "@/lib/supabase/client";
import { Shield, ArrowLeft } from "lucide-react";
import Turnstile from "@/components/turnstile";

function VerifyForm() {
    const [code, setCode] = useState(["", "", "", "", "", ""]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
    const router = useRouter();
    const searchParams = useSearchParams();
    const referralCode = searchParams.get("ref");

    useEffect(() => {
        inputRefs.current[0]?.focus();
    }, []);

    const handleTurnstileVerify = useCallback((token: string) => {
        setTurnstileToken(token);
    }, []);

    const handleTurnstileExpire = useCallback(() => {
        setTurnstileToken(null);
    }, []);

    const handleChange = (index: number, value: string) => {
        if (value.length > 1) value = value[value.length - 1];
        if (!/^\d*$/.test(value)) return;

        const newCode = [...code];
        newCode[index] = value;
        setCode(newCode);

        // Auto-advance
        if (value && index < 5) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
        if (e.key === "Backspace" && !code[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        e.preventDefault();
        const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
        const newCode = [...code];
        pasted.split("").forEach((char, i) => {
            newCode[i] = char;
        });
        setCode(newCode);
        inputRefs.current[Math.min(pasted.length, 5)]?.focus();
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        if (!turnstileToken) {
            setError("Please complete the security check.");
            setLoading(false);
            return;
        }

        const phone = sessionStorage.getItem("otp_phone");
        if (!phone) {
            router.push("/login");
            return;
        }

        const token = code.join("");
        const result = await verifyOtp(phone, token, turnstileToken);

        if (result.error) {
            setError(result.error);
            setLoading(false);
            return;
        }

        // Handle referral code if present
        if (referralCode) {
            await registerWithReferral(referralCode);
        }

        sessionStorage.removeItem("otp_phone");

        // Check user role to redirect admins to admin dashboard
        const supabase = createClient();
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        if (currentUser) {
            const { data: profile } = await supabase
                .from("profiles")
                .select("role")
                .eq("id", currentUser.id)
                .single();
            if (profile?.role === "admin") {
                router.push("/admin");
                return;
            }
        }

        router.push("/dashboard");
    };

    return (
        <div
            style={{
                minHeight: "100vh",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "16px",
                background: "var(--bg-primary)",
                position: "relative",
                overflow: "hidden",
            }}
        >
            <div
                style={{
                    position: "absolute",
                    width: "500px",
                    height: "500px",
                    borderRadius: "50%",
                    background: "radial-gradient(circle, rgba(0,210,255,0.12) 0%, transparent 70%)",
                    top: "-200px",
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
                <button
                    onClick={() => router.push("/login")}
                    style={{
                        background: "none",
                        border: "none",
                        color: "var(--text-secondary)",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        fontSize: "13px",
                        marginBottom: "24px",
                    }}
                >
                    <ArrowLeft size={16} /> Back to login
                </button>

                <div
                    style={{
                        width: "56px",
                        height: "56px",
                        borderRadius: "var(--radius-lg)",
                        background: "rgba(108,92,231,0.15)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        marginBottom: "20px",
                    }}
                >
                    <Shield size={28} color="var(--brand-primary)" />
                </div>

                <h1
                    style={{
                        fontSize: "24px",
                        fontWeight: 700,
                        marginBottom: "8px",
                        color: "var(--text-primary)",
                    }}
                >
                    Verify your phone
                </h1>
                <p
                    style={{
                        color: "var(--text-secondary)",
                        fontSize: "14px",
                        marginBottom: "32px",
                    }}
                >
                    Enter the 6-digit code sent to your phone
                </p>

                <form onSubmit={handleSubmit}>
                    <div
                        style={{
                            display: "flex",
                            gap: "clamp(6px, 2vw, 10px)",
                            marginBottom: "24px",
                            justifyContent: "center",
                        }}
                    >
                        {code.map((digit, index) => (
                            <input
                                key={index}
                                ref={(el) => { inputRefs.current[index] = el; }}
                                type="text"
                                inputMode="numeric"
                                maxLength={1}
                                value={digit}
                                onChange={(e) => handleChange(index, e.target.value)}
                                onKeyDown={(e) => handleKeyDown(index, e)}
                                onPaste={index === 0 ? handlePaste : undefined}
                                className="input-field"
                                style={{
                                    width: "clamp(40px, 11vw, 52px)",
                                    height: "clamp(44px, 12vw, 56px)",
                                    textAlign: "center",
                                    fontSize: "22px",
                                    fontWeight: 700,
                                    padding: "0",
                                }}
                            />
                        ))}
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
                        disabled={loading || code.some((d) => !d) || !turnstileToken}
                        style={{
                            width: "100%",
                            fontSize: "16px",
                        }}
                    >
                        {loading ? "Verifying..." : "Verify & Continue"}
                    </button>
                </form>
            </div>
        </div>
    );
}

export default function VerifyPage() {
    return (
        <Suspense
            fallback={
                <div
                    style={{
                        minHeight: "100vh",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: "var(--bg-primary)",
                        color: "var(--text-muted)",
                    }}
                >
                    Loading...
                </div>
            }
        >
            <VerifyForm />
        </Suspense>
    );
}
