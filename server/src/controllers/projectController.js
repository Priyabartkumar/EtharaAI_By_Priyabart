const prisma = require('../utils/prisma');
const { projectSchema } = require('../utils/validators');

async function listProjects(req, res, next) {
  try {
    const projects = await prisma.project.findMany({
      where: {
        members: { some: { userId: req.user.id } }
      },
      include: {
        members: {
          include: { user: { select: { id: true, name: true, email: true, avatar: true } } }
        },
        _count: { select: { tasks: true } }
      },
      orderBy: { updatedAt: 'desc' }
    });
    res.json({ projects });
  } catch (err) {
    next(err);
  }
}

async function createProject(req, res, next) {
  try {
    const data = projectSchema.parse(req.body);

    const project = await prisma.project.create({
      data: {
        ...data,
        members: {
          create: { userId: req.user.id, role: 'ADMIN' }
        }
      },
      include: {
        members: {
          include: { user: { select: { id: true, name: true, email: true } } }
        }
      }
    });

    await prisma.activity.create({
      data: {
        action: 'PROJECT_CREATED',
        details: `Created project "${project.name}"`,
        userId: req.user.id,
        projectId: project.id
      }
    });

    res.status(201).json({ project });
  } catch (err) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ error: err.errors[0].message });
    }
    next(err);
  }
}

async function getProject(req, res, next) {
  try {
    const project = await prisma.project.findUnique({
      where: { id: req.params.projectId },
      include: {
        members: {
          include: { user: { select: { id: true, name: true, email: true, avatar: true } } }
        },
        tasks: {
          include: {
            assignee: { select: { id: true, name: true, avatar: true } }
          },
          orderBy: [{ status: 'asc' }, { position: 'asc' }]
        }
      }
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Members only see tasks assigned to them
    if (req.membership.role === 'MEMBER') {
      project.tasks = project.tasks.filter(t => t.assigneeId === req.user.id);
    }

    res.json({ project, userRole: req.membership.role });
  } catch (err) {
    next(err);
  }
}

async function updateProject(req, res, next) {
  try {
    const data = projectSchema.parse(req.body);
    const project = await prisma.project.update({
      where: { id: req.params.projectId },
      data
    });
    res.json({ project });
  } catch (err) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ error: err.errors[0].message });
    }
    next(err);
  }
}

async function deleteProject(req, res, next) {
  try {
    await prisma.project.delete({ where: { id: req.params.projectId } });
    res.json({ message: 'Project deleted' });
  } catch (err) {
    next(err);
  }
}

async function getMembers(req, res, next) {
  try {
    const members = await prisma.projectMember.findMany({
      where: { projectId: req.params.projectId },
      include: { user: { select: { id: true, name: true, email: true, avatar: true } } }
    });
    res.json({ members });
  } catch (err) {
    next(err);
  }
}

async function addMember(req, res, next) {
  try {
    const { email, role } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(404).json({ error: 'User not found with that email' });
    }

    const existing = await prisma.projectMember.findUnique({
      where: { userId_projectId: { userId: user.id, projectId: req.params.projectId } }
    });
    if (existing) {
      return res.status(409).json({ error: 'User is already a member' });
    }

    const member = await prisma.projectMember.create({
      data: {
        userId: user.id,
        projectId: req.params.projectId,
        role: role === 'ADMIN' ? 'ADMIN' : 'MEMBER'
      },
      include: { user: { select: { id: true, name: true, email: true, avatar: true } } }
    });

    const project = await prisma.project.findUnique({
      where: { id: req.params.projectId },
      select: { name: true }
    });

    await prisma.activity.create({
      data: {
        action: 'MEMBER_ADDED',
        details: `Added ${user.name} to the project`,
        userId: req.user.id,
        projectId: req.params.projectId
      }
    });

    await prisma.notification.create({
      data: {
        type: 'ADDED_TO_PROJECT',
        message: `${req.user.name} added you to "${project.name}"`,
        link: `/projects/${req.params.projectId}`,
        userId: user.id
      }
    });

    res.status(201).json({ member });
  } catch (err) {
    next(err);
  }
}

async function removeMember(req, res, next) {
  try {
    const { projectId, userId } = req.params;

    if (userId === req.user.id) {
      return res.status(400).json({ error: 'Cannot remove yourself' });
    }

    await prisma.projectMember.delete({
      where: { userId_projectId: { userId, projectId } }
    });

    await prisma.activity.create({
      data: {
        action: 'MEMBER_REMOVED',
        details: `Removed a member from the project`,
        userId: req.user.id,
        projectId
      }
    });

    res.json({ message: 'Member removed' });
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Member not found' });
    }
    next(err);
  }
}

async function getActivities(req, res, next) {
  try {
    const activities = await prisma.activity.findMany({
      where: { projectId: req.params.projectId },
      include: {
        user: { select: { id: true, name: true, avatar: true } },
        task: { select: { id: true, title: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 50
    });
    res.json({ activities });
  } catch (err) {
    next(err);
  }
}

async function getProjectComments(req, res, next) {
  try {
    const comments = await prisma.projectComment.findMany({
      where: { projectId: req.params.projectId },
      include: {
        user: { select: { id: true, name: true, avatar: true } }
      },
      orderBy: { createdAt: 'asc' }
    });

    const members = await prisma.projectMember.findMany({
      where: { projectId: req.params.projectId },
      select: { userId: true, role: true }
    });
    const roleMap = Object.fromEntries(members.map(m => [m.userId, m.role]));

    const enriched = comments.map(c => ({
      ...c,
      userRole: roleMap[c.userId] || 'MEMBER'
    }));

    res.json({ comments: enriched });
  } catch (err) {
    next(err);
  }
}

async function addProjectComment(req, res, next) {
  try {
    const { content } = req.body;
    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Comment cannot be empty' });
    }

    const comment = await prisma.projectComment.create({
      data: {
        content: content.trim(),
        userId: req.user.id,
        projectId: req.params.projectId
      },
      include: {
        user: { select: { id: true, name: true, avatar: true } }
      }
    });

    comment.userRole = req.membership.role;

    const project = await prisma.project.findUnique({
      where: { id: req.params.projectId },
      select: { name: true }
    });

    const members = await prisma.projectMember.findMany({
      where: { projectId: req.params.projectId },
      select: { userId: true }
    });

    const otherMemberIds = members
      .map(m => m.userId)
      .filter(id => id !== req.user.id);

    if (otherMemberIds.length > 0) {
      const preview = content.trim().length > 50
        ? content.trim().substring(0, 50) + '...'
        : content.trim();

      await prisma.notification.createMany({
        data: otherMemberIds.map(userId => ({
          type: 'PROJECT_COMMENT',
          message: `${req.user.name} commented in "${project.name}": "${preview}"`,
          link: `/projects/${req.params.projectId}`,
          userId
        }))
      });
    }

    res.status(201).json({ comment });
  } catch (err) {
    next(err);
  }
}

async function deleteProjectComment(req, res, next) {
  try {
    const { projectId, commentId } = req.params;

    const comment = await prisma.projectComment.findUnique({
      where: { id: commentId }
    });

    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    if (comment.userId !== req.user.id && req.membership.role !== 'ADMIN') {
      return res.status(403).json({ error: 'You can only delete your own comments' });
    }

    await prisma.projectComment.delete({ where: { id: commentId } });
    res.json({ message: 'Comment deleted' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listProjects,
  createProject,
  getProject,
  updateProject,
  deleteProject,
  getMembers,
  addMember,
  removeMember,
  getActivities,
  getProjectComments,
  addProjectComment,
  deleteProjectComment
};
