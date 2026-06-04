/**
 * To-Do Life Dashboard â€” js/app.js
 *
 * All application logic lives in this single file, organized as plain objects.
 * Module order: StorageManager â†’ GreetingWidget â†’ FocusTimer â†’ TodoList â†’ QuickLinks â†’ App
 */

// ---------------------------------------------------------------------------
// StorageManager
// Handles all localStorage reads and writes. No other module touches
// localStorage directly.
// ---------------------------------------------------------------------------
const StorageManager = {
  /** localStorage key constants */
  KEYS: {
    TASKS: 'tld_tasks',
    LINKS: 'tld_links',
  },

  /**
   * Read and parse the stored Task array.
   * Returns [] on any failure (missing key, bad JSON, non-array) â€” never throws.
   * @returns {Array}
   */
  loadTasks() {
    try {
      const raw = localStorage.getItem(this.KEYS.TASKS);
      if (raw === null) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed;
    } catch (_e) {
      return [];
    }
  },

  /**
   * Read and parse the stored Link array.
   * Returns [] on any failure â€” never throws.
   * @returns {Array}
   */
  loadLinks() {
    try {
      const raw = localStorage.getItem(this.KEYS.LINKS);
      if (raw === null) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed;
    } catch (_e) {
      return [];
    }
  },

  /**
   * Serialize and write the Task array to localStorage.
   * Catches QuotaExceededError (and any other write failure) and shows a toast.
   * @param {Array} tasks
   */
  saveTasks(tasks) {
    try {
      localStorage.setItem(this.KEYS.TASKS, JSON.stringify(tasks));
    } catch (e) {
      this._handleWriteError(e);
    }
  },

  /**
   * Serialize and write the Link array to localStorage.
   * Catches QuotaExceededError (and any other write failure) and shows a toast.
   * @param {Array} links
   */
  saveLinks(links) {
    try {
      localStorage.setItem(this.KEYS.LINKS, JSON.stringify(links));
    } catch (e) {
      this._handleWriteError(e);
    }
  },

  /**
   * Display a non-blocking toast notification in #toast for â‰¥ 3 seconds
   * when a localStorage write fails.
   * @param {Error} err
   */
  _handleWriteError(err) {
    const toast = document.getElementById('toast');
    if (!toast) return;

    const message =
      err && (err.name === 'QuotaExceededError' || err.code === 22)
        ? 'Could not save data: storage quota exceeded. Please free up space.'
        : 'Could not save data: storage unavailable. Changes may not persist.';

    toast.textContent = message;
    toast.classList.add('toast--visible');

    // Clear the notification after 3 seconds (â‰¥ 3 s per requirement 5.8)
    setTimeout(() => {
      toast.textContent = '';
      toast.classList.remove('toast--visible');
    }, 3000);
  },
};

// ---------------------------------------------------------------------------
// GreetingWidget
// Owns the top-left greeting panel. Starts a setInterval that fires every
// 1 000 ms to update the displayed greeting, time, and date.
// ---------------------------------------------------------------------------
const GreetingWidget = {
  /** @type {number|null} */
  _intervalId: null,

  /** @type {HTMLElement|null} */
  _greetingEl: null,

  /** @type {HTMLElement|null} */
  _timeEl: null,

  /** @type {HTMLElement|null} */
  _dateEl: null,

  /**
   * Map an hour (0â€“23) to one of the four greeting strings.
   * Boundary rules:
   *   5â€“11  â†’ "Good Morning"
   *   12â€“17 â†’ "Good Afternoon"
   *   18â€“20 â†’ "Good Evening"
   *   21â€“23 and 0â€“4 â†’ "Good Night"
   *
   * @param {number} hour - Integer in the range [0, 23]
   * @returns {string}
   */
  getGreeting(hour) {
    if (hour >= 5 && hour <= 11) return 'Good Morning';
    if (hour >= 12 && hour <= 17) return 'Good Afternoon';
    if (hour >= 18 && hour <= 20) return 'Good Evening';
    return 'Good Night'; // hour 21â€“23 and 0â€“4
  },

  /**
   * Format a Date object as a zero-padded HH:MM:SS string.
   * @param {Date} date
   * @returns {string} e.g. "09:04:07"
   */
  formatTime(date) {
    const hh = String(date.getHours()).padStart(2, '0');
    const mm = String(date.getMinutes()).padStart(2, '0');
    const ss = String(date.getSeconds()).padStart(2, '0');
    return `${hh}:${mm}:${ss}`;
  },

  /**
   * Format a Date object as a full human-readable date string.
   * @param {Date} date
   * @returns {string} e.g. "Thursday, June 4, 2026"
   */
  formatDate(date) {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  },

  /**
   * Called every 1 000 ms by setInterval (and once immediately on init).
   * Reads the current time and updates all three DOM elements.
   */
  _tick() {
    const now = new Date();
    if (this._greetingEl) {
      this._greetingEl.textContent = this.getGreeting(now.getHours());
    }
    if (this._timeEl) {
      this._timeEl.textContent = this.formatTime(now);
    }
    if (this._dateEl) {
      this._dateEl.textContent = this.formatDate(now);
    }
  },

  /**
   * Create and inject the greeting widget DOM into container, then start the
   * 1-second clock interval.
   *
   * Rendered structure:
   *   <h1 class="greeting"></h1>
   *   <p class="time"></p>
   *   <p class="date"></p>
   *
   * @param {HTMLElement} container
   */
  init(container) {
    // Build DOM elements
    const greetingEl = document.createElement('h1');
    greetingEl.className = 'greeting';

    const timeEl = document.createElement('p');
    timeEl.className = 'time';

    const dateEl = document.createElement('p');
    dateEl.className = 'date';

    container.appendChild(greetingEl);
    container.appendChild(timeEl);
    container.appendChild(dateEl);

    // Store references for _tick()
    this._greetingEl = greetingEl;
    this._timeEl = timeEl;
    this._dateEl = dateEl;

    // Show content immediately (no blank flash before first interval tick)
    this._tick();

    // Tick every second
    this._intervalId = setInterval(() => this._tick(), 1000);
  },
};

