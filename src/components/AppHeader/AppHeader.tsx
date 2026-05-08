import { useRef, useState, useCallback, useEffect } from 'react'
import { flushSync } from 'react-dom'
import * as htmlToImage from 'html-to-image'
import SectionMenu from '../SectionMenu/SectionMenu'
import ShareCard from '../ShareCard/ShareCard'
import { useTonalStore } from '../../store/index'
import styles from './AppHeader.module.css'

export default function AppHeader() {
  const menuBtnRef   = useRef<HTMLButtonElement>(null)
  const shareBtnRef  = useRef<HTMLButtonElement>(null)
  const shareCardRef = useRef<HTMLDivElement>(null)

  const randomize = useTonalStore(s => s.randomize)

  const [menuOpen, setMenuOpen]   = useState(false)
  const [menuAnchor, setMenuAnchor] = useState<DOMRect | null>(null)
  const [shareOpen, setShareOpen] = useState(false)
  const [isCapturing, setIsCapturing] = useState(false)

  function toggleMenu() {
    if (!menuOpen && menuBtnRef.current) {
      setMenuAnchor(menuBtnRef.current.getBoundingClientRect())
    }
    setMenuOpen(prev => !prev)
  }

  // Close share popover when clicking outside it
  useEffect(() => {
    if (!shareOpen) return
    function onPointerDown(e: PointerEvent) {
      if (
        shareBtnRef.current && !shareBtnRef.current.contains(e.target as Node) &&
        !(e.target as Element).closest(`.${styles.sharePopover}`)
      ) {
        setShareOpen(false)
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [shareOpen])

  const captureCard = useCallback(async (): Promise<{ blob: Blob; file: File } | null> => {
    if (!shareCardRef.current) return null
    // flushSync forces the re-render to complete before toPng reads the DOM,
    // so the share card re-renders with the latest store state before capture.
    flushSync(() => setIsCapturing(true))
    try {
      const dataUrl = await htmlToImage.toPng(shareCardRef.current, {
        backgroundColor: '#1a2660',
        pixelRatio: 2,
      })
      const res  = await fetch(dataUrl)
      const blob = await res.blob()
      const file = new File([blob], 'tonal-explorer.png', { type: 'image/png' })
      return { blob, file }
    } catch {
      return null
    } finally {
      setIsCapturing(false)
    }
  }, [])

  const handleShareNative = useCallback(async () => {
    setShareOpen(false)
    const result = await captureCard()
    if (!result) return
    const { blob, file } = result
    const canShareFile =
      typeof navigator.share === 'function' &&
      typeof navigator.canShare === 'function' &&
      navigator.canShare({ files: [file] })
    try {
      if (canShareFile) {
        await navigator.share({ files: [file], title: 'Tonal Explorer', text: window.location.href })
      } else {
        // Web Share not available — fall back to download
        triggerDownload(blob)
      }
    } catch {
      // User cancelled the share sheet
    }
  }, [captureCard])

  const handleDownload = useCallback(async () => {
    setShareOpen(false)
    const result = await captureCard()
    if (!result) return
    triggerDownload(result.blob)
  }, [captureCard])

  return (
    <>
      <header className={styles.header}>
        <div className={styles.inner}>
          <span className={styles.title}>Tonal Explorer</span>
          <div className={styles.actions}>
            <div className={styles.sharePopoverWrap}>
              <button
                ref={shareBtnRef}
                className={[styles.iconBtn, (shareOpen || isCapturing) ? styles.iconBtnActive : ''].join(' ')}
                aria-label="Share"
                aria-busy={isCapturing}
                aria-expanded={shareOpen}
                onClick={() => !isCapturing && setShareOpen(prev => !prev)}
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

              {shareOpen && (
                <div className={styles.sharePopover} role="menu">
                  <button className={styles.sharePopoverItem} role="menuitem" onClick={handleShareNative}>
                    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                      <path d="M7.5 9.5V2m0-1L5 3.5M7.5 1l2.5 2.5M2.5 7.5v4.5a.5.5 0 00.5.5h9a.5.5 0 00.5-.5V7.5"
                        stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Share
                  </button>
                  <button className={styles.sharePopoverItem} role="menuitem" onClick={handleDownload}>
                    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                      <path d="M7.5 1.5v8m0 0L5 7m2.5 2.5L10 7M2.5 11v1.5a.5.5 0 00.5.5h9a.5.5 0 00.5-.5V11"
                        stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Download
                  </button>
                </div>
              )}
            </div>

            <button
              className={styles.iconBtn}
              aria-label="Randomize"
              onClick={randomize}
            >
              {/* Dice icon */}
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <rect x="2" y="2" width="14" height="14" rx="3" stroke="currentColor" strokeWidth="1.5"/>
                <circle cx="6" cy="6" r="1.1" fill="currentColor"/>
                <circle cx="12" cy="6" r="1.1" fill="currentColor"/>
                <circle cx="9" cy="9" r="1.1" fill="currentColor"/>
                <circle cx="6" cy="12" r="1.1" fill="currentColor"/>
                <circle cx="12" cy="12" r="1.1" fill="currentColor"/>
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
      <ShareCard ref={shareCardRef} />

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

function triggerDownload(blob: Blob): void {
  const objectUrl = URL.createObjectURL(blob)
  const anchor    = document.createElement('a')
  anchor.href     = objectUrl
  anchor.download = 'tonal-explorer.png'
  anchor.click()
  URL.revokeObjectURL(objectUrl)
}
