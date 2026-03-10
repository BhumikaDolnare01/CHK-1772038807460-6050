const API = "http://localhost:5000/api";
let currentQuestions = [];
let answers = {};

function switchTab(tab, el) {
  document.getElementById("tab-topic").style.display = tab === "topic" ? "block" : "none";
  document.getElementById("tab-lecture").style.display = tab === "lecture" ? "block" : "none";
  document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
  el.classList.add("active");
  resetQuiz();
}

async function generateTopicQuiz() {
  const category = document.getElementById("category").value.trim();
  const difficulty = document.getElementById("difficulty").value;
  if (!category) return alert("Please enter a topic.");
  await fetchQuiz("/generate-quiz", { category, difficulty }, `${category} · ${difficulty}`);
}

async function generateLectureQuiz() {
  const lectureText = document.getElementById("lectureText").value.trim();
  if (!lectureText) return alert("Please paste your lecture content.");
  await fetchQuiz("/generate-lecture-quiz", { lectureText }, "Lecture Quiz");
}

async function fetchQuiz(endpoint, body, title) {
  showLoader(true);
  hideResults();
  try {
    const res = await fetch(API + endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.message);
    currentQuestions = data.questions;
    answers = {};
    renderQuestions(title);
  } catch (err) {
    alert("Error: " + err.message);
  } finally {
    showLoader(false);
  }
}

function renderQuestions(title) {
  document.getElementById("results-title").textContent = title;
  const container = document.getElementById("questions-container");
  container.innerHTML = "";
  document.getElementById("score-bar").style.display = "none";

  currentQuestions.forEach((q, i) => {
    const card = document.createElement("div");
    card.className = "question-card";
    card.id = `q-${i}`;
    card.innerHTML = `
      <div class="q-number">Question ${i + 1} of ${currentQuestions.length}</div>
      <div class="q-text">${q.question}</div>
      <div class="options">
        ${q.options.map((opt, j) => `
          <button class="option" onclick="selectAnswer(${i}, '${escapeStr(opt)}', this)">
            <span style="color:var(--text-muted);margin-right:10px">${String.fromCharCode(65+j)}.</span>${opt}
          </button>
        `).join("")}
      </div>`;
    container.appendChild(card);
  });

  document.getElementById("results").classList.add("show");
}

function selectAnswer(qIndex, selected, btn) {
  if (answers[qIndex] !== undefined) return;
  answers[qIndex] = selected;

  const correct = currentQuestions[qIndex].correctAnswer;
  const card = document.getElementById(`q-${qIndex}`);
  card.classList.add("answered");

  card.querySelectorAll(".option").forEach(b => {
    const text = b.textContent.slice(2).trim();
    b.disabled = true;
    if (text === correct) b.classList.add("correct");
    else if (text === selected && selected !== correct) b.classList.add("wrong");
  });

  // Show score when all answered
  if (Object.keys(answers).length === currentQuestions.length) showScore();
}

function showScore() {
  const correct = Object.entries(answers).filter(([i, ans]) =>
    ans === currentQuestions[i].correctAnswer
  ).length;
  const total = currentQuestions.length;
  const pct = Math.round((correct / total) * 100);

  document.getElementById("score-bar").style.display = "flex";
  document.getElementById("score-circle").textContent = `${correct}/${total}`;
  document.getElementById("score-text").textContent =
    `${pct}% correct · ${pct >= 70 ? "Great job! 🎉" : "Keep practicing 💪"}`;

  document.getElementById("score-bar").scrollIntoView({ behavior: "smooth" });
}

function resetQuiz() {
  currentQuestions = []; answers = {};
  document.getElementById("questions-container").innerHTML = "";
  document.getElementById("results").classList.remove("show");
  document.getElementById("score-bar").style.display = "none";
}

function showLoader(show) {
  document.getElementById("loader").classList.toggle("show", show);
}
function hideResults() {
  document.getElementById("results").classList.remove("show");
}
function escapeStr(str) {
  return str.replace(/'/g, "\\'").replace(/"/g, "&quot;");
}