import { Router } from "express";
import { GoogleGenAI } from "@google/genai";

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

// AI: Generate Reminder Email
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

export default router;
