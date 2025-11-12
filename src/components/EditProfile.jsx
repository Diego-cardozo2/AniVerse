import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabaseClient'
import './EditProfile.css'

const EditProfile = ({ onSave, onCancel }) => {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  
  // Estados del formulario
  const [username, setUsername] = useState('')
  const [bio, setBio] = useState('')
  const [currentAvatarUrl, setCurrentAvatarUrl] = useState(null)
  const [avatarFile, setAvatarFile] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState(null)
  const [currentUserId, setCurrentUserId] = useState(null)
  
  const fileInputRef = useRef(null)
  
  // Configuración de Storage
  const BUCKET_NAME = 'posts-media' // Usar el bucket existente
  const AVATAR_FOLDER = 'avatars' // Carpeta dentro del bucket para avatares
  const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

  // Cargar datos del usuario al montar el componente
  useEffect(() => {
    const loadUserData = async () => {
      try {
        setLoading(true)
        setError(null)
        
        // Obtener usuario actual
        const { data: { user } } = await supabase.auth.getUser()
        
        if (!user) {
          setError('Debes estar autenticado para editar tu perfil')
          setLoading(false)
          return
        }

        setCurrentUserId(user.id)

        // Obtener datos del perfil desde la tabla users
        const { data: profile, error: profileError } = await supabase
          .from('users')
          .select('username, bio, avatar_url, display_name')
          .eq('id', user.id)
          .single()

        if (profileError && profileError.code !== 'PGRST116') {
          console.error('Error al obtener perfil:', profileError)
          setError('Error al cargar el perfil')
        } else if (profile) {
          setUsername(profile.username || user.email?.split('@')[0] || '')
          setBio(profile.bio || '')
          setCurrentAvatarUrl(profile.avatar_url || null)
        } else {
          // Si no existe el perfil, usar datos del email
          setUsername(user.email?.split('@')[0] || '')
          setBio('')
          setCurrentAvatarUrl(null)
        }
      } catch (err) {
        console.error('Error al cargar datos del usuario:', err)
        setError('Error al cargar los datos del perfil')
      } finally {
        setLoading(false)
      }
    }

    loadUserData()
  }, [])

  // Manejar selección de archivo de avatar
  const handleAvatarSelect = (e) => {
    const file = e.target.files[0]
    if (!file) return

    // Validar tipo de archivo
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('Solo se permiten imágenes (JPEG, PNG, WebP, GIF)')
      return
    }

    // Validar tamaño
    if (file.size > MAX_FILE_SIZE) {
      setError('La imagen debe ser menor a 5MB')
      return
    }

    setAvatarFile(file)
    setError(null)

    // Crear preview
    const reader = new FileReader()
    reader.onload = (e) => {
      setAvatarPreview(e.target.result)
    }
    reader.readAsDataURL(file)
  }

  // Subir avatar a Supabase Storage
  const uploadAvatar = async (file) => {
    try {
      // Generar nombre único para el archivo
      const fileExt = file.name.split('.').pop()
      const fileName = `${currentUserId}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
      // Usar la carpeta avatars dentro del bucket posts-media
      const filePath = `${AVATAR_FOLDER}/${fileName}`

      // Subir archivo al bucket
      const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (error) {
        // Si el error es que el archivo ya existe, usar upsert
        if (error.message.includes('already exists')) {
          const { data: retryData, error: retryError } = await supabase.storage
            .from(BUCKET_NAME)
            .upload(filePath, file, {
              cacheControl: '3600',
              upsert: true
            })
          
          if (retryError) throw retryError
          
          // Obtener URL pública
          const { data: publicData } = supabase.storage
            .from(BUCKET_NAME)
            .getPublicUrl(filePath)
          
          return publicData.publicUrl
        }
        throw error
      }

      // Obtener URL pública
      const { data: publicData } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(filePath)

      return publicData.publicUrl

    } catch (error) {
      console.error('Error al subir avatar:', error)
      
      // Manejar errores específicos
      if (error.message.includes('row-level security policy')) {
        throw new Error('Error de permisos: No tienes autorización para subir avatares. Contacta al administrador.')
      } else if (error.message.includes('bucket') || error.message.includes('Bucket not found')) {
        throw new Error('Error: El bucket de almacenamiento no está configurado correctamente.')
      } else {
        throw new Error(`Error al subir avatar: ${error.message}`)
      }
    }
  }

  // Guardar cambios
  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!currentUserId) {
      setError('Debes estar autenticado para guardar cambios')
      return
    }

    // Validar username
    if (!username.trim()) {
      setError('El nombre de usuario es requerido')
      return
    }

    if (username.trim().length < 3) {
      setError('El nombre de usuario debe tener al menos 3 caracteres')
      return
    }

    setSaving(true)
    setError(null)
    setSuccess(false)

    try {
      let avatarUrl = currentAvatarUrl

      // Subir nuevo avatar si se seleccionó uno
      if (avatarFile) {
        try {
          avatarUrl = await uploadAvatar(avatarFile)
        } catch (uploadError) {
          throw uploadError
        }
      }

      // Actualizar datos en la tabla users
      const { error: updateError } = await supabase
        .from('users')
        .update({
          username: username.trim(),
          bio: bio.trim() || null,
          avatar_url: avatarUrl
        })
        .eq('id', currentUserId)

      if (updateError) {
        console.error('Error al actualizar perfil:', updateError)
        throw new Error(`Error al actualizar el perfil: ${updateError.message}`)
      }

      setSuccess(true)
      
      // Llamar callback si existe
      if (onSave) {
        onSave({
          username: username.trim(),
          bio: bio.trim() || null,
          avatar_url: avatarUrl
        })
      }

      // Cerrar después de un breve delay para mostrar el mensaje de éxito
      setTimeout(() => {
        if (onCancel) {
          onCancel()
        }
      }, 1500)

    } catch (err) {
      console.error('Error al guardar cambios:', err)
      setError(err.message || 'Error al guardar los cambios')
    } finally {
      setSaving(false)
    }
  }

  // Mostrar estado de carga
  if (loading) {
    return (
      <div className="edit-profile-container">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p className="loading-text">Cargando datos del perfil...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="edit-profile-container">
      <div className="edit-profile-header">
        <h1 className="edit-profile-title">Editar Perfil</h1>
        {onCancel && (
          <button 
            className="edit-profile-cancel-button"
            onClick={onCancel}
            type="button"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        )}
      </div>

      <form className="edit-profile-form" onSubmit={handleSubmit}>
        {/* Sección de Avatar */}
        <div className="edit-profile-section">
          <label className="edit-profile-section-title">Foto de Perfil</label>
          <div className="avatar-upload-container">
            <div className="avatar-preview-wrapper">
              {avatarPreview ? (
                <img 
                  src={avatarPreview} 
                  alt="Preview del avatar" 
                  className="avatar-preview"
                />
              ) : currentAvatarUrl ? (
                <img 
                  src={currentAvatarUrl} 
                  alt="Avatar actual" 
                  className="avatar-preview"
                />
              ) : (
                <div className="avatar-placeholder-large">
                  {username.charAt(0).toUpperCase() || 'U'}
                </div>
              )}
              {avatarFile && (
                <button
                  type="button"
                  className="remove-avatar-button"
                  onClick={() => {
                    setAvatarFile(null)
                    setAvatarPreview(null)
                  }}
                  title="Eliminar nueva imagen"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              )}
            </div>
            <div className="avatar-upload-controls">
              <button
                type="button"
                className="avatar-upload-button"
                onClick={() => fileInputRef.current?.click()}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                  <circle cx="12" cy="13" r="4"/>
                </svg>
                {avatarFile ? 'Cambiar Imagen' : 'Seleccionar Imagen'}
              </button>
              <p className="avatar-upload-hint">
                Formatos permitidos: JPEG, PNG, WebP, GIF (máx. 5MB)
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarSelect}
              className="hidden-file-input"
              disabled={saving}
            />
          </div>
        </div>

        {/* Sección de Información */}
        <div className="edit-profile-section">
          <label className="edit-profile-section-title">Información Personal</label>
          
          <div className="form-field">
            <label htmlFor="username" className="form-label">
              Nombre de Usuario *
            </label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="form-input"
              placeholder="Ingresa tu nombre de usuario"
              required
              minLength={3}
              maxLength={30}
              disabled={saving}
            />
            <p className="form-hint">
              Mínimo 3 caracteres, máximo 30 caracteres
            </p>
          </div>

          <div className="form-field">
            <label htmlFor="bio" className="form-label">
              Biografía
            </label>
            <textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="form-textarea"
              placeholder="Escribe algo sobre ti..."
              rows={4}
              maxLength={500}
              disabled={saving}
            />
            <p className="form-hint">
              {bio.length}/500 caracteres
            </p>
          </div>
        </div>

        {/* Mensajes de error y éxito */}
        {error && (
          <div className="edit-profile-message error">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="edit-profile-message success">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
            <span>¡Perfil actualizado exitosamente!</span>
          </div>
        )}

        {/* Botones de acción */}
        <div className="edit-profile-actions">
          {onCancel && (
            <button
              type="button"
              className="edit-profile-button cancel"
              onClick={onCancel}
              disabled={saving}
            >
              Cancelar
            </button>
          )}
          <button
            type="submit"
            className="edit-profile-button save"
            disabled={saving}
          >
            {saving ? (
              <>
                <div className="button-spinner"></div>
                Guardando...
              </>
            ) : (
              'GUARDAR CAMBIOS'
            )}
          </button>
        </div>
      </form>
    </div>
  )
}

export default EditProfile

