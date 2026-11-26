import "server-only";

/**
 * Sends an SMS through Termii when TERMII_API_KEY is set; otherwise logs it.
 * Nigerian numbers like 0803... are converted to 234803...
 */
export async function sendSms(phone: string | null | undefined, message: string): Promise<void> {
  if (!phone) return;
  const digits = phone.replace(/\D/g, "");
  const to = digits.startsWith("234") ? digits : digits.startsWith("0") ? `234${digits.slice(1)}` : digits;
  const key = process.env.TERMII_API_KEY;
  if (!key) {
    console.info(`[sms:not-sent] to=${to.slice(0, 6)}… ${message}`);
    return;
  }
  try {
    const res = await fetch("https://api.ng.termii.com/api/sms/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: key,
        to,
        from: process.env.TERMII_SENDER_ID || "Dreamer",
        sms: message.slice(0, 450),
        type: "plain",
        channel: "generic",
      }),
    });
    if (!res.ok) console.error("Termii error", res.status, await res.text());
  } catch (e) {
    console.error("Termii failed", e);
  }
}
