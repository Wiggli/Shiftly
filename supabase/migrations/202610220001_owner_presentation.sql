-- Add presentation metadata without changing ownership, grants or schedule records.
alter table shiftly_private.calendars add column if not exists owner_name text;
with names as (
 select coalesce(l.principal,'google_'||u.id::text) as principal,
 left(btrim(coalesce(u.raw_user_meta_data->>'full_name',u.raw_user_meta_data->>'name','')),100) as display_name
 from auth.users u left join shiftly_private.identity_links l on l.google_user_id=u.id::text
)
update shiftly_private.calendars c set owner_name=n.display_name,revision=revision+1
from names n where c.owner=n.principal and c.owner_name is null
and n.display_name<>'' and position('@' in n.display_name)=0;
