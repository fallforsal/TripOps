import { AuthProvider } from "./app/contexts/AuthContext";

import { createRoot } from "react-dom/client";
import App from "./app/App.tsx";
import { Toaster } from "sonner";
import "./styles/index.css";

createRoot(document.getElementById("root")!).render(
  <AuthProvider>
    <App />
    <Toaster richColors position="top-right" />
  </AuthProvider>,
);
