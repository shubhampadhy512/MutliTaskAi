import { BrandMark, UserAvatar } from './WorkspacePrimitives.jsx'

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
  setActiveConversation,
  message,
  setMessage,
}) {
  const handleSubmit = (event) => {
    event.preventDefault()
    const trimmedMessage = message.trim()
    if (!trimmedMessage) return

    setActiveConversation(trimmedMessage)
    setMessage('')
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

      <div className="chat-content">
        {activeConversation ? (
          <div className="conversation-view">
            <div className="user-message">
              <UserAvatar className="message-avatar" user={user} initials={initials} />
              <p>{activeConversation}</p>
            </div>
            <div className="assistant-message">
              <span className="assistant-avatar"><BrandMark /></span>
              <div>
                <p className="assistant-name">Multitask AI <span>· Just now</span></p>
                <p className="assistant-placeholder">
                  Your message is ready. Connect an AI service to generate a response here.
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
        <form className="message-composer" onSubmit={handleSubmit}>
          <textarea
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
                disabled={!message.trim()}
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
