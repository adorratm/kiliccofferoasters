import { LegalPage } from "@/components/LegalPage";
import { legalMetadata } from "@/lib/legal-seo";

export const generateMetadata = () => legalMetadata("musteri-memnuniyeti");

export default function Page() {
  return <LegalPage slug="musteri-memnuniyeti" />;
}
