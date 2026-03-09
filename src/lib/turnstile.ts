/**
 * Server-side Cloudflare Turnstile token verification.
 * Validates the captcha token against Cloudflare's siteverify endpoint.
 */
export async function verifyTurnstileToken(token: string): Promise<boolean> {
    const secretKey = process.env.TURNSTILE_SECRET_KEY;

    if (!secretKey) {
        console.warn("TURNSTILE_SECRET_KEY not set — skipping captcha verification");
        return true; // Allow in development when key is not set
    }

    try {
        const response = await fetch(
            "https://challenges.cloudflare.com/turnstile/v0/siteverify",
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    secret: secretKey,
                    response: token,
                }),
            }
        );

        const data = await response.json();
        return data.success === true;
    } catch (error) {
        console.error("Turnstile verification failed:", error);
        return false;
    }
}
