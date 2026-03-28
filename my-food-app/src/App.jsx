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
    const [loading, setLoading] = useState(true);

    const checkUserRole = async (sessionUser) => {
        if (!sessionUser) { setLoading(false); return; }
        try {
            const { data } = await supabase.from('users').select('role').eq('id', sessionUser.id).single();
            setRole(data?.role || 'customer');
        } catch (e) { setRole('customer'); }
        finally { setLoading(false); }
    };

    useEffect(() => {
        const init = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            setUser(session?.user ?? null);
            if (session?.user) await checkUserRole(session.user);
            else setLoading(false);
        };
        init();
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
            if (session?.user) checkUserRole(session.user);
            else { setRole(null); setLoading(false); }
        });
        return () => subscription.unsubscribe();
    }, []);

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
                        {role === 'customer' && (
                            <>
                                <Route path="/menu" element={<OrderFood />} />
                                <Route path="/order" element={<OrderFood />} /> 
                                <Route path="/myorders" element={<MyOrders />} /> 
                            </>
                        )}
                        <Route path="*" element={<Navigate to="/menu" replace />} />
                    </>
                )}
            </Routes>
        </>
    );
}
