/** Resolve an icon path under public/icons, honoring Vite's base (e.g. /blokus-solo/). */
export const iconUrl = (name: string): string => `${import.meta.env.BASE_URL}icons/${name}`;
