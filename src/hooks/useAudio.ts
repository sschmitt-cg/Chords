// React hook wrapping the Web Audio engine.
// Reads scale/chord state from the store; exposes play functions + mute toggle.

import { useCallback } from 'react'
import { useTonalStore } from '../store/index'
import {
  ensureAudio,
  unlockAudioGestureSync,
  unlockAudioIfNeeded,
  setAudioMuted,
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
    setMuted,
    currentScale,
    harmonyRows,
    globalHarmonyMax,
  } = useTonalStore()

  // Must be called directly from an onClick handler (synchronous gesture context).
  // Handles the iOS audio unlock flow before toggling mute state.
  const toggleMute = useCallback(() => {
    if (isMuted) {
      unlockAudioGestureSync()
      setMuted(false)
      setAudioMuted(false)
      if (!isIOS()) {
        unlockAudioIfNeeded().then(ok => {
          if (!ok) {
            setMuted(true)
            setAudioMuted(true)
          }
        })
      }
    } else {
      stopPlayback()
      setAudioMuted(true)
      setMuted(true)
    }
  }, [isMuted, setMuted])

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

  const playChord = useCallback((rowIndex: number) => {
    if (isMuted) return
    if (!ensureAudio()) return
    const ctx = getAudioContext()
    if (!ctx) return
    const row = harmonyRows.find(r => r.index === rowIndex)
    if (!row) return
    const filteredNotes = row.notes.filter(n => n.degree <= globalHarmonyMax)
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

  return { isMuted, toggleMute, playScale, playChord, playNote }
}
