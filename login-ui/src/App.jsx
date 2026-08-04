import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import Login from './pages/Login';
import ChangePassword from './pages/ChangePassword';
import Home from './pages/Home';
import './App.css';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login-ui" replace />} />
        <Route path="/login-ui" element={<Login />} />
        <Route path="/change-password-ui" element={<ChangePassword />} />
        <Route path="/home" element={<Home />} />
      </Routes>
    </BrowserRouter>
  );
}
