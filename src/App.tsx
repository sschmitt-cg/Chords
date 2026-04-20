import { useEffect, useState } from 'react'
import { useLayoutStore, type SectionId } from './store/layout'
import AppHeader from './components/AppHeader/AppHeader'
import ScaleNavigator from './components/ScaleNavigator/index'
import ScaleStrip from './components/ScaleStrip/index'
import HarmonyGrid from './components/HarmonyGrid/index'
import KeyboardVisualizer from './components/KeyboardVisualizer/index'
import FretboardVisualizer from './components/FretboardVisualizer/index'
import styles from './App.module.css'

// Landscape panel assignments — fixed regardless of portrait section order
const LANDSCAPE_TOP: SectionId[]   = ['navigator', 'strip']
const LANDSCAPE_LEFT: SectionId[]  = ['keyboard', 'fretboard']
const LANDSCAPE_RIGHT: SectionId[] = ['harmony']

function renderSection(id: SectionId) {
  switch (id) {
    case 'navigator': return <ScaleNavigator />
    case 'strip':     return <ScaleStrip />
    case 'keyboard':  return <KeyboardVisualizer />
    case 'fretboard': return <FretboardVisualizer />
    case 'harmony':   return <HarmonyGrid />
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

function App() {
  const { sectionOrder, sectionVisible } = useLayoutStore()
  const isLandscape = useIsLandscape()

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
            {LANDSCAPE_TOP.filter(id => sectionVisible[id]).map(id => (
              <div key={id}>{renderSection(id)}</div>
            ))}
          </div>
          <div className={[
            styles.panelLeft,
            leftEmpty ? styles.panelHidden : '',
          ].join(' ')}>
            {LANDSCAPE_LEFT.filter(id => sectionVisible[id]).map(id => (
              <div key={id}>{renderSection(id)}</div>
            ))}
          </div>
          <div className={[
            styles.panelRight,
            rightEmpty ? styles.panelHidden  : '',
            leftEmpty  ? styles.panelFull    : '',
          ].join(' ')}>
            {LANDSCAPE_RIGHT.filter(id => sectionVisible[id]).map(id => (
              <div key={id}>{renderSection(id)}</div>
            ))}
          </div>
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
