import { useEffect } from 'react';
import { EVENT_NOTICE_MS } from '../../game/config/dice';
import { eventName } from '../../game/engine/gameEngine';
import { useGameStore } from '../../store/gameStore';

export function EventNotice() {
  const notice = useGameStore(s => s.eventNotice);
  const dismiss = useGameStore(s => s.dismissEventNotice);
  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => dismiss(notice.id), EVENT_NOTICE_MS);
    return () => window.clearTimeout(timer);
  }, [notice?.id, dismiss]);
  if (!notice) return null;
  return <div key={notice.id} className={`dice-event-notice event-${notice.event}`} role="status" aria-live="polite" aria-atomic="true">
    <span className={`dice-notice-symbol dice-face-art dice-symbol-${notice.event}`} aria-hidden="true" />
    <div><h2>{notice.event === 'garden' ? 'Improvement!' : `${eventName(notice.event)}!`}</h2><p>{notice.message}</p></div>
  </div>;
}
