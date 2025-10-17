import { useState, useEffect } from 'react';
import ConnectBroker from '../components/ConnectBroker';
import SelectStock from '../components/SelectStock';
import TradeResults from '../components/TradeResults';
import { API_BASE } from "../api"; // ✅ use API_BASE for backend URL
import '../TradingApp.css';

function TradingApp({ user, setUser }) {
    // Persist activeTab
    const [activeTab, setActiveTab] = useState(() => localStorage.getItem("activeTab") || 'connect');

    // ConnectBroker state
    const [brokerCount, setBrokerCount] = useState(() => parseInt(localStorage.getItem("brokerCount")) || 1);
    const [selectedBrokers, setSelectedBrokers] = useState(() => {
        const saved = localStorage.getItem("selectedBrokers");
        return saved ? JSON.parse(saved) : [{ name: 'u', credentials: {}, profileData: null }];
    });

    // SelectStock state
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

    // Persist state to localStorage
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

    // Render Trading Tabs
    const renderContent = () => {
        switch (activeTab) {
            case 'connect':
                return (
                    <ConnectBroker 
                        brokerCount={brokerCount}
                        selectedBrokers={selectedBrokers}
                        onBrokerCountChange={(e) => {
                            const newCount = parseInt(e.target.value, 10);
                            if(newCount >=1 && newCount <=5){
                                setBrokerCount(newCount);
                                setSelectedBrokers(prev => {
                                    const newBrokers = prev.slice(0,newCount);
                                    while(newBrokers.length<newCount){
                                        newBrokers.push({ name: 'u', credentials:{}, profileData:null });
                                    }
                                    return newBrokers;
                                });
                            }
                        }}
                        onBrokerChange={(e, index)=>{
                            const newSelectedBrokers = [...selectedBrokers];
                            newSelectedBrokers[index] = { ...newSelectedBrokers[index], name: e.target.value, profileData: null };
                            setSelectedBrokers(newSelectedBrokers);
                        }}
                        onCredentialChange={(e,index,credName)=>{
                            const newSelectedBrokers = [...selectedBrokers];
                            newSelectedBrokers[index].credentials[credName] = e.target.value;
                            setSelectedBrokers(newSelectedBrokers);
                        }}
                        onConnect={async (e)=>{
                            e.preventDefault();
                            setTradeLogs([]);
                            try{
                                const res = await fetch(`${API_BASE}/connect-broker`, {
                                    method:'POST',
                                    headers:{ 'Content-Type':'application/json'},
                                    body: JSON.stringify({ brokers:selectedBrokers })
                                });
                                const data = await res.json();
                                setSelectedBrokers(prev => prev.map(broker => {
                                    const fetchedData = data.find(item => item.broker_key===broker.name);
                                    if(fetchedData && fetchedData.status==='success') return { ...broker, profileData:fetchedData.profileData };
                                    return { ...broker, profileData: { status:'failed', message:fetchedData?.message || 'Connection failed.' }};
                                }));
                            } catch(err){
                                console.error(err);
                                setTradeLogs(prev => [...prev, '❌ Error connecting broker.']);
                            }
                        }}
                    />
                );
            case 'select':
                return (
                    <SelectStock 
                        stockCount={stockCount}
                        tradingParameters={tradingParameters}
                        selectedBrokers={selectedBrokers}
                        tradingStatus={tradingStatus}
                        onStockCountChange={(e)=>{
                            const newCount = parseInt(e.target.value,10);
                            if(newCount>=1 && newCount<=10){
                                setStockCount(newCount);
                                const newParams={};
                                const newStatus={};
                                for(let i=0;i<newCount;i++){
                                    const key = `stock_${i}`;
                                    newParams[key] = tradingParameters[key] || { symbol_value:'RELIANCE', symbol_key:'', broker:'', strategy:'ADX_MACD_WillR_Supertrend', interval:0, lots:0, lot_size:0, total_shares:0, target_percentage:0, type:'EQUITY' };
                                    newStatus[key] = tradingStatus[key] || 'inactive';
                                }
                                setTradingParameters(newParams);
                                setTradingStatus(newStatus);
                            }
                        }}
                        onParameterChange={(e,index,param)=>{
                            const key = `stock_${index}`;
                            const val = e.target.value;
                            setTradingParameters(prev=>{
                                const updated = { ...prev, [key]:{ ...prev[key], [param]:val }};
                                const lots = parseInt(updated[key].lots || 0,10);
                                const lotSize = parseInt(updated[key].lot_size || 0,10);
                                updated[key].total_shares = (lots>0 && lotSize>0)? lots*lotSize:0;
                                return updated;
                            });
                        }}
                        onStockSelection={(index,symKey,symValue,type)=>{
                            const key = `stock_${index}`;
                            setTradingParameters(prev=>({ ...prev, [key]:{ ...prev[key], symbol_key:symKey, symbol_value:symValue, type }}));
                        }}
                        onTradeToggle={(index)=>{
                            const key = `stock_${index}`;
                            const status = tradingStatus[key];
                            setTradingStatus(prev => ({ ...prev, [key]: status==='active'?'inactive':'active' }));
                        }}
                        onStartAllTrades={()=>{ setActiveTab('results'); }}
                        onClosePosition={()=>{}}
                        onCloseAllPositions={()=>{}}
                    />
                );
            case 'results':
                return <TradeResults tradeLogs={tradeLogs} onClearLogs={()=>setTradeLogs([])} />;
            default:
                return <div>Please select a tab</div>;
        }
    };

    return (
        <div className="trading-app-container">
            <header className="trading-header">
                {user && (
                    <button className="logout-btn" onClick={handleLogout}>Logout</button>
                )}
            </header>

            <div className="trading-main">
                <div className="tab-buttons">
                    <button onClick={()=>setActiveTab('connect')} className={activeTab==='connect'?'active':''}>Connect Broker</button>
                    <button onClick={()=>setActiveTab('select')} className={activeTab==='select'?'active':''}>Select Stock</button>
                    <button onClick={()=>setActiveTab('results')} className={activeTab==='results'?'active':''}>Trade Results</button>
                </div>

                <div className="trading-content">
                    {renderContent()}
                </div>
            </div>
        </div>
    );
}

export default TradingApp;
