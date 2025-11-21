import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import FollowButton from './FollowButton'
import MessageButton from './MessageButton'
import EditProfile from './EditProfile'
import './Profile.css'

const Profile = ({ userId = null }) => {
  const [user, setUser] = useState(null)
  const [userProfile, setUserProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [followersCount, setFollowersCount] = useState(0)
  const [followingCount, setFollowingCount] = useState(0)
  const [currentUserId, setCurrentUserId] = useState(null)
  const [isEditing, setIsEditing] = useState(false)

  // Función para manejar cuando se guarda el perfil editado
  const handleProfileSaved = (updatedData) => {
    // Actualizar el estado local con los nuevos datos
    if (userProfile) {
      setUserProfile({
        ...userProfile,
        ...updatedData
      })
    }
    
    // Actualizar user también si existe
    if (user) {
      setUser({
        ...user,
        user_metadata: {
          ...user.user_metadata,
          ...updatedData
        }
      })
    }
    
    // Recargar datos del perfil para asegurar consistencia
    loadUserData()
  }

  // Función para recargar datos del perfil
  const loadUserData = async () => {
    try {
      setLoading(true)
      
      // Obtener usuario actual
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      if (currentUser) {
        setCurrentUserId(currentUser.id)
      }
      
      // Determinar qué usuario mostrar (userId pasado como prop o usuario actual)
      const targetUserId = userId || currentUser?.id
      
      if (!targetUserId) {
        setError('Usuario no encontrado')
        setLoading(false)
        return
      }
      
      // Obtener información del usuario desde la tabla users
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', targetUserId)
        .single()

      if (profileError) {
        // Si el error es que no se encontró el registro, verificar si es el usuario actual
        if (profileError.code === 'PGRST116' || profileError.message?.includes('No rows')) {
          // Si es el usuario actual y no existe en la tabla users, crear el perfil
          if (!userId && currentUser) {
            try {
              const { data: newProfile, error: insertError } = await supabase
                .from('users')
                .insert([
                  {
                    id: currentUser.id,
                    email: currentUser.email,
                    username: currentUser.user_metadata?.username || currentUser.email?.split('@')[0],
                    display_name: currentUser.user_metadata?.display_name || currentUser.user_metadata?.username || currentUser.email?.split('@')[0],
                    avatar_url: currentUser.user_metadata?.avatar_url || null,
                    bio: null
                  }
                ])
                .select()
                .single()

              if (insertError && !insertError.message?.includes('duplicate')) {
                console.error('Error al crear perfil:', insertError)
                setError('Error al crear el perfil')
              } else if (newProfile) {
                setUserProfile(newProfile)
                setUser({
                  id: newProfile.id,
                  email: newProfile.email,
                  user_metadata: {
                    display_name: newProfile.display_name,
                    username: newProfile.username,
                    avatar_url: newProfile.avatar_url
                  },
                  created_at: newProfile.created_at || currentUser.created_at
                })
              }
            } catch (insertErr) {
              console.error('Error al insertar perfil:', insertErr)
              setError('Error al crear el perfil')
            }
          } else {
            setError('Usuario no encontrado')
          }
        } else {
          console.error('Error al obtener perfil:', profileError)
          setError('Error al cargar el perfil')
        }
      } else if (profile) {
        setUserProfile(profile)
        
        // Simular datos del usuario desde auth si no están disponibles
        setUser({
          id: profile.id,
          email: profile.email,
          user_metadata: {
            display_name: profile.display_name,
            username: profile.username,
            avatar_url: profile.avatar_url
          },
          created_at: profile.created_at
        })
      }
      
      // Obtener estadísticas de seguidores y seguidos
      const loadStats = async () => {
        const [followersResult, followingResult] = await Promise.all([
          supabase
            .from('user_follows')
            .select('id', { count: 'exact', head: true })
            .eq('following_id', targetUserId),
          supabase
            .from('user_follows')
            .select('id', { count: 'exact', head: true })
            .eq('follower_id', targetUserId)
        ])
        
        if (followersResult.error) {
          console.error('Error al obtener seguidores:', followersResult.error)
        } else {
          setFollowersCount(followersResult.count || 0)
        }
        
        if (followingResult.error) {
          console.error('Error al obtener seguidos:', followingResult.error)
        } else {
          setFollowingCount(followingResult.count || 0)
        }
      }
      
      loadStats()
      
    } catch (err) {
      console.error('Error al obtener usuario:', err)
      setError('Error al cargar el perfil')
    } finally {
      setLoading(false)
    }
  }

  // Obtener información del usuario
  useEffect(() => {
    loadUserData()
  }, [userId])

  // Sincronizar user con userProfile si userProfile existe pero user no
  useEffect(() => {
    if (userProfile && !user) {
      setUser({
        id: userProfile.id,
        email: userProfile.email,
        user_metadata: {
          display_name: userProfile.display_name,
          username: userProfile.username,
          avatar_url: userProfile.avatar_url
        },
        created_at: userProfile.created_at
      })
    }
  }, [userProfile, user])

  // Mostrar modo de edición si está activo
  if (isEditing && !userId) {
    return (
      <EditProfile 
        onSave={handleProfileSaved}
        onCancel={() => setIsEditing(false)}
      />
    )
  }

  // Mostrar estado de carga
  if (loading) {
    return (
      <div className="profile-container">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p className="loading-text">Cargando perfil...</p>
        </div>
      </div>
    )
  }

  // Mostrar error
  if (error && !userProfile) {
    return (
      <div className="profile-container">
        <div className="error-container">
          <div className="error-icon">⚠️</div>
          <h3 className="error-title">Error al cargar perfil</h3>
          <p className="error-text">{error || 'Usuario no encontrado'}</p>
          <button className="retry-button" onClick={() => {
            setError(null)
            loadUserData()
          }}>
            Reintentar
          </button>
        </div>
      </div>
    )
  }

  // Si aún no hay datos, mostrar carga
  if (!user && !userProfile && !error) {
    return (
      <div className="profile-container">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p className="loading-text">Cargando perfil...</p>
        </div>
      </div>
    )
  }

  // Si no hay usuario ni perfil pero hay error, ya se mostró arriba
  if (!user && !userProfile) {
    return null
  }

  return (
    <div className="profile-container">
      {/* Header del perfil */}
      <div className="profile-header">
        <div className="profile-cover">
          <div className="cover-gradient"></div>
        </div>
        
        <div className="profile-info">
          <div className="profile-avatar-large">
            {userProfile?.avatar_url || user?.user_metadata?.avatar_url ? (
              <img src={userProfile?.avatar_url || user?.user_metadata?.avatar_url} alt={userProfile?.email || user?.email || ''} />
            ) : (
              <div className="default-avatar-large">
                {(userProfile?.display_name || userProfile?.username || user?.user_metadata?.display_name || user?.user_metadata?.username || user?.email || userProfile?.email)?.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          
          <div className="profile-details">
            <div className="profile-name-username">
              <h1 className="profile-name">
                {userProfile?.display_name || user?.user_metadata?.display_name || userProfile?.username || user?.user_metadata?.username || user?.email?.split('@')[0] || userProfile?.email?.split('@')[0]}
              </h1>
              <p className="profile-username">
                @{userProfile?.username || user?.user_metadata?.username || user?.email?.split('@')[0] || userProfile?.email?.split('@')[0]}
              </p>
            </div>
            
            {/* Botón de seguir (solo se muestra si estamos viendo el perfil de otro usuario) */}
            {userId && currentUserId && userId !== currentUserId && (
              <div className="profile-actions-container">
                <div className="profile-follow-button-container">
                  <FollowButton 
                    targetUserId={userId} 
                    onFollowChange={(isFollowing) => {
                      // Actualizar contador de seguidores cuando cambie el estado
                      if (isFollowing) {
                        setFollowersCount(prev => prev + 1)
                      } else {
                        setFollowersCount(prev => Math.max(0, prev - 1))
                      }
                    }}
                  />
                </div>
                <div className="profile-message-button-container">
                  <MessageButton 
                    targetUserId={userId}
                    currentUserId={currentUserId}
                  />
                </div>
              </div>
            )}
            
            {/* Botón de editar perfil (solo se muestra si es el perfil propio) */}
            {!userId && currentUserId && (
              <div className="profile-edit-button-container">
                <button 
                  className="profile-edit-button"
                  onClick={() => setIsEditing(true)}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                  <span>Editar Perfil</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Contenido del perfil */}
      <div className="profile-content">
        {/* Estadísticas */}
        <div className="profile-stats">
          <div className="stat-card">
            <div className="stat-number">{followersCount}</div>
            <div className="stat-label">Seguidores</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{followingCount}</div>
            <div className="stat-label">Seguidos</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">0</div>
            <div className="stat-label">Posts</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">0</div>
            <div className="stat-label">Comunidades</div>
          </div>
        </div>

        {/* Información adicional */}
        <div className="profile-info-section">
          <div className="info-card">
            <h3 className="info-title">Información Personal</h3>
            <div className="info-list">
              <div className="info-item">
                <span className="info-label">Nombre:</span>
                <span className="info-value">
                  {userProfile?.display_name || user?.user_metadata?.display_name || 'No especificado'}
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">Usuario:</span>
                <span className="info-value">
                  {userProfile?.username || user?.user_metadata?.username || user?.email?.split('@')[0] || userProfile?.email?.split('@')[0]}
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">Email:</span>
                <span className="info-value">{userProfile?.email || user?.email || ''}</span>
              </div>
              {userProfile?.bio && (
                <div className="info-item">
                  <span className="info-label">Biografía:</span>
                  <span className="info-value">{userProfile.bio}</span>
                </div>
              )}
              <div className="info-item">
                <span className="info-label">Miembro desde:</span>
                <span className="info-value">
                  {new Date(userProfile?.created_at || user?.created_at || new Date()).toLocaleDateString('es-ES', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </span>
              </div>
            </div>
          </div>

          <div className="info-card">
            <h3 className="info-title">Configuración de Cuenta</h3>
            <div className="settings-list">
              <button className="setting-button" onClick={() => setIsEditing(true)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
                <span>Editar Perfil</span>
              </button>
              
              <button className="setting-button">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 15h.01M12 12v-.01M12 9h.01M12 6h.01"/>
                  <circle cx="12" cy="12" r="10"/>
                </svg>
                <span>Configuración</span>
              </button>
              
              <button className="setting-button">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 12l2 2 4-4"/>
                  <path d="M21 12c-1 0-3-1-3-3s2-3 3-3 3 1 3 3-2 3-3 3"/>
                  <path d="M3 12c1 0 3-1 3-3s-2-3-3-3-3 1-3 3 2 3 3 3"/>
                  <path d="M12 3v18"/>
                </svg>
                <span>Privacidad</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Profile
