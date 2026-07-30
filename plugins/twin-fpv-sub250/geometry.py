"""Geometry entry point for the twin-fpv-sub250 plugin."""

from math import radians, tan


def build_geometry(parameters: dict) -> dict:
    wing = parameters["wing"]
    half_span = float(wing["spanMm"]) / 2
    root = float(wing["rootChordMm"])
    tip = float(wing["tipChordMm"])
    offset = tan(radians(float(wing.get("sweepDeg", 0)))) * half_span
    propulsion = parameters["propulsion"]
    motor_y = float(propulsion["motorSpacingMm"]) / 2
    leading_edge_at_motor = offset * motor_y / half_span
    motor_x = leading_edge_at_motor + float(propulsion["leadingEdgeOffsetMm"])
    outline = [
        [0, 0], [offset, half_span], [offset + tip, half_span], [root, 0],
        [offset + tip, -half_span], [offset, -half_span], [0, 0],
    ]
    return {
        "unit": "mm",
        "view": "top",
        "wingOutline": [[round(x, 3), round(y, 3)] for x, y in outline],
        "motorPositions": [
            [round(motor_x, 3), round(motor_y, 3)],
            [round(motor_x, 3), round(-motor_y, 3)],
        ],
    }
