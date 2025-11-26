import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import './AuthForm.css'

const AuthForm = ({ onAuthSuccess }) => {
  // Estados del formulario
  const [mode, setMode] = useState('login') // 'login', 'signup' o 'forgot-password'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [resetToken, setResetToken] = useState(null) // Para manejar el token de reset

  // Referencias para accesibilidad
  const emailRef = useState(null)[0]
  const passwordRef = useState(null)[0]
  const confirmPasswordRef = useState(null)[0]
  const displayNameRef = useState(null)[0]
  const usernameRef = useState(null)[0]

  // Limpiar formulario al cambiar modo
  useEffect(() => {
    setEmail('')
    setPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setDisplayName('')
    setUsername('')
    setError(null)
    setSuccess(null)
  }, [mode])

  // Verificar si hay un token de reset en la URL al cargar
  useEffect(() => {
    const handleAuthCallback = async () => {
      const hashParams = new URLSearchParams(window.location.hash.substring(1))
      const accessToken = hashParams.get('access_token')
      const type = hashParams.get('type')
      
      if (type === 'recovery' && accessToken) {
        try {
          // Establecer la sesión con el token de recuperación
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: hashParams.get('refresh_token') || ''
          })

          if (error) {
            console.error('Error al establecer sesión de recuperación:', error)
            setError('El enlace de recuperación ha expirado o es inválido.')
            return
          }

          setResetToken(accessToken)
          setMode('reset-password')
          // Limpiar la URL
          window.history.replaceState(null, '', window.location.pathname)
        } catch (err) {
          console.error('Error al procesar token de recuperación:', err)
          setError('Error al procesar el enlace de recuperación.')
        }
      }
    }

    handleAuthCallback()
  }, [])

  // Validación de formulario
  const validateForm = () => {
    if (!email.trim()) {
      setError('El email es requerido')
      return false
    }

    if (!email.includes('@')) {
      setError('Por favor ingresa un email válido')
      return false
    }

    if (!password.trim()) {
      setError('La contraseña es requerida')
      return false
    }

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      return false
    }

    if (mode === 'signup') {
      if (!displayName.trim()) {
        setError('El nombre de usuario es requerido')
        return false
      }

      if (!username.trim()) {
        setError('El nombre de usuario es requerido')
        return false
      }

      if (username.length < 3) {
        setError('El nombre de usuario debe tener al menos 3 caracteres')
        return false
      }

      if (password !== confirmPassword) {
        setError('Las contraseñas no coinciden')
        return false
      }
    }

    return true
  }

  // Manejar registro de usuario
  const handleSignUp = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) return

    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      // Registrar usuario en Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password: password.trim(),
        options: {
          emailRedirectTo: `${window.location.origin}`,
          data: {
            display_name: displayName.trim(),
            username: username.trim(),
            full_name: displayName.trim()
          }
        }
      })

      if (authError) {
        throw authError
      }

      // Crear perfil de usuario en la tabla users
      if (authData.user) {
        const { error: profileError } = await supabase
          .from('users')
          .insert([
            {
              id: authData.user.id,
              email: email.trim(),
              username: username.trim(),
              display_name: displayName.trim(),
              avatar_url: null,
              bio: null
            }
          ])

        if (profileError && !profileError.message.includes('duplicate key')) {
          console.error('Error al crear perfil:', profileError)
          // No lanzar error aquí para no interrumpir el registro
        }

        setSuccess('¡Registro exitoso! Revisa tu email para confirmar tu cuenta.')
        
        // Limpiar formulario
        setTimeout(() => {
          setEmail('')
          setPassword('')
          setConfirmPassword('')
          setDisplayName('')
          setUsername('')
          setMode('login')
        }, 2000)
      }

    } catch (error) {
      console.error('Error en registro:', error)
      
      // Manejar errores específicos
      if (error.message.includes('already registered')) {
        setError('Este email ya está registrado. Intenta iniciar sesión.')
        setMode('login')
      } else if (error.message.includes('Invalid email')) {
        setError('Por favor ingresa un email válido')
      } else if (error.message.includes('Password')) {
        setError('La contraseña debe tener al menos 6 caracteres')
      } else {
        setError(error.message || 'Error al registrar usuario')
      }
    } finally {
      setLoading(false)
    }
  }

  // Manejar solicitud de recuperación de contraseña
  const handleForgotPassword = async (e) => {
    e.preventDefault()
    
    if (!email.trim()) {
      setError('Por favor ingresa tu email')
      return
    }

    if (!email.includes('@')) {
      setError('Por favor ingresa un email válido')
      return
    }

    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}${window.location.pathname}`
      })

      if (error) {
        throw error
      }

      setSuccess('¡Revisa tu email! Te hemos enviado un enlace para restablecer tu contraseña.')
      
    } catch (error) {
      console.error('Error al solicitar recuperación:', error)
      
      if (error.message.includes('rate limit')) {
        setError('Demasiados intentos. Espera un momento antes de intentar de nuevo.')
      } else {
        setError('Error al enviar el email de recuperación. Verifica que el email sea correcto.')
      }
    } finally {
      setLoading(false)
    }
  }

  // Manejar reset de contraseña con el token
  const handleResetPassword = async (e) => {
    e.preventDefault()
    
    if (!newPassword.trim()) {
      setError('La nueva contraseña es requerida')
      return
    }

    if (newPassword.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      return
    }

    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden')
      return
    }

    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword.trim()
      })

      if (error) {
        throw error
      }

      setSuccess('¡Contraseña actualizada exitosamente! Redirigiendo al login...')
      
      // Limpiar y volver al login después de un breve delay
      setTimeout(() => {
        setNewPassword('')
        setConfirmPassword('')
        setResetToken(null)
        setMode('login')
        setSuccess(null)
      }, 2000)

    } catch (error) {
      console.error('Error al restablecer contraseña:', error)
      setError('Error al restablecer la contraseña. El enlace puede haber expirado.')
    } finally {
      setLoading(false)
    }
  }
  const handleLogin = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) return

    // Prevenir múltiples intentos
    if (loading) {
      console.log('Login ya en progreso, ignorando intento duplicado')
      return
    }

    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      console.log('Iniciando proceso de login...')
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim()
      })

      // Si hay error por email no confirmado, intentar confirmar automáticamente
      if (error && error.message.includes('Email not confirmed')) {
        console.log('Email no confirmado, intentando confirmar automáticamente...')
        
        try {
          // Primero intentar usar la función edge si está disponible
          const { data: functionData, error: functionError } = await supabase.functions.invoke(
            'login-without-email-confirmation',
            {
              body: {
                email: email.trim(),
                password: password.trim()
              }
            }
          )

          if (!functionError && functionData && functionData.session) {
            // Establecer la sesión manualmente
            const { error: sessionError } = await supabase.auth.setSession({
              access_token: functionData.session.access_token,
              refresh_token: functionData.session.refresh_token
            })

            if (!sessionError) {
              console.log('Login exitoso (sin confirmar email):', functionData.user.email)
              setSuccess('¡Inicio de sesión exitoso!')
              onAuthSuccess(functionData.user)
              return
            }
          }
        } catch (functionErr) {
          console.error('Error en función edge:', functionErr)
        }
        
        // Si la función edge no está disponible, mostrar mensaje más claro
        console.error('No se pudo confirmar el email automáticamente. Por favor, confirma tu email en Supabase Dashboard o crea un nuevo usuario.')
      }

      if (error) {
        console.error('Error de autenticación:', error)
        throw error
      }

      if (data.user) {
        console.log('Login exitoso:', data.user.email)
        setSuccess('¡Inicio de sesión exitoso!')
        
        // Notificar al componente padre inmediatamente
        onAuthSuccess(data.user)
      }

    } catch (error) {
      console.error('Error en login:', error)
      
      // Manejar errores específicos
      if (error.message.includes('Invalid login credentials')) {
        setError('Email o contraseña incorrectos')
      } else if (error.message.includes('Email not confirmed')) {
        // Ya se intentó manejar arriba, mostrar mensaje informativo
        setError('Tu email no está confirmado. Por favor, confirma tu email o contacta al administrador.')
      } else if (error.message.includes('Too many requests')) {
        setError('Demasiados intentos. Espera un momento antes de intentar de nuevo')
      } else {
        setError(error.message || 'Error al iniciar sesión')
      }
    } finally {
      setLoading(false)
    }
  }

  // Cambiar modo del formulario
  const toggleMode = () => {
    setMode(mode === 'login' ? 'signup' : 'login')
    setError(null)
    setSuccess(null)
  }

  // Mostrar formulario de olvidé contraseña
  const showForgotPassword = () => {
    setMode('forgot-password')
    setError(null)
    setSuccess(null)
  }

  // Volver al login desde forgot-password
  const backToLogin = () => {
    setMode('login')
    setError(null)
    setSuccess(null)
  }

  // Manejar envío del formulario
  const handleSubmit = (e) => {
    if (mode === 'login') {
      handleLogin(e)
    } else if (mode === 'signup') {
      handleSignUp(e)
    } else if (mode === 'forgot-password') {
      handleForgotPassword(e)
    } else if (mode === 'reset-password') {
      handleResetPassword(e)
    }
  }

  // Manejar tecla Enter en campos
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        
        {/* Header del formulario */}
        <div className="auth-header">
          <div className="auth-logo">
            <img 
              src="/logo.png" 
              alt="AniVerse Logo" 
              className="auth-logo-image"
            />
            <p className="auth-subtitle">Tu comunidad de anime y manga</p>
          </div>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="auth-form">
          
          {/* Título del modo */}
          <h2 className="form-mode-title">
            {mode === 'login' ? 'Iniciar Sesión' : 
             mode === 'signup' ? 'Crear Cuenta' :
             mode === 'forgot-password' ? 'Recuperar Contraseña' :
             'Restablecer Contraseña'}
          </h2>

          {/* Campo de email */}
          {(mode === 'login' || mode === 'signup' || mode === 'forgot-password') && (
            <div className="form-group">
              <label htmlFor="email" className="form-label">
                Email
              </label>
              <input
                ref={emailRef}
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyPress={handleKeyPress}
                className="form-input"
                placeholder="tu@email.com"
                disabled={loading}
                autoComplete="email"
                required
              />
            </div>
          )}

          {/* Campo de contraseña */}
          {mode !== 'forgot-password' && mode !== 'reset-password' && (
            <div className="form-group">
              <label htmlFor="password" className="form-label">
                Contraseña
              </label>
              <input
                ref={passwordRef}
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyPress={handleKeyPress}
                className="form-input"
                placeholder="••••••••"
                disabled={loading}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                required
              />
              {/* Enlace "Olvidé mi contraseña" solo en modo login */}
              {mode === 'login' && (
                <div className="forgot-password-link">
                  <button
                    type="button"
                    onClick={showForgotPassword}
                    className="forgot-password-btn"
                    disabled={loading}
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Campos para recuperación de contraseña */}
          {mode === 'forgot-password' && (
            <div className="form-group">
              <p className="forgot-password-info">
                Ingresa tu email y te enviaremos un enlace para restablecer tu contraseña.
              </p>
            </div>
          )}

          {/* Campos para reset de contraseña */}
          {mode === 'reset-password' && (
            <>
              <div className="form-group">
                <label htmlFor="newPassword" className="form-label">
                  Nueva Contraseña
                </label>
                <input
                  type="password"
                  id="newPassword"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="form-input"
                  placeholder="••••••••"
                  disabled={loading}
                  autoComplete="new-password"
                  required
                  minLength={6}
                />
              </div>
              <div className="form-group">
                <label htmlFor="confirmPasswordReset" className="form-label">
                  Confirmar Nueva Contraseña
                </label>
                <input
                  type="password"
                  id="confirmPasswordReset"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="form-input"
                  placeholder="••••••••"
                  disabled={loading}
                  autoComplete="new-password"
                  required
                  minLength={6}
                />
              </div>
            </>
          )}

          {/* Campos adicionales para registro */}
          {mode === 'signup' && (
            <>
              {/* Campo de confirmar contraseña */}
              <div className="form-group">
                <label htmlFor="confirmPassword" className="form-label">
                  Confirmar Contraseña
                </label>
                <input
                  ref={confirmPasswordRef}
                  type="password"
                  id="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="form-input"
                  placeholder="••••••••"
                  disabled={loading}
                  autoComplete="new-password"
                  required
                />
              </div>

              {/* Campo de nombre de usuario */}
              <div className="form-group">
                <label htmlFor="displayName" className="form-label">
                  Nombre Completo
                </label>
                <input
                  ref={displayNameRef}
                  type="text"
                  id="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="form-input"
                  placeholder="Tu nombre completo"
                  disabled={loading}
                  autoComplete="name"
                  required
                />
              </div>

              {/* Campo de username */}
              <div className="form-group">
                <label htmlFor="username" className="form-label">
                  Nombre de Usuario
                </label>
                <input
                  ref={usernameRef}
                  type="text"
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="form-input"
                  placeholder="tu_usuario"
                  disabled={loading}
                  autoComplete="username"
                  required
                />
              </div>
            </>
          )}

          {/* Mensajes de estado */}
          {error && (
            <div className="status-message error">
              <svg viewBox="0 0 24 24" fill="none" stroke="#F5F5F5" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="15" y1="9" x2="9" y2="15"/>
                <line x1="9" y1="9" x2="15" y2="15"/>
              </svg>
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="status-message success">
              <svg viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22,4 12,14.01 9,11.01"/>
              </svg>
              <span>{success}</span>
            </div>
          )}

          {/* Botón principal */}
          <button
            type="submit"
            className={`auth-submit-btn ${loading ? 'loading' : ''}`}
            disabled={loading}
          >
            {loading ? (
              <>
                <div className="btn-spinner"></div>
                {mode === 'login' ? 'Iniciando sesión...' : 
                 mode === 'signup' ? 'Creando cuenta...' :
                 mode === 'forgot-password' ? 'Enviando email...' :
                 'Actualizando contraseña...'}
              </>
            ) : (
              <>
                {mode !== 'login' && (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    {mode === 'signup' ? (
                      <>
                        <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                        <circle cx="8.5" cy="7" r="4"/>
                        <line x1="20" y1="8" x2="20" y2="14"/>
                        <line x1="23" y1="11" x2="17" y2="11"/>
                      </>
                    ) : mode === 'forgot-password' ? (
                      <>
                        <circle cx="12" cy="12" r="10"/>
                        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
                        <line x1="12" y1="17" x2="12.01" y2="17"/>
                      </>
                    ) : (
                      <>
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                        <polyline points="22,4 12,14.01 9,11.01"/>
                      </>
                    )}
                  </svg>
                )}
                {mode === 'login' ? 'Iniciar Sesión' : 
                 mode === 'signup' ? 'Crear Cuenta' :
                 mode === 'forgot-password' ? 'Enviar Enlace' :
                 'Restablecer Contraseña'}
              </>
            )}
          </button>

          {/* Botones de navegación */}
          {mode === 'forgot-password' ? (
            <div className="auth-switch">
              <button
                type="button"
                className="switch-btn"
                onClick={backToLogin}
                disabled={loading}
              >
                ← Volver al inicio de sesión
              </button>
            </div>
          ) : mode === 'reset-password' ? (
            <div className="auth-switch">
              <button
                type="button"
                className="switch-btn"
                onClick={backToLogin}
                disabled={loading}
              >
                ← Volver al inicio de sesión
              </button>
            </div>
          ) : (
            <div className="auth-switch">
              <p className="switch-text">
                {mode === 'login' ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?'}
              </p>
              <button
                type="button"
                className="switch-btn"
                onClick={toggleMode}
                disabled={loading}
              >
                {mode === 'login' ? 'Crear cuenta' : 'Iniciar sesión'}
              </button>
            </div>
          )}

          {/* Información adicional */}
          <div className="auth-info">
            <p className="info-text">
              Al continuar, aceptas los{' '}
              <a href="#" className="info-link">Términos de Servicio</a>
              {' '}y la{' '}
              <a href="#" className="info-link">Política de Privacidad</a>
            </p>
          </div>

        </form>
      </div>
    </div>
  )
}

export default AuthForm
