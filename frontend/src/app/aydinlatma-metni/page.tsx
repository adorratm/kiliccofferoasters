import { LegalPage } from "@/components/LegalPage";
import { legalMetadata } from "@/lib/legal-seo";

export const generateMetadata = () => legalMetadata("aydinlatma-metni");

export default function Page() {
  return <LegalPage slug="aydinlatma-metni" />;
}
