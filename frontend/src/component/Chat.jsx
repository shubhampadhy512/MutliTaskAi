import { useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { BrandMark, UserAvatar } from './WorkspacePrimitives.jsx'
import { extractCodeArtifacts } from './artifactUtils.js'
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

function Chat({
  user,
  initials,
  firstName,
  activeConversation,
  message,
  setMessage,
  messages,
  isSending,
  isRateLimited,
  chatError,
  onSendMessage,
  onEditMessage,
  onOpenArtifact,
}) {
  const [copiedMessageIndex, setCopiedMessageIndex] = useState(null)
  const [copyErrorIndex, setCopyErrorIndex] = useState(null)
  const chatContentRef = useRef(null)
  const composerRef = useRef(null)
  const copyStatusTimeoutRef = useRef(null)

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

  const handleSubmit = (event) => {
    event.preventDefault()
    const trimmedMessage = message.trim()
    if (!trimmedMessage || isSending || isRateLimited) return

    onSendMessage(trimmedMessage)
  }

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
    }

    copyStatusTimeoutRef.current = window.setTimeout(() => {
      setCopiedMessageIndex(null)
      setCopyErrorIndex(null)
      copyStatusTimeoutRef.current = null
    }, 1500)
  }

  return (
    <section className="chat-panel">
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
        {messages.length > 0 ? (
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
                    <button
                      type="button"
                      aria-label="Edit message"
                      title="Edit"
                      onClick={() => onEditMessage(index, chatMessage.content)}
                      disabled={isSending}
                    >
                      <svg viewBox="0 0 20 20" aria-hidden="true">
                        <path d="m13.8 4.2 2 2a1.4 1.4 0 0 1 0 2l-7.9 7.9-3.5.8.8-3.5 7.9-7.9a1.4 1.4 0 0 1 2 0Z" />
                        <path d="m12.5 5.5 2 2" />
                      </svg>
                    </button>
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
                        {chatMessage.content}
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
        {chatError && <p className="chat-error" role="alert">{chatError}</p>}
        <form className="message-composer" onSubmit={handleSubmit}>
          <textarea
            ref={composerRef}
            aria-label="Message Multitask AI"
            placeholder="Message Multitask AI..."
            rows="1"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault()
                event.currentTarget.form.requestSubmit()
              }
            }}
          />
          <div className="composer-toolbar">
            <div className="composer-tools">
              <button type="button" aria-label="Add attachment" title="Add attachment">＋</button>
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
                disabled={!message.trim() || isSending || isRateLimited}
                aria-label="Send message"
                title="Send message"
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