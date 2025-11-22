import { useState, useEffect } from 'react'
import { aniVerseServices } from '../lib/supabaseClient'
import UserLink from './UserLink'
import CommentSection from './CommentSection'
import './PostCard.css'

const PostCard = ({ post, currentUserId }) => {
  const [likes, setLikes] = useState([])
  const [isLiked, setIsLiked] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showComments, setShowComments] = useState(false)
  const [commentsCount, setCommentsCount] = useState(0)

  // Verificar si el usuario actual ya dio like
  useEffect(() => {
    const userLike = likes.find(like => like.user_id === currentUserId)
    setIsLiked(!!userLike)
  }, [likes, currentUserId])

  // Cargar likes iniciales y suscribirse a cambios en tiempo real
  useEffect(() => {
    const fetchLikes = async () => {
      try {
        const likesData = await aniVerseServices.getPostLikes(post.id)
        setLikes(likesData)
      } catch (error) {
        console.error('Error al cargar likes:', error)
      }
    }

    fetchLikes()

    // Suscribirse a cambios de likes en tiempo real
    const subscription = aniVerseServices.subscribeToLikes(post.id, (payload) => {
      console.log('Cambio en likes detectado:', payload)
      
      // Manejar diferentes tipos de eventos
      const eventType = payload.eventType || 
        (payload.new ? 'INSERT' : payload.old ? 'DELETE' : null)
      
      if (eventType === 'INSERT' && payload.new) {
        // Nuevo like agregado
        setLikes(prev => {
          const exists = prev.some(like => like.id === payload.new.id)
          if (exists) return prev
          return [...prev, payload.new]
        })
      } else if (eventType === 'DELETE' && payload.old) {
        // Like eliminado
        setLikes(prev => prev.filter(like => like.id !== payload.old.id))
      }
    })

    // Cleanup al desmontar
    return () => {
      if (subscription) {
        subscription.unsubscribe()
      }
    }
  }, [post.id])

  // Cargar contador de comentarios
  useEffect(() => {
    const loadCommentsCount = async () => {
      try {
        const comments = await aniVerseServices.comments.getPostComments(post.id)
        setCommentsCount(comments.length)
      } catch (error) {
        console.error('Error al cargar contador de comentarios:', error)
      }
    }

    loadCommentsCount()
  }, [post.id])

  // Suscribirse a cambios de comentarios para actualizar contador
  useEffect(() => {
    const subscription = aniVerseServices.comments.subscribeToComments(post.id, (payload) => {
      const eventType = payload.eventType || 
        (payload.new ? 'INSERT' : payload.old ? 'DELETE' : null)
      
      if (eventType === 'INSERT') {
        setCommentsCount(prev => prev + 1)
      } else if (eventType === 'DELETE') {
        setCommentsCount(prev => Math.max(0, prev - 1))
      }
    })

    return () => {
      if (subscription) {
        subscription.unsubscribe()
      }
    }
  }, [post.id])
  const handleLike = async () => {
    if (loading || !currentUserId) return

    setLoading(true)
    try {
      await aniVerseServices.toggleLike(post.id, currentUserId)
      
      // Actualizar estado local inmediatamente para mejor UX
      if (isLiked) {
        setLikes(prev => prev.filter(like => like.user_id !== currentUserId))
        setIsLiked(false)
      } else {
        setLikes(prev => [...prev, { user_id: currentUserId, post_id: post.id }])
        setIsLiked(true)
      }
    } catch (error) {
      console.error('Error al dar like:', error)
    } finally {
      setLoading(false)
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
    <article className="post-card">
      {/* Header del Post */}
      <header className="post-header">
        <div className="user-info">
          <UserLink 
            user={post.user}
            size="medium"
            showAvatar={true}
            showName={true}
          />
          <div className="user-details">
            <span className="post-time">
              {formatDate(post.created_at)}
            </span>
          </div>
        </div>
      </header>

      {/* Contenido del Post */}
      <div className="post-content">
        {post.content && (
          <p className="post-text">{post.content}</p>
        )}
        
        {post.image_url && (
          <div className="post-image-container">
            <img 
              src={post.image_url} 
              alt="Imagen del post"
              className="post-image"
            />
          </div>
        )}
      </div>

      {/* Interacciones */}
      <footer className="post-actions">
        <button 
          className={`like-button ${isLiked ? 'liked' : ''}`}
          onClick={handleLike}
          disabled={loading}
          aria-label={isLiked ? 'Quitar like' : 'Dar like'}
        >
          <svg 
            className="like-icon" 
            viewBox="0 0 24 24" 
            fill={isLiked ? '#D01C1C' : 'none'}
            stroke="#D01C1C"
            strokeWidth="2"
          >
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
          <span className="like-count">{likes.length}</span>
        </button>

        <button 
          className={`comment-button ${showComments ? 'active' : ''}`}
          onClick={() => setShowComments(!showComments)}
          aria-label="Comentar"
        >
          <svg className="comment-icon" viewBox="0 0 24 24" fill="none" stroke="#D01C1C" strokeWidth="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          <span className="comment-count">{commentsCount}</span>
        </button>

        <button className="share-button" aria-label="Compartir">
          <svg className="share-icon" viewBox="0 0 24 24" fill="none" stroke="#D01C1C" strokeWidth="2">
            <circle cx="18" cy="5" r="3"/>
            <circle cx="6" cy="12" r="3"/>
            <circle cx="18" cy="19" r="3"/>
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
          </svg>
        </button>
      </footer>

      {/* Sección de comentarios */}
      {showComments && (
        <div className="post-comments-section">
          <CommentSection 
            postId={post.id}
            currentUserId={currentUserId}
            onClose={() => setShowComments(false)}
          />
        </div>
      )}
    </article>
  )
}

export default PostCard
