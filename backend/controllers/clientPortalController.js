const Project = require('../models/Project');
const Invoice = require('../models/Invoice');
const Quote = require('../models/Quote');
const Task = require('../models/Task');
const Payment = require('../models/Payment');
const Claim = require('../models/Claim');
const User = require('../models/User');
const notificationService = require('../services/notificationService');
const integrationService = require('../services/integrationService');

const getClientProjects = async (req, res) => {
  try {
    const projects = await Project.find({ client: req.client._id })
      .select('name status startDate endDate deadline description objectives attachments')
      .populate('manager', 'name email');
    const projectIds = projects.map((p) => p._id);
    const progressAgg = await Task.aggregate([
      { $match: { project: { $in: projectIds } } },
      { $group: { _id: '$project', total: { $sum: 1 }, done: { $sum: { $cond: [{ $eq: ['$status', 'done'] }, 1, 0] } } } }
    ]);
    const progressByProjectTasks = {};
    progressAgg.forEach((p) => {
      progressByProjectTasks[p._id.toString()] = p.total ? Math.round((p.done / p.total) * 100) : 0;
    });
    const hoursByProject = await Task.aggregate([
      { $match: { project: { $in: projectIds } } },
      { $group: { _id: '$project', estimated: { $sum: { $ifNull: ['$estimatedHours', 0] } }, actual: { $sum: { $ifNull: ['$actualHours', 0] } } } }
    ]);
    const hoursMap = {};
    hoursByProject.forEach((p) => {
      hoursMap[p._id.toString()] = { estimated: p.estimated ?? 0, actual: p.actual ?? 0 };
    });
    const withProgress = projects.map((p) => {
      const pid = p._id.toString();
      const hours = hoursMap[pid] || { estimated: 0, actual: 0 };
      const taskBased = progressByProjectTasks[pid] ?? 0;
      const progressPercentage = hours.estimated > 0
        ? Math.min(100, Math.round((hours.actual / hours.estimated) * 100))
        : taskBased;
      return { ...p.toObject ? p.toObject() : p, progressPercentage };
    });
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

const getClientInvoiceById = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id)
      .populate('project', 'name')
      .lean();
    if (!invoice || invoice.client.toString() !== req.client._id.toString()) {
      return res.status(404).json({ message: 'Facture non trouvée' });
    }
    res.json(invoice);
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

// Création d'un paiement depuis le portail client
const createClientPayment = async (req, res) => {
  try {
    const { invoiceId, amount, method } = req.body;

    if (!invoiceId || !amount || !method) {
      return res.status(400).json({ message: 'invoiceId, amount et method sont requis.' });
    }

    if (!['virement', 'carte', 'cheque'].includes(method)) {
      return res.status(400).json({ message: 'Mode de paiement invalide.' });
    }

    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({ message: 'Montant invalide.' });
    }

    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) {
      return res.status(404).json({ message: 'Facture non trouvée' });
    }

    // Vérifier que la facture appartient bien au client connecté
    if (invoice.client.toString() !== req.client._id.toString()) {
      return res.status(403).json({ message: 'Vous ne pouvez payer que vos propres factures.' });
    }

    if (['paid', 'cancelled'].includes(invoice.status)) {
      return res.status(400).json({ message: 'Cette facture est déjà réglée ou annulée.' });
    }

    const total = invoice.totalTTC || 0;
    const alreadyPaid = invoice.paidAmount || 0;
    if (alreadyPaid >= total) {
      return res.status(400).json({ message: 'Cette facture est déjà intégralement payée.' });
    }

    const remaining = total - alreadyPaid;
    if (numericAmount > remaining + 0.01) {
      return res.status(400).json({ message: 'Le montant dépasse le solde restant à payer.' });
    }

    const paymentDate = new Date();

    // Création de l'enregistrement de paiement (collection dédiée)
    const payment = await Payment.create({
      invoice: invoice._id,
      user: req.user._id,
      amount: numericAmount,
      date: paymentDate,
      method,
      status: 'valide',
    });

    // Ajout du paiement dans la facture (embedded payments)
    invoice.payments = invoice.payments || [];
    invoice.payments.push({
      date: paymentDate,
      amount: numericAmount,
      method,
      reference: 'client-portal',
    });

    invoice.paidAmount = (invoice.paidAmount || 0) + numericAmount;
    invoice.status = invoice.paidAmount >= total ? 'paid' : 'partial';

    await invoice.save();

    try {
      await notificationService.notifyClientPaymentRecorded(invoice, req.client._id, numericAmount);
    } catch (e) {
      console.error('Notification client paiement enregistré:', e);
    }
    try {
      await integrationService.triggerIntegrations('invoice.payment_recorded', {
        invoiceId: invoice._id,
        invoiceNumber: invoice.number,
        amount: numericAmount,
        paidAmount: invoice.paidAmount || 0,
        totalTTC: invoice.totalTTC || 0,
        status: invoice.status,
        method,
        fromPortal: true,
      }, {
        triggeredBy: req.user._id,
        source: 'clientPortalController.createClientPayment',
      });
    } catch (e) {
      console.error('Intégration webhook paiement client:', e);
    }

    res.status(201).json({
      message: 'Paiement enregistré avec succès.',
      invoice,
      payment,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/** Détermine à qui assigner la réclamation : direction (invoice_error, other) ou coordinatrice (project_delay) */
const getAssigneeForClaimType = async (type) => {
  if (type === 'project_delay') {
    const coordinator = await User.findOne({ role: 'coordinator', isActive: true }).select('_id').lean();
    return coordinator?._id || null;
  }
  const director = await User.findOne({ role: 'director', isActive: true }).select('_id').lean();
  return director?._id || null;
};

const getClientClaims = async (req, res) => {
  try {
    const claims = await Claim.find({ client: req.client._id })
      .sort({ createdAt: -1 })
      .populate('assignedTo', 'name')
      .populate('project', 'name')
      .populate('invoice', 'number')
      .lean();
    res.json(claims);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createClientClaim = async (req, res) => {
  try {
    const { type, subject, message, projectId, invoiceId } = req.body;
    if (!type || !subject || !subject.trim() || !message || !message.trim()) {
      return res.status(400).json({ message: 'Type, sujet et message sont requis.' });
    }
    if (!['project_delay', 'invoice_error', 'other'].includes(type)) {
      return res.status(400).json({ message: 'Type de réclamation invalide.' });
    }
    const assignedTo = await getAssigneeForClaimType(type);
    if (!assignedTo) {
      return res.status(503).json({ message: 'Aucun responsable disponible pour traiter cette réclamation. Veuillez réessayer plus tard.' });
    }
    if (projectId) {
      const project = await Project.findOne({ _id: projectId, client: req.client._id });
      if (!project) return res.status(400).json({ message: 'Projet non trouvé ou non autorisé.' });
    }
    if (invoiceId) {
      const invoice = await Invoice.findOne({ _id: invoiceId, client: req.client._id });
      if (!invoice) return res.status(400).json({ message: 'Facture non trouvée ou non autorisée.' });
    }
    const claim = await Claim.create({
      client: req.client._id,
      type,
      subject: subject.trim(),
      message: message.trim(),
      assignedTo,
      project: projectId || undefined,
      invoice: invoiceId || undefined,
    });
    const populated = await Claim.findById(claim._id)
      .populate('assignedTo', 'name')
      .populate('project', 'name')
      .populate('invoice', 'number')
      .populate('client', 'name')
      .lean();
    try {
      await notificationService.notifyClaimCreated(populated, populated.client?.name);
    } catch (e) {
      console.error('Notification réclamation:', e);
    }
    try {
      await integrationService.triggerIntegrations('claim.created', {
        claimId: populated._id,
        claimType: populated.type,
        subject: populated.subject,
        status: populated.status,
        clientId: populated.client?._id || req.client._id,
        assignedTo: populated.assignedTo?._id || assignedTo,
      }, {
        triggeredBy: req.user._id,
        source: 'clientPortalController.createClientClaim',
      });
    } catch (e) {
      console.error('Intégration webhook réclamation:', e);
    }
    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getClientProjects,
  getClientInvoices,
  getClientInvoiceById,
  getClientQuotes,
  getClientQuoteById,
  clientAcceptRefuseQuote,
  getClientDeliverables,
  createClientPayment,
  getClientClaims,
  createClientClaim,
};
