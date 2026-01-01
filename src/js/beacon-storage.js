/**
 * Beacon Storage Module
 * Handles all localStorage operations, data schemas, and migration
 * 
 * @module beacon-storage
 */

// ============================================================================
// STORAGE KEYS
// ============================================================================

export const STORAGE_KEYS = {
    ENTRIES: 'beacon_entries',
    PROGRESS: 'beacon_progress',
    USER: 'beacon_user',
    THEME: 'beacon_theme',
    // Legacy keys for migration
    LEGACY_JOURNALS: 'beacon_journals',
    LEGACY_JOURNALS_ARCHIVED: 'beacon_journals_archived'
};

// ============================================================================
// ENTRY SCHEMA & FACTORY
// ============================================================================

/**
 * Generate a UUID for entry identification
 * @returns {string} UUID string
 */
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

/**
 * Create a new entry object with full metadata
 * @param {string} type - Entry type: 'reflection' or 'free'
 * @param {string} content - The user's text content
 * @param {string} prompt - The prompt text (for reflections) or title (for free)
 * @param {Object|null} context - Context object for reflections: { week, day, promptIndex }
 * @returns {Object} New entry object
 */
export function createEntry(type, content, prompt, context = null) {
    const now = new Date().toISOString();
    return {
        id: generateUUID(),
        type: type,           // 'reflection' | 'free'
        content: content,
        prompt: prompt,
        context: context,     // { week, day, promptIndex } for reflections, null for free
        createdAt: now,
        updatedAt: now
    };
}

// ============================================================================
// ENTRIES CRUD OPERATIONS
// ============================================================================

/**
 * Get all entries from storage
 * @returns {Array} Array of entry objects
 */
export function getAllEntries() {
    try {
        const stored = localStorage.getItem(STORAGE_KEYS.ENTRIES);
        return stored ? JSON.parse(stored) : [];
    } catch (error) {
        console.error('Error reading entries:', error);
        return [];
    }
}

/**
 * Get a single entry by ID
 * @param {string} id - Entry UUID
 * @returns {Object|null} Entry object or null if not found
 */
export function getEntryById(id) {
    const entries = getAllEntries();
    return entries.find(entry => entry.id === id) || null;
}

/**
 * Get entries filtered by type
 * @param {string} type - 'reflection' or 'free'
 * @returns {Array} Filtered array of entries
 */
export function getEntriesByType(type) {
    const entries = getAllEntries();
    return entries.filter(entry => entry.type === type);
}

/**
 * Get entry by context (for reflection prompts)
 * @param {number} week - Week number
 * @param {number} day - Day number
 * @param {number} promptIndex - Prompt index within the day
 * @returns {Object|null} Entry object or null if not found
 */
export function getEntryByContext(week, day, promptIndex) {
    const entries = getAllEntries();
    return entries.find(entry => 
        entry.context &&
        entry.context.week === week &&
        entry.context.day === day &&
        entry.context.promptIndex === promptIndex
    ) || null;
}

/**
 * Save a new entry to storage
 * @param {Object} entry - Entry object to save
 * @returns {Object} The saved entry
 */
export function saveEntry(entry) {
    try {
        const entries = getAllEntries();
        entries.push(entry);
        localStorage.setItem(STORAGE_KEYS.ENTRIES, JSON.stringify(entries));
        return entry;
    } catch (error) {
        console.error('Error saving entry:', error);
        throw error;
    }
}

/**
 * Update an existing entry
 * @param {string} id - Entry UUID
 * @param {Object} updates - Object with fields to update
 * @returns {Object|null} Updated entry or null if not found
 */
export function updateEntry(id, updates) {
    try {
        const entries = getAllEntries();
        const index = entries.findIndex(entry => entry.id === id);
        
        if (index === -1) {
            return null;
        }
        
        entries[index] = {
            ...entries[index],
            ...updates,
            updatedAt: new Date().toISOString()
        };
        
        localStorage.setItem(STORAGE_KEYS.ENTRIES, JSON.stringify(entries));
        return entries[index];
    } catch (error) {
        console.error('Error updating entry:', error);
        throw error;
    }
}

/**
 * Delete an entry by ID
 * @param {string} id - Entry UUID
 * @returns {boolean} True if deleted, false if not found
 */
