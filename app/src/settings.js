/* Playback settings ---------------------------------------------------------
 * Two global numbers kept in localStorage. There is no settings table or API
 * yet, so this is the whole storage layer - keep every key behind these two
 * helpers rather than touching localStorage from components.
 */

const KEY = 'playbackSettings';

export const DEFAULTS = { skipIntroSeconds: 0, endEarlySeconds: 0 };

// Coerce to a non-negative finite number; anything unparseable falls back.
const num = (v, fallback) => {
    const n = Number(v);
    return Number.isFinite(n) && n >= 0 ? n : fallback;
};

export function loadSettings() {
    try {
        const raw = JSON.parse(localStorage.getItem(KEY)) || {};
        return {
            skipIntroSeconds: num(raw.skipIntroSeconds, DEFAULTS.skipIntroSeconds),
            endEarlySeconds : num(raw.endEarlySeconds,  DEFAULTS.endEarlySeconds)
        };
    } catch (e) {
        // corrupt JSON, or storage blocked entirely (private mode)
        return { ...DEFAULTS };
    }
}

export function saveSettings(partial) {
    const merged = { ...loadSettings(), ...partial };
    try {
        localStorage.setItem(KEY, JSON.stringify(merged));
    } catch (e) {
        console.warn('could not save playback settings:', e.message);
    }
    return merged;
}
