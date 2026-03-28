// ... (ส่วนการ Import และ Fetch ข้อมูลเมนูเหมือนเดิม) ...

const [payMethod, setPayMethod] = useState('cash'); // 👈 เพิ่ม State วิธีจ่ายเงิน

const handleOrder = async () => {
    if (cart.length === 0 || !addr.trim()) return toast.error("ข้อมูลไม่ครบ");
    
    // ขอพิกัด GPS เพื่อความแม่นยำ
    navigator.geolocation.getCurrentPosition(async (pos) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            
            const orderData = {
                user_id: user.id,
                items: cart,
                total_price: totalPrice,
                address: addr.trim(),
                note: note.trim(),
                lat: pos.coords.latitude,   
                lng: pos.coords.longitude,  
                status: 'pending',
                payment_method: payMethod, // 👈 ส่งค่า 'cash' หรือ 'transfer' ไปที่ DB
                payment_status: 'waiting'
            };

            const { error } = await supabase.from('orders').insert([orderData]);
            if (error) throw error;

            toast.success("สั่งอาหารสำเร็จ! เตรียมชำระเงินปลายทางนะครับ");
            navigate('/myorders'); 
        } catch (err) { toast.error("สั่งซื้อล้มเหลว"); }
    });
};

// --- ส่วน UI ใน Return ก่อนปุ่มสั่งซื้อ ---
<div style={{ marginBottom: '15px' }}>
    <p style={{ fontSize: '14px', color: '#888' }}>💳 เลือกวิธีชำระเงินปลายทาง:</p>
    <div style={{ display: 'flex', gap: '10px', marginTop: '5px' }}>
        <button 
            onClick={() => setPayMethod('cash')} 
            style={payMethod === 'cash' ? st.tabAct : st.tab}
        >💵 เงินสด</button>
        <button 
            onClick={() => setPayMethod('transfer')} 
            style={payMethod === 'transfer' ? st.tabAct : st.tab}
        >📱 โอนจ่าย</button>
    </div>
</div>
