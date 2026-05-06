const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash('password123', 12);

  const alice = await prisma.user.upsert({
    where: { email: 'alice@example.com' },
    update: {},
    create: {
      name: 'Alice Johnson',
      email: 'alice@example.com',
      password
    }
  });

  const bob = await prisma.user.upsert({
    where: { email: 'bob@example.com' },
    update: {},
    create: {
      name: 'Bob Smith',
      email: 'bob@example.com',
      password
    }
  });

  const project = await prisma.project.create({
    data: {
      name: 'Website Redesign',
      description: 'Redesign the company landing page',
      color: '#6366f1',
      members: {
        create: [
          { userId: alice.id, role: 'ADMIN' },
          { userId: bob.id, role: 'MEMBER' }
        ]
      }
    }
  });

  await prisma.task.createMany({
    data: [
      {
        title: 'Design new homepage mockup',
        description: 'Create wireframes and high-fidelity mockups for the landing page',
        status: 'IN_PROGRESS',
        priority: 'HIGH',
        dueDate: new Date('2026-05-15'),
        projectId: project.id,
        assigneeId: alice.id,
        creatorId: alice.id,
        position: 0
      },
      {
        title: 'Set up CI/CD pipeline',
        status: 'TODO',
        priority: 'MEDIUM',
        dueDate: new Date('2026-05-20'),
        projectId: project.id,
        assigneeId: bob.id,
        creatorId: alice.id,
        position: 1
      },
      {
        title: 'Write API documentation',
        status: 'DONE',
        priority: 'LOW',
        projectId: project.id,
        assigneeId: bob.id,
        creatorId: alice.id,
        position: 2
      }
    ]
  });

  console.log('Seed data created successfully');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
