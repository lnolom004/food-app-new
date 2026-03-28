import React, { useState, useEffect } from 'react';
import { supabase } from './supabase.jsx'; 
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

// 🛡️ แก้ไขการ Import ให้ตรงตามชื่อไฟล์ในรูปเป๊ะๆ
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
                {!user ? (
                    <>
                        <Route path="/login" element={<Login />} />
                        <Route path="/register" element={<Register />} />
                        <Route path="*" element={<Navigate to="/login" replace />} />
                    </>
                ) : (
                    <>
                        {role === 'admin' && <Route path="/admin" element={<AdminDashboard />} />}
                        
                        {role === 'rider' && (
                            <Route path="/rider" element={
                                isApproved ? <RiderDashboard /> : 
                                <div style={{padding:'50px', textAlign:'center', background:'#000', color:'#fff', height:'100vh', display:'flex', flexDirection:'column', justifyContent:'center'}}>
                                    <h2>⏳ รอแอดมินอนุมัติ</h2>
                                    <button onClick={() => supabase.auth.signOut()} style={{marginTop:'20px', background:'#f60', color:'#fff', border:'none', padding:'10px 20px', borderRadius:'10px', cursor:'pointer'}}>Logout</button>
                                </div>
                            } />
                        )}
                        
                        {role === 'customer' && (
                            <>
                                {/* 💡 รองรับทุกลิ้งค์เพื่อให้เข้าหน้าเมนูได้ชัวร์ */}
                                <Route path="/menu" element={<OrderFood />} />
                                <Route path="/order" element={<OrderFood />} /> 
                                <Route path="/myorders" element={<MyOrders />} /> 
                            </>
                        )}
                        
                        {/* 💡 ตัวดักสุดท้าย ถ้าล็อคอินแล้วแต่ไปไหนไม่ถูก ให้ส่งไปหน้าเริ่มต้นตามสิทธิ์ */}
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
