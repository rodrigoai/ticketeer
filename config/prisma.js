const { PrismaClient } = require('../generated/prisma');

const globalForPrisma = globalThis;

const prisma = globalForPrisma.__ticketeerPrisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.__ticketeerPrisma = prisma;
}

module.exports = prisma;
