"use strict";

const STORAGE_KEY = "focusforge-state-v1";
const DEFAULT_FOCUS_MINUTES = 25;
const DEFAULT_BREAK_MINUTES = 5;
const TIMER_CIRCUMFERENCE = 2 * Math.PI * 99;

const starterTasks = [
    { id: "starter-html", title: "Review my HTML notes", subject: "HTML", done: false },
    { id: "starter-css", title: "Practise one CSS layout", subject: "CSS", done: false },
    { id: "starter-break", title: "Take a proper screen break", subject: "Personal", done: false }
];

const get = (id) => document.getElementById(id);
const elements = {
    todayLabel: get("today-label"),
    welcomeDate: get("welcome-date"),
    profileName: get("profile-name"),
    profileButton: get("profile-button"),
    avatar: document.querySelector(".avatar"),
    themeButton: get("theme-button"),
    tasksDone: get("tasks-done"),
    tasksTotalLabel: get("tasks-total-label"),
    tasksLeft: get("tasks-left"),
    progressPercentCard: get("task-progress-percent-card"),
    taskProgressCopy: get("task-progress-copy"),
    taskProgressPercent: get("task-progress-percent"),
    taskProgressBar: get("task-progress-bar"),
    taskProgressFill: get("task-progress-fill"),
    taskList: get("task-list"),
    emptyState: get("empty-state"),
    navTaskCount: get("nav-task-count"),
    focusMinutes: get("focus-minutes"),
    dayStreak: get("day-streak"),
    streakUnit: get("streak-unit"),
    weekTotal: get("week-total"),
    weekChart: get("week-chart"),
    timerDisplay: get("timer-display"),
    timerStatus: get("timer-status"),
    timerModeLabel: get("timer-mode-label"),
    timerRing: get("timer-ring-progress"),
    timerStart: get("timer-start"),
    timerReset: get("timer-reset"),
    modeButtons: document.querySelectorAll(".mode-button[data-mode]"),
    timerSettingsButton: get("open-timer-settings"),
    timerSettingsDialog: get("timer-settings-dialog"),
    timerSettingsForm: get("timer-settings-form"),
    focusDurationInput: get("focus-duration"),
    breakDurationInput: get("break-duration"),
    notificationsButton: get("notifications-toggle"),
    notificationsStatus: get("notifications-status"),
    closeTimerSettings: get("close-timer-settings"),
    taskDialog: get("task-dialog"),
    taskForm: get("task-form"),
    taskTitle: get("task-title"),
    openTaskDialog: get("open-task-dialog"),
    closeTaskDialog: get("close-task-dialog"),
    cancelTask: get("cancel-task"),
    nameDialog: get("name-dialog"),
    nameForm: get("name-form"),
    nameInput: get("name-input"),
    closeNameDialog: get("close-name-dialog"),
    cancelName: get("cancel-name"),
    toast: get("toast")
};

function localDateKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function createDefaultState() {
    return {
        name: "Student",
        theme: "light",
        focusDurationMinutes: DEFAULT_FOCUS_MINUTES,
        breakDurationMinutes: DEFAULT_BREAK_MINUTES,
        notificationsEnabled: false,
        tasks: starterTasks.map((task) => ({ ...task })),
        completedSessions: {},
        focusMinutes: {},
        streakDays: []
    };
}

function loadState() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (!saved) return createDefaultState();

        const parsed = JSON.parse(saved);
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
            throw new Error("Saved study data must be an object.");
        }

        return {
            ...createDefaultState(),
            ...parsed,
            name: typeof parsed.name === "string" ? parsed.name.slice(0, 32) : "Student",
            theme: parsed.theme === "dark" ? "dark" : "light",
            focusDurationMinutes: Number.isInteger(parsed.focusDurationMinutes) &&
                parsed.focusDurationMinutes >= 1 && parsed.focusDurationMinutes <= 180
                ? parsed.focusDurationMinutes
                : DEFAULT_FOCUS_MINUTES,
            breakDurationMinutes: Number.isInteger(parsed.breakDurationMinutes) &&
                parsed.breakDurationMinutes >= 1 && parsed.breakDurationMinutes <= 60
                ? parsed.breakDurationMinutes
                : DEFAULT_BREAK_MINUTES,
            notificationsEnabled: parsed.notificationsEnabled === true,
            tasks: Array.isArray(parsed.tasks)
                ? parsed.tasks.filter((task) =>
                    task &&
                    typeof task.id === "string" &&
                    typeof task.title === "string" &&
                    typeof task.subject === "string" &&
                    typeof task.done === "boolean"
                )
                : createDefaultState().tasks,
            completedSessions: parsed.completedSessions && typeof parsed.completedSessions === "object"
                ? parsed.completedSessions
                : {},
            focusMinutes: parsed.focusMinutes && typeof parsed.focusMinutes === "object"
                ? parsed.focusMinutes
                : {},
            streakDays: Array.isArray(parsed.streakDays)
                ? parsed.streakDays.filter((day) => typeof day === "string")
                : []
        };
    } catch (error) {
        console.error("Could not read saved FocusForge progress:", error);
        return createDefaultState();
    }
}

