// Vault encryption.
// A random 256-bit data key encrypts the vault with AES-GCM. The data key is stored
// twice: once locked by the user's password and once by a recovery code, both
// through PBKDF2-SHA256. Changing the password only re-locks the data key.

const enc = new TextEncoder();
const dec = new TextDecoder();

export const KDF_ITERATIONS = 600_000;

export interface Sealed {
  iv: string;
  data: string;
}
export interface WrappedKey extends Sealed {
  salt: string;
}
export interface Kdf {
  name: "PBKDF2";
  hash: "SHA-256";
  iterations: number;
}
export interface VaultFile {
  format: "handinhand-vault";
  version: 1;
  kdf: Kdf;
  keys: { password: WrappedKey; recovery: WrappedKey };
  payload: Sealed;
}
export interface ShareFile {
  format: "handinhand-share";
  version: 1;
  kdf: Kdf;
  salt: string;
  payload: Sealed;
}

export interface Session {
  raw: Uint8Array<ArrayBuffer>;
  key: CryptoKey;
  kdf: Kdf;
  keys: VaultFile["keys"];
}

export function toB64(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(s);
}

export function fromB64(b64: string): Uint8Array<ArrayBuffer> {
  const s = atob(b64);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

const random = (n: number) => crypto.getRandomValues(new Uint8Array(n));

async function deriveKek(secret: string, salt: Uint8Array<ArrayBuffer>, kdf: Kdf): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey("raw", enc.encode(secret.normalize("NFKC")), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: kdf.iterations, hash: kdf.hash },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

async function seal(key: CryptoKey, bytes: Uint8Array<ArrayBuffer>): Promise<Sealed> {
  const iv = random(12);
  const data = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, bytes));
  return { iv: toB64(iv), data: toB64(data) };
}

async function unseal(key: CryptoKey, sealed: Sealed): Promise<Uint8Array<ArrayBuffer>> {
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: fromB64(sealed.iv) }, key, fromB64(sealed.data));
  return new Uint8Array(plain);
}

async function wrap(raw: Uint8Array<ArrayBuffer>, secret: string, kdf: Kdf): Promise<WrappedKey> {
  const salt = random(16);
  const kek = await deriveKek(secret, salt, kdf);
  return { salt: toB64(salt), ...(await seal(kek, raw)) };
}

async function unwrap(w: WrappedKey, secret: string, kdf: Kdf): Promise<Uint8Array<ArrayBuffer>> {
  const kek = await deriveKek(secret, fromB64(w.salt), kdf);
  return unseal(kek, w);
}

const importKey = (raw: Uint8Array<ArrayBuffer>) =>
  crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["encrypt", "decrypt"]);

// Crockford base32 without ambiguous letters: 24 chars ≈ 120 bits.
const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

export function generateRecoveryCode(): string {
  const chars = Array.from(random(24), (b) => ALPHABET[b % 32]);
  return chars.join("").match(/.{4}/g)!.join("-");
}

export function normalizeRecoveryCode(code: string): string {
  const clean = code
    .toUpperCase()
    .replace(/[\s-]/g, "")
    .replace(/O/g, "0")
    .replace(/[IL]/g, "1");
  return clean.match(/.{1,4}/g)?.join("-") ?? "";
}

export async function createVault(password: string, data: unknown, kdf: Kdf = defaultKdf()) {
  const raw = random(32);
  const recoveryCode = generateRecoveryCode();
  const keys = { password: await wrap(raw, password, kdf), recovery: await wrap(raw, recoveryCode, kdf) };
  const session: Session = { raw, key: await importKey(raw), kdf, keys };
  return { session, recoveryCode, file: await sealVault(session, data) };
}

export async function sealVault(session: Session, data: unknown): Promise<VaultFile> {
  const payload = await seal(session.key, enc.encode(JSON.stringify(data)));
  return { format: "handinhand-vault", version: 1, kdf: session.kdf, keys: session.keys, payload };
}

/** Throws if the password or recovery code is wrong. */
export async function unlockVault<T>(file: VaultFile, secret: string, via: "password" | "recovery" = "password") {
  const s = via === "recovery" ? normalizeRecoveryCode(secret) : secret;
  const raw = await unwrap(file.keys[via], s, file.kdf);
  const session: Session = { raw, key: await importKey(raw), kdf: file.kdf, keys: file.keys };
  const data = JSON.parse(dec.decode(await unseal(session.key, file.payload))) as T;
  return { session, data };
}

export async function changePassword(session: Session, newPassword: string): Promise<void> {
  session.keys = { ...session.keys, password: await wrap(session.raw, newPassword, session.kdf) };
}

export async function newRecoveryCode(session: Session): Promise<string> {
  const code = generateRecoveryCode();
  session.keys = { ...session.keys, recovery: await wrap(session.raw, code, session.kdf) };
  return code;
}

export async function sealShare(data: unknown, password: string, kdf: Kdf = defaultKdf()): Promise<ShareFile> {
  const salt = random(16);
  const key = await deriveKek(password, salt, kdf);
  const payload = await seal(key, enc.encode(JSON.stringify(data)));
  return { format: "handinhand-share", version: 1, kdf, salt: toB64(salt), payload };
}

export async function openShare<T>(file: ShareFile, password: string): Promise<T> {
  const key = await deriveKek(password, fromB64(file.salt), file.kdf);
  return JSON.parse(dec.decode(await unseal(key, file.payload))) as T;
}

export function defaultKdf(iterations = KDF_ITERATIONS): Kdf {
  return { name: "PBKDF2", hash: "SHA-256", iterations };
}

export function parseFile(text: string): VaultFile | ShareFile | null {
  try {
    const obj = JSON.parse(text);
    if (obj?.format === "handinhand-vault" || obj?.format === "handinhand-share") return obj;
  } catch {
    /* not JSON */
  }
  return null;
}
