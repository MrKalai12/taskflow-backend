const express = require('express');
const router = express.Router();
const { isTeamAdmin } = require('../middleware/authorization');
const authMiddleware = require('../middleware/authMiddleware');

const { createTeam, addMember, removeMember, getMyTeams } = require('../controllers/teamController');

router.post('/teams', authMiddleware, createTeam);
router.post('/teams/:teamId/members', authMiddleware, isTeamAdmin, addMember);
router.delete('/teams/:teamId/members', authMiddleware, isTeamAdmin, removeMember);
router.get('/teams', authMiddleware, getMyTeams);

module.exports = router;