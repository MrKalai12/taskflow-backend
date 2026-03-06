const { z } = require('zod');

const createTeamSchema = z.object({
    name: z.string().min(3, "name must be at least 3 characters")
});

const MemberSchema = z.object({
    userId: z.string()
});

module.exports = { createTeamSchema, MemberSchema};