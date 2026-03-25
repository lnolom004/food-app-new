import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from './supabase';

const Chat = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [myId, setMyId] = useState(null);
  const scrollRef = useRef();

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setMyId(user.id);

      const { data } = await supabase.from('messages').select('*').eq('order_id', orderId).order('created_at');
      setMessages(data || []);

      const channel = supabase.channel(`chat-${orderId}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `order_id=eq.${orderId}` }, 
        payload => setMessages(prev => [...prev, payload.new]))
        .subscribe();
      return () => supabase.removeChannel(channel);
    };
    init();
  }, [orderId]);

  useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    const { error } = await supabase.from('messages').insert([{ order_id: orderId, sender_id: myId, content: newMessage }]);
    if (!error) setNewMessage('');
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <button onClick={() => navigate(-1)} style={styles.backBtn}>⬅️ กลับ</button>
        <div style={{ flex: 1, textAlign: 'center' }}>
          <h3 style={{ margin: 0 }}>💬 ห้องแชท</h3>
        </div>
      </header>

      <div style={styles.chatArea}>
        {messages.map(m => (
          <div key={m.id} style={{ ...styles.bubble, alignSelf: m.sender_id === myId ? 'flex-end' : 'flex-start', backgroundColor: m.sender_id === myId ? '#ff6600' : '#333' }}>
            {m.content}
          </div>
        ))}
        <div ref={scrollRef} />
      </div>

      {/* --- ส่วนช่องพิมพ์ที่แก้ใหม่ --- */}
      <div style={styles.footer}>
        <form onSubmit={sendMessage} style={styles.form}>
          <input 
            type="text" 
            value={newMessage} 
            onChange={(e) => setNewMessage(e.target.value)} 
            placeholder="พิมพ์ข้อความ..." 
            style={styles.input}
          />
          <button type="submit" style={styles.sendBtn}>ส่ง</button>
        </form>
      </div>
    </div>
  );
};

const styles = {
  container: { backgroundColor: '#000', height: '100vh', display: 'flex', flexDirection: 'column', color: '#fff', fontFamily: 'Kanit' },
  header: { padding: '15px', borderBottom: '1px solid #222', display: 'flex', alignItems: 'center' },
  backBtn: { color: '#fff', background: 'none', border: 'none', cursor: 'pointer' },
  chatArea: { flex: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' },
  bubble: { maxWidth: '70%', padding: '10px 15px', borderRadius: '15px', fontSize: '14px' },
  footer: { padding: '15px', backgroundColor: '#111', borderTop: '1px solid #222' },
  form: { display: 'flex', gap: '10px', width: '100%' },
  input: { flex: 1, padding: '12px', borderRadius: '25px', border: '1px solid #333', backgroundColor: '#222', color: '#fff', outline: 'none' },
  sendBtn: { padding: '10px 25px', backgroundColor: '#ff6600', color: '#fff', border: 'none', borderRadius: '25px', fontWeight: 'bold' }
};

export default Chat;
