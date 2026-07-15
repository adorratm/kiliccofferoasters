import { LegalPage } from "@/components/LegalPage";
import { legalMetadata } from "@/lib/legal-seo";

export const generateMetadata = () => legalMetadata("cerez-politikasi");

export default function Page() {
  return <LegalPage slug="cerez-politikasi" />;
}
