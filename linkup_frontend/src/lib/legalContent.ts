import { readFileSync } from "fs";
import path from "path";

export type LegalDocumentSlug = "terms" | "privacy";

const FILE_NAMES: Record<LegalDocumentSlug, string> = {
  terms: "terms-and-conditions.md",
  privacy: "privacy-policy.md",
};

export function readLegalDocument(slug: LegalDocumentSlug): string {
  const filePath = path.join(process.cwd(), "content", FILE_NAMES[slug]);
  return readFileSync(filePath, "utf-8");
}
