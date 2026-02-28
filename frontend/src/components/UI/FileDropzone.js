import React, { useState, useRef } from 'react';
import './FileDropzone.css';

/**
 * Zone de dépôt de fichiers (drag & drop) avec sélection au clic.
 * @param {Function} onFiles - (files: File[]) => void
 * @param {Object} options - { accept, maxSize, maxFiles, multiple }
 */
const FileDropzone = ({ onFiles, options = {} }) => {
  const { accept, maxSize, maxFiles = 10, multiple = true } = options;
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  const validate = (files) => {
    const list = Array.from(multiple ? files : [files].filter(Boolean));
    if (list.length > maxFiles) {
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

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const list = validate(e.dataTransfer.files);
    if (list.length) onFiles(list);
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
    const list = validate(e.target.files || []);
    if (list.length) onFiles(list);
    e.target.value = '';
  };

  return (
    <div
      className={`ui-filedropzone ${isDragOver ? 'ui-filedropzone--active' : ''}`}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={() => inputRef.current?.click()}
      role="button"
      tabIndex={0}
      aria-label="Déposer des fichiers ou cliquer pour sélectionner"
      onKeyDown={(e) => e.key === 'Enter' || e.key === ' ' ? (e.preventDefault(), inputRef.current?.click()) : null}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleChange}
        className="ui-filedropzone-input"
        aria-hidden="true"
      />
      <span className="ui-filedropzone-text">
        Glissez-déposez des fichiers ici ou <strong>cliquez pour parcourir</strong>
      </span>
      {error && <span className="ui-filedropzone-error" role="alert">{error}</span>}
    </div>
  );
};

export default FileDropzone;
