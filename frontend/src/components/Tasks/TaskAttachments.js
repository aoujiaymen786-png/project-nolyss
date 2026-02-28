import React, { useState, useCallback } from 'react';
import API from '../../utils/api';
import { notify } from '../../utils/notify';
import FileUploader from '../UI/FileUploader';

const TaskAttachments = ({ taskId, attachments, onUpload }) => {
  const [uploading, setUploading] = useState(false);
  const [uploadKey, setUploadKey] = useState(0);

  const handleFiles = useCallback(async (files) => {
    if (!files?.length) return;
    setUploading(true);
    try {
      for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);
        const { data } = await API.post(`/upload/tasks/${taskId}/attachments`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        onUpload(data);
      }
      notify.success(files.length > 1 ? `${files.length} fichiers ajoutés` : 'Fichier ajouté');
      setUploadKey((k) => k + 1);
    } catch (err) {
      notify.error(err.response?.data?.message || 'Erreur lors de l\'upload');
    } finally {
      setUploading(false);
    }
  }, [taskId, onUpload]);

  return (
    <div className="task-attachments">
      <h4>Pièces jointes</h4>
      {attachments && attachments.length > 0 && (
        <ul className="task-attachments-list">
          {attachments.map((att, idx) => (
            <li key={att.url || idx}>
              <a href={att.url} target="_blank" rel="noopener noreferrer">{att.name || 'Fichier'}</a>
            </li>
          ))}
        </ul>
      )}
      <FileUploader
        key={uploadKey}
        onFiles={handleFiles}
        options={{ multiple: true, maxFiles: 5 }}
        showPreview={true}
      />
      {uploading && <p className="task-attachments-loading">Envoi en cours…</p>}
    </div>
  );
};

export default TaskAttachments;