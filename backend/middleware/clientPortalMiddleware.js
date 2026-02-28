const Client = require('../models/Client');

const clientPortalAccess = async (req, res, next) => {
  if (req.user.role !== 'client') {
    return res.status(403).json({ message: 'Accès réservé aux clients' });
  }
  let client = await Client.findOne({ user: req.user._id });
  if (!client) {
    client = await Client.findOne({ 'contacts.email': req.user.email });
  }
  if (!client) {
    return res.status(404).json({ message: 'Profil client non trouvé' });
  }
  req.client = client;
  next();
};

module.exports = { clientPortalAccess };