const { PERMISSIONS } = require('../config/roles');

const authorize = (permission) => {
  return (req, res, next) => {
    const userRole = req.user.role;
    if (PERMISSIONS[permission] && PERMISSIONS[permission].includes(userRole)) {
      next();
    } else {
      res.status(403).json({ message: 'Accès interdit : permissions insuffisantes' });
    }
  };
};

module.exports = { authorize };