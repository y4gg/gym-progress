import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  resend.emails.send({
    from: "noreply@updates.y4.gg",
    to,
    subject,
    html,
  });
}
