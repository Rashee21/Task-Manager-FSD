// Email via Nodemailer. If no SMTP is configured, the email is printed to the console
// so assignment notifications still work in a demo without any email account setup.
// To send real mail, set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS in .env.
const nodemailer = require('nodemailer');
let transporter = null;
if (process.env.SMTP_HOST) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}
async function sendMail({ to, subject, text }) {
  if (!transporter) {
    console.log('[email - no SMTP configured, not sent] To: ' + to + ' | Subject: ' + subject + ' | ' + text);
    return { delivered: false, reason: 'no-smtp-configured' };
  }
  await transporter.sendMail({ from: process.env.MAIL_FROM || 'no-reply@taskmanager.local', to, subject, text });
  return { delivered: true };
}
module.exports = { sendMail };
