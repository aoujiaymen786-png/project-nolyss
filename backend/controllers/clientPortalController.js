const Project = require('../models/Project');
const Invoice = require('../models/Invoice');
const Quote = require('../models/Quote');
const Task = require('../models/Task');

const getClientProjects = async (req, res) => {
  try {
    const projects = await Project.find({ client: req.client._id })
      .select('name status startDate endDate deadline description attachments')
      .populate('manager', 'name email');
    const projectIds = projects.map((p) => p._id);
    const progressAgg = await Task.aggregate([
      { $match: { project: { $in: projectIds } } },
      { $group: { _id: '$project', total: { $sum: 1 }, done: { $sum: { $cond: [{ $eq: ['$status', 'done'] }, 1, 0] } } } }
    ]);
    const progressByProject = {};
    progressAgg.forEach((p) => {
      progressByProject[p._id.toString()] = p.total ? Math.round((p.done / p.total) * 100) : 0;
    });
    const withProgress = projects.map((p) => ({
      ...p.toObject ? p.toObject() : p,
      progressPercentage: progressByProject[p._id.toString()] ?? 0,
    }));
    res.json(withProgress);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getClientInvoices = async (req, res) => {
  try {
    const invoices = await Invoice.find({ client: req.client._id })
      .select('number date dueDate totalTTC status paidAmount project')
      .populate('project', 'name');
    res.json(invoices);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getClientQuotes = async (req, res) => {
  try {
    const quotes = await Quote.find({ client: req.client._id })
      .select('number date validUntil totalTTC status project')
      .populate('project', 'name')
      .sort({ createdAt: -1 });
    res.json(quotes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getClientQuoteById = async (req, res) => {
  try {
    const quote = await Quote.findById(req.params.id)
      .populate('project', 'name')
      .lean();
    if (!quote || quote.client.toString() !== req.client._id.toString()) {
      return res.status(404).json({ message: 'Devis non trouvé' });
    }
    res.json(quote);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const clientAcceptRefuseQuote = async (req, res) => {
  try {
    const quote = await Quote.findById(req.params.id);
    if (!quote || quote.client.toString() !== req.client._id.toString()) {
      return res.status(404).json({ message: 'Devis non trouvé' });
    }
    if (quote.status !== 'sent') {
      return res.status(400).json({ message: 'Seuls les devis envoyés peuvent être acceptés ou refusés' });
    }
    const { action } = req.body;
    if (!['accept', 'refuse'].includes(action)) {
      return res.status(400).json({ message: 'Action invalide (accept ou refuse)' });
    }
    quote.status = action === 'accept' ? 'accepted' : 'refused';
    await quote.save();
    res.json(quote);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getClientDeliverables = async (req, res) => {
  try {
    const projects = await Project.find({ client: req.client._id })
      .select('name _id attachments')
      .lean();
    const deliverables = projects
      .filter((p) => p.attachments && p.attachments.length > 0)
      .flatMap((p) => (p.attachments || []).map((a) => ({ ...a, projectName: p.name, projectId: p._id })))
      .sort((a, b) => new Date(b.uploadedAt || 0) - new Date(a.uploadedAt || 0));
    res.json(deliverables);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getClientProjects,
  getClientInvoices,
  getClientQuotes,
  getClientQuoteById,
  clientAcceptRefuseQuote,
  getClientDeliverables,
};