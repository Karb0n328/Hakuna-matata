#!/usr/bin/env python3
"""Validate ÖSYM 2018–2026 official source locations without storing PDFs or question text.

This *only* tests link/PDF headers. It DOES NOT solve any questions, parse any
answers or imply that model accuracy has been measured.
"""
from __future__ import annotations
import concurrent.futures
import json
import pathlib
import urllib.error
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parent
MANIFEST = ROOT / "osym-2018-2026-sources.json"

def source_check(row: dict) -> dict:
    url = row["officialPdf"]
    result = {"year": row["year"], "exam": row["exam"], "state": "unverified", "http": None}
    try:
        req = urllib.request.Request(
            url,
            headers={
                "User-Agent": "Mozilla/5.0 (compatible; Hakuna-Private-Syllabus-Audit/1.0)",
                "Range": "bytes=0-1023",
                "Accept": "application/pdf",
            },
        )
        with urllib.request.urlopen(req, timeout=22) as resp:
            first = resp.read(16)  # Do not save/reproduce booklets.
            result["http"] = resp.status
            result["state"] = "pdf-signature-ok" if first.startswith(b"%PDF-") else "not-a-pdf"
    except (urllib.error.URLError, TimeoutError, OSError) as exc:
        result["state"] = "unavailable"
        result["error_type"] = type(exc).__name__
    return result

def check_structure(manifest: dict) -> list[dict]:
    assert manifest["schemaVersion"] == 1
    assert manifest["corpusStatus"] == "SOURCES_ONLY_NOT_SOLVED"
    rows = manifest["sources"]
    assert len(rows) == 18
    assert sorted({x["year"] for x in rows}) == list(range(2018, 2027))
    assert all(x["validatedFullSolution"] is False for x in rows)
    assert all(x["answerKeyEmbedsInPdf"] is True for x in rows)
    assert sum(x["candidateQuestionCount"] for x in rows) == 2520
    for year in range(2018, 2027):
        assert sorted(x["exam"] for x in rows if x["year"] == year) == ["AYT", "TYT"]
    for row in rows:
        assert row["officialPage"].startswith("https://www.osym.gov.tr/")
        assert row["officialPdf"].startswith("https://dokuman.osym.gov.tr/pdfdokuman/")
        assert row["currentAutomatedStatus"] == "not_full_evaluated"
    return rows

def main() -> None:
    payload = json.loads(MANIFEST.read_text("utf-8"))
    rows = check_structure(payload)
    print("Official ÖSYM source manifest validated: 9 years / 18 booklets.")
    print("No AI evaluation has been run by this checker. Accuracy not inferred.")
    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
        reports = list(pool.map(source_check, rows))
    for item in reports:
        print(json.dumps(item, ensure_ascii=False, sort_keys=True))
    passed = sum(x["state"] == "pdf-signature-ok" for x in reports)
    print(f"Reachable official PDFs: {passed}/18. Unreachable links are reported, not misrepresented as solved.")
    # Link reachability may vary; metadata contract is the required test.
    if passed == 0:
        print("WARNING: No source PDFs reachable; live ingestion/evaluation is blocked.")

if __name__ == "__main__":
    main()
