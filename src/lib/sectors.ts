// The sectors Dreamer supports. Every sector pays a verified third party
// (a school, hospital, landlord, supplier...), never the person directly.
// Keep in sync with the check constraints in supabase/migrations.

export const CATEGORIES = ["education", "healthcare", "housing", "livelihood", "skills", "emergency"] as const;
export type Category = (typeof CATEGORIES)[number];

export const PAYEE_TYPES = [
  "school",
  "hospital",
  "pharmacy",
  "landlord",
  "supplier",
  "training_centre",
  "relief_partner",
] as const;
export type PayeeType = (typeof PAYEE_TYPES)[number];

const NAIRA = 100;

export type Sector = {
  key: Category;
  label: string;
  short: string;
  examples: string;
  capKobo: number;
  payeeTypes: PayeeType[];
  /** "the school or hospital" style phrase used in sentences. */
  payeePhrase: string;
  documentLabel: string;
  accent: string;
};

export const SECTORS: Record<Category, Sector> = {
  education: {
    key: "education",
    label: "Education",
    short: "School fees",
    examples: "School fees, WAEC/JAMB/NECO, uniforms, books",
    capKobo: 500_000 * NAIRA,
    payeeTypes: ["school"],
    payeePhrase: "the school",
    documentLabel: "Fee invoice or school bill",
    accent: "#0e5e4e",
  },
  healthcare: {
    key: "healthcare",
    label: "Healthcare",
    short: "Medical bills",
    examples: "Hospital bills, surgery, medication, maternity care",
    capKobo: 1_500_000 * NAIRA,
    payeeTypes: ["hospital", "pharmacy"],
    payeePhrase: "the hospital",
    documentLabel: "Hospital bill or estimate",
    accent: "#be123c",
  },
  housing: {
    key: "housing",
    label: "Housing",
    short: "Rent",
    examples: "Rent arrears, a safe place to live",
    capKobo: 1_000_000 * NAIRA,
    payeeTypes: ["landlord"],
    payeePhrase: "the landlord",
    documentLabel: "Tenancy agreement or rent demand",
    accent: "#1d4ed8",
  },
  livelihood: {
    key: "livelihood",
    label: "Small business",
    short: "Tools and stock",
    examples: "Sewing machine, grinding machine, starter stock, tools",
    capKobo: 500_000 * NAIRA,
    payeeTypes: ["supplier"],
    payeePhrase: "the supplier",
    documentLabel: "Supplier quote or proforma invoice",
    accent: "#b45309",
  },
  skills: {
    key: "skills",
    label: "Skills & training",
    short: "Training fees",
    examples: "Vocational training, apprenticeship, tech bootcamps, certification",
    capKobo: 300_000 * NAIRA,
    payeeTypes: ["training_centre"],
    payeePhrase: "the training centre",
    documentLabel: "Admission letter or fee invoice",
    accent: "#7c3aed",
  },
  emergency: {
    key: "emergency",
    label: "Emergency relief",
    short: "Food and recovery",
    examples: "Food after a flood or fire, replacing essentials",
    capKobo: 200_000 * NAIRA,
    payeeTypes: ["relief_partner", "supplier"],
    payeePhrase: "the relief partner",
    documentLabel: "Vendor quote or partner letter",
    accent: "#0f766e",
  },
};

export const PAYEE_LABEL: Record<PayeeType, string> = {
  school: "School",
  hospital: "Hospital or clinic",
  pharmacy: "Pharmacy",
  landlord: "Landlord or estate agent",
  supplier: "Supplier or vendor",
  training_centre: "Training centre",
  relief_partner: "Relief partner",
};

/** Used when the payee's name is hidden (under-18s). */
export const PAYEE_HIDDEN_LABEL: Record<PayeeType, string> = {
  school: "their school",
  hospital: "the hospital",
  pharmacy: "the pharmacy",
  landlord: "the landlord",
  supplier: "the supplier",
  training_centre: "the training centre",
  relief_partner: "the relief partner",
};

export function isCategory(v: unknown): v is Category {
  return typeof v === "string" && (CATEGORIES as readonly string[]).includes(v);
}

export function sector(c: string | null | undefined): Sector {
  return isCategory(c) ? SECTORS[c] : SECTORS.education;
}