export function deleteEntry(id) {
    try {
        const entries = getAllEntries();
        const filteredEntries = entries.filter(entry => entry.id !== id);
        
        if (filteredEntries.length === entries.length) {
            return false; // Entry not found
        }
        
        localStorage.setItem(STORAGE_KEYS.ENTRIES, JSON.stringify(filteredEntries));
        return true;
    } catch (error) {
        console.error('Error deleting entry:', error);
        throw error;
    }
}

/**
 * Get count of all entries
 * @returns {number} Total entry count
 */
export function getEntryCount() {
    return getAllEntries().length;
}

// ============================================================================
// PROGRESS TRACKING
// ============================================================================

/**
 * Get progress data
 * @returns {Object} Progress object
 */
export function getProgress() {
    try {
        const stored = localStorage.getItem(STORAGE_KEYS.PROGRESS);
        return stored ? JSON.parse(stored) : {
            currentWeek: 1,
            currentDay: 1,
            completedDays: {},
            streak: 0,
            lastCompletedDate: null
        };
    } catch (error) {
        console.error('Error reading progress:', error);
        return {
            currentWeek: 1,
            currentDay: 1,
            completedDays: {},
            streak: 0,
            lastCompletedDate: null
        };
    }
}

/**
 * Save progress data
 * @param {Object} progress - Progress object to save
 */
export function saveProgress(progress) {
    try {
        localStorage.setItem(STORAGE_KEYS.PROGRESS, JSON.stringify(progress));
    } catch (error) {
        console.error('Error saving progress:', error);
        throw error;
    }
}

/**
 * Mark a day as complete
 * @param {number} week - Week number
 * @param {number} day - Day number
 * @returns {Object} Updated progress object
 */
export function markDayComplete(week, day) {
    const progress = getProgress();
    const key = `${week}-${day}`;
    
    if (!progress.completedDays[key]) {
        progress.completedDays[key] = new Date().toISOString();
        
        // Update streak logic
        const today = new Date().toDateString();
        const lastDate = progress.lastCompletedDate ? new Date(progress.lastCompletedDate).toDateString() : null;
        
        if (lastDate === today) {
            // Already completed something today, streak unchanged
        } else if (lastDate === new Date(Date.now() - 86400000).toDateString()) {
            // Completed yesterday, increment streak
            progress.streak++;
        } else {
            // Streak broken, reset to 1
            progress.streak = 1;
        }
        
        progress.lastCompletedDate = new Date().toISOString();
        
        // Advance current position if this was the current day
        if (week === progress.currentWeek && day === progress.currentDay) {
            if (day < 7) {
                progress.currentDay = day + 1;
            } else {
                progress.currentWeek = week + 1;
                progress.currentDay = 1;
            }
        }
        
        saveProgress(progress);
    }
    
    return progress;
}

/**
 * Check if a day is complete
 * @param {number} week - Week number
 * @param {number} day - Day number
 * @returns {boolean} True if complete
 */
export function isDayComplete(week, day) {
    const progress = getProgress();
    return !!progress.completedDays[`${week}-${day}`];
}

/**
 * Get count of completed weeks
 * @returns {number} Number of fully completed weeks
 */
export function getCompletedWeeksCount() {
    const progress = getProgress();
    let completedWeeks = 0;
    
    for (let week = 1; week <= 8; week++) {
        let weekComplete = true;
        for (let day = 1; day <= 7; day++) {
            if (!progress.completedDays[`${week}-${day}`]) {
                weekComplete = false;
                break;
            }
        }
        if (weekComplete) completedWeeks++;
    }
    
    return completedWeeks;
}

/**
 * Get count of total completed days
 * @returns {number} Total completed days
 */
export function getCompletedDaysCount() {
    const progress = getProgress();
    return Object.keys(progress.completedDays).length;
}

// ============================================================================
// USER DATA
// ============================================================================

/**
 * Get user data (partner names, etc.)
 * @returns {Object|null} User data object or null
 */
export function getUser() {
    try {
        const stored = localStorage.getItem(STORAGE_KEYS.USER);
        return stored ? JSON.parse(stored) : null;
    } catch (error) {
        console.error('Error reading user:', error);
        return null;
    }
}

/**
 * Save user data
 * @param {Object} userData - User data to save
 */
