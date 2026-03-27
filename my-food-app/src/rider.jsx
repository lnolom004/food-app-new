import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabase'; 
import { toast, Toaster } from 'react-hot-toast';

const RiderDashboard = () => {
    const [orders, setOrders] = useState([]);
    const [isOnline, setIsOnline] = useState(false);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(null);

    // 1. ฟังก์ชันดึงข้อมูลไรเดอร์และงานที่ได้รับ
    const fetchMyJobs = useCallback(async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            setUser(user);

            // ดึงสถานะออนไลน์ล่าสุดจาก DB
            const { data: userData } = await supabase.from('users').select('is_online').eq('id', user.id).single();
            if (userData) setIsOnline(userData.is_online);

            // ดึงออเดอร์ที่ 'rider_id' ตรงกับเรา และสถานะไม่ใช่ 'completed'
            const { data, error } = await supabase
                .from('orders')
                .select('*')
                .eq('rider_id', user.id)
                .neq('status', 'completed')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setOrders(data || []);
        } catch (error) {
            console.error("Rider Fetch Error:", error.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchMyJobs();
        // ระบบ Real-time: เวลามีแอดมินจ่ายงานให้ ข้อมูลจะเด้งทันที
        const channel = supabase.channel('rider-updates')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, fetchMyJobs)
            .subscribe();
        return () => supabase.removeChannel(channel);
    }, [fetchMyJobs]);

    // 2. ฟังก์ชันเปิด-ปิดรับงาน (อัปเดตลงตาราง users)
    const toggleOnline = async () => {
        const newStatus = !isOnline;
        const { error } = await supabase.from('users').update({ is_online: newStatus }).eq('id', user.id);
        if (!error) {
            setIsOnline(newStatus);
            toast.success(newStatus ? "🟢 ออนไลน์ พร้อมรับงานแล้ว" : "⚪ ออฟไลน์ พักผ่อนได้");
        }
    };

    // 3. 💥 ฟังก์ชัน Logout (หัวใจสำคัญที่เพื่อนต้องการ)
    const handleLogout = async () => {
        await supabase.auth.signOut();
        toast.success("ออกจากระบบไรเดอร์แล้ว");
        // หลังจากบรรทัดนี้ ระบบใน App.jsx จะดีดคุณกลับหน้า Login เองอัตโนมัติครับ
    };

    if (loading) return <div style={st.loader}>⌛ กำลังเปิดระบบไรเดอร์...</div>;

    return (
        <div style={st.container}>
            <Toaster position="top-center" />
            
            {/* --- ส่วนหัว RIDER PRO --- */}
            <header style={st.header}>
                <div>
                    <h2 style={{ margin: 0, color: '#f60' }}>🛵 RIDER PRO</h2>
                    <span style={{ fontSize: '12px', color: '#888' }}>{user?.email}</span>
                </div>
                <button onClick={handleLogout} style={st.btnOut}>Logout</button>
            </header>

            {/* แผงควบคุมสถานะ */}
            <div style={st.statusCard}>
                <h3 style={{ marginTop: 0 }}>สถานะการรับงาน</h3>
                <button 
                    onClick={toggleOnline} 
                    style={{ ...st.btnToggle, background: isOnline ? '#00c853' : '#444' }}
                >
                    {isOnline ? 'พร้อมส่งอาหาร (Online)' : 'ปิดรับงาน (Offline)'}
                </button>
            </div>

            {/* รายการงานที่ต้องส่ง */}
            <main style={{ marginTop: '25px' }}>
                <h4 style={{ marginBottom: '15px', color: '#f60' }}>📦 งานที่ต้องจัดส่ง ({orders.length})</h4>
                {orders.length === 0 ? (
                    <div style={st.emptyState}>ยังไม่มีงานใหม่ในขณะนี้</div>
                ) : (
                    orders.map(order => (
                        <div key={order.id} style={st.orderCard}>
                            <div style={{ flex: 1 }}>
                                <b>ออเดอร์ #{order.id.slice(0, 5)}</b>
                                <p style={{ fontSize: '13px', color: '#aaa', margin: '5px 0' }}>📍 {order.address}</p>
                                <div style={st.badge}>{order.status}</div>
                            </div>
                            <button style={st.btnGo} onClick={() => toast("ฟังก์ชันนำทางกำลังมา...")}>นำทาง</button>
                        </div>
                    ))
                )}
            </main>
        </div>
    );
};

// --- สไตล์แบบ Dark Mode ปี 2026 ---
const st = {
    container: { background: '#000', color: '#fff', minHeight: '100vh', padding: '20px', fontFamily: 'Kanit, sans-serif' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', borderBottom: '1px solid #222', paddingBottom: '15px' },
    btnOut: { background: 'none', border: '1px solid #333', color: '#888', padding: '6px 15px', borderRadius: '20px', cursor: 'pointer' },
    statusCard: { background: '#111', padding: '20px', borderRadius: '20px', border: '1px solid #222', textAlign: 'center' },
    btnToggle: { width: '100%', padding: '15px', border: 'none', borderRadius: '12px', color: '#fff', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer', transition: '0.3s' },
    orderCard: { background: '#111', padding: '15px', borderRadius: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', borderLeft: '5px solid #f60' },
    badge: { display: 'inline-block', background: '#222', padding: '2px 8px', borderRadius: '5px', fontSize: '11px', color: '#f60', marginTop: '5px' },
    btnGo: { background: '#f60', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' },
    emptyState: { textAlign: 'center', padding: '40px', color: '#555', border: '1px dashed #222', borderRadius: '15px' },
    loader: { height: '100vh', background: '#000', color: '#f60', display: 'flex', justifyContent: 'center', alignItems: 'center' }
};

export default RiderDashboard;
