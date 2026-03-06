const mongoose = require("mongoose");
const Task = require("../models/Task");
const User = require("../models/User");
const Team = require("../models/Team");
const {
  createTaskSchema,
  updateTaskDetailsSchema,
  updateTaskStatusSchema,
  getTeamTaskSchema,
} = require("../validators/taskValidator");
const createTask = async (req, res) => {
  try {
    const teamId = req.params.id;
    const result = createTaskSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        message: result.error.errors[0].message,
      });
    }
    const { title, description, status, priority, assignedTo } = result.data;

    // Validate IDs
    if (!mongoose.Types.ObjectId.isValid(teamId)) {
      return res.status(400).json({ message: "Invalid team ID" });
    }
    if (!mongoose.Types.ObjectId.isValid(assignedTo)) {
      return res.status(400).json({ message: "Invalid assigned user ID" });
    }

    // Check assigned user exists
    const assignedUser = await User.findById(assignedTo);
    if (!assignedUser) {
      return res.status(404).json({ message: "Assigned user does not exist" });
    }

    // Fetch team once
    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({ message: "Team not found" });
    }

    // Check if assigned user belongs to the team (member OR admin)
    const assignedUserIdStr = assignedUser._id.toString();
    const isAssignedUserInTeam =
      team.members.map(String).includes(assignedUserIdStr) ||
      team.admin.toString() === assignedUserIdStr;

    if (!isAssignedUserInTeam) {
      return res
        .status(403)
        .json({ message: "Assigned user does not belong to this team" });
    }

    // Create task
    const task = await Task.create({
      title: title.trim(),
      description: description.trim(),
      team: teamId,
      createdBy: req.user.userId,
      assignedTo: assignedUser._id,
      status,
      priority,
    });

    return res.status(201).json({
      message: "Task created successfully",
      task: {
        id: task._id,
        title: task.title,
        description: task.description,
        team: task.team,
        createdBy: task.createdBy,
        assignedTo: task.assignedTo,
        status: task.status,
        priority: task.priority,
        createdAt: task.createdAt,
      },
    });
  } catch (error) {
    console.error(error);
    if (error.name === "ValidationError") {
      return res.status(400).json({
        message: Object.values(error.errors)[0].message,
      });
    }
    return res.status(500).json({ message: "Server error" });
  }
};

const updateTaskStatus = async (req, res) => {
  try {
    const result = updateTaskStatusSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        message: result.error.errors[0].message,
      });
    }

    const { status } = result.data;

    if (req.task.status === status) {
      return res.status(200).json({ message: "Status already updated" });
    }

    req.task.status = status;
    await req.task.save();
    return res.status(200).json({
      message: "Task status updated succesfully",
      task: {
        status: req.task.status,
      },
    });
  } catch (error) {
    console.error(error);
    if (error.name === "ValidationError") {
      return res.status(400).json({
        message: Object.values(error.errors)[0].message,
      });
    }
    return res.status(500).json({ message: "Server error" });
  }
};

const updateTaskDetails = async (req, res) => {
  try {
    const result = updateTaskDetailsSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        message: result.error.errors[0].message,
      });
    }
    const { title, description, priority, dueDate, assignedTo } = result.data;
    let updated = false;

    if (title && title != req.task.title) {
      req.task.title = title.trim();
      updated = true;
    }
    if (description && description != req.task.description) {
      req.task.description = description.trim();
      updated = true;
    }

    if (priority && priority != req.task.priority) {
      req.task.priority = priority;
      updated = true;
    }

    if (dueDate) {
      const newDate = new Date(dueDate);

      if (
        !req.task.dueDate ||
        newDate.getTime() !== req.task.dueDate.getTime()
      ) {
        req.task.dueDate = newDate;
        updated = true;
      }
    }

    if (assignedTo) {
      if (!mongoose.Types.ObjectId.isValid(assignedTo)) {
        return res.status(400).json({ message: "Invalid assigned user ID" });
      }

      if (assignedTo !== req.task.assignedTo.toString()) {
        // Check user exists
        const userExists = await User.exists({ _id: assignedTo });
        if (!userExists) {
          return res.status(404).json({
            message: "Assigned user does not exist",
          });
        }

        // Check user belongs to same team (member OR admin)
        const isMember = await Team.exists({
          _id: req.task.team,
          $or: [{ members: assignedTo }, { admin: assignedTo }],
        });

        if (!isMember) {
          return res.status(403).json({
            message: "Assigned user does not belong to this team",
          });
        }

        req.task.assignedTo = assignedTo;
        updated = true;
      }
    }

    if (!updated) {
      return res.status(200).json({
        message: "No changes detected",
      });
    }
    await req.task.save();
    return res.status(200).json({
      message: "Task updated succesfully",
      task: {
        id: req.task._id,
        title: req.task.title,
        description: req.task.description,
        priority: req.task.priority,
        dueDate: req.task.dueDate,
        assignedTo: req.task.assignedTo,
        updatedAt: req.task.updatedAt,
      },
    });
  } catch (error) {
    console.error(error);
    if (error.name === "ValidationError") {
      return res.status(400).json({
        message: Object.values(error.errors)[0].message,
      });
    }
    return res.status(500).json({ message: "Server error" });
  }
};

