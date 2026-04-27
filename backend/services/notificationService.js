const Notification = require('../models/Notification');
const User = require('../models/User');
const NotificationConfig = require('../models/NotificationConfig');

/**
 * Crée des notifications pour une liste d'utilisateurs (sans dupliquer, sans s'envoyer à soi-même si excludeUserId)
 */
async function createForUsers(userIds, payload, excludeUserId = null) {
  if (!userIds || !userIds.length) return;
  const typeKey = payload?.type ? String(payload.type).trim() : '';
  if (!typeKey) return;
  const enabled = await isInAppNotificationEnabled(typeKey);
  if (!enabled) return;
  const uniqueIds = [...new Set(userIds.map((id) => id && id.toString()).filter(Boolean))];
  const toCreate = uniqueIds.filter((id) => id !== (excludeUserId && excludeUserId.toString()));
  if (!toCreate.length) return;
  const docs = toCreate.map((userId) => ({
    user: userId,
    type: payload.type,
    title: payload.title,
    message: payload.message || '',
    link: payload.link || undefined,
    metadata: payload.metadata || undefined,
  }));
  await Notification.insertMany(docs);
}

/**
 * Vérifie si la notification in-app est activée pour un type donné.
 * Si aucune config n'existe, on garde le comportement par défaut: activé.
 */
async function isInAppNotificationEnabled(typeKey) {
  if (!typeKey) return false;
  const config = await NotificationConfig.findOne({ key: typeKey }).select('enabled channels.inApp').lean();
  if (!config) return true;
  if (config.enabled === false) return false;
  if (config.channels && config.channels.inApp === false) return false;
  return true;
}

/**
 * Récupère les IDs des utilisateurs actifs ayant l'un des rôles donnés
 */
async function getUserIdByRoles(roles) {
  const users = await User.find({ role: { $in: roles }, isActive: true }).select('_id').lean();
  return users.map((u) => u._id);
}

/**
 * Récupère les IDs des utilisateurs clients actifs liés à un Client
 */
async function getClientUserIds(clientId) {
  if (!clientId) return [];
  const clientUsers = await User.find({ client: clientId, role: 'client', isActive: true }).select('_id').lean();
  return clientUsers.map((u) => u._id);
}

/**
 * IDs des parties prenantes d'un projet (manager, team, créateur)
 */
function getProjectStakeholderIds(project) {
  const managerId = project?.manager && (project.manager._id || project.manager).toString();
  const createdById = project?.createdBy && (project.createdBy._id || project.createdBy).toString();
  const teamIds = (project?.team || []).map((u) => (u && (u._id || u).toString())).filter(Boolean);
  return [...new Set([managerId, createdById, ...teamIds].filter(Boolean))];
}

/** Notifier les admins : nouvelle inscription en attente de validation */
async function notifyAdminRegistrationPending(user) {
  const adminIds = await getUserIdByRoles(['admin']);
  await createForUsers(adminIds, {
    type: 'registration_pending',
    title: 'Nouvelle inscription',
    message: `${user?.name || 'Un utilisateur'} (${user?.email || 'email inconnu'}) a demandé un compte "${user?.role || 'utilisateur'}" et attend votre validation.`,
    link: '/admin/users',
    metadata: { userId: user?._id, email: user?.email, requestedRole: user?.role },
  });
}

/** Notifier direction + coordinatrice : nouveau projet */
async function notifyProjectCreated(project, createdByUserId) {
  const userIds = await getUserIdByRoles(['director', 'coordinator']);
  await createForUsers(userIds, {
    type: 'project_created',
    title: 'Nouveau projet',
    message: `Le projet "${project.name}" a été créé.`,
    link: `/projects/${project._id}`,
    metadata: { projectId: project._id },
  }, createdByUserId);
}

