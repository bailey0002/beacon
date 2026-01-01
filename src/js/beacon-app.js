/**
 * Beacon Application Module
 * Main orchestrator for the Beacon couples Bible study app
 * 
 * @module beacon-app
 */

import { 
    migrateFromLegacy, 
    getProgress, 
    saveProgress,
    markDayComplete,
    isDayComplete,
    getCompletedWeeksCount,
    getCompletedDaysCount,
    getUser, 
    saveUser,
    isUserSetUp,
    getTheme,
    saveTheme,
    getEntryCount,
    clearAllData
} from './beacon-storage.js';

import { 
    WEEKS, 
    CONTENT, 
    getWeekMeta, 
    getDayContent,
    getShortDayName 
} from './beacon-content.js';

import { 
    lookupVerse, 
    searchTopic,
    cleanVerseText 
} from './beacon-esv.js';

import { 
    initJournal,
    renderEntryList,
    openEntryEditor,
    openReflectionEditor,
    closeEntryEditor,
    saveCurrentEntry,
    exportAllEntries,
    renderPromptWithPreview,
    hasPromptContent
} from './beacon-journal.js';

// ============================================================================
// APPLICATION STATE
// ============================================================================

let currentView = 'dashboard';
let currentWeek = 1;
let currentDay = 1;

// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * Initialize the application
 */
export function initApp() {
    console.log('Beacon initializing...');
    
    // Apply saved theme
    applyTheme(getTheme());
    
    // Check if user is set up
    if (!isUserSetUp()) {
        showSetupScreen();
    } else {
        // Run data migration if needed
        const migrationResult = migrateFromLegacy();
        if (migrationResult.migrated) {
            console.log(`Migrated ${migrationResult.count} journal entries`);
        }
        
        showMainApp();
    }
    
    // Initialize event listeners
    initEventListeners();
    
    console.log('Beacon initialized');
}

/**
 * Initialize all event listeners
 */
function initEventListeners() {
    // Setup screen
    document.getElementById('start-journey-btn')?.addEventListener('click', startJourney);
    
    // Theme toggle
    document.getElementById('theme-toggle')?.addEventListener('click', toggleTheme);
    
    // Navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            navigateTo(item.dataset.nav);
        });
    });
    
    // Week card
    document.getElementById('week-card')?.addEventListener('click', openWeek);
    
    // Week view back button
    document.getElementById('week-back-btn')?.addEventListener('click', () => {
        showView('dashboard');
        updateDashboard();
    });
    
    // Complete day button
    document.getElementById('complete-day-btn')?.addEventListener('click', completeDay);
    
    // Journal actions
    document.getElementById('new-entry-card')?.addEventListener('click', () => openEntryEditor());
    document.getElementById('verse-lookup-card')?.addEventListener('click', openVerseLookup);
    document.getElementById('topic-search-card')?.addEventListener('click', openTopicSearch);
    
    // Journal modal
    document.getElementById('journal-modal-cancel')?.addEventListener('click', closeEntryEditor);
    document.getElementById('journal-modal-save')?.addEventListener('click', saveCurrentEntry);
    
    // ESV modals
    document.getElementById('esv-lookup-cancel')?.addEventListener('click', () => closeEsvModal('lookup'));
    document.getElementById('esv-lookup-btn')?.addEventListener('click', handleVerseLookup);
    document.getElementById('esv-lookup-input')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleVerseLookup();
    });
    
    document.getElementById('esv-search-cancel')?.addEventListener('click', () => closeEsvModal('search'));
    document.getElementById('esv-search-btn')?.addEventListener('click', handleTopicSearch);
    document.getElementById('esv-search-input')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleTopicSearch();
    });
    
    // Progress tab buttons
    document.getElementById('export-entries-btn')?.addEventListener('click', exportAllEntries);
    document.getElementById('reset-journey-btn')?.addEventListener('click', resetJourney);
    
    // Modal dismiss
    document.getElementById('modal-dismiss-btn')?.addEventListener('click', hideModal);
}

// ============================================================================
// SETUP & AUTHENTICATION
// ============================================================================

