import mongoose from 'mongoose';
const reportSchema = new mongoose.Schema({
  description: { type: String, required: true, trim: true, minlength: 10, maxlength: 2000 },
  latitude: { type: Number, required: true, min: -90, max: 90 },
  longitude: { type: Number, required: true, min: -180, max: 180 },
  status: { type: String, enum: ['submitted'], default: 'submitted', immutable: true },
  locationEvidence: { type: String, enum: ['unverified'], default: 'unverified', immutable: true },
}, { timestamps: true, bufferCommands: false, versionKey: false });
reportSchema.index({ createdAt: -1, _id: -1 });
export const Report = mongoose.model('Report', reportSchema);
