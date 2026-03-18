import mongoose from 'mongoose';

const projectSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
  name: { type: String, required: true },
  description: { type: String, default: '' },
  status: { type: String, enum: ['Active', 'Completed', 'On Hold'], default: 'Active' },
  budget: { type: Number, default: 0 },
  startDate: { type: Date, default: Date.now },
  deadline: { type: Date }
}, { timestamps: true });

projectSchema.index({ userId: 1, clientId: 1 });
projectSchema.index({ userId: 1, status: 1 });

const Project = mongoose.model('Project', projectSchema);
export default Project;
