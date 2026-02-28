const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI);

const seedAdmin = async () => {
  try {
    // Supprimer l'utilisateur existant avec cet email s'il existe
    await User.deleteMany({ email: 'admin@example.com' });
    
    const admin = new User({
      name: 'Admin',
      email: 'admin@example.com',
      password: 'admin123',
      role: 'admin',
    });
    await admin.save();
    console.log('Admin créé avec email: admin@example.com, mot de passe: admin123');
    mongoose.disconnect();
  } catch (err) {
    console.error(err);
    mongoose.disconnect();
  }
};

seedAdmin();