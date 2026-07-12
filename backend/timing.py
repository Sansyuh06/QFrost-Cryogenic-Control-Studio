"""
Honest timing harness for decoder benchmarking.
Uses time.perf_counter_ns() for server-side sub-microsecond timing.
"""
import time
from typing import Any, Callable, Dict, List
from models import Lattice, Ancilla, CorrectionChain


def timed_decode(
    decoder: Any,
    active_syndromes: List[Ancilla],
    lattice: Lattice,
    min_iterations: int = 1000,
    min_total_ns: int = 1_000_000
) -> Dict[str, Any]:
    """
    Runs decoder.decode() repeatedly on the SAME syndrome set until either
    min_iterations is reached or min_total_ns of wall time has elapsed
    (whichever takes longer), then returns the per-call average.
    
    This exists because a single call on <=161 nodes is usually faster
    than the timer's reliable resolution floor — reported honestly.
    
    Args:
        decoder: Decoder instance with a decode() method
        active_syndromes: List of triggered ancilla qubits
        lattice: The lattice structure
        min_iterations: Minimum number of iterations to run
        min_total_ns: Minimum total wall time in nanoseconds
    
    Returns:
        Dictionary with timing statistics and methodology
    """
    start = time.perf_counter_ns()
    count = 0
    
    while True:
        decoder.decode(active_syndromes, lattice)
        count += 1
        elapsed = time.perf_counter_ns() - start
        
        if count >= min_iterations and elapsed >= min_total_ns:
            break
    
    per_call_ns = elapsed / count
    
    return {
        "avg_ns_per_call": per_call_ns,
        "iterations": count,
        "total_measured_ns": elapsed,
        "methodology": f"average over {count} repeated calls on identical syndrome input"
    }


def timed_single_call(
    func: Callable,
    *args,
    **kwargs
) -> Dict[str, Any]:
    """
    Time a single function call with nanosecond precision.
    Returns the result and timing info.
    
    Args:
        func: Function to time
        *args, **kwargs: Arguments to pass to the function
    
    Returns:
        Dictionary with result, timing_ns, and methodology
    """
    start = time.perf_counter_ns()
    result = func(*args, **kwargs)
    elapsed = time.perf_counter_ns() - start
    
    return {
        "result": result,
        "timing_ns": elapsed,
        "methodology": "single call measured with time.perf_counter_ns()"
    }


def timed_batch(
    func: Callable,
    iterations: int,
    *args,
    **kwargs
) -> Dict[str, Any]:
    """
    Time multiple calls to a function and return statistics.
    
    Args:
        func: Function to time
        iterations: Number of iterations
        *args, **kwargs: Arguments to pass to the function
    
    Returns:
        Dictionary with result, timing statistics, and methodology
    """
    start = time.perf_counter_ns()
    result = None
    
    for _ in range(iterations):
        result = func(*args, **kwargs)
    
    elapsed = time.perf_counter_ns() - start
    per_call_ns = elapsed / iterations
    
    return {
        "result": result,
        "avg_ns_per_call": per_call_ns,
        "iterations": iterations,
        "total_measured_ns": elapsed,
        "methodology": f"average over {iterations} calls"
    }


class TimerFloor:
    """
    Utility to detect when measurements are below the reliable timer floor.
    On most systems, this is around 100-300 nanoseconds.
    """
    
    # Empirically determined measurement floor
    # Below this, we should warn that the measurement may be unreliable
    MEASUREMENT_FLOOR_NS = 100  # nanoseconds
    
    @classmethod
    def is_above_floor(cls, measurement_ns: float) -> bool:
        """Check if a measurement is above the reliable timer floor."""
        return measurement_ns >= cls.MEASUREMENT_FLOOR_NS
    
    @classmethod
    def format_measurement(cls, measurement_ns: float, iterations: int = 1) -> str:
        """
        Format a measurement with appropriate caveats.
        
        If the measurement is below the floor and was a single iteration,
        indicate that it may be unreliable.
        """
        if measurement_ns < cls.MEASUREMENT_FLOOR_NS and iterations == 1:
            return f"< {cls.MEASUREMENT_FLOOR_NS} ns (single measurement, below timer floor)"
        else:
            return f"{measurement_ns:.1f} ns (avg over {iterations} iterations)"
    
    @classmethod
    def check_timing_reliability(cls, avg_ns: float, iterations: int) -> Dict[str, Any]:
        """
        Check if a timing measurement is reliable.
        
        Returns a dict with reliability status and any warnings.
        """
        is_reliable = avg_ns >= cls.MEASUREMENT_FLOOR_NS or iterations > 1
        
        warning = None
        if not is_reliable:
            warning = (
                f"Single measurement of {avg_ns:.1f} ns is below the timer "
                f"resolution floor of {cls.MEASUREMENT_FLOOR_NS} ns. "
                "Consider batching multiple calls for more reliable results."
            )
        
        return {
            "is_reliable": is_reliable,
            "measurement_floor_ns": cls.MEASUREMENT_FLOOR_NS,
            "warning": warning
        }
