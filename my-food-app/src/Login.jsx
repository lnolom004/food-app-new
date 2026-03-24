const handleLogin = async (e) => {
  e.preventDefault();
  setLoading(true);

  // 1. ล็อกอินผ่านระบบ Auth หลักของ Supabase ก่อน
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: email,
    password: password,
  });

  if (authError) {
    alert("อีเมลหรือรหัสผ่านไม่ถูกต้องครับ!");
    setLoading(false);
    return;
  }

  // 2. ดึงข้อมูลเสริมจากตาราง 'users' (Public) เพื่อเช็ค Role และ Status
  const { data: userData, error: userError } = await supabase.from('users')
    .select('role, is_approved')
    .eq('id', authData.user.id)
    .single();

  if (userData) {
    // --- กรณีที่เป็น ไรเดอร์ ---
    if (userData.role === 'rider') {
      if (userData.is_approved === false) {
        // ถ้ายังไม่อนุมัติ ให้ล็อกเอาท์ออกทันทีและแจ้งเตือน
        await supabase.auth.signOut();
        alert("🚨 บัญชีไรเดอร์ของคุณอยู่ระหว่างการตรวจสอบ โปรดรอการยืนยันจากแอดมินครับ");
        setLoading(false);
        return;
      } else {
        // ถ้าอนุมัติแล้ว ส่งไปหน้าไรเดอร์
        navigate('/rider-dashboard');
      }
    } 
    // --- กรณีที่เป็น ลูกค้า (User) หรือ แอดมิน ---
    else {
      alert("ยินดีต้อนรับกลับมาครับ!");
      navigate('/order'); // ส่งไปหน้าสั่งอาหารทันที
    }
  }

  setLoading(false);
};
