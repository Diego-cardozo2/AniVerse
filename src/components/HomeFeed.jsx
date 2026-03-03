import { useState, useEffect, useCallback } from 'react'
import { aniVerseServices } from '../lib/supabaseClient'
import { supabase } from '../lib/supabaseClient'
import PostCard from './PostCard'
import CreatePost from './CreatePost'
import FeedPostComposer from './FeedPostComposer'
import FeedTabs, { TAB_PARA_TI, TAB_SIGUIENDO } from './FeedTabs'
import './HomeFeed.css'

const HomeFeed = () => {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [currentUserId, setCurrentUserId] = useState(null)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [user, setUser] = useState(null)
  const [activeTab, setActiveTab] = useState(TAB_PARA_TI)
  const [followingIds, setFollowingIds] = useState([])

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

  // Obtener lista de usuarios que el usuario actual sigue
  useEffect(() => {
    if (!currentUserId) {
      setFollowingIds([])
      return
    }
    const fetchFollowing = async () => {
      try {
        const { data, error: followError } = await supabase
          .from('user_follows')
          .select('following_id')
          .eq('follower_id', currentUserId)
        if (!followError && data) {
          setFollowingIds(data.map((f) => f.following_id))
        } else {
          setFollowingIds([])
        }
      } catch (err) {
        console.error('Error al cargar seguidos:', err)
        setFollowingIds([])
      }
    }
    fetchFollowing()
  }, [currentUserId])

  // Cargar posts según la pestaña activa (Para ti = todos, Siguiendo = solo seguidos)
  const loadPostsForTab = useCallback(async () => {
    if (!currentUserId) {
      setLoading(false)
      return
    }
    try {
      setLoading(true)
      setError(null)
      const postsData =
        activeTab === TAB_PARA_TI
          ? await aniVerseServices.getPosts()
          : await aniVerseServices.getPostsFromFollowing(currentUserId)
      setPosts(postsData || [])
    } catch (err) {
      console.error('Error al cargar posts:', err)
      setError(`Error al cargar las publicaciones: ${err.message}`)
      setPosts([])
    } finally {
      setLoading(false)
    }
  }, [currentUserId, activeTab])

  // Al cambiar de pestaña o usuario, recargar posts
  useEffect(() => {
    if (currentUserId) {
      loadPostsForTab()
    } else {
      setPosts([])
      setLoading(false)
    }
  }, [currentUserId, activeTab, loadPostsForTab])

  // Suscripción Realtime: actualizar feed según pestaña activa y lista de seguidos
  useEffect(() => {
    let subscription
    subscription = aniVerseServices.subscribeToPosts((payload) => {
      const eventType = payload.eventType ?? (payload.new ? 'INSERT' : payload.old ? 'DELETE' : null)

      switch (eventType) {
        case 'INSERT': {
          const isFromFollowed = followingIds.includes(payload.new?.user_id)
          const shouldAdd =
            activeTab === TAB_PARA_TI || (activeTab === TAB_SIGUIENDO && isFromFollowed)
          if (!shouldAdd) break
          setPosts((prev) => {
            const exists = prev.some((p) => p.id === payload.new.id)
            if (exists) return prev
            return [payload.new, ...prev]
          })
          break
        }
        case 'UPDATE':
          setPosts((prev) =>
            prev.map((p) => (p.id === payload.new?.id ? { ...p, ...payload.new } : p))
          )
          break
        case 'DELETE':
          setPosts((prev) => prev.filter((p) => p.id !== payload.old?.id))
          break
        default:
          break
      }
    })
    return () => {
      if (subscription) subscription.unsubscribe()
    }
  }, [activeTab, followingIds])

  const handleRefresh = () => {
    loadPostsForTab()
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

  // Estado de carga inicial
  if (loading && posts.length === 0) {
    return (
      <div className="home-feed">
        <div className="feed-header">
          <p className="feed-subtitle">Tu feed de anime y manga</p>
        </div>
        {currentUserId && (
          <div className="feed-composer-wrapper">
            <FeedPostComposer
              onPostCreated={handlePostCreated}
              currentUserId={currentUserId}
            />
          </div>
        )}
        <div className="feed-tabs-wrapper">
          <FeedTabs activeTab={activeTab} onTabChange={setActiveTab} />
        </div>
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p className="loading-text">Cargando publicaciones...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="home-feed">
        <div className="feed-header">
          <p className="feed-subtitle">Tu feed de anime y manga</p>
        </div>
        {currentUserId && (
          <div className="feed-tabs-wrapper">
            <FeedTabs activeTab={activeTab} onTabChange={setActiveTab} />
          </div>
        )}
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

  // Feed vacío: mensaje distinto para "Siguiendo"
  if (posts.length === 0 && !loading) {
    const isSiguiendoEmpty = activeTab === TAB_SIGUIENDO
    return (
      <div className="home-feed">
        <div className="feed-header">
          <p className="feed-subtitle">Tu feed de anime y manga</p>
        </div>
        {currentUserId && (
          <>
            <div className="feed-composer-wrapper">
              <FeedPostComposer
                onPostCreated={handlePostCreated}
                currentUserId={currentUserId}
              />
            </div>
            <div className="feed-tabs-wrapper">
              <FeedTabs activeTab={activeTab} onTabChange={setActiveTab} />
            </div>
          </>
        )}
        <div className="empty-container">
          {isSiguiendoEmpty ? (
            <>
              <div className="empty-icon">👥</div>
              <h3 className="empty-title">Aún no sigues a nadie</h3>
              <p className="empty-text">
                ¡Explora el AniVerse para encontrar nuevos amigos!
              </p>
            </>
          ) : (
            <>
              <div className="empty-icon">🎌</div>
              <h3 className="empty-title">No hay publicaciones aún</h3>
              <p className="empty-text">
                Sé el primero en compartir algo con la comunidad AniVerse
              </p>
              <button className="create-post-button" onClick={handleCreatePost}>
                Crear primera publicación
              </button>
            </>
          )}
        </div>
        {currentUserId && (
          <>
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
            <CreatePost
              isOpen={isCreateModalOpen}
              onClose={handleCloseModal}
              onPostCreated={handlePostCreated}
            />
          </>
        )}
      </div>
    )
  }

  return (
    <div className="home-feed">
      <div className="feed-header">
        <p className="feed-subtitle">Tu feed de anime y manga</p>
      </div>

      {currentUserId && (
        <div className="feed-composer-wrapper">
          <FeedPostComposer
            onPostCreated={handlePostCreated}
            currentUserId={currentUserId}
          />
        </div>
      )}

      <div className="feed-tabs-wrapper">
        <FeedTabs activeTab={activeTab} onTabChange={setActiveTab} />
      </div>

      <div className="posts-container feed-content-transition">
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
