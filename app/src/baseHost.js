/* Where the server is. Baked in at build time from BASE_HOST for the pages
   the Pi serves to browsers; overridden at run time by the TV app, which
   carries these same pages inside it and opens them with ?base=<address>
   so the address typed into its Settings is the one that counts. */
const fromApp = typeof window !== 'undefined' ? window.LONGJOHN_BASE : '';

export const BASE = fromApp || process.env.BASE_HOST;

/* True inside the TV app. The WebView names itself in its user agent, so
   this is never a flag a browser could stumble into. The app is for watching
   only: books, admin and the edit (delete) controls stay out of it. */
export const TV_APP = typeof navigator !== 'undefined' && /LongJohnTV/.test(navigator.userAgent);
