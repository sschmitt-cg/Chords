import { useEffect, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useLayoutStore, SECTION_LABELS, type SectionId } from '../../store/layout'
import styles from './SectionMenu.module.css'

interface SortableRowProps {
  id: SectionId
}

function SortableRow({ id }: SortableRowProps) {
  const { sectionVisible, setSectionVisible } = useLayoutStore()
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={[styles.row, isDragging ? styles.dragging : ''].join(' ')}
    >
      <button className={styles.dragHandle} aria-label="Drag to reorder" {...attributes} {...listeners}>
        <svg width="12" height="16" viewBox="0 0 12 16" fill="currentColor">
          <circle cx="3" cy="3" r="1.5"/><circle cx="9" cy="3" r="1.5"/>
          <circle cx="3" cy="8" r="1.5"/><circle cx="9" cy="8" r="1.5"/>
          <circle cx="3" cy="13" r="1.5"/><circle cx="9" cy="13" r="1.5"/>
        </svg>
      </button>
      <span className={styles.label}>{SECTION_LABELS[id]}</span>
      <input
        type="checkbox"
        className={styles.checkbox}
        checked={sectionVisible[id]}
        onChange={(e) => setSectionVisible(id, e.target.checked)}
        aria-label={`Show ${SECTION_LABELS[id]}`}
      />
    </div>
  )
}

interface SectionMenuProps {
  anchorRect: DOMRect | null
  onClose: () => void
  toggleRef: RefObject<HTMLButtonElement>
}

export default function SectionMenu({ anchorRect, onClose, toggleRef }: SectionMenuProps) {
  const { sectionOrder, setSectionOrder, resetLayout } = useLayoutStore()

  const sensors = useSensors(useSensor(PointerSensor))

  useEffect(() => {
    function handler(e: MouseEvent) {
      const target = e.target as Element
      // Let the toggle button's onClick handle open/close; don't double-fire here
      if (toggleRef.current?.contains(target)) return
      if (!target.closest('[data-section-menu]')) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose, toggleRef])

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIdx = sectionOrder.indexOf(active.id as SectionId)
    const newIdx = sectionOrder.indexOf(over.id as SectionId)
    setSectionOrder(arrayMove(sectionOrder, oldIdx, newIdx))
  }

  const top = anchorRect ? anchorRect.bottom + 6 : 60
  const right = anchorRect ? window.innerWidth - anchorRect.right : 16

  return createPortal(
    <div data-section-menu className={styles.menu} style={{ top, right }}>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={sectionOrder} strategy={verticalListSortingStrategy}>
          {sectionOrder.map(id => (
            <SortableRow key={id} id={id} />
          ))}
        </SortableContext>
      </DndContext>
      <div className={styles.footer}>
        <button className={styles.resetBtn} onClick={resetLayout}>Default Layout</button>
      </div>
    </div>,
    document.body
  )
}
