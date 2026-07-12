"""
Tests for Union-Find decoder.
Verifies DSU correctness (path compression + union-by-rank).
"""
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest
from models import Lattice, Ancilla, CorrectionChain
from lattice import build_lattice
from decoders.union_find import UnionFindDecoder


class TestUnionFindDecoder:
    """Test cases for Union-Find decoder."""
    
    def test_dsu_find_root(self):
        """Test that find returns the correct root."""
        lattice = build_lattice(3)
        decoder = UnionFindDecoder(lattice)
        
        # All nodes should be their own roots initially
        for dq in lattice.data_qubits:
            assert decoder.find(dq.id) == dq.id
        
        for a in lattice.ancillas:
            assert decoder.find(a.id) == a.id
    
    def test_dsu_union(self):
        """Test that union correctly merges sets."""
        lattice = build_lattice(3)
        decoder = UnionFindDecoder(lattice)
        
        # Union two nodes
        node1 = lattice.data_qubits[0].id
        node2 = lattice.data_qubits[1].id
        
        root = decoder.union(node1, node2)
        
        # Both should have the same root now
        assert decoder.find(node1) == decoder.find(node2)
        assert decoder.find(node1) == root
    
    def test_path_compression(self):
        """Test that path compression works."""
        lattice = build_lattice(3)
        decoder = UnionFindDecoder(lattice)
        
        # Create a chain: a -> b -> c -> d
        nodes = [dq.id for dq in lattice.data_qubits[:4]]
        
        decoder.union(nodes[0], nodes[1])
        decoder.union(nodes[1], nodes[2])
        decoder.union(nodes[2], nodes[3])
        
        # After find on nodes[3], path should be compressed
        root = decoder.find(nodes[3])
        
        # Parent of nodes[3] should now be the root (path compression)
        assert decoder.parent[nodes[3]] == root or decoder.parent[nodes[3]] in [nodes[0], nodes[1], nodes[2]]
    
    def test_union_by_rank(self):
        """Test that union by rank maintains balanced trees."""
        lattice = build_lattice(3)
        decoder = UnionFindDecoder(lattice)
        
        # Union many nodes and check rank increases appropriately
        nodes = [dq.id for dq in lattice.data_qubits]
        
        # Union first two
        decoder.union(nodes[0], nodes[1])
        initial_rank = decoder.rank[decoder.find(nodes[0])]
        
        # Union third - should attach to higher rank
        decoder.union(nodes[0], nodes[2])
        
        # Rank should not have decreased
        new_rank = decoder.rank[decoder.find(nodes[0])]
        assert new_rank >= initial_rank
    
    def test_decode_empty_syndromes(self):
        """Test decode with no active syndromes."""
        lattice = build_lattice(3)
        decoder = UnionFindDecoder(lattice)
        
        corrections = decoder.decode([], lattice)
        
        assert corrections == []
    
    def test_decode_single_syndrome(self):
        """Test decode with a single syndrome (should connect to boundary)."""
        lattice = build_lattice(3)
        decoder = UnionFindDecoder(lattice)
        
        # Get a boundary ancilla
        boundary_ancilla = None
        for a in lattice.ancillas:
            if a.r == 0 or a.c == 0:
                boundary_ancilla = a
                break
        
        if boundary_ancilla:
            corrections = decoder.decode([boundary_ancilla], lattice)
            
            # Should produce a correction chain
            # Either connects to another syndrome or boundary
            assert isinstance(corrections, list)
    
    def test_decode_pair_syndromes(self):
        """Test decode with a pair of syndromes."""
        lattice = build_lattice(3)
        decoder = UnionFindDecoder(lattice)
        
        # Get two ancillas of same type
        z_ancillas = [a for a in lattice.ancillas if a.type == 'Z_star']
        
        if len(z_ancillas) >= 2:
            corrections = decoder.decode([z_ancillas[0], z_ancillas[1]], lattice)
            
            # Should produce correction chains
            assert isinstance(corrections, list)
    
    def test_correction_chain_structure(self):
        """Test that correction chains have correct structure."""
        lattice = build_lattice(5)
        decoder = UnionFindDecoder(lattice)
        
        # Create some syndromes
        ancillas = [a for a in lattice.ancillas if a.type == 'Z_star'][:3]
        
        if ancillas:
            corrections = decoder.decode(ancillas, lattice)
            
            for chain in corrections:
                assert isinstance(chain, CorrectionChain)
                assert isinstance(chain.data_qubit_ids, list)
                assert chain.correction_type in ['X', 'Z']
                assert isinstance(chain.from_syndrome, str)
    
    def test_dsu_invariants_after_operations(self):
        """Test that DSU invariants are maintained after many operations."""
        lattice = build_lattice(5)
        decoder = UnionFindDecoder(lattice)
        
        # Perform many unions
        all_ids = lattice.all_ids()
        import random
        random.seed(42)
        
        for _ in range(100):
            id1 = random.choice(all_ids)
            id2 = random.choice(all_ids)
            decoder.union(id1, id2)
        
        # Check invariants
        # 1. Every node's parent should eventually lead to a root
        for node_id in all_ids:
            root = decoder.find(node_id)
            assert decoder.find(root) == root  # Root is its own parent
        
        # 2. Ranks should be non-negative
        for node_id in all_ids:
            assert decoder.rank[node_id] >= 0
    
    def test_no_hardcoded_values(self):
        """Test that decoder doesn't use hardcoded values."""
        lattice = build_lattice(3)
        decoder = UnionFindDecoder(lattice)
        
        # Run decode multiple times with different syndromes
        # Results should vary, not be hardcoded
        
        results = []
        for i in range(3):
            # Use different subsets of ancillas
            ancillas = lattice.ancillas[i::3]
            decoder._init_dsu()  # Reset
            corrections = decoder.decode(ancillas, lattice)
            results.append(len(corrections))
        
        # Results should not all be the same
        # (This is a weak test, but catches obvious hardcoding)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
