import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import MainLayout from './layouts/MainLayout';
import { LoginPage, RegisterPage } from './pages/Auth';
import ChatAdvisor from './pages/ChatAdvisor';
import { RecommendationsList, RecommendationDetail } from './pages/Recommendations';
import { KnowledgeBase, HowItWorks, FAQs, Contact, AccountSettings } from './pages/UserPages';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminKnowledge from './pages/admin/AdminKnowledge';
import AdminRules from './pages/admin/AdminRules';
import AdminEquipment from './pages/admin/AdminEquipment';
import AdminTestRules from './pages/admin/AdminTestRules';
import AdminTraces from './pages/admin/AdminTraces';
import AdminUsers from './pages/admin/AdminUsers';
import AdminSettings from './pages/admin/AdminSettings';

function Protected({ children, adminOnly }) {
  const { user, loading, isAdmin } = useAuth();
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-appbg">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="mt-3 text-sm text-muted">Loading Solar Advisor…</p>
        </div>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && !isAdmin) return <Navigate to="/advisor" replace />;
  if (!adminOnly && isAdmin) return <Navigate to="/admin" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      <Route element={<Protected><MainLayout /></Protected>}>
        <Route path="/advisor" element={<ChatAdvisor />} />
        <Route path="/recommendations" element={<RecommendationsList />} />
        <Route path="/recommendations/:id" element={<RecommendationDetail />} />
        <Route path="/knowledge" element={<KnowledgeBase />} />
        <Route path="/how-it-works" element={<HowItWorks />} />
        <Route path="/faqs" element={<FAQs />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/account" element={<AccountSettings />} />
      </Route>

      <Route path="/admin" element={<Protected adminOnly><MainLayout /></Protected>}>
        <Route index element={<AdminDashboard />} />
        <Route path="knowledge" element={<AdminKnowledge />} />
        <Route path="rules" element={<AdminRules />} />
        <Route path="equipment" element={<AdminEquipment />} />
        <Route path="test-rules" element={<AdminTestRules />} />
        <Route path="traces" element={<AdminTraces />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="settings" element={<AdminSettings />} />
      </Route>

      <Route path="/" element={<Navigate to="/advisor" replace />} />
      <Route path="*" element={<Navigate to="/advisor" replace />} />
    </Routes>
  );
}
