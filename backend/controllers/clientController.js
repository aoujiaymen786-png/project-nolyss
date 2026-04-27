const Client = require('../models/Client');
const Invoice = require('../models/Invoice');
const User = require('../models/User');
const notificationService = require('../services/notificationService');

const createClient = async (req, res) => {
  try {
    const { createAccount, accountEmail, accountPassword, accountPhone, ...clientData } = req.body;
    const client = new Client({
      ...clientData,
      createdBy: req.user._id,
    });
    const createdClient = await client.save();

    if (createAccount && accountEmail && accountPassword) {
      const existingUser = await User.findOne({ email: accountEmail.trim().toLowerCase() });
      if (existingUser) {
        await Client.findByIdAndDelete(createdClient._id);
        return res.status(400).json({ message: 'Un utilisateur existe déjà avec cet email.' });
      }
      const accountUser = await User.create({
        name: clientData.name || accountEmail.split('@')[0],
        email: accountEmail.trim().toLowerCase(),
        password: accountPassword,
        phone: accountPhone || clientData.phone || '',
        role: 'client',
        client: createdClient._id,
      });
      createdClient.user = accountUser._id;
      await createdClient.save();
    }

    const populated = await Client.findById(createdClient._id).populate('createdBy', 'name email');
    try {
      await notificationService.notifyClientCreated(populated || createdClient, req.user._id);
    } catch (e) {
      console.error('Notification client créé:', e);
    }
    res.status(201).json(populated);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const getClients = async (req, res) => {
  try {
    const clients = await Client.find({}).populate('createdBy', 'name email').lean();
    const revenueByClient = await Invoice.aggregate([
      { $match: { status: 'paid' } },
      { $group: { _id: '$client', total: { $sum: '$totalTTC' } } },
    ]);
    const revenueMap = {};
    revenueByClient.forEach((r) => {
      if (r._id) revenueMap[r._id.toString()] = r.total ?? 0;
    });
    const withRevenue = clients.map((c) => ({
      ...c,
      revenue: revenueMap[c._id.toString()] ?? c.revenue ?? 0,
    }));
    res.json(withRevenue);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getClientById = async (req, res) => {
  try {
    const client = await Client.findById(req.params.id)
      .populate('createdBy', 'name email')
      .populate('user', 'email name phone')
      .populate('interactions.createdBy', 'name')
      .populate('documents.uploadedBy', 'name')
      .lean();
    if (!client) return res.status(404).json({ message: 'Client non trouvé' });
    const revenueResult = await Invoice.aggregate([
      { $match: { client: client._id, status: 'paid' } },
      { $group: { _id: null, total: { $sum: '$totalTTC' } } },
    ]);
    client.revenueComputed = revenueResult[0]?.total ?? 0;
    res.json(client);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const addClientInteraction = async (req, res) => {
  try {
    const client = await Client.findById(req.params.id);
    if (!client) return res.status(404).json({ message: 'Client non trouvé' });
    client.interactions = client.interactions || [];
    client.interactions.push({
      date: new Date(),
      type: req.body.type || 'note',
      description: req.body.description,
      createdBy: req.user._id,
    });
    await client.save();
    const updated = await Client.findById(req.params.id).populate('interactions.createdBy', 'name');
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const addClientDocument = async (req, res) => {
  try {
    const client = await Client.findById(req.params.id);
    if (!client) return res.status(404).json({ message: 'Client non trouvé' });
    const url = req.file?.path || req.body?.url;
    const name = req.body?.name || req.file?.originalname || 'Document';
    client.documents = client.documents || [];
    client.documents.push({
      name,
      url: url || '',
      type: req.body?.type || 'other',
      uploadedBy: req.user._id,
      uploadedAt: new Date(),
    });
    await client.save();
    const updated = await Client.findById(req.params.id).populate('documents.uploadedBy', 'name');
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateClient = async (req, res) => {
  try {
    const { createAccount, accountEmail, accountPassword, accountPhone, ...clientData } = req.body;
    const client = await Client.findById(req.params.id);
    if (!client) return res.status(404).json({ message: 'Client non trouvé' });

    Object.assign(client, clientData);

    if (createAccount && accountEmail && accountPassword && !client.user) {
      const existingUser = await User.findOne({ email: accountEmail.trim().toLowerCase() });
      if (existingUser) {
        return res.status(400).json({ message: 'Un utilisateur existe déjà avec cet email.' });
      }
      const accountUser = await User.create({
        name: client.name || accountEmail.split('@')[0],
        email: accountEmail.trim().toLowerCase(),
        password: accountPassword,
        phone: accountPhone || client.phone || '',
        role: 'client',
        client: client._id,
      });
      client.user = accountUser._id;
    }

    const updatedClient = await client.save();
    res.json(updatedClient);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const deleteClient = async (req, res) => {
  try {
    const client = await Client.findById(req.params.id);
    if (!client) return res.status(404).json({ message: 'Client non trouvé' });
    if (client.user) {
      await User.findByIdAndDelete(client.user);
    }
    await client.deleteOne();
    res.json({ message: 'Client supprimé' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createClient,
  getClients,
  getClientById,
  updateClient,
  deleteClient,
  addClientInteraction,
  addClientDocument,
};