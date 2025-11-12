# Sugerencias para la Barra Lateral Derecha de AniVerse

## Contexto
Este documento contiene sugerencias de componentes y funcionalidades que podrían implementarse en la barra lateral derecha de AniVerse, basándose en el diseño de X (Twitter) y adaptado al contexto de una red social de anime y manga.

## Componentes Sugeridos

### 1. Sugerencias para Seguir
**Descripción:** Muestra usuarios populares o relevantes que el usuario actual aún no sigue.

**Funcionalidades:**
- Lista de 3-5 usuarios sugeridos
- Avatar, nombre de usuario y breve descripción/biografía
- Botón "Seguir" para cada usuario
- Actualización dinámica basada en:
  - Usuarios que siguen a personas que el usuario sigue
  - Usuarios con intereses similares (basado en comunidades)
  - Usuarios populares en la plataforma

**Diseño:**
- Tarjetas compactas con avatar circular
- Tipografía: Nunito Sans para nombres, Poppins para descripciones
- Botón de seguir con acento rojo (#D01C1C)

---

### 2. Comunidades Populares
**Descripción:** Muestra las comunidades más activas o trending relacionadas con anime y manga.

**Funcionalidades:**
- Lista de 3-5 comunidades destacadas
- Nombre de la comunidad, ícono/avatar y número de miembros
- Botón "Unirse" para comunidades no unidas
- Indicador de actividad reciente (ej: "5 posts en la última hora")
- Filtrado por:
  - Comunidades más activas
  - Comunidades trending
  - Comunidades relacionadas con los intereses del usuario

**Diseño:**
- Tarjetas con ícono de comunidad, nombre y estadísticas
- Badge de "Trending" si aplica
- Colores temáticos según el tipo de comunidad

---

### 3. Tendencias / Hashtags Populares
**Descripción:** Muestra los hashtags o temas más populares en tiempo real.

**Funcionalidades:**
- Lista de 5-10 hashtags trending
- Nombre del hashtag y número de menciones
- Indicador de tendencia (subiendo, estable, bajando)
- Click en hashtag navega a búsqueda/filtro de posts
- Categorización:
  - Anime del momento
  - Manga trending
  - Eventos y lanzamientos
  - Discusiones populares

**Diseño:**
- Lista numerada o con ícono de fuego para trending
- Tipografía: Poppins para hashtags, Nunito Sans para números
- Color de acento para indicadores de tendencia

---

### 4. Merchandising Destacado
**Descripción:** Sección promocional para productos relacionados con anime/manga (opcional, para monetización futura).

**Funcionalidades:**
- Carousel o lista de productos destacados
- Imagen del producto, nombre y precio
- Enlace a tienda externa o página de producto
- Filtrado por:
  - Productos relacionados con intereses del usuario
  - Lanzamientos recientes
  - Ofertas especiales

**Diseño:**
- Tarjetas de producto con imagen destacada
- Badge de "Nuevo" o "Oferta" si aplica
- Botón de "Ver más" con estilo discreto

---

### 5. Eventos y Lanzamientos
**Descripción:** Calendario o lista de eventos importantes en el mundo del anime y manga.

**Funcionalidades:**
- Próximos estrenos de anime
- Lanzamientos de manga
- Eventos de la comunidad (convenciones, streams, etc.)
- Recordatorios personalizados
- Integración con calendario del usuario

**Diseño:**
- Tarjetas de evento con fecha destacada
- Ícono de tipo de evento (anime, manga, evento)
- Botón "Recordar" o "Interesado"

---

### 6. Estadísticas del Usuario (Opcional)
**Descripción:** Panel personalizado con métricas del usuario.

**Funcionalidades:**
- Número de seguidores/seguidos
- Posts publicados este mes
- Comunidades activas
- Logros o badges
- Gráfico de actividad semanal

**Diseño:**
- Tarjetas compactas con iconos
- Números destacados con tipografía Nunito Sans Bold
- Diseño minimalista y discreto

---

## Consideraciones de Diseño

### Layout
- Ancho sugerido: 300-350px en escritorio
- Posición: Fixed o sticky en el lado derecho
- Scroll independiente si el contenido es extenso
- Oculto en móvil (< 768px) o colapsable

### Paleta de Colores
- Fondo: #131313 o #1a1a1a (consistente con el tema oscuro)
- Bordes: #333 (sutiles)
- Acentos: #D01C1C (rojo) para acciones principales
- Texto: #F5F5F5 para títulos, #a0a0a0 para secundario

### Tipografía
- **Nunito Sans**: Títulos, nombres de usuario, números destacados
- **Poppins**: Cuerpo de texto, descripciones, hashtags

### Espaciado
- Padding: 16-20px entre secciones
- Gap: 12-16px entre elementos dentro de secciones
- Border-radius: 12-16px para tarjetas

---

## Priorización para MVP

### Fase 1 (MVP)
1. **Sugerencias para Seguir** - Esencial para crecimiento de la red
2. **Comunidades Populares** - Fomenta participación en comunidades

### Fase 2 (Post-MVP)
3. **Tendencias / Hashtags** - Aumenta engagement y descubrimiento
4. **Eventos y Lanzamientos** - Valor agregado para usuarios de anime/manga

### Fase 3 (Futuro)
5. **Merchandising Destacado** - Monetización
6. **Estadísticas del Usuario** - Gamificación y retención

---

## Notas de Implementación

- Todos los componentes deben ser responsive y ocultarse en móvil
- Considerar lazy loading para mejorar rendimiento
- Implementar skeleton loaders mientras se cargan los datos
- Usar Supabase Realtime para actualizaciones en vivo (especialmente para trending)
- Considerar caché local para reducir llamadas a la API

---

## Ejemplo de Estructura de Componente

```jsx
// RightSidebar.jsx
const RightSidebar = () => {
  return (
    <aside className="right-sidebar">
      <SuggestionsToFollow />
      <PopularCommunities />
      <TrendingHashtags />
      {/* Otros componentes según fase */}
    </aside>
  )
}
```

---

**Última actualización:** Diciembre 2024
**Autor:** Documentación para tesis de AniVerse

