import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import Login from './pages/Login';
import ChangePassword from './pages/ChangePassword';
import './App.css';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login-ui" replace />} />
        <Route path="/login-ui" element={<Login />} />
        <Route path="/change-password-ui" element={<ChangePassword />} />
      </Routes>
    </BrowserRouter>
  );
}
