import { createClient } from '@supabase/supabase-js'

// URL y clave anónima de tu proyecto Supabase

const supabaseUrl = 'https://gnylppyoujzicacehbqn.supabase.co'
const supabaseAnonKey = 'sb_publishable_IK_2ooZ87gG5DpPpVcvq1Q_5bDXYMZX'

// Crear el cliente de Supabase
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Función para verificar la conexión
export const testConnection = async () => {
  try {
    const { data, error } = await supabase.from('_test').select('*').limit(1)
    if (error && error.code !== 'PGRST116') { 
      console.error('Error de conexión a Supabase:', error)
      return false
    }
    console.log('✅ Conexión a Supabase exitosa')
    return true
  } catch (err) {
    console.error('❌ Error al conectar con Supabase:', err)
    return false
  }
}
