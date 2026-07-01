import prisma from "./index";
import { hashPassword } from "./password";

// Demo staff accounts matching the C&M DMS design mockups (Users & Roles screen).
// Run with: pnpm db:seed  (after db:push). Passwords below are dev-only — rotate before any real use.
const STAFF = [
  { name: "Tafadzwa Chikamhi", username: "t.chikamhi", email: "t.chikamhi@cmlaw.co.zw", role: "ADMIN" as const, password: "ChangeMe123!" },
  { name: "Rutendo Mareanadzo", username: "r.mareanadzo", email: "r.mareanadzo@cmlaw.co.zw", role: "ADMIN" as const, password: "ChangeMe123!" },
  { name: "Praise Dube", username: "p.dube", email: "p.dube@cmlaw.co.zw", role: "ATTORNEY" as const, password: "ChangeMe123!" },
  { name: "Grace Mpofu", username: "g.mpofu", email: "g.mpofu@cmlaw.co.zw", role: "PARALEGAL" as const, password: "ChangeMe123!" },
];

async function main() {
  for (const staff of STAFF) {
    const { hash, salt } = hashPassword(staff.password);
    await prisma.user.upsert({
      where: { username: staff.username },
      update: {},
      create: {
        name: staff.name,
        username: staff.username,
        email: staff.email,
        role: staff.role,
        passwordHash: hash,
        passwordSalt: salt,
      },
    });
    console.log(`Seeded ${staff.username}`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
