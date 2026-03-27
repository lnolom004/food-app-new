import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from './supabase';
import { toast } from 'react-hot-toast';

const Chat = () => {
    const { orderId } = useParams();
    const navigate = useNavigate();
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [myProfile, setMyProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const scrollRef = useRef();

    // 1. ดึงข้อมูลโปรไฟล์และประวัติแชท
    const initChat = useCallback(async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return navigate('/login');

        // ดึงชื่อและบทบาทของเรา
        const { data: profile } = await supabase.from('users').select('*').eq('id', user.id).single();
        setMyProfile(profile);

        // เช็คสถานะออเดอร์ (ถ้าสำเร็จแล้ว ห้ามแชทต่อ)
        const { data: order } = await supabase.from('orders').select('status').eq('id', orderId).single();
        if (order?.status === 'completed') {
            toast.error("ออเดอร์นี้เสร็จสิ้นแล้ว ไม่สามารถแชทได้");
            return navigate(-1);
        }

        // ดึงข้อความเก่าทั้งหมด
        const { data: oldMsgs } = await supabase
            .from('messages')
            .select('*, users:sender_id(username, role)')
            .eq('order_id', orderId)
            .order('created_at', { ascending: true });

        if (oldMsgs) setMessages(oldMsgs);
        setLoading(false);
    }, [orderId, navigate]);

    useEffect(() => {
        initChat();

        // 2. ระบบ Real-time: ฟังข้อความใหม่
        const msgChannel = supabase.channel(`chat-${orderId}`)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `order_id=eq.${orderId}` }, 
            async (payload) => {
                const { data: sender } = await supabase.from('users').select('username, role').eq('id', payload.new.sender_id).single();
                setMessages(prev => [...prev, { ...payload.new, users: sender }]);
            })
            .subscribe();

        // 3. ระบบ Real-time: ฟังการปิดออเดอร์ (ถ้าไรเดอร์กดส่งสำเร็จ ให้ดีดออกจากแชททันที)
        const orderChannel = supabase.channel(`status-${orderId}`)
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${orderId}` }, 
            (payload) => {
                if (payload.new.status === 'completed') {
                    toast.success("ออเดอร์ส่งถึงที่หมายแล้ว ปิดห้องแชท");
                    navigate(-1);
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(msgChannel);
            supabase.removeChannel(orderChannel);
        };
    }, [orderId, initChat, navigate]);

    // เลื่อนจอลงล่างสุดเมื่อมีข้อความใหม่
    useEffect(() => {
        scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = async (e) => {
        e.preventDefault();
        if (!newMessage.trim()) return;

        const content = newMessage;
        setNewMessage(''); // ล้างช่องพิมพ์ทันที (Optimistic UI)

        const { error } = await supabase.from('messages').insert([{
            order_id: orderId,
            sender_id: myProfile.id,
            content: content
        }]);

        if (error) toast.error("ส่งข้อความไม่สำเร็จ");
    };

    if (loading) return <div style={st.loader}>💬 กำลังเข้าสู่ห้องแชท...</div>;

    return (
        <div style={st.container}>
            <header style={st.header}>
                <button onClick={() => navigate(-1)} style={st.backBtn}>⬅️</button>
                <div style={{ textAlign: 'center', flex: 1 }}>
                    <h3 style={{ margin: 0, color: '#f60' }}>แชทออเดอร์ #{orderId.slice(0, 5)}</h3>
                    <small style={{ color: '#4caf50' }}>● กำลังออนไลน์</small>
                </div>
            </header>

            <div style={st.chatArea}>
                {messages.map((msg, index) => {
                    const isMe = msg.sender_id === myProfile?.id;
                    return (
                        <div key={index} style={{ ...st.msgRow, justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
                            <div style={{ maxWidth: '80%' }}>
                                {!isMe && <small style={st.senderName}>{msg.users?.username} ({msg.users?.role})</small>}
                                <div style={{ ...st.bubble, backgroundColor: isMe ? '#f60' : '#222', borderRadius: isMe ? '15px 15px 2px 15px' : '15px 15px 15px 2px' }}>
                                    {msg.content}
                                </div>
                            </div>
                        </div>
                    );
                })}
                <div ref={scrollRef} />
            </div>

            <form onSubmit={handleSend} style={st.inputBar}>
                <input style={st.input} value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="พิมพ์ข้อความ..." />
                <button type="submit" style={st.sendBtn}>ส่ง</button>
            </form>
        </div>
    );
};

const st = {
    container: { background: '#000', height: '100vh', display: 'flex', flexDirection: 'column', fontFamily: 'Kanit' },
    header: { padding: '15px', background: '#111', borderBottom: '1px solid #222', display: 'flex', alignItems: 'center', color: '#fff' },
    backBtn: { background: 'none', border: 'none', color: '#fff', fontSize: '20px', cursor: 'pointer' },
    chatArea: { flex: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '15px' },
    msgRow: { display: 'flex', width: '100%' },
    bubble: { padding: '12px 16px', color: '#fff', fontSize: '14px' },
    senderName: { fontSize: '10px', color: '#888', marginBottom: '4px', display: 'block' },
    inputBar: { padding: '15px', background: '#111', borderTop: '1px solid #222', display: 'flex', gap: '10px' },
    input: { flex: 1, padding: '12px', borderRadius: '25px', background: '#222', border: '1px solid #333', color: '#fff', outline: 'none' },
    sendBtn: { background: '#f60', color: '#fff', border: 'none', padding: '0 20px', borderRadius: '25px', fontWeight: 'bold' },
    loader: { height: '100vh', background: '#000', color: '#f60', display: 'flex', justifyContent: 'center', alignItems: 'center' }
};

export default Chat;
