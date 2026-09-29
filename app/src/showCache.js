/* One show's episodes, fetched once -------------------------------------------
 * The catalogue route can hand back every episode of every show, which is far
 * more than a stick should download - let alone parse - twice. The episode list
 * and the player both want the same ordered list for the same show, so it is
 * fetched through here and kept in sessionStorage: grid -> show -> episode ->
 * next episode -> next episode costs a single request for the whole run.
 *
 * The sort and the label live here as well, so the two pages cannot disagree
 * about what order the episodes are in or what to call them.
 */

const BASE = process.env.BASE_HOST;
const TV_ROOT = BASE + ':3000/api/v1/tv';
// Cover search is provider plumbing, not a movie thing - it lives on the movie
// router because that is where it was first needed, and shows use it as it is.
const MOVIE_ROOT = BASE + ':3000/api/v1/movie';

export const COVER_ROOT = BASE + ':3000/api/v1/cover';

const CACHE_PREFIX = 'longjohn.show.';

/* --- ordering and labels --------------------------------------------------- */

/* One collator for the whole app. localeCompare with options builds a fresh
   one on every call, and a sort over a few hundred episodes makes that call
   thousands of times. */
const collator = new Intl.Collator(undefined, { numeric: true });

function sortEpisodes(episodes) {
    return episodes.slice().sort((a, b) => collator.compare(a.episode, b.episode));
}

// Hoisted so the episode grid is not recompiling it once per card per render.
const LABEL_RE = /([Ss]\d{2}[Ee]\d{2}(?:-[Ee]\d{2})?)/;

export function episodeLabel(episode) {
    const match = LABEL_RE.exec(episode.episode);
    return match ? match[1] : episode.episode;
}

/* --- fetching -------------------------------------------------------------- */

function readJson(response) {
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
}

/* The grid draws a name and a cover and nothing else, so it asks for the
   summary rather than dragging the whole catalogue down to render 69 names.
   A server that predates summary=1 ignores it and sends the full rows instead -
   those carry a name too, so the grid reads either without caring. */
export function fetchShowSummaries() {
    return fetch(`${TV_ROOT}?category=TV&name=%&summary=1`)
        .then(readJson)
        .then((data) => (data.rows || []).map((row) => ({
            name: row.name,
            /* Only the delete dialog reads this, to say how many files it is
               about to remove. A server sending full rows counts them here
               instead; one that sends neither leaves it null and the dialog
               drops the count rather than claiming a wrong one. */
            episodeCount: typeof row.count === 'number'
                ? row.count
                : (Array.isArray(row.episodes) ? row.episodes.length : null)
        })));
}

/* Sorted here, once, on the way into the cache. Both readers want the same
   order - the list to draw it and the player to find what comes next - and
   sorting on each side meant a fresh copy and a fresh sort of the whole show
   on every episode the viewer moved to. Trimmed to the two fields they read,
   so the copy held in sessionStorage stays small. */
function trim(show) {
    return {
        name: show.name,
        episodes: sortEpisodes(show.episodes).map((ep) => ({ id: ep.id, episode: ep.episode }))
    };
}

function readCache(name) {
    try {
        const raw = sessionStorage.getItem(CACHE_PREFIX + name);
        return raw ? JSON.parse(raw) : null;
    } catch (e) {
        return null;
    }
}

function writeCache(show) {
    try {
        sessionStorage.setItem(CACHE_PREFIX + show.name, JSON.stringify(show));
    } catch (e) {
        // quota, or storage blocked - the fetch path still works without it
    }
}

// Always goes to the server. The episode list uses this so a newly scanned
// episode turns up without reopening the tab.
export function fetchShow(name) {
    return fetch(`${TV_ROOT}?category=TV&name=%&show=${encodeURIComponent(name)}`)
        .then(readJson)
        .then((data) => {
            const found = (data.rows || []).find((s) => s.name === name);
            if (!found) return null;

            const show = trim(found);
            writeCache(show);
            return show;
        });
}

/* Deleting a bad episode ------------------------------------------------------
 * The row and the file both go, so the copy in sessionStorage has to go with
 * them - otherwise the player still lists the episode as what comes next and
 * walking back into the show draws a card that 404s.
 */
export function deleteEpisode(id) {
    return fetch(`${TV_ROOT}/${encodeURIComponent(id)}`, { method: 'DELETE' })
        .then(readJson);
}

// The whole show, episodes and files alike. The server works out which rows
// those are - the client only ever knew the show by name.
export function deleteShow(name) {
    return fetch(`${TV_ROOT}/show/${encodeURIComponent(name)}`, { method: 'DELETE' })
        .then(readJson);
}

/* Cover art for a show ---------------------------------------------------------
 * A movie's cover is filed under its row id; a show has no row, so its cover is
 * filed under the show's name - which is also the only handle the grid has for
 * it. Hence a route of its own rather than the movie one.
 */
export function searchShowCovers(q) {
    /* type=series narrows both providers. A show's name is very often a film's
       as well, and unfiltered the film wins - searching "Fargo" for the series
       came back with the 1996 poster first. */
    return fetch(`${MOVIE_ROOT}/cover-search?q=${encodeURIComponent(q)}&type=series`)
        .then(readJson);
}

export function setShowCover(name, url) {
    return fetch(`${TV_ROOT}/show/${encodeURIComponent(name)}/cover`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
    }).then(readJson);
}

export function forgetShow(name) {
    try {
        sessionStorage.removeItem(CACHE_PREFIX + name);
    } catch (e) {
        // storage blocked - there was nothing cached to drop anyway
    }
}

// Rewrites the cached show in place rather than dropping the key, so a viewer
// deleting a run of bad files does not re-fetch the show between each one.
export function forgetEpisode(name, id) {
    const cached = readCache(name);
    if (!cached) return;

    writeCache({
        name: cached.name,
        episodes: cached.episodes.filter((ep) => ep.id !== id)
    });
}

// Cache first. The player only needs to know what comes next, and it was just
// handed that list by the page the viewer clicked through from.
export function loadShow(name) {
    const cached = readCache(name);
    if (cached) return Promise.resolve(cached);

    return fetchShow(name);
}
