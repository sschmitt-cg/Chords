import { useState } from 'react'
import type React from 'react'
import { useLayoutStore, type SectionId } from './store/layout'
import AppHeader from './components/AppHeader/AppHeader'
import { useUrlSync } from './hooks/useUrlSync'
import { useIsLandscape } from './hooks/useIsLandscape'
import ScaleLogical from './components/ScaleNavigator/ScaleLogical'
import ScaleExploratory from './components/ScaleNavigator/ScaleExploratory'
import ScaleStrip from './components/ScaleStrip/index'
import HarmonyGrid from './components/HarmonyGrid/index'
import KeyboardVisualizer from './components/KeyboardVisualizer/index'
import FretboardVisualizer from './components/FretboardVisualizer/index'
import CircleOfFifths from './components/CircleOfFifths/index'
import Metronome from './components/Metronome/index'
import ChromaticTuner from './components/Tuner/index'
import UserGuide from './components/UserGuide/UserGuide'
import styles from './App.module.css'

// Landscape panel assignments — fixed regardless of portrait section order.
// Layout (bottom area, below the scale/circle top row):
//   row 2:  instruments (keyboard + fretboard)  |  harmony
//   row 3:  metronome                           |  tuner
// Row 2 stretches so instruments fill the same height as harmony; row 3 is auto
// so metronome and tuner share equal height.
const LANDSCAPE_TOP: SectionId[]         = ['scale-logical', 'scale-exploratory', 'strip']
const LANDSCAPE_INSTRUMENTS: SectionId[] = ['keyboard', 'fretboard']

function renderSection(id: SectionId): React.ReactElement | null {
  switch (id) {
    case 'scale-logical':     return <ScaleLogical />
    case 'scale-exploratory': return <ScaleExploratory />
    case 'circle':            return <CircleOfFifths />
    case 'strip':             return <ScaleStrip />
    case 'keyboard':          return <KeyboardVisualizer />
    case 'fretboard':         return <FretboardVisualizer />
    case 'harmony':           return <HarmonyGrid />
    case 'metronome':         return <Metronome />
    case 'tuner':             return <ChromaticTuner />
    // tuning-selector is no longer rendered via section menu; opened from fretboard string labels
    case 'tuning-selector':   return null
  }
}

function App(): React.ReactElement {
  const { sectionOrder, sectionVisible } = useLayoutStore()
  const isLandscape = useIsLandscape()
  const [view, setView] = useState<'app' | 'guide'>('app')
  useUrlSync()

  const instrumentsVisible = LANDSCAPE_INSTRUMENTS.some(id => sectionVisible[id])
  const harmonyVisible     = sectionVisible['harmony']
  const metronomeVisible   = sectionVisible['metronome']
  const tunerVisible       = sectionVisible['tuner']

  const leftColEmpty  = !instrumentsVisible && !metronomeVisible
  const rightColEmpty = !harmonyVisible && !tunerVisible

  if (view === 'guide') {
    return <UserGuide onBack={() => setView('app')} />
  }

  return (
    <div className={styles.root}>
      <AppHeader onOpenGuide={() => setView('guide')} />

      {/* iOS requires a real <audio> element to route Web Audio through WKWebView */}
      <audio id="audioOut" style={{ display: 'none' }} />

      {isLandscape ? (
        <div className={styles.landscapeBody}>
          <div className={styles.panelTop}>
            <div className={styles.panelTopLeft}>
              {LANDSCAPE_TOP.filter(id => sectionVisible[id]).map(id => (
                <div key={id}>{renderSection(id)}</div>
              ))}
            </div>
            {sectionVisible['circle'] && (
              <div className={styles.panelTopCircle}>
                <CircleOfFifths />
              </div>
            )}
          </div>
          {instrumentsVisible && (
            <div
              className={[
                styles.panelInstruments,
                rightColEmpty ? styles.panelFull : '',
              ].join(' ')}
            >
              {LANDSCAPE_INSTRUMENTS.filter(id => sectionVisible[id]).map(id => (
                <div key={id}>{renderSection(id)}</div>
              ))}
            </div>
          )}
          {harmonyVisible && (
            <div
              className={[
                styles.panelHarmony,
                leftColEmpty ? styles.panelFull : '',
              ].join(' ')}
            >
              <HarmonyGrid />
            </div>
          )}
          {metronomeVisible && (
            <div
              className={[
                styles.panelMetronome,
                rightColEmpty ? styles.panelFull : '',
              ].join(' ')}
            >
              <Metronome />
            </div>
          )}
          {tunerVisible && (
            <div
              className={[
                styles.panelTuner,
                leftColEmpty ? styles.panelFull : '',
              ].join(' ')}
            >
              <ChromaticTuner />
            </div>
          )}
        </div>
      ) : (
        <main className={styles.portraitContent}>
          {sectionOrder.filter(id => sectionVisible[id]).map(id => (
            <div key={id}>{renderSection(id)}</div>
          ))}
        </main>
      )}
    </div>
  )
}

export default App
