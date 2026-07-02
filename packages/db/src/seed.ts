import prisma from "./index";
import { hashPassword } from "./password";

// Seeds the exact demo data the C&M DMS design mockups show, so the app looks right the
// moment you run `pnpm db:push && pnpm db:seed`. Run again any time — it's idempotent
// (upserts by unique fields, skip-duplicates on the rest).

const STAFF = [
  { name: "Tafadzwa Chikamhi", username: "t.chikamhi", email: "t.chikamhi@cmlaw.co.zw", role: "ADMIN" as const, password: "ChangeMe123!" },
  { name: "Rutendo Mareanadzo", username: "r.mareanadzo", email: "r.mareanadzo@cmlaw.co.zw", role: "ADMIN" as const, password: "ChangeMe123!" },
  { name: "Praise Dube", username: "p.dube", email: "p.dube@cmlaw.co.zw", role: "ATTORNEY" as const, password: "ChangeMe123!" },
  { name: "Grace Mpofu", username: "g.mpofu", email: "g.mpofu@cmlaw.co.zw", role: "PARALEGAL" as const, password: "ChangeMe123!" },
  { name: "Simba Nyathi", username: "s.nyathi", email: "s.nyathi@cmlaw.co.zw", role: "PARALEGAL" as const, password: "ChangeMe123!", isActive: false },
];

const CLIENTS = [
  { key: "moyo-holdings", name: "Moyo Holdings (Pvt) Ltd", type: "CORPORATE" as const, regNumber: "2019/4471", attorneyUsername: "t.chikamhi", since: 2019 },
  { key: "estate-t-ncube", name: "Estate of the Late T. Ncube", type: "DECEASED_ESTATE" as const, attorneyUsername: "p.dube", since: 2023 },
  { key: "chikamhi-ventures", name: "Chikamhi Ventures (Pvt) Ltd", type: "CORPORATE" as const, attorneyUsername: "t.chikamhi", since: 2020 },
  { key: "dube-family", name: "P. & G. Dube", type: "FAMILY" as const, attorneyUsername: "r.mareanadzo", since: 2024 },
  { key: "bulawayo-city-council", name: "Bulawayo City Council", type: "GOVERNMENT" as const, attorneyUsername: "t.chikamhi", since: 2018 },
  { key: "zimre-property", name: "Zimre Property Investments", type: "CORPORATE" as const, attorneyUsername: "r.mareanadzo", since: 2021 },
  { key: "nkomo-hardware", name: "Nkomo & Sons Hardware", type: "CORPORATE" as const, attorneyUsername: "g.mpofu", since: 2022 },
];

const FOLDERS = ["Conveyancing", "Litigation", "Deceased estates", "Corporate & commercial", "Precedents & templates"];

const TAGS = [
  { name: "Urgent", colorClass: "bg-brand" },
  { name: "Awaiting signature", colorClass: "bg-destructive" },
  { name: "Filed with court", colorClass: "bg-success" },
  { name: "Bulawayo", colorClass: "bg-chart-2" },
  { name: "Confidential", colorClass: "bg-chart-4" },
  { name: "Originals held", colorClass: "bg-warning" },
];

