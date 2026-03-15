const { body, validationResult, param, query } = require('express-validator');

// Auth validation
const validateRegister = [
  body('name').trim().notEmpty().withMessage('Le nom est requis').isLength({ min: 2, max: 100 }).withMessage('Le nom doit être entre 2 et 100 caractères'),
  body('email').isEmail().withMessage('Email invalide').normalizeEmail().toLowerCase(),
  body('password').isLength({ min: 6 }).withMessage('Le mot de passe doit contenir au moins 6 caractères'),
  body('role').optional().isIn(['teamMember', 'projectManager', 'coordinator', 'director']).withMessage('Rôle invalide'),
  handleValidationErrors,
];

const validateLogin = [
  body('email').isEmail().withMessage('Email invalide').normalizeEmail().toLowerCase(),
  body('password').notEmpty().withMessage('Le mot de passe est requis'),
  handleValidationErrors,
];

const validateResetPassword = [
  body('token').notEmpty().withMessage('Token manquant'),
  body('password').isLength({ min: 6 }).withMessage('Le mot de passe doit contenir au moins 6 caractères'),
  handleValidationErrors,
];

const validateForgotPassword = [
  body('email').isEmail().withMessage('Email invalide').normalizeEmail().toLowerCase(),
  handleValidationErrors,
];

const validateVerifyEmail = [
  body('token').notEmpty().withMessage('Token manquant'),
  handleValidationErrors,
];

// Admin - User management validation
const validateUserCreate = [
  body('name').trim().notEmpty().withMessage('Le nom est requis').isLength({ min: 2, max: 100 }),
  body('email').isEmail().withMessage('Email invalide').normalizeEmail().toLowerCase(),
  body('password').isLength({ min: 6 }).withMessage('Le mot de passe doit contenir au moins 6 caractères'),
  body('role').isIn(['admin', 'director', 'coordinator', 'projectManager', 'teamMember', 'client']).withMessage('Rôle invalide'),
  body('phone').optional().trim(),
  body('isActive').optional().isBoolean(),
  handleValidationErrors,
];

const validateUserUpdate = [
  body('name').optional().trim().isLength({ min: 2, max: 100 }),
  body('email').optional().isEmail().normalizeEmail().toLowerCase(),
  body('password').optional().isLength({ min: 6 }),
  body('role').optional().isIn(['admin', 'director', 'coordinator', 'projectManager', 'teamMember', 'client']),
  body('phone').optional().trim(),
  body('isActive').optional().isBoolean(),
  handleValidationErrors,
];

// Client validation
const validateClient = [
  body('name').notEmpty().withMessage('Le nom est requis').trim(),
  body('sector').optional().trim(),
  body('siret').optional().trim(),
  body('email').optional().isEmail().withMessage('Email invalide'),
  body('phone').optional().trim(),
  body('billingAddress').optional(),
  body('deliveryAddress').optional(),
  body('contacts').optional().isArray(),
  body('commercialTerms').optional(),
  body('tags').optional().isArray(),
  handleValidationErrors,
];

// Project validation (cycle de vie: prospecting, inProgress, validation, completed, archived — les devis sont liés à un projet, pas un statut de projet)
const validateProject = [
  body('name').notEmpty().withMessage('Le nom du projet est requis').trim(),
  body('client').isMongoId().withMessage('Client invalide'),
  body('type').optional().trim(),
  body('description').optional().trim(),
  body('objectives').optional().trim(),
  body('status').optional().isIn(['prospecting', 'inProgress', 'validation', 'completed', 'archived']).withMessage('Statut invalide'),
  body('estimatedBudget').optional().isFloat({ min: 0 }).withMessage('Budget invalide'),
  body('estimatedHours').optional().isFloat({ min: 0 }).withMessage('Heures invalides'),
  body('startDate').optional().isISO8601().withMessage('Date de début invalide'),
  body('endDate').optional().isISO8601().withMessage('Date de fin invalide'),
  body('deadline').optional().isISO8601().withMessage('Date d\'échéance invalide'),
  handleValidationErrors,
];

// Task validation
const validateTask = [
  body('title').notEmpty().withMessage('Le titre est requis').trim(),
  body('project').isMongoId().withMessage('Projet invalide'),
  body('description').optional().trim(),
  body('status').optional().isIn(['todo', 'inProgress', 'review', 'done']).withMessage('Statut invalide'),
  body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']).withMessage('Priorité invalide'),
  body('assignee').optional().isMongoId().withMessage('Assignataire invalide'),
  body('dueDate').optional().isISO8601().withMessage('Date limite invalide'),
  body('estimatedHours').optional().isFloat({ min: 0 }).withMessage('Heures estimées invalides'),
  handleValidationErrors,
];

// Quote validation
const validateQuote = [
  body('project').isMongoId().withMessage('Projet invalide'),
  body('items').isArray({ min: 1 }).withMessage('Au moins une ligne est requise'),
  body('items.*.description').notEmpty().withMessage('Description requise'),
  body('items.*.quantity').isFloat({ min: 0 }).withMessage('Quantité invalide'),
  body('items.*.unitPrice').isFloat({ min: 0 }).withMessage('Prix unitaire invalide'),
  body('items.*.vatRate').optional().isFloat({ min: 0, max: 100 }).withMessage('TVA invalide'),
  body('validUntil').optional().isISO8601().withMessage('Date d\'expiration invalide'),
  handleValidationErrors,
];

// Invoice validation
const validateInvoice = [
  body('project').isMongoId().withMessage('Projet invalide'),
  body('items').isArray({ min: 1 }).withMessage('Au moins une ligne est requise'),
  body('items.*.description').notEmpty().withMessage('Description requise'),
  body('items.*.quantity').isFloat({ min: 0 }).withMessage('Quantité invalide'),
  body('items.*.unitPrice').isFloat({ min: 0 }).withMessage('Prix unitaire invalide'),
  body('items.*.vatRate').optional().isFloat({ min: 0, max: 100 }).withMessage('TVA invalide'),
  body('dueDate').optional().isISO8601().withMessage('Date d\'expiration invalide'),
  handleValidationErrors,
];

// Middleware utilitaire
function handleValidationErrors(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      message: 'Données invalides',
      errors: errors.array() 
    });
  }
  next();
}

module.exports = { 
  validateRegister,
  validateLogin,
  validateResetPassword,
  validateForgotPassword,
  validateVerifyEmail,
  validateUserCreate,
  validateUserUpdate,
  validateClient, 
  validateProject,
  validateTask,
  validateQuote,
  validateInvoice,
  handleValidationErrors,
};