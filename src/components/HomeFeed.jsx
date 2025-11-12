import { useState, useEffect, useCallback } from 'react'
import { aniVerseServices } from '../lib/supabaseClient'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../hooks/useAuth'
import PostCard from './PostCard'
import CreatePost from './CreatePost'
import FeedPostComposer from './FeedPostComposer'
import './HomeFeed.css'

const HomeFeed = () => {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [currentUserId, setCurrentUserId] = useState(null)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [user, setUser] = useState(null)

  // Obtener usuario actual de forma simple
  useEffect(() => {
    const getCurrentUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        setUser(user)
        setCurrentUserId(user?.id || null)
      } catch (error) {
        console.error('Error al obtener usuario:', error)
      }
    }
    getCurrentUser()
  }, [])

  // Función para cerrar sesión
  const signOut = async () => {
    try {
      await supabase.auth.signOut()
      window.location.reload()
    } catch (error) {
      console.error('Error al cerrar sesión:', error)
    }
  }

  // Cargar posts iniciales
  const loadPosts = useCallback(async () => {
    try {
      console.log('Iniciando carga de posts...')
      setLoading(true)
      setError(null)
      
      const postsData = await aniVerseServices.getPosts()
      console.log('Posts cargados:', postsData?.length || 0, postsData)
      
      setPosts(postsData || [])
      
      if (!postsData || postsData.length === 0) {
        console.log('No hay posts disponibles')
      }
    } catch (err) {
      console.error('Error al cargar posts:', err)
      setError(`Error al cargar las publicaciones: ${err.message}`)
      setPosts([])
    } finally {
      setLoading(false)
    }
  }, [])

  // Cargar posts al montar el componente
  useEffect(() => {
    // Solo cargar si hay un usuario autenticado
    if (currentUserId) {
      console.log('Usuario autenticado, cargando posts...')
      loadPosts()
    } else {
      // Si no hay usuario, mostrar estado de carga inicial
      setLoading(false)
    }
  }, [currentUserId, loadPosts])

  // Configurar suscripción en tiempo real
  useEffect(() => {
    let subscription

    const setupRealtimeSubscription = () => {
      subscription = aniVerseServices.subscribeToPosts((payload) => {
        console.log('Cambio detectado en tiempo real:', payload)

        switch (payload.eventType) {
          case 'INSERT':
            // Nuevo post insertado
            setPosts(prevPosts => {
              // Evitar duplicados
              const exists = prevPosts.some(post => post.id === payload.new.id)
              if (exists) return prevPosts
              
              // Agregar el nuevo post al inicio
              return [payload.new, ...prevPosts]
            })
            break

          case 'UPDATE':
            // Post actualizado
            setPosts(prevPosts => 
              prevPosts.map(post => 
                post.id === payload.new.id ? { ...post, ...payload.new } : post
              )
            )
            break

          case 'DELETE':
            // Post eliminado
            setPosts(prevPosts => 
              prevPosts.filter(post => post.id !== payload.old.id)
            )
            break

          default:
            break
        }
      })
    }

    setupRealtimeSubscription()

    // Cleanup al desmontar
    return () => {
      if (subscription) {
        subscription.unsubscribe()
      }
    }
  }, [])

  // Función para recargar posts manualmente
  const handleRefresh = () => {
    loadPosts()
  }

  // Función para manejar cuando se crea un nuevo post
  const handlePostCreated = (newPost) => {
    setPosts(prevPosts => [newPost, ...prevPosts])
  }

  // Función para abrir el modal de crear post
  const handleCreatePost = () => {
    setIsCreateModalOpen(true)
  }

  // Función para cerrar el modal de crear post
  const handleCloseModal = () => {
    setIsCreateModalOpen(false)
  }

  // Mostrar estado de carga
  if (loading && posts.length === 0) {
    return (
      <div className="home-feed">
        <div className="feed-header">
          <h1 className="feed-title">AniVerse</h1>
          <p className="feed-subtitle">Tu feed de anime y manga</p>
        </div>
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p className="loading-text">Cargando publicaciones...</p>
        </div>
      </div>
    )
  }

  // Mostrar error
  if (error) {
    return (
      <div className="home-feed">
        <div className="feed-header">
          <h1 className="feed-title">AniVerse</h1>
          <p className="feed-subtitle">Tu feed de anime y manga</p>
        </div>
        <div className="error-container">
          <div className="error-icon">⚠️</div>
          <p className="error-text">{error}</p>
          <button className="retry-button" onClick={handleRefresh}>
            Reintentar
          </button>
        </div>
      </div>
    )
  }

  // Feed vacío
  if (posts.length === 0) {
    return (
      <div className="home-feed">
        <div className="feed-header">
          <h1 className="feed-title">AniVerse</h1>
          <p className="feed-subtitle">Tu feed de anime y manga</p>
        </div>
        <div className="empty-container">
          <div className="empty-icon">🎌</div>
          <h3 className="empty-title">No hay publicaciones aún</h3>
          <p className="empty-text">
            Sé el primero en compartir algo con la comunidad AniVerse
          </p>
          <button className="create-post-button" onClick={handleCreatePost}>
            Crear primera publicación
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="home-feed">
      {/* Header del Feed */}
      <div className="feed-header">
        <p className="feed-subtitle">Tu feed de anime y manga</p>
        <div className="header-actions">

        </div>
      </div>

      {/* Compositor de Posts Inline */}
      {currentUserId && (
        <div className="feed-composer-wrapper">
          <FeedPostComposer 
            onPostCreated={handlePostCreated}
            currentUserId={currentUserId}
          />
        </div>
      )}

      {/* Lista de Posts */}
      <div className="posts-container">
        {posts.map((post) => (
          <PostCard 
            key={post.id} 
            post={post} 
            currentUserId={currentUserId}
          />
        ))}
      </div>

      {/* Indicador de carga para nuevos posts */}
      {loading && posts.length > 0 && (
        <div className="loading-indicator">
          <div className="loading-spinner small"></div>
          <span>Actualizando...</span>
        </div>
      )}

      {/* Botón flotante para crear post */}
      <button 
        className="floating-create-button"
        onClick={handleCreatePost}
        aria-label="Crear nueva publicación"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="#F5F5F5" strokeWidth="2">
          <line x1="12" y1="5" x2="12" y2="19"/>
          <line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
      </button>

      {/* Indicador de conexión en tiempo real */}
      <div className="realtime-indicator">
        <div className="realtime-dot"></div>
        <span>Tiempo real activo</span>
      </div>

      {/* Modal de crear publicación */}
      <CreatePost
        isOpen={isCreateModalOpen}
        onClose={handleCloseModal}
        onPostCreated={handlePostCreated}
      />
    </div>
  )
}

export default HomeFeed
