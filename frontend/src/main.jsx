// Import StrictMode from React — enables additional runtime warnings and checks during development
import { StrictMode } from 'react'
// Import createRoot from react-dom/client — the modern React 18 API for mounting the app to the DOM
import { createRoot } from 'react-dom/client'
// Import global CSS styles — applies base resets and Tailwind CSS directives to the entire app
import './index.css'
// Import the root App component — the top-level component that composes all providers and routes
import App from './App.jsx'

// Find the DOM element with id="root" (defined in index.html), create a React root on it, and render the app
// createRoot replaces the legacy ReactDOM.render and enables concurrent rendering features in React 18
createRoot(document.getElementById('root')).render(
  // StrictMode wrapper — activates extra development-only checks (double-invoking renders, detecting side effects)
  // It does NOT affect the production build; purely a development safety net
  <StrictMode>
    {/* Render the top-level App component — this is the single entry point for the entire UI tree */}
    <App />
  </StrictMode>,
)
