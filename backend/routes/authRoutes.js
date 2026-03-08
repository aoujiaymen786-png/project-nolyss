const express = require('express');
const {
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
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const upload = require('../config/cloudinary');
const { validateRegister, validateLogin, validateVerifyEmail, validateForgotPassword, validateResetPassword } = require('../middleware/validationMiddleware');

const router = express.Router();

router.post('/register', validateRegister, registerUser);
router.post('/login', validateLogin, loginUser);
router.post('/refresh-token', refreshToken);
router.post('/logout', protect, logoutUser);
router.get('/me', protect, getMe);
router.put('/me', protect, updateMe);
router.patch('/me/email', protect, updateMyEmail);
router.patch('/me/password', protect, changeMyPassword);
router.post('/me/profile-picture', protect, upload.single('file'), uploadMyProfilePicture);
router.post('/verify-email', validateVerifyEmail, verifyEmail);
router.post('/forgot-password', validateForgotPassword, forgotPassword);
router.post('/reset-password', validateResetPassword, resetPassword);

module.exports = router;