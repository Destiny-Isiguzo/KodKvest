'use strict';

// ---------------------------
// Lesson data definition
// ---------------------------

/**
 * Lessons configuration.
 * For the MVP we provide a small but representative subset of lessons.
 * All text shown to the user is in Russian.
 */
const lessons = [
  {
    id: 'html_101',
    stage: 1,
    stageTitle: 'Основы HTML',
    title: 'Ваш первый заголовок',
    description:
      'В этом уроке вы создадите свой первый заголовок с помощью тега <h1>. Заголовки помогают структурировать страницу и подсказывают браузеру и пользователям, что главное на странице.',
    content:
      'HTML использует теги для обозначения структуры документа. Тег <code>&lt;h1&gt;</code> обозначает самый важный заголовок.\n\nПример:\n<pre><code>&lt;h1&gt;Привет, мир!&lt;/h1&gt;</code></pre>',
    challenge: {
      // Placeholder markers __(1)__ and __(2)__ correspond to correctAnswer array items
      initialCode:
        '<!DOCTYPE html>\n<html>\n  <body>\n\n    _(1)_Мой первый заголовок_(2)_\n\n  </body>\n</html>',
      correctAnswer: ['<h1>', '</h1>'],
      hint: 'Используйте парные теги <h1> и </h1> вокруг текста заголовка.'
    },
    points: 50,
    nextLessonId: 'html_102'
  },
  {
    id: 'html_102',
    stage: 1,
    stageTitle: 'Основы HTML',
    title: 'Абзацы текста',
    description:
      'Теперь добавим абзац текста с помощью тега <p>. Абзацы помогают разбивать текст на удобочитаемые блоки.',
    content:
      'Тег <code>&lt;p&gt;</code> обозначает абзац текста. Внутри него может быть обычный текст, встроенные теги, ссылки и многое другое.\n\nПример:\n<pre><code>&lt;p&gt;Это мой первый абзац.&lt;/p&gt;</code></pre>',
    challenge: {
      initialCode:
        '<!DOCTYPE html>\n<html>\n  <body>\n\n    <h1>Заголовок страницы</h1>\n    _(1)_Это мой первый абзац на странице_(2)_\n\n  </body>\n</html>',
      correctAnswer: ['<p>', '</p>'],
      hint: 'Вставьте тег абзаца: <p> перед текстом и </p> после текста.'
    },
    points: 60,
    nextLessonId: 'html_103'
  },
  {
    id: 'html_103',
    stage: 1,
    stageTitle: 'Основы HTML',
    title: 'Ссылки',
    description:
      'Ссылки позволяют переходить на другие страницы. Они создаются с помощью тега <a> и атрибута href.',
    content:
      'Ссылка создаётся с помощью тега <code>&lt;a&gt;</code> и атрибута <code>href</code>. Внутри тега располагается текст ссылки.\n\nПример:\n<pre><code>&lt;a href="https://example.com"&gt;Перейти&lt;/a&gt;</code></pre>',
    challenge: {
      initialCode:
        '<!DOCTYPE html>\n<html>\n  <body>\n\n    <h1>Полезный ресурс</h1>\n    __(1)__ href="https://developer.mozilla.org"__(2)__MDN Web Docs__(3)__\n\n  </body>\n</html>',
      // We validate three replacements for diversity
      correctAnswer: ['<a', '>', '</a>'],
      hint: 'Начните ссылку с <a href="..."> и завершите её </a>.'
    },
    points: 70,
    nextLessonId: null
  }
];

// ---------------------------
// User progress persistence
// ---------------------------

const STORAGE_KEY = 'kodkvest_user_progress_v1';

/**
 * Default user progress state.
 */
const defaultProgress = {
  currentLevel: '1.1', // stage.lesson index as simple string
  currentLessonId: lessons[0]?.id || null,
  points: 0,
  streak: 1,
  lastActiveDate: null, // ISO date string (yyyy-mm-dd)
  completedLessons: [],
  earnedBadges: [],
  inventory: {
    // Streak Freeze item example
    streakFreeze: 1
  }
};

