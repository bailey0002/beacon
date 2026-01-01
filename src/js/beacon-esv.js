/**
 * Beacon ESV Module
 * Handles ESV API integration for verse lookup and topic search
 * 
 * @module beacon-esv
 */

// ============================================================================
// API CONFIGURATION
// ============================================================================

const ESV_API_BASE = 'https://api.esv.org/v3/passage';
const ESV_API_TOKEN = '9ce885391251cd2f2bd7d1c0b67324f4c59626b9';

// ============================================================================
// VERSE LOOKUP
// ============================================================================

/**
 * Look up a specific verse or passage by reference
 * @param {string} reference - Bible reference (e.g., "John 3:16", "Romans 8:28-30")
 * @returns {Promise<Object>} Result object with success, reference, text, and passages
 */
export async function lookupVerse(reference) {
    if (!reference || !reference.trim()) {
        return {
            success: false,
            error: 'Please enter a verse reference'
        };
    }

    const params = new URLSearchParams({
        q: reference.trim(),
        'include-headings': 'false',
        'include-footnotes': 'false',
        'include-verse-numbers': 'true',
        'include-short-copyright': 'true',
        'include-passage-references': 'true'
    });

    try {
        const response = await fetch(
            `${ESV_API_BASE}/text/?${params}`,
            {
                headers: {
                    'Authorization': `Token ${ESV_API_TOKEN}`
                }
            }
        );

        if (!response.ok) {
            throw new Error(`ESV API error: ${response.status}`);
        }

        const data = await response.json();
        
        if (!data.passages || data.passages.length === 0) {
            return {
                success: false,
                error: 'No passage found. Check your reference format (e.g., John 3:16)'
            };
        }

        return {
            success: true,
            reference: data.canonical || reference,
            passages: data.passages,
            text: data.passages[0] || ''
        };

    } catch (error) {
        console.error('ESV lookup error:', error);
        return {
            success: false,
            error: error.message || 'Failed to fetch verse. Please try again.'
        };
    }
}

// ============================================================================
// TOPIC SEARCH
// ============================================================================

/**
 * Search for verses by topic/keyword
 * @param {string} query - Search query (e.g., "love", "faith", "marriage")
 * @returns {Promise<Object>} Result object with success, results array, and totalResults
 */
export async function searchTopic(query) {
    if (!query || !query.trim()) {
        return {
            success: false,
            error: 'Please enter a search topic'
        };
    }

    const params = new URLSearchParams({
        q: query.trim(),
        'page-size': '10'
    });

    try {
        const response = await fetch(
            `${ESV_API_BASE}/search/?${params}`,
            {
                headers: {
                    'Authorization': `Token ${ESV_API_TOKEN}`
                }
            }
        );

        if (!response.ok) {
            throw new Error(`ESV API error: ${response.status}`);
        }

        const data = await response.json();

        if (!data.results || data.results.length === 0) {
            return {
                success: false,
                error: 'No results found. Try a different search term.'
            };
        }

        return {
            success: true,
            results: data.results,
            totalResults: data.total_results || data.results.length
        };

    } catch (error) {
        console.error('ESV search error:', error);
        return {
            success: false,
            error: error.message || 'Search failed. Please try again.'
        };
    }
}

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Format a verse reference for display
 * @param {string} reference - Raw reference string
 * @returns {string} Formatted reference
 */
export function formatVerseReference(reference) {
    if (!reference) return '';
    
    // Capitalize book names properly
    return reference
        .replace(/\b(\d?\s?)([a-z])/gi, (match, num, letter) => {
            return num + letter.toUpperCase();
        })
        .trim();
}

/**
 * Parse a user-entered reference into components
 * @param {string} input - User input
 * @returns {Object|null} Parsed reference or null if invalid
 */
export function parseReference(input) {
    if (!input) return null;
    
    // Basic pattern: Book Chapter:Verse (with optional ranges)
    // Examples: "John 3:16", "1 Cor 13:4-7", "Genesis 1"
    const pattern = /^(\d?\s?[a-zA-Z]+)\s*(\d+)(?::(\d+)(?:-(\d+))?)?$/;
    const match = input.trim().match(pattern);
    
    if (!match) return null;
    
    return {
        book: match[1].trim(),
        chapter: parseInt(match[2], 10),
        verseStart: match[3] ? parseInt(match[3], 10) : null,
        verseEnd: match[4] ? parseInt(match[4], 10) : null
    };
}

/**
 * Clean ESV text for display (remove extra whitespace, etc.)
 * @param {string} text - Raw ESV text
 * @returns {string} Cleaned text
 */
export function cleanVerseText(text) {
    if (!text) return '';
    
    return text
        .replace(/\s+/g, ' ')           // Collapse multiple spaces
        .replace(/\(\s*ESV\s*\)/g, '')  // Remove ESV marker (we show it separately)
        .trim();
}

/**
 * Extract just the verse text without verse numbers
 * @param {string} text - Raw ESV text with verse numbers
 * @returns {string} Text without verse numbers
 */
export function removeVerseNumbers(text) {
    if (!text) return '';
    
    return text
        .replace(/\[\d+\]/g, '')  // Remove [1], [2], etc.
        .replace(/\s+/g, ' ')
        .trim();
}
