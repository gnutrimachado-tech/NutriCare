/* eslint-disable @typescript-eslint/no-require-imports */
const { PrismaClient } = require('../app/generated/prisma');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash('123456', 10);

  const user = await prisma.user.upsert({
    where: { email: 'admin@nutricare.com' },
    update: {},
    create: {
      name: 'Administrador',
      email: 'admin@nutricare.com',
      password: hashedPassword,
    },
  });

  console.log('Usuário criado com sucesso:', user.email);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });