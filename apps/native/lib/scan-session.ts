// In-memory holding area for photos captured on the Scan screen. expo-router params are
// string-only, so passing an array of local file URIs from scan.tsx through scan-review.tsx
// to scan-assign.tsx goes through this module-level store instead of route params.
let pages: string[] = [];

export function setPages(uris: string[]) {
  pages = uris;
}

export function getPages() {
  return pages;
}

export function removePage(index: number) {
  pages = pages.filter((_, i) => i !== index);
}

export function clearPages() {
  pages = [];
}
