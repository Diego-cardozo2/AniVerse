import { Link } from '../lib/router'
import './UserLink.css'

/**
 * Componente reutilizable para mostrar avatar y nombre de usuario como enlace navegable
 * @param {Object} user - Objeto usuario con id, display_name, username, avatar_url
 * @param {string} size - Tamaño del avatar: 'small', 'medium', 'large' (default: 'medium')
 * @param {boolean} showAvatar - Mostrar avatar (default: true)
 * @param {boolean} showName - Mostrar nombre (default: true)
 * @param {string} className - Clases CSS adicionales
 */
const UserLink = ({ 
  user, 
  size = 'medium', 
  showAvatar = true, 
  showName = true,
  className = '',
  onClick 
}) => {
  if (!user || !user.id) {
    return null
  }

  const userId = user.id
  const displayName = user.display_name || user.username || 'Usuario Anónimo'
  const username = user.username || user.email?.split('@')[0] || 'usuario'
  const avatarUrl = user.avatar_url

  const handleClick = (e) => {
    // Detener propagación para evitar que active onClick del contenedor padre
    e.stopPropagation()
    
    // Si hay un onClick personalizado, ejecutarlo
    if (onClick) {
      onClick(e)
    }
  }

  return (
    <Link 
      to={`perfiles/${userId}`}
      className={`user-link user-link-${size} ${className}`}
      onClick={handleClick}
    >
      {showAvatar && (
        <div className="user-link-avatar">
          {avatarUrl ? (
            <img 
              src={avatarUrl} 
              alt={`Avatar de ${displayName}`}
              className="user-link-avatar-img"
            />
          ) : (
            <div className="user-link-avatar-placeholder">
              {displayName.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
      )}
      
      {showName && (
        <span className="user-link-name">
          {displayName}
        </span>
      )}
    </Link>
  )
}

export default UserLink

