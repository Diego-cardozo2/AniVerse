import { useState, useEffect } from 'react'
import HomeFeed from './components/HomeFeed.jsx'
import Communities from './components/Communities.jsx'
import CommunityDetail from './components/CommunityDetail.jsx'
import Profile from './components/Profile.jsx'
import AuthForm from './components/AuthForm.jsx'
import Sidebar from './components/Sidebar.jsx'
import PricingPage from './components/PricingPage.jsx'
import Premium from './components/Premium.jsx'
import Messages from './components/Messages.jsx'
import Settings from './components/Settings.jsx'
import { supabase } from './lib/supabaseClient.js'
import { router } from './lib/router.jsx'
import './App.css'

function App() {
  const [showAuth, setShowAuth] = useState(true)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [currentPage, setCurrentPage] = useState('home')
  const [routeKey, setRouteKey] = useState(0) // Forzar re-render cuando cambia la ruta

  // Suscribirse a cambios de ruta para forzar re-render
  useEffect(() => {
    console.log('🔔 Suscribiéndose a cambios de ruta...')
    const unsubscribe = router.subscribe((route) => {
      console.log('🔔 Cambio de ruta detectado:', route)
      setCurrentPage(route)
      // Forzar re-render incrementando la key
      setRouteKey(prev => prev + 1)
    })
    
    return () => {
      console.log('🔔 Desuscribiéndose de cambios de ruta')
      unsubscribe()
    }
  }, [])

  // Configurar rutas del router
  useEffect(() => {
    console.log('🔧 Configurando rutas...')
    console.log('🔍 Rutas existentes antes de registrar:', Object.keys(router.routes))
    
    // Componentes placeholder
    const PlaceholderComponent = ({ title }) => (
      <div className="placeholder-page">
        <h2>{title}</h2>
        <p>Esta funcionalidad estará disponible próximamente.</p>
      </div>
    )
    
    // Registrar rutas con funciones que retornan componentes
    // Verificar si ya están registradas para evitar duplicados
    if (!router.routes['home']) router.addRoute('home', () => <HomeFeed />)
    if (!router.routes['explore']) router.addRoute('explore', () => <PlaceholderComponent title="Explorar" />)
    if (!router.routes['notifications']) router.addRoute('notifications', () => <PlaceholderComponent title="Notificaciones" />)
    if (!router.routes['messages']) {
      router.addRoute('messages', () => {
        // Manejar rutas dinámicas de mensajes (messages/:chatId)
        const params = router.getCurrentParams()
        return <Messages key={params.chatId || 'list'} />
      })
    }
    if (!router.routes['saved']) router.addRoute('saved', () => <PlaceholderComponent title="Guardados" />)
    if (!router.routes['communities']) router.addRoute('communities', () => <Communities />)
    if (!router.routes['community-detail']) {
      router.addRoute('community-detail', () => {
        // Forzar actualización del parámetro
        const params = router.getCurrentParams()
        console.log('📍 Parámetros de ruta:', params)
        return <CommunityDetail key={params.communityId} communityId={params.communityId} />
      })
    }
    if (!router.routes['premium']) router.addRoute('premium', () => <Premium />)
    if (!router.routes['pricing']) router.addRoute('pricing', () => <PricingPage />)
    if (!router.routes['profile']) router.addRoute('profile', () => <Profile />)
    if (!router.routes['profile-detail']) {
      router.addRoute('profile-detail', () => {
        // Manejar rutas dinámicas de perfiles (perfiles/:userId)
        const params = router.getCurrentParams()
        console.log('📍 Parámetros de perfil:', params)
        return <Profile key={params.userId} userId={params.userId} />
      })
    }
    if (!router.routes['settings']) router.addRoute('settings', () => <Settings />)
    
    console.log('✅ Rutas registradas:', Object.keys(router.routes))
    
    // Forzar re-registro de rutas después de un pequeño delay para asegurar que el router esté listo
    // Esto es necesario para manejar hot reloads de Vite
    const timeoutId = setTimeout(() => {
      const currentRoute = router.getCurrentRoute()
      console.log('🔍 Verificando estado del router después del registro:', {
        currentRoute,
        rutasRegistradas: Object.keys(router.routes).length
      })
      
      // Si después de todo no hay rutas, forzar re-registro
      if (Object.keys(router.routes).length === 0) {
        console.warn('⚠️ No se detectaron rutas después del registro, reintentando...')
        // No hacer nada más, el useEffect se ejecutará de nuevo en el siguiente render
      } else {
        console.log('✅ Router listo con rutas:', Object.keys(router.routes))
      }
    }, 0)
    
    return () => {
      clearTimeout(timeoutId)
    }
  }, [])

  // Estado simplificado para evitar errores
  useEffect(() => {
    const initApp = async () => {
      try {
        setLoading(true)
        
        // Verificar si hay sesión activa
        const { data: { session } } = await supabase.auth.getSession()
        
        if (session?.user) {
          console.log('Sesión encontrada:', session.user.email)
          setShowAuth(false)
        } else {
          console.log('No hay sesión activa')
          setShowAuth(true)
        }
      } catch (err) {
        console.error('Error inicializando app:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    initApp()
  }, [])

  // Manejar éxito de autenticación
  const handleAuthSuccess = (user) => {
    console.log('Usuario autenticado:', user)
    setShowAuth(false)
  }

  // Función para mostrar auth
  const showAuthForm = () => {
    setShowAuth(true)
  }

  // Manejar navegación
  const handleNavigation = (page) => {
    console.log('Navegando a página:', page)
    setCurrentPage(page)
    router.navigate(page)
  }

  // Manejar toggle del sidebar
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen)
  }

  // Obtener componente actual
  const getCurrentComponent = () => {
    const ComponentFactory = router.getCurrentComponent()
    console.log('🎬 App - Renderizando componente para ruta:', router.getCurrentRoute())
    console.log('🎬 App - ComponentFactory:', ComponentFactory ? 'Encontrado' : 'No encontrado')
    
    // Si ComponentFactory es una función, mostrar su nombre
    if (ComponentFactory && typeof ComponentFactory === 'function') {
      console.log('🎬 App - ComponentFactory es función, ejecutando...')
    }
    
    // Si no hay componente, mostrar error
    if (!ComponentFactory) {
      return (
        <div style={{ 
          padding: '40px', 
          color: '#D01C1C', 
          textAlign: 'center',
          background: '#131313',
          minHeight: '400px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <h2>Error: Componente no encontrado</h2>
          <p>Ruta: {router.getCurrentRoute()}</p>
          <p>Rutas disponibles: {Object.keys(router.routes || {}).join(', ')}</p>
          <button 
            onClick={() => handleNavigation('home')}
            style={{
              background: '#D01C1C',
              color: '#F5F5F5',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '8px',
              marginTop: '20px',
              cursor: 'pointer'
            }}
          >
            Ir a Inicio
          </button>
        </div>
      )
    }
    
    try {
      // ComponentFactory puede ser una función que retorna un componente o un componente directo
      if (typeof ComponentFactory === 'function') {
        // Si es una función, ejecutarla para obtener el elemento React
        console.log('🎬 App - Ejecutando ComponentFactory...')
        const Component = ComponentFactory()
        console.log('🎬 App - ComponentFactory ejecutado, retornando componente:', Component?.type?.name || 'Elemento React')
        
        // Verificar que Component no sea null o undefined
        if (!Component) {
          console.error('❌ App - ComponentFactory retornó null/undefined')
          return (
            <div style={{ padding: '40px', color: '#F5F5F5', textAlign: 'center', background: '#131313' }}>
              <h2>Error: El componente no se pudo generar</h2>
              <p>Ruta: {router.getCurrentRoute()}</p>
            </div>
          )
        }
        
        return Component
      } else {
        // Si es un componente directo, renderizarlo
        console.log('🎬 App - ComponentFactory es componente directo, renderizando...')
        return <ComponentFactory />
      }
    } catch (error) {
      console.error('❌ Error al renderizar componente:', error)
      console.error('❌ Stack trace:', error.stack)
      return (
        <div style={{ 
          padding: '40px', 
          color: '#D01C1C', 
          textAlign: 'center',
          background: '#131313',
          minHeight: '400px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <h2>Error al renderizar componente</h2>
          <p>Ruta: {router.getCurrentRoute()}</p>
          <p>Error: {error.message}</p>
          <button 
            onClick={() => handleNavigation('home')}
            style={{
              background: '#D01C1C',
              color: '#F5F5F5',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '8px',
              marginTop: '20px',
              cursor: 'pointer'
            }}
          >
            Ir a Inicio
          </button>
        </div>
      )
    }
  }

  // Mostrar estado de carga
  if (loading) {
    return (
      <div className="app-loading">
        <div className="loading-spinner-large"></div>
        <p className="loading-text">Cargando AniVerse...</p>
        <button 
          onClick={showAuthForm}
          style={{
            background: '#D01C1C',
            color: '#F5F5F5',
            border: 'none',
            padding: '12px 24px',
            borderRadius: '8px',
            marginTop: '20px',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          Mostrar Formulario de Autenticación
        </button>
      </div>
    )
  }

  // Mostrar error
  if (error) {
    return (
      <div className="app-error">
        <div className="error-icon">⚠️</div>
        <h2 className="error-title">Error de Conexión</h2>
        <p className="error-message">{error}</p>
        <button 
          className="retry-button"
          onClick={() => window.location.reload()}
        >
          Reintentar
        </button>
      </div>
    )
  }

  // Mostrar formulario de autenticación o aplicación principal
  return (
    <div className="App">
      {showAuth ? (
        <AuthForm onAuthSuccess={handleAuthSuccess} />
      ) : (
        <>
          {/* Header limpio - sin menú hamburguesa en desktop */}
          <header className="app-header">
            <div className="header-content">
              <div className="header-logo" onClick={() => handleNavigation('home')}>
                <img 
                  src="/logo.png" 
                  alt="AniVerse Logo" 
                  className="header-logo-image"
                  onError={(e) => {
                    // Fallback si no existe el logo
                    e.target.style.display = 'none'
                  }}
                />
              </div>
            </div>
          </header>

          {/* Sidebar */}
          <Sidebar 
            isOpen={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
            currentPage={currentPage}
            onNavigate={handleNavigation}
          />

          {/* Contenido principal */}
          <main className="app-main" key={routeKey}>
            {(() => {
              const component = getCurrentComponent()
              if (!component) {
                return (
                  <div style={{ 
                    padding: '40px', 
                    color: '#F5F5F5', 
                    textAlign: 'center', 
                    background: '#131313',
                    minHeight: '400px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center'
                  }}>
                    <h2>Cargando componente...</h2>
                    <p>Ruta actual: {router.getCurrentRoute()}</p>
                  </div>
                )
              }
              return component
            })()}
          </main>
        </>
      )}
    </div>
  )
}

export default App