let state = loadState();
let activeMode = "focus";
let timerDuration = DEFAULT_FOCUS_MINUTES * 60;
let remainingSeconds = timerDuration;
let timerInterval = null;
let toastTimeout = null;

function showToast(message) {
    if (!elements.toast) return;
    elements.toast.textContent = message;
    elements.toast.classList.add("is-visible");
    window.clearTimeout(toastTimeout);
    toastTimeout = window.setTimeout(() => elements.toast.classList.remove("is-visible"), 2600);
}

function saveState() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
        console.error("Could not save FocusForge progress:", error);
        showToast("Your browser could not save this update.");
    }
}

function updateDate() {
    const today = new Date();
    if (elements.todayLabel) {
        elements.todayLabel.textContent = new Intl.DateTimeFormat(undefined, {
            weekday: "short",
            month: "short",
            day: "numeric"
        }).format(today);
    }
    if (elements.welcomeDate) {
        elements.welcomeDate.textContent = new Intl.DateTimeFormat(undefined, {
            month: "short",
            day: "numeric"
        }).format(today);
    }
}

function applyTheme() {
    document.body.dataset.theme = state.theme;
    if (!elements.themeButton) return;
    const label = state.theme === "light" ? "Switch to dark theme" : "Switch to light theme";
    elements.themeButton.setAttribute("aria-label", label);
    elements.themeButton.title = label;
}

function renderProfile() {
    if (elements.profileName) elements.profileName.textContent = state.name;
    if (elements.avatar) elements.avatar.textContent = state.name.trim().charAt(0).toUpperCase() || "S";
}

function createTaskRow(task) {
    const row = document.createElement("div");
    row.className = `task-row${task.done ? " is-complete" : ""}`;

    const checkbox = document.createElement("button");
    checkbox.className = "task-check";
    checkbox.type = "button";
    checkbox.setAttribute("aria-label", task.done ? `Mark ${task.title} as not done` : `Complete ${task.title}`);
    checkbox.setAttribute("aria-pressed", String(task.done));
    checkbox.textContent = task.done ? "✓" : "";
    checkbox.addEventListener("click", () => toggleTask(task.id));

    const title = document.createElement("span");
    title.className = "task-name";
    title.textContent = task.title;

    const tag = document.createElement("span");
    tag.className = "task-tag";
    tag.textContent = task.subject;

    const remove = document.createElement("button");
    remove.className = "task-delete";
    remove.type = "button";
    remove.setAttribute("aria-label", `Remove ${task.title}`);
    remove.textContent = "×";
    remove.addEventListener("click", () => removeTask(task.id));

    row.append(checkbox, title, tag, remove);
    return row;
}

function renderTasks() {
    const completed = state.tasks.filter((task) => task.done).length;
    const total = state.tasks.length;
    const remaining = total - completed;
    const percent = total ? Math.round((completed / total) * 100) : 0;

    if (elements.taskList) elements.taskList.replaceChildren(...state.tasks.map(createTaskRow));
    if (elements.emptyState) elements.emptyState.hidden = total !== 0;
    if (elements.tasksDone) elements.tasksDone.textContent = String(completed);
    if (elements.tasksTotalLabel) elements.tasksTotalLabel.textContent = `/ ${total}`;
    if (elements.tasksLeft) elements.tasksLeft.textContent = String(remaining);
    if (elements.navTaskCount) elements.navTaskCount.textContent = String(remaining);
    if (elements.taskProgressPercent) elements.taskProgressPercent.textContent = `${percent}%`;
    if (elements.progressPercentCard) elements.progressPercentCard.textContent = `${percent}%`;
    if (elements.taskProgressBar) elements.taskProgressBar.setAttribute("aria-valuenow", String(percent));
    if (elements.taskProgressFill) elements.taskProgressFill.style.width = `${percent}%`;

    if (elements.taskProgressCopy) {
        if (!total) elements.taskProgressCopy.textContent = "Add a task to get started";
        else if (completed === total) elements.taskProgressCopy.textContent = "Everything on your list is done!";
        else if (completed === 0) elements.taskProgressCopy.textContent = "You’re just getting started";
        else elements.taskProgressCopy.textContent = `${remaining} little step${remaining === 1 ? "" : "s"} to go`;
    }
}

