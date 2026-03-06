const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
    {
        userName:{
            type: String,
            trim: true,
            required: true,
        },
        email:{
            type: String,
            required: true,
            unique: true,
            trim: true,
            lowercase: true,
            index: true,
        },
        password:{
            type: String,
            required: true,
            minlength: 4,
            select: false,
        },
        role:{
            type: String,
            enum: ['user', 'admin'],
            default: 'user',
        },
        createdAt:{
            type: Date,
            default: Date.now,
        },
        isBlocked:{
            type: Boolean,
            default: false,
            index: true,
        },
    },
    {
        timestamps: true,
            
    }
);

module.exports = mongoose.model('User', userSchema);