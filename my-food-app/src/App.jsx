import React, { useState, useEffect } from 'react';
import { supabase } from './supabase.jsx'; 
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

// 🛡️ นำเข้าไฟล์ (เช็คชื่อไฟล์ให้ตรงตามรูปโครงสร้างที่นายส่งมา: o ตัวเล็ก, m ตัวเล็ก)
import Login from './Login.jsx'; 
import Register from './Register.jsx';
import AdminDashboard from './admin.jsx';   
import OrderFood from './orderFood.jsx';     
import RiderDashboard from './rider.jsx';   
import MyOrders from './myorders.jsx';      

export default function App() {
    const [user, setUser] = useState(null);
    const [role, setRole] = useState(null);
    const [isApproved, setIsApproved] = useState(false);
    const [loading, setLoading] = useState(true);

    // 1. ฟังก์ชันดึงข้อมูลผู้ใช้และ Role จาก Supabase
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
                // เก็บค่า 'customer', 'admin' หรือ 'rider' ตามจริงใน DB
                setRole(data.role);
                setIsApproved(!!data.is_approved);
                console.log("Current User Role:", data.role);
            } else {
                setRole('customer'); // Default ถ้าหาไม่เจอ
            }
        } catch (e) {
            console.error("Auth Error:", e);
            setRole('customer'); 
        } finally {
            setLoading(false); // ✅ สั่งหยุดโหลดเพื่อให้ UI แสดงผล
        }
    };

    // 2. ตรวจจับการเข้าสู่ระบบ
    useEffect(() => {
        const initSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            const u = session?.user ?? null;
            setUser(u);
            if (u) await checkUserRole(u);
            else setLoading(false);
        };
        initSession();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            const u = session?.user ?? null;
            setUser(u);
            if (u) checkUserRole(u);
            else {
                setRole(null);
                setLoading(false);
            }
        });
        return () => subscription.unsubscribe();
    }, []);

    // 3. 🛡️ ป้องกันจอขาวระหว่างรอข้อมูล (ถ้าขึ้นหน้านี้แสดงว่ากำลังโหลด)
    if (loading) return (
        <div style={{ background: '#000', height: '100vh', color: '#f60', display: 'flex', justifyContent: 'center', alignItems: 'center', fontFamily: 'sans-serif' }}>
            <div style={{ textAlign: 'center' }}>
                <h2 style={{ marginBottom: '10px' }}>⌛ ระบบกำลังยืนยันตัวตน...</h2>
                <p style={{ color: '#666' }}>หากค้างหน้านี้นานเกินไป กรุณารีเฟรช</p>
            </div>
        </div>
    );

    return (
        <>
            <Toaster position="top-center" />
            <Routes>
                {/* --- ส่วนที่ยังไม่ได้ LOGIN --- */}
                {!user ? (
                    <>
                        <Route path="/login" element={<Login />} />
                        <Route path="/register" element={<Register />} />
                        <Route path="*" element={<Navigate to="/login" replace />} />
                    </>
                ) : (
                    /* --- ส่วนที่ LOGIN แล้ว --- */
                    <>
                        {/* 🛡️ เส้นทางสำหรับ Admin */}
                        {role === 'admin' && <Route path="/admin" element={<AdminDashboard />} />}
                        
                        {/* 🛡️ เส้นทางสำหรับ Rider */}
                        {role === 'rider' && (
                            <Route path="/rider" element={
                                isApproved ? <RiderDashboard /> : 
                                <div style={{padding:'50px', textAlign:'center', background:'#000', color:'#fff', height:'100vh', display:'flex', flexDirection:'column', justifyContent:'center'}}>
                                    <h2>⏳ บัญชีไรเดอร์รอการอนุมัติ</h2>
                                    <p style={{color:'#888'}}>กรุณารอแอดมินตรวจสอบข้อมูลของท่าน</p>
                                    <button onClick={() => supabase.auth.signOut()} style={{marginTop:'20px', background:'#f60', color:'#fff', border:'none', padding:'12px 24px', borderRadius:'10px', cursor:'pointer', fontWeight:'bold'}}>ออกจากระบบ</button>
                                </div>
                            } />
                        )}
                        
                        {/* 🛡️ เส้นทางสำหรับ Customer (ลูกค้า) */}
                        {role === 'customer' && (
                            <>
                                {/* รองรับทั้งชื่อไฟล์ /orderFood และพาร์ท /menu หรือ /order เพื่อกันจอขาว */}
                                <Route path="/menu" element={<OrderFood />} />
                                <Route path="/order" element={<OrderFood />} /> 
                                <Route path="/orderFood" element={<OrderFood />} /> 
                                <Route path="/myorders" element={<MyOrders />} /> 
                            </>
                        )}
                        
                        {/* 💡 ตัวดักสุดท้าย (Fallback): ถ้าพาร์ทไม่ตรง หรือ Role แปลกๆ ให้ส่งไปหน้าเริ่มต้นที่ปลอดภัยที่สุด */}
                        <Route path="*" element={
                            <Navigate to={
                                role === 'admin' ? "/admin" : 
                                role === 'rider' ? "/rider" : "/menu"
                            } replace />
                        } />
                    </>
                )}
            </Routes>
        </>
    );
}
