import { useRef, useState } from 'react'
import SectionMenu from '../SectionMenu/SectionMenu'
import styles from './AppHeader.module.css'

export default function AppHeader() {
  const menuBtnRef = useRef<HTMLButtonElement>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [menuAnchor, setMenuAnchor] = useState<DOMRect | null>(null)

  function toggleMenu() {
    if (!menuOpen && menuBtnRef.current) {
      setMenuAnchor(menuBtnRef.current.getBoundingClientRect())
    }
    setMenuOpen(prev => !prev)
  }

  return (
    <>
      <header className={styles.header}>
        <div className={styles.inner}>
          <span className={styles.title}>Tonal Explorer</span>
          <div className={styles.actions}>
            <button className={styles.iconBtn} aria-label="Info">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <circle cx="9" cy="9" r="8" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M9 8v5M9 6v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
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