let userProgress = { ...defaultProgress };

// Cached DOM elements
const views = {
  welcome: document.getElementById('welcome-screen'),
  dashboard: document.getElementById('dashboard'),
  lesson: document.getElementById('lesson-view')
};

const elements = {
  // Welcome
  btnStart: document.getElementById('btn-start'),
  btnHaveAccount: document.getElementById('btn-have-account'),

  // Dashboard header
  statPoints: document.getElementById('stat-points'),
  statStreak: document.getElementById('stat-streak'),
  learningPath: document.getElementById('learning-path'),
  stageProgressText: document.getElementById('stage-progress'),
  stageProgressBar: document.getElementById('stage-progress-bar'),
  streakCalendar: document.getElementById('streak-calendar'),
  leaderboard: document.getElementById('leaderboard'),

  // Lesson view
  btnBackDashboard: document.getElementById('btn-back-dashboard'),
  lessonStageLabel: document.getElementById('lesson-stage-label'),
  lessonPointsLabel: document.getElementById('lesson-points-label'),
  lessonTitle: document.getElementById('lesson-title'),
  lessonDescription: document.getElementById('lesson-description'),
  lessonContent: document.getElementById('lesson-content'),
  codeEditor: document.getElementById('code-editor'),
  consoleOutput: document.getElementById('console-output'),
  btnRunTest: document.getElementById('btn-run-test'),
  btnHint: document.getElementById('btn-hint'),
  btnNextLesson: document.getElementById('btn-next-lesson'),
  previewFrame: document.getElementById('preview-frame'),

  // Modals
  modalOverlay: document.getElementById('modal-overlay'),
  modalTitle: document.getElementById('modal-title'),
  modalMessage: document.getElementById('modal-message'),
  modalActions: document.getElementById('modal-actions')
};

// ---------------------------
// Utility functions
// ---------------------------

/**
 * Safely parse JSON from localStorage.
 */
function safeLoadProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch (err) {
    console.error('Ошибка при чтении localStorage', err);
    showStorageErrorModal();
    return null;
  }
}

/**
 * Safely save progress to localStorage.
 */
function saveProgress() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(userProgress));
  } catch (err) {
    console.error('Ошибка при записи в localStorage', err);
    showStorageErrorModal();
  }
}

/**
 * Update streak based on lastActiveDate and apply Streak Freeze if needed.
 */
function updateStreakOnVisit() {
  const today = new Date();
  const todayKey = formatDateKey(today);

  if (!userProgress.lastActiveDate) {
    // First ever visit
    userProgress.streak = 1;
    userProgress.lastActiveDate = todayKey;
    return;
  }

  if (userProgress.lastActiveDate === todayKey) {
    // Already counted today
    return;
  }

  const lastDate = parseDateKey(userProgress.lastActiveDate);
  if (!lastDate) {
    userProgress.streak = 1;
    userProgress.lastActiveDate = todayKey;
    return;
  }

  const diffDays = diffDaysUTC(lastDate, today);

  if (diffDays === 1) {
    // Yesterday
    userProgress.streak += 1;
  } else if (diffDays > 1) {
    // Gap detected — consider Streak Freeze
    if (userProgress.inventory && userProgress.inventory.streakFreeze > 0) {
      // Use one freeze and keep streak
      userProgress.inventory.streakFreeze -= 1;
      // You could log usage in earnedBadges or similar
    } else {
      userProgress.streak = 1;
    }
  }

  userProgress.lastActiveDate = todayKey;
}

/**
 * Return yyyy-mm-dd for calendar-safe comparison across months.
 */
function formatDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function parseDateKey(key) {
  if (!key || typeof key !== 'string') return null;
  const [y, m, d] = key.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(Date.UTC(y, m - 1, d));
}

