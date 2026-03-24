import React, { useState } from 'react';
import { supabase } from './src/supabase';
import { useNavigate, Link } from 'react-router-dom';

function Register() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('customer'); // ค่าเริ่มต้นตามฐานข้อมูล
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);

    // 🚀 ส่งข้อมูลไปที่ตาราง users ใน Supabase
    const { data, error } = await supabase
      .from('users')
      .insert([
        { 
          username: username, 
          email: email, 
          password: password, 
          role: role 
        }
      ]);

    if (error) {
      alert('การสมัครสมาชิกล้มเหลว: ' + error.message);
    } else {
      alert(`ยินดีด้วย! สมัครสมาชิกในฐานะ ${role === 'customer' ? 'ลูกค้า' : 'ไรเดอร์'} สำเร็จแล้วครับเพื่อน`);
      // เมื่อสมัครเสร็จ ให้เด้งไปหน้า Login ทันที
      navigate('/login');
    }
    setLoading(false);
  };

  return (
    <div className="container" style={{ maxWidth: '450px', marginTop: '50px' }}>
      <div className="card shadow-sm" style={{ padding: '30px' }}>
        <h2 style={{ textAlign: 'center', color: '#ff6600', marginBottom: '25px' }}>📝 สมัครสมาชิกใหม่</h2>
        
        <form onSubmit={handleRegister}>
          <div style={inputGroup}>
            <label>ชื่อผู้ใช้ (Username):</label>
            <input 
              type="text" 
              placeholder="กรอกชื่อของคุณ" 
              value={username} 
              onChange={(e) => setUsername(e.target.value)} 
              required 
            />
          </div>

          <div style={inputGroup}>
            <label>อีเมล (Email):</label>
            <input 
              type="email" 
              placeholder="example@mail.com" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              required 
            />
          </div>

          <div style={inputGroup}>
            <label>รหัสผ่าน (Password):</label>
            <input 
              type="password" 
              placeholder="กำหนดรหัสผ่านของคุณ" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required 
            />
          </div>

          <div style={inputGroup}>
            <label>สมัครในฐานะ:</label>
            <select 
              value={role} 
              onChange={(e) => setRole(e.target.value)} 
              style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }}
            >
              <option value="customer">🛒 ลูกค้า (สั่งอาหาร)</option>
              <option value="rider">🛵 ไรเดอร์ (ส่งอาหาร)</option>
            </select>
          </div>

          <button 
            type="submit" 
            className="primary" 
            disabled={loading} 
            style={{ marginTop: '20px', fontSize: '18px' }}
          >
            {loading ? 'กำลังบันทึกข้อมูล...' : 'ยืนยันการสมัครสมาชิก'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '14px' }}>
          มีบัญชีอยู่แล้ว? <Link to="/login" style={{ color: '#ff6600', fontWeight: 'bold' }}>เข้าสู่ระบบที่นี่</Link>
        </p>
      </div>
    </div>
  );
}

// --- Styles ภายในไฟล์ ---
const inputGroup = {
  display: 'flex',
  flexDirection: 'column',
  marginBottom: '15px',
  textAlign: 'left'
};

export default Register;
