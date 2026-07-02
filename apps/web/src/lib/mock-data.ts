// Mock data matching the C&M DMS design mockups exactly — swap for real queries once the
// Client/Matter/Document Prisma models + API endpoints exist.

export type ClientType = "Corporate" | "Deceased estate" | "Family" | "Government";

export type Client = {
  id: string;
  name: string;
  initials: string;
  type: ClientType;
  regNumber?: string;
  attorneyOfRecord: string;
  clientSince: string;
  openCases: number;
  documents: number;
  storage: string;
  lastActivity: string;
};

export type CaseStatus = "Active" | "Under review" | "Closed";

export type Case = {
  id: string;
  caseNumber: string;
  title: string;
  clientId: string;
  status: CaseStatus;
  matterType: string;
  location?: string;
  leadAttorney: string;
  opened: string;
  registry?: string;
  documentCount: number;
  updated: string;
};

export type DocumentStatus = "Executed" | "Filed" | "Signed" | "Under review" | "Draft";

export type CaseDocument = {
  id: string;
  name: string;
  caseId: string;
  status: DocumentStatus;
  modified: string;
};

export type TimelineEvent = {
  id: string;
  caseId: string;
  description: string;
  timestamp: string;
};

export const CLIENTS: Client[] = [
  {
    id: "moyo-holdings",
    name: "Moyo Holdings (Pvt) Ltd",
    initials: "MH",
    type: "Corporate",
    regNumber: "2019/4471",
    attorneyOfRecord: "T. Chikamhi",
    clientSince: "2019",
    openCases: 6,
    documents: 214,
    storage: "3.2 GB",
    lastActivity: "2h ago",
  },
  {
    id: "estate-t-ncube",
    name: "Estate of the Late T. Ncube",
    initials: "EN",
    type: "Deceased estate",
    attorneyOfRecord: "P. Dube",
    clientSince: "2023",
    openCases: 3,
    documents: 88,
    storage: "0.6 GB",
    lastActivity: "Today",
  },
  {
    id: "chikamhi-ventures",
    name: "Chikamhi Ventures (Pvt) Ltd",
    initials: "CV",
    type: "Corporate",
    attorneyOfRecord: "T. Chikamhi",
    clientSince: "2020",
    openCases: 4,
    documents: 126,
    storage: "1.8 GB",
    lastActivity: "Yesterday",
  },
  {
    id: "dube-family",
    name: "P. & G. Dube",
    initials: "PD",
    type: "Family",
    attorneyOfRecord: "R. Mareanadzo",
    clientSince: "2024",
    openCases: 2,
    documents: 41,
    storage: "0.3 GB",
    lastActivity: "3d ago",
  },
  {
    id: "bulawayo-city-council",
    name: "Bulawayo City Council",
    initials: "BC",
    type: "Government",
    attorneyOfRecord: "T. Chikamhi",
    clientSince: "2018",
    openCases: 9,
    documents: 302,
    storage: "5.1 GB",
    lastActivity: "4d ago",
  },
  {
    id: "zimre-property",
    name: "Zimre Property Investments",
    initials: "ZP",
    type: "Corporate",
    attorneyOfRecord: "R. Mareanadzo",
    clientSince: "2021",
    openCases: 5,
    documents: 177,
    storage: "2.4 GB",
    lastActivity: "6d ago",
  },
  {
    id: "nkomo-hardware",
    name: "Nkomo & Sons Hardware",
    initials: "NS",
    type: "Corporate",
    attorneyOfRecord: "G. Mpofu",
    clientSince: "2022",
    openCases: 1,
    documents: 33,
    storage: "0.4 GB",
    lastActivity: "1w ago",
  },
];

export const CASES: Case[] = [
  {
    id: "stand-4471-transfer",
    caseNumber: "CASE-2024-0417",
    title: "Stand 4471 — Transfer",
    clientId: "moyo-holdings",
    status: "Active",
    matterType: "Conveyancing",
    location: "Bulawayo",
    leadAttorney: "T. Chikamhi",
    opened: "14 Feb 2024",
    registry: "Deeds Office, Bulawayo",
    documentCount: 34,
    updated: "2h ago",
  },
  {
    id: "supply-agreement-zesa",
    caseNumber: "CASE-2024-0388",
    title: "Supply Agreement — ZESA",
    clientId: "moyo-holdings",
    status: "Under review",
    matterType: "Commercial contract",
    leadAttorney: "T. Chikamhi",
    opened: "3 May 2024",
    documentCount: 52,
    updated: "Yesterday",
  },
  {
    id: "board-restructuring",
    caseNumber: "CASE-2023-0281",
    title: "Board Restructuring",
    clientId: "moyo-holdings",
    status: "Active",
    matterType: "Corporate governance",
    leadAttorney: "T. Chikamhi",
    opened: "9 Nov 2023",
    documentCount: 28,
    updated: "5d ago",
  },
  {
    id: "trademark-registration",
    caseNumber: "CASE-2023-0155",
    title: "Trademark Registration",
    clientId: "moyo-holdings",
    status: "Closed",
    matterType: "Intellectual property",
    leadAttorney: "T. Chikamhi",
    opened: "2 Feb 2023",
    documentCount: 19,
    updated: "Closed Mar 2025",
  },
  {
    id: "estate-of-t-ncube-probate",
    caseNumber: "CASE-2024-0512",
    title: "Estate of T. Ncube — Probate",
    clientId: "estate-t-ncube",
    status: "Active",
    matterType: "Deceased estate",
    leadAttorney: "P. Dube",
    opened: "10 Jan 2024",
    documentCount: 88,
    updated: "Today",
  },
  {
    id: "sibanda-v-moyo",
    caseNumber: "CASE-2024-0299",
    title: "Sibanda v. Moyo",
    clientId: "moyo-holdings",
    status: "Under review",
    matterType: "Litigation",
    leadAttorney: "R. Mareanadzo",
    opened: "22 Apr 2024",
    documentCount: 15,
    updated: "Yesterday",
  },
  {
    id: "dube-divorce",
    caseNumber: "CASE-2024-0187",
    title: "Dube Divorce",
    clientId: "dube-family",
    status: "Active",
    matterType: "Family",
    leadAttorney: "R. Mareanadzo",
    opened: "8 Mar 2024",
    documentCount: 41,
    updated: "3d ago",
  },
  {
    id: "bcc-rates-dispute",
    caseNumber: "CASE-2023-0940",
    title: "Rates Valuation Dispute",
    clientId: "bulawayo-city-council",
    status: "Active",
    matterType: "Government",
    leadAttorney: "T. Chikamhi",
    opened: "19 Sep 2023",
    documentCount: 64,
    updated: "4d ago",
  },
];

