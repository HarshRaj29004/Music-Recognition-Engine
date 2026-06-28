import { useState } from 'react'
import { Toaster } from 'react-hot-toast'
import './App.css'
import AudioRecord from './pages/audioRecord'

function App() {
  return (
    <>
      <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
      <AudioRecord />
    </>
  )
}

export default App

