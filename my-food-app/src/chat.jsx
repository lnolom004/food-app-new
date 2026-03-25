import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from './supabase'; 

const Chat = () => {
  const { orderId } = useParams(); 
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [myId, setMyId] = useState(null);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef(); 

  // 1. ระบบดึงข้อมูลและเชื่อมต่อ Realtime
  useEffect(() => {
    const setupChat = async () => {
      // ดึง ID ผู้ใช้ปัจจุบัน
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setMyId(user.id);

      // ดึงข้อความเก่าจากฐานข้อมูล
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: true });

      if (!error) setMessages(data || []);
      setLoading(false);

      // เปิดช่องทาง Realtime ฟังข้อความใหม่
      const channel = supabase
        .channel(`chat-${orderId}`)
        .on('postgres_changes', 
          { 
            event: 'INSERT', 
            schema: 'public', 
            table: 'messages', 
            filter: `order_id=eq.${orderId}` 
          }, 
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

  // 2. เลื่อนจอลงล่างสุดอัตโนมัติเมื่อมีข้อความใหม่
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
          sender_id: myId, 
          content: newMessage 
        }
      ]);

    if (!error) {
      setNewMessage(''); 
    } else {
      console.error("Error:", error.message);
      alert("ไม่สามารถส่งข้อความได้");
    }
  };

  if (loading) return <div style={styles.loading}>กำลังโหลดห้องแชท...</div>;

  return (
    <div style={styles.container}>
      {/* ส่วนหัว (Header) */}
      <header style={styles.header}>
        <button onClick={() => navigate(-1)} style={styles.backBtn}>⬅️ กลับ</button>
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

      {/* ส่วนช่องพิมพ์ (Input Area) - แก้ไขให้แสดงผลได้แน่นอนทุกหน้าจอ */}
      <form onSubmit={handleSendMessage} style={styles.inputContainer}>
        <input 
          type="text" 
          placeholder="พิมพ์ข้อความที่นี่..." 
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

// --- การตั้งค่าดีไซน์ (Dark Mode Pro) ---
const styles = {
  container: { 
    backgroundColor: '#000', 
    height: '100vh', 
    display: 'flex', 
    flexDirection: 'column', 
    fontFamily: "'Kanit', sans-serif" 
  },
  header: { 
    padding: '15px', 
    backgroundColor: '#111', 
    borderBottom: '1px solid #222', 
    display: 'flex', 
    alignItems: 'center', 
    color: '#fff' 
  },
  backBtn: { 
    background: 'none', 
    border: 'none', 
    color: '#fff', 
    fontSize: '16px', 
    cursor: 'pointer' 
  },
  loading: { 
    backgroundColor: '#000', 
    color: '#ff6600', 
    height: '100vh', 
    display: 'flex', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  chatArea: { 
    flex: 1, 
    padding: '20px', 
    overflowY: 'auto', 
    display: 'flex', 
    flexDirection: 'column', 
    gap: '12px' 
  },
  bubbleWrapper: { display: 'flex', width: '100%' },
  bubble: { 
    maxWidth: '75%', 
    padding: '12px 16px', 
    borderRadius: '15px', 
    color: '#fff', 
    fontSize: '15px' 
  },
  time: { fontSize: '10px', opacity: 0.5, textAlign: 'right', marginTop: '4px' },
  
  // จุดสำคัญ: จัดการให้ช่อง Input และปุ่มส่งไม่เบียดกันจนหาย
  inputContainer: { 
    padding: '15px 20px', 
    backgroundColor: '#111', 
    display: 'flex', 
    alignItems: 'center',
    gap: '10px', 
    borderTop: '1px solid #222' 
  },
  input: { 
    flex: 1, // ครองพื้นที่ที่เหลือทั้งหมด
    padding: '12px 20px', 
    borderRadius: '25px', 
    border: '1px solid #333', 
    backgroundColor: '#222', 
    color: '#fff', 
    outline: 'none', 
    fontSize: '15px',
    minWidth: '0' // ป้องกัน input หดจนหายในมือถือ
  },
  sendBtn: { 
    backgroundColor: '#ff6600', 
    color: '#fff', 
    border: 'none', 
    borderRadius: '20px', 
    padding: '10px 25px', 
    fontWeight: 'bold', 
    cursor: 'pointer',
    flexShrink: 0 // ป้องกันปุ่มหดตัว
  }
};

export default Chat;
