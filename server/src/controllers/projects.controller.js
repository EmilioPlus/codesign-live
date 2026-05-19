import db from "../config/firebase.js"

// Get projects for a specific user (broadcaster)
export const getUserProjects = async (req, res, next) => {
  try {
    const { userId } = req.params

    // Validate userId format
    if (!userId || typeof userId !== 'string' || userId.length > 100) {
      return res.status(400).json({ error: "userId inválido" })
    }

    const snapshot = await db.collection("projects")
      .where("userId", "==", userId)
      .get()

    const projects = []
    snapshot.forEach(doc => {
      projects.push({ id: doc.id, ...doc.data() })
    })

    projects.sort((a, b) => b.createdAt - a.createdAt)

    res.json(projects)
  } catch (err) {
    next(err)
  }
}

// Create a new project metadata registry
export const createProject = async (req, res, next) => {
  try {
    const { title, fileUrl, type } = req.body
    const userId = req.user.id  // Get userId from authenticated user

    // Validate required fields
    if (!title || !fileUrl || !type) {
      return res.status(400).json({ error: "Faltan campos requeridos: title, fileUrl, type" })
    }

    // Sanitize title - remove potential XSS vectors
    const sanitizedTitle = String(title).trim().slice(0, 200)
    if (!sanitizedTitle) {
      return res.status(400).json({ error: "El título no puede estar vacío" })
    }

    // Validate fileUrl is from allowed domain
    const allowedDomains = ['firebasestorage.googleapis.com']
    try {
      const url = new URL(fileUrl)
      const isAllowed = allowedDomains.some(domain => url.hostname.endsWith(domain))
      if (!isAllowed) {
        return res.status(400).json({ error: "La URL del archivo debe ser del dominio de almacenamiento autorizado" })
      }
    } catch {
      return res.status(400).json({ error: "URL del archivo inválida" })
    }

    // Validate type
    const validTypes = ['2d', '3d']
    if (!validTypes.includes(type)) {
      return res.status(400).json({ error: "Tipo debe ser '2d' o '3d'" })
    }

    const newProject = {
      userId,
      title: sanitizedTitle,
      fileUrl,
      type,
      createdAt: Date.now()
    }

    const docRef = await db.collection("projects").add(newProject)
    res.status(201).json({ id: docRef.id, ...newProject })
  } catch (err) {
    next(err)
  }
}

// Delete a project
export const deleteProject = async (req, res, next) => {
  try {
    const { id } = req.params
    const userId = req.user.id  // Get userId from authenticated user

    // Validate id format
    if (!id || typeof id !== 'string' || id.length > 100) {
      return res.status(400).json({ error: "ID de proyecto inválido" })
    }

    // Get the project to verify ownership
    const projectDoc = await db.collection("projects").doc(id).get()

    if (!projectDoc.exists) {
      return res.status(404).json({ error: "Proyecto no encontrado" })
    }

    const projectData = projectDoc.data()

    // Verify ownership - only the creator can delete
    if (projectData.userId !== userId) {
      return res.status(403).json({ error: "No tienes permiso para eliminar este proyecto" })
    }

    await db.collection("projects").doc(id).delete()
    res.json({ message: "Proyecto eliminado" })
  } catch (err) {
    next(err)
  }
}