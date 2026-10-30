#!/usr/bin/env python3
"""HTTP metadata probe for official PDF accessibility; never print document contents."""
import urllib.request, urllib.error, time, json, ssl
URL="https://dokuman.osym.gov.tr/pdfdokuman/2024/YKS/TSK/yks_tyt_2024_kitapcik_T24kt.pdf"
BASIC={"User-Agent":"Mozilla/5.0 (compatible; Hakuna-Private-Syllabus-Audit/1.0)","Accept":"application/pdf"}
variants=[
 ("baseline-1K", {**BASIC,"Range":"bytes=0-1023"}),
 ("baseline-4K", {**BASIC,"Range":"bytes=0-4095"}),
 ("baseline-16K", {**BASIC,"Range":"bytes=0-16383"}),
 ("baseline-64K", {**BASIC,"Range":"bytes=0-65535"}),
 ("baseline-128K", {**BASIC,"Range":"bytes=0-131071"}),
 ("offset-1K", {**BASIC,"Range":"bytes=1024-2047"}),
 ("offset-64K", {**BASIC,"Range":"bytes=65536-131071"}),
 ("browser-1K",{"User-Agent":"Mozilla/5.0","Accept":"application/pdf","Range":"bytes=0-1023"}),
 ("bare-get",BASIC),
]
for name,headers in variants:
 try:
  with urllib.request.urlopen(urllib.request.Request(URL,headers=headers),timeout=17) as r:
   first=r.read(2048)
   print(json.dumps({"probe":name,"status":r.status,"type":r.headers.get("Content-Type"),"length":r.headers.get("Content-Length"),"range":r.headers.get("Content-Range"),"pdf_header":first.startswith(b"%PDF-"),"url_host":urllib.request.urlparse(r.url).hostname},ensure_ascii=False))
 except Exception as e:
  print(json.dumps({"probe":name,"error_type":type(e).__name__,"reason":str(e)[:150]}))
 time.sleep(.2)
