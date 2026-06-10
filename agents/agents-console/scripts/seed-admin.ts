import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/password";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL ?? "admin@example.com";
  const password = process.env.ADMIN_PASSWORD ?? "ChangeMe123!";

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      passwordHash: hashPassword(password),
      role: "admin"
    },
    create: {
      email,
      name: "Admin",
      passwordHash: hashPassword(password),
      role: "admin"
    }
  });

  console.log(`Admin user ready: ${user.email}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
