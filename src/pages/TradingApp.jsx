import { useState, useEffect } from 'react';
import ConnectBroker from '../components/ConnectBroker';
import SelectStock from '../components/SelectStock';
import TradeResults from '../components/TradeResults';
import { API_BASE } from "../api";
import '../TradingApp.css';

function TradingApp({ user, setUser }) {
    // Persisted states
    const [activeTab, setActiveTab] = useState(() => localStorage.getItem("activeTab") || 'connect');
    const [brokerCount, setBrokerCount] = useState(() => parseInt(localStorage.getItem("brokerCount")) || 1);
    const [selectedBrokers, setSelectedBrokers] = useState(() => {
        const saved = localStorage.getItem("selectedBrokers");
        return saved ? JSON.parse(saved) : [{ name: 'u', credentials: {}, profileData: null }];
    });
    const [stockCount, setStockCount] = useState(() => parseInt(localStorage.getItem("stockCount")) || 1);
    const [tradingParameters, setTradingParameters] = useState(() => {
        const saved = localStorage.getItem("tradingParameters");
        return saved ? JSON.parse(saved) : {};
    });
    const [tradingStatus, setTradingStatus] = useState(() => {
        const saved = localStorage.getItem("tradingStatus");
        return saved ? JSON.parse(saved) : {};
    });
    const [tradeLogs, setTradeLogs] = useState(() => {
        const saved = localStorage.getItem("tradeLogs");
        return saved ? JSON.parse(saved) : [];
    });

    // Persist to localStorage
    useEffect(() => { localStorage.setItem("activeTab", activeTab); }, [activeTab]);
    useEffect(() => { localStorage.setItem("brokerCount", brokerCount); }, [brokerCount]);
    useEffect(() => { localStorage.setItem("selectedBrokers", JSON.stringify(selectedBrokers)); }, [selectedBrokers]);
    useEffect(() => { localStorage.setItem("stockCount", stockCount); }, [stockCount]);
    useEffect(() => { localStorage.setItem("tradingParameters", JSON.stringify(tradingParameters)); }, [tradingParameters]);
    useEffect(() => { localStorage.setItem("tradingStatus", JSON.stringify(tradingStatus)); }, [tradingStatus]);
    useEffect(() => { localStorage.setItem("tradeLogs", JSON.stringify(tradeLogs)); }, [tradeLogs]);

    // Real-time log streaming
    useEffect(() => {
        let eventSource;
        try {
            eventSource = new EventSource(`${API_BASE}/stream-logs`);
            eventSource.onmessage = (event) => {
                if (event.data) setTradeLogs(prev => [...prev, event.data]);
            };
            eventSource.onerror = () => { if (eventSource) eventSource.close(); };
        } catch (err) {
            console.error("EventSource failed:", err);
        }
        return () => { if (eventSource) eventSource.close(); };
    }, []);

    // Logout
    const handleLogout = () => {
        localStorage.clear();
        setUser(null);
        setActiveTab('connect');
        setBrokerCount(1);
        setSelectedBrokers([{ name: 'u', credentials: {}, profileData: null }]);
        setStockCount(1);
        setTradingParameters({});
        setTradingStatus({});
        setTradeLogs([]);
    };

    // --- API CALL HANDLERS (Migrated from old App.jsx) ---

    // Connect Broker
    const handleConnectBroker = async (e) => {
        e.preventDefault();
        setTradeLogs([]);
        try {
            const res = await fetch(`${API_BASE}/connect-broker`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ brokers: selectedBrokers })
            });
            const data = await res.json();
            setSelectedBrokers(prev => prev.map(broker => {
                const fetchedData = data.find(item => item.broker_key === broker.name);
                if (fetchedData && fetchedData.status === 'success')
                    return { ...broker, profileData: fetchedData.profileData };
                return { ...broker, profileData: { status: 'failed', message: fetchedData?.message || 'Connection failed.' } };
            }));
        } catch (err) {
            console.error(err);
            setTradeLogs(prev => [...prev, '❌ Error connecting to broker.']);
        }
    };

    // Fetch lot size
    const fetchLotSize = async (index, symbol_key, symbol_value, type) => {
        try {
            const response = await fetch(`${API_BASE}/get-lot-size`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ symbol_key, symbol_value, type })
            });
            const data = await response.json();
            if (data.lot_size) {
                const fetchedLotSize = data.lot_size;
                const key = `stock_${index}`;
                const currentLots = tradingParameters[key]?.lots || 0;
                const newTotalShares = currentLots * fetchedLotSize;
                setTradingParameters(prev => ({
                    ...prev,
                    [key]: { ...prev[key], lot_size: fetchedLotSize, total_shares: newTotalShares }
                }));
            }
        } catch (err) {
            console.error("Error fetching lot size:", err);
        }
    };

    // Trade toggle (start/stop individual)
    const handleTradeToggle = async (index) => {
        const key = `stock_${index}`;
        const currentStatus = tradingStatus[key];
        const symbol = tradingParameters[key].symbol_value;

        if (currentStatus === 'active') {
            try {
                const response = await fetch(`${API_BASE}/disconnect-stock`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ symbol_value: symbol })
                });
                const result = await response.json();
                setTradingStatus(prev => ({ ...prev, [key]: 'inactive' }));
                setTradeLogs(prev => [...prev, `🛑 ${result.message}`]);
            } catch (err) {
                console.error("Disconnect failed:", err);
                setTradeLogs(prev => [...prev, `❌ Error disconnecting ${symbol}`]);
            }
            return;
        }

        if (!tradingParameters[key].broker) {
            setTradeLogs(prev => [...prev, `❌ Please select a broker for ${symbol}.`]);
            return;
        }

        setTradingStatus(prev => ({ ...prev, [key]: 'active' }));
        setTradeLogs(prev => [...prev, `🟢 Initiating trade for ${symbol}...`]);
        setActiveTab('results');
    };

    // Start all trades
    const handleStartAllTrades = async () => {
        setActiveTab('results');
        let allParams = [];
        for (let i = 0; i < stockCount; i++) {
            const key = `stock_${i}`;
            const params = tradingParameters[key];
            if (params?.broker) allParams.push(params);
            else setTradeLogs(prev => [...prev, `❌ Please select a broker for Stock ${i + 1}.`]);
        }
        if (!allParams.length) {
            setTradeLogs(prev => [...prev, "⚠️ No valid stock parameters to start trades."]);
            return;
        }
        try {
            setTradeLogs(prev => [...prev, "🟢 Starting all trades..."]);
            const res = await fetch(`${API_BASE}/start-all-trading`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tradingParameters: allParams, selectedBrokers })
            });
            const data = await res.json();
            setTradeLogs(prev => [...prev, ...data.logs]);
            let newStatus = {};
            allParams.forEach((_, i) => { newStatus[`stock_${i}`] = 'active'; });
            setTradingStatus(prev => ({ ...prev, ...newStatus }));
        } catch (err) {
            console.error(err);
            setTradeLogs(prev => [...prev, `❌ Error starting trades: ${err.message}`]);
        }
    };

    // Close position
    const handleClosePosition = async (index) => {
        const key = `stock_${index}`;
        const symbol = tradingParameters[key]?.symbol_value;
        try {
            const response = await fetch(`${API_BASE}/close-position`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ symbol_value: symbol })
            });
            const result = await response.json();
            setTradeLogs(prev => [...prev, `🔵 ${result.message}`]);
        } catch (err) {
            console.error(err);
            setTradeLogs(prev => [...prev, `❌ Error closing position for ${symbol}`]);
        }
    };

    // Close all positions
    const handleCloseAllPositions = async () => {
        try {
            const response = await fetch(`${API_BASE}/close-all-positions`, {
                method: "POST",
                headers: { "Content-Type": "application/json" }
            });
            const result = await response.json();
            setTradeLogs(prev => [...prev, `🔵 ${result.message}`]);
        } catch (err) {
            console.error(err);
            setTradeLogs(prev => [...prev, "❌ Error closing all positions"]);
        }
    };

    // Clear logs
    const handleClearLogs = () => setTradeLogs([]);

    // --- Render Tabs ---
    const renderContent = () => {
        switch (activeTab) {
            case 'connect':
                return (
                    <ConnectBroker
                        brokerCount={brokerCount}
                        selectedBrokers={selectedBrokers}
                        onBrokerCountChange={(e) => {
                            const newCount = parseInt(e.target.value, 10);
                            if (newCount >= 1 && newCount <= 5) {
                                setBrokerCount(newCount);
                                setSelectedBrokers(prev => {
                                    const newBrokers = prev.slice(0, newCount);
                                    while (newBrokers.length < newCount)
                                        newBrokers.push({ name: 'u', credentials: {}, profileData: null });
                                    return newBrokers;
                                });
                            }
                        }}
                        onBrokerChange={(e, index) => {
                            const newSelected = [...selectedBrokers];
                            newSelected[index] = { ...newSelected[index], name: e.target.value, profileData: null };
                            setSelectedBrokers(newSelected);
                        }}
                        onCredentialChange={(e, index, credName) => {
                            const newSelected = [...selectedBrokers];
                            newSelected[index].credentials[credName] = e.target.value;
                            setSelectedBrokers(newSelected);
                        }}
                        onConnect={handleConnectBroker}
                    />
                );
            case 'select':
                return (
                    <SelectStock
                        stockCount={stockCount}
                        tradingParameters={tradingParameters}
                        selectedBrokers={selectedBrokers}
                        tradingStatus={tradingStatus}
                        onStockCountChange={(e) => {
                            const newCount = parseInt(e.target.value, 10);
                            if (newCount >= 1 && newCount <= 10) {
                                setStockCount(newCount);
                                const newParams = {};
                                const newStatus = {};
                                for (let i = 0; i < newCount; i++) {
                                    const key = `stock_${i}`;
                                    newParams[key] = tradingParameters[key] || {
                                        symbol_value: 'RELIANCE',
                                        symbol_key: '',
                                        broker: '',
                                        strategy: 'ADX_MACD_WillR_Supertrend',
                                        interval: 0,
                                        lots: 0,
                                        lot_size: 0,
                                        total_shares: 0,
                                        target_percentage: 0,
                                        type: 'EQUITY'
                                    };
                                    newStatus[key] = tradingStatus[key] || 'inactive';
                                }
                                setTradingParameters(newParams);
                                setTradingStatus(newStatus);
                            }
                        }}
                        onStockSelection={(index, symKey, symValue, type) => {
                            const key = `stock_${index}`;
                            setTradingParameters(prev => ({
                                ...prev,
                                [key]: { ...prev[key], symbol_key: symKey, symbol_value: symValue, type }
                            }));
                            fetchLotSize(index, symKey, symValue, type);
                        }}
                        onParameterChange={(e, index, param) => {
                            const key = `stock_${index}`;
                            const val = e.target.value;
                            setTradingParameters(prev => {
                                const updated = { ...prev, [key]: { ...prev[key], [param]: val } };
                                const lots = parseInt(updated[key].lots || 0, 10);
                                const lotSize = parseInt(updated[key].lot_size || 0, 10);
                                updated[key].total_shares = (lots > 0 && lotSize > 0) ? lots * lotSize : 0;
                                return updated;
                            });
                        }}
                        onTradeToggle={handleTradeToggle}
                        onStartAllTrades={handleStartAllTrades}
                        onClosePosition={handleClosePosition}
                        onCloseAllPositions={handleCloseAllPositions}
                    />
                );
            case 'results':
                return <TradeResults tradeLogs={tradeLogs} onClearLogs={handleClearLogs} />;
            default:
                return <div>Please select a tab.</div>;
        }
    };

    return (
        <div className="trading-app-container">
            <header className="trading-header">
                {user && <button className="logout-btn" onClick={handleLogout}>Logout</button>}
            </header>
            <div className="trading-main">
                <div className="tab-buttons">
                    <button onClick={() => setActiveTab('connect')} className={activeTab === 'connect' ? 'active' : ''}>Connect Broker</button>
                    <button onClick={() => setActiveTab('select')} className={activeTab === 'select' ? 'active' : ''}>Select Stock</button>
                    <button onClick={() => setActiveTab('results')} className={activeTab === 'results' ? 'active' : ''}>Trade Results</button>
                </div>
                <div className="trading-content">{renderContent()}</div>
            </div>
        </div>
    );
}

export default TradingApp;