function dateOffsetKey(daysAgo) {
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    return localDateKey(date);
}

function currentStreak() {
    const days = new Set(state.streakDays);
    const start = days.has(localDateKey(new Date())) ? 0 : 1;
    let streak = 0;
    for (let offset = start; days.has(dateOffsetKey(offset)); offset += 1) streak += 1;
    return streak;
}

function renderStats() {
    const today = localDateKey(new Date());
    const minutes = Number(state.focusMinutes[today]) || 0;
    const streak = currentStreak();

    if (elements.focusMinutes) elements.focusMinutes.textContent = String(minutes);
    if (elements.dayStreak) elements.dayStreak.textContent = String(streak);
    if (elements.streakUnit) elements.streakUnit.textContent = streak === 1 ? "day" : "days";
    renderWeekChart();
}

function renderWeekChart() {
    if (!elements.weekChart) return;
    const days = [];
    for (let offset = 6; offset >= 0; offset -= 1) {
        const date = new Date();
        date.setDate(date.getDate() - offset);
        const key = localDateKey(date);
        days.push({
            label: new Intl.DateTimeFormat(undefined, { weekday: "short" }).format(date).slice(0, 2),
            minutes: Number(state.focusMinutes[key]) || 0,
            isToday: offset === 0
        });
    }

    const maxMinutes = Math.max(...days.map((day) => day.minutes), 30);
    const weekMinutes = days.reduce((total, day) => total + day.minutes, 0);
    if (elements.weekTotal) elements.weekTotal.textContent = String(weekMinutes);
    elements.weekChart.replaceChildren();

    for (const day of days) {
        const column = document.createElement("div");
        column.className = `day-column${day.isToday ? " is-today" : ""}`;
        const barArea = document.createElement("div");
        barArea.className = "day-bar-area";
        const bar = document.createElement("div");
        bar.className = "day-bar";
        bar.style.height = day.minutes ? `${Math.max(5, Math.round((day.minutes / maxMinutes) * 100))}%` : "3px";
        bar.setAttribute("aria-label", `${day.minutes} focused minutes`);
        barArea.append(bar);
        const label = document.createElement("span");
        label.className = "day-label";
        label.textContent = day.label;
        column.append(barArea, label);
        elements.weekChart.append(column);
    }
}

function toggleTask(id) {
    const task = state.tasks.find((item) => item.id === id);
    if (!task) return;
    task.done = !task.done;
    saveState();
    renderTasks();
    if (task.done) showToast("Nice work. One more step in the right direction.");
}

function removeTask(id) {
    state.tasks = state.tasks.filter((task) => task.id !== id);
    saveState();
    renderTasks();
    showToast("Task removed from today’s list.");
}

function addTask(event) {
    event.preventDefault();
    const title = elements.taskTitle.value.trim();
    if (!title) {
        elements.taskTitle.focus();
        return;
    }
    const subject = get("task-subject").value;
    state.tasks.push({
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        title,
        subject,
        done: false
    });
    saveState();
    renderTasks();
    elements.taskForm.reset();
    elements.taskDialog.close();
    showToast("Task added. You’ve got this.");
}

function updateTimerFace() {
    if (!elements.timerDisplay) return;
    const minutes = Math.floor(remainingSeconds / 60);
    const seconds = remainingSeconds % 60;
    elements.timerDisplay.textContent = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    const progress = 1 - remainingSeconds / timerDuration;
    if (elements.timerRing) {
        elements.timerRing.style.strokeDasharray = String(TIMER_CIRCUMFERENCE);
        elements.timerRing.style.strokeDashoffset = String(TIMER_CIRCUMFERENCE * progress);
    }
}

function getTimerDuration(mode) {
    const minutes = mode === "focus" ? state.focusDurationMinutes : state.breakDurationMinutes;
    return minutes * 60;
}

