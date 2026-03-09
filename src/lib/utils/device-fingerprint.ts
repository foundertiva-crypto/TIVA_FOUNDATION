/**
 * Device fingerprinting utility.
 * Creates a hash from browser characteristics to detect duplicate registrations.
 */

export async function generateDeviceFingerprint(): Promise<string> {
    const components: string[] = [];

    // Screen properties
    components.push(`${screen.width}x${screen.height}`);
    components.push(`${screen.colorDepth}`);
    components.push(`${window.devicePixelRatio}`);

    // Navigator properties
    components.push(navigator.language);
    components.push(navigator.platform);
    components.push(`${navigator.hardwareConcurrency || "unknown"}`);
    components.push(`${(navigator as unknown as { deviceMemory?: number }).deviceMemory || "unknown"}`);

    // Timezone
    components.push(Intl.DateTimeFormat().resolvedOptions().timeZone);

    // Canvas fingerprint
    try {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (ctx) {
            canvas.width = 200;
            canvas.height = 50;
            ctx.textBaseline = "top";
            ctx.font = "14px Arial";
            ctx.fillStyle = "#f60";
            ctx.fillRect(125, 1, 62, 20);
            ctx.fillStyle = "#069";
            ctx.fillText("TIVA-FP", 2, 15);
            ctx.fillStyle = "rgba(102, 204, 0, 0.7)";
            ctx.fillText("TIVA-FP", 4, 17);
            components.push(canvas.toDataURL());
        }
    } catch {
        components.push("canvas-unavailable");
    }

    // WebGL renderer
    try {
        const canvas = document.createElement("canvas");
        const gl = canvas.getContext("webgl");
        if (gl) {
            const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
            if (debugInfo) {
                components.push(gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL));
            }
        }
    } catch {
        components.push("webgl-unavailable");
    }

    // Hash all components
    const raw = components.join("|||");
    const encoder = new TextEncoder();
    const data = encoder.encode(raw);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}
