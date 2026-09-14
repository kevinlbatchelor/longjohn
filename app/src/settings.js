/* Playback settings ---------------------------------------------------------
 * One global number kept in localStorage. There is no settings table or API
 * yet, so this is the whole storage layer - keep every key behind these two
 * helpers rather than touching localStorage from components.
 *
 * The player's sleep timer deliberately lives outside this file: it is a
 * per-playback toggle on the player page, not a saved preference.
 */

const KEY = 'playbackSettings';

/* 60 rather than 0, so the button is there on a device that has never visited
   the admin page. It was defaulting to off, and since this lives in
   localStorage - per browser, per origin, never synced - the setting goes away
   with cleared site data, a different browser, or the app being opened on a
   different host or port, and the button silently went with it. 0 still means
   off, it just has to be asked for now. */
export const DEFAULTS = { skipIntroSeconds: 60 };

// Coerce to a non-negative finite number; anything unparseable falls back.
const num = (v, fallback) => {
    const n = Number(v);
    return Number.isFinite(n) && n >= 0 ? n : fallback;
};

export function loadSettings() {
    try {
        const raw = JSON.parse(localStorage.getItem(KEY)) || {};
        return {
            skipIntroSeconds: num(raw.skipIntroSeconds, DEFAULTS.skipIntroSeconds)
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
