// --- Global State ---
let fullData = [];
let activeQuestions = [];
let currentIndex = 0;
let score = 0;
let userAnswers = []; // Stores { selected: string, correct: string }
let selectedLimit = 10; // Default
let currentMode = 'practice'; // 'practice' or 'test'

// --- DOM Elements ---
const screens = {
    start: document.getElementById('start-screen'),
    quiz: document.getElementById('quiz-screen'),
    result: document.getElementById('result-screen')
};
const els = {
    headerBar: document.getElementById('header-bar'),
    question: document.getElementById('question-text'),
    options: document.getElementById('options-container'),
    nextBtn: document.getElementById('next-btn'),
    currentNum: document.getElementById('current-num'),
    totalNum: document.getElementById('total-num'),
    progress: document.getElementById('progress-bar'),
    modeBadge: document.getElementById('mode-badge'),
    dbStatus: document.getElementById('db-status')
};

// --- Initialization ---
window.addEventListener('DOMContentLoaded', async () => {
    try {
        const res = await fetch('questions.json');
        if (!res.ok) throw new Error("Failed to load");
        fullData = await res.json();
        els.dbStatus.textContent = `ডেটাবেসে মোট ${convertToBangla(fullData.length)} টি প্রশ্ন আছে`;
    } catch (err) {
        console.error(err);
        els.dbStatus.textContent = "প্রশ্ন লোড করতে সমস্যা হয়েছে।";
        alert("Error: Run this on a Local Server to load JSON.");
    }
});

