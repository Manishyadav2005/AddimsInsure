import { Router } from "express";
import nodemailer, { Transporter } from "nodemailer";
import { GoogleGenAI } from "@google/genai";
import { SettingsModel, EmailLogModel } from "../models";

const router = Router();

let aiClient: GoogleGenAI | null = null;
function getGemini(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY environment variable is required for Gemini AI operations");
    }
    aiClient = new GoogleGenAI({ apiKey: key });
  }
  return aiClient;
}

// ======================== GET ENDPOINT ========================
// GET /api/emails — Fetch Email Logs for a User
router.get("/", async (req, res) => {
  try {
    const userId = req.query.userId as string;
    
    if (!userId) {
      res.status(400).json({
        success: false,
        error: "userId query parameter is required"
      });
      return;
    }

    // Fetch all email logs for this user, sorted by newest first
    const emailLogs = await EmailLogModel.find({ userId })
      .sort({ sentAt: -1 })
      .lean();

    res.json({
      success: true,
      data: emailLogs || [],
      count: emailLogs?.length || 0
    });
  } catch (err: any) {
    console.error("GET /api/emails Error:", err);
    res.status(500).json({
      success: false,
      error: "Failed to fetch email logs",
      details: err.message || String(err)
    });
  }
});

// ======================== PURANI ENDPOINT ========================
// POST /api/generate-reminder-email — Generate Email Content via Gemini AI
router.post("/generate-reminder-email", async (req, res) => {
  try {
    const { customerName, policyNumber, companyName, premiumAmount, nextDueDate, emailType } = req.body;
    if (!customerName || !policyNumber || !companyName) {
      res.status(400).json({ error: "Missing required fields (customerName, policyNumber, companyName)" });
      return;
    }

    const ai = getGemini();
    const typeLabel = emailType || "renewal reminder";
    const prompt = `
You are an expert insurance advisor and automated assistant for "Policy Master".
Write a highly professional, polite, and personalized ${typeLabel} email to a policyholder with these details:
- Customer Name: ${customerName}
- Policy Number: ${policyNumber}
- Company: ${companyName}
- Premium Amount: INR ${premiumAmount || "N/A"}
- Next Due Date: ${nextDueDate || "N/A"}

Please output a raw JSON object with exactly two keys: "subject" and "body". Do not wrap the JSON in markdown codeblocks.
Format of JSON:
{
  "subject": "Email Subject Line",
  "body": "Email Body text. Use appropriate linebreaks \\n for neat presentation. End with warm regards from Policy Master Management."
}
`;
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });

    const resultText = response.text?.trim() || "{}";
    const resultJson = JSON.parse(resultText);
    res.json(resultJson);
  } catch (error: any) {
    console.error("Error generating email template:", error);
    res.status(500).json({ 
      error: "Failed to generate email template using AI", 
      details: error.message || String(error)
    });
  }
});

// ======================== NAYA ENDPOINT ========================
// POST /api/emails/send — Real Email Sending via SMTP
router.post("/send", async (req, res) => {
  try {
    const { userId, recipientEmail, recipientName, subject, body, policyId, type } = req.body;

    // Validate request
    if (!userId || !recipientEmail || !subject || !body) {
      res.status(400).json({
        success: false,
        error: "Missing required fields: userId, recipientEmail, subject, body"
      });
      return;
    }

    // Fetch SMTP Settings from MongoDB (user/tenant ke liye)
    const settings = await SettingsModel.findOne({ userId }).lean();

    if (!settings || !settings.mailSettings) {
      res.status(400).json({
        success: false,
        error: "SMTP Gateway not configured. Please set up Gateway Settings first.",
        code: "SMTP_NOT_CONFIGURED"
      });
      return;
    }

    const mailSettings = settings.mailSettings;

    // Validate required SMTP fields
    if (!mailSettings.smtpHost || !mailSettings.smtpPort || !mailSettings.username) {
      res.status(400).json({
        success: false,
        error: "Incomplete SMTP Configuration. Check SMTP Host, Port, and Username.",
        code: "SMTP_INCOMPLETE"
      });
      return;
    }

    // Validate password presence
    if (!mailSettings.smtpPassword) {
      res.status(400).json({
        success: false,
        error: "SMTP Password not configured. Please set up SMTP credentials.",
        code: "SMTP_PASSWORD_MISSING"
      });
      return;
    }

    let transporter: Transporter;
    try {
      // Create Nodemailer Transporter
      transporter = nodemailer.createTransport({
        host: mailSettings.smtpHost,
        port: parseInt(mailSettings.smtpPort, 10),
        secure: parseInt(mailSettings.smtpPort, 10) === 465, // true for 465, false for other ports
        auth: {
          user: mailSettings.username,
          pass: mailSettings.smtpPassword
        }
      });

      // Verify connection
      await transporter.verify();
    } catch (connErr: any) {
      console.error("SMTP Connection Error:", connErr);
      res.status(500).json({
        success: false,
        error: "SMTP Connection Failed. Check credentials or server status.",
        details: connErr.message,
        code: "SMTP_CONNECTION_FAILED"
      });
      return;
    }

    // Send Email
    let sendResult;
    let failureReason: string | undefined;
    try {
      sendResult = await transporter.sendMail({
        from: `${mailSettings.senderName} <${mailSettings.senderEmail}>`,
        to: recipientEmail,
        subject: subject,
        html: body.replace(/\n/g, "<br/>") // Convert newlines to HTML breaks
      });
    } catch (sendErr: any) {
      console.error("Email Send Error:", sendErr);
      failureReason = sendErr.message || "Unknown email sending error";
      
      // Log failed attempt
      const failedLog = await EmailLogModel.create({
        userId,
        policyId: policyId || undefined,
        recipientEmail,
        recipientName: recipientName || "Unknown",
        subject,
        body,
        sentAt: new Date().toISOString(),
        status: "Failed",
        type: type || "Other",
        failureReason: failureReason || ""
      });

      res.status(500).json({
        success: false,
        error: "Failed to send email",
        details: failureReason,
        log: failedLog,
        code: "EMAIL_SEND_FAILED"
      });
      return;
    }

    // Log successful email
    const emailLog = await EmailLogModel.create({
      userId,
      policyId: policyId || undefined,
      recipientEmail,
      recipientName: recipientName || "Unknown",
      subject,
      body,
      sentAt: new Date().toISOString(),
      status: "Sent",
      type: type || "Other",
      providerMessageId: sendResult.messageId || ""
    });

    res.json({
      success: true,
      message: `Email successfully sent to ${recipientEmail}`,
      log: emailLog,
      providerMessageId: sendResult.messageId
    });
  } catch (err: any) {
    console.error("POST /api/emails/send Error:", err);
    res.status(500).json({
      success: false,
      error: "Email sending system error",
      details: err.message || String(err),
      code: "SYSTEM_ERROR"
    });
  }
});

export default router;