function diffDaysUTC(a, b) {
  const msPerDay = 1000 * 60 * 60 * 24;
  const utcA = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const utcB = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.floor((utcB - utcA) / msPerDay);
}

/**
 * Show one of the main views.
 */
function showView(name) {
  Object.values(views).forEach((el) => el.classList.remove('active-view'));
  if (views[name]) views[name].classList.add('active-view');
}

/**
 * Simple modal helper.
 */
function showModal({ title, message, actions }) {
  elements.modalTitle.textContent = title;
  elements.modalMessage.textContent = message;
  elements.modalActions.innerHTML = '';

  actions.forEach((a) => {
    const btn = document.createElement('button');
    btn.textContent = a.label;
    btn.className = `btn ${a.variant || 'btn-secondary'}`;
    btn.addEventListener('click', () => {
      hideModal();
      if (typeof a.onClick === 'function') a.onClick();
    });
    elements.modalActions.appendChild(btn);
  });

  elements.modalOverlay.style.display = 'flex';
}

function hideModal() {
  elements.modalOverlay.style.display = 'none';
}

function showStorageErrorModal() {
  showModal({
    title: 'Ошибка сохранения данных',
    message:
      'Произошла ошибка при сохранении или чтении ваших данных. Начать новое обучение? (Это сбросит ваш прогресс).',
    actions: [
      {
        label: 'Да, начать заново',
        variant: 'btn-primary',
        onClick: () => {
          userProgress = { ...defaultProgress };
          saveProgress();
          renderAll();
        }
      },
      {
        label: 'Нет',
        variant: 'btn-secondary',
        onClick: () => {
          // Keep current in-memory state; nothing extra to do
        }
      }
    ]
  });
}

// ---------------------------
// Dashboard rendering
// ---------------------------

function getStageInfo() {
  const stageMap = new Map();
  lessons.forEach((lesson) => {
    if (!stageMap.has(lesson.stage)) {
      stageMap.set(lesson.stage, {
        stage: lesson.stage,
        stageTitle: lesson.stageTitle,
        lessons: []
      });
    }
    stageMap.get(lesson.stage).lessons.push(lesson);
  });
  // Sort stages and lessons
  const stages = Array.from(stageMap.values()).sort((a, b) => a.stage - b.stage);
  stages.forEach((s) => s.lessons.sort((a, b) => a.id.localeCompare(b.id)));
  return stages;
}

function renderLearningPath() {
  const stages = getStageInfo();
  elements.learningPath.innerHTML = '';

  const completedSet = new Set(userProgress.completedLessons);
  const currentLessonId = userProgress.currentLessonId;

  stages.forEach((stageObj) => {
    const stageCard = document.createElement('div');
    stageCard.className = 'stage-card';

    const header = document.createElement('div');
    header.className = 'stage-header';
    const title = document.createElement('div');
    title.className = 'stage-title';
    title.textContent = `Этап ${stageObj.stage}: ${stageObj.stageTitle}`;
    const badge = document.createElement('div');
    badge.className = 'stage-badge';
    const completedCount = stageObj.lessons.filter((l) => completedSet.has(l.id)).length;
    badge.textContent = `${completedCount}/${stageObj.lessons.length} уроков`;

    header.appendChild(title);
    header.appendChild(badge);

    const list = document.createElement('div');
    list.className = 'lesson-list';

    stageObj.lessons.forEach((lesson, index) => {
      const node = document.createElement('button');
      node.type = 'button';
      node.className = 'lesson-node';

      const main = document.createElement('div');
      main.className = 'lesson-node-main';

      const titleEl = document.createElement('div');
      titleEl.className = 'lesson-title';
      titleEl.textContent = lesson.title;
      const meta = document.createElement('div');
      meta.className = 'lesson-meta';
      meta.textContent = `${lesson.points} очков`;

      main.appendChild(titleEl);
      main.appendChild(meta);

      const statusIcon = document.createElement('div');
      statusIcon.className = 'lesson-status-icon';

      const isCompleted = completedSet.has(lesson.id);
      const isCurrent = currentLessonId === lesson.id;

      // Locked logic: previous lesson in same stage must be completed
      let isLocked = false;
      if (index > 0) {
        const prev = stageObj.lessons[index - 1];
        if (!completedSet.has(prev.id)) isLocked = true;
      }

      if (isCompleted) {
        node.classList.add('completed');
        statusIcon.textContent = '✅';
      } else if (isCurrent && !isLocked) {
        node.classList.add('current');
        statusIcon.textContent = '▶';
      } else if (isLocked) {
        node.classList.add('locked');
        statusIcon.textContent = '🔒';
      } else {
        statusIcon.textContent = '•';
      }

      if (!isLocked) {
        node.addEventListener('click', () => openLesson(lesson.id));
      }

      node.appendChild(main);
      node.appendChild(statusIcon);
      list.appendChild(node);
    });

    stageCard.appendChild(header);
    stageCard.appendChild(list);
    elements.learningPath.appendChild(stageCard);
  });
}

