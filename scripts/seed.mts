import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../lib/generated/prisma/client.js";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const OWNERS: Array<{ name: string; color: string }> = [
  { name: "Ramiro", color: "#e0562f" },
  { name: "Player 2", color: "#2f7de0" },
  { name: "Player 3", color: "#38a169" },
  { name: "Player 4", color: "#9f5fd0" },
  { name: "DM", color: "#b8912f" },
];

for (const owner of OWNERS) {
  await prisma.owner.upsert({
    where: { name: owner.name },
    update: {},
    create: owner,
  });
}

console.log("seeded owners:", (await prisma.owner.findMany()).map((o) => o.name).join(", "));
await prisma.$disconnect();
