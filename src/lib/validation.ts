import { z } from "zod";
import { NIGERIAN_STATES } from "./format";
import { MIN_NEED_KOBO } from "./money";
import { CATEGORIES, PAYEE_TYPES, SECTORS } from "./sectors";
import { MILESTONES } from "./format";

export const needBasicsSchema = z
  .object({
    relationship: z.enum(["self", "parent", "guardian", "teacher", "religious_leader", "organisation", "other"]),
    org_id: z.string().uuid().optional().nullable(),
    category: z.enum(CATEGORIES),
    display_name: z.string().trim().min(1, "Enter a first name").max(40),
    is_minor: z.boolean(),
    state: z.enum(NIGERIAN_STATES, { message: "Choose a state" }),
    city: z.string().trim().max(60).optional().or(z.literal("")),
    contact_phone: z.preprocess(
      (v) => (typeof v === "string" ? v.replace(/[\s-]/g, "") : v),
      z.string().regex(/^(\+?234|0)[789][01]\d{8}$/, "Enter a Nigerian phone number, like 0803 123 4567"),
    ),
    title: z.string().trim().min(4, "Add a short title").max(80),
    amount_kobo: z.number().int().min(MIN_NEED_KOBO, "The smallest need is ₦1,000"),
    is_urgent: z.boolean().optional().default(false),
    deadline: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a valid date")
      .refine((d) => d >= new Date(Date.now() - 86_400_000).toISOString().slice(0, 10), "The deadline can't be in the past")
      .optional()
      .or(z.literal(""))
      .nullable(),
  })
  .superRefine((v, ctx) => {
    const cap = SECTORS[v.category].capKobo;
    if (v.amount_kobo > cap) {
      ctx.addIssue({
        code: "custom",
        path: ["amount_kobo"],
        message: `${SECTORS[v.category].label} needs are capped at ₦${(cap / 100).toLocaleString("en-NG")} for now`,
      });
    }
  });

export const needStorySchema = z.object({
  story: z.string().trim().min(40, "Tell the story in at least 40 characters").max(600),
  my_words: z.string().trim().min(5, "Add one line in your own words").max(120),
});

export const personalAccountSchema = z.object({
  bank_code: z.string().trim().min(3, "Choose the bank"),
  bank_name: z.string().trim().max(80).optional(),
  account_number: z.string().trim().regex(/^\d{10}$/, "Account numbers have 10 digits"),
  account_name: z.string().trim().min(2, "Enter the account name").max(120),
});

export const institutionSchema = z.object({
  name: z.string().trim().min(2, "Enter the name of who will be paid").max(160),
  type: z.enum(PAYEE_TYPES).refine((t) => t !== "personal_account" && t !== "organisation", "Choose who will be paid"),
  state: z.enum(NIGERIAN_STATES, { message: "Choose a state" }),
  address: z.string().trim().max(200).optional().or(z.literal("")),
  contact_name: z.string().trim().min(2, "Who can we call there? (e.g. the bursar)").max(80),
  contact_phone: z.string().trim().min(7, "Enter their phone number").max(20),
  bank_code: z.string().trim().min(3, "Choose the bank"),
  bank_name: z.string().trim().max(80).optional(),
  account_number: z.string().trim().regex(/^\d{10}$/, "Account numbers have 10 digits"),
  account_name: z.string().trim().min(2, "Enter the account name").max(120),
});

export const giftSchema = z.object({
  needId: z.string().uuid(),
  amountKobo: z.number().int().positive(),
  feeMode: z.enum(["on_top", "deducted"]),
  email: z.string().trim().email("Enter a valid email for your receipt"),
  name: z.string().trim().max(60).optional().or(z.literal("")),
  anonymous: z.boolean(),
});

export const updateSchema = z.object({
  body: z.string().trim().min(10, "Write at least a sentence").max(1000),
  milestone: z.enum(MILESTONES.map((m) => m.value) as [string, ...string[]]),
  receiptsPublic: z.boolean().optional().default(false),
});

export const reportSchema = z.object({
  needId: z.string().uuid(),
  reason: z.string().trim().min(5, "Tell us what's wrong").max(1000),
  email: z.string().trim().email().optional().or(z.literal("")),
});

export function firstError(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Please check the form.";
}