// ---------------------------------------------------------------------------
// FocusTimer
// Manages a 25-minute countdown with IDLE / RUNNING / PAUSED states.
// A _completed flag tracks the post-00:00 state so Start and Stop stay
// disabled until Reset is pressed (Requirement 2.11).
// ---------------------------------------------------------------------------
const FocusTimer = {
  /** Total session duration in seconds (25 Ã— 60). */
  TOTAL_SECONDS: 1500,

  /** Current state: 'IDLE' | 'RUNNING' | 'PAUSED' */
  state: 'IDLE',

  /** Seconds remaining on the current countdown. */
  remaining: 1500,

  /**
   * True while the timer is in the completed variant of IDLE (i.e., it
   * reached 00:00 and has not yet been reset).  Both Start and Stop are
   * disabled in this sub-state.
   * @type {boolean}
   */
  _completed: false,

  /** @type {number|null} */
  _intervalId: null,

  // --- cached DOM references (populated by init) ---
  /** @type {HTMLElement|null} */
  _displayEl: null,

  /** @type {HTMLButtonElement|null} */
  _startBtn: null,

  /** @type {HTMLButtonElement|null} */
  _stopBtn: null,

  /** @type {HTMLButtonElement|null} */
  _resetBtn: null,

  /** @type {HTMLElement|null} */
  _notificationEl: null,

  /**
   * Start the countdown.
   * Guard: does nothing if already RUNNING (prevents duplicate intervals).
   * Transitions: IDLE â†’ RUNNING, PAUSED â†’ RUNNING
   */
  start() {
    // Guard against duplicate intervals (Requirement 2.8)
    if (this.state === 'RUNNING') return;
    // Do not allow starting in completed state (Requirement 2.11)
    if (this._completed) return;

    this.state = 'RUNNING';
    this._intervalId = setInterval(() => this._tick(), 1000);
    this._render();
  },

  /**
   * Pause the countdown.
   * Transitions: RUNNING â†’ PAUSED
   */
  stop() {
    if (this.state !== 'RUNNING') return;

    clearInterval(this._intervalId);
    this._intervalId = null;
    this.state = 'PAUSED';
    this._render();
  },

  /**
   * Reset the timer back to the initial state.
   * Transitions: any state â†’ IDLE (non-completed)
   * Always clears the interval and resets remaining to TOTAL_SECONDS.
   */
  reset() {
    clearInterval(this._intervalId);
    this._intervalId = null;
    this.remaining = this.TOTAL_SECONDS;
    this.state = 'IDLE';
    this._completed = false;

    // Hide any lingering completion notification
    if (this._notificationEl) {
      this._notificationEl.textContent = '';
      this._notificationEl.classList.remove('timer-notification--visible');
    }

    this._render();
  },

  /**
   * Called every second by setInterval while the timer is RUNNING.
   * Decrements remaining, re-renders, and fires _onComplete at 0.
   */
  _tick() {
    this.remaining -= 1;
    this._render();

    if (this.remaining === 0) {
      this._onComplete();
    }
  },

  /**
   * Fires when the countdown reaches 00:00.
   * Stops the interval, marks the completed sub-state, plays an audio alert,
   * and shows a visual notification for â‰¥ 3 seconds (Requirement 2.7, 2.11).
   */
  _onComplete() {
    clearInterval(this._intervalId);
    this._intervalId = null;

    // Completed variant of IDLE â€” both buttons disabled until Reset
    this.state = 'IDLE';
    this._completed = true;
    this._render();

    // --- Audio alert (Requirement 2.7) ---
    this._playAudioAlert();

    // --- Visual notification (Requirement 2.7) ---
    if (this._notificationEl) {
      this._notificationEl.textContent = 'âœ… Focus session complete! Great work!';
      this._notificationEl.classList.add('timer-notification--visible');

      // Keep notification visible for at least 3 seconds
      setTimeout(() => {
        if (this._notificationEl) {
          this._notificationEl.classList.remove('timer-notification--visible');
        }
      }, 3000);
    }
  },

  /**
   * Play a short audio beep using the Web Audio API.
   * Falls back silently if AudioContext is unavailable.
   */
  _playAudioAlert() {
    try {
      const AudioCtx =
        window.AudioContext ||
        window.webkitAudioContext;
      if (!AudioCtx) return;

      const ctx = new AudioCtx();

      // Beep sequence: 880 Hz Ã— 3 short pulses
      const beepAt = (startTime) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, startTime);

        gain.gain.setValueAtTime(0.4, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.3);

        osc.start(startTime);
        osc.stop(startTime + 0.3);
      };

      const now = ctx.currentTime;
      beepAt(now);
      beepAt(now + 0.4);
      beepAt(now + 0.8);

      // Close the context after the last beep to free resources
      setTimeout(() => ctx.close(), 2000);
    } catch (_e) {
      // Audio is non-critical â€” fail silently
    }
  },

  /**
   * Format a seconds value as a zero-padded MM:SS string.
   * @param {number} seconds - Integer in [0, 1500]
   * @returns {string} e.g. "25:00", "04:37", "00:00"
   */
  _formatTime(seconds) {
    const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
    const ss = String(seconds % 60).padStart(2, '0');
    return `${mm}:${ss}`;
  },

  /**
   * Sync the DOM to the current state.
   *
   * Button enable/disable rules (Requirements 2.8, 2.9, 2.11):
   *   Start  â€” disabled while RUNNING or completed
   *   Stop   â€” disabled while IDLE or PAUSED (including completed)
   *   Reset  â€” always enabled
   */
  _render() {
    if (this._displayEl) {
      this._displayEl.textContent = this._formatTime(this.remaining);
    }

    if (this._startBtn) {
      this._startBtn.disabled =
        this.state === 'RUNNING' || this._completed;
    }

    if (this._stopBtn) {
      this._stopBtn.disabled =
        this.state !== 'RUNNING';
    }
  },

  /**
   * Inject the timer HTML into container, wire click handlers, and do the
   * first render.
   *
   * Rendered structure:
   *   <h2 class="widget-title">Focus Timer</h2>
   *   <p class="timer-display">25:00</p>
   *   <div class="timer-controls">
   *     <button class="btn btn--start">Start</button>
   *     <button class="btn btn--stop">Stop</button>
   *     <button class="btn btn--reset">Reset</button>
   *   </div>
   *   <p class="timer-notification" aria-live="polite"></p>
   *
   * @param {HTMLElement} container
   */
  init(container) {
    // Title
    const title = document.createElement('h2');
    title.className = 'widget-title';
    title.textContent = 'Focus Timer';

    // Countdown display
    const displayEl = document.createElement('p');
    displayEl.className = 'timer-display';
    displayEl.setAttribute('aria-live', 'off');
    displayEl.setAttribute('aria-atomic', 'true');

    // Controls row
    const controls = document.createElement('div');
    controls.className = 'timer-controls';

    const startBtn = document.createElement('button');
    startBtn.className = 'btn btn--start';
    startBtn.textContent = 'Start';

    const stopBtn = document.createElement('button');
    stopBtn.className = 'btn btn--stop';
    stopBtn.textContent = 'Stop';

    const resetBtn = document.createElement('button');
    resetBtn.className = 'btn btn--reset';
    resetBtn.textContent = 'Reset';

    controls.appendChild(startBtn);
    controls.appendChild(stopBtn);
    controls.appendChild(resetBtn);

    // Completion notification area (aria-live so screen readers announce it)
    const notificationEl = document.createElement('p');
    notificationEl.className = 'timer-notification';
    notificationEl.setAttribute('aria-live', 'polite');

    // Assemble into container
    container.appendChild(title);
    container.appendChild(displayEl);
    container.appendChild(controls);
    container.appendChild(notificationEl);

    // Cache DOM references
    this._displayEl = displayEl;
    this._startBtn = startBtn;
    this._stopBtn = stopBtn;
    this._resetBtn = resetBtn;
    this._notificationEl = notificationEl;

    // Wire click handlers
    startBtn.addEventListener('click', () => this.start());
    stopBtn.addEventListener('click', () => this.stop());
    resetBtn.addEventListener('click', () => this.reset());

    // Initial render
    this._render();
  },
};

