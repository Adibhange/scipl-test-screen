-- Updates share link validity options from 1/6/12 hours to 1/12/24 hours.
-- Run this AFTER 20260723_master_login_candidate_shares.sql.

alter table candidate_shares drop constraint if exists candidate_shares_validity_hours_check;
alter table candidate_shares add constraint candidate_shares_validity_hours_check
	check (validity_hours in (1, 12, 24));

alter table candidate_shares alter column validity_hours set default 12;
