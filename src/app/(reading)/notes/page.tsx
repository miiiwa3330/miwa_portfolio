import type { Metadata } from "next";
import { NOTES, sortNotesNewestFirst } from "@/data";
import SectionHeading from "@/detail/SectionHeading";
import { readingMetadata } from "@/reading/pageMeta";
import NoteList from "@/reading/NoteList";

const DESCRIPTION =
  "作りながら考えたこと、つまずいたこと、うまくいった瞬間の気分を書いている技術日記です。きれいにまとまった解説ではなく、その時点で分かったことの記録です。";

export const metadata: Metadata = readingMetadata({
  path: "/notes",
  title: "ノート",
  description: DESCRIPTION,
  type: "website",
});

export default function NotesIndexPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6">
      <SectionHeading as="h1" className="mb-10 md:mb-14">Note</SectionHeading>
      <NoteList notes={sortNotesNewestFirst(NOTES)} />
    </div>
  );
}
