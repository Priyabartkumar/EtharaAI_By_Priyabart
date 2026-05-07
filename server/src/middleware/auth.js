const { verifyAccessToken } = require('../utils/jwt');
const prisma = require('../utils/prisma');

async function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const token = header.split(' ')[1];
    const payload = verifyAccessToken(token);
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, name: true, email: true, avatar: true, role: true }
    });

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
}

function requireRole(...roles) {
  return async (req, res, next) => {
    const { projectId } = req.params;
    if (!projectId) {
      return res.status(400).json({ error: 'Project ID required' });
    }

    const membership = await prisma.projectMember.findUnique({
      where: {
        userId_projectId: {
          userId: req.user.id,
          projectId
        }
      }
    });

    if (!membership) {
      return res.status(403).json({ error: 'Not a member of this project' });
    }

    if (roles.length > 0 && !roles.includes(membership.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    req.membership = membership;
    next();
  };
}

function requireGlobalAdmin(req, res, next) {
  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Only admins can perform this action' });
  }
  next();
}

module.exports = { authenticate, requireRole, requireGlobalAdmin };
