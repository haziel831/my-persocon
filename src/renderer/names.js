// Names typed by the player (Persocon, owner): no markup or control characters, single spaces, 16 characters at most.
export const NAME_MAX = 16;

export function cleanName(text, max = NAME_MAX) {
  const s = String(text ?? '')
    .replace(/[\u0000-\u001f\u007f-\u009f<>&"'`\\{}[\]|$]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return [...s].slice(0, max).join('').trim();
}
