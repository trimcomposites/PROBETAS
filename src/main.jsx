import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { ensureCryptoRandomUuid } from './utils/cryptoPolyfills.js'

ensureCryptoRandomUuid()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
