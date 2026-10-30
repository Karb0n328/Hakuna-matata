#!/usr/bin/env python3
"""HTTP metadata probe for official PDF accessibility; never print document contents."""
import urllib.request, urllib.error, time, json, ssl
URL="https://dokuman.osym.gov.tr/pdfdokuman/2024/YKS/TSK/yks_tyt_2024_kitapcik_T24kt.pdf"
variants=[
 ("baseline-1K", {"User-Agent":"Mozilla/5.0 (compatible; Hakuna-Private-Syllabus-Audit/1.0)","Range":"bytes=0-1023","Accept":"application/pdf"}),
 ("browser-1K", {"User-Agent":"Mozilla/5.0","Accept":"application/pdf","Range":"bytes=0-1023","Referer":"https://www.osym.gov.tr/","Cache-Control":"no-cache"}),
 ("browser-4K", {"User-Agent":"Mozilla/5.0","Accept":"application/pdf","Range":"bytes=0-4095"}),
 ("browser-16K", {"User-Agent":"Mozilla/5.0","Accept":"application/pdf","Range":"bytes=0-16383"}),
 ("browser-64K", {"User-Agent":"Mozilla/5.0","Accept":"application/pdf","Range":"bytes=0-65535"}),
 ("browser-128K", {"User-Agent":"Mozilla/5.0","Accept":"application/pdf","Range":"bytes=0-131071"}),
 ("bare-get",{"User-Agent":"Mozilla/5.0","Accept":"application/pdf"})
]
for name,headers in variants:
 try:
  with urllib.request.urlopen(urllib.request.Request(URL,headers=headers),timeout=17) as r:
   first=r.read(2048)
   print(json.dumps({"probe":name,"status":r.status,"type":r.headers.get("Content-Type"),"length":r.headers.get("Content-Length"),"range":r.headers.get("Content-Range"),"pdf_header":first.startswith(b"%PDF-"),"url_host":urllib.request.urlparse(r.url).hostname},ensure_ascii=False))
 except Exception as e:
  print(json.dumps({"probe":name,"error_type":type(e).__name__,"reason":str(e)[:150]}))
 time.sleep(.2)
