import React, { useState, useEffect } from 'react';
import { supabase } from './supabase'; 
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

// --- นำเข้าหน้าต่างๆ (ตรวจสอบชื่อไฟล์ให้ตรงกับในเครื่องนายนะเพื่อน) ---
import Login from './Login'; 
import Register from './Register';
import AdminDashboard from './admin'; 
import OrderFood from './orderFood'; 
import RiderDashboard from './rider';

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
            const { data } = await supabase
                .from('users')
                .select('role, is_approved')
                .eq('id', sessionUser.id)
                .single();
            
            if (data) {
                setRole(data.role);
                setIsApproved(data.is_approved);
            }
        } catch (e) {
            setRole('user'); // กรณี Error ให้เป็น user ไว้ก่อน
        }
        setLoading(false);
    };

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
            <h2>⌛ ระบบกำลังนำทาง...</h2>
        </div>
    );

    return (
        <>
            <Toaster position="top-center" />
            <Routes>
                {!user ? (
                    /* --- 🛡️ ฝั่งคนที่ยังไม่ล็อกอิน --- */
                    <>
                        <Route path="/login" element={<Login />} />
                        <Route path="/register" element={<Register />} />
                        <Route path="*" element={<Navigate to="/login" />} />
                    </>
                ) : (
                    /* --- 🔑 ฝั่งคนที่ล็อกอินแล้ว (แยกตามหน้าที่) --- */
                    <>
                        {/* 1. ทางไปหน้าแอดมิน */}
                        {role === 'admin' && (
                            <Route path="/admin" element={<AdminDashboard />} />
                        )}

                        {/* 2. ทางไปหน้าไรเดอร์ (ถ้าแอดมินยังไม่ถูกอนุมัติจะเข้าไม่ได้) */}
                        {role === 'rider' && (
                            <Route path="/rider" element={
                                isApproved ? <RiderDashboard /> : 
                                <div style={{padding:'50px', textAlign:'center', background:'#000', color:'#fff', height:'100vh'}}>
                                    <h2>⏳ รอแอดมินอนุมัติการสมัคร</h2>
                                    <button onClick={() => supabase.auth.signOut()} style={{marginTop:'20px'}}>Logout</button>
                                </div>
                            } />
                        )}

                        {/* 3. ทางไปหน้าสั่งอาหาร (User) */}
                        {role === 'user' && (
                            <Route path="/menu" element={<OrderFood />} />
                        )}

                        {/* 💡 ตัว Redirect อัตโนมัติ: ล็อกอินแล้วต้องไปที่หน้าของตัวเองเท่านั้น */}
                        <Route path="*" element={
                            <Navigate to={role === 'admin' ? "/admin" : role === 'rider' ? "/rider" : "/menu"} />
                        } />
                    </>
                )}
            </Routes>
        </>
    );
}
