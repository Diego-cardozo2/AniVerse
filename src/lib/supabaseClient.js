import { createClient } from '@supabase/supabase-js'

// Configuración de Supabase para AniVerse
const supabaseUrl = 'https://gnylppyoujzicacehbqn.supabase.co'
const supabaseAnonKey = 'sb_publishable_IK_2ooZ87gG5DpPpVcvq1Q_5bDXYMZX'

// Crear el cliente de Supabase con configuración optimizada para Realtime
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
})

// Servicios específicos para AniVerse
export const aniVerseServices = {
  // Obtener todas las publicaciones del feed
  async getPosts() {
    try {
      console.log('Consultando posts desde Supabase...')
      
      // Agregar timeout de 10 segundos
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout: La consulta tardó demasiado')), 10000)
      })
      
      const queryPromise = supabase
        .from('posts')
        .select(`
          *,
          user:users!posts_user_id_fkey(
            id,
            username,
            avatar_url,
            display_name
          )
        `)
        .order('created_at', { ascending: false })
      
      const { data, error } = await Promise.race([queryPromise, timeoutPromise])
      
      if (error) {
        console.error('Error al obtener posts:', error)
        throw error
      }
      
      console.log('Consulta exitosa, posts obtenidos:', data?.length || 0)
      return data || []
    } catch (error) {
      console.error('Error en getPosts:', error)
      throw error
    }
  },

  // Suscribirse a cambios en tiempo real en las publicaciones
  subscribeToPosts(callback) {
    return supabase
      .channel('posts_changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'posts' 
        }, 
        callback
      )
      .subscribe()
  },

  // Toggle like (dar/quitar like) a una publicación
  async toggleLike(postId, userId) {
    try {
      // Primero verificar si ya existe un like
      const { data: existingLike, error: checkError } = await supabase
        .from('post_likes')
        .select('id')
        .eq('post_id', postId)
        .eq('user_id', userId)
        .single()

      if (checkError && checkError.code !== 'PGRST116') {
        console.error('Error al verificar like:', checkError)
        throw checkError
      }

      // Si existe, eliminar (quitar like)
      if (existingLike) {
        const { error: deleteError } = await supabase
          .from('post_likes')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', userId)

        if (deleteError) {
          console.error('Error al quitar like:', deleteError)
          throw deleteError
        }
        return { action: 'deleted', like: null }
      }

      // Si no existe, insertar (dar like)
      const { data, error: insertError } = await supabase
        .from('post_likes')
        .insert({
          post_id: postId,
          user_id: userId,
          created_at: new Date().toISOString()
        })
        .select()
        .single()

      if (insertError) {
        console.error('Error al dar like:', insertError)
        throw insertError
      }

      return { action: 'inserted', like: data }
    } catch (error) {
      console.error('Error en toggleLike:', error)
      throw error
    }
  },

  // Obtener likes de una publicación
  async getPostLikes(postId) {
    const { data, error } = await supabase
      .from('post_likes')
      .select('*')
      .eq('post_id', postId)
    
    if (error) {
      console.error('Error al obtener likes:', error)
      throw error
    }
    return data || []
  },

  // Suscribirse a cambios de likes en tiempo real
  subscribeToLikes(postId, callback) {
    return supabase
      .channel(`post_likes:${postId}`)
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'post_likes',
          filter: `post_id=eq.${postId}`
        }, 
        (payload) => {
          console.log('Cambio detectado en likes:', payload)
          // Formatear el payload para que sea consistente
          const formattedPayload = {
            eventType: payload.eventType || (payload.new ? 'INSERT' : payload.old ? 'DELETE' : null),
            new: payload.new || null,
            old: payload.old || null
          }
          callback(formattedPayload)
        }
      )
      .subscribe()
  },

  // Servicios de comentarios
  comments: {
    // Obtener comentarios de un post
    async getPostComments(postId) {
      try {
        const { data, error } = await supabase
          .from('comments')
          .select(`
            *,
            user:users!comments_user_id_fkey(
              id,
              username,
              display_name,
              avatar_url
            )
          `)
          .eq('post_id', postId)
          .order('created_at', { ascending: true })

        if (error) {
          console.error('Error al obtener comentarios:', error)
          throw error
        }
        return data || []
      } catch (error) {
        console.error('Error en getPostComments:', error)
        throw error
      }
    },

    // Crear un comentario
    async createComment(postId, userId, content) {
      try {
        if (!content.trim()) {
          throw new Error('El comentario no puede estar vacío')
        }

        const { data, error } = await supabase
          .from('comments')
          .insert({
            post_id: postId,
            user_id: userId,
            content: content.trim(),
            created_at: new Date().toISOString()
          })
          .select(`
            *,
            user:users!comments_user_id_fkey(
              id,
              username,
              display_name,
              avatar_url
            )
          `)
          .single()

        if (error) {
          console.error('Error al crear comentario:', error)
          throw error
        }

        // Actualizar contador de comentarios en el post
        const { error: updateError } = await supabase.rpc('increment_comment_count', {
          post_id: postId
        })

        if (updateError) {
          console.error('Error al actualizar contador de comentarios:', updateError)
          // No lanzar error, solo loguearlo
        }

        return data
      } catch (error) {
        console.error('Error en createComment:', error)
        throw error
      }
    },

    // Eliminar un comentario
    async deleteComment(commentId, userId) {
      try {
        const { error } = await supabase
          .from('comments')
          .delete()
          .eq('id', commentId)
          .eq('user_id', userId) // Solo el autor puede eliminar

        if (error) {
          console.error('Error al eliminar comentario:', error)
          throw error
        }

        return true
      } catch (error) {
        console.error('Error en deleteComment:', error)
        throw error
      }
    },

    // Suscribirse a cambios de comentarios en tiempo real
    subscribeToComments(postId, callback) {
      return supabase
        .channel(`post_comments:${postId}`)
        .on('postgres_changes', 
          { 
            event: '*', 
            schema: 'public', 
            table: 'comments',
            filter: `post_id=eq.${postId}`
          }, 
          (payload) => {
            console.log('Cambio detectado en comentarios:', payload)
            // Formatear el payload para que sea consistente
            const formattedPayload = {
              eventType: payload.eventType || (payload.new ? 'INSERT' : payload.old ? 'DELETE' : null),
              new: payload.new || null,
              old: payload.old || null
            }
            callback(formattedPayload)
          }
        )
        .subscribe()
    }
  },

  // Subir imagen a Supabase Storage
  async uploadImage(file, userId) {
    try {
      console.log('Subiendo imagen para usuario:', userId)
      
      // Generar nombre único para el archivo
      const fileExt = file.name.split('.').pop()
      const fileName = `${userId}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
      const filePath = `posts-media/${fileName}`

      console.log('Ruta del archivo:', filePath)

      // Subir archivo
      const { data, error } = await supabase.storage
        .from('posts-media')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (error) {
        console.error('Error de storage:', error)
        throw error
      }

      // Obtener URL pública
      const { data: publicData } = supabase.storage
        .from('posts-media')
        .getPublicUrl(filePath)

      console.log('Imagen subida exitosamente:', publicData.publicUrl)
      return publicData.publicUrl

    } catch (error) {
      console.error('Error en uploadImage:', error)
      
      // Manejar errores específicos
      if (error.message.includes('row-level security policy')) {
        throw new Error('Error de permisos: No tienes autorización para subir imágenes. Contacta al administrador.')
      } else if (error.message.includes('bucket')) {
        throw new Error('Error: El bucket de almacenamiento no está configurado correctamente.')
      } else {
        throw new Error(`Error al subir imagen: ${error.message}`)
      }
    }
  },

  // Servicios de comunidades
  communities: {
    // Obtener todas las comunidades
    async getAll() {
      try {
        console.log('Obteniendo comunidades...')
        
        const { data, error } = await supabase
          .from('communities')
          .select(`
            *,
            members:user_communities(count),
            recent_posts:posts(count)
          `)
          .eq('is_public', true)
          .order('member_count', { ascending: false })

        if (error) {
          console.error('Error al obtener comunidades:', error)
          throw error
        }

        console.log('Comunidades obtenidas:', data?.length || 0)
        return data || []
      } catch (error) {
        console.error('Error en communities.getAll:', error)
        throw error
      }
    },

    // Buscar comunidades
    async search(query) {
      try {
        console.log('Buscando comunidades:', query)
        
        const { data, error } = await supabase
          .from('communities')
          .select(`
            *,
            members:user_communities(count),
            recent_posts:posts(count)
          `)
          .eq('is_public', true)
          .or(`name.ilike.%${query}%, description.ilike.%${query}%, category.ilike.%${query}%`)
          .order('member_count', { ascending: false })

        if (error) {
          console.error('Error al buscar comunidades:', error)
          throw error
        }

        console.log('Resultados de búsqueda:', data?.length || 0)
        return data || []
      } catch (error) {
        console.error('Error en communities.search:', error)
        throw error
      }
    },

    // Obtener membresías del usuario
    async getUserMemberships(userId) {
      try {
        console.log('Obteniendo membresías para usuario:', userId)
        
        const { data, error } = await supabase
          .from('user_communities')
          .select('community_id')
          .eq('user_id', userId)

        if (error) {
          console.error('Error al obtener membresías:', error)
          throw error
        }

        const membershipIds = data?.map(item => item.community_id) || []
        console.log('Membresías obtenidas:', membershipIds.length)
        return membershipIds
      } catch (error) {
        console.error('Error en communities.getUserMemberships:', error)
        throw error
      }
    },

    // Unirse a una comunidad
    async join(communityId, userId) {
      try {
        console.log('Uniéndose a comunidad:', communityId, 'usuario:', userId)
        
        const { error } = await supabase
          .from('user_communities')
          .insert({
            user_id: userId,
            community_id: communityId
          })

        if (error) {
          console.error('Error al unirse a comunidad:', error)
          throw error
        }

        console.log('Unión exitosa a la comunidad')
        return true
      } catch (error) {
        console.error('Error en communities.join:', error)
        throw error
      }
    },

    // Salir de una comunidad
    async leave(communityId, userId) {
      try {
        console.log('Saliendo de comunidad:', communityId, 'usuario:', userId)
        
        const { error } = await supabase
          .from('user_communities')
          .delete()
          .eq('user_id', userId)
          .eq('community_id', communityId)

        if (error) {
          console.error('Error al salir de comunidad:', error)
          throw error
        }

        console.log('Salida exitosa de la comunidad')
        return true
      } catch (error) {
        console.error('Error en communities.leave:', error)
        throw error
      }
    },

    // Crear una nueva comunidad
    async create(communityData, userId) {
      try {
        console.log('Creando comunidad:', communityData)
        
        const { data, error } = await supabase
          .from('communities')
          .insert({
            ...communityData,
            created_by: userId,
            slug: communityData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
          })
          .select()
          .single()

        if (error) {
          console.error('Error al crear comunidad:', error)
          throw error
        }

        console.log('Comunidad creada exitosamente:', data)
        return data
      } catch (error) {
        console.error('Error en communities.create:', error)
        throw error
      }
    }
  },

  // Servicios de chats/mensajería
  chats: {
    // Buscar o crear un chat entre dos usuarios
    async findOrCreateChat(user1Id, user2Id) {
      try {
        console.log('Buscando chat entre usuarios:', user1Id, user2Id)
        
        // Primero buscar si ya existe un chat entre estos dos usuarios
        // Necesitamos buscar en ambos sentidos (user1_id/user2_id y user2_id/user1_id)
        const { data: existingChat, error: searchError } = await supabase
          .from('chats')
          .select('id')
          .or(`and(user1_id.eq.${user1Id},user2_id.eq.${user2Id}),and(user1_id.eq.${user2Id},user2_id.eq.${user1Id})`)
          .maybeSingle()

        if (searchError && searchError.code !== 'PGRST116') {
          console.error('Error al buscar chat:', searchError)
          throw searchError
        }

        // Si existe un chat, retornarlo
        if (existingChat) {
          console.log('Chat existente encontrado:', existingChat.id)
          return existingChat.id
        }

        // Si no existe, crear uno nuevo
        console.log('Creando nuevo chat...')
        const { data: newChat, error: createError } = await supabase
          .from('chats')
          .insert({
            user1_id: user1Id,
            user2_id: user2Id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select('id')
          .single()

        if (createError) {
          console.error('Error al crear chat:', createError)
          throw createError
        }

        console.log('Nuevo chat creado:', newChat.id)
        return newChat.id
      } catch (error) {
        console.error('Error en findOrCreateChat:', error)
        throw error
      }
    }
  }
}
