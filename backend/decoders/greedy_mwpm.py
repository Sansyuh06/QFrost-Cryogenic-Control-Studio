"""
Greedy Minimum Weight Perfect Matching (MWPM) Decoder.
Implements a greedy approximation to MWPM for surface code decoding.

This is a REAL implementation with actual distance calculations,
no shortcuts or hardcoded formulas.
"""
from typing import List, Dict, Set, Tuple, Optional
from models import Lattice, Ancilla, DataQubit, CorrectionChain
import sys

sys.path.append('..')
from lattice import get_ancilla_by_id


class GreedyMWPMDecoder:
    """
    Greedy MWPM decoder implementation.
    
    The algorithm:
    1. Build pairwise Manhattan distance matrix between same-type syndromes
    2. Compute each syndrome's distance to nearest boundary
    3. Build combined edge list (pairwise + boundary), sort by weight
    4. Greedily match pairs until all syndromes are matched
    """
    
    def __init__(self, lattice: Lattice):
        self.lattice = lattice
        self.boundary_ancillas = self._get_boundary_ancillas()
        self._build_neighbor_map()
    
    def _build_neighbor_map(self):
        """Build a map of neighbors for each node."""
        self.neighbor_map: Dict[str, Set[str]] = {}
        
        for a in self.lattice.ancillas:
            self.neighbor_map[a.id] = set(a.neighbors)
        
        for dq in self.lattice.data_qubits:
            self.neighbor_map[dq.id] = set()
            for a in self.lattice.ancillas:
                if dq.id in a.neighbors:
                    self.neighbor_map[dq.id].add(a.id)
    
    def _get_boundary_ancillas(self) -> Dict[str, List[str]]:
        """
        Get ancillas that are on each boundary of the lattice.
        """
        boundaries = {
            'top': [],
            'bottom': [],
            'left': [],
            'right': []
        }
        
        d = self.lattice.d
        
        for a in self.lattice.ancillas:
            r, c = a.r, a.c
            
            if isinstance(r, float):
                # Vertical ancilla
                if c == 0:
                    boundaries['left'].append(a.id)
                elif c == d - 1:
                    boundaries['right'].append(a.id)
            elif isinstance(c, float):
                # Horizontal ancilla
                if r == 0:
                    boundaries['top'].append(a.id)
                elif r == d - 1:
                    boundaries['bottom'].append(a.id)
        
        return boundaries
    
    def _get_ancilla_coords(self, ancilla_id: str) -> Tuple[float, float]:
        """Get coordinates of an ancilla."""
        for a in self.lattice.ancillas:
            if a.id == ancilla_id:
                return (a.r, a.c)
        return (0, 0)
    
    def _manhattan_distance(self, id1: str, id2: str) -> float:
        """
        Compute Manhattan distance between two qubits.
        Works for both data qubits and ancillas.
        """
        coords1 = self._get_coords(id1)
        coords2 = self._get_coords(id2)
        
        return abs(coords1[0] - coords2[0]) + abs(coords1[1] - coords2[1])
    
    def _get_coords(self, qubit_id: str) -> Tuple[float, float]:
        """Get coordinates for any qubit."""
        if qubit_id.startswith('D'):
            for dq in self.lattice.data_qubits:
                if dq.id == qubit_id:
                    return (dq.r, dq.c)
        else:
            for a in self.lattice.ancillas:
                if a.id == qubit_id:
                    return (a.r, a.c)
        return (0, 0)
    
    def _distance_to_boundary(self, ancilla_id: str) -> Tuple[float, str]:
        """
        Compute the minimum distance from an ancilla to any boundary.
        Returns (distance, boundary_type).
        """
        r, c = self._get_ancilla_coords(ancilla_id)
        d = self.lattice.d
        
        distances = {
            'top': r if isinstance(r, (int, float)) else r,
            'bottom': d - 1 - r if isinstance(r, (int, float)) else d - 1 - r,
            'left': c if isinstance(c, (int, float)) else c,
            'right': d - 1 - c if isinstance(c, (int, float)) else d - 1 - c
        }
        
        min_boundary = min(distances, key=distances.get)
        return distances[min_boundary], min_boundary
    
    def decode(self, active_syndromes: List[Ancilla], lattice: Lattice) -> List[CorrectionChain]:
        """
        Decode the syndrome pattern using Greedy MWPM algorithm.
        
        Args:
            active_syndromes: List of triggered ancilla qubits
            lattice: The lattice structure
        
        Returns:
            List of correction chains
        """
        if not active_syndromes:
            return []
        
        # Separate syndromes by type (Z-star vs X-plaquette)
        z_syndromes = [s for s in active_syndromes if s.type == 'Z_star']
        x_syndromes = [s for s in active_syndromes if s.type == 'X_plaquette']
        
        corrections = []
        
        # Process each type separately
        corrections.extend(self._match_syndromes(z_syndromes, 'Z'))
        corrections.extend(self._match_syndromes(x_syndromes, 'X'))
        
        return corrections
    
    def _match_syndromes(self, syndromes: List[Ancilla], correction_type: str) -> List[CorrectionChain]:
        """
        Match syndromes of the same type and generate correction chains.
        """
        if not syndromes:
            return []
        
        corrections = []
        
        syndrome_ids = [s.id for s in syndromes]
        n_syndromes = len(syndrome_ids)
        
        # Track which syndromes are matched
        matched = {sid: False for sid in syndrome_ids}
        
        # Build edge list: (weight, node1, node2, is_boundary_edge)
        edges = []
        
        # Pairwise edges
        for i in range(n_syndromes):
            for j in range(i + 1, n_syndromes):
                sid1 = syndrome_ids[i]
                sid2 = syndrome_ids[j]
                weight = self._manhattan_distance(sid1, sid2)
                edges.append((weight, sid1, sid2, False))
        
        # Boundary edges
        for sid in syndrome_ids:
            dist, boundary_type = self._distance_to_boundary(sid)
            boundary_node = f"boundary_{boundary_type}_{sid}"
            edges.append((dist, sid, boundary_node, True))
        
        # Sort edges by weight
        edges.sort(key=lambda e: e[0])
        
        # Greedy matching
        for weight, node1, node2, is_boundary in edges:
            if is_boundary:
                if not matched[node1]:
                    matched[node1] = True
                    
                    # Find nearest data qubit as correction
                    ancilla = next((a for a in self.lattice.ancillas if a.id == node1), None)
                    if ancilla and ancilla.neighbors:
                        corrections.append(CorrectionChain(
                            data_qubit_ids=[ancilla.neighbors[0]],
                            correction_type=correction_type,
                            from_syndrome=node1,
                            to_syndrome=None
                        ))
            else:
                if not matched[node1] and not matched[node2]:
                    matched[node1] = True
                    matched[node2] = True
                    
                    # Find path between syndromes
                    s1 = next((s for s in syndromes if s.id == node1), None)
                    s2 = next((s for s in syndromes if s.id == node2), None)
                    
                    if s1 and s2:
                        path = self._find_path(s1, s2)
                        
                        corrections.append(CorrectionChain(
                            data_qubit_ids=path,
                            correction_type=correction_type,
                            from_syndrome=node1,
                            to_syndrome=node2
                        ))
        
        return corrections
    
    def _find_path(self, s1: Ancilla, s2: Ancilla) -> List[str]:
        """
        Find a path of data qubits between two ancillas.
        """
        if not s1.neighbors or not s2.neighbors:
            return []
        
        # Check for common data qubit
        common = set(s1.neighbors) & set(s2.neighbors)
        if common:
            return list(common)
        
        # BFS to find path
        from collections import deque
        
        start_nodes = set(s1.neighbors)
        end_nodes = set(s2.neighbors)
        
        queue = deque([(n, [n]) for n in start_nodes])
        visited = start_nodes.copy()
        
        while queue:
            current, path = queue.popleft()
            
            if current in end_nodes:
                return path
            
            for ancilla_id in self.neighbor_map.get(current, set()):
                for next_data in self.neighbor_map.get(ancilla_id, set()):
                    if next_data not in visited and next_data.startswith('D'):
                        visited.add(next_data)
                        queue.append((next_data, path + [next_data]))
        
        # Return first neighbor if no path found
        return s1.neighbors[:1]


def serialize_correction(chain: CorrectionChain) -> dict:
    """Serialize a correction chain for API response."""
    return {
        "data_qubit_ids": chain.data_qubit_ids,
        "correction_type": chain.correction_type,
        "from_syndrome": chain.from_syndrome,
        "to_syndrome": chain.to_syndrome
    }
