import Groq from "groq-sdk";

export const hrChat = async (req, res, next) => {
  try {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

    const { message, resumeContext, history = [] } = req.body;

    if (!message || message.trim().length === 0) {
      return res.status(400).json({ success: false, message: "message is required" });
    }

    const systemPrompt = `You are an experienced HR interviewer conducting a professional job interview.
Your role is to ask relevant interview questions, evaluate answers, give constructive feedback, and ask follow-up questions.
Be professional, friendly, and encouraging. Keep responses concise (2-4 sentences). Ask one question at a time.
${resumeContext ? `\nCandidate Resume:\n${resumeContext}` : ""}`;

    const messages = [
      { role: "system", content: systemPrompt },
      ...history.map(h => ({ role: h.role, content: h.content })),
      { role: "user", content: message.trim() },
    ];

    const completion = await groq.chat.completions.create({
      model:       "llama-3.3-70b-versatile",
      messages,
      max_tokens:  500,
      temperature: 0.7,
    });

    const aiResponse = completion.choices[0].message.content.trim();

    const updatedHistory = [
      ...history,
      { role: "user",      content: message.trim() },
      { role: "assistant", content: aiResponse },
    ];

    res.status(200).json({ success: true, reply: aiResponse, history: updatedHistory });
  } catch (error) {
    console.error("HR Chat Error:", error.message);
    next(error);
  }
};
