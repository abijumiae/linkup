import type { Metadata } from "next";
import LegalDocumentShell from "../components/LegalDocumentShell";
import LegalMarkdown from "../components/LegalMarkdown";
import { readLegalDocument } from "@/src/lib/legalContent";

export const metadata: Metadata = {
  title: "Privacy Policy · LinkUp",
  description: "LinkUp Privacy Policy for www.thelinkupzone.com",
};

export default function PrivacyPage() {
  const content = readLegalDocument("privacy");

  return (
    <LegalDocumentShell>
      <LegalMarkdown source={content} />
    </LegalDocumentShell>
  );
}
