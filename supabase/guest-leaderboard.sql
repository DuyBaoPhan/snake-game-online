-- Run in Supabase SQL Editor. Preserve the existing player_scores table/data.
-- No browser should receive the service-role/secret API key.
begin;
create table if not exists public.guest_score_submissions (
  player_id uuid primary key references public.player_scores(player_id) on delete cascade,
  submitted_at timestamptz not null default clock_timestamp()
);
alter table public.guest_score_submissions enable row level security;
revoke all on public.guest_score_submissions from public, anon, authenticated;

create or replace function public.submit_guest_score(p_player_id uuid, p_display_name text, p_score integer)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_best integer;
  previous_submission timestamptz;
begin
  if p_player_id is null or p_display_name is null or char_length(btrim(p_display_name)) not between 1 and 24
     or p_score is null or p_score < 0 or p_score > 5730 or p_score % 10 <> 0 then
    raise exception 'invalid_submission' using errcode = '22023';
  end if;
  -- Serialize this player's submissions across all serverless instances.
  perform pg_advisory_xact_lock(hashtextextended(p_player_id::text, 0));
  select submitted_at into previous_submission from public.guest_score_submissions where player_id = p_player_id;
  if previous_submission > clock_timestamp() - interval '1 second' then
    raise exception 'submission_cooldown' using errcode = 'P0001';
  end if;
  insert into public.player_scores (player_id, display_name, best_score, achieved_at)
    values (p_player_id, p_display_name, p_score, clock_timestamp())
  on conflict (player_id) do update set
    display_name = excluded.display_name,
    best_score = greatest(player_scores.best_score, excluded.best_score),
    achieved_at = case when excluded.best_score > player_scores.best_score then excluded.achieved_at else player_scores.achieved_at end
  returning best_score into current_best;
  insert into public.guest_score_submissions (player_id, submitted_at) values (p_player_id, clock_timestamp())
    on conflict (player_id) do update set submitted_at = excluded.submitted_at;
  return current_best;
end;
$$;
revoke all on function public.submit_guest_score(uuid, text, integer) from public, anon, authenticated;
grant execute on function public.submit_guest_score(uuid, text, integer) to service_role;
-- Prevent direct anonymous/client writes bypassing the server's validation.
alter table public.player_scores enable row level security;
revoke insert, update, delete on public.player_scores from anon, authenticated;
commit;
