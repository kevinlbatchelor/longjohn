/* Audible's catalogue -------------------------------------------------------------
 * The one source for what an audiobook is, the way OMDb is for a movie. A
 * keyless search by free text answers with audiobook records: title, authors,
 * narrators, series and position, runtime, the audiobook's own cover, and
 * category ladders whose top level is Audible's shelf list. That shelf list,
 * lightly renamed, is what the grid filters on.
 *
 * Undocumented, but what Audiobookshelf has built on for years. Asked
 * politely, a few times a second at most.
 */
const axios = require('axios');

const API = 'https://api.audible.com/1.0/catalog/products';
const GAP_MS = 300;
const RESPONSE_GROUPS = 'category_ladders,media,contributors,series,product_desc,product_attrs';

let nextCall = 0;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const get = async (params) => {
    const wait = nextCall - Date.now();
    if (wait > 0) await sleep(wait);
    nextCall = Date.now() + GAP_MS;

    const { data } = await axios.get(API, { params, timeout: 20000 });
    return data.products || [];
};

/* Folder names to search words. "Robert A. Heinlein - Juveniles 03 - Red
   Planet" wants to be "Robert A. Heinlein Red Planet": series labels, years,
   bracketed tags and run-together words all go. */
const NOISE = /\b(audio ?books?|unabridged|abridged|mp3|dled|complete|collection)\b/gi;

const keywordsFor = (folderName) => {
    let name = String(folderName || '')
        .replace(/\[[^\]]*\]/g, ' ')
        .replace(/\([^)]*\)/g, ' ')
        .replace(NOISE, ' ')
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .replace(/\b(1[6-9]|20)\d{2}(\s*-\s*(1[6-9]|20)\d{2})?\b/g, ' ');

    const segments = name.split(/\s+-\s+/).map((s) => s.trim()).filter(Boolean);
    const isSeriesLabel = (s) => /\b\d{1,2}\s*$/.test(s) || /^\d+$/.test(s);
    const kept = segments.length > 1 ? segments.filter((s) => !isSeriesLabel(s)) : segments;

    return (kept.length ? kept : segments)
        .map((s) => s
            .replace(/\b(vol\.?|volume|book|no\.?)\s*\d+\b/gi, ' ')
            .replace(/#\s*\d+/g, ' ')
            .replace(/\s\d{1,2}\s*$/, ' '))
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();
};

/* Whether a result is the book the folder holds. Most of the search words
   have to turn up in the title, subtitle, authors or series - Audible ranks
   by relevance, but a collection or a similarly named book comes first often
   enough that the first answer is not simply taken. Two neighbouring words
   also count when their run-together form does ("Dragon Lance" for
   "Dragonlance"). */
const STOP = new Set(['the', 'a', 'an', 'of', 'and', 'in', 'on', 'to', 'for', 'at', 'by', 'with', 'from', 'his', 'her', 'its']);
const JUNK = /summar|review|sommario|riassunto|resumen|analysis|study guide|workbook|trivia/i;

