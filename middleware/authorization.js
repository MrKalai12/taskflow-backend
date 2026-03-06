const Team = require("../models/Team");

/**
 * Extract teamId from request safely
 * Supports params, body, or preloaded resource
 */
const getTeamIdFromRequest = (req) => {
  if (req.team) return req.team._id;
  if (req.task) return req.task.team;
  if (req.params.teamId) return req.params.teamId;
  if (req.body.team) return req.body.team;
  return null;
};

/**
 * Check if user is a member of the team
 */
const isTeamMember = async (req, res, next) => {
  try {
    const teamId = getTeamIdFromRequest(req);
    if (!teamId) {
      return res.status(400).json({ message: "Team context missing" });
    }

    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({ message: "Team not found" });
    }

    const userId = req.user.userId;

    const isMember =
      team.members.map(String).includes(userId) ||
      team.admin.toString() === userId;

    if (!isMember) {
      return res.status(403).json({ message: "Forbidden" });
    }

    next();
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server Error" });
  }
};

/**
 * Check if user is admin of the team
 */
const isTeamAdmin = async (req, res, next) => {
  try {
    const teamId = getTeamIdFromRequest(req);
    if (!teamId) {
      return res.status(400).json({ message: "Team context missing" });
    }

    const isAdmin = await Team.exists({
      _id: teamId,
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
  isTeamMember,
  isTeamAdmin
};
























