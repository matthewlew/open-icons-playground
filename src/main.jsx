import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import App from '../open-icons-playground_12_3.jsx'
import ReadmePage from './ReadmePage.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/docs" element={<ReadmePage />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
)
