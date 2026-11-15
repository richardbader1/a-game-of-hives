import { useId, useRef } from 'react';

/** Native disclosure works on touch, with Enter/Space, and without hover. */
export function HelpTip({ label, children, preview = false }: { label: string; children: React.ReactNode; preview?: boolean }) {
  const id = useId();
  const pointer = useRef(false);
  return <details className="help-tip"
    onPointerEnter={event => { if (preview && event.pointerType === 'mouse') event.currentTarget.open = true; }}
    onPointerLeave={event => { if (preview && !event.currentTarget.contains(document.activeElement)) event.currentTarget.open = false; }}
    onFocus={event => { if (preview && !pointer.current) event.currentTarget.open = true; }}
    onBlur={event => { pointer.current = false; if (preview && !event.currentTarget.contains(event.relatedTarget)) event.currentTarget.open = false; }}
    onKeyDown={event => {
    if (event.key === 'Escape') { event.currentTarget.open = false; event.currentTarget.querySelector('summary')?.focus(); }
  }}>
    <summary aria-label={`About ${label}`} aria-controls={id} onPointerDown={() => { pointer.current = true; }} onClick={() => { pointer.current = false; }}>?</summary>
    <div id={id} className="help-tip-copy">{children}</div>
  </details>;
}
