import { useState, useEffect, useCallback } from 'react'
import { api } from '../../utils/axios'
import '../style/Home.css'
import Login from './Login.jsx'
import Chat from './Chat.jsx'
import ArtifactPanel from './ArtifactPanel.jsx'
import { BrandMark, UserAvatar } from './WorkspacePrimitives.jsx'
import { useDispatch } from 'react-redux'
import { UserInfo } from '../feature/user.js'
import { showDeleteConfirmation, showErrorToast } from '../../utils/toast.js'

function Home() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [activeConversation, setActiveConversation] = useState('')
  const [conversationId, setConversationId] = useState('')
  const [conversations, setConversations] = useState([])
  const [isLoadingConversations, setIsLoadingConversations] = useState(false)
  const [historyError, setHistoryError] = useState('')
  const [messages, setMessages] = useState([])
  const [editingMessage, setEditingMessage] = useState(null)
  const [isSending, setIsSending] = useState(false)
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)
  const [deletingConversationId, setDeletingConversationId] = useState('')
  const [isRateLimited, setIsRateLimited] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false)
  const [isArtifactPanelOpen, setIsArtifactPanelOpen] = useState(false)
  const [artifactPanelWidth, setArtifactPanelWidth] = useState(360)
  const [isResizingArtifacts, setIsResizingArtifacts] = useState(false)
  const [artifactTab, setArtifactTab] = useState('code')
  const [selectedArtifact, setSelectedArtifact] = useState(null)
  const dispatch = useDispatch();
  // const selector = useSelector((prev) => prev.user)


  const startNewChat = () => {
    setActiveConversation('')
    setConversationId('')
    setMessages([])
    setEditingMessage(null)
    setSelectedArtifact(null)
    setIsArtifactPanelOpen(false)
    setMessage('')
  }

  const showArtifact = (artifact) => {
    setSelectedArtifact(artifact)
    setArtifactTab('code')
    setIsArtifactPanelOpen(true)
  }

  const resizeArtifactPanelBy = (delta) => {
    const mobileLayout = window.innerWidth <= 760
    const overlayLayout = window.innerWidth <= 900
    const sidebarWidth = window.innerWidth > 1200 ? 284 : 260
    const maxWidth = mobileLayout
      ? window.innerWidth - 24
      : overlayLayout
        ? window.innerWidth - sidebarWidth
        : window.innerWidth - sidebarWidth - 280
    const nextWidth = artifactPanelWidth + delta

    setArtifactPanelWidth(
      Math.max(mobileLayout ? 240 : 280, Math.min(nextWidth, maxWidth)),
    )
  }

  useEffect(() => {
    if (!isResizingArtifacts) return undefined

    const handlePointerMove = (event) => {
      const mobileLayout = window.innerWidth <= 760
      const overlayLayout = window.innerWidth <= 900
      const sidebarWidth = window.innerWidth > 1200 ? 284 : 260
      const maxWidth = mobileLayout
        ? window.innerWidth - 24
        : overlayLayout
          ? window.innerWidth - sidebarWidth
          : window.innerWidth - sidebarWidth - 280
      const nextWidth = window.innerWidth - event.clientX

      setArtifactPanelWidth(Math.max(mobileLayout ? 240 : 280, Math.min(nextWidth, maxWidth)))
    }

    const stopResizing = () => setIsResizingArtifacts(false)

    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', stopResizing)
    window.addEventListener('pointercancel', stopResizing)

    return () => {
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', stopResizing)
      window.removeEventListener('pointercancel', stopResizing)
    }
  }, [isResizingArtifacts])

  const loadConversations = useCallback(async () => {
    setIsLoadingConversations(true)
    setHistoryError('')

    try {
      const { data } = await api.get('/chat/get-conversation')
      console.log(data)
      if (!Array.isArray(data)) {
        throw new Error('The chat service returned an invalid conversation list.')
      }
      setConversations(data)
    } catch (error) {
      console.error('Unable to load chat history:', error)
      const message = error.response?.data?.message || error.message || 'Unable to load chat history.'
      setHistoryError(message)
      showErrorToast(message, 'Unable to load chat history')
    } finally {
      setIsLoadingConversations(false)
    }
  }, [])

  useEffect(() => {
    const getUser = async () => {
      try {
        const response = await api.get('/getuser')
        setUser(response.data.data)
        dispatch(UserInfo(response.data.data))
        await loadConversations()
      } catch (error) {
        console.error('Unable to fetch the current user:', error)
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    getUser()
  }, [dispatch, loadConversations])
  // console.log(user)
  const handleLogout = async () => {
    setIsLoggingOut(true)
    setIsAccountMenuOpen(false)

    try {
      await api.get('/auth/logout')
      setUser(null) // switches the UI back to <Login />
      startNewChat()
    } catch (error) {
      console.error('Error during logout:', error)
      showErrorToast('Unable to log out right now. Please try again.', 'Unable to log out')
    } finally {
      setIsLoggingOut(false)
    }
  }

  const handleSendMessage = async (prompt) => {
    if (isSending || isRateLimited) return

    if (editingMessage) {
      if (!conversationId || !editingMessage.messageId) {
        showErrorToast('This message cannot be edited because its ID is unavailable.', 'Unable to edit message')
        return
      }

      setIsSending(true)
      try {
        const { data } = await api.post('/chat/updatemessage', {
          conversationId,
          messageId: editingMessage.messageId,
          prompt,
        })
        const response = typeof data === 'string' ? data : data?.aiResponse ?? data?.response

        if (typeof response !== 'string' || !response.trim()) {
          throw new Error('The agent service returned an empty response.')
        }

        setMessages((currentMessages) => [
          ...currentMessages.slice(0, editingMessage.index),
          { ...currentMessages[editingMessage.index], content: prompt },
          {
            role: 'assistant',
            content: response,
            artifact: data?.artifact || null,
            image: data?.image || null,
          },
        ])
        setActiveConversation((currentConversation) => currentConversation || prompt)
        setEditingMessage(null)
        setMessage('')
      } catch (error) {
        console.error('Unable to edit chat message:', error)
        showErrorToast(
          error.response?.data?.message || error.message || 'Unable to edit your message. Please try again.',
          'Unable to edit message',
        )
      } finally {
        setIsSending(false)
      }
      return
    }

    setMessage('')
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
        const newConversation = {
          ...data,
          title: prompt,
        }
        setConversations((currentConversations) => [
          newConversation,
          ...currentConversations.filter((conversation) => conversation._id !== activeConversationId),
        ])
        try {
          await api.post('/chat/update-message', {
            id: activeConversationId,
            title: prompt,
          })
        } catch (error) {
          console.error('Unable to save conversation title:', error)
          const message = 'The conversation started, but its title could not be saved.'
          setHistoryError(message)
          showErrorToast(message, 'Unable to save conversation')
        }
      }

      const { data } = await api.post('/agent/chat', {
        conversationId: activeConversationId,
        prompt,
      })
      const response = typeof data === 'string' ? data : data?.aiResponse ?? data?.response

      if (typeof response !== 'string' || !response.trim()) {
        throw new Error('The agent service returned an empty response.')
      }

      setMessages((currentMessages) => {
        const lastMessage = currentMessages[currentMessages.length - 1]
        return [
          ...currentMessages.slice(0, -1),
          { ...lastMessage, messageId: data?.userMessageId || null },
          {
            role: 'assistant',
            content: response,
            artifact: data?.artifact || null,
            image: data?.image || null,
          },
        ]
      })
    } catch (error) {
      console.error('Unable to send chat message:', error)
      if (error.response?.status === 429) {
        setIsRateLimited(true)
        showErrorToast('You’ve reached your limit. Try again sometime later.', 'Message limit reached')
      } else {
        showErrorToast(
          error.response?.data?.message || error.message || 'Unable to send your message. Please try again.',
          'Unable to send message',
        )
      }
    } finally {
      setIsSending(false)
    }
  }

  const handleSelectConversation = async (conversation) => {
    const selectedConversationId = conversation?._id
    if (!selectedConversationId || isSending) return

    setConversationId(selectedConversationId)
    setActiveConversation(conversation.title || 'New Chat')
    setMessages([])
    setEditingMessage(null)
    setMessage('')
    setSelectedArtifact(null)
    setIsArtifactPanelOpen(false)
    setIsLoadingMessages(true)
    setIsSending(true)

    try {
      const { data } = await api.post('/chat/get-message', {
        conversationId: selectedConversationId,
      })

      console.log(data)
      if (!Array.isArray(data)) {
        throw new Error('The chat service returned an invalid message list.')
      }

      setMessages(data.slice().reverse().map((chatMessage) => ({
        messageId: chatMessage._id,
        role: chatMessage.role === 'ai' ? 'assistant' : chatMessage.role,
        content: chatMessage.content,
        artifact: chatMessage.artifact || null,
        image: chatMessage.image || null,
      })))
    } catch (error) {
      console.error('Unable to load conversation messages:', error)
      showErrorToast(
        error.response?.data?.message || error.message || 'Unable to load this conversation.',
        'Unable to load conversation',
      )
    } finally {
      setIsLoadingMessages(false)
      setIsSending(false)
    }
  }

  const handleEditMessage = (messageIndex, messageId, content) => {
    if (!messageId) {
      showErrorToast('This message cannot be edited because its ID is unavailable.', 'Unable to edit message')
      return
    }
    setEditingMessage({ index: messageIndex, messageId })
    setMessage(content)
  }

  const handleCancelEdit = () => {
    setEditingMessage(null)
    setMessage('')
  }

  const deleteConversation = async (conversationIdToDelete) => {
    setHistoryError('')
    setDeletingConversationId(conversationIdToDelete)
    try {
      await api.get(`/chat/delete-conversation/${encodeURIComponent(conversationIdToDelete)}`)
      setConversations((currentConversations) => currentConversations.filter(
        (item) => item._id !== conversationIdToDelete,
      ))
      if (conversationId === conversationIdToDelete) startNewChat()
    } catch (error) {
      console.error('Unable to delete conversation:', error)
      const message = error.response?.data?.message || error.message || 'Unable to delete this conversation.'
      setHistoryError(message)
      showErrorToast(message, 'Unable to delete conversation')
    } finally {
      setDeletingConversationId('')
    }
  }

  const handleDeleteConversation = (conversation) => {
    if (isSending || deletingConversationId) return
    const conversationIdToDelete = conversation?._id
    if (!conversationIdToDelete) return

    showDeleteConfirmation(conversation.title || 'New Chat', () => {
      void deleteConversation(conversationIdToDelete)
    })
  }

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
    <main
      className={`ai-workspace${isArtifactPanelOpen ? ' artifacts-open' : ''}${isResizingArtifacts ? ' artifacts-resizing' : ''}`}
      style={{ '--artifact-width': `${artifactPanelWidth}px` }}
    >
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

        <div className="recent-section">
          <div className="recent-heading">
            <p className="sidebar-heading">CHAT HISTORY</p>
            <button
              type="button"
              aria-label="Refresh chat history"
              title="Refresh chat history"
              onClick={loadConversations}
              disabled={isLoadingConversations}
            >
              ↻
            </button>
          </div>
          {isLoadingConversations && conversations.length === 0 ? (
            <p className="history-status" role="status">Loading chats…</p>
          ) : (
            <nav className="conversation-list" aria-label="Chat history">
              {conversations.map((conversation) => (
                <div
                  className={`conversation-item${conversationId === conversation._id ? ' active' : ''}`}
                  key={conversation._id}
                >
                  <button
                    className="conversation-link"
                    type="button"
                    onClick={() => handleSelectConversation(conversation)}
                    disabled={isSending || Boolean(deletingConversationId)}
                    title={conversation.title || 'New Chat'}
                  >
                    <span aria-hidden="true">◷</span>
                    <span>
                      {conversation.title === 'New Chat' && conversation._id === conversationId
                        ? activeConversation
                        : conversation.title || 'New Chat'}
                    </span>
                  </button>
                  <button
                    className="conversation-delete"
                    type="button"
                    aria-label={`Delete ${conversation.title || 'New Chat'}`}
                    title="Delete chat"
                    onClick={() => handleDeleteConversation(conversation)}
                    disabled={isSending || Boolean(deletingConversationId)}
                  >
                    {deletingConversationId === conversation._id ? (
                      <span aria-hidden="true">…</span>
                    ) : (
                      <svg viewBox="0 0 20 20" aria-hidden="true">
                        <path d="M4 6h12M8 6V4h4v2m-6 0 .7 10h6.6L14 6m-5 3v4m2-4v4" />
                      </svg>
                    )}
                  </button>
                </div>
              ))}
              {!isLoadingConversations && conversations.length === 0 && !historyError && (
                <p className="history-status">Your chats will appear here.</p>
              )}
            </nav>
          )}
        </div>

        <div className="sidebar-bottom">
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
        isLoadingMessages={isLoadingMessages}
        isRateLimited={isRateLimited}
        onSendMessage={handleSendMessage}
        onEditMessage={handleEditMessage}
        isEditingMessage={Boolean(editingMessage)}
        onCancelEdit={handleCancelEdit}
        onOpenArtifact={showArtifact}
      />
      {isArtifactPanelOpen && selectedArtifact && (
        <ArtifactPanel
          artifact={selectedArtifact}
          activeTab={artifactTab}
          onTabChange={setArtifactTab}
          onClose={() => setIsArtifactPanelOpen(false)}
          onResizeStart={() => setIsResizingArtifacts(true)}
          onResizeBy={resizeArtifactPanelBy}
        />
      )}
    </main>
  )
}

export default Home