function renderStageProgress() {
  const stages = getStageInfo();
  const currentLessonId = userProgress.currentLessonId;
  const completedSet = new Set(userProgress.completedLessons);

  // Find current stage
  let currentStage = stages[0] || null;
  for (const st of stages) {
    if (st.lessons.some((l) => l.id === currentLessonId)) {
      currentStage = st;
      break;
    }
  }

  if (!currentStage) {
    elements.stageProgressText.textContent = 'Нет данных по этапам';
    elements.stageProgressBar.style.width = '0%';
    return;
  }

  const total = currentStage.lessons.length;
  const completed = currentStage.lessons.filter((l) => completedSet.has(l.id)).length;
  elements.stageProgressText.textContent = `Этап ${currentStage.stage}: ${completed}/${total} ур��ков завершено`;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
  elements.stageProgressBar.style.width = `${percent}%`;
}

function renderHeaderStats() {
  elements.statPoints.textContent = `⭐ ${userProgress.points} очков`;
  elements.statStreak.textContent = `🔥 ${userProgress.streak} дней`;
}

function renderCalendar() {
  const container = elements.streakCalendar;
  container.innerHTML = '';

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  const header = document.createElement('div');
  header.className = 'calendar-header';
  const monthName = now.toLocaleString('ru-RU', { month: 'long', year: 'numeric' });
  header.innerHTML = `<span>${monthName}</span>`;
  container.appendChild(header);

  const grid = document.createElement('div');
  grid.className = 'calendar-grid';

  const weekdayRow = document.createElement('div');
  weekdayRow.className = 'calendar-grid';
  const weekdays = ['П', 'В', 'С', 'Ч', 'П', 'С', 'В'];
  weekdays.forEach((w) => {
    const cell = document.createElement('div');
    cell.className = 'calendar-weekday';
    cell.textContent = w;
    weekdayRow.appendChild(cell);
  });
  container.appendChild(weekdayRow);

  // Add empty cells before first day
  const startWeekday = (firstDay.getDay() + 6) % 7; // 0=Monday
  for (let i = 0; i < startWeekday; i++) {
    const empty = document.createElement('div');
    empty.className = 'calendar-cell';
    grid.appendChild(empty);
  }

  const todayKey = formatDateKey(now);

  for (let day = 1; day <= lastDay.getDate(); day++) {
    const date = new Date(year, month, day);
    const key = formatDateKey(date);

    const cell = document.createElement('div');
    cell.className = 'calendar-cell calendar-day';
    cell.textContent = String(day);

    // Active if between first streak date and today, simplistic for MVP
    if (userProgress.lastActiveDate) {
      const lastDate = parseDateKey(userProgress.lastActiveDate);
      if (lastDate && date <= new Date() && date >= lastDate) {
        cell.classList.add('active-day');
      }
    }

    if (key === todayKey) {
      cell.classList.add('today');
    }

    grid.appendChild(cell);
  }

  container.appendChild(grid);
}

