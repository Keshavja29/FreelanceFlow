import mongoose from 'mongoose';

const clientSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name: { type: String, required: true },
  email: { type: String, default: '' },
  phone: { type: String, default: '' },
  company: { type: String, default: '' },
  defaultHourlyRate: { type: Number, default: 50 },
  notes: { type: String, default: '' }
}, { timestamps: true });

clientSchema.index({ userId: 1, name: 1 });

const Client = mongoose.model('Client', clientSchema);
export default Client;
