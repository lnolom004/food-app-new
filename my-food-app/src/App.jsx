import React, { useState, useEffect } from 'react';
import { supabase } from './supabase.jsx'; 
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

// --- 🛡️ นำเข้าหน้าต่างๆ (เช็คชื่อไฟล์ให้ตรงตามเครื่องนายนะ) ---
import Login from './Login.jsx'; 
import Register from './Register.jsx';
import AdminDashboard from './admin.jsx';   
import OrderFood from './orderFood.jsx';     
import RiderDashboard from './rider.jsx';   
import MyOrders from './myorders.jsx';      
import Chat from './chat.jsx'; // 👈 1. เพิ่มการนำเข้าไฟล์แชทตรงนี้!

export default function App() {
    const [user, setUser] = useState(null);
    const [role, setRole] = useState(null);
    const [isApproved, setIsApproved] = useState(false);
    const [loading, setLoading] = useState(true);

    // 1️⃣ ฟังก์ชันเช็คสิทธิ์ (Role Check)
    const checkUserRole = async (sessionUser) => {
        if (!sessionUser) {
            setRole(null);
            setLoading(false);
            return;
        }
        try {
            const { data, error } = await supabase
                .from('users')
                .select('role, is_approved')
                .eq('id', sessionUser.id)
                .single();
            
            if (data) {
                setRole(data.role); 
                setIsApproved(data.is_approved);
            }
        } catch (e) {
            console.error("Role Check Error:", e);
            setRole('customer'); 
        } finally {
            setLoading(false); 
        }
    };

    // 2️⃣ ฟังก์ชันติดตามสถานะ Login (Auth Listener)
    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            const u = session?.user ?? null;
            setUser(u);
            checkUserRole(u);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            const u = session?.user ?? null;
            setUser(u);
            checkUserRole(u);
        });
        return () => subscription.unsubscribe();
    }, []);

    if (loading) return (
        <div style={{ background: '#000', height: '100vh', color: '#f60', display: 'flex', justifyContent: 'center', alignItems: 'center', fontFamily: 'Kanit' }}>
            <h2>⌛ กำลังยืนยันตัวตน...</h2>
        </div>
    );

    return (
        <>
            <Toaster position="top-center" />
            <Routes>
                {/* --- 🟢 กรณีที่ยังไม่ได้ Login --- */}
                {!user ? (
                    <>
                        <Route path="/login" element={<Login />} />
                        <Route path="/register" element={<Register />} />
                        <Route path="*" element={<Navigate to="/login" replace />} />
                    </>
                ) : (
                    /* --- 🔴 กรณีที่ Login แล้ว --- */
                    <>
                        {/* 🛠️ ส่วนของ ADMIN */}
                        {role === 'admin' && (
                            <Route path="/admin" element={<AdminDashboard />} />
                        )}

                        {/* 🏍️ ส่วนของ RIDER */}
                        {role === 'rider' && (
                            <Route path="/rider" element={
                                isApproved ? <RiderDashboard /> : 
                                <div style={st.lockScreen}>
                                    <h2>⏳ รอแอดมินอนุมัติสิทธิ์ไรเดอร์</h2>
                                    <p>ระบบจะแจ้งให้ทราบเมื่อเข้าใช้งานได้</p>
                                    <button onClick={() => supabase.auth.signOut()} style={st.btnOut}>Logout</button>
                                </div>
                            } />
                        )}

                        {/* 🍴 ส่วนของ CUSTOMER */}
                        {(role === 'customer' || role === 'user') && (
                            <>
                                <Route path="/menu" element={<OrderFood />} />
                                <Route path="/myorders" element={<MyOrders />} /> 
                            </>
                        )}

                        {/* 💬 🌟 2. เพิ่ม Route สำหรับหน้าแชทตรงนี้ เพื่อให้ทุกคนเข้าถึงได้! 🌟 */}
                        <Route path="/chat" element={<Chat />} />
                        
                        {/* 💡 ฟังก์ชัน Auto-Redirect */}
                        <Route path="*" element={
                            <Navigate to={
                                role === 'admin' ? "/admin" : 
                                role === 'rider' ? "/rider" : 
                                "/menu" 
                            } replace />
                        } />
                    </>
                )}
            </Routes>
        </>
    );
}

const st = {
    lockScreen: { padding:'50px', textAlign:'center', background:'#000', color:'#fff', height:'100vh', display:'flex', flexDirection:'column', justifyContent:'center', fontFamily: 'Kanit' },
    btnOut: { marginTop:'20px', background:'#f60', color:'#fff', border:'none', padding:'12px 25px', borderRadius:'10px', cursor:'pointer', fontWeight:'bold' }
};
