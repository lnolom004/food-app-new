import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabase'; 
import { toast, Toaster } from 'react-hot-toast';

const AdminDashboard = () => {
    const [activeTab, setActiveTab] = useState('orders'); 
    const [salesView, setSalesView] = useState('daily'); 
    const [orders, setOrders] = useState([]);
    const [riders, setRiders] = useState([]);
    const [menus, setMenus] = useState([]);
    const [loading, setLoading] = useState(true);

    const [showAddModal, setShowAddModal] = useState(false);
    const [newMenu, setNewMenu] = useState({ name: '', price: '', category: 'อาหาร', image_url: '' });

    // --- 📥 1. ฟังก์ชันดึงข้อมูล (ฟังก์ชันเดิมของคุณ) ---
    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const { data: ord } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
            const { data: rid } = await supabase.from('users').select('*').eq('role', 'rider');
            const { data: men } = await supabase.from('menus').select('*').order('id', { ascending: false });

            setOrders(ord || []);
            setRiders(rid || []);
            setMenus(men || []);
        } catch (error) {
            toast.error("โหลดข้อมูลไม่สำเร็จ");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
        const channel = supabase.channel('admin-realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, fetchData)
            .subscribe();
        return () => supabase.removeChannel(channel);
    }, [fetchData]);

    // --- 📊 2. Logic สรุปยอดขาย (คำนวณจาก completed เท่านั้น) ---
    const getSalesData = () => {
        const completedOrders = orders.filter(o => o.status === 'completed');
        const stats = {};

        completedOrders.forEach(o => {
            const d = new Date(o.created_at);
            let key = '';

            if (salesView === 'daily') {
                key = d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
            } else if (salesView === 'weekly') {
                const firstDay = new Date(d.setDate(d.getDate() - d.getDay() + 1));
                key = `สัปดาห์เริ่มวันที่ ${firstDay.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}`;
            } else if (salesView === 'monthly') {
                key = d.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' });
            }

            stats[key] = (stats[key] || 0) + Number(o.total_price || 0);
        });

        return Object.entries(stats);
    };

    // --- 🛠 3. ฟังก์ชันอัปเดตสถานะ (ที่ทำให้งานเด้งย้ายฝั่ง) ---
    const updateStatus = async (id, status) => {
    const { error } = await supabase
        .from('orders')
        .update({ status: status }) // ตรวจสอบว่าชื่อคอลัมน์ใน DB คือ status จริงไหม
        .eq('id', id);

    if (!error) {
        toast.success(status === 'shipping' ? "ส่งงานให้ไรเดอร์แล้ว ➡️" : "สำเร็จ ✅");
        
        // --- 🌟 จุดสำคัญ: ต้องเรียกฟังก์ชันนี้เพื่อให้งานย้ายฝั่งทันที ---
        fetchData(); 
        
    } else {
        toast.error("เกิดข้อผิดพลาด: " + error.message);
    }
};


    const handleAddMenu = async (e) => {
        e.preventDefault();
        const { error } = await supabase.from('menus').insert([newMenu]);
        if (!error) {
            toast.success("เพิ่มเมนูสำเร็จ!");
            setShowAddModal(false);
            setNewMenu({ name: '', price: '', category: 'อาหาร', image_url: '' });
            fetchData();
        }
    };

    const toggleApproveRider = async (id, currentStatus) => {
        await supabase.from('users').update({ is_approved: !currentStatus }).eq('id', id);
        fetchData();
    };

    if (loading) return <div style={st.loader}>⌛ กำลังประมวลผลข้อมูล...</div>;

    return (
        <div style={st.container}>
            <Toaster position="top-center" />
            <header style={st.header}>
                <h2 style={{ color: '#f60', margin: 0 }}>👨‍🍳 ADMIN DASHBOARD 2026</h2>
                <button onClick={() => supabase.auth.signOut()} style={st.btnOut}>Logout</button>
            </header>

            <div style={st.tabBar}>
                <button onClick={() => setActiveTab('orders')} style={activeTab === 'orders' ? st.tabAct : st.tab}>📦 ออเดอร์</button>
                <button onClick={() => setActiveTab('canceled')} style={activeTab === 'canceled' ? st.tabAct : st.tab}>🚫 ยกเลิก</button>
                <button onClick={() => setActiveTab('menus')} style={activeTab === 'menus' ? st.tabAct : st.tab}>🍔 เมนู</button>
                <button onClick={() => setActiveTab('sales')} style={activeTab === 'sales' ? st.tabAct : st.tab}>📊 ยอดขาย</button>
                <button onClick={() => setActiveTab('riders')} style={activeTab === 'riders' ? st.tabAct : st.tab}>🏍️ ไรเดอร์</button>
            </div>

            <main style={{ marginTop: '20px' }}>
                
                {/* --- 📦 แท็บออเดอร์: แบ่งระบบ 2 ฝั่ง --- */}
                {activeTab === 'orders' && (
                    <div style={{ display: 'flex', gap: '20px', minHeight: '400px' }}>
                        
                        {/* 👈 ฝั่งซ้าย: ออเดอร์เข้าใหม่ (Pending) */}
                        <div style={{ flex: 1, borderRight: '1px solid #222', paddingRight: '15px' }}>
                            <h3 style={{ color: '#f60', borderBottom: '2px solid #f60', paddingBottom: '10px' }}>📥 ออเดอร์เข้าใหม่</h3>
                            <div style={st.gridColumn}>
                                {orders.filter(o => o.status === 'pending').map(o => (
                                    <div key={o.id} style={st.card}>
                                        <div style={st.cardHeader}><b>#{o.id.slice(0,5)}</b> <span style={{color:'#f60'}}>รอยืนยัน</span></div>
                                        <div style={st.itemMini}>
                                            📍 พิกัด: {o.lat}, {o.lng} <br/>
                                            💰 ยอดเงิน: ฿{o.total_price || 0}
                                        </div>
                                        <button onClick={() => updateStatus(o.id, 'shipping')} style={st.btnGreen}>
                                            รับงาน (ส่งไรเดอร์) ➡️
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* 👉 ฝั่งขวา: กำลังจัดส่ง (Shipping) */}
                        <div style={{ flex: 1, paddingLeft: '5px' }}>
                            <h3 style={{ color: '#00ff00', borderBottom: '2px solid #00ff00', paddingBottom: '10px' }}>🏍️ กำลังจัดส่ง</h3>
                            <div style={st.gridColumn}>
                                {orders.filter(o => o.status === 'shipping').map(o => (
                                    <div key={o.id} style={{...st.card, border: '1px solid #00ff00'}}>
                                        <div style={st.cardHeader}><b>#{o.id.slice(0,5)}</b> <span style={{color:'#00ff00'}}>กำลังส่ง</span></div>
                                        <div style={st.itemMini}>
                                            {o.rider_id ? '✅ ไรเดอร์รับงานแล้ว' : '⏳ รอไรเดอร์กดรับ...'}
                                        </div>
                                        <div style={{marginTop:'15px', display:'flex', gap:'10px'}}>
                                            <button onClick={() => updateStatus(o.id, 'completed')} style={st.btnOrange}>สำเร็จ</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* --- 🚫 แท็บยกเลิก --- */}
                {activeTab === 'canceled' && (
                    <div style={st.cardList}>
                        {orders.filter(o => o.status === 'cancelled').map(o => (
                            <div key={o.id} style={st.listItem}>
                                <span>❌ #{o.id.slice(0,5)} | ฿{o.total_price}</span>
                                <small style={{color:'#888'}}>{new Date(o.created_at).toLocaleString('th-TH')}</small>
                            </div>
                        ))}
                    </div>
                )}

                {/* --- 🍔 แท็บเมนู --- */}
                {activeTab === 'menus' && (
                    <div>
                        <button onClick={() => setShowAddModal(true)} style={st.btnAddMenu}>+ เพิ่มเมนู</button>
                        <div style={st.grid}>
                            {menus.map(m => (
                                <div key={m.id} style={st.card}>
                                    <img src={m.image_url} style={st.imgMenu} alt={m.name} />
                                    <b>{m.name}</b> <p style={{color:'#f60', margin:0}}>฿{m.price}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* --- 📊 แท็บยอดขาย --- */}
                {activeTab === 'sales' && (
                    <div>
                        <div style={st.subTabBar}>
                            <button onClick={() => setSalesView('daily')} style={salesView === 'daily' ? st.subTabAct : st.subTab}>รายวัน</button>
                            <button onClick={() => setSalesView('weekly')} style={salesView === 'weekly' ? st.subTabAct : st.subTab}>รายสัปดาห์</button>
                            <button onClick={() => setSalesView('monthly')} style={salesView === 'monthly' ? st.subTabAct : st.subTab}>รายเดือน</button>
                        </div>
                        <div style={st.cardList}>
                            <h3 style={{color:'#00ff00', textAlign:'center'}}>💰 สรุปยอดขาย ({salesView})</h3>
                            {getSalesData().map(([date, total]) => (
                                <div key={date} style={st.listItem}>
                                    <b>{date}</b>
                                    <b style={{color:'#f60', fontSize:'18px'}}>฿{total.toLocaleString()}</b>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* --- 🏍️ แท็บไรเดอร์ --- */}
                {activeTab === 'riders' && (
                    <div style={st.cardList}>
                        {riders.map(r => (
                            <div key={r.id} style={st.listItem}>
                                <span>🏍️ {r.username} ({r.is_approved ? 'อนุมัติแล้ว' : 'รออนุมัติ'})</span>
                                <button onClick={() => toggleApproveRider(r.id, r.is_approved)} style={r.is_approved ? st.btnRed : st.btnGreen}>
                                    {r.is_approved ? 'ระงับ' : 'อนุมัติ'}
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </main>

            {/* --- ➕ Modal เพิ่มเมนู --- */}
            {showAddModal && (
                <div style={st.modal}>
                    <form style={st.modalContent} onSubmit={handleAddMenu}>
                        <h3>➕ เพิ่มเมนูใหม่</h3>
                        <input placeholder="ชื่ออาหาร" style={st.input} required value={newMenu.name} onChange={e => setNewMenu({...newMenu, name: e.target.value})} />
                        <input placeholder="ราคา" type="number" style={st.input} required value={newMenu.price} onChange={e => setNewMenu({...newMenu, price: e.target.value})} />
                        <input placeholder="URL รูปภาพ" style={st.input} value={newMenu.image_url} onChange={e => setNewMenu({...newMenu, image_url: e.target.value})} />
                        <div style={{display:'flex', gap:'10px', marginTop: '10px'}}>
                            <button type="submit" style={st.btnGreen}>บันทึก</button>
                            <button type="button" onClick={() => setShowAddModal(false)} style={st.btnRed}>ยกเลิก</button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
};

const st = {
    container: { background: '#000', color: '#fff', minHeight: '100vh', padding: '20px', fontFamily: 'Kanit, sans-serif' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
    tabBar: { display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '10px', borderBottom: '1px solid #222' },
    tab: { padding: '10px 18px', background: '#111', color: '#888', border: 'none', borderRadius: '12px', cursor: 'pointer', whiteSpace: 'nowrap' },
    tabAct: { padding: '10px 18px', background: '#f60', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 'bold', whiteSpace: 'nowrap' },
    subTabBar: { display: 'flex', justifyContent: 'center', gap: '10px', marginBottom: '20px' },
    subTab: { background: '#222', color: '#888', border: 'none', padding: '5px 15px', borderRadius: '20px', cursor: 'pointer', fontSize: '13px' },
    subTabAct: { background: '#444', color: '#fff', border: 'none', padding: '5px 15px', borderRadius: '20px', fontWeight: 'bold', fontSize: '13px' },
    gridColumn: { display: 'flex', flexDirection: 'column', gap: '15px' },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '15px' },
    card: { background: '#111', padding: '15px', borderRadius: '15px', border: '1px solid #222' },
    cardHeader: { display: 'flex', justifyContent: 'space-between', marginBottom: '8px' },
    cardList: { display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '600px', margin: '0 auto' },
    listItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#111', padding: '15px', borderRadius: '15px', border: '1px solid #222' },
    itemMini: { fontSize: '12px', color: '#888', minHeight: '35px' },
    imgMenu: { width: '100%', height: '100px', objectFit: 'cover', borderRadius: '12px', marginBottom: '10px' },
    btnAddMenu: { background: '#f60', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '10px', marginBottom: '20px', cursor: 'pointer', fontWeight: 'bold' },
    btnGreen: { background: '#00ff00', color: '#000', border: 'none', padding: '10px', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold', flex: 1, marginTop: '10px' },
    btnOrange: { background: '#f60', color: '#fff', border: 'none', padding: '10px', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold', flex: 1 },
    btnRed: { background: '#ff4444', color: '#fff', border: 'none', padding: '10px', borderRadius: '10px', cursor: 'pointer', flex: 1 },
    btnOut: { background: 'none', color: '#888', border: '1px solid #333', padding: '5px 15px', borderRadius: '20px', cursor: 'pointer' },
    modal: { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.95)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
    modalContent: { background: '#111', padding: '25px', borderRadius: '25px', width: '90%', maxWidth: '380px', display: 'flex', flexDirection: 'column', gap: '12px' },
    input: { background: '#000', color: '#fff', border: '1px solid #333', padding: '12px', borderRadius: '12px' },
    loader: { height: '100vh', background: '#000', color: '#f60', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '18px' }
};

export default AdminDashboard;
