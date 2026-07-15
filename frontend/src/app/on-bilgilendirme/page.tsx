import { LegalPage } from "@/components/LegalPage";
import { legalMetadata } from "@/lib/legal-seo";

export const generateMetadata = () => legalMetadata("on-bilgilendirme");

export default function Page() {
  return <LegalPage slug="on-bilgilendirme" />;
}
