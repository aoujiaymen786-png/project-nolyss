const express = require('express');
const { createClientPayment } = require('../controllers/clientPortalController');
const { protect } = require('../middleware/authMiddleware');
const { clientPortalAccess } = require('../middleware/clientPortalMiddleware');

const router = express.Router();

// Paiement déclenché depuis le portail client
router.post('/', protect, clientPortalAccess, createClientPayment);

module.exports = router;

