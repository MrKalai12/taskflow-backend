const { z } = require('zod');

const createTaskSchema = z.object({
  title: z.string().min(2,"title must be at least 2 characters"),
  description: z.string().min(2,"description must be at least 2 characters"),
  assignedTo: z.string().min(1, "Assigned user ID is required"),
  status: z.enum(["todo", "in-progress", "done"]).optional(),
  priority: z.enum(["low", "medium", "high"]).optional(),
  dueDate: z.string().optional()
});

const updateTaskStatusSchema = z.object({
    status: z.enum(["todo", "in-progress", "done"])
});

const  updateTaskDetailsSchema = z.object({
    title: z.string().optional(),
    description: z.string().optional(),
    priority: z.enum(["low", "medium", "high"]).optional(),
    dueDate: z.string().optional(),
    assignedTo: z.string().optional()
});

const getTeamTaskSchema = z.object({
  status:     z.enum(["todo", "in-progress", "done"]).optional(),
  priority:   z.enum(["low", "medium", "high"]).optional(),
  assignedTo: z.string().optional(),
  dueAfter:   z.string().optional(),
  dueBefore:  z.string().optional(),
  page:       z.string().optional(),
  limit:      z.string().optional(),
});


module.exports = {createTaskSchema, updateTaskStatusSchema, updateTaskDetailsSchema, getTeamTaskSchema};
