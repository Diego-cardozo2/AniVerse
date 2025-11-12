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
          .select('display_name, username, avatar_url, email')
          .eq('id', otherUserId)
          .single()

        if (otherUserProfile) {
          setOtherUser({
            id: otherUserId,
            ...otherUserProfile
          })
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
    const now = new Date()
    const diff = now - date
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (minutes < 1) return 'Ahora'
    if (minutes < 60) return `Hace ${minutes} min`
    if (hours < 24) return `Hace ${hours} h`
    if (days === 1) return 'Ayer'
    if (days < 7) return `Hace ${days} días`
    
    return date.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    })
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
        <div className="chat-header-info">
          <UserLink 
            user={{
              id: otherUser.id,
              display_name: otherUser.display_name,
              username: otherUser.username,
              avatar_url: otherUser.avatar_url,
              email: otherUser.email
            }}
            size="medium"
            showAvatar={true}
            showName={false}
          />
          <div className="chat-user-info">
            <UserLink 
              user={{
                id: otherUser.id,
                display_name: otherUser.display_name,
                username: otherUser.username,
                avatar_url: otherUser.avatar_url,
                email: otherUser.email
              }}
              size="small"
              showAvatar={false}
              showName={true}
              className="chat-user-name-link"
            />
            <p className="chat-user-username">
              @{otherUser.username || otherUser.email?.split('@')[0]}
            </p>
          </div>
        </div>
        {onClose && (
          <button className="chat-close-button" onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
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
        <input
          type="text"
          className="chat-input"
          placeholder="Escribe un mensaje..."
          value={messageContent}
          onChange={(e) => setMessageContent(e.target.value)}
          disabled={sending}
          maxLength={1000}
        />
        <button
          type="submit"
          className="chat-send-button"
          disabled={!messageContent.trim() || sending}
        >
          {sending ? (
            <div className="send-spinner"></div>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          )}
        </button>
      </form>
    </div>
  )
}

export default ChatWindow
