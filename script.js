const quizForm = document.getElementById('quiz-form');
const submitBtn = document.getElementById('submit-btn');
const resultsDiv = document.getElementById('results');
let questions = [];
let correctAnswers = {};

// Helper to fetch truly random words (more variety than Datamuse)
async function getWords() {
  let resp = await fetch('https://random-word-api.herokuapp.com/word?number=20');
  let words = await resp.json();
  // Get words with >5 letters for difficulty, adjust as needed
  return words.filter(w => w.length > 3).slice(0, 10);
}

// Helper to fetch meanings using Free Dictionary API
async function getDefinition(word) {
  try {
    let resp = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
    let data = await resp.json();
    if (Array.isArray(data) && data[0]?.meanings?.[0]?.definitions?.[0]?.definition) {
      return data[0].meanings[0].definitions[0].definition;
    }
  } catch(e) {}
  return null;
}

// Build questions and UI
async function buildQuiz() {
  let words = await getWords();
  let definitions = [];
  for (let w of words) {
    let def = await getDefinition(w);
    if (def) definitions.push({ word: w, definition: def });
    if (definitions.length >= 6) break; // Stop at 6 questions
  }
  questions = definitions.slice(0,6); // Use up to 6 questions

  quizForm.innerHTML = ""; // Clear previous content

  questions.forEach((item, idx) => {
    // Prepare 4 options: correct + 3 wrong
    let options = [item.definition];
    while (options.length < 4) {
      let wrong = definitions[Math.floor(Math.random()*definitions.length)].definition;
      if (wrong !== item.definition && !options.includes(wrong)) options.push(wrong);
    }
    options = options.sort(() => Math.random() - 0.5); // Shuffle

    correctAnswers[`q${idx}`] = item.definition;

    let html = `<div><b>${idx+1}. ${item.word}</b><br>`;
    options.forEach((opt, oi) => {
      html += `<input type="radio" name="q${idx}" value="${opt}" required> ${opt}<br>`;
    });
    html += '</div>';
    quizForm.innerHTML += html;
  });
}

submitBtn.onclick = function() {
  let score = 0, results = [];
  for (let i = 0; i < questions.length; ++i) {
    let selected = document.querySelector(`input[name="q${i}"]:checked`);
    if (selected && selected.value === correctAnswers[`q${i}`]) {
      score++;
      results.push(`<div class="correct">Q${i+1}: Correct!</div>`);
    } else {
      results.push(`<div class="wrong">Q${i+1}: Wrong! Correct: <i>${correctAnswers[`q${i}`]}</i></div>`);
    }
  }
  resultsDiv.innerHTML = `<h2>Score: ${score}/${questions.length}</h2>` + results.join('');
  submitBtn.disabled = true;
};

buildQuiz();

