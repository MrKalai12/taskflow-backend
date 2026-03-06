const express = require('express');
const router = express.Router();
const {  isTeamMember } = require('../middleware/authorization');
const { validateTaskExists, isTaskAssignee, isTaskCreatorOrAdmin} = require('../middleware/taskMiddleware');
const authMiddleware = require('../middleware/authMiddleware');

const { getTeamTask, getTask, updateTaskStatus, updateTaskDetails, deleteTask, createTask } = require('../controllers/taskController');

router.get('/teams/:teamId/tasks', authMiddleware, isTeamMember, getTeamTask);
router.get('/tasks/:taskId', authMiddleware, validateTaskExists, isTeamMember , getTask);
router.patch('/tasks/:taskId/status', authMiddleware, validateTaskExists, isTaskAssignee, updateTaskStatus);
router.patch('/tasks/:taskId', authMiddleware, validateTaskExists, isTaskCreatorOrAdmin, updateTaskDetails);
router.delete('/tasks/:taskId', authMiddleware, validateTaskExists, isTaskCreatorOrAdmin, deleteTask);
router.post('/teams/:teamId/tasks', authMiddleware, isTeamMember, createTask);

module.exports = router;