const CASES = [
  { key: "stand-4471-transfer", caseNumber: "CASE-2024-0417", title: "Stand 4471 — Transfer", clientKey: "moyo-holdings", status: "ACTIVE" as const, matterType: "Conveyancing", location: "Bulawayo", leadAttorneyUsername: "t.chikamhi", registry: "Deeds Office, Bulawayo", opened: "2024-02-14" },
  { key: "supply-agreement-zesa", caseNumber: "CASE-2024-0388", title: "Supply Agreement — ZESA", clientKey: "moyo-holdings", status: "UNDER_REVIEW" as const, matterType: "Commercial contract", leadAttorneyUsername: "t.chikamhi", opened: "2024-05-03" },
  { key: "board-restructuring", caseNumber: "CASE-2023-0281", title: "Board Restructuring", clientKey: "moyo-holdings", status: "ACTIVE" as const, matterType: "Corporate governance", leadAttorneyUsername: "t.chikamhi", opened: "2023-11-09" },
  { key: "trademark-registration", caseNumber: "CASE-2023-0155", title: "Trademark Registration", clientKey: "moyo-holdings", status: "CLOSED" as const, matterType: "Intellectual property", leadAttorneyUsername: "t.chikamhi", opened: "2023-02-02" },
  { key: "estate-of-t-ncube-probate", caseNumber: "CASE-2024-0512", title: "Estate of T. Ncube — Probate", clientKey: "estate-t-ncube", status: "ACTIVE" as const, matterType: "Deceased estate", leadAttorneyUsername: "p.dube", opened: "2024-01-10" },
  { key: "sibanda-v-moyo", caseNumber: "CASE-2024-0299", title: "Sibanda v. Moyo", clientKey: "moyo-holdings", status: "UNDER_REVIEW" as const, matterType: "Litigation", leadAttorneyUsername: "r.mareanadzo", opened: "2024-04-22" },
  { key: "dube-divorce", caseNumber: "CASE-2024-0187", title: "Dube Divorce", clientKey: "dube-family", status: "ACTIVE" as const, matterType: "Family", leadAttorneyUsername: "r.mareanadzo", opened: "2024-03-08" },
  { key: "bcc-rates-dispute", caseNumber: "CASE-2023-0940", title: "Rates Valuation Dispute", clientKey: "bulawayo-city-council", status: "ACTIVE" as const, matterType: "Government", leadAttorneyUsername: "t.chikamhi", opened: "2023-09-19" },
];

const DOCUMENTS = [
  { name: "Deed of Sale — Stand 4471.pdf", fileType: "pdf", clientKey: "moyo-holdings", caseKey: "stand-4471-transfer", status: "EXECUTED" as const, uploadedByUsername: "r.mareanadzo", folder: "Conveyancing", sizeBytes: 420_000 },
  { name: "Power of Attorney.pdf", fileType: "pdf", clientKey: "moyo-holdings", caseKey: "stand-4471-transfer", status: "FILED" as const, uploadedByUsername: "t.chikamhi", folder: "Conveyancing", sizeBytes: 180_000 },
  { name: "Rates Clearance Certificate.docx", fileType: "docx", clientKey: "moyo-holdings", caseKey: "stand-4471-transfer", status: "UNDER_REVIEW" as const, uploadedByUsername: "p.dube", folder: "Conveyancing", sizeBytes: 95_000 },
  { name: "Title Deed 4471 (scan).pdf", fileType: "pdf", clientKey: "moyo-holdings", caseKey: "stand-4471-transfer", status: "SIGNED" as const, uploadedByUsername: "t.chikamhi", folder: "Conveyancing", sizeBytes: 1_200_000 },
  { name: "Transfer Instructions (draft).docx", fileType: "docx", clientKey: "moyo-holdings", caseKey: "stand-4471-transfer", status: "DRAFT" as const, uploadedByUsername: "r.mareanadzo", folder: "Conveyancing", sizeBytes: 60_000 },
  { name: "Affidavit of Service.pdf", fileType: "pdf", clientKey: "estate-t-ncube", caseKey: "estate-of-t-ncube-probate", status: "FILED" as const, uploadedByUsername: "p.dube", folder: "Deceased estates", sizeBytes: 210_000 },
  { name: "Notice of Set Down.pdf", fileType: "pdf", clientKey: "dube-family", caseKey: "dube-divorce", status: "SIGNED" as const, uploadedByUsername: "r.mareanadzo", folder: "Litigation", sizeBytes: 150_000 },
  { name: "Rates Clearance Certificate.pdf", fileType: "pdf", clientKey: "bulawayo-city-council", caseKey: "bcc-rates-dispute", status: "UNDER_REVIEW" as const, uploadedByUsername: "p.dube", folder: "Litigation", sizeBytes: 300_000 },
  { name: "Lease Agreement — Fife St.pdf", fileType: "pdf", clientKey: "zimre-property", caseKey: null, status: "FILED" as const, uploadedByUsername: "r.mareanadzo", folder: "Corporate & commercial", sizeBytes: 275_000 },
];

