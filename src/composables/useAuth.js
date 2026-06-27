import { ref } from 'vue'

const API_URL = import.meta.env.VITE_API_URL ?? ''
const TOKEN_KEY = 'pushlog_jwt'
const user = ref(null)
let authChecked = false

function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token)
  authChecked = false
}

export async function checkAuthStatus() {
  if (authChecked) return !!user.value
  const token = getToken()
  if (!token) {
    user.value = null
    authChecked = true
    return false
  }
  try {
    const res = await fetch(`${API_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (res.ok) {
      user.value = await res.json()
    } else {
      user.value = null
      localStorage.removeItem(TOKEN_KEY)
    }
  } catch {
    user.value = null
    return false
  }
  authChecked = true
  return !!user.value
}

export function useAuth() {
  function logout() {
    user.value = null
    authChecked = false
    localStorage.removeItem(TOKEN_KEY)
    window.location.href = '/login'
  }

  return { user, logout }
}
