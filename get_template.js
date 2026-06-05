const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.template.findUnique({where: {id: 'eff21653-8f1e-4221-8230-9c48213c90f3'}}).then(t => console.log(JSON.stringify(t, null, 2))).finally(() => prisma.$disconnect());
