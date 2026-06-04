# Implementation Plan: To-Do Life Dashboard

## Overview

Implement a zero-dependency, single-page web application using HTML, CSS, and Vanilla JavaScript. The app is delivered as three files (`index.html`, `css/style.css`, `js/app.js`) with no build step. Modules are organized as plain objects/IIFEs inside `js/app.js`, sharing a single `StorageManager` for all `localStorage` access. Implementation follows the order: project scaffold → StorageManager → GreetingWidget → FocusTimer → TodoList → QuickLinks → App bootstrap → styling.

---

## Tasks

- [x] 1. Scaffold project structure and HTML shell
  - Create `index.html` with the two-column, two-row grid layout: `#widget-greeting`, `#widget-timer`, `#widget-todo`, `#widget-links`
  - Add the `#toast` element with `aria-live="polite"` for non-blocking notifications
  - Link `css/style.css` and `js/app.js` as the only external resources (no inline styles, no extra scripts)
  - Create `css/style.css` as an empty file and `js/app.js` as an empty file to satisfy the file references
  - _Requirements: 6.1, 6.2, 6.4, 6.5_

- [x] 2. Implement StorageManager
  - [x] 2.1 Implement StorageManager with loadTasks, loadLinks, saveTasks, saveLinks
    - Define `KEYS` constants (`tld_tasks`, `tld_links`)
    - Implement `loadTasks()` and `loadLinks()`: read raw string, `JSON.parse`, check `Array.isArray`, return `[]` on any failure without throwing
    - Implement `saveTasks(tasks)` and `saveLinks(links)`: `JSON.stringify` then `localStorage.setItem`, catch `QuotaExceededError` and call `_handleWriteError`
    - Implement `_handleWriteError(err)`: display a toast notification in `#toast` for ≥ 3 seconds
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.8_

  - [ ]* 2.2 Write property test for StorageManager — task serialization round-trip
    - **Property 2: Task serialization round-trip**
    - **Validates: Requirements 5.2, 5.4, 3.12**

  - [ ]* 2.3 Write property test for StorageManager — link serialization round-trip
    - **Property 3: Link serialization round-trip**
    - **Validates: Requirements 5.3, 5.4, 4.9**

  - [ ]* 2.4 Write property test for StorageManager — corrupted or missing storage returns empty array
    - **Property 4: Corrupted or missing storage returns empty array without throwing**
    - **Validates: Requirements 5.5, 5.6**

- [x] 3. Implement GreetingWidget
  - [x] 3.1 Implement GreetingWidget with clock tick, greeting, and date display
    - Implement `getGreeting(hour)`: map hour 0–23 to one of the four greeting strings per the boundary rules (5–11 Morning, 12–17 Afternoon, 18–20 Evening, 21–23 and 0–4 Night)
    - Implement `formatTime(date)`: return `HH:MM:SS` zero-padded string
    - Implement `formatDate(date)`: return full date string like "Thursday, June 4, 2026"
    - Implement `_tick()`: call `new Date()`, update greeting, time, and date DOM elements
    - Implement `init(container)`: create and inject DOM elements, start `setInterval(_tick, 1000)`, call `_tick()` immediately for instant display
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8_

  - [ ]* 3.2 Write property test for GreetingWidget — greeting covers all 24 hours
    - **Property 1: Greeting covers all 24 hours**
    - **Validates: Requirements 1.3, 1.4, 1.5, 1.6**

- [x] 4. Implement FocusTimer
  - [x] 4.1 Implement FocusTimer state machine and countdown logic
    - Define `TOTAL_SECONDS = 1500`, `state = 'IDLE'`, `remaining = 1500`
    - Implement `start()`: guard against duplicate intervals when already `RUNNING`; transition `IDLE`/`PAUSED` → `RUNNING`; start `setInterval(_tick, 1000)`
    - Implement `stop()`: `clearInterval`, transition `RUNNING` → `PAUSED`
    - Implement `reset()`: `clearInterval`, set `remaining = TOTAL_SECONDS`, transition any state → `IDLE`, call `_render()`
    - Implement `_tick()`: decrement `remaining`, call `_render()`, call `_onComplete()` when `remaining === 0`
    - Implement `_onComplete()`: `clearInterval`, set state to completed-IDLE, play audio alert via `AudioContext` or `<audio>`, show visual notification for ≥ 3 seconds
    - Implement `_formatTime(seconds)`: return zero-padded `MM:SS` string
    - Implement `_render()`: update timer display and enable/disable Start/Stop buttons per state rules
    - Implement `init(container)`: inject timer HTML (display + three buttons), wire click handlers, call `_render()`
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 2.10, 2.11_

  - [ ]* 4.2 Write property test for FocusTimer — timer format always produces valid MM:SS
    - **Property 10: Timer format always produces valid MM:SS**
    - **Validates: Requirements 2.6**

  - [ ]* 4.3 Write property test for FocusTimer — stop preserves remaining; resume continues from that value
    - **Property 9: Timer stop preserves remaining; resume continues from that value**
    - **Validates: Requirements 2.3, 2.10**

