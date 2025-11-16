import { Link } from '../lib/router'
import './CommunityCard.css'

const CommunityCard = ({ community, isJoined, onJoin, onLeave, currentUserId }) => {
  const handleAction = (e) => {
    // CRÍTICO: stopPropagation previene que el clic se propague al Link
    e.stopPropagation()
    e.preventDefault()
    
    if (isJoined) {
      onLeave()
    } else {
      onJoin()
    }
  }

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'anime':
        return '📺'
      case 'manga':
        return '📚'
      case 'general':
        return '🌟'
      default:
        return '🏘️'
    }
  }

  const getActivityLevel = (memberCount) => {
    if (memberCount >= 1000) return { level: 'Muy Activa', color: '#D01C1C', icon: '🔥' }
    if (memberCount >= 500) return { level: 'Activa', color: '#ff6b35', icon: '⚡' }
    if (memberCount >= 100) return { level: 'Moderada', color: '#4ade80', icon: '📈' }
    return { level: 'Nueva', color: '#a0a0a0', icon: '🆕' }
  }

  const activity = getActivityLevel(community.member_count)

  return (
    <Link 
      to={`comunidades/${community.id}`}
      className="community-card"
    >
      {/* Header: Ícono a la izquierda, Título centrado */}
      <div className="card-header">
        <div className="community-avatar">
          {community.avatar_url ? (
            <img src={community.avatar_url} alt={community.name} />
          ) : (
            <div className="default-avatar">
              {getCategoryIcon(community.category)}
            </div>
          )}
        </div>
        
        <div className="community-info">
          <h3 className="community-name">{community.name}</h3>
        </div>
      </div>

      {/* Badges centrados */}
      <div className="community-meta">
        <span className="category-badge">
          {getCategoryIcon(community.category)} {community.category}
        </span>
        <span 
          className="activity-badge"
          style={{ color: activity.color }}
        >
          {activity.icon} {activity.level}
        </span>
      </div>

      {/* Descripción centrada */}
      <div className="card-content">
        <p className="community-description">
          {community.description || 'Una comunidad dedicada a compartir contenido y experiencias.'}
        </p>
      </div>

      {/* Botón de acción con stopPropagation */}
      <div className="card-action">
        {currentUserId ? (
          <button
            onClick={handleAction}
            className={`action-button ${isJoined ? 'joined' : 'join'}`}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {isJoined ? (
                <>
                  <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="8.5" cy="7" r="4"/>
                </>
              ) : (
                <>
                  <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="8.5" cy="7" r="4"/>
                  <line x1="20" y1="8" x2="20" y2="14"/>
                  <line x1="23" y1="11" x2="17" y2="11"/>
                </>
              )}
            </svg>
            {isJoined ? 'Unido' : 'Unirse'}
          </button>
        ) : (
          <div className="login-prompt">
            <p>Inicia sesión para unirte a comunidades</p>
          </div>
        )}
      </div>
    </Link>
  )
}

export default CommunityCard

