import mongoose from 'mongoose';

const lineItemSchema = new mongoose.Schema({
  description: { type: String, required: true },
  hours: { type: Number, required: true },
  rate: { type: Number, required: true },
  amount: { type: Number, required: true }
}, { _id: false });

const invoiceSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
  invoiceNumber: { type: String, required: true },
  dateFrom: { type: Date, required: true },
  dateTo: { type: Date, required: true },
  lineItems: [lineItemSchema],
  subtotal: { type: Number, default: 0 },
  taxRate: { type: Number, default: 0 },
  taxAmount: { type: Number, default: 0 },
  total: { type: Number, default: 0 },
  status: { type: String, enum: ['Draft', 'Sent', 'Paid', 'Overdue'], default: 'Draft' },
  paidDate: { type: Date },
  notes: { type: String, default: '' }
}, { timestamps: true });

invoiceSchema.index({ userId: 1, clientId: 1 });
invoiceSchema.index({ userId: 1, status: 1 });

const Invoice = mongoose.model('Invoice', invoiceSchema);
export default Invoice;
