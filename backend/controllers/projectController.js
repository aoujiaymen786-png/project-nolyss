const mongoose = require('mongoose');
const Project = require('../models/Project');
const Task = require('../models/Task');
const notificationService = require('../services/notificationService');

const getTeamMemberProjectIds = async (userId) => {
  const [teamProjectIds, taskProjectIds] = await Promise.all([
    Project.find({ team: userId }).distinct('_id'),
    Task.find({ assignedTo: userId }).distinct('project'),
  ]);
  const idSet = new Set(teamProjectIds.map((id) => id.toString()));
  taskProjectIds.forEach((id) => id && idSet.add(id.toString()));
  return Array.from(idSet).map((id) => new mongoose.Types.ObjectId(id));
};

const sanitizeProjectBody = (body) => {
  const sanitized = { ...body };
  if (sanitized.manager === '' || sanitized.manager === null) delete sanitized.manager;
  if (sanitized.client === '' || sanitized.client === null) delete sanitized.client;
  if (Array.isArray(sanitized.team)) {
    sanitized.team = sanitized.team.filter((id) => id && String(id).trim());
  }
  return sanitized;
};

const createProject = async (req, res) => {
  try {
    const sanitized = sanitizeProjectBody(req.body);
    // Si aucun manager n'est défini, assigner le créateur pour qu'il puisse voir le projet
    if (!sanitized.manager && req.user.role === 'projectManager') {
      sanitized.manager = req.user._id;
    }
    const project = new Project({
      ...sanitized,
      createdBy: req.user._id,
    });
    const createdProject = await project.save();
    try {
      await notificationService.notifyProjectCreated(createdProject, req.user._id);
    } catch (e) {
      console.error('Notification projet créé:', e);
    }

    // Créer une tâche par défaut pour que le Kanban ne soit pas vide
    await Task.create({
      title: 'Lancement du projet',
      description: 'Tâche initiale : kick-off et planification des activités.',
      project: createdProject._id,
      status: 'todo',
      priority: 'medium',
      assignedTo: createdProject.manager
        ? [createdProject.manager]
        : (createdProject.team?.length ? [createdProject.team[0]] : []),
      createdBy: req.user._id,
    });

    res.status(201).json(createdProject);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const getProjects = async (req, res) => {
  try {
    const { status, client, manager, startDateFrom, startDateTo, search, sort = 'updatedAt', sortOrder = 'desc' } = req.query;
    const filter = {};

    if (req.user.role === 'projectManager') {
      filter.$and = (filter.$and || []).concat([
        { $or: [{ manager: req.user._id }, { createdBy: req.user._id }] },
      ]);
    }
    if (req.user.role === 'teamMember') {
      const memberProjectIds = await getTeamMemberProjectIds(req.user._id);
      if (memberProjectIds.length === 0) return res.json([]);
      filter._id = { $in: memberProjectIds };
    }
    if (status) filter.status = status;
    if (client) filter.client = client;
    if (manager && req.user.role !== 'projectManager') filter.manager = manager;
    if (startDateFrom || startDateTo) {
      filter.startDate = filter.startDate || {};
      if (startDateFrom) filter.startDate.$gte = new Date(startDateFrom);
      if (startDateTo) filter.startDate.$lte = new Date(startDateTo);
    }
    if (search && search.trim()) {
      filter.$and = (filter.$and || []).concat([
        {
          $or: [
            { name: { $regex: search.trim(), $options: 'i' } },
            { description: { $regex: search.trim(), $options: 'i' } },
            { objectives: { $regex: search.trim(), $options: 'i' } },
          ],
        },
      ]);
    }

    const sortObj = {};
    const allowedSort = ['name', 'startDate', 'endDate', 'deadline', 'createdAt', 'updatedAt', 'status', 'priority', 'estimatedBudget'];
    if (allowedSort.includes(sort)) {
      sortObj[sort] = sortOrder === 'asc' ? 1 : -1;
    } else {
      sortObj.updatedAt = -1;
    }

    const projects = await Project.find(filter)
      .sort(sortObj)
      .populate('client', 'name')
      .populate('manager', 'name email')
      .populate('team', 'name email')
      .populate('createdBy', 'name email')
      .lean();
    // Anciens projets avec statut "quotation" (devis) : affichés comme "inProgress" (un devis est lié à un projet, ce n'est pas un statut de projet)
    const normalized = projects.map((p) => (p.status === 'quotation' ? { ...p, status: 'inProgress' } : p));
    res.json(normalized);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getProjectById = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('client', 'name contacts')
      .populate('manager', 'name email')
      .populate('team', 'name email')
      .populate('createdBy', 'name email')
      .populate('comments.user', 'name');
    if (!project) {
      return res.status(404).json({ message: 'Projet non trouvé' });
    }
    const managerId = project.manager && (project.manager._id || project.manager).toString();
    const createdById = project.createdBy && (project.createdBy._id || project.createdBy).toString();
    if (req.user.role === 'projectManager') {
      const isManager = managerId === req.user._id.toString();
      const isCreator = createdById === req.user._id.toString();
      if (!isManager && !isCreator) {
        return res.status(403).json({ message: 'Accès réservé aux projets qui vous sont assignés' });
      }
    }
    if (req.user.role === 'teamMember') {
      const inTeam = project.team && project.team.some(t => (t._id || t).toString() === req.user._id.toString());
      const hasAssignedTask = await Task.exists({ project: project._id, assignedTo: req.user._id });
      if (!inTeam && !hasAssignedTask) return res.status(403).json({ message: 'Accès réservé aux projets auxquels vous êtes affecté' });
    }
    const out = project.toObject ? project.toObject() : { ...project };
    if (out.status === 'quotation') out.status = 'inProgress';
    res.json(out);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (project) {
      if (req.user.role === 'projectManager') {
        const isManager = project.manager && project.manager.toString() === req.user._id.toString();
        const isCreator = project.createdBy && project.createdBy.toString() === req.user._id.toString();
        if (!isManager && !isCreator) {
          return res.status(403).json({ message: 'Vous n\'êtes pas le manager de ce projet' });
        }
      }
      const previousTeam = (project.team || []).map((t) => t.toString());
      const previousStatus = project.status;
      if (req.user.role === 'projectManager') {
        // Budget "limité" pour chef de projet : ajuste le budget prévisionnel, pas la structure financière réelle.
        const allowedFields = [
          'name',
          'type',
          'status',
          'priority',
          'description',
          'objectives',
          'startDate',
          'endDate',
          'deadline',
          'estimatedBudget',
          'estimatedHours',
          'team',
          'attachments',
          'tags',
          'milestones',
          'sprints',
        ];
        const safeUpdate = {};
        allowedFields.forEach((f) => {
          if (req.body[f] !== undefined) safeUpdate[f] = req.body[f];
        });
        Object.assign(project, sanitizeProjectBody(safeUpdate));
      } else {
        Object.assign(project, sanitizeProjectBody(req.body));
      }
      if (project.status === 'quotation') project.status = 'inProgress';
      const updatedProject = await project.save();
      const newTeam = (updatedProject.team || []).map((t) => t.toString());
      const addedIds = newTeam.filter((id) => !previousTeam.includes(id));
      if (addedIds.length) {
        try {
          const projPop = await Project.findById(updatedProject._id).populate('client', 'name').lean();
          await notificationService.notifyMemberAddedToProject(projPop || updatedProject, addedIds, req.user._id);
        } catch (e) {
          console.error('Notification membre ajouté:', e);
        }
      }
      if (previousStatus !== 'completed' && updatedProject.status === 'completed') {
        try {
          const projPop = await Project.findById(updatedProject._id).populate('client', 'name').lean();
          await notificationService.notifyProjectCompleted(projPop || updatedProject);
        } catch (e) {
          console.error('Notification projet terminé:', e);
        }
      }
      res.json(updatedProject);
    } else {
      res.status(404).json({ message: 'Projet non trouvé' });
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const deleteProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (project) {
      await project.deleteOne();
      res.json({ message: 'Projet supprimé' });
    } else {
      res.status(404).json({ message: 'Projet non trouvé' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getProjectProgress = async (req, res) => {
  try {
    const projectId = req.params.id;
    const projectIdObj = mongoose.Types.ObjectId.isValid(projectId) ? new mongoose.Types.ObjectId(projectId) : projectId;
    const [project, tasksByStatus, taskHours] = await Promise.all([
      Project.findById(projectId).select('estimatedHours actualHours estimatedBudget actualBudget').lean(),
      Task.aggregate([{ $match: { project: projectIdObj } }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
      Task.aggregate([
        { $match: { project: projectIdObj } },
        { $group: { _id: null, estimated: { $sum: '$estimatedHours' }, actual: { $sum: '$actualHours' } } },
      ]),
    ]);
    if (!project) return res.status(404).json({ message: 'Projet non trouvé' });

    const projectAccess = await Project.findById(projectId).select('manager team createdBy').lean();
    if (!projectAccess) return res.status(404).json({ message: 'Projet non trouvé' });
    if (req.user.role === 'projectManager') {
      const isManager = (projectAccess.manager || '').toString() === req.user._id.toString();
      const isCreator = (projectAccess.createdBy || '').toString() === req.user._id.toString();
      if (!isManager && !isCreator) {
        return res.status(403).json({ message: 'Accès réservé aux projets qui vous sont assignés' });
      }
    }
    if (req.user.role === 'teamMember') {
      const inTeam = (projectAccess.team || []).some((id) => id && id.toString() === req.user._id.toString());
      const hasAssignedTask = await Task.exists({ project: projectId, assignedTo: req.user._id });
      if (!inTeam && !hasAssignedTask) return res.status(403).json({ message: 'Accès réservé aux projets auxquels vous êtes affecté' });
    }

    const hours = taskHours[0] || {};
    const estimatedHours = hours.estimated ?? 0;
    const actualHours = hours.actual ?? 0;
    const totalTasks = tasksByStatus.reduce((acc, x) => acc + (x.count || 0), 0);
    const doneCount = tasksByStatus.find((x) => x._id === 'done')?.count || 0;
    // Avancement basé sur les heures (réel/estimé) si des heures sont estimées, sinon sur le nombre de tâches terminées
    const progressPercent = estimatedHours > 0
      ? Math.min(100, Math.round((actualHours / estimatedHours) * 100))
      : (totalTasks ? Math.round((doneCount / totalTasks) * 100) : 0);
    res.json({
      ...project,
      tasksByStatus,
      totalTasks,
      doneCount,
      progressPercent,
      taskEstimatedHours: estimatedHours,
      taskActualHours: actualHours,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const addProjectComment = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ message: 'Projet non trouvé' });
    }
    const managerId = project.manager && (project.manager._id || project.manager).toString();
    const createdById = project.createdBy && (project.createdBy._id || project.createdBy).toString();
    if (req.user.role === 'projectManager') {
      const isManager = managerId === req.user._id.toString();
      const isCreator = createdById === req.user._id.toString();
      if (!isManager && !isCreator) {
        return res.status(403).json({ message: 'Accès réservé aux projets qui vous sont assignés' });
      }
    }
    if (req.user.role === 'teamMember') {
      const teamIds = (project.team || []).map((t) => (t._id || t).toString());
      const hasAssignedTask = await Task.exists({ project: project._id, assignedTo: req.user._id });
      const inTeam = teamIds.some((id) => id === req.user._id.toString());
      if (!inTeam && !hasAssignedTask) return res.status(403).json({ message: 'Accès réservé aux projets auxquels vous êtes affecté' });
    }
    const comment = {
      user: req.user._id,
      text: req.body.text || req.body.content,
    };
    if (!comment.text || !comment.text.trim()) {
      return res.status(400).json({ message: 'Le contenu du commentaire est requis.' });
    }
    comment.text = comment.text.trim();
    project.comments = project.comments || [];
    project.comments.push(comment);
    await project.save();
    const populated = await Project.findById(project._id)
      .populate('comments.user', 'name')
      .select('comments')
      .lean();
    res.status(201).json(populated.comments);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const validateProjectAttachment = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: 'Projet non trouvé' });
    if (req.user.role === 'projectManager') {
      const isManager = project.manager && project.manager.toString() === req.user._id.toString();
      const isCreator = project.createdBy && project.createdBy.toString() === req.user._id.toString();
      if (!isManager && !isCreator) return res.status(403).json({ message: 'Accès non autorisé' });
    }
    const index = parseInt(req.params.attachmentIndex, 10);
    if (!Number.isFinite(index) || index < 0 || !project.attachments || !project.attachments[index]) {
      return res.status(400).json({ message: 'Document non trouvé' });
    }
    project.attachments[index].validated = true;
    project.attachments[index].validatedAt = new Date();
    project.attachments[index].validatedBy = req.user._id;
    await project.save();
    const updated = await Project.findById(project._id).populate('attachments.validatedBy', 'name').lean();
    res.json(updated.attachments[index]);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { createProject, getProjects, getProjectById, updateProject, deleteProject, getProjectProgress, addProjectComment, validateProjectAttachment };