function renderLeaderboard() {
  const staticEntries = [
    { name: 'Алексей', score: 2450 },
    { name: 'Мария', score: 2210 },
    { name: 'Иван', score: 1980 },
    { name: 'София', score: 1620 },
    { name: 'Дмитрий', score: 1510 }
  ];

  elements.leaderboard.innerHTML = '';
  staticEntries.forEach((entry, idx) => {
    const row = document.createElement('div');
    row.className = 'leaderboard-row';
    row.innerHTML = `<span>${idx + 1}</span><span>${entry.name}</span><span>${entry.score} ⭐</span>`;
    elements.leaderboard.appendChild(row);
  });
}

function renderDashboard() {
  renderHeaderStats();
  renderLearningPath();
  renderStageProgress();
  renderCalendar();
  renderLeaderboard();
}

// ---------------------------
// Lesson view logic
// ---------------------------

let currentLesson = null;

function findLessonById(id) {
  return lessons.find((l) => l.id === id) || null;
}

function openLesson(id) {
  const lesson = findLessonById(id);
  if (!lesson) return;

  // Ensure prerequisites: previous lesson of same stage must be completed
  const stages = getStageInfo();
  const stage = stages.find((st) => st.lessons.some((l) => l.id === id));
  if (stage) {
    const index = stage.lessons.findIndex((l) => l.id === id);
    if (index > 0) {
      const prev = stage.lessons[index - 1];
      if (!userProgress.completedLessons.includes(prev.id)) {
        // Redirect to dashboard with notification
        showModal({
          title: 'Урок недоступен',
          message:
            'Вы не можете разблокировать этот урок ещё. Сначала завершите предыдущий урок.',
          actions: [
            {
              label: 'Понятно',
              variant: 'btn-primary',
              onClick: () => {
                showView('dashboard');
              }
            }
          ]
        });
        return;
      }
    }
  }

  currentLesson = lesson;
  userProgress.currentLessonId = lesson.id;
  saveProgress();

  elements.lessonStageLabel.textContent = `Этап ${lesson.stage}`;
  elements.lessonPointsLabel.textContent = `+${lesson.points} очков`;
  elements.lessonTitle.textContent = lesson.title;
  elements.lessonDescription.textContent = lesson.description;
  elements.lessonContent.innerHTML = lesson.content;

  // Prepare editor content with placeholders
  elements.codeEditor.value = lesson.challenge.initialCode;
  elements.consoleOutput.textContent = '';
  elements.consoleOutput.classList.remove('success', 'error');
  elements.btnNextLesson.style.display = 'none';

  // Render initial preview
  renderPreview(elements.codeEditor.value);

  showView('lesson');
}

function renderPreview(codeText) {
  // Render HTML inside a sandboxed iframe without using eval
  const iframe = elements.previewFrame;
  const doc = iframe.contentDocument || iframe.contentWindow.document;
  doc.open();
  doc.write(codeText);
  doc.close();
}

function normalizeAnswer(str) {
  return str.replace(/\s+/g, ' ').trim().toLowerCase();
}

