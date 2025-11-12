import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { router } from '../lib/router'
import UserLink from './UserLink'
import ChatWindow from './ChatWindow'
import './Messages.css'

const Messages = () => {
  const [chats, setChats] = useState([])
  const [loading, setLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState(null)
  const [selectedChatId, setSelectedChatId] = useState(null)
  const [error, setError] = useState(null)

  // Obtener usuario actual y cargar chats
  useEffect(() => {
    const loadChats = async () => {
      try {
        setLoading(true)

        // Obtener usuario actual
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        
        if (userError || !user) {
          setError('Debes estar autenticado para ver los mensajes')
          return
        }

        setCurrentUserId(user.id)

        // Verificar si hay un chatId en la URL (ruta dinámica)
        const params = router.getCurrentParams()
        if (params.chatId) {
          setSelectedChatId(params.chatId)
        }

        // Cargar chats del usuario
        const { data: userChats, error: chatsError } = await supabase
          .from('chats')
          .select('*')
          .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
          .order('updated_at', { ascending: false })

        if (chatsError) {
          console.error('Error al cargar chats:', chatsError)
          setError('Error al cargar las conversaciones')
          return
        }

        // Enriquecer chats con información del otro usuario y último mensaje
        const enrichedChats = await Promise.all(
          (userChats || []).map(async (chat) => {
            const otherUserId = chat.user1_id === user.id ? chat.user2_id : chat.user1_id
            
            // Obtener información del otro usuario
            const { data: otherUser } = await supabase
              .from('users')
              .select('display_name, username, avatar_url, email')
              .eq('id', otherUserId)
              .single()

            // Obtener último mensaje
            const { data: lastMessage } = await supabase
              .from('messages')
              .select('content, created_at')
              .eq('chat_id', chat.id)
              .order('created_at', { ascending: false })
              .limit(1)
              .single()

            return {
              ...chat,
              otherUser: otherUser || { id: otherUserId },
              lastMessage: lastMessage || null
            }
          })
        )

        setChats(enrichedChats)

      } catch (err) {
        console.error('Error:', err)
        setError('Error al cargar los mensajes')
      } finally {
        setLoading(false)
      }
    }

    loadChats()
  }, [])

  // Escuchar cambios en la ruta para actualizar el chat seleccionado
  useEffect(() => {
    const params = router.getCurrentParams()
    if (params.chatId) {
      setSelectedChatId(params.chatId)
    }
  }, [router.getCurrentRoute()])

  // Navegar a un chat
  const handleChatClick = (chatId) => {
    setSelectedChatId(chatId)
    router.navigate(`messages/${chatId}`)
  }

  // Cerrar chat y volver a la lista
  const handleCloseChat = () => {
    setSelectedChatId(null)
    router.navigate('messages')
  }

  // Formatear fecha del último mensaje
  const formatLastMessageTime = (timestamp) => {
    if (!timestamp) return ''
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now - date
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (minutes < 1) return 'Ahora'
    if (minutes < 60) return `${minutes}m`
    if (hours < 24) return `${hours}h`
    if (days === 1) return 'Ayer'
    if (days < 7) return `${days}d`
    
    return date.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short'
    })
  }

  // Layout de doble columna en escritorio, pantalla completa en móvil
  if (loading) {
    return (
      <div className="messages-container">
        <div className="messages-loading">
          <div className="loading-spinner"></div>
          <p className="loading-text">Cargando mensajes...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="messages-container">
        <div className="messages-error">
          <p>{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="messages-container">
      {/* Layout de doble columna en escritorio */}
      <div className="messages-layout">
        {/* Columna izquierda: Lista de chats */}
        <div className="messages-sidebar">
          <div className="messages-header">
            <h1 className="messages-title">Mensajes</h1>
          </div>

          <div className="messages-list">
            {chats.length === 0 ? (
              <div className="messages-empty">
                <p>No tienes conversaciones todavía</p>
                <p className="messages-empty-subtitle">Inicia una conversación desde el perfil de otro usuario</p>
              </div>
            ) : (
              chats.map((chat) => (
                <div
                  key={chat.id}
                  className={`chat-item ${selectedChatId === chat.id ? 'chat-item-active' : ''}`}
                  onClick={() => handleChatClick(chat.id)}
                >
                  <UserLink 
                    user={{
                      id: chat.otherUser.id,
                      display_name: chat.otherUser.display_name,
                      username: chat.otherUser.username,
                      avatar_url: chat.otherUser.avatar_url,
                      email: chat.otherUser.email
                    }}
                    size="medium"
                    showAvatar={true}
                    showName={false}
                  />
                  <div className="chat-item-content">
                    <div className="chat-item-header">
                      <UserLink 
                        user={{
                          id: chat.otherUser.id,
                          display_name: chat.otherUser.display_name,
                          username: chat.otherUser.username,
                          avatar_url: chat.otherUser.avatar_url,
                          email: chat.otherUser.email
                        }}
                        size="small"
                        showAvatar={false}
                        showName={true}
                        className="chat-item-name-link"
                      />
                      {chat.lastMessage && (
                        <span className="chat-item-time">
                          {formatLastMessageTime(chat.lastMessage.created_at)}
                        </span>
                      )}
                    </div>
                    {chat.lastMessage && (
                      <p className="chat-item-preview">
                        {chat.lastMessage.content.length > 60
                          ? chat.lastMessage.content.substring(0, 60) + '...'
                          : chat.lastMessage.content}
                      </p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Columna derecha: Chat activo o estado vacío */}
        <div className="messages-main">
          {selectedChatId ? (
            <ChatWindow chatId={selectedChatId} onClose={handleCloseChat} />
          ) : (
            <div className="messages-empty-state">
              <div className="empty-state-icon">💬</div>
              <h2 className="empty-state-title">Selecciona una conversación</h2>
              <p className="empty-state-text">Elige un chat de la lista para comenzar a conversar</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Messages
