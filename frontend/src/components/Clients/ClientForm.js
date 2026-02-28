import React, { useEffect } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import API from '../../utils/api';
import { useNavigate, useParams } from 'react-router-dom';
import { Link } from 'react-router-dom';
import './ClientForm.css';

const emptyAddress = () => ({ street: '', city: '', zipCode: '', country: 'France' });

const ClientForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const formik = useFormik({
    initialValues: {
      name: '',
      sector: '',
      siret: '',
      email: '',
      phone: '',
      createAccount: false,
      accountEmail: '',
      accountPassword: '',
      accountPhone: '',
      billingAddress: emptyAddress(),
      deliveryAddress: emptyAddress(),
      contacts: [{ name: '', email: '', phone: '', role: '', isPrimary: false }],
      commercialTerms: {
        paymentDeadline: 30,
        discount: 0,
        vatRate: 20,
        notes: '',
      },
      tags: [],
      tagInput: '',
    },
    validationSchema: Yup.object({
      name: Yup.string().required('Nom requis'),
      siret: Yup.string().matches(/^\d{14}$|^$/, 'SIRET : 14 chiffres').nullable(),
      email: Yup.string().email('Email invalide').nullable(),
      accountEmail: Yup.string().when('createAccount', { is: true, then: (s) => s.required('Email du compte requis').email('Email invalide'), otherwise: (s) => s.nullable() }),
      accountPassword: Yup.string().when('createAccount', { is: true, then: (s) => s.required('Mot de passe requis').min(6, 'Minimum 6 caractères'), otherwise: (s) => s.nullable() }),
      contacts: Yup.array().of(
        Yup.object({
          name: Yup.string(),
          email: Yup.string().email('Email invalide').nullable(),
        })
      ),
    }),
    onSubmit: async (values) => {
      try {
        const { tagInput, ...payload } = values;
        payload.tags = payload.tags || [];
        if (!payload.createAccount) {
          delete payload.accountEmail;
          delete payload.accountPassword;
          delete payload.accountPhone;
        }
        if (id) {
          await API.put(`/clients/${id}`, payload);
        } else {
          await API.post('/clients', payload);
        }
        navigate('/clients');
      } catch (error) {
        const msg = error.response?.data?.message || error.response?.data?.errors?.[0]?.msg || 'Erreur lors de l\'enregistrement';
        formik.setStatus(msg);
      }
    },
  });

  useEffect(() => {
    if (id) {
      const fetchClient = async () => {
        const { data } = await API.get(`/clients/${id}`);
        formik.setValues({
          ...data,
          billingAddress: data.billingAddress || emptyAddress(),
          deliveryAddress: data.deliveryAddress || emptyAddress(),
          commercialTerms: data.commercialTerms || { paymentDeadline: 30, discount: 0, vatRate: 20, notes: '' },
          contacts: data.contacts?.length ? data.contacts : [{ name: '', email: '', phone: '', role: '', isPrimary: false }],
          tags: data.tags || [],
          tagInput: '',
          createAccount: !!data.user,
          accountEmail: data.user?.email || '',
          accountPassword: '',
          accountPhone: data.user?.phone || '',
        });
      };
      fetchClient();
    }
  }, [id]);

  const addTag = () => {
    const t = (formik.values.tagInput || '').trim();
    if (t && !(formik.values.tags || []).includes(t)) {
      formik.setFieldValue('tags', [...(formik.values.tags || []), t]);
      formik.setFieldValue('tagInput', '');
    }
  };

  const removeTag = (tag) => {
    formik.setFieldValue('tags', (formik.values.tags || []).filter((x) => x !== tag));
  };

  return (
    <div className="client-form-page">
      <div className="client-form-header">
        <h1>{id ? 'Modifier le client' : 'Créer un client'}</h1>
        <Link to="/clients" className="back-link">← Liste des clients</Link>
      </div>
      {formik.status && <div className="client-form-error">{formik.status}</div>}
      <form onSubmit={formik.handleSubmit} className="client-form">
        <section className="form-section">
          <h2>Informations générales</h2>
          <div className="form-grid">
            <div className="form-group">
              <label>Nom *</label>
              <input name="name" value={formik.values.name} onChange={formik.handleChange} onBlur={formik.handleBlur} />
              {formik.touched.name && formik.errors.name && <span className="error">{formik.errors.name}</span>}
            </div>
            <div className="form-group">
              <label>Secteur</label>
              <input name="sector" value={formik.values.sector} onChange={formik.handleChange} placeholder="ex. BTP, IT" />
            </div>
            <div className="form-group">
              <label>SIRET (14 chiffres)</label>
              <input name="siret" value={formik.values.siret} onChange={formik.handleChange} maxLength={14} placeholder="12345678901234" />
              {formik.touched.siret && formik.errors.siret && <span className="error">{formik.errors.siret}</span>}
            </div>
            <div className="form-group">
              <label>Email</label>
              <input name="email" type="email" value={formik.values.email} onChange={formik.handleChange} />
              {formik.touched.email && formik.errors.email && <span className="error">{formik.errors.email}</span>}
            </div>
            <div className="form-group">
              <label>Téléphone</label>
              <input name="phone" value={formik.values.phone} onChange={formik.handleChange} />
            </div>
          </div>
        </section>

        <section className="form-section">
          <h2>Compte d&apos;accès espace client</h2>
          <p className="form-section-desc">Permet au client de se connecter à son espace (projets, factures).</p>
          {id && formik.values.accountEmail && formik.values.createAccount ? (
            <div className="account-exists">
              <strong>Un compte est déjà lié :</strong> {formik.values.accountEmail}
              <p className="form-section-desc">Le client peut se connecter à son espace avec cet email et son mot de passe.</p>
            </div>
          ) : (
            <>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="createAccount"
                  checked={formik.values.createAccount}
                  onChange={(e) => formik.setFieldValue('createAccount', e.target.checked)}
                />
                {' '}Créer un compte de connexion pour ce client
              </label>
              {formik.values.createAccount && (
                <div className="form-grid" style={{ marginTop: '1rem' }}>
                  <div className="form-group">
                    <label>Email du compte *</label>
                    <input
                      name="accountEmail"
                      type="email"
                      value={formik.values.accountEmail}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      placeholder="connexion@exemple.fr"
                    />
                    {formik.touched.accountEmail && formik.errors.accountEmail && <span className="error">{formik.errors.accountEmail}</span>}
                  </div>
                  <div className="form-group">
                    <label>Mot de passe *</label>
                    <input
                      name="accountPassword"
                      type="password"
                      value={formik.values.accountPassword}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      placeholder="Minimum 6 caractères"
                      autoComplete={id ? 'new-password' : 'off'}
                    />
                    {formik.touched.accountPassword && formik.errors.accountPassword && <span className="error">{formik.errors.accountPassword}</span>}
                  </div>
                  <div className="form-group">
                    <label>Téléphone du compte</label>
                    <input
                      name="accountPhone"
                      type="text"
                      value={formik.values.accountPhone}
                      onChange={formik.handleChange}
                      placeholder="Optionnel"
                    />
                  </div>
                </div>
              )}
            </>
          )}
        </section>

        <section className="form-section">
          <h2>Adresse de facturation</h2>
          <div className="form-grid">
            <div className="form-group full-width">
              <label>Rue</label>
              <input
                value={formik.values.billingAddress?.street || ''}
                onChange={(e) => formik.setFieldValue('billingAddress.street', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Code postal</label>
              <input
                value={formik.values.billingAddress?.zipCode || ''}
                onChange={(e) => formik.setFieldValue('billingAddress.zipCode', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Ville</label>
              <input
                value={formik.values.billingAddress?.city || ''}
                onChange={(e) => formik.setFieldValue('billingAddress.city', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Pays</label>
              <input
                value={formik.values.billingAddress?.country || ''}
                onChange={(e) => formik.setFieldValue('billingAddress.country', e.target.value)}
              />
            </div>
          </div>
        </section>

        <section className="form-section">
          <h2>Adresse de livraison</h2>
          <div className="form-grid">
            <div className="form-group full-width">
              <label>Rue</label>
              <input
                value={formik.values.deliveryAddress?.street || ''}
                onChange={(e) => formik.setFieldValue('deliveryAddress.street', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Code postal</label>
              <input
                value={formik.values.deliveryAddress?.zipCode || ''}
                onChange={(e) => formik.setFieldValue('deliveryAddress.zipCode', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Ville</label>
              <input
                value={formik.values.deliveryAddress?.city || ''}
                onChange={(e) => formik.setFieldValue('deliveryAddress.city', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Pays</label>
              <input
                value={formik.values.deliveryAddress?.country || ''}
                onChange={(e) => formik.setFieldValue('deliveryAddress.country', e.target.value)}
              />
            </div>
          </div>
        </section>

        <section className="form-section">
          <h2>Contacts</h2>
          {formik.values.contacts.map((contact, index) => (
            <div key={index} className="contact-block">
              <div className="form-grid">
                <div className="form-group">
                  <label>Nom</label>
                  <input
                    value={contact.name}
                    onChange={(e) => formik.setFieldValue(`contacts[${index}].name`, e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    value={contact.email}
                    onChange={(e) => formik.setFieldValue(`contacts[${index}].email`, e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Téléphone</label>
                  <input
                    value={contact.phone}
                    onChange={(e) => formik.setFieldValue(`contacts[${index}].phone`, e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Rôle</label>
                  <input
                    value={contact.role}
                    onChange={(e) => formik.setFieldValue(`contacts[${index}].role`, e.target.value)}
                    placeholder="ex. Décideur, Technique"
                  />
                </div>
                <div className="form-group checkbox-group">
                  <label>
                    <input
                      type="checkbox"
                      checked={!!contact.isPrimary}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        formik.setFieldValue(`contacts[${index}].isPrimary`, checked);
                        if (checked) {
                          formik.values.contacts.forEach((_, i) => {
                            if (i !== index) formik.setFieldValue(`contacts[${i}].isPrimary`, false);
                          });
                        }
                      }}
                    />
                    Principal
                  </label>
                </div>
              </div>
            </div>
          ))}
          <button type="button" className="btn-secondary" onClick={() => formik.setFieldValue('contacts', [...formik.values.contacts, { name: '', email: '', phone: '', role: '', isPrimary: false }])}>
            + Ajouter un contact
          </button>
        </section>

        <section className="form-section">
          <h2>Conditions commerciales</h2>
          <div className="form-grid">
            <div className="form-group">
              <label>Délai de paiement (jours)</label>
              <input
                type="number"
                min={0}
                value={formik.values.commercialTerms?.paymentDeadline ?? 30}
                onChange={(e) => formik.setFieldValue('commercialTerms.paymentDeadline', parseInt(e.target.value, 10) || 0)}
              />
            </div>
            <div className="form-group">
              <label>Remise (%)</label>
              <input
                type="number"
                min={0}
                max={100}
                step={0.5}
                value={formik.values.commercialTerms?.discount ?? 0}
                onChange={(e) => formik.setFieldValue('commercialTerms.discount', parseFloat(e.target.value) || 0)}
              />
            </div>
            <div className="form-group">
              <label>Taux TVA (%)</label>
              <input
                type="number"
                min={0}
                max={100}
                step={0.1}
                value={formik.values.commercialTerms?.vatRate ?? 20}
                onChange={(e) => formik.setFieldValue('commercialTerms.vatRate', parseFloat(e.target.value) || 0)}
              />
            </div>
            <div className="form-group full-width">
              <label>Notes conditions</label>
              <textarea
                value={formik.values.commercialTerms?.notes || ''}
                onChange={(e) => formik.setFieldValue('commercialTerms.notes', e.target.value)}
                rows={2}
              />
            </div>
          </div>
        </section>

        <section className="form-section">
          <h2>Tags / Catégorisation</h2>
          <div className="tags-row">
            <input
              value={formik.values.tagInput || ''}
              onChange={(e) => formik.setFieldValue('tagInput', e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
              placeholder="Ajouter un tag"
              className="tag-input"
            />
            <button type="button" className="btn-secondary" onClick={addTag}>Ajouter</button>
          </div>
          <div className="tags-list">
            {(formik.values.tags || []).map((tag) => (
              <span key={tag} className="tag">
                {tag} <button type="button" onClick={() => removeTag(tag)} aria-label="Retirer">×</button>
              </span>
            ))}
          </div>
        </section>

        <div className="form-actions">
          <Link to="/clients" className="btn-secondary">Annuler</Link>
          <button type="submit" className="btn-primary">Enregistrer</button>
        </div>
      </form>
    </div>
  );
};

export default ClientForm;
