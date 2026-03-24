import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import { supabase } from './supabase';
import './App.css';

// นำเข้าหน้าต่างๆ (ตรวจสอบชื่อไฟล์ให้ตรงกับในเครื่องเพื่อนนะ)
import Login from './Login';
import Register from './Register';
import OrderFood from './orderFood';
import Rider from './rider';
import Admin from './admin';
import Chat from './chat';

function App() {
  const [session, setSession] = useState(null);

  // ตรวจสอบการเข้าสู่ระบบเบื้องต้น
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
  }, []);

  return (
    <Router>
      <div className="App">
        {/* --- Navbar ส่วนหัวของแอป --- */}
        <nav style={navStyle}>
          <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Link to="/" style={logoStyle}>🍔 FoodApp Pro</Link>
            <div style={{ display: 'flex', gap: '15px' }}>
              <Link to="/order" className="nav-link">สั่งอาหาร</Link>
              <Link to="/rider" className="nav-link">ไรเดอร์</Link>
              <Link to="/admin" className="nav-link">แอดมิน</Link>
              <Link to="/chat" className="nav-link">แชท</Link>
              {!session ? (
                <Link to="/login" style={loginBtnStyle}>เข้าสู่ระบบ</Link>
              ) : (
                <button onClick={() => supabase.auth.signOut()} style={logoutBtnStyle}>ออกจากระบบ</button>
              )}
            </div>
          </div>
        </nav>

        {/* --- ส่วนจัดการเส้นทาง (Routing) --- */}
        <div className="container" style={{ marginTop: '30px' }}>
          <Routes>
            {/* หน้าแรกให้ไปที่หน้าสั่งอาหาร */}
            <Route path="/" element={<Navigate to="/order" />} />
            
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/order" element={<OrderFood />} />
            <Route path="/rider" element={<Rider />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/chat" element={<Chat />} />

            {/* ถ้าพิมพ์ URL ผิด ให้เด้งกลับหน้าแรก */}
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

// --- Styles ภายในไฟล์ (Inline CSS) ---
const navStyle = {
  backgroundColor: '#fff',
  padding: '15px 0',
  boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
  position: 'sticky',
  top: 0,
  zIndex: 1000
};

const logoStyle = {
  fontSize: '22px',
  fontWeight: 'bold',
  color: '#ff6600',
  textDecoration: 'none'
};

const loginBtnStyle = {
  backgroundColor: '#ff6600',
  color: 'white',
  padding: '8px 16px',
  borderRadius: '20px',
  textDecoration: 'none',
  fontSize: '14px',
  fontWeight: 'bold'
};

const logoutBtnStyle = {
  backgroundColor: '#eee',
  color: '#333',
  border: 'none',
  padding: '8px 16px',
  borderRadius: '20px',
  cursor: 'pointer',
  fontSize: '14px'
};

export default App;
