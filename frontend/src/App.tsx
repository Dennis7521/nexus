import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Navbar } from './components/Navbar';
import { Landing } from './pages/Landing';
import { About } from './pages/About';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { ForgotPassword } from './pages/ForgotPassword';
import { ChangePassword } from './pages/ChangePassword';
import { Dashboard } from './pages/Dashboard';
import { Browse } from './pages/Browse';
import { Profile } from './pages/Profile';
import { Messages } from './pages/Messages';
import { TransactionHistory } from './pages/TransactionHistory';
import { Requests } from './pages/Requests';
import { CreateSkill } from './pages/CreateSkill';
import { MySkills } from './pages/MySkills';
import { EditSkill } from './pages/EditSkill';
import Matches from './pages/Matches';
import { UserProfile } from './pages/UserProfile';
import ExchangeWorkspace from './pages/ExchangeWorkspace';
import SyncExchangeWorkspace from './pages/SyncExchangeWorkspace';
import { Admin } from './pages/Admin';
import { AdminLogin } from './pages/AdminLogin';
import { AdminProtectedRoute } from './components/AdminProtectedRoute';
import { AdminReports } from './pages/AdminReports';
import { AdminUserReports } from './pages/AdminUserReports';
import AdminSessionMonitor from './pages/AdminSessionMonitor';
import CreditStore from './pages/CreditStore';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-neutral-white">
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Landing />} />
            <Route path="/about" element={<About />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            
            {/* Semi-protected routes (requires token but may have special conditions) */}
            <Route path="/change-password" element={
              <ProtectedRoute>
                <ChangePassword />
              </ProtectedRoute>
            } />
            
            {/* Protected routes */}
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <div>
                  <Navbar />
                  <Dashboard />
                </div>
              </ProtectedRoute>
            } />
            
            <Route path="/browse" element={
              <ProtectedRoute>
                <div>
                  <Navbar />
                  <Browse />
                </div>
              </ProtectedRoute>
            } />
            
            <Route path="/profile" element={
              <ProtectedRoute>
                <div>
                  <Navbar />
                  <Profile />
                </div>
              </ProtectedRoute>
            } />
            
            <Route path="/messages" element={
              <ProtectedRoute>
                <div>
                  <Navbar />
                  <Messages />
                </div>
              </ProtectedRoute>
            } />
            
            <Route path="/transactions" element={
              <ProtectedRoute>
                <div>
                  <Navbar />
                  <TransactionHistory />
                </div>
              </ProtectedRoute>
            } />
            
            <Route path="/requests" element={
              <ProtectedRoute>
                <div>
                  <Navbar />
                  <Requests />
                </div>
              </ProtectedRoute>
            } />
            
            <Route path="/create-skill" element={
              <ProtectedRoute>
                <div>
                  <Navbar />
                  <CreateSkill />
                </div>
              </ProtectedRoute>
            } />
            
            <Route path="/my-skills" element={
              <ProtectedRoute>
                <div>
                  <Navbar />
                  <MySkills />
                </div>
              </ProtectedRoute>
            } />
            
            <Route path="/edit-skill/:skillId" element={
              <ProtectedRoute>
                <div>
                  <Navbar />
                  <EditSkill />
                </div>
              </ProtectedRoute>
            } />
            
            <Route path="/matches" element={
              <ProtectedRoute>
                <Matches />
              </ProtectedRoute>
            } />
            
            <Route path="/exchange/:exchangeId" element={
              <ProtectedRoute>
                <div>
                  <Navbar />
                  <ExchangeWorkspace />
                </div>
              </ProtectedRoute>
            } />
            
            <Route path="/sync-exchange/:cycleId" element={
              <ProtectedRoute>
                <SyncExchangeWorkspace />
              </ProtectedRoute>
            } />
            
            {/* Admin routes */}
            <Route path="/admin" element={<AdminLogin />} />
            
            <Route path="/admin/dashboard" element={
              <AdminProtectedRoute>
                <div>
                  <Navbar />
                  <Admin />
                </div>
              </AdminProtectedRoute>
            } />
            
            <Route path="/admin/reports" element={
              <AdminProtectedRoute>
                <div>
                  <Navbar />
                  <AdminReports />
                </div>
              </AdminProtectedRoute>
            } />
            
            <Route path="/admin/user-reports" element={
              <AdminProtectedRoute>
                <div>
                  <Navbar />
                  <AdminUserReports />
                </div>
              </AdminProtectedRoute>
            } />
            
            <Route path="/admin/session-monitor" element={
              <AdminProtectedRoute>
                <div>
                  <Navbar />
                  <AdminSessionMonitor />
                </div>
              </AdminProtectedRoute>
            } />
            
            <Route path="/credit-store" element={
              <ProtectedRoute>
                <div>
                  <Navbar />
                  <CreditStore />
                </div>
              </ProtectedRoute>
            } />
            
            <Route path="/user/:userId" element={<ProtectedRoute><div><Navbar /><UserProfile /></div></ProtectedRoute>} />
            {/* Redirect unknown routes to login */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
          </div>
        </Router>
      </AuthProvider>
  );
}

export default App;
