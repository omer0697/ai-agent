import { useState, useRef, useEffect } from 'react'
import { streamChat, saveFileContent } from '../api/index.js'

function parseFileEdits(text) {
  const edits = []
  const regex = /<file_edit\s+path="([^"]+)">([\s\S]*?)<\/file_edit>/g
  let match
  while ((match = regex.exec(text)) !== null) {
    edits.push({ path: match[1].trim(), content: match[2].trim() })
  }
  return edits
}

function renderMarkdown(text) {
  if (!text) return null
  const CODE_BLOCK = /```(\w*)\n?([\s\S]*?)```/g
  const segments = []
  let last = 0
  let m

  while ((m = CODE_BLOCK.exec(text)) !== null) {
    if (m.index > last) segments.push({ t: 'text', v: text.slice(last, m.index) })
    segments.push({ t: 'code', lang: m[1] || '', v: m[2].replace(/\n$/, '') })
    last = m.index + m[0].length
  }
  if (last < text.length) segments.push({ t: 'text', v: text.slice(last) })

  return segments.map((s, i) => {
    if (s.t === 'code') {
      return (
        <div key={i} className="md-code-block">
          <div className="md-code-header">
            <span className="md-code-lang">{s.lang || 'code'}</span>
          </div>
          <pre className="md-code-body">{s.v}</pre>
        </div>
      )
    }
    const inlineParts = s.v.split(/(`[^`\n]+`)/g)
    const content = inlineParts.map((p, k) =>
      p.match(/^`[^`]+`$/)
        ? <code key={k} className="md-inline-code">{p.slice(1, -1)}</code>
        : p
    )
    return <span key={i} className="md-text">{content}</span>
  })
}

function TypingDots() {
  return (
    <div className="typing-dots">
      <span /><span /><span />
    </div>
  )
}

function Message({ msg, onApplyEdit, isStreaming }) {
  const edits = msg.role === 'assistant' ? parseFileEdits(msg.content) : []
  const [applying, setApplying] = useState({})
  const [applied, setApplied] = useState({})

  const displayContent = msg.content.replace(
    /<file_edit\s+path="[^"]+">([\s\S]*?)<\/file_edit>/g, ''
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

  const isUser = msg.role === 'user'

  return (
    <div className={`msg msg-${msg.role}`}>
      <div className="msg-avatar">{isUser ? 'S' : 'AI'}</div>
      <div className="msg-body">
        {isUser ? (
          <div className="msg-bubble-user">{displayContent}</div>
        ) : (
          <div className="msg-bubble-ai">
            {displayContent === '' && isStreaming
              ? <TypingDots />
              : <div className="msg-markdown">{renderMarkdown(displayContent)}</div>
            }
          </div>
        )}
        {edits.map((edit, idx) => (
          <div className="edit-block" key={idx}>
            <div className="edit-header">
              <span className="edit-path-icon">📄</span>
              <span className="edit-path">{edit.path}</span>
              <button
                className={`btn-apply ${applied[idx] ? 'applied' : ''}`}
                onClick={() => handleApply(edit, idx)}
                disabled={applying[idx] || applied[idx]}
              >
                {applied[idx] ? '✓ Uygulandı' : applying[idx] ? '⟳ Uygulanıyor' : '↓ Uygula'}
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
  const textareaRef = useRef(null)

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
    textareaRef.current?.focus()

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
            <div className="chat-empty-icon">✦</div>
            <p>Kod hakkında soru sor veya değişiklik talep et.</p>
            {contextFiles?.length > 0 && (
              <p className="chat-context-info">{contextFiles.length} dosya bağlama eklendi</p>
            )}
          </div>
        )}
        {messages.map((msg, i) => (
          <Message
            key={i}
            msg={msg}
            isStreaming={streaming && i === messages.length - 1}
          />
        ))}
        {error && <div className="chat-error">{error}</div>}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input-area">
        {contextFiles?.length > 0 && (
          <div className="context-chips">
            {contextFiles.map((f, i) => (
              <span key={i} className="context-chip">
                {f.path.split(/[/\\]/).pop()}
              </span>
            ))}
          </div>
        )}
        <div className="chat-input-row">
          <textarea
            ref={textareaRef}
            className="chat-input"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                sendMessage()
              }
            }}
            placeholder="Mesajınızı yazın… (Enter gönder · Shift+Enter satır)"
            rows={3}
            disabled={streaming}
          />
          <button
            className={streaming ? 'btn-stop' : 'btn-send'}
            onClick={streaming ? handleStop : sendMessage}
            disabled={!streaming && !input.trim()}
          >
            {streaming ? '■' : '↑'}
          </button>
        </div>
      </div>
    </div>
  )
}
