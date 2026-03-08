/**
 * Relance automatique des factures en retard : envoi d'un email de rappel
 * pour les factures dont l'échéance est dépassée et qui ne sont pas intégralement payées.
 * S'exécute une fois par jour (délai configurable via RELANCE_CRON_DAYS ou 1 jour).
 */
const nodemailer = require('nodemailer');

const runReminders = async () => {
  if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    return;
  }
  const Invoice = require('../models/Invoice');
  const now = new Date();
  const invoices = await Invoice.find({
    status: { $in: ['sent', 'partial', 'overdue'] },
    dueDate: { $lt: now },
  })
    .populate('client', 'name email contacts')
    .lean();

  const oneDayMs = 24 * 60 * 60 * 1000;
  const maxReminders = 10;
  const toProcess = invoices.filter((inv) => {
    const total = inv.totalTTC || 0;
    const paid = inv.paidAmount || 0;
    if (total - paid < 0.01 || !inv.client) return false;
    if ((inv.remindersSent || 0) >= maxReminders) return false;
    const last = inv.lastReminderAt ? new Date(inv.lastReminderAt).getTime() : 0;
    if (last && now.getTime() - last < oneDayMs) return false; // au plus une relance par jour
    return true;
  });

  if (toProcess.length === 0) return;

  let toEmail;
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT || 587,
    secure: false,
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
  });

  for (const inv of toProcess) {
    const client = inv.client;
    toEmail = client.email;
    if (!toEmail && client.contacts?.length) {
      const primary = client.contacts.find((c) => c.isPrimary && c.email);
      toEmail = primary?.email || client.contacts.find((c) => c.email)?.email;
    }
    if (!toEmail) continue;
    const remaining = (inv.totalTTC || 0) - (inv.paidAmount || 0);
    const dueStr = inv.dueDate ? new Date(inv.dueDate).toLocaleDateString('fr-FR') : '';
    try {
      await transporter.sendMail({
        from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
        to: toEmail,
        subject: `Rappel : facture ${inv.number} - solde à régler`,
        html: `
          <p>Bonjour,</p>
          <p>Nous vous rappelons que la facture <strong>${inv.number}</strong> (${client.name}) présente un solde restant à régler de <strong>${remaining.toFixed(2)} TND</strong>.</p>
          ${dueStr ? `<p>Date d'échéance : ${dueStr}.</p>` : ''}
          <p>Merci de procéder au règlement dans les meilleurs délais.</p>
          <p>Cordialement,<br/>L'équipe</p>
        `,
      });
      await Invoice.findByIdAndUpdate(inv._id, {
        $inc: { remindersSent: 1 },
        lastReminderAt: new Date(),
      });
    } catch (err) {
      console.error('Erreur relance auto facture', inv.number, err.message);
    }
  }
};

const startInvoiceReminderJob = () => {
  const intervalMs = (Number(process.env.RELANCE_CRON_HOURS) || 24) * 60 * 60 * 1000;
  const delayMs = Math.min(60 * 1000, intervalMs); // première exécution après 1 min (ou moins)
  setTimeout(() => {
    runReminders().catch((e) => console.error('Job relance factures:', e));
    setInterval(() => runReminders().catch((e) => console.error('Job relance factures:', e)), intervalMs);
  }, delayMs);
};

module.exports = { runReminders, startInvoiceReminderJob };
