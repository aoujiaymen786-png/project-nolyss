const express = require('express');
const {
  createClient,
  getClients,
  getClientById,
  updateClient,
  deleteClient,
  addClientInteraction,
  addClientDocument,
} = require('../controllers/clientController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');
const { validateClient } = require('../middleware/validationMiddleware');

const router = express.Router();

router.route('/')
  .post(protect, authorize('CREATE_CLIENT'), validateClient, createClient)
  .get(protect, authorize('VIEW_CLIENT'), getClients);

router.route('/:id')
  .get(protect, authorize('VIEW_CLIENT'), getClientById)
  .put(protect, authorize('UPDATE_CLIENT'), validateClient, updateClient)
  .delete(protect, authorize('DELETE_CLIENT'), deleteClient);

router.post('/:id/interactions', protect, authorize('UPDATE_CLIENT'), addClientInteraction);
router.post('/:id/documents', protect, authorize('UPDATE_CLIENT'), addClientDocument);

module.exports = router;