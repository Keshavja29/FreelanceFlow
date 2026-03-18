import mongoose from 'mongoose';

const timeLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  taskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', default: null },
  startTime: { type: Date, required: true },
  endTime: { type: Date },
  duration: { type: Number, default: 0 },
  description: { type: String, default: '' },
  billed: { type: Boolean, default: false },
  invoiceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice', default: null },
  hourlyRate: { type: Number, default: 0 }
}, { timestamps: true });

timeLogSchema.index({ userId: 1, projectId: 1 });
timeLogSchema.index({ userId: 1, billed: 1 });
timeLogSchema.index({ userId: 1, startTime: 1 });

const TimeLog = mongoose.model('TimeLog', timeLogSchema);
export default TimeLog;
