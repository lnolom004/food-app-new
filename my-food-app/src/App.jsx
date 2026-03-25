  return (
    <div style={styles.container}>
      {/* ส่วนหัว */}
      <header style={styles.header}>
        <button onClick={() => navigate(-1)} style={styles.backBtn}>⬅️ กลับ</button>
        <div style={{ flex: 1, textAlign: 'center' }}>
          <h3 style={{ margin: 0, color: '#ff6600' }}>💬 ห้องแชทติดต่อ</h3>
          <small style={{ color: '#888' }}>ออเดอร์: #{orderId?.slice(0, 8)}</small>
        </div>
      </header>

      {/* ส่วนแสดงข้อความ */}
      <div style={styles.chatArea}>
        {messages.map((msg) => {
          const isMe = msg.sender_id === myInfo.id;
          return (
            <div key={msg.id} style={{ ...styles.bubbleWrapper, justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
              <div style={{ ...styles.bubble, backgroundColor: isMe ? '#ff6600' : '#2a2a2a' }}>
                {msg.content}
                <div style={styles.time}>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
              </div>
            </div>
          );
        })}
        <div ref={scrollRef} />
      </div>

      {/* --- ส่วนที่แก้ไข: ล็อคขนาดช่องพิมพ์ --- */}
      <div style={styles.inputOuterContainer}>
        <form onSubmit={handleSendMessage} style={styles.inputForm}>
          <input 
            type="text" 
            placeholder="พิมพ์ข้อความที่นี่..." 
            style={styles.textInput}
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            autoComplete="off"
          />
          <button type="submit" style={styles.submitBtn}>ส่ง</button>
        </form>
      </div>
    </div>
  );
};

const styles = {
  container: { backgroundColor: '#000', height: '100vh', display: 'flex', flexDirection: 'column', fontFamily: "'Kanit', sans-serif" },
  header: { padding: '15px', backgroundColor: '#111', borderBottom: '1px solid #222', display: 'flex', alignItems: 'center', color: '#fff' },
  backBtn: { background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: '10px' },
  chatArea: { flex: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' },
  bubbleWrapper: { display: 'flex', width: '100%' },
  bubble: { maxWidth: '75%', padding: '12px 16px', borderRadius: '15px', color: '#fff', fontSize: '15px' },
  time: { fontSize: '10px', opacity: 0.5, textAlign: 'right', marginTop: '4px' },
  loading: { backgroundColor: '#000', color: '#ff6600', height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' },

  // *** ส่วนที่ปรับปรุงใหม่เพื่อความชัวร์ ***
  inputOuterContainer: {
    padding: '15px',
    backgroundColor: '#111',
    borderTop: '1px solid #222'
  },
  inputForm: {
    display: 'flex',
    width: '100%',
    alignItems: 'center',
    gap: '10px'
  },
  textInput: {
    flex: '1',               // บังคับให้ช่องพิมพ์ขยายเต็มพื้นที่ที่เหลือ
    height: '45px',
    padding: '0 20px',
    borderRadius: '25px',
    border: '1px solid #333',
    backgroundColor: '#222',
    color: '#fff',
    outline: 'none',
    fontSize: '15px'
  },
  submitBtn: {
    width: '80px',           // ล็อคความกว้างปุ่มไม่ให้ยาวเกินไป
    height: '45px',
    backgroundColor: '#ff6600',
    color: '#fff',
    border: 'none',
    borderRadius: '25px',
    fontWeight: 'bold',
    cursor: 'pointer',
    flexShrink: 0            // ห้ามปุ่มหดตัว
  }
};

export default Chat;
