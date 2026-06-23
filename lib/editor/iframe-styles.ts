export function copyStyles(doc: Document): void {
  document
    .querySelectorAll('style, link[rel="stylesheet"]')
    .forEach((n) => doc.head.appendChild(n.cloneNode(true)));

  const adopted = (document as unknown as { adoptedStyleSheets?: CSSStyleSheet[] })
    .adoptedStyleSheets;
  if (adopted) {
    for (const sheet of adopted) {
      try {
        const text = Array.from(sheet.cssRules)
          .map((r) => r.cssText)
          .join("\n");
        if (text) {
          const el = doc.createElement("style");
          el.textContent = text;
          doc.head.appendChild(el);
        }
      } catch {
        /* inaccessible sheet — skip */
      }
    }
  }
}
