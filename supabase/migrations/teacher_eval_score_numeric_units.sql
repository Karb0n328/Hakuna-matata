create or replace view teacher_eval.results as
select
 a.id,a.case_id,a.model,c.subject,c.exam,c.format,c.difficulty,c.source,
 a.status,a.http_status,a.answer,c.expected,a.queued_at,a.finished_at,
 case
  when a.status <> 'ok' then false
  when lower(btrim(coalesce(a.answer,'')))=lower(btrim(c.expected)) then true
  when c.expected ~ '^[-+]?[0-9]+([.,][0-9]+)?$'
   and a.answer ~* '^\s*[-+]?[0-9]+([.,][0-9]+)?\s*(TL|cm|mm|km|m|kg|g|N|J|W|V|A|amper|volt|mol|M|m\/s2|m\/s²|ohm)?\s*$'
   then (
    replace(c.expected,',','.')::numeric =
    replace((regexp_match(a.answer,'^\s*([-+]?[0-9]+([.,][0-9]+)?)'))[1],',','.')::numeric
   )
  else false
 end as gold_correct
from teacher_eval.attempts a join teacher_eval.cases c on c.id=a.case_id;
revoke all on teacher_eval.results from public,anon,authenticated;