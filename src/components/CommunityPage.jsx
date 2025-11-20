import { useState, useEffect, useCallback } from 'react'
import { supabase, aniVerseServices } from '../lib/supabaseClient'
import { router } from '../lib/router'
import CreatePost from './CreatePost'
import PostCard from './PostCard'
import './CommunityPage.css'

const CommunityPage = ({ communityId }) => {
  const [community, setCommunity] = useState(null)
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [currentUserId, setCurrentUserId] = useState(null)
  const [isJoined, setIsJoined] = useState(false)
  const [showCreatePost, setShowCreatePost] = useState(false)
  const [activeTab, setActiveTab] = useState('destacado')

  // Obtener usuario actual
  useEffect(() => {
    const getCurrentUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        setCurrentUserId(user?.id || null)
      } catch (error) {
        console.error('Error al obtener usuario:', error)
      }
    }
    getCurrentUser()
  }, [])

  // Cargar datos de la comunidad
  const loadCommunityData = useCallback(async () => {
    if (!communityId) return

    try {
      setLoading(true)
      setError(null)

      // Cargar datos de la comunidad
      const { data: communityData, error: communityError } = await supabase
        .from('communities')
        .select('*')
        .eq('id', communityId)
        .single()

      if (communityError) {
        console.error('Error al cargar comunidad:', communityError)
        throw communityError
      }

      setCommunity(communityData)

      // Verificar si el usuario está unido
      if (currentUserId) {
        const { data: membership } = await supabase
          .from('user_communities')
          .select('id')
          .eq('user_id', currentUserId)
          .eq('community_id', communityId)
          .single()

        setIsJoined(!!membership)
      }

    } catch (err) {
      console.error('Error en loadCommunityData:', err)
      setError(`Error al cargar la comunidad: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }, [communityId, currentUserId])

  // Cargar publicaciones según el tab activo
  const loadPosts = useCallback(async (communityId) => {
    try {
      let query = supabase
        .from('posts')
        .select(`
          *,
          user:users!posts_user_id_fkey(
            id,
            username,
            avatar_url,
            display_name
          )
        `)
        .eq('community_id', communityId)

      // Ordenar según el tab activo
      if (activeTab === 'destacado') {
        // Publicaciones fijadas primero, luego por likes
        query = query.order('likes_count', { ascending: false })
      } else if (activeTab === 'reciente') {
        query = query.order('created_at', { ascending: false })
      } else if (activeTab === 'multimedia') {
        query = query.not('image_url', 'is', null).order('created_at', { ascending: false })
      }

      const { data: postsData, error: postsError } = await query

      if (postsError) {
        console.error('Error al cargar posts:', postsError)
      } else {
        // Separar publicaciones fijadas (si existe is_pinned) y ordenar
        const pinnedPosts = postsData?.filter(post => post.is_pinned) || []
        const regularPosts = postsData?.filter(post => !post.is_pinned) || []
        setPosts([...pinnedPosts, ...regularPosts])
      }
    } catch (err) {
      console.error('Error al cargar posts:', err)
    }
  }, [activeTab])

  useEffect(() => {
    loadCommunityData()
  }, [loadCommunityData])

  useEffect(() => {
    if (communityId && community) {
      loadPosts(communityId)
    }
  }, [activeTab, communityId, community, loadPosts])

  // Manejar unirse/salir de la comunidad
  const handleJoinToggle = async () => {
    if (!currentUserId) {
      setError('Debes iniciar sesión para unirte a comunidades')
      return
    }

    try {
      if (isJoined) {
        await aniVerseServices.communities.leave(communityId, currentUserId)
        setIsJoined(false)
        // Actualizar contador de miembros
        setCommunity(prev => ({
          ...prev,
          member_count: Math.max(0, (prev?.member_count || 0) - 1)
        }))
      } else {
        await aniVerseServices.communities.join(communityId, currentUserId)
        setIsJoined(true)
        // Actualizar contador de miembros
        setCommunity(prev => ({
          ...prev,
          member_count: (prev?.member_count || 0) + 1
        }))
      }
    } catch (err) {
      console.error('Error al cambiar membresía:', err)
      setError(`Error: ${err.message}`)
    }
  }

  // Formatear número de miembros
  const formatMemberCount = (count) => {
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)} mil`
    }
    return count.toString()
  }

  if (!communityId) {
    return (
      <div className="community-page-container">
        <div className="error-state">
          <h2>Error: No se recibió communityId</h2>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="community-page-container">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p className="loading-text">Cargando comunidad...</p>
        </div>
      </div>
    )
  }

  if (error && !community) {
    return (
      <div className="community-page-container">
        <div className="error-container">
          <div className="error-icon">⚠️</div>
          <h3 className="error-title">Error</h3>
          <p className="error-text">{error}</p>
          <button className="retry-button" onClick={loadCommunityData}>
            Reintentar
          </button>
        </div>
      </div>
    )
  }

  if (!community) {
    return (
      <div className="community-page-container">
        <div className="empty-state">
          <div className="empty-icon">🏘️</div>
          <h3 className="empty-title">Comunidad no encontrada</h3>
          <p className="empty-text">La comunidad que buscas no existe o fue eliminada.</p>
          <button className="retry-button" onClick={() => router.navigate('communities')}>
            Volver a Comunidades
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="community-page-container">
      {/* Header con imagen de portada y avatar superpuesto */}
      <div className="community-header-section">
        <div className="community-cover-container">
          {community.cover_image ? (
            <img 
              src={community.cover_image} 
              alt={`Portada de ${community.name}`}
              className="community-cover-image"
            />
          ) : (
            <div className="community-cover-placeholder">
              <div className="cover-placeholder-icon">🏘️</div>
            </div>
          )}
          
          {/* Avatar superpuesto */}
          <div className="community-avatar-overlay">
            <div className="community-avatar-large">
              {community.avatar_url ? (
                <img src={community.avatar_url} alt={community.name} />
              ) : (
                <div className="default-avatar-large">🏘️</div>
              )}
            </div>
          </div>
        </div>

        {/* Información de la comunidad */}
        <div className="community-info-section">
          <div className="community-info-content">
            <h1 className="community-title">{community.name}</h1>
            <p className="community-description">{community.description || 'Sin descripción'}</p>
            
            <div className="community-stats">
              <span className="stat-item">
                <strong>{formatMemberCount(community.member_count || 0)}</strong> miembros
              </span>
              <span className="stat-item">
                <strong>{posts.length}</strong> publicaciones
              </span>
            </div>

            {/* Botón Unirse/Unido */}
            {currentUserId && (
              <button
                onClick={handleJoinToggle}
                className={`community-join-button ${isJoined ? 'joined' : 'join'}`}
              >
                {isJoined ? 'Unido' : 'Unirse'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Barra de navegación con tabs */}
      <div className="community-tabs-container">
        <nav className="community-tabs">
          <button
            className={`community-tab ${activeTab === 'destacado' ? 'active' : ''}`}
            onClick={() => setActiveTab('destacado')}
          >
            Destacado
          </button>
          <button
            className={`community-tab ${activeTab === 'reciente' ? 'active' : ''}`}
            onClick={() => setActiveTab('reciente')}
          >
            Más reciente
          </button>
          <button
            className={`community-tab ${activeTab === 'multimedia' ? 'active' : ''}`}
            onClick={() => setActiveTab('multimedia')}
          >
            Multimedia
          </button>
          <button
            className={`community-tab ${activeTab === 'informacion' ? 'active' : ''}`}
            onClick={() => setActiveTab('informacion')}
          >
            Información
          </button>
        </nav>
      </div>

      {/* Contenido principal */}
      <div className="community-content-wrapper">
        <div className="community-main-content">
          {/* Botón crear publicación (solo si está unido) */}
          {currentUserId && isJoined && activeTab !== 'informacion' && (
            <button
              onClick={() => setShowCreatePost(true)}
              className="create-post-button"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Crear Publicación
            </button>
          )}

          {/* Contenido según el tab activo */}
          {activeTab === 'informacion' ? (
            <div className="community-info-tab">
              <div className="info-section">
                <h3 className="info-section-title">Sobre esta comunidad</h3>
                <p className="info-section-text">{community.description || 'Sin descripción disponible.'}</p>
              </div>
              
              <div className="info-section">
                <h3 className="info-section-title">Estadísticas</h3>
                <div className="info-stats-grid">
                  <div className="info-stat-item">
                    <span className="info-stat-label">Miembros</span>
                    <span className="info-stat-value">{community.member_count || 0}</span>
                  </div>
                  <div className="info-stat-item">
                    <span className="info-stat-label">Publicaciones</span>
                    <span className="info-stat-value">{posts.length}</span>
                  </div>
                  <div className="info-stat-item">
                    <span className="info-stat-label">Categoría</span>
                    <span className="info-stat-value">{community.category || 'General'}</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="community-posts-feed">
              {posts.length === 0 ? (
                <div className="empty-posts-state">
                  <div className="empty-posts-icon">📝</div>
                  <h3 className="empty-posts-title">No hay publicaciones aún</h3>
                  <p className="empty-posts-text">
                    {isJoined 
                      ? 'Sé el primero en compartir algo en esta comunidad'
                      : 'Únete a esta comunidad para ver y crear publicaciones'
                    }
                  </p>
                </div>
              ) : (
                <div className="posts-list">
                  {posts.map((post) => (
                    <div key={post.id} className="post-wrapper">
                      {post.is_pinned && (
                        <div className="pinned-indicator">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 17v5M9 10V7a3 3 0 0 1 6 0v3M9 10l-2 7h10l-2-7M9 10h6"/>
                          </svg>
                          <span>Fijado por los moderadores</span>
                        </div>
                      )}
                      <PostCard post={post} currentUserId={currentUserId} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Barra lateral derecha (reservada para futuras funcionalidades) */}
        <aside className="community-sidebar">
          {/* Espacio reservado para: Miembros Destacados, Reglas, etc. */}
        </aside>
      </div>

      {/* Modal de crear publicación */}
      {showCreatePost && (
        <CreatePost
          isOpen={showCreatePost}
          onClose={() => setShowCreatePost(false)}
          onPostCreated={(newPost) => {
            setPosts(prev => [newPost, ...prev])
            setShowCreatePost(false)
            loadPosts(communityId)
          }}
          communityId={communityId}
        />
      )}
    </div>
  )
}

export default CommunityPage

