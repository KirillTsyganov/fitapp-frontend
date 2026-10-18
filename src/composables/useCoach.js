import { ref } from 'vue'
import { authFetch } from './useAuth.js'

/** @typedef {import('@/types/coach').FlowRecord} FlowRecord */
/** @typedef {import('@/types/coach').ChatMessage} ChatMessage */
/** @typedef {import('@/types/coach').CreateFlowPayload} CreateFlowPayload */

// Module-level state: chat and flows persist across navigation.
/** @type {import('vue').Ref<ChatMessage[]>} */
const chatMessages = ref([])
/** @type {import('vue').Ref<FlowRecord[]>} */
const savedFlows = ref([])
/** @type {import('vue').Ref<FlowRecord | null>} */
const activeFlow = ref(null)
const isLoading = ref(false)
const isGeneratingFlow = ref(false)
const flowsLoading = ref(false)
const errorMessage = ref(null)
let flowsLoaded = false
let nextMessageId = 1

async function errorFrom(res, fallback) {
  const body = await res.json().catch(() => null)
  if (typeof body?.error === 'string') return body.error
  if (Array.isArray(body?.errors) && body.errors.length) {
    return body.errors.map((e) => e.msg).join('; ')
  }
  return fallback
}

async function postJson(path, payload) {
  return authFetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

export function useCoach() {
  async function sendMessage(
    userMessage,
    { durationMinutes = null, structurePreference = null, contextOverrides = null } = {},
  ) {
    isLoading.value = true
    errorMessage.value = null
    chatMessages.value.push({ id: nextMessageId++, role: 'user', content: userMessage })

    try {
      const payload = { message: userMessage }
      if (durationMinutes) payload.target_duration_minutes = durationMinutes
      if (structurePreference) payload.structure_preference = structurePreference
      if (contextOverrides) payload.context_overrides = contextOverrides

      const res = await postJson('/api/coach/chat', payload)
      if (!res.ok) throw new Error(await errorFrom(res, 'Coach communication failed.'))
      const data = await res.json()

      chatMessages.value.push({
        id: nextMessageId++,
        role: 'coach',
        content: data.message,
        diagnostic_needed: data.diagnostic_needed,
        diagnostic_question: data.diagnostic_question,
        suggested_flow:
          !data.diagnostic_needed && data.target_focus
            ? {
                focus: data.target_focus,
                estimated_minutes: data.estimated_total_minutes || durationMinutes || 20,
              }
            : null,
      })
      return data
    } catch (err) {
      errorMessage.value = err.message || 'Coach communication failed.'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  /** @param {CreateFlowPayload} payload */
  async function generateAndSaveFlow(payload) {
    isGeneratingFlow.value = true
    errorMessage.value = null

    try {
      const res = await postJson('/api/coach/flow', payload)
      if (!res.ok) throw new Error(await errorFrom(res, 'Failed to generate flow.'))
      /** @type {FlowRecord} */
      const flow = await res.json()
      savedFlows.value = [flow, ...savedFlows.value.filter((f) => f.id !== flow.id)]
      activeFlow.value = flow
      return flow
    } catch (err) {
      errorMessage.value = err.message || 'Failed to generate flow.'
      throw err
    } finally {
      isGeneratingFlow.value = false
    }
  }

  async function fetchSavedFlows(force = false) {
    if (flowsLoaded && !force) return savedFlows.value
    flowsLoading.value = true
    errorMessage.value = null
    try {
      const res = await authFetch('/api/coach/flows')
      if (!res.ok) throw new Error(await errorFrom(res, 'Could not fetch saved flows.'))
      savedFlows.value = await res.json()
      flowsLoaded = true
      return savedFlows.value
    } catch (err) {
      errorMessage.value = err.message || 'Could not fetch saved flows.'
      throw err
    } finally {
      flowsLoading.value = false
    }
  }

  // No single-flow endpoint exists, so a cache miss reloads the list.
  async function getFlowById(id) {
    const numericId = Number(id)
    let found = savedFlows.value.find((f) => f.id === numericId)
    if (!found) {
      await fetchSavedFlows(true)
      found = savedFlows.value.find((f) => f.id === numericId)
    }
    activeFlow.value = found ?? null
    return activeFlow.value
  }

  function resetChat() {
    chatMessages.value = []
    errorMessage.value = null
  }

  return {
    chatMessages,
    savedFlows,
    activeFlow,
    isLoading,
    isGeneratingFlow,
    flowsLoading,
    errorMessage,
    sendMessage,
    generateAndSaveFlow,
    fetchSavedFlows,
    getFlowById,
    resetChat,
  }
}
