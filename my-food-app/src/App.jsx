import React, { useState, useEffect, useCallback } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './supabase';

// --- นำเข้าหน้าจอต่างๆ ---
import OrderFood from './orderFood';
import Login from './Login';
import Register from './Register';
import RiderDashboard from './rider';
import AdminDashboard from './admin';
import Chat from './chat';
import Review from './Review'; // ✅ เพิ่มการนำเข้าหน้า Review

// ============================================================
// 1. ระบบกั้นหน้าอัจฉริยะ (Protected Route) 
// ============================================================
const ProtectedRoute = ({ children, user, userData, allowedRole }) => {
  // ถ้ายังไม่ได้ Login ให้ส่งไปหน้า Login
  if (!user) return <Navigate to="/login" replace />;

  // ถ้าเป็นหน้าเฉพาะทาง (เช่น Admin) แต่ Role ไม่ตรง ให้เด้งกลับหน้าแรก
  if (allowedRole && userData && userData.role !== allowedRole) {
    return <Navigate to="/" replace />;
  }

  return children;
};

function App() {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  // ============================================================
  // 2. ฟังก์ชันดึงข้อมูลผู้ใช้ (เช็ค Role และ การอนุมัติ)
  // ============================================================
  const fetchUserInfo = useCallback(async (userId) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('role, is_approved')
        .eq('id', userId)
        .maybeSingle();

      if (error) throw error;
      setUserData(data);
    } catch (err) {
      console.error("Auth Data Error:", err.message);
      setUserData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // ============================================================
  // 3. ติดตามสถานะการเข้าสู่ระบบ (Auth Observer)
  // ============================================================
  useEffect(() => {
    const initialize = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        await fetchUserInfo(session.user.id);
      } else {
        setLoading(false);
      }
    };

    initialize();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setUser(session.user);
        await fetchUserInfo(session.user.id);
      } else {
        setUser(null);
        setUserData(null);
        setLoading(false);
      }
    });

    return () => authListener.subscription.unsubscribe();
  }, [fetchUserInfo]);

  // หน้าจอรอโหลดระบบ
  if (loading) return (
    <div style={styles.loaderContainer}>
      <div style={styles.loaderText}>🍔 FOODAPP PRO SYSTEM</div>
      <div style={{ color: '#444', marginTop: '10px', fontSize: '12px' }}>กำลังยืนยันตัวตน...</div>
    </div>
  );

  return (
    <Routes>
      {/* --- ส่วนบุคคลทั่วไป --- */}
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/register" element={user ? <Navigate to="/" replace /> : <Register />} />

      {/* --- ส่วนลูกค้า (Customer) --- */}
      <Route path="/order" element={
        <ProtectedRoute user={user} userData={userData} allowedRole="customer">
          <OrderFood />
        </ProtectedRoute>
      } />

      {/* ✅ หน้าใหม่: รีวิวออเดอร์ (เฉพาะลูกค้า) */}
      <Route path="/review/:orderId" element={
        <ProtectedRoute user={user} userData={userData} allowedRole="customer">
          <Review />
        </ProtectedRoute>
      } />

      {/* --- ส่วนไรเดอร์ (Rider) --- */}
      <Route path="/rider" element={
        <ProtectedRoute user={user} userData={userData} allowedRole="rider">
          {userData?.is_approved ? (
            <RiderDashboard />
          ) : (
            <div style={styles.waitingContainer}>
              <h1 style={{ fontSize: '60px' }}>🛵</h1>
              <h2 style={{ color: '#ff6600' }}>รอการอนุมัติ</h2>
              <p style={{ color: '#888' }}>บัญชีไรเดอร์ของคุณอยู่ระหว่างตรวจสอบโดยแอดมิน</p>
              <button onClick={() => supabase.auth.signOut()} style={styles.logoutMiniBtn}>ออกจากระบบ</button>
            </div>
          )}
        </ProtectedRoute>
      } />

      {/* --- ส่วนแอดมิน (Admin) --- */}
      <Route path="/admin" element={
        <ProtectedRoute user={user} userData={userData} allowedRole="admin">
          <AdminDashboard />
        </ProtectedRoute>
      } />

      {/* --- หน้าแชท (เข้าได้ทุกบทบาทที่ Login แล้ว) --- */}
      <Route path="/chat/:orderId" element={
        <ProtectedRoute user={user}>
          <Chat />
        </ProtectedRoute>
      } />

      {/* --- ระบบ Redirect อัตโนมัติตาม Role --- */}
      <Route path="/" element={
        user ? (
          userData?.role === 'admin' ? <Navigate to="/admin" replace /> :
          userData?.role === 'rider' ? <Navigate to="/rider" replace /> :
          <Navigate to="/order" replace />
        ) : <Navigate to="/login" replace />
      } />

      {/* Fallback กรณีพิมพ์ URL ผิด */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

const styles = {
  loaderContainer: { backgroundColor: '#000', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' },
  loaderText: { color: '#ff6600', fontWeight: 'bold', fontSize: '24px', letterSpacing: '2px' },
  waitingContainer: { backgroundColor: '#000', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#fff', textAlign: 'center', padding: '20px' },
  logoutMiniBtn: { marginTop: '30px', background: 'none', border: '1px solid #333', color: '#666', padding: '10px 25px', borderRadius: '20px', cursor: 'pointer' }
};

export default App;
