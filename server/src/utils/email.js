
const senderEmail = "vitaai.developer@gmail.com"; 

async function sendBookingConfirmationEmail(bookingDetails, isReschedule = false) {
  if (!process.env.BREVO_API_KEY) {
    console.log("No Brevo API key found. Skipping email.");
    return;
  }

  const action = isReschedule ? "Rescheduled" : "Confirmed";
  
  const payload = {
    sender: { name: "Slotify Notifications", email: senderEmail },
    to: [{ email: bookingDetails.invitee_email, name: bookingDetails.invitee_name }],
    subject: `${action}: ${bookingDetails.event_name} with ${bookingDetails.full_name}`,
    textContent: `Hi ${bookingDetails.invitee_name},\n\nYour meeting "${bookingDetails.event_name}" with ${bookingDetails.full_name} has been successfully ${action.toLowerCase()}.\n\nWhen: ${new Date(bookingDetails.start_time).toLocaleString()} (${bookingDetails.invitee_timezone})\nWhere: ${bookingDetails.location_type}\n\nThank you!`
  };

  try {
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "accept": "application/json",
        "api-key": process.env.BREVO_API_KEY,
        "content-type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (response.ok) {
      console.log(`✅ ${action} email sent to ${bookingDetails.invitee_email}`);
    } else {
      const errorData = await response.json();
      console.error("❌ Error sending:", errorData);
    }
  } catch (error) {
    console.error("❌ Network Error:", error);
  }
}

async function sendCancellationEmail(bookingDetails) {
  if (!process.env.BREVO_API_KEY) {
    console.log("No Brevo API key found. Skipping email.");
    return;
  }

  const payload = {
    sender: { name: "Slotify Notifications", email: senderEmail },
    to: [{ email: bookingDetails.invitee_email, name: bookingDetails.invitee_name }],
    subject: `Cancelled: ${bookingDetails.event_name} with ${bookingDetails.full_name}`,
    textContent: `Hi ${bookingDetails.invitee_name},\n\nUnfortunately, your upcoming meeting "${bookingDetails.event_name}" with ${bookingDetails.full_name} has been cancelled.\n\nThank you.`
  };

  try {
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "accept": "application/json",
        "api-key": process.env.BREVO_API_KEY,
        "content-type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (response.ok) {
      console.log(`✅ Cancellation email sent via Brevo to ${bookingDetails.invitee_email}`);
    } else {
      const errorData = await response.json();
      console.error("❌ Error sending cancellation via Brevo:", errorData);
    }
  } catch (error) {
    console.error("❌ Network Error sending cancellation via Brevo:", error);
  }
}

module.exports = {
  sendBookingConfirmationEmail,
  sendCancellationEmail
};