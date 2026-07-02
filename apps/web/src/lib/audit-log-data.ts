// Mock data matching the Audit log design mockup.

export type AuditAction = "Signed" | "OCR" | "Moved" | "Uploaded" | "Viewed" | "Deleted";

export type AuditEntry = {
  id: string;
  actor: string;
  isSystem?: boolean;
  action: AuditAction;
  target: string;
  timestamp: string;
  sourceIp: string;
};

export const AUDIT_LOG: AuditEntry[] = [
  { id: "a1", actor: "T. Chikamhi", action: "Signed", target: "Deed of Sale — Stand 4471", timestamp: "1 Jul, 11:20", sourceIp: "41.220.14.8" },
  { id: "a2", actor: "System", isSystem: true, action: "OCR", target: "Affidavit of Service.pdf", timestamp: "1 Jul, 09:48", sourceIp: "—" },
  { id: "a3", actor: "P. Dube", action: "Moved", target: "4 documents → Estate of T. Ncube", timestamp: "30 Jun, 16:20", sourceIp: "41.220.14.31" },
  { id: "a4", actor: "R. Mareanadzo", action: "Uploaded", target: "3 documents → Sibanda v. Moyo", timestamp: "30 Jun, 09:04", sourceIp: "41.220.14.8" },
  { id: "a5", actor: "G. Mpofu", action: "Viewed", target: "Title Deed 4471 (scan).pdf", timestamp: "29 Jun, 14:12", sourceIp: "41.220.14.52" },
  { id: "a6", actor: "P. Dube", action: "Deleted", target: "Draft Notice v1.docx", timestamp: "28 Jun, 10:31", sourceIp: "41.220.14.31" },
];
