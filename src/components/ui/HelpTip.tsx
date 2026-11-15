import { useCallback, useEffect, useId, useRef, type ReactNode } from 'react';

/** Native disclosure works on touch, with Enter/Space, and without hover. */
export function HelpTip({ label, children, preview = false, trigger }: { label: string; children: ReactNode; preview?: boolean; trigger?: ReactNode }) {
  const id = useId();
  const pointer = useRef(false);
  const details = useRef<HTMLDetailsElement>(null);
  const offset = useRef(0);
  const hasTrigger = trigger !== undefined;
  const align = useCallback(() => {
    const tip = details.current?.querySelector<HTMLElement>('.help-tip-copy');
    if (!details.current?.open || !tip) return;
    const bounds = tip.getBoundingClientRect();
    const width = document.documentElement.clientWidth || window.innerWidth;
    const left = bounds.left - offset.current, right = bounds.right - offset.current;
    offset.current = Math.max(12 - left, Math.min(0, width - 12 - right));
    tip.style.left = `${offset.current}px`;
  }, []);
  useEffect(() => {
    if (!hasTrigger) return;
    window.addEventListener('resize', align);
    return () => window.removeEventListener('resize', align);
  }, [hasTrigger, align]);
  useEffect(() => {
    if (!preview) return;
    const dismiss = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && details.current?.open) details.current.open = false;
    };
    document.addEventListener('keydown', dismiss);
    return () => document.removeEventListener('keydown', dismiss);
  }, [preview]);
  return <details ref={details} className={hasTrigger ? 'help-tip symbol-help' : 'help-tip'} onToggle={hasTrigger ? align : undefined}
    onPointerEnter={event => { if (preview && event.pointerType === 'mouse') event.currentTarget.open = true; }}
    onPointerLeave={event => { if (preview && !event.currentTarget.contains(document.activeElement)) event.currentTarget.open = false; }}
    onFocus={event => { if (preview && !pointer.current) event.currentTarget.open = true; }}
    onBlur={event => { pointer.current = false; if (preview && !event.currentTarget.contains(event.relatedTarget)) event.currentTarget.open = false; }}
    onKeyDown={event => {
    if (event.key === 'Escape') { event.currentTarget.open = false; event.currentTarget.querySelector('summary')?.focus(); }
  }}>
    <summary aria-label={`About ${label}`} aria-controls={id} onPointerDown={() => { pointer.current = true; }} onClick={() => { pointer.current = false; }}>{trigger ?? '?'}</summary>
    <div id={id} className="help-tip-copy">{children}</div>
  </details>;
}
