import mongoose from 'mongoose';
export const roles = ['citizen', 'officer', 'crew', 'relief', 'admin'];
const schema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true, select: false },
  role: { type: String, enum: roles, default: 'citizen', required: true },
  demo: { type: Boolean, default: false },
}, { timestamps: true, bufferCommands: false });
export const User = mongoose.model('User', schema);
