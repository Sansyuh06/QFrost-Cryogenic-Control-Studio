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
        
        # Test Z-star syndromes (should produce Z corrections)
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
        """Test Manhattan distance calculation with new coordinate system."""
        lattice = build_lattice(3)
        decoder = GreedyMWPMDecoder(lattice)
        
        # Test distance between two data qubits
        dist = decoder._manhattan_distance("D0_0", "D0_2")
        assert dist == 2, f"Expected distance 2, got {dist}"
        
        dist = decoder._manhattan_distance("D0_0", "D2_0")
        assert dist == 2, f"Expected distance 2, got {dist}"
        
        dist = decoder._manhattan_distance("D0_0", "D2_2")
        assert dist == 4, f"Expected distance 4, got {dist}"
    
    def test_boundary_detection(self):
        """Test that boundary ancillas are correctly identified."""
        lattice = build_lattice(3)
        decoder = GreedyMWPMDecoder(lattice)
        d = lattice.d
        
        # Check that boundary lists contain valid ancillas
        for boundary_type, ancilla_ids in decoder.boundary_ancillas.items():
            for aid in ancilla_ids:
                # Verify the ancilla exists
                ancilla = next((a for a in lattice.ancillas if a.id == aid), None)
                assert ancilla is not None, f"Ancilla {aid} not found in lattice"
    
    def test_distance_to_boundary(self):
        """Test distance to boundary calculation."""
        lattice = build_lattice(3)
        decoder = GreedyMWPMDecoder(lattice)
        
        # Test with a known ancilla
        # Just verify the function returns a valid result
        for a in lattice.ancillas[:3]:
            dist, boundary = decoder._distance_to_boundary(a.id)
            assert dist >= 0, f"Distance should be non-negative"
            assert boundary in ['top', 'bottom', 'left', 'right'], f"Invalid boundary type: {boundary}"
    
    def test_path_generation(self):
        """Test that paths are generated correctly."""
        lattice = build_lattice(3)
        decoder = GreedyMWPMDecoder(lattice)
        
        # Get two ancillas and test path finding
        z_ancillas = [a for a in lattice.ancillas if a.type == 'Z_star']
        
        if len(z_ancillas) >= 2:
            path = decoder._find_path(z_ancillas[0], z_ancillas[1])
            
            # Path should be a list of data qubit IDs
            assert isinstance(path, list)
            for pid in path:
                assert pid.startswith('D'), f"Path element should be a data qubit: {pid}"
    
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
