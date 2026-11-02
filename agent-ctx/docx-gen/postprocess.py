#!/usr/bin/env python3
"""Post-traitement docx : format de numérotation des pieds de page + nettoyage pgNumType."""
import re
import shutil
import sys
import zipfile
from pathlib import Path

def main(path):
    src = Path(path)
    tmp = src.with_suffix(".tmp.docx")

    with zipfile.ZipFile(src, "r") as zin:
        names = zin.namelist()
        data = {n: zin.read(n) for n in names}

    doc_xml = data["word/document.xml"].decode("utf-8")

    # 1. Supprimer les <w:pgNumType/> vides (confond WPS sur la section de couverture)
    before = doc_xml.count("<w:pgNumType/>")
    doc_xml = doc_xml.replace("<w:pgNumType/>", "")
    data["word/document.xml"] = doc_xml.encode("utf-8")
    print(f"pgNumType vides supprimes: {before}")

    # 2. Identifier les pieds de page dans l'ordre des sections
    #    Section 1 = couverture (sans footer), Section 2 = TOC (ROMAN), Section 3 = corps (arabic)
    rels_xml = data["word/_rels/document.xml.rels"].decode("utf-8")
    rid_to_target = dict(re.findall(r'Id="([^"]+)"[^>]*Target="([^"]+)"', rels_xml))

    sect_prs = re.findall(r"<w:sectPr[^>]*>.*?</w:sectPr>", doc_xml, flags=re.S)
    footer_refs = []  # ordre d'apparition
    for sp in sect_prs:
        m = re.search(r'<w:footerReference[^>]*w:type="default"[^>]*r:id="([^"]+)"', sp)
        if not m:
            m = re.search(r'<w:footerReference[^>]*r:id="([^"]+)"[^>]*w:type="default"', sp)
        footer_refs.append(m.group(1) if m else None)

    print("sections:", len(sect_prs), "footerRefs:", footer_refs)

    # footer_refs[1] = section TOC -> ROMAN ; footer_refs[2] = corps -> arabic
    plan = []
    if len(footer_refs) >= 3:
        if footer_refs[1]:
            plan.append((footer_refs[1], "ROMAN"))
        if footer_refs[2]:
            plan.append((footer_refs[2], "arabic"))

    for rid, fmt in plan:
        target = rid_to_target.get(rid, "")
        fname = "word/" + target.lstrip("/")
        if fname not in data:
            print(f"  ! footer introuvable pour {rid} -> {target}")
            continue
        xml = data[fname].decode("utf-8")
        xml, n = re.subn(
            r"(<w:instrText[^>]*>)\s*PAGE\s*(</w:instrText>)",
            rf"\1 PAGE \\* {fmt} \\* MERGEFORMAT \2",
            xml,
        )
        data[fname] = xml.encode("utf-8")
        print(f"  footer {fname} -> {fmt} ({n} champ(s))")

    with zipfile.ZipFile(tmp, "w", zipfile.ZIP_DEFLATED) as zout:
        for n in names:
            zout.writestr(n, data[n])
    shutil.move(tmp, src)
    print("OK", src)

if __name__ == "__main__":
    main(sys.argv[1])
