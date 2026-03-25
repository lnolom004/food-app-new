import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from './supabase'; 

const Chat = () => {
  const { orderId } = useParams(); 
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [myInfo, setMyInfo] = useState({ id: null, role: null });
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef(); 

  // 1. ดึงข้อมูลผู้ใช้และข้อความแชท
  useEffect(() => {
    const setupChat = async () => {
      // ดึงข้อมูลผู้ใช้ (ID และ Role)
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // ดึง Role จากตาราง users มาด้วย
        const { data: profile } = await supabase
          .from('users')
          .select('role')
          .eq('id', user.id)
          .single();
        
        setMyInfo({ id: user.id, role: profile?.role });
      }

      // ดึงประวัติแชทเก่า
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: true });

      if (!error) setMessages(data || []);
      setLoading(false);

      // เปิดระบบ Realtime รับข้อความใหม่
      const channel = supabase
        .channel(`chat-${orderId}`)
        .on('postgres_changes', 
          { event: 'INSERT', schema: 'public', table: 'messages', filter: `order_id=eq.${orderId}` }, 
          (payload) => {
            setMessages((prev) => [...prev, payload.new]);
          }
        ).subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    };

    setupChat();
  }, [orderId]);

  // 2. เลื่อนจอลงล่างสุดอัตโนมัติ
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 3. ฟังก์ชันส่งข้อความ
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const { error } = await supabase
      .from('messages')
      .insert([
        { 
          order_id: orderId, 
          sender_id: myInfo.id, 
          content: newMessage 
        }
      ]);

    if (!error) {
      setNewMessage(''); 
    } else {
      alert("ไม่สามารถส่งข้อความได้");
    }
  };

  if (loading) return <div style={styles.loading}>กำลังโหลดห้องแชท...</div>;

  return (
    <div style={styles.container}>
      {/* ส่วนหัวแสดงผลตาม Role */}
      <header style={styles.header}>
        <button onClick={() => navigate(-1)} style={styles.backBtn}>⬅️ กลับ</button>
        <div style={{ flex: 1, textAlign: 'center' }}>
          <h3 style={{ margin: 0, color: '#ff6600' }}>
            💬 แชทติดต่อ ({myInfo.role === 'admin' ? 'โหมดแอดมิน' : 'ห้องแชท'})
          </h3>
          <small style={{ color: '#888' }}>ออเดอร์: #{orderId.slice(0, 8)}</small>
        </div>
      </header>

      {/* พื้นที่แชท */}
      <div style={styles.chatArea}>
        {messages.map((msg) => {
          const isMe = msg.sender_id === myInfo.id;
          return (
            <div key={msg.id} style={{
              ...styles.bubbleWrapper,
              justifyContent: isMe ? 'flex-end' : 'flex-start'
            }}>
              <div style={{
                ...styles.bubble,
                backgroundColor: isMe ? '#ff6600' : '#2a2a2a',
                borderBottomRightRadius: isMe ? '2px' : '15px',
                borderBottomLeftRadius: isMe ? '15px' : '2px'
              }}>
                {msg.content}
                <div style={styles.time}>
                  {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={scrollRef} />
      </div>

      {/* ช่องพิมพ์ข้อความ (ป้องกัน admin อ่านอย่างเดียวหรือให้พิมพ์ได้ด้วย) */}
      <form onSubmit={handleSendMessage} style={styles.inputContainer}>
        <input 
          type="text" 
          placeholder="พิมพ์ข้อความตอบกลับ..." 
          style={styles.input}
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          autoComplete="off"
        />
        <button type="submit" style={styles.sendBtn}>ส่ง</button>
      </form>
    </div>
  );
};

// --- Styles ปรับปรุงใหม่ (Fix Input) ---
const styles = {
  container: { backgroundColor: '#000', height: '100vh', display: 'flex', flexDirection: 'column', fontFamily: "'Kanit', sans-serif" },
  header: { padding: '15px', backgroundColor: '#111', borderBottom: '1px solid #222', display: 'flex', alignItems: 'center', color: '#fff' },
  backBtn: { background: 'none', border: 'none', color: '#fff', fontSize: '16px', cursor: 'pointer' },
  loading: { backgroundColor: '#000', color: '#ff6600', height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' },
  chatArea: { flex: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' },
  bubbleWrapper: { display: 'flex', width: '100%' },
  bubble: { maxWidth: '75%', padding: '12px 16px', borderRadius: '15px', color: '#fff', fontSize: '15px' },
  time: { fontSize: '10px', opacity: 0.5, textAlign: 'right', marginTop: '4px' },
  inputContainer: { 
    padding: '15px 20px', 
    backgroundColor: '#111', 
    display: 'flex', 
    alignItems: 'center',
    gap: '10px', 
    borderTop: '1px solid #222' 
  },
  input: { 
    flex: 1, 
    padding: '12px 20px', 
    borderRadius: '25px', 
    border: '1px solid #333', 
    backgroundColor: '#222', 
    color: '#fff', 
    outline: 'none', 
    fontSize: '15px',
    minWidth: '0' 
  },
  sendBtn: { 
    backgroundColor: '#ff6600', 
    color: '#fff', 
    border: 'none', 
    borderRadius: '20px', 
    padding: '10px 25px', 
    fontWeight: 'bold', 
    cursor: 'pointer',
    flexShrink: 0 
  }
};

export default Chat;
