const Task = require("../models/Task");
const Team = require("../models/Team");

/**
 * Validate task existence and attach to req
 */
const validateTaskExists = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.taskId)) {
  return res.status(400).json({ message: "Invalid task ID format" });
}
    const task = await Task.findById(req.params.taskId);
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    req.task = task;
    next();
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server Error" });
  }
};

/**
 * Only assigned user can update task status
 */
const isTaskAssignee = (req, res, next) => {
  if (req.task.assignedTo.toString() !== req.user.userId) {
    return res.status(403).json({ message: "Forbidden" });
  }
  next();
};

/**
 * Task creator OR team admin can modify/delete task
 */
const isTaskCreatorOrAdmin = async (req, res, next) => {
  try {
    if (req.task.createdBy.toString() === req.user.userId) {
      return next();
    }

    const isAdmin = await Team.exists({
      _id: req.task.team,
      admin: req.user.userId,
    });

    if (!isAdmin) {
      return res.status(403).json({ message: "Forbidden" });
    }

    next();
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server Error" });
  }
};

module.exports = {
  validateTaskExists,
  isTaskAssignee,
  isTaskCreatorOrAdmin,
};























