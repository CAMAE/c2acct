require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  const module = await prisma.surveyModule.findFirst({
    where: { key: 'firm_alignment_v1' }
  });

  await prisma.surveyQuestion.create({
    data: {
      moduleId: module.id,
      key: 'vision_clarity',
      prompt: 'Does the firm have a clearly defined 3-year vision?',
      inputType: 'SCALE',
      weight: 1,
      order: 1
    }
  });

  console.log('Question Created.');
})()
.finally(async () => {
  await prisma.$disconnect();
});