function showSetupScreen() {
    document.getElementById('setup-screen').style.display = 'flex';
    document.getElementById('main-app').style.display = 'none';
}

function showMainApp() {
    document.getElementById('setup-screen').style.display = 'none';
    document.getElementById('main-app').style.display = 'block';
    
    const user = getUser();
    if (user) {
        updateUserDisplay(user);
    }
    
    const progress = getProgress();
    currentWeek = progress.currentWeek;
    currentDay = progress.currentDay;
    
    updateDashboard();
    initJournal();
}

function startJourney() {
    const partner1 = document.getElementById('partner1-name')?.value.trim();
    const partner2 = document.getElementById('partner2-name')?.value.trim();
    
    if (!partner1 || !partner2) {
        alert('Please enter both names to begin.');
        return;
    }
    
    saveUser({
        partner1,
        partner2,
        startedAt: new Date().toISOString()
    });
    
    saveProgress({
        currentWeek: 1,
        currentDay: 1,
        completedDays: {},
        streak: 0,
        lastCompletedDate: null
    });
    
    showMainApp();
}

function updateUserDisplay(user) {
    const avatar1 = document.getElementById('avatar1');
    const avatar2 = document.getElementById('avatar2');
    const coupleNames = document.getElementById('couple-names');
    
    if (avatar1) avatar1.textContent = user.partner1.charAt(0).toUpperCase();
    if (avatar2) avatar2.textContent = user.partner2.charAt(0).toUpperCase();
    if (coupleNames) coupleNames.textContent = `${user.partner1} & ${user.partner2}`;
}

// ============================================================================
// THEME
// ============================================================================

function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    const label = document.getElementById('themeLabel');
    if (label) {
        label.textContent = theme === 'dark' ? '[ NOX ]' : '[ LUX ]';
    }
}

function toggleTheme() {
    const current = getTheme();
    const next = current === 'light' ? 'dark' : 'light';
    saveTheme(next);
    applyTheme(next);
}

// ============================================================================
// NAVIGATION
// ============================================================================

function navigateTo(tabName) {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.toggle('active', item.dataset.nav === tabName);
    });
    
    switch (tabName) {
        case 'dashboard':
            showView('dashboard');
            updateDashboard();
            break;
        case 'journal':
            showView('journal');
            renderEntryList();
            break;
        case 'progress':
            showView('progress');
            updateProgressView();
            break;
    }
    
    currentView = tabName;
}

function showView(viewName) {
    document.querySelectorAll('.view').forEach(view => {
        view.classList.remove('active');
    });
    
    const viewEl = document.getElementById(`view-${viewName}`);
    if (viewEl) {
        viewEl.classList.add('active');
    }
}

// ============================================================================
// DASHBOARD
// ============================================================================

function updateDashboard() {
    const progress = getProgress();
    const week = getWeekMeta(progress.currentWeek) || WEEKS[0];
    
    document.getElementById('current-week-num').textContent = progress.currentWeek;
    document.getElementById('wk-num').textContent = week.week;
    document.getElementById('wk-title').textContent = week.title;
    document.getElementById('wk-theme').textContent = week.theme;
    
    // Week progress dots
    const dotsContainer = document.getElementById('wk-dots');
    if (dotsContainer) {
        let dotsHtml = '';
        for (let d = 1; d <= 7; d++) {
            const complete = isDayComplete(week.week, d);
            const isCurrent = d === progress.currentDay && week.week === progress.currentWeek;
            dotsHtml += `<div class="progress-dot ${complete ? 'complete' : ''} ${isCurrent ? 'current' : ''}"></div>`;
        }
        dotsContainer.innerHTML = dotsHtml;
    }
    
    // Stats
    document.getElementById('stat-streak').textContent = progress.streak;
    document.getElementById('stat-weeks').textContent = getCompletedWeeksCount();
    document.getElementById('stat-entries').textContent = getEntryCount();
    
    renderCalendarGrid();
}

