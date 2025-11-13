// --- State Variables ---
let fullQuizData = []; // All questions from JSON
let activeQuizData = []; // The selected, shuffled questions for the current test
let currentQuestionIndex = 0;
let score = 0;
let userAnswers = [];

// --- DOM Elements ---
const startScreen = document.getElementById('start-screen');
const quizScreen = document.getElementById('quiz-screen');
const resultScreen = document.getElementById('result-screen');
const headerBar = document.getElementById('header-bar');
const questionText = document.getElementById('question-text');
const optionsContainer = document.getElementById('options-container');
const nextBtn = document.getElementById('next-btn');
const currentNumEl = document.getElementById('current-num');
const totalNumEl = document.getElementById('total-num');
const progressBar = document.getElementById('progress-bar');
const totalQCount = document.getElementById('total-q-count');

// --- Initialize ---
window.addEventListener('DOMContentLoaded', () => {
    fetch('questions.json')
        .then(response => {
            if (!response.ok) throw new Error("HTTP error ".concat(response.status));
            return response.json();
        })
        .then(data => {
            fullQuizData = data;
            if(totalQCount) totalQCount.textContent = "মোট ".concat(convertToBanglaDigits(fullQuizData.length), "টি প্রশ্ন লোড হয়েছে।");
        })
        .catch(error => {
            console.error('Error loading questions:', error);
            if(totalQCount) totalQCount.textContent = "প্রশ্ন লোড করতে ব্যর্থ।";
            alert("Error: Could not load questions.json. Ensure you are running on a Local Server (like VS Code Live Server) and the file exists.");
        });
});

// --- Helper Functions ---
function convertToBanglaDigits(number) {
    const english = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
    const bangla = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
    return number.toString().split('').map(c => bangla[english.indexOf(c)] || c).join('');
}

// Fisher-Yates Shuffle Algorithm
function shuffleArray(array) {
    let newArr = [...array]; // Create a copy
    for (let i = newArr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
    }
    return newArr;
}

// --- Main App Functions ---
function startQuiz(numQuestions) {
    if (fullQuizData.length === 0) {
        alert("Data loading... Please wait a moment.");
        return;
    }
    
    // Shuffle and select questions
    const shuffledData = shuffleArray(fullQuizData);
    
    if (numQuestions === -1 || numQuestions > shuffledData.length) {
        activeQuizData = shuffledData;
    } else {
        activeQuizData = shuffledData.slice(0, numQuestions);
    }
    
    // Reset State
    currentQuestionIndex = 0;
    score = 0;
    userAnswers = new Array(activeQuizData.length).fill(null);

    // Update UI
    totalNumEl.textContent = activeQuizData.length;
    startScreen.style.display = 'none';
    quizScreen.style.display = 'flex';
    headerBar.style.display = 'block';
    
    setTimeout(() => quizScreen.classList.remove('opacity-0'), 50);
    loadQuestion();
}

function loadQuestion() {
    const currentData = activeQuizData[currentQuestionIndex];
    
    // Update Header
    currentNumEl.textContent = currentQuestionIndex + 1;
    progressBar.style.width = "".concat(((currentQuestionIndex) / activeQuizData.length) * 100, "%");

    // Update Question
    questionText.textContent = currentData.question;
    
    // Clear & Generate Options
    optionsContainer.innerHTML = '';
    
    currentData.options.forEach((option, index) => {
        const btn = document.createElement('div');
        // Note: We use dataset to store the option text for easy checking
        btn.dataset.option = option;
        btn.className = "option-card w-full p-4 bg-white rounded-xl border border-slate-200 text-slate-700 cursor-pointer flex items-center gap-3 text-left";
        
        btn.innerHTML = `
            <div class="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-xs font-bold shrink-0 border border-slate-200 option-letter">
                ${String.fromCharCode(65 + index)}
            </div>
            <span class="text-sm md:text-base font-medium">${option}</span>
        `;
        
        // Pass the full data object to the handler
        btn.onclick = () => selectOption(option, btn);
        optionsContainer.appendChild(btn);
    });

    // Reset Next Button
    nextBtn.disabled = true;
    nextBtn.className = "w-full bg-slate-200 text-slate-400 font-bold py-3.5 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 cursor-not-allowed";
    
    if (currentQuestionIndex === activeQuizData.length - 1) {
        nextBtn.innerHTML = 'ফলাফল দেখুন <i class="fa-solid fa-flag-checkered ml-2"></i>';
    } else {
        nextBtn.innerHTML = 'পরবর্তী প্রশ্ন <i class="fa-solid fa-arrow-right ml-2"></i>';
    }

    // Animation
    questionText.classList.add('fade-in');
    optionsContainer.classList.add('slide-up');
    setTimeout(() => {
        questionText.classList.remove('fade-in');
        optionsContainer.classList.remove('slide-up');
    }, 500);
}

