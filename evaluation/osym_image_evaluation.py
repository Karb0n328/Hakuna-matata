#!/usr/bin/env python3
"""Live, private, real ÖSYM-page evaluation.

Fetch the original public PDF only in the ephemeral GitHub Actions runner,
send a crop containing a question (NOT the answer key) to the locked-down
benchmark Edge Function, then grade against the official PDF's answer page.
No copyrighted question content or page images are printed or committed.

This is one confirmed 2024-TYT image example, not a full historical benchmark.
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
PDF_URL = "https://dokuman.osym.gov.tr/pdfdokuman/2024/YKS/TSK/yks_tyt_2024_kitapcik_T24kt.pdf"
AUDIENCE = "hakuna-osym-private-eval"
DEST = f"https://{PROJECT}.supabase.co/functions/v1/hakuna-teacher-benchmark"
RUN_ID = os.environ.get("GITHUB_RUN_ID", "")
CASE_ID = "2024-TYT-turkce-1"
TASK = "TYT Türkçe"


def json_fetch(url: str, headers: dict[str, str], data: bytes | None = None, timeout: int = 90) -> dict:
    request = urllib.request.Request(url, headers=headers, data=data, method="POST" if data else "GET")
    with urllib.request.urlopen(request, timeout=timeout) as response:
        return json.load(response)


def download_question_booklet() -> bytes:
    for attempt in range(3):
        try:
            request = urllib.request.Request(PDF_URL, headers={
                "User-Agent": "Mozilla/5.0", "Accept": "application/pdf",
            })
            with urllib.request.urlopen(request, timeout=45) as res:
                data = res.read(80000001)
            if not data.startswith(b"%PDF-") or len(data) > 80000000:
                raise RuntimeError("Official source did not deliver a suitable PDF")
            return data
        except (TimeoutError, OSError, urllib.error.URLError):
            if attempt == 2:
                raise
            time.sleep(2 + attempt * 3)
    raise RuntimeError("Official PDF inaccessible")


def image_only_question_one(pdf: bytes) -> tuple[str, str]:
    doc = fitz.open(stream=pdf, filetype="pdf")
    if len(doc) < 40:
        raise RuntimeError("Official booklet pages appear incomplete")

    # 2024-TYT first page of Turkish questions = physical PDF page 3.
    page = doc[2]
    w, h = page.rect.width, page.rect.height
    clip = fitz.Rect(w * 0.072, h * 0.16, w * 0.50, h * 0.495)
    pix = page.get_pixmap(matrix=fitz.Matrix(2.1, 2.1), clip=clip, alpha=False)
    jpeg = pix.tobytes("jpeg")
    if len(jpeg) > 650000:
        raise RuntimeError("Question crop too large")

    # Answer key on last PDF page. Derive from official page separately;
    # never send its pixels/text to the model.
    last = doc[-1]
    page_text = last.get_text("dict")
    first_col = []
    for block in page_text.get("blocks", []):
        if block.get("type") != 0:
            continue
        if block["bbox"][0] > last.rect.width * .25:
            continue
        for line in block.get("lines", []):
            first_col.append("".join(span["text"] for span in line.get("spans", [])))
    answer_section = "\n".join(first_col)
    found = re.search(r"(?:^|\n)\s*1\.\s*([ABCDE])\b", answer_section, re.M)
    if not found:
        raise RuntimeError("Could not safely parse 2024 Turkish official answer key")
    return base64.b64encode(jpeg).decode("ascii"), found.group(1)


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
    pdf = download_question_booklet()
    image, gold = image_only_question_one(pdf)
    token = github_oidc()
    body = json.dumps({"caseId": CASE_ID, "test": TASK, "image": image}).encode("utf-8")
    try:
        response = json_fetch(DEST, {
            "Authorization": "Bearer " + token, "Content-Type": "application/json"
        }, data=body, timeout=155)
    except urllib.error.HTTPError as e:
        # No token or question body in the response/log.
        print(json.dumps({"status": "benchmark-endpoint-error", "http": e.code}))
        return 1

    if response.get("caseId") != CASE_ID:
        raise RuntimeError("Wrong benchmark result identity")
    models = response.get("models", {})
    consensus = response.get("consensus", {})
    sample = {}
    for name in ["gemini-3.6-flash", "gemini-3.5-flash-lite"]:
        answer = (models.get(name) or {}).get("1")
        sample[name] = {
            "answered": bool(answer),
            "correct": answer == gold,
            "incorrect": bool(answer) and answer != gold,
        }
    released = consensus.get("1")
    grade = {
        "year": 2024, "exam": "TYT", "subject": "Turkce", "question_id": 1,
        "source": "official-2024-TYT-PDF", "question_was_page_image": True,
        "answer_key_separated_from_prompt": True,
        "total_questions_scored": 1,
        "consensus_answered": int(bool(released)),
        "consensus_correct": int(released == gold),
        "consensus_incorrect": int(bool(released) and released != gold),
        "abstained": int(not bool(released)),
        "model_breakdown": sample,
        "complete_2018_2026_evaluation": False,
    }
    print(json.dumps(grade, ensure_ascii=False, sort_keys=True))
    print("This one-question image evaluation cannot establish 99% YKS accuracy.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
