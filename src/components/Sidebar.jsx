import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import './Sidebar.css'

const Sidebar = ({ isOpen, onClose, currentPage, onNavigate }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [unreadCount, setUnreadCount] = useState(0)

  // Obtener información del usuario
  useEffect(() => {
    const getCurrentUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          // Obtener perfil completo del usuario
          const { data: profile } = await supabase
            .from('users')
            .select('display_name, username, email, avatar_url')
            .eq('id', user.id)
            .single()
          
          if (profile) {
            setUser({
              ...user,
              profile: profile
            })
          } else {
            setUser(user)
          }
        }
      } catch (error) {
        console.error('Error al obtener usuario:', error)
      } finally {
        setLoading(false)
      }
    }
    getCurrentUser()
  }, [])

  // Contar mensajes no leídos
  useEffect(() => {
    if (!user) return

    const countUnreadMessages = async () => {
      try {
        const { data: { user: currentUser } } = await supabase.auth.getUser()
        if (!currentUser) return

        // Obtener todos los chats del usuario
        const { data: userChats } = await supabase
          .from('chats')
          .select('id')
          .or(`user1_id.eq.${currentUser.id},user2_id.eq.${currentUser.id}`)

        if (!userChats || userChats.length === 0) {
          setUnreadCount(0)
          return
        }

        const chatIds = userChats.map(chat => chat.id)

        // Contar mensajes donde el sender_id NO es el usuario actual
        // Estos son mensajes recibidos (no leídos si no se han visto)
        const { count, error } = await supabase
          .from('messages')
          .select('id', { count: 'exact', head: true })
          .in('chat_id', chatIds)
          .neq('sender_id', currentUser.id)

        if (error) {
          console.error('Error al contar mensajes no leídos:', error)
        } else {
          setUnreadCount(count || 0)
        }
      } catch (error) {
        console.error('Error al contar mensajes no leídos:', error)
      }
    }

    countUnreadMessages()

    // Suscribirse a nuevos mensajes en tiempo real
    const channel = supabase
      .channel('unread-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages'
        },
        async (payload) => {
          // Solo contar si el mensaje no fue enviado por el usuario actual
          const { data: { user: currentUser } } = await supabase.auth.getUser()
          if (currentUser && payload.new.sender_id !== currentUser.id) {
            countUnreadMessages()
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user])

  // Elementos del menú
  const menuItems = [
    {
      id: 'home',
      label: 'Inicio',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
          <polyline points="9,22 9,12 15,12 15,22"/>
        </svg>
      ),
      route: 'home'
    },
    {
      id: 'explore',
      label: 'Explorar',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8"/>
          <path d="M21 21l-4.35-4.35"/>
        </svg>
      ),
      route: 'explore'
    },
    {
      id: 'notifications',
      label: 'Notificaciones',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
      ),
      route: 'notifications'
    },
    {
      id: 'messages',
      label: 'Mensajes',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
      ),
      route: 'messages',
      badge: unreadCount > 0 ? unreadCount : null
    },
    {
      id: 'saved',
      label: 'Guardados',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
        </svg>
      ),
      route: 'saved'
    },
    {
      id: 'communities',
      label: 'Comunidades',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
      ),
      route: 'communities'
    },
    {
      id: 'premium',
      label: 'Premium',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
        </svg>
      ),
      route: 'premium'
    }
  ]

  const profileItems = [
    {
      id: 'profile',
      label: 'Perfil',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
          <circle cx="12" cy="7" r="4"/>
        </svg>
      ),
      route: 'profile'
    },
    {
      id: 'settings',
      label: 'Configuración y Privacidad',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="3"/>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1 1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
        </svg>
      ),
      route: 'settings'
    }
  ]

  // Manejar navegación
  const handleNavigation = (route) => {
    onNavigate(route)
    // Cerrar sidebar en móvil después de navegar
    if (window.innerWidth <= 768) {
      onClose()
    }
  }

  // Manejar logout
  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
      window.location.reload()
    } catch (error) {
      console.error('Error al cerrar sesión:', error)
    }
  }

  return (
    <>
      {/* Overlay para móvil */}
      {isOpen && (
        <div className="sidebar-overlay" onClick={onClose} />
      )}

      {/* Sidebar */}
      <div className={`sidebar ${isOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
        {/* Header del sidebar */}
        <div className="sidebar-header">
          <div className="sidebar-logo" onClick={() => handleNavigation('home')}>
            <img 
              src="/logo.png" 
              alt="AniVerse Logo" 
              className="logo-image"
              onError={(e) => {
                // Fallback si no existe el logo
                e.target.style.display = 'none'
                e.target.nextSibling.style.display = 'flex'
              }}
            />
            <div className="logo-fallback" style={{ display: 'none' }}>
              <div className="logo-icon">🎌</div>
              <span className="logo-text">AniVerse</span>
            </div>
          </div>
          <button className="close-sidebar" onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>


        {/* Navegación principal */}
        <nav className="sidebar-nav">
          <div className="nav-section">
            <div className="nav-section-title">Principal</div>
            {menuItems.slice(0, 3).map((item) => (
              <button
                key={item.id}
                className={`nav-item ${currentPage === item.route ? 'nav-item-active' : ''}`}
                onClick={() => handleNavigation(item.route)}
              >
                <div className="nav-item-icon">{item.icon}</div>
                <span className="nav-item-label">{item.label}</span>
                {item.badge && (
                  <span className="nav-item-badge">{item.badge > 99 ? '99+' : item.badge}</span>
                )}
              </button>
            ))}
          </div>

          <div className="nav-divider"></div>

          <div className="nav-section">
            <div className="nav-section-title">Social</div>
            {menuItems.slice(3, 6).map((item) => (
              <button
                key={item.id}
                className={`nav-item ${currentPage === item.route ? 'nav-item-active' : ''}`}
                onClick={() => handleNavigation(item.route)}
              >
                <div className="nav-item-icon">{item.icon}</div>
                <span className="nav-item-label">{item.label}</span>
                {item.badge && (
                  <span className="nav-item-badge">{item.badge > 99 ? '99+' : item.badge}</span>
                )}
              </button>
            ))}
          </div>

          <div className="nav-divider"></div>

          <div className="nav-section">
            <div className="nav-section-title">Premium</div>
            {menuItems.slice(6).map((item) => (
              <button
                key={item.id}
                className={`nav-item ${currentPage === item.route ? 'nav-item-active' : ''}`}
                onClick={() => handleNavigation(item.route)}
              >
                <div className="nav-item-icon">{item.icon}</div>
                <span className="nav-item-label">{item.label}</span>
                {item.badge && (
                  <span className="nav-item-badge">{item.badge > 99 ? '99+' : item.badge}</span>
                )}
              </button>
            ))}
          </div>

          <div className="nav-divider"></div>

          <div className="nav-section">
            {profileItems.map((item) => (
              <button
                key={item.id}
                className={`nav-item ${currentPage === item.route ? 'nav-item-active' : ''}`}
                onClick={() => handleNavigation(item.route)}
              >
                <div className="nav-item-icon">{item.icon}</div>
                <span className="nav-item-label">{item.label}</span>
                {item.badge && (
                  <span className="nav-item-badge">{item.badge > 99 ? '99+' : item.badge}</span>
                )}
              </button>
            ))}
          </div>

        </nav>

        {/* Footer del sidebar */}
        <div className="sidebar-footer">
          {/* Información del usuario */}
          <div className="user-profile-footer">
            {loading ? (
              <div className="profile-loading">
                <div className="profile-avatar-skeleton"></div>
                <div className="profile-info-skeleton">
                  <div className="profile-name-skeleton"></div>
                </div>
              </div>
            ) : user ? (
              <div className="profile-info">
                <div className="profile-avatar">
                  {user.profile?.avatar_url || user.user_metadata?.avatar_url ? (
                    <img src={user.profile?.avatar_url || user.user_metadata.avatar_url} alt={user.email} />
                  ) : (
                    <div className="default-avatar">
                      {(user.profile?.display_name?.charAt(0) || user.email?.charAt(0) || 'U').toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="profile-details">
                  <div className="profile-name">
                    @{user.profile?.username || user.user_metadata?.username || user.email?.split('@')[0]}
                  </div>
                </div>
              </div>
            ) : (
              <div className="profile-error">
                <div className="error-avatar">👤</div>
                <div className="error-text">Usuario no encontrado</div>
              </div>
            )}
          </div>

          <button className="logout-button" onClick={handleLogout}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16,17 21,12 16,7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </div>
    </>
  )
}

export default Sidebar
