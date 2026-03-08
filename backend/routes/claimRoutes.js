const express = require('express');
const { getClaims, getClaimById, updateClaim } = require('../controllers/claimController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

router.get('/', getClaims);
router.get('/:id', getClaimById);
router.patch('/:id', updateClaim);

module.exports = router;
