"""Validation entry point for the twin-fpv-sub250 plugin."""


def _message(severity: str, code: str, text: str, path: str) -> dict:
    return {"severity": severity, "code": code, "message": text, "path": path}


def validate(parameters: dict) -> list[dict]:
    messages: list[dict] = []
    try:
        wing = parameters["wing"]
        weight = parameters["weight"]
        span = float(wing["spanMm"])
        root = float(wing["rootChordMm"])
        tip = float(wing["tipChordMm"])
        sweep = float(wing.get("sweepDeg", 0))
        dihedral = float(wing.get("dihedralDeg", 0))
        target = float(weight["targetG"])
        reserve = float(weight["reserveG"])
    except (KeyError, TypeError, ValueError):
        return [_message("error", "invalid-parameters",
                         "Pflichtparameter fehlen oder sind ungültig.", "$")]
    for value, path, label in (
        (span, "wing.spanMm", "Spannweite"),
        (root, "wing.rootChordMm", "Wurzeltiefe"),
        (tip, "wing.tipChordMm", "Randtiefe"),
        (target, "weight.targetG", "Zielgewicht"),
    ):
        if value <= 0:
            messages.append(_message("error", "positive-required",
                                     f"{label} muss größer als null sein.", path))
    if messages:
        return messages
    if not 300 <= span <= 2000:
        messages.append(_message("warning", "span-range",
                                 "Spannweite liegt außerhalb des empfohlenen Bereichs 300–2000 mm.",
                                 "wing.spanMm"))
    taper = tip / root
    if not 0.4 <= taper <= 1:
        messages.append(_message("warning", "taper-range",
                                 "Zuspitzung sollte zwischen 0,4 und 1,0 liegen.",
                                 "wing.tipChordMm"))
    if not -10 <= sweep <= 35:
        messages.append(_message("error", "sweep-range",
                                 "Pfeilung muss zwischen -10° und 35° liegen.",
                                 "wing.sweepDeg"))
    if not 0 <= dihedral <= 12:
        messages.append(_message("warning", "dihedral-range",
                                 "V-Form außerhalb des empfohlenen Bereichs 0–12°.",
                                 "wing.dihedralDeg"))
    if reserve >= target:
        messages.append(_message("error", "weight-reserve",
                                 "Gewichtsreserve muss kleiner als das Zielgewicht sein.",
                                 "weight.reserveG"))
    if target > 250:
        messages.append(_message("warning", "sub250-target",
                                 "Zielgewicht überschreitet die Sub-250-g-Grenze.",
                                 "weight.targetG"))
    if not messages:
        messages.append(_message("info", "valid",
                                 "Parameter liegen in den empfohlenen Bereichen.", "$"))
    return messages
