import db from "../config/firebase.js"

// Get projects for a specific user (broadcaster)
export const getUserProjects = async (req, res, next) => {
  try {
    const { userId } = req.params
    if (!userId) return res.status(400).json({ error: "Se requiere userId" })

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
    const { userId, title, fileUrl, type } = req.body
    if (!userId || !title || !fileUrl || !type) {
      return res.status(400).json({ error: "Faltan campos requeridos" })
    }

    const newProject = {
      userId,
      title,
      fileUrl,
      type,
      createdAt: Date.now()
    }

    const docRef = await db.collection("projects").add(newProject)
    res.json({ id: docRef.id, ...newProject })
  } catch (err) {
    next(err)
  }
}

// Delete a project
export const deleteProject = async (req, res, next) => {
  try {
    const { id } = req.params;
    await db.collection("projects").doc(id).delete()
    res.json({ message: "Proyecto eliminado" })
  } catch (err) {
    next(err)
  }
}
