import test from 'node:test'
import assert from 'node:assert/strict'
import { getStage, nextStage, dayLighting, gestureAction } from './season.ts'

test('season stages clamp to five phenology states', () => {
  assert.equal(getStage(-2).name, '發芽')
  assert.equal(getStage(1).name, '開花')
  assert.equal(getStage(99).name, '落果')
})
test('season cycle wraps after fruit drop', () => {
  assert.equal(nextStage(4), 0)
  assert.equal(nextStage(2), 3)
})
test('day lighting is bright at noon and dark at midnight', () => {
  assert.ok(dayLighting(12).daylight > 0.99)
  assert.ok(dayLighting(0).night > 0.99)
})
test('hand pose mapping recognizes open palm, fist, and YA', () => {
  assert.equal(gestureAction([true,true,true,true,true]), 'pollinate')
  assert.equal(gestureAction([false,false,false,false,false]), 'drop')
  assert.equal(gestureAction([true,true,false,false,true]), 'season')
})