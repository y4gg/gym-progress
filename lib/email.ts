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
  <body style="margin:0;background:#171717;color:#fafafa;font-family:Inter,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${safePreview}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#171717;">
      <tr>
        <td align="center" style="padding:44px 24px 56px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:384px;">
            <tr>
              <td align="center" style="padding:0 0 24px;">
                <p style="margin:0;color:#737373;font-size:14px;font-weight:600;line-height:1.4;text-align:center;">
                  Gym Ladder
                </p>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:0;">
                <h1 style="margin:0;color:#fafafa;font-size:40px;line-height:1.1;font-weight:700;letter-spacing:0;text-align:center;">
                  ${safeTitle}
                </h1>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:12px 0 0;">
                <p style="margin:0;color:#a3a3a3;font-size:16px;line-height:1.75;text-align:center;">
                  ${safeBody}
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 0 0;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                  <tr>
                    <td align="center" bgcolor="#e5e5e5" style="border:1px solid transparent;border-radius:10px;background:#e5e5e5;mso-padding-alt:17px 18px;">
                      <a href="${safeActionUrl}" style="display:block;border-radius:10px;color:#333333;font-size:16px;font-weight:600;line-height:56px;text-align:center;text-decoration:none;">
                        ${safeActionLabel}
                      </a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 0 0;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #303030;border-radius:10px;background:#202020;">
                  <tr>
                    <td style="padding:14px 16px;">
                      <p style="margin:0;color:#a3a3a3;font-size:13px;line-height:1.5;text-align:left;">
                        If the button does not work, paste this link into your browser:
                      </p>
                      <p style="margin:6px 0 0;color:#fafafa;font-size:13px;line-height:1.5;text-align:left;word-break:break-all;">
                        <a href="${safeActionUrl}" style="color:#fafafa;text-decoration:underline;word-break:break-all;">${safeActionUrl}</a>
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:20px 0 0;">
                <p style="margin:0;color:#737373;font-size:12px;line-height:1.4;text-align:center;">
                  You can ignore this email if you did not request it.
                </p>
              </td>
            </tr>
          </table>
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
