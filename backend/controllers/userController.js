const User = require('../models/User');
const { logAudit, getRequestMeta } = require('../utils/auditLog');
const notificationService = require('../services/notificationService');

const getUsers = async (req, res) => {
  try {
    const users = await User.find({}).select('-password -refreshToken -twoFactorSecret');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Liste des demandes d'inscription en attente (admin)
// @route   GET /api/users/pending/registrations
// @access  Admin
const getPendingRegistrations = async (req, res) => {
  try {
    const pending = await User.find({ registrationStatus: 'pending' })
      .select('-password -refreshToken -twoFactorSecret')
      .sort({ createdAt: -1 });
    res.json(pending);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Accepter une demande d'inscription (admin)
// @route   POST /api/users/:id/approve-registration
// @access  Admin
const approveRegistration = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'Utilisateur introuvable.' });
    if (user.registrationStatus !== 'pending') {
      return res.status(400).json({ message: 'Cette demande n\'est plus en attente.' });
    }
    user.registrationStatus = 'approved';
    user.isActive = true;
    await user.save();
    try {
      await notificationService.notifyRegistrationDecision(user._id, true);
    } catch (e) {
      console.error('Notification inscription approuvée:', e);
    }

    const meta = getRequestMeta(req);
    await logAudit({
      action: 'APPROVE_REGISTRATION',
      entity: 'User',
      entityId: user._id,
      performedBy: req.user._id,
      performedByEmail: req.user.email,
      changes: { after: { registrationStatus: 'approved' } },
      ...meta,
    });

    const updated = await User.findById(user._id).select('-password -refreshToken -twoFactorSecret');
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Refuser une demande d'inscription (admin)
// @route   POST /api/users/:id/reject-registration
// @access  Admin
const rejectRegistration = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'Utilisateur introuvable.' });
    if (user.registrationStatus !== 'pending') {
      return res.status(400).json({ message: 'Cette demande n\'est plus en attente.' });
    }
    user.registrationStatus = 'rejected';
    await user.save();
    try {
      await notificationService.notifyRegistrationDecision(user._id, false);
    } catch (e) {
      console.error('Notification inscription refusée:', e);
    }

    const meta = getRequestMeta(req);
    await logAudit({
      action: 'REJECT_REGISTRATION',
      entity: 'User',
      entityId: user._id,
      performedBy: req.user._id,
      performedByEmail: req.user.email,
      changes: { after: { registrationStatus: 'rejected' } },
      ...meta,
    });

    const updated = await User.findById(user._id).select('-password -refreshToken -twoFactorSecret');
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Créer un utilisateur (admin)
// @route   POST /api/users
// @access  Admin
const createUser = async (req, res) => {
  try {
    const { name, email, password, phone, role, isActive } = req.body;
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: 'Un utilisateur avec cet email existe déjà.' });
    }
    const user = await User.create({
      name,
      email,
      password: password || 'ChangeMe123!',
      phone: phone || '',
      role: role || 'teamMember',
      isActive: isActive !== false,
    });
    const meta = getRequestMeta(req);
    await logAudit({
      action: 'CREATE_USER',
      entity: 'User',
      entityId: user._id,
      performedBy: req.user._id,
      performedByEmail: req.user.email,
      changes: { created: { email: user.email, role: user.role } },
      ...meta,
    });
    const created = await User.findById(user._id).select('-password -refreshToken -twoFactorSecret');
    res.status(201).json(created);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Modifier un utilisateur (admin)
// @route   PUT /api/users/:id
// @access  Admin
const updateUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'Utilisateur introuvable.' });
    const before = { name: user.name, email: user.email, role: user.role, isActive: user.isActive };
    const { name, email, phone, role, isActive, password } = req.body;
    if (name !== undefined) user.name = name;
    if (email !== undefined) user.email = email;
    if (phone !== undefined) user.phone = phone;
    if (role !== undefined) user.role = role;
    if (isActive !== undefined) user.isActive = isActive;
    if (password && password.length >= 6) user.password = password;
    await user.save();
    const after = { name: user.name, email: user.email, role: user.role, isActive: user.isActive };
    const meta = getRequestMeta(req);
    await logAudit({
      action: 'UPDATE_USER',
      entity: 'User',
      entityId: user._id,
      performedBy: req.user._id,
      performedByEmail: req.user.email,
      changes: { before, after },
      ...meta,
    });
    const updated = await User.findById(user._id).select('-password -refreshToken -twoFactorSecret');
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Modifier le rôle d'un utilisateur (admin)
// @route   PATCH /api/users/:id/role
// @access  Admin
const updateUserRole = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'Utilisateur introuvable.' });
    const previousRole = user.role;
    const { role } = req.body;
    if (!['admin', 'director', 'coordinator', 'projectManager', 'teamMember', 'client'].includes(role)) {
      return res.status(400).json({ message: 'Rôle invalide.' });
    }
    user.role = role;
    await user.save();
    const meta = getRequestMeta(req);
    await logAudit({
      action: 'UPDATE_USER_ROLE',
      entity: 'User',
      entityId: user._id,
      performedBy: req.user._id,
      performedByEmail: req.user.email,
      changes: { before: { role: previousRole }, after: { role } },
      ...meta,
    });
    const updated = await User.findById(user._id).select('-password -refreshToken -twoFactorSecret');
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Supprimer un utilisateur (admin)
// @route   DELETE /api/users/:id
// @access  Admin
const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'Utilisateur introuvable.' });
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: 'Vous ne pouvez pas supprimer votre propre compte.' });
    }
    const snapshot = { email: user.email, role: user.role };
    await User.findByIdAndDelete(req.params.id);
    const meta = getRequestMeta(req);
    await logAudit({
      action: 'DELETE_USER',
      entity: 'User',
      entityId: user._id,
      performedBy: req.user._id,
      performedByEmail: req.user.email,
      changes: { deleted: snapshot },
      ...meta,
    });
    res.json({ message: 'Utilisateur supprimé.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Détail d'un utilisateur (admin)
// @route   GET /api/users/:id
// @access  Admin
const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password -refreshToken -twoFactorSecret');
    if (!user) return res.status(404).json({ message: 'Utilisateur introuvable.' });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getUsers,
  getUserById,
  getPendingRegistrations,
  approveRegistration,
  rejectRegistration,
  createUser,
  updateUser,
  updateUserRole,
  deleteUser,
};
