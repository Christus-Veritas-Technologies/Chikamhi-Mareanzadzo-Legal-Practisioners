// Mock data matching the Folders & Tags design mockup.

export type Folder = { id: string; name: string; documentCount: number };

export type Tag = { id: string; name: string; documentCount: number; colorClass: string };

export const FOLDERS: Folder[] = [
  { id: "conveyancing", name: "Conveyancing", documentCount: 642 },
  { id: "litigation", name: "Litigation", documentCount: 511 },
  { id: "deceased-estates", name: "Deceased estates", documentCount: 288 },
  { id: "corporate-commercial", name: "Corporate & commercial", documentCount: 476 },
  { id: "precedents-templates", name: "Precedents & templates", documentCount: 63 },
];

export const TAGS: Tag[] = [
  { id: "urgent", name: "Urgent", documentCount: 48, colorClass: "bg-brand" },
  { id: "awaiting-signature", name: "Awaiting signature", documentCount: 31, colorClass: "bg-destructive" },
  { id: "filed-with-court", name: "Filed with court", documentCount: 204, colorClass: "bg-success" },
  { id: "bulawayo", name: "Bulawayo", documentCount: 389, colorClass: "bg-chart-2" },
  { id: "confidential", name: "Confidential", documentCount: 76, colorClass: "bg-chart-4" },
  { id: "originals-held", name: "Originals held", documentCount: 57, colorClass: "bg-warning" },
];