function runLessonTest() {
  if (!currentLesson) return;

  const raw = elements.codeEditor.value;
  const placeholderRegex = /__\((\d+)\)__/g;
  const parts = [];
  let match;
  let replacedCode = raw;

  // Extract user replacements inside placeholders
  let idx = 0;
  const answers = [];

  // Strategy: to keep it simple we expect user to replace markers manually.
  // So we look for the correctAnswer strings in the final code rather
  // than computing diffs at placeholder positions.

  const { correctAnswer } = currentLesson.challenge;

  // Validation: all required snippets must appear in final code (order ignored)
  const normalizedCode = normalizeAnswer(raw);
  const allPresent = correctAnswer.every((snippet) =>
    normalizedCode.includes(normalizeAnswer(snippet))
  );

  if (!allPresent) {
    elements.consoleOutput.textContent =
      'Не совсем так. Попробуйте ещё раз или нажмите «Подсказка».';
    elements.consoleOutput.classList.remove('success');
    elements.consoleOutput.classList.add('error');
    renderPreview(raw);
    return;
  }

  // If reached here, validation passed
  elements.consoleOutput.textContent =
    'Отлично! Задание выполнено. Вы можете перейти к следующему уроку.';
  elements.consoleOutput.classList.remove('error');
  elements.consoleOutput.classList.add('success');

  // Award points only once per lesson
  if (!userProgress.completedLessons.includes(currentLesson.id)) {
    userProgress.completedLessons.push(currentLesson.id);
    userProgress.points += currentLesson.points;
    saveProgress();
    renderHeaderStats();
    renderLearningPath();
    renderStageProgress();
  }

  // Show next lesson button if it exists
  if (currentLesson.nextLessonId) {
    elements.btnNextLesson.style.display = 'inline-flex';
  } else {
    elements.btnNextLesson.style.display = 'none';
  }

  renderPreview(raw);
}

function showHint() {
  if (!currentLesson) return;
  const { hint } = currentLesson.challenge;
  elements.consoleOutput.textContent = `Подсказка: ${hint}`;
  elements.consoleOutput.classList.remove('success');
  elements.consoleOutput.classList.add('error');
}

function goToNextLesson() {
  if (!currentLesson || !currentLesson.nextLessonId) return;
  openLesson(currentLesson.nextLessonId);
}

// ---------------------------
// Event listeners
// ---------------------------

elements.btnStart.addEventListener('click', () => {
  // Create new progress state
  userProgress = { ...defaultProgress };
  updateStreakOnVisit();
  saveProgress();
  renderAll();
  showView('dashboard');
});

elements.btnHaveAccount.addEventListener('click', () => {
  // Try to load existing progress and go to dashboard
  const stored = safeLoadProgress();
  if (stored) {
    userProgress = { ...defaultProgress, ...stored };
  } else {
    userProgress = { ...defaultProgress };
  }
  updateStreakOnVisit();
  saveProgress();
  renderAll();
  showView('dashboard');
});

elements.btnBackDashboard.addEventListener('click', () => {
  renderDashboard();
  showView('dashboard');
});

elements.codeEditor.addEventListener('input', () => {
  renderPreview(elements.codeEditor.value);
});

elements.btnRunTest.addEventListener('click', runLessonTest);

elements.btnHint.addEventListener('click', showHint);

elements.btnNextLesson.addEventListener('click', goToNextLesson);

// Inventory and badges buttons (simple info modals for MVP)

document.getElementById('btn-inventory').addEventListener('click', () => {
  const freezeCount = userProgress.inventory?.streakFreeze || 0;
  showModal({
    title: 'Инвентарь',
    message: `Замораживатель Streak'а: ${freezeCount} шт.`,
    actions: [
      {
        label: 'Закрыть',
        variant: 'btn-primary'
      }
    ]
  });
});


document.getElementById('btn-badges').addEventListener('click', () => {
  const badges = userProgress.earnedBadges || [];
  const msg =
    badges.length === 0
      ? 'У вас пока нет наград. Завершайте уроки, чтобы получать медали!'
      : `Вы заработали следующие награды: ${badges.join(', ')}`;
  showModal({
    title: 'Награды',
    message: msg,
    actions: [
      {
        label: 'Понятно',
        variant: 'btn-primary'
      }
    ]
  });
});

// ---------------------------
// Initial bootstrap
// ---------------------------

function renderAll() {
  renderDashboard();
}

(function init() {
  const stored = safeLoadProgress();
  if (stored) {
    userProgress = { ...defaultProgress, ...stored };
  }

  // On each visit update streak
  updateStreakOnVisit();
  saveProgress();

  renderAll();

  // Decide which view to show initially
  if (stored) {
    showView('dashboard');
  } else {
    showView('welcome');
  }
})();