import { Suspense } from "react"
import { useStreamRoom } from "../../../context/StreamRoomContext"
import { Canvas } from "@react-three/fiber"
import { OrbitControls, Stage, useGLTF, Html, useProgress } from "@react-three/drei"
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch"

// Componente para cargar el modelo GLTF y mostrar un loader
function Model({ url }: { url: string }) {
  const { scene } = useGLTF(url)
  return <primitive object={scene} />
}

function Loader() {
  const { progress } = useProgress()
  return (
    <Html center>
      <div className="text-white text-lg font-bold bg-black/50 px-4 py-2 rounded-lg">
        {progress.toFixed(0)}%
      </div>
    </Html>
  )
}

export default function ProjectViewerOverlay() {
  const { activeProject, setActiveProject } = useStreamRoom()

  if (!activeProject) return null

  return (
    <div className="absolute inset-0 z-50 bg-black/95 flex flex-col animate-in fade-in duration-200 overflow-hidden">
      {/* Navbar Superior del Visor */}
      <div className="flex items-center justify-between p-4 bg-surface-panel/80 border-b border-border backdrop-blur-sm z-10 shrink-0">
        <div>
          <h2 className="text-xl font-bold text-white">{activeProject.title}</h2>
          <p className="text-xs text-copy-muted uppercase">
            Visor Interactivo {activeProject.type === "3d" ? "3D (Rotación libre)" : "2D (Zoom & Pan)"}
          </p>
        </div>
        <button
          className="bg-danger text-white hover:bg-red-600 px-4 py-2 rounded-lg font-bold transition-colors shadow-lg"
          onClick={() => setActiveProject(null)}
        >
          Cerrar Visor ✕
        </button>
      </div>

      {/* Visor 3D o 2D */}
      <div className="flex-1 w-full min-h-0 cursor-move relative flex flex-col items-center justify-center">
        {activeProject.type === "3d" ? (
          <Canvas shadows camera={{ position: [0, 0, 5], fov: 50 }}>
            <Suspense fallback={<Loader />}>
              <Stage environment="city" intensity={0.6}>
                <Model url={activeProject.fileUrl} />
              </Stage>
            </Suspense>
            <OrbitControls makeDefault autoRotate autoRotateSpeed={0.5} />
          </Canvas>
        ) : (
          <TransformWrapper
            initialScale={1}
            minScale={0.5}
            maxScale={8}
            centerOnInit
            wheel={{ step: 0.1 }}
            limitToBounds={false}
          >
            <TransformComponent wrapperClass="w-full h-full flex items-center justify-center">
              <img
                src={activeProject.fileUrl}
                alt={activeProject.title}
                className="max-w-[90vw] max-h-[80vh] object-contain drop-shadow-2xl rounded-lg"
                draggable={false}
              />
            </TransformComponent>
          </TransformWrapper>
        )}
      </div>

      {/* Controles Info Inferior */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-surface-panel/80 px-4 py-2 rounded-full border border-border backdrop-blur-sm shadow-xl text-center pointer-events-none">
        <span className="text-sm text-copy font-medium">
          {activeProject.type === "3d"
            ? "🖱 Haz clic y arrastra para rotar • Rueda para Zoom"
            : "🖱 Arrastra para mover • Rueda para Zoom"}
        </span>
      </div>
    </div>
  )
}