const getTeamTask = async (req, res) => {
  try {
    const result = getTeamTaskSchema.safeParse(req.query);
    if (!result.success) {
      return res.status(400).json({
        message: result.error.errors[0].message,
      });
    }
    const {
      status,
      priority,
      assignedTo,
      dueAfter,
      dueBefore,
      page: pageStr,
      limit: limitStr,
    } = result.data;
    const teamId = req.params.teamId;
    if (!mongoose.Types.ObjectId.isValid(teamId)) {
      return res.status(400).json({ message: "Invalid team ID" });
    }

    const filter = { team: teamId };
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (assignedTo) filter.assignedTo = assignedTo;

    if (dueAfter || dueBefore) {
      filter.dueDate = {};
      if (dueAfter) filter.dueDate.$gte = new Date(dueAfter);
      if (dueBefore) filter.dueDate.$lte = new Date(dueBefore);
    }

    const page = parseInt(pageStr) || 1;
    const limit = parseInt(limitStr) || 30;
    const skip = (page - 1) * limit;

    const [tasks, totalTasks] = await Promise.all([
      Task.find(filter).skip(skip).limit(limit),
      Task.countDocuments(filter),
    ]);
    const totalPages = Math.ceil(totalTasks / limit);

    return res.status(200).json({
      message:
        tasks.length === 0 ? "No tasks found" : "Tasks fetched successfully",
      data: tasks,
      pagination: {
        currentPage: page,
        totalPages: totalPages,
        totalTasks: totalTasks,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    });
  } catch (error) {
    console.error(error);
    if (error.name === "ValidationError") {
      return res.status(400).json({
        message: Object.values(error.errors)[0].message,
      });
    }
    return res.status(500).json({ message: "Server error" });
  }
};

const getTask = async (req, res) => {
  try {
    await req.task.populate([
      { path: "assignedTo", select: "userName email" },
      { path: "createdBy", select: "userName email" },
    ]);
    return res.status(200).json({
      message: "Task fetched successfully",
      task: {
        _id: req.task._id,
        title: req.task.title,
        description: req.task.description,
        status: req.task.status,
        priority: req.task.priority,
        dueDate: req.task.dueDate,
        assignedTo: req.task.assignedTo,
        createdBy: req.task.createdBy,
        createdAt: req.task.createdAt,
        updatedAt: req.task.updatedAt,
      },
    });
  } catch (error) {
    console.error(error);
    if (error.name === "ValidationError") {
      return res.status(400).json({
        message: Object.values(error.errors)[0].message,
      });
    }
    return res.status(500).json({ message: "Server error" });
  }
};

const deleteTask = async (req, res) => {
  try {
    await req.task.deleteOne();
    return res.status(200).json({
      message: "Deleted successfully",
      taskId: req.task._id,
    });
  } catch (error) {
    console.error(error);
    if (error.name === "ValidationError") {
      return res.status(400).json({
        message: Object.values(error.errors)[0].message,
      });
    }
    return res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  createTask,
  updateTaskStatus,
  updateTaskDetails,
  getTeamTask,
  getTask,
  deleteTask,
};


