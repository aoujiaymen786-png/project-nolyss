const Invoice = require('../models/Invoice');
const Quote = require('../models/Quote');
const Project = require('../models/Project');
const Client = require('../models/Client');
const SystemSettings = require('../models/SystemSettings');
const nodemailer = require('nodemailer');
const notificationService = require('../services/notificationService');

const generateInvoiceNumber = async (customPrefix) => {
  const prefix = customPrefix || 'FAC';
  const year = new Date().getFullYear();
  const regex = new RegExp(`^${prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}-${year}-(\\d+)$`);
  const lastInv = await Invoice.findOne({ number: regex }).sort({ createdAt: -1 });
  const lastSeq = lastInv ? parseInt(lastInv.number.match(regex)?.[1] || '0', 10) : 0;
  return `${prefix}-${year}-${(lastSeq + 1).toString().padStart(4, '0')}`;
};

const sanitizeInvoiceBody = (body) => {
  const sanitized = { ...body };
  if (sanitized.quote === '' || sanitized.quote === null) delete sanitized.quote;
  if (sanitized.project === '' || sanitized.project === null) delete sanitized.project;
  if (Array.isArray(sanitized.lines)) {
    sanitized.lines = sanitized.lines
      .map((l) => ({
        ...l,
        description: typeof l.description === 'string' ? l.description.trim() : String(l.description || ''),
      }))
      .filter((l) => l.description && l.quantity != null && l.unitPrice != null);
    if (sanitized.lines.length === 0) {
      const err = new Error('Au moins une ligne avec une description, une quantité et un prix unitaire est requise.');
      err.status = 400;
      throw err;
    }
  }
  return sanitized;
};

