import { LegalPage } from "@/components/LegalPage";
import { legalMetadata } from "@/lib/legal-seo";

export const generateMetadata = () => legalMetadata("guvenli-alisveris");

export default function Page() {
  return <LegalPage slug="guvenli-alisveris" />;
}
