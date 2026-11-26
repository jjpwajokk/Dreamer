// Optional social links on member profiles and organisation pages.
// Shared by server and client: no secrets here.

export const SOCIAL_PLATFORMS = [
  { key: "instagram", label: "Instagram", hosts: ["instagram.com"], base: "https://instagram.com/", placeholder: "@yourname" },
  { key: "facebook", label: "Facebook", hosts: ["facebook.com", "fb.com"], base: "https://facebook.com/", placeholder: "facebook.com/yourpage" },
  { key: "linkedin", label: "LinkedIn", hosts: ["linkedin.com"], base: "https://linkedin.com/in/", placeholder: "linkedin.com/in/yourname" },
  { key: "x", label: "X (Twitter)", hosts: ["x.com", "twitter.com"], base: "https://x.com/", placeholder: "@yourname" },
  { key: "tiktok", label: "TikTok", hosts: ["tiktok.com"], base: "https://tiktok.com/@", placeholder: "@yourname" },
  { key: "youtube", label: "YouTube", hosts: ["youtube.com", "youtu.be"], base: "https://youtube.com/@", placeholder: "@yourchannel" },
] as const;

export type SocialKey = (typeof SOCIAL_PLATFORMS)[number]["key"];
export type Socials = Partial<Record<SocialKey, string>>;
export type SocialsVisibility = "members" | "on_request" | "hidden";

export const SOCIALS_VISIBILITY_LABEL: Record<SocialsVisibility, string> = {
  members: "Members can see them",
  on_request: "Only people I approve",
  hidden: "Keep them private",
};

const HANDLE = /^[A-Za-z0-9._-]{1,60}$/;

/**
 * Turns what someone typed ("@ada", "instagram.com/ada", a full link) into a
 * clean https link on that platform. Returns null for empty input, and throws
 * a friendly message for a link to some other site.
 */
export function normaliseSocial(key: SocialKey, raw: string): string | null {
  const p = SOCIAL_PLATFORMS.find((x) => x.key === key)!;
  const v = raw.trim();
  if (!v) return null;
  const handle = v.replace(/^@/, "");
  if (HANDLE.test(handle) && !handle.includes(".")) return p.base + handle;
  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(v) ? v : `https://${v}`);
  } catch {
    throw new Error(`That ${p.label} link doesn't look right`);
  }
  const host = url.hostname.toLowerCase().replace(/^(www\.|m\.|web\.)/, "");
  if (!p.hosts.some((h) => host === h || host.endsWith(`.${h}`))) {
    throw new Error(`Add a ${p.label} link or handle there`);
  }
  if (url.pathname.length < 2) throw new Error(`Add your ${p.label} page, not just the site`);
  url.protocol = "https:";
  url.search = "";
  url.hash = "";
  return url.toString().slice(0, 200);
}

/** Reads socials_* fields from a form. Throws a friendly message on a bad link. */
export function socialsFromForm(form: FormData | Record<string, unknown>): Socials {
  const get = (k: string) => {
    const v = form instanceof FormData ? form.get(k) : form[k];
    return typeof v === "string" ? v : "";
  };
  const out: Socials = {};
  for (const p of SOCIAL_PLATFORMS) {
    const link = normaliseSocial(p.key, get(`social_${p.key}`).slice(0, 200));
    if (link) out[p.key] = link;
  }
  return out;
}

export function visibilityFromForm(v: unknown): SocialsVisibility {
  return v === "on_request" || v === "hidden" ? v : "members";
}

/** Only keeps known platforms with https links (defends against odd stored data). */
export function cleanSocials(value: unknown): Socials {
  if (!value || typeof value !== "object") return {};
  const out: Socials = {};
  for (const p of SOCIAL_PLATFORMS) {
    const v = (value as Record<string, unknown>)[p.key];
    if (typeof v === "string" && v.startsWith("https://")) out[p.key] = v;
  }
  return out;
}

export function socialLabel(key: SocialKey) {
  return SOCIAL_PLATFORMS.find((p) => p.key === key)!.label;
}
