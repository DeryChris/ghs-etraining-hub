/**
 * XSS Input Sanitizer for discussion threads and user-generated content.
 * Strips dangerous HTML attributes and scripts while preserving safe formatting.
 */

const ALLOWED_TAGS = [
  "p", "br", "strong", "em", "u", "ul", "ol", "li", "blockquote", "code", "pre",
];

const ALLOWED_ATTRIBUTES: Record<string, string[]> = {
  "*": [],
  "a": ["href", "title"],
  "code": [],
  "pre": [],
};

// Dangerous patterns to remove
const SCRIPT_TAG = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi;
const EVENT_HANDLER = /\s+(?:on\w+)\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi;
const JAVASCRIPT_URL = /javascript:/gi;
const DATA_URL = /data:(?:text\/html|application\/x-/gi;

export function sanitizeHtml(input: string): string {
  if (typeof input !== "string") return "";

  let sanitized = input
    .replace(SCRIPT_TAG, "")
    .replace(EVENT_HANDLER, "")
    .replace(JAVASCRIPT_URL, "")
    .replace(DATA_URL, "");

  // Strip any remaining tags not in the allowed list
  const tagRegex = /<\/?(\w+)[^>]*>/g;
  sanitized = sanitized.replace(tagRegex, (match, tagName) => {
    const lowerTag = tagName.toLowerCase();
    if (ALLOWED_TAGS.includes(lowerTag)) {
      // Strip disallowed attributes from allowed tags
      return match.replace(/\s+\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/g, "");
    }
    return "";
  });

  return sanitized.trim();
}

export function sanitizeText(input: string): string {
  if (typeof input !== "string") return "";
  return input
    .replace(/<[^>]*>/g, "")
    .replace(/javascript:/gi, "")
    .replace(/on\w+=/gi, "")
    .trim();
}
