-- Master Login & Candidate Share Links foundation
-- Feature 1 (Master Login) is stateless (signed cookie, no DB session table required).
-- This migration lays the schema groundwork for Feature 3/11/12/13 (candidate share links),
-- which will be wired into the repository/adapter/API layers in the next build phase.

create extension if not exists "pgcrypto";

create table if not exists candidate_shares (
	id uuid primary key default gen_random_uuid(),
	candidate_id uuid not null references candidates(id) on delete cascade,
	share_token uuid not null default gen_random_uuid() unique,
	status text not null default 'active' check (status in ('active', 'revoked', 'expired')),
	validity_hours smallint not null default 6 check (validity_hours in (1, 6, 12)),
	created_by text not null,
	created_at timestamptz not null default now(),
	expires_at timestamptz not null,
	revoked_by text,
	revoked_at timestamptz,
	revoke_reason text,
	access_count integer not null default 0,
	last_accessed_at timestamptz
);

-- Enforce a single active share link per candidate at the database level.
create unique index if not exists candidate_shares_one_active_per_candidate
	on candidate_shares (candidate_id)
	where (status = 'active');

create index if not exists candidate_shares_token_idx on candidate_shares (share_token);
create index if not exists candidate_shares_candidate_idx on candidate_shares (candidate_id);
create index if not exists candidate_shares_status_idx on candidate_shares (status);

comment on table candidate_shares is 'Permanent-URL share tokens granting Master-session-gated access to a single candidate profile. One active token per candidate; revoked tokens are archived, never reused.';