export function saveUser(userData) {
    try {
        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(userData));
    } catch (error) {
        console.error('Error saving user:', error);
        throw error;
    }
}

/**
 * Check if user is set up
 * @returns {boolean} True if user data exists
 */
export function isUserSetUp() {
    const user = getUser();
    return user && user.partner1 && user.partner2;
}

// ============================================================================
// THEME
// ============================================================================

/**
 * Get saved theme preference
 * @returns {string} 'light' or 'dark'
 */
export function getTheme() {
    return localStorage.getItem(STORAGE_KEYS.THEME) || 'light';
}

/**
 * Save theme preference
 * @param {string} theme - 'light' or 'dark'
 */
export function saveTheme(theme) {
    localStorage.setItem(STORAGE_KEYS.THEME, theme);
}

// ============================================================================
// DATA MIGRATION
// ============================================================================

/**
 * Check if legacy journal data exists
 * @returns {boolean} True if legacy data exists
 */
export function hasLegacyData() {
    return !!localStorage.getItem(STORAGE_KEYS.LEGACY_JOURNALS);
}

/**
 * Parse context from legacy journal key
 * @param {string} key - Legacy key format like "1-2-0" (week-day-promptIndex)
 * @returns {Object|null} Context object or null for free entries
 */
function parseContextFromLegacyKey(key) {
    // Legacy format: "week-day-promptIndex" for reflections
    const parts = key.split('-');
    if (parts.length === 3) {
        return {
            week: parseInt(parts[0], 10),
            day: parseInt(parts[1], 10),
            promptIndex: parseInt(parts[2], 10)
        };
    }
    return null;
}

/**
 * Migrate legacy journals data to new entries format
 * @returns {Object} Migration result { migrated: boolean, count: number, error?: string }
 */
export function migrateFromLegacy() {
    const legacyData = localStorage.getItem(STORAGE_KEYS.LEGACY_JOURNALS);
    
    if (!legacyData) {
        return { migrated: false, count: 0 };
    }
    
    try {
        const parsed = JSON.parse(legacyData);
        const entries = [];
        
        // Convert each legacy entry
        for (const [key, value] of Object.entries(parsed)) {
            const context = parseContextFromLegacyKey(key);
            const isReflection = context !== null;
            
            // Handle both string values and object values from legacy format
            const content = typeof value === 'string' ? value : (value.content || value.text || '');
            const prompt = typeof value === 'object' ? (value.prompt || '') : '';
            
            if (content.trim()) { // Only migrate non-empty entries
                const entry = createEntry(
                    isReflection ? 'reflection' : 'free',
                    content,
                    prompt,
                    context
                );
                
                // Preserve original timestamp if available
                if (typeof value === 'object' && value.createdAt) {
                    entry.createdAt = value.createdAt;
                    entry.updatedAt = value.updatedAt || value.createdAt;
                }
                
                entries.push(entry);
            }
        }
        
        if (entries.length > 0) {
            // Merge with any existing entries (shouldn't be any, but safe)
            const existing = getAllEntries();
            const merged = [...existing, ...entries];
            localStorage.setItem(STORAGE_KEYS.ENTRIES, JSON.stringify(merged));
            
            // Archive the legacy data (don't delete yet for safety)
            localStorage.setItem(STORAGE_KEYS.LEGACY_JOURNALS_ARCHIVED, legacyData);
            
            // Remove the original legacy key
            localStorage.removeItem(STORAGE_KEYS.LEGACY_JOURNALS);
        }
        
        return { migrated: true, count: entries.length };
        
    } catch (error) {
        console.error('Migration failed:', error);
        return { migrated: false, count: 0, error: error.message };
    }
}

// ============================================================================
// DATA EXPORT
// ============================================================================

/**
 * Export all data for backup
 * @returns {Object} Complete data export
 */
export function exportAllData() {
    return {
        entries: getAllEntries(),
        progress: getProgress(),
        user: getUser(),
        exportedAt: new Date().toISOString(),
        version: '2.0'
    };
}

/**
 * Clear all data (for reset functionality)
 * WARNING: This is destructive!
 */
export function clearAllData() {
    localStorage.removeItem(STORAGE_KEYS.ENTRIES);
    localStorage.removeItem(STORAGE_KEYS.PROGRESS);
    localStorage.removeItem(STORAGE_KEYS.USER);
    // Keep theme preference
}
