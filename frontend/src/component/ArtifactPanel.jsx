import { useState } from 'react'
import '../style/ArtifactPanel.css'

const HTML_LANGUAGES = new Set(['html', 'htm', 'xhtml'])

function createSafeHtmlDocument(code) {
  const contentSecurityPolicy = `<meta http-equiv="Content-Security-Policy" content="${[
    "default-src 'none'",
    "script-src 'unsafe-inline' 'unsafe-eval' https://cdnjs.cloudflare.com https://cdn.jsdelivr.net https://unpkg.com https://cdn.tailwindcss.com",
    "connect-src 'none'",
    "style-src 'unsafe-inline' https://cdnjs.cloudflare.com https://cdn.jsdelivr.net https://unpkg.com",
    "img-src data:",
    "font-src data:",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'none'",
    "frame-src 'none'",
  ].join('; ')}">`

  let documentContent
  if (/<html[\s>]/i.test(code)) {
    documentContent = /<head\b[^>]*>/i.test(code)
      ? code.replace(/<head\b([^>]*)>/i, `<head$1>${contentSecurityPolicy}`)
      : code.replace(/<html\b([^>]*)>/i, `<html$1><head>${contentSecurityPolicy}</head>`)
  } else {
    documentContent = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    ${contentSecurityPolicy}
    <meta name="viewport" content="width=device-width, initial-scale=1">
  </head>
  <body>${code}</body>
</html>`
  }

  return documentContent
}

function canRenderHtml(artifact) {
  return HTML_LANGUAGES.has(artifact.language)
    || artifact.language === 'svg'
    || /<!doctype\s+html|<html[\s>]|<body[\s>]|<svg[\s>]/i.test(artifact.code)
}

function ArtifactPanel({
  artifact,
  activeTab,
  onTabChange,
  onClose,
  onResizeStart,
  onResizeBy,
}) {
  const [copyStatus, setCopyStatus] = useState('')
  const canPreview = canRenderHtml(artifact)

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(artifact.code)
      setCopyStatus('Code copied')
    } catch (error) {
      console.error('Unable to copy artifact code:', error)
      setCopyStatus('Copy failed')
    }
  }

  return (
    <aside id="artifact-panel" className="artifact-panel" aria-label="Artifacts">
      <div
        className="artifact-resize-handle"
        role="separator"
        aria-label="Resize artifact panel"
        aria-orientation="vertical"
        tabIndex={0}
        onPointerDown={(event) => {
          event.preventDefault()
          onResizeStart()
        }}
        onKeyDown={(event) => {
          if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
            event.preventDefault()
            onResizeBy(event.key === 'ArrowLeft' ? 32 : -32)
          }
        }}
      />
      <header className="artifact-header">
        <div>
          <p className="artifact-eyebrow">WORKSPACE</p>
          <h2>Artifacts</h2>
        </div>
        <button className="artifact-close" type="button" aria-label="Close artifact panel" onClick={onClose}>
          ×
        </button>
      </header>

      <div className="artifact-tabs" role="tablist" aria-label="Artifact view">
        <button
          id="artifact-code-tab"
          className={activeTab === 'code' ? 'active' : ''}
          type="button"
          role="tab"
          aria-selected={activeTab === 'code'}
          aria-controls="artifact-panel-content"
          onClick={() => onTabChange('code')}
        >
          <span aria-hidden="true">{'{ }'}</span>
          Code
        </button>
        <button
          id="artifact-preview-tab"
          className={activeTab === 'preview' ? 'active' : ''}
          type="button"
          role="tab"
          aria-selected={activeTab === 'preview'}
          aria-controls="artifact-panel-content"
          onClick={() => onTabChange('preview')}
        >
          <span aria-hidden="true">◫</span>
          Preview
        </button>
      </div>

      <div
        id="artifact-panel-content"
        className="artifact-content"
        role="tabpanel"
        aria-labelledby={activeTab === 'code' ? 'artifact-code-tab' : 'artifact-preview-tab'}
      >
        {activeTab === 'code' ? (
          <div className="artifact-code">
            <div className="artifact-file">
              <span className="artifact-file-dot" />
              <span>{artifact.name}</span>
              <span className="artifact-safe-label">Source only</span>
              <button
                className="artifact-copy-button"
                type="button"
                onClick={handleCopyCode}
                aria-label="Copy artifact code"
                title="Copy code"
              >
                <svg viewBox="0 0 20 20" aria-hidden="true">
                  <rect x="7" y="7" width="9" height="10" rx="1.5" />
                  <path d="M13 7V5.5A1.5 1.5 0 0 0 11.5 4h-6A1.5 1.5 0 0 0 4 5.5v7A1.5 1.5 0 0 0 5.5 14H7" />
                </svg>
                Copy
              </button>
            </div>
            {copyStatus && <p className="artifact-copy-status" role="status">{copyStatus}</p>}
            <pre><code>{artifact.code}</code></pre>
          </div>
        ) : canPreview ? (
          <div className="artifact-preview">
            <p className="artifact-safety-note">
                      Isolated preview · approved CDN scripts can run; network requests and browser storage are blocked
            </p>
            <iframe
              title="Isolated HTML artifact preview"
              sandbox="allow-scripts"
              srcDoc={createSafeHtmlDocument(artifact.code)}
            />
          </div>
        ) : (
          <div className="artifact-empty">
            <span className="artifact-empty-icon" aria-hidden="true">◫</span>
            <h3>Preview unavailable</h3>
            <p>
              The latest artifact is {artifact.language || 'code'}, not HTML. It is shown as source
              only and is never executed.
            </p>
          </div>
        )}
      </div>
    </aside>
  )
}

export default ArtifactPanel
