import { useState, useRef, useEffect } from 'react'
import { streamChat, saveFileContent } from '../api/index.js'

// ---- localStorage helpers ----
const LS_KEY = 'ai-agent-conversations'

function loadConversations() {
  try { return JSON.parse(localStorage.getItem(LS_KEY)) || [] } catch { return [] }
}

function persistConversations(convs) {
  localStorage.setItem(LS_KEY, JSON.stringify(convs))
}

function newConv(messages = []) {
  return {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2),
    title: 'Yeni sohbet',
    messages,
    savedAt: new Date().toISOString()
  }
}

// ---- Markdown renderer ----
function renderMarkdown(text) {
  if (!text) return null
  const CODE_BLOCK = /```(\w*)\n?([\s\S]*?)```/g
  const segments = []
  let last = 0, m

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
    const parts = s.v.split(/(`[^`\n]+`)/g)
    const content = parts.map((p, k) =>
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

// ---- File edit block ----
function parseFileEdits(text) {
  const edits = []
  const regex = /<file_edit\s+path="([^"]+)">([\s\S]*?)<\/file_edit>/g
  let match
  while ((match = regex.exec(text)) !== null) {
    edits.push({ path: match[1].trim(), content: match[2].trim() })
  }
  return edits
}

function Message({ msg, isStreaming }) {
  const edits = msg.role === 'assistant' ? parseFileEdits(msg.content) : []
  const [applying, setApplying] = useState({})
  const [applied, setApplied] = useState({})

  const displayContent = msg.content
    .replace(/<file_edit\s+path="[^"]+">([\s\S]*?)<\/file_edit>/g, '')
    .trim()

  async function handleApply(edit, idx) {
    setApplying(prev => ({ ...prev, [idx]: true }))
    try {
      await saveFileContent(edit.path, edit.content)
      setApplied(prev => ({ ...prev, [idx]: true }))
    } catch (err) {
      alert('Dosya kaydedilemedi: ' + err.message)
    } finally {
      setApplying(prev => ({ ...prev, [idx]: false }))
    }
  }

  return (
    <div className={`msg msg-${msg.role}`}>
      <div className="msg-avatar">{msg.role === 'user' ? 'S' : 'AI'}</div>
      <div className="msg-body">
        {msg.role === 'user' ? (
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

// ---- Conversation history panel ----
function ConvHistory({ conversations, activeId, onSelect, onDelete, onClose }) {
  return (
    <div className="conv-history">
      <div className="conv-history-header">
        <span>Sohbet Geçmişi</span>
        <button className="conv-close" onClick={onClose}>✕</button>
      </div>
      {conversations.length === 0 && (
        <div className="conv-empty">Henüz kaydedilmiş sohbet yok.</div>
      )}
      {[...conversations].reverse().map(conv => (
        <div
          key={conv.id}
          className={`conv-item ${conv.id === activeId ? 'active' : ''}`}
          onClick={() => { onSelect(conv); onClose() }}
        >
          <div className="conv-item-title">{conv.title}</div>
          <div className="conv-item-meta">
            {conv.messages.length} mesaj · {new Date(conv.savedAt).toLocaleDateString('tr-TR')}
          </div>
          <button
            className="conv-delete"
            onClick={e => { e.stopPropagation(); onDelete(conv.id) }}
            title="Sil"
          >✕</button>
        </div>
      ))}
    </div>
  )
}

// ---- Main ChatPanel ----
export default function ChatPanel({ session, contextFiles }) {
  const [conversations, setConversations] = useState(() => loadConversations())
  const [activeConv, setActiveConv] = useState(() => {
    const saved = loadConversations()
    return saved.length > 0 ? saved[saved.length - 1] : newConv()
  })
  const [messages, setMessages] = useState(() => {
    const saved = loadConversations()
    return saved.length > 0 ? saved[saved.length - 1].messages : []
  })
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [error, setError] = useState('')
  const [showHistory, setShowHistory] = useState(false)
  const messagesEndRef = useRef(null)
  const stopRef = useRef(null)
  const textareaRef = useRef(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function saveConv(msgs, conv) {
    const title = msgs.find(m => m.role === 'user')?.content.slice(0, 48) || 'Yeni sohbet'
    const updated = { ...conv, title, messages: msgs, savedAt: new Date().toISOString() }
    setActiveConv(updated)
    setConversations(prev => {
      const filtered = prev.filter(c => c.id !== updated.id)
      const next = [...filtered, updated]
      persistConversations(next)
      return next
    })
    return updated
  }

  function handleNewConv() {
    const conv = newConv()
    setActiveConv(conv)
    setMessages([])
    setInput('')
    setError('')
    setShowHistory(false)
  }

  function handleSelectConv(conv) {
    setActiveConv(conv)
    setMessages(conv.messages)
    setError('')
    setShowHistory(false)
  }

  function handleDeleteConv(id) {
    setConversations(prev => {
      const next = prev.filter(c => c.id !== id)
      persistConversations(next)
      if (activeConv.id === id) {
        const fallback = next.length > 0 ? next[next.length - 1] : newConv()
        setActiveConv(fallback)
        setMessages(fallback.messages)
      }
      return next
    })
  }

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

    const newMsgs = [...messages, userMsg]
    setMessages(newMsgs)
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
      onDone: () => {
        setStreaming(false)
        setMessages(prev => {
          saveConv(prev, activeConv)
          return prev
        })
      },
      onError: err => {
        setError(err.message)
        setStreaming(false)
        setMessages(prev => {
          const filtered = prev.filter(m => m.content !== '')
          saveConv(filtered, activeConv)
          return filtered
        })
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
      {/* Conversation header */}
      <div className="conv-toolbar">
        <button className="conv-btn-history" onClick={() => setShowHistory(v => !v)}>
          ☰ Geçmiş
        </button>
        <span className="conv-title">{activeConv.title}</span>
        <button className="conv-btn-new" onClick={handleNewConv}>＋ Yeni</button>
      </div>

      {showHistory && (
        <ConvHistory
          conversations={conversations}
          activeId={activeConv.id}
          onSelect={handleSelectConv}
          onDelete={handleDeleteConv}
          onClose={() => setShowHistory(false)}
        />
      )}

      {/* Messages */}
      <div className="chat-messages">
        {messages.length === 0 && (
          <div className="chat-empty">
            <div className="chat-empty-icon">✦</div>
            <p>Kod soruları, sohbet, ya da dosya değişiklikleri — her şeyi sorabilirsin.</p>
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

      {/* Input */}
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
            placeholder="Bir şeyler sor… (Enter gönder · Shift+Enter satır)"
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
