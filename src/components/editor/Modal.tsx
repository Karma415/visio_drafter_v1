import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';

interface Props { title: string; onCancel: () => void; children: ReactNode }
export function Modal({ title, onCancel, children }: Props) {
  const ref = useRef<HTMLDialogElement | null>(null);
  useEffect(() => {
    const dialog = ref.current;
    const previousFocus = document.activeElement;
    dialog?.showModal();
    return () => {
      dialog?.close();
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();
    };
  }, []);
  return <dialog ref={ref} className="editor-dialog" aria-labelledby="dialog-title" onCancel={onCancel}>
    <h2 id="dialog-title">{title}</h2>
    {children}
  </dialog>;
}
