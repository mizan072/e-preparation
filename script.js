// --- 1. GLOBAL STATE & CONSTANTS ---
const WORDS_PER_CHUNK = 10;
const SAVE_KEY_WORDS_GRE = 'eprepGreWords';
const SAVE_KEY_WORDS_PREVIOUS = 'eprepPreviousWords';
const SAVE_KEY_WORDS_RECENTGK = 'eprepRecentGkWords';
const DARK_MODE_KEY = 'eprepDarkMode';
const STUDY_HISTORY_KEY = 'eprepStudyHistory';

let vocabData = {
    gre: { list: [], words: [] },
    previous: { list: [], words: [] },
    recentgk: { list: [], words: [] }
};

let currentCategory = 'gre'; 
let wordsInCurrentChunk = [];
let currentQuizQuestionIndex = 0;
let quizScores = { correct: 0, incorrect: 0 };
let missedWords = [];
let isAnswered = false;
let isTestMode = false;
let selectedTestAnswer = null;
let masteryChart = null;

// --- 2. DOM ELEMENTS ---
const htmlElement = document.documentElement;
const sections = {
    welcome: document.getElementById('welcome-section'),
    learn: document.getElementById('learn-section'),
    test: document.getElementById('test-section'),
    results: document.getElementById('results-section'),
    dictionary: document.getElementById('dictionary-section'),
    stats: document.getElementById('stats-section'),
    about: document.getElementById('about-section'),
    recentgk: document.getElementById('recentgk-section')
};

// Header & Nav
const mainMenuButton = document.getElementById('main-menu-button');
const dictionaryButton = document.getElementById('dictionary-button');
const statsButton = document.getElementById('stats-button');
const aboutButton = document.getElementById('about-button');
const darkModeToggle = document.getElementById('dark-mode-toggle');
const darkIconMoon = document.getElementById('dark-icon-moon');
const darkIconSun = document.getElementById('dark-icon-sun');

// Mobile Nav
const mobileMenuButton = document.getElementById('mobile-menu-button');
const mobileMenu = document.getElementById('mobile-menu');
const mobileMainMenuButton = document.getElementById('mobile-main-menu-button');
const mobileDictionaryButton = document.getElementById('mobile-dictionary-button');
const mobileStatsButton = document.getElementById('mobile-stats-button');
const mobileAboutButton = document.getElementById('mobile-about-button');

// Welcome
const categoryContainer = document.getElementById('category-container');
const resetProgressButton = document.getElementById('reset-progress-button');

// Learn
const learnHeader = document.getElementById('learn-header');
const learnContainer = document.getElementById('learn-container');
const startTestButton = document.getElementById('start-test-button');

// Test
const quizProgressText = document.getElementById('quiz-progress-text');
const quizProgressBar = document.getElementById('quiz-progress-bar');
const quizQuestion = document.getElementById('quiz-question');
const quizQuestionBengali = document.getElementById('quiz-question-bengali');
const quizOptionsContainer = document.getElementById('quiz-options-container');
const feedbackContainer = document.getElementById('quiz-feedback-container');
const feedbackText = document.getElementById('quiz-feedback-text');
const feedbackCorrectAnswer = document.getElementById('quiz-feedback-correct-answer');
const nextQuestionButton = document.getElementById('next-question-button');
const feedbackIcon = document.getElementById('feedback-icon');

// Results
const resultsHeader = document.getElementById('results-header');
const finalScoreText = document.getElementById('final-score-text');
const finalPercentageText = document.getElementById('final-percentage-text');
const wordsToReviewContainer = document.getElementById('words-to-review-container');
const wordsToReviewList = document.getElementById('words-to-review-list');
const continueButton = document.getElementById('continue-button');

// Dictionary
const searchBar = document.getElementById('search-bar');
const dictionaryListContainer = document.getElementById('dictionary-list-container');


// --- 3. CORE FUNCTIONS ---

function debounce(func, delay) {
    let timeout;
    return function(...args) {
        const context = this;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), delay);
    };
}

function showSection(sectionName) {
    Object.values(sections).forEach(section => {
        section.classList.remove('active');
    });
    if (sections[sectionName]) {
        sections[sectionName].classList.add('active');
        window.scrollTo(0, 0);
    }
    mobileMenu.classList.add('hidden');
    
    // Update nav active state
    document.querySelectorAll('.nav-item').forEach(btn => btn.classList.remove('active'));
    if(sectionName === 'welcome' || sectionName === 'recentgk' || sectionName === 'learn') mainMenuButton.classList.add('active');
    if(sectionName === 'dictionary') dictionaryButton.classList.add('active');
    if(sectionName === 'stats') statsButton.classList.add('active');
    if(sectionName === 'about') aboutButton.classList.add('active');
}

