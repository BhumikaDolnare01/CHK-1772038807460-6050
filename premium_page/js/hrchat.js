const API = "http://localhost:5000/api";

let chatHistory      = [];
let resumeContext    = "";
let isListening      = false;
let isSpeaking       = false;
let aiVoiceEnabled   = true;
let recognition      = null;
let synth            = window.speechSynthesis;
let currentUtterance = null;
let sessionStarted   = false;

/* ── INIT ── */
document.addEventListener("DOMContentLoaded", () => {
  initSpeechRecognition();
  checkBrowserSupport();
});

function checkBrowserSupport() {
  if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
    document.getElementById("voice-status").textContent =
      "Voice not supported. Please use Chrome.";
    document.getElementById("mic-btn").disabled = true;
  }
}

/* ── START INTERVIEW ── */
function startInterview() {
  sessionStarted = true;
  document.getElementById("welcome-screen").style.display = "none";
  sendMessage("Hello, I am ready for the interview.");
}

/* ── SPEECH RECOGNITION SETUP ── */
function initSpeechRecognition() {
  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) return;

  recognition = new SpeechRecognition();
  recognition.continuous     = false;
  recognition.interimResults = true;
  recognition.lang           = "en-US";

  recognition.onstart = () => {
    isListening = true;
    document.getElementById("mic-btn").classList.add("listening");
    document.getElementById("waveform").classList.add("show");
    setVoiceStatus("Listening...", "active");
  };

  recognition.onresult = (event) => {
    let transcript = "";
    for (let i = event.resultIndex; i < event.results.length; i++) {
      transcript += event.results[i][0].transcript;
    }
    document.getElementById("chat-input").value = transcript;

    if (event.results[event.results.length - 1].isFinal) {
      setTimeout(() => {
        if (transcript.trim()) sendMessage();
      }, 400);
    }
  };

  recognition.onerror = (event) => {
    console.error("Speech error:", event.error);
    stopListening();
    if (event.error === "not-allowed") {
      setVoiceStatus("Mic blocked. Allow microphone access.", "");
    } else {
      setVoiceStatus("Click mic to speak", "");
    }
  };

  recognition.onend = () => stopListening();
}

/* ── MIC TOGGLE ── */
function toggleMic() {
  if (isSpeaking) { stopSpeaking(); return; }
  if (isListening) {
    recognition.stop();
    stopListening();
  } else {
    startListening();
  }
}

function startListening() {
  if (!recognition) return;
  stopSpeaking();
  try { recognition.start(); }
  catch (e) { console.warn("Recognition already started"); }
}

function stopListening() {
  isListening = false;
  document.getElementById("mic-btn").classList.remove("listening");
  document.getElementById("waveform").classList.remove("show");
  setVoiceStatus("Click mic to speak", "");
}

/* ── AI VOICE ── */
function toggleAIVoice() {
  aiVoiceEnabled = document.getElementById("ai-voice-toggle").checked;
  if (!aiVoiceEnabled) stopSpeaking();
}

