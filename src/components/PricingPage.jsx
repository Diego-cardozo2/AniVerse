import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { router } from '../lib/router'
import './PricingPage.css'

const PricingPage = () => {
  const [currentUser, setCurrentUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const getCurrentUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          // Obtener el plan de suscripción del usuario
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

    // Manejar el retorno de Stripe Checkout
    const urlParams = new URLSearchParams(window.location.search)
    const success = urlParams.get('success')
    const canceled = urlParams.get('canceled')
    const sessionId = urlParams.get('session_id')

    if (success && sessionId) {
      alert('¡Pago exitoso! Tu suscripción se está procesando. Por favor, espera unos momentos mientras actualizamos tu cuenta.')
      // Limpiar la URL
      window.history.replaceState({}, document.title, window.location.pathname)
      // Recargar para actualizar el estado
      setTimeout(() => {
        window.location.reload()
      }, 2000)
    } else if (canceled) {
      alert('El pago fue cancelado. Puedes intentar de nuevo cuando estés listo.')
      // Limpiar la URL
      window.history.replaceState({}, document.title, window.location.pathname)
    }
  }, [])

  const handleSelectPlan = async (planName) => {
    if (!currentUser) {
      alert('Por favor, inicia sesión para seleccionar un plan')
      router.navigate('home')
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
        window.location.reload()
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
      // Obtener el token de sesión de Supabase
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        alert('Por favor, inicia sesión para suscribirte')
        return
      }

      // Obtener la URL de la función edge desde la configuración de Supabase
      const supabaseUrl = 'https://gnylppyoujzicacehbqn.supabase.co'
      const functionUrl = `${supabaseUrl}/functions/v1/create-checkout-session`

      // Llamar a la Edge Function
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

      // Redirigir a Stripe Checkout
      window.location.href = checkout_url

    } catch (error) {
      console.error('Error en handleStripeCheckout:', error)
      alert(`Error al procesar el pago: ${error.message || 'Error desconocido'}`)
    }
  }

  const handleGoBack = () => {
    router.navigate('communities')
  }

  if (loading) {
    return (
      <div className="pricing-container">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Cargando planes...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="pricing-container">
      <div className="pricing-header">
        <button className="back-button" onClick={handleGoBack}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
          Volver
        </button>
        <h1 className="pricing-title">Planes de Suscripción</h1>
        <p className="pricing-subtitle">
          Elige el plan perfecto para tu experiencia AniVerse
        </p>
      </div>

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
                className="plan-button subscribe-button"
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
                className="plan-button featured-button"
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
}

export default PricingPage

