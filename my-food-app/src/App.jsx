import React, { useState, useEffect } from 'react';
import { supabase } from './supabase.jsx'; 
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

// 🛡️ เช็คตัวพิมพ์เล็ก-ใหญ่ให้ตรงกับที่ปรากฏในเครื่องเป๊ะๆ
import Login from './Login.jsx'; 
import Register from './Register.jsx';
import AdminDashboard from './admin.jsx';   
import OrderFood from './orderFood.jsx'; // o ตัวเล็ก
import RiderDashboard from './rider.jsx';   
import MyOrders from './myorders.jsx';   // m ตัวเล็ก

export default function App() {
    const [user, setUser] = useState(null);
    const [role, setRole] = useState(null);
    const [loading, setLoading] = useState(true);

    const checkUserRole = async (sessionUser) => {
        try {
            if (!sessionUser) throw new Error("No user");
            const { data, error } = await supabase
                .from('users')
                .select('role')
                .eq('id', sessionUser.id)
                .single();
            
            if (data) {
                setRole(data.role);
            } else {
                setRole('customer'); 
            }
        } catch (e) {
            console.error("Auth error:", e);
            setRole('customer');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // ใช้ getUser() แทน getSession() เพื่อความชัวร์บน Vercel
        const init = async () => {
            const { data: { user: currentUser } } = await supabase.auth.getUser();
            setUser(currentUser);
            if (currentUser) {
                await checkUserRole(currentUser);
            } else {
                setLoading(false);
            }
        };
        init();

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

    // 🛡️ ถ้ายังขาว ให้เอา Loading ออกชั่วคราวเพื่อหาจุดเสีย
    if (loading) return (
        <div style={{ background: '#000', height: '100vh', color: '#f60', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <h2>⌛ ระบบกำลังยืนยันตัวตน...</h2>
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
                        {role === 'rider' && <Route path="/rider" element={<RiderDashboard />} />}
                        
                        {/* 🛡️ รองรับทุกลิ้งค์เพื่อให้เข้าหน้าเมนูได้ชัวร์ */}
                        {role === 'customer' && (
                            <>
                                <Route path="/menu" element={<OrderFood />} />
                                <Route path="/order" element={<OrderFood />} /> 
                                <Route path="/myorders" element={<MyOrders />} /> 
                            </>
                        )}
                        
                        {/* 💡 ตัวดักสุดท้าย ถ้าหา Path ไม่เจอ ให้ส่งไป Login เสมอ กันจอขาว */}
                        <Route path="*" element={<Navigate to="/login" replace />} />
                    </>
                )}
            </Routes>
        </>
    );
}
