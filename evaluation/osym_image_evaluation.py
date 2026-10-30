#!/usr/bin/env python3
"""Live, private, real ÖSYM-page evaluation.

Fetch the original public PDF only in the ephemeral GitHub Actions runner,
send a crop containing a question (NOT the answer key) to the locked-down
benchmark Edge Function, then grade against the official PDF's answer page.
No copyrighted question content or page images are printed or committed.

This is an eight-individual-question 2024 TYT/AYT pilot, not a full historical benchmark.
"""
from __future__ import annotations
import base64
import json
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

import fitz

PROJECT = "zyrbbkbwrijnnykbgjvc"
PDF_URLS = {
    "TYT": "https://dokuman.osym.gov.tr/pdfdokuman/2024/YKS/TSK/yks_tyt_2024_kitapcik_T24kt.pdf",
    "AYT": "https://dokuman.osym.gov.tr/pdfdokuman/2024/YKS/TSK/yks_ayt_2024_kitapcik_ts85k.pdf",
}
AUDIENCE = "hakuna-osym-private-eval"
DEST = f"https://{PROJECT}.supabase.co/functions/v1/hakuna-teacher-benchmark"
RUN_ID = os.environ.get("GITHUB_RUN_ID", "")
PAGE_CASES = [
    # Each question was independently located on the official page. Clip
    # rectangles are fractions of the page, and include all answer options.
    {"exam":"TYT","topic":"turkce","test":"TYT Türkçe","page":2,"question":1,"last_question":4,"gold_prefix":"BAAD","clip":(.07,.16,.50,.52)},
    {"exam":"TYT","topic":"turkce","test":"TYT Türkçe","page":2,"question":3,"last_question":4,"gold_prefix":"BAAD","clip":(.52,.16,.95,.55)},
    {"exam":"TYT","topic":"matematik","test":"TYT Matematik","page":23,"question":1,"last_question":3,"gold_prefix":"AEA","clip":(.07,.16,.50,.43)},
    {"exam":"TYT","topic":"matematik","test":"TYT Matematik","page":23,"question":3,"last_question":3,"gold_prefix":"AEA","clip":(.52,.16,.95,.57)},
    {"exam":"TYT","topic":"fen","test":"TYT Fen","page":36,"question":1,"last_question":4,"gold_prefix":"EADB","clip":(.07,.16,.50,.61)},
    {"exam":"AYT","topic":"edebiyat","test":"AYT Edebiyat","page":2,"question":1,"last_question":3,"gold_prefix":"BEB","clip":(.07,.16,.50,.43)},
    {"exam":"AYT","topic":"matematik","test":"AYT Matematik","page":25,"question":1,"last_question":4,"gold_prefix":"DCED","clip":(.07,.16,.50,.55)},
    {"exam":"AYT","topic":"fen","test":"AYT Fen","page":36,"question":1,"last_question":3,"gold_prefix":"DEB","clip":(.07,.16,.50,.79)}
]

ANSWER_HEADINGS = {
    "TYT": ["TÜRKÇE TESTİ","SOSYAL BİLİMLER TESTİ","TEMEL MATEMATİK TESTİ","FEN BİLİMLERİ TESTİ"],
    "AYT": ["TÜRK DİLİ VE EDEBİYATI-SOSYAL BİLİMLER-1 TESTİ","SOSYAL BİLİMLER-2 TESTİ","MATEMATİK TESTİ","FEN BİLİMLERİ TESTİ"],
}



def json_fetch(url: str, headers: dict[str, str], data: bytes | None = None, timeout: int = 90) -> dict:
    request = urllib.request.Request(url, headers=headers, data=data, method="POST" if data else "GET")
    with urllib.request.urlopen(request, timeout=timeout) as response:
        return json.load(response)