/** Notifier manager du projet, coordinatrice et assignés : nouvelle tâche */
async function notifyTaskCreated(task, project, createdByUserId) {
  const managerId = project.manager && project.manager.toString();
  const coordinatorIds = await getUserIdByRoles(['coordinator']);
  const assignedIds = (task.assignedTo || []).map((a) => (a._id || a).toString());
  const userIds = [...new Set([managerId, ...coordinatorIds.map((id) => id.toString()), ...assignedIds].filter(Boolean))];
  await createForUsers(userIds, {
    type: 'task_created',
    title: 'Nouvelle tâche',
    message: `Tâche "${task.title}" dans le projet ${project.name || 'projet'}.`,
    link: `/projects/${task.project}/kanban`,
    metadata: { taskId: task._id, projectId: task.project },
  }, createdByUserId);
}

/** Notifier les assignés : tâche assignée / réassignation */
async function notifyTaskAssigned(task, project, assignedToUserIds, assignedByUserId) {
  if (!assignedToUserIds || !assignedToUserIds.length) return;
  const userIds = assignedToUserIds.map((id) => (id._id || id).toString()).filter(Boolean);
  await createForUsers(userIds, {
    type: 'task_assigned',
    title: 'Tâche assignée',
    message: `Vous avez été assigné à la tâche "${task.title}" (${project.name || 'projet'}).`,
    link: `/projects/${task.project}/kanban`,
    metadata: { taskId: task._id, projectId: task.project },
  }, assignedByUserId);
}

/** Notifier manager et coordinatrice : tâche terminée */
async function notifyTaskCompleted(task, project) {
  const managerId = project.manager && project.manager.toString();
  const coordinatorIds = await getUserIdByRoles(['coordinator']);
  const userIds = [...new Set([managerId, ...coordinatorIds.map((id) => id.toString())].filter(Boolean))];
  await createForUsers(userIds, {
    type: 'task_completed',
    title: 'Tâche terminée',
    message: `La tâche "${task.title}" du projet ${project.name || 'projet'} est marquée terminée.`,
    link: `/projects/${task.project}/kanban`,
    metadata: { taskId: task._id, projectId: task.project },
  });
}

/** Notifier les membres ajoutés au projet */
async function notifyMemberAddedToProject(project, addedUserIds, addedByUserId) {
  if (!addedUserIds || !addedUserIds.length) return;
  const userIds = addedUserIds.map((id) => (id._id || id).toString()).filter(Boolean);
  await createForUsers(userIds, {
    type: 'member_added_to_project',
    title: 'Ajout à un projet',
    message: `Vous avez été ajouté au projet "${project.name}".`,
    link: `/projects/${project._id}`,
    metadata: { projectId: project._id },
  }, addedByUserId);
}

/** Notifier le directeur : facture envoyée */
async function notifyInvoiceSent(invoice, clientName) {
  const userIds = await getUserIdByRoles(['director']);
  await createForUsers(userIds, {
    type: 'invoice_sent',
    title: 'Facture envoyée',
    message: `Facture ${invoice.number} (${clientName || 'client'}) a été envoyée.`,
    link: `/invoices/${invoice._id}/edit`,
    metadata: { invoiceId: invoice._id },
  });
}

/** Notifier le responsable assigné : nouvelle réclamation client */
async function notifyClaimCreated(claim, clientName) {
  if (!claim.assignedTo) return;
  const assignedId = (claim.assignedTo._id || claim.assignedTo).toString();
  const coordinatorIds = await getUserIdByRoles(['coordinator']);
  const recipientIds = [...new Set([assignedId, ...coordinatorIds.map((id) => id.toString())])];
  await createForUsers(recipientIds, {
    type: 'claim_created',
    title: 'Nouvelle réclamation',
    message: `Réclamation de ${clientName || 'un client'}: ${claim.subject}.`,
    link: `/clients/claims`,
    metadata: { claimId: claim._id },
  });
}

