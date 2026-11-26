import { CATEGORIES, SECTORS, type Category } from "./sectors";
export type { Category };

export const NIGERIAN_STATES = [
  "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno", "Cross River", "Delta",
  "Ebonyi", "Edo", "Ekiti", "Enugu", "FCT", "Gombe", "Imo", "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi",
  "Kogi", "Kwara", "Lagos", "Nasarawa", "Niger", "Ogun", "Ondo", "Osun", "Oyo", "Plateau", "Rivers", "Sokoto",
  "Taraba", "Yobe", "Zamfara",
] as const;

export type NeedStatus =
  | "draft" | "submitted" | "needs_info" | "live" | "funded" | "paid_out" | "completed" | "rejected" | "expired";

export const CATEGORY_LABEL = Object.fromEntries(CATEGORIES.map((c) => [c, SECTORS[c].label])) as Record<Category, string>;

export const STATUS_LABEL: Record<NeedStatus, string> = {
  draft: "Draft",
  submitted: "Under review",
  needs_info: "More info needed",
  live: "Live",
  funded: "Fully funded",
  paid_out: "Paid to institution",
  completed: "Completed",
  rejected: "Not approved",
  expired: "Expired",
};

export const RELATIONSHIP_LABEL: Record<string, string> = {
  self: "Myself",
  parent: "My child",
  guardian: "Someone I am guardian to",
  teacher: "My student",
  religious_leader: "A member of my congregation",
  other: "Someone else I know",
};

export const MILESTONES: { value: string; label: string; category?: Category }[] = [
  { value: "enrolled", label: "Enrolled", category: "education" },
  { value: "back_in_class", label: "Back in class", category: "education" },
  { value: "results", label: "Results are in", category: "education" },
  { value: "graduated", label: "Graduated", category: "education" },
  { value: "treated", label: "Treatment done", category: "healthcare" },
  { value: "discharged", label: "Discharged", category: "healthcare" },
  { value: "recovering", label: "Recovering", category: "healthcare" },
  { value: "moved_in", label: "Rent paid, home secured", category: "housing" },
  { value: "business_running", label: "Business is running", category: "livelihood" },
  { value: "certified", label: "Trained and certified", category: "skills" },
  { value: "back_on_feet", label: "Back on their feet", category: "emergency" },
  { value: "back_to_work", label: "Back to work" },
  { value: "progress", label: "Progress" },
  { value: "thank_you", label: "Thank you" },
];

export function milestoneLabel(value: string): string {
  return MILESTONES.find((m) => m.value === value)?.label ?? "Update";
}

export const CHECK_LABEL: Record<string, string> = {
  identity: "Identity confirmed",
  amount: "Amount confirmed with the institution",
  institution: "Institution confirmed by phone",
  account: "Institution bank account confirmed",
  story: "Story is consistent with documents",
};

const dateFormatter = new Intl.DateTimeFormat("en-NG", { day: "numeric", month: "short", year: "numeric" });
const shortDateFormatter = new Intl.DateTimeFormat("en-NG", { day: "numeric", month: "short" });

export function formatDate(value: string | Date | null | undefined, short = false): string {
  if (!value) return "";
  const d = typeof value === "string" ? new Date(value) : value;
  return (short ? shortDateFormatter : dateFormatter).format(d);
}

export function daysLeft(expiresAt: string | null | undefined): number | null {
  if (!expiresAt) return null;
  return Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86_400_000));
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

/** A warm, stable colour pair for an initials avatar. */
export function avatarTone(seed: string): { from: string; to: string } {
  const tones = [
    { from: "#0f766e", to: "#14b8a6" },
    { from: "#b45309", to: "#f59e0b" },
    { from: "#7c3aed", to: "#a78bfa" },
    { from: "#be123c", to: "#fb7185" },
    { from: "#1d4ed8", to: "#60a5fa" },
    { from: "#15803d", to: "#4ade80" },
  ];
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return tones[h % tones.length]!;
}

export function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24) || "need";
  const suffix = Math.random().toString(36).slice(2, 8);
  return `${base}-${suffix}`;
}

export function firstNameOnly(name: string): string {
  return name.trim().split(/\s+/)[0] ?? "";
}

export function cn(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}
