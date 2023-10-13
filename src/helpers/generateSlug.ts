import crypto from "node:crypto";

export function generateSlug(title: string) {
  const firstPartSlug = title
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, "-")
    .toLowerCase();
  const secondPartSlug = `${firstPartSlug}${Date.now()}`;

  const hash = crypto.createHash("sha256");
  hash.update(secondPartSlug);
  const hashedSecondPart = hash.digest("hex").slice(0, 8);
  return `${firstPartSlug}-${hashedSecondPart}`;
}
