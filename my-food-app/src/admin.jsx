import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabase'; 
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast'; 

const AdminDashboard = () => {
    const [activeTab, setActiveTab] = useState('overview');
    const [menus, setMenus] = useState([]);
    const [orders, setOrders] = useState([]);
    const [riders, setRiders] = useState([]);
    const [loading, setLoading] = useState(true);

    // 1. ฟังก์ชันดึงข้อมูลทั้งหมด
    const fetchAllData = useCallback(async () => {
        setLoading(true);
        try {
            // ดึงข้อมูลเมนู
            const { data: m } = await supabase.from('menus').select('*').order('created_at', { ascending: false });
            // ดึงข้อมูลออเดอร์
            const { data: o } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
            // ดึงข้อมูลไรเดอร์ (ใช้ชื่อคอลัมน์ role ให้ตรงกับ DB)
            const { data: u, error: rError } = await supabase.from('users').select('*').eq('role', 'rider');

            if (rError) console.error("Rider Fetch Error:", rError);

            setMenus(m || []);
            setOrders(o || []);
            setRiders(u || []);
        } catch (error) {
            console.error("System Error:", error);
            toast.error("เกิดข้อผิดพลาดในการดึงข้อมูล");
        } finally {
            setLoading(false);
        }
    }, []);

    // 2. ใช้ useEffect เพื่อดึงข้อมูลครั้งแรกและติดตามการเปลี่ยนแปลง (Realtime)
    useEffect(() => {
        fetchAllData();
        const channel = supabase.channel('admin-db-changes')
            .on('postgres_changes', { event: '*', schema: 'public' }, () => {
                fetchAllData();
            })
            .subscribe();

        return () => supabase.removeChannel(channel);
    }, [fetchAllData]);

    // 3. ฟังก์ชันอนุมัติไรเดอร์
    const handleApprove = async (riderId) => {
        const { error } = await supabase
            .from('users')
            .update({ is_approved: true })
            .eq('id', riderId);

        if (error) {
            toast.error("อนุมัติไม่สำเร็จ");
        } else {
            toast.success("อนุมัติไรเดอร์เรียบร้อย!");
            fetchAllData(); // โหลดข้อมูลใหม่
        }
    };

    if (loading) return <div style={st.loader}>⌛ กำลังโหลดข้อมูลระบบ...</div>;

    return (
        <div style={st.container}>
            <header style={st.header}>
                <h2 style={{ color: '#f60', margin: 0 }}>🛡️ TEST-CHECK-1234</h2>
                <button onClick={() => supabase.auth.signOut()} style={st.btnLogout}>Logout</button>
            </header>

            {/* แถบเมนูหลัก */}
            <nav style={st.tabBar}>
                <button onClick={() => setActiveTab('overview')} style={activeTab === 'overview' ? st.tabAct : st.tab}>📊 ภาพรวม</button>
                <button onClick={() => setActiveTab('orders')} style={activeTab === 'orders' ? st.tabAct : st.tab}>📦 ออเดอร์</button>
                <button onClick={() => setActiveTab('riders')} style={activeTab === 'riders' ? st.tabAct : st.tab}>🛵 ไรเดอร์</button>
            </nav>

            <main>
                {/* --- ส่วนที่ 1: ภาพรวม (Overview) --- */}
                {activeTab === 'overview' && (
                    <div style={{ textAlign: 'center', padding: '40px 0' }}>
                        <h3>ยินดีต้อนรับ แอดมิน</h3>
                        <p style={{ color: '#888' }}>กรุณาเลือกเมนูเพื่อจัดการระบบ</p>
                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '20px' }}>
                            <div style={st.statCard}>ออเดอร์: {orders.length}</div>
                            <div style={st.statCard}>ไรเดอร์: {riders.length}</div>
                        </div>
                    </div>
                )}

                {/* --- ส่วนที่ 2: ออเดอร์ (Orders) --- */}
                {activeTab === 'orders' && (
                    <div style={st.list}>
                        <h4 style={{ color: '#f60' }}>📦 รายการออเดอร์ล่าสุด</h4>
                        {orders.length === 0 ? <p style={st.emptyText}>ไม่มีรายการออเดอร์</p> : 
                            orders.map(o => (
                                <div key={o.id} style={st.itemCard}>
                                    <div>
                                        <b>ID: {o.id.slice(0,8)}</b>
                                        <p style={{ fontSize: '12px', color: '#888' }}>ราคา: ฿{o.total_price}</p>
                                    </div>
                                    <button style={st.btnSmall}>ดูรายละเอียด</button>
                                </div>
                            ))
                        }
                    </div>
                )}

                {/* --- ส่วนที่ 3: ไรเดอร์ (Riders) --- */}
                {activeTab === 'riders' && (
                    <div style={st.list}>
                        <h4 style={{ color: '#f60', marginBottom: '15px' }}>🛵 รายชื่อผู้สมัครไรเดอร์</h4>
                        {riders.length === 0 ? <p style={st.emptyText}>ไม่พบข้อมูลไรเดอร์ในระบบ</p> : 
                            riders.map(r => (
                                <div key={r.id} style={st.itemCard}>
                                    <div>
                                        <b style={{ color: '#fff' }}>👤 {r.username || r.email || 'ไม่ระบุชื่อ'}</b>
                                        <p style={{ fontSize: '12px', color: '#888' }}>
                                            สถานะ: {r.is_approved ? <span style={{color:'#4f4'}}>✅ อนุมัติแล้ว</span> : <span style={{color:'#f44'}}>⏳ รออนุมัติ</span>}
                                        </p>
                                    </div>
                                    {!r.is_approved && (
                                        <button onClick={() => handleApprove(r.id)} style={st.btnSmall}>อนุมัติ</button>
                                    )}
                                </div>
                            ))
                        }
                    </div>
                )}
            </main>
        </div>
    );
};

// สไตล์ CSS (จัดกลุ่มไว้ที่นี่ที่เดียว)
const st = {
    container: { background: '#000', color: '#fff', minHeight: '100vh', padding: '20px', fontFamily: 'Kanit, sans-serif' },
    header: { display: 'flex', justifyContent: 'space-between', marginBottom: '20px', alignItems: 'center' },
    tabBar: { display: 'flex', gap: '10px', marginBottom: '20px', overflowX: 'auto', paddingBottom: '10px' },
    tab: { padding: '10px 20px', background: '#111', border: 'none', color: '#888', borderRadius: '30px', cursor: 'pointer', whiteSpace: 'nowrap' },
    tabAct: { padding: '10px 20px', background: '#f60', border: 'none', color: '#fff', borderRadius: '30px', fontWeight: 'bold', whiteSpace: 'nowrap' },
    list: { display: 'flex', flexDirection: 'column', gap: '10px' },
    itemCard: { background: '#111', padding: '15px', borderRadius: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #222' },
    btnSmall: { background: '#f60', color: '#fff', border: 'none', padding: '8px 15px', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' },
    btnLogout: { background: '#222', border: 'none', color: '#888', padding: '8px 15px', borderRadius: '20px', cursor: 'pointer' },
    loader: { height: '100vh', background: '#000', color: '#f60', display: 'flex', justifyContent: 'center', alignItems: 'center' },
    emptyText: { textAlign: 'center', color: '#888', marginTop: '20px' },
    statCard: { background: '#111', padding: '15px 25px', borderRadius: '15px', border: '1px solid #222', color: '#f60', fontWeight: 'bold' }
};

export default AdminDashboard;
