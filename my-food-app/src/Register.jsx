import React, { useState } from 'react';
import { supabase } from './supabase'; 
import { useNavigate } from 'react-router-dom';

const Register = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [role, setRole] = useState('user'); 
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email,
        password: password,
      });

      if (authError) throw authError;

      if (authData.user) {
        const { error: dbError } = await supabase
          .from('users')
          .insert([
            { 
              id: authData.user.id, 
              username: username,
              email: email, 
              role: role,
              is_approved: role === 'user' ? true : false 
            }
          ]);

        if (dbError) throw dbError;

        alert("สมัครสมาชิกสำเร็จ! 🎉");
        navigate('/login');
      }
    } catch (error) {
      alert("เกิดข้อผิดพลาด: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={containerStyle}>
      <form onSubmit={handleRegister} style={formStyle}>
        {/* ส่วนของโลโก้ หรือ รูปภาพด้านบน (ทำให้เท่ากัน) */}
        <div style={logoContainer}>
            <img 
                src="https://img5.pic.in.th" 
                alt="Logo" 
                style={logoStyle} 
            />
        </div>

        <h2 style={{ textAlign: 'center', color: '#ff6600', marginBottom: '20px' }}>📝 สมัครสมาชิกใหม่</h2>
        
        <div style={inputGroup}>
            <label style={labelStyle}>ชื่อผู้ใช้ (Username)</label>
            <input type="text" style={inputStyle} onChange={(e) => setUsername(e.target.value)} required />
        </div>

        <div style={inputGroup}>
            <label style={labelStyle}>อีเมล (Email)</label>
            <input type="email" style={inputStyle} onChange={(e) => setEmail(e.target.value)} required />
        </div>

        <div style={inputGroup}>
            <label style={labelStyle}>รหัสผ่าน (Password)</label>
            <input type="password" style={inputStyle} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        
        <div style={inputGroup}>
          <label style={labelStyle}>สมัครในฐานะ:</label>
          <select style={inputStyle} value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="user">🛒 ลูกค้าทั่วไป (สั่งอาหาร)</option>
            <option value="rider">🛵 ไรเดอร์ (ส่งอาหาร)</option>
          </select>
        </div>

        <button type="submit" disabled={loading} style={buttonStyle}>
          {loading ? 'กำลังบันทึกข้อมูล...' : 'ยืนยันการสมัครสมาชิก'}
        </button>
        
        <p style={{ textAlign: 'center', marginTop: '20px', color: '#bbb' }}>
          มีบัญชีอยู่แล้ว? <span style={{ color: '#ff6600', cursor: 'pointer', fontWeight: 'bold' }} onClick={() => navigate('/login')}>เข้าสู่ระบบ</span>
        </p>
      </form>
    </div>
  );
};

// --- Styles (Dark Theme & Uniformity) ---

const containerStyle = { 
    display: 'flex', 
    justifyContent: 'center', 
    alignItems: 'center', 
    minHeight: '100vh', 
    backgroundColor: '#000000', // พื้นหลังสีดำสนิท
    fontFamily: "'Kanit', sans-serif" 
};

const formStyle = { 
    backgroundColor: '#1a1a1a', // กล่องฟอร์มสีเทาเข้ม
    padding: '40px', 
    borderRadius: '20px', 
    boxShadow: '0 10px 30px rgba(0,0,0,0.5)', 
    width: '100%',
    maxWidth: '400px' 
};

const logoContainer = {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: '20px'
};

const logoStyle = {
    width: '80px',      // กำหนดความกว้างเท่ากัน
    height: '80px',     // กำหนดความสูงเท่ากัน
    objectFit: 'contain', // ปรับรูปให้พอดีไม่เบี้ยว
    borderRadius: '15px'
};

const inputGroup = {
    marginBottom: '15px'
};

const labelStyle = {
    display: 'block',
    color: '#eee',
    marginBottom: '5px',
    fontSize: '14px'
};

const inputStyle = { 
    width: '100%', 
    padding: '12px', 
    borderRadius: '10px', 
    border: '1px solid #333', 
    backgroundColor: '#2a2a2a', // พื้นหลังช่องกรอกสีเข้ม
    color: 'white', 
    boxSizing: 'border-box',
    fontSize: '16px'
};

const buttonStyle = { 
    width: '100%', 
    padding: '14px', 
    marginTop: '10px', 
    backgroundColor: '#ff6600', 
    color: 'white', 
    border: 'none', 
    borderRadius: '10px', 
    cursor: 'pointer', 
    fontWeight: 'bold',
    fontSize: '16px',
    transition: '0.3s'
};

export default Register;
