import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from './supabase'; 

const Chat = () => {
  const { orderId } = useParams(); 
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [myInfo, setMyInfo] = useState({ id: null, role: null, username: '' });
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef(); 

  // 1. ระบบเริ่มต้น: ดึงข้อมูลผู้ใช้ และ ข้อความ
  useEffect(() => {
    const setupChat = async () => {
      // ดึงข้อมูลผู้ใช้ปัจจุบัน
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('users')
          .select('role, username')
          .eq('id', user.id)
          .maybeSingle();
        
        setMyInfo({ id: user.id, role: profile?.role, username: profile?.username || 'ผู้ใช้งาน' });
      }

      // ดึงประวัติแชทเก่า
      const { data: oldMessages, error } = await supabase
        .from('messages')
        .select(`
          *,
          users:sender_id (username, role)
        `)
        .eq('order_id', orderId)
        .order('created_at', { ascending: true });

      if (!error) setMessages(oldMessages || []);
      setLoading(false);

      // --- ระบบ Realtime 2026: รับข้อความใหม่พร้อมข้อมูลคนส่ง ---
      const channel = supabase
        .channel(`chat-${orderId}`)
        .on('postgres_changes', 
          { event: 'INSERT', schema: 'public', table: 'messages', filter: `order_id=eq.${orderId}` }, 
          async (payload) => {
            // ดึงข้อมูลคนส่งเพื่อเอามาแปะในแชทที่เด้งใหม่
            const { data: senderProfile } = await supabase
              .from('users')
              .select('username, role')
              .eq('id', payload.new.sender_id)
              .maybeSingle();

            const messageWithSender = {
              ...payload.new,
              users: senderProfile
            };

            setMessages((prev) => [...prev, messageWithSender]);
          }
        ).subscribe();

      return () => supabase.removeChannel(channel);
    };

    setupChat();
  }, [orderId]);

  // 2. เลื่อนจอลงล่างสุด (Auto Scroll)
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 3. ฟังก์ชันส่งข้อความ (พร้อมดัก Error)
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const tempMessage = newMessage;
    setNewMessage(''); // ล้างช่องพิมพ์ทันทีเพื่อความรู้สึกลื่นไหล (Optimistic UI)

    const { error } = await supabase
      .from('messages')
      .insert([{ 
        order_id: orderId, 
        sender_id: myInfo.id, 
        content: tempMessage 
      }]);

    if (error) {
      alert("ส่งไม่สำเร็จ: " + error.message);
      setNewMessage(tempMessage); // ถ้าส่งพลาดคืนค่าเดิมเข้าช่องพิมพ์
    }
  };

  if (loading) return <div style={styles.loading}>🍔 กำลังเข้าสู่ห้องแชท...</div>;

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <button onClick={() => navigate(-1)} style={styles.backBtn}>⬅️ กลับ</button>
        <div style={{ flex: 1, textAlign: 'center' }}>
          <h3 style={{ margin: 0, color: '#ff6600', fontSize: '18px' }}>💬 ห้องแชทติดต่อ</h3>
          <small style={{ color: '#888' }}>ออเดอร์: #{orderId.slice(0, 8).toUpperCase()}</small>
        </div>
      </header>

      {/* Chat Area */}
      <div style={styles.chatArea}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', color: '#444', marginTop: '50px' }}>ยังไม่มีการพูดคุยในออเดอร์นี้</div>
        )}
        
        {messages.map((msg) => {
          const isMe = msg.sender_id === myInfo.id;
          const senderRole = msg.users?.role;

          return (
            <div key={msg.id} style={{
              ...styles.bubbleWrapper,
              justifyContent: isMe ? 'flex-end' : 'flex-start'
            }}>
              {!isMe && <div style={styles.avatar}>{senderRole === 'admin' ? '🛡️' : senderRole === 'rider' ? '🛵' : '👤'}</div>}
              
              <div style={{ maxWidth: '75%' }}>
                {!isMe && <div style={styles.senderName}>{msg.users?.username} ({senderRole})</div>}
                
                <div style={{
                  ...styles.bubble,
                  backgroundColor: isMe ? '#ff6600' : '#222',
                  borderBottomRightRadius: isMe ? '2px' : '12px',
                  borderBottomLeftRadius: isMe ? '12px' : '2px',
                  border: isMe ? 'none' : '1px solid #333'
                }}>
                  {msg.content}
                  <div style={styles.time}>
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={scrollRef} />
      </div>

      {/* Input Field */}
      <form onSubmit={handleSendMessage} style={styles.inputContainer}>
        <input 
          type="text" 
          placeholder="พิมพ์ข้อความที่นี่..." 
          style={styles.input}
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          autoComplete="off"
        />
        <button type="submit" style={styles.sendBtn} disabled={!newMessage.trim()}>ส่ง</button>
      </form>
    </div>
  );
};

// --- Styles ---
const styles = {
  container: { backgroundColor: '#000', height: '100vh', display: 'flex', flexDirection: 'column', fontFamily: "'Kanit', sans-serif" },
  header: { padding: '15px 20px', backgroundColor: '#111', borderBottom: '1px solid #222', display: 'flex', alignItems: 'center', color: '#fff', boxShadow: '0 2px 10px rgba(0,0,0,0.5)' },
  backBtn: { background: 'none', border: 'none', color: '#fff', fontSize: '18px', cursor: 'pointer', padding: '5px 10px' },
  loading: { backgroundColor: '#000', color: '#ff6600', height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', fontWeight: 'bold' },
  chatArea: { flex: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '15px' },
  bubbleWrapper: { display: 'flex', width: '100%', gap: '10px', alignItems: 'flex-end' },
  bubble: { padding: '10px 14px', borderRadius: '12px', color: '#fff', fontSize: '14px', position: 'relative' },
  avatar: { width: '30px', height: '30px', backgroundColor: '#111', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', marginBottom: '5px', border: '1px solid #222' },
  senderName: { fontSize: '10px', color: '#666', marginBottom: '4px', marginLeft: '2px' },
  time: { fontSize: '9px', opacity: 0.5, textAlign: 'right', marginTop: '4px' },
  inputContainer: { padding: '15px', backgroundColor: '#111', display: 'flex', alignItems: 'center', gap: '10px', borderTop: '1px solid #222' },
  input: { flex: 1, padding: '12px 18px', borderRadius: '25px', border: '1px solid #333', backgroundColor: '#222', color: '#fff', outline: 'none', fontSize: '14px' },
  sendBtn: { backgroundColor: '#ff6600', color: '#fff', border: 'none', borderRadius: '20px', padding: '10px 20px', fontWeight: 'bold', cursor: 'pointer', transition: '0.2s', opacity: 1 },
};

export default Chat;
