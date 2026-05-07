const bcrypt = require('bcryptjs');
const prisma = require('../utils/prisma');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require('../utils/jwt');
const { signupSchema, loginSchema } = require('../utils/validators');

async function signup(req, res, next) {
  try {
    const data = signupSchema.parse(req.body);

    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const userCount = await prisma.user.count();
    const role = userCount === 0 ? 'ADMIN' : 'MEMBER';

    const hashedPassword = await bcrypt.hash(data.password, 12);
    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        password: hashedPassword,
        role
      },
      select: { id: true, name: true, email: true, role: true }
    });

    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    res.status(201).json({ user, accessToken, refreshToken });
  } catch (err) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ error: err.errors[0].message });
    }
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const data = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email: data.email } });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const validPassword = await bcrypt.compare(data.password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    res.json({
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      accessToken,
      refreshToken
    });
  } catch (err) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ error: err.errors[0].message });
    }
    next(err);
  }
}

async function refresh(req, res, next) {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token required' });
    }

    const payload = verifyRefreshToken(refreshToken);
    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    const newAccessToken = generateAccessToken(user.id);
    const newRefreshToken = generateRefreshToken(user.id);

    res.json({ accessToken: newAccessToken, refreshToken: newRefreshToken });
  } catch (err) {
    return res.status(401).json({ error: 'Invalid refresh token' });
  }
}

async function getMe(req, res, next) {
  try {
    const memberships = await prisma.projectMember.findMany({
      where: { userId: req.user.id },
      select: { role: true, projectId: true }
    });

    res.json({
      user: {
        ...req.user,
        memberships
      }
    });
  } catch (err) {
    next(err);
  }
}

async function transferAdmin(req, res, next) {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const targetUser = await prisma.user.findUnique({ where: { email } });
    if (!targetUser) {
      return res.status(404).json({ error: 'No user found with that email' });
    }

    if (targetUser.id === req.user.id) {
      return res.status(400).json({ error: 'You are already the admin' });
    }

    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Only the admin can transfer the role' });
    }

    await prisma.user.update({ where: { id: req.user.id }, data: { role: 'MEMBER' } });
    await prisma.user.update({ where: { id: targetUser.id }, data: { role: 'ADMIN' } });

    const adminMemberships = await prisma.projectMember.findMany({
      where: { userId: req.user.id, role: 'ADMIN' }
    });

    for (const membership of adminMemberships) {
      await prisma.projectMember.update({
        where: { id: membership.id },
        data: { role: 'MEMBER' }
      });

      const existingMembership = await prisma.projectMember.findUnique({
        where: {
          userId_projectId: {
            userId: targetUser.id,
            projectId: membership.projectId
          }
        }
      });

      if (existingMembership) {
        await prisma.projectMember.update({
          where: { id: existingMembership.id },
          data: { role: 'ADMIN' }
        });
      } else {
        await prisma.projectMember.create({
          data: {
            userId: targetUser.id,
            projectId: membership.projectId,
            role: 'ADMIN'
          }
        });
      }

      await prisma.activity.create({
        data: {
          action: 'ADMIN_TRANSFERRED',
          details: `Admin role transferred from ${req.user.name} to ${targetUser.name}`,
          userId: req.user.id,
          projectId: membership.projectId
        }
      });
    }

    res.json({ message: 'Admin role transferred successfully', forceLogout: true });
  } catch (err) {
    next(err);
  }
}

async function hostAdmin(req, res, next) {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const targetUser = await prisma.user.findUnique({ where: { email } });
    if (!targetUser) {
      return res.status(404).json({ error: 'No user found with that email' });
    }

    if (targetUser.id === req.user.id) {
      return res.status(400).json({ error: 'You are already an admin' });
    }

    // Check caller is admin in at least one project
    const adminMemberships = await prisma.projectMember.findMany({
      where: { userId: req.user.id, role: 'ADMIN' }
    });

    if (adminMemberships.length === 0) {
      return res.status(403).json({ error: 'You are not an admin of any project' });
    }

    const results = [];

    for (const membership of adminMemberships) {
      // Count current admins in this project
      const adminCount = await prisma.projectMember.count({
        where: { projectId: membership.projectId, role: 'ADMIN' }
      });

      if (adminCount >= 3) {
        results.push({ projectId: membership.projectId, skipped: true, reason: 'Max 3 admins reached' });
        continue;
      }

      const existingMembership = await prisma.projectMember.findUnique({
        where: {
          userId_projectId: {
            userId: targetUser.id,
            projectId: membership.projectId
          }
        }
      });

      if (existingMembership) {
        if (existingMembership.role === 'ADMIN') {
          results.push({ projectId: membership.projectId, skipped: true, reason: 'Already an admin' });
          continue;
        }
        await prisma.projectMember.update({
          where: { id: existingMembership.id },
          data: { role: 'ADMIN' }
        });
      } else {
        await prisma.projectMember.create({
          data: {
            userId: targetUser.id,
            projectId: membership.projectId,
            role: 'ADMIN'
          }
        });
      }

      await prisma.activity.create({
        data: {
          action: 'ADMIN_ADDED',
          details: `${targetUser.name} was promoted to admin by ${req.user.name}`,
          userId: req.user.id,
          projectId: membership.projectId
        }
      });

      results.push({ projectId: membership.projectId, success: true });
    }

    const anySkipped = results.some(r => r.skipped && r.reason === 'Max 3 admins reached');
    if (anySkipped && !results.some(r => r.success)) {
      return res.status(400).json({ error: 'All projects already have 3 admins' });
    }

    res.json({ message: `${targetUser.name} has been promoted to admin`, results });
  } catch (err) {
    next(err);
  }
}

async function getAllUsers(req, res, next) {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true, avatar: true, role: true },
      orderBy: { name: 'asc' }
    });
    res.json(users);
  } catch (err) {
    next(err);
  }
}

module.exports = { signup, login, refresh, getMe, transferAdmin, hostAdmin, getAllUsers };
