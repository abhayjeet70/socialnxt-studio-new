-- Media library: tag team members on an asset.
alter table public.media_assets
  add column if not exists tagged_user_ids uuid[] not null default '{}';

create index if not exists media_assets_tagged_user_ids_idx
  on public.media_assets using gin (tagged_user_ids);
