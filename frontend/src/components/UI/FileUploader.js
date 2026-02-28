import React, { useState, useRef } from 'react';
import './FileUploader.css';

/**
 * Uploader de fichiers avec drag & drop, prévisualisation et liste.
 * @param {Function} onFiles - (files: File[]) => void - appelé à chaque ajout/suppression
 * @param {Object} options - { accept, maxSize, maxFiles, multiple }
 * @param {boolean} showPreview - afficher les miniatures (défaut: true)
 */
const FileUploader = ({ onFiles, options = {}, showPreview = true }) => {
  const { accept, maxSize, maxFiles = 10, multiple = true } = options;
  const [files, setFiles] = useState([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  const validate = (newFiles) => {
    const list = Array.from(multiple ? newFiles : [newFiles].filter(Boolean));
    if (list.length + files.length > maxFiles) {
      setError(`Maximum ${maxFiles} fichier(s).`);
      return [];
    }
    if (maxSize) {
      const invalid = list.filter((f) => f.size > maxSize);
      if (invalid.length) {
        setError(`Fichier(s) trop volumineux (max ${Math.round(maxSize / 1024)} Ko).`);
        return [];
      }
    }
    setError('');
    return list;
  };

  const addFiles = (newFiles) => {
    const valid = validate(newFiles);
    if (valid.length === 0) return;
    const updated = [...files, ...valid].slice(0, maxFiles);
    setFiles(updated);
    onFiles?.(valid);
  };

  const removeFile = (index) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    addFiles(e.dataTransfer.files);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleChange = (e) => {
    addFiles(e.target.files || []);
    e.target.value = '';
  };

  const getPreview = (file) => {
    if (!file.type.startsWith('image/')) return null;
    return URL.createObjectURL(file);
  };

  return (
    <div className="file-uploader">
      <div
        className={`file-uploader-dropzone ${isDragOver ? 'file-uploader-dropzone--active' : ''}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        aria-label="Déposer des fichiers ou cliquer pour sélectionner"
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ' ? (e.preventDefault(), inputRef.current?.click()) : null)}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleChange}
          className="file-uploader-input"
          aria-hidden="true"
        />
        <div className="file-uploader-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
        </div>
        <span className="file-uploader-text">
          Glissez-déposez des fichiers ici ou <strong>cliquez pour parcourir</strong>
        </span>
        <span className="file-uploader-hint">
          {accept ? `Types acceptés : ${accept}` : 'Tous types'} • Max {maxFiles} fichier(s)
          {maxSize ? ` • ${Math.round(maxSize / 1024)} Ko max` : ''}
        </span>
      </div>
      {error && <p className="file-uploader-error" role="alert">{error}</p>}
      {showPreview && files.length > 0 && (
        <ul className="file-uploader-list">
          {files.map((file, i) => (
            <FilePreview
              key={`${file.name}-${i}`}
              file={file}
              onRemove={() => removeFile(i)}
            />
          ))}
        </ul>
      )}
    </div>
  );
};

const FilePreview = ({ file, onRemove }) => {
  const [preview, setPreview] = useState(null);

  React.useEffect(() => {
    if (file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setPreview(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [file]);

  const size = file.size < 1024 ? `${file.size} o` : `${(file.size / 1024).toFixed(1)} Ko`;

  return (
    <li className="file-uploader-item">
      <div className="file-uploader-item-preview">
        {preview ? (
          <img src={preview} alt="" />
        ) : (
          <div className="file-uploader-item-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
          </div>
        )}
      </div>
      <div className="file-uploader-item-info">
        <span className="file-uploader-item-name">{file.name}</span>
        <span className="file-uploader-item-size">{size}</span>
      </div>
      <button
        type="button"
        className="file-uploader-item-remove"
        onClick={(e) => { e.stopPropagation(); onRemove(); }}
        aria-label="Supprimer"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </li>
  );
};

export default FileUploader;
