const Claim = require('../models/Claim');

/** Liste des réclamations : pour admin toutes, pour director/coordinator celles qui leur sont assignées */
const getClaims = async (req, res) => {
  try {
    const query = {};
    if (req.user.role === 'admin') {
      // admin voit tout
    } else if (['director', 'coordinator'].includes(req.user.role)) {
      query.assignedTo = req.user._id;
    } else {
      return res.status(403).json({ message: 'Accès non autorisé aux réclamations.' });
    }
    const claims = await Claim.find(query)
      .sort({ createdAt: -1 })
      .populate('client', 'name email')
      .populate('assignedTo', 'name')
      .populate('project', 'name')
      .populate('invoice', 'number')
      .lean();
    res.json(claims);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getClaimById = async (req, res) => {
  try {
    const claim = await Claim.findById(req.params.id)
      .populate('client', 'name email')
      .populate('assignedTo', 'name email')
      .populate('project', 'name')
      .populate('invoice', 'number totalTTC')
      .lean();
    if (!claim) return res.status(404).json({ message: 'Réclamation non trouvée.' });
    if (req.user.role !== 'admin' && claim.assignedTo?._id?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Cette réclamation ne vous est pas assignée.' });
    }
    res.json(claim);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateClaim = async (req, res) => {
  try {
    const claim = await Claim.findById(req.params.id);
    if (!claim) return res.status(404).json({ message: 'Réclamation non trouvée.' });
    if (req.user.role !== 'admin' && claim.assignedTo.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Cette réclamation ne vous est pas assignée.' });
    }
    const { status, response } = req.body;
    if (status !== undefined) {
      if (!['open', 'in_progress', 'resolved'].includes(status)) {
        return res.status(400).json({ message: 'Statut invalide.' });
      }
      claim.status = status;
    }
    if (response !== undefined) {
      claim.response = response;
      claim.respondedAt = new Date();
      claim.respondedBy = req.user._id;
    }
    await claim.save();
    const populated = await Claim.findById(claim._id)
      .populate('client', 'name email')
      .populate('assignedTo', 'name')
      .populate('project', 'name')
      .populate('invoice', 'number')
      .lean();
    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getClaims,
  getClaimById,
  updateClaim,
};
