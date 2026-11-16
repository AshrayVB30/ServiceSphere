// Re-export the useAuth hook from its canonical source in AuthContext
// WHY: This barrel re-export lets consumers import from the hooks directory (e.g. '../hooks/useAuth')
// rather than coupling them directly to the internal contexts directory path.
// This decouples hook consumers from the implementation location, making future refactors easier.
export { useAuth } from '../contexts/AuthContext';