def download_question_booklet(pdf_url: str) -> bytes:
    """Fetch the source in HTTP range chunks because ÖSYM blocks full-file GETs.

    Never use a cached third-party rehost. Content must come from the verified
    dokuman.osym.gov.tr endpoint and every Content-Range must match exactly.
    """
    def get_range(start: int, end: int) -> tuple[int, bytes, int]:
        last_error: Exception | None = None
        for attempt in range(4):
            try:
                req = urllib.request.Request(pdf_url, headers={
                    "User-Agent": "Mozilla/5.0 (compatible; Hakuna-Private-Syllabus-Audit/1.0)",
                    "Accept": "application/pdf",
                    "Range": f"bytes={start}-{end}",
                })
                with urllib.request.urlopen(req, timeout=40) as res:
                    data = res.read(2097153)
                    status = res.status
                    range_header = res.headers.get("Content-Range", "")
                    media_type = res.headers.get("Content-Type", "")
                if status != 206:
                    raise ValueError(f"HTTP range not honored: {status}, media={media_type}")
                match = re.fullmatch(r"bytes (\d+)-(\d+)/(\d+)", range_header.strip())
                if not match:
                    raise ValueError("Missing/malformed Content-Range")
                returned_start, returned_end, total = map(int, match.groups())
                if returned_start != start or returned_end > end or len(data) != returned_end - start + 1:
                    raise ValueError("Partial PDF chunk is incomplete or shifted")
                return returned_end, data, total
            except (TimeoutError, OSError, urllib.error.URLError, ValueError) as error:
                last_error = error
                if attempt < 3:
                    time.sleep(1.5 * (attempt + 1))
        raise RuntimeError("Official PDF range download failed: " + str(last_error))

    first_end, first, total = get_range(0, 131071)
    if not first.startswith(b"%PDF-") or total <= 10000 or total > 80000000:
        raise RuntimeError("Official PDF signature/size not acceptable")
    chunks = [first]
    at = first_end + 1
    while at < total:
        stop = min(total - 1, at + 1048575)
        returned_end, data, reported_total = get_range(at, stop)
        if reported_total != total:
            raise RuntimeError("Official PDF changed while downloading")
        chunks.append(data)
        at = returned_end + 1
    combined = b"".join(chunks)
    if len(combined) != total or not combined.startswith(b"%PDF-"):
        raise RuntimeError("Incomplete official PDF after range assembly")
    return combined

def official_answers(doc: fitz.Document, case: dict) -> dict[str, str]:
    """Grade only on the isolated final official answer-key page.

    The gold key is held exclusively inside the ephemeral grader process. No
    key page pixels or extracted text are sent to the AI provider.
    """
    text = re.sub(r"\s+", " ", doc[-1].get_text("text", sort=False)).strip()
    names = ANSWER_HEADINGS[case["exam"]]
    key_index = {"turkce": 0,"edebiyat": 0,"matematik": 2 if case["exam"]=="TYT" else 2,"fen": 3}[case["topic"]]
    title=names[key_index]
    loc=text.find(title)
    if loc<0:
        raise RuntimeError("Official answer key heading not found for "+case["test"])
    until=text.find(names[key_index+1],loc+len(title)) if key_index<len(names)-1 else len(text)
    if until<0:raise RuntimeError("Following official answer key heading not found")
    fragment=text[loc+len(title):until]
    answers={int(n):a for n,a in re.findall(r"\b(\d{1,3})\.\s*([A-E])\b",fragment)}
    n=case["last_question"]
    if len(answers)<n:
        raise RuntimeError("Official answer key has incomplete range")
    gold={str(k):answers[k] for k in range(1,n+1)}
    # The independent published key prefix catches a wrong page/section parse.
    if "".join(gold[str(k)] for k in range(1,n+1))!=case["gold_prefix"]:
        raise RuntimeError("Official PDF key disagrees with independently checked section prefix")
    return {str(case["question"]):gold[str(case["question"])]}


def question_page_image(doc: fitz.Document, case: dict) -> str:
    """Render question page only; the last answer page is never passed here."""
    pageno=case["page"]
    if pageno>=len(doc)-2:
        raise RuntimeError("Invalid question page/answer page separation")
    page=doc[pageno]
    w,h=page.rect.width,page.rect.height
    # Isolate one question at a time, as the actual student-facing app does.
    # Never include the official answer key, which is on the final PDF page.
    x0,y0,x1,y1=case["clip"]
    clip=fitz.Rect(w*x0,h*y0,w*x1,h*y1)
    pix=page.get_pixmap(matrix=fitz.Matrix(2.2,2.2),clip=clip,alpha=False)
    jpeg=pix.tobytes("jpeg",jpg_quality=78)
    if len(jpeg)>670000:
        pix=page.get_pixmap(matrix=fitz.Matrix(1.62,1.62),clip=clip,alpha=False)
        jpeg=pix.tobytes("jpeg",jpg_quality=66)
    if len(jpeg)>670000:
        raise RuntimeError("Rendered official question page exceeds safe upload budget")
    return base64.b64encode(jpeg).decode("ascii")