async function main() {
  const staffByUsername = new Map<string, string>();
  for (const staff of STAFF) {
    const { hash, salt } = hashPassword(staff.password);
    const user = await prisma.user.upsert({
      where: { username: staff.username },
      update: { isActive: staff.isActive ?? true },
      create: {
        name: staff.name,
        username: staff.username,
        email: staff.email,
        role: staff.role,
        passwordHash: hash,
        passwordSalt: salt,
        isActive: staff.isActive ?? true,
      },
    });
    staffByUsername.set(staff.username, user.id);
    console.log(`Seeded user ${staff.username}`);
  }

  const clientIdByKey = new Map<string, string>();
  for (const c of CLIENTS) {
    // Client has no natural unique key besides id, so find-by-name-or-create instead of a true upsert.
    const existing = await prisma.client.findFirst({ where: { name: c.name } });
    const client =
      existing ??
      (await prisma.client.create({
        data: {
          name: c.name,
          type: c.type,
          regNumber: c.regNumber,
          attorneyOfRecordId: staffByUsername.get(c.attorneyUsername),
          clientSince: new Date(`${c.since}-01-01`),
        },
      }));
    clientIdByKey.set(c.key, client.id);
  }
  console.log(`Seeded ${CLIENTS.length} clients`);

  const folderIdByName = new Map<string, string>();
  for (const name of FOLDERS) {
    const folder = await prisma.folder.upsert({ where: { name }, update: {}, create: { name } });
    folderIdByName.set(name, folder.id);
  }
  console.log(`Seeded ${FOLDERS.length} folders`);

  for (const tag of TAGS) {
    await prisma.tag.upsert({ where: { name: tag.name }, update: { colorClass: tag.colorClass }, create: tag });
  }
  console.log(`Seeded ${TAGS.length} tags`);

  const caseIdByKey = new Map<string, string>();
  for (const matter of CASES) {
    const record = await prisma.case.upsert({
      where: { caseNumber: matter.caseNumber },
      update: {},
      create: {
        caseNumber: matter.caseNumber,
        title: matter.title,
        clientId: clientIdByKey.get(matter.clientKey)!,
        status: matter.status,
        matterType: matter.matterType,
        location: matter.location,
        leadAttorneyId: staffByUsername.get(matter.leadAttorneyUsername),
        registry: matter.registry,
        openedAt: new Date(matter.opened),
        closedAt: matter.status === "CLOSED" ? new Date("2025-03-01") : null,
      },
    });
    caseIdByKey.set(matter.key, record.id);
  }
  console.log(`Seeded ${CASES.length} cases`);

  for (const doc of DOCUMENTS) {
    const existing = await prisma.document.findFirst({
      where: { name: doc.name, clientId: clientIdByKey.get(doc.clientKey) },
    });
    if (existing) continue;

    const created = await prisma.document.create({
      data: {
        name: doc.name,
        fileType: doc.fileType,
        status: doc.status,
        clientId: clientIdByKey.get(doc.clientKey)!,
        caseId: doc.caseKey ? caseIdByKey.get(doc.caseKey) : undefined,
        folderId: folderIdByName.get(doc.folder),
        uploadedById: staffByUsername.get(doc.uploadedByUsername)!,
        sizeBytes: doc.sizeBytes,
      },
    });

    await prisma.auditLogEntry.create({
      data: {
        actorId: staffByUsername.get(doc.uploadedByUsername),
        action: "UPLOADED",
        targetLabel: created.name,
        documentId: created.id,
        caseId: created.caseId,
        sourceIp: "41.220.14.8",
      },
    });
  }
  console.log(`Seeded ${DOCUMENTS.length} documents`);

  console.log("Seed complete.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
