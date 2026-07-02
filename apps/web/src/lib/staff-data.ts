// Mirrors the demo accounts seeded by packages/db/src/seed.ts.

export type StaffRole = "Admin" | "Attorney" | "Paralegal";

export type StaffMember = {
  id: string;
  name: string;
  email: string;
  role: StaffRole;
  active: boolean;
  lastActive: string;
};

export const STAFF: StaffMember[] = [
  { id: "u1", name: "Tafadzwa Chikamhi", email: "t.chikamhi@cmlaw.co.zw", role: "Admin", active: true, lastActive: "Now" },
  { id: "u2", name: "Rutendo Mareanadzo", email: "r.mareanadzo@cmlaw.co.zw", role: "Admin", active: true, lastActive: "12m ago" },
  { id: "u3", name: "Praise Dube", email: "p.dube@cmlaw.co.zw", role: "Attorney", active: true, lastActive: "1h ago" },
  { id: "u4", name: "Grace Mpofu", email: "g.mpofu@cmlaw.co.zw", role: "Paralegal", active: true, lastActive: "Yesterday" },
  { id: "u5", name: "Simba Nyathi", email: "s.nyathi@cmlaw.co.zw", role: "Paralegal", active: false, lastActive: "3w ago" },
];
