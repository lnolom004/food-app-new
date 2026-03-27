import React, { useState } from 'react';
import { supabase } from './supabase';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-hot-toast'; // ✅ ใช้ Toast แจ้งเตือนสวยๆ

const Register = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [username, setUsername] = useState('');
    const [role, setRole] = useState('customer'); // ค่าเริ่มต้นคือลูกค้า
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleRegister = async (e) => {
        e.preventDefault();
        setLoading(true);

        // 1. สร้าง User ในระบบ Auth (ประตูบานที่ 1)
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email,
            password,
        });

        if (authError) {
            toast.error("❌ สมัครไม่สำเร็จ: " + authError.message);
            setLoading(false);
            return;
        }

        if (authData.user) {
            // 2. บันทึกโปรไฟล์ลงตาราง public.users (ประตูบานที่ 2)
            // 💡 สำคัญ: ชื่อคอลัมน์ต้องตรงกับ SQL ที่เรากดยืนยันไป
            const { error: profileError } = await supabase.from('users').insert([
                {
                    id: authData.user.id,
                    username: username,
                    email: email,
                    role: role,
                    is_approved: role === 'rider' ? false : true, // Rider ต้องรอแอดมินอนุมัติ
                    is_online: false,
                    created_at: new Date()
                }
            ]);

            if (profileError) {
                // ถ้าบานที่ 2 พัง (เช่น ติด RLS) ให้แจ้งเตือนตรงนี้
                toast.error("❌ สร้างโปรไฟล์ไม่สำเร็จ: " + profileError.message);
                console.error(profileError);
            } else {
                toast.success(role === 'rider' 
                    ? "🛵 สมัครไรเดอร์สำเร็จ! กรุณารอแอดมินอนุมัติ" 
                    : "🎉 สมัครสมาชิกสำเร็จ! เข้าสู่ระบบได้เลย", 
                    { duration: 5000 }
                );
                navigate('/login');
            }
        }
        setLoading(false);
    };

    return (
        <div style={styles.container}>
            <div style={styles.card}>
                <h2 style={styles.title}>🍱 สมัครสมาชิกใหม่</h2>
                <form onSubmit={handleRegister} style={styles.form}>
                    <input 
                        type="text" placeholder="ชื่อเล่น/ชื่อผู้ใช้งาน" style={styles.input}
                        value={username} onChange={(e) => setUsername(e.target.value)} required 
                    />
                    <input 
                        type="email" placeholder="อีเมลของคุณ" style={styles.input}
                        value={email} onChange={(e) => setEmail(e.target.value)} required 
                    />
                    <input 
                        type="password" placeholder="รหัสผ่าน (6 ตัวขึ้นไป)" style={styles.input}
                        value={password} onChange={(e) => setPassword(e.target.value)} required 
                    />
                    
                    <div style={styles.roleContainer}>
                        <label style={{ color: '#888', fontSize: '14px' }}>สมัครในฐานะ:</label>
                        <select style={styles.select} value={role} onChange={(e) => setRole(e.target.value)}>
                            <option value="customer">🛒 ลูกค้า (สั่งอาหาร)</option>
                            <option value="rider">🛵 ไรเดอร์ (ส่งอาหาร)</option>
                        </select>
                    </div>

                    <button type="submit" disabled={loading} style={styles.btn}>
                        {loading ? 'กำลังบันทึกข้อมูล...' : 'ลงทะเบียน'}
                    </button>
                </form>
                
                <p style={styles.footerText}>
                    เป็นสมาชิกอยู่แล้ว? <Link to="/login" style={styles.link}>เข้าสู่ระบบ</Link>
                </p>
            </div>
        </div>
    );
};

const styles = {
    container: { background: '#000', minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', fontFamily: 'Kanit' },
    card: { background: '#111', padding: '40px', borderRadius: '30px', width: '100%', maxWidth: '380px', textAlign: 'center', border: '1px solid #222' },
    title: { color: '#ff6600', marginBottom: '25px', fontWeight: 'bold' },
    form: { display: 'flex', flexDirection: 'column', gap: '15px' },
    input: { padding: '12px', borderRadius: '12px', border: '1px solid #333', background: '#000', color: '#fff', outline: 'none' },
    roleContainer: { textAlign: 'left', marginTop: '5px' },
    select: { width: '100%', padding: '10px', marginTop: '5px', borderRadius: '10px', background: '#222', color: '#fff', border: 'none' },
    btn: { padding: '15px', borderRadius: '12px', border: 'none', background: '#ff6600', color: '#fff', fontWeight: 'bold', cursor: 'pointer', fontSize: '16px' },
    footerText: { color: '#555', marginTop: '20px', fontSize: '14px' },
    link: { color: '#ff6600', textDecoration: 'none', fontWeight: 'bold' }
};

export default Register;
