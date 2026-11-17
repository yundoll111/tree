export type SeasonStage = 0 | 1 | 2 | 3 | 4
export type StageInfo = { name: string; subtitle: string; progress: number; flower: number; fruit: number; leaf: number }

const stages: StageInfo[] = [
  { name: '發芽', subtitle: '新芽探出枝頭', progress: 0.08, flower: 0.04, fruit: 0.00, leaf: 0.45 },
  { name: '開花', subtitle: '鳳凰花燃亮天空', progress: 0.30, flower: 1.00, fruit: 0.02, leaf: 0.92 },
  { name: '授粉', subtitle: '蜜蜂穿梭花間', progress: 0.53, flower: 0.72, fruit: 0.20, leaf: 0.90 },
  { name: '結果', subtitle: '豆莢逐漸成熟', progress: 0.76, flower: 0.18, fruit: 1.00, leaf: 0.78 },
  { name: '落果', subtitle: '種子回到土地', progress: 0.96, flower: 0.02, fruit: 0.25, leaf: 0.38 }
]
export function getStage(stage: number): StageInfo {
  const index = Math.max(0, Math.min(4, Math.round(stage)))
  return stages[index]
}
export function nextStage(stage: number): SeasonStage { return ((Math.round(stage) + 1) % 5) as SeasonStage }
export function dayLighting(hour: number) {
  const h = ((hour % 24) + 24) % 24
  const daylight = Math.max(0, Math.sin(((h - 6) / 12) * Math.PI))
  const warm = Math.max(0, 1 - Math.abs(h - 6) / 3) + Math.max(0, 1 - Math.abs(h - 18) / 3)
  return { daylight, warm: Math.min(1, warm), night: 1 - daylight }
}
export function gestureAction(fingers: boolean[], previous?: boolean[]) {
  if (fingers.length !== 5) return 'none'
  const count = fingers.filter(Boolean).length
  if (count === 5) return 'pollinate'
  if (count === 0) return 'drop'
  if (fingers[0] && fingers[1] && !fingers[2] && !fingers[3] && fingers[4]) return 'season'
  if (fingers[0] && !fingers[1] && !fingers[2] && !fingers[3] && !fingers[4]) return 'time'
  if (previous && previous.filter(Boolean).length !== count) return 'wind'
  return 'none'
}
export const stageNames = stages.map(s => s.name)
