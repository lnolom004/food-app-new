import React, { useState } from 'react';
import { supabase } from './supabase.jsx'; 
import { useNavigate } from 'react-router-dom';
import { toast, Toaster } from 'react-hot-toast';

const OrderFood = () => {
    const navigate = useNavigate();

    // ข้อมูลจำลอง (Mock Data) เพื่อให้หน้าจอไม่ว่างเปล่าตอนเริ่ม
    const mockMenus = [
        { id: 1, name: 'ข้าวกะเพราไก่', price: 50, image_url: 'https://via.placeholder.com' },
        { id: 2, name: 'ข้าวผัดหมู', price: 45, image_url: 'https://via.placeholder.com' },
        { id: 3, name: 'น้ำเปล่า', price: 10, image_url: 'https://via.placeholder.com' }
    ];

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate('/login');
    };

    return (
        <div style={{ background: '#000', color: '#fff', minHeight: '100vh', padding: '20px', fontFamily: 'sans-serif' }}>
            <Toaster position="top-center" />
            
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                <h2 style={{ color: '#f60', margin: 0 }}>🍴 FOODAPP 2026</h2>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={() => navigate('/myorders')} style={{ background: '#222', border: 'none', color: '#fff', padding: '8px 15px', borderRadius: '10px', cursor: 'pointer' }}>ประวัติการสั่ง</button>
                    <button onClick={handleLogout} style={{ background: '#f44336', border: 'none', color: '#fff', padding: '8px 15px', borderRadius: '10px', cursor: 'pointer' }}>Logout</button>
                </div>
            </header>

            <div style={{ textAlign: 'center', marginBottom: '30px', padding: '40px', background: '#111', borderRadius: '20px', border: '1px solid #333' }}>
                <h1 style={{ color: '#f60' }}>ยินดีต้อนรับสู่หน้าร้านค้า!</h1>
                <p style={{ color: '#888' }}>ขณะนี้ระบบเชื่อมต่อสำเร็จแล้ว แต่ยังไม่มีรายการอาหารจริงแสดงผล</p>
            </div>

            {/* แสดงรายการอาหารจำลองเพื่อเช็คว่าหน้าจอทำงานได้ */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '15px' }}>
                {mockMenus.map(f => (
                    <div key={f.id} style={{ background: '#111', borderRadius: '15px', overflow: 'hidden', border: '1px solid #222', padding: '10px' }}>
                        <img src={f.image_url} alt={f.name} style={{ width: '100%', height: '100px', objectFit: 'cover', borderRadius: '10px' }} />
                        <div style={{ marginTop: '10px' }}>
                            <b style={{ fontSize: '14px' }}>{f.name}</b>
                            <p style={{ color: '#f60', margin: '5px 0' }}>฿{f.price}</p>
                            <button onClick={() => toast.success("เพิ่มลงตะกร้า (ตัวอย่าง)")} style={{ width: '100%', background: '#f60', border: 'none', color: '#fff', padding: '5px', borderRadius: '5px', cursor: 'pointer' }}>เพิ่มลงตะกร้า</button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default OrderFood;
