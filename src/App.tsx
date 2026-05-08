import { useEffect, useState } from 'react'
import type React from 'react'
import { useLayoutStore, type SectionId } from './store/layout'
import AppHeader from './components/AppHeader/AppHeader'
import { useUrlSync } from './hooks/useUrlSync'
import ScaleLogical from './components/ScaleNavigator/ScaleLogical'
import ScaleExploratory from './components/ScaleNavigator/ScaleExploratory'
import ScaleStrip from './components/ScaleStrip/index'
import HarmonyGrid from './components/HarmonyGrid/index'
import KeyboardVisualizer from './components/KeyboardVisualizer/index'
import FretboardVisualizer from './components/FretboardVisualizer/index'
import TuningSelector from './components/TuningSelector/index'
import CircleOfFifths from './components/CircleOfFifths/index'
import Metronome from './components/Metronome/index'
import ChromaticTuner from './components/Tuner/index'
import styles from './App.module.css'

// Landscape panel assignments — fixed regardless of portrait section order
// circle is rendered separately to the right of the navigator+strip column
const LANDSCAPE_TOP: SectionId[]   = ['scale-logical', 'scale-exploratory', 'strip']
const LANDSCAPE_LEFT: SectionId[]  = ['keyboard', 'fretboard']
const LANDSCAPE_RIGHT: SectionId[] = ['harmony', 'metronome', 'tuner']

function renderSection(id: SectionId, sectionVisible: Record<SectionId, boolean>) {
  switch (id) {
    case 'scale-logical':     return <ScaleLogical />
    case 'scale-exploratory': return <ScaleExploratory />
    case 'circle':            return <CircleOfFifths />
    case 'strip':             return <ScaleStrip />
    case 'keyboard':          return <KeyboardVisualizer />
    case 'fretboard':         return (
      <>
        <FretboardVisualizer />
        {sectionVisible['tuning-selector'] && <TuningSelector />}
      </>
    )
    case 'harmony':           return <HarmonyGrid />
    case 'metronome':         return <Metronome />
    case 'tuner':             return <ChromaticTuner />
    // tuning-selector is pinned below fretboard; never rendered standalone
    case 'tuning-selector':   return null
  }
}

function useIsLandscape() {
  const [isLandscape, setIsLandscape] = useState(
    () => window.matchMedia('(orientation: landscape)').matches
  )
  useEffect(() => {
    const mq = window.matchMedia('(orientation: landscape)')
    const handler = (e: MediaQueryListEvent) => setIsLandscape(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])
  return isLandscape
}

function App(): React.ReactElement {
  const { sectionOrder, sectionVisible } = useLayoutStore()
  const isLandscape = useIsLandscape()
  useUrlSync()

  const leftEmpty  = LANDSCAPE_LEFT.every(id => !sectionVisible[id])
  const rightEmpty = LANDSCAPE_RIGHT.every(id => !sectionVisible[id])

  return (
    <div className={styles.root}>
      <AppHeader />

      {/* iOS requires a real <audio> element to route Web Audio through WKWebView */}
      <audio id="audioOut" style={{ display: 'none' }} />

      {isLandscape ? (
        <div className={styles.landscapeBody}>
          <div className={styles.panelTop}>
            <div className={styles.panelTopLeft}>
              {LANDSCAPE_TOP.filter(id => sectionVisible[id]).map(id => (
                <div key={id}>{renderSection(id, sectionVisible)}</div>
              ))}
            </div>
            {sectionVisible['circle'] && (
              <div className={styles.panelTopCircle}>
                <CircleOfFifths />
              </div>
            )}
          </div>
          <div className={[
            styles.panelLeft,
            leftEmpty ? styles.panelHidden : '',
          ].join(' ')}>
            {LANDSCAPE_LEFT.filter(id => sectionVisible[id]).map(id => (
              <div key={id}>{renderSection(id, sectionVisible)}</div>
            ))}
          </div>
          <div className={[
            styles.panelRight,
            rightEmpty ? styles.panelHidden  : '',
            leftEmpty  ? styles.panelFull    : '',
          ].join(' ')}>
            {LANDSCAPE_RIGHT.filter(id => sectionVisible[id]).map(id => (
              <div key={id}>{renderSection(id, sectionVisible)}</div>
            ))}
          </div>
        </div>
      ) : (
        <main className={styles.portraitContent}>
          {sectionOrder.filter(id => sectionVisible[id]).map(id => (
            <div key={id}>{renderSection(id, sectionVisible)}</div>
          ))}
        </main>
      )}
    </div>
  )
}

export default App
