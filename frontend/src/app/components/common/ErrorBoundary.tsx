import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RotateCcw, ArrowLeft } from "lucide-react";
import { Button } from "@/app/components/ui/button";

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an unhandled error:", error, errorInfo);
  }

  public handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[360px] w-full flex items-center justify-center p-6 bg-slate-50/80 rounded-2xl border border-dashed border-slate-300">
          <div className="max-w-md w-full bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-200 text-center space-y-4">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="space-y-1.5">
              <h3 className="font-bold text-gray-900 text-base">
                {this.props.fallbackTitle || "Đã xảy ra lỗi khi tải khu vực này"}
              </h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                Hệ thống gặp sự cố hiển thị dữ liệu tạm thời. Vui lòng thử tải lại hoặc quay về giao diện trước.
              </p>
              {this.state.error?.message && (
                <div className="p-2.5 bg-rose-50 text-rose-700 text-[11px] rounded-lg border border-rose-200 text-left font-mono break-words mt-2">
                  {this.state.error.message}
                </div>
              )}
            </div>

            <div className="flex items-center justify-center gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.history.back()}
                className="text-xs font-semibold text-gray-700 border-gray-300 gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Quay lại
              </Button>
              <Button
                size="sm"
                onClick={this.handleReset}
                className="text-xs font-semibold bg-[#075985] hover:bg-[#0369a1] text-white gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Thử lại
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
