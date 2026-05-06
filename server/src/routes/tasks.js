const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');
const { authenticate, requireRole } = require('../middleware/auth');

router.use(authenticate);

router.get('/my-tasks', taskController.getMyTasks);
router.post('/:projectId', requireRole('ADMIN'), taskController.createTask);
router.put('/:projectId/:taskId', requireRole(), taskController.updateTask);
router.delete('/:projectId/:taskId', requireRole('ADMIN'), taskController.deleteTask);
router.post('/:projectId/:taskId/comments', requireRole(), taskController.addComment);
router.get('/:projectId/:taskId/comments', requireRole(), taskController.getComments);

module.exports = router;
