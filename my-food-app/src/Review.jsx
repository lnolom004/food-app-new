import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from './supabase';
import { toast } from 'react-hot-toast';

const Review = () => {
    const { orderId } = useParams();
    const navigate = useNavigate();
    
    const [rating, setRating] = useState(5);
    const [comment, setComment] = useState('');
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // 1. ตรวจสอบว่าออเดอร์นี้รีวิวไปหรือยัง ป้องกันการแอบรีวิวซ้ำ
    useEffect(() => {
        const checkOrder = async () => {
            const { data, error } = await supabase
                .from('orders')
                .select('is_reviewed, status')
                .eq('id', orderId)
                .single();

            if (error || !data || data.status !== 'completed' || data.is_reviewed) {
                toast.error("ออเดอร์นี้ไม่พร้อมสำหรับการรีวิว");
                navigate('/order');
                return;
            }
            setLoading(false);
        };
        checkOrder();
    }, [orderId, navigate]);

    // 2. ฟังก์ชันบันทึกรีวิวลงฐานข้อมูล
    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        const { data: { user } } = await supabase.auth.getUser();

        // ขั้นที่ 1: บันทึกลงตาราง reviews
        const { error: revError } = await supabase.from('reviews').insert([{
            order_id: orderId,
            user_id: user.id,
            rating: rating,
            comment: comment
        }]);

        if (revError) {
            toast.error("เกิดข้อผิดพลาดในการบันทึก");
            setIsSubmitting(false);
            return;
        }

        // ขั้นที่ 2: อัปเดตตาราง orders ว่ารีวิวเสร็จแล้ว
        await supabase.from('orders').update({ is_reviewed: true }).eq('id', orderId);

        toast.success("🎉 ขอบคุณสำหรับคะแนนรีวิวครับ!", { icon: '⭐' });
        navigate('/order');
    };

    if (loading) return <div style={st.loader}>⭐ กำลังเตรียมหน้าประเมินผล...</div>;

    return (
        <div style={st.container}>
            <div style={st.card}>
                <h2 style={{ color: '#f60', marginBottom: '10px' }}>⭐ ให้คะแนนบริการ</h2>
                <p style={{ color: '#888', fontSize: '14px', marginBottom: '20px' }}>ออเดอร์: #{orderId.slice(0, 8)}</p>

                <form onSubmit={handleSubmit}>
                    <div style={st.starBox}>
                        <p style={{ fontSize: '18px' }}>ระดับความพอใจ: <b>{rating} ดาว</b></p>
                        <input 
                            type="range" min="1" max="5" step="1" 
                            value={rating} 
                            onChange={(e) => setRating(parseInt(e.target.value))}
                            style={st.range}
                        />
                        <div style={st.emojiRow}>
                            <span>😟</span><span>😐</span><span>😊</span><span>😍</span><span>🤩</span>
                        </div>
                    </div>

                    <textarea 
                        style={st.textarea}
                        placeholder="เขียนคำชมหรือข้อเสนอแนะให้พวกเราหน่อยครับ..."
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        required
                    />

                    <button type="submit" disabled={isSubmitting} style={st.btnSubmit}>
                        {isSubmitting ? 'กำลังบันทึก...' : 'ส่งคำรีวิว'}
                    </button>
                </form>
            </div>
        </div>
    );
};

const st = {
    container: { background: '#000', minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px', fontFamily: 'Kanit' },
    card: { background: '#111', padding: '30px', borderRadius: '25px', width: '100%', maxWidth: '400px', textAlign: 'center', border: '1px solid #222' },
    starBox: { margin: '20px 0' },
    range: { width: '100%', accentColor: '#f60', cursor: 'pointer' },
    emojiRow: { display: 'flex', justifyContent: 'space-between', marginTop: '5px', fontSize: '20px' },
    textarea: { width: '100%', height: '100px', background: '#000', color: '#fff', border: '1px solid #333', borderRadius: '15px', padding: '15px', boxSizing: 'border-box', marginTop: '20px', outline: 'none' },
    btnSubmit: { width: '100%', padding: '15px', background: '#f60', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 'bold', fontSize: '16px', marginTop: '20px', cursor: 'pointer' },
    loader: { height: '100vh', background: '#000', color: '#f60', display: 'flex', justifyContent: 'center', alignItems: 'center' }
};

export default Review;
