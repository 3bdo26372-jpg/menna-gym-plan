import React from 'react'
import ReactDOM from 'react-dom/client'
import { SpeedInsights } from '@vercel/speed-insights/react'
import '@fontsource/cairo/400.css'
import '@fontsource/cairo/600.css'
import '@fontsource/cairo/700.css'
import '@fontsource/cairo/800.css'
import '@fontsource/manrope/700.css'
import '@fontsource/manrope/800.css'
import App from './App'
import './styles/base.css'
import './styles/components.css'
import './styles/workout.css'
import './styles/report.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
    {/* Real load times from her phone, in Vercel → Speed Insights. */}
    <SpeedInsights />
  </React.StrictMode>,
)
