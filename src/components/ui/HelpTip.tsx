import { useId } from 'react';

/** Native disclosure works on touch, with Enter/Space, and without hover. */
export function HelpTip({ label, children }: { label: string; children: React.ReactNode }) {
  const id = useId();
  return <details className="help-tip" onKeyDown={event => {
    if (event.key === 'Escape') { event.currentTarget.open = false; event.currentTarget.querySelector('summary')?.focus(); }
  }}>
    <summary aria-label={`About ${label}`} aria-controls={id}>?</summary>
    <div id={id} className="help-tip-copy">{children}</div>
  </details>;
}
