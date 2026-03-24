import React, { useEffect, useState } from 'react';
import { supabase } from './supabase';

export default function OrderFood() {
  const [menus, setMenus] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchMenus = async () => {
    try {
      setLoading(true);
      // ดึงข้อมูลจากตาราง menus (ตัวเล็กทั้งหมด)
      const { data, error } = await supabase
        .from('menus')
        .select('id, name, price, image_url, category');

      if (error) throw error;
      setMenus(data || []);
    } catch (err) {
      console.error("Error fetching menus:", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMenus();
  }, []);

  if (loading) return <div className="text-center p-10">กำลังเปิดสมุดเมนู...</div>;

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold text-center mb-8 text-orange-600">🍽️ รายการอาหารอร่อย</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {menus.map((item) => (
          <div key={item.id} className="bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow">
            <img 
              src={item.image_url || 'https://via.placeholder.com'} 
              alt={item.name}
              className="w-full h-44 object-cover"
            />
            <div className="p-4">
              <h3 className="font-bold text-lg text-gray-800">{item.name}</h3>
              <p className="text-gray-500 text-sm mb-2">{item.category || 'อาหารทั่วไป'}</p>
              <div className="flex justify-between items-center">
                <span className="text-xl font-bold text-orange-500">฿{item.price}</span>
                <button className="bg-orange-500 text-white px-4 py-1 rounded-full text-sm hover:bg-orange-600">
                  สั่งเลย
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
