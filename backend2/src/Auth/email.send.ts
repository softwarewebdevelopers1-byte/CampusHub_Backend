import axios, { AxiosError } from "axios";
// creating the interfaces ts variable to prevent error
interface EmailSender {
  name: string;
  email: string;
}

interface EmailRecipient {
  email: string;
}

interface BrevoEmailPayload {
  sender: EmailSender;
  to: EmailRecipient[];
  subject: string;
  htmlContent: string;
}

interface BrevoResponse {
  messageId?: string;
  [key: string]: any;
}

interface BrevoErrorResponse {
  code?: string;
  message?: string;
  [key: string]: any;
}

/**
 * Sends a verification email using Brevo API
 * @param email - Recipient's email address
 * @param otp - One-time password/verification code
 * @returns Promise<void>
 */

// function that sends email to the user
export async function sendVerificationEmail(
  email: string,
  otp: number | string,
): Promise<void> {
  // Validate environment variable
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    console.error("BREVO_API_KEY environment variable is not set");
    return;
  }

  // Validate OTP
  const otpString = otp.toString();

  const payload: BrevoEmailPayload = {
    sender: {
      name: "CampusHub",
      email: "carlosmaina198@gmail.com",
    },
    to: [{ email }],
    subject: "🔐 Verify Your CampusHub Account",
    htmlContent: generateEmailTemplate(email, otpString),
  };

  try {
    const response = await axios.post<BrevoResponse>(
      "https://api.brevo.com/v3/smtp/email",
      payload,
      {
        headers: {
          "api-key": apiKey,
          "Content-Type": "application/json",
        },
      },
    );

    console.log(
      "Verification email sent successfully:",
      response.data.messageId,
    );
  } catch (err) {
    handleEmailError(err as AxiosError<BrevoErrorResponse>);
  }
}

/**
 * Generates the HTML email template
 * @param email - Recipient's email address
 * @param otp - OTP as string
 * @returns HTML string
 */
