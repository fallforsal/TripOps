import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import { AgencyPayoutPanel } from "@/app/components/agency/AgencyPayoutPanel";
import { AgencyRefundHistory } from "@/app/components/agency/AgencyRefundHistory";

/**
 * "Thu chi & Hoàn tiền" — gộp tiền quyết toán tour (trước ở Hồ sơ doanh nghiệp) và lịch sử hoàn tiền cho khách
 * (UC-068/UC-069, trước chỉ xem được trong chi tiết từng booking).
 */
export function AgencyFinancePage() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 pb-10">
      <Tabs defaultValue="payouts" className="space-y-4">
        <TabsList className="w-full justify-start border-b rounded-none bg-transparent h-auto p-0 mb-2 space-x-6">
          <TabsTrigger
            value="payouts"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#075985] data-[state=active]:bg-transparent data-[state=active]:shadow-none px-0 py-2 font-medium"
          >
            Tiền nhận từ tour
          </TabsTrigger>
          <TabsTrigger
            value="refunds"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#075985] data-[state=active]:bg-transparent data-[state=active]:shadow-none px-0 py-2 font-medium"
          >
            Hoàn tiền cho khách
          </TabsTrigger>
        </TabsList>
        <TabsContent value="payouts" className="mt-0">
          <AgencyPayoutPanel />
        </TabsContent>
        <TabsContent value="refunds" className="mt-0">
          <AgencyRefundHistory />
        </TabsContent>
      </Tabs>
    </div>
  );
}
