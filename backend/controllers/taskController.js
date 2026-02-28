const Task = require('../models/Task');
const Project = require('../models/Project');

const createTask = async (req, res) => {
  try {
    const { project } = req.body;
    const projectDoc = await Project.findById(project);
    if (!projectDoc) {
      return res.status(404).json({ message: 'Projet non trouvé' });
    }
    if (req.user.role === 'projectManager' && projectDoc.manager.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Vous n\'êtes pas le manager de ce projet' });
    }
    const task = new Task({
      ...req.body,
      createdBy: req.user._id,
    });
    const createdTask = await task.save();
    
    // Notification socket.io
    const io = req.app.get('io');
    io.to(`project:${project}`).emit('taskCreated', createdTask);
    
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
      const memberProjectIds = await Project.find({ team: req.user._id }).distinct('_id');
      if (filter.project) {
        const allowed = memberProjectIds.some(id => id.toString() === filter.project);
        if (!allowed) return res.json([]);
      } else {
        filter.project = { $in: memberProjectIds };
      }
    }
    if (req.user.role === 'projectManager') {
      const managedProjectIds = await Project.find({ manager: req.user._id }).distinct('_id');
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

    const isProjectManager = req.user.role === 'projectManager' && 
      (await Project.findById(task.project)).manager.toString() === req.user._id.toString();
    const isAssigned = task.assignedTo.some(id => id.toString() === req.user._id.toString());
    const isAdminOrHigher = ['admin', 'director', 'coordinator'].includes(req.user.role);

    if (!isAdminOrHigher && !isProjectManager && !isAssigned) {
      return res.status(403).json({ message: 'Non autorisé à modifier cette tâche' });
    }

    if (req.user.role === 'teamMember') {
      const allowedFields = ['status', 'actualHours', 'checklist', 'comments', 'attachments'];
      const updateData = {};
      allowedFields.forEach(field => {
        if (req.body[field] !== undefined) updateData[field] = req.body[field];
      });
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

    await task.remove();
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