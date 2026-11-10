import { useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { BrandMark, UserAvatar } from './WorkspacePrimitives.jsx'
import { extractCodeArtifacts } from './artifactUtils.js'
import { showErrorToast } from '../../utils/toast.js'
import '../style/Chat.css'

const prompts = [
  {
    icon: '✎',
    title: 'Write anything',
    description: 'Draft, rewrite, or polish your words',
    prompt: 'Help me write a clear, engaging introduction for my next project.',
    color: 'lavender',
  },
  {
    icon: '⌁',
    title: 'Make a plan',
    description: 'Turn a big goal into small steps',
    prompt: 'Help me break a big goal into a simple, actionable plan.',
    color: 'mint',
  },
  {
    icon: '✧',
    title: 'Learn something',
    description: 'Get a simple answer to a big question',
    prompt: 'Explain a complex topic in a simple, easy-to-understand way.',
    color: 'peach',
  },
  {
    icon: '⌕',
    title: 'Explore an idea',
    description: 'Brainstorm and think out loud',
    prompt: 'Help me brainstorm some fresh ideas for a project.',
    color: 'blue',
  },
]

// NEW: attachment limits
const MAX_FILES = 3
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB
const ALLOWED_EXTENSIONS = ['pdf', 'ppt', 'pptx']

// NEW: finds links to .pdf / .ppt / .pptx files inside the AI message
const FILE_LINK = /\[([^\]]*)\]\((https?:\/\/[^\s)]+?\.(pdf|pptx?))(\?[^\s)]*)?\)/gi

function extractFileLinks(content = '') {
  const files = []
  for (const match of content.matchAll(FILE_LINK)) {
    const url = match[2] + (match[4] || '')
    const type = match[3].toLowerCase() === 'pdf' ? 'pdf' : 'ppt'
    const lastPart = decodeURIComponent(match[2].split('/').pop())
    // remove the timestamp that the backend adds: name-1731234567890.pdf
    const name = lastPart.replace(/-\d{10,}(?=\.\w+$)/, '')
    files.push({ url, type, name })
  }
  return files
}

// NEW: remove those links from the text, so they are not shown twice
function stripFileLinks(content = '') {
  return content.replace(FILE_LINK, '').replace(/\n{3,}/g, '\n\n').trim()
}