function generateEmailTemplate(email: string, otp: string): string {
  const username = email.split("@")[0];
  const currentYear = new Date().getFullYear();

  return `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Verify Your CampusHub Account</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333333; background-color: #f8fafc; padding: 20px; }
        .email-container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1); }
        .header { background: linear-gradient(135deg, #0a1f3a 0%, #162b50 100%); padding: 40px 30px; text-align: center; position: relative; overflow: hidden; }
        .header::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 4px; background: linear-gradient(90deg, #4ade80, #22d3ee); }
        .logo { display: flex; align-items: center; justify-content: center; gap: 12px; margin-bottom: 20px; }
        .logo-icon { font-size: 32px; background: rgba(255, 255, 255, 0.1); width: 50px; height: 50px; border-radius: 12px; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(10px); }
        .logo-text { font-size: 28px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px; }
        .header-title { font-size: 20px; font-weight: 600; color: #ffffff; margin-top: 15px; }
        .content { padding: 40px 30px; }
        .greeting { font-size: 18px; font-weight: 500; color: #1e293b; margin-bottom: 20px; }
        .highlight { color: #0a1f3a; font-weight: 600; }
        .message { font-size: 16px; color: #64748b; margin-bottom: 30px; line-height: 1.7; }
        .otp-container { background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); border: 1px solid #e2e8f0; border-radius: 16px; padding: 30px; text-align: center; margin: 30px 0; position: relative; }
        .otp-label { font-size: 14px; font-weight: 500; color: #64748b; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 15px; }
        .otp-code { font-size: 42px; font-weight: 700; color: #0a1f3a; letter-spacing: 8px; background: #ffffff; padding: 20px 0; border-radius: 12px; margin: 15px 0; display: inline-block; min-width: 280px; box-shadow: 0 4px 12px rgba(10, 31, 58, 0.08); font-family: 'Courier New', monospace; }
        .otp-digit { display: inline-block; animation: digitReveal 0.6s ease-out; animation-delay: calc(var(--i) * 0.1s); }
        @keyframes digitReveal { 0% { opacity: 0; transform: translateY(10px); } 100% { opacity: 1; transform: translateY(0); } }
        .expiry-notice { font-size: 14px; color: #ef4444; font-weight: 500; margin-top: 15px; display: flex; align-items: center; justify-content: center; gap: 8px; }
        .timer { font-weight: 700; animation: pulse 2s infinite; }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.7; } }
        .security-warning { background: #fef2f2; border: 1px solid #fecaca; border-radius: 12px; padding: 20px; margin: 30px 0; text-align: center; }
        .warning-icon { font-size: 20px; margin-bottom: 10px; }
        .warning-text { font-size: 14px; color: #991b1b; font-weight: 500; }
        .steps { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 40px 0; }
        .step { text-align: center; padding: 20px; background: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0; }
        .step-number { width: 36px; height: 36px; background: linear-gradient(135deg, #0a1f3a, #4ade80); color: #ffffff; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 600; margin: 0 auto 15px; }
        .step-title { font-size: 15px; font-weight: 600; color: #1e293b; margin-bottom: 8px; }
        .step-description { font-size: 13px; color: #64748b; }
        .help-section { background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); border-radius: 16px; padding: 25px; margin: 40px 0; border: 1px solid #bae6fd; }
        .help-title { font-size: 16px; font-weight: 600; color: #0c4a6e; margin-bottom: 15px; display: flex; align-items: center; gap: 10px; }
        .help-text { font-size: 14px; color: #0c4a6e; line-height: 1.6; }
        .footer { background: #f1f5f9; padding: 30px; text-align: center; border-top: 1px solid #e2e8f0; }
        .footer-links { display: flex; justify-content: center; gap: 25px; margin: 20px 0; flex-wrap: wrap; }
        .footer-link { color: #64748b; text-decoration: none; font-size: 14px; transition: color 0.3s ease; }
        .footer-link:hover { color: #0a1f3a; }
        .copyright { font-size: 13px; color: #94a3b8; margin-top: 20px; }
        .social-icons { display: flex; justify-content: center; gap: 15px; margin: 20px 0; }
        .social-icon { width: 36px; height: 36px; background: #ffffff; border-radius: 50%; display: flex; align-items: center; justify-content: center; text-decoration: none; color: #64748b; border: 1px solid #e2e8f0; transition: all 0.3s ease; }
        .social-icon:hover { background: #0a1f3a; color: #ffffff; transform: translateY(-3px); }
        .cta-button { display: inline-block; background: linear-gradient(135deg, #0a1f3a, #162b50); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 10px; font-weight: 600; margin: 25px 0; transition: all 0.3s ease; box-shadow: 0 4px 15px rgba(10, 31, 58, 0.2); }
        .cta-button:hover { transform: translateY(-2px); box-shadow: 0 8px 25px rgba(10, 31, 58, 0.3); }
        .signature { margin-top: 40px; padding-top: 30px; border-top: 1px dashed #e2e8f0; text-align: center; }
        .signature-name { font-size: 16px; font-weight: 600; color: #0a1f3a; margin-bottom: 5px; }
        .signature-title { font-size: 14px; color: #64748b; }
        @media (max-width: 600px) {
            .content { padding: 30px 20px; }
            .otp-code { font-size: 32px; letter-spacing: 6px; min-width: 240px; }
            .steps { grid-template-columns: 1fr; }
            .footer-links { flex-direction: column; gap: 15px; }
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="header">
            <div class="logo">
                <div class="logo-icon">🎓</div>
                <div class="logo-text">CampusHub</div>
            </div>
            <div class="header-title">Email Verification Required</div>
        </div>

        <div class="content">
            <p class="greeting">Hello <span class="highlight">${username}</span>,</p>
            <p class="message">
                You're just one step away from accessing your CampusHub account!
                To ensure the security of your account, please verify your email address
                by entering the verification code below.
            </p>

            <div class="otp-container">
                <div class="otp-label">Verification Code</div>
                <div class="otp-code" id="otp-display">
                    ${otp
                      .split("")
                      .map(
                        (digit, i) =>
                          `<span class="otp-digit" style="--i: ${i}">${digit}</span>`,
                      )
                      .join("")}
                </div>
                <div class="expiry-notice">
                    ⏰ This code expires in <span class="timer">5 minutes</span>
                </div>
            </div>

            <div class="security-warning">
                <div class="warning-icon">⚠️</div>
                <p class="warning-text">
                    Never share this code with anyone. CampusHub will never ask for your
                    verification code via phone, email, or message.
                </p>
            </div>

            <div class="steps">
                <div class="step">
                    <div class="step-number">1</div>
                    <div class="step-title">Enter the Code</div>
                    <div class="step-description">Copy or type the ${otp.length}-digit code above</div>
                </div>
                <div class="step">
                    <div class="step-number">2</div>
                    <div class="step-title">Verify Email</div>
                    <div class="step-description">Paste it in the verification screen</div>
                </div>
                <div class="step">
                    <div class="step-number">3</div>
                    <div class="step-title">Access Dashboard</div>
                    <div class="step-description">Start using CampusHub immediately</div>
                </div>
            </div>

            <div class="help-section">
                <div class="help-title">❓ Need Help?</div>
                <p class="help-text">
                    • If you didn't request this verification, please ignore this email.<br>
                    • Code not working? It may have expired. Request a new code from the login page.<br>
                    • Having trouble? Contact our support team at support@softwarewebdevelopers1.com
                </p>
            </div>

            <div class="signature">
                <div class="signature-name">The CampusHub Team</div>
                <div class="signature-title">Empowering modern campus experiences</div>
            </div>
        </div>

        <div class="footer">
            <div class="social-icons">
                <a href="#" class="social-icon">𝕏</a>
                <a href="#" class="social-icon">in</a>
                <a href="#" class="social-icon">📷</a>
                <a href="#" class="social-icon">▶️</a>
            </div>

            <div class="footer-links">
                <a href="#" class="footer-link">Help Center</a>
                <a href="#" class="footer-link">Privacy Policy</a>
                <a href="#" class="footer-link">Terms of Service</a>
                <a href="#" class="footer-link">Unsubscribe</a>
            </div>

            <div class="copyright">
                © ${currentYear} CampusHub. All rights reserved.<br>
                CampusHub, Rongo University Headquarters
            </div>
        </div>
    </div>
</body>
</html>`;
}

/**
 * Handles email sending errors
 * @param error - Axios error object
 */
function handleEmailError(error: AxiosError<BrevoErrorResponse>): void {
  if (error.response) {
    // The request was made and the server responded with a status code
    console.error(
      `Email sending failed with status ${error.response.status}:`,
      error.response.data,
    );

    const errorData = error.response.data;
    if (errorData.code === "unauthorized") {
      console.error(
        "Invalid API key. Please check your BREVO_API_KEY environment variable.",
      );
    } else if (errorData.code === "invalid_parameter") {
      console.error(
        "Invalid email parameters. Please check the email format and content.",
      );
    }
  } else if (error.request) {
    // The request was made but no response was received
    console.error(
      "No response received from Brevo API. Please check your network connection.",
    );
  } else {
    // Something happened in setting up the request
    console.error("Error setting up email request:", error.message);
  }
}
