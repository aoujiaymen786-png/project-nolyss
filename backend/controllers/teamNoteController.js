const TeamMemberNote = require('../models/TeamMemberNote');
const Project = require('../models/Project');

// POST /api/team-notes - Créer une note (membre d'équipe uniquement)
const createNote = async (req, res) => {
  try {
    if (req.user.role !== 'teamMember' && req.user.role !== 'projectManager') {
      return res.status(403).json({ message: 'Seuls les membres d\'équipe peuvent créer des notes pour le chef.' });
    }
    const { content, projectId } = req.body;
    if (!content || !content.trim()) {
      return res.status(400).json({ message: 'Le contenu est requis.' });
    }

    const note = await TeamMemberNote.create({
      author: req.user._id,
      content: content.trim(),
      project: projectId || undefined,
    });
    const populated = await TeamMemberNote.findById(note._id).populate('author', 'name').populate('project', 'name').lean();
    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/team-notes - Lister les notes
// Membre d'équipe : ses propres notes
// Chef de projet : notes des membres de son équipe
const getNotes = async (req, res) => {
  try {
    const userId = req.user._id;
    const role = req.user.role;
    let query;

    if (role === 'teamMember') {
      query = { author: userId };
    } else if (role === 'projectManager') {
      const teamIds = await Project.distinct('team', { manager: userId });
      if (teamIds.length === 0) {
        return res.json([]);
      }
      query = { author: { $in: teamIds } };
    } else {
      return res.json([]);
    }

    const notes = await TeamMemberNote.find(query)
      .populate('author', 'name')
      .populate('project', 'name')
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    res.json(notes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { createNote, getNotes };
