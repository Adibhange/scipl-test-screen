-- Feature 5/8/9 follow-up: candidate document storage (resume, application
-- form, passport photo). Nothing in the base schema or Admin system covered
-- this, so this migration introduces it from scratch rather than extending
-- an existing subsystem.

alter table public.candidates add column if not exists resume_path text;
alter table public.candidates add column if not exists resume_uploaded_at timestamptz;
alter table public.candidates add column if not exists application_form_path text;
alter table public.candidates add column if not exists application_form_uploaded_at timestamptz;
alter table public.candidates add column if not exists passport_photo_path text;
alter table public.candidates add column if not exists passport_photo_uploaded_at timestamptz;

-- Private bucket — documents are only ever served via short-lived signed
-- URLs generated server-side with the service-role key, never a public URL.
insert into storage.buckets (id, name, public)
values ('candidate-documents', 'candidate-documents', false)
on conflict (id) do nothing;

-- All reads/writes to this bucket go through the service-role key from
-- server-only code (see lib/candidate-documents.ts), which bypasses RLS by
-- design in this codebase's existing Supabase adapter pattern. No anon/authenticated
-- storage policies are added, so the bucket is unreachable from the browser
-- or from any Supabase client using the publishable key.