// --- UI Functions ---
function setLimit(num, btn) {
    selectedLimit = num;
    // Update UI classes
    document.querySelectorAll('.limit-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
}

function convertToBangla(num) {
    const bn = ['০','১','২','৩','৪','৫','৬','৭','৮','৯'];
    return num.toString().split('').map(c => bn[c] || c).join('');
}

function shuffle(array) {
    return array.sort(() => Math.random() - 0.5);
}

// --- Quiz Logic ---
function initiateQuiz() {
    if (!fullData.length) return alert("Please wait for data to load.");

    // 1. Get Mode
    const modeInput = document.querySelector('input[name="quiz_mode"]:checked');
    currentMode = modeInput ? modeInput.value : 'practice';

    // 2. Prepare Data
    const shuffled = shuffle([...fullData]);
    activeQuestions = selectedLimit === -1 ? shuffled : shuffled.slice(0, selectedLimit);
    
    // 3. Reset State
    currentIndex = 0;
    score = 0;
    userAnswers = new Array(activeQuestions.length).fill(null);

    // 4. Setup UI
    screens.start.classList.add('hidden');
    screens.quiz.classList.remove('hidden');
    screens.quiz.classList.add('opacity-100', 'flex'); // Ensure flex display
    els.headerBar.classList.remove('hidden');
    
    // Setup Badge
    if(currentMode === 'practice') {
        els.modeBadge.textContent = "PRACTICE";
        els.modeBadge.className = "text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wide bg-sky-100 text-sky-600";
    } else {
        els.modeBadge.textContent = "TEST MODE";
        els.modeBadge.className = "text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wide bg-purple-100 text-purple-600";
    }

    loadQuestion();
}

function loadQuestion() {
    const data = activeQuestions[currentIndex];
    
    // Update Headers
    els.currentNum.textContent = currentIndex + 1;
    els.totalNum.textContent = activeQuestions.length;
    els.progress.style.width = `${((currentIndex) / activeQuestions.length) * 100}%`;
    
    // Render Question
    els.question.textContent = data.question;
    els.options.innerHTML = '';

    // Render Options
    data.options.forEach((opt, idx) => {
        const btn = document.createElement('div');
        btn.className = `option-card w-full p-4 bg-white rounded-xl border border-slate-200 text-slate-700 cursor-pointer flex items-center gap-3 text-left mb-3 shadow-sm`;
        
        btn.innerHTML = `
            <div class="icon-box w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-xs font-bold shrink-0 border border-slate-200 transition-colors">
                ${String.fromCharCode(65 + idx)}
            </div>
            <span class="text-sm font-medium leading-snug select-none">${opt}</span>
        `;
        
        btn.onclick = () => handleOptionClick(opt, btn);
        els.options.appendChild(btn);
    });

    // Reset Next Button
    els.nextBtn.disabled = true;
    els.nextBtn.className = "w-full bg-slate-200 text-slate-400 font-bold py-3.5 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 cursor-not-allowed";
    els.nextBtn.innerHTML = currentIndex === activeQuestions.length - 1 
        ? 'ফলাফল দেখুন <i class="fa-solid fa-flag-checkered ml-2"></i>' 
        : 'পরবর্তী <i class="fa-solid fa-arrow-right ml-2"></i>';

    // Animation
    els.question.classList.add('fade-in');
    els.options.classList.add('slide-up');
    setTimeout(() => {
        els.question.classList.remove('fade-in');
        els.options.classList.remove('slide-up');
    }, 400);
}

function handleOptionClick(selectedOpt, btn) {
    // Prevent re-clicking if already answered (Practice) or just update selection (Test)
    // However, simplest logic: Test mode allows changing until 'Next', Practice mode locks immediately.
    
    const currentQ = activeQuestions[currentIndex];
    
    if (currentMode === 'practice') {
        // Logic: Lock immediately, Show Answer
        if (els.options.classList.contains('locked')) return; // Prevent multi-clicks
        els.options.classList.add('locked');

        const isCorrect = selectedOpt === currentQ.answer;
        if (isCorrect) score++;

        // UI Updates
        Array.from(els.options.children).forEach(child => {
            child.classList.add('disabled'); // Disable all
            const optText = child.querySelector('span').innerText;
            
            if (optText === currentQ.answer) {
                child.classList.add('correct-ui'); // Always highlight correct
            }
            if (optText === selectedOpt && !isCorrect) {
                child.classList.add('wrong-ui'); // Highlight wrong selected
            }
        });
    } 
    else {
        // Logic: Test Mode - Just Highlight selection, don't show answer
        Array.from(els.options.children).forEach(child => {
            child.classList.remove('selected-test');
            child.querySelector('.icon-box').className = "icon-box w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-xs font-bold shrink-0 border border-slate-200 transition-colors";
        });
        
        btn.classList.add('selected-test');
        // Do not update score here, calculate at end
    }

    // Save Answer
    userAnswers[currentIndex] = { selected: selectedOpt, correct: currentQ.answer };

    // Enable Next
    els.nextBtn.disabled = false;
    els.nextBtn.className = currentMode === 'practice'
        ? "w-full bg-sky-600 hover:bg-sky-700 text-white font-bold py-3.5 rounded-xl shadow-md shadow-sky-200 transition-all duration-200 flex items-center justify-center gap-2 transform active:scale-[0.98]"
        : "w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-3.5 rounded-xl shadow-md transition-all duration-200 flex items-center justify-center gap-2 transform active:scale-[0.98]";
}

function nextQuestion() {
    els.options.classList.remove('locked'); // Reset lock
    currentIndex++;
    
    if (currentIndex < activeQuestions.length) {
        loadQuestion();
    } else {
        finishQuiz();
    }
}

function finishQuiz() {
    // Calculate Test Mode Score
    if (currentMode === 'test') {
        score = 0;
        userAnswers.forEach(ans => {
            if (ans && ans.selected === ans.correct) score++;
        });
    }

    screens.quiz.classList.add('hidden');
    screens.quiz.classList.remove('flex');
    els.headerBar.classList.add('hidden');
    screens.result.classList.remove('hidden');
    screens.result.classList.add('flex');

    // Update Stats
    const percent = Math.round((score / activeQuestions.length) * 100);
    document.getElementById('r-score').textContent = `${percent}%`;
    document.getElementById('r-correct').textContent = score;
    document.getElementById('r-wrong').textContent = activeQuestions.length - score;

    // Generate Review
    const container = document.getElementById('review-container');
    container.innerHTML = '';

    activeQuestions.forEach((q, i) => {
        const ans = userAnswers[i];
        const userSel = ans ? ans.selected : null;
        const isRight = userSel === q.answer;
        
        const item = document.createElement('div');
        item.className = "bg-slate-50 p-4 rounded-lg border border-slate-100 text-sm";
        
        item.innerHTML = `
            <div class="flex gap-3 mb-2">
                <span class="font-bold text-slate-400 text-xs pt-0.5">Q${i+1}</span>
                <p class="font-semibold text-slate-800 leading-tight flex-1">${q.question}</p>
                <i class="fa-solid ${isRight ? 'fa-check text-green-500' : 'fa-xmark text-red-500'} text-lg"></i>
            </div>
            <div class="pl-7 space-y-1">
                ${!isRight ? `<div class="text-red-600 text-xs font-medium"><span class="opacity-60">You:</span> ${userSel || 'Skipped'}</div>` : ''}
                <div class="text-green-600 text-xs font-medium"><span class="opacity-60">Correct:</span> ${q.answer}</div>
            </div>
        `;
        container.appendChild(item);
    });
}