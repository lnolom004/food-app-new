import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabase.jsx'; 
import { useNavigate } from 'react-router-dom';
import { toast, Toaster } from 'react-hot-toast';

const OrderFood = () => {
    const [menus, setMenus] = useState([]);
    const [cart, setCart] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    const fetchMenus = useCallback(async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase.from('menus').select('*');
            if (error) throw error;
            setMenus(data || []);
        } catch (error) {
            toast.error("โหลดเมนูไม่สำเร็จ");
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
        <div style={{ background: '#000', color: '#fff', minHeight: '100vh', padding: '20px' }}>
            <Toaster position="top-center" />
            <header style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                <h2 style={{ color: '#f60' }}>🍴 FOODAPP 2026</h2>
                <button onClick={() => supabase.auth.signOut()} style={{ background: '#222', color: '#fff', border: 'none', padding: '5px 15px', borderRadius: '10px', cursor: 'pointer' }}>Logout</button>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '15px' }}>
                {/* 🛡️ ใช้เครื่องหมาย ?. เพื่อกันจอขาวถ้าข้อมูลเป็นค่าว่าง */}
                {menus?.map(f => (
                    <div key={f.id} style={{ background: '#111', borderRadius: '15px', overflow: 'hidden', border: '1px solid #222', padding: '10px' }}>
                        <img src={f?.image_url || 'https://via.placeholder.com'} alt={f?.name} style={{ width: '100%', height: '100px', objectFit: 'cover' }} />
                        <div style={{ marginTop: '10px' }}>
                            <b>{f?.name}</b>
                            <p style={{ color: '#f60' }}>฿{f?.price}</p>
                        </div>
                    </div>
                ))}
            </div>
            {menus.length === 0 && <p style={{ textAlign: 'center', color: '#888' }}>ยังไม่มีรายการอาหาร</p>}
        </div>
    );
};

export default OrderFood;
