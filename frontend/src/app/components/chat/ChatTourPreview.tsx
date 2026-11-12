import { lazy, Suspense, useEffect, useState } from 'react';
import { Alert, Spin } from 'antd';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '../ui/dialog';
import { chatApi } from '../../services/chat';
import { fromApiTour } from '../../services/wf02Tours';
import { fetchCatalogue } from '../../services/catalogue';
import { useAuth } from '../../contexts/AuthContext';
import type { Tour, Service } from '../../types';

const TourDetailPage = lazy(() => import('../user/TourDetailPage').then(m => ({default:m.TourDetailPage})));

export function ChatTourPreview({ reference, onClose }: {
  reference: {conversationId: number; messageId: number}; onClose: () => void;
}) {
  const { user } = useAuth();
  const [tour, setTour] = useState<Tour | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [error, setError] = useState('');
  useEffect(() => {
    let alive = true; const controller = new AbortController();
    setTour(null); setError('');
    chatApi.tour(reference.conversationId, reference.messageId, controller.signal)
      .then(data => { if (alive) setTour(fromApiTour(data)); })
      .catch(e => { if (alive) setError(e instanceof Error ? e.message : 'Không tải được thông tin tour.'); });
    fetchCatalogue().then(data => { if (alive) setServices(data); }).catch(() => {});
    return () => { alive = false; controller.abort(); };
  }, [reference.conversationId, reference.messageId, user?.id]);

  return <Dialog open onOpenChange={open => { if (!open) onClose(); }}>
    <DialogContent className="chat-tour-preview sm:max-w-[1180px] w-[calc(100%-2rem)] max-h-[90dvh] overflow-y-auto block p-0" style={{zIndex:1200}}>
      <div className="border-b border-slate-200 bg-white p-4 pr-12">
        <DialogTitle>Thông tin tour trong tin nhắn{tour?.is_request ? ` · Phiên bản v${tour.version}` : ''}</DialogTitle>
        <DialogDescription>Xem lịch trình, khách sạn và thông tin chuyến đi.</DialogDescription>
      </div>
      {error ? <div className="p-5"><Alert type="error" showIcon message={error}/></div> : !tour ? <div className="p-12 text-center"><Spin tip="Đang tải tour…"/></div> :
        <Suspense fallback={<div className="p-12 text-center"><Spin/></div>}>
          <TourDetailPage tour={tour} services={services} currentUser={user} onBack={onClose} previewOnly/>
        </Suspense>}
    </DialogContent>
  </Dialog>;
}
