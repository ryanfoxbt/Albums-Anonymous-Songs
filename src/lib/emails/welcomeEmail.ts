export const WELCOME_EMAIL_SUBJECT = "You're in! 🎉";

export function renderWelcomeEmailHtml(): string {
  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background-color:#fafafa;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#fafafa;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" style="max-width:480px;background-color:#ffffff;border-radius:16px;overflow:hidden;">
            <tr>
              <td style="padding:32px 32px 8px;text-align:center;">
                <h1 style="margin:0;font-size:22px;color:#171717;">Albums <span style="color:#F760D6;">Anonymous</span></h1>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 32px 24px;text-align:center;color:#444444;font-size:15px;line-height:1.6;">
                <p style="margin:0 0 16px;font-size:17px;">You're in! 🎉</p>
                <p style="margin:0 0 24px;">
                  New funny original songs land in your inbox weekly, straight
                  from Albums Anonymous &mdash; premium stupidity, deuced on
                  schedule.
                </p>
                <a
                  href="https://albumsanonymous.com/listen"
                  style="display:inline-block;background-color:#000000;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:9999px;font-weight:600;font-size:14px;"
                >
                  Listen now
                </a>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 32px 32px;text-align:center;color:#999999;font-size:12px;">
                You're getting this because you subscribed at
                albumsanonymous.com. No spam, just new songs.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function renderWelcomeEmailText(): string {
  return [
    "You're in!",
    "",
    "New funny original songs land in your inbox weekly, straight from Albums Anonymous — premium stupidity, deuced on schedule.",
    "",
    "Listen now: https://albumsanonymous.com/listen",
    "",
    "You're getting this because you subscribed at albumsanonymous.com. No spam, just new songs.",
  ].join("\n");
}
