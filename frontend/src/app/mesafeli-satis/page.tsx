import { LegalPage } from "@/components/LegalPage";
import { legalMetadata } from "@/lib/legal-seo";

export const generateMetadata = () => legalMetadata("mesafeli-satis");

export default function Page() {
  return <LegalPage slug="mesafeli-satis" />;
}