def github_oidc() -> str:
    url = os.environ.get("ACTIONS_ID_TOKEN_REQUEST_URL")
    auth = os.environ.get("ACTIONS_ID_TOKEN_REQUEST_TOKEN")
    if not url or not auth:
        raise RuntimeError("GitHub Actions OIDC unavailable")
    sep = "&" if "?" in url else "?"
    obj = json_fetch(url + sep + urllib.parse.urlencode({"audience": AUDIENCE}), {
        "Authorization": "Bearer " + auth
    })
    token = obj.get("value", "")
    if not token:
        raise RuntimeError("Failed to get OIDC token")
    return token


def main() -> int:
    if not RUN_ID or not os.environ.get("GITHUB_SHA"):
        raise RuntimeError("Cannot evaluate outside authorized GitHub Actions")
    token=github_oidc()
    docs={}
    for exam,url in PDF_URLS.items():
        raw=download_question_booklet(url)
        doc=fitz.open(stream=raw,filetype="pdf")
        if len(doc)<40:raise RuntimeError("Official "+exam+" PDF has missing pages")
        docs[exam]=doc

    overall={"scored":0,"consensus_correct":0,"consensus_incorrect":0,
             "consensus_abstained":0,"model_breakdown":{},"page_count":0}
    for case in PAGE_CASES:
        gold=official_answers(docs[case["exam"]],case)
        image=question_page_image(docs[case["exam"]],case)
        case_id=f"2024-{case['exam']}-{case['topic']}-q{case['question']}"
        body=json.dumps({"caseId":case_id,"test":case["test"],"image":image}).encode("utf-8")
        try:
            response=json_fetch(DEST,{
                "Authorization":"Bearer "+token,"Content-Type":"application/json"
            },data=body,timeout=140)
        except urllib.error.HTTPError as e:
            # An HTTP error is a scored failure, never a skipped perfect result.
            print(json.dumps({"case_id":case_id,"provider_error_code":e.code,"scored":len(gold),"abstained":len(gold)}))
            overall["scored"]+=len(gold)
            overall["consensus_abstained"]+=len(gold)
            continue
        if response.get("caseId")!=case_id:
            raise RuntimeError("Benchmark response case ID mismatch")
        answers=response.get("consensus") or {}
        models=response.get("models") or {}
        page_stat={"case_id":case_id,"scored":len(gold),"correct":0,"incorrect":0,"abstained":0,
                   "model_counts":{},"provider_errors":response.get("errors") or {}}
        for model in ["gemini-3.6-flash","gemini-3.5-flash-lite"]:
            guessed=models.get(model) or {}
            stats={"correct":0,"incorrect":0,"abstained":0}
            for n,expected in gold.items():
                a=guessed.get(n)
                stats["correct"]+=int(a==expected)
                stats["incorrect"]+=int(bool(a) and a!=expected)
                stats["abstained"]+=int(not bool(a))
            page_stat["model_counts"][model]=stats
            aggregated=overall["model_breakdown"].setdefault(model,{"correct":0,"incorrect":0,"abstained":0})
            for k in ["correct","incorrect","abstained"]:aggregated[k]+=stats[k]
        for n,expected in gold.items():
            a=answers.get(n)
            page_stat["correct"]+=int(a==expected)
            page_stat["incorrect"]+=int(bool(a) and a!=expected)
            page_stat["abstained"]+=int(not bool(a))
        overall["scored"]+=len(gold)
        overall["consensus_correct"]+=page_stat["correct"]
        overall["consensus_incorrect"]+=page_stat["incorrect"]
        overall["consensus_abstained"]+=page_stat["abstained"]
        overall["page_count"]+=1
        print(json.dumps(page_stat,ensure_ascii=False,sort_keys=True),flush=True)
    if overall["scored"]!=len(PAGE_CASES):
        raise RuntimeError("Not all planned official questions were accounted for")
    overall["year"]=2024
    overall["types"]=["TYT","AYT"]
    overall["official_answer_page_separate"]=True
    overall["all_eight_single_question_images_rendered"]=True
    overall["complete_2018_2026_evaluation"]=False
    overall["certifies_99_percent"]=False
    overall["accuracy_all_scored"]=overall["consensus_correct"]/overall["scored"]
    overall["precision_answered"]=(overall["consensus_correct"]/(overall["consensus_correct"]+overall["consensus_incorrect"])
       if overall["consensus_correct"]+overall["consensus_incorrect"] else None)
    print("FINAL_OFFICIAL_IMAGE_EVALUATION "+json.dumps(overall,ensure_ascii=False,sort_keys=True),flush=True)
    return 0

if __name__ == "__main__":
    sys.exit(main())
