"""
Tests for lattice module.
Verifies qubit counts match spec exactly for d=3,5,7,9.
"""
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest
from lattice import build_lattice, validate_lattice_counts


class TestLattice:
    """Test cases for lattice generation."""
    
    def test_lattice_d3(self):
        """Test lattice for distance 3."""
        d = 3
        lattice = build_lattice(d)
        
        # Expected counts:
        # Data qubits: d^2 = 9
        # Ancilla qubits: d^2 - 1 = 8
        # Total: 17
        
        validation = validate_lattice_counts(d, lattice)
        
        assert validation['data_correct'], f"Data qubits: expected {validation['expected_data']}, got {validation['actual_data']}"
        assert validation['ancilla_correct'], f"Ancilla qubits: expected {validation['expected_ancilla']}, got {validation['actual_ancilla']}"
        assert validation['total_correct'], f"Total qubits: expected {validation['expected_total']}, got {validation['actual_total']}"
        assert validation['all_correct']
    
    def test_lattice_d5(self):
        """Test lattice for distance 5."""
        d = 5
        lattice = build_lattice(d)
        
        # Data qubits: 25
        # Ancilla qubits: 24
        # Total: 49
        
        validation = validate_lattice_counts(d, lattice)
        
        assert validation['data_correct'], f"Data qubits: expected {validation['expected_data']}, got {validation['actual_data']}"
        assert validation['ancilla_correct'], f"Ancilla qubits: expected {validation['expected_ancilla']}, got {validation['actual_ancilla']}"
        assert validation['total_correct'], f"Total qubits: expected {validation['expected_total']}, got {validation['actual_total']}"
        assert validation['all_correct']
    
    def test_lattice_d7(self):
        """Test lattice for distance 7."""
        d = 7
        lattice = build_lattice(d)
        
        # Data qubits: 49
        # Ancilla qubits: 48
        # Total: 97
        
        validation = validate_lattice_counts(d, lattice)
        
        assert validation['data_correct'], f"Data qubits: expected {validation['expected_data']}, got {validation['actual_data']}"
        assert validation['ancilla_correct'], f"Ancilla qubits: expected {validation['expected_ancilla']}, got {validation['actual_ancilla']}"
        assert validation['total_correct'], f"Total qubits: expected {validation['expected_total']}, got {validation['actual_total']}"
        assert validation['all_correct']
    
    def test_lattice_d9(self):
        """Test lattice for distance 9."""
        d = 9
        lattice = build_lattice(d)
        
        # Data qubits: 81
        # Ancilla qubits: 80
        # Total: 161
        
        validation = validate_lattice_counts(d, lattice)
        
        assert validation['data_correct'], f"Data qubits: expected {validation['expected_data']}, got {validation['actual_data']}"
        assert validation['ancilla_correct'], f"Ancilla qubits: expected {validation['expected_ancilla']}, got {validation['actual_ancilla']}"
        assert validation['total_correct'], f"Total qubits: expected {validation['expected_total']}, got {validation['actual_total']}"
        assert validation['all_correct']
    
    def test_data_qubit_positions(self):
        """Test that data qubits are at correct positions on the (2d-1) grid."""
        d = 3
        lattice = build_lattice(d)
        grid_max = 2 * (d - 1)
        
        for dq in lattice.data_qubits:
            # Data qubits at even-sum positions in [0, 2(d-1)] range
            assert 0 <= dq.r <= grid_max, f"Data qubit row out of range: {dq.r}"
            assert 0 <= dq.c <= grid_max, f"Data qubit column out of range: {dq.c}"
            assert (dq.r + dq.c) % 2 == 0, f"Data qubit {dq.id} not at even-sum position"
    
    def test_ancilla_positions(self):
        """Test that ancilla qubits are at correct integer positions."""
        d = 3
        lattice = build_lattice(d)
        grid_max = 2 * (d - 1)
        
        for a in lattice.ancillas:
            # Ancillas must have integer coordinates
            assert isinstance(a.r, int), f"Ancilla {a.id} row is not int: {type(a.r)}"
            assert isinstance(a.c, int), f"Ancilla {a.id} col is not int: {type(a.c)}"
            # Coordinates within grid
            assert 0 <= a.r <= grid_max, f"Ancilla {a.id} row out of range: {a.r}"
            assert 0 <= a.c <= grid_max, f"Ancilla {a.id} col out of range: {a.c}"
            # Ancillas at odd-sum positions
            assert (a.r + a.c) % 2 == 1, f"Ancilla {a.id} not at odd-sum position"
    
    def test_ancilla_types_exist(self):
        """Test that ancillas have valid types."""
        d = 5
        lattice = build_lattice(d)
        
        for a in lattice.ancillas:
            assert a.type in ['Z_star', 'X_plaquette'], f"Invalid ancilla type: {a.type}"
    
    def test_z_and_x_ancilla_counts(self):
        """Test that we have roughly equal Z and X stabilizers."""
        d = 5
        lattice = build_lattice(d)
        
        z_count = sum(1 for a in lattice.ancillas if a.type == 'Z_star')
        x_count = sum(1 for a in lattice.ancillas if a.type == 'X_plaquette')
        
        # Should have equal or nearly equal counts
        assert abs(z_count - x_count) <= 1, f"Unbalanced ancilla types: Z={z_count}, X={x_count}"
        assert z_count + x_count == d * d - 1
    
    def test_ancilla_neighbors(self):
        """Test that ancilla neighbors are data qubits."""
        d = 3
        lattice = build_lattice(d)
        
        data_qubit_ids = {dq.id for dq in lattice.data_qubits}
        
        for a in lattice.ancillas:
            for neighbor in a.neighbors:
                assert neighbor in data_qubit_ids, f"Neighbor {neighbor} of ancilla {a.id} is not a data qubit"
    
    def test_ancilla_neighbor_count(self):
        """Test that ancillas have exactly 2 neighbors (for planar code)."""
        d = 3
        lattice = build_lattice(d)
        
        for a in lattice.ancillas:
            assert len(a.neighbors) == 2, f"Ancilla {a.id} has {len(a.neighbors)} neighbors, expected 2"
    
    def test_invalid_distance(self):
        """Test that invalid distances raise errors."""
        for invalid_d in [2, 4, 6, 8, 10, 0, -1]:
            with pytest.raises(ValueError):
                build_lattice(invalid_d)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
