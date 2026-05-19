import { Suspense, Component, useState, useRef, type ErrorInfo, type ReactNode } from "react"
import { useStreamRoom } from "../../../context/StreamRoomContext"
import { Canvas } from "@react-three/fiber"
import { OrbitControls, Stage, useGLTF, Html, useProgress } from "@react-three/drei"
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch"

// Error Boundary para evitar que toda la app colapse si un modelo 3D falla
class ModelErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean, errorMsg: string }> {
  constructor(props: { children: ReactNode }) {
    super(props)
    this.state = { hasError: false, errorMsg: "" }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, errorMsg: error.message }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Error cargando modelo 3D:", error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <Html center>
          <div className="bg-surface-panel p-6 rounded-xl border border-danger/50 text-center shadow-2xl max-w-sm">
            <div className="w-12 h-12 rounded-full bg-danger/20 flex items-center justify-center text-danger mx-auto mb-3">
              ✕
            </div>
            <h3 className="text-white font-bold mb-2">Error al cargar el modelo</h3>
            <p className="text-sm text-copy-muted mb-4">
              Asegúrate de subir archivos <strong className="text-brand">.glb</strong> autocontenidos.
            </p>
            <p className="text-xs text-danger/80 break-words mb-4">{this.state.errorMsg}</p>
          </div>
        </Html>
      )
    }
    return this.props.children
  }
}

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

function DrawingLayer({ canDraw, drawMode }: { canDraw: boolean, drawMode: boolean }) {
  const { strokes, addStroke, sendDrawStroke } = useStreamRoom()
  const [currentStroke, setCurrentStroke] = useState<{ x: number, y: number }[] | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!canDraw || !drawMode) return
    const svg = svgRef.current
    if (!svg) return
    
    // Capture pointer
    ;(e.target as Element).setPointerCapture(e.pointerId)
    
    const pt = svg.createSVGPoint()
    pt.x = e.clientX
    pt.y = e.clientY
    const svgP = pt.matrixTransform(svg.getScreenCTM()?.inverse())
    if (svgP) setCurrentStroke([{ x: svgP.x, y: svgP.y }])
  }

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!currentStroke || !canDraw || !drawMode) return
    const svg = svgRef.current
    if (!svg) return
    
    const pt = svg.createSVGPoint()
    pt.x = e.clientX
    pt.y = e.clientY
    const svgP = pt.matrixTransform(svg.getScreenCTM()?.inverse())
    
    if (svgP) {
      setCurrentStroke(prev => prev ? [...prev, { x: svgP.x, y: svgP.y }] : null)
    }
  }

  const handlePointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!currentStroke) return
    ;(e.target as Element).releasePointerCapture(e.pointerId)
    
    if (currentStroke.length > 1) {
      const newStroke = {
        id: Math.random().toString(36).substring(2, 9),
        points: currentStroke
      }
      addStroke(newStroke)
      sendDrawStroke(newStroke)
    }
    setCurrentStroke(null)
  }

  return (
    <svg
      ref={svgRef}
      className={`absolute inset-0 w-full h-full ${drawMode ? 'pointer-events-auto touch-none' : 'pointer-events-none'}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {strokes.map(stroke => (
        <polyline
          key={stroke.id}
          points={stroke.points.map(p => `${p.x},${p.y}`).join(' ')}
          fill="none"
          stroke="#EF4444"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
      {currentStroke && (
        <polyline
          points={currentStroke.map(p => `${p.x},${p.y}`).join(' ')}
          fill="none"
          stroke="#EF4444"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </svg>
  )
}

export default function ProjectViewerOverlay({ canDraw = false, isBroadcaster = false }: { canDraw?: boolean, isBroadcaster?: boolean }) {
  const { activeProject, setActiveProject, strokes, sendClearCanvas, clearStrokes } = useStreamRoom()
  const [drawMode, setDrawMode] = useState(false)

  if (!activeProject) return null

  return (
    <div className="absolute inset-0 z-50 bg-black/95 flex flex-col animate-in fade-in duration-200 overflow-hidden">
      {/* Navbar Superior del Visor */}
      <div className="flex items-center justify-between p-4 bg-surface-panel/80 border-b border-border backdrop-blur-sm z-10 shrink-0">
        <div className="flex items-center gap-4">
          <div>
            <h2 className="text-xl font-bold text-white">{activeProject.title}</h2>
            <p className="text-xs text-copy-muted uppercase">
              Visor Interactivo {activeProject.type === "3d" ? "3D" : "2D"}
            </p>
          </div>
          {activeProject.type === "2d" && canDraw && (
            <div className="flex gap-2 ml-4 border-l border-border pl-4">
              <button
                className={`px-3 py-1.5 rounded text-sm font-bold transition-colors ${!drawMode ? 'bg-brand text-white' : 'bg-surface text-copy hover:bg-surface-muted'}`}
                onClick={() => setDrawMode(false)}
              >
                ✋ Mover
              </button>
              <button
                className={`px-3 py-1.5 rounded text-sm font-bold transition-colors ${drawMode ? 'bg-brand text-white' : 'bg-surface text-copy hover:bg-surface-muted'}`}
                onClick={() => setDrawMode(true)}
              >
                ✏️ Dibujar
              </button>
              {isBroadcaster && strokes.length > 0 && (
                <button
                  className="px-3 py-1.5 rounded text-sm font-bold bg-danger/20 text-danger hover:bg-danger/30 transition-colors"
                  onClick={() => {
                    clearStrokes()
                    sendClearCanvas()
                  }}
                >
                  Limpiar
                </button>
              )}
            </div>
          )}
        </div>
        <button
          className="bg-danger text-white hover:bg-red-600 px-4 py-2 rounded-lg font-bold transition-colors shadow-lg"
          onClick={() => setActiveProject(null)}
        >
          Cerrar Visor ✕
        </button>
      </div>

      {/* Visor 3D o 2D */}
      <div className="flex-1 w-full min-h-0 relative flex flex-col items-center justify-center">
        {activeProject.type === "3d" ? (
          <div className="w-full h-full cursor-move">
            <Canvas shadows camera={{ position: [0, 0, 5], fov: 50 }}>
              <ModelErrorBoundary>
                <Suspense fallback={<Loader />}>
                  <Stage environment="city" intensity={0.6}>
                    <Model url={activeProject.fileUrl} />
                  </Stage>
                </Suspense>
              </ModelErrorBoundary>
              <OrbitControls makeDefault autoRotate autoRotateSpeed={0.5} />
            </Canvas>
          </div>
        ) : (
          <TransformWrapper
            initialScale={1}
            minScale={0.5}
            maxScale={8}
            centerOnInit
            wheel={{ step: 0.1 }}
            limitToBounds={false}
            panning={{ disabled: drawMode }}
            pinch={{ disabled: drawMode }}
            doubleClick={{ disabled: drawMode }}
          >
            <TransformComponent wrapperClass={`w-full h-full flex items-center justify-center ${drawMode ? 'cursor-crosshair' : 'cursor-grab active:cursor-grabbing'}`}>
              <div className="relative inline-block">
                <img
                  src={activeProject.fileUrl}
                  alt={activeProject.title}
                  className="max-w-[90vw] max-h-[80vh] object-contain drop-shadow-2xl rounded-lg pointer-events-none"
                  draggable={false}
                />
                <DrawingLayer canDraw={canDraw} drawMode={drawMode} />
              </div>
            </TransformComponent>
          </TransformWrapper>
        )}
      </div>
    </div>
  )
}
