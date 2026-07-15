import { LegalPage } from "@/components/LegalPage";
import { legalMetadata } from "@/lib/legal-seo";

export const generateMetadata = () => legalMetadata("iptal-iade");

export default function Page() {
  return <LegalPage slug="iptal-iade" />;
}
