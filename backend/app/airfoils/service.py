from math import isfinite

from app.models.airfoil import AirfoilKind


class AirfoilDataError(ValueError):
    pass


def parse_dat(content: str) -> list[list[float]]:
    """Parse common Selig/Lednicer-style x/y coordinate text."""
    coordinates: list[list[float]] = []
    for line_number, raw_line in enumerate(content.splitlines(), start=1):
        line = raw_line.strip().replace(",", ".")
        if not line or line.startswith(("#", ";")):
            continue
        parts = line.split()
        if len(parts) < 2:
            if not coordinates:  # tolerate a profile name in the first line
                continue
            raise AirfoilDataError(f"Zeile {line_number}: zwei Zahlen erwartet.")
        try:
            x, y = float(parts[0]), float(parts[1])
        except ValueError:
            if not coordinates:
                continue
            raise AirfoilDataError(f"Zeile {line_number}: ungültige Koordinate.") from None
        if not isfinite(x) or not isfinite(y):
            raise AirfoilDataError(f"Zeile {line_number}: Koordinate ist nicht endlich.")
        if not 0 <= x <= 1 or not -0.5 <= y <= 0.5:
            raise AirfoilDataError(
                f"Zeile {line_number}: Koordinaten müssen normiert sein."
            )
        coordinates.append([round(x, 7), round(y, 7)])
    if len(coordinates) < 5:
        raise AirfoilDataError("Ein Profil benötigt mindestens fünf Koordinaten.")
    if len(coordinates) > 10_000:
        raise AirfoilDataError("Ein Profil darf höchstens 10.000 Koordinaten enthalten.")
    return coordinates


def generate_kfm(
    kind: AirfoilKind, step_position: float, thickness: float
) -> list[list[float]]:
    """Generate normalized outline coordinates for KFm preview and geometry."""
    half = thickness / 2
    if kind == AirfoilKind.KFM1:
        return [[0, 0], [1, 0], [step_position, 0], [step_position, -thickness], [0, 0]]
    if kind == AirfoilKind.KFM2:
        return [[0, 0], [step_position, thickness], [step_position, 0], [1, 0], [0, 0]]
    if kind == AirfoilKind.KFM4:
        return [
            [1, 0], [step_position, half], [0, 0],
            [step_position, -half], [1, 0],
        ]
    raise AirfoilDataError("Für klassische Profile ist kein KFm-Generator verfügbar.")
