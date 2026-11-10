"""Structured NJD pronunciations: no MeCab tokenization or pronunciation rewrite.

The visible vocabulary reading remains separate. pyopenjtalk.make_label() maps
our explicit pron/mora features directly through njd2jpcommon. The HTS engine
always loads the attributed NIT ATR503 voice supplied by the build.
"""
import hashlib
import json
import re
import sys
import wave

import numpy as np
from pyopenjtalk import HTSEngine, OpenJTalk

jtalk = OpenJTalk(dn_mecab=sys.argv[1].encode("utf-8"))
engine = HTSEngine(sys.argv[2].encode("utf-8"))
engine.set_speed(1.0)


def labels_for(item):
    spoken = item["input"].removesuffix("。")
    feature = {
        "string": item["word"], "pos": "名詞", "pos_group1": "一般",
        "pos_group2": "*", "pos_group3": "*", "ctype": "*", "cform": "*",
        "orig": item["word"], "read": spoken, "pron": spoken,
        "acc": 0, "mora_size": item["moraSize"],
        "chain_rule": "C1", "chain_flag": -1,
    }
    labels = jtalk.make_label([feature])
    phones = [re.search(r"-([^+]+)\+", label).group(1) for label in labels]
    phones = [p for p in phones if p not in ("sil", "pau")]
    return labels, phones


def canonical(phones):
    result = [p.lower() if p in ("A", "I", "U", "E", "O") else p for p in phones]
    for index in range(1, len(result)):
        if result[index - 1] == "e" and result[index] == "i":
            result[index] = "e"
        elif result[index - 1] == "o" and result[index] == "u":
            result[index] = "o"
    return result


print(json.dumps({"ready": True, "method": "forced-njd-pron", "sampleRate": engine.get_sampling_frequency()}), flush=True)
for line in sys.stdin:
    try:
        request = json.loads(line)
        if request.get("op") == "audit":
            errors = []
            for item in request["items"]:
                labels, phones = labels_for(item)
                if canonical(phones) != canonical(item["expected"]):
                    errors.append({"id": item["id"], "expected": item["expected"], "actual": phones})
            response = {"audited": len(request["items"]), "errors": errors}
        else:
            labels, phones = labels_for(request)
            if canonical(phones) != canonical(request["expected"]):
                raise ValueError("Forced NJD phoneme mismatch: " + " ".join(phones))
            audio = engine.synthesize(labels)
            if not np.isfinite(audio).all():
                raise ValueError("Non-finite synthesized PCM")
            with wave.open(request["wav"], "wb") as output:
                output.setnchannels(1)
                output.setsampwidth(2)
                output.setframerate(engine.get_sampling_frequency())
                output.writeframes(np.clip(audio, -32768, 32767).astype("<i2").tobytes())
            response = {"phonemes": phones, "labelSha256": hashlib.sha256("\n".join(labels).encode("utf-8")).hexdigest()}
        print(json.dumps(response, ensure_ascii=False), flush=True)
    except Exception as error:
        print(json.dumps({"error": str(error)}, ensure_ascii=False), flush=True)
