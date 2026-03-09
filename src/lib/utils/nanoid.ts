/**
 * Tiny nanoid implementation — no external dependency.
 * Generates URL-safe random IDs.
 */
const ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyz";

export function nanoid(size = 12): string {
    const bytes = new Uint8Array(size);
    crypto.getRandomValues(bytes);
    let id = "";
    for (let i = 0; i < size; i++) {
        id += ALPHABET[bytes[i] % ALPHABET.length];
    }
    return id;
}
