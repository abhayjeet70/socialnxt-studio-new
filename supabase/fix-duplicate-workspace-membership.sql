-- Step 1: See both memberships for the affected email, to decide which one to keep.
SELECT wm.id AS membership_id, wm.role, wm.agency_role, wm.created_at,
       w.id AS workspace_id, w.name AS workspace_name
FROM public.workspace_members wm
JOIN public.workspaces w ON w.id = wm.workspace_id
JOIN public.users u ON u.id = wm.user_id
WHERE u.email = 'support@webnxt.co'
ORDER BY wm.created_at;

-- Step 2: Once you've identified the membership_id you DON'T want to keep
-- (the one from step 1's output for the wrong workspace), delete just that row:
-- DELETE FROM public.workspace_members WHERE id = '<membership_id-to-remove>';