function Chat({
  user,
  initials,
  firstName,
  activeConversation,
  message,
  setMessage,
  messages,
  isSending,
  isLoadingMessages,
  isRateLimited,
  onSendMessage,
  onEditMessage,
  isEditingMessage,
  onCancelEdit,
  onOpenArtifact,
}) {
  const [copiedMessageIndex, setCopiedMessageIndex] = useState(null)
  const [copyErrorIndex, setCopyErrorIndex] = useState(null)
  const chatContentRef = useRef(null)
  const composerRef = useRef(null)
  const copyStatusTimeoutRef = useRef(null)

  // NEW: attachment state
  const [attachedFiles, setAttachedFiles] = useState([])
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef(null)

  useEffect(() => () => {
    window.clearTimeout(copyStatusTimeoutRef.current)
  }, [])

  useEffect(() => {
    const chatContent = chatContentRef.current
    if (!chatContent) return

    chatContent.scrollTo({
      top: chatContent.scrollHeight,
      behavior: 'smooth',
    })
  }, [messages, isSending])

  useEffect(() => {
    const composer = composerRef.current
    if (!composer) return

    composer.style.height = 'auto'
    composer.style.height = `${Math.min(composer.scrollHeight, 150)}px`
  }, [message])

  // NEW: add files from the picker, drag and drop, or paste
  const addFiles = (fileList) => {
    const next = [...attachedFiles]

    for (const file of Array.from(fileList || [])) {
      const ext = file.name.split('.').pop().toLowerCase()
      const isImage = file.type.startsWith('image/')

      if (!isImage && !ALLOWED_EXTENSIONS.includes(ext)) {
        showErrorToast(`${file.name}: only images, PDF and PPT are allowed.`, 'File not supported')
        continue
      }
      if (file.size > MAX_FILE_SIZE) {
        showErrorToast(`${file.name} is bigger than 10 MB.`, 'File too large')
        continue
      }
      if (next.length >= MAX_FILES) {
        showErrorToast(`You can attach up to ${MAX_FILES} files.`, 'Too many files')
        break
      }

      next.push({
        id: `${Date.now()}-${Math.random()}`,
        file,
        preview: isImage ? URL.createObjectURL(file) : null,
      })
    }

    setAttachedFiles(next)
  }

  // NEW: remove one attached file
  const removeFile = (id) => {
    setAttachedFiles((current) => {
      const removed = current.find((item) => item.id === id)
      if (removed?.preview) URL.revokeObjectURL(removed.preview)
      return current.filter((item) => item.id !== id)
    })
  }

  // NEW: drag and drop
  const handleDragOver = (event) => {
    if (!event.dataTransfer?.types?.includes('Files')) return
    event.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (event) => {
    if (event.currentTarget.contains(event.relatedTarget)) return
    setIsDragging(false)
  }

  const handleDrop = (event) => {
    event.preventDefault()
    setIsDragging(false)
    addFiles(event.dataTransfer.files)
  }

  // NEW: paste (Ctrl+V). Normal text paste is not touched.
  const handlePaste = (event) => {
    const files = event.clipboardData?.files
    if (files && files.length > 0) {
      event.preventDefault()
      addFiles(files)
    }
  }

  // CHANGED: a file alone is now enough to send, and files are passed as 2nd argument
  const handleSubmit = (event) => {
    event.preventDefault()
    const trimmedMessage = message.trim()
    const hasFiles = attachedFiles.length > 0
    if ((!trimmedMessage && !hasFiles) || isSending || isRateLimited) return

    onSendMessage(
      trimmedMessage || 'Please look at the attached file.',
      attachedFiles.map((item) => item.file),
    )

    attachedFiles.forEach((item) => item.preview && URL.revokeObjectURL(item.preview))
    setAttachedFiles([])
  }

  const latestUserMessageIndex = messages.reduce(
    (latestIndex, chatMessage, index) => chatMessage.role === 'user' ? index : latestIndex,
    -1,
  )

  const handleCopy = async (content, index) => {
    window.clearTimeout(copyStatusTimeoutRef.current)

    try {
      await navigator.clipboard.writeText(content)
      setCopiedMessageIndex(index)
      setCopyErrorIndex(null)
    } catch (error) {
      console.error('Unable to copy message:', error)
      setCopyErrorIndex(index)
      setCopiedMessageIndex(null)
      showErrorToast('Unable to copy this message to the clipboard.', 'Copy failed')
    }

    copyStatusTimeoutRef.current = window.setTimeout(() => {
      setCopiedMessageIndex(null)
      setCopyErrorIndex(null)
      copyStatusTimeoutRef.current = null
    }, 1500)
  }

  return (
    <section
      className="chat-panel"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* NEW: shown while dragging a file over the page */}
      {isDragging && (
        <div className="drop-overlay" aria-hidden="true">
          Drop images, PDF or PPT here
        </div>
      )}

      <header className="chat-header">
        <div className="chat-header-title">
          <span className="mobile-brand-mark"><BrandMark /></span>
          <span>AI Assistant</span>
          <span className="model-badge"><span /> Smart</span>
        </div>
        <button className="share-button" type="button" aria-label="Share conversation">
          <span aria-hidden="true">↗</span>
          <span>Share</span>
        </button>
      </header>

      <div className="chat-content" ref={chatContentRef}>
        {isLoadingMessages ? (
          <div className="chat-history-loading" role="status" aria-live="polite">
            <span className="chat-history-loading-mark">
              <BrandMark className="brand-mark-grid loading-brand-mark" />
            </span>
            <p>Loading previous messages</p>
            <span className="loading-typing-dots" aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
          </div>
        ) : messages.length > 0 ? (
          <div className="conversation-view">
            {messages.map((chatMessage, index) => chatMessage.role === 'user' ? (
              <div className="user-message" key={`user-${index}`}>
                <UserAvatar className="message-avatar" user={user} initials={initials} />
                <div className="user-message-content">
                  <p>{chatMessage.content}</p>
                  <div className="message-actions">
                    <button
                      type="button"
                      aria-label={copiedMessageIndex === index ? 'Message copied' : 'Copy message'}
                      title={copiedMessageIndex === index ? 'Copied' : 'Copy'}
                      onClick={() => handleCopy(chatMessage.content, index)}
                    >
                      {copiedMessageIndex === index ? (
                        <svg viewBox="0 0 20 20" aria-hidden="true">
                          <path d="m4 10 4 4 8-8" />
                        </svg>
                      ) : (
                        <svg viewBox="0 0 20 20" aria-hidden="true">
                          <rect x="7" y="7" width="9" height="10" rx="1.5" />
                          <path d="M13 7V5.5A1.5 1.5 0 0 0 11.5 4h-6A1.5 1.5 0 0 0 4 5.5v7A1.5 1.5 0 0 0 5.5 14H7" />
                        </svg>
                      )}
                    </button>
                    {index === latestUserMessageIndex && (
                      <button
                        type="button"
                        aria-label="Edit message"
                        title="Edit"
                        onClick={() => onEditMessage(index, chatMessage.messageId, chatMessage.content)}
                        disabled={isSending}
                      >
                        <svg viewBox="0 0 20 20" aria-hidden="true">
                          <path d="m13.8 4.2 2 2a1.4 1.4 0 0 1 0 2l-7.9 7.9-3.5.8.8-3.5 7.9-7.9a1.4 1.4 0 0 1 2 0Z" />
                          <path d="m12.5 5.5 2 2" />
                        </svg>
                      </button>
                    )}
                    {copyErrorIndex === index && (
                      <span role="status">Copy failed</span>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="assistant-message" key={`assistant-${index}`}>
                <span className="assistant-avatar"><BrandMark /></span>
                <div className="assistant-response">
                  <div className="assistant-message-content">
                    <p className="assistant-name">Multitask AI <span>· Just now</span></p>
                    <div className="assistant-markdown">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          table: (props) => {
                            const tableProps = { ...props }
                            delete tableProps.node

                            return (
                              <div className="assistant-table-wrap">
                                <table {...tableProps} />
                              </div>
                            )
                          },
                        }}
                      >
                        {/* CHANGED: text without the PDF/PPT link (the file card shows it) */}
                        {stripFileLinks(chatMessage.content)}
                      </ReactMarkdown>
                    </div>

                    {chatMessage.image && (
                      <figure className="message-image">
                        <img
                          src={chatMessage.image}
                          alt="Generated by Multitask AI"
                          loading="lazy"
                        />
                        <a
                          className="message-image-download"
                          href={
                            chatMessage.image.includes('/upload/')
                              ? chatMessage.image.replace('/upload/', '/upload/fl_attachment/')
                              : chatMessage.image
                          }
                          download={`multitask-ai-${index}.png`}
                        >
                          ↓ Download
                        </a>
                      </figure>
                    )}

                    {/* NEW: PDF / PPT file card */}
                    {extractFileLinks(chatMessage.content).length > 0 && (
                      <div className="message-files" aria-label="Generated documents">
                        {extractFileLinks(chatMessage.content).map((file) => (
                          <a
                            className={`message-file-card ${file.type}`}
                            key={file.url}
                            href={
                              file.url.includes('/upload/')
                                ? file.url.replace('/upload/', '/upload/fl_attachment/')
                                : file.url
                            }
                            download={file.name}
                            target="_blank"
                            rel="noreferrer"
                          >
                            <span className="message-file-icon" aria-hidden="true">
                              {file.type === 'pdf' ? 'PDF' : 'PPT'}
                            </span>
                            <span className="message-file-info">
                              <strong>{file.name}</strong>
                              <small>
                                {file.type === 'pdf' ? 'PDF document' : 'PowerPoint presentation'}
                              </small>
                            </span>
                            <span className="message-file-download" aria-hidden="true">↓</span>
                          </a>
                        ))}
                      </div>
                    )}

                    {extractCodeArtifacts(chatMessage.content, index, chatMessage.artifact).length > 0 && (
                      <div className="message-artifacts" aria-label="Generated files">
                        {extractCodeArtifacts(chatMessage.content, index, chatMessage.artifact).map((artifact) => (
                          <button
                            className="message-artifact-file"
                            key={artifact.id}
                            type="button"
                            onClick={() => onOpenArtifact(artifact)}
                          >
                            <span className="message-artifact-icon" aria-hidden="true">{'{ }'}</span>
                            <span>{artifact.name}</span>
                            <span aria-hidden="true">↗</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="message-actions">
                    <button
                      type="button"
                      aria-label={copiedMessageIndex === index ? 'Message copied' : 'Copy message'}
                      title={copiedMessageIndex === index ? 'Copied' : 'Copy'}
                      onClick={() => handleCopy(chatMessage.content, index)}
                    >
                      {copiedMessageIndex === index ? (
                        <svg viewBox="0 0 20 20" aria-hidden="true">
                          <path d="m4 10 4 4 8-8" />
                        </svg>
                      ) : (
                        <svg viewBox="0 0 20 20" aria-hidden="true">
                          <rect x="7" y="7" width="9" height="10" rx="1.5" />
                          <path d="M13 7V5.5A1.5 1.5 0 0 0 11.5 4h-6A1.5 1.5 0 0 0 4 5.5v7A1.5 1.5 0 0 0 5.5 14H7" />
                        </svg>
                      )}
                    </button>
                    {copyErrorIndex === index && (
                      <span role="status">Copy failed</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {isSending && (
              <div className="assistant-message" role="status">
                <span className="assistant-avatar">
                  <BrandMark className="brand-mark-grid loading-brand-mark" />
                </span>
                <div>
                  <p className="assistant-name">Multitask AI</p>
                  <p className="assistant-placeholder assistant-thinking">Thinking…</p>
                </div>
              </div>
            )}
          </div>
        ) : activeConversation ? (
          <div className="conversation-view">
            <div className="user-message">
              <UserAvatar className="message-avatar" user={user} initials={initials} />
              <div className="user-message-content">
                <p>{activeConversation}</p>
              </div>
            </div>
            <div className="assistant-message">
              <span className="assistant-avatar"><BrandMark /></span>
              <div>
                <p className="assistant-name">Multitask AI <span>· Just now</span></p>
                <p className="assistant-placeholder">
                  Select New chat to start a conversation.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="welcome-content">
            <div className="welcome-spark" aria-hidden="true">
              <BrandMark className="brand-mark-grid welcome-brand-mark" />
              <i />
              <i />
              <i />
            </div>
            <p className="welcome-overline">WELCOME BACK, {firstName.toUpperCase()}</p>
            <h1>What can I help you<br className="desktop-break" /> with today?</h1>
            <p className="welcome-subtitle">
              Think it, ask it, make it happen. Start with an idea or choose a place to begin.
            </p>

            <div className="prompt-grid">
              {prompts.map((prompt) => (
                <button
                  className="prompt-card"
                  key={prompt.title}
                  type="button"
                  onClick={() => setMessage(prompt.prompt)}
                >
                  <span className={`prompt-icon ${prompt.color}`} aria-hidden="true">{prompt.icon}</span>
                  <span className="prompt-card-copy">
                    <strong>{prompt.title}</strong>
                    <small>{prompt.description}</small>
                  </span>
                  <span className="prompt-arrow" aria-hidden="true">↗</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="composer-area">
        {isEditingMessage && (
          <div className="editing-message-banner">
            <span>Editing message</span>
            <button type="button" onClick={onCancelEdit} disabled={isSending}>
              Cancel
            </button>
          </div>
        )}
        <form className="message-composer" onSubmit={handleSubmit}>
          {/* NEW: hidden file picker (opened by the + button) */}
          <input
            ref={fileInputRef}
            type="file"
            hidden
            multiple
            accept="image/*,.pdf,.ppt,.pptx"
            onChange={(event) => {
              addFiles(event.target.files)
              event.target.value = '' // allows choosing the same file again
            }}
          />

          {/* NEW: chips for the attached files */}
          {attachedFiles.length > 0 && (
            <div className="attached-files">
              {attachedFiles.map((item) => (
                <div className="attached-file" key={item.id}>
                  {item.preview ? (
                    <img src={item.preview} alt="" />
                  ) : (
                    <span className="attached-file-badge">
                      {item.file.name.toLowerCase().endsWith('.pdf') ? 'PDF' : 'PPT'}
                    </span>
                  )}
                  <span className="attached-file-name">{item.file.name}</span>
                  <button
                    type="button"
                    aria-label={`Remove ${item.file.name}`}
                    onClick={() => removeFile(item.id)}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          <textarea
            ref={composerRef}
            aria-label="Message Multitask AI"
            placeholder="Message Multitask AI..."
            rows="1"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            onPaste={handlePaste}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault()
                event.currentTarget.form.requestSubmit()
              }
            }}
          />
          <div className="composer-toolbar">
            <div className="composer-tools">
              {/* CHANGED: the + button now opens the file picker */}
              <button
                type="button"
                aria-label="Add attachment"
                title="Add attachment"
                onClick={() => fileInputRef.current?.click()}
                disabled={isSending}
              >＋</button>
              <span className="composer-divider" />
              <button className="tool-label" type="button">
                <span aria-hidden="true">✧</span> Tools
                <span className="chevron" aria-hidden="true">⌄</span>
              </button>
            </div>
            <div className="composer-actions">
              <span className="composer-hint">Shift + Enter for a new line</span>
              <button
                className="send-button"
                type="submit"
                disabled={(!message.trim() && attachedFiles.length === 0) || isSending || isRateLimited}
                aria-label={isEditingMessage ? 'Save edited message' : 'Send message'}
                title={isEditingMessage ? 'Save edited message' : 'Send message'}
              >
                <span aria-hidden="true">↑</span>
              </button>
            </div>
          </div>
        </form>
        <p className="composer-disclaimer">
          Multitask AI can make mistakes. Check important information.
        </p>
      </div>
    </section>
  )
}

export default Chat