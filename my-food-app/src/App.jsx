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

// ============================================================
// 1. ระบบกั้นหน้าอัจฉริยะ (Enhanced Protected Route)
// ============================================================
const ProtectedRoute = ({ children, user, userData, allowedRole }) => {
  // ถ้ายังไม่ได้ Login ให้ไปหน้า Login
  if (!user) return <Navigate to="/login" replace />;

  // ถ้าเป็นหน้าเฉพาะทาง (Admin/Rider) แต่ Role ไม่ตรง ให้ดีดกลับหน้าแรกของเขา
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
  // 2. ฟังก์ชันดึงข้อมูล Profile (Memoized เพื่อประสิทธิภาพ)
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
  // 3. ระบบติดตามสถานะผู้ใช้ (Single Source of Truth)
  // ============================================================
  useEffect(() => {
    // เช็ค Session ปัจจุบัน
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

    // ฟังการเปลี่ยนแปลงสถานะ (Login / Logout / Token Expired)
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

  // ============================================================
  // 4. ส่วนการแสดงผล Loading (Dark Mode UI)
  // ============================================================
  if (loading) return (
    <div style={styles.loaderContainer}>
      <div style={styles.loaderText} className="animate-pulse">
        🍔 FOODAPP PRO <span style={{ color: '#fff' }}>SYSTEM</span>
      </div>
      <small style={{ color: '#444', marginTop: '10px' }}>กำลังตรวจสอบสิทธิ์การเข้าถึง...</small>
    </div>
  );

  return (
    <Routes>
      {/* --- เส้นทางสาธารณะ (Public) --- */}
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/register" element={user ? <Navigate to="/" replace /> : <Register />} />

      {/* --- หน้าสั่งอาหาร (Customer Only) --- */}
      <Route path="/order" element={
        <ProtectedRoute user={user} userData={userData} allowedRole="customer">
          <OrderFood />
        </ProtectedRoute>
      } />

      {/* --- หน้าแอดมิน (Admin Only) --- */}
      <Route path="/admin" element={
        <ProtectedRoute user={user} userData={userData} allowedRole="admin">
          <AdminDashboard />
        </ProtectedRoute>
      } />

      {/* --- หน้าไรเดอร์ (Rider Only + ระบบอนุมัติ) --- */}
      <Route path="/rider" element={
        <ProtectedRoute user={user} userData={userData} allowedRole="rider">
          {userData?.is_approved ? (
            <RiderDashboard />
          ) : (
            <div style={styles.waitingContainer}>
              <h1 style={{ fontSize: '60px' }}>🛵</h1>
              <h2 style={{ color: '#ff6600' }}>รอการอนุมัติ</h2>
              <p style={{ color: '#888' }}>บัญชีไรเดอร์ของคุณอยู่ระหว่างตรวจสอบจากแอดมิน</p>
              <button onClick={() => supabase.auth.signOut()} style={styles.logoutMiniBtn}>ออกจากระบบ</button>
            </div>
          )}
        </ProtectedRoute>
      } />

      {/* --- หน้าแชท (เข้าได้ทุกคนที่ล็อกอิน) --- */}
      <Route path="/chat/:orderId" element={
        <ProtectedRoute user={user}>
          <Chat />
        </ProtectedRoute>
      } />

      {/* --- ระบบนำทางอัจฉริยะ (Smart Redirection) --- */}
      <Route path="/" element={
        user ? (
          userData?.role === 'admin' ? <Navigate to="/admin" replace /> :
          userData?.role === 'rider' ? <Navigate to="/rider" replace /> :
          <Navigate to="/order" replace />
        ) : <Navigate to="/login" replace />
      } />

      {/* กรณีพิมพ์ URL มั่ว */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

// --- Inline Styles สำหรับความลื่นไหล ---
const styles = {
  loaderContainer: { backgroundColor: '#000', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' },
  loaderText: { color: '#ff6600', fontWeight: '900', fontSize: '24px', letterSpacing: '3px' },
  waitingContainer: { backgroundColor: '#000', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#fff', textAlign: 'center', padding: '20px' },
  logoutMiniBtn: { marginTop: '30px', background: 'none', border: '1px solid #333', color: '#666', padding: '8px 20px', borderRadius: '20px', cursor: 'pointer' }
};

export default App;
