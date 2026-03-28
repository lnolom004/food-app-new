import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabase'; 
import { toast, Toaster } from 'react-hot-toast';

const AdminDashboard = () => {
    const [activeTab, setActiveTab] = useState('orders'); // orders, menus, riders, history
    const [orders, setOrders] = useState([]);
    const [users, setUsers] = useState([]);
    const [menus, setMenus] = useState([]);
    const [loading, setLoading] = useState(true);

    // ฟอร์มสำหรับเพิ่มเมนูใหม่
    const [newFood, setNewFood] = useState({ name: '', price: '', category: 'อาหาร', image_url: '' });

    // 1. 🔄 ดึงข้อมูลทั้งหมดจาก Database
    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            // ดึงออเดอร์พร้อมข้อมูลลูกค้าและไรเดอร์
            const { data: o } = await supabase.from('orders').select('*, customer:users!user_id(username), rider:users!rider_id(username)').order('created_at', { ascending: false });
            // ดึงผู้ใช้ทั้งหมด
            const { data: u } = await supabase.from('users').select('*').order('created_at', { ascending: false });
            // ดึงเมนูอาหาร
            const { data: m } = await supabase.from('menus').select('*').order('name');

            setOrders(o || []);
            setUsers(u || []);
            setMenus(m || []);
        } catch (error) {
            toast.error("โหลดข้อมูลไม่สำเร็จ");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    // 2. ✅ ฟังก์ชัน "รับออเดอร์" (เปลี่ยนสถานะเพื่อให้ไรเดอร์เห็นงาน)
    const handleAcceptOrder = async (orderId) => {
        const { error } = await supabase
            .from('orders')
            .update({ status: 'shipping' }) // เปลี่ยนจาก pending เป็น shipping
            .eq('id', orderId);

        if (!error) {
            toast.success("รับออเดอร์แล้ว! ไรเดอร์จะเริ่มเห็นงานนี้ทันที");
            fetchData();
        }
    };

    // 3. 🛵 ฟังก์ชัน "อนุมัติไรเดอร์" (Toggle สถานะ is_approved)
    const toggleApproveRider = async (id, currentStatus) => {
        const { error } = await supabase
            .from('users')
            .update({ is_approved: !currentStatus })
            .eq('id', id);

        if (!error) {
            toast.success("อัปเดตสถานะพนักงานสำเร็จ");
            fetchData();
        }
    };

    // 4. 🍴 ฟังก์ชันจัดการเมนู (เพิ่ม/ลบ)
    const handleAddMenu = async () => {
        if (!newFood.name || !newFood.price) return toast.error("กรุณากรอกชื่อและราคา");
        const { error } = await supabase.from('menus').insert([newFood]);
        if (!error) {
            toast.success("เพิ่มเมนูใหม่สำเร็จ!");
            setNewFood({ name: '', price: '', category: 'อาหาร', image_url: '' });
            fetchData();
        }
    };

    const handleDeleteMenu = async (id) => {
        if (window.confirm("ต้องการลบเมนูนี้ใช่ไหม?")) {
            await supabase.from('menus').delete().eq('id', id);
            fetchData();
        }
    };

    if (loading) return <div style={st.loader}>⌛ กำลังเข้าสู่ห้องควบคุม...</div>;

    // คำนวณยอดขายรวม
    const totalSales = orders
        .filter(o => o.status === 'completed')
        .reduce((sum, o) => sum + Number(o.total_price), 0);

    return (
        <div style={st.container}>
            <Toaster position="top-center" />
            <header style={st.header}>
                <h2 style={{ color: '#f60', margin: 0 }}>🏢 ADMIN CONTROL</h2>
                <button onClick={() => supabase.auth.signOut()} style={st.btnOut}>Logout</button>
            </header>

            {/* แถบเมนูควบคุม */}
            <div style={st.tabBar}>
                <button onClick={() => setActiveTab('orders')} style={activeTab === 'orders' ? st.tabAct : st.tab}>📦 จัดการออเดอร์</button>
                <button onClick={() => setActiveTab('menus')} style={activeTab === 'menus' ? st.tabAct : st.tab}>🍴 จัดการเมนู</button>
                <button onClick={() => setActiveTab('riders')} style={activeTab === 'riders' ? st.tabAct : st.tab}>🛵 อนุมัติไรเดอร์</button>
                <button onClick={() => setActiveTab('history')} style={activeTab === 'history' ? st.tabAct : st.tab}>💰 ประวัติการขาย</button>
            </div>

            <main style={{ marginTop: '20px' }}>
                {/* --- 1. หน้าจัดการออเดอร์ --- */}
                {activeTab === 'orders' && (
                    <div style={st.section}>
                        <h4 style={{ color: '#f60' }}>📋 ออเดอร์ใหม่ (Pending)</h4>
                        {orders.filter(o => o.status === 'pending').map(o => (
                            <div key={o.id} style={st.card}>
                                <div style={{ flex: 1 }}>
                                    <b>#{o.id.slice(0, 5)} | ฿{o.total_price}</b>
                                    <p style={{ margin: '5px 0', fontSize: '13px', color: '#888' }}>ลูกค้า: {o.customer?.username}</p>
                                </div>
                                <button onClick={() => handleAcceptOrder(o.id)} style={st.btnMain}>รับออเดอร์</button>
                            </div>
                        ))}
                        {orders.filter(o => o.status === 'pending').length === 0 && <p style={st.empty}>ไม่มีออเดอร์ใหม่</p>}
                    </div>
                )}

                {/* --- 2. หน้าจัดการเมนู --- */}
                {activeTab === 'menus' && (
                    <div style={st.section}>
                        <div style={st.formBox}>
                            <input placeholder="ชื่ออาหาร" value={newFood.name} onChange={e=>setNewFood({...newFood, name: e.target.value})} style={st.input} />
                            <input placeholder="ราคา" type="number" value={newFood.price} onChange={e=>setNewFood({...newFood, price: e.target.value})} style={st.input} />
                            <button onClick={handleAddMenu} style={st.btnMain}>บันทึกเมนูใหม่</button>
                        </div>
                        {menus.map(m => (
                            <div key={m.id} style={st.card}>
                                <span>{m.name} - ฿{m.price}</span>
                                <button onClick={() => handleDeleteMenu(m.id)} style={{ color: 'red', background: 'none', border: 'none', cursor: 'pointer' }}>ลบ</button>
                            </div>
                        ))}
                    </div>
                )}

                {/* --- 3. หน้าอนุมัติเฉพาะพนักงาน/ไรเดอร์ --- */}
                {activeTab === 'riders' && (
                    <div style={st.section}>
                        <h4 style={{ color: '#00ff00' }}>👤 รายชื่อผู้สมัครเป็นไรเดอร์</h4>
                        {users.filter(u => u.role === 'rider').map(u => (
                            <div key={u.id} style={st.card}>
                                <div>
                                    <b style={{ display: 'block' }}>{u.username}</b>
                                    <span style={{ fontSize: '12px', color: '#888' }}>{u.email}</span>
                                </div>
                                <button 
                                    onClick={() => toggleApproveRider(u.id, u.is_approved)}
                                    style={{ ...st.btnMini, background: u.is_approved ? '#444' : '#00c853' }}
                                >
                                    {u.is_approved ? 'ยกเลิกอนุมัติ' : 'อนุมัติไรเดอร์'}
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                {/* --- 4. หน้าประวัติการขาย --- */}
                {activeTab === 'history' && (
                    <div style={st.section}>
                        <div style={st.summary}>
                            <h3 style={{ margin: 0 }}>ยอดขายสะสม: ฿{totalSales.toLocaleString()}</h3>
                        </div>
                        {orders.filter(o => o.status === 'completed').map(o => (
                            <div key={o.id} style={st.card}>
                                <span>ออเดอร์ #{o.id.slice(0,5)} | ฿{o.total_price}</span>
                                <span style={{ fontSize: '12px', color: '#888' }}>พนักงานส่ง: {o.rider?.username || 'N/A'}</span>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
};

const st = {
    container: { background: '#000', color: '#fff', minHeight: '100vh', padding: '20px', fontFamily: 'Kanit, sans-serif' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
    btnOut: { background: '#222', border: 'none', color: '#888', padding: '5px 15px', borderRadius: '20px', cursor: 'pointer' },
    tabBar: { display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '10px' },
    tab: { padding: '10px 20px', background: '#111', border: 'none', color: '#888', borderRadius: '10px', cursor: 'pointer', whiteSpace: 'nowrap' },
    tabAct: { padding: '10px 20px', background: '#f60', border: 'none', color: '#fff', borderRadius: '10px', fontWeight: 'bold' },
    section: { background: '#111', padding: '20px', borderRadius: '20px', border: '1px solid #222' },
    card: { background: '#000', padding: '15px', borderRadius: '12px', marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #222' },
    btnMain: { background: '#f60', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' },
    btnMini: { border: 'none', color: '#fff', padding: '8px 15px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', width: '120px' },
    input: { width: '100%', background: '#000', border: '1px solid #333', color: '#fff', padding: '12px', borderRadius: '10px', marginBottom: '10px', boxSizing: 'border-box' },
    formBox: { marginBottom: '30px', background: '#000', padding: '20px', borderRadius: '15px', border: '1px solid #333' },
    summary: { textAlign: 'center', padding: '20px', background: '#f60', borderRadius: '15px', marginBottom: '20px' },
    empty: { textAlign: 'center', color: '#555', padding: '20px' },
    loader: { height: '100vh', background: '#000', color: '#f60', display: 'flex', justifyContent: 'center', alignItems: 'center' }
};

export default AdminDashboard;
