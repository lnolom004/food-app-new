import React, { useState, useEffect } from 'react';
import { supabase } from './supabase.jsx'; 
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

// 🛡️ เช็คชื่อไฟล์ให้เป็นตัวเล็กตามที่ปรากฏใน Folder ของนายเป๊ะๆ
import Login from './Login.jsx'; 
import Register from './Register.jsx';
import AdminDashboard from './admin.jsx';   
import OrderFood from './orderFood.jsx'; // o ตัวเล็ก    
import RiderDashboard from './rider.jsx';   
import MyOrders from './myorders.jsx'; // m ตัวเล็ก     

export default function App() {
    const [user, setUser] = useState(null);
    const [role, setRole] = useState(null);
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
                .select('role')
                .eq('id', sessionUser.id)
                .single();
            
            if (data) {
                setRole(data.role); // จะได้ค่า 'customer' จาก DB ของนาย
            } else {
                setRole('customer'); // Default ป้องกันจอขาว
            }
        } catch (e) {
            console.error("Role Error:", e);
            setRole('customer'); 
        } finally {
            setLoading(false); // ✅ สั่งหยุดโหลดแน่นอน
        }
    };

    useEffect(() => {
        const init = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            const u = session?.user ?? null;
            setUser(u);
            if (u) await checkUserRole(u);
            else setLoading(false);
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

    // 🛡️ ถ้ายังขาวโพลน ให้ลองเอา block นี้ออกชั่วคราวเพื่อดู Error จริง
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
                        
                        {/* 🛡️ รองรับทั้งพาร์ท /menu และ /order เพื่อกันเหนื่อย */}
                        {role === 'customer' && (
                            <>
                                <Route path="/menu" element={<OrderFood />} />
                                <Route path="/order" element={<OrderFood />} /> 
                                <Route path="/myorders" element={<MyOrders />} /> 
                            </>
                        )}
                        
                        {/* 💡 ตัวดักหน้าว่าง (Fallback): ถ้าหาไม่เจอ ให้ส่งไปหน้าเริ่มต้นตามสิทธิ์ */}
                        <Route path="*" element={<Navigate to={role === 'admin' ? "/admin" : role === 'rider' ? "/rider" : "/menu"} replace />} />
                    </>
                )}
            </Routes>
        </>
    );
}
