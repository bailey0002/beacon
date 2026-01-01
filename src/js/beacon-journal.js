/**
 * Beacon Journal Module
 * Handles the enhanced journal system with unified entries, filtering, and export
 * 
 * @module beacon-journal
 */

import { 
    getAllEntries, 
    getEntryById, 
    getEntriesByType,
    getEntryByContext,
    saveEntry, 
    updateEntry,
    deleteEntry,
    createEntry,
    getEntryCount
} from './beacon-storage.js';

// ============================================================================
// STATE
// ============================================================================

let currentFilter = 'all';  // 'all' | 'reflection' | 'free'
let currentEditingEntry = null;
let currentEditingContext = null;  // For new reflection entries

// ============================================================================
// FILTER FUNCTIONALITY
// ============================================================================

/**
 * Set the current filter and re-render
 * @param {string} filterType - 'all', 'reflection', or 'free'
 */
export function setFilter(filterType) {
    currentFilter = filterType;
    
    // Update filter tab UI
    const tabs = document.querySelectorAll('.filter-tab');
    tabs.forEach(tab => {
        tab.classList.toggle('active', tab.dataset.filter === filterType);
    });
    
    // Re-render entry list
    renderEntryList();
}

/**
 * Get current filter value
 * @returns {string} Current filter
 */
export function getCurrentFilter() {
    return currentFilter;
}

/**
 * Initialize filter tab listeners
 */
export function initFilterTabs() {
    const tabs = document.querySelectorAll('.filter-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            setFilter(tab.dataset.filter);
        });
    });
}

// ============================================================================
// ENTRY LIST RENDERING
// ============================================================================

/**
 * Render the journal entry list based on current filter
 */
