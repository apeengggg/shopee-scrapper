import { runDueCampaigns } from "../src/lib/search-runner";

async function main() {
  const results = await runDueCampaigns();
  console.log(JSON.stringify({ ran: results.length, results }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    const { prisma } = await import("../src/lib/prisma");
    await prisma.$disconnect();
  });
