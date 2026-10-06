import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  const username = process.env.ADMIN_USERNAME || "admin";
  const existing = await prisma.user.findUnique({ where: { username } });
  if (!existing || !/^\$2[aby]\$\d{2}\$/.test(existing.password)) {
    const password = process.env.ADMIN_PASSWORD;
    if (!password || password.length < 12 || Buffer.byteLength(password) > 72) {
      throw new Error("Set ADMIN_PASSWORD (12 characters minimum, 72 bytes maximum) to provision the administrator");
    }
    const hashed = await bcrypt.hash(password, 12);
    await prisma.user.upsert({
      where: { username },
      update: { password: hashed, role: "ADMIN" },
      create: { username, password: hashed, role: "ADMIN" }
    });
  }

  const names = ["FIORELLA", "INGRIT", "VALERIA", "CRISTHIAN", "ABIGAIL", "NEW ADVISOR"];
  for (const name of names) {
    await prisma.salesperson.upsert({ where: { name }, update: {}, create: { name } });
  }

  for (const name of ["Ing. Salazar", "Ing. Rojas", "Dra. Torres"]) {
    await prisma.instructor.upsert({ where: { name }, update: {}, create: { name } });
  }

  for (const name of ["ISO 9001", "ISO 45001", "SST Induction", "First Aid"]) {
    await prisma.course.upsert({ where: { name }, update: {}, create: { name } });
  }

  const locations = [
    { department: "Lima", district: "San Isidro" },
    { department: "Lima", district: "Miraflores" },
    { department: "Arequipa", district: "Cayma" }
  ];

  for (const location of locations) {
    await prisma.location.upsert({
      where: { department_district: location },
      update: {},
      create: location
    });
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Seed failed");
  process.exitCode = 1;
}).finally(() => prisma.$disconnect());
