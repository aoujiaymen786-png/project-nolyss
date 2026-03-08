const User = require('../models/User');
const { generateToken, generateRefreshToken } = require('../utils/generateToken');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const { logAudit, getRequestMeta } = require('../utils/auditLog');

// Rôles soumis à validation d'inscription par l'admin (nouvelle inscription uniquement)
const ROLES_REQUIRING_APPROVAL = ['director', 'coordinator', 'projectManager', 'teamMember'];

// @desc    Inscription
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res) => {
  const { name, email, password, phone, role } = req.body;

  const userExists = await User.findOne({ email });
  if (userExists) {
    return res.status(400).json({ message: 'Utilisateur déjà existant' });
  }

  const normalizedRole = (role || 'teamMember').trim();
  const requiresApproval = ROLES_REQUIRING_APPROVAL.includes(normalizedRole);

  const verificationToken = crypto.randomBytes(32).toString('hex');

  const userData = {
    name,
    email,
    phone,
    password,
    role: normalizedRole,
    isVerified: false,
    verificationToken,
  };

  if (requiresApproval) {
    userData.registrationStatus = 'pending';
  }

  const user = await User.create(userData);

  if (user) {
    if (requiresApproval) {
      return res.status(201).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        requiresApproval: true,
        message: 'Votre inscription a été enregistrée. Vous pourrez vous connecter une fois qu\'un administrateur aura validé votre compte.',
      });
    }

    const accessToken = generateToken(user._id);
    const refreshToken = generateRefreshToken(user._id);
    user.refreshToken = refreshToken;
    await user.save();

    let verificationUrl = null;
    try {
      if (process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS) {
        const transporter = nodemailer.createTransport({
          host: process.env.EMAIL_HOST,
          port: process.env.EMAIL_PORT || 587,
          secure: false,
          auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
        });

        verificationUrl = `${process.env.CLIENT_URL || ''}/verify-email?token=${verificationToken}`;
        await transporter.sendMail({
          from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
          to: user.email,
          subject: 'Vérifiez votre adresse e-mail',
          html: `<p>Bonjour ${user.name},</p><p>Veuillez vérifier votre adresse e-mail en cliquant sur ce lien :</p><p><a href="${verificationUrl}">${verificationUrl}</a></p>`,
        });
      } else {
        verificationUrl = `token:${verificationToken}`;
      }
    } catch (err) {
      console.error('Erreur envoi e-mail de vérification', err);
    }

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      accessToken,
      refreshToken,
      verification: verificationUrl,
    });
  } else {
    res.status(400).json({ message: 'Données invalides' });
  }
};

// @desc    Connexion
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });
  if (!user) return res.status(401).json({ message: 'Email ou mot de passe incorrect' });

  if (!(await user.matchPassword(password))) {
    return res.status(401).json({ message: 'Email ou mot de passe incorrect' });
  }

  if (user.registrationStatus === 'pending') {
    return res.status(403).json({
      message: 'Votre inscription est en attente de validation par l\'administrateur. Vous serez notifié une fois votre compte validé.',
      code: 'REGISTRATION_PENDING',
    });
  }
  if (user.registrationStatus === 'rejected') {
    return res.status(403).json({
      message: 'Votre demande d\'inscription a été refusée. Contactez l\'administrateur pour plus d\'informations.',
      code: 'REGISTRATION_REJECTED',
    });
  }

  const accessToken = generateToken(user._id);
  const refreshToken = generateRefreshToken(user._id);
  user.refreshToken = refreshToken;
  user.lastLoginAt = new Date();
  await user.save();

  res.json({
    _id: user._id,
    name: user.name,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    phone: user.phone,
    role: user.role,
    profilePicture: user.profilePicture,
    jobTitle: user.jobTitle,
    signature: user.signature,
    lastLoginAt: user.lastLoginAt,
    accessToken,
    refreshToken,
  });
};

// @desc    Rafraîchir le token
// @route   POST /api/auth/refresh-token
// @access  Public (avec refresh token)
const refreshToken = async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(401).json({ message: 'Refresh token manquant' });
  }

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.id);

    if (!user || user.refreshToken !== refreshToken) {
      return res.status(401).json({ message: 'Refresh token invalide' });
    }

    // rotate refresh token
    const newAccessToken = generateToken(user._id);
    const newRefreshToken = generateRefreshToken(user._id);
    user.refreshToken = newRefreshToken;
    await user.save();

    res.json({ accessToken: newAccessToken, refreshToken: newRefreshToken });
  } catch (error) {
    res.status(401).json({ message: 'Refresh token invalide' });
  }
};