function speakWord(word) {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(word);
        utterance.lang = 'en-US';
        utterance.rate = 0.9;
        window.speechSynthesis.speak(utterance);
    }
}

function loadWelcome() {
    categoryContainer.innerHTML = ''; 
    
    const categories = [
        { id: 'gre', title: 'GRE 333', description: 'The essential 333 high-frequency words for the GRE.', bn_description: 'চাকরির পরীক্ষার জন্য অপরিহার্য ৩৩৩টি হাই-ফ্রিকোয়েন্সি ইংরেজি শব্দ।', icon: 'graduation-cap', color: 'text-blue-500' },
        { id: 'previous', title: 'Previous Questions', description: 'Bank & BCS vocabulary from last 15 years.', bn_description: 'বিগত ১৫ বছরের ব্যাংক ও বিসিএস পরীক্ষার প্রশ্ন।', icon: 'history', color: 'text-purple-500' },
        { id: 'recentgk', title: 'Recent GK', description: 'Daily general knowledge updates from newspapers.', bn_description: 'সাম্প্রতিক সাধারণ জ্ঞানের নিয়মিত আপডেট।', icon: 'globe-2', color: 'text-sky-500' }
    ];

    categories.forEach(cat => {
        const catData = vocabData[cat.id];
        const masteredCount = catData.words ? catData.words.filter(w => w.strength >= 10).length : 0;
        const totalCount = catData.list.length;
        const percentage = totalCount > 0 ? Math.round((masteredCount / totalCount) * 100) : 0;

        const card = document.createElement('div');
        card.className = "group bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500 transition-all duration-300 cursor-pointer relative overflow-hidden";
        card.innerHTML = `
            <div class="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-indigo-500 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div class="flex items-center mb-4">
                <div class="p-3 rounded-xl bg-slate-50 dark:bg-slate-700 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-900/20 transition-colors">
                    <i data-lucide="${cat.icon}" class="w-8 h-8 ${cat.color}"></i>
                </div>
                <h3 class="ml-4 text-xl font-bold text-slate-900 dark:text-white">${cat.title}</h3>
            </div>
            <p class="text-slate-600 dark:text-slate-400 text-sm mb-2">${cat.description}</p>
            <p class="lang-bn text-slate-500 dark:text-slate-500 text-sm mb-5">${cat.bn_description}</p>
            
            <div class="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">
                <span>Progress</span>
                <span>${percentage}%</span>
            </div>
            <div class="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2">
                <div class="bg-indigo-600 h-2 rounded-full transition-all duration-1000" style="width: ${percentage}%"></div>
            </div>
        `;
        
        card.addEventListener('click', () => {
            currentCategory = cat.id;
            if (cat.id === 'recentgk') {
                document.getElementById('recentgk-total-questions').textContent = `${totalCount} Questions Available`;
                showSection('recentgk');
            } else {
                const nextChunkIndex = Math.floor(masteredCount / WORDS_PER_CHUNK);
                if (nextChunkIndex * WORDS_PER_CHUNK >= totalCount && totalCount > 0) {
                    alert("Congratulations! You have studied all words in this category.");
                    return;
                }
                loadLearnSection(nextChunkIndex);
            }
        });

        categoryContainer.appendChild(card);
    });
    
    lucide.createIcons();
    showSection('welcome');
}

function resetQuizState() {
    isAnswered = false;
    selectedTestAnswer = null;
    feedbackContainer.style.display = 'none';
    quizOptionsContainer.innerHTML = '';
    quizQuestion.textContent = '';
    quizQuestionBengali.textContent = '';
    
    nextQuestionButton.innerHTML = isTestMode ? 'Next Question' : 'Next';
    nextQuestionButton.disabled = false;
    nextQuestionButton.classList.remove('opacity-50', 'cursor-not-allowed');
    
    if (isTestMode) {
        nextQuestionButton.disabled = true; 
        nextQuestionButton.classList.add('opacity-50', 'cursor-not-allowed');
    } else {
        nextQuestionButton.innerHTML = 'Next';
        nextQuestionButton.disabled = true; // In practice mode, disable until answered
        nextQuestionButton.classList.add('opacity-50', 'cursor-not-allowed');
    }
}