// ---------------------------------------------------------------------------
// TodoList
// Manages an in-memory Task[] array. Every mutation calls
// StorageManager.saveTasks() immediately. Supports add, toggle, inline edit,
// and delete.
//
// Widget layout:
//   ┌────────────────────────────────┐
//   │  To-Do List                    │
//   │  [_______________________] [+] │
//   │  ☐ Buy groceries  [✎] [🗑]    │
//   │  ☑ Read chapter 3 [✎] [🗑]   │  ← strikethrough text
//   └────────────────────────────────┘
// ---------------------------------------------------------------------------
const TodoList = {
  /**
   * In-memory task array. Hydrated from localStorage on init().
   * @type {Array<{id: string, text: string, completed: boolean, createdAt: number}>}
   */
  tasks: [],

  /** @type {HTMLUListElement|null} */
  _listEl: null,

  /** @type {HTMLInputElement|null} */
  _inputEl: null,

  /** @type {HTMLElement|null} */
  _validationEl: null,

  // -------------------------------------------------------------------------
  // Task 6.1 — _generateId
  // -------------------------------------------------------------------------

  /**
   * Generate a unique task ID.
   * Uses crypto.randomUUID() when available; falls back to a
   * timestamp + random suffix for older Safari.
   * (Requirement 3.2 — unique identifier)
   *
   * @returns {string}
   */
  _generateId() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    return `task_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  },

  // -------------------------------------------------------------------------
  // Task 6.1 — _validate
  // -------------------------------------------------------------------------

  /**
   * Validate task text.
   * Returns { valid: false, error } for:
   *   - empty / whitespace-only strings (Requirements 3.3)
   *   - trimmed length > 500 characters (Requirement 3.15)
   * Returns { valid: true, error: null } otherwise.
   *
   * @param {string} text
   * @returns {{ valid: boolean, error: string|null }}
   */
  _validate(text) {
    if (typeof text !== 'string' || text.trim().length === 0) {
      return { valid: false, error: 'Task text cannot be empty.' };
    }
    if (text.trim().length > 500) {
      return { valid: false, error: 'Task text must be 500 characters or fewer.' };
    }
    return { valid: true, error: null };
  },

  // -------------------------------------------------------------------------
  // Task 6.1 — addTask
  // -------------------------------------------------------------------------

  /**
   * Add a new task to the list.
   * Validates text, creates a Task object, persists, and re-renders.
   * Clears the input field on success.
   * Shows an inline validation message on failure.
   * (Requirements 3.2, 3.3, 3.11, 3.12)
   *
   * @param {string} text
   */
  addTask(text) {
    const result = this._validate(text);

    if (!result.valid) {
      if (this._validationEl) {
        this._validationEl.textContent = result.error;
        this._validationEl.classList.add('validation-message--visible');
      }
      return;
    }

    // Clear previous validation message
    if (this._validationEl) {
      this._validationEl.textContent = '';
      this._validationEl.classList.remove('validation-message--visible');
    }

    /** @type {{id: string, text: string, completed: boolean, createdAt: number}} */
    const task = {
      id: this._generateId(),
      text: text.trim(),
      completed: false,
      createdAt: Date.now(),
    };

    this.tasks.push(task);
    StorageManager.saveTasks(this.tasks);
    this._render();

    // Clear and re-focus the input field (Requirement 3.2)
    if (this._inputEl) {
      this._inputEl.value = '';
      this._inputEl.focus();
    }
  },

  // -------------------------------------------------------------------------
  // Task 6.1 — toggleComplete
  // -------------------------------------------------------------------------

  /**
   * Toggle the completed state of the task with the given id.
   * Flips task.completed, persists, and re-renders.
   * (Requirements 3.4, 3.5, 3.11)
   *
   * @param {string} id
   */
  toggleComplete(id) {
    const task = this.tasks.find(t => t.id === id);
    if (!task) return;

    task.completed = !task.completed;
    StorageManager.saveTasks(this.tasks);
    this._render();
  },

  // -------------------------------------------------------------------------
  // Task 6.1 — deleteTask
  // -------------------------------------------------------------------------

  /**
   * Remove the task with the given id from the list.
   * Persists and re-renders.
   * (Requirements 3.10, 3.11)
   *
   * @param {string} id
   */
  deleteTask(id) {
    this.tasks = this.tasks.filter(t => t.id !== id);
    StorageManager.saveTasks(this.tasks);
    this._render();
  },

  // -------------------------------------------------------------------------
  // Task 6.1 — init
  // -------------------------------------------------------------------------

  /**
   * Initialize the TodoList widget.
   * Sets the task array, injects the widget HTML into container, wires
   * the Add button and Enter-key handler, and calls _render().
   * (Requirements 3.1, 3.12, 3.13, 3.14)
   *
   * Injected structure:
   *   <h2 class="widget-title">To-Do List</h2>
   *   <div class="todo-input-row">
   *     <input type="text" class="todo-input" maxlength="500" placeholder="Add a new task…" />
   *     <button class="btn btn--add-task" aria-label="Add task">+</button>
   *   </div>
   *   <p class="validation-message" aria-live="polite"></p>
   *   <ul class="todo-list"></ul>
   *
   * @param {HTMLElement} container
   * @param {Array<{id:string,text:string,completed:boolean,createdAt:number}>} initialTasks
   */
  init(container, initialTasks) {
    this.tasks = Array.isArray(initialTasks) ? initialTasks : [];

    // Title
    const title = document.createElement('h2');
    title.className = 'widget-title';
    title.textContent = 'To-Do List';

    // Input row
    const inputRow = document.createElement('div');
    inputRow.className = 'todo-input-row';

    const inputEl = document.createElement('input');
    inputEl.type = 'text';
    inputEl.className = 'todo-input';
    inputEl.placeholder = 'Add a new task…';
    inputEl.maxLength = 500;
    inputEl.setAttribute('aria-label', 'New task text');

    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.className = 'btn btn--add-task';
    addBtn.textContent = '+';
    addBtn.setAttribute('aria-label', 'Add task');

    inputRow.appendChild(inputEl);
    inputRow.appendChild(addBtn);

    // Inline validation message (Requirement 3.3)
    const validationEl = document.createElement('p');
    validationEl.className = 'validation-message';
    validationEl.setAttribute('aria-live', 'polite');

    // Task list (scrollable container per Requirement 3.14)
    const listEl = document.createElement('ul');
    listEl.className = 'todo-list';

    container.appendChild(title);
    container.appendChild(inputRow);
    container.appendChild(validationEl);
    container.appendChild(listEl);

    // Cache DOM references
    this._inputEl = inputEl;
    this._validationEl = validationEl;
    this._listEl = listEl;

    // Add button click
    addBtn.addEventListener('click', () => {
      this.addTask(this._inputEl.value);
    });

    // Enter key on input
    inputEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        this.addTask(this._inputEl.value);
      }
    });

    // Clear validation message when the user begins typing
    inputEl.addEventListener('input', () => {
      if (this._validationEl) {
        this._validationEl.textContent = '';
        this._validationEl.classList.remove('validation-message--visible');
      }
    });

    this._render();
  },

  // -------------------------------------------------------------------------
  // Task 6.4 — startEdit
  // -------------------------------------------------------------------------

  /**
   * Put a task row into inline-edit mode.
   * Replaces the text <span> with an <input>, shows Save and Cancel
   * buttons, and hides the Edit and Delete buttons.
   * (Requirement 3.6)
   *
   * @param {string} id
   */
  startEdit(id) {
    const task = this.tasks.find(t => t.id === id);
    if (!task) return;

    const li = this._listEl
      ? this._listEl.querySelector(`[data-id="${CSS.escape(id)}"]`)
      : null;
    if (!li) return;

    // Swap text span for an editable input
    const textSpan = li.querySelector('.todo-task-text');
    const editInput = document.createElement('input');
    editInput.type = 'text';
    editInput.className = 'todo-edit-input';
    editInput.value = task.text;
    editInput.maxLength = 500;
    editInput.setAttribute('aria-label', 'Edit task text');

    if (textSpan) {
      li.replaceChild(editInput, textSpan);
    }

    // Per-row inline validation message
    let editValidationEl = li.querySelector('.edit-validation-message');
    if (!editValidationEl) {
      editValidationEl = document.createElement('span');
      editValidationEl.className = 'edit-validation-message validation-message';
      editValidationEl.setAttribute('aria-live', 'polite');
      editInput.insertAdjacentElement('afterend', editValidationEl);
    }

    // Show Save / Cancel; hide Edit / Delete
    const saveBtn = li.querySelector('.btn--save');
    const cancelBtn = li.querySelector('.btn--cancel');
    const editBtn = li.querySelector('.btn--edit');
    const deleteBtn = li.querySelector('.btn--delete');

    if (saveBtn) saveBtn.hidden = false;
    if (cancelBtn) cancelBtn.hidden = false;
    if (editBtn) editBtn.hidden = true;
    if (deleteBtn) deleteBtn.hidden = true;

    // Focus and move caret to end
    editInput.focus();
    editInput.setSelectionRange(editInput.value.length, editInput.value.length);

    // Keyboard shortcuts inside the edit input
    editInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        this.saveEdit(id, editInput.value);
      } else if (e.key === 'Escape') {
        this.cancelEdit(id);
      }
    });
  },

  // -------------------------------------------------------------------------
  // Task 6.4 — saveEdit
  // -------------------------------------------------------------------------

  /**
   * Persist an in-progress edit.
   * Validates newText; on failure shows an inline error and stays in edit
   * mode. On success updates task.text, persists, and re-renders.
   * (Requirements 3.7, 3.8, 3.11)
   *
   * @param {string} id
   * @param {string} newText
   */
  saveEdit(id, newText) {
    const task = this.tasks.find(t => t.id === id);
    if (!task) return;

    const result = this._validate(newText);

    if (!result.valid) {
      // Show inline validation inside the edit row; stay in edit mode (Req 3.8)
      const li = this._listEl
        ? this._listEl.querySelector(`[data-id="${CSS.escape(id)}"]`)
        : null;
      if (li) {
        let editValidationEl = li.querySelector('.edit-validation-message');
        if (!editValidationEl) {
          editValidationEl = document.createElement('span');
          editValidationEl.className = 'edit-validation-message validation-message';
          editValidationEl.setAttribute('aria-live', 'polite');
          const editInput = li.querySelector('.todo-edit-input');
          if (editInput) {
            editInput.insertAdjacentElement('afterend', editValidationEl);
          } else {
            li.appendChild(editValidationEl);
          }
        }
        editValidationEl.textContent = result.error;
        editValidationEl.classList.add('validation-message--visible');
      }
      return; // Keep edit mode active
    }

    task.text = newText.trim();
    StorageManager.saveTasks(this.tasks);
    this._render();
  },

  // -------------------------------------------------------------------------
  // Task 6.4 — cancelEdit
  // -------------------------------------------------------------------------

  /**
   * Discard an in-progress edit and restore the normal view.
   * tasks[] is NOT modified.
   * (Requirement 3.9)
   *
   * @param {string} id
   */
  cancelEdit(id) {
    // Re-render without touching tasks — the original text is preserved
    this._render();
  },

  // -------------------------------------------------------------------------
  // Task 6.7 — _renderTask
  // -------------------------------------------------------------------------

  /**
   * Build and return an <li> for a single task.
   * Wires event handlers for checkbox, Edit, Save, Cancel, and Delete.
   * (Requirements 3.4, 3.5, 3.6–3.10, 3.14)
   *
   * Normal-view structure:
   *   <li class="todo-task [todo-task--completed]" data-id="…">
   *     <input type="checkbox" class="todo-checkbox" [checked]
   *            aria-label="Mark task complete" />
   *     <span class="todo-task-text [todo-task-text--completed]">…</span>
   *     <button class="btn btn--edit"   aria-label="Edit task">✎</button>
   *     <button class="btn btn--save"   aria-label="Save edit"   hidden>Save</button>
   *     <button class="btn btn--cancel" aria-label="Cancel edit" hidden>Cancel</button>
   *     <button class="btn btn--delete" aria-label="Delete task">🗑</button>
   *   </li>
   *
   * @param {{id:string, text:string, completed:boolean, createdAt:number}} task
   * @returns {HTMLLIElement}
   */
  _renderTask(task) {
    const li = document.createElement('li');
    li.className = `todo-task${task.completed ? ' todo-task--completed' : ''}`;
    li.dataset.id = task.id;

    // Completion checkbox (Requirements 3.4, 3.5)
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'todo-checkbox';
    checkbox.checked = task.completed;
    checkbox.setAttribute('aria-label', 'Mark task complete');
    checkbox.addEventListener('change', () => this.toggleComplete(task.id));

    // Task text — strikethrough via CSS class when completed (Requirement 3.4)
    const textSpan = document.createElement('span');
    textSpan.className = `todo-task-text${task.completed ? ' todo-task-text--completed' : ''}`;
    textSpan.textContent = task.text;

    // Edit button (Requirement 3.6)
    const editBtn = document.createElement('button');
    editBtn.type = 'button';
    editBtn.className = 'btn btn--edit';
    editBtn.textContent = '✎';
    editBtn.setAttribute('aria-label', 'Edit task');
    editBtn.addEventListener('click', () => this.startEdit(task.id));

    // Save button — hidden until startEdit() is called (Requirement 3.7)
    const saveBtn = document.createElement('button');
    saveBtn.type = 'button';
    saveBtn.className = 'btn btn--save';
    saveBtn.textContent = 'Save';
    saveBtn.hidden = true;
    saveBtn.setAttribute('aria-label', 'Save edit');
    saveBtn.addEventListener('click', () => {
      const editInput = li.querySelector('.todo-edit-input');
      this.saveEdit(task.id, editInput ? editInput.value : '');
    });

    // Cancel button — hidden until startEdit() is called (Requirement 3.9)
    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.className = 'btn btn--cancel';
    cancelBtn.textContent = 'Cancel';
    cancelBtn.hidden = true;
    cancelBtn.setAttribute('aria-label', 'Cancel edit');
    cancelBtn.addEventListener('click', () => this.cancelEdit(task.id));

    // Delete button (Requirement 3.10)
    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'btn btn--delete';
    deleteBtn.textContent = '🗑';
    deleteBtn.setAttribute('aria-label', 'Delete task');
    deleteBtn.addEventListener('click', () => this.deleteTask(task.id));

    li.appendChild(checkbox);
    li.appendChild(textSpan);
    li.appendChild(editBtn);
    li.appendChild(saveBtn);
    li.appendChild(cancelBtn);
    li.appendChild(deleteBtn);

    return li;
  },

  // -------------------------------------------------------------------------
  // Task 6.7 — _render
  // -------------------------------------------------------------------------

  /**
   * Clear the task list container and repopulate it from tasks[].
   * Shows an empty-state message when there are no tasks.
   * (Requirements 3.12, 3.13, 3.14)
   */
  _render() {
    if (!this._listEl) return;

    // Clear existing items
    this._listEl.innerHTML = '';

    if (this.tasks.length === 0) {
      // Empty state (Requirement 3.13)
      const emptyMsg = document.createElement('li');
      emptyMsg.className = 'todo-empty-state';
      emptyMsg.textContent = 'No tasks yet. Add one above!';
      this._listEl.appendChild(emptyMsg);
      return;
    }

    // Use a DocumentFragment for a single DOM insertion (performance)
    const fragment = document.createDocumentFragment();
    for (const task of this.tasks) {
      fragment.appendChild(this._renderTask(task));
    }
    this._listEl.appendChild(fragment);
  },
};

// ---------------------------------------------------------------------------
// QuickLinks
// Manages an in-memory Link[] array with a maximum of 50 entries.
// Every mutation calls StorageManager.saveLinks() immediately.
//
// Widget layout:
//   ┌────────────────────────────────┐
//   │  Quick Links                   │
//   │  Label [________] URL [______] │
//   │  [Add Link]                    │
//   │  [GitHub ×]  [YouTube ×]       │
//   └────────────────────────────────┘
// ---------------------------------------------------------------------------
const QuickLinks = {
  /**
   * In-memory link array. Hydrated from localStorage on init().
   * @type {Array<{id: string, label: string, url: string, createdAt: number}>}
   */
  links: [],

  /** Maximum number of links allowed (Requirement 4.11). */
  MAX_LINKS: 50,

  /** @type {HTMLElement|null} */
  _listEl: null,

  /** @type {HTMLInputElement|null} */
  _labelInputEl: null,

  /** @type {HTMLInputElement|null} */
  _urlInputEl: null,

  /** @type {HTMLElement|null} */
  _labelErrorEl: null,

  /** @type {HTMLElement|null} */
  _urlErrorEl: null,

  /** @type {HTMLElement|null} */
  _listErrorEl: null,

  // -------------------------------------------------------------------------
  // _generateId
  // -------------------------------------------------------------------------

  /**
   * Generate a unique link ID.
   * Uses crypto.randomUUID() when available; falls back to a
   * timestamp + random suffix for older Safari.
   * (Requirement 4.1 — unique identifier)
   *
   * @returns {string}
   */
  _generateId() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    return `link_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  },

  // -------------------------------------------------------------------------
  // _normalizeUrl
  // -------------------------------------------------------------------------

  /**
   * Ensure the URL has a scheme.
   * - If the URL already begins with "http://" or "https://", return it as-is.
   * - Otherwise prepend "https://".
   * (Requirement 4.5)
   *
   * @param {string} url
   * @returns {string}
   */
  _normalizeUrl(url) {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    return 'https://' + url;
  },

  // -------------------------------------------------------------------------
  // _validateForm
  // -------------------------------------------------------------------------

  /**
   * Validate the add-link form fields and list capacity.
   *
   * Checks (in order):
   *   1. Label: empty → labelError
   *   2. Label: trimmed length > 50 characters → labelError
   *   3. URL: empty → urlError
   *   4. URL: trimmed length > 2048 characters → urlError
   *   5. List full (links.length === 50) → listError
   *
   * Returns a result object with:
   *   - valid {boolean}      — true only when no errors exist
   *   - labelError {string|null}
   *   - urlError   {string|null}
   *   - listError  {string|null}
   *
   * (Requirements 4.6, 4.7, 4.8, 4.11)
   *
   * @param {string} label
   * @param {string} url
   * @returns {{ valid: boolean, labelError: string|null, urlError: string|null, listError: string|null }}
   */
  _validateForm(label, url) {
    let labelError = null;
    let urlError = null;
    let listError = null;

    // Label checks
    if (typeof label !== 'string' || label.trim().length === 0) {
      labelError = 'Label is required.';
    } else if (label.trim().length > 50) {
      labelError = 'Label must be 50 characters or fewer.';
    }

    // URL checks
    if (typeof url !== 'string' || url.trim().length === 0) {
      urlError = 'URL is required.';
    } else if (url.trim().length > 2048) {
      urlError = 'URL must be 2048 characters or fewer.';
    }

    // List capacity check
    if (this.links.length >= this.MAX_LINKS) {
      listError = 'Maximum of 50 links reached.';
    }

    const valid = labelError === null && urlError === null && listError === null;
    return { valid, labelError, urlError, listError };
  },

  // -------------------------------------------------------------------------
  // addLink
  // -------------------------------------------------------------------------

  /**
   * Add a new link to the list.
   * Validates the form, normalizes the URL, creates a Link object,
   * persists, and re-renders.
   * On failure, shows inline errors and preserves form values.
   * (Requirements 4.1, 4.5, 4.6, 4.7, 4.8, 4.9, 4.11)
   *
   * @param {string} label
   * @param {string} url
   */
  addLink(label, url) {
    const { valid, labelError, urlError, listError } = this._validateForm(label, url);

    // Clear previous error messages
    if (this._labelErrorEl) {
      this._labelErrorEl.textContent = '';
      this._labelErrorEl.classList.remove('validation-message--visible');
    }
    if (this._urlErrorEl) {
      this._urlErrorEl.textContent = '';
      this._urlErrorEl.classList.remove('validation-message--visible');
    }
    if (this._listErrorEl) {
      this._listErrorEl.textContent = '';
      this._listErrorEl.classList.remove('validation-message--visible');
    }

    if (!valid) {
      // Show inline errors and preserve form values (Requirements 4.6, 4.7, 4.8)
      if (labelError && this._labelErrorEl) {
        this._labelErrorEl.textContent = labelError;
        this._labelErrorEl.classList.add('validation-message--visible');
      }
      if (urlError && this._urlErrorEl) {
        this._urlErrorEl.textContent = urlError;
        this._urlErrorEl.classList.add('validation-message--visible');
      }
      if (listError && this._listErrorEl) {
        this._listErrorEl.textContent = listError;
        this._listErrorEl.classList.add('validation-message--visible');
      }
      // Preserve form values — do not clear inputs on failure
      return;
    }

    const normalizedUrl = this._normalizeUrl(url.trim());

    /** @type {{id: string, label: string, url: string, createdAt: number}} */
    const link = {
      id: this._generateId(),
      label: label.trim(),
      url: normalizedUrl,
      createdAt: Date.now(),
    };

    this.links.push(link);
    StorageManager.saveLinks(this.links);
    this._render();

    // Clear form inputs on successful add (Requirement 4.4)
    if (this._labelInputEl) this._labelInputEl.value = '';
    if (this._urlInputEl) this._urlInputEl.value = '';
    if (this._labelInputEl) this._labelInputEl.focus();
  },

  // -------------------------------------------------------------------------
  // deleteLink
  // -------------------------------------------------------------------------

  /**
   * Remove the link with the given id from the list.
   * Persists and re-renders.
   * (Requirement 4.10)
   *
   * @param {string} id
   */
  deleteLink(id) {
    this.links = this.links.filter(l => l.id !== id);
    StorageManager.saveLinks(this.links);
    this._render();
  },

  // -------------------------------------------------------------------------
  // init
  // -------------------------------------------------------------------------

  /**
   * Initialize the QuickLinks widget.
   * Sets the links array, injects the widget HTML into container, wires
   * the form submit handler, and calls _render().
   * (Requirements 4.1, 4.2, 4.3, 4.9)
   *
   * Injected structure:
   *   <h2 class="widget-title">Quick Links</h2>
   *   <form class="links-form" novalidate>
   *     <div class="links-form-row">
   *       <label>
   *         Label
   *         <input type="text" class="links-label-input" maxlength="50"
   *                placeholder="Label" aria-label="Link label" />
   *       </label>
   *       <span class="validation-message links-label-error" aria-live="polite"></span>
   *       <label>
   *         URL
   *         <input type="text" class="links-url-input" maxlength="2048"
   *                placeholder="URL" aria-label="Link URL" />
   *       </label>
   *       <span class="validation-message links-url-error" aria-live="polite"></span>
   *     </div>
   *     <button type="submit" class="btn btn--add-link">Add Link</button>
   *   </form>
   *   <p class="validation-message links-list-error" aria-live="polite"></p>
   *   <div class="links-list"></div>
   *
   * @param {HTMLElement} container
   * @param {Array<{id:string,label:string,url:string,createdAt:number}>} initialLinks
   */
  init(container, initialLinks) {
    this.links = Array.isArray(initialLinks) ? initialLinks : [];

    // Title
    const title = document.createElement('h2');
    title.className = 'widget-title';
    title.textContent = 'Quick Links';

    // Form
    const form = document.createElement('form');
    form.className = 'links-form';
    form.setAttribute('novalidate', '');

    // Form row — Label field
    const formRow = document.createElement('div');
    formRow.className = 'links-form-row';

    const labelLabel = document.createElement('label');
    labelLabel.className = 'links-field-label';
    labelLabel.textContent = 'Label';

    const labelInput = document.createElement('input');
    labelInput.type = 'text';
    labelInput.className = 'links-label-input';
    labelInput.placeholder = 'Label';
    labelInput.maxLength = 50;
    labelInput.setAttribute('aria-label', 'Link label');

    labelLabel.appendChild(labelInput);

    const labelError = document.createElement('span');
    labelError.className = 'validation-message links-label-error';
    labelError.setAttribute('aria-live', 'polite');

    // Form row — URL field
    const urlLabel = document.createElement('label');
    urlLabel.className = 'links-field-label';
    urlLabel.textContent = 'URL';

    const urlInput = document.createElement('input');
    urlInput.type = 'text';
    urlInput.className = 'links-url-input';
    urlInput.placeholder = 'URL';
    urlInput.maxLength = 2048;
    urlInput.setAttribute('aria-label', 'Link URL');

    urlLabel.appendChild(urlInput);

    const urlError = document.createElement('span');
    urlError.className = 'validation-message links-url-error';
    urlError.setAttribute('aria-live', 'polite');

    formRow.appendChild(labelLabel);
    formRow.appendChild(labelError);
    formRow.appendChild(urlLabel);
    formRow.appendChild(urlError);

    // Submit button
    const addBtn = document.createElement('button');
    addBtn.type = 'submit';
    addBtn.className = 'btn btn--add-link';
    addBtn.textContent = 'Add Link';

    form.appendChild(formRow);
    form.appendChild(addBtn);

    // List-level error (capacity exceeded)
    const listError = document.createElement('p');
    listError.className = 'validation-message links-list-error';
    listError.setAttribute('aria-live', 'polite');

    // Links container
    const listEl = document.createElement('div');
    listEl.className = 'links-list';

    container.appendChild(title);
    container.appendChild(form);
    container.appendChild(listError);
    container.appendChild(listEl);

    // Cache DOM references
    this._labelInputEl = labelInput;
    this._urlInputEl = urlInput;
    this._labelErrorEl = labelError;
    this._urlErrorEl = urlError;
    this._listErrorEl = listError;
    this._listEl = listEl;

    // Wire submit handler — prevents page reload and calls addLink
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.addLink(this._labelInputEl.value, this._urlInputEl.value);
    });

    // Clear inline errors as the user types in each field
    labelInput.addEventListener('input', () => {
      if (this._labelErrorEl) {
        this._labelErrorEl.textContent = '';
        this._labelErrorEl.classList.remove('validation-message--visible');
      }
    });

    urlInput.addEventListener('input', () => {
      if (this._urlErrorEl) {
        this._urlErrorEl.textContent = '';
        this._urlErrorEl.classList.remove('validation-message--visible');
      }
    });

    this._render();
  },

  // -------------------------------------------------------------------------
  // _renderLink
  // -------------------------------------------------------------------------

  /**
   * Build and return a <span> element for a single link.
   * Contains a button to open the URL in a new tab and a delete button.
   * (Requirements 4.2, 4.3, 4.10)
   *
   * Rendered structure:
   *   <span class="link-item">
   *     <button class="link-btn" type="button" aria-label="Open …">Label</button>
   *     <button class="link-delete" type="button" aria-label="Delete link …">×</button>
   *   </span>
   *
   * @param {{id: string, label: string, url: string, createdAt: number}} link
   * @returns {HTMLSpanElement}
   */
  _renderLink(link) {
    const item = document.createElement('span');
    item.className = 'link-item';
    item.dataset.id = link.id;

    // Link button — opens URL in a new tab (Requirement 4.3)
    const linkBtn = document.createElement('button');
    linkBtn.type = 'button';
    linkBtn.className = 'link-btn';
    linkBtn.textContent = link.label;
    linkBtn.setAttribute('aria-label', `Open ${link.label}`);
    linkBtn.addEventListener('click', () => {
      window.open(link.url, '_blank', 'noopener,noreferrer');
    });

    // Delete button (Requirement 4.10)
    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'link-delete';
    deleteBtn.textContent = '×';
    deleteBtn.setAttribute('aria-label', `Delete link ${link.label}`);
    deleteBtn.addEventListener('click', () => this.deleteLink(link.id));

    item.appendChild(linkBtn);
    item.appendChild(deleteBtn);

    return item;
  },

  // -------------------------------------------------------------------------
  // _render
  // -------------------------------------------------------------------------

  /**
   * Clear the links container and repopulate it from links[].
   * Shows an empty-state message when there are no links.
   * (Requirements 4.2, 4.9)
   */
  _render() {
    if (!this._listEl) return;

    // Clear existing items
    this._listEl.innerHTML = '';

    if (this.links.length === 0) {
      // Empty state
      const emptyMsg = document.createElement('p');
      emptyMsg.className = 'links-empty-state';
      emptyMsg.textContent = 'No links yet. Add one above!';
      this._listEl.appendChild(emptyMsg);
      return;
    }

    // Use a DocumentFragment for a single DOM insertion (performance)
    const fragment = document.createDocumentFragment();
    for (const link of this.links) {
      fragment.appendChild(this._renderLink(link));
    }
    this._listEl.appendChild(fragment);
  },
};

// ---------------------------------------------------------------------------
// App
// Bootstraps all modules on DOMContentLoaded.
// ---------------------------------------------------------------------------
const App = {
  init() {
    const tasks = StorageManager.loadTasks();
    const links = StorageManager.loadLinks();
    GreetingWidget.init(document.getElementById('widget-greeting'));
    FocusTimer.init(document.getElementById('widget-timer'));
    TodoList.init(document.getElementById('widget-todo'), tasks);
    QuickLinks.init(document.getElementById('widget-links'), links);
  },
};

document.addEventListener('DOMContentLoaded', () => App.init());
