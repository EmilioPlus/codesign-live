import { useState, useEffect, useCallback } from "react"
import type { StreamerGoal, StreamerProfile } from "../../../services/api"
import {
  getStreamerProfileApi,
  updateStreamerProfileApi,
  toggleFollowApi,
  getFollowStatusApi,
  subscribeToStreamerApi,
  getSubscribeStatusApi,
  giftSubscriptionApi,
  searchUsersForGiftApi,
} from "../../../services/api"

interface StreamerProfilePanelProps {
  streamerId: string
  streamerName: string
  streamerAvatarUrl?: string | null
  isBroadcaster?: boolean         // Si el viewer actual ES el transmisor
  viewerCount: number
  isMuted?: boolean
  onToggleMute?: () => void
  streamTitle?: string            // Título del stream (efímero, via WS)
  streamCategories?: string[]     // Categorías del stream (efímero, via WS)
}

// ── Spinner simple ──────────────────────────────────────────────────────────
function Spinner() {
  return (
    <svg className="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
    </svg>
  )
}

// ── Barra de progreso ────────────────────────────────────────────────────────
function GoalBar({ goal }: { goal: StreamerGoal }) {
  const pct = Math.min(100, Math.round((goal.current / Math.max(1, goal.target)) * 100))
  const Icon = goal.icon === "heart"
    ? () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
    : () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="white" stroke="currentColor" strokeWidth="1"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>

  const remaining = goal.target - goal.current
  return (
    <div className="bg-surface-panel border border-border rounded-xl p-3 px-4 flex flex-col gap-1">
      <div className="flex items-center gap-3">
        <div className="p-1.5 bg-surface rounded-lg shrink-0"><Icon /></div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-copy truncate">
            {remaining > 0 ? `¡Quedan ${remaining.toLocaleString()} ${goal.title}!` : `¡Meta alcanzada: ${goal.title}!`}
          </h3>
          <p className="text-xs text-copy-muted font-medium">{goal.current.toLocaleString()}/{goal.target.toLocaleString()} {goal.title}</p>
        </div>
      </div>
      <div className="w-full bg-surface-muted rounded-full h-1.5 mt-1">
        <div className="bg-yellow-400 h-1.5 rounded-full shadow-[0_0_8px_rgba(250,204,21,0.8)] transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

export default function StreamerProfilePanel({
  streamerId,
  streamerName,
  streamerAvatarUrl,
  isBroadcaster = false,
  viewerCount,
  isMuted,
  onToggleMute,
  streamTitle,
  streamCategories,
}: StreamerProfilePanelProps) {

  // ── Profile Data ─────────────────────────────────────────────────────────
  const [profile, setProfile] = useState<StreamerProfile | null>(null)
  const [loading, setLoading] = useState(true)

  // ── Follow ────────────────────────────────────────────────────────────────
  const [following, setFollowing] = useState(false)
  const [followLoading, setFollowLoading] = useState(false)

  // ── Subscribe ─────────────────────────────────────────────────────────────
  const [subscribed, setSubscribed] = useState(false)
  const [showSubModal, setShowSubModal] = useState(false)
  const [subLoading, setSubLoading] = useState(false)

  // ── Gift Sub ──────────────────────────────────────────────────────────────
  const [showGiftModal, setShowGiftModal] = useState(false)
  const [giftQuery, setGiftQuery] = useState("")
  const [giftSuggestions, setGiftSuggestions] = useState<{ id: string; name: string; avatarUrl: string | null }[]>([])
  const [giftLoading, setGiftLoading] = useState(false)
  const [giftResult, setGiftResult] = useState<{ success?: string; error?: string } | null>(null)

  // ── Uptime ────────────────────────────────────────────────────────────────
  const [uptime, setUptime] = useState("0:00:00")

  // ── Edit Modals (transmisor only) ─────────────────────────────────────────
  const [showEditBio, setShowEditBio] = useState(false)
  const [editBio, setEditBio] = useState("")
  const [showEditGoals, setShowEditGoals] = useState(false)
  const [editGoals, setEditGoals] = useState<StreamerGoal[]>([])
  const [saveLoading, setSaveLoading] = useState(false)

  // ── Load profile ──────────────────────────────────────────────────────────
  const loadProfile = useCallback(async () => {
    if (!streamerId) return
    setLoading(true)
    try {
      const p = await getStreamerProfileApi(streamerId)
      setProfile(p)
      setEditBio(p.bio || "")
      setEditGoals(p.goals?.length ? p.goals : [])
    } catch {
      // silence: mostramos con datos del WS
    } finally {
      setLoading(false)
    }
  }, [streamerId])

  useEffect(() => { loadProfile() }, [loadProfile])

  // ── Load follow/sub status (solo si no es el transmisor) ─────────────────
  useEffect(() => {
    if (isBroadcaster || !streamerId) return
    getFollowStatusApi(streamerId).then(r => setFollowing(r.following)).catch(() => {})
    getSubscribeStatusApi(streamerId).then(r => setSubscribed(r.subscribed)).catch(() => {})
  }, [streamerId, isBroadcaster])

  // ── Uptime ticker ─────────────────────────────────────────────────────────
  useEffect(() => {
    const start = Date.now()
    const iv = setInterval(() => {
      const diff = Math.floor((Date.now() - start) / 1000)
      const h = Math.floor(diff / 3600)
      const m = Math.floor((diff % 3600) / 60)
      const s = diff % 60
      setUptime(`${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`)
    }, 1000)
    return () => clearInterval(iv)
  }, [])

  // ── Gift search autocomplete ──────────────────────────────────────────────
  useEffect(() => {
    if (giftQuery.length < 2) { setGiftSuggestions([]); return }
    const t = setTimeout(() => {
      searchUsersForGiftApi(streamerId, giftQuery).then(r => setGiftSuggestions(r.users)).catch(() => {})
    }, 300)
    return () => clearTimeout(t)
  }, [giftQuery, streamerId])

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleFollow = async () => {
    setFollowLoading(true)
    try {
      const r = await toggleFollowApi(streamerId)
      setFollowing(r.following)
      setProfile(prev => prev ? { ...prev, followerCount: r.followerCount } : prev)
    } catch { /* no-op */ }
    finally { setFollowLoading(false) }
  }

  const handleSubscribe = async () => {
    if (subscribed) return
    setSubLoading(true)
    try {
      await subscribeToStreamerApi(streamerId)
      setSubscribed(true)
      setProfile(prev => prev ? { ...prev, subscriberCount: (prev.subscriberCount ?? 0) + 1 } : prev)
      setShowSubModal(false)
    } catch { /* no-op */ }
    finally { setSubLoading(false) }
  }

  const handleGiftSend = async (recipientName: string) => {
    setGiftLoading(true)
    setGiftResult(null)
    try {
      const r = await giftSubscriptionApi(streamerId, recipientName)
      setGiftResult({ success: `¡Suscripción regalada a ${r.recipient.name} exitosamente! 🎁` })
      setProfile(prev => prev ? { ...prev, subscriberCount: r.subscriberCount } : prev)
      setGiftQuery("")
      setGiftSuggestions([])
    } catch (e: any) {
      setGiftResult({ error: e.message || "Error al regalar la suscripción" })
    } finally {
      setGiftLoading(false)
    }
  }

  const handleSaveBio = async () => {
    setSaveLoading(true)
    try {
      await updateStreamerProfileApi({ bio: editBio })
      setProfile(prev => prev ? { ...prev, bio: editBio } : prev)
      setShowEditBio(false)
    } catch { /* no-op */ } finally { setSaveLoading(false) }
  }

  const handleSaveGoals = async () => {
    setSaveLoading(true)
    try {
      await updateStreamerProfileApi({ goals: editGoals })
      setProfile(prev => prev ? { ...prev, goals: editGoals } : prev)
      setShowEditGoals(false)
    } catch { /* no-op */ } finally { setSaveLoading(false) }
  }

  const addGoal = () => setEditGoals(g => [...g, { title: "seguidores", current: 0, target: 100, icon: "star" }])
  const removeGoal = (i: number) => setEditGoals(g => g.filter((_, idx) => idx !== i))
  const updateGoal = (i: number, field: keyof StreamerGoal, v: string | number) =>
    setEditGoals(g => g.map((goal, idx) => idx === i ? { ...goal, [field]: v } : goal))

  const displayName = profile?.name || streamerName
  const displayAvatar = profile?.avatarUrl || streamerAvatarUrl
  const categories = streamCategories?.length ? streamCategories : ["CoDesign", "Streaming", "Español"]

  return (
    <div className="w-full bg-surface flex flex-col gap-6 py-6 px-1">

      {/* ── TOP BAR (Estilo Twitch) ─────────────────────────────────────────── */}
      <div className="flex flex-col gap-3">
        <div className="flex justify-between items-start gap-4 flex-wrap">
          {/* Avatar + Info */}
          <div className="flex gap-4 items-start">
            <div className="relative shrink-0">
              <div className="w-16 h-16 rounded-full border-[3px] border-brand overflow-hidden">
                {displayAvatar
                  ? <img src={displayAvatar} alt={displayName} className="w-full h-full object-cover" />
                  : <img src={`https://api.dicebear.com/7.x/initials/svg?seed=${displayName}&backgroundColor=3b82f6`} alt={displayName} className="w-full h-full object-cover" />
                }
              </div>
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-red-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded tracking-widest uppercase whitespace-nowrap">
                En Directo
              </div>
            </div>

            <div className="flex flex-col gap-0.5 mt-0.5">
              <h1 className="text-xl font-bold text-copy flex items-center gap-1.5">
                {displayName}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-brand shrink-0">
                  <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm-1.9 14.7L6 12.6l1.5-1.5 2.6 2.6 6.4-7.6 1.6 1.4-8 9.2z" />
                </svg>
              </h1>
              {streamTitle && (
                <p className="text-sm font-semibold text-copy-muted line-clamp-1 max-w-xl">{streamTitle}</p>
              )}
              <div className="flex flex-wrap gap-1.5 mt-1">
                {categories.map(c => (
                  <span key={c} className="px-2.5 py-0.5 rounded-full bg-surface-muted border border-border text-xs font-semibold text-copy-muted hover:border-brand hover:text-brand transition-colors cursor-pointer">
                    {c}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Stats + Actions */}
          <div className="flex flex-col items-end gap-2 shrink-0">
            {/* Stats row */}
            <div className="flex items-center gap-3 text-sm font-semibold text-copy">
              <div className="flex items-center gap-1.5 text-red-500">
                <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
                </svg>
                <span>{viewerCount > 0 ? viewerCount.toLocaleString() : "0"}</span>
              </div>
              <span className="text-copy-muted">{uptime}</span>
              {/* Botón de Mute si aplica */}
              {onToggleMute && (
                <button onClick={onToggleMute} className="text-xs font-bold px-2 py-1 rounded border border-brand/30 bg-brand/10 text-brand hover:bg-brand/20 transition-colors">
                  {isMuted ? "🔇 Sonido" : "🔊 Silenciar"}
                </button>
              )}
              {/* Edit icon solo para el transmisor */}
              {isBroadcaster && (
                <button onClick={() => setShowEditBio(true)} title="Editar descripción" className="text-copy-muted hover:text-brand transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                </button>
              )}
              <button className="text-copy-muted hover:text-brand transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1" /><circle cx="12" cy="5" r="1" /><circle cx="12" cy="19" r="1" /></svg>
              </button>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              {/* Seguir */}
              <button
                onClick={!isBroadcaster ? handleFollow : undefined}
                disabled={followLoading}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
                  following
                    ? "bg-surface-muted text-copy border border-border hover:border-red-500 hover:text-red-500"
                    : "bg-brand text-white hover:bg-brand-hover shadow-lg shadow-brand/20"
                } ${isBroadcaster ? "opacity-60 cursor-not-allowed" : ""}`}
              >
                {followLoading ? <Spinner /> : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill={following ? "none" : "currentColor"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                    </svg>
                    {following ? "Siguiendo" : "Seguir"}
                  </>
                )}
              </button>

              {/* Regalar una sub */}
              <button
                onClick={() => { if (!isBroadcaster) { setShowGiftModal(true); setGiftResult(null) } }}
                className={`flex items-center gap-1.5 px-3 py-1.5 bg-surface-muted text-copy text-xs font-bold rounded-md border border-border hover:bg-brand hover:text-white hover:border-brand transition-all ${isBroadcaster ? "opacity-60 cursor-not-allowed" : ""}`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 12 20 22 4 22 4 12" /><rect x="2" y="7" width="20" height="5" /><line x1="12" y1="22" x2="12" y2="7" /><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" /><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
                </svg>
                Regalar una sub
                <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9" /></svg>
              </button>

              {/* Suscribirse */}
              <button
                onClick={() => { if (!isBroadcaster && !subscribed) setShowSubModal(true) }}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-md border transition-all ${
                  subscribed
                    ? "bg-surface-muted text-copy border-border hover:border-brand hover:text-brand"
                    : "bg-surface-muted text-copy border-border hover:bg-brand hover:text-white hover:border-brand"
                } ${isBroadcaster ? "opacity-60 cursor-not-allowed" : ""}`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill={subscribed ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
                {subscribed ? "Suscrito ✓" : "Suscribirse"}
                <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9" /></svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── ACERCA DE + METAS ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Acerca de */}
        <div className="bg-surface-panel border border-border rounded-xl p-5 flex flex-col gap-3">
          <h2 className="text-sm font-bold text-copy flex items-center justify-between gap-1">
            <span className="flex items-center gap-1">
              Acerca de {displayName}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="text-brand">
                <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm-1.9 14.7L6 12.6l1.5-1.5 2.6 2.6 6.4-7.6 1.6 1.4-8 9.2z" />
              </svg>
            </span>
            {isBroadcaster && (
              <button onClick={() => setShowEditBio(true)} className="text-xs text-brand hover:underline flex items-center gap-1">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                Editar
              </button>
            )}
          </h2>
          {loading ? (
            <div className="flex items-center gap-2 text-copy-muted text-sm"><Spinner /> Cargando...</div>
          ) : (
            <>
              <div className="flex items-baseline gap-2">
                <span className="text-lg font-bold text-copy">{(profile?.followerCount ?? 0).toLocaleString()}</span>
                <span className="text-xs text-copy-muted font-semibold">seguidores</span>
                <span className="text-copy-muted">·</span>
                <span className="text-lg font-bold text-copy">{(profile?.subscriberCount ?? 0).toLocaleString()}</span>
                <span className="text-xs text-copy-muted font-semibold">suscriptores</span>
              </div>
              <p className="text-sm text-copy-muted leading-relaxed">
                {profile?.bio || (isBroadcaster ? "Haz clic en 'Editar' para añadir tu descripción." : "Este streamer aún no ha añadido una descripción.")}
              </p>
            </>
          )}
        </div>

        {/* Metas */}
        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-bold text-copy flex items-center justify-between">
            <span>Metas de {displayName}</span>
            {isBroadcaster && (
              <button onClick={() => { setEditGoals(profile?.goals || []); setShowEditGoals(true) }} className="text-xs text-brand hover:underline flex items-center gap-1">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                Editar metas
              </button>
            )}
          </h2>
          {loading ? (
            <div className="flex items-center gap-2 text-copy-muted text-sm"><Spinner /> Cargando...</div>
          ) : profile?.goals?.length ? (
            profile.goals.map((g, i) => <GoalBar key={i} goal={g} />)
          ) : (
            <div className="bg-surface-panel border border-border rounded-xl p-4 text-sm text-copy-muted">
              {isBroadcaster ? "Haz clic en 'Editar metas' para añadir tus objetivos." : "Este streamer aún no ha definido metas."}
            </div>
          )}
        </div>
      </div>

      {/* ── MODAL SUSCRIBIRSE ─────────────────────────────────────────────────── */}
      {showSubModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={() => setShowSubModal(false)}>
          <div className="bg-surface-panel border border-border rounded-2xl p-6 max-w-sm w-full shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-copy mb-1">Suscríbete a {displayName}</h3>
            <p className="text-sm text-copy-muted mb-5">Al suscribirte obtienes acceso a contenido exclusivo, emotes especiales, badges en el chat y más.</p>
            <div className="bg-surface-muted rounded-xl p-4 mb-5 grid grid-cols-2 gap-2 text-sm">
              {[["🎭", "Emotes exclusivos del canal"], ["🏅", "Badge de suscriptor en el chat"], ["⭐", "1.5x puntos de canal"], ["📺", "Streams exclusivos para subs"]].map(([icon, label]) => (
                <div key={label} className="flex items-center gap-2 text-copy-muted"><span>{icon}</span><span>{label}</span></div>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowSubModal(false)} className="flex-1 px-4 py-2 rounded-lg bg-surface-muted text-copy text-sm font-medium border border-border hover:bg-surface transition-colors">Cancelar</button>
              <button onClick={handleSubscribe} disabled={subLoading} className="flex-1 px-4 py-2 rounded-lg bg-brand text-white text-sm font-bold hover:bg-brand-hover transition-colors flex items-center justify-center gap-2">
                {subLoading ? <Spinner /> : "✨ Suscribirme gratis"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL REGALAR SUB ─────────────────────────────────────────────────── */}
      {showGiftModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={() => { setShowGiftModal(false); setGiftResult(null) }}>
          <div className="bg-surface-panel border border-border rounded-2xl p-6 max-w-sm w-full shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-copy mb-1">🎁 Regalar una suscripción</h3>
            <p className="text-sm text-copy-muted mb-5">Regala una suscripción al canal de <strong>{displayName}</strong> a un amigo.</p>

            {giftResult ? (
              <div className={`rounded-xl p-4 text-sm font-medium mb-4 ${giftResult.success ? "bg-green-500/10 border border-green-500/30 text-green-400" : "bg-red-500/10 border border-red-500/30 text-red-400"}`}>
                {giftResult.success || giftResult.error}
              </div>
            ) : (
              <div className="relative mb-4">
                <input
                  type="text"
                  placeholder="Nombre del usuario..."
                  value={giftQuery}
                  onChange={e => setGiftQuery(e.target.value)}
                  className="w-full px-4 py-2.5 bg-surface border border-border rounded-xl text-sm text-copy placeholder-copy-muted focus:outline-none focus:border-brand"
                  autoFocus
                />
                {giftSuggestions.length > 0 && (
                  <ul className="absolute top-full left-0 right-0 mt-1 bg-surface-panel border border-border rounded-xl overflow-hidden shadow-lg z-10">
                    {giftSuggestions.map(u => (
                      <li key={u.id}>
                        <button onClick={() => handleGiftSend(u.name)} disabled={giftLoading} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-surface text-left transition-colors">
                          {u.avatarUrl
                            ? <img src={u.avatarUrl} className="w-8 h-8 rounded-full object-cover" alt={u.name} />
                            : <img src={`https://api.dicebear.com/7.x/initials/svg?seed=${u.name}&backgroundColor=3b82f6`} className="w-8 h-8 rounded-full" alt={u.name} />
                          }
                          <span className="text-sm font-medium text-copy">{u.name}</span>
                          {giftLoading && <span className="ml-auto"><Spinner /></span>}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={() => { setShowGiftModal(false); setGiftResult(null); setGiftQuery("") }} className="flex-1 px-4 py-2 rounded-lg bg-surface-muted text-copy text-sm font-medium border border-border hover:bg-surface transition-colors">
                {giftResult?.success ? "Cerrar" : "Cancelar"}
              </button>
              {!giftResult && (
                <button onClick={() => giftQuery.trim() && handleGiftSend(giftQuery.trim())} disabled={giftLoading || !giftQuery.trim()} className="flex-1 px-4 py-2 rounded-lg bg-brand text-white text-sm font-bold hover:bg-brand-hover disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
                  {giftLoading ? <Spinner /> : "Regalar 🎁"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL EDITAR BIO ─────────────────────────────────────────────────── */}
      {showEditBio && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={() => setShowEditBio(false)}>
          <div className="bg-surface-panel border border-border rounded-2xl p-6 max-w-md w-full shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-copy mb-4">Editar descripción</h3>
            <textarea
              value={editBio}
              onChange={e => setEditBio(e.target.value)}
              maxLength={500}
              rows={5}
              placeholder="Cuéntale a tu audiencia quién eres..."
              className="w-full px-4 py-3 bg-surface border border-border rounded-xl text-sm text-copy placeholder-copy-muted focus:outline-none focus:border-brand resize-none"
            />
            <p className="text-xs text-copy-muted mt-1">{editBio.length}/500</p>
            <div className="flex gap-3 mt-4">
              <button onClick={() => setShowEditBio(false)} className="flex-1 px-4 py-2 rounded-lg bg-surface-muted text-copy text-sm font-medium border border-border hover:bg-surface transition-colors">Cancelar</button>
              <button onClick={handleSaveBio} disabled={saveLoading} className="flex-1 px-4 py-2 rounded-lg bg-brand text-white text-sm font-bold hover:bg-brand-hover transition-colors flex items-center justify-center gap-2">
                {saveLoading ? <Spinner /> : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL EDITAR METAS ───────────────────────────────────────────────── */}
      {showEditGoals && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={() => setShowEditGoals(false)}>
          <div className="bg-surface-panel border border-border rounded-2xl p-6 max-w-lg w-full shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-copy mb-4">Editar metas</h3>

            {editGoals.map((g, i) => (
              <div key={i} className="bg-surface-muted border border-border rounded-xl p-4 mb-3 flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-copy-muted uppercase tracking-wider">Meta {i + 1}</span>
                  <button onClick={() => removeGoal(i)} className="text-red-400 hover:text-red-300 text-xs font-medium">Eliminar</button>
                </div>
                <input
                  value={g.title}
                  onChange={e => updateGoal(i, "title", e.target.value)}
                  placeholder="Ej: seguidores, proyectos, subs..."
                  className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-copy focus:outline-none focus:border-brand"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input type="number" value={g.current} onChange={e => updateGoal(i, "current", Number(e.target.value))} placeholder="Actual" className="px-3 py-2 bg-surface border border-border rounded-lg text-sm text-copy focus:outline-none focus:border-brand" />
                  <input type="number" value={g.target} onChange={e => updateGoal(i, "target", Number(e.target.value))} placeholder="Meta" className="px-3 py-2 bg-surface border border-border rounded-lg text-sm text-copy focus:outline-none focus:border-brand" />
                </div>
                <select value={g.icon || "star"} onChange={e => updateGoal(i, "icon", e.target.value)} className="px-3 py-2 bg-surface border border-border rounded-lg text-sm text-copy focus:outline-none focus:border-brand">
                  <option value="star">⭐ Estrella</option>
                  <option value="heart">❤️ Corazón</option>
                </select>
              </div>
            ))}

            {editGoals.length < 5 && (
              <button onClick={addGoal} className="w-full py-2 rounded-xl border border-dashed border-border text-copy-muted text-sm hover:border-brand hover:text-brand transition-colors mb-4">
                + Agregar meta
              </button>
            )}

            <div className="flex gap-3">
              <button onClick={() => setShowEditGoals(false)} className="flex-1 px-4 py-2 rounded-lg bg-surface-muted text-copy text-sm font-medium border border-border hover:bg-surface transition-colors">Cancelar</button>
              <button onClick={handleSaveGoals} disabled={saveLoading} className="flex-1 px-4 py-2 rounded-lg bg-brand text-white text-sm font-bold hover:bg-brand-hover transition-colors flex items-center justify-center gap-2">
                {saveLoading ? <Spinner /> : "Guardar metas"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
