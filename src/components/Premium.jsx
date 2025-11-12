import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import './Premium.css'

const Premium = () => {
  const [currentUser, setCurrentUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const getCurrentUser = async () => {
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
        setLoading(false)
      } catch (error) {
        console.error('Error al obtener usuario:', error)
        setLoading(false)
      }
    }
    getCurrentUser()
  }, [])

  const handleSelectPlan = async (planName) => {
    if (!currentUser) {
      alert('Por favor, inicia sesión para seleccionar un plan')
      return
    }

    try {
      const { error } = await supabase
        .from('users')
        .update({ subscription_plan: planName })
        .eq('id', currentUser.id)

      if (error) throw error

      alert(`¡Plan ${planName} activado!`)
      setCurrentUser({ ...currentUser, subscription_plan: planName })
    } catch (error) {
      console.error('Error al actualizar plan:', error)
      alert('Error al procesar la suscripción. Por favor, intenta de nuevo.')
    }
  }

  if (loading) {
    return (
      <div className="premium-container">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Cargando planes...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="premium-container">
      <div className="premium-header">
        <h1 className="premium-title">Planes de Suscripción</h1>
        <p className="premium-subtitle">
          Elige el plan perfecto para tu experiencia AniVerse
        </p>
      </div>

      <div className="premium-plans-grid">
        {/* PLAN 1: Freemium */}
        <div className="premium-plan-card">
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
        <div className="premium-plan-card featured">
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
                className="plan-button featured-button"
                onClick={() => handleSelectPlan('fan_starter')}
              >
                Seleccionar Plan
              </button>
            )}
          </div>
        </div>

        {/* PLAN 3: Pro Otaku */}
        <div className="premium-plan-card coming-soon-plan">
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
            <button 
              className="plan-button coming-soon-button"
              disabled
            >
              Próximamente (POST MVP)
            </button>
          </div>
        </div>
      </div>

      <div className="premium-footer">
        <p className="footer-text">
          Todos los planes incluyen actualizaciones y nuevas funcionalidades a medida que estén disponibles.
        </p>
      </div>
    </div>
  )
}

export default Premium

