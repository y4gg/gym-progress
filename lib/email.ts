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
        <td align="center" style="padding:40px 24px 56px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:384px;">
            <tr>
              <td align="center" style="padding:0 0 16px;">
                <div style="width:64px;height:64px;border:1px solid rgba(255,255,255,0.1);border-radius:12px;background:#2b2b2b;color:#fafafa;font-size:31px;font-weight:800;line-height:64px;text-align:center;">
                  &#10003;
                </div>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:0;">
                <h1 style="margin:0;color:#fafafa;font-size:40px;line-height:1.08;font-weight:800;letter-spacing:0;text-align:center;">
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
              <td style="padding:26px 0 0;">
                <a href="${safeActionUrl}" style="display:block;width:100%;border-radius:10px;background:#f5f5f5;color:#202020;font-size:16px;font-weight:700;line-height:56px;text-align:center;text-decoration:none;">
                  ${safeActionLabel}
                </a>
              </td>
            </tr>
            <tr>
              <td style="padding:12px 0 0;">
                <a href="${safeActionUrl}" style="display:block;width:100%;box-sizing:border-box;border:1px solid rgba(255,255,255,0.15);border-radius:10px;background:transparent;color:#fafafa;font-size:16px;font-weight:700;line-height:54px;text-align:center;text-decoration:none;">
                  Open link
                </a>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:18px 0 0;">
                <p style="margin:0;color:#737373;font-size:13px;line-height:1.5;text-align:center;">
                  If the buttons do not work, paste this link into your browser:<br>
                  <a href="${safeActionUrl}" style="color:#fafafa;text-decoration:underline;word-break:break-all;">${safeActionUrl}</a>
                </p>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:24px 0 0;">
                <p style="margin:0;color:#737373;font-size:12px;line-height:1.4;text-align:center;">
                  Gym Ladder
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
