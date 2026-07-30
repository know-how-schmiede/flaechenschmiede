"""Calculation entry point for the twin-fpv-sub250 plugin."""

from math import tan, radians


def calculate(parameters: dict) -> dict:
    wing = parameters["wing"]
    weight = parameters["weight"]
    span = float(wing["spanMm"])
    root = float(wing["rootChordMm"])
    tip = float(wing["tipChordMm"])
    area_mm2 = span * (root + tip) / 2
    taper = tip / root
    mac_mm = (2 / 3) * root * ((1 + taper + taper * taper) / (1 + taper))
    return {
        "wingAreaMm2": round(area_mm2, 2),
        "wingAreaDm2": round(area_mm2 / 10_000, 3),
        "aspectRatio": round(span * span / area_mm2, 3),
        "taperRatio": round(taper, 3),
        "meanAerodynamicChordMm": round(mac_mm, 2),
        "quarterChordMm": round(mac_mm * 0.25, 2),
        "tipOffsetMm": round(tan(radians(float(wing.get("sweepDeg", 0)))) * span / 2, 2),
        "targetWingLoadingGdm2": round(float(weight["targetG"]) / (area_mm2 / 10_000), 2),
        "availableStructureG": round(float(weight["targetG"]) - float(weight["reserveG"]), 2),
    }
