import ScaleNavigator from './components/ScaleNavigator/index'
import ScaleStrip from './components/ScaleStrip/index'
import HarmonyGrid from './components/HarmonyGrid/index'
import KeyboardVisualizer from './components/KeyboardVisualizer/index'
import FretboardVisualizer from './components/FretboardVisualizer/index'

function App() {
  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <ScaleNavigator />
      <ScaleStrip />
      <KeyboardVisualizer />
      <FretboardVisualizer />
      <HarmonyGrid />
      {/* iOS requires a real <audio> element to route Web Audio through WKWebView */}
      <audio id="audioOut" style={{ display: 'none' }} />
    </div>
  )
}

export default App
