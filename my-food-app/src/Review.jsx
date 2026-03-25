import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from './supabase';

const Review = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchOrder = async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();
      
      if (data) setOrder(data);
      setLoading(false);
    };
    fetchOrder();
  }, [orderId]);

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    const { data: { user } } = await supabase.auth.getUser();

    // 1. บันทึกข้อมูลรีวิว
    const { error: reviewError } = await supabase
      .from('reviews')
      .insert([{
        order_id: orderId,
        user_id: user.id,
        rating: rating,
        comment: comment
      }]);

    if (!reviewError) {
      // 2. อัปเดตสถานะออเดอร์ว่ารีวิวแล้ว
      await supabase
        .from('orders')
        .update({ is_reviewed: true })
        .eq('id', orderId);

      alert("ขอบคุณสำหรับคำติชมครับ! ❤️");
      navigate('/order'); // กลับไปหน้าสั่งอาหาร
    } else {
      alert("เกิดข้อผิดพลาด: " + reviewError.message);
    }
    setSubmitting(false);
  };

  if (loading) return <div style={styles.loader}>กำลังโหลดข้อมูลออเดอร์...</div>;

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <button onClick={() => navigate(-1)} style={styles.backBtn}>⬅️ กลับ</button>
        <h3 style={{ margin: 0 }}>⭐ รีวิวการให้บริการ</h3>
      </header>

      <main style={styles.main}>
        <div style={styles.orderBrief}>
          <p>ออเดอร์: <b>#{orderId.slice(0, 8)}</b></p>
          <p>ยอดชำระ: <span style={{color:'#ff6600'}}>฿{order?.total_price}</span></p>
        </div>

        <form onSubmit={handleSubmitReview} style={styles.card}>
          <h4 style={{ textAlign: 'center', marginBottom: '10px' }}>คะแนนความพึงพอใจ</h4>
          
          {/* ส่วนการเลือกดาว */}
          <div style={styles.starRow}>
            {[1, 2, 3, 4, 5].map((num) => (
              <span 
                key={num} 
                onClick={() => setRating(num)}
                style={{ 
                  fontSize: '40px', 
                  cursor: 'pointer', 
                  color: num <= rating ? '#ffcc00' : '#444' 
                }}
              >
                ★
              </span>
            ))}
          </div>

          <p style={{ textAlign: 'center', color: '#888', fontSize: '14px' }}>
            {rating === 5 ? 'ดีเยี่ยมที่สุด!' : rating === 4 ? 'ดีมาก' : rating === 3 ? 'ปานกลาง' : 'ควรปรับปรุง'}
          </p>

          <textarea
            placeholder="เขียนความคิดเห็นเพิ่มเติมเกี่ยวกับรสชาติอาหารหรือการส่ง..."
            style={styles.textarea}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows="4"
          />

          <button 
            type="submit" 
            disabled={submitting} 
            style={styles.submitBtn}
          >
            {submitting ? 'กำลังบันทึก...' : 'ยืนยันการให้คะแนน'}
          </button>
        </form>
      </main>
    </div>
  );
};

const styles = {
  container: { backgroundColor: '#000', minHeight: '100vh', color: '#fff', fontFamily: 'Kanit' },
  header: { padding: '20px', backgroundColor: '#111', display: 'flex', alignItems: 'center', gap: '15px', borderBottom: '1px solid #222' },
  backBtn: { background: 'none', border: 'none', color: '#ff6600', fontSize: '18px', cursor: 'pointer' },
  main: { padding: '20px' },
  orderBrief: { backgroundColor: '#111', padding: '15px', borderRadius: '12px', marginBottom: '20px', border: '1px solid #222' },
  card: { backgroundColor: '#111', padding: '25px', borderRadius: '20px', border: '1px solid #333', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' },
  starRow: { display: 'flex', justifyContent: 'center', gap: '10px', marginBottom: '10px' },
  textarea: { width: '100%', padding: '15px', backgroundColor: '#222', color: '#fff', border: '1px solid #444', borderRadius: '12px', marginTop: '20px', boxSizing: 'border-box', outline: 'none' },
  submitBtn: { width: '100%', padding: '15px', backgroundColor: '#ff6600', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 'bold', fontSize: '16px', marginTop: '20px', cursor: 'pointer' },
  loader: { height: '100vh', backgroundColor: '#000', color: '#ff6600', display: 'flex', justifyContent: 'center', alignItems: 'center' }
};

export default Review;