function renderCalendarGrid() {
    const grid = document.getElementById('calendar-grid');
    if (!grid) return;
    
    const progress = getProgress();
    let html = '';
    
    for (let w = 1; w <= 8; w++) {
        let weekComplete = true;
        for (let d = 1; d <= 7; d++) {
            if (!isDayComplete(w, d)) {
                weekComplete = false;
                break;
            }
        }
        
        const isCurrent = w === progress.currentWeek;
        html += `<div class="calendar-week ${weekComplete ? 'complete' : ''} ${isCurrent ? 'current' : ''}" data-week="${w}">${w}</div>`;
    }
    
    grid.innerHTML = html;
    
    grid.querySelectorAll('.calendar-week').forEach(el => {
        el.addEventListener('click', () => {
            openWeekView(parseInt(el.dataset.week, 10));
        });
    });
}

// ============================================================================
// WEEK VIEW
// ============================================================================

function openWeek() {
    const progress = getProgress();
    openWeekView(progress.currentWeek);
}

function openWeekView(weekNum) {
    currentWeek = weekNum;
    currentDay = 1;
    
    const week = getWeekMeta(weekNum);
    if (!week) return;
    
    showView('week');
    
    document.getElementById('week-view-num').textContent = week.week;
    document.getElementById('week-view-title').textContent = week.title;
    document.getElementById('week-view-theme').textContent = week.theme;
    
    renderDayTabs();
    renderDayContent(currentDay);
}

function renderDayTabs() {
    const container = document.getElementById('day-tabs');
    if (!container) return;
    
    let html = '';
    for (let d = 1; d <= 7; d++) {
        const complete = isDayComplete(currentWeek, d);
        const active = d === currentDay;
        html += `
            <button class="day-tab ${active ? 'active' : ''} ${complete ? 'complete' : ''}" data-day="${d}">
                ${getShortDayName(d)}
            </button>
        `;
    }
    
    container.innerHTML = html;
    
    container.querySelectorAll('.day-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            currentDay = parseInt(tab.dataset.day, 10);
            renderDayTabs();
            renderDayContent(currentDay);
        });
    });
}

function renderDayContent(dayNum) {
    const container = document.getElementById('day-content');
    if (!container) return;
    
    const content = getDayContent(currentWeek, dayNum);
    if (!content) {
        container.innerHTML = '<p>Content not available.</p>';
        return;
    }
    
    let html = `
        <h2 class="day-title">${content.title}</h2>
        
        <div class="scripture-block">
            <div class="scripture-ref">${content.scripture}</div>
            <div class="scripture-text">"${content.text}"</div>
            <div class="scripture-version">ESV</div>
        </div>
        
        <div class="devotional-text">
            ${content.devotional.split('\n\n').map(p => `<p>${p}</p>`).join('')}
        </div>
    `;
    
    // Prompts with preview
    if (content.prompts && content.prompts.length > 0) {
        html += `
            <div class="section-label">[ Reflection Prompts ]</div>
            <div class="prompts-list">
        `;
        
        content.prompts.forEach((prompt, index) => {
            html += renderPromptWithPreview(prompt, currentWeek, dayNum, index);
        });
        
        html += '</div>';
    }
    
    // Prayer
    if (content.prayer) {
        html += `
            <div class="prayer-block">
                <div class="prayer-label">Prayer</div>
                <div class="prayer-text">${content.prayer}</div>
            </div>
        `;
    }
    
    container.innerHTML = html;
    
    // Add prompt click handlers
    container.querySelectorAll('.journal-tap-target').forEach(el => {
        el.addEventListener('click', () => {
            const week = parseInt(el.dataset.week, 10);
            const day = parseInt(el.dataset.day, 10);
            const promptIndex = parseInt(el.dataset.promptIndex, 10);
            const promptText = el.dataset.promptText;
            openReflectionEditor(week, day, promptIndex, promptText);
        });
    });
    
    // Update complete button state
    updateCompleteDayButton();
}

function updateCompleteDayButton() {
    const btn = document.getElementById('complete-day-btn');
    if (!btn) return;
    
    const complete = isDayComplete(currentWeek, currentDay);
    btn.textContent = complete ? '[ Day Complete ✓ ]' : '[ Mark Day Complete ]';
    btn.disabled = complete;
    btn.classList.toggle('completed', complete);
}

