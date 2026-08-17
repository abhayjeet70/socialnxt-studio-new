-- Tracks when a meeting was last edited, so the activity/notification feed
-- can distinguish "scheduled" from "updated" meetings (TC12).
alter table public.meetings add column updated_at timestamptz;
