import { lazy, Suspense, useEffect, useState } from 'react';
import { Alert, Spin } from 'antd';
import { chatApi } from '../../services/chat';
import { fromApiTour } from '../../services/wf02Tours';
import { fetchCatalogue } from '../../services/catalogue';
import { useAuth } from '../../contexts/AuthContext';
import type { Tour, Service } from '../../types';

const TourDetailPage = lazy(() => import('../user/TourDetailPage').then(m => ({default:m.TourDetailPage})));

export function ChatTourPage({ reference, onClose }: {
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

  return <main className="min-h-screen bg-slate-50 p-4 sm:p-6">
      <header className="mx-auto mb-5 flex max-w-6xl items-center justify-between rounded-xl border bg-white p-4">
        <h1 className="font-semibold">Thông tin tour trong tin nhắn{tour?.is_request ? ` · Phiên bản v${tour.version}` : ''}</h1>
        <a href="#/tours" className="text-sm text-sky-800">Khám phá tour</a>
      </header>
      {error ? <div className="mx-auto max-w-6xl"><Alert type="error" showIcon message={error}/></div> : !tour ? <div className="p-12 text-center"><Spin tip="Đang tải tour…"/></div> :
        <Suspense fallback={<div className="p-12 text-center"><Spin/></div>}>
          <TourDetailPage tour={tour} services={services} currentUser={user} onBack={onClose} previewOnly/>
        </Suspense>}
  </main>;
}
