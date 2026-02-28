import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import API from '../../utils/api';
import RichTextEditor from '../UI/RichTextEditor';
import './Quotes.css';

const QuoteForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    client: '',
    project: '',
    date: new Date().toISOString().split('T')[0],
    validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    lines: [{ description: '', quantity: 1, unitPrice: 0, taxRate: 20, discount: 0, discountType: 'percent' }],
    notes: '',
    terms: '',
    status: 'draft',
  });
  const [clients, setClients] = useState([]);
  const [projects, setProjects] = useState([]);
  const [templates, setTemplates] = useState([]);
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

  const fetchTemplates = useCallback(async () => {
    try {
      const { data } = await API.get('/quotes/templates');
      setTemplates(data);
    } catch (error) {
      console.error('Erreur:', error);
    }
  }, []);

  const fetchQuote = useCallback(async () => {
    try {
      const { data } = await API.get(`/quotes/${id}`);
      setFormData({
        ...data,
        date: data.date ? new Date(data.date).toISOString().split('T')[0] : formData.date,
        validUntil: data.validUntil ? new Date(data.validUntil).toISOString().split('T')[0] : formData.validUntil,
        lines: data.lines?.length ? data.lines : formData.lines,
      });
    } catch (error) {
      console.error('Erreur:', error);
    }
  }, [id]);

  useEffect(() => {
    fetchClients();
    fetchProjects();
    fetchTemplates();
    if (id) fetchQuote();
  }, [id, fetchClients, fetchProjects, fetchTemplates, fetchQuote]);

  const applyTemplate = (templateId) => {
    const t = templates.find(x => x._id === templateId);
    if (t?.lines?.length) {
      setFormData(prev => ({
        ...prev,
        lines: t.lines.map(l => ({ ...l })),
        terms: t.defaultTerms || prev.terms,
        notes: t.defaultNotes || prev.notes,
      }));
    }
  };

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

  const handleSubmit = async (e, saveAs = 'draft') => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = { ...formData, status: saveAs };
      if (id) {
        await API.put(`/quotes/${id}`, payload);
      } else {
        await API.post('/quotes', payload);
      }
      navigate('/quotes');
    } catch (error) {
      console.error('Erreur:', error);
      alert(error.response?.data?.message || 'Erreur lors de la sauvegarde');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="quote-form-container">
      <h1>{id ? 'Éditer le Devis' : 'Nouveau Devis'}</h1>

      <form onSubmit={(e) => handleSubmit(e, formData.status)}>
        <div className="form-section">
          <h3>Informations du Devis</h3>
          <div className="form-grid">
            {templates.length > 0 && !id && (
              <div className="form-group form-group-full">
                <label>Modèle de devis</label>
                <select onChange={(e) => applyTemplate(e.target.value)}>
                  <option value="">-- Créer à partir d'un modèle --</option>
                  {templates.map(t => (
                    <option key={t._id} value={t._id}>{t.name}</option>
                  ))}
                </select>
              </div>
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
              <label>Projet</label>
              <select name="project" value={formData.project} onChange={handleChange}>
                <option value="">-- Optionnel --</option>
                {projects.map(p => (
                  <option key={p._id} value={p._id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Date</label>
              <input type="date" name="date" value={formData.date} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>Valide jusqu'au</label>
              <input type="date" name="validUntil" value={formData.validUntil} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>Statut</label>
              <select name="status" value={formData.status} onChange={handleChange}>
                <option value="draft">Brouillon</option>
                <option value="sent">Envoyé</option>
                <option value="accepted">Accepté</option>
                <option value="refused">Refusé</option>
              </select>
            </div>
          </div>
        </div>

        <div className="form-section">
          <h3>Lignes de devis</h3>
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
                  <select
                    value={line.discountType}
                    onChange={(e) => handleLineChange(index, 'discountType', e.target.value)}
                  >
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
          <button type="button" onClick={(e) => handleSubmit(e, 'draft')} disabled={loading} className="btn btn-secondary">
            Enregistrer en Brouillon
          </button>
          <button type="button" onClick={(e) => handleSubmit(e, 'sent')} disabled={loading} className="btn btn-primary">
            Envoyer au Client
          </button>
          <button type="button" onClick={() => navigate(-1)} className="btn btn-outline">Annuler</button>
        </div>
      </form>
    </div>
  );
};

export default QuoteForm;
