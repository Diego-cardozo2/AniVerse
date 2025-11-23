import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabaseClient'
import UserLink from './UserLink'
import './ChatWindow.css'

const ChatWindow = ({ chatId, onClose }) => {
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [messageContent, setMessageContent] = useState('')
  const [currentUserId, setCurrentUserId] = useState(null)
  const [otherUser, setOtherUser] = useState(null)
  const [chatInfo, setChatInfo] = useState(null)
  const [followersCount, setFollowersCount] = useState(0)
  const [userCreatedAt, setUserCreatedAt] = useState(null)
  const [mutualFollowers, setMutualFollowers] = useState([])
  const messagesEndRef = useRef(null)
  const channelRef = useRef(null)

  // Scroll automático al final de los mensajes
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  // Obtener usuario actual y cargar mensajes
  useEffect(() => {
    const initializeChat = async () => {
      try {
        setLoading(true)

        // Obtener usuario actual
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        
        if (userError || !user) {
          console.error('Error al obtener usuario:', userError)
          return
        }

        setCurrentUserId(user.id)

        // Obtener información del chat
        const { data: chat, error: chatError } = await supabase
          .from('chats')
          .select('*')
          .eq('id', chatId)
          .single()

        if (chatError) {
          console.error('Error al obtener chat:', chatError)
          return
        }

        setChatInfo(chat)

        // Determinar el otro usuario
        const otherUserId = chat.user1_id === user.id ? chat.user2_id : chat.user1_id

        // Obtener información del otro usuario
        const { data: otherUserProfile } = await supabase
          .from('users')
          .select('display_name, username, avatar_url, email, created_at')
          .eq('id', otherUserId)
          .single()

        if (otherUserProfile) {
          setOtherUser({
            id: otherUserId,
            ...otherUserProfile
          })
          setUserCreatedAt(otherUserProfile.created_at)
        }

        // Obtener número de seguidores
        const { count: followersCount } = await supabase
          .from('user_follows')
          .select('id', { count: 'exact', head: true })
          .eq('following_id', otherUserId)

        setFollowersCount(followersCount || 0)

        // Obtener seguidores mutuos (usuarios que el usuario actual sigue y que también siguen al otro usuario)
        const { data: currentUserFollowing } = await supabase
          .from('user_follows')
          .select('following_id')
          .eq('follower_id', user.id)

        if (currentUserFollowing && currentUserFollowing.length > 0) {
          const followingIds = currentUserFollowing.map(f => f.following_id)
          const { data: mutual } = await supabase
            .from('user_follows')
            .select('follower_id')
            .eq('following_id', otherUserId)
            .in('follower_id', followingIds)
            .limit(3)

          if (mutual && mutual.length > 0) {
            const mutualIds = mutual.map(m => m.follower_id)
            const { data: mutualUsers } = await supabase
              .from('users')
              .select('display_name, username')
              .in('id', mutualIds)
              .limit(3)

            setMutualFollowers(mutualUsers || [])
          }
        }

        // Cargar mensajes existentes
        const { data: existingMessages, error: messagesError } = await supabase
          .from('messages')
          .select('*')
          .eq('chat_id', chatId)
          .order('created_at', { ascending: true })

        if (messagesError) {
          console.error('Error al cargar mensajes:', messagesError)
        } else {
          setMessages(existingMessages || [])
          // Scroll al final después de cargar
          setTimeout(scrollToBottom, 100)
        }

      } catch (error) {
        console.error('Error al inicializar chat:', error)
      } finally {
        setLoading(false)
      }
    }

    if (chatId) {
      initializeChat()
    }
  }, [chatId])

  // Configurar Realtime para escuchar nuevos mensajes
  useEffect(() => {
    if (!chatId || !currentUserId) return

    // Crear canal de Realtime
    const channel = supabase
      .channel(`chat:${chatId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `chat_id=eq.${chatId}`
        },
        (payload) => {
          const newMessage = payload.new
          setMessages((prev) => {
            // Evitar duplicados
            if (prev.some(msg => msg.id === newMessage.id)) {
              return prev
            }
            return [...prev, newMessage]
          })
          // Scroll al nuevo mensaje
          setTimeout(scrollToBottom, 100)
        }
      )
      .subscribe()

    channelRef.current = channel

    // Limpieza al desmontar
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [chatId, currentUserId])

  // Scroll cuando cambian los mensajes
  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Enviar mensaje
  const handleSendMessage = async (e) => {
    e.preventDefault()

    if (!messageContent.trim() || !chatId || !currentUserId || sending) {
      return
    }

    try {
      setSending(true)

      const { error } = await supabase
        .from('messages')
        .insert([
          {
            chat_id: chatId,
            sender_id: currentUserId,
            content: messageContent.trim()
          }
        ])

      if (error) {
        throw error
      }

      // Limpiar input
      setMessageContent('')
      
    } catch (error) {
      console.error('Error al enviar mensaje:', error)
      alert('Error al enviar el mensaje. Por favor, intenta de nuevo.')
    } finally {
      setSending(false)
    }
  }

  // Formatear fecha/hora del mensaje
  const formatMessageTime = (timestamp) => {
    const date = new Date(timestamp)
    const hours = date.getHours()
    const minutes = date.getMinutes()
    const ampm = hours >= 12 ? 'p. m.' : 'a. m.'
    const displayHours = hours % 12 || 12
    const displayMinutes = minutes < 10 ? `0${minutes}` : minutes
    
    return `${displayHours}:${displayMinutes} ${ampm} • Enviado`
  }

  // Formatear fecha de unión
  const formatJoinDate = (timestamp) => {
    if (!timestamp) return ''
    const date = new Date(timestamp)
    const month = date.toLocaleDateString('es-ES', { month: 'long' })
    const year = date.getFullYear()
    return `Se unió el ${month} de ${year}`
  }

  if (loading) {
    return (
      <div className="chat-window">
        <div className="chat-loading">
          <div className="loading-spinner"></div>
          <p className="loading-text">Cargando conversación...</p>
        </div>
      </div>
    )
  }

  if (!chatInfo || !otherUser) {
    return (
      <div className="chat-window">
        <div className="chat-error">
          <p>Error al cargar la conversación</p>
        </div>
      </div>
    )
  }

  return (
    <div className="chat-window">
      {/* Header del chat */}
      <div className="chat-header">
        <div className="chat-header-left">
          <button 
            className="chat-back-button" 
            onClick={onClose}
            title="Volver a mensajes"
            aria-label="Volver a mensajes"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
          </button>
          <h2 className="chat-header-name">{otherUser.display_name || otherUser.username}</h2>
        </div>
        <button className="chat-info-button" title="Información">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="16" x2="12" y2="12"/>
            <line x1="12" y1="8" x2="12.01" y2="8"/>
          </svg>
        </button>
      </div>

      {/* Perfil del usuario */}
      <div className="chat-profile-section">
        <div className="chat-profile-avatar-large">
          {otherUser.avatar_url ? (
            <img src={otherUser.avatar_url} alt={otherUser.display_name} />
          ) : (
            <div className="chat-profile-avatar-placeholder">
              {(otherUser.display_name?.charAt(0) || otherUser.username?.charAt(0) || 'U').toUpperCase()}
            </div>
          )}
        </div>
        <h3 className="chat-profile-name">{otherUser.display_name || otherUser.username}</h3>
        <p className="chat-profile-username">@{otherUser.username || otherUser.email?.split('@')[0]}</p>
        <div className="chat-profile-info">
          {userCreatedAt && (
            <span className="chat-profile-joined">{formatJoinDate(userCreatedAt)}</span>
          )}
          <span className="chat-profile-separator">•</span>
          <span className="chat-profile-followers">{followersCount} Seguidores</span>
        </div>
        {mutualFollowers.length > 0 && (
          <p className="chat-profile-mutual">
            {mutualFollowers.length === 1 
              ? `${mutualFollowers[0].display_name || mutualFollowers[0].username} `
              : mutualFollowers.length === 2
              ? `${mutualFollowers[0].display_name || mutualFollowers[0].username} y ${mutualFollowers[1].display_name || mutualFollowers[1].username} `
              : `${mutualFollowers.slice(0, 2).map(u => u.display_name || u.username).join(', ')} y más `
            }
            de las cuentas que sigues siguen a este usuario
          </p>
        )}
      </div>

      {/* Área de mensajes */}
      <div className="chat-messages">
        {messages.length === 0 ? (
          <div className="chat-empty">
            <p>No hay mensajes todavía</p>
            <p className="chat-empty-subtitle">Envía el primer mensaje para iniciar la conversación</p>
          </div>
        ) : (
          messages.map((message) => {
            const isOwnMessage = message.sender_id === currentUserId
            return (
              <div
                key={message.id}
                className={`message ${isOwnMessage ? 'message-own' : 'message-other'}`}
              >
                <div className="message-content">
                  <p className="message-text">{message.content}</p>
                  <span className="message-time">{formatMessageTime(message.created_at)}</span>
                </div>
              </div>
            )
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Formulario de envío */}
      <form className="chat-input-form" onSubmit={handleSendMessage}>
        <div className="chat-input-icons">
          <button type="button" className="chat-input-icon-btn" title="Imagen">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <polyline points="21 15 16 10 5 21"/>
            </svg>
          </button>
          <button type="button" className="chat-input-icon-btn" title="GIF">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
              <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
              <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
            </svg>
          </button>
          <button type="button" className="chat-input-icon-btn" title="Emoji">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <path d="M8 14s1.5 2 4 2 4-2 4-2"/>
              <line x1="9" y1="9" x2="9.01" y2="9"/>
              <line x1="15" y1="9" x2="15.01" y2="9"/>
            </svg>
          </button>
        </div>
        <input
          type="text"
          className="chat-input"
          placeholder="Escribe un mensaje"
          value={messageContent}
          onChange={(e) => setMessageContent(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              handleSendMessage(e)
            }
          }}
          disabled={sending}
          maxLength={1000}
        />
      </form>
    </div>
  )
}

export default ChatWindow
