import { useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import PrivateRoute from './components/authentication/PrivateRoute';
import Login from './components/authentication/Login';
import Register from './components/authentication/Register';
import AdminView from './components/AdminView';
import UserView from './components/UserView';

function App() {
  const [user, setUser] = useState(null);

  const handleLogin = (data) => {
    console.log(data);
    setUser(data);
  }

  const handleLogout = () => { setUser(null); navigate("/login"); }

  return (
    <Router>
      <Routes>
        <Route
          path='/login'
          element={
            user ? (
              user.role === "admin" ? <Navigate to="/admin" replace /> : <Navigate to="/end-user" replace />
            ) : (
              <Login onLogin={handleLogin} />
            )
          } />

        <Route
          path='/register'
          element={<Register />} />

        <Route
          path='/admin'
          element={
            <PrivateRoute user={user} requiredRole={"admin"}>
              <AdminView user={user} onLogout={handleLogout} />
            </PrivateRoute>
          } />

        <Route
          path='/end-user'
          element={
            <PrivateRoute user={user}>
              <UserView user={user} onLogout={handleLogout} />
            </PrivateRoute>
          } />

        <Route
          path='*'
          element={
            user ? (
              user.role === "admin" ? <Navigate to="/admin" replace /> : <Navigate to="/end-user" replace />
            ) : (
              <Navigate to="/login" replace />
            )
          } />
      </Routes>
    </Router>
  )
}

export default App
