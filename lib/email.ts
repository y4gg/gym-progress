import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

type AppActionEmail = {
  actionLabel: string;
  actionUrl: string;
  body: string;
  preview: string;
  title: string;
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function renderAppActionEmail({
  actionLabel,
  actionUrl,
  body,
  preview,
  title,
}: AppActionEmail) {
  const safeActionLabel = escapeHtml(actionLabel);
  const safeActionUrl = escapeHtml(actionUrl);
  const safeBody = escapeHtml(body);
  const safePreview = escapeHtml(preview);
  const safeTitle = escapeHtml(title);

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="color-scheme" content="dark light">
    <title>${safeTitle}</title>
  </head>
  <body style="margin:0;background:#171717;color:#fafafa;font-family:Inter,Arial,sans-serif;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${safePreview}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#171717;">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:420px;border:1px solid rgba(255,255,255,0.12);border-radius:16px;background:#202020;">
            <tr>
              <td style="padding:26px 24px 12px;">
                <div style="display:inline-block;border-radius:10px;background:#2b2b2b;padding:8px 11px;color:#fafafa;font-size:14px;font-weight:700;line-height:1;">
                  Gym Ladder
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 24px 0;">
                <h1 style="margin:0;color:#fafafa;font-size:32px;line-height:1.1;font-weight:800;letter-spacing:0;">
                  ${safeTitle}
                </h1>
              </td>
            </tr>
            <tr>
              <td style="padding:14px 24px 0;">
                <p style="margin:0;color:#c7c7c7;font-size:16px;line-height:1.55;">
                  ${safeBody}
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 24px 8px;">
                <a href="${safeActionUrl}" style="display:block;border-radius:10px;background:#f5f5f5;color:#202020;font-size:16px;font-weight:800;line-height:54px;text-align:center;text-decoration:none;">
                  ${safeActionLabel}
                </a>
              </td>
            </tr>
            <tr>
              <td style="padding:10px 24px 26px;">
                <p style="margin:0;color:#8f8f8f;font-size:13px;line-height:1.45;">
                  If the button does not work, paste this link into your browser:<br>
                  <a href="${safeActionUrl}" style="color:#fafafa;text-decoration:underline;word-break:break-all;">${safeActionUrl}</a>
                </p>
              </td>
            </tr>
          </table>
          <p style="margin:18px 0 0;color:#737373;font-size:12px;line-height:1.4;">
            Track your sets. Keep your ladder moving.
          </p>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function sendEmail({
  text,
  to,
  subject,
  html,
}: {
  text?: string;
  to: string;
  subject: string;
  html: string;
}) {
  return resend.emails.send({
    from: "noreply@updates.y4.gg",
    to,
    subject,
    html,
    text,
  });
}
