import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useGameStore } from '../../store/gameStore';

/** The existing reset confirmation, shared by the header and Play again. */
export function NewGameButton({ label = 'Start New Game', className = 'secondary-button' }: { label?: string; className?: string }) {
  const reset = useGameStore(state => state.reset);
  const [confirm, setConfirm] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const cancel = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  function close() {
    setConfirm(false);
    requestAnimationFrame(() => trigger.current?.focus());
  }
  useEffect(() => {
    if (!confirm) return;
    cancel.current?.focus();
    const key = (event: KeyboardEvent) => { if (event.key === 'Escape') close(); };
    document.addEventListener('keydown', key);
    return () => document.removeEventListener('keydown', key);
  }, [confirm]);
  return <>
    <button ref={trigger} type="button" className={className} onClick={() => setConfirm(true)}>{label}</button>
    {confirm && createPortal(<div className="confirmation-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) close(); }}>
      <div className="confirmation-dialog" role="alertdialog" aria-modal="true" aria-labelledby={titleId} onKeyDown={event => {
        if (event.key !== 'Tab') return;
        const buttons = event.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)');
        const first = buttons[0], last = buttons[buttons.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }}>
        <h2 id={titleId}>Start a new game?</h2>
        <p>Your current garden will be lost.</p>
        <div className="confirmation-actions">
          <button ref={cancel} type="button" className="secondary-button" onClick={close}>Cancel</button>
          <button type="button" className="primary-button" onClick={reset}>Start new game</button>
        </div>
      </div>
    </div>, document.body)}
  </>;
}