function renderTimerSettings() {
    if (elements.focusDurationInput) elements.focusDurationInput.value = String(state.focusDurationMinutes);
    if (elements.breakDurationInput) elements.breakDurationInput.value = String(state.breakDurationMinutes);
    if (!elements.notificationsButton || !elements.notificationsStatus) return;

    if (!("Notification" in window)) {
        elements.notificationsButton.disabled = true;
        elements.notificationsButton.textContent = "Notifications unavailable";
        elements.notificationsButton.setAttribute("aria-pressed", "false");
        elements.notificationsStatus.textContent = "This browser does not support desktop notifications. In-app messages will still appear.";
        return;
    }

    if (Notification.permission === "denied") {
        elements.notificationsButton.disabled = true;
        elements.notificationsButton.textContent = "Notifications blocked by browser";
        elements.notificationsButton.setAttribute("aria-pressed", "false");
        elements.notificationsStatus.textContent = "Change this site's browser permissions to allow notifications.";
        return;
    }

    elements.notificationsButton.disabled = false;
    elements.notificationsButton.textContent = state.notificationsEnabled
        ? "Turn off completion notifications"
        : "Enable completion notifications";
    elements.notificationsButton.setAttribute("aria-pressed", String(state.notificationsEnabled));
    elements.notificationsStatus.textContent = state.notificationsEnabled
        ? "You’ll be notified when a focus or break timer ends."
        : "Optional: allow notifications when a timer ends.";
}

function openTimerSettings() {
    if (timerInterval !== null) {
        showToast("Pause the timer before changing its duration.");
        return;
    }
    renderTimerSettings();
    elements.timerSettingsDialog.showModal();
    elements.focusDurationInput.focus();
}

function saveTimerSettings(event) {
    event.preventDefault();
    const focusMinutes = elements.focusDurationInput.valueAsNumber;
    const breakMinutes = elements.breakDurationInput.valueAsNumber;
    if (!Number.isInteger(focusMinutes) || focusMinutes < 1 || focusMinutes > 180 ||
        !Number.isInteger(breakMinutes) || breakMinutes < 1 || breakMinutes > 60) {
        showToast("Enter a focus time from 1–180 and a break from 1–60 minutes.");
        return;
    }

    state.focusDurationMinutes = focusMinutes;
    state.breakDurationMinutes = breakMinutes;
    saveState();
    setTimerMode(activeMode);
    closeDialog(elements.timerSettingsDialog);
    showToast("Timer settings saved.");
}

async function toggleNotifications() {
    if (!("Notification" in window)) {
        showToast("This browser does not support desktop notifications.");
        return;
    }

    if (state.notificationsEnabled) {
        state.notificationsEnabled = false;
        saveState();
        renderTimerSettings();
        showToast("Timer notifications turned off.");
        return;
    }

    let permission = Notification.permission;
    if (permission !== "granted" && typeof Notification.requestPermission === "function") {
        try {
            permission = await Notification.requestPermission();
        } catch (error) {
            console.error("Could not request notification permission:", error);
            showToast("Your browser could not request notification permission.");
            return;
        }
    }

    state.notificationsEnabled = permission === "granted";
    saveState();
    renderTimerSettings();
    showToast(state.notificationsEnabled
        ? "Timer notifications are on."
        : "Notifications weren't enabled. Check your browser permissions.");
}

function notifyTimerComplete(mode) {
    if (!state.notificationsEnabled || !("Notification" in window) || Notification.permission !== "granted") return;
    const title = mode === "focus" ? "Focus session complete" : "Break complete";
    const focusDuration = state.focusDurationMinutes;
    const body = mode === "focus"
        ? `You focused for ${focusDuration} ${focusDuration === 1 ? "minute" : "minutes"}. Time for a break.`
        : "Your break is over. Ready for another focus session?";
    try {
        new Notification(title, { body });
    } catch (error) {
        console.error("Could not show timer completion notification:", error);
        showToast("Your browser couldn't show the completion notification.");
    }
}

function pauseTimer() {
    if (timerInterval !== null) {
        window.clearInterval(timerInterval);
        timerInterval = null;
    }
}

function setTimerMode(mode) {
    pauseTimer();
    activeMode = mode;
    timerDuration = getTimerDuration(mode);
    remainingSeconds = timerDuration;
    if (elements.timerModeLabel) elements.timerModeLabel.textContent = mode === "focus" ? "FOCUS SESSION" : "SHORT BREAK";
    if (elements.timerStatus) elements.timerStatus.textContent = "Ready to begin";
    if (elements.timerStart) elements.timerStart.innerHTML = "<span aria-hidden=\"true\">▶</span> Start focus";
    for (const button of elements.modeButtons) {
        const selected = button.dataset.mode === mode;
        button.classList.toggle("is-selected", selected);
        button.setAttribute("aria-pressed", String(selected));
        const label = button.querySelector("span");
        if (label) {
            const minutes = button.dataset.mode === "focus" ? state.focusDurationMinutes : state.breakDurationMinutes;
            label.textContent = `${minutes}m`;
        }
    }
    updateTimerFace();
}

