-- Repair stale lead memberships; this does not create partner invitations or send notifications.
SET XACT_ABORT ON;
BEGIN TRANSACTION;
UPDATE a SET status='cancelled',responded_at=SYSUTCDATETIME()
FROM tour_design_request_agencies a JOIN tour_design_requests r ON r.id=a.request_id
WHERE a.is_host=1 AND a.agency_id<>r.agency_id AND a.status<>'cancelled';
INSERT INTO tour_design_request_agencies(request_id,agency_id,is_host,status,stage_area,assigned_at,responded_at)
SELECT r.id,r.agency_id,1,CASE WHEN r.status='pending' THEN 'pending' WHEN r.status='rejected' THEN 'rejected' WHEN r.status='cancelled' THEN 'cancelled' ELSE 'accepted' END,
    N'',r.created_at,r.responded_at
FROM tour_design_requests r
WHERE r.agency_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM tour_design_request_agencies a WHERE a.request_id=r.id AND a.agency_id=r.agency_id);
COMMIT;
