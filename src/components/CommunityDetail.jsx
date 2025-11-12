import { useState, useEffect, useCallback } from 'react'
import { supabase, aniVerseServices } from '../lib/supabaseClient'
import { router } from '../lib/router'
import CreatePost from './CreatePost'
import PostCard from './PostCard'
import './CommunityDetail.css'

const CommunityDetail = ({ communityId }) => {
  console.log('🔵 CommunityDetail montado con communityId:', communityId)
  
  const [community, setCommunity] = useState(null)
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [currentUserId, setCurrentUserId] = useState(null)
  const [isJoined, setIsJoined] = useState(false)
  const [showCreatePost, setShowCreatePost] = useState(false)

  // Log cuando cambia communityId
  useEffect(() => {
    console.log('🟢 CommunityDetail - communityId actualizado:', communityId)
  }, [communityId])

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

  const loadCommunityData = useCallback(async () => {
    console.log('📥 Cargando datos de comunidad para ID:', communityId)
    try {
      setLoading(true)
      setError(null)

      const { data: communityData, error: communityError } = await supabase
        .from('communities')
        .select('*')
        .eq('id', communityId)
        .single()

      if (communityError) {
        console.error('❌ Error al cargar comunidad:', communityError)
        throw communityError
      }

      console.log('✅ Comunidad cargada:', communityData)
      setCommunity(communityData)

      if (currentUserId) {
        const { data: membership } = await supabase
          .from('user_communities')
          .select('id')
          .eq('user_id', currentUserId)
          .eq('community_id', communityId)
          .single()

        setIsJoined(!!membership)
      }

      const { data: postsData, error: postsError } = await supabase
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
        .order('created_at', { ascending: false })

      if (postsError) {
        console.error('Error al cargar posts:', postsError)
      } else {
        setPosts(postsData || [])
      }

    } catch (err) {
      console.error('Error en loadCommunityData:', err)
      setError(`Error al cargar la comunidad: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }, [communityId, currentUserId])

  useEffect(() => {
    loadCommunityData()
  }, [loadCommunityData])

  const handleJoinToggle = async () => {
    if (!currentUserId) {
      setError('Debes iniciar sesión para unirte a comunidades')
      return
    }

    try {
      if (isJoined) {
        await aniVerseServices.communities.leave(communityId, currentUserId)
        setIsJoined(false)
      } else {
        await aniVerseServices.communities.join(communityId, currentUserId)
        setIsJoined(true)
      }
    } catch (err) {
      console.error('Error al cambiar membresía:', err)
      setError(`Error: ${err.message}`)
    }
  }

  console.log('🎨 CommunityDetail renderizando - loading:', loading, 'communityId:', communityId)

  // Placeholder visual para debug
  if (!communityId) {
    return (
      <div className="community-detail-container">
        <div style={{
          padding: '40px',
          textAlign: 'center',
          background: '#131313',
          color: '#F5F5F5'
        }}>
          <h1 style={{
            fontFamily: 'Nunito Sans, sans-serif',
            fontWeight: 700,
            fontSize: '2rem',
            marginBottom: '16px'
          }}>
            VISTA DE DETALLE DE COMUNIDAD
          </h1>
          <p style={{
            fontFamily: 'Poppins, sans-serif',
            fontSize: '1rem',
            color: '#a0a0a0'
          }}>
            Error: No se recibió communityId
          </p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="community-detail-container">
        {/* Placeholder de debug durante carga */}
        <div style={{
          padding: '40px',
          textAlign: 'center',
          background: '#131313',
          color: '#F5F5F5',
          marginBottom: '20px'
        }}>
          <h1 style={{
            fontFamily: 'Nunito Sans, sans-serif',
            fontWeight: 700,
            fontSize: '2rem',
            marginBottom: '16px'
          }}>
            VISTA DE DETALLE DE COMUNIDAD
          </h1>
          <p style={{
            fontFamily: 'Poppins, sans-serif',
            fontSize: '1.2rem',
            color: '#D01C1C',
            marginBottom: '8px'
          }}>
            Community ID: {communityId}
          </p>
          <p style={{
            fontFamily: 'Poppins, sans-serif',
            fontSize: '1rem',
            color: '#a0a0a0'
          }}>
            Cargando datos de la comunidad...
          </p>
        </div>
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p className="loading-text">Cargando comunidad...</p>
        </div>
      </div>
    )
  }

  if (error && !community) {
    return (
      <div className="community-detail-container">
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
      <div className="community-detail-container">
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

  // Log final de renderizado
  console.log('🎯 CommunityDetail renderizando contenido completo - community:', community?.name || 'No disponible', 'loading:', loading)

  return (
    <div className="community-detail-container">
      {/* Placeholder de debug visible */}
      <div style={{
        padding: '20px',
        textAlign: 'center',
        background: '#1a1a1a',
        border: '2px solid #D01C1C',
        borderRadius: '12px',
        marginBottom: '20px'
      }}>
        <h2 style={{
          fontFamily: 'Nunito Sans, sans-serif',
          fontWeight: 700,
          fontSize: '1.5rem',
          color: '#F5F5F5',
          marginBottom: '8px'
        }}>
          VISTA DE DETALLE DE COMUNIDAD
        </h2>
        <p style={{
          fontFamily: 'Poppins, sans-serif',
          fontSize: '1rem',
          color: '#D01C1C',
          fontWeight: 600
        }}>
          ID: {communityId}
        </p>
      </div>

      <div className="community-header">
        <div className="community-avatar-large">
          {community.avatar_url ? (
            <img src={community.avatar_url} alt={community.name} />
          ) : (
            <div className="default-avatar-large">🏘️</div>
          )}
        </div>
        
        <div className="community-info-header">
          <h1 className="community-title">{community.name}</h1>
          <p className="community-description-header">{community.description}</p>
          
          <div className="community-stats">
            <span className="stat-item">
              <strong>{community.member_count || 0}</strong> miembros
            </span>
            <span className="stat-item">
              <strong>{posts.length}</strong> publicaciones
            </span>
          </div>

          {currentUserId && (
            <button
              onClick={handleJoinToggle}
              className={`join-button ${isJoined ? 'joined' : 'join'}`}
            >
              {isJoined ? 'UNIDO' : 'UNIRSE'}
            </button>
          )}
        </div>
      </div>

      <div className="community-content">
        <div className="community-posts">
          {currentUserId && isJoined && (
            <button
              onClick={() => setShowCreatePost(true)}
              className="post-button"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Crear Publicación
            </button>
          )}

          <h2 className="posts-title">Publicaciones</h2>
          
          <div className="posts-list">
            {posts.length === 0 ? (
              <div className="empty-state">
                <p>No hay publicaciones en esta comunidad aún.</p>
              </div>
            ) : (
              posts.map((post) => (
                <PostCard key={post.id} post={post} currentUserId={currentUserId} />
              ))
            )}
          </div>
        </div>
      </div>

      {showCreatePost && (
        <CreatePost
          isOpen={showCreatePost}
          onClose={() => setShowCreatePost(false)}
          onPostCreated={(newPost) => {
            setPosts(prev => [newPost, ...prev])
            setShowCreatePost(false)
          }}
          communityId={communityId}
        />
      )}
    </div>
  )
}

export default CommunityDetail

