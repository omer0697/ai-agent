import { useState } from 'react'

function TreeNode({ node, onSelect, selectedPath }) {
  const [expanded, setExpanded] = useState(false)
  const isSelected = selectedPath === node.path

  if (node.directory) {
    return (
      <div className="tree-node">
        <div
          className={`tree-item tree-dir ${expanded ? 'expanded' : ''}`}
          onClick={() => setExpanded(!expanded)}
        >
          <span className="tree-icon">{expanded ? '▾' : '▸'}</span>
          <span className="tree-name">{node.name}</span>
        </div>
        {expanded && node.children && (
          <div className="tree-children">
            {node.children.map(child => (
              <TreeNode
                key={child.path}
                node={child}
                onSelect={onSelect}
                selectedPath={selectedPath}
              />
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div
      className={`tree-node tree-item tree-file ${isSelected ? 'selected' : ''}`}
      onClick={() => onSelect(node)}
    >
      <span className="tree-icon">📄</span>
      <span className="tree-name">{node.name}</span>
    </div>
  )
}

export default function FileTree({ tree, onSelect, selectedPath }) {
  if (!tree) return <div className="tree-empty">Klasör seçilmedi</div>

  return (
    <div className="file-tree">
      <div className="tree-root-label">{tree.name}</div>
      {tree.children?.map(child => (
        <TreeNode
          key={child.path}
          node={child}
          onSelect={onSelect}
          selectedPath={selectedPath}
        />
      ))}
    </div>
  )
}
