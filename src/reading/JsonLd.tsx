import { jsonLdText } from "./structuredData";

/** Structured data for search engines (`structuredData.ts`), in the page. */
export default function JsonLd({ data }: { data: object }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdText(data) }} />;
}
