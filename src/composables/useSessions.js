import { ref } from 'vue'
import { authFetch } from './useAuth.js'

// Module-level state: persists across navigation between views
const sessions = ref([])
const loading = ref(true)
const loadError = ref('')
let loaded = false

export function useSessions() {
  async function loadSessions(force = false) {
    if (loaded && !force) return

    loading.value = true
    loadError.value = ''
    try {
      const params = new URLSearchParams({ tzOffsetMinutes: new Date().getTimezoneOffset() })
      const res = await authFetch(`/api/sessions?${params}`)
      if (!res.ok) throw new Error('Failed to load sessions')
      const data = await res.json()
      sessions.value = (Array.isArray(data) ? data : data.sessions ?? [])
        .slice()
        .sort((a, b) => (a.date < b.date ? -1 : 1))
      loaded = true
    } catch {
      loadError.value = 'Could not load your history. Please try again.'
    } finally {
      loading.value = false
    }
  }

  function updateSessionInCache(updatedSession) {
    const idx = sessions.value.findIndex(s => s.session_id === updatedSession.session_id)
    if (idx !== -1) {
      sessions.value = [
        ...sessions.value.slice(0, idx),
        { ...sessions.value[idx], ...updatedSession },
        ...sessions.value.slice(idx + 1),
      ]
    } else {
      sessions.value = [...sessions.value, updatedSession].sort((a, b) =>
        a.date < b.date ? -1 : 1,
      )
    }
  }

  return { sessions, loading, loadError, loadSessions, updateSessionInCache }
}