function loadLearnSection(chunkIndex) {
    const catData = vocabData[currentCategory];
    const start = chunkIndex * WORDS_PER_CHUNK;
    const end = Math.min(start + WORDS_PER_CHUNK, catData.list.length);
    wordsInCurrentChunk = catData.list.slice(start, end);
    
    catData.currentChunkIndex = chunkIndex;

    learnHeader.textContent = `Set ${chunkIndex + 1} (${start + 1}-${end})`;
    learnContainer.innerHTML = ''; 

    wordsInCurrentChunk.forEach((word, index) => {
        const card = document.createElement('div');
        card.className = "bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-md border border-slate-100 dark:border-slate-700 flex flex-col gap-2";
        card.style.animation = `fadeIn 0.3s ease-out ${index * 50}ms forwards`;
        card.style.opacity = 0;

        const synonymHTML = word.english ? `<p class="text-lg text-slate-500 dark:text-slate-400 font-medium">${word.english}</p>` : '';

        card.innerHTML = `
            <div class="flex justify-between items-start">
                <h4 class="text-2xl font-bold text-indigo-600 dark:text-indigo-400">${word.word}</h4>
                <button class="speak-button p-2 rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors" data-word="${word.word}">
                    <i data-lucide="volume-2" class="w-5 h-5"></i>
                </button>
            </div>
            <p class="lang-bn text-xl text-slate-800 dark:text-slate-200 font-medium">${word.bengali}</p>
            ${synonymHTML}
        `;
        learnContainer.appendChild(card);
    });

    lucide.createIcons();
    showSection('learn');
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

function startTest() {
    if (wordsInCurrentChunk.length === 0) return;
    if (!isTestMode) {
        shuffleArray(wordsInCurrentChunk);
    }
    currentQuizQuestionIndex = 0;
    quizScores = { correct: 0, incorrect: 0 };
    missedWords = [];
    
    updateQuizStats();
    loadQuestion();
    showSection('test');
}

function loadQuestion() {
    if (currentQuizQuestionIndex >= wordsInCurrentChunk.length) {
        showQuizComplete();
        return;
    }
    resetQuizState();

    if (isTestMode) {
        if (currentQuizQuestionIndex === wordsInCurrentChunk.length - 1) {
            nextQuestionButton.innerHTML = 'Finish Exam';
        }
    }
    
    const currentItem = wordsInCurrentChunk[currentQuizQuestionIndex];

    const card = document.querySelector('#test-section .bg-white');
    card.classList.remove('question-slide-in');
    void card.offsetWidth; 
    card.classList.add('question-slide-in');

    if (currentCategory === 'recentgk') {
        quizQuestion.textContent = '';
        quizQuestionBengali.textContent = currentItem.question;
        const options = [...currentItem.options]; 
        shuffleArray(options);
        options.forEach(option => {
            createOptionButton(option, option === currentItem.answer);
        });
        updateQuizStats();
        return;
    }

    // Vocab Logic
    const currentWord = currentItem;
    const hasSynonym = currentWord.english && currentWord.english.trim() !== '';
    const quizType = !hasSynonym
        ? (Math.random() > 0.5 ? 'word-to-bengali' : 'bengali-to-word')
        : (Math.random() > 0.5 ? 'word-to-def' : 'def-to-word');

    let question = '', correctAnswer = '', optionSourceKey = '';
    let questionIsBengali = false;
    let options = [currentWord];

    switch (quizType) {
        case 'word-to-bengali':
            question = currentWord.word;
            correctAnswer = currentWord.bengali;
            optionSourceKey = 'bengali';
            break;
        case 'bengali-to-word':
            question = currentWord.bengali;
            questionIsBengali = true;
            correctAnswer = currentWord.word;
            optionSourceKey = 'word';
            break;
        case 'word-to-def':
            question = currentWord.word;
            correctAnswer = currentWord.english;
            optionSourceKey = 'english';
            break;
        case 'def-to-word':
            question = currentWord.english;
            correctAnswer = currentWord.word;
            optionSourceKey = 'word';
            break;
    }

    let fullWordListForOptions = wordsInCurrentChunk.length > 4 ? wordsInCurrentChunk : vocabData[currentCategory].list;
    while (options.length < 4) {
        const randomWord = fullWordListForOptions[Math.floor(Math.random() * fullWordListForOptions.length)];
        if (randomWord.id !== currentWord.id && randomWord[optionSourceKey] && !options.some(opt => opt[optionSourceKey] === randomWord[optionSourceKey])) {
            options.push(randomWord);
        }
    }

    shuffleArray(options);
    
    if (questionIsBengali) {
        quizQuestionBengali.textContent = question;
    } else {
        quizQuestion.textContent = question;
    }
    
    options.forEach(option => createOptionButton(option[optionSourceKey], option[optionSourceKey] === correctAnswer));
    updateQuizStats();
}

function createOptionButton(text, isCorrect) {
    const button = document.createElement('button');
    button.dataset.correct = isCorrect;
    button.innerHTML = `
        <div class="flex items-center">
            <div class="w-6 h-6 rounded-full border-2 border-slate-300 dark:border-slate-500 mr-3 flex-shrink-0 flex items-center justify-center check-circle transition-colors"></div>
            <span class="text-lg">${text}</span>
        </div>`;
    button.className = "option-card";
    button.addEventListener('click', () => {
        if (isTestMode) {
            handleTestSelection(button);
        } else {
            checkAnswer(button);
        }
    });
    quizOptionsContainer.appendChild(button);
}

function handleTestSelection(selectedButton) {
    if (isAnswered) return; // Don't allow changing answer after locking in
    
    const allButtons = quizOptionsContainer.querySelectorAll('.option-card');
    allButtons.forEach(btn => {
        btn.classList.remove('selected-test');
        btn.querySelector('.check-circle').innerHTML = '';
        btn.querySelector('.check-circle').classList.remove('bg-indigo-600', 'border-indigo-600');
    });
    
    selectedButton.classList.add('selected-test');
    const circle = selectedButton.querySelector('.check-circle');
    circle.classList.add('bg-indigo-600', 'border-indigo-600');
    circle.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;

    selectedTestAnswer = selectedButton;
    nextQuestionButton.disabled = false;
    nextQuestionButton.classList.remove('opacity-50', 'cursor-not-allowed');
}

function checkAnswer(selectedButton) {
    if (isAnswered) return;
    isAnswered = true;

    // Enable the "Next" button for practice mode
    nextQuestionButton.disabled = false;
    nextQuestionButton.classList.remove('opacity-50', 'cursor-not-allowed');

    const isCorrect = selectedButton.dataset.correct === 'true';
    const allButtons = quizOptionsContainer.querySelectorAll('.option-card');
    const currentWord = wordsInCurrentChunk[currentQuizQuestionIndex];
    const wordInMasterList = vocabData[currentCategory].words.find(w => w.id === currentWord.id);

    // This block is ONLY for Practice Mode feedback
    allButtons.forEach(button => {
        button.classList.add('disabled');
        if (button.dataset.correct === 'true') {
            button.classList.add('correct-ui');
            button.querySelector('.check-circle').classList.add('bg-green-500', 'border-green-500');
            button.querySelector('.check-circle').innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
        }
    });

    if (isCorrect) {
        quizScores.correct++;
        feedbackText.textContent = "Correct!";
        feedbackText.className = "text-2xl font-bold text-green-600 dark:text-green-400";
        feedbackIcon.innerHTML = `<i data-lucide="check-circle-2" class="w-8 h-8 text-green-500"></i>`;
        feedbackCorrectAnswer.textContent = '';
        if (wordInMasterList) {
            wordInMasterList.strength = Math.min(12, wordInMasterList.strength + 1);
            wordInMasterList.lastReviewed = new Date().toISOString();
        }
    } else {
        quizScores.incorrect++;
        missedWords.push(currentWord);
        
        selectedButton.classList.add('wrong-ui');
        selectedButton.querySelector('.check-circle').classList.add('bg-red-500', 'border-red-500');
        selectedButton.querySelector('.check-circle').innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;

        feedbackText.textContent = "Incorrect";
        feedbackText.className = "text-2xl font-bold text-red-600 dark:text-red-400";
        feedbackIcon.innerHTML = `<i data-lucide="x-circle" class="w-8 h-8 text-red-500"></i>`;
        
        let correctAnswerText;
        if (currentCategory === 'recentgk') {
            correctAnswerText = currentWord.answer;
        } else {
            correctAnswerText = currentWord.english 
                ? `${currentWord.word} (${currentWord.english})` 
                : `${currentWord.word} (${currentWord.bengali})`;
        }
        feedbackCorrectAnswer.textContent = `Correct answer: ${correctAnswerText}`;

        if (wordInMasterList) {
            wordInMasterList.strength = Math.max(0, wordInMasterList.strength - 2);
            wordInMasterList.missedCount = (wordInMasterList.missedCount || 0) + 1;
        }
    }

    // This is practice mode, so we increment index here
    currentQuizQuestionIndex++;
    feedbackContainer.style.display = 'block';
    lucide.createIcons();
    updateQuizStats();
}

/**
 * --- TEST MODE FIX ---
 * This function is called ONLY in Test Mode.
 * It silently records the answer and moves on.
 */
function recordTestAnswerAndAdvance() {
    if (!selectedTestAnswer) return; // Should be impossible due to disabled button, but safe.

    const isCorrect = selectedTestAnswer.dataset.correct === 'true';
    const currentWord = wordsInCurrentChunk[currentQuizQuestionIndex];
    const wordInMasterList = vocabData[currentCategory].words.find(w => w.id === currentWord.id);
    
    if (isCorrect) {
        quizScores.correct++;
        if (wordInMasterList) {
            wordInMasterList.strength = Math.min(12, wordInMasterList.strength + 1);
        }
    } else {
        quizScores.incorrect++;
        missedWords.push(currentWord);
        if (wordInMasterList) {
            wordInMasterList.strength = Math.max(0, wordInMasterList.strength - 1);
            wordInMasterList.missedCount = (wordInMasterList.missedCount || 0) + 1;
        }
    }

    // Advance immediately
    currentQuizQuestionIndex++;
    selectedTestAnswer = null; // Reset selection
    updateQuizStats(); // Update progress bar
    loadQuestion(); // Load next question
}

function updateQuizStats() {
    const total = wordsInCurrentChunk.length;
    const progress = currentQuizQuestionIndex;
    quizProgressText.textContent = `Question ${Math.min(progress + 1, total)}/${total}`;
    quizProgressBar.style.width = `${((progress + 1) / total) * 100}%`; // Use progress + 1 for 1-based index
}

function showQuizComplete() {
    const total = wordsInCurrentChunk.length;
    const correct = quizScores.correct;
    const percentage = total > 0 ? Math.round((correct / total) * 100) : 0;

    saveProgress();

    // Update study streak
    const today = new Date().toISOString().split('T')[0];
    let studyHistory = JSON.parse(localStorage.getItem(STUDY_HISTORY_KEY) || '[]');
    if (!studyHistory.includes(today)) {
        studyHistory.push(today);
        localStorage.setItem(STUDY_HISTORY_KEY, JSON.stringify(studyHistory));
    }

    resultsHeader.textContent = isTestMode ? 'Exam Results' : 'Practice Complete';
    finalScoreText.textContent = `${correct}/${total}`;
    finalPercentageText.textContent = `${percentage}% Score`;

    if (percentage >= 80) finalScoreText.className = "text-5xl font-black text-green-600 dark:text-green-400";
    else if (percentage >= 50) finalScoreText.className = "text-5xl font-black text-amber-500 dark:text-amber-400";
    else finalScoreText.className = "text-5xl font-black text-red-600 dark:text-red-400";

    if (missedWords.length > 0) {
        wordsToReviewList.innerHTML = missedWords.map(item => {
            if (currentCategory === 'recentgk') {
                return `
                <div class="bg-white dark:bg-slate-900/50 p-4 rounded-xl border-l-4 border-red-500 shadow-sm">
                    <h4 class="font-bold text-slate-800 dark:text-slate-200 mb-2 text-base lang-bn">${item.question}</h4>
                    <div class="flex items-center text-sm">
                        <span class="px-2 py-1 rounded bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 font-bold mr-2">Correct:</span>
                        <span class="text-slate-700 dark:text-slate-300 font-medium">${item.answer}</span>
                    </div>
                </div>`;
            } else {
                return `
                <div class="bg-white dark:bg-slate-900/50 p-4 rounded-xl border-l-4 border-red-500 shadow-sm">
                    <div class="flex justify-between items-center mb-2">
                        <h4 class="font-bold text-indigo-600 dark:text-indigo-400 text-lg">${item.word}</h4>
                    </div>
                    <p class="lang-bn text-slate-700 dark:text-slate-300 mb-1">${item.bengali}</p>
                    ${item.english ? `<p class="text-sm text-slate-500 italic">${item.english}</p>` : ''}
                </div>`;
            }
        }).join('');
        wordsToReviewContainer.style.display = 'block';
    } else {
        wordsToReviewContainer.style.display = 'block';
        wordsToReviewList.innerHTML = `<div class="text-center p-6 text-slate-500"><i data-lucide="check-circle" class="w-12 h-12 mx-auto text-green-500 mb-2"></i><p>Perfect score! Nothing to review.</p></div>`;
    }
    
    continueButton.onclick = loadWelcome;
    lucide.createIcons();
    showSection('results');
}


// --- 4. DATA & PROGRESS MANAGEMENT ---
function getSaveKey(category) {
    if (category === 'gre') return SAVE_KEY_WORDS_GRE;
    if (category === 'previous') return SAVE_KEY_WORDS_PREVIOUS;
    if (category === 'recentgk') return SAVE_KEY_WORDS_RECENTGK;
    return null;
}

function loadProgress() {
    Object.keys(vocabData).forEach(cat => {
        const savedWords = localStorage.getItem(getSaveKey(cat));
        if (savedWords) {
            vocabData[cat].words = JSON.parse(savedWords);
            if (vocabData[cat].words.length !== vocabData[cat].list.length) {
                initializeWords(cat, true); 
            }
        } else {
            initializeWords(cat, false);
        }
    });
    // This will be called again by the DOM listener, but good to have
}

function initializeWords(category, merge = false) {
    const catData = vocabData[category];
    const existingWords = merge ? new Map(catData.words.map(w => [w.id, w])) : new Map();

    catData.words = catData.list.map(v => {
        const existing = existingWords.get(v.id);
        if (existing) return { ...v, ...existing, ...v };
        return { id: v.id, strength: 0, lastReviewed: null, missedCount: 0, ...v };
    });
    saveProgress(category);
}

function saveProgress(category = null) {
    if (category && getSaveKey(category)) {
        localStorage.setItem(getSaveKey(category), JSON.stringify(vocabData[category].words));
    } else if (!category) {
        Object.keys(vocabData).forEach(cat => {
            if (getSaveKey(cat)) localStorage.setItem(getSaveKey(cat), JSON.stringify(vocabData[cat].words));
        });
    }
}

function resetProgress() {
    if(confirm("Are you sure? This will wipe all study history.")) {
        Object.keys(vocabData).forEach(cat => {
            if (getSaveKey(cat)) localStorage.removeItem(getSaveKey(cat));
            initializeWords(cat, false);
        });
        localStorage.removeItem(STUDY_HISTORY_KEY);
        loadWelcome();
    }
}

// --- 5. UI HELPERS ---

function loadDictionary() {
    const allVocab = [...vocabData.gre.list, ...vocabData.previous.list];
    allVocab.sort((a, b) => a.word.localeCompare(b.word));

    dictionaryListContainer.innerHTML = allVocab.map(word => {
        const searchData = `${word.word.toLowerCase()} ${word.bengali} ${word.english ? word.english.toLowerCase() : ''}`;
        return `
        <div class="dictionary-word-card bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700" data-word="${searchData}">
            <div class="flex justify-between items-center mb-1">
                <h4 class="text-xl font-bold text-indigo-600 dark:text-indigo-400">${word.word}</h4>
                <button class="speak-button p-2 rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700" data-word="${word.word}">
                    <i data-lucide="volume-2" class="w-5 h-5"></i>
                </button>
            </div>
            <p class="lang-bn text-lg text-slate-800 dark:text-slate-200 mb-1">${word.bengali}</p>
            ${word.english ? `<p class="text-slate-600 dark:text-slate-400">${word.english}</p>` : ''}
        </div>`;
    }).join('');
    lucide.createIcons();
}

function filterDictionary() {
    const searchTerm = searchBar.value.toLowerCase();
    const allWords = dictionaryListContainer.querySelectorAll('.dictionary-word-card');
    allWords.forEach(card => {
        card.style.display = card.dataset.word.includes(searchTerm) ? 'block' : 'none';
    });
}

function toggleDarkMode() {
    htmlElement.classList.toggle('dark');
    const isDarkMode = htmlElement.classList.contains('dark');
    localStorage.setItem(DARK_MODE_KEY, isDarkMode);
    updateDarkModeIcons(isDarkMode);
    if (sections.stats.classList.contains('active')) renderMasteryChart();
}

function updateDarkModeIcons(isDarkMode) {
    darkIconMoon.classList.toggle('hidden', isDarkMode);
    darkIconSun.classList.toggle('hidden', !isDarkMode);
}

function loadDarkModeState() {
    const isDarkMode = localStorage.getItem(DARK_MODE_KEY) === 'true';
    if (isDarkMode) htmlElement.classList.add('dark');
    updateDarkModeIcons(isDarkMode);
}

// --- 6. STATS ---
function loadStatsPage() {
    showSection('stats');
    renderMasteryChart();
    renderDifficultWords();
    renderStudyStreak();
    renderCalendar();
}

function renderMasteryChart() {
    const allWords = [...vocabData.gre.words, ...vocabData.previous.words];
    if (!allWords.length) return;

    const mastered = allWords.filter(w => w.strength >= 10).length;
    const learning = allWords.filter(w => w.strength > 0 && w.strength < 10).length;
    const notSeen = allWords.length - mastered - learning;

    const ctx = document.getElementById('mastery-chart').getContext('2d');
    if (masteryChart) masteryChart.destroy();

    const chartData = {
        labels: [`Mastered (${mastered})`, `Learning (${learning})`, `New (${notSeen})`],
        datasets: [{
            data: [mastered, learning, notSeen],
            backgroundColor: ['#10b981', '#f59e0b', '#cbd5e1'],
            borderColor: htmlElement.classList.contains('dark') ? '#1e293b' : '#ffffff',
            borderWidth: 4,
            hoverOffset: 4
        }]
    };

    masteryChart = new Chart(ctx, {
        type: 'doughnut',
        data: chartData,
        options: {
            cutout: '70%',
            responsive: true,
            plugins: { 
                legend: { 
                    position: 'bottom', 
                    labels: { 
                        usePointStyle: true, 
                        padding: 20,
                        color: htmlElement.classList.contains('dark') ? '#94a3b8' : '#334155',
                        font: { family: 'Inter', weight: '500' }
                    } 
                },
                tooltip: {
                    bodyFont: { family: 'Inter' },
                    titleFont: { family: 'Inter' },
                }
            }
        }
    });
}

function renderDifficultWords() {
    const list = document.getElementById('difficult-words-list');
    const allWords = [...vocabData.gre.words, ...vocabData.previous.words];
    const sorted = allWords.filter(w => w.missedCount > 0).sort((a, b) => b.missedCount - a.missedCount).slice(0, 10);
    
    if(sorted.length === 0) {
        list.innerHTML = `<p class="text-slate-400 text-center text-sm italic">Great job! No words to review.</p>`;
        document.getElementById('create-test-button').style.display = 'none';
        return;
    }
    document.getElementById('create-test-button').style.display = 'block';
    list.innerHTML = sorted.map(w => `
        <div class="flex justify-between items-center text-sm border-b border-slate-100 dark:border-slate-700 pb-2.5 mb-2.5">
            <span class="font-semibold text-slate-700 dark:text-slate-300">${w.word}</span>
            <span class="text-red-500 font-bold bg-red-50 dark:bg-red-900/20 px-2 py-0.5 rounded">${w.missedCount} misses</span>
        </div>
    `).join('');
}

function createDifficultWordsTest() {
    const allWords = [...vocabData.gre.words, ...vocabData.previous.words];
    const difficultWords = allWords.filter(w => w.missedCount > 0).sort((a, b) => b.missedCount - a.missedCount).slice(0, 20);
    if (difficultWords.length > 0) {
        wordsInCurrentChunk = difficultWords;
        currentCategory = 'special';
        isTestMode = false; 
        startTest();
    }
}

function calculateStudyStreak() {
    const studyHistory = JSON.parse(localStorage.getItem(STUDY_HISTORY_KEY) || '[]');
    if (studyHistory.length === 0) return 0;
    studyHistory.sort((a, b) => new Date(b) - new Date(a));

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const lastStudyDay = new Date(studyHistory[0]);

    const diffDays = (today.getTime() - lastStudyDay.getTime()) / (1000 * 3600 * 24);
    
    if (diffDays > 1.5) return 0;
    
    let streak = 0;
    let currentDay = today;
    
    if (studyHistory[0] !== todayStr) {
        currentDay.setDate(today.getDate() - 1);
    }
    
    for (const dateStr of studyHistory) {
        const expectedDateStr = currentDay.toISOString().split('T')[0];
        if (dateStr === expectedDateStr) {
            streak++;
            currentDay.setDate(currentDay.getDate() - 1);
        } else if (new Date(dateStr) < new Date(expectedDateStr)) {
            break;
        }
    }
    return streak;
}

function renderStudyStreak() {
    const streak = calculateStudyStreak();
    document.getElementById('streak-display').innerHTML = `<span class="text-6xl font-extrabold text-slate-800 dark:text-white">${streak}</span> <span class="text-lg text-slate-500 font-medium ml-1">days</span>`;
}

function renderCalendar() {
    const container = document.getElementById('calendar-container');
    const studyHistory = new Set(JSON.parse(localStorage.getItem(STUDY_HISTORY_KEY) || '[]'));
    const today = new Date();
    const month = today.getMonth();
    const year = today.getFullYear();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const startDayOfWeek = new Date(year, month, 1).getDay();

    const weekdays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    let html = `<div class="grid grid-cols-7 gap-1 text-center text-xs text-slate-500 dark:text-slate-400 font-bold">${weekdays.map(d => `<div>${d}</div>`).join('')}</div>`;
    html += `<div class="grid grid-cols-7 gap-1 text-center text-sm text-slate-700 dark:text-slate-300 mt-3">`;
    html += Array(startDayOfWeek).fill('<div></div>').join('');
    for (let i = 1; i <= daysInMonth; i++) {
        const dateStr = new Date(year, month, i).toISOString().split('T')[0];
        let classes = 'w-8 h-8 rounded-full flex items-center justify-center mx-auto ';
        if (i === today.getDate()) classes += 'bg-indigo-600 text-white font-bold ';
        else if (studyHistory.has(dateStr)) classes += 'bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-200 font-medium';
        else classes += 'bg-slate-100 dark:bg-slate-700/50 text-slate-400 dark:text-slate-500';
        html += `<div><span class="${classes}">${i}</span></div>`;
    }
    html += '</div>';
    container.innerHTML = html;
}

// --- 7. INITIALIZATION ---
function startPracticeMode() {
    isTestMode = false;
    currentCategory = 'recentgk';
    wordsInCurrentChunk = [...vocabData.recentgk.list];
    shuffleArray(wordsInCurrentChunk);
    currentQuizQuestionIndex = 0;
    quizScores = { correct: 0, incorrect: 0 };
    missedWords = [];
    loadQuestion();
    showSection('test'); 
}

function startTestMode() {
    const activeLimitButton = document.querySelector('#gk-limit-buttons .limit-btn.active');
    const limit = activeLimitButton.dataset.limit;
    let numQuestions = limit === 'all' ? vocabData.recentgk.list.length : parseInt(limit, 10);
    
    const allGkQuestions = [...vocabData.recentgk.list];
    shuffleArray(allGkQuestions);
    wordsInCurrentChunk = allGkQuestions.slice(0, Math.min(numQuestions, allGkQuestions.length));
    
    currentCategory = 'recentgk';
    isTestMode = true;
    selectedTestAnswer = null;
    startTest(); 
}

document.addEventListener('DOMContentLoaded', async () => {
    try {
        const [greResponse, preVocabResponse, recentGkResponse] = await Promise.all([
            fetch('vocabulary.json'),
            fetch('pre-vocabulary.json'),
            fetch('recentgk.json')
        ]);
        
        if (!greResponse.ok) throw new Error(`Failed to load vocabulary.json: ${greResponse.statusText}`);
        if (!preVocabResponse.ok) throw new Error(`Failed to load pre-vocabulary.json: ${preVocabResponse.statusText}`);
        if (!recentGkResponse.ok) throw new Error(`Failed to load recentgk.json: ${recentGkResponse.statusText}`);
        
        vocabData.gre.list = await greResponse.json();
        vocabData.gre.title = "GRE 333";
        vocabData.previous.list = await preVocabResponse.json();
        vocabData.previous.title = "Previous Vocabulary";
        vocabData.recentgk.list = await recentGkResponse.json();
        vocabData.recentgk.title = "Recent GK";

        loadDarkModeState();
        loadProgress();
        loadDictionary();
        loadWelcome();

        // --- Nav Event Listeners ---
        mainMenuButton.addEventListener('click', loadWelcome);
        dictionaryButton.addEventListener('click', () => { loadDictionary(); showSection('dictionary'); });
        statsButton.addEventListener('click', loadStatsPage);
        aboutButton.addEventListener('click', () => showSection('about'));
        darkModeToggle.addEventListener('click', toggleDarkMode);
        
        // Mobile Nav
        mobileMenuButton.addEventListener('click', () => mobileMenu.classList.toggle('hidden'));
        mobileMainMenuButton.addEventListener('click', loadWelcome);
        mobileDictionaryButton.addEventListener('click', () => { loadDictionary(); showSection('dictionary'); });
        mobileStatsButton.addEventListener('click', loadStatsPage);
        mobileAboutButton.addEventListener('click', () => showSection('about'));
        
        // --- Button Event Listeners ---
        resetProgressButton.addEventListener('click', resetProgress);
        document.getElementById('create-test-button').addEventListener('click', createDifficultWordsTest);
        
        // Learn Section
        startTestButton.addEventListener('click', () => {
            isTestMode = false; // This is the "Practice" test
            startTest();
        });

        // ---
        // --- THIS IS THE TEST MODE FIX ---
        // ---
        nextQuestionButton.addEventListener('click', () => {
            if (isTestMode) {
                // In TEST mode, do not show feedback. Silently record and advance.
                if (!selectedTestAnswer) return; // Wait for answer
                recordTestAnswerAndAdvance();
            } else {
                // In PRACTICE mode, wait for an answer, then load next question.
                // checkAnswer() provides the feedback and sets isAnswered = true.
                if (!isAnswered) return; 
                loadQuestion();
            }
        });

        // Dictionary
        searchBar.addEventListener('input', debounce(filterDictionary, 300));

        // Recent GK Section
        document.getElementById('practice-mode-button').addEventListener('click', startPracticeMode);
        document.getElementById('test-mode-button').addEventListener('click', startTestMode);
        document.getElementById('back-to-categories-gk').addEventListener('click', loadWelcome);

        // Confirmation for exiting test
        const confirmAndLoadWelcome = () => {
            const userConfirmed = confirm("Are you sure you want to exit? Your current test progress will be lost.");
            if (userConfirmed) {
                loadWelcome();
            }
        };
        document.getElementById('back-to-categories-test').addEventListener('click', confirmAndLoadWelcome);
        
        // Results Section
        document.getElementById('back-to-categories-results').addEventListener('click', loadWelcome);

        // GK Limit Buttons
        document.getElementById('gk-limit-buttons').addEventListener('click', (event) => {
            const clickedButton = event.target.closest('.limit-btn');
            if (clickedButton) {
                document.querySelectorAll('#gk-limit-buttons .limit-btn').forEach(btn => btn.classList.remove('active'));
                clickedButton.classList.add('active');
            }
        });

        // Global Speak Button Listener (Event Delegation)
        document.body.addEventListener('click', (event) => {
            const speakButton = event.target.closest('.speak-button');
            if (speakButton) {
                speakWord(speakButton.dataset.word);
            }
        });

    } catch (error) {
        console.error("Failed to initialize app:", error);
        document.body.innerHTML = `<div class="text-red-500 text-center p-8">Failed to load critical app data. Please check your network connection and refresh the page. <br><small>${error.message}</small></div>`;
    }
});
