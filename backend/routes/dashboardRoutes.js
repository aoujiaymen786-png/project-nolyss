const express = require('express');
const { getDashboardStats, getExecutiveDashboard, getDirectorDashboard, getCoordinatorDashboard, getAdminStats, getManagerStats, getTeamMemberStats, getClientStats } = require('../controllers/dashboardController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

const router = express.Router();

router.get('/stats', protect, getDashboardStats);
router.get('/executive', protect, authorize('VIEW_EXECUTIVE_DASHBOARD'), getExecutiveDashboard);
router.get('/director', protect, authorize('VIEW_EXECUTIVE_DASHBOARD'), getDirectorDashboard);
router.get('/coordinator-stats', protect, authorize('VIEW_COORDINATOR_DASHBOARD'), getCoordinatorDashboard);
router.get('/admin-stats', protect, authorize('VIEW_ADMIN_DASHBOARD'), getAdminStats);
router.get('/my-projects-stats', protect, authorize('VIEW_PROGRESS_REPORTS'), getManagerStats);
router.get('/team-member-stats', protect, getTeamMemberStats);
router.get('/client-stats', protect, authorize('VIEW_CLIENT_PORTAL'), getClientStats);

module.exports = router;