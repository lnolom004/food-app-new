import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabase'; 
import { useNavigate } from 'react-router-dom';
import { toast, Toaster } from 'react-hot-toast';

const MyOrders = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    // --- ส่วนของระบบแชท ---
    const [showChat, setShowChat] = useState(false);
    const [currentOrder, setCurrentOrder] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [currentUser, setCurrentUser] = useState(null);

    const fetchOrders = useCallback(async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return navigate('/login');
            setCurrentUser(user);

            const { data, error } = await supabase
                .from('orders')
                .select(`*, rider:users!rider_id ( username, phone_number )`)
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setOrders(data || []);
        } catch (error) { console.error(error.message); } finally { setLoading(false); }
    }, [navigate]);

    useEffect(() => {
        fetchOrders();
        const channel = supabase.channel('order-status').on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, fetchOrders).subscribe();
        return () => supabase.removeChannel(channel);
    }, [fetchOrders]);

    // 1. 💬 ฟังก์ชันเปิดแชทและดึงข้อความ
    const openChat = async (order) => {
        if (!order.rider_id) return toast.error("ยังไม่มีไรเดอร์รับงานครับ");
        setCurrentOrder(order);
        setShowChat(true);

        // ดึงข้อความเก่า
        const { data } = await supabase.from('messages').select('*').eq('order_id', order.id).order('created_at', { ascending: true });
        setMessages(data || []);

        // Listen แชทสด (Real-time)
        const chatChannel = supabase.channel(`chat-${order.id}`)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `order_id=eq.${order.id}` }, 
                payload => setMessages(prev => [...prev, payload.new])
            ).subscribe();
        
        return () => supabase.removeChannel(chatChannel);
    };

    const sendMessage = async () => {
        if (!newMessage.trim()) return;
        const { error } = await supabase.from('messages').insert();
        if (!error) setNewMessage('');
    };

    if (loading) return <div style={st.loader}>⌛ กำลังโหลด...</div>;

    return (
        <div style={st.container}>
            <Toaster position="top-center" />
            <header style={st.header}>
                <button onClick={() => navigate('/menu')} style={st.btnBack}>← สั่งอาหารเพิ่ม</button>
                <h2 style={{ margin: 0, color: '#f60' }}>📋 ติดตามออเดอร์</h2>
            </header>

            <div style={st.list}>
                {orders.map((order) => (
                    <div key={order.id} style={st.card}>
                        <div style={st.cardHeader}>
                            <b>ออเดอร์: #{order.id.slice(0, 5)}</b>
                            <span style={st.badge}>{order.status}</span>
                        </div>

                        {order.rider && (
                            <div style={st.riderInfo}>
                                <span>🛵 {order.rider.username} กำลังเดินทาง</span>
                                <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                                    <button onClick={() => openChat(order)} style={st.btnChat}>💬 แชทกับไรเดอร์</button>
                                    <a href={`tel:${order.rider.phone_number}`} style={st.btnCall}>📞 โทร</a>
                                </div>
                            </div>
                        )}
                        <p style={{ fontSize: '13px', color: '#888', marginTop: '10px' }}>📍 {order.address}</p>
                    </div>
                ))}
            </div>

            {/* --- Modal แชท --- */}
            {showChat && (
                <div style={st.modal}>
                    <div style={st.chatBox}>
                        <div style={st.chatHeader}>
                            <span>แชทกับไรเดอร์: {currentOrder?.rider?.username}</span>
                            <button onClick={() => setShowChat(false)} style={{background:'none', border:'none', color:'#fff', fontSize:'20px'}}>×</button>
                        </div>
                        <div style={st.messageList}>
                            {messages.map((m, i) => (
                                <div key={i} style={{ textAlign: m.sender_id === currentUser.id ? 'right' : 'left' }}>
                                    <p style={m.sender_id === currentUser.id ? st.msgMe : st.msgYou}>{m.text}</p>
                                </div>
                            ))}
                        </div>
                        <div style={{ display: 'flex', gap: '5px' }}>
                            <input value={newMessage} onChange={e => setNewMessage(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && sendMessage()} style={st.input} placeholder="พิมพ์ข้อความ..." />
                            <button onClick={sendMessage} style={st.btnSend}>ส่ง</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const st = {
    container: { background: '#000', color: '#fff', minHeight: '100vh', padding: '20px', fontFamily: 'Kanit' },
    header: { display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '25px' },
    btnBack: { background: '#222', color: '#fff', border: 'none', padding: '8px 15px', borderRadius: '10px' },
    list: { maxWidth: '500px', margin: '0 auto' },
    card: { background: '#111', padding: '15px', borderRadius: '15px', marginBottom: '15px', border: '1px solid #222' },
    cardHeader: { display: 'flex', justifyContent: 'space-between' },
    badge: { color: '#f60', fontSize: '12px' },
    riderInfo: { background: '#000', padding: '15px', borderRadius: '12px', marginTop: '10px' },
    btnChat: { flex: 1, background: '#f60', color: '#fff', border: 'none', padding: '8px', borderRadius: '8px', cursor: 'pointer' },
    btnCall: { background: '#333', color: '#fff', textDecoration: 'none', padding: '8px 15px', borderRadius: '8px', fontSize: '13px' },
    modal: { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.9)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
    chatBox: { background: '#111', width: '90%', maxWidth: '400px', borderRadius: '20px', overflow: 'hidden' },
    chatHeader: { background: '#222', padding: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    messageList: { height: '350px', overflowY: 'auto', padding: '15px', display: 'flex', flexDirection: 'column', gap: '10px' },
    msgMe: { display: 'inline-block', background: '#f60', color: '#fff', padding: '10px 15px', borderRadius: '15px 15px 0 15px', maxWidth: '80%' },
    msgYou: { display: 'inline-block', background: '#333', color: '#fff', padding: '10px 15px', borderRadius: '15px 15px 15px 0', maxWidth: '80%' },
    input: { flex: 1, background: '#222', color: '#fff', border: 'none', padding: '12px', borderRadius: '10px' },
    btnSend: { background: '#f60', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '10px', fontWeight: 'bold' },
    loader: { height: '100vh', background: '#000', color: '#f60', display: 'flex', justifyContent: 'center', alignItems: 'center' }
};

export default MyOrders;
