const Notification = require('../models/Notification');
const User = require('../models/User');

/**
 * Crée des notifications pour une liste d'utilisateurs (sans dupliquer, sans s'envoyer à soi-même si excludeUserId)
 */
async function createForUsers(userIds, payload, excludeUserId = null) {
  if (!userIds || !userIds.length) return;
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
 * Récupère les IDs des utilisateurs actifs ayant l'un des rôles donnés
 */
async function getUserIdByRoles(roles) {
  const users = await User.find({ role: { $in: roles }, isActive: true }).select('_id').lean();
  return users.map((u) => u._id);
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
  await createForUsers([assignedId], {
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

/** Notifier direction : devis validé (accepté/refusé par directeur) - optionnel, peut être omis car c'est l'acteur qui fait l'action */
/** Notifier client (User lié au Client) : facture disponible */
async function notifyClientInvoiceAvailable(invoice, clientId) {
  const clientUsers = await User.find({ client: clientId, role: 'client', isActive: true }).select('_id').lean();
  const userIds = clientUsers.map((u) => u._id);
  await createForUsers(userIds, {
    type: 'invoice_available',
    title: 'Nouvelle facture',
    message: `Une facture (${invoice.number}) est disponible pour consultation.`,
    link: '/client',
    metadata: { invoiceId: invoice._id },
  });
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

module.exports = {
  createForUsers,
  getUserIdByRoles,
  notifyProjectCreated,
  notifyTaskCreated,
  notifyTaskAssigned,
  notifyTaskCompleted,
  notifyMemberAddedToProject,
  notifyInvoiceSent,
  notifyClaimCreated,
  notifyRegistrationDecision,
  notifyClientInvoiceAvailable,
  notifyProjectCompleted,
};