/** Notifier l'utilisateur : inscription approuvée ou refusée */
async function notifyRegistrationDecision(userId, approved) {
  await createForUsers([userId], {
    type: approved ? 'registration_approved' : 'registration_rejected',
    title: approved ? 'Inscription acceptée' : 'Inscription refusée',
    message: approved ? 'Votre compte a été validé. Vous pouvez vous connecter.' : 'Votre demande d\'inscription n\'a pas été acceptée.',
    link: approved ? '/login' : undefined,
    metadata: { userId },
  });
}

/** Notifier client (User lié au Client) : facture disponible / envoyée */
async function notifyClientInvoiceAvailable(invoice, clientId) {
  const userIds = await getClientUserIds(clientId);
  await createForUsers(userIds, {
    type: 'invoice_available',
    title: 'Nouvelle facture',
    message: `Une facture (${invoice.number}) vous a été envoyée. Vous pouvez la consulter et la régler depuis votre espace client.`,
    link: '/client',
    metadata: { invoiceId: invoice._id },
  });
}

/** Notifier client : devis envoyé */
async function notifyClientQuoteSent(quote, clientId) {
  const userIds = await getClientUserIds(clientId);
  await createForUsers(userIds, {
    type: 'quote_sent',
    title: 'Devis envoyé',
    message: `Un devis (${quote.number}) vous a été envoyé. Vous pouvez le consulter et le valider depuis votre espace client.`,
    link: '/client',
    metadata: { quoteId: quote._id },
  });
}

/** Notifier client : rappel devis */
async function notifyClientQuoteReminder(quote, clientId) {
  const userIds = await getClientUserIds(clientId);
  await createForUsers(userIds, {
    type: 'quote_reminder',
    title: 'Rappel devis',
    message: `Un rappel vous a été envoyé concernant le devis ${quote.number}. Merci de le consulter et de nous faire part de votre décision.`,
    link: '/client',
    metadata: { quoteId: quote._id },
  });
}

/** Notifier client : rappel facture */
async function notifyClientInvoiceReminder(invoice, clientId) {
  const userIds = await getClientUserIds(clientId);
  const remaining = (invoice.totalTTC || 0) - (invoice.paidAmount || 0);
  await createForUsers(userIds, {
    type: 'invoice_reminder',
    title: 'Rappel facture',
    message: `Un rappel vous a été envoyé concernant la facture ${invoice.number} (solde restant : ${remaining.toFixed(2)} TND). Vous pouvez la régler depuis votre espace client.`,
    link: '/client',
    metadata: { invoiceId: invoice._id },
  });
}

/** Notifier client : paiement enregistré */
async function notifyClientPaymentRecorded(invoice, clientId, amount) {
  const userIds = await getClientUserIds(clientId);
  await createForUsers(userIds, {
    type: 'payment_recorded',
    title: 'Paiement enregistré',
    message: `Votre paiement de ${Number(amount).toFixed(2)} TND pour la facture ${invoice.number} a été enregistré.`,
    link: '/client',
    metadata: { invoiceId: invoice._id },
  });
}

/** Notifier interne : devis en attente de validation */
async function notifyQuotePendingValidation(quote, actorUserId) {
  const decisionMakers = await getUserIdByRoles(['director', 'coordinator']);
  await createForUsers(decisionMakers, {
    type: 'quote_pending_validation',
    title: 'Devis en attente',
    message: `Le devis ${quote.number} est en attente de validation.`,
    link: `/quotes/${quote._id}/edit`,
    metadata: { quoteId: quote._id, status: quote.status },
  }, actorUserId);
}

/** Notifier interne : facture en attente de paiement/validation */
async function notifyInvoicePending(invoice, actorUserId) {
  const recipients = await getUserIdByRoles(['director', 'coordinator']);
  await createForUsers(recipients, {
    type: 'invoice_pending',
    title: 'Facture en attente',
    message: `La facture ${invoice.number} est en attente de traitement.`,
    link: `/invoices/${invoice._id}/edit`,
    metadata: { invoiceId: invoice._id, status: invoice.status },
  }, actorUserId);
}

