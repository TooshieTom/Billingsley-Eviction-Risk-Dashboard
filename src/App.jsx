import { useState } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import PrivateRoute from './components/authentication/PrivateRoute';
import Login from './components/authentication/Login';
import Register from './components/authentication/Register';
import AdminView from './components/AdminView';
import UserView from './components/UserView';

function App() {
  const [user, setUser] = useState(null);

  let authUsers = [
  { name: "Ryan Lemaster",  email: "rlemaster@billingsleyco.com",   password: "password",   role: "admin",    profilePicture: "1" },
  { name: "Jose Falomir",   email: "jfalomir@billingsleyco.com",    password: "password",   role: "end-user", profilePicture: "1" }]

  const handleLogin = ({ email, password }) => {
    const user = authUsers.find((user) => user.email === email && user.password === password);

    if (user) {
      setUser(user);
      return user;
    } else {
      alert("Invalid credentials");
      return null;
    }

  }
  
  const handleLogout = () => { setUser(null); }

  return (
    <Router>
      <Routes>
        <Route
          path='/login'
          element={<Login onLogin={handleLogin} />} />

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

        <Route path='*' element={<Login onLogin={handleLogin} />} />
      </Routes>
    </Router>
  )
}

export default App
