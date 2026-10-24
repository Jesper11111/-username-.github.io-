-- 黑暗大陸：血盟綁角色、刪角自動退盟／接班（第119節，2026-10-24）。
-- 使用者在 Supabase SQL Editor 整份執行；須先執行 char-tombstone.sql。
-- 先執行本檔再發佈20261024e。重跑supabase.sql後須再跑本檔。可重跑。
-- 舊名單依帳號＋名稱＋職業找唯一有效角色；同名同職業多隻會停止整份交易，請勿猜測配對。
begin;
lock table public.dragon_saves, public.dragon_deleted_chars, public.dragon_clans,
    public.dragon_clan_members, public.dragon_clan_apps in share row exclusive mode;

alter table public.dragon_clan_members add column if not exists id uuid not null default gen_random_uuid();
alter table public.dragon_clan_members add column if not exists char_created bigint;
alter table public.dragon_clan_apps add column if not exists id uuid not null default gen_random_uuid();
alter table public.dragon_clan_apps add column if not exists char_created bigint;
create unique index if not exists dragon_clan_members_id_idx on public.dragon_clan_members(id);
create unique index if not exists dragon_clan_apps_id_idx on public.dragon_clan_apps(id);

create or replace function public.clan_char_alive(u uuid, cr bigint, cl text) returns boolean
language sql stable security definer set search_path = '' as $$
    select cr is not null and exists (
        select 1 from public.dragon_saves s where s.user_id=u
        and s.data->'player'->>'created'=cr::text and s.data->'player'->>'cls'=cl
    ) and not exists (select 1 from public.dragon_deleted_chars d
        where d.user_id=u and d.char_created=cr and d.cls=cl);
$$;
revoke all on function public.clan_char_alive(uuid,bigint,text) from public,anon,authenticated;

do $$
declare r record; ids bigint[];
begin
    for r in select 'member' kind,id,user_id,name,cls,last_seen bound_at from public.dragon_clan_members where char_created is null
        union all select 'app',id,user_id,name,cls,at from public.dragon_clan_apps where char_created is null
    loop
        select array_agg(distinct (s.data->'player'->>'created')::bigint) into ids
        from public.dragon_saves s where s.user_id=r.user_id and s.data->'player'->>'name'=r.name
          and s.data->'player'->>'cls'=r.cls
          and (s.data->'player'->>'created')::bigint <= extract(epoch from r.bound_at)*1000
          and public.clan_char_alive(s.user_id,(s.data->'player'->>'created')::bigint,r.cls);
        if cardinality(ids)>1 then
            raise exception 'ambiguous clan character: user %, name %, cls %',r.user_id,r.name,r.cls;
        end if;
        if r.kind='member' then update public.dragon_clan_members set char_created=ids[1] where id=r.id;
        else update public.dragon_clan_apps set char_created=ids[1] where id=r.id; end if;
    end loop;
end $$;

