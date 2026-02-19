require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  await prisma.surveyModule.create({
  data: {
    key: "firm_alignment_v1",
    title: "Firm Alignment v1",
    scope: "FIRM",
    version: 1
  }
})


  console.log('Created.');
})()
.finally(async () => {
  await prisma.$disconnect();
});
