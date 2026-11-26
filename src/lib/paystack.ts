import "server-only";
import crypto from "node:crypto";

// PAYSTACK_API_BASE is only for automated tests against a mock server.
const BASE = process.env.PAYSTACK_API_BASE || "https://api.paystack.co";

function secret(): string {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key) throw new Error("Paystack is not configured (PAYSTACK_SECRET_KEY).");
  return key;
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${secret()}`, "Content-Type": "application/json", ...(init?.headers ?? {}) },
    cache: "no-store",
  });
  const json = (await res.json().catch(() => null)) as { status?: boolean; message?: string; data?: T } | null;
  if (!res.ok || !json?.status) {
    throw new Error(`Paystack: ${json?.message ?? `HTTP ${res.status}`}`);
  }
  return json.data as T;
}

/** Unique, Paystack-safe reference: lowercase letters, digits and dashes. */
export function newReference(prefix: "dr" | "po"): string {
  return `${prefix}-${Date.now().toString(36)}-${crypto.randomBytes(6).toString("hex")}`;
}

export async function initializeTransaction(input: {
  email: string;
  amountKobo: number;
  reference: string;
  callbackUrl: string;
  metadata: Record<string, unknown>;
}) {
  return call<{ authorization_url: string; access_code: string; reference: string }>("/transaction/initialize", {
    method: "POST",
    body: JSON.stringify({
      email: input.email,
      amount: input.amountKobo,
      currency: "NGN",
      reference: input.reference,
      callback_url: input.callbackUrl,
      metadata: input.metadata,
      channels: ["card", "bank", "bank_transfer", "ussd"],
    }),
  });
}

/** Constant-time check of the x-paystack-signature header (HMAC SHA512 of the raw body). */
export function verifyWebhookSignature(rawBody: string, signature: string | null, key = process.env.PAYSTACK_SECRET_KEY): boolean {
  if (!signature || !key) return false;
  const expected = crypto.createHmac("sha512", key).update(rawBody).digest("hex");
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signature, "utf8");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export type Bank = { name: string; code: string };

export async function listBanks(): Promise<Bank[]> {
  const data = await call<{ name: string; code: string; active: boolean }[]>("/bank?country=nigeria&perPage=100&currency=NGN");
  return data.filter((b) => b.active !== false).map((b) => ({ name: b.name, code: b.code }));
}

export async function resolveAccount(accountNumber: string, bankCode: string) {
  return call<{ account_number: string; account_name: string }>(
    `/bank/resolve?account_number=${encodeURIComponent(accountNumber)}&bank_code=${encodeURIComponent(bankCode)}`,
  );
}

export async function createTransferRecipient(input: { name: string; accountNumber: string; bankCode: string }) {
  return call<{ recipient_code: string }>("/transferrecipient", {
    method: "POST",
    body: JSON.stringify({
      type: "nuban",
      name: input.name,
      account_number: input.accountNumber,
      bank_code: input.bankCode,
      currency: "NGN",
    }),
  });
}

export async function initiateTransfer(input: { amountKobo: number; recipientCode: string; reference: string; reason: string }) {
  return call<{ transfer_code: string; status: string; reference: string }>("/transfer", {
    method: "POST",
    body: JSON.stringify({
      source: "balance",
      amount: input.amountKobo,
      recipient: input.recipientCode,
      reference: input.reference,
      reason: input.reason.slice(0, 100),
      currency: "NGN",
    }),
  });
}

/** Full refund of a charge back to the giver's card or account. */
export async function refundTransaction(reference: string) {
  return call<{ status: string }>("/refund", {
    method: "POST",
    body: JSON.stringify({ transaction: reference }),
  });
}
