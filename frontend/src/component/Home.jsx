import { useState, useEffect } from 'react'
import { api } from '../../utils/axios'
import '../style/Home.css'
import Login from './Login.jsx'
import { useDispatch, useSelector } from 'react-redux'
import { UserInfo } from '../feature/user.js'

const conversations = [
  'Plan a productive week',
  'Ideas for a birthday gift',
  'Explain machine learning',
  'Write a project update',
]

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

function BrandMark({ className = 'brand-mark-grid' }) {
  return (
    <span className={className} aria-hidden="true">
      <span />
      <span />
      <span />
      <span />
    </span>
  )
}

function UserAvatar({ user, initials, className }) {
  const [imageFailed, setImageFailed] = useState(false)

  return (
    <span className={className} role="img" aria-label={`${user.name || 'User'} profile picture`}>
      {initials}
      {user.avatar && !imageFailed && (
        <img
          className="user-avatar-image"
          src={user.avatar}
          alt=""
          onError={() => setImageFailed(true)}
        />
      )}
    </span>
  )
}

function Home() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [search, setSearch] = useState('')
  const [activeConversation, setActiveConversation] = useState('')
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const dispatch = useDispatch();
  // const selector = useSelector((prev) => prev.user)


  const startNewChat = () => {
    setActiveConversation('')
    setMessage('')
  }

  useEffect(() => {
    const getUser = async () => {
      try {
        const response = await api.get('/getuser')
        setUser(response.data.data)
        dispatch(UserInfo(response.data.data))
      } catch (error) {
        console.error('Unable to fetch the current user:', error)
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    getUser()
  }, [])
  // console.log(user)
  const handleLogout = async () => {
    setErrorMessage('')
    setIsLoggingOut(true)
    setIsAccountMenuOpen(false)

    try {
      await api.get('/auth/logout')
      setUser(null) // switches the UI back to <Login />
      setActiveConversation('')
      setMessage('')
    } catch (error) {
      console.error('Error during logout:', error)
      setErrorMessage('Unable to log out right now. Please try again.')
    } finally {
      setIsLoggingOut(false)
    }
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    const trimmedMessage = message.trim()
    if (!trimmedMessage) return

    setActiveConversation(trimmedMessage)
    setMessage('')
  }

  const filteredConversations = conversations.filter((conversation) =>
    conversation.toLowerCase().includes(search.toLowerCase()),
  )
  const displayName = user?.name?.trim() || user?.email?.split('@')[0] || 'My workspace'
  const firstName = displayName.split(/\s+/)[0]
  const initials = displayName
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()

  if (loading) {
    return (
      <main className="home-loading" role="status" aria-label="Loading your workspace">
        <div className="loading-mark-shell">
          <BrandMark className="brand-mark-grid loading-brand-mark" />
        </div>
        <p>Preparing your workspace</p>
        <span className="loading-caption">
          <span className="loading-shimmer">Just a moment</span>
          <span className="loading-typing-dots" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
        </span>
      </main>
    )
  }

  if (!user) {
    return <Login setUser={setUser} />
  }

  return (
    <main className="ai-workspace">
      <aside className="ai-sidebar">
        <a className="ai-brand" href="/home" aria-label="MultiTask AI home">
          <span className="ai-brand-mark"><BrandMark /></span>
          <span>MultiTask<span className="ai-brand-accent">Ai</span></span>
        </a>

        <button className="new-chat-button" type="button" onClick={startNewChat}>
          <span aria-hidden="true">＋</span>
          <span>New chat</span>
          <kbd>⌘ K</kbd>
        </button>

        <label className="chat-search">
          <span aria-hidden="true">⌕</span>
          <input
            type="search"
            placeholder="Search chats"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            aria-label="Search conversations"
          />
          <span className="search-shortcut" aria-hidden="true">⌘ F</span>
        </label>

        <div className="sidebar-section">
          <p className="sidebar-heading">WORKSPACE</p>
          <button className="sidebar-link selected" type="button" onClick={startNewChat}>
            <span className="sidebar-link-icon" aria-hidden="true">✧</span>
            AI Assistant
          </button>
          <button className="sidebar-link" type="button">
            <span className="sidebar-link-icon" aria-hidden="true">▤</span>
            Library
          </button>
        </div>

        <div className="recent-section">
          <div className="recent-heading">
            <p className="sidebar-heading">RECENT</p>
            <button type="button" aria-label="More recent chat options">···</button>
          </div>
          <nav className="conversation-list" aria-label="Recent conversations">
            {filteredConversations.map((conversation) => (
              <button
                className={`conversation-link${activeConversation === conversation ? ' active' : ''}`}
                key={conversation}
                type="button"
                onClick={() => setActiveConversation(conversation)}
                title={conversation}
              >
                <span aria-hidden="true">◷</span>
                <span>{conversation}</span>
              </button>
            ))}
            {filteredConversations.length === 0 && (
              <p className="empty-search">No matching chats</p>
            )}
          </nav>
        </div>

        <div className="sidebar-bottom">
          <div className="plan-card">
            <span className="plan-card-icon"><BrandMark /></span>
            <div>
              <p>Make more with AI</p>
              <span>Discover what you can do</span>
            </div>
            <span className="plan-card-arrow" aria-hidden="true">→</span>
          </div>
          {errorMessage && <p className="logout-error" role="alert">{errorMessage}</p>}
          <div className="account-menu">
            <button
              className="account-row"
              type="button"
              aria-expanded={isAccountMenuOpen}
              aria-haspopup="menu"
              onClick={() => setIsAccountMenuOpen((isOpen) => !isOpen)}
            >
              <UserAvatar className="account-avatar" user={user} initials={initials} />
              <span className="account-info">
                <span>{displayName}</span>
                <small>{user.email || 'Signed in'}</small>
              </span>
              <span className={`account-chevron${isAccountMenuOpen ? ' open' : ''}`} aria-hidden="true">⌃</span>
            </button>
            {isAccountMenuOpen && (
              <div className="account-popover" role="menu">
                <button
                  className="logout-button"
                  type="button"
                  role="menuitem"
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                >
                  <span aria-hidden="true">{isLoggingOut ? '…' : '↪'}</span>
                  {isLoggingOut ? 'Logging out…' : 'Log out'}
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

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
    </main>
  )
}

export default Home