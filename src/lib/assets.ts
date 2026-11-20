/** Public-folder URL that respects Vite's `base` (e.g. /the-snack-shop/ on GitHub Pages). */
export const asset = (path: string) => `${import.meta.env.BASE_URL}${path.replace(/^\//, "")}`;

export const LOGO_URL = asset("logo.png");
