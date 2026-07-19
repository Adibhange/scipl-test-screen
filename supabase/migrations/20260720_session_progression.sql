-- Drop the constraint that prevents duplicate emails globally
alter table public.candidates drop constraint if exists candidates_email_key;

-- Add a composite constraint to allow multiple records for the same email across different vacancies
alter table public.candidates add constraint candidates_email_role_experience_key unique (email, role, experience);

-- Create a dedicated exam sessions table for tracking progression and multi-device tokens
create table if not exists public.exam_sessions (
  candidate_id uuid references public.candidates(id) on delete cascade,
  role text not null,
  experience text not null,
  is_exam_started integer not null default 0,
  is_exam_submitted integer not null default 0,
  active_session_token text,
  seconds_used integer not null default 0,
  started_at timestamptz,
  expires_at timestamptz,
  submitted_at timestamptz,
  primary key (candidate_id, role, experience)
);

-- Enable row-level security on the new table
alter table public.exam_sessions enable row level security;

-- Drop existing policies if they exist
drop policy if exists "Allow all for service_role" on public.exam_sessions;
drop policy if exists "Allow anon read" on public.exam_sessions;

-- Policies: allow full access via service role (server-side operations)
create policy "Allow all for service_role" on public.exam_sessions
  for all using (true) with check (true);

-- Policies: allow anonymous read access for candidate verification in forms
create policy "Allow anon read" on public.exam_sessions
  for select to anon using (true);
