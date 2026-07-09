<script setup>
import { computed, onMounted } from 'vue'
import { useSessions } from '@/composables/useSessions.js'

const { sessions, loading, loadError, loadSessions } = useSessions()

onMounted(loadSessions)

// ── Chart constants ──
const BAR_W = 28
const BAR_GAP = 10
const CHART_H = 160
const PAD = { top: 16, right: 16, bottom: 44, left: 8 }

const chartWidth = computed(() =>
  sessions.value.length * (BAR_W + BAR_GAP) - BAR_GAP + PAD.left + PAD.right,
)

const totalH = computed(() => CHART_H + PAD.top + PAD.bottom)

// Movement Points is already 0-100; chart Y-axis is fixed at that scale
function barH(pts) {
  return Math.max(((pts ?? 0) / 100) * CHART_H, 2)
}

function barY(pts) {
  return PAD.top + CHART_H - barH(pts)
}

function barX(i) {
  return PAD.left + i * (BAR_W + BAR_GAP)
}

function isComplete(s) {
  return s.is_completed || (s.movement_points ?? 0) >= 100
}

function shortDate(dateStr) {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(
    new Date(year, month - 1, day),
  )
}

function weekday(dateStr) {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Intl.DateTimeFormat(undefined, { weekday: 'short' }).format(
    new Date(year, month - 1, day),
  )
}

const daysHit = computed(() => sessions.value.filter(isComplete).length)
const streak = computed(() => {
  let count = 0
  const sorted = [...sessions.value].sort((a, b) => (a.date > b.date ? -1 : 1))
  for (const s of sorted) {
    if (isComplete(s)) count++
    else break
  }
  return count
})
const avgScore = computed(() => {
  if (!sessions.value.length) return 0
  const total = sessions.value.reduce((a, s) => a + (s.movement_points ?? 0), 0)
  return Math.round(total / sessions.value.length)
})
</script>

<template>
  <div class="page">
    <main class="main">
      <div v-if="loading" class="state-card">
        <div class="state-icon">☁️</div>
        <h2>Loading history</h2>
        <p>Fetching your sessions…</p>
      </div>

      <div v-else-if="loadError" class="state-card">
        <div class="state-icon">⚠️</div>
        <h2>Couldn't load</h2>
        <p>{{ loadError }}</p>
        <button class="btn-primary" @click="() => loadSessions(true)">Try again</button>
      </div>

      <div v-else-if="sessions.length === 0" class="state-card">
        <div class="state-icon">📭</div>
        <h2>No history yet</h2>
        <p>Complete your first session to see it here.</p>
      </div>

      <div v-else class="content">
        <h1 class="page-title">Progress</h1>

        <!-- Summary stats -->
        <div class="summary-row">
          <div class="summary-stat">
            <span class="summary-value">{{ sessions.length }}</span>
            <span class="summary-label">Days tracked</span>
          </div>
          <div class="summary-stat">
            <span class="summary-value">{{ daysHit }}</span>
            <span class="summary-label">Days complete</span>
          </div>
          <div class="summary-stat">
            <span class="summary-value">{{ streak }}</span>
            <span class="summary-label">Streak</span>
          </div>
          <div class="summary-stat">
            <span class="summary-value">{{ avgScore }}%</span>
            <span class="summary-label">Avg score</span>
          </div>
        </div>

        <!-- Bar chart card -->
        <div class="chart-card">
          <div class="chart-header">
            <span class="chart-title">Movement Points</span>
            <div class="legend">
              <span class="legend-item">
                <span class="legend-dot" style="background: var(--success)" />
                100 pts
              </span>
              <span class="legend-item">
                <span class="legend-dot" style="background: var(--accent)" />
                In progress
              </span>
            </div>
          </div>

          <div class="chart-scroll">
            <svg
              :width="chartWidth"
              :height="totalH"
              :viewBox="`0 0 ${chartWidth} ${totalH}`"
              class="chart-svg"
            >
              <!-- Baseline -->
              <line
                :x1="PAD.left"
                :y1="PAD.top + CHART_H"
                :x2="chartWidth - PAD.right"
                :y2="PAD.top + CHART_H"
                stroke="var(--border)"
                stroke-width="1"
              />

              <!-- Bars + score labels -->
              <g v-for="(s, i) in sessions" :key="s.session_id ?? s.date">
                <!-- Bar -->
                <rect
                  :x="barX(i)"
                  :y="barY(s.movement_points)"
                  :width="BAR_W"
                  :height="barH(s.movement_points)"
                  :fill="isComplete(s) ? 'var(--success)' : 'var(--accent)'"
                  :opacity="isComplete(s) ? 0.85 : 0.7"
                  rx="4"
                  ry="4"
                />

                <!-- Score above bar -->
                <text
                  :x="barX(i) + BAR_W / 2"
                  :y="barY(s.movement_points) - 4"
                  text-anchor="middle"
                  font-size="9"
                  fill="var(--text-muted)"
                >
                  {{ Math.round(s.movement_points ?? 0) }}%
                </text>

                <!-- Weekday label -->
                <text
                  :x="barX(i) + BAR_W / 2"
                  :y="PAD.top + CHART_H + 14"
                  text-anchor="middle"
                  font-size="9"
                  fill="var(--text-muted)"
                >
                  {{ weekday(s.date) }}
                </text>

                <!-- Date label -->
                <text
                  :x="barX(i) + BAR_W / 2"
                  :y="PAD.top + CHART_H + 26"
                  text-anchor="middle"
                  font-size="8"
                  fill="var(--text-muted)"
                  opacity="0.7"
                >
                  {{ shortDate(s.date) }}
                </text>
              </g>
            </svg>
          </div>
        </div>

        <!-- Session list -->
        <div class="session-list">
          <div
            v-for="s in [...sessions].reverse()"
            :key="s.session_id ?? s.date"
            class="session-row"
            :class="{ hit: isComplete(s) }"
          >
            <div class="session-date-col">
              <span class="session-weekday">{{ weekday(s.date) }}</span>
              <span class="session-date">{{ shortDate(s.date) }}</span>
            </div>
            <div class="session-bar-col">
              <div class="mini-bar-track">
                <div
                  class="mini-bar-fill"
                  :style="{
                    width: `${Math.min(s.movement_points ?? 0, 100)}%`,
                    background: isComplete(s) ? 'var(--success)' : 'var(--accent)',
                  }"
                />
              </div>
            </div>
            <div class="session-reps-col">
              <span class="reps-done">{{ Math.round(s.movement_points ?? 0) }}</span>
              <span class="reps-target">pts</span>
              <span v-if="isComplete(s)" class="check">✓</span>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
