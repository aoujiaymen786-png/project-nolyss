const Task = require('../models/Task');
const Project = require('../models/Project');
const notificationService = require('../services/notificationService');

const createTask = async (req, res) => {
  try {
    const { project } = req.body;
    const projectDoc = await Project.findById(project);
    if (!projectDoc) {
      return res.status(404).json({ message: 'Projet non trouvé' });
    }
    if (req.user.role === 'projectManager') {
      const isManager = projectDoc.manager && projectDoc.manager.toString() === req.user._id.toString();
      const isCreator = projectDoc.createdBy && projectDoc.createdBy.toString() === req.user._id.toString();
      if (!isManager && !isCreator) {
        return res.status(403).json({ message: 'Vous n\'êtes pas le manager de ce projet' });
      }
    }
    const task = new Task({
      ...req.body,
      createdBy: req.user._id,
    });
    const createdTask = await task.save();
    const io = req.app.get('io');
    io.to(`project:${project}`).emit('taskCreated', createdTask);
    try {
      const proj = await Project.findById(project).populate('manager', 'name').lean();
      await notificationService.notifyTaskCreated(createdTask, { name: proj?.name, manager: proj?.manager, _id: project }, req.user._id);
    } catch (e) {
      console.error('Notification tâche créée:', e);
    }
    res.status(201).json(createdTask);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const getTasks = async (req, res) => {
  try {
    const { project, assignedTo, status, priority } = req.query;
    const filter = {};
    if (project) filter.project = project;
    if (assignedTo) filter.assignedTo = assignedTo;
    if (status) filter.status = status;
    if (priority) filter.priority = priority;

    if (req.user.role === 'teamMember') {
      const mongoose = require('mongoose');
      const userId = req.user._id;
      const [teamProjectIds, taskProjectIds] = await Promise.all([
        Project.find({ team: userId }).distinct('_id'),
        Task.find({ assignedTo: userId }).distinct('project'),
      ]);
      const idSet = new Set();
      (teamProjectIds || []).forEach((id) => id && idSet.add(id.toString()));
      (taskProjectIds || []).forEach((id) => id && idSet.add(id.toString()));
      const memberProjectIds = Array.from(idSet)
        .filter((id) => id && id.length === 24)
        .map((id) => new mongoose.Types.ObjectId(id));

      if (filter.project) {
        const allowed = memberProjectIds.some((id) => id.toString() === filter.project);
        if (!allowed) return res.json([]);
      } else {
        if (memberProjectIds.length > 0) {
          filter.$or = [
            { project: { $in: memberProjectIds } },
            { assignedTo: userId },
          ];
        } else {
          filter.assignedTo = userId;
        }
      }
    }
    if (req.user.role === 'projectManager') {
      const managedProjectIds = await Project.distinct('_id', {
        $or: [{ manager: req.user._id }, { createdBy: req.user._id }],
      });
      if (filter.project) {
        const allowed = managedProjectIds.some(id => id.toString() === filter.project);
        if (!allowed) return res.json([]);
      } else {
        filter.project = { $in: managedProjectIds };
      }
    }

    const tasks = await Task.find(filter)
      .populate('project', 'name client')
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name email')
      .populate('parentTask', 'title')
      .populate('dependencies', 'title');
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getTaskById = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('project', 'name client manager')
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name email')
      .populate('parentTask', 'title')
      .populate('subtasks')
      .populate('dependencies', 'title')
      .populate('comments.user', 'name');
    if (!task) {
      return res.status(404).json({ message: 'Tâche non trouvée' });
    }
    if (req.user.role === 'teamMember') {
      const isAssigned = task.assignedTo && task.assignedTo.some(u => (u._id || u).toString() === req.user._id.toString());
      const projectId = task.project && (task.project._id || task.project);
      const proj = await Project.findById(projectId).select('team');
      const inTeam = proj && proj.team && proj.team.some(id => id.toString() === req.user._id.toString());
      if (!isAssigned && !inTeam) return res.status(403).json({ message: 'Accès non autorisé' });
    }
    if (req.user.role === 'projectManager') {
      const projectId = task.project && (task.project._id || task.project);
      const proj = await Project.findById(projectId).select('manager');
      if (!proj || proj.manager.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Accès réservé aux projets qui vous sont assignés' });
      }
    }
    res.json(task);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: 'Tâche non trouvée' });
    }

    const projectId = task.project && (task.project._id || task.project);
    const project = await Project.findById(projectId).select('manager team createdBy');
    const isProjectManager = req.user.role === 'projectManager' && project &&
      ((project.manager && project.manager.toString() === req.user._id.toString()) ||
       (project.createdBy && project.createdBy.toString() === req.user._id.toString()));
    const isAssigned = (task.assignedTo || []).some((id) => {
      const uid = id && (id._id || id).toString();
      return uid === req.user._id.toString();
    });
    const inTeam = project && (project.team || []).some(id => (id && id.toString()) === req.user._id.toString());
    const isAdminOrHigher = ['admin', 'director', 'coordinator'].includes(req.user.role);

    if (!isAdminOrHigher && !isProjectManager && !isAssigned && !(req.user.role === 'teamMember' && inTeam)) {
      return res.status(403).json({ message: 'Non autorisé à modifier cette tâche' });
    }

    const previousAssignedTo = (task.assignedTo || []).map((id) => (id && (id._id || id).toString())).filter(Boolean);
    const previousStatus = task.status;

    if (req.user.role === 'teamMember') {
      const allowedFields = ['status', 'actualHours', 'checklist', 'comments', 'attachments', 'dueDate'];
      const updateData = {};
      allowedFields.forEach(field => {
        if (req.body[field] !== undefined) updateData[field] = req.body[field];
      });
      if (updateData.actualHours !== undefined) {
        updateData.actualHours = Number(updateData.actualHours) || 0;
      }
      if (Array.isArray(updateData.checklist)) {
        updateData.checklist = updateData.checklist.filter((i) => i && String(i.item || '').trim());
      }
      Object.assign(task, updateData);
    } else {
      Object.assign(task, req.body);
    }

    if (req.body.status === 'done' && task.status !== 'done') {
      task.completedDate = Date.now();
    }

    const updatedTask = await task.save();
    const io = req.app.get('io');
    io.to(`project:${task.project}`).emit('taskUpdated', updatedTask);

    const newAssignedTo = (updatedTask.assignedTo || []).map((id) => (id && (id._id || id).toString())).filter(Boolean);
    const projForNotif = await Project.findById(projectId).populate('manager', 'name').lean();
    try {
      if (previousStatus !== updatedTask.status) {
        await notificationService.notifyTaskStatusChanged(updatedTask, { name: projForNotif?.name, manager: projForNotif?.manager, _id: projectId }, previousStatus, updatedTask.status, req.user._id);
      }
      if (newAssignedTo.length && (previousAssignedTo.length !== newAssignedTo.length || previousAssignedTo.some((id) => !newAssignedTo.includes(id)) || newAssignedTo.some((id) => !previousAssignedTo.includes(id)))) {
        await notificationService.notifyTaskAssigned(updatedTask, { name: projForNotif?.name }, newAssignedTo, req.user._id);
      }
      if (previousStatus !== 'done' && updatedTask.status === 'done') {
        await notificationService.notifyTaskCompleted(updatedTask, { name: projForNotif?.name, manager: projForNotif?.manager, _id: projectId });
      }
    } catch (e) {
      console.error('Notifications tâche:', e);
    }

    res.json(updatedTask);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const deleteTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: 'Tâche non trouvée' });
    }

    const project = await Project.findById(task.project);
    const isProjectManager = req.user.role === 'projectManager' && project.manager.toString() === req.user._id.toString();
    const isAdminOrHigher = ['admin', 'director', 'coordinator'].includes(req.user.role);

    if (!isAdminOrHigher && !isProjectManager) {
      return res.status(403).json({ message: 'Non autorisé à supprimer cette tâche' });
    }

    await task.deleteOne();
    res.json({ message: 'Tâche supprimée' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const addComment = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: 'Tâche non trouvée' });
    }

    const project = await Project.findById(task.project).select('manager team');
    if (!project) {
      return res.status(404).json({ message: 'Projet non trouvé' });
    }
    if (req.user.role === 'projectManager' && project.manager.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Accès réservé aux projets qui vous sont assignés' });
    }
    if (req.user.role === 'teamMember') {
      const inTeam = project.team.some((id) => id.toString() === req.user._id.toString());
      if (!inTeam) return res.status(403).json({ message: 'Accès réservé aux projets auxquels vous êtes affecté' });
    }

    const comment = {
      user: req.user._id,
      text: req.body.text,
    };
    task.comments.push(comment);
    await task.save();
    res.status(201).json(task.comments);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

module.exports = { createTask, getTasks, getTaskById, updateTask, deleteTask, addComment };