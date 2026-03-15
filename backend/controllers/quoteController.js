const Quote = require('../models/Quote');
const QuoteTemplate = require('../models/QuoteTemplate');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');
const SystemSettings = require('../models/SystemSettings');

const generateQuoteNumber = async (customPrefix) => {
  const prefix = customPrefix || 'DEV';
  const year = new Date().getFullYear();
  const regex = new RegExp(`^${prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}-${year}-(\\d+)$`);
  const lastQuote = await Quote.findOne({ number: regex }).sort({ createdAt: -1 });
  const lastSeq = lastQuote ? parseInt(lastQuote.number.match(regex)?.[1] || '0', 10) : 0;
  const seq = lastSeq + 1;
  return `${prefix}-${year}-${seq.toString().padStart(4, '0')}`;
};

const createQuote = async (req, res) => {
  try {
    const { templateId, numberPrefix, number: customNumber, ...body } = req.body;
    let lines = body.lines || [];
    let defaultTerms = body.terms;
    let defaultNotes = body.notes;

    if (templateId) {
      const template = await QuoteTemplate.findById(templateId);
      if (template) {
        lines = template.lines?.length ? template.lines.map(l => ({ ...l.toObject() })) : lines;
        if (template.defaultTerms) defaultTerms = template.defaultTerms;
        if (template.defaultNotes) defaultNotes = template.defaultNotes;
      }
    }

    const prefix = numberPrefix || (await SystemSettings.findOne({ key: 'quoteNumberPrefix' }))?.value || 'DEV';
    const number = customNumber || await generateQuoteNumber(prefix);

    const quote = new Quote({
      ...body,
      lines: lines.length ? lines : [{ description: '', quantity: 1, unitPrice: 0, taxRate: 20, discount: 0, discountType: 'percent' }],
      terms: defaultTerms || body.terms,
      notes: defaultNotes || body.notes,
      number,
      createdBy: req.user._id,
    });
    const createdQuote = await quote.save();
    res.status(201).json(createdQuote);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const getQuotes = async (req, res) => {
  try {
    const quotes = await Quote.find()
      .populate('client', 'name')
      .populate('project', 'name')
      .populate('createdBy', 'name');
    res.json(quotes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getQuoteById = async (req, res) => {
  try {
    const quote = await Quote.findById(req.params.id)
      .populate('client')
      .populate('project')
      .populate('createdBy', 'name');
    if (quote) {
      res.json(quote);
    } else {
      res.status(404).json({ message: 'Devis non trouvé' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateQuote = async (req, res) => {
  try {
    const quote = await Quote.findById(req.params.id);
    if (!quote) {
      return res.status(404).json({ message: 'Devis non trouvé' });
    }
    if (quote.status !== 'draft') {
      return res.status(400).json({ message: 'Impossible de modifier un devis non brouillon' });
    }
    Object.assign(quote, req.body);
    const updatedQuote = await quote.save();
    res.json(updatedQuote);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const deleteQuote = async (req, res) => {
  try {
    const quote = await Quote.findById(req.params.id);
    if (!quote) {
      return res.status(404).json({ message: 'Devis non trouvé' });
    }
    await quote.deleteOne();
    res.json({ message: 'Devis supprimé' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Relance devis : envoi d'un email de rappel au client (devis envoyé, en attente de réponse)
const sendQuoteReminder = async (req, res) => {
  try {
    const quote = await Quote.findById(req.params.id).populate('client', 'name email contacts');
    if (!quote) return res.status(404).json({ message: 'Devis non trouvé' });
    if (quote.status !== 'sent') {
      return res.status(400).json({ message: 'Seul un devis envoyé peut faire l\'objet d\'une relance' });
    }

    const client = quote.client;
    if (!client) return res.status(400).json({ message: 'Client inconnu' });
    let toEmail = client.email;
    if (!toEmail && client.contacts?.length) {
      const primary = client.contacts.find((c) => c.isPrimary && c.email);
      toEmail = primary?.email || client.contacts.find((c) => c.email)?.email;
    }
    if (!toEmail) return res.status(400).json({ message: 'Aucune adresse e-mail pour ce client' });

    if (process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT || 587,
        secure: false,
        auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
      });
      const validStr = quote.validUntil ? new Date(quote.validUntil).toLocaleDateString('fr-FR') : '';
      await transporter.sendMail({
        from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
        to: toEmail,
        subject: `Rappel : devis ${quote.number} en attente de votre réponse`,
        html: `
          <p>Bonjour,</p>
          <p>Nous vous rappelons que le devis <strong>${quote.number}</strong> (${client.name}) d'un montant de <strong>${(quote.totalTTC || 0).toFixed(2)} TND</strong> est en attente de votre réponse.</p>
          ${validStr ? `<p>Validité du devis : jusqu'au ${validStr}.</p>` : ''}
          <p>N'hésitez pas à nous contacter pour toute question.</p>
          <p>Cordialement,<br/>L'équipe</p>
        `,
      });
    }

    quote.remindersSent = (quote.remindersSent || 0) + 1;
    quote.lastReminderAt = new Date();
    await quote.save();

    res.json({ message: 'Relance envoyée au client', remindersSent: quote.remindersSent });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const convertQuoteToInvoice = async (req, res) => {
  try {
    const quote = await Quote.findById(req.params.id);
    if (!quote) {
      return res.status(404).json({ message: 'Devis non trouvé' });
    }
    if (quote.status !== 'accepted') {
      return res.status(400).json({ message: 'Seul un devis accepté peut être converti en facture' });
    }
    const Invoice = mongoose.model('Invoice');
    const generateInvoiceNumber = async () => {
      const lastInvoice = await Invoice.findOne().sort({ createdAt: -1 });
      const year = new Date().getFullYear();
      const seq = lastInvoice ? parseInt(lastInvoice.number.split('-')[1]) + 1 : 1;
      return `FAC-${year}-${seq.toString().padStart(4, '0')}`;
    };
    const invoiceNumber = await generateInvoiceNumber();
    const invoice = new Invoice({
      number: invoiceNumber,
      client: quote.client,
      project: quote.project,
      quote: quote._id,
      lines: quote.lines.map(l => ({
        description: l.description,
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        taxRate: l.taxRate,
      })),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      createdBy: req.user._id,
    });
    await invoice.save();
    quote.status = 'converted';
    await quote.save();
    res.status(201).json(invoice);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Validation par le directeur (devis envoyés : accepter ou refuser)
const validateQuote = async (req, res) => {
  try {
    const quote = await Quote.findById(req.params.id);
    if (!quote) return res.status(404).json({ message: 'Devis non trouvé' });
    if (quote.status !== 'sent') {
      return res.status(400).json({ message: 'Seuls les devis envoyés peuvent être validés' });
    }
    const { action } = req.body; // 'accept' | 'refuse'
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

const convertQuoteToProject = async (req, res) => {
  try {
    const quote = await Quote.findById(req.params.id).populate('client');
    if (!quote) return res.status(404).json({ message: 'Devis non trouvé' });
    if (quote.status !== 'accepted') {
      return res.status(400).json({ message: 'Seul un devis accepté peut être converti en projet' });
    }
    const Project = require('../models/Project');
    const project = new Project({
      name: `Projet - ${quote.client?.name || 'Client'} - ${quote.number}`,
      client: quote.client._id,
      status: 'inProgress',
      description: quote.notes || '',
      estimatedBudget: quote.totalTTC || quote.subtotalHT,
      manager: req.user._id,
      createdBy: req.user._id,
    });
    await project.save();
    quote.project = project._id;
    quote.status = 'converted';
    await quote.save();
    res.status(201).json(project);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const getQuoteTemplates = async (req, res) => {
  try {
    const templates = await QuoteTemplate.find().lean();
    res.json(templates);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createQuoteTemplate = async (req, res) => {
  try {
    const template = new QuoteTemplate({
      ...req.body,
      createdBy: req.user._id,
    });
    await template.save();
    res.status(201).json(template);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

module.exports = {
  createQuote,
  getQuotes,
  getQuoteById,
  updateQuote,
  deleteQuote,
  sendQuoteReminder,
  convertQuoteToInvoice,
  convertQuoteToProject,
  validateQuote,
  getQuoteTemplates,
  createQuoteTemplate,
};