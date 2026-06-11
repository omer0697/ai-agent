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
        <div className="editor-empty-icon">📂</div>
        <p style={{ color: 'var(--text3)', fontSize: '13px' }}>Sol taraftan bir dosya seçin</p>
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