function completeDay() {
    markDayComplete(currentWeek, currentDay);
    
    showModal('Day Complete', 'Great work continuing your journey together!');
    
    renderDayTabs();
    updateCompleteDayButton();
    updateDashboard();
}

// ============================================================================
// PROGRESS VIEW
// ============================================================================

function updateProgressView() {
    const progress = getProgress();
    
    document.getElementById('prog-streak').textContent = progress.streak;
    document.getElementById('prog-weeks').textContent = getCompletedWeeksCount();
    document.getElementById('prog-days').textContent = getCompletedDaysCount();
    
    // Render weeks list
    const container = document.getElementById('progress-weeks-list');
    if (!container) return;
    
    let html = '';
    WEEKS.forEach(week => {
        let daysComplete = 0;
        for (let d = 1; d <= 7; d++) {
            if (isDayComplete(week.week, d)) daysComplete++;
        }
        
        const status = daysComplete === 7 ? 'complete' : 
                      daysComplete > 0 ? 'in-progress' : 'not-started';
        
        html += `
            <div class="progress-week-item ${status}">
                <div class="progress-week-info">
                    <span class="progress-week-num">Week ${week.week}</span>
                    <span class="progress-week-title">${week.title}</span>
                </div>
                <div class="progress-week-status">${daysComplete}/7</div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

function resetJourney() {
    if (!confirm('This will reset all progress and data. Are you sure?')) return;
    if (!confirm('This cannot be undone. Really reset?')) return;
    
    clearAllData();
    location.reload();
}

// ============================================================================
// MODALS
// ============================================================================

function showModal(title, message) {
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-message').textContent = message;
    document.getElementById('modal-complete').classList.add('active');
}

function hideModal() {
    document.getElementById('modal-complete').classList.remove('active');
}

// ============================================================================
// ESV INTEGRATION UI
// ============================================================================

function openVerseLookup() {
    document.getElementById('esv-lookup-modal').classList.add('active');
    document.getElementById('esv-lookup-input').value = '';
    document.getElementById('esv-lookup-results').innerHTML = '';
    document.getElementById('esv-lookup-input').focus();
}

function openTopicSearch() {
    document.getElementById('esv-search-modal').classList.add('active');
    document.getElementById('esv-search-input').value = '';
    document.getElementById('esv-search-results').innerHTML = '';
    document.getElementById('esv-search-input').focus();
}

function closeEsvModal(type) {
    const modalId = type === 'lookup' ? 'esv-lookup-modal' : 'esv-search-modal';
    document.getElementById(modalId).classList.remove('active');
}

async function handleVerseLookup() {
    const input = document.getElementById('esv-lookup-input');
    const results = document.getElementById('esv-lookup-results');
    const reference = input.value.trim();
    
    if (!reference) return;
    
    results.innerHTML = '<div class="esv-loading">Looking up verse...</div>';
    
    const result = await lookupVerse(reference);
    
    if (result.success) {
        results.innerHTML = `
            <div class="esv-result">
                <div class="esv-result-ref">${result.reference}</div>
                <div class="esv-result-text">${result.text}</div>
            </div>
        `;
    } else {
        results.innerHTML = `<div class="esv-error">${result.error}</div>`;
    }
}

async function handleTopicSearch() {
    const input = document.getElementById('esv-search-input');
    const results = document.getElementById('esv-search-results');
    const query = input.value.trim();
    
    if (!query) return;
    
    results.innerHTML = '<div class="esv-loading">Searching...</div>';
    
    const result = await searchTopic(query);
    
    if (result.success) {
        let html = `<div class="esv-result-count">${result.totalResults} results found</div>`;
        
        result.results.forEach(r => {
            html += `
                <div class="esv-result">
                    <div class="esv-result-ref">${r.reference}</div>
                    <div class="esv-result-text">${r.content}</div>
                </div>
            `;
        });
        
        results.innerHTML = html;
    } else {
        results.innerHTML = `<div class="esv-error">${result.error}</div>`;
    }
}
