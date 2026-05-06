import { useRef, useState, useCallback } from 'react'
import { flushSync } from 'react-dom'
import * as htmlToImage from 'html-to-image'
import SectionMenu from '../SectionMenu/SectionMenu'
import ShareCard from '../ShareCard/ShareCard'
import styles from './AppHeader.module.css'

export default function AppHeader() {
  const menuBtnRef  = useRef<HTMLButtonElement>(null)
  const shareCardRef = useRef<HTMLDivElement>(null)

  const [menuOpen, setMenuOpen] = useState(false)
  const [menuAnchor, setMenuAnchor] = useState<DOMRect | null>(null)
  const [isSharing, setIsSharing] = useState(false)

  function toggleMenu() {
    if (!menuOpen && menuBtnRef.current) {
      setMenuAnchor(menuBtnRef.current.getBoundingClientRect())
    }
    setMenuOpen(prev => !prev)
  }

  const handleShare = useCallback(async () => {
    if (isSharing || !shareCardRef.current) return
    // flushSync forces the re-render to complete before toPng reads the DOM,
    // so the share card's footer URL reflects the current window.location.href.
    flushSync(() => setIsSharing(true))
    try {
      const dataUrl = await htmlToImage.toPng(shareCardRef.current, {
        backgroundColor: '#1a2660',
        pixelRatio: 2,
      })
      const shareUrl = window.location.href

      // Convert data URL to Blob for Web Share API file sharing
      const res = await fetch(dataUrl)
      const blob = await res.blob()
      const file = new File([blob], 'tonal-explorer.png', { type: 'image/png' })

      const canShareFile =
        typeof navigator.share === 'function' &&
        typeof navigator.canShare === 'function' &&
        navigator.canShare({ files: [file] })

      if (canShareFile) {
        await navigator.share({
          files: [file],
          title: 'Tonal Explorer',
          text: shareUrl,
        })
      } else {
        // Fallback: trigger programmatic download
        const objectUrl = URL.createObjectURL(blob)
        const anchor = document.createElement('a')
        anchor.href = objectUrl
        anchor.download = 'tonal-explorer.png'
        anchor.click()
        URL.revokeObjectURL(objectUrl)
      }
    } catch {
      // User cancelled the share sheet — not an error worth reporting
    } finally {
      setIsSharing(false)
    }
  }, [isSharing])

  return (
    <>
      <header className={styles.header}>
        <div className={styles.inner}>
          <span className={styles.title}>Tonal Explorer</span>
          <div className={styles.actions}>
            <button
              className={[styles.iconBtn, isSharing ? styles.iconBtnActive : ''].join(' ')}
              aria-label="Share"
              aria-busy={isSharing}
              onClick={handleShare}
            >
              {/* Share / upload icon */}
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path
                  d="M9 11.5V3m0-1.5L6 4.5M9 1.5l3 3M3.5 9v5.5a1 1 0 001 1h9a1 1 0 001-1V9"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            <button
              ref={menuBtnRef}
              className={[styles.iconBtn, menuOpen ? styles.iconBtnActive : ''].join(' ')}
              aria-label="Menu"
              aria-expanded={menuOpen}
              onClick={toggleMenu}
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M2 4.5h14M2 9h14M2 13.5h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Share card — always mounted off-screen so html-to-image can capture it */}
      <ShareCard
        ref={shareCardRef}
        shareUrl={window.location.href}
      />

      {menuOpen && (
        <SectionMenu
          anchorRect={menuAnchor}
          onClose={() => setMenuOpen(false)}
          toggleRef={menuBtnRef}
        />
      )}
    </>
  )
}
