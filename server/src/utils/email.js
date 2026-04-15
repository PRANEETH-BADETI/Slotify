const nodemailer = require("nodemailer");

let transporter;

// Initialize the transporter (Real SMTP or Auto-Generated Fake SMTP)
async function getTransporter() {
  if (transporter) return transporter;

  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    // Use real SMTP if credentials exist (e.g., Gmail App Password)
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: process.env.SMTP_PORT || 587,
      secure: false, 
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  } else {
    // Fallback: Generate an Ethereal test account if no .env config exists
    console.log("📧 No SMTP credentials found. Generating Ethereal test account...");
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
    console.log("📧 Ethereal test account ready.");
  }
  return transporter;
}

async function sendBookingConfirmationEmail(bookingDetails, isReschedule = false) {
  try {
    const mailer = await getTransporter();
    const action = isReschedule ? "Rescheduled" : "Confirmed";
    
    const mailOptions = {
      from: '"Calendly Clone" <no-reply@calendlyclone.com>',
      to: bookingDetails.invitee_email,
      subject: `${action}: ${bookingDetails.event_name} with ${bookingDetails.full_name}`,
      text: `Hi ${bookingDetails.invitee_name},\n\nYour meeting "${bookingDetails.event_name}" with ${bookingDetails.full_name} has been successfully ${action.toLowerCase()}.\n\nWhen: ${new Date(bookingDetails.start_time).toLocaleString()} (${bookingDetails.invitee_timezone})\nWhere: ${bookingDetails.location_type}\n\nThank you!`,
    };

    const info = await mailer.sendMail(mailOptions);
    console.log(`✅ ${action} email sent to ${bookingDetails.invitee_email}`);
    
    if (!process.env.SMTP_USER) {
      console.log("🔗 Preview Email: %s", nodemailer.getTestMessageUrl(info));
    }
  } catch (error) {
    console.error("❌ Error sending confirmation email:", error);
  }
}

async function sendCancellationEmail(bookingDetails) {
  try {
    const mailer = await getTransporter();
    
    const mailOptions = {
      from: '"Calendly Clone" <no-reply@calendlyclone.com>',
      to: bookingDetails.invitee_email,
      subject: `Cancelled: ${bookingDetails.event_name} with ${bookingDetails.full_name}`,
      text: `Hi ${bookingDetails.invitee_name},\n\nUnfortunately, your upcoming meeting "${bookingDetails.event_name}" with ${bookingDetails.full_name} has been cancelled.\n\nThank you.`,
    };

    const info = await mailer.sendMail(mailOptions);
    console.log(`✅ Cancellation email sent to ${bookingDetails.invitee_email}`);
    
    if (!process.env.SMTP_USER) {
      console.log("🔗 Preview Email: %s", nodemailer.getTestMessageUrl(info));
    }
  } catch (error) {
    console.error("❌ Error sending cancellation email:", error);
  }
}

module.exports = {
  sendBookingConfirmationEmail,
  sendCancellationEmail
};