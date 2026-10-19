<script setup>
import { computed, ref } from 'vue'
import StickmanPlayer from '@/components/StickmanPlayer.vue'
import { getPoseData, poseSlugs } from '@/utils/poseLookup.js'

const slug = ref(poseSlugs[0])
const playing = ref(true)
const poseData = computed(() => getPoseData(slug.value))
</script>

<template>
  <div class="sandbox">
    <h1>Pose Library Sandbox</h1>

    <div class="controls">
      <label>
        Pose
        <select v-model="slug">
          <option v-for="s in poseSlugs" :key="s" :value="s">{{ s }}</option>
        </select>
      </label>
      <label class="toggle">
        <input v-model="playing" type="checkbox" />
        Playing
      </label>
    </div>

    <div class="stage">
      <StickmanPlayer :pose-data="poseData" :playing="playing" :size="300" />
    </div>

    <p class="meta">{{ poseData.frames.length }} frames · {{ poseData.tempo_seconds }}s loop</p>
  </div>
</template>

<style scoped>
.sandbox {
  padding: 1.5rem;
  max-width: 420px;
}
.controls {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
}
.toggle {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}
.stage {
  display: flex;
  justify-content: center;
  padding: 1rem;
  background: var(--bg-soft);
  border: 1px solid var(--border);
  border-radius: 14px;
}
.meta {
  color: var(--text-muted);
  font-size: 0.85rem;
}
</style>
