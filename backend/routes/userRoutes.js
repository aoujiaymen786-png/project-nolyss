const express = require('express');
const {
  getUsers,
  getUserById,
  getPendingRegistrations,
  approveRegistration,
  rejectRegistration,
  createUser,
  updateUser,
  updateUserRole,
  deleteUser,
} = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');
const { validateUserCreate, validateUserUpdate } = require('../middleware/validationMiddleware');

const router = express.Router();

router.use(protect);

// Liste des utilisateurs (admin, director)
router.get('/', authorize('VIEW_USERS'), getUsers);

// Demandes d'inscription en attente (admin uniquement)
router.get('/pending/registrations', authorize('CREATE_USER'), getPendingRegistrations);
router.post('/:id/approve-registration', authorize('CREATE_USER'), approveRegistration);
router.post('/:id/reject-registration', authorize('CREATE_USER'), rejectRegistration);

// Détail utilisateur (admin)
router.get('/:id', authorize('VIEW_USERS'), getUserById);

// CRUD réservé à l'admin
router.post('/', authorize('CREATE_USER'), validateUserCreate, createUser);
router.put('/:id', authorize('UPDATE_USER'), validateUserUpdate, updateUser);
router.patch('/:id/role', authorize('MANAGE_ROLES'), updateUserRole);
router.delete('/:id', authorize('DELETE_USER'), deleteUser);

module.exports = router;
