import ScaleNavigator from './components/ScaleNavigator/index'
import ScaleStrip from './components/ScaleStrip/index'
import HarmonyGrid from './components/HarmonyGrid/index'
import KeyboardVisualizer from './components/KeyboardVisualizer/index'
import FretboardVisualizer from './components/FretboardVisualizer/index'
import { useAudio } from './hooks/useAudio'

function SoundToggle() {
  const { isMuted, toggleMute } = useAudio()
  return (
    <button
      onClick={toggleMute}
      aria-label={isMuted ? 'Unmute' : 'Mute'}
      style={{
        minWidth: 44, minHeight: 44,
        background: 'none', border: '1px solid rgba(255,255,255,0.15)',
        borderRadius: 8, cursor: 'pointer', color: isMuted ? '#555' : '#f0f0f0',
        fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      {isMuted ? '🔇' : '🔊'}
    </button>
  )
}

function App() {
  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <SoundToggle />
      </div>
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