// @desc Verify email
// @route POST /api/auth/verify-email
// @access Public
const verifyEmail = async (req, res) => {
  const { token, type } = req.body;
  if (!token) return res.status(400).json({ message: 'Token manquant' });

  if (type === 'email-change') {
    const user = await User.findOne({ emailChangeToken: token });
    if (!user || !user.pendingEmail) return res.status(400).json({ message: 'Token invalide' });
    user.email = user.pendingEmail;
    user.pendingEmail = null;
    user.emailChangeToken = null;
    user.isVerified = true;
    await user.save();
    return res.json({ message: 'Nouvel email confirmé et appliqué' });
  }

  // Compatibilité: si le token correspond à un changement d'email,
  // appliquer le changement même sans type explicite.
  const emailChangeUser = await User.findOne({ emailChangeToken: token });
  if (emailChangeUser && emailChangeUser.pendingEmail) {
    emailChangeUser.email = emailChangeUser.pendingEmail;
    emailChangeUser.pendingEmail = null;
    emailChangeUser.emailChangeToken = null;
    emailChangeUser.isVerified = true;
    await emailChangeUser.save();
    return res.json({ message: 'Nouvel email confirmé et appliqué' });
  }

  const user = await User.findOne({ verificationToken: token });
  if (!user) return res.status(400).json({ message: 'Token invalide' });

  user.isVerified = true;
  user.verificationToken = null;
  await user.save();
  res.json({ message: 'Adresse e-mail vérifiée' });
};

// @desc Forgot password
// @route POST /api/auth/forgot-password
// @access Public
const forgotPassword = async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.status(200).json({ message: 'Si ce compte existe, un e-mail a été envoyé.' });

  const token = crypto.randomBytes(32).toString('hex');
  user.passwordResetToken = token;
  user.passwordResetExpires = Date.now() + 60 * 60 * 1000; // 1h
  await user.save();

  let resetUrl = null;
  try {
    if (process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT || 587,
        secure: false,
        auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
      });

      resetUrl = `${process.env.CLIENT_URL || ''}/reset-password?token=${token}`;
      await transporter.sendMail({
        from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
        to: user.email,
        subject: 'Réinitialisation du mot de passe',
        html: `<p>Bonjour ${user.name},</p><p>Pour réinitialiser votre mot de passe, cliquez sur ce lien :</p><p><a href="${resetUrl}">${resetUrl}</a></p>`,
      });
    } else {
      resetUrl = `token:${token}`;
    }
  } catch (err) {
    console.error('Erreur envoi e-mail reset', err);
  }

  res.json({ message: 'Si ce compte existe, un e-mail a été envoyé.', reset: resetUrl });
};

// @desc Reset password
// @route POST /api/auth/reset-password
// @access Public
const resetPassword = async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) return res.status(400).json({ message: 'Données manquantes' });

  const user = await User.findOne({ passwordResetToken: token, passwordResetExpires: { $gt: Date.now() } });
  if (!user) return res.status(400).json({ message: 'Token invalide ou expiré' });

  user.password = password;
  user.passwordResetToken = null;
  user.passwordResetExpires = null;
  await user.save();

  res.json({ message: 'Mot de passe mis à jour' });
};

// @desc    Déconnexion
// @route   POST /api/auth/logout
// @access  Private
const logoutUser = async (req, res) => {
  await User.findByIdAndUpdate(req.user._id, { refreshToken: null });
  res.json({ message: 'Déconnexion réussie' });
};

// @desc    Obtenir l'utilisateur connecté
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
  const user = await User.findById(req.user._id).select('-password -refreshToken');
  res.json(user);
};

// @desc    Mettre a jour mon profil
// @route   PUT /api/auth/me
// @access  Private
const updateMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'Utilisateur non trouvé' });

    const before = {
      name: user.name,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      jobTitle: user.jobTitle,
      signature: user.signature,
      profilePicture: user.profilePicture,
    };

    const { name, firstName, lastName, phone, jobTitle, signature, profilePicture } = req.body;
    if (name !== undefined) user.name = String(name).trim();
    if (firstName !== undefined) user.firstName = String(firstName || '').trim();
    if (lastName !== undefined) user.lastName = String(lastName || '').trim();
    if (phone !== undefined) user.phone = String(phone || '').trim();
    if (jobTitle !== undefined) user.jobTitle = String(jobTitle || '').trim();
    if (signature !== undefined) user.signature = String(signature || '').trim();
    if (profilePicture !== undefined) user.profilePicture = String(profilePicture || '').trim();

    // Maintient name coherent avec first/last si fournis.
    if ((firstName !== undefined || lastName !== undefined) && !name) {
      const merged = `${user.firstName || ''} ${user.lastName || ''}`.trim();
      if (merged) user.name = merged;
    }

    await user.save();

    const meta = getRequestMeta(req);
    await logAudit({
      action: 'UPDATE_PROFILE',
      entity: 'User',
      entityId: user._id,
      performedBy: req.user._id,
      performedByEmail: req.user.email,
      changes: { before, after: {
        name: user.name,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        jobTitle: user.jobTitle,
        signature: user.signature,
        profilePicture: user.profilePicture,
      } },
      ...meta,
    });

    const updated = await User.findById(user._id).select('-password -refreshToken');
    res.json(updated);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Changer mon email (avec verification)
