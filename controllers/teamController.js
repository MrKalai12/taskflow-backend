const Team = require("../models/Team");
const {
  createTeamSchema,
  MemberSchema,
} = require("../validators/teamValidator");
const createTeam = async (req, res) => {
  try {
    const result = createTeamSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        message: result.error.errors[0].message,
      });
    }
    const { name } = result.data;
    const userId = req.user.userId;

    const team = await Team.create({
      name: name.trim(),
      createdBy: userId,
      admin: userId,
      members: [userId],
    });

    return res.status(201).json({
      message: "Team created successfully",
      team: {
        id: team._id,
        name: team.name,
        admin: team.admin,
        members: team.members,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server Error" });
  }
};

const addMember = async (req, res) => {
  try {
    const result = MemberSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        message: result.error.errors[0].message,
      });
    }
    const { userId } = result.data;
    const teamId = req.params.teamId;

    const team = await Team.findById(teamId);

    if (!team) {
      return res.status(404).json({ message: "Team not found" });
    }

    const alreadyMember = team.members.some(
      (memberId) => memberId.toString() === userId,
    );

    if (alreadyMember) {
      return res.status(400).json({ message: "User already in team" });
    }

    team.members.push(userId);
    await team.save();

    return res.status(201).json({
      message: "User added to the team successfully",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server Error" });
  }
};

const removeMember = async (req, res) => {
  try {
    const result = MemberSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        message: result.error.errors[0].message,
      });
    }
    const { userId } = result.data;
    const teamId = req.params.teamId;

    const team = await Team.findById(teamId);

    if (!team) {
      return res.status(404).json({ message: "Team not found" });
    }

    if (team.admin.toString() === userId) {
      return res.status(400).json({
        message: "Admin cannot be removed from the team",
      });
    }

    const isMember = team.members.some(
      (memberId) => memberId.toString() === userId,
    );

    if (!isMember) {
      return res.status(400).json({
        message: "User is not a member of the team",
      });
    }

    team.members = team.members.filter(
      (memberId) => memberId.toString() !== userId,
    );

    await team.save();

    return res.status(200).json({
      message: "User removed from the team successfully",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server Error" });
  }
};

const getMyTeams = async (req, res) => {
  try {
    const userId = req.user.userId;

    const teams = await Team.find({
      $or: [{ admin: userId }, { members: userId }],
    });

    return res.status(200).json({
      message: "Teams fetched successfully",
      teams: teams.map((team) => ({
        id: team._id,
        name: team.name,
        admin: team.admin,
        members: team.members,
      })),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server Error" });
  }
};

module.exports = {
  createTeam,
  addMember,
  removeMember,
  getMyTeams,
};
