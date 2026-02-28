import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import Cropper from 'react-easy-crop';
import API from '../../utils/api';
import { AuthContext } from '../../contexts/AuthContext';
import { getCroppedImg } from '../../utils/cropImage';
import './ProfilePage.css';

const ProfilePage = () => {
  const { user, reloadUser } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [profile, setProfile] = useState({
    firstName: '',
    lastName: '',
    name: '',
    phone: '',
    jobTitle: '',
    signature: '',
    email: '',
    role: '',
    profilePicture: '',
    createdAt: '',
    lastLoginAt: '',
  });
  const [emailForm, setEmailForm] = useState({ currentPassword: '', newEmail: '' });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '', logoutOtherSessions: true });
  const [dragOver, setDragOver] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  const initials = useMemo(() => {
    const source = `${profile.firstName || ''} ${profile.lastName || ''}`.trim() || profile.name || 'U';
    return source.split(' ').map((s) => s[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
  }, [profile.firstName, profile.lastName, profile.name]);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const { data } = await API.get('/auth/me');
        setProfile((p) => ({
          ...p,
          firstName: data.firstName || '',
          lastName: data.lastName || '',
          name: data.name || '',
          phone: data.phone || '',
          jobTitle: data.jobTitle || '',
          signature: data.signature || '',
          email: data.email || '',
          role: data.role || '',
          profilePicture: data.profilePicture || '',
          createdAt: data.createdAt || '',
          lastLoginAt: data.lastLoginAt || '',
        }));
      } catch (e) {
        setErr('Impossible de charger votre profil.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleProfileSave = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setMsg('');
      setErr('');
      await API.put('/auth/me', {
        firstName: profile.firstName,
        lastName: profile.lastName,
        name: profile.name,
        phone: profile.phone,
        jobTitle: profile.jobTitle,
        signature: profile.signature,
      });
      await reloadUser();
      setMsg('Profil mis à jour avec succès.');
    } catch (e) {
      setErr(e.response?.data?.message || 'Erreur lors de la mise à jour.');
    } finally {
      setSaving(false);
    }
  };

  const handleEmailChange = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setMsg('');
      setErr('');
      const { data } = await API.patch('/auth/me/email', emailForm);
      setMsg(data?.message || 'Demande de changement email envoyée.');
      setEmailForm({ currentPassword: '', newEmail: '' });
    } catch (e) {
      setErr(e.response?.data?.message || 'Erreur changement email.');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setMsg('');
      setErr('');
      const { data } = await API.patch('/auth/me/password', passwordForm);
      setMsg(data?.message || 'Mot de passe mis à jour.');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '', logoutOtherSessions: true });
    } catch (e) {
      setErr(e.response?.data?.message || 'Erreur changement mot de passe.');
    } finally {
      setSaving(false);
    }
  };

  const onCropComplete = useCallback((_croppedArea, croppedAreaPx) => {
    setCroppedAreaPixels(croppedAreaPx);
  }, []);

  const openCropModal = (file) => {
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setErr('Format image non supporté (JPG, PNG, WebP)');
      return;
    }
    setErr('');
    const url = URL.createObjectURL(file);
    setCropImageSrc(url);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
  };

  const closeCropModal = useCallback(() => {
    if (cropImageSrc) URL.revokeObjectURL(cropImageSrc);
    setCropImageSrc(null);
    setCroppedAreaPixels(null);
  }, [cropImageSrc]);

  const uploadPicture = async (file) => {
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setErr('Format image non supporté (JPG, PNG, WebP)');
      return;
    }
    openCropModal(file);
  };

  const confirmCropAndUpload = async () => {
    if (!cropImageSrc || !croppedAreaPixels) return;
    try {
      setSaving(true);
      setErr('');
      const blob = await getCroppedImg(cropImageSrc, croppedAreaPixels);
      const file = new File([blob], 'avatar.jpg', { type: 'image/jpeg' });
      const formData = new FormData();
      formData.append('file', file);
      const { data } = await API.post('/auth/me/profile-picture', formData);
      setProfile((p) => ({ ...p, profilePicture: data.profilePicture }));
      await reloadUser();
      setMsg('Photo de profil mise à jour.');
      closeCropModal();
    } catch (e) {
      setErr(e.response?.data?.message || 'Erreur upload photo.');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => () => {
    if (cropImageSrc) URL.revokeObjectURL(cropImageSrc);
  }, [cropImageSrc]);

  if (loading) return <div className="profile-loading">Chargement...</div>;

  return (
    <div className="profile-page">
      {cropImageSrc && (
        <div className="profile-crop-modal" role="dialog" aria-modal="true" aria-label="Recadrer la photo">
          <div className="profile-crop-modal-backdrop" onClick={closeCropModal} />
          <div className="profile-crop-modal-content">
            <h3>Positionnez votre photo</h3>
            <p className="profile-crop-hint">Déplacez l’image et zoomez pour centrer comme vous voulez.</p>
            <div className="profile-crop-container">
              <Cropper
                image={cropImageSrc}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={setCrop}
                onCropComplete={onCropComplete}
                onZoomChange={setZoom}
              />
            </div>
            <div className="profile-crop-zoom">
              <label>Zoom</label>
              <input
                type="range"
                min={1}
                max={3}
                step={0.1}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
              />
            </div>
            <div className="profile-crop-actions">
              <button type="button" className="profile-crop-btn secondary" onClick={closeCropModal}>
                Annuler
              </button>
              <button
                type="button"
                className="profile-crop-btn primary"
                onClick={confirmCropAndUpload}
                disabled={saving || !croppedAreaPixels}
              >
                {saving ? 'Envoi...' : 'Valider et enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="profile-page-header">
        <h1>Mon profil</h1>
      </div>
      <div className="profile-header card">
        <div className="profile-avatar-wrap">
          {profile.profilePicture ? <img src={profile.profilePicture} alt="Profil" className="profile-avatar" /> : <div className="profile-avatar-fallback">{initials}</div>}
          <div
            className={`profile-dropzone ${dragOver ? 'drag-over' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); uploadPicture(e.dataTransfer.files?.[0]); }}
          >
            <input
              id="profile-upload-input"
              type="file"
              accept=".jpg,.jpeg,.png,.webp,image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) uploadPicture(file);
                e.target.value = '';
              }}
            />
            <label htmlFor="profile-upload-input">Glisser-déposer ou cliquer pour changer la photo</label>
          </div>
        </div>
        <div>
          <p><strong>{profile.name}</strong> — {profile.role}</p>
          <p className="muted">Compte créé le {profile.createdAt ? new Date(profile.createdAt).toLocaleDateString('fr-FR') : '—'} • Dernière connexion {profile.lastLoginAt ? new Date(profile.lastLoginAt).toLocaleString('fr-FR') : '—'}</p>
        </div>
      </div>

      {msg ? <div className="profile-msg success">{msg}</div> : null}
      {err ? <div className="profile-msg error">{err}</div> : null}

      <form className="card profile-form" onSubmit={handleProfileSave}>
        <h3>Informations personnelles</h3>
        <div className="grid">
          <label>Prénom<input value={profile.firstName} onChange={(e) => setProfile((p) => ({ ...p, firstName: e.target.value }))} /></label>
          <label>Nom<input value={profile.lastName} onChange={(e) => setProfile((p) => ({ ...p, lastName: e.target.value }))} /></label>
          <label>Nom affiché<input value={profile.name} onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))} /></label>
          <label>Téléphone<input value={profile.phone} onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))} /></label>
          <label>Poste / Fonction<input value={profile.jobTitle} onChange={(e) => setProfile((p) => ({ ...p, jobTitle: e.target.value }))} /></label>
          <label>Rôle<input value={profile.role} disabled /></label>
        </div>
        <label>Signature (optionnel)<textarea rows={3} value={profile.signature} onChange={(e) => setProfile((p) => ({ ...p, signature: e.target.value }))} /></label>
        <button type="submit" disabled={saving}>{saving ? 'Enregistrement...' : 'Enregistrer le profil'}</button>
      </form>

      <form className="card profile-form" onSubmit={handleEmailChange}>
        <h3>Changer l'email (avec vérification)</h3>
        <div className="grid">
          <label>Email actuel<input value={profile.email} disabled /></label>
          <label>Nouvel email<input type="email" value={emailForm.newEmail} onChange={(e) => setEmailForm((f) => ({ ...f, newEmail: e.target.value }))} required /></label>
          <label>Mot de passe actuel<input type="password" value={emailForm.currentPassword} onChange={(e) => setEmailForm((f) => ({ ...f, currentPassword: e.target.value }))} required /></label>
        </div>
        <button type="submit" disabled={saving}>{saving ? 'Traitement...' : 'Demander changement email'}</button>
      </form>

      <form className="card profile-form" onSubmit={handlePasswordChange}>
        <h3>Changer le mot de passe</h3>
        <div className="grid">
          <label>Ancien mot de passe<input type="password" value={passwordForm.currentPassword} onChange={(e) => setPasswordForm((f) => ({ ...f, currentPassword: e.target.value }))} required /></label>
          <label>Nouveau mot de passe<input type="password" value={passwordForm.newPassword} onChange={(e) => setPasswordForm((f) => ({ ...f, newPassword: e.target.value }))} required /></label>
          <label>Confirmation<input type="password" value={passwordForm.confirmPassword} onChange={(e) => setPasswordForm((f) => ({ ...f, confirmPassword: e.target.value }))} required /></label>
        </div>
        <label className="checkbox">
          <input type="checkbox" checked={passwordForm.logoutOtherSessions} onChange={(e) => setPasswordForm((f) => ({ ...f, logoutOtherSessions: e.target.checked }))} />
          Déconnecter les autres sessions
        </label>
        <button type="submit" disabled={saving}>{saving ? 'Traitement...' : 'Mettre à jour le mot de passe'}</button>
      </form>
    </div>
  );
};

export default ProfilePage;
