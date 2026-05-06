const prisma = require('../utils/prisma');
const { taskSchema, taskUpdateSchema, commentSchema } = require('../utils/validators');

async function getMyTasks(req, res, next) {
  try {
    const tasks = await prisma.task.findMany({
      where: { assigneeId: req.user.id },
      include: {
        project: { select: { id: true, name: true, color: true } },
        assignee: { select: { id: true, name: true, avatar: true } }
      },
      orderBy: [{ dueDate: 'asc' }, { priority: 'desc' }]
    });
    res.json({ tasks });
  } catch (err) {
    next(err);
  }
}

async function createTask(req, res, next) {
  try {
    const data = taskSchema.parse(req.body);
    const { projectId } = req.params;

    if (data.assigneeId) {
      const isMember = await prisma.projectMember.findUnique({
        where: { userId_projectId: { userId: data.assigneeId, projectId } }
      });
      if (!isMember) {
        return res.status(400).json({ error: 'Assignee must be a project member' });
      }
    }

    const task = await prisma.task.create({
      data: {
        ...data,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        projectId,
        creatorId: req.user.id
      },
      include: {
        assignee: { select: { id: true, name: true, avatar: true } },
        creator: { select: { id: true, name: true } }
      }
    });

    await prisma.activity.create({
      data: {
        action: 'TASK_CREATED',
        details: `Created task "${task.title}"`,
        userId: req.user.id,
        projectId,
        taskId: task.id
      }
    });

    if (data.assigneeId && data.assigneeId !== req.user.id) {
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: { name: true }
      });
      await prisma.notification.create({
        data: {
          type: 'TASK_ASSIGNED',
          message: `${req.user.name} assigned you "${task.title}" in "${project.name}"`,
          link: `/projects/${projectId}`,
          userId: data.assigneeId
        }
      });
    }

    res.status(201).json({ task });
  } catch (err) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ error: err.errors[0].message });
    }
    next(err);
  }
}

async function updateTask(req, res, next) {
  try {
    const data = taskUpdateSchema.parse(req.body);
    const { projectId, taskId } = req.params;

    const existingTask = await prisma.task.findFirst({
      where: { id: taskId, projectId }
    });
    if (!existingTask) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Members can only update status of tasks assigned to them
    if (req.membership.role === 'MEMBER') {
      if (existingTask.assigneeId !== req.user.id) {
        return res.status(403).json({ error: 'You can only update tasks assigned to you' });
      }
      const allowedFields = ['status'];
      const attemptedFields = Object.keys(data);
      const disallowed = attemptedFields.filter(f => !allowedFields.includes(f));
      if (disallowed.length > 0) {
        return res.status(403).json({ error: 'Members can only update task status' });
      }
    }

    if (data.assigneeId) {
      const isMember = await prisma.projectMember.findUnique({
        where: { userId_projectId: { userId: data.assigneeId, projectId } }
      });
      if (!isMember) {
        return res.status(400).json({ error: 'Assignee must be a project member' });
      }
    }

    const task = await prisma.task.update({
      where: { id: taskId },
      data: req.membership.role === 'MEMBER' ? { status: data.status } : {
        ...data,
        dueDate: data.dueDate !== undefined ? (data.dueDate ? new Date(data.dueDate) : null) : undefined
      },
      include: {
        assignee: { select: { id: true, name: true, avatar: true } },
        creator: { select: { id: true, name: true } }
      }
    });

    // Log status changes
    if (data.status && data.status !== existingTask.status) {
      await prisma.activity.create({
        data: {
          action: 'TASK_STATUS_CHANGED',
          details: `Moved "${task.title}" to ${data.status.replace('_', ' ')}`,
          userId: req.user.id,
          projectId,
          taskId: task.id
        }
      });
    }

    res.json({ task });
  } catch (err) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ error: err.errors[0].message });
    }
    next(err);
  }
}

async function deleteTask(req, res, next) {
  try {
    const { projectId, taskId } = req.params;

    const task = await prisma.task.findFirst({ where: { id: taskId, projectId } });
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    await prisma.task.delete({ where: { id: taskId } });

    await prisma.activity.create({
      data: {
        action: 'TASK_DELETED',
        details: `Deleted task "${task.title}"`,
        userId: req.user.id,
        projectId
      }
    });

    res.json({ message: 'Task deleted' });
  } catch (err) {
    next(err);
  }
}

async function addComment(req, res, next) {
  try {
    const data = commentSchema.parse(req.body);
    const { taskId } = req.params;

    const comment = await prisma.comment.create({
      data: {
        content: data.content,
        taskId,
        userId: req.user.id
      },
      include: {
        user: { select: { id: true, name: true, avatar: true } }
      }
    });

    res.status(201).json({ comment });
  } catch (err) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ error: err.errors[0].message });
    }
    next(err);
  }
}

async function getComments(req, res, next) {
  try {
    const comments = await prisma.comment.findMany({
      where: { taskId: req.params.taskId },
      include: {
        user: { select: { id: true, name: true, avatar: true } }
      },
      orderBy: { createdAt: 'asc' }
    });
    res.json({ comments });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getMyTasks,
  createTask,
  updateTask,
  deleteTask,
  addComment,
  getComments
};
