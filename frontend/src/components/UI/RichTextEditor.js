import React, { useMemo } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import './RichTextEditor.css';

/**
 * Éditeur de texte riche WYSIWYG.
 * @param {string} value - Contenu HTML
 * @param {Function} onChange - (html: string) => void
 * @param {Object} props - placeholder, readOnly, minHeight, toolbar
 */
const RichTextEditor = ({
  value = '',
  onChange,
  placeholder = 'Saisissez votre texte...',
  readOnly = false,
  minHeight = 180,
  toolbar = 'full',
  className = '',
  ...rest
}) => {
  const modules = useMemo(
    () => ({
      toolbar: toolbar === 'full'
        ? [
            [{ header: [1, 2, 3, false] }],
            ['bold', 'italic', 'underline', 'strike'],
            [{ color: [] }, { background: [] }],
            [{ list: 'ordered' }, { list: 'bullet' }],
            [{ align: [] }],
            ['link', 'image'],
            ['clean'],
          ]
        : toolbar === 'minimal'
        ? [['bold', 'italic', 'underline'], ['link'], ['clean']]
        : false,
    }),
    [toolbar]
  );

  const formats = [
    'header',
    'bold', 'italic', 'underline', 'strike',
    'color', 'background',
    'list', 'bullet',
    'align',
    'link', 'image',
  ];

  return (
    <div className={`rich-text-editor ${className}`} style={{ '--editor-min-height': `${minHeight}px` }}>
      <ReactQuill
        theme="snow"
        value={value}
        onChange={onChange}
        modules={modules}
        formats={formats}
        placeholder={placeholder}
        readOnly={readOnly}
        {...rest}
      />
    </div>
  );
};

export default RichTextEditor;
