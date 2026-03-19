import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { supabase } from '../supabaseClient';
import { format } from 'date-fns';
import { FileText, Plus, Trash2, X, Download, ChevronRight, DollarSign, AlertTriangle, Crown } from 'lucide-react';

const statusColors = {
  'Draft': 'bg-ff-700/30 text-ff-400',
  'Sent': 'bg-info/10 text-info',
  'Paid': 'bg-success/10 text-success',
  'Overdue': 'bg-danger/10 text-danger'
};

export default function Invoices() {
  const { user } = useContext(AuthContext);
  const [invoices, setInvoices] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showWizard, setShowWizard] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [wizardData, setWizardData] = useState({ clientId: '', dateFrom: '', dateTo: '', taxRate: 10, notes: '' });
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);

  const fetchData = async () => {
    if (!user) return;
    try {
      const [invRes, cliRes] = await Promise.all([
        supabase.from('invoices').select('*, clients(name, company, email)').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('clients').select('id, name, company').eq('user_id', user.id)
      ]);
      if (invRes.data) {
        setInvoices(invRes.data.map(i => ({
          ...i, _id: i.id, invoiceNumber: i.invoice_number, dateFrom: i.date_from, dateTo: i.date_to,
          clientId: { ...i.clients, _id: i.client_id },
          lineItems: i.line_items, taxRate: i.tax_rate, taxAmount: i.tax_amount, total: i.amount
        })));
      }
      if (cliRes.data) setClients(cliRes.data.map(c => ({...c, _id: c.id})));
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [user]);

  const isPro = user?.plan === 'Pro';

  const openWizard = () => {
    setWizardStep(1);
    setWizardData({ clientId: clients[0]?._id || '', dateFrom: '', dateTo: '', taxRate: 10, notes: '' });
    setPreview(null);
    setError('');
    setShowWizard(true);
  };

  const fetchPreview = async () => {
    if (!wizardData.clientId || !wizardData.dateFrom || !wizardData.dateTo) {
      setError('Please fill in all required fields');
      return;
    }
    try {
      setError('');
      // Manually find unbilled logs in Supabase
      const { data: logs, error: logsErr } = await supabase
        .from('timelogs')
        .select('*, projects!inner(client_id, name, hourly_rate, clients(default_hourly_rate))')
        .eq('projects.client_id', wizardData.clientId)
        .eq('billed', false)
        .gte('start_time', `${wizardData.dateFrom}T00:00:00.000Z`)
        .lte('start_time', `${wizardData.dateTo}T23:59:59.999Z`);
        
      if (logsErr) throw logsErr;
      if (!logs || logs.length === 0) {
        setError('No unbilled time logs found for this period');
        return;
      }
      
      const lineItems = logs.map(log => {
        const rate = log.projects?.hourly_rate || log.projects?.clients?.default_hourly_rate || 0;
        const hours = log.duration_seconds ? log.duration_seconds / 3600 : 0;
        return {
          description: `${log.projects.name} - ${log.description || 'Time log'}`,
          hours, rate, amount: hours * rate, timelog_id: log.id,
          project_id: log.project_id
        };
      });
      
      const subtotal = lineItems.reduce((acc, item) => acc + item.amount, 0);
      const taxAmount = subtotal * (wizardData.taxRate / 100);
      const totalAmount = subtotal + taxAmount;
      const totalHours = lineItems.reduce((acc, item) => acc + item.hours, 0);
      
      setPreview({
        logs: logs.map(l => ({ _id: l.id, projectId: { name: l.projects.name }, description: l.description, duration: l.duration_seconds ? l.duration_seconds / 60 : 0 })),
        lineItems,
        summary: { totalEntries: logs.length, totalHours: Number(totalHours.toFixed(1)), totalAmount, subtotal, taxAmount }
      });
      setWizardStep(2);
    } catch (err) {
      setError(err.message || 'Error fetching time logs');
    }
  };

  const createInvoice = async () => {
    setCreating(true);
    try {
      const invoiceNumber = `INV-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
      const payload = {
        user_id: user.id, client_id: wizardData.clientId, invoice_number: invoiceNumber,
        amount: preview.summary.totalAmount, date_from: wizardData.dateFrom, date_to: wizardData.dateTo,
        status: 'Draft', timelog_ids: preview.lineItems.map(i => i.timelog_id),
        line_items: preview.lineItems, subtotal: preview.summary.subtotal,
        tax_rate: wizardData.taxRate, tax_amount: preview.summary.taxAmount,
        notes: wizardData.notes, issue_date: new Date().toISOString()
      };
      
      const { data: inv, error: invErr } = await supabase.from('invoices').insert([payload]).select().single();
      if (invErr) throw invErr;
      
      // Update timelogs to billed = true
      await supabase.from('timelogs').update({ billed: true }).in('id', payload.timelog_ids);
      
      setShowWizard(false);
      await fetchData();
    } catch (err) {
      setError(err.message || 'Error creating invoice. Note: You may need to run the ALTER TABLE SQL command first!');
    } finally {
      setCreating(false);
    }
  };

  const updateStatus = async (id, status) => {
    try {
      const { data, error } = await supabase.from('invoices').update({ status }).eq('id', id).select('*, clients(name, company, email)').single();
      if (error) throw error;
      const mapped = {
          ...data, _id: data.id, invoiceNumber: data.invoice_number, dateFrom: data.date_from, dateTo: data.date_to,
          clientId: { ...data.clients, _id: data.client_id },
          lineItems: data.line_items, taxRate: data.tax_rate, taxAmount: data.tax_amount, total: data.amount
      };
      setInvoices(invoices.map(inv => inv._id === id ? mapped : inv));
    } catch (err) { console.error(err); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this invoice? Unbilled time logs will be restored.')) return;
    const inv = invoices.find(i => i._id === id);
    if (inv && inv.timelog_ids) await supabase.from('timelogs').update({ billed: false }).in('id', inv.timelog_ids);
    await supabase.from('invoices').delete().eq('id', id);
    setInvoices(invoices.filter(i => i._id !== id));
  };


  const downloadPDF = (invoice) => {
    // Generate PDF client-side with jspdf
    import('jspdf').then(({ default: jsPDF }) => {
      import('jspdf-autotable').then(({ default: autoTable }) => {
        const doc = new jsPDF();
        const clientName = invoice.clientId?.name || 'Client';
        const companyName = invoice.clientId?.company || '';

        // Header
        doc.setFillColor(99, 102, 241);
        doc.rect(0, 0, 210, 40, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(24);
        doc.setFont('helvetica', 'bold');
        doc.text('INVOICE', 20, 25);
        doc.setFontSize(12);
        doc.text(invoice.invoiceNumber, 20, 33);

        // Client Info
        doc.setTextColor(60, 60, 60);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text('Bill To:', 20, 55);
        doc.setFont('helvetica', 'normal');
        doc.text(clientName, 20, 62);
        if (companyName) doc.text(companyName, 20, 69);
        if (invoice.clientId?.email) doc.text(invoice.clientId.email, 20, companyName ? 76 : 69);

        // Invoice Details
        doc.setFont('helvetica', 'bold');
        doc.text('Invoice Date:', 130, 55);
        doc.setFont('helvetica', 'normal');
        doc.text(format(new Date(invoice.createdAt), 'MMM d, yyyy'), 130, 62);
        doc.setFont('helvetica', 'bold');
        doc.text('Period:', 130, 72);
        doc.setFont('helvetica', 'normal');
        doc.text(`${format(new Date(invoice.dateFrom), 'MMM d')} - ${format(new Date(invoice.dateTo), 'MMM d, yyyy')}`, 130, 79);
        doc.setFont('helvetica', 'bold');
        doc.text('Status:', 130, 89);
        doc.setFont('helvetica', 'normal');
        doc.text(invoice.status, 130, 96);

        // Line Items Table
        const tableData = invoice.lineItems.map(item => [
          item.description,
          item.hours.toFixed(2),
          `$${item.rate.toFixed(2)}`,
          `$${item.amount.toFixed(2)}`
        ]);

        autoTable(doc, {
          startY: 110,
          head: [['Description', 'Hours', 'Rate', 'Amount']],
          body: tableData,
          headStyles: { fillColor: [99, 102, 241], textColor: 255, fontStyle: 'bold' },
          alternateRowStyles: { fillColor: [245, 245, 255] },
          styles: { fontSize: 10, cellPadding: 4 },
          columnStyles: {
            0: { cellWidth: 80 },
            1: { halign: 'right', cellWidth: 25 },
            2: { halign: 'right', cellWidth: 30 },
            3: { halign: 'right', cellWidth: 35 }
          }
        });

        // Totals
        const finalY = doc.lastAutoTable.finalY + 10;
        doc.setFontSize(10);
        doc.text('Subtotal:', 130, finalY);
        doc.text(`$${invoice.subtotal.toFixed(2)}`, 175, finalY, { align: 'right' });
        doc.text(`Tax (${invoice.taxRate}%):`, 130, finalY + 7);
        doc.text(`$${invoice.taxAmount.toFixed(2)}`, 175, finalY + 7, { align: 'right' });
        doc.setFontSize(13);
        doc.setFont('helvetica', 'bold');
        doc.text('Total:', 130, finalY + 18);
        doc.setTextColor(99, 102, 241);
        doc.text(`$${invoice.total.toFixed(2)}`, 175, finalY + 18, { align: 'right' });

        // Notes
        if (invoice.notes) {
          doc.setTextColor(100, 100, 100);
          doc.setFontSize(9);
          doc.setFont('helvetica', 'normal');
          doc.text('Notes:', 20, finalY + 35);
          doc.text(invoice.notes, 20, finalY + 42);
        }

        // Footer
        doc.setTextColor(150, 150, 150);
        doc.setFontSize(8);
        doc.text('Generated by FreelanceFlow', 20, 285);

        doc.save(`${invoice.invoiceNumber}.pdf`);
      });
    });
  };

  const totalPending = invoices.filter(i => ['Draft', 'Sent'].includes(i.status)).reduce((s, i) => s + i.total, 0);
  const totalPaid = invoices.filter(i => i.status === 'Paid').reduce((s, i) => s + i.total, 0);

  if (loading) return <div className="flex items-center justify-center h-full min-h-screen"><div className="w-8 h-8 border-2 border-accent/30 border-t-accent rounded-full animate-spin"></div></div>;

  return (
    <div className="p-8 max-w-6xl mx-auto animate-fadeIn">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black text-ff-100 tracking-tight">Invoices</h1>
          <p className="text-ff-400 mt-1">Create and manage your invoices</p>
        </div>
        <div className="flex items-center gap-3">
          {!isPro && (
            <div className="flex items-center gap-2 px-4 py-2 bg-warning/10 border border-warning/20 rounded-xl text-warning text-xs font-bold">
              <Crown size={14} /> Pro feature
            </div>
          )}
          <button onClick={openWizard} disabled={!isPro}
            className="flex items-center gap-2 px-5 py-2.5 bg-accent hover:bg-accent-dark text-ff-950 rounded-xl font-semibold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed">
            <Plus size={16} /> Create Invoice
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-ff-900 border border-ff-700/20 rounded-2xl p-5">
          <div className="text-xs text-ff-400 font-bold uppercase tracking-wider mb-1">Outstanding</div>
          <div className="text-3xl font-black text-warning">${Math.round(totalPending).toLocaleString()}</div>
        </div>
        <div className="bg-ff-900 border border-ff-700/20 rounded-2xl p-5">
          <div className="text-xs text-ff-400 font-bold uppercase tracking-wider mb-1">Collected</div>
          <div className="text-3xl font-black text-success">${Math.round(totalPaid).toLocaleString()}</div>
        </div>
      </div>

      {/* Invoices List */}
      {invoices.length === 0 ? (
        <div className="text-center py-20 bg-ff-900 border border-ff-700/20 rounded-2xl">
          <FileText size={48} className="mx-auto text-ff-600 mb-4" />
          <h3 className="text-lg font-bold text-ff-300">No invoices yet</h3>
          <p className="text-ff-500 mt-1 text-sm">{isPro ? 'Create your first invoice' : 'Upgrade to Pro to create invoices'}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {invoices.map(invoice => (
            <div key={invoice._id} className="bg-ff-900 border border-ff-700/20 rounded-2xl p-5 hover:border-ff-600/30 transition-all group">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center">
                    <FileText size={20} className="text-accent" />
                  </div>
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="font-bold text-ff-100 text-lg">{invoice.invoiceNumber}</h3>
                      <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-bold ${statusColors[invoice.status]}`}>{invoice.status}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-ff-400">
                      <span>{invoice.clientId?.name}</span>
                      <span>{format(new Date(invoice.dateFrom), 'MMM d')} – {format(new Date(invoice.dateTo), 'MMM d, yyyy')}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-xl font-black text-ff-100">${invoice.total.toLocaleString()}</div>
                    <div className="text-[10px] text-ff-500">{invoice.lineItems?.length || 0} items</div>
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <select value={invoice.status} onChange={e => updateStatus(invoice._id, e.target.value)}
                      className="px-2 py-1.5 bg-ff-800 border border-ff-700/30 rounded-lg text-ff-300 text-xs focus:outline-none">
                      {['Draft', 'Sent', 'Paid', 'Overdue'].map(s => <option key={s}>{s}</option>)}
                    </select>
                    <button onClick={() => downloadPDF(invoice)} className="p-2 bg-ff-800 text-accent rounded-lg hover:bg-accent/10 transition-colors" title="Download PDF">
                      <Download size={16} />
                    </button>
                    <button onClick={() => handleDelete(invoice._id)} className="p-2 bg-ff-800 text-danger rounded-lg hover:bg-danger/20 transition-colors">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Invoice Wizard Modal */}
      {showWizard && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-ff-900 border border-ff-700/30 rounded-2xl w-full max-w-lg shadow-2xl animate-fadeIn">
            <div className="flex items-center justify-between p-6 border-b border-ff-700/20">
              <h2 className="text-lg font-bold text-ff-100">
                {wizardStep === 1 ? 'Select Client & Period' : 'Review & Create'}
              </h2>
              <button onClick={() => setShowWizard(false)} className="p-1 text-ff-500 hover:text-ff-300"><X size={20} /></button>
            </div>

            {wizardStep === 1 ? (
              <div className="p-6 space-y-4">
                {error && <div className="bg-danger/10 border border-danger/20 text-danger text-sm px-4 py-2 rounded-xl">{error}</div>}
                <div>
                  <label className="block text-[10px] font-bold text-ff-400 uppercase tracking-[0.2em] mb-1">Client *</label>
                  <select value={wizardData.clientId} onChange={e => setWizardData({ ...wizardData, clientId: e.target.value })} required
                    className="w-full px-4 py-3 bg-ff-850 border border-ff-700/30 rounded-xl text-ff-100 focus:outline-none focus:border-accent/50">
                    <option value="">Select client</option>
                    {clients.map(c => <option key={c._id} value={c._id}>{c.name} — {c.company}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-ff-400 uppercase tracking-[0.2em] mb-1">From *</label>
                    <input type="date" value={wizardData.dateFrom} onChange={e => setWizardData({ ...wizardData, dateFrom: e.target.value })}
                      className="w-full px-4 py-3 bg-ff-850 border border-ff-700/30 rounded-xl text-ff-100 focus:outline-none focus:border-accent/50" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-ff-400 uppercase tracking-[0.2em] mb-1">To *</label>
                    <input type="date" value={wizardData.dateTo} onChange={e => setWizardData({ ...wizardData, dateTo: e.target.value })}
                      className="w-full px-4 py-3 bg-ff-850 border border-ff-700/30 rounded-xl text-ff-100 focus:outline-none focus:border-accent/50" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-ff-400 uppercase tracking-[0.2em] mb-1">Tax Rate (%)</label>
                    <input type="number" value={wizardData.taxRate} onChange={e => setWizardData({ ...wizardData, taxRate: Number(e.target.value) })}
                      className="w-full px-4 py-3 bg-ff-850 border border-ff-700/30 rounded-xl text-ff-100 focus:outline-none focus:border-accent/50" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-ff-400 uppercase tracking-[0.2em] mb-1">Notes</label>
                    <input value={wizardData.notes} onChange={e => setWizardData({ ...wizardData, notes: e.target.value })}
                      className="w-full px-4 py-3 bg-ff-850 border border-ff-700/30 rounded-xl text-ff-100 focus:outline-none focus:border-accent/50"
                      placeholder="Optional" />
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowWizard(false)} className="flex-1 py-3 bg-ff-800 text-ff-300 rounded-xl font-semibold hover:bg-ff-700 transition-colors">Cancel</button>
                  <button type="button" onClick={fetchPreview} className="flex-1 py-3 bg-accent text-ff-950 rounded-xl font-semibold hover:bg-accent-dark transition-colors flex items-center justify-center gap-2">
                    Preview <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-6 space-y-4">
                {error && <div className="bg-danger/10 border border-danger/20 text-danger text-sm px-4 py-2 rounded-xl">{error}</div>}
                <div className="bg-ff-850 rounded-xl p-4">
                  <div className="text-xs text-ff-400 font-bold uppercase tracking-wider mb-2">Preview Summary</div>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-xl font-black text-ff-100">{preview?.summary?.totalEntries}</div>
                      <div className="text-[10px] text-ff-500">Entries</div>
                    </div>
                    <div>
                      <div className="text-xl font-black text-accent">{preview?.summary?.totalHours}h</div>
                      <div className="text-[10px] text-ff-500">Hours</div>
                    </div>
                    <div>
                      <div className="text-xl font-black text-success">${preview?.summary?.totalAmount?.toLocaleString()}</div>
                      <div className="text-[10px] text-ff-500">Amount</div>
                    </div>
                  </div>
                </div>
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {preview?.logs?.map(log => (
                    <div key={log._id} className="flex justify-between text-xs p-2 bg-ff-800/50 rounded-lg">
                      <span className="text-ff-300">{log.projectId?.name} — {log.description || 'No desc'}</span>
                      <span className="text-ff-400 font-mono">{(log.duration / 60).toFixed(1)}h</span>
                    </div>
                  ))}
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setWizardStep(1)} className="flex-1 py-3 bg-ff-800 text-ff-300 rounded-xl font-semibold hover:bg-ff-700 transition-colors">Back</button>
                  <button type="button" onClick={createInvoice} disabled={creating}
                    className="flex-1 py-3 bg-accent text-ff-950 rounded-xl font-semibold hover:bg-accent-dark transition-colors disabled:opacity-50">
                    {creating ? 'Creating...' : 'Create Invoice'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

