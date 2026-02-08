export function parseUserAgent(uaRaw: string | null | undefined): {
  browser?: string;
  os?: string;
  deviceType?: "mobile" | "tablet" | "desktop" | "bot" | "unknown";
} {
  const ua = (uaRaw ?? "").trim();
  if (!ua) return {};

  const deviceType = (() => {
    if (/(bot|crawler|spider|crawling)/i.test(ua)) return "bot";
    if (/ipad|tablet|playbook|silk/i.test(ua)) return "tablet";
    if (/mobi|iphone|android/i.test(ua)) return "mobile";
    if (/windows|macintosh|linux|cros/i.test(ua)) return "desktop";
    return "unknown";
  })();

  const os = (() => {
    if (/windows nt/i.test(ua)) return "Windows";
    if (/android/i.test(ua)) return "Android";
    if (/iphone|ipad|ipod/i.test(ua)) return "iOS";
    if (/macintosh|mac os x/i.test(ua)) return "macOS";
    if (/cros/i.test(ua)) return "ChromeOS";
    if (/linux/i.test(ua)) return "Linux";
    return undefined;
  })();

  const browser = (() => {
    // order matters
    if (/edg\//i.test(ua)) return "Edge";
    if (/opr\//i.test(ua) || /opera/i.test(ua)) return "Opera";
    if (/chrome\//i.test(ua) && !/edg\//i.test(ua) && !/opr\//i.test(ua))
      return "Chrome";
    if (/safari\//i.test(ua) && !/chrome\//i.test(ua)) return "Safari";
    if (/firefox\//i.test(ua)) return "Firefox";
    return undefined;
  })();

  return { browser, os, deviceType };
}
