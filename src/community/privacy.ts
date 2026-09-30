import type { VaultData } from "../lib/schema";

/** Words from the private records that should not appear in a public post. */
export function privateWords(d: VaultData): string[] {
  const words = new Set<string>();
  for (const c of d.children) {
    [c.firstName, c.lastName, c.school].forEach((w) => w.trim().length > 1 && words.add(w.trim()));
    c.contacts.forEach((x) => x.name.trim().length > 1 && words.add(x.name.trim()));
  }
  return [...words];
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Things in a public post that could identify a child or family. */
export function privacyWarnings(text: string, words: string[]): string[] {
  const found: string[] = [];
  for (const w of words) {
    if (new RegExp(`(^|[^\\p{L}])${escape(w)}($|[^\\p{L}])`, "iu").test(text)) found.push(`"${w}"`);
  }
  if (/[\w.+-]+@[\w-]+\.[\w.]+/.test(text)) found.push("an email address");
  if (/\+?\d[\d\s().-]{7,}\d/.test(text)) found.push("a phone number");
  return found;
}