// @route   PATCH /api/auth/me/email
// @access  Private
const updateMyEmail = async (req, res) => {
  try {
    const { currentPassword, newEmail } = req.body;
    if (!currentPassword || !newEmail) {
      return res.status(400).json({ message: 'Mot de passe actuel et nouvel email requis' });
    }
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'Utilisateur non trouvé' });
    const validPassword = await user.matchPassword(currentPassword);
    if (!validPassword) return res.status(401).json({ message: 'Mot de passe incorrect' });
    const normalizedEmail = String(newEmail).toLowerCase().trim();
    if (normalizedEmail === user.email) {
      return res.status(400).json({ message: 'Le nouvel email est identique à l\'actuel' });
    }
    const already = await User.findOne({ email: normalizedEmail, _id: { $ne: user._id } });
    if (already) return res.status(400).json({ message: 'Cet email est déjà utilisé' });

    const emailChangeToken = crypto.randomBytes(32).toString('hex');
    user.pendingEmail = normalizedEmail;
    user.emailChangeToken = emailChangeToken;
    await user.save();

    const verificationUrl = `${process.env.CLIENT_URL || ''}/verify-email?token=${emailChangeToken}&type=email-change`;
    if (process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT || 587,
        secure: false,
        auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
      });
      await transporter.sendMail({
        from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
        to: normalizedEmail,
        subject: 'Confirmez votre nouvel e-mail',
        html: `<p>Bonjour ${user.name},</p><p>Confirmez votre nouvel email via ce lien:</p><p><a href="${verificationUrl}">${verificationUrl}</a></p>`,
      });
    }

    const meta = getRequestMeta(req);
    await logAudit({
      action: 'REQUEST_EMAIL_CHANGE',
      entity: 'User',
      entityId: user._id,
      performedBy: req.user._id,
      performedByEmail: req.user.email,
      changes: { after: { pendingEmail: normalizedEmail } },
      ...meta,
    });

    res.json({
      message: 'Demande de changement email enregistrée. Vérifiez votre nouvel email.',
      verification: verificationUrl,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Changer mon mot de passe
// @route   PATCH /api/auth/me/password
// @access  Private
const changeMyPassword = async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword, logoutOtherSessions = true } = req.body;
    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ message: 'Tous les champs mot de passe sont requis' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'Le nouveau mot de passe doit contenir au moins 6 caractères' });
    }
    if (newPassword !== confirmPassword) {
      return res.status(400).json({ message: 'La confirmation ne correspond pas' });
    }

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'Utilisateur non trouvé' });
    const validPassword = await user.matchPassword(currentPassword);
    if (!validPassword) return res.status(401).json({ message: 'Mot de passe actuel incorrect' });

    user.password = newPassword;
    user.passwordChangedAt = new Date();
    user.passwordChangeHistory = [...(user.passwordChangeHistory || []), { changedAt: new Date() }].slice(-10);
    if (logoutOtherSessions) {
      user.refreshToken = null;
    }
    await user.save();

    const meta = getRequestMeta(req);
    await logAudit({
      action: 'CHANGE_PASSWORD',
      entity: 'User',
      entityId: user._id,
      performedBy: req.user._id,
      performedByEmail: req.user.email,
      changes: { after: { passwordChangedAt: user.passwordChangedAt } },
      ...meta,
    });

    res.json({ message: 'Mot de passe mis à jour avec succès' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Upload photo de profil
// @route   POST /api/auth/me/profile-picture
// @access  Private
const uploadMyProfilePicture = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'Fichier image requis' });
    if (req.file.mimetype && !req.file.mimetype.startsWith('image/')) {
      return res.status(400).json({ message: 'Seules les images sont autorisées' });
    }
    const url = req.file.path || req.file.url || req.file.secure_url;
    if (!url) return res.status(500).json({ message: 'Upload réussi mais URL de l\'image indisponible' });
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'Utilisateur non trouvé' });
    user.profilePicture = url;
    await user.save();
    res.json({ profilePicture: user.profilePicture });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Erreur lors de l\'upload de la photo' });
  }
};

module.exports = {
  registerUser,
  loginUser,
  refreshToken,
  logoutUser,
  getMe,
  updateMe,
  updateMyEmail,
  changeMyPassword,
  uploadMyProfilePicture,
  verifyEmail,
  forgotPassword,
  resetPassword,
};