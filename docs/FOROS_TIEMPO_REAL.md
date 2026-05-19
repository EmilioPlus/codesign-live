# Foros en tiempo real – CoDesign LIVE

## Qué son los foros en contexto de streaming

En plataformas como Twitch, Kick o YouTube Live, los “foros” suelen tomar formas como:

- **Encuestas en vivo (polls):** el streamer lanza una pregunta con opciones; los espectadores votan y ven resultados en tiempo real.
- **Preguntas y respuestas (Q&A):** los viewers envían preguntas; el streamer las responde en vivo.
- **Temas de debate:** un hilo o pregunta que el streamer abre y los viewers comentan (similar a un mini-foro).

En nuestro caso, el foro es **creado solo por el transmisor**, **visible para los viewers durante un tiempo limitado (30 min)** y, al cerrarse, el **transmisor ve un panel con lo que eligieron los viewers** (resultados de la encuesta / participación).

---

## Qué podemos implementar en la plataforma

### Flujo acordado

1. **Transmisor**
   - En el panel de transmisión tiene un botón **“Crear foro”**.
   - Se abre una ventana con:
     - Título del foro
     - Descripción (opcional)
     - Tipo: **encuesta** (pregunta + varias opciones) o **debate abierto** (solo título/descripción para comentarios).
     - Si es encuesta: lista de opciones (ej. “Opción A”, “Opción B”, …).
   - Al crear, el foro queda **activo** para ese stream.

2. **Viewers**
   - Solo ven el foro si el transmisor ya lo creó.
   - Pueden:
     - **Encuesta:** elegir una opción (un voto por usuario).
     - **Debate:** escribir mensajes/comentarios en el foro.
   - El foro **desaparece para ellos a los 30 minutos** (o cuando el transmisor lo cierre antes).

3. **Transmisor (después de que termine el foro)**
   - Ve un **panel de resultados**:
     - Para encuestas: recuento de votos por opción, opción ganadora.
     - Para debate: listado de comentarios/participación.

### Modelo de datos sugerido (Firestore)

- **Colección `forums`**
  - `id`, `streamId`, `createdBy` (userId del transmisor)
  - `title`, `description`
  - `type`: `"poll"` | `"discussion"`
  - **Si type === "poll":** `options`: `[{ id, text }]`
  - `createdAt`, `expiresAt` (createdAt + 30 min)
  - `status`: `"active"` | `"closed"`

- **Colección `forum_votes`** (solo para type poll)
  - `forumId`, `userId`, `optionId`, `createdAt`
  - Restricción: un solo voto por (forumId, userId).

- **Colección `forum_posts`** (solo para type discussion)
  - `forumId`, `userId`, `userName`, `text`, `createdAt`

### APIs sugeridas

- `POST /api/streams/:streamId/forums` (auth, transmisor del stream)  
  Body: `{ title, description?, type, options? }`  
  Crea el foro y devuelve el foro con `expiresAt`.

- `GET /api/streams/:streamId/forums/active`  
  Devuelve el foro activo del stream (si existe y no ha expirado). Viewers y transmisor lo usan para mostrar el foro.

- `POST /api/forums/:forumId/vote` (auth)  
  Body: `{ optionId }`  
  Registra el voto del usuario (solo si el foro es poll, está activo y no ha votado ya).

- `POST /api/forums/:forumId/posts` (auth)  
  Body: `{ text }`  
  Añade un comentario al foro (solo si type discussion y está activo).

- `GET /api/forums/:forumId/results` (auth, solo transmisor del stream)  
  Devuelve resultados: para poll, recuento por opción; para discussion, lista de posts. Úsalo para el panel del transmisor cuando el foro ya cerró.

### Comportamiento en tiempo real

- **Creación de foro:** cuando el transmisor crea un foro, notificar por **WebSocket** a todos los viewers de ese stream (mensaje tipo `forum-created`) para que la UI muestre el foro al instante.
- **Nuevo voto o post:** enviar por WebSocket (ej. `forum-update`) para actualizar en vivo la lista de votos o comentarios.
- **Cierre a los 30 min:** en el servidor, un job o comprobación al recibir peticiones: si `expiresAt < now`, marcar foro como `closed` y dejar de aceptar votos/posts. Opcional: evento WebSocket `forum-closed` para que viewers oculten el foro y el transmisor muestre el botón/panel de “Ver resultados”.

### Resumen de tareas de implementación

1. Backend: colecciones `forums`, `forum_votes`, `forum_posts` y rutas anteriores.
2. WebSocket: mensajes `forum-created`, `forum-update`, `forum-closed`.
3. Cliente transmisor: botón “Crear foro”, modal con formulario (título, descripción, tipo, opciones si es poll), y panel “Resultados del foro” cuando el foro esté cerrado.
4. Cliente viewer: panel lateral que muestra el foro activo (encuesta con opciones o debate con input de comentarios), ocultar foro cuando reciba `forum-closed` o al pasar 30 min.
5. Timer de 30 min: en backend al crear foro establecer `expiresAt`; en cada uso comprobar expiración y en el cliente mostrar cuenta atrás opcional.

Este documento sirve como referencia para implementar la parte de foros en tiempo real en la plataforma.
