import nodemailer from "nodemailer";

interface SendEmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT || "465", 10),
  secure: true, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export const sendEmail = async ({ to, subject, text, html }: SendEmailOptions) => {
  try {
    const info = await transporter.sendMail({
      from: `"${process.env.NEXT_PUBLIC_APP_NAME || 'WappFlow'}" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
      to,
      subject,
      text,
      html,
    });
    console.log("Message sent: %s", info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("Error sending email:", error);
    return { success: false, error };
  }
};

export const sendEmailOtp = async (to: string, otp: string) => {
  const subject = `Your verification code is ${otp}`;
  const appName = process.env.NEXT_PUBLIC_APP_NAME || 'WappFlow';
  
  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Verification Code</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background-color: #faf9f5; margin: 0; padding: 0; }
        .container { max-width: 520px; margin: 40px auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e5e5e5; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05); }
        .header { padding: 32px 32px 24px; text-align: center; border-bottom: 1px solid #f0f0f0; }
        .logo { font-size: 20px; font-weight: 900; letter-spacing: 0.15em; text-transform: uppercase; color: #1c1917; margin: 0; display: inline-flex; align-items: center; }
        .logo span { color: #10b981; margin-right: 8px; }
        .content { padding: 32px; text-align: center; }
        .title { font-size: 18px; font-weight: 600; color: #292524; margin: 0 0 16px; }
        .message { font-size: 14px; color: #57534e; line-height: 1.6; margin: 0 0 24px; }
        .code-container { background-color: #f5f5f4; border-radius: 12px; padding: 24px; margin-bottom: 24px; border: 1px solid #e7e5e4; }
        .code { font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #10b981; margin: 0; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
        .footer { padding: 24px 32px; text-align: center; background-color: #fafaf9; border-top: 1px solid #f0f0f0; }
        .footer-text { font-size: 12px; color: #78716c; margin: 0; line-height: 1.5; }
        .link { color: #10b981; text-decoration: none; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 class="logo"><span>◆</span> ${appName}</h1>
        </div>
        <div class="content">
          <h2 class="title">Verify your email</h2>
          <p class="message">Please use the verification code below to securely access your workspace instance.</p>
          <div class="code-container">
            <p class="code">${otp}</p>
          </div>
          <p class="message" style="font-size: 13px; margin-bottom: 0;">This code is valid for <strong>5 minutes</strong>. If you did not request this, you can safely ignore this email.</p>
        </div>
        <div class="footer">
          <p class="footer-text">Need help? Reply to this email or visit our <a href="#" class="link">Help Center</a>.</p>
          <p class="footer-text" style="margin-top: 12px;">© ${new Date().getFullYear()} ${appName}. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
  
  const text = `Verify your ${appName} account.\n\nYour verification code is: ${otp}\n\nThis code is valid for 5 minutes. If you did not request this, you can safely ignore this email.`;

  return sendEmail({ to, subject, text, html });
};
