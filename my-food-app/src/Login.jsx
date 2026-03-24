import React, { useState } from 'react';
import { supabase } from './supabase';
import { useNavigate, Link } from 'react-router-dom';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    // 1. ตรวจสอบข้อมูลในตาราง users ของเรา
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .eq('password', password) // ในโปรเจกต์ทดสอบเราเช็กแบบนี้ได้ครับ
      .single();

    if (error || !data) {
      alert('อีเมลหรือรหัสผ่านไม่ถูกต้องครับเพื่อน!');
      setLoading(false);
      return;
    }

    // 2. เก็บข้อมูลผู้ใช้เบื้องต้น (เผื่อไว้ใช้หน้าอื่น)
    localStorage.setItem('user_role', data.role);
    localStorage.setItem('user_name', data.username);

    // 3. แยกเส้นทางตามตำแหน่ง (Role) ที่เราตั้งไว้ในฐานข้อมูล
    alert(`ยินดีต้อนรับคุณ ${data.username} (${data.role})`);
    
    if (data.role === 'admin') {
      navigate('/admin');
    } else if (data.role === 'rider') {
      navigate('/rider');
    } else {
      navigate('/order'); // ลูกค้าไปหน้าสั่งอาหาร
    }

    setLoading(false);
  };

  return (
    <div className="container" style={{ maxWidth: '400px', marginTop: '50px' }}>
      <div className="card shadow-sm" style={{ padding: '30px', textAlign: 'center' }}>
        <h2 style={{ color: '#ff6600', marginBottom: '20px' }}>🍔 เข้าสู่ระบบ</h2>
        <form onSubmit={handleLogin}>
          <div style={{ textAlign: 'left' }}>
            <label>อีเมล:</label>
            <input 
              type="email" 
              placeholder="example@mail.com" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              required 
            />
          </div>
          <div style={{ textAlign: 'left' }}>
            <label>รหัสผ่าน:</label>
            <input 
              type="password" 
              placeholder="••••••••" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required 
            />
          </div>
          <button type="submit" className="primary" disabled={loading} style={{ marginTop: '10px' }}>
            {loading ? 'กำลังตรวจสอบ...' : 'เข้าสู่ระบบ'}
          </button>
        </form>
        <p style={{ marginTop: '20px', fontSize: '14px' }}>
          ยังไม่มีบัญชี? <Link to="/register" style={{ color: '#ff6600', fontWeight: 'bold' }}>สมัครสมาชิกที่นี่</Link>
        </p>
      </div>
    </div>
  );
}

export default Login;
