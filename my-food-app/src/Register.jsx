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
      // 1. สร้างบัญชีในระบบ Authentication
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email,
        password: password,
      });

      if (authError) throw authError;

      // 2. ถ้าสมัครใน Auth สำเร็จ ให้เอา ID ไปสร้าง Profile ในตาราง users
      if (authData.user) {
        const { error: dbError } = await supabase
          .from('users')
          .insert([
            { 
              id: authData.user.id, 
              username: username,
              email: email, 
              role: role,
              // ถ้าเป็น user ทั่วไป ให้เป็น true (ใช้งานได้เลย) 
              // ถ้าเป็น rider ให้เป็น false (รอแอดมิน)
              is_approved: role === 'user' ? true : false 
            }
          ]);

        if (dbError) throw dbError;

        alert("สมัครสมาชิกสำเร็จ! 🎉\n" + (role === 'rider' ? "กรุณารอแอดมินอนุมัติบัญชีไรเดอร์ครับ" : "คุณสามารถเข้าสู่ระบบได้ทันที"));
        navigate('/login');
      }
    } catch (error) {
      console.error("Register Error:", error.message);
      alert("สมัครสมาชิกไม่สำเร็จ: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={containerStyle}>
      <form onSubmit={handleRegister} style={formStyle}>
        <h2 style={{ textAlign: 'center', color: '#ff6600' }}>📝 สมัครสมาชิกใหม่</h2>
        
        <input type="text" placeholder="ชื่อผู้ใช้ (Username)" style={inputStyle} onChange={(e) => setUsername(e.target.value)} required />
        <input type="email" placeholder="อีเมล (Email)" style={inputStyle} onChange={(e) => setEmail(e.target.value)} required />
        <input type="password" placeholder="รหัสผ่าน (Password)" style={inputStyle} onChange={(e) => setPassword(e.target.value)} required />
        
        <div style={{ marginTop: '15px' }}>
          <label>ต้องการสมัครเป็น:</label>
          <select style={inputStyle} value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="user">🛒 ลูกค้าทั่วไป (สั่งอาหาร)</option>
            <option value="rider">🛵 ไรเดอร์ (ส่งอาหาร)</option>
          </select>
        </div>

        <button type="submit" disabled={loading} style={buttonStyle}>
          {loading ? 'กำลังบันทึกข้อมูล...' : 'ยืนยันการสมัครสมาชิก'}
        </button>
        
        <p style={{ textAlign: 'center', marginTop: '15px' }}>
          มีบัญชีอยู่แล้ว? <span style={{ color: '#ff6600', cursor: 'pointer' }} onClick={() => navigate('/login')}>เข้าสู่ระบบ</span>
        </p>
      </form>
    </div>
  );
};

// Styles
const containerStyle = { display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: '#f5f5f5' };
const formStyle = { backgroundColor: 'white', padding: '30px', borderRadius: '15px', boxShadow: '0 4px 10px rgba(0,0,0,0.1)', width: '380px' };
const inputStyle = { width: '100%', padding: '12px', marginTop: '10px', borderRadius: '8px', border: '1px solid #ddd', boxSizing: 'border-box' };
const buttonStyle = { width: '100%', padding: '12px', marginTop: '20px', backgroundColor: '#ff6600', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' };

export default Register;
