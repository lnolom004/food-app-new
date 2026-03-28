import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabase.jsx'; 
import { useNavigate } from 'react-router-dom';
import { toast, Toaster } from 'react-hot-toast';

const OrderFood = () => {
    const [menus, setMenus] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    const fetchMenus = useCallback(async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase.from('menus').select('*');
            if (error) throw error;
            setMenus(data || []);
        } catch (error) {
            console.error("Menus Fetch Error:", error);
            toast.error("โหลดข้อมูลเมนูไม่สำเร็จ");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchMenus();
    }, [fetchMenus]);

    if (loading) return (
        <div style={{ background: '#000', height: '100vh', color: '#f60', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <h2>⌛ กำลังโหลดรายการอาหาร...</h2>
        </div>
    );

    return (
        <div style={{ background: '#000', color: '#fff', minHeight: '100vh', padding: '20px', fontFamily: 'sans-serif' }}>
            <Toaster position="top-center" />
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ color: '#f60', margin: 0 }}>🍴 FOODAPP 2026</h2>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={() => navigate('/myorders')} style={{ background: '#222', border: 'none', color: '#fff', padding: '5px 15px', borderRadius: '10px', cursor: 'pointer' }}>รายการสั่งซื้อ</button>
                    <button onClick={() => supabase.auth.signOut()} style={{ background: '#222', border: 'none', color: '#fff', padding: '5px 15px', borderRadius: '10px', cursor: 'pointer' }}>Logout</button>
                </div>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '15px' }}>
                {/* 🛡️ ใช้ Optional Chaining ?. เพื่อป้องกันจอขาวถ้าฟิลด์ใน DB เป็น NULL */}
                {menus?.length > 0 ? (
                    menus.map(f => (
                        <div key={f.id} style={{ background: '#111', borderRadius: '15px', overflow: 'hidden', border: '1px solid #222', padding: '10px' }}>
                            <img src={f?.image_url || 'https://via.placeholder.com'} alt={f?.name} style={{ width: '100%', height: '120px', objectFit: 'cover', borderRadius: '10px' }} />
                            <div style={{ marginTop: '10px' }}>
                                <b style={{ fontSize: '16px' }}>{f?.name || 'ไม่มีชื่อสินค้า'}</b>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '5px' }}>
                                    <span style={{ color: '#f60', fontWeight: 'bold' }}>฿{f?.price || 0}</span>
                                    <button style={{ background: '#f60', color: '#fff', border: 'none', width: '30px', height: '30px', borderRadius: '50%', cursor: 'pointer' }}>+</button>
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <p style={{ gridColumn: '1/-1', textAlign: 'center', color: '#888' }}>ไม่พบรายการอาหารในขณะนี้</p>
                )}
            </div>
        </div>
    );
};

export default OrderFood;
