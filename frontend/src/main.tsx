import { Toaster } from "./app/components/ui/sonner";
import { NotificationDialogs } from "./app/components/ui/NotificationDialogs";
import { ChatProvider } from "./app/contexts/ChatContext";
import { ChatWidget } from "./app/components/chat/ChatPanel";
import { AuthProvider } from "./app/contexts/AuthContext";
import { createRoot } from "react-dom/client";
import App from "./app/App.tsx";
import "./styles/index.css";

createRoot(document.getElementById("root")!).render(
  <AuthProvider>
    <ChatProvider>
      <App />
      <ChatWidget />
    </ChatProvider>
    <Toaster />
    <NotificationDialogs />
  </AuthProvider>,
);
