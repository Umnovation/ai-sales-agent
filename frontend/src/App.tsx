import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { DashboardLayout } from "@/shared/layouts/DashboardLayout";
import { LoginPage } from "@/features/auth/LoginPage";
import { DashboardPage } from "@/features/dashboard/DashboardPage";
import { FlowEditorPage } from "@/features/flow-editor/FlowEditorPage";
import { ChatsPage } from "@/features/chat/ChatsPage";
import { SettingsPage } from "@/features/settings/SettingsPage";
import { useAuthStore } from "@/shared/hooks/useAuth";

function ProtectedRoute({
  children,
}: {
  readonly children: React.ReactElement;
}): React.ReactElement {
  const token = useAuthStore((s) => s.token);
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function App(): React.ReactElement {
  return (
    <BrowserRouter>
      <Toaster position="top-right" richColors closeButton />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<DashboardPage />} />
          <Route path="/flow" element={<FlowEditorPage />} />
          <Route path="/chats" element={<ChatsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
