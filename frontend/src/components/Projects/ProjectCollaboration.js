import React, { useState, useEffect } from 'react';
import API from '../../utils/api';
import './ProjectCollaboration.css';

const ProjectCollaboration = ({ projectId, project, onProjectUpdate }) => {
  const [commentText, setCommentText] = useState('');
  const [saving, setSaving] = useState(false);
  const comments = project?.comments || [];

  const refreshProject = async () => {
    try {
      const { data } = await API.get(`/projects/${projectId}`);
      onProjectUpdate?.(data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim() || saving) return;
    setSaving(true);
    try {
      await API.post(`/projects/${projectId}/comments`, { text: commentText.trim() });
      setCommentText('');
      await refreshProject();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="project-collaboration">
      <div className="project-collaboration-team collaboration-section">
        <h3>Membres de l'équipe</h3>
        {project?.team?.length > 0 ? (
          <ul className="collaboration-team-list">
            {project.team.map((m) => (
              <li key={m._id}>
                <span className="team-member-name">{m.name || m.email}</span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="collaboration-empty-block">
            <p className="muted">Aucun membre dans l'équipe. Modifiez le projet pour ajouter des membres.</p>
          </div>
        )}
      </div>

      <div className="project-collaboration-comments collaboration-section">
        <h3>Commentaires ({comments.length})</h3>
        <form onSubmit={handleAddComment} className="collaboration-comment-form">
          <textarea
            placeholder="Ajouter un commentaire..."
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            rows={3}
            className="collaboration-comment-input"
          />
          <button type="submit" className="btn btn-primary" disabled={saving || !commentText.trim()}>
            {saving ? 'Envoi...' : 'Publier'}
          </button>
        </form>
        <ul className="collaboration-comments-list">
          {comments.length === 0 ? (
            <li className="collaboration-empty-block muted">Aucun commentaire. Soyez le premier à commenter ci-dessous.</li>
          ) : (
            [...comments]
              .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
              .map((c, idx) => (
                <li key={idx} className="collaboration-comment-item">
                  <div className="collaboration-comment-header">
                    <span className="collaboration-comment-author">
                      {c.user?.name || 'Utilisateur'}
                    </span>
                    <span className="collaboration-comment-date">
                      {c.createdAt ? new Date(c.createdAt).toLocaleString('fr-FR') : ''}
                    </span>
                  </div>
                  <div className="collaboration-comment-text">{c.text}</div>
                </li>
              ))
          )}
        </ul>
      </div>
    </div>
  );
};

export default ProjectCollaboration;
