import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from './supabase';
import { toast, Toaster } from 'react-hot-toast';

const Chat = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const scrollRef = useRef();

    // 🛡️ 1. ดึง orderId (รองรับทั้งการกดมาจากหน้า Rider และ Customer)
    const orderId = location.state?.orderId; 

    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [myProfile, setMyProfile] = useState(null);
    const [loading, setLoading] = useState(true);

    // 📥 2. ฟังก์ชันโหลดโปรไฟล์และประวัติแชท (แก้ Error 400 เรื่อง Relationship)
    const initChat = useCallback(async () => {
        if (!orderId) {
            toast.error("ไม่พบรหัสออเดอร์");
            return navigate(-1);
        }

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return navigate('/login');

        // ดึงโปรไฟล์เราเอง
        const { data: profile } = await supabase.from('users').select('*').eq('id', user.id).single();
        setMyProfile(profile);

        // ดึงข้อความเก่า (ดึงแบบเรียบง่ายเพื่อเลี่ยง Error 400)
        const { data: oldMsgs, error } = await supabase
            .from('messages')
            .select('*') 
            .eq('order_id', orderId)
            .order('created_at', { ascending: true });

        if (error) {
            console.error("Fetch Messages Error:", error.message);
            setLoading(false);
            return;
        }

        // 💡 ดึงชื่อคนส่งมาแปะทีหลัง เพื่อความเทพและข้อมูลครบถ้วน
        const enrichedMsgs = await Promise.all((oldMsgs || []).map(async (msg) => {
            const { data: sender } = await supabase.from('users').select('username, role').eq('id', msg.sender_id).single();
            return { ...msg, users: sender };
        }));

        setMessages(enrichedMsgs);
        setLoading(false);
    }, [orderId, navigate]);

    // 🔄 3. ระบบ Real-time: ฟังข้อความใหม่ + สถานะออเดอร์
    useEffect(() => {
        initChat();

        if (!orderId) return;

        // ดักฟังข้อความใหม่เด้งเข้าหน้าจอ
        const msgChannel = supabase.channel(`chat-room-${orderId}`)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `order_id=eq.${orderId}` }, 
                async (payload) => {
                    const { data: sender } = await supabase.from('users').select('username, role').eq('id', payload.new.sender_id).single();
                    setMessages(prev => [...prev, { ...payload.new, users: sender }]);
                }
            ).subscribe();

        // ฟังสถานะออเดอร์: ถ้าสำเร็จ ให้ปิดแชททันที
        const orderChannel = supabase.channel(`status-check-${orderId}`)
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${orderId}` }, 
            (payload) => {
                if (payload.new.status === 'completed') {
                    toast.success("ออเดอร์สำเร็จแล้ว ปิดห้องแชทอัตโนมัติ");
                    navigate(-1);
                }
            }).subscribe();

        return () => {
            supabase.removeChannel(msgChannel);
            supabase.removeChannel(orderChannel);
        };
    }, [orderId, initChat, navigate]);

    // เลื่อนจอลงล่างสุด
    useEffect(() => {
        scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // 📤 4. ฟังก์ชันส่งข้อความ
    const handleSend = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !orderId || !myProfile) return;

        const content = newMessage;
        setNewMessage(''); 

        const { error } = await supabase.from('messages').insert([{
            order_id: orderId,
            sender_id: myProfile.id,
            content: content
        }]);

        if (error) {
            toast.error("ส่งไม่สำเร็จ");
            setNewMessage(content);
        }
    };

    if (loading) return <div style={st.loader}>💬 กำลังโหลดประวัติแชท...</div>;

    return (
        <div style={st.container}>
            <Toaster position="top-center" />
            <header style={st.header}>
                <button onClick={() => navigate(-1)} style={st.backBtn}>⬅️ ย้อนกลับ</button>
                <div style={{ textAlign: 'center', flex: 1 }}>
                    <h3 style={{ margin: 0, color: '#f60' }}>แชทออเดอร์ #{orderId.slice(0, 5)}</h3>
                    <small style={{ color: '#4caf50' }}>● เชื่อมต่อเรียบร้อย</small>
                </div>
            </header>

            <div style={st.chatArea}>
                {messages.map((msg, index) => {
                    const isMe = msg.sender_id === myProfile?.id;
                    return (
                        <div key={index} style={{ ...st.msgRow, justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
                            <div style={{ maxWidth: '80%' }}>
                                {!isMe && <small style={st.senderName}>{msg.users?.username} ({msg.users?.role})</small>}
                                <div style={{ 
                                    ...st.bubble, 
                                    backgroundColor: isMe ? '#f60' : '#222', 
                                    borderRadius: isMe ? '15px 15px 2px 15px' : '15px 15px 15px 2px' 
                                }}>
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

// --- ✨ Styles ระดับเทพ ---
const st = {
    container: { background: '#000', height: '100vh', display: 'flex', flexDirection: 'column', fontFamily: 'Kanit, sans-serif' },
    header: { padding: '15px', background: '#111', borderBottom: '1px solid #222', display: 'flex', alignItems: 'center', color: '#fff' },
    backBtn: { background: '#333', border: 'none', color: '#fff', padding: '8px 12px', borderRadius: '10px', cursor: 'pointer' },
    chatArea: { flex: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '15px' },
    msgRow: { display: 'flex', width: '100%' },
    bubble: { padding: '12px 16px', color: '#fff', fontSize: '14px', wordBreak: 'break-word' },
    senderName: { fontSize: '10px', color: '#888', marginBottom: '4px', display: 'block' },
    inputBar: { padding: '15px', background: '#111', borderTop: '1px solid #222', display: 'flex', gap: '10px' },
    input: { flex: 1, padding: '12px 18px', borderRadius: '25px', background: '#222', border: '1px solid #333', color: '#fff', outline: 'none' },
    sendBtn: { background: '#f60', color: '#fff', border: 'none', padding: '0 25px', borderRadius: '25px', fontWeight: 'bold', cursor: 'pointer' },
    loader: { height: '100vh', background: '#000', color: '#f60', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '1.2rem' }
};

export default Chat;
