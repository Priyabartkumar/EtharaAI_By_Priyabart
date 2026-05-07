const express = require('express');
const router = express.Router();
const projectController = require('../controllers/projectController');
const { authenticate, requireRole, requireGlobalAdmin } = require('../middleware/auth');

router.use(authenticate);

router.get('/', projectController.listProjects);
router.post('/', requireGlobalAdmin, projectController.createProject);
router.get('/:projectId', requireRole(), projectController.getProject);
router.put('/:projectId', requireRole('ADMIN'), projectController.updateProject);
router.delete('/:projectId', requireRole('ADMIN'), projectController.deleteProject);

router.get('/:projectId/members', requireRole(), projectController.getMembers);
router.post('/:projectId/members', requireRole('ADMIN'), projectController.addMember);
router.delete('/:projectId/members/:userId', requireRole('ADMIN'), projectController.removeMember);

router.get('/:projectId/activities', requireRole(), projectController.getActivities);

router.get('/:projectId/comments', requireRole(), projectController.getProjectComments);
router.post('/:projectId/comments', requireRole(), projectController.addProjectComment);
router.delete('/:projectId/comments/:commentId', requireRole(), projectController.deleteProjectComment);

module.exports = router;
