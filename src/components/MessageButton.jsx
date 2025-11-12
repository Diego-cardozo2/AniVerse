import { useState } from 'react'
import { router } from '../lib/router'
import { aniVerseServices } from '../lib/supabaseClient'
import './MessageButton.css'

const MessageButton = ({ targetUserId, currentUserId }) => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // No mostrar el botón si es el perfil propio
  if (!targetUserId || !currentUserId || targetUserId === currentUserId) {
    return null
  }

  const handleClick = async (e) => {
    e.preventDefault()
    e.stopPropagation()

    if (loading) return

    try {
      setLoading(true)
      setError(null)

      // Buscar o crear el chat entre los dos usuarios
      const chatId = await aniVerseServices.chats.findOrCreateChat(currentUserId, targetUserId)

      // Navegar a la vista de mensajes con el chatId
      router.navigate(`messages/${chatId}`)
    } catch (err) {
      console.error('Error al crear/obtener chat:', err)
      setError('Error al iniciar la conversación. Intenta de nuevo.')
      setLoading(false)
    }
  }

  return (
    <button
      className="message-button"
      onClick={handleClick}
      disabled={loading}
      aria-label="Enviar mensaje"
    >
      {loading ? (
        <>
          <div className="button-spinner small"></div>
          <span>Iniciando...</span>
        </>
      ) : (
        <>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
            <polyline points="22,6 12,13 2,6"/>
          </svg>
          <span>Enviar Mensaje</span>
        </>
      )}
      {error && (
        <span className="message-button-error" role="alert">
          {error}
        </span>
      )}
    </button>
  )
}

export default MessageButton

