import Groq from "groq-sdk";

export const generateLectureQuiz = async (req, res, next) => {
  try {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const { lectureText } = req.body;

    if (!lectureText || lectureText.trim().length < 100) {
      return res.status(400).json({ success: false, message: "lectureText must be at least 100 characters" });
    }

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{
        role: "user",
        content: `Based ONLY on this lecture, generate 5-10 MCQs.
Return ONLY valid JSON array, no markdown.
Format: [{"question":"...","options":["A","B","C","D"],"correctAnswer":"A"}]

LECTURE:
"""
${lectureText.trim()}
"""`
      }],
      max_tokens: 2000,
      temperature: 0.5,
    });

    const raw      = completion.choices[0].message.content.trim();
    const cleaned  = raw.replace(/```json|```/g, "").trim();
    const questions = JSON.parse(cleaned);

    res.status(200).json({ success: true, total: questions.length, questions });
  } catch (error) {
    next(error);
  }
};
