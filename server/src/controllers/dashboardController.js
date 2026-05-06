const prisma = require('../utils/prisma');

async function getStats(req, res, next) {
  try {
    const userId = req.user.id;

    const userProjects = await prisma.projectMember.findMany({
      where: { userId },
      select: { projectId: true }
    });
    const projectIds = userProjects.map(p => p.projectId);

    const [totalTasks, todoCount, inProgressCount, doneCount, overdueTasks] = await Promise.all([
      prisma.task.count({ where: { projectId: { in: projectIds } } }),
      prisma.task.count({ where: { projectId: { in: projectIds }, status: 'TODO' } }),
      prisma.task.count({ where: { projectId: { in: projectIds }, status: 'IN_PROGRESS' } }),
      prisma.task.count({ where: { projectId: { in: projectIds }, status: 'DONE' } }),
      prisma.task.count({
        where: {
          projectId: { in: projectIds },
          status: { not: 'DONE' },
          dueDate: { lt: new Date() }
        }
      })
    ]);

    res.json({
      totalTasks,
      byStatus: { todo: todoCount, inProgress: inProgressCount, done: doneCount },
      overdueTasks,
      totalProjects: projectIds.length
    });
  } catch (err) {
    next(err);
  }
}

async function getOverview(req, res, next) {
  try {
    const userId = req.user.id;

    const userProjects = await prisma.projectMember.findMany({
      where: { userId },
      select: { projectId: true }
    });
    const projectIds = userProjects.map(p => p.projectId);

    const tasksByUser = await prisma.task.groupBy({
      by: ['assigneeId'],
      where: { projectId: { in: projectIds } },
      _count: { id: true }
    });

    const assigneeIds = tasksByUser
      .filter(t => t.assigneeId)
      .map(t => t.assigneeId);

    const users = await prisma.user.findMany({
      where: { id: { in: assigneeIds } },
      select: { id: true, name: true, avatar: true }
    });

    const tasksPerUser = tasksByUser
      .filter(t => t.assigneeId)
      .map(t => ({
        user: users.find(u => u.id === t.assigneeId),
        taskCount: t._count.id
      }));

    const upcomingDeadlines = await prisma.task.findMany({
      where: {
        projectId: { in: projectIds },
        status: { not: 'DONE' },
        dueDate: { gte: new Date() }
      },
      include: {
        project: { select: { name: true, color: true } },
        assignee: { select: { id: true, name: true, avatar: true } }
      },
      orderBy: { dueDate: 'asc' },
      take: 10
    });

    const recentActivity = await prisma.activity.findMany({
      where: { projectId: { in: projectIds } },
      include: {
        user: { select: { id: true, name: true, avatar: true } },
        project: { select: { name: true } },
        task: { select: { title: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 15
    });

    res.json({ tasksPerUser, upcomingDeadlines, recentActivity });
  } catch (err) {
    next(err);
  }
}

module.exports = { getStats, getOverview };
