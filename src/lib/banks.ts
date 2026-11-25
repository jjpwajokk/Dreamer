// Fallback list of common Nigerian banks (Paystack codes), used when the
// Paystack bank list can't be fetched. Admins confirm accounts before payout.
export const COMMON_BANKS: { name: string; code: string }[] = [
  { name: "Access Bank", code: "044" },
  { name: "Citibank Nigeria", code: "023" },
  { name: "Ecobank Nigeria", code: "050" },
  { name: "Fidelity Bank", code: "070" },
  { name: "First Bank of Nigeria", code: "011" },
  { name: "First City Monument Bank", code: "214" },
  { name: "Globus Bank", code: "00103" },
  { name: "Guaranty Trust Bank", code: "058" },
  { name: "Jaiz Bank", code: "301" },
  { name: "Keystone Bank", code: "082" },
  { name: "Kuda Bank", code: "50211" },
  { name: "Moniepoint MFB", code: "50515" },
  { name: "OPay", code: "999992" },
  { name: "PalmPay", code: "999991" },
  { name: "Polaris Bank", code: "076" },
  { name: "Providus Bank", code: "101" },
  { name: "Stanbic IBTC Bank", code: "221" },
  { name: "Standard Chartered Bank", code: "068" },
  { name: "Sterling Bank", code: "232" },
  { name: "Union Bank of Nigeria", code: "032" },
  { name: "United Bank For Africa", code: "033" },
  { name: "Unity Bank", code: "215" },
  { name: "Wema Bank", code: "035" },
  { name: "Zenith Bank", code: "057" },
];

let cached: { at: number; banks: { name: string; code: string }[] } | null = null;

/** Paystack's bank list (cached for a day), or the fallback list. */
export async function getBanks(): Promise<{ name: string; code: string }[]> {
  if (cached && Date.now() - cached.at < 86_400_000) return cached.banks;
  if (!process.env.PAYSTACK_SECRET_KEY) return COMMON_BANKS;
  try {
    const { listBanks } = await import("./paystack");
    const banks = (await listBanks()).sort((a, b) => a.name.localeCompare(b.name));
    if (banks.length > 0) cached = { at: Date.now(), banks };
    return banks.length > 0 ? banks : COMMON_BANKS;
  } catch {
    return COMMON_BANKS;
  }
}
