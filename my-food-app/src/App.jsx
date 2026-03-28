import React, { useState, useEffect } from 'react';
import { supabase } from './supabase.jsx'; 
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

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
            // ดึงข้อมูล role และ is_approved
            const { data, error } = await supabase
                .from('users')
                .select('role, is_approved')
                .eq('id', sessionUser.id)
                .single();
            
            if (data) {
                setRole(data.role || 'user'); // ถ้า role เป็น null ให้เป็น user ไว้ก่อน
                setIsApproved(!!data.is_approved); // แปลงเป็น boolean (true/false) ชัดเจน
            } else {
                setRole('user'); // กรณีหาไม่เจอในตาราง users ให้ Default เป็น user
            }
        } catch (e) {
            console.error("Error checking role:", e);
            setRole('user'); 
        } finally {
            setLoading(false); 
        }
    };

    useEffect(() => {
        // เช็ค Session ครั้งแรก
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

    if (loading) return (
        <div style={{ background: '#000', height: '100vh', color: '#f60', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <h2>⌛ กำลังยืนยันตัวตน...</h2>
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
                        {/* ถ้าพยายามเข้าหน้าอื่นตอนยังไม่ล็อคอิน ให้เด้งไป Login */}
                        <Route path="*" element={<Navigate to="/login" replace />} />
                    </>
                ) : (
                    <>
                        {/* 🛡️ หน้าสำหรับ Admin */}
                        {role === 'admin' && <Route path="/admin" element={<AdminDashboard />} />}
                        
                        {/* 🛡️ หน้าสำหรับ Rider */}
                        {role === 'rider' && (
                            <Route path="/rider" element={
                                isApproved ? <RiderDashboard /> : 
                                <div style={{padding:'50px', textAlign:'center', background:'#000', color:'#fff', height:'100vh', display:'flex', flexDirection:'column', justifyContent:'center'}}>
                                    <h2>⏳ รอแอดมินอนุมัติการเป็นไรเดอร์</h2>
                                    <p>บัญชีของคุณกำลังรอการตรวจสอบ</p>
                                    <button onClick={() => supabase.auth.signOut()} style={{marginTop:'20px', background:'#f60', color:'#fff', border:'none', padding:'10px 20px', borderRadius:'10px', cursor:'pointer'}}>Logout</button>
                                </div>
                            } />
                        )}
                        
                        {/* 🛡️ หน้าสำหรับ User ทั่วไป */}
                        {role === 'user' && (
                            <>
                                {/* รองรับทั้ง /menu และ /order เพื่อป้องกันจอขาวถ้าลิ้งค์ผิด */}
                                <Route path="/menu" element={<OrderFood />} />
                                <Route path="/order" element={<OrderFood />} /> 
                                <Route path="/myorders" element={<MyOrders />} /> 
                            </>
                        )}
                        
                        {/* 💡 ตัวดักหน้าว่าง: ถ้าหา Path ไม่เจอ ให้ส่งไปหน้าเริ่มต้นตาม Role */}
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
