import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import API from '../../utils/api';
import RichTextEditor from '../UI/RichTextEditor';
import './Invoices.css';

const InvoiceForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const quoteIdParam = searchParams.get('fromQuote');
  const projectIdParam = searchParams.get('fromProject');

  const [formData, setFormData] = useState({
    client: '',
    project: '',
    quote: '',
    date: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    lines: [{ description: '', quantity: 1, unitPrice: 0, taxRate: 20, discount: 0, discountType: 'percent' }],
    type: 'invoice',
    notes: '',
    terms: '',
    status: 'draft',
  });
  const [clients, setClients] = useState([]);
  const [projects, setProjects] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchClients = useCallback(async () => {
    try {
      const { data } = await API.get('/clients');
      setClients(data);
    } catch (error) {
      console.error('Erreur:', error);
    }
  }, []);

  const fetchProjects = useCallback(async () => {
    try {
      const { data } = await API.get('/projects');
      setProjects(data);
    } catch (error) {
      console.error('Erreur:', error);
    }
  }, []);

  const fetchQuotes = useCallback(async () => {
    try {
      const { data } = await API.get('/quotes');
      setQuotes(data.filter(q => q.status === 'accepted'));
    } catch (error) {
      console.error('Erreur:', error);
    }
  }, []);

  const fetchInvoice = useCallback(async () => {
    try {
      const { data } = await API.get(`/invoices/${id}`);
      setFormData({
        ...data,
        client: data.client?._id || data.client,
        project: data.project?._id || data.project,
        quote: data.quote?._id || data.quote,
        date: data.date ? new Date(data.date).toISOString().split('T')[0] : formData.date,
        dueDate: data.dueDate ? new Date(data.dueDate).toISOString().split('T')[0] : formData.dueDate,
        lines: data.lines?.length ? data.lines : formData.lines,
      });
    } catch (error) {
      console.error('Erreur:', error);
    }
  }, [id]);

  const loadFromQuote = useCallback(async (qId) => {
    try {
      const { data } = await API.get(`/quotes/${qId}`);
      setFormData(prev => ({
        ...prev,
        client: data.client?._id || data.client,
        project: data.project?._id || data.project,
        quote: data._id,
        lines: data.lines?.map(l => ({ ...l })) || prev.lines,
        notes: data.notes || prev.notes,
        terms: data.terms || prev.terms,
      }));
    } catch (error) {
      console.error('Erreur:', error);
    }
  }, []);

  const loadFromProject = useCallback(async (pId) => {
    try {
      const { data } = await API.get(`/projects/${pId}`);
      setFormData(prev => ({
        ...prev,
        client: data.client?._id || data.client,
        project: data._id,
        lines: prev.lines,
      }));
    } catch (error) {
      console.error('Erreur:', error);
    }
  }, []);

  useEffect(() => {
    fetchClients();
    fetchProjects();
    fetchQuotes();
    if (id) fetchInvoice();
    else if (quoteIdParam) loadFromQuote(quoteIdParam);
    else if (projectIdParam) loadFromProject(projectIdParam);
  }, [id, quoteIdParam, projectIdParam, fetchClients, fetchProjects, fetchQuotes, fetchInvoice, loadFromQuote, loadFromProject]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleLineChange = (index, field, value) => {
    const newLines = [...formData.lines];
    newLines[index] = { ...newLines[index], [field]: value };
    setFormData(prev => ({ ...prev, lines: newLines }));
  };

  const addLine = () => {
    setFormData(prev => ({
      ...prev,
      lines: [...prev.lines, { description: '', quantity: 1, unitPrice: 0, taxRate: 20, discount: 0, discountType: 'percent' }],
    }));
  };

  const removeLine = (index) => {
    if (formData.lines.length <= 1) return;
    setFormData(prev => ({ ...prev, lines: prev.lines.filter((_, i) => i !== index) }));
  };

  const totals = formData.lines.reduce((acc, line) => {
    const ht = line.quantity * line.unitPrice;
    const disc = line.discountType === 'amount' ? Math.min(line.discount || 0, ht) : ht * ((line.discount || 0) / 100);
    const net = ht - disc;
    const tva = net * ((line.taxRate || 0) / 100);
    return { subtotal: acc.subtotal + net, tax: acc.tax + tva };
  }, { subtotal: 0, tax: 0 });

  const canEditInvoice = !id || ['draft', 'sent'].includes(formData.status);
  const invoiceStatusLabel = { draft: 'Brouillon', sent: 'Envoyée', partial: 'Partiellement payée', paid: 'Payée', overdue: 'En retard', cancelled: 'Annulée' }[formData.status] || formData.status;

  const handleSubmit = async (e, saveAs = 'draft') => {
    e.preventDefault();
    if (!canEditInvoice) {
      alert('Aucune modification possible : cette facture ne peut plus être modifiée (statut actuel : ' + invoiceStatusLabel + ').');
      return;
    }
    const validLines = formData.lines.filter((l) => (l.description || '').trim());
    if (validLines.length === 0) {
      alert('Au moins une ligne avec une description est requise.');
      return;
    }
    setLoading(true);
    try {
      const statusToSave = saveAs === 'preserve'
        ? formData.status
        : ['paid', 'partial'].includes(formData.status)
          ? formData.status
          : saveAs;
      const payload = { ...formData, status: statusToSave };
      if (!id && formData.quote) payload.quoteId = formData.quote;
      if (!payload.quote) delete payload.quote;
      if (!payload.project) delete payload.project;
      payload.lines = formData.lines;
      if (id) {
        await API.put(`/invoices/${id}`, payload);
      } else {
        await API.post('/invoices', payload);
      }
      alert('Facture enregistrée.');
      navigate('/invoices');
    } catch (error) {
      alert(error.response?.data?.message || 'Erreur lors de la sauvegarde');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="invoice-form-container">
      <h1>{id ? 'Éditer la Facture' : 'Nouvelle Facture'}</h1>
      <p className="form-intro">La facture constate une prestation ou une vente et engage le client au paiement. Vous pouvez la créer manuellement, à partir d’un devis accepté ou d’un projet.</p>

      {id && !canEditInvoice && (
        <div className="form-alert form-alert-info" role="alert">
          Cette facture ne peut plus être modifiée (statut : <strong>{invoiceStatusLabel}</strong>). Vous pouvez uniquement la consulter.
        </div>
      )}

      <form onSubmit={(e) => { e.preventDefault(); handleSubmit(e, 'preserve'); }}>
        <div className="form-section">
          <h3>Informations de la facture</h3>
          <div className="form-grid">
            {!id && (
              <>
                <div className="form-group form-group-full">
                  <label>Créer depuis</label>
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <select
                      value={formData.quote}
                      onChange={(e) => {
                        const v = e.target.value;
                        setFormData(prev => ({ ...prev, quote: v, project: v ? prev.project : prev.project }));
                        if (v) loadFromQuote(v);
                      }}
                    >
                      <option value="">-- Manuel --</option>
                      {quotes.map(q => (
                        <option key={q._id} value={q._id}>Devis {q.number} - {q.client?.name}</option>
                      ))}
                    </select>
                    <select
                      value={formData.project}
                      onChange={(e) => {
                        const v = e.target.value;
                        setFormData(prev => ({ ...prev, project: v }));
                        if (v) loadFromProject(v);
                      }}
                    >
                      <option value="">-- Projet --</option>
                      {projects.map(p => (
                        <option key={p._id} value={p._id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label>Type de document</label>
                  <select name="type" value={formData.type} onChange={handleChange}>
                    <option value="invoice">Facture</option>
                    <option value="down_payment">Acompte</option>
                    <option value="credit_note">Avoir / Note de crédit</option>
                  </select>
                  <span className="form-hint">Facture, acompte ou avoir — les devis sont gérés séparément.</span>
                </div>
              </>
            )}
            <div className="form-group">
              <label>Client </label>
              <select name="client" value={formData.client} onChange={handleChange} required>
                <option value="">-- Sélectionner --</option>
                {clients.map(c => (
                  <option key={c._id} value={c._id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Date d&apos;émission</label>
              <input type="date" name="date" value={formData.date} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>Date d&apos;échéance</label>
              <input type="date" name="dueDate" value={formData.dueDate} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>Statut</label>
              <select name="status" value={formData.status} onChange={handleChange}>
                <option value="draft">Brouillon</option>
                <option value="sent">Envoyée</option>
                <option value="partial">Partiellement payée</option>
                <option value="paid">Payée</option>
                <option value="overdue">En retard</option>
                <option value="cancelled">Annulée</option>
              </select>
            </div>
          </div>
        </div>

        <div className="form-section">
          <h3>Lignes de facture</h3>
          <div className="items-table-wrap">
          <div className="items-table">
            <div className="items-header">
              <div>Description</div>
              <div>Qté</div>
              <div>P.U.</div>
              <div>TVA %</div>
              <div>Remise</div>
              <div>Type</div>
              <div>Total TTC</div>
              <div></div>
            </div>
            {formData.lines.map((line, index) => {
              const ht = line.quantity * line.unitPrice;
              const disc = line.discountType === 'amount' ? Math.min(line.discount || 0, ht) : ht * ((line.discount || 0) / 100);
              const net = ht - disc;
              const ttc = net * (1 + (line.taxRate || 0) / 100);
              return (
                <div key={index} className="items-row">
                  <input
                    type="text"
                    placeholder="Description"
                    value={line.description}
                    onChange={(e) => handleLineChange(index, 'description', e.target.value)}
                  />
                  <input
                    type="number"
                    placeholder="Qté"
                    value={line.quantity}
                    onChange={(e) => handleLineChange(index, 'quantity', parseFloat(e.target.value) || 0)}
                    min="0.001"
                    step="0.01"
                  />
                  <input
                    type="number"
                    placeholder="Prix"
                    value={line.unitPrice}
                    onChange={(e) => handleLineChange(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                    min="0"
                    step="0.01"
                  />
                  <input
                    type="number"
                    placeholder="%"
                    value={line.taxRate}
                    onChange={(e) => handleLineChange(index, 'taxRate', parseFloat(e.target.value) || 0)}
                    min="0"
                    step="0.01"
                  />
                  <input
                    type="number"
                    placeholder="Remise"
                    value={line.discount}
                    onChange={(e) => handleLineChange(index, 'discount', parseFloat(e.target.value) || 0)}
                    min="0"
                    step="0.01"
                  />
                  <select value={line.discountType} onChange={(e) => handleLineChange(index, 'discountType', e.target.value)}>
                    <option value="percent">%</option>
                    <option value="amount">TND</option>
                  </select>
                  <div className="item-total">{ttc.toFixed(2)} TND</div>
                  {formData.lines.length > 1 && (
                    <button type="button" onClick={() => removeLine(index)} className="btn-icon btn-danger">×</button>
                  )}
                </div>
              );
            })}
          </div>
          </div>
          <button type="button" onClick={addLine} className="btn btn-secondary">+ Ajouter une ligne</button>
        </div>

        <div className="form-section totals-section">
          <div className="totals-row"><span>Total HT</span><strong>{(totals.subtotal).toFixed(2)} TND</strong></div>
          <div className="totals-row"><span>TVA</span><strong>{(totals.tax).toFixed(2)} TND</strong></div>
          <div className="totals-row total-ttc"><span>Total TTC</span><strong>{(totals.subtotal + totals.tax).toFixed(2)} TND</strong></div>
        </div>

        <div className="form-section">
          <div className="form-group">
            <label>Notes</label>
            <RichTextEditor
              value={formData.notes}
              onChange={(html) => setFormData((prev) => ({ ...prev, notes: html }))}
              placeholder="Notes additionnelles..."
              minHeight={100}
              toolbar="minimal"
            />
          </div>
          <div className="form-group">
            <label>Conditions générales</label>
            <RichTextEditor
              value={formData.terms}
              onChange={(html) => setFormData((prev) => ({ ...prev, terms: html }))}
              placeholder="Conditions générales de vente..."
              minHeight={120}
            />
          </div>
        </div>

        <div className="form-actions">
          {canEditInvoice && (
            <>
              <button type="submit" disabled={loading} className="btn btn-secondary">
                Enregistrer
              </button>
              <button type="button" onClick={(e) => handleSubmit(e, 'draft')} disabled={loading} className="btn btn-secondary">
                Enregistrer en Brouillon
              </button>
              <button
                type="button"
                onClick={(e) => handleSubmit(e, 'sent')}
                disabled={loading || ['paid', 'partial'].includes(formData.status)}
                className="btn btn-primary"
                title={['paid', 'partial'].includes(formData.status) ? 'Utilisez Enregistrer pour une facture déjà payée' : undefined}
              >
                Envoyer la facture au client
              </button>
            </>
          )}
          <button type="button" onClick={() => navigate(-1)} className="btn btn-outline">Annuler</button>
        </div>
      </form>
    </div>
  );
};

export default InvoiceForm;