/** Notifier changement de statut projet */
async function notifyProjectStatusChanged(project, previousStatus, nextStatus, changedByUserId) {
  const stakeholderIds = getProjectStakeholderIds(project);
  const coordinatorIds = await getUserIdByRoles(['coordinator']);
  const userIds = [...new Set([...stakeholderIds, ...coordinatorIds.map((id) => id.toString())])];
  await createForUsers(userIds, {
    type: 'project_status_changed',
    title: 'Statut projet modifié',
    message: `Le projet "${project.name}" est passé de "${previousStatus}" à "${nextStatus}".`,
    link: `/projects/${project._id}`,
    metadata: { projectId: project._id, previousStatus, nextStatus },
  }, changedByUserId);
}

/** Notifier changement de statut tâche */
async function notifyTaskStatusChanged(task, project, previousStatus, nextStatus, changedByUserId) {
  const managerId = project?.manager && (project.manager._id || project.manager).toString();
  const assignedIds = (task.assignedTo || []).map((a) => (a._id || a).toString());
  const coordinatorIds = await getUserIdByRoles(['coordinator']);
  const userIds = [...new Set([managerId, ...assignedIds, ...coordinatorIds.map((id) => id.toString())].filter(Boolean))];
  await createForUsers(userIds, {
    type: 'task_status_changed',
    title: 'Statut tâche modifié',
    message: `La tâche "${task.title}" est passée de "${previousStatus}" à "${nextStatus}".`,
    link: `/projects/${task.project}/kanban`,
    metadata: { taskId: task._id, projectId: task.project, previousStatus, nextStatus },
  }, changedByUserId);
}

/** Notifier changement de statut devis */
async function notifyQuoteStatusChanged(quote, previousStatus, nextStatus, changedByUserId) {
  const recipients = await getUserIdByRoles(['director', 'coordinator']);
  await createForUsers(recipients, {
    type: 'quote_status_changed',
    title: 'Statut devis modifié',
    message: `Le devis ${quote.number} est passé de "${previousStatus}" à "${nextStatus}".`,
    link: `/quotes/${quote._id}/edit`,
    metadata: { quoteId: quote._id, previousStatus, nextStatus },
  }, changedByUserId);
}

/** Notifier changement de statut facture */
async function notifyInvoiceStatusChanged(invoice, previousStatus, nextStatus, changedByUserId) {
  const recipients = await getUserIdByRoles(['director', 'coordinator']);
  await createForUsers(recipients, {
    type: 'invoice_status_changed',
    title: 'Statut facture modifié',
    message: `La facture ${invoice.number} est passée de "${previousStatus}" à "${nextStatus}".`,
    link: `/invoices/${invoice._id}/edit`,
    metadata: { invoiceId: invoice._id, previousStatus, nextStatus },
  }, changedByUserId);
}

/** Notifier paiement effectué (interne) */
async function notifyPaymentMade(invoice, amount, actorUserId) {
  const recipients = await getUserIdByRoles(['director', 'coordinator']);
  await createForUsers(recipients, {
    type: 'payment_made',
    title: 'Paiement effectué',
    message: `Un paiement de ${Number(amount).toFixed(2)} TND a été enregistré pour la facture ${invoice.number}.`,
    link: `/invoices/${invoice._id}/edit`,
    metadata: { invoiceId: invoice._id, amount: Number(amount), status: invoice.status },
  }, actorUserId);
}

/** Notifier validation de facture */
async function notifyInvoiceValidated(invoice, actorUserId) {
  const recipients = await getUserIdByRoles(['director', 'coordinator']);
  await createForUsers(recipients, {
    type: 'invoice_validated',
    title: 'Facture validée',
    message: `La facture ${invoice.number} a été validée (statut: ${invoice.status}).`,
    link: `/invoices/${invoice._id}/edit`,
    metadata: { invoiceId: invoice._id, status: invoice.status },
  }, actorUserId);
}

