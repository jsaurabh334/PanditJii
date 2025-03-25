const nodemailer = require("nodemailer");
const twilio = require("twilio");
require("dotenv").config();

// ✅ Check for Required Environment Variables
if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
  console.error("❌ Missing Email Credentials in .env");
}
if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
  console.error("❌ Missing Twilio Credentials in .env");
}

// ✅ Twilio Setup
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// ✅ Email Transporter (Gmail / SMTP)
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

/**
 * 📌 Send Email Notification
 * @param {string} to - Recipient Email
 * @param {string} subject - Email Subject
 * @param {string} text - Email Body
 */
const sendEmail = async (to, subject, text) => {
  if (!to || !subject || !text) {
    console.error("❌ Email Error: Missing recipient, subject, or text");
    return;
  }

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to,
    subject,
    text,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`📩 Email sent to ${to}`);
  } catch (error) {
    console.error("❌ Email Error:", error.message);
  }
};

/**
 * 📌 Send SMS Notification
 * @param {string} to - Recipient Phone Number (e.g., +919876543210)
 * @param {string} message - SMS Body
 */
const sendSMS = async (to, message) => {
  if (!to || !message) {
    console.error("❌ SMS Error: Missing recipient number or message");
    return;
  }

  try {
    await twilioClient.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to,
    });
    console.log(`📲 SMS sent to ${to}`);
  } catch (error) {
    console.error("❌ SMS Error:", error.message);
  }
};

/**
 * 📌 Send WhatsApp Notification (via Twilio)
 * @param {string} to - Recipient WhatsApp Number (e.g., +919876543210)
 * @param {string} message - WhatsApp Message Body
 */
const sendWhatsApp = async (to, message) => {
  if (!to || !message) {
    console.error("❌ WhatsApp Error: Missing recipient number or message");
    return;
  }

  try {
    await twilioClient.messages.create({
      body: message,
      from: `whatsapp:${process.env.TWILIO_PHONE_NUMBER}`,
      to: `whatsapp:${to.startsWith("+") ? to : `+${to}`}`, // Ensure proper format
    });
    console.log(`✅ WhatsApp message sent to ${to}`);
  } catch (error) {
    console.error("❌ WhatsApp Error:", error.message);
  }
};

module.exports = { sendEmail, sendSMS, sendWhatsApp };
