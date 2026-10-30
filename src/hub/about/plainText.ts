/**
 * The text of a piece of JSX copy, without its markup — for where it is
 * drawn rather than laid out as HTML (the hologram fan's picture). Walks
 * strings, numbers, arrays and elements' children; anything else (`null`,
 * booleans) is nothing. No React import: an element is read as the plain
 * object it is.
 */
export function plainText(node: unknown): string {
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(plainText).join("");
  if (node && typeof node === "object" && "props" in node) {
    const props = (node as { props?: { children?: unknown } }).props;
    return plainText(props?.children);
  }
  return "";
}
