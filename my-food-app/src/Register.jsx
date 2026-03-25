import React, { useState } from 'react';
import { supabase } from './supabase'; 
import { useNavigate } from 'react-router-dom';

const Register = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [role, setRole] = useState('customer'); // เปลี่ยนจาก user เป็น customer เพื่อความชัดเจน
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. สมัครสมาชิกในระบบ Auth ของ Supabase
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email,
        password: password,
      });

      if (authError) throw authError;

      if (authData.user) {
        // 2. บันทึกข้อมูลลงตาราง public.users
        const { error: dbError } = await supabase
          .from('users')
          .insert([
            { 
              id: authData.user.id, 
              username: username,
              email: email, 
              role: role,
              // ✅ เงื่อนไข: ถ้าสมัครเป็น customer ให้ผ่านเลย (true) 
              // ถ้าสมัครเป็น rider ให้รออนุมัติ (false)
              is_approved: role === 'customer' ? true : false 
            }
          ]);

        if (dbError) throw dbError;

        // แจ้งเตือนแยกตามประเภท
        if (role === 'rider') {
          alert("สมัครไรเดอร์สำเร็จ! 🎉 โปรดรอแอดมินตรวจสอบและอนุมัติบัญชีของคุณ");
        } else {
          alert("สมัครสมาชิกสำเร็จ! ยินดีต้อนรับครับ 🎉");
        }
        
        navigate('/login');
      }
    } catch (error) {
      alert("เกิดข้อผิดพลาด: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <form onSubmit={handleRegister} style={styles.form}>
        <div style={styles.logoContainer}>
            <img 
                src="https://img5.pic.in.th" 
                alt="Logo" 
                style={styles.logo} 
            />
        </div>

        <h2 style={{ textAlign: 'center', color: '#ff6600', marginBottom: '20px' }}>📝 สมัครสมาชิกใหม่</h2>
        
        <div style={styles.inputGroup}>
            <label style={styles.label}>ชื่อผู้ใช้ (Username)</label>
            <input type="text" style={styles.input} onChange={(e) => setUsername(e.target.value)} required />
        </div>

        <div style={styles.inputGroup}>
            <label style={styles.label}>อีเมล (Email)</label>
            <input type="email" style={styles.input} onChange={(e) => setEmail(e.target.value)} required />
        </div>

        <div style={styles.inputGroup}>
            <label style={styles.label}>รหัสผ่าน (Password)</label>
            <input type="password" style={styles.input} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        
        <div style={styles.inputGroup}>
          <label style={styles.label}>สมัครในฐานะ:</label>
          <select style={styles.input} value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="customer">🛒 ลูกค้าทั่วไป (สั่งอาหาร)</option>
            <option value="rider">🛵 ไรเดอร์ (ส่งอาหาร)</option>
          </select>
        </div>

        <button type="submit" disabled={loading} style={styles.button}>
          {loading ? 'กำลังบันทึกข้อมูล...' : 'ยืนยันการสมัครสมาชิก'}
        </button>
        
        <p style={{ textAlign: 'center', marginTop: '20px', color: '#bbb' }}>
          มีบัญชีอยู่แล้ว? <span style={{ color: '#ff6600', cursor: 'pointer', fontWeight: 'bold' }} onClick={() => navigate('/login')}>เข้าสู่ระบบ</span>
        </p>
      </form>
    </div>
  );
};

// --- การจัดการ Styles ให้เป็นระเบียบ ---
const styles = {
    container: { display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: '#000000', fontFamily: "'Kanit', sans-serif" },
    form: { backgroundColor: '#1a1a1a', padding: '40px', borderRadius: '20px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)', width: '100%', maxWidth: '400px' },
    logoContainer: { display: 'flex', justifyContent: 'center', marginBottom: '20px' },
    logo: { width: '80px', height: '80px', objectFit: 'contain', borderRadius: '15px' },
    inputGroup: { marginBottom: '15px' },
    label: { display: 'block', color: '#eee', marginBottom: '5px', fontSize: '14px' },
    input: { width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #333', backgroundColor: '#2a2a2a', color: 'white', boxSizing: 'border-box', fontSize: '16px' },
    button: { width: '100%', padding: '14px', marginTop: '10px', backgroundColor: '#ff6600', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px', transition: '0.3s' }
};

export default Register;
