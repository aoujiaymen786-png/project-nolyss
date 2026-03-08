const Project = require('../models/Project');
const Client = require('../models/Client');
const Task = require('../models/Task');
const Invoice = require('../models/Invoice');
const Quote = require('../models/Quote');
const User = require('../models/User');
const SystemSettings = require('../models/SystemSettings');

const getDashboardStats = async (req, res) => {
  try {
    const userRole = req.user.role;
    let filter = {};

    if (userRole === 'projectManager') {
      filter = { manager: req.user._id };
    } else if (userRole === 'teamMember') {
      filter = { team: req.user._id };
    } else if (userRole === 'client') {
      return res.status(403).json({ message: 'Accès non autorisé' });
    }

    const totalProjects = await Project.countDocuments(filter);
    const projectsByStatus = await Project.aggregate([
      { $match: filter },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    let totalClients = 0;
    let clientsBySector = [];
    if (['admin', 'director', 'coordinator'].includes(userRole)) {
      totalClients = await Client.countDocuments();
      clientsBySector = await Client.aggregate([
        { $group: { _id: '$sector', count: { $sum: 1 } } }
      ]);
    }

    const taskFilter = {};
    if (userRole === 'projectManager') {
      const projects = await Project.find({ manager: req.user._id }).distinct('_id');
      taskFilter.project = { $in: projects };
    } else if (userRole === 'teamMember') {
      taskFilter.assignedTo = req.user._id;
    }
    const totalTasks = await Task.countDocuments(taskFilter);
    const tasksByStatus = await Task.aggregate([
      { $match: taskFilter },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    let revenue = 0;
    let invoicesStatus = [];
    if (['admin', 'director', 'coordinator'].includes(userRole)) {
      const invoices = await Invoice.aggregate([
        { $match: { status: { $ne: 'draft' } } },
        { $group: { _id: '$status', total: { $sum: '$totalTTC' }, count: { $sum: 1 } } }
      ]);
      invoicesStatus = invoices;
      revenue = invoices.filter(i => i._id === 'paid').reduce((acc, i) => acc + i.total, 0);
    }

    res.json({
      projects: { total: totalProjects, byStatus: projectsByStatus },
      clients: { total: totalClients, bySector: clientsBySector },
      tasks: { total: totalTasks, byStatus: tasksByStatus },
      finances: { revenue, invoicesStatus },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getExecutiveDashboard = async (req, res) => {
  try {
    const projects = await Project.find().populate('client', 'name').lean();
    const tasks = await Task.find().populate('assignedTo', 'name').lean();
    const users = await User.find({ role: { $in: ['projectManager', 'teamMember'] } }).lean();

    const workload = users.map(user => {
      const userTasks = tasks.filter(t => {
        const assignees = t.assignedTo || [];
        return assignees.some(a => (a._id || a).toString() === user._id.toString());
      });
      const totalEstimated = userTasks.reduce((acc, t) => acc + (t.estimatedHours || 0), 0);
      const totalActual = userTasks.reduce((acc, t) => acc + (t.actualHours || 0), 0);
      return {
        userId: user._id,
        user: user.name,
        estimated: totalEstimated,
        actual: totalActual,
        taskCount: userTasks.length,
      };
    });

    const profitability = projects.map(p => ({
      project: p.name,
      client: p.client?.name,
      estimatedBudget: p.estimatedBudget || 0,
      actualCost: (p.actualHours || 0) * 50,
      revenue: p.actualBudget || 0,
    }));

    res.json({ workload, profitability });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Tableau de bord Directeur : KPIs business, financier, projets, charge, portefeuille clients, validations
const getDirectorDashboard = async (req, res) => {
  try {
    const validationThreshold = await SystemSettings.findOne({ key: 'invoiceValidationThreshold' })
      .then(s => (s && Number(s.value)) || 5000);
    const quoteThreshold = await SystemSettings.findOne({ key: 'quoteValidationThreshold' })
      .then(s => (s && Number(s.value)) || 5000);

    const [
      projects,
      tasks,
      users,
      clients,
      invoices,
      quotes,
      projectsByStatus,
      invoiceAgg,
    ] = await Promise.all([
      Project.find().populate('client', 'name').populate('manager', 'name').lean(),
      Task.find().populate('assignedTo', 'name').lean(),
      User.find({ role: { $in: ['projectManager', 'teamMember'] } }).select('name').lean(),
      Client.find().lean(),
      Invoice.find({ status: { $nin: ['draft', 'cancelled'] } }).populate('client', 'name').populate('project', 'name').lean(),
      Quote.find({ status: 'sent' }).populate('client', 'name').populate('project', 'name').lean(),
      Project.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      Invoice.aggregate([
        { $match: { status: { $nin: ['draft', 'cancelled'] } } },
        { $group: { _id: '$status', total: { $sum: '$totalTTC' }, count: { $sum: 1 } } },
      ]),
    ]);

    const totalRevenue = invoiceAgg.filter(i => i._id === 'paid').reduce((acc, i) => acc + i.total, 0);
    const totalSent = invoiceAgg.filter(i => i._id === 'sent').reduce((acc, i) => acc + i.total, 0);
    const totalPartial = invoiceAgg.filter(i => i._id === 'partial').reduce((acc, i) => acc + i.total, 0);

    const workloadByTeam = users.map(user => {
      const userTasks = tasks.filter(t => {
        const assignees = t.assignedTo || [];
        return assignees.some(a => (a._id || a).toString() === user._id.toString());
      });
      const totalEstimated = userTasks.reduce((acc, t) => acc + (t.estimatedHours || 0), 0);
      const totalActual = userTasks.reduce((acc, t) => acc + (t.actualHours || 0), 0);
      return {
        userId: user._id,
        name: user.name,
        taskCount: userTasks.length,
        estimatedHours: totalEstimated,
        actualHours: totalActual,
      };
    });

    const clientPortfolio = clients.map((c) => {
      const clientProjects = projects.filter(p => p.client && (p.client._id || p.client).toString() === c._id.toString());
      const clientInvoices = invoices.filter(inv => (inv.client?._id || inv.client)?.toString() === c._id.toString());
      const revenue = clientInvoices.filter(i => i.status === 'paid').reduce((acc, i) => acc + (i.totalTTC || 0), 0);
      const pending = clientInvoices.filter(i => ['sent', 'partial'].includes(i.status)).reduce((acc, i) => acc + (i.totalTTC || 0), 0);
      const sorted = [...clientProjects].sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));
      return {
        _id: c._id,
        name: c.name,
        sector: c.sector,
        projectCount: clientProjects.length,
        totalRevenue: revenue,
        pendingAmount: pending,
        lastProject: sorted[0]?.name || null,
      };
    });

    const pendingQuotesAboveThreshold = quotes.filter(q => (q.totalTTC || 0) >= quoteThreshold);
    const pendingInvoicesAboveThreshold = invoices
      .filter(i => ['sent', 'partial'].includes(i.status) && (i.totalTTC || 0) >= validationThreshold);

    const kpis = {
      totalRevenue,
      totalProjects: projects.length,
      totalClients: clients.length,
      projectsByStatus,
      invoiceByStatus: invoiceAgg,
      pendingQuotesCount: pendingQuotesAboveThreshold.length,
      pendingInvoicesCount: pendingInvoicesAboveThreshold.length,
    };

    const financialSummary = {
      revenue: totalRevenue,
      sentNotPaid: totalSent + totalPartial,
      byStatus: invoiceAgg,
    };

    const projectsOverview = projects.map(p => ({
      _id: p._id,
      name: p.name,
      client: p.client?.name,
      manager: p.manager?.name,
      status: p.status,
      estimatedBudget: p.estimatedBudget,
      actualBudget: p.actualBudget,
      actualHours: p.actualHours,
    }));

    const pendingValidations = {
      quoteValidationThreshold: quoteThreshold,
      invoiceValidationThreshold: validationThreshold,
      quotes: pendingQuotesAboveThreshold.map(q => ({
        _id: q._id,
        number: q.number,
        client: q.client?.name,
        totalTTC: q.totalTTC,
        status: q.status,
      })),
      invoices: pendingInvoicesAboveThreshold.map(i => ({
        _id: i._id,
        number: i.number,
        client: i.client?.name,
        totalTTC: i.totalTTC,
        status: i.status,
      })),
    };

    res.json({
      kpis,
      financialSummary,
      projectsOverview,
      workloadByTeam: workloadByTeam.sort((a, b) => b.taskCount - a.taskCount),
      clientPortfolio: clientPortfolio.sort((a, b) => (b.totalRevenue || 0) - (a.totalRevenue || 0)),
      pendingValidations,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Dashboard Coordinatrice : vision globale opérationnelle multi-projets
const getCoordinatorDashboard = async (req, res) => {
  try {
    const now = new Date();
    const next7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const [projects, tasks, users] = await Promise.all([
      Project.find()
        .populate('client', 'name')
        .populate('manager', 'name')
        .populate('team', 'name')
        .lean(),
      Task.find()
        .populate('project', 'name deadline status')
        .populate('assignedTo', 'name')
        .populate('createdBy', 'name')
        .lean(),
      User.find({ role: { $in: ['projectManager', 'teamMember'] }, isActive: true })
        .select('name role')
        .lean(),
    ]);

    const activeStatuses = ['prospecting', 'quotation', 'inProgress', 'validation'];
    const activeProjects = projects.filter((p) => activeStatuses.includes(p.status));
    const overdueProjects = activeProjects.filter((p) => p.deadline && new Date(p.deadline) < now);
    const nearDeadlineProjects = activeProjects.filter((p) => {
      if (!p.deadline) return false;
      const d = new Date(p.deadline);
      return d >= now && d <= next7Days;
    });

    const openTasks = tasks.filter((t) => t.status !== 'done');
    const estimatedHours = tasks.reduce((acc, t) => acc + (t.estimatedHours || 0), 0);
    const consumedHours = tasks.reduce((acc, t) => acc + (t.actualHours || 0), 0);

    const resourceDistribution = users.map((u) => {
      const myOpenTasks = openTasks.filter((t) => (t.assignedTo || []).some((a) => (a._id || a).toString() === u._id.toString()));
      const myEstimated = myOpenTasks.reduce((acc, t) => acc + (t.estimatedHours || 0), 0);
      const myConsumed = myOpenTasks.reduce((acc, t) => acc + (t.actualHours || 0), 0);
      return {
        userId: u._id,
        name: u.name,
        role: u.role,
        openTasks: myOpenTasks.length,
        estimatedHours: myEstimated,
        consumedHours: myConsumed,
      };
    });

    const occupiedResources = resourceDistribution.filter((r) => r.openTasks > 0).length;
    const occupancyRate = users.length ? Math.round((occupiedResources / users.length) * 100) : 0;

    const projectTaskStats = {};
    tasks.forEach((t) => {
      const projectId = (t.project?._id || t.project || '').toString();
      if (!projectId) return;
      if (!projectTaskStats[projectId]) projectTaskStats[projectId] = { total: 0, done: 0 };
      projectTaskStats[projectId].total += 1;
      if (t.status === 'done') projectTaskStats[projectId].done += 1;
    });

    const criticalProjects = activeProjects
      .map((p) => {
        const stats = projectTaskStats[p._id.toString()] || { total: 0, done: 0 };
        const progress = stats.total ? Math.round((stats.done / stats.total) * 100) : 0;
        return {
          _id: p._id,
          name: p.name,
          client: p.client?.name,
          manager: p.manager?.name,
          status: p.status,
          deadline: p.deadline,
          progress,
          isOverdue: p.deadline ? new Date(p.deadline) < now : false,
        };
      })
      .sort((a, b) => {
        if (a.isOverdue !== b.isOverdue) return a.isOverdue ? -1 : 1;
        return (a.progress || 0) - (b.progress || 0);
      })
      .slice(0, 12);

    const delayAlerts = [
      ...overdueProjects.map((p) => ({
        type: 'project',
        level: 'high',
        title: `Projet en retard: ${p.name}`,
        date: p.deadline || p.updatedAt,
      })),
      ...tasks
        .filter((t) => t.dueDate && new Date(t.dueDate) < now && t.status !== 'done')
        .map((t) => ({
          type: 'task',
          level: t.priority === 'high' ? 'high' : 'medium',
          title: `Tâche en retard: ${t.title}`,
          date: t.dueDate,
          project: t.project?.name,
        })),
    ]
      .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
      .slice(0, 20);

    const upcomingDeadlines = [
      ...activeProjects
        .filter((p) => p.deadline && new Date(p.deadline) >= now)
        .map((p) => ({ type: 'project', name: p.name, date: p.deadline, status: p.status })),
      ...tasks
        .filter((t) => t.dueDate && new Date(t.dueDate) >= now && t.status !== 'done')
        .map((t) => ({ type: 'task', name: t.title, date: t.dueDate, project: t.project?.name, status: t.status })),
    ]
      .sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0))
      .slice(0, 20);

    const recentActivity = [
      ...projects.slice(0, 20).map((p) => ({
        type: 'project',
        text: `Projet mis a jour: ${p.name}`,
        date: p.updatedAt || p.createdAt,
      })),
      ...tasks.slice(0, 30).map((t) => ({
        type: 'task',
        text: `Tâche mise a jour: ${t.title}`,
        date: t.updatedAt || t.createdAt,
        project: t.project?.name,
      })),
    ]
      .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
      .slice(0, 20);

    const projectsByStatus = activeStatuses.map((s) => ({
      _id: s,
      count: projects.filter((p) => p.status === s).length,
    }));

    const projectsOverview = projects.map((p) => {
      const stats = projectTaskStats[p._id.toString()] || { total: 0, done: 0 };
      const progress = stats.total ? Math.round((stats.done / stats.total) * 100) : 0;
      return {
        _id: p._id,
        name: p.name,
        client: p.client?.name,
        manager: p.manager?.name,
        status: p.status,
        deadline: p.deadline,
        progress,
        totalTasks: stats.total,
        doneTasks: stats.done,
        estimatedHours: tasks.filter((t) => (t.project?._id || t.project)?.toString() === p._id.toString()).reduce((s, t) => s + (t.estimatedHours || 0), 0),
        actualHours: tasks.filter((t) => (t.project?._id || t.project)?.toString() === p._id.toString()).reduce((s, t) => s + (t.actualHours || 0), 0),
      };
    });

    const timeReport = tasks.map((t) => ({
      projectId: t.project?._id || t.project,
      project: t.project?.name,
      task: t.title,
      assignedTo: (t.assignedTo || []).map((a) => a.name).join(', '),
      estimatedHours: t.estimatedHours || 0,
      actualHours: t.actualHours || 0,
    }));

    res.json({
      kpis: {
        totalActiveProjects: activeProjects.length,
        overdueProjects: overdueProjects.length,
        nearDeadlineProjects: nearDeadlineProjects.length,
        globalTeamLoad: openTasks.length,
        occupancyRate,
        estimatedHours,
        consumedHours,
      },
      projectsByStatus,
      criticalProjects,
      projectsOverview,
      timeReport,
      delayAlerts,
      resourceDistribution: resourceDistribution.sort((a, b) => b.openTasks - a.openTasks),
      upcomingDeadlines,
      recentActivity,
      notifications: delayAlerts.slice(0, 10),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Admin Dashboard Stats
const getAdminStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalProjects = await Project.countDocuments();
    const completedTasks = await Task.countDocuments({ status: 'completed' });
    const inProgressTasks = await Task.countDocuments({ status: 'in-progress' });

    const projectsByStatus = await Project.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    const tasksByStatus = await Task.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    const tasksByPriority = await Task.aggregate([
      { $group: { _id: '$priority', count: { $sum: 1 } } }
    ]);

    const projectsByManager = await Project.aggregate([
      { $group: { _id: '$manager', count: { $sum: 1 } } },
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'managerInfo' } },
      { $unwind: { path: '$managerInfo', preserveNullAndEmptyArrays: true } },
      { $project: { manager: '$managerInfo.name', count: 1, _id: 0 } }
    ]);

    const recentUsers = await User.find().sort({ createdAt: -1 }).limit(10).select('-password -refreshToken').lean();
    const activeProjects = await Project.find({ status: { $ne: 'completed' } }).populate('client', 'name').populate('manager', 'name').lean();

    res.json({
      totalUsers,
      totalProjects,
      completedTasks,
      inProgressTasks,
      projects: { byStatus: projectsByStatus, byManager: projectsByManager },
      tasks: { byStatus: tasksByStatus, byPriority: tasksByPriority },
      recentUsers,
      activeProjects
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Dashboard Chef de Projet : KPIs (projets actifs, en retard, % avancement global, tâches en retard,
// charge équipe, temps consommé vs estimé) + blocs (projets assignés, tâches urgentes, commentaires,
// prochaines échéances, alertes blocages)
const getManagerStats = async (req, res) => {
  try {
    const managerId = req.user._id;
    const myProjectIds = await Project.distinct('_id', { manager: managerId });
    const now = new Date();

    const myProjects = await Project.find({ manager: managerId }).select('name status startDate endDate deadline client').populate('client', 'name').lean();

    const activeStatuses = ['prospecting', 'quotation', 'inProgress', 'validation'];
    const activeProjectsCount = myProjects.filter((p) => activeStatuses.includes(p.status)).length;
    const overdueProjectsCount = myProjects.filter((p) => p.deadline && new Date(p.deadline) < now && activeStatuses.includes(p.status)).length;

    const teamIds = await Project.distinct('team', { manager: managerId });
    const teamMemberCount = teamIds.length;

    const progressAgg = await Task.aggregate([
      { $match: { project: { $in: myProjectIds } } },
      { $group: { _id: null, total: { $sum: 1 }, done: { $sum: { $cond: [{ $eq: ['$status', 'done'] }, 1, 0] } } } }
    ]);
    const totalTasks = progressAgg[0]?.total || 0;
    const doneTasks = progressAgg[0]?.done || 0;
    const globalProgressPercent = totalTasks ? Math.round((doneTasks / totalTasks) * 100) : 0;
    const completedTasksCount = doneTasks;
    const overdueTasksCount = await Task.countDocuments({
      project: { $in: myProjectIds },
      status: { $ne: 'done' },
      dueDate: { $lt: now },
    });

    const timeAgg = await Task.aggregate([
      { $match: { project: { $in: myProjectIds } } },
      { $group: { _id: null, estimated: { $sum: { $ifNull: ['$estimatedHours', 0] } }, consumed: { $sum: { $ifNull: ['$actualHours', 0] } } } }
    ]);
    const timeEstimated = timeAgg[0]?.estimated || 0;
    const timeConsumed = timeAgg[0]?.consumed || 0;

    const tasksByStatus = await Task.aggregate([
      { $match: { project: { $in: myProjectIds } } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    const tasksByMember = await Task.aggregate([
      { $match: { project: { $in: myProjectIds } } },
      { $unwind: { path: '$assignedTo', preserveNullAndEmptyArrays: true } },
      { $match: { assignedTo: { $ne: null } } },
      { $group: { _id: '$assignedTo', taskCount: { $sum: 1 } } },
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'memberInfo' } },
      { $unwind: { path: '$memberInfo', preserveNullAndEmptyArrays: true } },
      { $project: { member: '$memberInfo.name', taskCount: 1, _id: 0 } }
    ]);

    const progressByProject = await Task.aggregate([
      { $match: { project: { $in: myProjectIds } } },
      { $group: { _id: '$project', total: { $sum: 1 }, done: { $sum: { $cond: [{ $eq: ['$status', 'done'] }, 1, 0] } } } }
    ]);
    const progressMap = {};
    progressByProject.forEach((p) => {
      progressMap[p._id.toString()] = p.total ? Math.round((p.done / p.total) * 100) : 0;
    });
    const taskCountByProject = await Task.aggregate([
      { $match: { project: { $in: myProjectIds } } },
      { $group: { _id: '$project', count: { $sum: 1 } } }
    ]);
    const taskCountMap = {};
    taskCountByProject.forEach((p) => { taskCountMap[p._id.toString()] = p.count; });
    myProjects.forEach((p) => {
      p.progressPercentage = progressMap[p._id.toString()] ?? 0;
      p.taskCount = taskCountMap[p._id.toString()] ?? 0;
    });

    const projectTimeline = myProjects.slice(0, 7).map((p) => ({
      date: p.startDate ? new Date(p.startDate).toLocaleDateString('fr-FR', { month: 'short', day: 'numeric' }) : '-',
      completed: p.status === 'completed' || p.status === 'archived' ? 1 : 0,
      inProgress: p.status === 'inProgress' ? 1 : 0,
      pending: activeStatuses.includes(p.status) && p.status !== 'inProgress' ? 1 : 0
    }));

    const urgentTasks = await Task.find({
      project: { $in: myProjectIds },
      priority: 'high',
      status: { $ne: 'done' }
    })
      .populate('project', 'name')
      .populate('assignedTo', 'name')
      .sort({ dueDate: 1 })
      .limit(20)
      .lean();

    const fiveDaysAgo = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);
    const blockedTaskAlerts = await Task.find({
      project: { $in: myProjectIds },
      status: { $in: ['todo', 'review', 'inProgress'] },
      $or: [
        { dueDate: { $lt: now } },
        { status: 'review', updatedAt: { $lt: fiveDaysAgo } },
      ],
    })
      .select('title status priority dueDate updatedAt')
      .populate('project', 'name')
      .populate('assignedTo', 'name')
      .sort({ dueDate: 1, updatedAt: 1 })
      .limit(20)
      .lean();

    const blockedAlerts = blockedTaskAlerts.map((t) => ({
      type: 'task',
      level: t.priority === 'high' ? 'high' : 'medium',
      title: t.title,
      project: t.project?.name,
      status: t.status,
      dueDate: t.dueDate,
      updatedAt: t.updatedAt,
      assignedTo: (t.assignedTo || []).map((a) => a.name).filter(Boolean),
    }));

    const tasksWithComments = await Task.find(
      { project: { $in: myProjectIds }, 'comments.0': { $exists: true } },
      { title: 1, comments: { $slice: -5 } }
    )
      .populate('comments.user', 'name')
      .populate('project', 'name')
      .lean();
    const recentComments = tasksWithComments
      .flatMap((t) => (t.comments || []).map((c) => ({
        taskTitle: t.title,
        projectName: t.project?.name,
        author: c.user?.name,
        text: c.text,
        createdAt: c.createdAt
      })))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 15);

    const in14Days = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
    const upcomingDeadlines = await Task.find({
      project: { $in: myProjectIds },
      status: { $ne: 'done' },
      dueDate: { $gte: now, $lte: in14Days }
    })
      .select('title dueDate priority status')
      .populate('project', 'name')
      .populate('assignedTo', 'name')
      .sort({ dueDate: 1 })
      .limit(15)
      .lean();

    res.json({
      myProjectCount: myProjects.length,
      activeProjectsCount,
      overdueProjectsCount,
      globalProgressPercent,
      overdueTasksCount,
      teamMemberCount,
      completedTasksCount,
      timeEstimated,
      timeConsumed,
      projectTimeline,
      tasksByStatus,
      tasksByMember,
      myProjects,
      urgentTasks,
      recentComments,
      upcomingDeadlines,
      blockedAlerts,
      notifications: blockedAlerts.slice(0, 10),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Membre d'équipe : mes tâches en cours, en retard, projets assignés, temps travaillé
const getTeamMemberStats = async (req, res) => {
  try {
    const userId = req.user._id;
    const mongoose = require('mongoose');
    const [teamProjectIds, taskProjectIds] = await Promise.all([
      Project.find({ team: userId }).distinct('_id'),
      Task.find({ assignedTo: userId }).distinct('project'),
    ]);
    const idSet = new Set();
    (teamProjectIds || []).forEach((id) => id && idSet.add(id.toString()));
    (taskProjectIds || []).forEach((id) => id && id.toString().length === 24 && idSet.add(id.toString()));
    const memberProjectIds = Array.from(idSet)
      .filter((id) => id && id.length === 24)
      .map((id) => new mongoose.Types.ObjectId(id));

    const projectFilter = memberProjectIds.length ? { project: { $in: memberProjectIds } } : { _id: { $exists: false } };

    const now = new Date();
    const myTasksInProgress = await Task.find({
      assignedTo: userId,
      status: { $ne: 'done' },
      ...projectFilter,
    })
      .populate('project', 'name')
      .sort({ dueDate: 1 })
      .limit(20)
      .lean();

    const overdueTasks = await Task.find({
      assignedTo: userId,
      status: { $ne: 'done' },
      dueDate: { $lt: now },
      ...projectFilter,
    })
      .populate('project', 'name')
      .sort({ dueDate: 1 })
      .lean();

    const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const upcomingDeadlines = await Task.find({
      assignedTo: userId,
      status: { $ne: 'done' },
      dueDate: { $gte: now, $lte: in7Days },
      ...projectFilter,
    })
      .populate('project', 'name')
      .sort({ dueDate: 1 })
      .limit(15)
      .lean();

    const assignedProjects = memberProjectIds.length
      ? await Project.find({ _id: { $in: memberProjectIds } })
          .populate('client', 'name')
          .populate('manager', 'name')
          .select('name status startDate endDate deadline')
          .lean()
      : [];

    const timeWorkedAgg = await Task.aggregate([
      { $match: { assignedTo: userId } },
      { $group: { _id: null, total: { $sum: { $ifNull: ['$actualHours', 0] } } } },
    ]);
    const timeWorked = timeWorkedAgg[0]?.total || 0;

    const timeHistory = await Task.find({
      assignedTo: userId,
      ...projectFilter,
      actualHours: { $gt: 0 },
    })
      .select('title actualHours updatedAt status project')
      .populate('project', 'name')
      .sort({ updatedAt: -1 })
      .limit(20)
      .lean();

    const collaborationFeed = await Task.find(
      { ...projectFilter, 'comments.0': { $exists: true } },
      { title: 1, comments: { $slice: -3 }, project: 1 }
    )
      .populate('project', 'name')
      .populate('comments.user', 'name')
      .sort({ updatedAt: -1 })
      .limit(20)
      .lean();
    const recentComments = collaborationFeed
      .flatMap((t) =>
        (t.comments || []).map((c) => ({
          taskTitle: t.title,
          projectName: t.project?.name,
          text: c.text,
          author: c.user?.name,
          createdAt: c.createdAt,
        }))
      )
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
      .slice(0, 12);

    const notifications = [
      ...overdueTasks.slice(0, 8).map((t) => ({
        type: 'overdue',
        text: `Tâche en retard: ${t.title}`,
        project: t.project?.name,
        dueDate: t.dueDate,
      })),
      ...upcomingDeadlines.slice(0, 8).map((t) => ({
        type: 'deadline',
        text: `Deadline proche: ${t.title}`,
        project: t.project?.name,
        dueDate: t.dueDate,
      })),
    ].slice(0, 12);

    res.json({
      myTasksInProgress,
      overdueTasks,
      upcomingDeadlines,
      assignedProjects,
      timeWorked,
      timeHistory,
      recentComments,
      notifications,
    });
  } catch (error) {
    console.error('getTeamMemberStats:', error);
    res.status(500).json({ message: error.message || 'Erreur serveur' });
  }
};

// Client Dashboard Stats (portail client : projets en cours, livrables récents, factures en attente, notifications)
const getClientStats = async (req, res) => {
  try {
    const clientId = req.user.role === 'client' ? req.user.client : req.user._id;
    if (!clientId) {
      return res.status(403).json({ message: 'Accès client non associé à une fiche client' });
    }

    const projectCount = await Project.countDocuments({ client: clientId });
    const invoiceCount = await Invoice.countDocuments({ client: clientId });
    const totalAmount = (await Invoice.aggregate([
      { $match: { client: clientId } },
      { $group: { _id: null, total: { $sum: '$totalTTC' } } }
    ]))[0]?.total || 0;
    const paidAmount = (await Invoice.aggregate([
      { $match: { client: clientId, status: 'paid' } },
      { $group: { _id: null, total: { $sum: '$totalTTC' } } }
    ]))[0]?.total || 0;

    const projectsByStatus = await Project.aggregate([
      { $match: { client: clientId } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    const invoicesByStatus = await Invoice.aggregate([
      { $match: { client: clientId } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    const projects = await Project.find({ client: clientId }).select('name status startDate endDate deadline manager attachments').populate('manager', 'name').lean();
    const projectIds = projects.map((p) => p._id);
    const progressAgg = await Task.aggregate([
      { $match: { project: { $in: projectIds } } },
      { $group: { _id: '$project', total: { $sum: 1 }, done: { $sum: { $cond: [{ $eq: ['$status', 'done'] }, 1, 0] } } } }
    ]);
    const progressByProject = {};
    progressAgg.forEach((p) => {
      progressByProject[p._id.toString()] = p.total ? Math.round((p.done / p.total) * 100) : 0;
    });
    projects.forEach((p) => {
      p.progressPercentage = progressByProject[p._id.toString()] ?? 0;
    });

    const invoices = await Invoice.find({ client: clientId }).select('number date dueDate totalTTC status project').populate('project', 'name').lean();
    const quotes = await Quote.find({ client: clientId }).select('number date validUntil totalTTC status project').populate('project', 'name').lean();

    const pendingInvoices = invoices.filter((i) => i.status !== 'paid' && i.status !== 'cancelled');
    const recentDeliverables = projects
      .filter((p) => p.attachments && p.attachments.length > 0)
      .flatMap((p) => (p.attachments || []).map((a) => ({ ...a, projectName: p.name, projectId: p._id })))
      .sort((a, b) => new Date(b.uploadedAt || 0) - new Date(a.uploadedAt || 0))
      .slice(0, 10);

    res.json({
      projectCount,
      invoiceCount,
      totalAmount,
      paidAmount,
      projectsByStatus,
      invoicesByStatus,
      projects,
      invoices,
      quotes,
      pendingInvoices,
      recentDeliverables,
      notifications: [],
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getDashboardStats, getExecutiveDashboard, getDirectorDashboard, getCoordinatorDashboard, getAdminStats, getManagerStats, getTeamMemberStats, getClientStats };