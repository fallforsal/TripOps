"use client";

import { Toaster as Sonner, ToasterProps } from "sonner";
import { AlertCircle, CheckCircle2, Info, LoaderCircle, TriangleAlert } from "lucide-react";

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      richColors
      closeButton
      position="top-right"
      duration={5000}
      visibleToasts={3}
      gap={12}
      offset={20}
      mobileOffset={12}
      containerAriaLabel="Thông báo hệ thống"
      className="tripops-toaster"
      icons={{ success: <CheckCircle2 className="h-5 w-5" />, error: <AlertCircle className="h-5 w-5" />,
        warning: <TriangleAlert className="h-5 w-5" />, info: <Info className="h-5 w-5" />,
        loading: <LoaderCircle className="h-5 w-5 animate-spin" /> }}
      toastOptions={{ closeButtonAriaLabel: "Đóng thông báo", classNames: { toast: "tripops-toast", title: "tripops-toast-title", description: "tripops-toast-description" } }}
      {...props}
    />
  );
};

export { Toaster };
