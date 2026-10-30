create or replace function teacher_eval.dispatch(p_model text, p_limit integer default 5)
returns table(case_id text,request_id bigint)
language plpgsql security invoker set search_path=''
as $fn$
declare rec record; n bigint; secret text;
begin
 if p_model not in ('gemini-3.5-flash','gemini-3.5-flash-lite','gemini-3.6-flash')
    or p_limit<1 or p_limit>5 then
  raise exception 'model or batch size not permitted';
 end if;
 select decrypted_secret into secret from vault.decrypted_secrets
 where name='hakuna_gemini_api_key' limit 1;
 if secret is null then raise exception 'provider key unavailable'; end if;
 for rec in select c.id,c.question,c.subject,c.exam from teacher_eval.cases c
   where not exists(select 1 from teacher_eval.attempts a
        where a.case_id=c.id and a.model=p_model)
   order by pg_catalog.md5(c.id||':'||p_model) limit p_limit
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
        'maxOutputTokens',1100,'responseMimeType','application/json'
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

revoke all on function teacher_eval.dispatch(text,integer) from public, anon, authenticated;