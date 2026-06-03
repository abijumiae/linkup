/** Room chat supports text only (matches backend PostLiveTalkMessageDto). */
export const LIVE_TALK_SUPPORTS_ATTACHMENTS = false;

export function insertAtCursor(
  current: string,
  insert: string,
  field: HTMLTextAreaElement | HTMLInputElement | null,
): { value: string; cursor: number } {
  const safeInsert = insert ?? "";
  const safeCurrent = current ?? "";
  if (!field || field.selectionStart == null) {
    const next = `${safeCurrent}${safeInsert}`;
    return { value: next, cursor: next.length };
  }
  const start = field.selectionStart;
  const end = field.selectionEnd ?? start;
  const value =
    safeCurrent.slice(0, start) + safeInsert + safeCurrent.slice(end);
  const cursor = start + safeInsert.length;
  return { value, cursor };
}

export function focusFieldAt(
  field: HTMLTextAreaElement | HTMLInputElement | null,
  cursor: number,
) {
  if (!field) {
    return;
  }
  requestAnimationFrame(() => {
    field.focus();
    try {
      field.setSelectionRange(cursor, cursor);
    } catch {
      /* some browsers reject on hidden fields */
    }
  });
}

export function resizeTextarea(el: HTMLTextAreaElement | null, maxPx = 120) {
  if (!el) {
    return;
  }
  el.style.height = "auto";
  el.style.height = `${Math.min(el.scrollHeight, maxPx)}px`;
}
