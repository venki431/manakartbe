import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const emailService = {
  async sendPasswordResetOtp(to, otp) {
    // Development mode
    console.log("......",process.env.EMAIL_PROVIDER);
    if (process.env.EMAIL_PROVIDER === "console") {
      console.log("======================================");
      console.log("MANAKART PASSWORD RESET OTP");
      console.log(`Email: ${to}`);
      console.log(`OTP: ${otp}`);
      console.log("Expires in: 5 minutes");
      console.log("======================================");

      return;
    }

    // Resend mode
    if (process.env.EMAIL_PROVIDER === "resend") {
      if (!resend) {
        throw new Error("Resend is not configured");
      }

      const { data, error } = await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL,
        to: [to],
        subject: "Your Manakart password reset OTP",
        html: `
          <div style="
            font-family: Arial, sans-serif;
            max-width: 500px;
            margin: auto;
            padding: 20px;
          ">
            <h2 style="color: #16a34a;">Manakart</h2>

            <p>
              We received a request to reset your Manakart password.
            </p>

            <p>Your verification code is:</p>

            <div style="
              font-size: 32px;
              font-weight: bold;
              letter-spacing: 8px;
              padding: 20px;
              background: #f0fdf4;
              text-align: center;
              border-radius: 12px;
            ">
              ${otp}
            </div>

            <p>
              This OTP will expire in 5 minutes.
            </p>

            <p>
              If you did not request a password reset,
              you can safely ignore this email.
            </p>

            <p style="color: #64748b;">
              — Manakart
            </p>
          </div>
        `,
      });

      if (error) {
        console.error("Resend email error:", error);
        throw new Error("Unable to send email");
      }

      return data;
    }

    throw new Error("Invalid email provider configuration");
  },
};

export default emailService;