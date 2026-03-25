import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './supabase.js'; // s ตัวเล็กตามโครงสร้างไฟล์คุณ

// Import Components (เช็คตัวเล็ก-ใหญ่ให้ตรงกับไฟล์ด้านซ้ายมือของคุณ)
import OrderFood from './orderFood.jsx'; // o ตัวเล็ก
import Login from './Login.jsx';      // L ตัวใหญ่
import Register from './Register.jsx'; // R ตัวใหญ่
import RiderDashboard from './rider.jsx'; // r ตัวเล็ก
import AdminDashboard from './admin.jsx'; // a ตัวเล็ก

// --- ส่วนที่ 1: ตัวช่วยกั้นหน้า (Protected Route) ---
// ถ้ายังไม่ล็อกอิน จะดีดกลับไปหน้า Login ทันที
const ProtectedRoute = ({ children, user }) => {
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // เช็คสถานะการล็อกอินปัจจุบัน
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      setLoading(false);
    };
    getSession();

    // ติดตามการเปลี่ยนแปลง (Login/Logout)
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => authListener.subscription.unsubscribe();
  }, []);

  if (loading) return (
    <div className="bg-black min-h-screen flex items-center justify-center text-orange-500 font-black">
      LOADING SYSTEM...
    </div>
  );

  return (
    <Router>
      <Routes>
        {/* 1. หน้าทั่วไป (Public Routes) */}
        <Route path="/login" element={user ? <Navigate to="/order" /> : <Login />} />
        <Route path="/register" element={user ? <Navigate to="/order" /> : <Register />} />

        {/* 2. หน้าลูกค้า (Protected: ต้องล็อกอินก่อน) */}
        <Route path="/order" element={
          <ProtectedRoute user={user}>
            <OrderFood />
          </ProtectedRoute>
        } />

        {/* 3. หน้าไรเดอร์ (พร้อมพัฒนาต่อ) */}
        <Route path="/rider" element={
          <ProtectedRoute user={user}>
            <RiderDashboard />
          </ProtectedRoute>
        } />

        {/* 4. หน้าแอดมิน (พร้อมพัฒนาต่อ) */}
        <Route path="/admin" element={
          <ProtectedRoute user={user}>
            <AdminDashboard />
          </ProtectedRoute>
        } />

        {/* หน้าแรก: ถ้าล็อกอินแล้วไปหน้าสั่งอาหาร ถ้ายังไปหน้า Login */}
        <Route path="/" element={<Navigate to={user ? "/order" : "/login"} />} />
        
        {/* ดักจับ URL มั่ว */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;
