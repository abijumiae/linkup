import type { Metadata } from "next";
import LegalDocumentShell from "../components/LegalDocumentShell";
import LegalMarkdown from "../components/LegalMarkdown";
import { readLegalDocument } from "@/src/lib/legalContent";

export const metadata: Metadata = {
  title: "Terms and Conditions · LinkUp",
  description: "LinkUp Terms and Conditions for www.thelinkupzone.com",
};

export default function TermsPage() {
  const content = readLegalDocument("terms");

  return (
    <LegalDocumentShell>
      <LegalMarkdown source={content} />
    </LegalDocumentShell>
  );
}
