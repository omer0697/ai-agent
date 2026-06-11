import { useState } from 'react'
import { login } from '../api/index.js'

export default function Login({ onLogin }) {
  const [baseUrl, setBaseUrl] = useState('.com.tr')
  const [chatPath, setChatPath] = useState('/v1/chat/completions')
  const [model, setModel] = useState('gpt-4')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const data = await login(baseUrl, username, password)
      onLogin({ token: data.access_token, baseUrl, chatPath, model })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-container">
      <div className="login-box">
        <div className="login-logo">
          <div className="login-logo-icon">✦</div>
          <h1>AI Agent</h1>
        </div>
        <p className="login-subtitle">LLM Gateway ile bağlan</p>

        {error && <div className="error-box">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Gateway URL</label>
            <input
              type="text"
              value={baseUrl}
              onChange={e => setBaseUrl(e.target.value)}
              placeholder="https://..."
              required
            />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Chat Endpoint Path</label>
              <input
                type="text"
                value={chatPath}
                onChange={e => setChatPath(e.target.value)}
                placeholder="/v1/chat/completions"
                required
              />
            </div>
            <div className="form-group">
              <label>Model</label>
              <input
                type="text"
                value={model}
                onChange={e => setModel(e.target.value)}
                placeholder="gpt-4"
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Kullanıcı Adı</label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                autoComplete="username"
                required
              />
            </div>
            <div className="form-group">
              <label>Şifre</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>
          </div>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Bağlanıyor...' : 'Bağlan'}
          </button>
        </form>
      </div>
    </div>
  )
}