-- 同一血盟所有移除／接班都鎖同一列；候選人必須仍有有效角色。
create or replace function public.clan_prune(c uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare successor public.dragon_clan_members;
begin
    perform 1 from public.dragon_clans where id=c for update;
    if not found then return; end if;
    delete from public.dragon_clan_apps a where a.clan_id=c
        and not public.clan_char_alive(a.user_id,a.char_created,a.cls);
    delete from public.dragon_clan_members m where m.clan_id=c
        and not public.clan_char_alive(m.user_id,m.char_created,m.cls);
    select * into successor from public.dragon_clan_members where clan_id=c
        order by case role when 'leader' then 0 when 'officer' then 1 else 2 end, joined_at,id limit 1;
    if successor.id is null then
        delete from public.dragon_clans where id=c;
    else
        update public.dragon_clan_members set role='member' where clan_id=c and role='leader' and id<>successor.id;
        update public.dragon_clan_members set role='leader' where id=successor.id and role<>'leader';
        update public.dragon_clans set leader=successor.user_id,
            member_count=(select count(*) from public.dragon_clan_members where clan_id=c) where id=c;
    end if;
end $$;
revoke all on function public.clan_prune(uuid) from public,anon,authenticated;
do $$ declare r record; begin
    for r in select id from public.dragon_clans order by id loop perform public.clan_prune(r.id); end loop;
    delete from public.dragon_clan_apps a where not public.clan_char_alive(a.user_id,a.char_created,a.cls);
end $$;

alter table public.dragon_clan_members alter column char_created set not null;
alter table public.dragon_clan_apps alter column char_created set not null;
alter table public.dragon_clan_members drop constraint if exists dragon_clan_members_pkey;
alter table public.dragon_clan_members add primary key(user_id,char_created,cls);
alter table public.dragon_clan_apps drop constraint if exists dragon_clan_apps_pkey;
alter table public.dragon_clan_apps add primary key(clan_id,user_id,char_created,cls);

-- 墓碑寫入即移除；刪除／替換雲端存檔也會檢查，換欄位且仍有同角色時不退盟。
create or replace function public.clan_char_changed() returns trigger
language plpgsql security definer set search_path = '' as $$
declare u uuid; cr bigint; cl text; r record;
begin
    if tg_table_name='dragon_deleted_chars' then u:=new.user_id; cr:=new.char_created; cl:=new.cls;
    else u:=old.user_id; cr:=(old.data->'player'->>'created')::bigint; cl:=old.data->'player'->>'cls'; end if;
    if tg_op='UPDATE' and tg_table_name='dragon_saves' then
        if new.user_id=u and new.data->'player'->>'created'=cr::text and new.data->'player'->>'cls'=cl then
            update public.dragon_clan_members set name=left(new.data->'player'->>'name',40),
                lv=(new.data->'player'->>'lv')::int where user_id=u and char_created=cr and cls=cl;
            update public.dragon_clan_apps set name=left(new.data->'player'->>'name',40),
                lv=(new.data->'player'->>'lv')::int where user_id=u and char_created=cr and cls=cl;
            return null;
        end if;
    end if;
    for r in select clan_id from public.dragon_clan_members where user_id=u and char_created=cr and cls=cl
        union select clan_id from public.dragon_clan_apps where user_id=u and char_created=cr and cls=cl
        order by clan_id
    loop perform public.clan_prune(r.clan_id); end loop;
    return null;
end $$;
revoke all on function public.clan_char_changed() from public,anon,authenticated;
drop trigger if exists clan_char_save on public.dragon_saves;
create trigger clan_char_save after delete or update on public.dragon_saves for each row execute function public.clan_char_changed();
drop trigger if exists clan_char_tomb on public.dragon_deleted_chars;
create trigger clan_char_tomb after insert on public.dragon_deleted_chars for each row execute function public.clan_char_changed();

-- 以伺服器存檔核對目前角色；不採用玩家傳來的名字／職業／等級。
create or replace function public.clan_action(p_slot int,p_action text,p_args jsonb default '{}') returns jsonb
language plpgsql security definer set search_path = '' as $$
declare s public.dragon_saves; p jsonb; cr bigint; me public.dragon_clan_members;
    target public.dragon_clan_members; ap public.dragon_clan_apps; c public.dragon_clans;
    cid uuid; tid uuid; n text;
begin
    if auth.uid() is null then raise exception 'not logged in'; end if;
    if public.dragon_is_banned() then raise exception 'banned'; end if;
    select * into s from public.dragon_saves where user_id=auth.uid() and slot=p_slot for update;
    if s.user_id is null then raise exception 'clan character not synced'; end if;
    p:=s.data->'player'; cr:=(p->>'created')::bigint;
    if p_args->>'p_char_created' is distinct from cr::text or p_args->>'p_char_cls' is distinct from p->>'cls' then
        raise exception 'clan character changed';
    end if;
    if not public.clan_char_alive(auth.uid(),cr,p->>'cls') then raise exception 'clan character deleted'; end if;
    select * into me from public.dragon_clan_members where user_id=auth.uid() and char_created=cr and cls=p->>'cls';
    cid:=me.clan_id;
    if p_action='join' then cid:=(p_args->>'p_clan')::uuid; end if;
    if cid is not null then
        perform 1 from public.dragon_clans where id=cid for update;
        perform public.clan_prune(cid);
        select * into me from public.dragon_clan_members where user_id=auth.uid() and char_created=cr and cls=p->>'cls';
        select * into c from public.dragon_clans where id=cid;
    end if;
    if p_action='touch' then
        update public.dragon_clan_members set name=left(p->>'name',40),lv=(p->>'lv')::int,last_seen=now() where id=me.id;
        return jsonb_build_object('clan', (select to_jsonb(x) from public.dragon_clans x where x.id=me.clan_id),
            'member',to_jsonb(me));
    elsif p_action='create' then
        if me.id is not null then raise exception 'already in clan'; end if;
        if p->>'cls'<>'royal' then raise exception 'royal required'; end if;
        if coalesce((p->>'lv')::int,0)<15 then raise exception 'level too low'; end if;
        n:=btrim(regexp_replace(coalesce(p_args->>'p_name',''),'\s+',' ','g'));
        if char_length(n)<2 or char_length(n)>12 then raise exception 'bad name'; end if;
        if exists(select 1 from public.dragon_clans where lower(name)=lower(n)) then raise exception 'name taken'; end if;
        insert into public.dragon_clans(name,icon,leader,join_mode) values(n,
            left(coalesce(nullif(p_args->>'p_icon',''),'🛡️'),8),auth.uid(),
            case when p_args->>'p_mode'='open' then 'open' else 'approve' end) returning id into cid;
        insert into public.dragon_clan_members(user_id,clan_id,char_created,role,name,cls,lv)
            values(auth.uid(),cid,cr,'leader',left(p->>'name',40),p->>'cls',(p->>'lv')::int);
        delete from public.dragon_clan_apps where user_id=auth.uid() and char_created=cr and cls=p->>'cls';
        perform public.clan_recount(cid); return to_jsonb(cid);
    elsif p_action='join' then
        if me.id is not null then raise exception 'already in clan'; end if;
        if c.id is null then raise exception 'no clan'; end if;
        if c.member_count>=50 then raise exception 'clan full'; end if;
        if c.join_mode='open' then
            insert into public.dragon_clan_members(user_id,clan_id,char_created,name,cls,lv)
                values(auth.uid(),cid,cr,left(p->>'name',40),p->>'cls',(p->>'lv')::int);
            delete from public.dragon_clan_apps where user_id=auth.uid() and char_created=cr and cls=p->>'cls';
            perform public.clan_recount(cid); return to_jsonb('joined'::text);
        end if;
        if (select count(*) from public.dragon_clan_apps where user_id=auth.uid() and char_created=cr and cls=p->>'cls' and clan_id<>cid)>=3 then raise exception 'too many apps'; end if;
        insert into public.dragon_clan_apps(clan_id,user_id,char_created,name,cls,lv,msg)
            values(cid,auth.uid(),cr,left(p->>'name',40),p->>'cls',(p->>'lv')::int,left(coalesce(p_args->>'p_msg',''),60))
            on conflict(clan_id,user_id,char_created,cls) do update set msg=excluded.msg,at=now();
        return to_jsonb('applied'::text);
    elsif p_action='cancel_app' then
        delete from public.dragon_clan_apps where clan_id=(p_args->>'p_clan')::uuid
            and user_id=auth.uid() and char_created=cr and cls=p->>'cls'; return 'null';
    end if;
    if me.id is null then raise exception 'no clan'; end if;
    tid:=(p_args->>'p_user')::uuid; -- 新版畫面傳成員／申請的 id，不再傳帳號 id。
    if p_action='decide' then
        if me.role not in ('leader','officer') then raise exception 'no permission'; end if;
        select * into ap from public.dragon_clan_apps where id=tid and clan_id=cid for update;
        if ap.id is null then raise exception 'no application'; end if;
        if coalesce((p_args->>'p_accept')::boolean,false) then
            if not public.clan_char_alive(ap.user_id,ap.char_created,ap.cls) then raise exception 'clan character deleted'; end if;
            if exists(select 1 from public.dragon_clan_members where user_id=ap.user_id and char_created=ap.char_created and cls=ap.cls) then raise exception 'already in clan'; end if;
            if c.member_count>=50 then raise exception 'clan full'; end if;
            insert into public.dragon_clan_members(user_id,clan_id,char_created,name,cls,lv)
                values(ap.user_id,cid,ap.char_created,ap.name,ap.cls,ap.lv);
            delete from public.dragon_clan_apps where user_id=ap.user_id and char_created=ap.char_created and cls=ap.cls;
            perform public.clan_recount(cid);
        else delete from public.dragon_clan_apps where id=ap.id; end if;
    elsif p_action in ('kick','set_role','transfer') then
        select * into target from public.dragon_clan_members where id=tid and clan_id=cid for update;
        if target.id is null or target.id=me.id then raise exception 'no member'; end if;
        if p_action='kick' then
            if not(me.role='leader' or (me.role='officer' and target.role='member')) then raise exception 'no permission'; end if;
            delete from public.dragon_clan_members where id=target.id; perform public.clan_recount(cid);
        else
            if me.role<>'leader' then raise exception 'no permission'; end if;
            if p_action='transfer' then
                update public.dragon_clan_members set role='officer' where id=me.id;
                update public.dragon_clan_members set role='leader' where id=target.id;
                update public.dragon_clans set leader=target.user_id where id=cid;
            else
                if coalesce(p_args->>'p_role','') not in ('officer','member') then raise exception 'no permission'; end if;
                update public.dragon_clan_members set role=p_args->>'p_role' where id=target.id;
            end if;
        end if;
    elsif p_action='leave' then
        if me.role='leader' and c.member_count>1 then raise exception 'transfer first'; end if;
        if me.role='leader' then delete from public.dragon_clans where id=cid;
        else delete from public.dragon_clan_members where id=me.id; perform public.clan_recount(cid); end if;
    elsif p_action='disband' then
        if me.role<>'leader' then raise exception 'no permission'; end if;
        delete from public.dragon_clans where id=cid;
    elsif p_action='update' then
        if me.role not in ('leader','officer') then raise exception 'no permission'; end if;
        if p_args->>'p_notice' is not null then update public.dragon_clans set notice=left(btrim(p_args->>'p_notice'),200) where id=cid; end if;
        if me.role='leader' then
            if p_args->>'p_mode' in ('open','approve') then update public.dragon_clans set join_mode=p_args->>'p_mode' where id=cid; end if;
            if nullif(p_args->>'p_icon','') is not null then update public.dragon_clans set icon=left(p_args->>'p_icon',8) where id=cid; end if;
        end if;
    else raise exception 'bad clan action'; end if;
    return 'null';
end $$;
revoke all on function public.clan_action(int,text,jsonb) from public,anon;
grant execute on function public.clan_action(int,text,jsonb) to authenticated;

-- 舊版帳號RPC不能繞過角色權限。保留定義便於辨識舊客戶端，撤銷呼叫權限。
revoke execute on function public.clan_me(), public.clan_create(text,text,text,text,text,int),
    public.clan_join(uuid,text,text,text,int),public.clan_cancel_app(uuid),public.clan_decide(uuid,boolean),
    public.clan_kick(uuid),public.clan_set_role(uuid,text),public.clan_transfer(uuid),public.clan_leave(),
    public.clan_disband(),public.clan_update(text,text,text),public.clan_touch(text,text,int)
    from public,anon,authenticated;

-- 帳號可以存取自己有效成員角色所屬的頻道；畫面依當前角色選頻道。
create or replace function public.clan_has_channel(c uuid) returns boolean
language sql stable security definer set search_path = '' as $$
    select exists(select 1 from public.dragon_clan_members m where m.user_id=auth.uid()
        and m.clan_id=c and public.clan_char_alive(m.user_id,m.char_created,m.cls));
$$;
revoke all on function public.clan_has_channel(uuid) from public,anon;
grant execute on function public.clan_has_channel(uuid) to authenticated;
create or replace function public.dragon_my_clan() returns uuid
language sql stable security definer set search_path = '' as $$
    select m.clan_id from public.dragon_saves s join public.dragon_clan_members m on m.user_id=s.user_id
        and m.char_created::text=s.data->'player'->>'created' and m.cls=s.data->'player'->>'cls'
    where s.user_id=auth.uid() and public.clan_char_alive(m.user_id,m.char_created,m.cls)
    order by s.updated_at desc,s.slot limit 1;
$$;
drop policy if exists dragon_chat_select on public.dragon_chat;
create policy dragon_chat_select on public.dragon_chat for select to authenticated using (
    channel='world' or (channel like 'room:%' and public.raid_is_member(substr(channel,6)::uuid))
    or (channel like 'clan:%' and public.clan_has_channel(substr(channel,6)::uuid)) or public.dragon_is_admin());
drop policy if exists dragon_chat_insert on public.dragon_chat;
create policy dragon_chat_insert on public.dragon_chat for insert to authenticated with check (
    user_id=(select auth.uid()) and not public.dragon_is_banned() and not public.dragon_is_muted()
    and (channel='world' or (channel like 'room:%' and public.raid_is_member(substr(channel,6)::uuid))
        or (channel like 'clan:%' and public.clan_has_channel(substr(channel,6)::uuid))));

-- 排行榜函式在下段同步改成精確角色關聯。

create or replace function public.dragon_leaderboard(p_kind text, p_cls text default null, p_limit int default 50)
returns table (rk bigint, name text, cls text, lv int, val numeric, clan text, is_me boolean)
language sql stable security definer set search_path = '' as $$
    with base as (
        select s.user_id, s.name, s.cls, s.lv, s.data -> 'player' as p,
               (select c.icon || ' ' || c.name from public.dragon_clan_members m join public.dragon_clans c on c.id = m.clan_id where m.user_id = s.user_id and m.char_created::text = s.data -> 'player' ->> 'created' and m.cls = s.data -> 'player' ->> 'cls') as clan
        from public.dragon_saves s
        where not exists (select 1 from public.dragon_bans b where b.user_id = s.user_id)
          and (p_cls is null or p_cls = '' or s.cls = p_cls)
    ), scored as (
        select user_id, name, cls, lv, clan,
            case p_kind
                when 'dragon' then coalesce((select sum(value::numeric) from jsonb_each_text(coalesce(p -> 'dragons', '{}'::jsonb))), 0)
                when 'tower' then coalesce((select max(k::int) from jsonb_object_keys(coalesce(p -> 'towerCleared', '{}'::jsonb)) k where k ~ '^[0-9]+$'), 0)
                when 'kills' then coalesce((p ->> 'kills')::numeric, 0)
                else public.dragon_total_exp(least(greatest(coalesce(lv, 1), 1), 120), coalesce((p ->> 'exp')::numeric, 0))
            end as val
        from base
    ), ranked as (
        select row_number() over (order by val desc, lv desc, name) as rk, user_id, name, cls, lv, val, clan from scored where val > 0
    )
    select rk, name, cls, lv, val, clan, user_id = auth.uid() as is_me from ranked
    where p_kind <> 'clan' and (rk <= least(greatest(p_limit, 1), 100) or user_id = auth.uid())
    union all
    select row_number() over (order by c.member_count desc, avg_lv desc, c.name), c.icon || ' ' || c.name, null, c.member_count, round(avg_lv, 1), null,
           exists (select 1 from public.dragon_clan_members m where m.clan_id = c.id and m.user_id = auth.uid())
    from public.dragon_clans c
    cross join lateral (select coalesce(avg(m.lv), 0) as avg_lv from public.dragon_clan_members m where m.clan_id = c.id) a
    where p_kind = 'clan'
    order by 1
    limit 120;
$$;
commit;
