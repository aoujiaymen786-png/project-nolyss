const express = require('express');
const upload = require('../config/cloudinary');
const { uploadTaskAttachment } = require('../controllers/uploadController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/tasks/:taskId/attachments', protect, upload.single('file'), uploadTaskAttachment);

module.exports = router;