import Groq from "groq-sdk";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";

export const analyzeResume = async (req, res, next) => {
  try {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "PDF file is required.",
      });
    }

    // Extract text from PDF buffer using pdfjs
    let extractedText = "";
    try {
      const uint8Array = new Uint8Array(req.file.buffer);
      const loadingTask = pdfjsLib.getDocument({ data: uint8Array });
      const pdf = await loadingTask.promise;

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const pageText = content.items.map(item => item.str).join(" ");
        extractedText += pageText + "\n";
      }
      extractedText = extractedText.trim();
    } catch (pdfErr) {
      return res.status(500).json({
        success: false,
        message: "Could not read PDF: " + pdfErr.message,
      });
    }

    if (!extractedText || extractedText.length < 50) {
      return res.status(400).json({
        success: false,
        message: "Could not extract enough text from the PDF.",
      });
    }

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{
        role: "user",
        content: `Analyze this resume and return ONLY valid JSON, no markdown, no extra text.

Format:
{
  "name": "Full name or null",
  "email": "Email or null",
  "phone": "Phone or null",
  "location": "City, Country or null",
  "summary": "2-3 sentence professional summary",
  "totalExperienceYears": "number or null",
  "skills": ["skill1", "skill2"],
  "experience": [
    {
      "company": "Company name",
      "role": "Job title",
      "duration": "e.g. Jan 2020 - Dec 2022",
      "highlights": ["achievement 1", "achievement 2"]
    }
  ],
  "education": [
    {
      "institution": "University name",
      "degree": "Degree and field",
      "year": "Graduation year"
    }
  ],
  "certifications": ["cert1", "cert2"],
  "languages": ["English", "Hindi"],
  "strengths": ["strength1", "strength2"],
  "improvements": ["area1", "area2"],
  "overallScore": "score out of 10 as a number"
}

RESUME TEXT:
"""
${extractedText}
"""`
      }],
      max_tokens: 2000,
      temperature: 0.3,
    });

    const raw     = completion.choices[0].message.content.trim();
    const cleaned = raw.replace(/```json|```/g, "").trim();

    let resumeSummary;
    try {
      resumeSummary = JSON.parse(cleaned);
    } catch {
      return res.status(500).json({
        success: false,
        message: "Failed to parse AI response. Try again.",
      });
    }

    res.status(200).json({ success: true, resumeSummary });

  } catch (error) {
    console.error("Resume Error:", error.message);
    next(error);
  }
};
