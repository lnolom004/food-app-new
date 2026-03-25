import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom'; 
import { supabase } from './supabase'; 

// นำเข้าหน้าต่างๆ
import OrderFood from './orderFood'; 
import Login from './Login';      
import Register from './Register'; 
import RiderDashboard from './rider'; 
import AdminDashboard from './admin'; 
import Chat from './chat'; 

// ฟังก์ชันกั้นหน้าสำหรับคนที่ยังไม่ Login
const ProtectedRoute = ({ children, user }) => {
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

function App() {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null); 
  const [loading, setLoading] = useState(true);

  // ฟังก์ชันดึงข้อมูลโปรไฟล์ผู้ใช้
  const fetchUserInfo = async (userId) => {
    try {
      const { data } = await supabase
        .from('users')
        .select('role, is_approved')
        .eq('id', userId)
        .maybeSingle();
      
      setUserData(data);
    } catch (err) {
      console.error("Fetch User Info Error:", err);
      setUserData(null);
    } finally {
      setLoading(false); // บังคับให้ปิดหน้า Loading เสมอ
    }
  };

  useEffect(() => {
    // 1. เช็คตอนเปิดแอป
    const initAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setUser(session.user);
        await fetchUserInfo(session.user.id);
      } else {
        setLoading(false);
      }
    };
    initAuth();

    // 2. ฟังการเปลี่ยนแปลง (Login/Logout)
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session) {
        setUser(session.user);
        await fetchUserInfo(session.user.id);
      } else {
        setUser(null);
        setUserData(null);
        setLoading(false);
      }
    });

    return () => authListener.subscription.unsubscribe();
  }, []);

  // หน้าจอรอโหลด
  if (loading) return (
    <div className="bg-black min-h-screen flex items-center justify-center text-orange-500 font-bold">
      🍔 FOODAPP PRO LOADING...
    </div>
  );

  return (
    <Routes>
      {/* หน้า Login & Register */}
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/register" element={user ? <Navigate to="/" replace /> : <Register />} />

      {/* หน้าสำหรับ Customer */}
      <Route path="/order" element={<ProtectedRoute user={user}><OrderFood /></ProtectedRoute>} />

      {/* หน้าสำหรับ Rider */}
      <Route path="/rider" element={<ProtectedRoute user={user}><RiderDashboard /></ProtectedRoute>} />

      {/* หน้าสำหรับ Admin */}
      <Route path="/admin" element={<ProtectedRoute user={user}><AdminDashboard /></ProtectedRoute>} />

      {/* หน้า Chat */}
      <Route path="/chat/:orderId" element={<ProtectedRoute user={user}><Chat /></ProtectedRoute>} />

      {/* ✅ จุดที่แก้ไข: ตัวจัดการการส่งหน้า (Redirection Logic) */}
      <Route path="/" element={
        user ? (
          userData?.role === 'admin' ? <Navigate to="/admin" replace /> :
          userData?.role === 'rider' ? <Navigate to="/rider" replace /> :
          <Navigate to="/order" replace />
        ) : <Navigate to="/login" replace />
      } />

      {/* กันเหนียว: ถ้าพิมพ์ URL ผิดให้กลับไปหน้าแรก */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
