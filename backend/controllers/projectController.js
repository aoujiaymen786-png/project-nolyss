const Project = require('../models/Project');
const Task = require('../models/Task');

const createProject = async (req, res) => {
  try {
    const project = new Project({
      ...req.body,
      createdBy: req.user._id,
    });
    const createdProject = await project.save();
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
      filter.manager = req.user._id;
    }
    if (req.user.role === 'teamMember') {
      filter.team = req.user._id;
    }
    if (status) filter.status = status;
    if (client) filter.client = client;
    if (manager && req.user.role !== 'projectManager') filter.manager = manager;
    if (startDateFrom || startDateTo) {
      filter.startDate = {};
      if (startDateFrom) filter.startDate.$gte = new Date(startDateFrom);
      if (startDateTo) filter.startDate.$lte = new Date(startDateTo);
    }
    if (search && search.trim()) {
      filter.$or = [
        { name: { $regex: search.trim(), $options: 'i' } },
        { description: { $regex: search.trim(), $options: 'i' } },
        { objectives: { $regex: search.trim(), $options: 'i' } },
      ];
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
    res.json(projects);
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
    if (req.user.role === 'projectManager' && managerId !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Accès réservé aux projets qui vous sont assignés' });
    }
    if (req.user.role === 'teamMember') {
      const inTeam = project.team && project.team.some(t => (t._id || t).toString() === req.user._id.toString());
      if (!inTeam) return res.status(403).json({ message: 'Accès réservé aux projets auxquels vous êtes affecté' });
    }
    res.json(project);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (project) {
      if (req.user.role === 'projectManager' && project.manager.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Vous n\'êtes pas le manager de ce projet' });
      }
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
        ];
        const safeUpdate = {};
        allowedFields.forEach((f) => {
          if (req.body[f] !== undefined) safeUpdate[f] = req.body[f];
        });
        Object.assign(project, safeUpdate);
      } else {
        Object.assign(project, req.body);
      }
      const updatedProject = await project.save();
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
      await project.remove();
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
    const [project, tasksByStatus, taskHours] = await Promise.all([
      Project.findById(projectId).select('estimatedHours actualHours estimatedBudget actualBudget').lean(),
      Task.aggregate([{ $match: { project: projectId } }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
      Task.aggregate([
        { $match: { project: projectId } },
        { $group: { _id: null, estimated: { $sum: '$estimatedHours' }, actual: { $sum: '$actualHours' } } },
      ]),
    ]);
    if (!project) return res.status(404).json({ message: 'Projet non trouvé' });

    const projectAccess = await Project.findById(projectId).select('manager team').lean();
    if (!projectAccess) return res.status(404).json({ message: 'Projet non trouvé' });
    if (req.user.role === 'projectManager') {
      if ((projectAccess.manager || '').toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Accès réservé aux projets qui vous sont assignés' });
      }
    }
    if (req.user.role === 'teamMember') {
      const inTeam = (projectAccess.team || []).some((id) => id.toString() === req.user._id.toString());
      if (!inTeam) return res.status(403).json({ message: 'Accès réservé aux projets auxquels vous êtes affecté' });
    }

    const hours = taskHours[0] || { estimated: 0, actual: 0 };
    const totalTasks = tasksByStatus.reduce((acc, x) => acc + x.count, 0);
    const doneCount = tasksByStatus.find((x) => x._id === 'done')?.count || 0;
    const progressPercent = totalTasks ? Math.round((doneCount / totalTasks) * 100) : 0;
    res.json({
      ...project,
      tasksByStatus,
      totalTasks,
      doneCount,
      progressPercent,
      taskEstimatedHours: hours.estimated,
      taskActualHours: hours.actual,
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
    const teamIds = (project.team || []).map((t) => (t._id || t).toString());
    if (req.user.role === 'projectManager' && managerId !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Accès réservé aux projets qui vous sont assignés' });
    }
    if (req.user.role === 'teamMember') {
      const inTeam = teamIds.some((id) => id === req.user._id.toString());
      if (!inTeam) return res.status(403).json({ message: 'Accès réservé aux projets auxquels vous êtes affecté' });
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

module.exports = { createProject, getProjects, getProjectById, updateProject, deleteProject, getProjectProgress, addProjectComment };