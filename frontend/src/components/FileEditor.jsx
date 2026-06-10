import { useState, useEffect } from 'react'
import { saveFileContent } from '../api/index.js'

export default function FileEditor({ file, onSaved }) {
  const [content, setContent] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (file) {
      setContent(file.content)
      setSaved(false)
      setError('')
    }
  }, [file])

  async function handleSave() {
    if (!file) return
    setSaving(true)
    setError('')
    try {
      await saveFileContent(file.path, content)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
      onSaved?.()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (!file) {
    return (
      <div className="editor-empty">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
          <line x1="16" y1="13" x2="8" y2="13"/>
          <line x1="16" y1="17" x2="8" y2="17"/>
          <polyline points="10 9 9 9 8 9"/>
        </svg>
        <p>Sol taraftan bir dosya seçin</p>
      </div>
    )
  }

  return (
    <div className="file-editor">
      <div className="editor-header">
        <span className="editor-filepath">{file.path}</span>
        <div className="editor-actions">
          {error && <span className="editor-error">{error}</span>}
          {saved && <span className="editor-saved">✓ Kaydedildi</span>}
          <button
            className="btn-save"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Kaydediliyor...' : 'Kaydet (Ctrl+S)'}
          </button>
        </div>
      </div>
      <textarea
        className="editor-textarea"
        value={content}
        onChange={e => setContent(e.target.value)}
        onKeyDown={e => {
          if (e.ctrlKey && e.key === 's') {
            e.preventDefault()
            handleSave()
          }
        }}
        spellCheck={false}
      />
    </div>
  )
}
