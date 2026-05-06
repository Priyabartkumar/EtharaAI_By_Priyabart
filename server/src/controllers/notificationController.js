const prisma = require('../utils/prisma');

async function getNotifications(req, res, next) {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      take: 30
    });

    const unreadCount = await prisma.notification.count({
      where: { userId: req.user.id, read: false }
    });

    res.json({ notifications, unreadCount });
  } catch (err) {
    next(err);
  }
}

async function markAsRead(req, res, next) {
  try {
    const { notificationId } = req.params;

    await prisma.notification.updateMany({
      where: { id: notificationId, userId: req.user.id },
      data: { read: true }
    });

    res.json({ message: 'Marked as read' });
  } catch (err) {
    next(err);
  }
}

async function markAllAsRead(req, res, next) {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user.id, read: false },
      data: { read: true }
    });

    res.json({ message: 'All marked as read' });
  } catch (err) {
    next(err);
  }
}

module.exports = { getNotifications, markAsRead, markAllAsRead };
