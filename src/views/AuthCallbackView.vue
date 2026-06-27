<script setup>
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { setToken } from '@/composables/useAuth.js'

const router = useRouter()

onMounted(() => {
  // Token is in the URL fragment (#<jwt>) to avoid it appearing in server logs
  const token = window.location.hash.slice(1)
  if (token) {
    setToken(token)
    router.replace({ name: 'pushups' })
  } else {
    router.replace({ name: 'login' })
  }
})
</script>

<template>
  <div style="display:flex;align-items:center;justify-content:center;min-height:100vh">
    Signing you in…
  </div>
</template>
