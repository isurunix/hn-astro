// Workers-compatible HTML sanitizer for HN text fields.
// HN text only uses: <p>, <a href>, <i>, <b>, <pre>, <code>, <br>
// We allowlist exactly these tags, strip everything else, and sanitize <a> hrefs.

const ALLOWED_VOID = new Set(['br']);
const ALLOWED_BLOCK = new Set(['p', 'a', 'i', 'b', 'pre', 'code']);
const ALLOWED = new Set([...ALLOWED_VOID, ...ALLOWED_BLOCK]);

// Matches an HTML open or close tag with optional attributes
const TAG_RE = /<(\/?)([a-z][a-z0-9]*)([^>]*?)(\/?)\s*>/gi;
// Matches href="..." or href='...' inside an attribute string
const HREF_RE = /\bhref\s*=\s*(?:"([^"]*?)"|'([^']*?)'|([^\s>]*))/i;
// Protocols that must not appear in hrefs
const UNSAFE_HREF = /^\s*(?:javascript|data|vbscript):/i;

export function sanitize(html: string): string {
  return html.replace(TAG_RE, (_match, closing: string, tag: string, attrs: string) => {
    const t = tag.toLowerCase();
    if (!ALLOWED.has(t)) return '';

    if (closing) return `</${t}>`;

    if (t === 'a') {
      const m = HREF_RE.exec(attrs);
      const raw = m ? (m[1] ?? m[2] ?? m[3] ?? '') : '';
      if (UNSAFE_HREF.test(raw)) return '';
      const href = raw.replace(/"/g, '&quot;');
      return `<a href="${href}" rel="noopener noreferrer">`;
    }

    if (ALLOWED_VOID.has(t)) return `<${t}>`;

    return `<${t}>`;
  });
}
