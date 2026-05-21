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
// Below the top row (scale nav + circle) the bottom area is two flex columns.
// Each child renders at its natural height; hidden children are removed and
// remaining ones flow up to fill the gap.
const LANDSCAPE_TOP: SectionId[]         = ['scale-logical', 'scale-exploratory', 'strip']
const LANDSCAPE_LEFT_COL: SectionId[]    = ['keyboard', 'fretboard', 'metronome']
const LANDSCAPE_RIGHT_COL: SectionId[]   = ['harmony', 'tuner']

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

  const leftColEmpty  = LANDSCAPE_LEFT_COL.every(id => !sectionVisible[id])
  const rightColEmpty = LANDSCAPE_RIGHT_COL.every(id => !sectionVisible[id])

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
          {(!leftColEmpty || !rightColEmpty) && (
            <div className={styles.panelBottom}>
              {!leftColEmpty && (
                <div
                  className={[
                    styles.panelCol,
                    rightColEmpty ? styles.panelColFull : '',
                  ].join(' ')}
                >
                  {LANDSCAPE_LEFT_COL.filter(id => sectionVisible[id]).map(id => (
                    <div key={id} className={styles.cell}>{renderSection(id)}</div>
                  ))}
                </div>
              )}
              {!rightColEmpty && (
                <div
                  className={[
                    styles.panelCol,
                    leftColEmpty ? styles.panelColFull : '',
                  ].join(' ')}
                >
                  {LANDSCAPE_RIGHT_COL.filter(id => sectionVisible[id]).map(id => (
                    <div key={id} className={styles.cell}>{renderSection(id)}</div>
                  ))}
                </div>
              )}
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
