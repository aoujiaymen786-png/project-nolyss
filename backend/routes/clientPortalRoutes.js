const express = require('express');
const {
  getClientProjects,
  getClientInvoices,
  getClientQuotes,
  getClientQuoteById,
  clientAcceptRefuseQuote,
  getClientDeliverables,
  getClientClaims,
  createClientClaim,
} = require('../controllers/clientPortalController');
const { protect } = require('../middleware/authMiddleware');
const { clientPortalAccess } = require('../middleware/clientPortalMiddleware');

const router = express.Router();

router.get('/projects', protect, clientPortalAccess, getClientProjects);
router.get('/invoices', protect, clientPortalAccess, getClientInvoices);
router.get('/quotes', protect, clientPortalAccess, getClientQuotes);
router.get('/quotes/:id', protect, clientPortalAccess, getClientQuoteById);
router.patch('/quotes/:id/accept-refuse', protect, clientPortalAccess, clientAcceptRefuseQuote);
router.get('/deliverables', protect, clientPortalAccess, getClientDeliverables);
router.get('/claims', protect, clientPortalAccess, getClientClaims);
router.post('/claims', protect, clientPortalAccess, createClientClaim);

module.exports = router;