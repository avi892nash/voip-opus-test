import React, { useState } from 'react'
import './App.css'

function App() {
  const [isConnected, setIsConnected] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    // TODO: Implement login logic
    console.log('Login attempt:', { username, password })
    setIsConnected(true)
  }

  const handleLogout = () => {
    setIsConnected(false)
    setUsername('')
    setPassword('')
  }

  if (!isConnected) {
    return (
      <div className="app">
        <div className="login-container">
          <h1>VoIP App</h1>
          <form onSubmit={handleLogin}>
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button type="submit">Login</button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="app">
      <header>
        <h1>VoIP App</h1>
        <button onClick={handleLogout}>Logout</button>
      </header>
      <main>
        <div className="voip-interface">
          <h2>Voice Call Interface</h2>
          <p>Welcome, {username}!</p>
          <div className="call-controls">
            <button className="call-btn">Start Call</button>
            <button className="hangup-btn">End Call</button>
          </div>
        </div>
      </main>
    </div>
  )
}

export default App 