import { useState } from 'react'
import { router } from '../lib/router'
import { supabase } from '../lib/supabaseClient'
import './Settings.css'
import './PricingPage.css'

const Settings = () => {
  const [selectedSection, setSelectedSection] = useState('security')
  const [selectedSubSection, setSelectedSubSection] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [currentUser, setCurrentUser] = useState(null)
  const [loadingPlans, setLoadingPlans] = useState(false)

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
    setSelectedSubSection(null)
    if (sectionId === 'premium') {
      loadUserData()
    }
  }

  const handleSubSectionClick = (subSectionId) => {
    setSelectedSubSection(subSectionId)
  }

  const handleBackToSection = () => {
    setSelectedSubSection(null)
  }

  const loadUserData = async () => {
    setLoadingPlans(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('users')
          .select('subscription_plan')
          .eq('id', user.id)
          .single()
        
        setCurrentUser({
          id: user.id,
          subscription_plan: profile?.subscription_plan || 'freemium'
        })
      }
    } catch (error) {
      console.error('Error al obtener usuario:', error)
    } finally {
      setLoadingPlans(false)
    }
  }

  const handleSelectPlan = async (planName) => {
    if (!currentUser) {
      alert('Por favor, inicia sesión para seleccionar un plan')
      return
    }

    // Si es el plan freemium, actualizar directamente sin Stripe
    if (planName === 'freemium') {
      try {
        const { error } = await supabase
          .from('users')
          .update({ subscription_plan: planName })
          .eq('id', currentUser.id)

        if (error) throw error

        alert('Plan Freemium activado')
        setCurrentUser({ ...currentUser, subscription_plan: planName })
      } catch (error) {
        console.error('Error al actualizar plan:', error)
        alert('Error al procesar el plan. Por favor, intenta de nuevo.')
      }
      return
    }

    // Para planes de pago (fan_starter, pro_otaku), usar Stripe
    if (planName === 'fan_starter' || planName === 'pro_otaku') {
      await handleStripeCheckout(planName)
      return
    }

    alert('Plan no válido')
  }

  const handleStripeCheckout = async (planLevel) => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        alert('Por favor, inicia sesión para suscribirte')
        return
      }

      const supabaseUrl = 'https://gnylppyoujzicacehbqn.supabase.co'
      const functionUrl = `${supabaseUrl}/functions/v1/create-checkout-session`

      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          plan_level: planLevel,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al crear la sesión de checkout')
      }

      const { checkout_url } = await response.json()

      if (!checkout_url) {
        throw new Error('No se recibió la URL de checkout')
      }

      window.location.href = checkout_url

    } catch (error) {
      console.error('Error en handleStripeCheckout:', error)
      alert(`Error al procesar el pago: ${error.message || 'Error desconocido'}`)
    }
  }

  const getSectionContent = () => {
    switch (selectedSection) {
      case 'account':
        return {
          title: 'Tu cuenta',
          description: 'Ve la información de la cuenta u obtén más información acerca de las opciones de desactivación de la cuenta.',
          options: [
            {
              icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
              ),
              title: 'Información de la cuenta',
              description: 'Ve la información de tu cuenta, como el número de teléfono y la dirección de correo electrónico.'
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
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                </svg>
              ),
              title: 'Desactiva tu cuenta',
              description: 'Averigua cómo puedes desactivar tu cuenta.'
            }
          ]
        }
      case 'premium':
        return {
          title: 'Premium',
          description: 'Elige el plan perfecto para tu experiencia AniVerse',
          isPremium: true
        }
      case 'security':
        return {
          title: 'Seguridad y acceso a la cuenta',
          description: 'Administra la seguridad de tu cuenta y lleva un control de su uso, incluidas las aplicaciones que conectaste a ella.',
          options: [
            {
              icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
              ),
              title: 'Seguridad',
              description: 'Administra la seguridad de tu cuenta.'
            },
            {
              icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                  <rect x="7" y="7" width="10" height="10" rx="1" ry="1"/>
                </svg>
              ),
              title: 'Aplicaciones y sesiones',
              description: 'Consulta la información sobre cuándo iniciaste sesión en tu cuenta y las aplicaciones que conectaste a ella.'
            }
          ]
        }
      case 'privacy':
        return {
          title: 'Tu actividad en la app',
          description: 'Administra tu privacidad y seguridad en AniVerse.',
          options: [
            {
              icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 20h9"/>
                  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
                </svg>
              ),
              title: 'Tus posts',
              description: 'Administra la información asociada a tus posts.'
            },
            {
              icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                  <line x1="9" y1="9" x2="15" y2="9"/>
                  <line x1="9" y1="15" x2="15" y2="15"/>
                </svg>
              ),
              title: 'Contenido que ves',
              description: 'Decide qué ver en AniVerse en función de los Temas e intereses de tu preferencia'
            },
            {
              icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 6.1H3M21 12.1H3M15 18.1H3"/>
                  <circle cx="19" cy="6.1" r="2"/>
                  <circle cx="13" cy="12.1" r="2"/>
                  <circle cx="17" cy="18.1" r="2"/>
                </svg>
              ),
              title: 'Silenciar y bloquear',
              description: 'Administra las cuentas, palabras y notificaciones que silenciaste o bloqueaste.'
            },
            {
              icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
              ),
              title: 'Mensajes Directos',
              description: 'Administra quiénes pueden enviarte mensajes directamente.'
            },
            {
              icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                </svg>
              ),
              title: 'Acerca de tu cuenta',
              description: 'Administra la ubicación asociada a tu cuenta'
            }
          ]
        }
      case 'notifications':
        return {
          title: 'Notificaciones',
          description: 'Selecciona los tipos de notificaciones que quieres recibir sobre tus actividades, intereses y recomendaciones.',
          options: [
            {
              icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
                </svg>
              ),
              title: 'Filtros',
              description: 'Elige las notificaciones que quieres ver, y las que no.'
            },
            {
              icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                  <rect x="7" y="7" width="10" height="10" rx="1" ry="1"/>
                </svg>
              ),
              title: 'Preferencias',
              description: 'Selecciona tus preferencias por tipo de notificación.'
            }
          ]
        }
      case 'accessibility':
        return {
          title: 'Accesibilidad, pantalla e idiomas',
          description: 'Administra cómo ves el contenido de AniVerse.',
          options: [
            {
              icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 20h9"/>
                  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
                </svg>
              ),
              title: 'Pantalla',
              description: 'Administra el fondo, color y tamaño de la fuente. Esta configuración afecta a todas las cuentas de AniVerse en este navegador.'
            },
            {
              icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="2" y1="12" x2="22" y2="12"/>
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                </svg>
              ),
              title: 'Idiomas',
              description: 'Administra qué idiomas se usan para personalizar tu experiencia en AniVerse.'
            },
            {
              icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="20" x2="18" y2="10"/>
                  <line x1="12" y1="20" x2="12" y2="4"/>
                  <line x1="6" y1="20" x2="6" y2="14"/>
                </svg>
              ),
              title: 'Uso de datos',
              description: 'Establece límites para el modo en que AniVerse usa algunos de los datos de tu red en este dispositivo.'
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

      <div className={`settings-content ${content.isPremium ? 'premium-content-wrapper' : ''}`}>
        <div className={`settings-main ${content.isPremium ? 'premium-content' : ''}`}>
          {!selectedSubSection && (
            <>
              <h1 className="settings-content-title">{content.title}</h1>
              <p className="settings-content-description">{content.description}</p>
            </>
          )}
          
          {content.isPremium ? (
            loadingPlans ? (
              <div className="loading-container">
                <div className="loading-spinner"></div>
                <p>Cargando planes...</p>
              </div>
            ) : (
              <div style={{ marginTop: '32px' }}>
                <div className="pricing-grid">
                {/* PLAN 1: Freemium */}
                <div className="pricing-card">
                  <div className="plan-header">
                    <h2 className="plan-name">Freemium</h2>
                    <p className="plan-subtitle">Plan Inicial</p>
                    <div className="plan-price">
                      <span className="price-amount">$0</span>
                      <span className="price-period">/ mes</span>
                    </div>
                  </div>
                  <div className="plan-features">
                    <ul>
                      <li>✓ Acceso gratuito al feed general y publicaciones</li>
                      <li>✓ Interacción básica (likes, comentarios y guardar)</li>
                      <li>✓ Seguimiento de hasta 3 comunidades temáticas</li>
                      <li>✓ Perfil básico</li>
                    </ul>
                  </div>
                  <div className="plan-footer">
                    {currentUser?.subscription_plan === 'freemium' ? (
                      <button className="plan-button current-plan" disabled>
                        Plan Actual
                      </button>
                    ) : (
                      <button 
                        className="plan-button"
                        onClick={() => handleSelectPlan('freemium')}
                      >
                        Seleccionar Plan
                      </button>
                    )}
                  </div>
                </div>

                {/* PLAN 2: Fan Starter */}
                <div className="pricing-card featured">
                  <div className="plan-badge">Más Popular</div>
                  <div className="plan-header">
                    <h2 className="plan-name">Fan Starter</h2>
                    <p className="plan-subtitle">Plan Intermedio</p>
                    <div className="plan-price">
                      <span className="price-amount">$2.99</span>
                      <span className="price-period">/ mes</span>
                    </div>
                  </div>
                  <div className="plan-features">
                    <ul>
                      <li>✓ Todo del Freemium</li>
                      <li className="highlight-feature">
                        <strong>✨ ¡CREACIÓN DE COMUNIDADES PROPIAS!</strong>
                      </li>
                      <li>✓ Acceso a comunidades ilimitadas</li>
                      <li>✓ Publicación de contenido multimedia ilimitado en alta calidad</li>
                      <li>✓ Sistema de reacciones personalizadas</li>
                      <li>✓ Perfil personalizable (fondos y banner)</li>
                    </ul>
                  </div>
                  <div className="plan-footer">
                    {currentUser?.subscription_plan === 'fan_starter' ? (
                      <button className="plan-button current-plan" disabled>
                        Plan Actual
                      </button>
                    ) : (
                      <button 
                        className="plan-button subscribe-button"
                        onClick={() => handleSelectPlan('fan_starter')}
                      >
                        Seleccionar Plan
                      </button>
                    )}
                  </div>
                </div>

                {/* PLAN 3: Pro Otaku */}
                <div className="pricing-card coming-soon-plan">
                  <div className="plan-badge coming-soon-badge">Próximamente</div>
                  <div className="plan-header">
                    <h2 className="plan-name">Pro Otaku</h2>
                    <p className="plan-subtitle">Plan Avanzado</p>
                    <div className="plan-price">
                      <span className="price-amount">$6.99</span>
                      <span className="price-period">/ mes</span>
                    </div>
                    <p className="plan-note">* Funcionalidades POST-MVP</p>
                  </div>
                  <div className="plan-features">
                    <ul>
                      <li>✓ Todo del Fan Starter</li>
                      <li>✓ Herramientas de Contenido: Análisis de alcance y filtros temáticos</li>
                      <li>✓ Visibilidad y Estatus: Perfil Verificado ("Pro") y mayor visibilidad en el feed</li>
                      <li className="coming-soon">○ Monetización: Funciones para contenido exclusivo por suscripción (Futuro)</li>
                      <li className="coming-soon">○ Acceso Exclusivo: Prioridad en soporte y acceso anticipado a eventos (Futuro)</li>
                    </ul>
                  </div>
                  <div className="plan-footer">
                    {currentUser?.subscription_plan === 'pro_otaku' ? (
                      <button className="plan-button current-plan" disabled>
                        Plan Actual
                      </button>
                    ) : (
                      <button 
                        className="plan-button coming-soon-button"
                        disabled
                      >
                        POST MVP
                      </button>
                    )}
                  </div>
                </div>
              </div>
              <div className="pricing-footer">
                <p className="footer-text">
                  Todos los planes incluyen actualizaciones y nuevas funcionalidades a medida que estén disponibles.
                </p>
              </div>
            </div>
            )
          ) : !selectedSubSection && content.options.length > 0 ? (
            <div className="settings-options">
              {content.options.map((option, index) => (
                <button 
                  key={index} 
                  className="settings-option-card"
                  onClick={() => {
                    if (selectedSection === 'notifications' && option.title === 'Filtros') {
                      handleSubSectionClick('filters')
                    } else if (selectedSection === 'notifications' && option.title === 'Preferencias') {
                      handleSubSectionClick('preferences')
                    } else if (selectedSection === 'account' && option.title === 'Información de la cuenta') {
                      handleSubSectionClick('account-info')
                    }
                  }}
                >
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
          ) : null}
          
          {selectedSubSection === 'filters' && (
            <div className="settings-subsection">
              <div className="settings-subsection-header">
                <button className="settings-back-arrow" onClick={handleBackToSection}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="15 18 9 12 15 6"/>
                  </svg>
                </button>
                <h1 className="settings-subsection-title">Filtros</h1>
              </div>
              
              <p className="settings-subsection-intro">
                Elige las notificaciones que quieres ver, y las que no.
              </p>
              
              <div className="settings-filter-section">
                <div className="settings-filter-header">
                  <h3 className="settings-filter-title">Filtro de calidad</h3>
                  <label className="settings-checkbox">
                    <input type="checkbox" />
                    <span className="settings-checkbox-mark"></span>
                  </label>
                </div>
                <p className="settings-filter-description">
                  Elige excluir contenidos como posts duplicados o automatizados. Esto no se aplica a las notificaciones de las cuentas que sigues o con las que hayas interactuado recientemente.{' '}
                  <a href="#" className="settings-info-link">Más información</a>
                </p>
              </div>
              
              <button 
                className="settings-filter-section settings-filter-clickable"
                onClick={() => handleSubSectionClick('muted-notifications')}
              >
                <div className="settings-filter-header">
                  <h3 className="settings-filter-title">Notificaciones silenciadas</h3>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="option-arrow">
                    <polyline points="9 18 15 12 9 6"/>
                  </svg>
                </div>
              </button>
            </div>
          )}
          
          {selectedSubSection === 'muted-notifications' && (
            <div className="settings-subsection">
              <div className="settings-subsection-header">
                <button className="settings-back-arrow" onClick={() => handleSubSectionClick('filters')}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="15 18 9 12 15 6"/>
                  </svg>
                </button>
                <h1 className="settings-subsection-title">Notificaciones silenciadas</h1>
              </div>
              
              <h3 className="settings-muted-heading">Silencia notificaciones de personas:</h3>
              
              <div className="settings-muted-options">
                <label className="settings-muted-option">
                  <input type="checkbox" />
                  <span className="settings-checkbox-square"></span>
                  <span className="settings-muted-option-text">Que no sigues</span>
                </label>
                <label className="settings-muted-option">
                  <input type="checkbox" />
                  <span className="settings-checkbox-square"></span>
                  <span className="settings-muted-option-text">Que no te siguen</span>
                </label>
                <label className="settings-muted-option">
                  <input type="checkbox" />
                  <span className="settings-checkbox-square"></span>
                  <span className="settings-muted-option-text">Cuya cuenta es nueva</span>
                </label>
                <label className="settings-muted-option">
                  <input type="checkbox" />
                  <span className="settings-checkbox-square"></span>
                  <span className="settings-muted-option-text">Que aún usan la foto de perfil predeterminada</span>
                </label>
                <label className="settings-muted-option">
                  <input type="checkbox" />
                  <span className="settings-checkbox-square"></span>
                  <span className="settings-muted-option-text">Que no confirmaron su correo electrónico</span>
                </label>
                <label className="settings-muted-option">
                  <input type="checkbox" />
                  <span className="settings-checkbox-square"></span>
                  <span className="settings-muted-option-text">Que no confirmaron su número de teléfono</span>
                </label>
              </div>
              
              <p className="settings-muted-disclaimer">
                Estos filtros no afectarán las notificaciones de las personas que sigues.{' '}
                <a href="#" className="settings-info-link">Más información</a>
              </p>
            </div>
          )}
          
          {selectedSubSection === 'preferences' && (
            <div className="settings-subsection">
              <div className="settings-subsection-header">
                <button className="settings-back-arrow" onClick={handleBackToSection}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="15 18 9 12 15 6"/>
                  </svg>
                </button>
                <h1 className="settings-subsection-title">Preferencias</h1>
              </div>
              
              <p className="settings-subsection-intro">
                Selecciona tus preferencias por tipo de notificación.{' '}
                <a href="#" className="settings-info-link">Más información</a>
              </p>
              
              <button 
                className="settings-filter-section settings-filter-clickable"
                onClick={() => handleSubSectionClick('push-notifications')}
              >
                <div className="settings-filter-header">
                  <h3 className="settings-filter-title">Notificaciones push</h3>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="option-arrow">
                    <polyline points="9 18 15 12 9 6"/>
                  </svg>
                </div>
              </button>
            </div>
          )}
          
          {selectedSubSection === 'push-notifications' && (
            <div className="settings-subsection">
              <div className="settings-subsection-header">
                <button className="settings-back-arrow" onClick={() => handleSubSectionClick('preferences')}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="15 18 9 12 15 6"/>
                  </svg>
                </button>
                <h1 className="settings-subsection-title">Notificaciones push</h1>
              </div>
              
              <div className="settings-push-section">
                <div className="settings-push-content">
                  <h3 className="settings-push-title">Notificaciones push</h3>
                  <p className="settings-push-description">
                    Recibe notificaciones push para enterarte de lo que está pasando cuando no estás en AniVerse. Puedes desactivarlas cuando quieras.
                  </p>
                </div>
                <label className="settings-checkbox">
                  <input type="checkbox" defaultChecked />
                  <span className="settings-checkbox-mark"></span>
                </label>
              </div>
            </div>
          )}
          
          {selectedSubSection === 'account-info' && (
            <div className="settings-subsection">
              <div className="settings-subsection-header">
                <button className="settings-back-arrow" onClick={handleBackToSection}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="15 18 9 12 15 6"/>
                  </svg>
                </button>
                <h1 className="settings-subsection-title">Información de la cuenta</h1>
              </div>
              
              <p className="settings-subsection-intro">
                Ve la información de tu cuenta, como el número de teléfono y la dirección de correo electrónico.
              </p>
              
              <div className="settings-options">
                <p style={{ color: '#a0a0a0', padding: '20px' }}>
                  Esta sección estará disponible próximamente.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Settings

