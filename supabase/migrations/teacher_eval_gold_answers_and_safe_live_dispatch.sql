create schema if not exists teacher_eval;
revoke all on schema teacher_eval from public, anon, authenticated;
create table if not exists teacher_eval.cases (
 id text primary key, subject text not null, exam text not null,
 format text not null, difficulty text not null,
 source text not null check (source in ('synthetic','hand_curated','official_heldout')),
 topic text not null, question text not null, expected text not null, source_url text,
 created_at timestamptz not null default now()
);
create table if not exists teacher_eval.attempts (
 id bigint generated always as identity primary key,
 case_id text not null references teacher_eval.cases(id),
 model text not null, request_id bigint not null unique,
 queued_at timestamptz not null default now(),
 finished_at timestamptz, status text not null default 'queued',
 answer text, output_json jsonb, error_reason text,
 http_status integer,
 unique(case_id,model)
);
revoke all on all tables in schema teacher_eval from public, anon, authenticated;
create or replace function teacher_eval.dispatch(p_model text, p_limit integer default 5)
returns table(case_id text,request_id bigint)
language plpgsql security invoker set search_path=''
as $fn$
declare rec record; n bigint; secret text;
begin
 if p_model not in ('gemini-3.5-flash','gemini-3.5-flash-lite')
    or p_limit<1 or p_limit>5 then
  raise exception 'model or batch size not permitted';
 end if;
 select decrypted_secret into secret from vault.decrypted_secrets
 where name='hakuna_gemini_api_key' limit 1;
 if secret is null then raise exception 'provider key unavailable'; end if;
 for rec in select c.id,c.question,c.subject,c.exam from teacher_eval.cases c
   where not exists(select 1 from teacher_eval.attempts a
        where a.case_id=c.id and a.model=p_model)
   order by c.id limit p_limit
 loop
  n:=net.http_post(
    url:='https://generativelanguage.googleapis.com/v1beta/models/'||p_model||':generateContent',
    body:=pg_catalog.jsonb_build_object(
      'contents',pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object(
       'parts',pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object(
        'text','2018 MEB TYT/AYT soru çözüm deneyi. Ders: '||rec.subject||
         '. Soru: '||rec.question||
         ' Çöz ve sadece JSON nesnesi döndür: {"answer":"kısa ve kesin cevap"}. Emin değilsen answer="" yaz.'
       ))
      )),
      'generationConfig',pg_catalog.jsonb_build_object(
        'maxOutputTokens',180,'responseMimeType','application/json'
      )
    ),
    headers:=pg_catalog.jsonb_build_object('Content-Type','application/json','x-goog-api-key',secret),
    timeout_milliseconds:=40000
  );
  insert into teacher_eval.attempts(case_id,model,request_id)
   values(rec.id,p_model,n);
  case_id:=rec.id;request_id:=n;return next;
 end loop;
end $fn$;
create or replace function teacher_eval.collect()
returns integer language plpgsql security invoker set search_path=''
as $fn$
declare rec record; parsed jsonb; model_text text; result_text text; n integer:=0;
begin
 for rec in
   select a.id,r.id as reply_id,r.status_code,r.content,r.error_msg,r.timed_out,r.created
   from teacher_eval.attempts a
   join net._http_response r on r.id=a.request_id
   where a.status='queued'
 loop
   result_text:=null;parsed:=null;model_text:=null;
   if rec.status_code between 200 and 299 then
    begin
     parsed:=rec.content::jsonb;
     model_text:=parsed #>> '{candidates,0,content,parts,0,text}';
     if model_text is not null then
      result_text:=(model_text::jsonb)->>'answer';
     end if;
     if result_text is null then
      update teacher_eval.attempts set status='parse_error',error_reason='missing answer'
      where id=rec.id;
     else
      update teacher_eval.attempts set status=case when btrim(result_text)='' then 'abstained' else 'ok' end,
       answer=result_text where id=rec.id;
     end if;
    exception when others then
     update teacher_eval.attempts set status='parse_error',error_reason='invalid response JSON'
      where id=rec.id;
    end;
   else
    update teacher_eval.attempts set status=case when rec.timed_out then 'timeout' else 'http_error' end,
      error_reason=left(coalesce(rec.error_msg,'HTTP failure'),350)
      where id=rec.id;
   end if;
   update teacher_eval.attempts set finished_at=rec.created,http_status=rec.status_code where id=rec.id;
   n:=n+1;
 end loop;
 return n;
end $fn$;
revoke all on function teacher_eval.dispatch(text,integer) from public, anon, authenticated;
revoke all on function teacher_eval.collect() from public, anon, authenticated;
