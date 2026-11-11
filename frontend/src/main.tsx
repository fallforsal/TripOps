import { ChatProvider } from './app/contexts/ChatContext';
import { ChatWidget } from './app/components/chat/ChatPanel';
import { Toaster } from "sonner";
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
    <Toaster richColors position="top-right" />
  </AuthProvider>,
);