const createInvoice = async (req, res) => {
  try {
    const { quoteId, number: customNumber, numberPrefix, ...body } = req.body;
    const sanitizedBody = sanitizeInvoiceBody(body);
    let invoiceData = { ...sanitizedBody, createdBy: req.user._id };

    if (quoteId) {
      const quote = await Quote.findById(quoteId).populate('client');
      if (!quote) return res.status(404).json({ message: 'Devis non trouvé' });
      if (quote.status !== 'accepted') return res.status(400).json({ message: 'Seul un devis accepté peut être converti en facture' });
      invoiceData = {
        client: quote.client._id,
        project: quote.project,
        quote: quote._id,
        lines: quote.lines?.map(l => ({
          description: l.description,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          taxRate: l.taxRate,
          discount: l.discount || 0,
          discountType: l.discountType || 'percent',
        })) || [],
        dueDate: body.dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        date: body.date || new Date(),
        type: body.type || 'invoice',
        notes: body.notes || quote.notes,
        terms: body.terms || quote.terms,
        createdBy: req.user._id,
      };
    }

    if (!invoiceData.number) {
      const prefix = numberPrefix || (await SystemSettings.findOne({ key: 'invoiceNumberPrefix' }))?.value || 'FAC';
      invoiceData.number = customNumber || await generateInvoiceNumber(prefix);
    }

    const invoice = new Invoice(invoiceData);
    const createdInvoice = await invoice.save();
    if (quoteId) {
      const quote = await Quote.findById(quoteId);
      if (quote) {
        quote.status = 'converted';
        await quote.save();
      }
    }
    res.status(201).json(createdInvoice);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const getInvoices = async (req, res) => {
  try {
    const invoices = await Invoice.find()
      .populate('client', 'name')
      .populate('project', 'name')
      .populate('createdBy', 'name');
    res.json(invoices);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getInvoiceById = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id)
      .populate('client')
      .populate('project')
      .populate('createdBy', 'name');
    if (invoice) {
      res.json(invoice);
    } else {
      res.status(404).json({ message: 'Facture non trouvée' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) {
      return res.status(404).json({ message: 'Facture non trouvée' });
    }
    if (!['draft', 'sent'].includes(invoice.status)) {
      return res.status(400).json({ message: 'Impossible de modifier une facture déjà payée ou partiellement payée.' });
    }
    const sanitized = sanitizeInvoiceBody(req.body);
    const wasDraft = invoice.status === 'draft';
    Object.assign(invoice, sanitized);
    const updatedInvoice = await invoice.save();
    if (wasDraft && updatedInvoice.status === 'sent') {
      try {
        const inv = await Invoice.findById(updatedInvoice._id).populate('client', 'name').lean();
        await notificationService.notifyInvoiceSent(inv || updatedInvoice, inv?.client?.name);
        const clientId = updatedInvoice.client?._id ?? updatedInvoice.client;
        if (clientId) {
          await notificationService.notifyClientInvoiceAvailable(updatedInvoice, clientId);
        }
      } catch (e) {
        console.error('Notifications facture envoyée:', e);
      }
    }
    res.json(updatedInvoice);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const deleteInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) {
      return res.status(404).json({ message: 'Facture non trouvée' });
    }
    if (!['draft', 'cancelled'].includes(invoice.status)) {
      return res.status(400).json({ message: 'Seules les factures en brouillon ou annulées peuvent être supprimées' });
    }
    await invoice.deleteOne();
    res.json({ message: 'Facture supprimée' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Validation par le directeur (marquer comme payée ou enregistrer un paiement partiel)
const validateInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) return res.status(404).json({ message: 'Facture non trouvée' });
    if (!['sent', 'partial'].includes(invoice.status)) {
      return res.status(400).json({ message: 'Seules les factures envoyées ou partiellement payées peuvent être validées' });
    }
    const { status: newStatus, paidAmount } = req.body;
    if (newStatus === 'paid') {
      invoice.status = 'paid';
      invoice.paidAmount = invoice.totalTTC || 0;
    } else if (paidAmount != null && paidAmount > 0) {
      const total = invoice.totalTTC || 0;
      const newPaid = Math.min(paidAmount, total);
      invoice.paidAmount = (invoice.paidAmount || 0) + newPaid;
      invoice.status = invoice.paidAmount >= total ? 'paid' : 'partial';
    } else {
      return res.status(400).json({ message: 'Indiquez status: "paid" ou paidAmount' });
    }
    await invoice.save();
    res.json(invoice);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const recordPayment = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) return res.status(404).json({ message: 'Facture non trouvée' });
    const { date, amount, method = 'bank_transfer', reference } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ message: 'Montant invalide' });
    invoice.payments = invoice.payments || [];
    invoice.payments.push({
      date: date ? new Date(date) : new Date(),
      amount: Number(amount),
      method,
      reference: reference || '',
    });
    invoice.paidAmount = invoice.payments.reduce((s, p) => s + p.amount, 0);
    invoice.status = invoice.paidAmount >= (invoice.totalTTC || 0) ? 'paid' : 'partial';
    await invoice.save();
    res.json(invoice);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Relance facture : envoi d'un email de rappel au client (directeur)
const sendReminder = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id).populate('client', 'name email contacts');
    if (!invoice) return res.status(404).json({ message: 'Facture non trouvée' });
    if (['draft', 'paid', 'cancelled'].includes(invoice.status)) {
      return res.status(400).json({ message: 'Seules les factures envoyées, en retard ou partiellement payées peuvent être relancées' });
    }
    const total = invoice.totalTTC || 0;
    const paid = invoice.paidAmount || 0;
    const remaining = total - paid;
    if (remaining < 0.01) return res.status(400).json({ message: 'Facture déjà réglée' });

    const client = invoice.client;
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
      const dueStr = invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString('fr-FR') : '';
      await transporter.sendMail({
        from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
        to: toEmail,
        subject: `Rappel : facture ${invoice.number} - solde à régler`,
        html: `
          <p>Bonjour,</p>
          <p>Nous vous rappelons que la facture <strong>${invoice.number}</strong> (${client.name}) présente un solde restant à régler de <strong>${remaining.toFixed(2)} TND</strong>.</p>
          ${dueStr ? `<p>Date d'échéance : ${dueStr}.</p>` : ''}
          <p>Merci de procéder au règlement dans les meilleurs délais.</p>
          <p>Cordialement,<br/>L'équipe</p>
        `,
      });
    }

    invoice.remindersSent = (invoice.remindersSent || 0) + 1;
    invoice.lastReminderAt = new Date();
    await invoice.save();

    res.json({ message: 'Relance envoyée', remindersSent: invoice.remindersSent });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const exportFEC = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const filter = {};
    if (startDate) filter.date = { $gte: new Date(startDate) };
    if (endDate) filter.date = { ...filter.date, $lte: new Date(endDate) };
    const invoices = await Invoice.find(filter)
      .populate('client', 'name')
      .sort({ date: 1, number: 1 })
      .lean();
    const lines = [];
    const header = 'JournalCode\tJournalLib\tEcritureNum\tEcritureDate\tCompteNum\tCompteLib\tCompAuxNum\tCompAuxLib\tPieceRef\tPieceDate\tEcritureLib\tDebit\tCredit\tEcritureLet\tDateLet\tValidDate\tMontantdevise\tIdevise';
    invoices.forEach((inv) => {
      const date = new Date(inv.date).toLocaleDateString('fr-FR').replace(/\//g, '');
      const lib = `Facture ${inv.number} - ${inv.client?.name || ''}`;
      lines.push(`VT\tVentes\t${inv.number}\t${date}\t411000\tClients\t${inv.client?._id || ''}\t${inv.client?.name || ''}\t${inv.number}\t${date}\t${lib}\t${(inv.totalTTC || 0).toFixed(2)}\t\t\t\t\t\t\tTND`);
      lines.push(`VT\tVentes\t${inv.number}\t${date}\t706000\tPrestations\t\t\t${inv.number}\t${date}\t${lib}\t\t${(inv.subtotalHT || 0).toFixed(2)}\t\t\t\t\t\tTND`);
      lines.push(`VT\tVentes\t${inv.number}\t${date}\t445710\tTVA collectée\t\t\t${inv.number}\t${date}\t${lib}\t\t${(inv.totalTax || 0).toFixed(2)}\t\t\t\t\t\tTND`);
    });
    const fec = [header, ...lines].join('\n');
    res.setHeader('Content-Type', 'text/plain; charset=iso-8859-1');
    res.setHeader('Content-Disposition', `attachment; filename="FEC_${new Date().toISOString().slice(0, 10)}.txt"`);
    res.send(fec);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createInvoice,
  getInvoices,
  getInvoiceById,
  updateInvoice,
  deleteInvoice,
  validateInvoice,
  recordPayment,
  sendReminder,
  exportFEC,
};