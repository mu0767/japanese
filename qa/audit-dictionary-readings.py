#!/usr/bin/env python3
"""Audit every Kotoba vocabulary reading against an independent EDRDG EDICT2 dictionary.
This audits lexical readings, not audio quality or pitch accent.
Run: python3 qa/audit-dictionary-readings.py
"""
import gzip, hashlib, json, pathlib, re, subprocess, urllib.request
from collections import defaultdict
ROOT=pathlib.Path(__file__).resolve().parent.parent
SRC="https://ftp.edrdg.org/pub/Nihongo/edict2u.gz"
def words():
    # data.js is a single JS literal; extract its JSON without evaluating code.
    source=(ROOT/"data.js").read_text(encoding="utf-8-sig")
    start=source.find("const WORDS = ")
    if start<0: raise ValueError("WORDS literal not found")
    return json.JSONDecoder().raw_decode(source[start+len("const WORDS = "):])[0]
def norm(s):
    import unicodedata
    return "".join(chr(ord(c)-96) if "ァ"<=c<="ヶ" else c for c in unicodedata.normalize("NFKC",s))
def main():
    req=urllib.request.Request(SRC,headers={"User-Agent":"Kotoba-dictionary-audit/1.0"})
    with urllib.request.urlopen(req, timeout=90) as response: compressed=response.read()
    dictionary=gzip.decompress(compressed).decode("utf-8")
    lexicon=defaultdict(set)
    for row in dictionary.splitlines():
        if " /" not in row: continue
        header=row.split(" /",1)[0]
        m=re.match(r"^(.*?) \[(.*?)\]$",header)
        if m:
            written=m.group(1); reads=m.group(2)
            heads=[re.sub(r"\([^)]*\)","",s) for s in written.split(";")]
            readings=[re.sub(r"\([^)]*\)","",s) for s in reads.split(";")]
            for head in heads:
                for reading in readings: lexicon[norm(head)].add(norm(reading))
        else:
            for head in header.split(";"):
                head=re.sub(r"\([^)]*\)","",head)
                lexicon[norm(head)].add(norm(head))
    records=words()
    if len(records)!=7811 or len({w["id"] for w in records})!=7811:
        raise ValueError("Expected 7811 unique words")
    exact=[]; mismatch=[]; absent=[]
    for w in records:
        readings=lexicon.get(norm(w["word"]))
        item={"id":w["id"],"level":w["level"],"word":w["word"],"reading":w["reading"]}
        if not readings: absent.append(item)
        elif norm(w["reading"]) in readings: exact.append(w["id"])
        else: mismatch.append({**item,"dictionaryReadings":sorted(readings)})
    report={"schema":1,"source":SRC,"dictionarySha256":hashlib.sha256(compressed).hexdigest(),
      "dataSha256":hashlib.sha256((ROOT/"data.js").read_bytes()).hexdigest(),
      "total":len(records),"exactMatch":len(exact),"mismatch":len(mismatch),
      "notFound":len(absent),"mismatches":mismatch,"notFoundEntries":absent,
      "scope":"Lexical headword/readings only. No human listening, pitch-accent, or voice-quality audit."}
    target=ROOT/"qa"/"dictionary-reading-audit.json"
    target.write_text(json.dumps(report,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print(json.dumps({k:v for k,v in report.items() if k not in ("mismatches","notFoundEntries")},ensure_ascii=False))
    print("REPORT",target)
if __name__=="__main__": main()
