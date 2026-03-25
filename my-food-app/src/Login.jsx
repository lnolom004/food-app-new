import React, { useState } from 'react';
// เปลี่ยนการ import ให้ตรงกับชื่อไฟล์ supabase.js ในโปรเจกต์ของคุณ
import { supabase } from './supabase'; 
import { useNavigate } from 'react-router-dom';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. ล็อกอินผ่านระบบหลัก (Authentication)
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });

      if (authError) {
        alert("อีเมลหรือรหัสผ่านไม่ถูกต้องครับ!");
        setLoading(false);
        return;
      }

      const userId = authData?.user?.id;

      if (userId) {
        // 2. ดึงข้อมูลจากตาราง 'users' เพื่อเช็คบทบาท (Role)
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('role, is_approved')
          .eq('id', userId)
          .single();

        if (userError) {
          console.error("User DB Error:", userError);
          alert("ไม่พบข้อมูลผู้ใช้ในฐานข้อมูล กรุณาติดต่อแอดมิน");
          await supabase.auth.signOut();
          setLoading(false);
          return;
        }

        if (userData) {
          // --- แยกการทำงานระหว่าง Rider และ User ทั่วไป ---
          
          if (userData.role === 'rider') {
            // กรณีเป็น ไรเดอร์: ต้องรออนุมัติก่อน
            if (userData.is_approved === false) {
              alert("⚠️ บัญชีไรเดอร์ของคุณอยู่ระหว่างตรวจสอบ โปรดรอการยืนยันครับ");
              await supabase.auth.signOut();
              setLoading(false);
              return;
            } else {
              alert("ยินดีต้อนรับกลับมาครับ (Rider)");
              navigate('/rider-dashboard'); // หรือพาไปหน้าที่คุณสร้างไว้สำหรับไรเดอร์
            }
          } 
          else {
            // กรณีเป็น User ทั่วไป: ให้เข้าใช้งานได้ง่ายๆ ทันที
            alert("เข้าสู่ระบบสำเร็จ!");
            navigate('/order'); // ส่งไปหน้าสั่งอาหาร (สอดคล้องกับไฟล์ orderFood.jsx)
          }
        }
      }

    } catch (err) {
      console.error("Unexpected error:", err);
      alert("เกิดข้อผิดพลาดบางอย่าง กรุณาลองใหม่อีกครั้ง");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', 
      justifyContent: 'center', height: '100vh', fontFamily: 'Arial, sans-serif'
    }}>
      <div style={{
        padding: '30px', borderRadius: '15px', boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
        backgroundColor: 'white', width: '350px'
      }}>
        <h2 style={{ textAlign: 'center', color: '#ff6600' }}>🍔 เข้าสู่ระบบ</h2>
        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: '15px' }}>
            <label>อีเมล</label>
            <input 
              type="email" 
              style={{ width: '100%', padding: '10px', marginTop: '5px', borderRadius: '5px', border: '1px solid #ddd' }}
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              required 
            />
          </div>
          <div style={{ marginBottom: '20px' }}>
            <label>รหัสผ่าน</label>
            <input 
              type="password" 
              style={{ width: '100%', padding: '10px', marginTop: '5px', borderRadius: '5px', border: '1px solid #ddd' }}
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required 
            />
          </div>
          <button 
            type="submit" 
            disabled={loading}
            style={{ 
              width: '100%', padding: '12px', backgroundColor: loading ? '#ccc' : '#ff6600', 
              color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold'
            }}
          >
            {loading ? 'กำลังโหลด...' : 'เข้าสู่ระบบ'}
          </button>
        </form>
        <p style={{ textAlign: 'center', marginTop: '15px', fontSize: '14px' }}>
          ยังไม่มีบัญชี? <span style={{ color: '#ff6600', cursor: 'pointer' }} onClick={() => navigate('/register')}>สมัครสมาชิกที่นี่</span>
        </p>
      </div>
    </div>
  );
};

export default Login;
