const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = mongoose.Schema(
  {
    name: { type: String, required: true },
    firstName: { type: String },
    lastName: { type: String },
    email: { type: String, required: true, unique: true },
    pendingEmail: { type: String },
    emailChangeToken: { type: String },
    phone: { type: String },
    jobTitle: { type: String },
    signature: { type: String },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: ['admin', 'director', 'coordinator', 'projectManager', 'teamMember', 'client'],
      default: 'teamMember',
    },
    client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client' },
    isActive: { type: Boolean, default: true },
    /** Statut de validation d'inscription (uniquement pour nouvelles inscriptions Directeur/Coordinatrice/Chef de projet/Membre d'équipe). null/undefined = compte existant ou non concerné. */
    registrationStatus: { type: String, enum: ['pending', 'approved', 'rejected'] },
    profilePicture: { type: String },
    twoFactorEnabled: { type: Boolean, default: false },
    twoFactorSecret: { type: String },
    refreshToken: { type: String },
    isVerified: { type: Boolean, default: false },
    verificationToken: { type: String },
    lastLoginAt: { type: Date },
    passwordChangedAt: { type: Date },
    passwordChangeHistory: [{ changedAt: { type: Date, default: Date.now } }],
    passwordResetToken: { type: String },
    passwordResetExpires: { type: Date },
    failedLoginAttempts: { type: Number, default: 0 },
    lockUntil: { type: Date },
  },
  { timestamps: true }
);

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', userSchema);
module.exports = User;