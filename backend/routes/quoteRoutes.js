const express = require('express');
const {
  createQuote,
  getQuotes,
  getQuoteById,
  updateQuote,
  deleteQuote,
  convertQuoteToInvoice,
  convertQuoteToProject,
  validateQuote,
  getQuoteTemplates,
  createQuoteTemplate,
} = require('../controllers/quoteController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

const router = express.Router();

router.route('/')
  .post(protect, authorize('CREATE_QUOTE'), createQuote)
  .get(protect, getQuotes);

router.route('/templates')
  .get(protect, getQuoteTemplates)
  .post(protect, authorize('CREATE_QUOTE'), createQuoteTemplate);

router.route('/:id')
  .get(protect, getQuoteById)
  .put(protect, authorize('UPDATE_QUOTE'), updateQuote)
  .delete(protect, authorize('DELETE_QUOTE'), deleteQuote);

router.post('/:id/convert', protect, authorize('CONVERT_QUOTE'), convertQuoteToInvoice);
router.post('/:id/convert-to-project', protect, convertQuoteToProject);
router.patch('/:id/validate', protect, authorize('VALIDATE_QUOTE'), validateQuote);

module.exports = router;