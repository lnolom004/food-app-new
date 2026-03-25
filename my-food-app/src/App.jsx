import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './supabase'; // s ตัวเล็ก ตามโครงสร้างไฟล์คุณ

// --- ส่วนการนำเข้าไฟล์หน้าต่างๆ (Case Sensitive ตรงตามโฟลเดอร์คุณเป๊ะ) ---
import OrderFood from './orderFood'; // o ตัวเล็ก
import Login from './Login';      // L ตัวใหญ่
import Register from './Register'; // R ตัวใหญ่
import RiderDashboard from './rider'; // r ตัวเล็ก
import AdminDashboard from './admin'; // a ตัวเล็ก

// ============================================================
// 1. ฟังก์ชันกั้นหน้า (Protected Route)
// ทำหน้าที่: ถ้ายังไม่ล็อกอิน จะดีดกลับไปหน้า Login ทันที
// ============================================================
const ProtectedRoute = ({ children, user }) => {
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

function App() {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null); // เก็บข้อมูล role และ is_approved
  const [loading, setLoading] = useState(true);

  // ============================================================
  // 2. ฟังก์ชันตรวจสอบสถานะผู้ใช้ (Auth Observer)
  // ทำหน้าที่: เช็คว่าใครล็อกอินอยู่ และมีสิทธิ์ระดับไหน (Customer/Rider/Admin)
  // ============================================================
  useEffect(() => {
    // เช็คเซสชันตอนเปิดแอปครั้งแรก
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setUser(session.user);
        await fetchUserInfo(session.user.id);
      }
      setLoading(false);
    };

    checkUser();

    // ฟังการเปลี่ยนแปลงสถานะ (Login / Logout)
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        setUser(session.user);
        await fetchUserInfo(session.user.id);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setUserData(null);
      }
    });

    return () => authListener.subscription.unsubscribe();
  }, []);

  // ฟังก์ชันดึงข้อมูล role จากตาราง users (ที่เราสร้างไว้ใน Database)
  const fetchUserInfo = async (userId) => {
    const { data } = await supabase
      .from('users')
      .select('role, is_approved')
      .eq('id', userId)
      .single();
    setUserData(data);
  };

  // แสดงหน้า Loading ขณะตรวจสอบข้อมูล
  if (loading) return (
    <div className="bg-black min-h-screen flex items-center justify-center text-orange-500 font-black tracking-widest animate-pulse">
      SYSTEM LOADING...
    </div>
  );

  return (
    <Router>
      <Routes>
        {/* ============================================================
            3. การจัดการเส้นทาง (Routing Logic)
        ============================================================ */}

        {/* หน้า Login & Register: ถ้าล็อกอินแล้ว ให้ดีดไปหน้าสั่งอาหารทันที */}
        <Route path="/login" element={user ? <Navigate to="/order" /> : <Login />} />
        <Route path="/register" element={user ? <Navigate to="/order" /> : <Register />} />

        {/* หน้าสั่งอาหาร: ต้องล็อกอินก่อน (ProtectedRoute) */}
        <Route path="/order" element={
          <ProtectedRoute user={user}>
            <OrderFood />
          </ProtectedRoute>
        } />

        {/* หน้าไรเดอร์: ต้องล็อกอิน และมีการเช็คสถานะการอนุมัติ (is_approved) */}
        <Route path="/rider" element={
          <ProtectedRoute user={user}>
            {/* ถ้าเป็นไรเดอร์แต่ยังไม่อนุมัติ ให้แสดงข้อความเตือน (หรือสร้างหน้า WaitingPage แยก) */}
            {userData?.role === 'rider' && !userData.is_approved ? (
              <div className="bg-black min-h-screen flex flex-col items-center justify-center p-8 text-center">
                <h1 className="text-4xl mb-4">🛵</h1>
                <h2 className="text-orange-500 text-2xl font-black mb-2">รอการยืนยันบัญชี</h2>
                <p className="text-gray-500">แอดมินกำลังตรวจสอบข้อมูลของคุณ โปรดเข้าตรวจสอบอีกครั้งภายหลังครับ</p>
                <button onClick={() => supabase.auth.signOut()} className="mt-8 text-gray-700 underline">ออกจากระบบ</button>
              </div>
            ) : (
              <RiderDashboard />
            )}
          </ProtectedRoute>
        } />

        {/* หน้าแอดมิน: ต้องล็อกอิน (ในอนาคตควรเช็ค role === 'admin' เพิ่ม) */}
        <Route path="/admin" element={
          <ProtectedRoute user={user}>
            <AdminDashboard />
          </ProtectedRoute>
        } />

        {/* หน้าแรกสุด: ถ้าล็อกอินแล้วไปหน้าสั่งอาหาร ถ้ายังไม่ไปหน้า Login */}
        <Route path="/" element={<Navigate to={user ? "/order" : "/login"} />} />
        
        {/* กันเหนียว: ถ้าพิมพ์ URL มั่ว ระบบจะส่งกลับไปหน้าแรก */}
        <Route path="*" element={<Navigate to="/" />} />

      </Routes>
    </Router>
  );
}

export default App;
