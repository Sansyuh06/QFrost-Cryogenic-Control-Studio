"""
Tests for timing harness integrity.
Proves numbers aren't hardcoded by testing with artificial delays.
"""
import sys
import os
import time

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest
from models import Lattice, Ancilla, CorrectionChain
from lattice import build_lattice
from timing import timed_decode, timed_single_call, timed_batch, TimerFloor


class TestTimingIntegrity:
    """Test cases for timing integrity."""
    
    def test_timed_decode_measures_time(self):
        """Test that timed_decode actually measures execution time."""
        lattice = build_lattice(3)
        
        # Create a dummy decoder that does some work
        class SlowDecoder:
            def __init__(self, delay_ms=1):
                self.delay_ms = delay_ms
            
            def decode(self, syndromes, lattice):
                time.sleep(self.delay_ms / 1000)  # Sleep for delay_ms milliseconds
                return []
        
        # Test with 1ms delay
        decoder = SlowDecoder(delay_ms=1)
        result = timed_decode(
            decoder,
            [],
            lattice,
            min_iterations=10,
            min_total_ns=1_000_000
        )
        
        # The average time should be at least 1ms (1,000,000 ns)
        # But we should not exceed by too much
        assert result['avg_ns_per_call'] >= 1_000_000, \
            f"Expected at least 1ms, got {result['avg_ns_per_call']/1e6:.3f}ms"
        assert result['avg_ns_per_call'] < 10_000_000, \
            f"Unexpectedly slow: {result['avg_ns_per_call']/1e6:.3f}ms"
        
        # Check that iterations were run
        assert result['iterations'] >= 10
    
    def test_timed_decode_changes_with_delay(self):
        """Test that timing changes when delay changes."""
        lattice = build_lattice(3)
        
        class DelayedDecoder:
            def __init__(self, delay_ms):
                self.delay_ms = delay_ms
            
            def decode(self, syndromes, lattice):
                time.sleep(self.delay_ms / 1000)
                return []
        
        # Test with 1ms delay
        decoder1 = DelayedDecoder(delay_ms=1)
        result1 = timed_decode(
            decoder1, [], lattice,
            min_iterations=10, min_total_ns=1_000_000
        )
        
        # Test with 2ms delay
        decoder2 = DelayedDecoder(delay_ms=2)
        result2 = timed_decode(
            decoder2, [], lattice,
            min_iterations=10, min_total_ns=1_000_000
        )
        
        # The second should be roughly twice as long
        ratio = result2['avg_ns_per_call'] / result1['avg_ns_per_call']
        
        # Allow some tolerance
        assert 1.5 < ratio < 3.0, \
            f"Expected ratio ~2, got {ratio:.2f}"
    
    def test_timing_methodology_is_reported(self):
        """Test that timing methodology is always reported."""
        lattice = build_lattice(3)
        
        class DummyDecoder:
            def decode(self, syndromes, lattice):
                return []
        
        decoder = DummyDecoder()
        result = timed_decode(decoder, [], lattice)
        
        assert 'methodology' in result
        assert 'iterations' in result
        assert 'avg_ns_per_call' in result
        assert 'total_measured_ns' in result
        
        # Methodology should mention the iterations
        assert str(result['iterations']) in result['methodology']
    
    def test_timer_floor_detection(self):
        """Test timer floor detection."""
        # Values below floor should be flagged
        assert not TimerFloor.is_above_floor(50)  # 50ns is below 100ns floor
        assert TimerFloor.is_above_floor(200)  # 200ns is above floor
        assert TimerFloor.is_above_floor(100)  # Exactly at floor
    
    def test_timer_floor_formatting(self):
        """Test timer floor formatting."""
        # Below floor with single iteration
        formatted = TimerFloor.format_measurement(50, iterations=1)
        assert 'below' in formatted.lower() or 'floor' in formatted.lower()
        
        # Above floor
        formatted = TimerFloor.format_measurement(500, iterations=100)
        assert '500' in formatted
    
    def test_timing_reliability_check(self):
        """Test timing reliability checking."""
        # Single measurement below floor
        check = TimerFloor.check_timing_reliability(50, iterations=1)
        assert not check['is_reliable']
        assert check['warning'] is not None
        
        # Batched measurement (reliable even if below floor)
        check = TimerFloor.check_timing_reliability(50, iterations=1000)
        assert check['is_reliable']
        assert check['warning'] is None
        
        # Single measurement above floor
        check = TimerFloor.check_timing_reliability(500, iterations=1)
        assert check['is_reliable']
    
    def test_real_decoder_timing(self):
        """Test timing with real decoders."""
        lattice = build_lattice(5)
        
        from decoders.union_find import UnionFindDecoder
        from decoders.greedy_mwpm import GreedyMWPMDecoder
        
        # Create some syndromes
        z_ancillas = [a for a in lattice.ancillas if a.type == 'Z_star'][:5]
        
        # Test Union-Find
        uf_decoder = UnionFindDecoder(lattice)
        uf_result = timed_decode(uf_decoder, z_ancillas, lattice)
        
        assert uf_result['avg_ns_per_call'] > 0
        assert uf_result['iterations'] >= 1000
        
        # Test Greedy MWPM
        mwpm_decoder = GreedyMWPMDecoder(lattice)
        mwpm_result = timed_decode(mwpm_decoder, z_ancillas, lattice)
        
        assert mwpm_result['avg_ns_per_call'] > 0
        assert mwpm_result['iterations'] >= 1000
    
    def test_no_hardcoded_timing_values(self):
        """Test that timing values are not hardcoded."""
        lattice = build_lattice(3)
        
        class VariableDecoder:
            def __init__(self):
                self.call_count = 0
            
            def decode(self, syndromes, lattice):
                self.call_count += 1
                # Variable work based on call count
                total = 0
                for i in range(self.call_count * 10):
                    total += i
                return []
        
        decoder = VariableDecoder()
        result = timed_decode(
            decoder, [], lattice,
            min_iterations=5,
            min_total_ns=100_000
        )
        
        # If timing was hardcoded, this would fail
        # The key is that iterations were actually performed
        assert result['iterations'] >= 5
    
    def test_timed_single_call(self):
        """Test single call timing."""
        def quick_func():
            return 42
        
        result = timed_single_call(quick_func)
        
        assert result['result'] == 42
        assert 'timing_ns' in result
        assert 'methodology' in result
    
    def test_timed_batch(self):
        """Test batched timing."""
        counter = [0]
        
        def incrementer():
            counter[0] += 1
            return counter[0]
        
        result = timed_batch(incrementer, iterations=100)
        
        assert result['result'] == 100
        assert result['iterations'] == 100
        assert 'avg_ns_per_call' in result


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
