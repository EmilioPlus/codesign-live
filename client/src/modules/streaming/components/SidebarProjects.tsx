import { useState, useEffect, useRef } from "react"
import { Link, useParams } from "react-router-dom"
import { useAuth } from "../../../context/AuthContext"
import { useStreamRoom, type ProjectFile } from "../../../context/StreamRoomContext"
import { uploadFileApi, createProjectApi, getUserProjectsApi, getStreamsApi, deleteProjectApi } from "../../../services/api"

export default function SidebarProjects() {
  const { user } = useAuth()
  const { streamId } = useParams() 
  const { setActiveProject, activeProject } = useStreamRoom()
  
  const [projects, setProjects] = useState<ProjectFile[]>([])
  const [broadcasterId, setBroadcasterId] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 1. Determine broadcasterId to fetch the correct project history
  useEffect(() => {
    if (streamId) {
      getStreamsApi().then(res => {
        const stream = res.streams.find(s => s.id === streamId)
        if (stream) setBroadcasterId(stream.userId || stream.user)
      }).catch(console.error)
    } else if (user) {
      setBroadcasterId(user.id)
    }
  }, [streamId, user])

  // 2. Fetch projects when broadcasterId is known
  useEffect(() => {
    if (!broadcasterId) return
    getUserProjectsApi(broadcasterId)
      .then(setProjects)
      .catch(console.error)
  }, [broadcasterId])

  // 3. Upload File
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return
    
    // Validate File Extension for 3D or 2D
    const is3D = file.name.toLowerCase().endsWith('.glb') || file.name.toLowerCase().endsWith('.gltf')
    const is2D = file.type.startsWith('image/')
    if (!is3D && !is2D) {
      alert("Solo se soportan imágenes (Plano 2D) o modelos 3D (.glb, .gltf)")
      if (fileInputRef.current) fileInputRef.current.value = ""
      return
    }

    setUploading(true)
    try {
      const { fileUrl } = await uploadFileApi(file)
      const title = prompt("Asigna un nombre al proyecto:") || file.name
      const newProject = await createProjectApi({
        userId: user.id,
        title,
        fileUrl,
        type: is3D ? "3d" : "2d"
      })
      
      setProjects(prev => [newProject, ...prev])
      setActiveProject(newProject)
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error al subir proyecto")
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  const handleDelete = async (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation()
    if (!window.confirm("¿Seguro que deseas eliminar este proyecto de tu historial permanentemente?")) return
    try {
      await deleteProjectApi(projectId)
      setProjects(prev => prev.filter(p => p.id !== projectId))
      if (activeProject?.id === projectId) setActiveProject(null)
    } catch(err) {
      alert("No se pudo eliminar el proyecto")
    }
  }

  const isBroadcaster = user?.id === broadcasterId

  return (
    <div className="flex flex-col h-full bg-surface-panel overflow-hidden border-r border-border">
      <div className="p-4 border-b border-border flex justify-between items-center">
        <Link to="/" className="text-lg font-semibold text-brand block truncate">
          CoDesign LIVE
        </Link>
      </div>

      <div className="p-4 border-b border-border bg-surface-panel z-10">
        <h3 className="text-xs uppercase font-bold text-copy-muted tracking-wide mb-3">
          {isBroadcaster ? "Mis Proyectos" : "Proyectos del Streamer"}
        </h3>
        
        {isBroadcaster && (
          <div>
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*,.glb,.gltf" 
              onChange={handleUpload}
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="w-full py-2.5 rounded-lg bg-surface-muted border border-border text-sm text-copy hover:bg-surface font-medium disabled:opacity-50 transition shadow-sm"
            >
              {uploading ? "Subiendo archivo..." : "➕ Subir Plano o Render"}
            </button>
            <p className="text-[10px] text-copy-muted mt-2 text-center">Formatos soportados: JPG, PNG, GLB, GLTF</p>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-2">
        {projects.length === 0 && !uploading && (
          <p className="text-sm text-copy-muted text-center py-6 px-2 border border-dashed border-border rounded-lg bg-surface-muted/50">
            Aún no hay proyectos subidos en este historial.
          </p>
        )}
        
        {projects.map(proj => (
          <div 
            key={proj.id}
            onClick={() => setActiveProject(proj)}
            className={`p-3 rounded-xl cursor-pointer transition flex items-center gap-3 border shadow-sm ${
              activeProject?.id === proj.id 
                ? 'bg-brand/10 border-brand text-brand shadow-brand/20' 
                : 'bg-surface border-border hover:border-copy-muted text-copy'
            }`}
          >
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-[10px] font-bold tracking-wider ${proj.type === '3d' ? 'bg-indigo-500/20 text-indigo-400' : 'bg-green-500/20 text-green-400'}`}>
              {proj.type.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate leading-tight mb-0.5">{proj.title}</p>
              <p className="text-[10px] text-copy-muted capitalize">Explora interactivo</p>
            </div>
            
            {isBroadcaster && (
              <button
                onClick={(e) => handleDelete(e, proj.id)}
                className="p-1.5 text-copy-muted hover:text-danger hover:bg-danger/10 rounded-md transition"
                title="Eliminar proyecto"
              >
                ✕
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