export function renderEntryList() {
    const container = document.getElementById('journal-entries-list');
    if (!container) return;
    
    let entries = currentFilter === 'all' 
        ? getAllEntries() 
        : getEntriesByType(currentFilter);
    
    // Sort by most recently updated
    entries = entries.sort((a, b) => 
        new Date(b.updatedAt) - new Date(a.updatedAt)
    );
    
    if (entries.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <p class="empty-message">No entries yet. Start writing!</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = entries.map(entry => renderEntryCard(entry)).join('');
    
    // Add click handlers
    container.querySelectorAll('.entry-card').forEach(card => {
        card.addEventListener('click', () => {
            openEntryEditor(card.dataset.entryId);
        });
    });
}

/**
 * Render a single entry card
 * @param {Object} entry - Entry object
 * @returns {string} HTML string
 */
export function renderEntryCard(entry) {
    const preview = truncatePreview(entry.content, 100);
    const typeLabel = entry.type === 'reflection' ? '📖 Reflection' : '✏️ Free Entry';
    const typeBadgeClass = entry.type === 'reflection' ? 'badge-reflection' : 'badge-free';
    
    const createdDate = formatDate(entry.createdAt);
    const updatedDate = entry.updatedAt !== entry.createdAt 
        ? ` · Updated ${formatDate(entry.updatedAt)}` 
        : '';
    
    const contextLabel = entry.context 
        ? `Week ${entry.context.week}, Day ${entry.context.day}` 
        : '';
    
    return `
        <div class="entry-card" data-entry-id="${entry.id}">
            <div class="entry-header">
                <span class="entry-type-badge ${typeBadgeClass}">${typeLabel}</span>
                ${contextLabel ? `<span class="entry-context">${contextLabel}</span>` : ''}
            </div>
            ${entry.prompt ? `<div class="entry-prompt">${truncatePreview(entry.prompt, 60)}</div>` : ''}
            <div class="entry-preview">${preview}</div>
            <div class="entry-timestamp">${createdDate}${updatedDate}</div>
        </div>
    `;
}

// ============================================================================
// ENTRY EDITING
// ============================================================================

/**
 * Open the journal entry editor
 * @param {string|null} entryId - Entry ID to edit, or null for new entry
 */
export function openEntryEditor(entryId = null) {
    const modal = document.getElementById('journal-modal');
    const textarea = document.getElementById('journal-modal-textarea');
    const promptEl = document.getElementById('journal-modal-prompt-text');
    const labelEl = document.getElementById('journal-modal-label');
    const metaEl = document.getElementById('journal-modal-meta');
    
    if (!modal || !textarea) return;
    
    if (entryId) {
        // Edit existing entry
        const entry = getEntryById(entryId);
        if (!entry) return;
        
        currentEditingEntry = entry;
        currentEditingContext = entry.context;
        
        labelEl.textContent = entry.type === 'reflection' ? 'Edit Reflection' : 'Edit Entry';
        promptEl.textContent = entry.prompt || 'Free journal entry';
        promptEl.parentElement.style.display = entry.prompt ? 'block' : 'none';
        textarea.value = entry.content;
        
        // Show timestamps
        if (metaEl) {
            metaEl.innerHTML = `
                <div class="meta-line">Created: ${formatDate(entry.createdAt, true)}</div>
                ${entry.updatedAt !== entry.createdAt ? `<div class="meta-line">Modified: ${formatDate(entry.updatedAt, true)}</div>` : ''}
            `;
            metaEl.style.display = 'block';
        }
    } else {
        // New free entry
        currentEditingEntry = null;
        currentEditingContext = null;
        
        labelEl.textContent = 'New Entry';
        promptEl.textContent = 'What\'s on your heart today?';
        promptEl.parentElement.style.display = 'block';
        textarea.value = '';
        
        if (metaEl) {
            metaEl.style.display = 'none';
        }
    }
    
    modal.classList.add('active');
    textarea.focus();
}

/**
 * Open editor for a reflection prompt
 * @param {number} week - Week number
 * @param {number} day - Day number
 * @param {number} promptIndex - Prompt index
 * @param {string} promptText - The prompt text
 */
export function openReflectionEditor(week, day, promptIndex, promptText) {
    const modal = document.getElementById('journal-modal');
    const textarea = document.getElementById('journal-modal-textarea');
    const promptEl = document.getElementById('journal-modal-prompt-text');
    const labelEl = document.getElementById('journal-modal-label');
    const metaEl = document.getElementById('journal-modal-meta');
    
    if (!modal || !textarea) return;
    
    // Check for existing entry
    const existingEntry = getEntryByContext(week, day, promptIndex);
    
    if (existingEntry) {
        currentEditingEntry = existingEntry;
        textarea.value = existingEntry.content;
        
        if (metaEl) {
            metaEl.innerHTML = `
                <div class="meta-line">Created: ${formatDate(existingEntry.createdAt, true)}</div>
                ${existingEntry.updatedAt !== existingEntry.createdAt ? `<div class="meta-line">Modified: ${formatDate(existingEntry.updatedAt, true)}</div>` : ''}
            `;
            metaEl.style.display = 'block';
        }
    } else {
        currentEditingEntry = null;
        textarea.value = '';
        
        if (metaEl) {
            metaEl.style.display = 'none';
        }
    }
    
    currentEditingContext = { week, day, promptIndex };
    labelEl.textContent = `Week ${week}, Day ${day}`;
    promptEl.textContent = promptText;
    promptEl.parentElement.style.display = 'block';
    
    modal.classList.add('active');
    textarea.focus();
}

/**
 * Close the journal entry editor
 */
export function closeEntryEditor() {
    const modal = document.getElementById('journal-modal');
    if (modal) {
        modal.classList.remove('active');
    }
    currentEditingEntry = null;
    currentEditingContext = null;
}

/**
 * Save the current entry
 */
export function saveCurrentEntry() {
    const textarea = document.getElementById('journal-modal-textarea');
    const promptEl = document.getElementById('journal-modal-prompt-text');
    
    if (!textarea) return;
    
    const content = textarea.value.trim();
    if (!content) {
        closeEntryEditor();
        return;
    }
    
    const prompt = promptEl?.textContent || '';
    
    if (currentEditingEntry) {
        // Update existing entry
        updateEntry(currentEditingEntry.id, { content });
    } else {
        // Create new entry
        const type = currentEditingContext ? 'reflection' : 'free';
        const newEntry = createEntry(type, content, prompt, currentEditingContext);
        saveEntry(newEntry);
    }
    
    closeEntryEditor();
    renderEntryList();
    
    // Update dashboard count if visible
    const statEl = document.getElementById('stat-entries');
    if (statEl) {
        statEl.textContent = getEntryCount();
    }
}

// ============================================================================
// PROMPT PREVIEW (FOR WEEK VIEW)
// ============================================================================

/**
 * Get preview text for a reflection prompt
 * @param {number} week - Week number
 * @param {number} day - Day number
 * @param {number} promptIndex - Prompt index
 * @returns {string|null} Preview text or null if no entry
 */
export function getPromptPreview(week, day, promptIndex) {
    const entry = getEntryByContext(week, day, promptIndex);
    return entry ? truncatePreview(entry.content, 50) : null;
}

/**
 * Check if a prompt has saved content
 * @param {number} week - Week number
 * @param {number} day - Day number
 * @param {number} promptIndex - Prompt index
 * @returns {boolean} True if entry exists
 */
export function hasPromptContent(week, day, promptIndex) {
    return !!getEntryByContext(week, day, promptIndex);
}

/**
 * Render a prompt item with preview (for week view)
 * @param {string} promptText - The prompt text
 * @param {number} week - Week number
 * @param {number} day - Day number  
 * @param {number} promptIndex - Prompt index
 * @returns {string} HTML string
 */
export function renderPromptWithPreview(promptText, week, day, promptIndex) {
    const hasContent = hasPromptContent(week, day, promptIndex);
    const preview = hasContent ? getPromptPreview(week, day, promptIndex) : null;
    
    return `
        <div class="journal-tap-target ${hasContent ? 'has-content' : ''}" 
             data-week="${week}" 
             data-day="${day}" 
             data-prompt-index="${promptIndex}"
             data-prompt-text="${promptText.replace(/"/g, '&quot;')}">
            <div class="tap-content">
                <div class="prompt-text">${promptText}</div>
                ${preview ? `<div class="tap-preview">${preview}</div>` : ''}
            </div>
            <div class="tap-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 20h9"></path>
                    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                </svg>
            </div>
        </div>
    `;
}

// ============================================================================
// EXPORT FUNCTIONALITY
// ============================================================================

/**
 * Export all entries to Markdown file
 */
export function exportAllEntries() {
    const entries = getAllEntries();
    
    if (entries.length === 0) {
        alert('No entries to export yet.');
        return;
    }
    
    const sortedEntries = entries.sort(
        (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)
    );
    
    let markdown = `# Beacon Journal Export\n\n`;
    markdown += `**Exported:** ${new Date().toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    })}\n`;
    markdown += `**Total Entries:** ${entries.length}\n\n`;
    markdown += `---\n\n`;
    
    for (const entry of sortedEntries) {
        const typeEmoji = entry.type === 'reflection' ? '📖' : '✏️';
        const typeLabel = entry.type === 'reflection' ? 'Reflection' : 'Free Entry';
        
        markdown += `## ${typeEmoji} ${typeLabel}\n\n`;
        markdown += `**Created:** ${formatDate(entry.createdAt, true)}`;
        
        if (entry.updatedAt !== entry.createdAt) {
            markdown += ` | **Modified:** ${formatDate(entry.updatedAt, true)}`;
        }
        markdown += `\n\n`;
        
        if (entry.context) {
            markdown += `*Week ${entry.context.week}, Day ${entry.context.day}*\n\n`;
        }
        
        if (entry.prompt) {
            markdown += `**Prompt:** ${entry.prompt}\n\n`;
        }
        
        markdown += `${entry.content}\n\n`;
        markdown += `---\n\n`;
    }
    
    // Add footer
    markdown += `\n*Exported from Beacon - Couples Bible Study*\n`;
    markdown += `*Grey Stratum · Cadencia Protocol*\n`;
    
    // Trigger download
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `beacon-journal-${new Date().toISOString().split('T')[0]}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Format a date for display
 * @param {string} isoString - ISO date string
 * @param {boolean} includeTime - Whether to include time
 * @returns {string} Formatted date
 */
export function formatDate(isoString, includeTime = false) {
    const date = new Date(isoString);
    const options = {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    };
    
    if (includeTime) {
        options.hour = 'numeric';
        options.minute = '2-digit';
    }
    
    return date.toLocaleDateString('en-US', options);
}

/**
 * Truncate text for preview
 * @param {string} text - Full text
 * @param {number} maxLength - Maximum length
 * @returns {string} Truncated text with ellipsis if needed
 */
export function truncatePreview(text, maxLength = 100) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + '...';
}

/**
 * Get entry count (re-exported for convenience)
 * @returns {number} Total entry count
 */
export { getEntryCount };

// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * Initialize the journal module
 */
export function initJournal() {
    initFilterTabs();
    renderEntryList();
}
