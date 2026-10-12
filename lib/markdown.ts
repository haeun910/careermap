export function normalizeAnalysisMarkdown(text: string) {
  const value = text.replace(/\r\n?/g, "\n").trim();
  // Some providers wrap an entire prose response as a Markdown code example.
  const wrapper =
    /^```(?:markdown|md|text)?[ \t]*\n([\s\S]*?)\n```[ \t]*$/i.exec(value);
  return wrapper ? wrapper[1] : value;
}
type HtmlNode = {
  type: string;
  value?: string;
  tagName?: string;
  properties?: Record<string, unknown>;
  children?: HtmlNode[];
};
export function rehypeLineBreaks() {
  // Convert only a bare line break, including in GFM table cells. All other
  // raw HTML is still skipped; this does not parse or execute arbitrary HTML.
  return (tree: HtmlNode) => {
    function visit(node: HtmlNode) {
      if (!node.children) return;
      node.children = node.children.map((child) => {
        if (
          child.type === "raw" &&
          /^<br\s*\/?\s*>$/i.test(child.value?.trim() || "")
        )
          return {
            type: "element",
            tagName: "br",
            properties: {},
            children: [],
          };
        visit(child);
        return child;
      });
    }
    visit(tree);
  };
}
