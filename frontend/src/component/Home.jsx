import { useState, useEffect } from 'react'
import { api } from '../../utils/axios'
import '../style/Home.css'
import Login from './Login.jsx'
import Chat from './Chat.jsx'
import { BrandMark, UserAvatar } from './WorkspacePrimitives.jsx'
import { useDispatch } from 'react-redux'
import { UserInfo } from '../feature/user.js'

const conversations = [
  'Plan a productive week',
  'Ideas for a birthday gift',
  'Explain machine learning',
  'Write a project update',
]

function Home() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [search, setSearch] = useState('')
  const [activeConversation, setActiveConversation] = useState('')
  const [conversationId, setConversationId] = useState('')
  const [messages, setMessages] = useState([])
  const [isSending, setIsSending] = useState(false)
  const [chatError, setChatError] = useState('')
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const dispatch = useDispatch();
  // const selector = useSelector((prev) => prev.user)


  const startNewChat = () => {
    setActiveConversation('')
    setConversationId('')
    setMessages([])
    setChatError('')
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
  }, [dispatch])
  // console.log(user)
  const handleLogout = async () => {
    setErrorMessage('')
    setIsLoggingOut(true)
    setIsAccountMenuOpen(false)

    try {
      await api.get('/auth/logout')
      setUser(null) // switches the UI back to <Login />
      startNewChat()
    } catch (error) {
      console.error('Error during logout:', error)
      setErrorMessage('Unable to log out right now. Please try again.')
    } finally {
      setIsLoggingOut(false)
    }
  }

  const handleSendMessage = async (prompt) => {
    if (isSending) return

    setMessage('')
    setChatError('')
    setMessages((currentMessages) => [...currentMessages, { role: 'user', content: prompt }])
    setActiveConversation((currentConversation) => currentConversation || prompt)
    setIsSending(true)

    try {
      let activeConversationId = conversationId

      if (!activeConversationId) {
        const { data } = await api.get('/chat/create-conversation')
        activeConversationId = data?._id

        if (typeof activeConversationId !== 'string' || !activeConversationId) {
          throw new Error('The chat service did not return a conversation ID.')
        }

        setConversationId(activeConversationId)
      }

      const { data } = await api.post('/agent/chat', {
        conversationId: activeConversationId,
        prompt,
      })
      const response = typeof data === 'string' ? data : data?.aiResponse ?? data?.response

      if (typeof response !== 'string' || !response.trim()) {
        throw new Error('The agent service returned an empty response.')
      }

      setMessages((currentMessages) => [
        ...currentMessages,
        { role: 'assistant', content: response },
      ])
    } catch (error) {
      console.error('Unable to send chat message:', error)
      setChatError(
        error.response?.data?.message || error.message || 'Unable to send your message. Please try again.',
      )
    } finally {
      setIsSending(false)
    }
  }

  const handleEditMessage = (messageIndex, content) => {
    const previousMessages = messages.slice(0, messageIndex)
    const previousPrompt = [...previousMessages]
      .reverse()
      .find((chatMessage) => chatMessage.role === 'user')?.content || ''

    setMessages(previousMessages)
    setActiveConversation(previousPrompt)
    setMessage(content)
    setChatError('')
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

      <Chat
        user={user}
        initials={initials}
        firstName={firstName}
        activeConversation={activeConversation}
        message={message}
        setMessage={setMessage}
        messages={messages}
        isSending={isSending}
        chatError={chatError}
        onSendMessage={handleSendMessage}
        onEditMessage={handleEditMessage}
      />
    </main>
  )
}

export default Home