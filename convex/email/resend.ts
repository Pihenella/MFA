"use node";
import { Resend } from "resend";

export interface SendEmailArgs {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export async function sendEmailViaResend(
  args: SendEmailArgs
): Promise<{ id: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey) throw new Error("RESEND_API_KEY не выставлен в Convex env");
  if (!from) throw new Error("EMAIL_FROM не выставлен в Convex env");

  const resend = new Resend(apiKey);
  const result = await resend.emails.send({
    from,
    to: [args.to],
    subject: args.subject,
    html: args.html,
    text: args.text,
  });

  if (result.error) {
    throw new Error(`Resend error: ${result.error.message}`);
  }
  return { id: result.data?.id ?? "" };
}
