/** The part of an address people recognise: its host. The full address goes in a title for hover. */
export function urlHost(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

/**
 * A receiver's reply as one line of text: an HTML error page becomes its words ("502 Bad Gateway"),
 * and anything long is cut.
 */
export function replyText(body: string | null | undefined, max = 140): string {
  if (!body) return "";
  const looksHtml = /<\/?[a-z][\s\S]*>/i.test(body);
  const text = (looksHtml ? (/<title>([\s\S]*?)<\/title>/i.exec(body)?.[1] ?? body.replace(/<[^>]*>/g, " ")) : body)
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}
