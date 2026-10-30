import { ExternalLink } from "lucide-react";
import { GithubIcon } from "@/ui/icons";
import type { Project } from "@/data";
import { isPlaceholderUrl } from "@/detail/products/catalog";

type Props = {
  project: Project;
};

const BUTTON =
  "flex-1 py-3 px-5 flex items-center justify-center gap-2 whitespace-nowrap rounded-none font-mono font-bold text-xs sm:text-sm uppercase transition-all";

/**
 * "Play Now" and "View Code", for a product's own page — the popup's pair,
 * with the popup's labels and shapes, in the site's box style.
 *
 * Trying the product is the one thing these pages exist to lead to, so Play
 * is the only filled button on them. The hub's `ProjectLinks` intercepts a
 * placeholder URL ("#") with a toast; a static page has no toast to show, so
 * an unreleased product says so in words, in the button's place, instead of
 * offering a dead button.
 *
 * Plain <a>, not next/link, for the same reason as `ProjectLinks`: a local
 * demo (`/archive/v1`) is a separate static build, not one of our routes.
 */
export default function ProductActions({ project }: Props) {
  const playable = !isPlaceholderUrl(project.demoUrl);
  const hasCode = !isPlaceholderUrl(project.githubUrl);

  return (
    <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 font-mono">
      {playable ? (
        <a
          href={project.demoUrl}
          className={`${BUTTON} bg-neutral-900 hover:bg-black text-white border border-black active:scale-95`}
        >
          <ExternalLink size={16} aria-hidden="true" />
          Play Now
        </a>
      ) : (
        // Not a button, so it may wrap: at 320px the sentence is wider than
        // the column, and `BUTTON` would hold it to one line.
        <p className="flex-1 py-3 px-5 flex items-center justify-center text-center rounded-none border border-dashed border-black/20 font-bold text-xs sm:text-sm text-neutral-600">
          開発中のため、まだ公開していません
        </p>
      )}
      {hasCode && (
        <a
          href={project.githubUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`${BUTTON} bg-white hover:bg-neutral-100 border border-black/20 text-neutral-900 active:scale-95`}
        >
          <GithubIcon size={16} />
          View Code
        </a>
      )}
    </div>
  );
}
