import React, { useState, useEffect } from 'react';
import { supabase } from './supabase.jsx'; 
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

// --- 🛡️ นำเข้าไฟล์หน้าต่างๆ (เช็คตัวเล็ก-ใหญ่ให้ตรงกับชื่อไฟล์จริงด้วยนะครับ) ---
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

    // ฟังก์ชันตรวจสอบสิทธิ์และข้อมูลผู้ใช้จากตาราง users
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
                // เก็บค่า Role ตรงๆ จาก DB (เช่น 'customer', 'admin', 'rider')
                setRole(data.role);
                setIsApproved(!!data.is_approved);
            } else {
                // ถ้าไม่พบข้อมูลในตาราง users ให้กำหนดเป็น customer ไว้ก่อน
                setRole('customer');
            }
        } catch (e) {
            console.error("Auth Error:", e);
            setRole('customer'); 
        } finally {
            setLoading(false); 
        }
    };

    useEffect(() => {
        // ตรวจสอบ Session เมื่อเปิดแอปครั้งแรก
        const initSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            const u = session?.user ?? null;
            setUser(u);
            if (u) {
                await checkUserRole(u);
            } else {
                setLoading(false);
            }
        };

        initSession();

        // ตรวจจับการเปลี่ยนแปลงสถานะการเข้าสู่ระบบ
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            const u = session?.user ?? null;
            setUser(u);
            if (u) {
                checkUserRole(u);
            } else {
                setRole(null);
                setLoading(false);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    // 🛡️ ส่วนป้องกันหน้าขาวระหว่างตรวจสอบข้อมูล
    if (loading) return (
        <div style={{ background: '#000', height: '100vh', color: '#f60', display: 'flex', justifyContent: 'center', alignItems: 'center', fontFamily: 'sans-serif' }}>
            <div style={{ textAlign: 'center' }}>
                <h2>⌛ กำลังยืนยันตัวตน...</h2>
                <p style={{ color: '#666' }}>กรุณารอสักครู่</p>
            </div>
        </div>
    );

    return (
        <>
            <Toaster position="top-center" />
            <Routes>
                {/* 1. กรณีที่ยังไม่ได้ Login */}
                {!user ? (
                    <>
                        <Route path="/login" element={<Login />} />
                        <Route path="/register" element={<Register />} />
                        <Route path="*" element={<Navigate to="/login" replace />} />
                    </>
                ) : (
                    <>
                        {/* 2. กรณี Login แล้ว - แยกหน้าตาม Role */}
                        
                        {/* Role: แอดมิน */}
                        {role === 'admin' && <Route path="/admin" element={<AdminDashboard />} />}
                        
                        {/* Role: ไรเดอร์ */}
                        {role === 'rider' && (
                            <Route path="/rider" element={
                                isApproved ? <RiderDashboard /> : 
                                <div style={{padding:'50px', textAlign:'center', background:'#000', color:'#fff', height:'100vh', display:'flex', flexDirection:'column', justifyContent:'center'}}>
                                    <h2>⏳ รอแอดมินอนุมัติ</h2>
                                    <p>บัญชีของคุณอยู่ระหว่างการตรวจสอบข้อมูล</p>
                                    <button onClick={() => supabase.auth.signOut()} style={{marginTop:'20px', background:'#f60', color:'#fff', border:'none', padding:'10px 20px', borderRadius:'10px', cursor:'pointer'}}>Logout</button>
                                </div>
                            } />
                        )}
                        
                        {/* Role: ลูกค้า (ใช้คำว่า customer ตาม Database ของคุณ) */}
                        {role === 'customer' && (
                            <>
                                <Route path="/menu" element={<OrderFood />} />
                                <Route path="/order" element={<OrderFood />} /> {/* รองรับ Path /order ที่ติดปัญหา */}
                                <Route path="/myorders" element={<MyOrders />} /> 
                            </>
                        )}
                        
                        {/* 3. Fallback Route: ถ้าไม่มีหน้าไหนตรงเลย ให้ส่งไปหน้าเริ่มต้นตามสิทธิ์ */}
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
