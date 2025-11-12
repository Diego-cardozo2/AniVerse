// Sistema de enrutamiento simple para AniVerse
import { useState, useEffect } from 'react'

class SimpleRouter {
  constructor() {
    this.routes = {}
    this.currentRoute = 'home'
    this.currentParams = {}
    this.listeners = []
  }

  // Registrar una ruta
  addRoute(path, component) {
    this.routes[path] = component
    const componentInfo = typeof component === 'function' 
      ? (component.name || 'Función anónima') 
      : (component?.type?.name || 'Componente')
    console.log('📝 Router - Ruta registrada:', path, '-', componentInfo, 
                `(Total rutas: ${Object.keys(this.routes).length})`)
  }

  // Navegar a una ruta
  navigate(path) {
    console.log('🔄 Router - Navegando a:', path)
    
    // Manejar rutas dinámicas como /comunidades/:id
    const routeMatch = this.matchDynamicRoute(path)
    
    if (routeMatch) {
      this.currentRoute = routeMatch.route
      this.currentParams = routeMatch.params
      console.log('✅ Router - Ruta dinámica configurada:', routeMatch.route, routeMatch.params)
      this.notifyListeners()
      console.log('✅ Router - Listeners notificados para ruta dinámica')
    } else if (this.routes[path]) {
      this.currentRoute = path
      this.currentParams = {}
      console.log('✅ Router - Ruta estática configurada:', path)
      this.notifyListeners()
      console.log('✅ Router - Listeners notificados para ruta estática')
    } else {
      console.warn(`⚠️ Router - Ruta no encontrada: ${path}. Rutas disponibles:`, Object.keys(this.routes))
    }
  }

  // Manejar rutas dinámicas
  matchDynamicRoute(path) {
    const dynamicRoutes = [
      { pattern: /^comunidades\/(.+)$/, route: 'community-detail', paramName: 'communityId' },
      { pattern: /^messages\/(.+)$/, route: 'messages', paramName: 'chatId' },
      { pattern: /^perfiles\/(.+)$/, route: 'profile-detail', paramName: 'userId' }
    ]

    for (const dynamicRoute of dynamicRoutes) {
      const match = path.match(dynamicRoute.pattern)
      if (match) {
        return {
          route: dynamicRoute.route,
          params: { [dynamicRoute.paramName]: match[1] }
        }
      }
    }
    
    return null
  }

  // Obtener parámetros de la ruta actual
  getCurrentParams() {
    return this.currentParams || {}
  }

  // Obtener la ruta actual
  getCurrentRoute() {
    return this.currentRoute
  }

  // Obtener el componente actual
  getCurrentComponent() {
    // Si no hay rutas registradas, intentar inicializar por defecto
    if (Object.keys(this.routes).length === 0) {
      console.warn('⚠️ Router - No hay rutas registradas. Esto puede indicar un problema de inicialización.')
      return null
    }
    
    const component = this.routes[this.currentRoute]
    console.log('🔍 Router - Obteniendo componente para ruta:', this.currentRoute, 
                component ? 'Encontrado' : 'No encontrado',
                `(Total rutas: ${Object.keys(this.routes).length})`)
    
    // Si no se encuentra el componente, devolver null
    if (!component) {
      console.error('❌ Router - Componente no encontrado para ruta:', this.currentRoute)
      console.error('❌ Router - Rutas disponibles:', Object.keys(this.routes))
      console.error('❌ Router - Ruta actual:', this.currentRoute)
      return null
    }
    
    return component
  }

  // Suscribirse a cambios de ruta
  subscribe(callback) {
    this.listeners.push(callback)
    
    // Retornar función para desuscribirse
    return () => {
      this.listeners = this.listeners.filter(listener => listener !== callback)
    }
  }

  // Notificar a los listeners
  notifyListeners() {
    console.log('📢 Router - Notificando', this.listeners.length, 'listeners sobre cambio a:', this.currentRoute)
    this.listeners.forEach((listener, index) => {
      try {
        listener(this.currentRoute)
        console.log(`📢 Router - Listener ${index + 1} notificado`)
      } catch (error) {
        console.error(`❌ Router - Error al notificar listener ${index + 1}:`, error)
      }
    })
  }

  // Inicializar con una ruta por defecto
  init(defaultRoute = 'home') {
    console.log('Inicializando router con ruta:', defaultRoute)
    this.currentRoute = defaultRoute
  }
}

// Crear instancia global del router
export const router = new SimpleRouter()

// Hook para usar el router en componentes React
export const useRouter = () => {
  const [currentRoute, setCurrentRoute] = useState(router.getCurrentRoute())
  const [currentParams, setCurrentParams] = useState(router.getCurrentParams())

  useEffect(() => {
    const unsubscribe = router.subscribe((route) => {
      setCurrentRoute(route)
      setCurrentParams(router.getCurrentParams())
    })
    return unsubscribe
  }, [])

  return {
    currentRoute,
    currentParams,
    navigate: (path) => router.navigate(path),
    getCurrentComponent: () => router.getCurrentComponent()
  }
}

// Componente Link personalizado para usar con el router
export const Link = ({ to, children, className, onClick, ...props }) => {
  const handleClick = (e) => {
    // Verificar si algún elemento hijo detuvo la propagación
    // Si el click fue en un elemento hijo (como un botón con stopPropagation),
    // no navegar
    const target = e.target
    const currentTarget = e.currentTarget
    
    // Si el target es diferente del currentTarget, significa que se hizo clic
    // en un elemento hijo. Necesitamos verificar si ese hijo tiene stopPropagation
    if (target !== currentTarget) {
      // Buscar si el target o algún padre tiene un botón o elemento interactivo
      let element = target
      while (element && element !== currentTarget) {
        if (element.tagName === 'BUTTON' || element.onclick) {
          // Si encontramos un botón, asumimos que puede tener stopPropagation
          // El evento se manejará en el botón y no navegaremos
          return
        }
        element = element.parentElement
      }
    }
    
    // Si hay un onClick personalizado en el Link, ejecutarlo
    if (onClick) {
      onClick(e)
      // Si el onClick personalizado previno el default, no navegar
      if (e.defaultPrevented) {
        return
      }
    }
    
    // Prevenir el comportamiento por defecto del enlace
    e.preventDefault()
    
    // Navegar usando el router
    console.log('Link navegando a:', to)
    router.navigate(to)
  }

  return (
    <a 
      href={to.startsWith('/') ? to : `/${to}`}
      onClick={handleClick}
      className={className}
      {...props}
      style={{ 
        textDecoration: 'none', 
        color: 'inherit',
        display: 'block',
        width: '100%',
        cursor: 'pointer',
        ...props.style 
      }}
    >
      {children}
    </a>
  )
}

