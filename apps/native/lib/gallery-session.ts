// In-memory holding area for files picked from the photo library on the Scan screen —
// mirrors scan-session.ts's pattern (expo-router params are string-only) but carries
// richer per-file metadata since gallery picks upload as independent documents rather
// than combining into a single scan.
export type GalleryItem = {
  uri: string;
  name: string;
  mimeType: string;
  sizeBytes?: number;
};

let items: GalleryItem[] = [];

export function setGalleryItems(next: GalleryItem[]) {
  items = next;
}

export function getGalleryItems() {
  return items;
}

export function removeGalleryItem(index: number) {
  items = items.filter((_, i) => i !== index);
}

export function updateGalleryItemName(index: number, name: string) {
  items = items.map((item, i) => (i === index ? { ...item, name } : item));
}

export function clearGalleryItems() {
  items = [];
}
