const express = require('express');
const {
  createInvoice,
  getInvoices,
  getInvoiceById,
  updateInvoice,
  deleteInvoice,
  validateInvoice,
  recordPayment,
  exportFEC,
} = require('../controllers/invoiceController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

const router = express.Router();

router.route('/')
  .post(protect, authorize('CREATE_INVOICE'), createInvoice)
  .get(protect, getInvoices);

router.get('/export-fec', protect, exportFEC);

router.route('/:id')
  .get(protect, getInvoiceById)
  .put(protect, authorize('UPDATE_INVOICE'), updateInvoice)
  .delete(protect, authorize('DELETE_INVOICE'), deleteInvoice);

router.patch('/:id/validate', protect, authorize('VALIDATE_INVOICE'), validateInvoice);
router.post('/:id/payments', protect, recordPayment);

module.exports = router;