import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './supabase';

function Chat() {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [username, setUsername] = useState('ผู้ใช้ทั่วไป');
  const scrollRef = useRef(null);

  // --- 1. ดึงข้อความเก่า และ ดักฟังข้อความใหม่ (Realtime) ---
  useEffect(() => {
    fetchMessages();

    const channel = supabase
      .channel('chat-room')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        setMessages((prev) => [...prev, payload.new]);
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  // --- 2. เลื่อนหน้าจอลงล่างสุดเมื่อมีข้อความใหม่ ---
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchMessages = async () => {
    const { data } = await supabase.from('messages').select('*').order('created_at', { ascending: true });
    if (data) setMessages(data);
  };

  // --- 3. ส่งข้อความ ---
  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const { error } = await supabase.from('messages').insert();

    if (!error) setNewMessage('');
    else alert('ส่งข้อความไม่สำเร็จ: ' + error.message);
  };

  return (
    <div style={chatContainer}>
      <div style={headerStyle}>💬 ห้องแชทส่วนกลาง</div>
      
      {/* ส่วนตั้งชื่อเล่น */}
      <div style={{ padding: '10px', background: '#eee' }}>
        <small>ชื่อของคุณ: </small>
        <input 
          type="text" 
          value={username} 
          onChange={(e) => setUsername(e.target.value)} 
          style={nameInputStyle}
        />
      </div>

      {/* รายการข้อความ */}
      <div style={messageListStyle}>
        {messages.map((msg) => (
          <div key={msg.id} style={msg.sender_name === username ? myMsgStyle : otherMsgStyle}>
            <small style={{ display: 'block', fontWeight: 'bold' }}>{msg.sender_name}</small>
            <span>{msg.text}</span>
          </div>
        ))}
        <div ref={scrollRef} />
      </div>

      {/* ช่องพิมพ์ข้อความ */}
      <form onSubmit={sendMessage} style={inputAreaStyle}>
        <input 
          type="text" 
          placeholder="พิมพ์ข้อความ..." 
          value={newMessage} 
          onChange={(e) => setNewMessage(e.target.value)} 
          style={textInputStyle}
        />
        <button type="submit" style={sendBtnStyle}>ส่ง</button>
      </form>
    </div>
  );
}

// --- Styles ---
const chatContainer = { maxWidth: '500px', margin: 'auto', height: '80vh', display: 'flex', flexDirection: 'column', border: '1px solid #ddd', borderRadius: '10px', overflow: 'hidden', backgroundColor: 'white' };
const headerStyle = { backgroundColor: '#ff6600', color: 'white', padding: '15px', textAlign: 'center', fontWeight: 'bold' };
const messageListStyle = { flex: 1, padding: '15px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' };
const myMsgStyle = { alignSelf: 'flex-end', backgroundColor: '#ff6600', color: 'white', padding: '8px 12px', borderRadius: '15px 15px 0 15px', maxWidth: '80%' };
const otherMsgStyle = { alignSelf: 'flex-start', backgroundColor: '#e9e9eb', color: '#333', padding: '8px 12px', borderRadius: '15px 15px 15px 0', maxWidth: '80%' };
const inputAreaStyle = { display: 'flex', padding: '10px', borderTop: '1px solid #eee' };
const textInputStyle = { flex: 1, padding: '10px', borderRadius: '20px', border: '1px solid #ddd', outline: 'none' };
const nameInputStyle = { border: 'none', background: 'transparent', fontWeight: 'bold', outline: 'none', color: '#ff6600' };
const sendBtnStyle = { marginLeft: '10px', backgroundColor: '#ff6600', color: 'white', border: 'none', padding: '0 20px', borderRadius: '20px', cursor: 'pointer' };

export default Chat;
