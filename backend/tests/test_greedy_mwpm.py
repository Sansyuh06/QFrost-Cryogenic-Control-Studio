"""
Tests for Greedy MWPM decoder.
Verifies output is a valid perfect matching.
"""
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest
from models import Lattice, Ancilla, CorrectionChain
from lattice import build_lattice
from decoders.greedy_mwpm import GreedyMWPMDecoder


class TestGreedyMWPMDecoder:
    """Test cases for Greedy MWPM decoder."""
    
    def test_decode_empty_syndromes(self):
        """Test decode with no active syndromes."""
        lattice = build_lattice(3)
        decoder = GreedyMWPMDecoder(lattice)
        
        corrections = decoder.decode([], lattice)
        
        assert corrections == []
    
    def test_valid_matching_single_pair(self):
        """Test that a pair of syndromes produces valid matching."""
        lattice = build_lattice(3)
        decoder = GreedyMWPMDecoder(lattice)
        
        # Get two ancillas of same type
        z_ancillas = [a for a in lattice.ancillas if a.type == 'Z_star']
        
        if len(z_ancillas) >= 2:
            ancillas = [z_ancillas[0], z_ancillas[1]]
            corrections = decoder.decode(ancillas, lattice)
            
            # Should produce exactly one correction chain for the pair
            # (or more if connected to boundary)
            assert isinstance(corrections, list)
            
            # Check that each syndrome is matched at most once
            matched_syndromes = set()
            for chain in corrections:
                if chain.from_syndrome:
                    assert chain.from_syndrome not in matched_syndromes
                    matched_syndromes.add(chain.from_syndrome)
                if chain.to_syndrome:
                    assert chain.to_syndrome not in matched_syndromes
                    matched_syndromes.add(chain.to_syndrome)
    
    def test_all_syndromes_accounted_for(self):
        """Test that all input syndromes are matched."""
        lattice = build_lattice(5)
        decoder = GreedyMWPMDecoder(lattice)
        
        # Create some syndromes
        z_ancillas = [a for a in lattice.ancillas if a.type == 'Z_star'][:5]
        x_ancillas = [a for a in lattice.ancillas if a.type == 'X_plaquette'][:4]
        
        all_syndromes = z_ancillas + x_ancillas
        input_ids = {a.id for a in all_syndromes}
        
        corrections = decoder.decode(all_syndromes, lattice)
        
        # Extract matched syndromes from corrections
        matched_ids = set()
        for chain in corrections:
            if chain.from_syndrome:
                matched_ids.add(chain.from_syndrome)
            if chain.to_syndrome:
                matched_ids.add(chain.to_syndrome)
        
        # All input syndromes should be matched
        # (Note: some may be matched to boundary, so to_syndrome may be None)
        for sid in input_ids:
            assert sid in matched_ids, f"Syndrome {sid} not matched"
    
    def test_no_double_matching(self):
        """Test that no syndrome is matched twice."""
        lattice = build_lattice(5)
        decoder = GreedyMWPMDecoder(lattice)
        
        # Create syndromes
        z_ancillas = [a for a in lattice.ancillas if a.type == 'Z_star'][:6]
        
        corrections = decoder.decode(z_ancillas, lattice)
        
        # Count how many times each syndrome appears
        syndrome_count = {}
        for chain in corrections:
            if chain.from_syndrome:
                syndrome_count[chain.from_syndrome] = syndrome_count.get(chain.from_syndrome, 0) + 1
            if chain.to_syndrome:
                syndrome_count[chain.to_syndrome] = syndrome_count.get(chain.to_syndrome, 0) + 1
        
        # Each should appear exactly once
        for sid, count in syndrome_count.items():
            assert count == 1, f"Syndrome {sid} matched {count} times"
    
    def test_correction_chain_types(self):
        """Test that correction chains have correct types based on syndrome type."""
        lattice = build_lattice(3)
        decoder = GreedyMWPMDecoder(lattice)
        
        # Test Z-star syndromes (should produce X corrections)
        z_ancillas = [a for a in lattice.ancillas if a.type == 'Z_star'][:2]
        
        if z_ancillas:
            corrections = decoder.decode(z_ancillas, lattice)
            
            for chain in corrections:
                assert chain.correction_type == 'Z', "Z-star syndromes should produce Z corrections"
        
        # Test X-plaquette syndromes (should produce X corrections)
        x_ancillas = [a for a in lattice.ancillas if a.type == 'X_plaquette'][:2]
        
        if x_ancillas:
            corrections = decoder.decode(x_ancillas, lattice)
            
            for chain in corrections:
                assert chain.correction_type == 'X', "X-plaquette syndromes should produce X corrections"
    
    def test_manhattan_distance_calculation(self):
        """Test Manhattan distance calculation."""
        lattice = build_lattice(3)
        decoder = GreedyMWPMDecoder(lattice)
        
        # Test known distances
        # Distance between A1_0 and A1_2 should be 2
        dist = decoder._manhattan_distance("A1_0", "A1_2")
        assert dist == 2
        
        # Distance between A1_0 and A3_0 should be 2
        dist = decoder._manhattan_distance("A1_0", "A3_0")
        assert dist == 2
        
        # Distance between A1_0 and A3_2 should be 4
        dist = decoder._manhattan_distance("A1_0", "A3_2")
        assert dist == 4
    
    def test_boundary_detection(self):
        """Test that boundary ancillas are correctly identified."""
        lattice = build_lattice(3)
        decoder = GreedyMWPMDecoder(lattice)
        
        # Check boundaries
        grid_size = 2 * lattice.d - 1  # 5
        
        # Top boundary (r=0)
        for aid in decoder.boundary_ancillas['top']:
            parts = aid[1:].split('_')
            r = int(parts[0])
            assert r == 0, f"Ancilla {aid} not on top boundary"
        
        # Bottom boundary (r=grid_size-1)
        for aid in decoder.boundary_ancillas['bottom']:
            parts = aid[1:].split('_')
            r = int(parts[0])
            assert r == grid_size - 1, f"Ancilla {aid} not on bottom boundary"
        
        # Left boundary (c=0)
        for aid in decoder.boundary_ancillas['left']:
            parts = aid[1:].split('_')
            c = int(parts[1])
            assert c == 0, f"Ancilla {aid} not on left boundary"
        
        # Right boundary (c=grid_size-1)
        for aid in decoder.boundary_ancillas['right']:
            parts = aid[1:].split('_')
            c = int(parts[1])
            assert c == grid_size - 1, f"Ancilla {aid} not on right boundary"
    
    def test_distance_to_boundary(self):
        """Test distance to boundary calculation."""
        lattice = build_lattice(3)
        decoder = GreedyMWPMDecoder(lattice)
        
        # Ancilla at center should have equal distances to all boundaries
        # For d=3, grid is 5x5, center is at (2,2)
        # But ancillas are at odd-sum positions, so (1,2), (2,1), etc.
        
        # Test a known ancilla
        dist, boundary = decoder._distance_to_boundary("A1_0")
        assert dist == 0  # On left boundary
        assert boundary == 'left'
        
        dist, boundary = decoder._distance_to_boundary("A0_1")
        assert dist == 0  # On top boundary
        assert boundary == 'top'
    
    def test_path_generation(self):
        """Test that paths are generated correctly."""
        lattice = build_lattice(3)
        decoder = GreedyMWPMDecoder(lattice)
        
        # Test path between adjacent ancillas
        path = decoder._bfs_path("A1_0", "A1_2")
        
        # Path should go through the data qubit between them
        assert isinstance(path, list)
        assert all(pid.startswith('D') for pid in path)
    
    def test_odd_number_of_syndromes(self):
        """Test that odd number of syndromes handles boundary matching."""
        lattice = build_lattice(3)
        decoder = GreedyMWPMDecoder(lattice)
        
        # Use 3 syndromes (odd number)
        z_ancillas = [a for a in lattice.ancillas if a.type == 'Z_star'][:3]
        
        if len(z_ancillas) == 3:
            corrections = decoder.decode(z_ancillas, lattice)
            
            # All syndromes should be matched (some to boundary)
            matched_ids = set()
            for chain in corrections:
                if chain.from_syndrome:
                    matched_ids.add(chain.from_syndrome)
                if chain.to_syndrome:
                    matched_ids.add(chain.to_syndrome)
            
            for a in z_ancillas:
                assert a.id in matched_ids


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
