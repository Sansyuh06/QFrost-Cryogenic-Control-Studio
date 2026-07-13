"""
Lattice generation for surface code.
Builds a (2d-1) x (2d-1) rotated checkerboard grid for code distance d.

Layout:
  - Data qubits at integer coordinates where (r + c) % 2 == 0
  - Ancilla qubits at integer coordinates where (r + c) % 2 == 1
  - Even-row ancillas → Z_star stabilizers
  - Odd-row ancillas → X_plaquette stabilizers

Counts for distance d:
  - Data qubits:   d²
  - Ancilla qubits: d² − 1
  - Total:          2d² − 1
"""
from typing import List, Set
from models import DataQubit, Ancilla, Lattice


def build_lattice(d: int) -> Lattice:
    """
    Build a surface code lattice for distance d.

    Uses a rotated checkerboard grid of size (2d-1) x (2d-1):
    - Data qubits at positions (2i, 2j) for i,j in [0, d-1]
      → all have (r+c) even, exactly d² of them.
    - Horizontal ancillas at (2i, 2j+1) → Z_star (even row).
    - Vertical ancillas at (2i+1, 2j) → X_plaquette (odd row).
    - Each ancilla's neighbors are the orthogonal data qubits
      verified to exist in the data qubit ID set.
    - Ancillas trimmed to exactly (d²-1)/2 per type.

    Args:
        d: Code distance (3, 5, 7, or 9)

    Returns:
        Lattice object with data qubits and ancillas

    Raises:
        ValueError: If d is not 3, 5, 7, or 9
    """
    if d not in [3, 5, 7, 9]:
        raise ValueError(f"Code distance must be 3, 5, 7, or 9, got {d}")

    # ── Step 1: Data qubits on even-sum positions ──────────────────────
    data_qubits: List[DataQubit] = []
    data_qubit_ids: Set[str] = set()

    # Create exactly d*d data qubits where (r+c) is even
    for i in range(d):
        for j in range(d):
            r, c = 2 * i, 2 * j
            qubit_id = f"D{r}_{c}"
            data_qubits.append(DataQubit(id=qubit_id, r=r, c=c))
            data_qubit_ids.add(qubit_id)

    # ── Step 2: Candidate ancillas on odd-sum positions ────────────────
    z_candidates: List[Ancilla] = []
    x_candidates: List[Ancilla] = []
    
    grid_size = 2 * d - 1
    for r in range(grid_size):
        for c in range(grid_size):
            if (r + c) % 2 == 1:
                ancilla_id = f"A{r}_{c}"
                neighbors = _scan_orthogonal_neighbors(r, c, data_qubit_ids)
                if len(neighbors) >= 2:
                    if r % 2 == 0:
                        z_candidates.append(Ancilla(
                            id=ancilla_id, r=r, c=c,
                            type="Z_star", neighbors=neighbors
                        ))
                    else:
                        x_candidates.append(Ancilla(
                            id=ancilla_id, r=r, c=c,
                            type="X_plaquette", neighbors=neighbors
                        ))

    # ── Step 3: Trim to exactly (d²-1)/2 per type ─────────────────────
    target_per_type = (d * d - 1) // 2
    ancillas = z_candidates[:target_per_type] + x_candidates[:target_per_type]

    return Lattice(d=d, data_qubits=data_qubits, ancillas=ancillas)


def _scan_orthogonal_neighbors(r: int, c: int,
                                data_qubit_ids: Set[str]) -> List[str]:
    """
    Scan all four orthogonal directions from (r, c) and return
    the IDs of data qubits found.
    """
    neighbors: List[str] = []
    for dr, dc in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
        nr, nc = r + dr, c + dc
        neighbor_id = f"D{nr}_{nc}"
        if neighbor_id in data_qubit_ids:
            neighbors.append(neighbor_id)
    return neighbors


def get_data_qubit_at(lattice: Lattice, r: int, c: int) -> DataQubit:
    """Get a data qubit by its coordinates."""
    qubit_id = f"D{r}_{c}"
    for dq in lattice.data_qubits:
        if dq.id == qubit_id:
            return dq
    raise ValueError(f"No data qubit at ({r}, {c})")


def get_ancilla_at(lattice: Lattice, r: int, c: int) -> Ancilla:
    """Get an ancilla by its coordinates."""
    ancilla_id = f"A{r}_{c}"
    for a in lattice.ancillas:
        if a.id == ancilla_id:
            return a
    raise ValueError(f"No ancilla at ({r}, {c})")


def get_ancilla_by_id(lattice: Lattice, ancilla_id: str) -> Ancilla:
    """Get an ancilla by its ID."""
    for a in lattice.ancillas:
        if a.id == ancilla_id:
            return a
    raise ValueError(f"No ancilla with ID {ancilla_id}")


def validate_lattice_counts(d: int, lattice: Lattice) -> dict:
    """
    Validate that the lattice has the correct number of qubits.
    For distance d: (2d-1) x (2d-1) grid
    - Data qubits: d^2
    - Ancilla qubits: d^2 - 1
    - Total: 2d^2 - 1
    """
    expected_data = d * d
    expected_ancilla = d * d - 1
    expected_total = 2 * d * d - 1

    actual_data = len(lattice.data_qubits)
    actual_ancilla = len(lattice.ancillas)
    actual_total = actual_data + actual_ancilla

    return {
        "d": d,
        "expected_data": expected_data,
        "actual_data": actual_data,
        "data_correct": actual_data == expected_data,
        "expected_ancilla": expected_ancilla,
        "actual_ancilla": actual_ancilla,
        "ancilla_correct": actual_ancilla == expected_ancilla,
        "expected_total": expected_total,
        "actual_total": actual_total,
        "total_correct": actual_total == expected_total,
        "all_correct": (actual_data == expected_data and
                        actual_ancilla == expected_ancilla and
                        actual_total == expected_total)
    }


def serialize_lattice(lattice: Lattice) -> dict:
    """Serialize lattice to dict for API response."""
    return {
        "d": lattice.d,
        "data_qubits": [
            {
                "id": dq.id,
                "r": dq.r,
                "c": dq.c,
                "error_x": dq.error_x,
                "error_z": dq.error_z
            }
            for dq in lattice.data_qubits
        ],
        "ancillas": [
            {
                "id": a.id,
                "r": a.r,
                "c": a.c,
                "type": a.type,
                "neighbors": a.neighbors,
                "triggered": a.triggered
            }
            for a in lattice.ancillas
        ],
        "total_qubits": len(lattice.data_qubits) + len(lattice.ancillas)
    }
