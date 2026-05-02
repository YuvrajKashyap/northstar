import type { ReactNode } from 'react'
import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X } from '@phosphor-icons/react'

export function WorkspaceModal({
  open,
  title,
  children,
  onClose,
  wide,
}: {
  open: boolean
  title: string
  children: ReactNode
  onClose: () => void
  wide?: boolean
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div
      className="workspace-modal-backdrop"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className={`workspace-modal${wide ? ' workspace-modal--wide' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="workspace-modal-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header className="workspace-modal__head">
          <h2 id="workspace-modal-title">{title}</h2>
          <button className="workspace-modal__close" type="button" onClick={onClose} aria-label="Close dialog">
            <X size={22} />
          </button>
        </header>
        <div className="workspace-modal__body">{children}</div>
      </div>
    </div>,
    document.body,
  )
}
