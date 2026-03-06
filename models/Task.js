const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      trim: true,
      required: [true, "Task title is required"],
      minlength: [1, "Task title cannot be empty"],
    },

    description: {
      type: String,
      trim: true,
      required: [true, "Task description is required"],
      minlength: [1, "Task description cannot be empty"],
    },

    team: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Team",
      required: [true, "Team is required"],
      index: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    status: {
      type: String,
      enum: {
        values: ["todo", "in-progress", "done"],
        message: "Status must be todo, in-progress, or done",
      },
      default: "todo",
      index: true,
    },

    priority: {
      type: String,
      enum: {
        values: ["low", "medium", "high"],
        message: "Priority must be low, medium, or high",
      },
      default: "medium",
    },
  },
  { timestamps: true }
);
// First — define the index ON the schema
taskSchema.index({ priority: 1});
taskSchema.index({ dueDate: 1 });

// Then — export the model using the schema
module.exports = mongoose.model("Task", taskSchema);