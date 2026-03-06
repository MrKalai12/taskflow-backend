const mongoose = require('mongoose');

const teamSchema = new mongoose.Schema(
    {
        name:{
            type: String,
            trim: true,
            required: true,
        },

        admin: {
            type:mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        members: [
            {
                type:mongoose.Schema.Types.ObjectId,
                ref:"User", 
            }
        ],

        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        }
    },
    { timestamps: true}
);
// First — define the index ON the schema
teamSchema.index({ admin: 1});
teamSchema.index({ members: 1 });

// Then — export the model using the schema
module.exports = mongoose.model("Team", teamSchema);