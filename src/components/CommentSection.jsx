import { useState, useEffect, useRef } from 'react'
import { aniVerseServices } from '../lib/supabaseClient'
import UserLink from './UserLink'
import './CommentSection.css'

const CommentSection = ({ postId, currentUserId, onClose }) => {
  const [comments, setComments] = useState([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [commentContent, setCommentContent] = useState('')
  const [error, setError] = useState(null)
  const commentsEndRef = useRef(null)
  const textareaRef = useRef(null)

  // Scroll automático al final de los comentarios
  const scrollToBottom = () => {
    commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  // Cargar comentarios iniciales
  useEffect(() => {
    const loadComments = async () => {
      try {
        setLoading(true)
        const commentsData = await aniVerseServices.comments.getPostComments(postId)
        console.log('Comentarios cargados:', commentsData)
        console.log('Primer comentario ejemplo:', commentsData[0])
        setComments(commentsData || [])
      } catch (error) {
        console.error('Error al cargar comentarios:', error)
        setError('Error al cargar los comentarios')
      } finally {
        setLoading(false)
      }
    }

    loadComments()
  }, [postId])

  // Suscribirse a cambios de comentarios en tiempo real
  useEffect(() => {
    const subscription = aniVerseServices.comments.subscribeToComments(postId, (payload) => {
      console.log('Cambio en comentarios detectado:', payload)

      const eventType = payload.eventType || 
        (payload.new ? 'INSERT' : payload.old ? 'DELETE' : null)

      if (eventType === 'INSERT' && payload.new) {
        // Nuevo comentario agregado - necesitamos cargar el usuario también
        // Intentar cargar el comentario completo con el usuario
        aniVerseServices.comments.getPostComments(postId).then(comments => {
          setComments(comments)
          setTimeout(scrollToBottom, 100)
        }).catch(err => {
          console.error('Error al recargar comentarios:', err)
          // Si falla, agregar el comentario básico
          setComments(prev => {
            const exists = prev.some(comment => comment.id === payload.new.id)
            if (exists) return prev
            return [...prev, payload.new]
          })
          setTimeout(scrollToBottom, 100)
        })
      } else if (eventType === 'DELETE' && payload.old) {
        // Comentario eliminado
        setComments(prev => prev.filter(comment => comment.id !== payload.old.id))
      }
    })

    // Cleanup al desmontar
    return () => {
      if (subscription) {
        subscription.unsubscribe()
      }
    }
  }, [postId])

  // Scroll cuando cambian los comentarios
  useEffect(() => {
    if (!loading) {
      scrollToBottom()
    }
  }, [comments, loading])

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px'
    }
  }, [commentContent])

  // Enviar comentario
  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!commentContent.trim() || !currentUserId || sending) {
      return
    }

    setSending(true)
    setError(null)

    try {
      const newComment = await aniVerseServices.comments.createComment(
        postId,
        currentUserId,
        commentContent.trim()
      )

      // Limpiar input
      setCommentContent('')
      
      // El comentario se agregará automáticamente via Realtime
      // Pero por si acaso lo agregamos manualmente también
      setComments(prev => {
        const exists = prev.some(comment => comment.id === newComment.id)
        if (exists) return prev
        return [...prev, newComment]
      })

      // Scroll al final
      setTimeout(scrollToBottom, 100)
    } catch (error) {
      console.error('Error al enviar comentario:', error)
      setError('Error al enviar el comentario. Intenta de nuevo.')
    } finally {
      setSending(false)
    }
  }

  // Formatear fecha
  const formatDate = (dateString) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = (now - date) / (1000 * 60 * 60)

    if (diffInHours < 1) {
      const diffInMinutes = Math.floor((now - date) / (1000 * 60))
      return `hace ${diffInMinutes}m`
    } else if (diffInHours < 24) {
      return `hace ${Math.floor(diffInHours)}h`
    } else {
      const diffInDays = Math.floor(diffInHours / 24)
      return `hace ${diffInDays}d`
    }
  }

  return (
    <div className="comment-section">
      {/* Header */}
      <div className="comment-section-header">
        <h3 className="comment-section-title">Comentarios</h3>
        {onClose && (
          <button 
            className="comment-section-close"
            onClick={onClose}
            aria-label="Cerrar comentarios"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        )}
      </div>

      {/* Lista de comentarios */}
      <div className="comment-list">
        {loading ? (
          <div className="comment-loading">
            <div className="loading-spinner small"></div>
            <span>Cargando comentarios...</span>
          </div>
        ) : comments.length === 0 ? (
          <div className="comment-empty">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            <p>No hay comentarios aún</p>
            <p className="comment-empty-subtitle">Sé el primero en comentar</p>
          </div>
        ) : (
          comments.map((comment) => {
            // Verificar que comment.user existe, si no usar datos básicos
            const user = comment.user || {
              id: comment.user_id,
              username: 'Usuario',
              display_name: 'Usuario',
              avatar_url: null
            }
            
            return (
              <div key={comment.id} className="comment-item">
                <UserLink 
                  user={user}
                  size="small"
                  showAvatar={true}
                  showName={false}
                />
                <div className="comment-content-wrapper">
                  <UserLink 
                    user={user}
                    size="small"
                    showAvatar={false}
                    showName={true}
                    className="comment-username-link"
                  />
                  <span className="comment-time">{formatDate(comment.created_at)}</span>
                  <span className="comment-text">{comment.content}</span>
                  {currentUserId === comment.user_id && (
                    <button
                      className="comment-delete"
                      onClick={async () => {
                        if (window.confirm('¿Eliminar este comentario?')) {
                          try {
                            await aniVerseServices.comments.deleteComment(comment.id, currentUserId)
                          } catch (error) {
                            console.error('Error al eliminar comentario:', error)
                            alert('Error al eliminar el comentario')
                          }
                        }
                      }}
                      aria-label="Eliminar comentario"
                    >
                      Eliminar
                    </button>
                  )}
                </div>
                <div ref={commentsEndRef} />
              </div>
            )
          })
        )}
      </div>

      {/* Formulario de comentario */}
      {currentUserId && (
        <form className="comment-form" onSubmit={handleSubmit}>
          {error && (
            <div className="comment-error">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <span>{error}</span>
            </div>
          )}
          <div className="comment-input-wrapper">
            <textarea
              ref={textareaRef}
              value={commentContent}
              onChange={(e) => setCommentContent(e.target.value)}
              placeholder="Escribe un comentario..."
              className="comment-input"
              rows={1}
              disabled={sending}
              maxLength={500}
            />
            <button
              type="submit"
              className={`comment-submit ${sending || !commentContent.trim() ? 'disabled' : ''}`}
              disabled={sending || !commentContent.trim()}
            >
              {sending ? (
                <>
                  <div className="button-spinner small"></div>
                  <span>Enviando...</span>
                </>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="22" y1="2" x2="11" y2="13"/>
                    <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                  </svg>
                  <span>Enviar</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}

export default CommentSection

