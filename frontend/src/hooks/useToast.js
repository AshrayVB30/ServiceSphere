// Re-export the useToast hook from its canonical source in ToastContext
// WHY: This barrel re-export lets consumers import from the hooks directory (e.g. '../hooks/useToast')
// rather than coupling them directly to the internal contexts directory path.
// Consistent with the useAuth pattern — all hooks are surfaced through the hooks/ directory
// as a single, predictable public API layer, regardless of where they are defined internally.
export { useToast } from '../contexts/ToastContext';
