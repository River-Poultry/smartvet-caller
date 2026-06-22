import nodemailer from 'nodemailer';

function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.zoho.com',
    port: parseInt(process.env.SMTP_PORT || '465'),
    secure: true,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

export async function sendOtpEmail(to, code, purpose = 'verify') {
  const subject = purpose === 'reset' ? 'SmartVet — Password Reset Code' : 'SmartVet — Verify Your Account';
  const action  = purpose === 'reset' ? 'reset your password' : 'activate your SmartVet Call Centre account';

  const transporter = createTransporter();

  try {
    await transporter.sendMail({
      from: `"SmartVet Call Centre" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px">
          <h2 style="color:#141c0a;margin-bottom:8px">SmartVet Call Centre</h2>
          <p>Use the code below to ${action}. It expires in <strong>15 minutes</strong>.</p>
          <div style="background:#f4f6ee;border-radius:8px;padding:24px;text-align:center;margin:24px 0">
            <span style="font-size:36px;letter-spacing:12px;font-weight:800;color:#141c0a">${code}</span>
          </div>
          <p style="color:#666;font-size:13px">If you did not request this, you can ignore this email.</p>
        </div>
      `,
    });
  } catch (err) {
    console.error('[email] SMTP send failed:', {
      host: process.env.SMTP_HOST || 'smtp.zoho.com',
      port: process.env.SMTP_PORT || '465',
      user: process.env.SMTP_USER,
      error: err.message,
      code: err.code,
    });
    throw err;
  }
}
