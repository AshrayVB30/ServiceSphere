import { useState } from 'react'
import heroImg from './assets/hero.png'
import reactLogo from './assets/react.svg'
import viteLogo from './assets/vite.svg'
import './App.css'

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
    <h1>Hi Everyone, </h1>
    <img src="/logo.png" alt="logo" />
    <p>This is ServiceSphere frontend is in devlopment phase. We will update it soon... </p>
    </>
  )
}

export default App
