let questions = [];
let selectedAnswers = {};
let currentPage = 0;
const questionsPerPage = 10;
let isSubmitted = false;

const highlightAnswers = true;

document.getElementById('file-input').addEventListener('change', handleFile);
document.getElementById('submit-btn').addEventListener('click', handleSubmit);
document.getElementById('prev-btn').addEventListener('click', () => changePage(-1));
document.getElementById('next-btn').addEventListener('click', () => changePage(1));

function handleFile(event) {
  const file = event.target.files[0];
  const reader = new FileReader();
  reader.onload = function (e) {
    const data = new Uint8Array(e.target.result);
    const workbook = XLSX.read(data, { type: 'array' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const json = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    const title = json[0][0];
    document.getElementById('quiz-title').innerText = title;

    const rawQuestions = json.slice(1).map(row => {
      const question = row[0];
      const correctColLetters = row[9] ? row[9].split(',').map(c => c.trim().toUpperCase()) : [];
      const correctIndexes = correctColLetters.map(letter => letter.charCodeAt(0) - 66);

      const answers = row.slice(1, 9).map((text, index) => {
        if (typeof text === 'undefined' || text === null || text === '') return null;
        return {
          text: String(text).trim(),
          correct: correctIndexes.includes(index)
        };
      }).filter(a => a !== null);

      const explanation = row[10] || '';

      return { question, answers, explanation };
    });

    shuffleArray(rawQuestions);
    questions = rawQuestions;
    currentPage = 0;
    isSubmitted = false;
    renderQuestions();
    updateNavigation();
  };
  reader.readAsArrayBuffer(file);
}

function appendTextOrImage(container, content) {
  const lines = content.split(/\n|\r\n|\r/);
  lines.forEach((line, idx) => {
    const parts = line.split(/(img:\S+)/g);
    parts.forEach(part => {
      part = part.trim();
      if (part.toLowerCase().startsWith('img:')) {
        const img = document.createElement('img');
        img.src = part.substring(4);
        img.alt = 'Image';
        img.className = 'quiz-image';
        container.appendChild(img);
      } else if (part.length > 0) {
        const span = document.createElement('span');
        span.textContent = part;
        container.appendChild(span);
      }
    });
    if (idx < lines.length - 1) {
      container.appendChild(document.createElement('br'));
    }
  });
}

function renderQuestions() {
  const container = document.getElementById('quiz-container');
  container.innerHTML = '';

  const start = currentPage * questionsPerPage;
  const end = Math.min(start + questionsPerPage, questions.length);
  const pageQuestions = questions.slice(start, end);

  pageQuestions.forEach((q, index) => {
    const realIndex = start + index;
    const questionDiv = document.createElement('div');
    questionDiv.className = 'question-block';

    const questionText = document.createElement('div');
    questionText.className = 'question-text';

    const questionLabel = document.createElement('span');
    questionLabel.textContent = `Q${realIndex + 1}: `;
    questionText.appendChild(questionLabel);
    appendTextOrImage(questionText, q.question);

    const answers = [...q.answers];
    shuffleArray(answers);

    const correctCount = q.answers.filter(a => a.correct).length;
    const inputType = correctCount === 1 ? 'radio' : 'checkbox';

    if (!selectedAnswers[realIndex]) selectedAnswers[realIndex] = [];

    answers.forEach(answerObj => {
      const label = document.createElement('label');
      label.className = 'answer';

      const input = document.createElement('input');
      input.type = inputType;
      input.name = `question-${realIndex}`;
      input.value = answerObj.text;
      input.dataset.correct = answerObj.correct;
      input.checked = selectedAnswers[realIndex].includes(answerObj.text);
      input.disabled = isSubmitted;

      input.onchange = (e) => {
        if (inputType === 'radio') {
          selectedAnswers[realIndex] = [answerObj.text];
        } else {
          const checked = e.target.checked;
          if (checked) {
            selectedAnswers[realIndex].push(answerObj.text);
          } else {
            selectedAnswers[realIndex] = selectedAnswers[realIndex].filter(a => a !== answerObj.text);
          }
        }
      };

      label.appendChild(input);
      appendTextOrImage(label, answerObj.text);
      questionDiv.appendChild(label);
    });

    if (isSubmitted && q.explanation && q.explanation.trim() !== '') {
      const explanationDiv = document.createElement('div');
      explanationDiv.className = 'explanation';
      explanationDiv.innerHTML = '<strong>Explanation:</strong> ';
      appendTextOrImage(explanationDiv, q.explanation);
      questionDiv.appendChild(explanationDiv);
    }

    questionDiv.prepend(questionText);
    container.appendChild(questionDiv);
  });

  updateNavigation();

  if (isSubmitted && highlightAnswers) highlightAllAnswers();
}

function changePage(delta) {
  const newPage = currentPage + delta;
  if (newPage >= 0 && newPage * questionsPerPage < questions.length) {
    currentPage = newPage;
    renderQuestions();
  }
}

function updateNavigation() {
  const totalPages = Math.ceil(questions.length / questionsPerPage);
  document.getElementById('prev-btn').disabled = currentPage === 0;
  document.getElementById('next-btn').disabled = currentPage >= totalPages - 1;
  document.getElementById('page-indicator').textContent = `Page ${currentPage + 1} of ${totalPages}`;
}

function handleSubmit() {
  let correctCount = 0;
  questions.forEach((q, i) => {
    const selected = selectedAnswers[i] || [];
    const correct = q.answers.filter(a => a.correct).map(a => a.text);
    const isCorrect =
      selected.length === correct.length &&
      selected.every(ans => correct.includes(ans));

    if (isCorrect) correctCount++;
  });

  const percent = Math.round((correctCount / questions.length) * 100);
  const resultText = `You scored ${percent}%. ${percent >= 70 ? 'Pass' : 'Fail'}`;
  document.getElementById('result').textContent = resultText;

  isSubmitted = true;
  renderQuestions();
}

function highlightAllAnswers() {
  const labels = document.querySelectorAll('.answer');
  labels.forEach(label => {
    const input = label.querySelector('input');
    const isSelected = input.checked;
    const isCorrect = input.dataset.correct === 'true';

    label.classList.remove('answer-correct', 'answer-incorrect', 'answer-missed');

    if (isSelected && isCorrect) {
      label.classList.add('answer-correct');
    } else if (isSelected && !isCorrect) {
      label.classList.add('answer-incorrect');
    } else if (!isSelected && isCorrect) {
      label.classList.add('answer-missed');
    }
  });
}

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

