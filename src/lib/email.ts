import "server-only";
import { SITE_NAME, siteUrl } from "@/lib/config";

type Email = { to: string | string[]; subject: string; text: string };

/** Sends via Resend when RESEND_API_KEY is set; otherwise logs the email. */
export async function sendEmail(email: Email): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  const recipients = (Array.isArray(email.to) ? email.to : [email.to]).filter(Boolean);
  if (recipients.length === 0) return;
  const text = `${email.text}\n\n— ${SITE_NAME}\n${siteUrl()}`;
  if (!key) {
    console.info(`[email:not-sent] to=${recipients.join(",")} subject="${email.subject}"\n${text}`);
    return;
  }
  try {
    // Send one email per recipient so givers never see each other's addresses.
    await Promise.all(
      recipients.map((to) =>
        fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: process.env.EMAIL_FROM || `${SITE_NAME} <onboarding@resend.dev>`,
            to,
            subject: email.subject,
            text,
          }),
        }).then(async (r) => {
          if (!r.ok) console.error("Resend error", r.status, await r.text());
        }),
      ),
    );
  } catch (err) {
    console.error("Email send failed", err);
  }
}
