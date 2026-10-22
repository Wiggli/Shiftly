-- Independent backend. No user data or credentials belong in this file.
create schema if not exists shiftly_private;
revoke all on schema shiftly_private from public, anon, authenticated;
grant usage on schema shiftly_private to service_role;
create table shiftly_private.calendars(id text primary key,owner text not null,owner_name text,name text not null,timezone text not null,settings text not null default '{}',revision bigint not null default 0,rowid bigint generated always as identity);
create table shiftly_private.calendar_members(id text primary key,calendar_id text not null references shiftly_private.calendars(id) on delete cascade,"user" text not null,email text not null,role text not null check(role in ('viewer','editor')),roster_id text,rowid bigint generated always as identity);
create index member_access on shiftly_private.calendar_members(calendar_id,"user");
create table shiftly_private.calendar_records(id text primary key,calendar_id text not null references shiftly_private.calendars(id) on delete cascade,kind text not null,date text,author text not null,private integer not null default 0,data text not null,rowid bigint generated always as identity);
create index records_month on shiftly_private.calendar_records(calendar_id,kind,date);
create table shiftly_private.sharing_invites(id text primary key,calendar_id text not null references shiftly_private.calendars(id) on delete cascade,email text not null,role text not null check(role in ('viewer','editor')),expires text not null,revoked integer not null default 0,roster_id text,rowid bigint generated always as identity);
create table shiftly_private.operations(id text primary key,calendar_id text not null,author text not null,at text not null,summary text not null,rowid bigint generated always as identity);
create table shiftly_private.identity_links(google_user_id text primary key,principal text unique not null,linked_at text not null);
alter table shiftly_private.calendars enable row level security;
alter table shiftly_private.calendar_members enable row level security;
alter table shiftly_private.calendar_records enable row level security;
alter table shiftly_private.sharing_invites enable row level security;
alter table shiftly_private.operations enable row level security;
alter table shiftly_private.identity_links enable row level security;
grant select,insert,update,delete on all tables in schema shiftly_private to service_role;
grant usage,select on all sequences in schema shiftly_private to service_role;
create function shiftly_private.json_path(path text) returns text[] language sql immutable set search_path=pg_catalog as $$ select string_to_array(replace(regexp_replace(path,'^\$\.?',''),'"',''),'.') $$;
create function shiftly_private.json_extract(doc text,path text) returns text language sql immutable set search_path=pg_catalog as $$ select doc::jsonb #>> shiftly_private.json_path(path) $$;
create function shiftly_private.json_set_json(doc text,path text,value jsonb) returns text language plpgsql immutable set search_path=pg_catalog as $$
declare result jsonb:=doc::jsonb; parts text[]:=shiftly_private.json_path(path); i integer;
begin
 for i in 1..coalesce(array_length(parts,1),0)-1 loop
  if result #> parts[1:i] is null then result:=jsonb_set(result,parts[1:i],'{}'::jsonb,true); end if;
 end loop;
 return jsonb_set(result,parts,coalesce(value,'null'::jsonb),true)::text;
end $$;
-- A private compatibility bridge used solely by the authenticated Edge backend.
-- Application authorization remains in the shared, regression-tested API handlers.
create function public.shiftly_exec(statements jsonb) returns jsonb language plpgsql security invoker set search_path=shiftly_private,pg_catalog as $$
declare statement jsonb; query text; rows jsonb; count bigint; output jsonb:='[]';
begin
 if jsonb_typeof(statements)<>'array' or jsonb_array_length(statements)>2000 then raise exception 'Invalid batch'; end if;
 perform pg_advisory_xact_lock(817423660401);
 for statement in select value from jsonb_array_elements(statements) loop
  query:=statement->>'sql';
  if query ~* '^\s*SELECT\s' then
   execute 'select coalesce(jsonb_agg(to_jsonb(r)),''[]''::jsonb) from ('||query||') r' into rows;
   count:=0;
  elsif query ~* '^\s*(INSERT|UPDATE|DELETE)\s' then
   execute query; get diagnostics count=row_count; rows:='[]';
  else raise exception 'Unsupported statement'; end if;
  output:=output||jsonb_build_array(jsonb_build_object('results',rows,'success',true,'meta',jsonb_build_object('changes',count)));
 end loop;
 return output;
end $$;
revoke all on function public.shiftly_exec(jsonb) from public,anon,authenticated;
grant execute on function public.shiftly_exec(jsonb) to service_role;
revoke all on all functions in schema shiftly_private from public,anon,authenticated;
grant execute on all functions in schema shiftly_private to service_role;
