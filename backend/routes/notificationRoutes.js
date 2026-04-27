const express = require('express');
const { getMyNotifications, markAsRead, markAllAsRead, deleteMyNotification } = require('../controllers/notificationController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

router.get('/', getMyNotifications);
router.patch('/read-all', markAllAsRead);
router.patch('/:id/read', markAsRead);
router.delete('/:id', deleteMyNotification);

module.exports = router;
