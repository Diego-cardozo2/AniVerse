import { useState, useEffect, useCallback } from 'react'
import { supabase, aniVerseServices } from '../lib/supabaseClient'
import { router } from '../lib/router'
import CommunityCard from './CommunityCard'
import './Communities.css'

const Communities = () => {
  const [communities, setCommunities] = useState([])
  const [filteredCommunities, setFilteredCommunities] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [currentUserId, setCurrentUserId] = useState(null)
  const [userMemberships, setUserMemberships] = useState(new Set())
  const [activeView, setActiveView] = useState('explore')
  const [userRole, setUserRole] = useState('FREEMIUM')

  // Obtener usuario actual y su rol
  useEffect(() => {
    const getCurrentUser = async () => {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        
        if (userError) {
          console.error('Error al obtener usuario:', userError)
          setCurrentUserId(null)
          setUserRole('FREEMIUM')
          return
        }
        
        setCurrentUserId(user?.id || null)
        
        // Obtener rol del usuario (user_role)
        if (user) {
          const { data: profile, error: profileError } = await supabase
            .from('users')
            .select('user_role')
            .eq('id', user.id)
            .single()
          
          if (profileError) {
            console.error('Error al obtener perfil:', profileError)
            setUserRole('FREEMIUM')
            return
          }
          
          const role = profile?.user_role || 'FREEMIUM'
          setUserRole(role)
          console.log('✅ Rol del usuario cargado en Communities:', role)
        } else {
          setUserRole('FREEMIUM')
        }
      } catch (error) {
        console.error('Error al obtener usuario:', error)
        setUserRole('FREEMIUM')
      }
    }
    getCurrentUser()
    
    // Recargar el rol cuando la página se vuelve visible (por si cambió en otra pestaña)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        getCurrentUser()
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  // Cargar comunidades
  const loadCommunities = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await aniVerseServices.communities.getAll()
      setCommunities(data || [])
      setFilteredCommunities(data || [])
    } catch (err) {
      console.error('Error en loadCommunities:', err)
      setError(`Error al cargar comunidades: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }, [])

  // Cargar membresías del usuario
  const loadUserMemberships = useCallback(async () => {
    if (!currentUserId) return
    try {
      const membershipIds = await aniVerseServices.communities.getUserMemberships(currentUserId)
      setUserMemberships(new Set(membershipIds))
    } catch (err) {
      console.error('Error en loadUserMemberships:', err)
    }
  }, [currentUserId])

  // Cargar datos al montar
  useEffect(() => {
    loadCommunities()
  }, [loadCommunities])

  useEffect(() => {
    loadUserMemberships()
  }, [loadUserMemberships])

  // Filtrar comunidades
  useEffect(() => {
    let communitiesToFilter = communities

    if (activeView === 'my-communities') {
      communitiesToFilter = communities.filter(community => 
        userMemberships.has(community.id)
      )
    }

    if (searchQuery.trim()) {
      communitiesToFilter = communitiesToFilter.filter(community =>
        community.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        community.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        community.category.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    setFilteredCommunities(communitiesToFilter)
  }, [searchQuery, communities, activeView, userMemberships])

  // Unirse a comunidad
  const joinCommunity = async (communityId) => {
    if (!currentUserId) {
      setError('Debes iniciar sesión para unirte a comunidades')
      return
    }

    try {
      await aniVerseServices.communities.join(communityId, currentUserId)
      setUserMemberships(prev => new Set([...prev, communityId]))
      setCommunities(prev => prev.map(community => 
        community.id === communityId 
          ? { ...community, member_count: community.member_count + 1 }
          : community
      ))
    } catch (err) {
      console.error('Error en joinCommunity:', err)
      setError(`Error al unirse a la comunidad: ${err.message}`)
    }
  }

  // Salir de comunidad
  const leaveCommunity = async (communityId) => {
    if (!currentUserId) return

    try {
      await aniVerseServices.communities.leave(communityId, currentUserId)
      setUserMemberships(prev => {
        const newSet = new Set(prev)
        newSet.delete(communityId)
        return newSet
      })
      setCommunities(prev => prev.map(community => 
        community.id === communityId 
          ? { ...community, member_count: Math.max(0, community.member_count - 1) }
          : community
      ))
    } catch (err) {
      console.error('Error en leaveCommunity:', err)
      setError(`Error al salir de la comunidad: ${err.message}`)
    }
  }

  // Manejar búsqueda
  const handleSearch = (e) => {
    setSearchQuery(e.target.value)
  }

  const clearSearch = () => {
    setSearchQuery('')
  }

  const handleViewChange = (view) => {
    setActiveView(view)
  }

  // Manejar clic en botón "Crear Comunidad"
  const handleCreateCommunity = () => {
    console.log('🔍 Verificando acceso a crear comunidad...')
    console.log('   - currentUserId:', currentUserId)
    console.log('   - userRole:', userRole)
    
    if (!currentUserId) {
      setError('Debes iniciar sesión para crear una comunidad')
      return
    }

    // Verificar el rol del usuario
    // ADMIN puede saltarse todas las restricciones
    if (userRole === 'ADMIN') {
      console.log('✅ Usuario ADMIN - Acceso permitido')
      router.navigate('create-community')
      return
    }

    // FAN_STARTER y PRO_OTAKU pueden crear comunidades
    const isAllowed = userRole === 'FAN_STARTER' || userRole === 'PRO_OTAKU'
    
    if (isAllowed) {
      console.log('✅ Usuario con plan de pago - Acceso permitido')
      router.navigate('create-community')
      return
    }

    // FREEMIUM o cualquier otro rol: redirigir a la página de precios
    console.log('❌ Usuario FREEMIUM - Redirigiendo a pricing')
    router.navigate('pricing')
  }

  if (loading && communities.length === 0) {
    return (
      <div className="communities-container">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p className="loading-text">Cargando comunidades...</p>
        </div>
      </div>
    )
  }

  if (error && communities.length === 0) {
    return (
      <div className="communities-container">
        <div className="error-container">
          <div className="error-icon">⚠️</div>
          <h3 className="error-title">Error al cargar comunidades</h3>
          <p className="error-text">{error}</p>
          <button className="retry-button" onClick={loadCommunities}>
            Reintentar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="communities-container">
      <div className="communities-header">
        <div className="header-content">
          <h1 className="communities-title">Comunidades</h1>
          <p className="communities-subtitle">
            Descubre y únete a comunidades de anime y manga
          </p>
        </div>
      </div>

      <div className="view-selector-section">
        <div className="view-selector-container">
          <div className="view-selector">
            <button
              className={`view-selector-tab ${activeView === 'my-communities' ? 'active' : ''}`}
              onClick={() => handleViewChange('my-communities')}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
              <span>Tus comunidades</span>
            </button>
            <button
              className={`view-selector-tab ${activeView === 'explore' ? 'active' : ''}`}
              onClick={() => handleViewChange('explore')}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/>
                <path d="M21 21l-4.35-4.35"/>
              </svg>
              <span>Explorar comunidades</span>
            </button>
          </div>
        </div>
      </div>

      <div className="search-section">
        <div className="search-container">
          <div className="search-input-wrapper">
            <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/>
              <path d="M21 21l-4.35-4.35"/>
            </svg>
            <input
              type="text"
              placeholder={activeView === 'my-communities' ? "Buscar en tus comunidades..." : "Buscar comunidades..."}
              value={searchQuery}
              onChange={handleSearch}
              className="search-input"
            />
            {searchQuery && (
              <button
                onClick={clearSearch}
                className="clear-search-button"
                aria-label="Limpiar búsqueda"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="communities-grid">
        {filteredCommunities.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              {activeView === 'my-communities' ? '👥' : '🏘️'}
            </div>
            <h3 className="empty-title">
              {searchQuery 
                ? 'No se encontraron comunidades' 
                : activeView === 'my-communities' 
                  ? 'No estás unido a ninguna comunidad'
                  : 'No hay comunidades disponibles'
              }
            </h3>
            <p className="empty-text">
              {searchQuery 
                ? 'Intenta con otros términos de búsqueda'
                : activeView === 'my-communities'
                  ? 'Explora comunidades y únete a las que te interesen'
                  : 'Las comunidades aparecerán aquí cuando estén disponibles'
              }
            </p>
            <div className="empty-actions">
              {searchQuery && (
                <button onClick={clearSearch} className="clear-search-btn">
                  Limpiar búsqueda
                </button>
              )}
              {activeView === 'my-communities' && !searchQuery && (
                <button 
                  onClick={() => handleViewChange('explore')} 
                  className="explore-communities-btn"
                >
                  Explorar comunidades
                </button>
              )}
            </div>
          </div>
        ) : (
          filteredCommunities.map((community) => (
            <CommunityCard
              key={community.id}
              community={community}
              isJoined={userMemberships.has(community.id)}
              onJoin={() => joinCommunity(community.id)}
              onLeave={() => leaveCommunity(community.id)}
              currentUserId={currentUserId}
            />
          ))
        )}
      </div>

      {loading && communities.length > 0 && (
        <div className="loading-indicator">
          <div className="loading-spinner small"></div>
          <span>Actualizando...</span>
        </div>
      )}

      {/* Botón flotante para crear comunidad */}
      <button 
        className="floating-create-community-button"
        onClick={handleCreateCommunity}
        aria-label="Crear nueva comunidad"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="#F5F5F5" strokeWidth="2">
          <path d="M12 5v14M5 12h14"/>
        </svg>
      </button>
    </div>
  )
}

export default Communities

