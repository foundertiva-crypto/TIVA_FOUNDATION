"use client";

import { useEffect, useRef, useCallback } from "react";

declare global {
    interface Window {
        turnstile?: {
            render: (
                container: string | HTMLElement,
                options: {
                    sitekey: string;
                    callback: (token: string) => void;
                    "expired-callback"?: () => void;
                    "error-callback"?: () => void;
                    theme?: "light" | "dark" | "auto";
                    size?: "normal" | "compact" | "flexible";
                }
            ) => string;
            reset: (widgetId: string) => void;
            remove: (widgetId: string) => void;
        };
        onTurnstileLoad?: () => void;
    }
}

interface TurnstileProps {
    onVerify: (token: string) => void;
    onExpire?: () => void;
    onError?: () => void;
    theme?: "light" | "dark" | "auto";
    size?: "normal" | "compact" | "flexible";
}

export default function Turnstile({
    onVerify,
    onExpire,
    onError,
    theme = "dark",
    size = "flexible",
}: TurnstileProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const widgetIdRef = useRef<string | null>(null);
    const scriptLoadedRef = useRef(false);

    const renderWidget = useCallback(() => {
        if (!containerRef.current || !window.turnstile) return;
        if (widgetIdRef.current) return; // Already rendered

        const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
        if (!siteKey) {
            console.warn("NEXT_PUBLIC_TURNSTILE_SITE_KEY not set");
            return;
        }

        widgetIdRef.current = window.turnstile.render(containerRef.current, {
            sitekey: siteKey,
            callback: onVerify,
            "expired-callback": () => {
                onExpire?.();
            },
            "error-callback": () => {
                onError?.();
            },
            theme,
            size,
        });
    }, [onVerify, onExpire, onError, theme, size]);

    useEffect(() => {
        // If turnstile script is already loaded, render immediately
        if (window.turnstile) {
            renderWidget();
            return;
        }

        // Load the Turnstile script
        if (!scriptLoadedRef.current) {
            scriptLoadedRef.current = true;

            window.onTurnstileLoad = () => {
                renderWidget();
            };

            const script = document.createElement("script");
            script.src =
                "https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onTurnstileLoad";
            script.async = true;
            script.defer = true;
            document.head.appendChild(script);
        }

        return () => {
            if (widgetIdRef.current && window.turnstile) {
                window.turnstile.remove(widgetIdRef.current);
                widgetIdRef.current = null;
            }
        };
    }, [renderWidget]);

    return (
        <div
            ref={containerRef}
            style={{
                display: "flex",
                justifyContent: "center",
                marginBottom: "16px",
                minHeight: "65px",
            }}
        />
    );
}
