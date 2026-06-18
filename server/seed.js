import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const count = await prisma.group.count();
  if (count > 0) return; // already seeded

  const group = await prisma.group.create({
    data: {
      name: 'ИС-21',
      students: {
        create: [
          { name: 'Иванов Иван' },
          { name: 'Петров Петр' },
          { name: 'Сидорова Анна' },
        ]
      }
    }
  });
  console.log('Seeded database with group and students.');
}
main()
  .then(async () => await prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
