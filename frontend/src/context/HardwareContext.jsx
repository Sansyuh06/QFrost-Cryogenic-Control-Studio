import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api';

const HardwareContext = createContext();

export const useHardware = () => useContext(HardwareContext);

export const HardwareProvider = ({ children }) => {
    const [telemetry, setTelemetry] = useState({
        temperatures: { T1_STAGE1_K: 0, T2_STAGE2_K: 0, T3_MIXING_CHAMBER_MK: 0, T4_STILL_MK: 0 },
        pressures: { P1_OVC_MBAR: 0, P2_IVC_MBAR: 0, P3_STILL_MBAR: 0 },
        power: 0,
        valves: {},
        pumps: {}
    });

    const [isPolling, setIsPolling] = useState(true);
    
    // Global Circuit State for bridging orchestrator and dashboard
    const [circuitHeat, setCircuitHeat] = useState(0); // 0 to 1 value representing heat/probability
    const [isCircuitRunning, setIsCircuitRunning] = useState(false);

    const fetchTelemetry = async () => {
        try {
            const data = await api.getTelemetry();
            setTelemetry(data);
        } catch (error) {
            console.error('Failed to fetch telemetry:', error);
        }
    };

    useEffect(() => {
        let interval;
        if (isPolling) {
            fetchTelemetry(); // Initial fetch
            interval = setInterval(fetchTelemetry, 2000); // Poll every 2 seconds
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [isPolling]);

    // Fast updates for optimistic UI or direct polling after an action
    const refreshHardwareState = () => {
        return fetchTelemetry();
    };

    return (
        <HardwareContext.Provider value={{ 
            telemetry, isPolling, setIsPolling, refreshHardwareState,
            circuitHeat, setCircuitHeat,
            isCircuitRunning, setIsCircuitRunning
        }}>
            {children}
        </HardwareContext.Provider>
    );
};
