const SHEET_API_URL = "https://script.google.com/macros/s/AKfycbwCt-8WgjGZg8G2e1HEMgWpARp4M7BxDh0VedNFJUUtgp3Doarsa-jrO6yCUV_Paz_Q/exec";

const quizForm = document.getElementById('quiz-form');
const submitBtn = document.getElementById('submit-btn');
const resultsDiv = document.getElementById('results');
const leaderboardDiv = document.getElementById('leaderboard'); // <div id="leaderboard"></div> in HTML
const nameSection = document.getElementById('name-section');   // <div id="name-section"> in HTML
const nameInput = document.getElementById('name-input');
const nameDropdown = document.getElementById('name-dropdown');
const nameBtn = document.getElementById('name-btn');

let questions = [];
let correctAnswers = {};
let playerName = "";
let totalQuestions = 6;

// Fetch random words as before
async function getWords() {
  let resp = await fetch('https://random-word-api.herokuapp.com/word?number=30');
  let words = await resp.json();
  return words;
}

// Fetch definition, as before
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

// Get player names from Google Sheet
async function getNamesFromSheet() {
  let resp = await fetch(SHEET_API_URL);
  let names = await resp.json();
  return names;
}

// Submit score
async function submitScoreToSheet(name, correct, total) {
  let params = new URLSearchParams({
    name,
    correct,
    total
  });
  await fetch(SHEET_API_URL + "?" + params.toString(), { method: "POST" });
  return true;
}

// Get leaderboard scores
async function getLeaderboardFromSheet() {
  let resp = await fetch(SHEET_API_URL + "?action=leaderboard");
  let data = await resp.json();
  return data;
}

// UI logic for names
function showNameSelection(names) {
  nameDropdown.innerHTML = "";
  nameDropdown.style.display = "block";
  nameInput.style.display = "none";
  names.forEach(n => {
    let opt = document.createElement("option");
    opt.value = n;
    opt.textContent = n;
    nameDropdown.appendChild(opt);
  });
  nameBtn.textContent = "Start Quiz";
}

function showNameInput() {
  nameInput.style.display = "block";
  nameDropdown.style.display = "none";
  nameBtn.textContent = "Start Quiz";
}

function saveNameToLocal(name) {
  localStorage.setItem("quiz_player_name", name);
}

function getNameFromLocal() {
  return localStorage.getItem("quiz_player_name") || "";
}

async function buildQuiz() {
  let words = await getWords();
  let definitions = [];
  for (let w of words) {
    let def = await getDefinition(w);
    if (def) definitions.push({ word: w, definition: def });
    if (definitions.length === totalQuestions) break;
  }
  questions = definitions.slice(0, totalQuestions);

  quizForm.innerHTML = "";

  if (questions.length === 0) {
    quizForm.innerHTML = "<div>No suitable words found. Please refresh the page.</div>";
    submitBtn.disabled = true;
    return;
  }

  questions.forEach((item, idx) => {
    let options = [item.definition];
    while (options.length < 4 && definitions.length > 1) {
      let wrong = definitions[Math.floor(Math.random() * definitions.length)].definition;
      if (wrong !== item.definition && !options.includes(wrong)) options.push(wrong);
    }
    options = options.sort(() => Math.random() - 0.5);

    correctAnswers[`q${idx}`] = item.definition;

    let html = `<div><b>${idx + 1}. ${item.word}</b><br>`;
    options.forEach(opt => {
      html += `<input type="radio" name="q${idx}" value="${opt}" required> ${opt}<br>`;
    });
    html += '</div>';
    quizForm.innerHTML += html;
  });
  submitBtn.disabled = false;
}

submitBtn.onclick = async function() {
  let score = 0, results = [];
  for (let i = 0; i < questions.length; ++i) {
    let selected = document.querySelector(`input[name="q${i}"]:checked`);
    if (selected && selected.value === correctAnswers[`q${i}`]) {
      score++;
      results.push(`<div class="correct">Q${i + 1}: Correct!</div>`);
    } else {
      results.push(`<div class="wrong">Q${i + 1}: Wrong! Correct: <i>${correctAnswers[`q${i}`]}</i></div>`);
    }
  }
  const percentScore = ((score/questions.length)*100).toFixed(0);
  resultsDiv.innerHTML = `<h2>Score: ${score}/${questions.length} (${percentScore}%)</h2>` + results.join('');
  submitBtn.disabled = true;
  if (playerName && playerName.length > 1) {
    await submitScoreToSheet(playerName, score, questions.length);
    showLeaderboard();
  }
};

async function showLeaderboard() {
  leaderboardDiv.innerHTML = "<p>Loading leaderboard...</p>";
  let data = await getLeaderboardFromSheet();
  data = data.slice(1); // skip header
  data.sort((a,b) => (Number(b[4]||0)-Number(a[4]||0)));
  let html = "<table><thead><tr><th>Rank</th><th>Name</th><th>Attempts</th><th>%Correct</th></tr></thead><tbody>";
  data.forEach((row, idx) => {
    html += `<tr>
      <td>${idx+1}</td>
      <td>${row[0]}</td>
      <td>${row[1]}</td>
      <td>${row[4]}%</td>
    </tr>`;
  });
  html += "</tbody></table>";
  leaderboardDiv.innerHTML = html;
}

nameBtn.onclick = async function() {
  let chosenName = "";
  if (nameInput.style.display === "block") {
    chosenName = nameInput.value.trim();
  } else {
    chosenName = nameDropdown.value;
  }
  if (!chosenName || chosenName.length < 2) {
    alert("Please enter or select your name!");
    return;
  }
  playerName = chosenName;
  saveNameToLocal(playerName);
  nameSection.style.display = "none";
  await buildQuiz();
};

async function initNameLogic() {
  nameSection.style.display = "block";
  let localName = getNameFromLocal();
  let names = await getNamesFromSheet();
  if (localName && names.includes(localName)) {
    playerName = localName;
    nameSection.style.display = "none";
    await buildQuiz();
  } else {
    if (names.length > 0) {
      showNameSelection(names);
    } else {
      showNameInput();
    }
  }
}

window.onload = async function() {
  await initNameLogic();
  showLeaderboard();
};
