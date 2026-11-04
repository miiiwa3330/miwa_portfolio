import Hub from "@/hub/Hub";
import JsonLd from "@/reading/JsonLd";
import { websiteJsonLd } from "@/reading/structuredData";

export default function HomePage() {
  return (
    <>
      <JsonLd data={websiteJsonLd()} />
      <Hub />
    </>
  );
}
