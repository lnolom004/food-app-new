import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabase'; 
import { toast, Toaster } from 'react-hot-toast';

const RiderDashboard = () => {
    const [availableJobs, setAvailableJobs] = useState([]); 
    const [myActiveJobs, setMyActiveJobs] = useState([]);   
    const [history, setHistory] = useState([]);             
    const [isOnline, setIsOnline] = useState(false);
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // --- ส่วนของระบบแชท ---
    const [showChat, setShowChat] = useState(false);
    const [currentOrder, setCurrentOrder] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');

    const fetchJobs = useCallback(async () => {
        try {
            const { data: { user: authUser } } = await supabase.auth.getUser();
            if (!authUser) return;
            setUser(authUser);

            const { data: u } = await supabase.from('users').select('is_online').eq('id', authUser.id).single();
            if (u) setIsOnline(u.is_online);

            // ก. งานใหม่ (แอดมินรับแล้ว ยังไม่มีไรเดอร์)
            const { data: newJobs } = await supabase
                .from('orders')
                .select(`*, customer:users!user_id(username, phone_number)`)
                .eq('status', 'shipping').is('rider_id', null);
            setAvailableJobs(newJobs || []);

            // ข. งานที่เรากำลังส่ง (สูงสุด 3 งาน)
            const { data: actives } = await supabase
                .from('orders')
                .select(`*, customer:users!user_id(username, phone_number)`)
                .eq('rider_id', authUser.id).eq('status', 'shipping');
            setMyActiveJobs(actives || []);

            // ค. ประวัติล่าสุด
            const { data: hist } = await supabase.from('orders').select('*').eq('rider_id', authUser.id).eq('status', 'completed').limit(10).order('created_at', { ascending: false });
            setHistory(hist || []);

        } catch (error) { console.error(error); } finally { setLoading(false); }
    }, []);

    useEffect(() => {
        fetchJobs();
        const channel = supabase.channel('rider-updates').on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, fetchJobs).subscribe();
        return () => supabase.removeChannel(channel);
    }, [fetchJobs]);

    // 1. ✅ ฟังก์ชันรับงาน (จำกัด 3 งาน)
    const handleAccept = async (orderId) => {
        if (!isOnline) return toast.error("กรุณาเปิดระบบ Online ก่อนครับ");
        if (myActiveJobs.length >= 3) return toast.error("คุณรับงานเต็มโควตาแล้ว (สูงสุด 3 งาน)");

        const { error } = await supabase.from('orders').update({ rider_id: user.id }).eq('id', orderId);
        if (!error) { toast.success("รับงานสำเร็จ!"); fetchJobs(); }
    };

    // 2. 💬 ระบบแชท Real-time
    const openChat = async (order) => {
        setCurrentOrder(order);
        setShowChat(true);
        const { data } = await supabase.from('messages').select('*').eq('order_id', order.id).order('created_at', { ascending: true });
        setMessages(data || []);

        // Listen แชทสด
        supabase.channel(`chat-${order.id}`).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `order_id=eq.${order.id}` }, 
            payload => setMessages(prev => [...prev, payload.new])
        ).subscribe();
    };

    const sendMessage = async () => {
        if (!newMessage.trim() || !currentOrder) return;
        // ✅ แก้ไข: เพิ่มการระบุค่าที่จะบันทึกลงตาราง messages
        const { error } = await supabase.from('messages').insert();
        if (!error) setNewMessage('');
        else toast.error("ส่งข้อความไม่สำเร็จ");
    };

    // ✅ แก้ไข: ลิงก์ Google Maps ให้ทำงานได้จริง
    const openMaps = (lat, lng) => window.open(`https://www.google.com{lat},${lng}&travelmode=driving`, '_blank');
    
    const handleComplete = async (id) => { 
        await supabase.from('orders').update({ status: 'completed' }).eq('id', id); 
        toast.success("ปิดงานสำเร็จ!");
        fetchJobs(); 
    };

    if (loading) return <div style={st.loader}>⌛ กำลังเข้าสู่ระบบ...</div>;

    return (
        <div style={st.container}>
            <Toaster />
            <header style={st.header}>
                <div>
                    <h2 style={{ color: '#00ff00', margin: 0 }}>🛵 RIDER DASHBOARD</h2>
                    <p style={{ margin: 0, color: '#888' }}>กำลังดำเนินการ: {myActiveJobs.length}/3 งาน</p>
                </div>
                <button onClick={() => supabase.auth.signOut()} style={st.btnOut}>Logout</button>
            </header>

            {/* ส่วนสลับสถานะออนไลน์ */}
            <div style={{ marginBottom: '20px' }}>
                <button 
                    onClick={async () => {
                        const { error } = await supabase.from('users').update({ is_online: !isOnline }).eq('id', user.id);
                        if (!error) setIsOnline(!isOnline);
                    }}
                    style={{ ...st.btnToggle, background: isOnline ? '#00c853' : '#444' }}
                >
                    {isOnline ? '🟢 ออนไลน์ (พร้อมรับงาน)' : '⚪ ออฟไลน์ (พักผ่อน)'}
                </button>
            </div>

            {/* รายการงานปัจจุบัน */}
            {myActiveJobs.map(job => (
                <div key={job.id} style={st.activeCard}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <b style={{ color: '#fff' }}>👤 {job.customer?.username || 'ลูกค้า'}</b>
                            <p style={{ fontSize: '13px', color: '#aaa', margin: '5px 0' }}>📍 {job.address}</p>
                        </div>
                        <span style={{ fontSize: '12px', background: '#333', padding: '2px 8px', borderRadius: '5px' }}>฿{job.total_price}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                        <button onClick={() => openMaps(job.lat, job.lng)} style={st.btnSmall}>🗺️ แผนที่</button>
                        <button onClick={() => openChat(job)} style={st.btnSmall}>💬 แชท</button>
                        <button onClick={() => handleComplete(job.id)} style={{ ...st.btnSmall, background: '#00ff00', color: '#000', fontWeight: 'bold' }}>✅ สำเร็จ</button>
                    </div>
                </div>
            ))}

            <h4 style={{ color: '#f60', borderBottom: '1px solid #222', paddingBottom: '10px' }}>📦 งานใหม่ที่เปิดรับ ({availableJobs.length})</h4>
            {availableJobs.map(job => (
                <div key={job.id} style={st.jobCard}>
                    <div style={{ flex: 1 }}>
                        <b style={{ fontSize: '14px' }}>📍 {job.address.slice(0, 30)}...</b>
                        <p style={{ margin: '5px 0', fontSize: '12px', color: '#888' }}>ค่าอาหาร: ฿{job.total_price}</p>
                    </div>
                    <button onClick={() => handleAccept(job.id)} style={st.btnAccept}>รับงาน</button>
                </div>
            ))}

            {/* --- Modal แชท --- */}
            {showChat && (
                <div style={st.modal}>
                    <div style={st.chatBox}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                            <h4 style={{ margin: 0 }}>แชท: {currentOrder?.customer?.username}</h4>
                            <button onClick={() => setShowChat(false)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '20px', cursor: 'pointer' }}>×</button>
                        </div>
                        <div style={st.messageList}>
                            {messages.map((m, i) => (
                                <div key={i} style={{ textAlign: m.sender_id === user.id ? 'right' : 'left' }}>
                                    <p style={m.sender_id === user.id ? st.msgMe : st.msgYou}>{m.text}</p>
                                </div>
                            ))}
                        </div>
                        <div style={{ display: 'flex', gap: '5px' }}>
                            <input 
                                value={newMessage} 
                                onChange={e => setNewMessage(e.target.value)} 
                                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                                style={st.input} 
                                placeholder="พิมพ์ข้อความ..." 
                            />
                            <button onClick={sendMessage} style={st.btnAccept}>ส่ง</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const st = {
    container: { background: '#000', color: '#fff', minHeight: '100vh', padding: '20px', fontFamily: 'Kanit, sans-serif' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
    btnOut: { background: '#222', color: '#888', border: 'none', padding: '6px 15px', borderRadius: '20px', cursor: 'pointer' },
    btnToggle: { width: '100%', padding: '12px', border: 'none', borderRadius: '10px', color: '#fff', fontWeight: 'bold', cursor: 'pointer' },
    activeCard: { background: '#111', padding: '15px', borderRadius: '15px', border: '1px solid #00ff00', marginBottom: '15px' },
    btnSmall: { flex: 1, padding: '10px', fontSize: '13px', cursor: 'pointer', background: '#222', color: '#fff', border: '1px solid #333', borderRadius: '8px' },
    jobCard: { background: '#111', padding: '15px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', border: '1px solid #222' },
    btnAccept: { background: '#f60', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' },
    modal: { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.9)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
    chatBox: { background: '#111', width: '90%', maxWidth: '400px', padding: '20px', borderRadius: '20px', border: '1px solid #333' },
    messageList: { height: '350px', overflowY: 'auto', marginBottom: '15px', padding: '10px', background: '#000', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '8px' },
    msgMe: { display: 'inline-block', background: '#f60', color: '#fff', padding: '8px 15px', borderRadius: '15px 15px 0 15px', margin: 0, maxWidth: '80%' },
    msgYou: { display: 'inline-block', background: '#333', color: '#fff', padding: '8px 15px', borderRadius: '15px 15px 15px 0', margin: 0, maxWidth: '80%' },
    input: { flex: 1, background: '#222', color: '#fff', border: 'none', padding: '12px', borderRadius: '10px' },
    loader: { height: '100vh', background: '#000', color: '#00ff00', display: 'flex', justifyContent: 'center', alignItems: 'center' }
};

export default RiderDashboard;
