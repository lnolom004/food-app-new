import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './supabase'; 

// --- นำเข้าไฟล์หน้าต่างๆ (ตรวจสอบตัวพิมพ์เล็ก-ใหญ่ให้ตรงกับชื่อไฟล์จริง) ---
import OrderFood from './orderFood'; 
import Login from './Login';      
import Register from './Register'; 
import RiderDashboard from './rider'; 
import AdminDashboard from './admin'; 
import Chat from './chat'; 

// 1. ฟังก์ชันกั้นหน้า (Protected Route)
const ProtectedRoute = ({ children, user }) => {
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

function App() {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null); 
  const [loading, setLoading] = useState(true);

  // 2. ฟังก์ชันดึงข้อมูลผู้ใช้ (ปรับปรุงให้ไม่ค้าง)
  const fetchUserInfo = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('role, is_approved')
        .eq('id', userId)
        .maybeSingle(); // ใช้ maybeSingle แทน single เพื่อไม่ให้ Error หากหาข้อมูลไม่เจอ
      
      if (error) throw error;
      setUserData(data);
    } catch (err) {
      console.error("Auth Error:", err.message);
      setUserData(null);
    } finally {
      // **จุดสำคัญที่สุด: ต้องสั่งปิด Loading ไม่ว่าจะดึงข้อมูลสำเร็จหรือไม่**
      setLoading(false); 
    }
  };

  useEffect(() => {
    // ตรวจสอบเซสชันเริ่มต้น
    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          setUser(session.user);
          await fetchUserInfo(session.user.id);
        } else {
          setLoading(false); // ถ้าไม่มีคนล็อกอิน ให้เข้าหน้า Login ได้เลย
        }
      } catch (err) {
        setLoading(false);
      }
    };

    initAuth();

    // ฟังการเปลี่ยนแปลงสถานะ (Login / Logout)
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

    return () => {
      if (authListener) authListener.subscription.unsubscribe();
    };
  }, []);

  // หน้า Loading ระหว่างรอฐานข้อมูล (ดีไซน์ Dark Mode)
  if (loading) return (
    <div style={{ backgroundColor: '#000', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: '#ff6600', fontWeight: 'bold', fontSize: '20px', textAlign: 'center' }}>
        <div style={{ fontSize: '40px', marginBottom: '15px' }}>🍔</div>
        <div className="animate-pulse" style={{ letterSpacing: '2px' }}>FOODAPP PRO LOADING...</div>
      </div>
    </div>
  );

  return (
    <Router>
      <Routes>
        {/* --- ส่วนของ Login & Register --- */}
        <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
        <Route path="/register" element={user ? <Navigate to="/" replace /> : <Register />} />

        {/* --- หน้าสั่งอาหาร (Customer) --- */}
        <Route path="/order" element={
          <ProtectedRoute user={user}>
            <OrderFood />
          </ProtectedRoute>
        } />

        {/* --- หน้าไรเดอร์ (Rider) + ระบบเช็คการอนุมัติ --- */}
        <Route path="/rider" element={
          <ProtectedRoute user={user}>
            {userData?.role === 'rider' && !userData.is_approved ? (
              <div style={{ backgroundColor: '#000', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#fff', textAlign: 'center', padding: '20px' }}>
                <span style={{ fontSize: '60px' }}>🛵</span>
                <h2 style={{ color: '#ff6600', fontSize: '28px', marginTop: '20px', fontWeight: '900' }}>รอการยืนยันบัญชี</h2>
                <p style={{ color: '#888', marginTop: '10px' }}>แอดมินกำลังตรวจสอบข้อมูลไรเดอร์ของคุณอยู่ครับ</p>
                <button 
                  onClick={() => supabase.auth.signOut()} 
                  style={{ marginTop: '30px', background: 'none', border: 'none', color: '#666', textDecoration: 'underline', cursor: 'pointer' }}
                >
                  ออกจากระบบ
                </button>
              </div>
            ) : (
              <RiderDashboard />
            )}
          </ProtectedRoute>
        } />

        {/* --- หน้าแอดมิน (Admin) --- */}
        <Route path="/admin" element={
          <ProtectedRoute user={user}>
            <AdminDashboard />
          </ProtectedRoute>
        } />

        {/* --- หน้าแชท (Chat) รองรับ orderId --- */}
        <Route path="/chat/:orderId" element={
          <ProtectedRoute user={user}>
            <Chat />
          </ProtectedRoute>
        } />

        {/* --- การจัดเส้นทางหน้าแรก (Auto Redirect ตาม Role) --- */}
        <Route path="/" element={
          user ? (
            userData?.role === 'rider' ? <Navigate to="/rider" replace /> :
            userData?.role === 'admin' ? <Navigate to="/admin" replace /> :
            <Navigate to="/order" replace />
          ) : (
            <Navigate to="/login" replace />
          )
        } />

        {/* กันเหนียว: พิมพ์มั่วให้กลับหน้าแรก */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