function completeFocusSession() {
    if (activeMode !== "focus") {
        showToast("Break complete. You’re ready for another round.");
        return;
    }

    const today = localDateKey(new Date());
    state.focusMinutes[today] = (Number(state.focusMinutes[today]) || 0) + state.focusDurationMinutes;
    state.completedSessions[today] = (Number(state.completedSessions[today]) || 0) + 1;
    if (!state.streakDays.includes(today)) state.streakDays.push(today);
    saveState();
    renderStats();
    showToast("Focus session complete. Take a short break.");
}

function startTimer() {
    if (timerInterval !== null) {
        pauseTimer();
        elements.timerStart.innerHTML = "<span aria-hidden=\"true\">▶</span> Resume focus";
        elements.timerStatus.textContent = "Paused. Pick it up when you’re ready.";
        return;
    }

    elements.timerStart.innerHTML = "<span aria-hidden=\"true\">Ⅱ</span> Pause session";
    elements.timerStatus.textContent = activeMode === "focus" ? "You’re in your focus zone" : "Take a breath";
    timerInterval = window.setInterval(() => {
        remainingSeconds -= 1;
        updateTimerFace();
        if (remainingSeconds <= 0) {
            pauseTimer();
            elements.timerStatus.textContent = "Session complete";
            notifyTimerComplete(activeMode);
            completeFocusSession();
            setTimerMode(activeMode === "focus" ? "break" : "focus");
        }
    }, 1000);
}

function resetTimer() {
    pauseTimer();
    remainingSeconds = timerDuration;
    if (elements.timerStart) elements.timerStart.innerHTML = "<span aria-hidden=\"true\">▶</span> Start focus";
    if (elements.timerStatus) elements.timerStatus.textContent = "Ready to begin";
    updateTimerFace();
}

function closeDialog(dialog) {
    if (dialog?.open) dialog.close();
}

function saveName(event) {
    event.preventDefault();
    const name = elements.nameInput.value.trim();
    if (!name) {
        elements.nameInput.focus();
        return;
    }
    state.name = name;
    saveState();
    renderProfile();
    closeDialog(elements.nameDialog);
    showToast(`Welcome to your study space, ${name}.`);
}

function initialize() {
    applyTheme();
    renderProfile();
    updateDate();
    renderTasks();
    renderStats();
    renderTimerSettings();
    setTimerMode(activeMode);
    updateTimerFace();

    elements.themeButton?.addEventListener("click", () => {
        state.theme = state.theme === "light" ? "dark" : "light";
        saveState();
        applyTheme();
    });

    elements.openTaskDialog?.addEventListener("click", () => {
        elements.taskDialog.showModal();
        elements.taskTitle.focus();
    });
    elements.closeTaskDialog?.addEventListener("click", () => closeDialog(elements.taskDialog));
    elements.cancelTask?.addEventListener("click", () => closeDialog(elements.taskDialog));
    elements.taskForm?.addEventListener("submit", addTask);

    elements.profileButton?.addEventListener("click", () => {
        elements.nameInput.value = state.name === "Student" ? "" : state.name;
        elements.nameDialog.showModal();
        elements.nameInput.focus();
    });
    elements.closeNameDialog?.addEventListener("click", () => closeDialog(elements.nameDialog));
    elements.cancelName?.addEventListener("click", () => closeDialog(elements.nameDialog));
    elements.nameForm?.addEventListener("submit", saveName);

    elements.timerStart?.addEventListener("click", startTimer);
    elements.timerReset?.addEventListener("click", resetTimer);
    elements.timerSettingsButton?.addEventListener("click", openTimerSettings);
    elements.closeTimerSettings?.addEventListener("click", () => closeDialog(elements.timerSettingsDialog));
    elements.timerSettingsForm?.addEventListener("submit", saveTimerSettings);
    elements.notificationsButton?.addEventListener("click", toggleNotifications);
    for (const button of elements.modeButtons) {
        button.addEventListener("click", () => setTimerMode(button.dataset.mode));
    }

    window.setInterval(updateDate, 60_000);
}

initialize();
