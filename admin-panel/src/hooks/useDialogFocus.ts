import { useEffect, useRef } from "react";

/** Scope keyboard focus to an open dialog, then return it to its trigger. */
export default function useDialogFocus(open: boolean, onClose: () => void, closeDisabled = false) {
  const card = useRef<HTMLDivElement>(null);
  const close = useRef({ onClose, closeDisabled });
  useEffect(() => { close.current = { onClose, closeDisabled }; }, [onClose, closeDisabled]);
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const focusable = () => Array.from(card.current?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex="0"]'
    ) ?? []).filter(el => !el.hidden && el.getAttribute("aria-hidden") !== "true");
    (focusable()[0] ?? card.current)?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !close.current.closeDisabled) {
        event.preventDefault();
        close.current.onClose();
      }
      if (event.key !== "Tab") return;
      const items = focusable();
      const first = items[0], last = items[items.length - 1];
      if (!first) { event.preventDefault(); card.current?.focus(); return; }
      if (!card.current?.contains(document.activeElement) ||
          (event.shiftKey ? document.activeElement === first : document.activeElement === last)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      }
    };
    document.addEventListener("keydown", keydown);
    return () => { document.removeEventListener("keydown", keydown); previous?.focus(); };
  }, [open]);
  return card;
}
