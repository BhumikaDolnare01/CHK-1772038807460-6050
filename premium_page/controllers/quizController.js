import Groq from "groq-sdk";

export const generateQuiz = async (req, res, next) => {
  try {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const { category, difficulty } = req.body;

    if (!category || !difficulty) {
      return res.status(400).json({ success: false, message: "category and difficulty are required" });
    }

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{
        role: "user",
        content: `Generate exactly 10 multiple choice questions about "${category}" at "${difficulty}" difficulty.
Return ONLY a valid JSON array, no markdown, no explanation.
Format:
[{"question":"...","options":["A","B","C","D"],"correctAnswer":"A"}]
Rules: exactly 4 options, correctAnswer must match one option exactly.`
      }],
      max_tokens: 2000,
      temperature: 0.7,
    });

    const raw      = completion.choices[0].message.content.trim();
    const cleaned  = raw.replace(/```json|```/g, "").trim();
    const questions = JSON.parse(cleaned);

    res.status(200).json({ success: true, category, difficulty, total: questions.length, questions });
  } catch (error) {
    next(error);
  }
};
