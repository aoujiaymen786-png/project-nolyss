const Task = require('../models/Task');

const uploadTaskAttachment = async (req, res) => {
  try {
    const task = await Task.findById(req.params.taskId);
    if (!task) {
      return res.status(404).json({ message: 'Tâche non trouvée' });
    }
    const file = req.file;
    task.attachments.push({
      name: file.originalname,
      url: file.path,
      uploadedBy: req.user._id,
    });
    await task.save();
    res.json(task);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { uploadTaskAttachment };