// React hook wrapping the Web Audio engine.
// Reads scale/chord state from the store; exposes play functions + mute toggle.

import { useCallback } from 'react'
import { useTonalStore } from '../store/index'
import {
  ensureAudio,
  unlockAudioGestureSync,
  unlockAudioIfNeeded,
  setAudioVolume,
  stopPlayback,
  getPlaybackToken,
  getAudioContext,
  playSynthNote,
  playSequence,
  playStrum,
  buildAscendingScaleMidis,
  buildChordMidis,
  isIOS,
  SCALE_GAP, SCALE_DUR,
  CHORD_TONE_GAP, CHORD_TONE_DUR,
  STRUM_GAP, STRUM_DUR,
} from '../audio/index'
import type { ScheduledNote } from '../audio/index'

export function useAudio() {
  const {
    isMuted,
    volume,
    lastVolume,
    setVolume: storeSetVolume,
    currentScale,
    harmonyRows,
    globalHarmonyMax,
  } = useTonalStore()

  // Set volume (0–100) and sync audio engine. Must be called in a gesture handler
  // when going from 0 → non-zero so iOS unlock runs synchronously.
  const setVolume = useCallback((v: number) => {
    const clamped = Math.max(0, Math.min(100, v))
    const wasZero = volume === 0
    if (wasZero && clamped > 0) {
      unlockAudioGestureSync()
      if (!isIOS()) {
        unlockAudioIfNeeded().then(ok => { if (!ok) storeSetVolume(0) })
      }
    } else if (clamped === 0 && volume > 0) {
      stopPlayback()
    }
    storeSetVolume(clamped)
    setAudioVolume(clamped / 100)
  }, [volume, storeSetVolume])

  // Click-to-toggle: mute ↔ lastVolume
  const toggleMuteVolume = useCallback(() => {
    if (volume === 0) {
      setVolume(lastVolume)
    } else {
      setVolume(0)
    }
  }, [volume, lastVolume, setVolume])

  // Legacy toggle kept for any remaining callers
  const toggleMute = toggleMuteVolume

  const playScale = useCallback(() => {
    if (isMuted) return
    if (!ensureAudio()) return
    const ctx = getAudioContext()
    if (!ctx) return
    const { pitchClasses } = currentScale
    if (!pitchClasses.length) return
    const token = stopPlayback()
    const midis = buildAscendingScaleMidis(pitchClasses)
    const notes: ScheduledNote[] = midis.map((midi, idx) => ({
      midi,
      pc: pitchClasses[idx % pitchClasses.length],
      dur: SCALE_DUR,
    }))
    playSequence(notes, ctx.currentTime + 0.05, SCALE_GAP, token)
  }, [isMuted, currentScale])

  const playChord = useCallback((rowIndex: number, maxDegree?: number) => {
    if (isMuted) return
    if (!ensureAudio()) return
    const ctx = getAudioContext()
    if (!ctx) return
    const row = harmonyRows.find(r => r.index === rowIndex)
    if (!row) return
    const filteredNotes = row.notes.filter(n => n.degree <= (maxDegree ?? globalHarmonyMax))
    if (!filteredNotes.length) return
    const pcs = filteredNotes.map(n => n.pc)
    const midis = buildChordMidis(pcs)
    const token = stopPlayback()
    const start = ctx.currentTime + 0.05
    const seqNotes: ScheduledNote[] = midis.map((midi, idx) => ({ midi, pc: pcs[idx], dur: CHORD_TONE_DUR }))
    const strumNotes: ScheduledNote[] = midis.map((midi, idx) => ({ midi, pc: pcs[idx], dur: STRUM_DUR }))
    const after = playSequence(seqNotes, start, CHORD_TONE_GAP, token)
    playStrum(strumNotes, after + 0.08, STRUM_GAP, token)
  }, [isMuted, harmonyRows, globalHarmonyMax])

  const playNote = useCallback((pc: number) => {
    if (isMuted) return
    if (!ensureAudio()) return
    const ctx = getAudioContext()
    if (!ctx) return
    const token = stopPlayback()
    // Guard: stopPlayback increments the token, confirm it hasn't changed
    if (token !== getPlaybackToken()) return
    playSynthNote(60 + pc, ctx.currentTime + 0.05, CHORD_TONE_DUR)
  }, [isMuted])

  return { isMuted, volume, lastVolume, setVolume, toggleMuteVolume, toggleMute, playScale, playChord, playNote }
}