function speakText(text) {
  if (!aiVoiceEnabled || !synth) return;
  stopSpeaking();

  const cleanText = text
    .replace(/\*\*/g, "").replace(/\*/g, "")
    .replace(/#{1,6}/g, "").replace(/`/g, "")
    .trim();

  currentUtterance         = new SpeechSynthesisUtterance(cleanText);
  currentUtterance.rate    = 0.95;
  currentUtterance.pitch   = 1.0;
  currentUtterance.volume  = 1.0;

  // Pick best available voice
  const voices    = synth.getVoices();
  const preferred = voices.find(v =>
    v.name.includes("Google UK English Female") ||
    v.name.includes("Microsoft Zira")           ||
    v.name.includes("Google US English")        ||
    v.lang === "en-US"
  );
  if (preferred) currentUtterance.voice = preferred;

  currentUtterance.onstart = () => {
    isSpeaking = true;
    document.getElementById("mic-btn").classList.add("speaking");
    document.getElementById("mic-btn").textContent = "⏹";
    setVoiceStatus("AI is speaking... (click mic to stop)", "speaking");
  };

  currentUtterance.onend = () => {
    stopSpeaking();
    setTimeout(() => {
      if (aiVoiceEnabled) startListening();
    }, 600);
  };

  currentUtterance.onerror = () => stopSpeaking();

  synth.speak(currentUtterance);
}

function stopSpeaking() {
  if (synth) synth.cancel();
  isSpeaking = false;
  document.getElementById("mic-btn").classList.remove("speaking");
  document.getElementById("mic-btn").textContent = "🎤";
  setVoiceStatus("Click mic to speak", "");
}

/* ── STATUS ── */
function setVoiceStatus(text, cls) {
  const el  = document.getElementById("voice-status");
  el.textContent = text;
  el.className   = "voice-status" + (cls ? " " + cls : "");
}

/* ── APPLY CONTEXT ── */
function applyContext() {
  const ctx = document.getElementById("resume-context")?.value?.trim();
  resumeContext = ctx || "";
  const status = document.getElementById("context-status");
  if (status) status.textContent = ctx ? "Applied ✓" : "None";
  updateSessionInfo();
}

/* ── SEND MESSAGE ── */
// BUG FIX 1: accept optional text param for startInterview()
async function sendMessage(forcedMessage) {
  const input   = document.getElementById("chat-input");
  const message = forcedMessage || input.value.trim();
  if (!message) return;

  stopSpeaking();
  stopListening();

  input.value        = "";
  input.style.height = "auto";

  // BUG FIX 2: correct container ID — "messages" not "chat-messages"
  appendMessage("user", message);
  chatHistory.push({ role: "user", content: message });
  updateSessionInfo();

  showTypingIndicator();

  try {
    const res  = await fetch(API + "/hr-chat", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message,
        resumeContext,
        history: chatHistory.slice(-10),
      }),
    });

    const data = await res.json();
    hideTypingIndicator();

    if (!data.success) throw new Error(data.message);

    const reply = data.reply;
    chatHistory.push({ role: "assistant", content: reply });
    appendMessage("assistant", reply);
    updateSessionInfo();
    speakText(reply);

  } catch (err) {
    hideTypingIndicator();
    appendMessage("assistant", "Sorry, something went wrong. Please try again.");
    setVoiceStatus("Error occurred", "");
    console.error("Chat error:", err.message);
  }
}

/* ── KEYBOARD ── */
function handleKey(e) {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
  const ta = document.getElementById("chat-input");
  ta.style.height = "auto";
  ta.style.height = Math.min(ta.scrollHeight, 120) + "px";
}

/* ── APPEND MESSAGE ── */
// BUG FIX 3: was using wrong IDs "chat-messages","msg-user","msg-ai","msg-bubble"
// Correct IDs from hrchat.html: "messages", "user", "assistant", "bubble"
function appendMessage(role, text) {
  const container = document.getElementById("messages");
  if (!container) return;

  const div = document.createElement("div");
  div.className = "message " + (role === "user" ? "user" : "assistant");

  const avatar = document.createElement("div");
  avatar.className = role === "user" ? "avatar user-av" : "avatar ai";
  avatar.textContent = role === "user" ? "👤" : "🤖";

  const bubble = document.createElement("div");
  bubble.className   = "bubble";
  bubble.textContent = text;

  div.appendChild(avatar);
  div.appendChild(bubble);

  // Replay button on AI messages
  if (role === "assistant") {
    const replayBtn = document.createElement("button");
    replayBtn.textContent = "🔊";
    replayBtn.title       = "Replay";
    replayBtn.style.cssText = `
      background:none; border:none; cursor:pointer;
      font-size:0.75rem; color:var(--text-muted);
      padding:2px 4px; align-self:flex-end;
    `;
    replayBtn.onclick = () => speakText(text);
    div.appendChild(replayBtn);
  }

  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

/* ── TYPING INDICATOR ── */
function showTypingIndicator() {
  document.getElementById("typing").classList.add("show");
  const container = document.getElementById("messages");
  container.scrollTop = container.scrollHeight;
}

function hideTypingIndicator() {
  document.getElementById("typing").classList.remove("show");
}

/* ── SESSION INFO ── */
function updateSessionInfo() {
  const msgCount = document.getElementById("msg-count");
  const ctxInfo  = document.getElementById("context-status");
  if (msgCount) msgCount.textContent = chatHistory.length;
  if (ctxInfo && !resumeContext) ctxInfo.textContent = "None";
}

/* ── CLEAR CHAT ── */
function clearChat() {
  chatHistory   = [];
  resumeContext = "";
  sessionStarted = false;

  // Remove all messages except welcome screen and typing indicator
  const container = document.getElementById("messages");
  const msgs = container.querySelectorAll(".message");
  msgs.forEach(m => m.remove());

  // Show welcome screen again
  document.getElementById("welcome-screen").style.display = "flex";

  stopSpeaking();
  updateSessionInfo();

  const ctx = document.getElementById("resume-context");
  if (ctx) ctx.value = "";
}
