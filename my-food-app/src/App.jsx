import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'; // ลบ BrowserRouter ออกจากบรรทัดนี้
import { supabase } from './supabase'; 

import OrderFood from './orderFood'; 
import Login from './Login';      
import Register from './Register'; 
import RiderDashboard from './rider'; 
import AdminDashboard from './admin'; 
import Chat from './chat'; 

const ProtectedRoute = ({ children, user }) => {
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

function App() {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null); 
  const [loading, setLoading] = useState(true);

  const fetchUserInfo = async (userId) => {
    try {
      const { data } = await supabase.from('users').select('role, is_approved').eq('id', userId).maybeSingle();
      setUserData(data);
    } catch (err) {
      setUserData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setUser(session.user);
        await fetchUserInfo(session.user.id);
      } else {
        setLoading(false);
      }
    };
    initAuth();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session) {
        setUser(session.user);
        await fetchUserInfo(session.user.id);
      } else {
        setUser(null);
        setUserData(null);
        setLoading(false);
      }
    });
    return () => authListener.subscription.unsubscribe();
  }, []);

  if (loading) return <div className="bg-black min-h-screen flex items-center justify-center text-orange-500">LOADING...</div>;

  return (
    // ✅ สังเกตตรงนี้: ไม่มีคำว่า <Router> แล้ว เริ่มที่ <Routes> ได้เลย
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/register" element={user ? <Navigate to="/" replace /> : <Register />} />
      <Route path="/order" element={<ProtectedRoute user={user}><OrderFood /></ProtectedRoute>} />
      <Route path="/rider" element={<ProtectedRoute user={user}><RiderDashboard /></ProtectedRoute>} />
      <Route path="/chat/:orderId" element={<ProtectedRoute user={user}><Chat /></ProtectedRoute>} />
      <Route path="/admin" element={<ProtectedRoute user={user}><AdminDashboard /></ProtectedRoute>} />
      <Route path="/" element={
        user ? (
          userData?.role === 'rider' ? <Navigate to="/rider" replace /> : <Navigate to="/order" replace />
        ) : <Navigate to="/login" replace />
      } />
    </Routes>
  );
}

export default App;
