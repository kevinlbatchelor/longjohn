/* Where the server is. Baked in at build time from BASE_HOST for the pages
   the Pi serves to browsers; overridden at run time by the TV app, which
   carries these same pages inside it and opens them with ?base=<address>
   so the address typed into its Settings is the one that counts. */
const fromApp = typeof window !== 'undefined' ? window.LONGJOHN_BASE : '';

export const BASE = fromApp || process.env.BASE_HOST;
