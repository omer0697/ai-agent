import { useState } from 'react'
import Login from './components/Login.jsx'
import FileTree from './components/FileTree.jsx'
import FileEditor from './components/FileEditor.jsx'
import ChatPanel from './components/ChatPanel.jsx'
import { getFileTree, getFileContent } from './api/index.js'

export default function App() {
  const [session, setSession] = useState(null)
  const [workspacePath, setWorkspacePath] = useState('')
  const [fileTree, setFileTree] = useState(null)
  const [selectedFile, setSelectedFile] = useState(null)
  const [contextFiles, setContextFiles] = useState([])
  const [treeLoading, setTreeLoading] = useState(false)
  const [treeError, setTreeError] = useState('')

  async function loadWorkspace(path) {
    setTreeLoading(true)
    setTreeError('')
    try {
      const tree = await getFileTree(path)
      setFileTree(tree)
    } catch (err) {
      setTreeError(err.message)
    } finally {
      setTreeLoading(false)
    }
  }

  async function handleFileSelect(node) {
    if (node.directory) return
    try {
      const data = await getFileContent(node.path)
      setSelectedFile(data)
    } catch (err) {
      alert('Dosya okunamadı: ' + err.message)
    }
  }

  function toggleContext(file) {
    setContextFiles(prev => {
      const exists = prev.find(f => f.path === file.path)
      if (exists) return prev.filter(f => f.path !== file.path)
      return [...prev, file]
    })
  }

  if (!session) {
    return <Login onLogin={setSession} />
  }

  return (
    <div className="app-layout">
      {/* Sol sidebar - dosya ağacı */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <h2>Dosyalar</h2>
          <button
            className="btn-logout"
            onClick={() => { setSession(null); setFileTree(null); setSelectedFile(null); setContextFiles([]) }}
            title="Çıkış"
          >⏻</button>
        </div>

        <div className="workspace-input">
          <input
            type="text"
            value={workspacePath}
            onChange={e => setWorkspacePath(e.target.value)}
            placeholder="Klasör yolu: C:\proje"
            onKeyDown={e => e.key === 'Enter' && loadWorkspace(workspacePath)}
          />
          <button onClick={() => loadWorkspace(workspacePath)} disabled={treeLoading}>
            {treeLoading ? '...' : '→'}
          </button>
        </div>

        {treeError && <div className="tree-error">{treeError}</div>}

        <div className="tree-scroll">
          <FileTree
            tree={fileTree}
            onSelect={handleFileSelect}
            selectedPath={selectedFile?.path}
          />
        </div>

        {selectedFile && (
          <div className="context-toggle">
            <button
              className={contextFiles.find(f => f.path === selectedFile.path) ? 'btn-in-context' : 'btn-add-context'}
              onClick={() => toggleContext(selectedFile)}
            >
              {contextFiles.find(f => f.path === selectedFile.path)
                ? '− Bağlamdan çıkar'
                : '+ Bağlama ekle'}
            </button>
          </div>
        )}

        {contextFiles.length > 0 && (
          <div className="context-list">
            <div className="context-list-header">Bağlamdaki dosyalar ({contextFiles.length})</div>
            {contextFiles.map(f => (
              <div key={f.path} className="context-item">
                <span title={f.path}>{f.path.split(/[/\\]/).pop()}</span>
                <button onClick={() => toggleContext(f)}>×</button>
              </div>
            ))}
          </div>
        )}
      </aside>

      {/* Orta - dosya editörü */}
      <main className="editor-panel">
        <FileEditor
          file={selectedFile}
          onSaved={() => {
            // Bağlamı güncelle
            if (selectedFile) {
              setContextFiles(prev =>
                prev.map(f => f.path === selectedFile.path ? selectedFile : f)
              )
            }
          }}
        />
      </main>

      {/* Sağ - chat */}
      <aside className="chat-sidebar">
        <div className="chat-header">
          <h2>AI Chat</h2>
          <span className="model-badge">{session.model}</span>
        </div>
        <ChatPanel session={session} contextFiles={contextFiles} />
      </aside>
    </div>
  )
}
