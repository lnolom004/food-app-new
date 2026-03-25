import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from './supabase'; // ดึงตัวแปร supabase มาใช้งาน

const Chat = () => {
  const { orderId } = useParams(); // รับค่า ID ออเดอร์จาก URL
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [myId, setMyId] = useState(null);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef(); // สำหรับเลื่อนหน้าจอลงล่างสุดอัตโนมัติ

  // 1. เริ่มต้นระบบแชท
  useEffect(() => {
    const setupChat = async () => {
      // ดึง ID ของคนที่กำลังล็อกอินอยู่
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setMyId(user.id);

      // ดึงข้อความเก่าที่มีอยู่ในออเดอร์นี้
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: true });

      if (!error) setMessages(data || []);
      setLoading(false);

      // 2. เปิดระบบ Realtime (หัวใจสำคัญเพื่อให้ข้อความเด้งทันที)
      const channel = supabase
        .channel(`chat-${orderId}`)
        .on('postgres_changes', 
          { 
            event: 'INSERT', 
            schema: 'public', 
            table: 'messages', 
            filter: `order_id=eq.${orderId}` // รับเฉพาะข้อความของออเดอร์นี้
          }, 
          (payload) => {
            // เมื่อมีข้อความใหม่เข้ามา ให้เพิ่มเข้าไปใน State ทันที
            setMessages((prev) => [...prev, payload.new]);
          }
        ).subscribe();

      // ล้างระบบเมื่อออกจากหน้าแชท
      return () => {
        supabase.removeChannel(channel);
      };
    };

    setupChat();
  }, [orderId]);

  // 3. ฟังก์ชันเลื่อนจอลงล่างสุด (Auto Scroll)
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 4. ฟังก์ชันส่งข้อความ
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const { error } = await supabase
      .from('messages')
      .insert([
        { 
          order_id: orderId, 
          sender_id: myId, 
          content: newMessage 
        }
      ]);

    if (!error) {
      setNewMessage(''); // เคลียร์ช่องพิมพ์หลังจากส่งสำเร็จ
    } else {
      console.error("Error sending message:", error.message);
      alert("ไม่สามารถส่งข้อความได้ กรุณาลองใหม่");
    }
  };

  if (loading) return <div style={styles.loading}>กำลังเปิดห้องแชท...</div>;

  return (
    <div style={styles.container}>
      {/* ส่วนหัว (Header) */}
      <header style={styles.header}>
        <button onClick={() => navigate(-1)} style={styles.backBtn}>⬅️</button>
        <div style={{ flex: 1, textAlign: 'center' }}>
          <h3 style={{ margin: 0, color: '#ff6600' }}>💬 แชทติดต่อ</h3>
          <small style={{ color: '#666' }}>ID: #{orderId.slice(0, 8)}</small>
        </div>
      </header>

      {/* ส่วนแสดงข้อความ (Chat Area) */}
      <div style={styles.chatArea}>
        {messages.map((msg) => {
          const isMe = msg.sender_id === myId;
          return (
            <div key={msg.id} style={{
              ...styles.bubbleWrapper,
              justifyContent: isMe ? 'flex-end' : 'flex-start'
            }}>
              <div style={{
                ...styles.bubble,
                backgroundColor: isMe ? '#ff6600' : '#2a2a2a', // สีส้มสำหรับเรา สีเทาสำหรับอีกฝ่าย
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
        <div ref={scrollRef} /> {/* จุดอ้างอิงสำหรับเลื่อนจอ */}
      </div>

      {/* ส่วนช่องพิมพ์ (Input Area) */}
      <form onSubmit={handleSendMessage} style={styles.inputContainer}>
        <input 
          type="text" 
          placeholder="พิมพ์ข้อความที่นี่..." 
          style={styles.input}
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
        />
        <button type="submit" style={styles.sendBtn}>ส่ง</button>
      </form>
    </div>
  );
};

// --- การตั้งค่าดีไซน์ (Dark Mode Pro) ---
const styles = {
  container: { backgroundColor: '#000', height: '100vh', display: 'flex', flexDirection: 'column', fontFamily: "'Kanit', sans-serif" },
  header: { padding: '15px', backgroundColor: '#111', borderBottom: '1px solid #222', display: 'flex', alignItems: 'center', color: '#fff' },
  backBtn: { background: 'none', border: 'none', color: '#fff', fontSize: '20px', cursor: 'pointer', padding: '0 10px' },
  loading: { backgroundColor: '#000', color: '#ff6600', height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', fontWeight: 'bold' },
  chatArea: { flex: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' },
  bubbleWrapper: { display: 'flex', width: '100%' },
  bubble: { maxWidth: '75%', padding: '12px 16px', borderRadius: '15px', color: '#fff', fontSize: '15px', boxShadow: '0 2px 5px rgba(0,0,0,0.2)' },
  time: { fontSize: '10px', opacity: 0.5, textAlign: 'right', marginTop: '4px' },
  inputContainer: { padding: '15px 20px', backgroundColor: '#111', display: 'flex', gap: '10px', borderTop: '1px solid #222' },
  input: { flex: 1, padding: '12px 20px', borderRadius: '25px', border: '1px solid #333', backgroundColor: '#222', color: '#fff', outline: 'none', fontSize: '15px' },
  sendBtn: { backgroundColor: '#ff6600', color: '#fff', border: 'none', borderRadius: '20px', padding: '0 20px', fontWeight: 'bold', cursor: 'pointer' }
};

export default Chat;
