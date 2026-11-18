function bareHost(hostname: string): string {
  return hostname.toLowerCase().replace(/^www\./, "");
}

export function normalizeUrl(href: string, base?: string): string | null {
  let url: URL;
  try {
    url = new URL(href.trim(), base);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    return null;
  }

  url.protocol = "https:";
  url.hostname = url.hostname.toLowerCase();
  url.hash = "";
  url.search = "";
  url.username = "";
  url.password = "";
  url.port = "";
  if (url.pathname.length > 1 && url.pathname.endsWith("/")) {
    url.pathname = url.pathname.replace(/\/+$/, "");
  }
  return url.toString();
}

export function isSameSite(url: string, siteUrl: string): boolean {
  try {
    return bareHost(new URL(url).hostname) === bareHost(new URL(siteUrl).hostname);
  } catch {
    return false;
  }
}

export function isHttpsUrl(value: string): boolean {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}
