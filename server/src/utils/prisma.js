const { PrismaClient } = require('@prisma/client');

if (!process.env.DATABASE_URL) {
  console.error('FATAL: DATABASE_URL environment variable is not set');
  process.exit(1);
}

const prisma = new PrismaClient();

module.exports = prisma;