export const CASE_DOCUMENTS: CaseDocument[] = [
  { id: "d1", name: "Deed of Sale — Stand 4471.pdf", caseId: "stand-4471-transfer", status: "Executed", modified: "2h ago" },
  { id: "d2", name: "Power of Attorney.pdf", caseId: "stand-4471-transfer", status: "Filed", modified: "1d ago" },
  { id: "d3", name: "Rates Clearance Certificate.docx", caseId: "stand-4471-transfer", status: "Under review", modified: "2d ago" },
  { id: "d4", name: "Title Deed 4471 (scan).pdf", caseId: "stand-4471-transfer", status: "Signed", modified: "4d ago" },
  { id: "d5", name: "Transfer Instructions (draft).docx", caseId: "stand-4471-transfer", status: "Draft", modified: "6d ago" },
];

export const CASE_TIMELINE: TimelineEvent[] = [
  { id: "t1", caseId: "stand-4471-transfer", description: "Deed of Sale executed by T. Chikamhi", timestamp: "Today, 11:20" },
  { id: "t2", caseId: "stand-4471-transfer", description: "2 documents filed to Deeds Office", timestamp: "Yesterday, 15:05" },
  { id: "t3", caseId: "stand-4471-transfer", description: "OCR run on 4 uploaded scans", timestamp: "2d ago" },
  { id: "t4", caseId: "stand-4471-transfer", description: "Case opened by R. Mareanadzo", timestamp: "14 Feb 2024" },
];

export type FileType = "pdf" | "docx" | "xlsx" | "jpg";

export type GlobalDocument = {
  id: string;
  name: string;
  fileType: FileType;
  clientId: string;
  caseId?: string;
  status: DocumentStatus;
  uploadedBy: string;
  modified: string;
};

export const DOCUMENTS: GlobalDocument[] = [
  { id: "g1", name: "Deed of Sale — Stand 4471.pdf", fileType: "pdf", clientId: "moyo-holdings", caseId: "stand-4471-transfer", status: "Executed", uploadedBy: "R. Mareanadzo", modified: "2h ago" },
  { id: "g2", name: "Affidavit of Service.pdf", fileType: "pdf", clientId: "estate-t-ncube", caseId: "estate-of-t-ncube-probate", status: "Filed", uploadedBy: "P. Dube", modified: "Today" },
  { id: "g3", name: "Notice of Set Down.pdf", fileType: "pdf", clientId: "dube-family", caseId: "dube-divorce", status: "Signed", uploadedBy: "R. Mareanadzo", modified: "3d ago" },
  { id: "g4", name: "Title Deed 4471 (scan).pdf", fileType: "pdf", clientId: "moyo-holdings", caseId: "stand-4471-transfer", status: "Signed", uploadedBy: "T. Chikamhi", modified: "4d ago" },
  { id: "g5", name: "Rates Clearance Certificate.pdf", fileType: "pdf", clientId: "bulawayo-city-council", caseId: "bcc-rates-dispute", status: "Under review", uploadedBy: "P. Dube", modified: "5d ago" },
  { id: "g6", name: "Lease Agreement — Fife St.pdf", fileType: "pdf", clientId: "zimre-property", status: "Filed", uploadedBy: "R. Mareanadzo", modified: "1w ago" },
];

export function getDocument(documentId: string) {
  return DOCUMENTS.find((d) => d.id === documentId);
}

export function getClient(clientId: string) {
  return CLIENTS.find((c) => c.id === clientId);
}

export function getCasesForClient(clientId: string) {
  return CASES.filter((c) => c.clientId === clientId);
}

export function getCase(caseId: string) {
  return CASES.find((c) => c.id === caseId);
}

export function getDocumentsForCase(caseId: string) {
  return CASE_DOCUMENTS.filter((d) => d.caseId === caseId);
}

export function getTimelineForCase(caseId: string) {
  return CASE_TIMELINE.filter((t) => t.caseId === caseId);
}