const words = (text) => String(text || '').toLowerCase().replace(/[^a-z0-9']+/g, ' ').split(' ').filter((w) => w && !STOP.has(w));

const isTheBook = (product, keywords) => {
    if (!product.authors || !product.authors.length || JUNK.test(product.title || '')) return false;

    const wanted = words(keywords);
    if (!wanted.length) return false;

    const titleWords = new Set(words([product.title, product.subtitle, ...(product.series || []).map((s) => s.title)].join(' ')));
    const haystack = new Set([...titleWords, ...words(product.authors.map((a) => a.name).join(' '))]);

    // A folder named only for the author matches nothing: the title has to
    // carry at least one of the words, or this is just something they wrote.
    if (!wanted.some((w) => titleWords.has(w))) return false;

    let hits = 0;
    for (let i = 0; i < wanted.length; i++) {
        if (haystack.has(wanted[i])) hits += 1;
        else if (i + 1 < wanted.length && haystack.has(wanted[i] + wanted[i + 1])) { hits += 2; i += 1; }
    }
    return hits / wanted.length >= 0.75;
};

/* Audible's shelves, in the words the grid uses. Science Fiction & Fantasy is
   one shelf at Audible and two here, told apart by the next rung down; a few
   genres are worth noting wherever they appear on a ladder, so a children's
   mystery is Kids and Mystery both. Shelves not listed keep Audible's name. */
const SHELVES = {
    "Children's Audiobooks": 'Kids',
    'Teen & Young Adult': 'Young Adult',
    'Mystery, Thriller & Suspense': 'Mystery',
    'Literature & Fiction': 'Fiction',
    'Biographies & Memoirs': 'Biography',
    'Comedy & Humor': 'Comedy',
    'Business & Careers': 'Business',
    'Religion & Spirituality': 'Religion',
    'Politics & Social Sciences': 'Politics',
    'Health & Wellness': 'Health',
    'Arts & Entertainment': 'Arts',
    'Education & Learning': 'Education',
    'Money & Finance': 'Money',
    'Relationships, Parenting & Personal Development': 'Self-Help',
    'Science & Engineering': 'Science',
    'Sports & Outdoors': 'Sports',
    'Travel & Tourism': 'Travel',
    'Home & Garden': 'Home',
    'Computers & Technology': 'Technology'
};
const ANY_RUNG = {
    'Science Fiction': 'Scifi',
    'Fantasy': 'Fantasy',
    'Mystery': 'Mystery',
    'Horror': 'Horror',
    'Romance': 'Romance',
    'Humorous': 'Comedy',
    'Classics': 'Classics',
    'Historical': 'History'
};

const categoriesOf = (product) => {
    const out = new Set();
    (product.category_ladders || []).forEach(({ ladder }) => {
        if (!ladder || !ladder.length) return;
        const names = ladder.map((rung) => rung.name);
        const top = names[0];

        if (top === 'Science Fiction & Fantasy') {
            if (!names.some((n) => ANY_RUNG[n] === 'Scifi' || ANY_RUNG[n] === 'Fantasy')) out.add('Scifi');
        } else {
            out.add(SHELVES[top] || top);
        }
        names.slice(1).forEach((n) => { if (ANY_RUNG[n]) out.add(ANY_RUNG[n]); });
    });

    // Literature & Fiction is where everything else sits too; it only
    // stands on its own when no better shelf was named.
    const list = Array.from(out);
    return list.length > 1 ? list.filter((c) => c !== 'Fiction') : list;
};

// The record kept on the book's rows, as the imdb blob is kept on a movie's.
const recordOf = (product) => {
    const images = product.product_images || {};
    // A book can sit in several series; the one that numbers it is the one worth keeping.
    const all = product.series || [];
    const series = all.find((s) => s.sequence) || all[0] || null;

    return {
        source: 'audible',
        asin: product.asin,
        title: product.title || '',
        subtitle: product.subtitle || '',
        authors: (product.authors || []).map((a) => a.name),
        narrators: (product.narrators || []).map((n) => n.name),
        series: series ? { name: series.title, position: series.sequence || '' } : null,
        categories: categoriesOf(product),
        runtimeMinutes: product.runtime_length_min || null,
        releaseDate: product.release_date || '',
        description: String(product.publisher_summary || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
        coverUrl: images['1000'] || images['500'] || null,
        lookedUp: new Date().toISOString()
    };
};

const audible = {};

// The book a folder holds, or null when Audible has nothing convincing.
audible.lookup = async function (folderName) {
    const keywords = keywordsFor(folderName);
    if (!keywords) return null;

    const products = await get({
        keywords,
        num_results: 5,
        products_sort_by: 'Relevance',
        response_groups: RESPONSE_GROUPS,
        image_sizes: '500,1000'
    });

    const match = products.find((p) => isTheBook(p, keywords));
    return match ? recordOf(match) : null;
};

// Cover candidates for the picker, in the shape it draws.
audible.searchCovers = async function (q) {
    const products = await get({
        keywords: q,
        num_results: 20,
        products_sort_by: 'Relevance',
        response_groups: 'media,contributors',
        image_sizes: '500'
    });

    return products
        .filter((p) => p.product_images && p.product_images['500'])
        .map((p) => ({
            source: 'audible',
            id: p.asin,
            title: p.title || '',
            year: String(p.release_date || '').slice(0, 4),
            poster: p.product_images['500'],
            authors: (p.authors || []).map((a) => a.name)
        }));
};

audible.keywordsFor = keywordsFor;
audible.categoriesOf = categoriesOf;

module.exports = audible;
