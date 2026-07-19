import { Routes, Route } from 'react-router-dom';
import Nav from './components/Nav';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './pages/Home';
import FoodOrder from './pages/FoodOrder';
import TailorBooking from './pages/TailorBooking';
import BusTimings from './pages/BusTimings';
import NearbyShops from './pages/NearbyShops';
import AiAssistant from './pages/AiAssistant';
import Login from './pages/Login';
import Register from './pages/Register';
import VerifyOtp from './pages/VerifyOtp';
import MyBookings from './pages/MyBookings';
import ShopDashboard from './pages/ShopDashboard';
import AdminDashboard from './pages/AdminDashboard';

export default function App() {
  return (
    <>
      <Nav />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/food" element={<FoodOrder />} />
        <Route path="/tailor" element={<TailorBooking />} />
        <Route path="/bus-timings" element={<BusTimings />} />
        <Route path="/nearby-shops" element={<NearbyShops />} />
        <Route
          path="/assistant"
          element={<ProtectedRoute><AiAssistant /></ProtectedRoute>}
        />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/verify-otp" element={<VerifyOtp />} />
        <Route
          path="/my-bookings"
          element={<ProtectedRoute><MyBookings /></ProtectedRoute>}
        />
        <Route
          path="/shop"
          element={<ProtectedRoute requireRole="SHOP_OWNER"><ShopDashboard /></ProtectedRoute>}
        />
        <Route
          path="/admin"
          element={<ProtectedRoute requireRole="ADMIN"><AdminDashboard /></ProtectedRoute>}
        />
      </Routes>
    </>
  );
}