- [x] 5. Checkpoint — Ensure StorageManager, GreetingWidget, and FocusTimer pass all tests
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Implement TodoList
  - [x] 6.1 Implement TodoList core CRUD and validation
    - Implement `_generateId()`: use `crypto.randomUUID()` with `Date.now()`/`Math.random()` fallback
    - Implement `_validate(text)`: return `{ valid: false, error }` for empty/whitespace-only text or text with trimmed length > 500; return `{ valid: true, error: null }` otherwise
    - Implement `addTask(text)`: validate, create `Task` object (`id`, `text.trim()`, `completed: false`, `createdAt`), push to `tasks`, call `StorageManager.saveTasks`, call `_render()`, clear input field; on failure show inline validation message
    - Implement `toggleComplete(id)`: find task by id, flip `completed`, call `StorageManager.saveTasks`, call `_render()`
    - Implement `deleteTask(id)`: filter out task by id, call `StorageManager.saveTasks`, call `_render()`
    - Implement `init(container, initialTasks)`: set `tasks = initialTasks`, inject input form HTML, wire Add button and Enter-key handler, call `_render()`
    - _Requirements: 3.1, 3.2, 3.3, 3.10, 3.11, 3.12, 3.13, 3.14, 3.15_

  - [ ]* 6.2 Write property test for TodoList — invalid task input is rejected
    - **Property 5: Invalid task input is rejected by validation**
    - **Validates: Requirements 3.3, 3.15**

  - [ ]* 6.3 Write property test for TodoList — valid task addition grows the list by exactly one
    - **Property 6: Valid task addition grows the list by exactly one**
    - **Validates: Requirements 3.2**

  - [x] 6.4 Implement TodoList inline editing
    - Implement `startEdit(id)`: replace task row's text span with an `<input>` pre-filled with current text, show Save and Cancel buttons, hide Edit and Delete buttons
    - Implement `saveEdit(id, newText)`: validate `newText`, update `task.text = newText.trim()`, call `StorageManager.saveTasks`, call `_render()`; on empty/whitespace show inline validation message and stay in edit mode
    - Implement `cancelEdit(id)`: call `_render()` to restore original view without modifying `tasks`
    - _Requirements: 3.6, 3.7, 3.8, 3.9, 3.11_

  - [ ]* 6.5 Write property test for TodoList — task completion toggle is a round-trip
    - **Property 7: Task completion toggle is a round-trip**
    - **Validates: Requirements 3.4, 3.5**

  - [ ]* 6.6 Write property test for TodoList — edit cancel restores original text
    - **Property 8: Edit cancel restores original text**
    - **Validates: Requirements 3.9**

  - [x] 6.7 Implement TodoList `_render` and `_renderTask`
    - Implement `_renderTask(task)`: create `<li>` with checkbox, text span (strikethrough when `completed`), Edit button, and Delete button; wire event handlers
    - Implement `_render()`: clear the task list container, map `tasks` to `_renderTask` results and append all; handle empty-state rendering
    - _Requirements: 3.4, 3.5, 3.12, 3.14_