.page {
  min-height: 100vh;
  background: var(--bg);
}

.main {
  max-width: 760px;
  margin: 0 auto;
  padding: 2rem 1.5rem;
}

/* ── States ── */
.state-card {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 28px;
  box-shadow: 0 28px 60px rgba(46, 90, 72, 0.08);
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  max-width: 360px;
  padding: 2.4rem 2rem;
  margin: 4rem auto 0;
}

.state-icon {
  font-size: 3.5rem;
  line-height: 1;
}

.state-card h2 {
  font-size: 1.5rem;
  font-weight: 800;
  color: var(--text);
}

.state-card p {
  color: var(--text-muted);
}

.btn-primary {
  background: var(--accent);
  color: #fff;
  border: none;
  border-radius: 10px;
  padding: 0.7rem 1.4rem;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.15s, transform 0.1s;
}

.btn-primary:hover {
  opacity: 0.88;
  transform: translateY(-1px);
}

/* ── Page title ── */
.page-title {
  font-size: 1.75rem;
  font-weight: 800;
  color: var(--text);
  margin-bottom: 1.25rem;
}

/* ── Summary stats ── */
.summary-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.75rem;
  margin-bottom: 1.5rem;
}

.summary-stat {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 1rem 0.75rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.2rem;
}

.summary-value {
  font-size: 1.6rem;
  font-weight: 800;
  color: var(--text);
  line-height: 1;
}

.summary-label {
  font-size: 0.72rem;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  text-align: center;
}

/* ── Chart card ── */
.chart-card {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 20px;
  padding: 1.25rem;
  margin-bottom: 1.25rem;
  box-shadow: 0 4px 20px rgba(46, 90, 72, 0.06);
}

.chart-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
}

.chart-title {
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--text);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.legend {
  display: flex;
  gap: 1rem;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.75rem;
  color: var(--text-muted);
}

.legend-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.chart-scroll {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.chart-svg {
  display: block;
  min-width: 100%;
}

/* ── Session list ── */
.session-list {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(46, 90, 72, 0.06);
}

.session-row {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem 1.25rem;
  border-bottom: 1px solid var(--border);
  transition: background 0.12s;
}

.session-row:last-child {
  border-bottom: none;
}

.session-row:hover {
  background: var(--bg-soft);
}

.session-row.hit .reps-done {
  color: var(--success);
}

.session-date-col {
  display: flex;
  flex-direction: column;
  width: 64px;
  flex-shrink: 0;
}

.session-weekday {
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--text);
}

.session-date {
  font-size: 0.72rem;
  color: var(--text-muted);
}

.session-bar-col {
  flex: 1;
}

.mini-bar-track {
  height: 6px;
  background: var(--bg-muted);
  border-radius: 999px;
  overflow: hidden;
}

.mini-bar-fill {
  height: 100%;
  border-radius: 999px;
  transition: width 0.4s ease;
  opacity: 0.8;
}

.session-reps-col {
  display: flex;
  align-items: center;
  gap: 0.2rem;
  min-width: 80px;
  justify-content: flex-end;
  flex-shrink: 0;
}

.reps-done {
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--text);
}

.reps-target {
  font-size: 0.8rem;
  color: var(--text-muted);
}

.check {
  color: var(--success);
  font-size: 0.85rem;
  font-weight: 700;
  margin-left: 0.15rem;
}

/* ── Responsive ── */
@media (max-width: 600px) {
  .main {
    padding: 1.25rem 1rem;
  }

  .summary-row {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
