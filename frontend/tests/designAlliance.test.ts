import {test} from "node:test";
import assert from "node:assert/strict";
import {normalizeDesignHosts,hasDesignPartners,countPendingCoHostInvites} from "../src/app/lib/designAlliance.ts";
const lead={companyId:"A",companyName:"A",role:"lead" as const,status:"accepted" as const};
const falseLead={companyId:"B",companyName:"B",role:"lead" as const,status:"pending" as const};
const partner={...falseLead,role:"partner" as const};
test("an unrelated stale host is never presented as a partner or alliance",()=>{
  const hosts=normalizeDesignHosts([lead,falseLead],"A");
  assert.deepEqual(hosts,[lead]);assert.equal(hasDesignPartners(hosts),false);
  assert.equal(countPendingCoHostInvites([{id:"1",targetCompanyId:"A",status:"reviewing",coHosts:[lead,falseLead]}],[],"B"),0);
});
test("the lead receiving a request is not a pending co-host invitation",()=>{
  assert.equal(countPendingCoHostInvites([{id:"1",targetCompanyId:"A",status:"pending",coHosts:[{...lead,status:"pending"}]}],[],"A"),0);
});
test("an actual partner invitation is counted once even if also present in the tour",()=>{
  const request={id:"1",targetCompanyId:"A",status:"reviewing",coHosts:[lead,partner]};
  const tour={id:"10",companyId:"A",customRequestId:"1",coHosts:[lead,partner]};
  assert.equal(countPendingCoHostInvites([request],[tour],"B"),1);
  assert.equal(hasDesignPartners(normalizeDesignHosts(request.coHosts,"A")),true);
  assert.equal(countPendingCoHostInvites([{...request,archivedAt:"2026-11-11"}],[tour],"B"),0);
});
test("accepted or revoked partners do not count as pending and closed requests do not invite",()=>{
  for(const status of ["accepted","revoked"] as const)
    assert.equal(countPendingCoHostInvites([{id:"1",targetCompanyId:"A",status:"reviewing",coHosts:[lead,{...partner,status}]}],[],"B"),0);
  assert.equal(countPendingCoHostInvites([{id:"1",targetCompanyId:"A",status:"closed",coHosts:[lead,partner]}],[],"B"),0);
});
