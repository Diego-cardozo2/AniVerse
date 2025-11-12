import { useState } from 'react'
import { router } from '../lib/router'
import './Settings.css'

const Settings = () => {
  const [selectedSection, setSelectedSection] = useState('account')
  const [searchQuery, setSearchQuery] = useState('')

  const settingsSections = [
    {
      id: 'account',
      label: 'Tu cuenta',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
          <circle cx="12" cy="7" r="4"/>
        </svg>
      )
    },
    {
      id: 'premium',
      label: 'Premium',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
        </svg>
      )
    },
    {
      id: 'security',
      label: 'Seguridad y acceso a la cuenta',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        </svg>
      )
    },
    {
      id: 'privacy',
      label: 'Privacidad y seguridad',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        </svg>
      )
    },
    {
      id: 'notifications',
      label: 'Notificaciones',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
      )
    },
    {
      id: 'accessibility',
      label: 'Accesibilidad, pantalla e idiomas',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10"/>
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
        </svg>
      )
    },
    {
      id: 'resources',
      label: 'Recursos adicionales',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
      )
    },
    {
      id: 'help',
      label: 'Centro de Ayuda',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10"/>
          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
          <line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
      ),
      external: true
    }
  ]

  const filteredSections = settingsSections.filter(section =>
    section.label.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleBack = () => {
    router.navigate('home')
  }

  const handleSectionClick = (sectionId) => {
    setSelectedSection(sectionId)
  }

  const getSectionContent = () => {
    switch (selectedSection) {
      case 'account':
        return {
          title: 'Tu cuenta',
          description: 'Ve la información de la cuenta, descarga un archivo con tus datos u obtén más información acerca de las opciones de desactivación de la cuenta.',
          options: [
            {
              icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
              ),
              title: 'Información de la cuenta',
              description: 'Ver y editar tu información de cuenta.'
            },
            {
              icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
              ),
              title: 'Cambia tu contraseña',
              description: 'Cambia tu contraseña en cualquier momento.'
            },
            {
              icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
              ),
              title: 'Descargar un archivo con tus datos',
              description: 'Obtén información sobre los datos de tu cuenta.'
            },
            {
              icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                </svg>
              ),
              title: 'Desactiva tu cuenta',
              description: 'Obtén más información sobre cómo desactivar tu cuenta.'
            }
          ]
        }
      default:
        return {
          title: filteredSections.find(s => s.id === selectedSection)?.label || 'Configuración',
          description: 'Esta sección estará disponible próximamente.',
          options: []
        }
    }
  }

  const content = getSectionContent()

  return (
    <div className="settings-container">
      <div className="settings-sidebar">
        <div className="settings-header">
          <h2 className="settings-title">Configuración</h2>
        </div>
        
        <div className="settings-search">
          <input
            type="text"
            placeholder="Configuración de búsqueda"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="settings-search-input"
          />
        </div>

        <nav className="settings-nav">
          {filteredSections.map((section) => (
            <button
              key={section.id}
              className={`settings-nav-item ${selectedSection === section.id ? 'active' : ''}`}
              onClick={() => handleSectionClick(section.id)}
            >
              <div className="settings-nav-icon">{section.icon}</div>
              <span className="settings-nav-label">{section.label}</span>
              {section.external && (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="external-icon">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                  <polyline points="15 3 21 3 21 9"/>
                  <line x1="10" y1="14" x2="21" y2="3"/>
                </svg>
              )}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="nav-arrow">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </button>
          ))}
        </nav>
      </div>

      <div className="settings-content">
        <button className="settings-back-button" onClick={handleBack}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
          Volver
        </button>
        
        <div className="settings-main">
          <h1 className="settings-content-title">{content.title}</h1>
          <p className="settings-content-description">{content.description}</p>
          
          {content.options.length > 0 && (
            <div className="settings-options">
              {content.options.map((option, index) => (
                <button key={index} className="settings-option-card">
                  <div className="settings-option-icon">{option.icon}</div>
                  <div className="settings-option-info">
                    <h3 className="settings-option-title">{option.title}</h3>
                    <p className="settings-option-description">{option.description}</p>
                  </div>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="option-arrow">
                    <polyline points="9 18 15 12 9 6"/>
                  </svg>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Settings