function selectOption(selectedOption, btnElement) {
    const currentData = activeQuizData[currentQuestionIndex];
    const correctAnswer = currentData.answer;
    const isCorrect = (selectedOption === correctAnswer);

    // Disable all options
    Array.from(optionsContainer.children).forEach(child => {
        child.classList.add('disabled');
        // Find the correct answer and highlight it
        if (child.dataset.option === correctAnswer) {
            child.classList.add('correct-ui');
        }
    });

    // Update score and selected button UI
    if (isCorrect) {
        score++;
        // 'correct-ui' was already added
    } else {
        btnElement.classList.add('wrong-ui');
    }

    // Store answer for review
    userAnswers[currentQuestionIndex] = { selected: selectedOption, correct: correctAnswer };

    // Enable Next Button
    nextBtn.disabled = false;
    nextBtn.className = "w-full bg-sky-600 hover:bg-sky-700 text-white font-bold py-3.5 rounded-xl shadow-md shadow-sky-200 transition-all duration-200 flex items-center justify-center gap-2 transform active:scale-[0.98]";
}

function nextQuestion() {
    currentQuestionIndex++;
    if (currentQuestionIndex < activeQuizData.length) {
        loadQuestion();
    } else {
        showResults();
    }
}

function showResults() {
    quizScreen.style.display = 'none';
    headerBar.style.display = 'none';
    resultScreen.style.display = 'flex';
    resultScreen.classList.remove('hidden');

    // Calculate score
    const percentage = Math.round((score / activeQuizData.length) * 100);
    document.getElementById('score-percent').textContent = "".concat(percentage, "%");
    document.getElementById('score-fraction').textContent = "".concat(score, "/").concat(activeQuizData.length);

    // Score text
    const scoreText = document.getElementById('score-text');
    if (percentage === 100) scoreText.textContent = "অসাধারণ! সব উত্তর সঠিক হয়েছে।";
    else if (percentage >= 80) scoreText.textContent = "খুবই ভালো! চালিয়ে যান।";
    else if (percentage >= 50) scoreText.textContent = "ভালো প্রচেষ্টা, আরও ভালো হতে পারে।";
    else scoreText.textContent = "হতাশ হবেন না, আবার চেষ্টা করুন।";

    // Generate Review
    const reviewContainer = document.getElementById('review-container');
    reviewContainer.innerHTML = '';

    activeQuizData.forEach((q, idx) => {
        const userAnswer = userAnswers[idx]; // { selected: '...', correct: '...' }
        const isCorrect = userAnswer.selected === userAnswer.correct;
        
        const reviewItem = document.createElement('div');
        reviewItem.className = "bg-slate-50 p-4 rounded-xl text-sm border border-slate-100";
        
        let statusIcon = isCorrect 
            ? '<i class="fa-solid fa-check text-green-500"></i>' 
            : '<i class="fa-solid fa-xmark text-red-500"></i>';
        
        reviewItem.innerHTML = `
            <div class="flex gap-3 mb-2">
                <span class="font-bold text-slate-400 text-xs pt-1">#${idx + 1}</span>
                <p class="font-semibold text-slate-800 leading-tight flex-1">${q.question}</p>
                <div class="shrink-0">${statusIcon}</div>
            </div>
            <div class="pl-6 space-y-1">
                ${!isCorrect ? `
                    <div class="text-red-600 text-xs font-medium flex items-start gap-2">
                        <span class="opacity-70">আপনার উত্তর:</span> ${userAnswer.selected || "উত্তর দেওয়া হয়নি"}
                    </div>
                ` : ''}
                <div class="text-green-600 text-xs font-medium flex items-start gap-2">
                    <span class="opacity-70">সঠিক উত্তর:</span> ${userAnswer.correct}
                </div>
            </div>
        `;
        reviewContainer.appendChild(reviewItem);
    });
}

function restartQuiz() {
    resultScreen.style.display = 'none';
    startScreen.style.display = 'flex';
}