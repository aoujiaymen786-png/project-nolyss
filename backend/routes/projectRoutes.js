const express = require('express');
const {
  createProject,
  getProjects,
  getProjectById,
  updateProject,
  deleteProject,
  getProjectProgress,
  addProjectComment,
  validateProjectAttachment,
} = require('../controllers/projectController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');
const { validateProject } = require('../middleware/validationMiddleware');

const router = express.Router();

router.route('/')
  .post(protect, authorize('CREATE_PROJECT'), validateProject, createProject)
  .get(protect, getProjects);

router.get('/:id/progress', protect, getProjectProgress);
router.post('/:id/comments', protect, addProjectComment);
router.patch('/:id/attachments/:attachmentIndex/validate', protect, authorize('UPDATE_PROJECT'), validateProjectAttachment);

router.route('/:id')
  .get(protect, getProjectById)
  .put(protect, authorize('UPDATE_PROJECT'), validateProject, updateProject)
  .delete(protect, authorize('DELETE_PROJECT'), deleteProject);

module.exports = router;