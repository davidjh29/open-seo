/** The registrable-looking host of a result URL: lowercase, without "www.". */
export function domainOf(url: string): string | null {
  try {
    const { hostname, protocol } = new URL(url);
    if (protocol !== "http:" && protocol !== "https:") return null;
    return hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
}

/** A result URL without its fragment, so one page is one cache entry. */
export function pageOf(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:")
      return null;
    parsed.hash = "";
    return parsed.toString();
  } catch {
    return null;
  }
}