- [x] 7. Checkpoint — Ensure all TodoList tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Implement QuickLinks
  - [x] 8.1 Implement QuickLinks core add/delete and URL normalization
    - Implement `_generateId()`: same pattern as TodoList
    - Implement `_normalizeUrl(url)`: if URL does not start with `http://` or `https://`, prepend `https://`; otherwise return as-is
    - Implement `_validateForm(label, url)`: return validation errors for empty label (max 50 chars), empty URL (max 2048 chars), and list-full condition (length === 50)
    - Implement `addLink(label, url)`: validate, normalize URL, create `Link` object, push to `links`, call `StorageManager.saveLinks`, call `_render()`; on failure display inline validation messages and preserve form values
    - Implement `deleteLink(id)`: filter out link by id, call `StorageManager.saveLinks`, call `_render()`
    - Implement `init(container, initialLinks)`: set `links = initialLinks`, inject form HTML with label and URL inputs, wire submit handler, call `_render()`
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9, 4.10, 4.11_

  - [ ]* 8.2 Write property test for QuickLinks — URL normalization always produces a scheme-prefixed URL
    - **Property 11: URL normalization always produces a scheme-prefixed URL**
    - **Validates: Requirements 4.5**

  - [ ]* 8.3 Write property test for QuickLinks — link count never exceeds the maximum
    - **Property 12: Quick Links count never exceeds the maximum**
    - **Validates: Requirements 4.11**

  - [x] 8.4 Implement QuickLinks `_render` and `_renderLink`
    - Implement `_renderLink(link)`: create a `<button>` that opens `link.url` in a new tab on click, plus a delete `×` control; wire event handlers
    - Implement `_render()`: clear the links container, map `links` to `_renderLink` results and append all; handle empty-state rendering
    - _Requirements: 4.6, 4.7, 4.9, 4.10_

- [x] 9. Implement App bootstrap and wire all modules
  - [x] 9.1 Implement App.init and DOMContentLoaded bootstrap
    - Implement `App.init()`: call `StorageManager.loadTasks()` and `StorageManager.loadLinks()`, then call `init()` on all four widgets passing container elements and initial data
    - Register `App.init` on `document.addEventListener('DOMContentLoaded', App.init)`
    - _Requirements: 5.7, 6.6_

- [x] 10. Implement CSS styling
  - [x] 10.1 Write base styles, CSS Grid layout, and typography
    - Implement the two-column, two-row `dashboard-grid` using CSS Grid (`grid-template-columns: 1fr 1fr`, `gap: 16px`, `padding: 16px`)
    - Set minimum font sizes: 14px body, 12px labels, 20px headings; line-height ≥ 1.4 for all text
    - Ensure minimum 16px spacing between widgets
    - _Requirements: 7.1, 7.2, 7.5, 7.6_

  - [x] 10.2 Write widget, interactive element, and toast styles
    - Style `.widget` cards with consistent visual hierarchy (heading weight/size, spacing)
    - Implement hover and focus states for all interactive elements (buttons, checkboxes, inputs, links) with a detectable color/border/background change
    - Implement toast `#toast` styles: non-blocking overlay, auto-dismiss after ≥ 3 seconds
    - Implement strikethrough style for completed tasks
    - Ensure color contrast ≥ 4.5:1 for normal text (WCAG 2.1 AA)
    - _Requirements: 7.2, 7.3, 7.4_

  - [x] 10.3 Write scrollable To-Do List container and overflow styles
    - Apply `overflow-y: auto` to the todo widget so 100+ tasks scroll without disrupting surrounding layout or causing horizontal overflow
    - _Requirements: 3.14, 7.1_

- [x] 11. Final checkpoint — Ensure all tests pass and app loads correctly
  - Ensure all tests pass, ask the user if questions arise.

---

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- All application logic lives exclusively in `js/app.js`; all styling in `css/style.css`
- Property tests (Properties 1–12) validate universal correctness guarantees defined in the design document
- Unit tests validate specific examples, edge cases, and error conditions
- Checkpoints ensure incremental validation at logical milestones

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1"] },
    { "id": 1, "tasks": ["2.1"] },
    { "id": 2, "tasks": ["2.2", "2.3", "2.4", "3.1"] },
    { "id": 3, "tasks": ["3.2", "4.1"] },
    { "id": 4, "tasks": ["4.2", "4.3", "6.1"] },
    { "id": 5, "tasks": ["6.2", "6.3", "6.4", "8.1"] },
    { "id": 6, "tasks": ["6.5", "6.6", "6.7", "8.2", "8.3", "8.4"] },
    { "id": 7, "tasks": ["9.1", "10.1"] },
    { "id": 8, "tasks": ["10.2", "10.3"] }
  ]
}
```
