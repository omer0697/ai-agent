import { useState, useRef, useEffect } from 'react'
import { streamChat } from '../api/index.js'
import { saveFileContent } from '../api/index.js'

function parseFileEdits(text) {
  const edits = []
  const regex = /<file_edit\s+path="([^"]+)">([\s\S]*?)<\/file_edit>/g
  let match
  while ((match = regex.exec(text)) !== null) {
    edits.push({ path: match[1].trim(), content: match[2].trim() })
  }
  return edits
}

function Message({ msg, onApplyEdit }) {
  const edits = msg.role === 'assistant' ? parseFileEdits(msg.content) : []
  const [applying, setApplying] = useState({})
  const [applied, setApplied] = useState({})

  const displayContent = msg.content.replace(
    /<file_edit\s+path="[^"]+">([\s\S]*?)<\/file_edit>/g,
    ''
  ).trim()

  async function handleApply(edit, idx) {
    setApplying(prev => ({ ...prev, [idx]: true }))
    try {
      await saveFileContent(edit.path, edit.content)
      setApplied(prev => ({ ...prev, [idx]: true }))
      onApplyEdit?.(edit)
    } catch (err) {
      alert('Dosya kaydedilemedi: ' + err.message)
    } finally {
      setApplying(prev => ({ ...prev, [idx]: false }))
    }
  }

  return (
    <div className={`message message-${msg.role}`}>
      <div className="message-role">{msg.role === 'user' ? 'Sen' : 'AI'}</div>
      <div className="message-content">
        {displayContent && <pre className="message-text">{displayContent}</pre>}
        {edits.map((edit, idx) => (
          <div className="edit-block" key={idx}>
            <div className="edit-header">
              <span className="edit-path">{edit.path}</span>
              <button
                className={`btn-apply ${applied[idx] ? 'applied' : ''}`}
                onClick={() => handleApply(edit, idx)}
                disabled={applying[idx] || applied[idx]}
              >
                {applied[idx] ? '✓ Uygulandı' : applying[idx] ? 'Uygulanıyor...' : 'Dosyaya Uygula'}
              </button>
            </div>
            <pre className="edit-content">{edit.content}</pre>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function ChatPanel({ session, contextFiles }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [error, setError] = useState('')
  const messagesEndRef = useRef(null)
  const stopRef = useRef(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function buildSystemPrompt() {
    if (!contextFiles || contextFiles.length === 0) return null
    const filesSection = contextFiles.map(f =>
      `<file path="${f.path}">\n${f.content}\n</file>`
    ).join('\n')
    return `Sen bir kod asistanısın. Aşağıdaki dosyalara erişimin var:\n\n<files>\n${filesSection}\n</files>\n\nDosya değişikliği önermek için şu formatı kullan:\n<file_edit path="dosya/yolu">\n[dosyanın tam yeni içeriği]\n</file_edit>`
  }

  async function sendMessage() {
    if (!input.trim() || streaming) return
    const userMsg = { role: 'user', content: input.trim() }
    setInput('')
    setError('')

    const systemPrompt = buildSystemPrompt()
    const apiMessages = []
    if (systemPrompt) apiMessages.push({ role: 'system', content: systemPrompt })
    apiMessages.push(...messages, userMsg)

    setMessages(prev => [...prev, userMsg])
    setStreaming(true)

    let assistantContent = ''
    setMessages(prev => [...prev, { role: 'assistant', content: '' }])

    const stop = streamChat({
      token: session.token,
      baseUrl: session.baseUrl,
      chatPath: session.chatPath,
      model: session.model,
      messages: apiMessages,
      onChunk: chunk => {
        assistantContent += chunk
        setMessages(prev => {
          const updated = [...prev]
          updated[updated.length - 1] = { role: 'assistant', content: assistantContent }
          return updated
        })
      },
      onDone: () => setStreaming(false),
      onError: err => {
        setError(err.message)
        setStreaming(false)
        setMessages(prev => prev.filter(m => m.content !== ''))
      }
    })
    stopRef.current = stop
  }

  function handleStop() {
    stopRef.current?.()
    setStreaming(false)
  }

  return (
    <div className="chat-panel">
      <div className="chat-messages">
        {messages.length === 0 && (
          <div className="chat-empty">
            <p>Kod hakkında soru sor veya değişiklik talep et.</p>
            {contextFiles?.length > 0 && (
              <p className="chat-context-info">{contextFiles.length} dosya bağlama eklendi</p>
            )}
          </div>
        )}
        {messages.map((msg, i) => (
          <Message key={i} msg={msg} />
        ))}
        {error && <div className="chat-error">{error}</div>}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input-area">
        {contextFiles?.length > 0 && (
          <div className="context-badge">{contextFiles.length} dosya bağlamda</div>
        )}
        <div className="chat-input-row">
          <textarea
            className="chat-input"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                sendMessage()
              }
            }}
            placeholder="Mesajınızı yazın... (Enter: gönder, Shift+Enter: satır)"
            rows={3}
            disabled={streaming}
          />
          <button
            className={streaming ? 'btn-stop' : 'btn-send'}
            onClick={streaming ? handleStop : sendMessage}
            disabled={!streaming && !input.trim()}
          >
            {streaming ? '■ Durdur' : '▶ Gönder'}
          </button>
        </div>
      </div>
    </div>
  )
}