/** Notifier création d'un client */
async function notifyClientCreated(client, createdByUserId) {
  const recipients = await getUserIdByRoles(['director', 'coordinator', 'admin']);
  await createForUsers(recipients, {
    type: 'client_created',
    title: 'Nouveau client',
    message: `Le client "${client.name}" a été créé.`,
    link: `/clients/${client._id}`,
    metadata: { clientId: client._id },
  }, createdByUserId);
}

/** Notifier commentaire projet aux membres concernés */
async function notifyProjectCommentAdded(project, comment, actorUserId) {
  const stakeholderIds = getProjectStakeholderIds(project);
  await createForUsers(stakeholderIds, {
    type: 'project_comment_added',
    title: 'Nouveau commentaire projet',
    message: `Un nouveau commentaire a été ajouté au projet "${project.name}".`,
    link: `/projects/${project._id}`,
    metadata: { projectId: project._id, commentId: comment?._id || null },
  }, actorUserId);
}

/** Notifier fin d'un jalon */
async function notifyMilestoneCompleted(project, milestone, actorUserId) {
  const stakeholderIds = getProjectStakeholderIds(project);
  await createForUsers(stakeholderIds, {
    type: 'milestone_completed',
    title: 'Jalon terminé',
    message: `Le jalon "${milestone?.name || 'Sans titre'}" du projet "${project.name}" est terminé.`,
    link: `/projects/${project._id}`,
    metadata: { projectId: project._id, milestoneName: milestone?.name || null },
  }, actorUserId);
}

/** Notifier fin d'un sprint */
async function notifySprintCompleted(project, sprint, actorUserId) {
  const stakeholderIds = getProjectStakeholderIds(project);
  await createForUsers(stakeholderIds, {
    type: 'sprint_completed',
    title: 'Sprint terminé',
    message: `Le sprint "${sprint?.name || 'Sans titre'}" du projet "${project.name}" est terminé.`,
    link: `/projects/${project._id}`,
    metadata: { projectId: project._id, sprintName: sprint?.name || null },
  }, actorUserId);
}

/** Projet complété : notifier direction et coordinatrice */
async function notifyProjectCompleted(project) {
  const userIds = await getUserIdByRoles(['director', 'coordinator']);
  await createForUsers(userIds, {
    type: 'project_completed',
    title: 'Projet terminé',
    message: `Le projet "${project.name}" a été marqué comme terminé.`,
    link: `/projects/${project._id}`,
    metadata: { projectId: project._id },
  });
}

/** Projet complété : notifier le client (portail client) */
async function notifyClientProjectCompleted(project, clientId) {
  const userIds = await getClientUserIds(clientId);
  await createForUsers(userIds, {
    type: 'client_project_completed',
    title: 'Projet finalisé',
    message: `Votre projet "${project?.name || 'projet'}" a été finalisé. Vous pouvez consulter les livrables dans votre espace client.`,
    link: '/client',
    metadata: { projectId: project?._id, clientId },
  });
}

module.exports = {
  createForUsers,
  getUserIdByRoles,
  getClientUserIds,
  notifyAdminRegistrationPending,
  notifyProjectCreated,
  notifyTaskCreated,
  notifyTaskAssigned,
  notifyTaskCompleted,
  notifyMemberAddedToProject,
  notifyInvoiceSent,
  notifyClaimCreated,
  notifyRegistrationDecision,
  notifyClientInvoiceAvailable,
  notifyClientQuoteSent,
  notifyClientQuoteReminder,
  notifyClientInvoiceReminder,
  notifyClientPaymentRecorded,
  notifyProjectCompleted,
  notifyClientProjectCompleted,
  notifyQuotePendingValidation,
  notifyInvoicePending,
  notifyProjectStatusChanged,
  notifyTaskStatusChanged,
  notifyQuoteStatusChanged,
  notifyInvoiceStatusChanged,
  notifyPaymentMade,
  notifyInvoiceValidated,
  notifyClientCreated,
  notifyProjectCommentAdded,
  notifyMilestoneCompleted,
  notifySprintCompleted,
};
