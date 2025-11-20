import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onValue, set } from 'firebase/database';
import { 
  Wifi, Droplet, Wind, Activity, Server, Zap, 
  ShieldAlert, Menu, X, Radio, Cpu, Crosshair, 
  ChevronRight, Disc, Home, Settings, List, Info,
  Terminal, PlayCircle, Database, ArrowUpRight,
  ShieldCheck, Clock, AlertTriangle, CheckCircle,
  WifiOff, User, Bot, Users, Phone, Mail
} from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler,
  BarElement
} from 'chart.js';
import { Line } from 'react-chartjs-2';

// --- 1. CONFIGURATION ---
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Filler, BarElement);

const MAX_FOOD_CAPACITY_G = 1000; 
const MAX_WATER_CAPACITY_ML = 1000; 
const LOW_LEVEL_THRESHOLD = 20; // Percentage

// --- FIREBASE CONFIGURATION (User Provided) ---
const firebaseConfig = {
  apiKey: "AIzaSyAAmoUAtkf3jBSSQDsALHXhTF3nsWleR2c",
  authDomain: "birds-buddy.firebaseapp.com",
  // I added this line manually. If it fails, check the URL in your Firebase Console -> Realtime Database tab.
  databaseURL: "https://birds-buddy-default-rtdb.firebaseio.com",
  projectId: "birds-buddy",
  storageBucket: "birds-buddy.firebasestorage.app",
  messagingSenderId: "1038628654968",
  appId: "1:1038628654968:web:539441e3eb267b21d6c28d",
  measurementId: "G-JRDJT37T12"
};

let app, db;
try {
  app = initializeApp(firebaseConfig);
  db = getDatabase(app);
} catch (e) {
  console.error("Firebase Initialization Error:", e);
}

// --- 2. UTILS ---
const getISTTime = () => new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour12: false });
const getISTDate = () => new Date().toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'short', day: 'numeric', month: 'short' });

// --- 3. SUB-COMPONENTS ---

const Toast = ({ message, type, onClose }) => (
  <div className={`fixed top-24 right-6 z-50 flex items-center gap-4 px-6 py-4 rounded-xl border backdrop-blur-xl shadow-[0_0_50px_rgba(0,0,0,0.5)] transition-all duration-500 animate-in slide-in-from-right-full 
    ${type === 'success' ? 'bg-green-900/20 border-green-500/30 text-green-400' : 
      type === 'error' ? 'bg-red-900/20 border-red-500/30 text-red-400' : 
      'bg-blue-900/20 border-blue-500/30 text-blue-400'}`}>
    <div className={`p-2 rounded-full ${type === 'success' ? 'bg-green-500/20' : type === 'error' ? 'bg-red-500/20' : 'bg-blue-500/20'}`}>
      {type === 'success' ? <CheckCircle className="w-5 h-5" /> : type === 'error' ? <AlertTriangle className="w-5 h-5" /> : <Info className="w-5 h-5" />}
    </div>
    <div className="flex flex-col">
      <span className="text-[10px] font-bold tracking-widest uppercase opacity-70">
        {type === 'success' ? 'SYSTEM SUCCESS' : type === 'error' ? 'SYSTEM ALERT' : 'SYSTEM INFO'}
      </span>
      <span className="font-mono text-xs font-bold tracking-wide uppercase">{message}</span>
    </div>
    <button onClick={onClose} className="ml-4 hover:text-white transition-colors"><X className="w-4 h-4" /></button>
  </div>
);

const GlassCard = ({ children, className = "", title, icon: Icon, statusColor, accentColor = "blue" }) => (
  <div className={`relative overflow-hidden bg-[#0b0c10]/60 backdrop-blur-md border border-white/5 rounded-2xl p-6 transition-all duration-500 
    hover:border-${accentColor}-500/30 hover:bg-[#0b0c10]/80 hover:shadow-[0_0_30px_-10px_rgba(59,130,246,0.15)] group ${className}`}>
    
    {/* Tech Corner Accents */}
    <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-white/10 transition-colors group-hover:border-blue-500/50" />
    <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-white/10 transition-colors group-hover:border-blue-500/50" />
    
    {title && (
      <div className="flex items-center justify-between mb-6 border-b border-white/5 pb-2">
        <div className="flex items-center gap-3">
          {Icon && <Icon className={`w-4 h-4 ${statusColor || `text-${accentColor}-400`}`} />}
          <h3 className="text-[10px] font-bold tracking-[0.2em] text-slate-400 uppercase font-mono">{title}</h3>
        </div>
        {statusColor && <div className={`w-1.5 h-1.5 rounded-full ${statusColor.replace('text-', 'bg-')} animate-pulse shadow-[0_0_8px_currentColor]`} />}
      </div>
    )}
    <div className="relative z-10">{children}</div>
  </div>
);

const StatValue = ({ value, unit, label, alert, subValue }) => (
  <div className="flex flex-col">
    <div className="flex items-end gap-1">
      <span className={`text-4xl md:text-5xl font-bold tracking-tighter leading-none ${alert ? 'text-red-500 drop-shadow-[0_0_15px_rgba(239,68,68,0.4)]' : 'text-white'}`}>
        {value}
      </span>
      <span className="text-sm text-slate-500 font-mono mb-1">{unit}</span>
    </div>
    <div className="flex justify-between items-end mt-2">
      <span className={`text-[9px] uppercase tracking-widest font-mono ${alert ? 'text-red-400' : 'text-slate-600'}`}>
        {label}
      </span>
      {subValue && <span className="text-xs font-mono text-blue-400">{subValue}</span>}
    </div>
  </div>
);

const NavItem = ({ label, active, onClick }) => (
  <button 
    onClick={onClick}
    className={`relative px-5 py-2 text-xs font-bold tracking-widest uppercase font-mono transition-all duration-300 rounded-lg
    ${active 
      ? 'text-white bg-white/5 backdrop-blur-md border border-white/10 shadow-lg' 
      : 'text-slate-500 hover:text-white hover:bg-white/5'}`}
  >
    {label}
  </button>
);

const ActionButton = ({ label, onClick, processing, icon: Icon, variant = "primary" }) => (
  <button 
    onClick={onClick}
    disabled={processing}
    className={`relative w-full py-6 rounded-xl overflow-hidden group transition-all duration-300
      ${variant === 'danger' ? 'bg-red-500/10 hover:bg-red-500/20 border border-red-500/20' : 'bg-white/5 hover:bg-white/10 border border-white/5'}
    `}
  >
    <div className="relative z-10 flex flex-col items-center justify-center gap-2">
      {processing ? (
        <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin text-slate-400" />
      ) : (
        <>
          <Icon className={`w-6 h-6 ${variant === 'danger' ? 'text-red-400' : 'text-blue-400'}`} />
          <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-slate-300">{label}</span>
        </>
      )}
    </div>
  </button>
);

const Footer = () => (
  <footer className="w-full border-t border-white/5 bg-[#080808] py-12 mt-12 relative z-10">
    <div className="max-w-7xl mx-auto px-6 flex flex-col items-center justify-center gap-6">
      <div className="flex items-center gap-3 opacity-80 hover:opacity-100 transition-opacity">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-slate-800 to-black border border-white/10 flex items-center justify-center shadow-lg">
           <Radio className="w-4 h-4 text-white" />
        </div>
        <span className="text-lg font-bold tracking-widest font-sans text-white">
          BIRDS<span className="text-slate-500">BUDDY</span>
        </span>
      </div>
      
      <div className="flex gap-6 text-[10px] font-mono uppercase tracking-widest text-slate-500">
        <span className="hover:text-blue-400 cursor-pointer transition-colors">Privacy Protocol</span>
        <span className="hover:text-blue-400 cursor-pointer transition-colors">System Status</span>
        <span className="hover:text-blue-400 cursor-pointer transition-colors">Contact Command</span>
      </div>

      <div className="text-[10px] text-slate-600 font-mono uppercase tracking-[0.2em] text-center space-y-2">
        <p>© 2025 Birds Buddy Systems. All Rights Reserved.</p>
        <p className="opacity-50">Advanced Bio-Monitoring & Automated System </p>
      </div>
    </div>
  </footer>
);

// --- 4. VIEWS ---

const HeroView = ({ setView }) => (
  <div className="flex flex-col items-center justify-center min-h-[80vh] text-center animate-in fade-in slide-in-from-bottom-4 duration-1000">
    <div className="relative mb-8">
      <div className="absolute -inset-8 bg-slate-500/10 rounded-full blur-[60px] animate-pulse" />
      <div className="relative w-32 h-32 rounded-full border border-white/10 bg-black/50 flex items-center justify-center backdrop-blur-sm">
        <Radio className="w-12 h-12 text-slate-300" />
      </div>
    </div>
    <h1 className="text-7xl md:text-9xl font-bold tracking-tighter text-white mb-6" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
      BIRDS<span className="text-slate-400">BUDDY</span>
    </h1>
    <p className="text-slate-400 font-mono text-sm tracking-[0.3em] uppercase mb-12 max-w-md">
      Advanced Bio-Monitoring & Automata System
    </p>
    <button 
      onClick={() => setView('dashboard')}
      className="group relative px-8 py-4 bg-white text-black rounded-full font-bold tracking-widest uppercase hover:bg-blue-400 transition-colors duration-300"
    >
      <div className="flex items-center gap-2">
        <span>Launch Console</span>
        <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
      </div>
      <div className="absolute inset-0 rounded-full border-2 border-white/50 scale-110 opacity-0 group-hover:scale-125 group-hover:opacity-100 transition-all duration-500" />
    </button>
  </div>
);

const DashboardView = ({ data, isCritical }) => {
  const foodPct = parseFloat(data.food_reservoir_pct || 0).toFixed(2);
  const waterPct = parseFloat(data.water_reservoir_pct || 0).toFixed(2);
  
  const foodGrams = Math.round((foodPct / 100) * MAX_FOOD_CAPACITY_G);
  const waterMl = Math.round((waterPct / 100) * MAX_WATER_CAPACITY_ML);
  
  const foodBowlStatus = data.food_weight_g > 10 ? "FILLED" : "EMPTY";
  const waterBowlStatus = data.water_bowl_wet ? "FILLED" : "EMPTY";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {isCritical && (
        <div className="lg:col-span-12 bg-red-600/10 border border-red-500/30 rounded-2xl p-6 flex items-center gap-6 animate-pulse">
          <ShieldAlert className="w-8 h-8 text-red-500" />
          <div>
            <h2 className="text-xl font-bold text-white tracking-widest uppercase">System Alert Active</h2>
            <p className="text-red-400 font-mono uppercase tracking-wider text-xs mt-1">
              {data.mq_gas_detected ? "Hazardous Atmosphere Detected" : 
               data.pir_motion_detected ? "Perimeter Breach" : "System Check Required"}
            </p>
          </div>
        </div>
      )}

      <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-6">
        <GlassCard title="FOOD BOWL STATUS" icon={Disc} statusColor={foodBowlStatus === "FILLED" ? "text-green-400" : "text-red-500"}>
          <StatValue value={foodBowlStatus} unit="" label="Load Cell Sensor" alert={foodBowlStatus === "EMPTY"}/>
          <div className="mt-4 h-1 w-full bg-white/5 rounded-full overflow-hidden">
             <div className={`h-full transition-all duration-500 ${foodBowlStatus === "FILLED" ? 'bg-green-500 w-full' : 'bg-red-500 w-[5%]'}`} />
          </div>
        </GlassCard>

        <GlassCard title="WATER BOWL STATUS" icon={Droplet} statusColor={waterBowlStatus === "FILLED" ? "text-blue-400" : "text-red-500"}>
          <StatValue value={waterBowlStatus} unit="" label="XKC Liquid Sensor" alert={waterBowlStatus === "EMPTY"}/>
          <div className="mt-4 h-1 w-full bg-white/5 rounded-full overflow-hidden">
             <div className={`h-full transition-all duration-500 ${waterBowlStatus === "FILLED" ? 'bg-blue-500 w-full' : 'bg-red-500 w-[5%]'}`} />
          </div>
        </GlassCard>

        <GlassCard title="RESERVED FOOD" icon={Database} statusColor={foodPct > LOW_LEVEL_THRESHOLD ? "text-yellow-400" : "text-red-500"}>
           <StatValue value={foodPct} unit="%" label="Storage Capacity" subValue={`${foodGrams}g / ${MAX_FOOD_CAPACITY_G}g`}/>
           <div className="mt-4 h-2 w-full bg-white/5 rounded-full overflow-hidden">
             <div className={`h-full transition-all duration-1000 ${foodPct > LOW_LEVEL_THRESHOLD ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${foodPct}%` }} />
           </div>
        </GlassCard>

        <GlassCard title="RESERVED WATER" icon={Droplet} statusColor={waterPct > LOW_LEVEL_THRESHOLD ? "text-blue-400" : "text-red-500"}>
           <StatValue value={waterPct} unit="%" label="Storage Capacity" subValue={`${waterMl}ml / ${MAX_WATER_CAPACITY_ML}ml`}/>
           <div className="mt-4 h-2 w-full bg-white/5 rounded-full overflow-hidden">
             <div className={`h-full transition-all duration-1000 ${waterPct > LOW_LEVEL_THRESHOLD ? 'bg-blue-500' : 'bg-red-500'}`} style={{ width: `${waterPct}%` }} />
           </div>
        </GlassCard>
      </div>

      <div className="lg:col-span-4 space-y-6">
        <GlassCard title="ENVIRONMENTAL" icon={Wind} statusColor={data.mq_gas_detected ? "text-red-500" : "text-green-500"}>
           <div className="space-y-4">
             <div className={`flex items-center justify-between p-3 rounded-lg border transition-all ${data.mq_gas_detected ? 'bg-red-500/10 border-red-500/30' : 'bg-white/5 border-transparent'}`}>
                <div className="flex items-center gap-3">
                   {data.mq_gas_detected ? <AlertTriangle className="w-4 h-4 text-red-500 animate-spin" /> : <Wind className="w-4 h-4 text-slate-400" />}
                   <span className="text-[10px] font-mono text-slate-300 uppercase tracking-wider">Air Quality</span>
                </div>
                <span className={`text-[10px] font-bold px-2 py-1 rounded ${data.mq_gas_detected ? 'bg-red-500/20 text-red-400' : 'bg-green-500/10 text-green-400'}`}>
                   {data.mq_gas_detected ? 'DANGER' : 'OPTIMAL'}
                </span>
             </div>
             <div className={`flex items-center justify-between p-3 rounded-lg border transition-all ${data.pir_motion_detected ? 'bg-yellow-500/10 border-yellow-500/30' : 'bg-white/5 border-transparent'}`}>
                <div className="flex items-center gap-3">
                   <ShieldCheck className={`w-4 h-4 ${data.pir_motion_detected ? 'text-yellow-500 animate-pulse' : 'text-slate-400'}`} />
                   <span className="text-[10px] font-mono text-slate-300 uppercase tracking-wider">Perimeter</span>
                </div>
                <span className={`text-[10px] font-bold px-2 py-1 rounded ${data.pir_motion_detected ? 'bg-yellow-500/20 text-yellow-400' : 'bg-blue-500/10 text-blue-400'}`}>
                   {data.pir_motion_detected ? 'MOTION' : 'SECURE'}
                </span>
             </div>
           </div>
        </GlassCard>

        <GlassCard title="DIAGNOSTICS" icon={Activity}>
          <div className="space-y-4">
             <div className="flex justify-between items-center border-b border-white/5 pb-2">
                <span className="text-[10px] text-slate-500 font-mono uppercase">Uplink</span>
                <span className="text-[10px] text-green-400 font-bold">ESTABLISHED</span>
             </div>
             <div className="flex justify-between items-center border-b border-white/5 pb-2">
                <span className="text-[10px] text-slate-500 font-mono uppercase">Pump State</span>
                <span className={`text-[10px] font-bold ${data.pump_active ? 'text-yellow-400 animate-pulse' : 'text-slate-400'}`}>{data.pump_active ? 'ACTIVE' : 'STANDBY'}</span>
             </div>
          </div>
       </GlassCard>
      </div>
    </div>
  );
};

const ControlsView = ({ sendCommand, processing, data }) => (
  <div className="max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
    <GlassCard title="MANUAL OVERRIDE CONTROLS" icon={Zap} className="mb-6">
      <p className="text-xs text-slate-500 font-mono mb-8">
        WARNING: Manual overrides bypass automated sensor logic. Ensure visual confirmation before engaging actuators.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ActionButton 
           label="Deploy Ration" 
           icon={Disc} 
           onClick={() => sendCommand('feed_now')} 
           processing={processing.feed} 
        />
        <ActionButton 
           label="Engage Pump" 
           icon={Zap} 
           onClick={() => sendCommand('refill_now')} 
           processing={processing.refill} 
           variant={data.water_bowl_wet ? 'primary' : 'danger'}
        />
      </div>
    </GlassCard>
  </div>
);

const AnalyticsView = ({ chartData, chartOptions }) => (
  <div className="h-full animate-in fade-in slide-in-from-bottom-4 duration-700">
    <GlassCard title="FOOD STORAGE HISTORY (24H)" icon={Activity} className="h-[70vh]">
      <div className="h-full w-full pb-8">
        <Line data={chartData} options={{...chartOptions, maintainAspectRatio: false}} />
      </div>
    </GlassCard>
  </div>
);

const ActivityView = ({ logs }) => (
  <div className="max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
    <GlassCard title="SYSTEM EVENT LOG" icon={Terminal} className="font-mono text-xs">
      <div className="space-y-2 text-slate-400 h-[60vh] overflow-y-auto pr-4 custom-scrollbar">
         {logs.length === 0 && <div className="text-center text-slate-600 mt-10">NO ACTIVITY RECORDED</div>}
         {logs.map((log) => (
             <div key={log.id} className="flex items-start gap-4 border-b border-white/5 pb-2 hover:bg-white/5 p-2 rounded transition-colors">
                 <span className="text-slate-600 min-w-[120px]">{log.time}</span>
                 <div className="flex-1">
                   {log.badge && (
                     <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded mr-2 uppercase ${
                       log.badge === 'MANUAL' ? 'bg-purple-500/20 text-purple-400' : 'bg-slate-500/20 text-slate-400'
                     }`}>
                       {log.badge}
                     </span>
                   )}
                   <span className={
                     log.type === 'danger' ? 'text-red-400' : 
                     log.type === 'warning' ? 'text-yellow-400' : 
                     log.type === 'success' ? 'text-green-400' : 
                     'text-slate-300'
                   }>
                       {log.message}
                   </span>
                 </div>
             </div>
         ))}
      </div>
    </GlassCard>
  </div>
);

const AboutView = () => {
  const teamMembers = [
    { name: "Bhanupriya L", contact: "8431838832", email: "bhanupriyapriya14@gmail.com" },
    { name: "Chaitanya MD", contact: "8088918746", email: "chaithanyamdgowda@gmail.com" },
    { name: "Deekshitha", contact: "9019765221", email: "deekshas162720@gmail.com" },
    { name: "Meghana CP", contact: "8867306119", email: "gowdameghana972@gmail.com" }
  ];

  return (
    <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="space-y-6">
        <GlassCard title="PROJECT SPECIFICATIONS" icon={Info}>
          <div className="space-y-8">
            <div>
              <Radio className="w-4 h-4 text-white" />
               <h1 className="text-3xl font-bold text-white mb-2 font-sans">Birds<span className="font-bold text-slate-500">Buddy</span></h1>
               <p className="text-slate-400 text-sm leading-relaxed">
                 A fully autonomous, IoT-enabled avian life support system designed for urban environments.
               </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
               <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                  <h4 className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-2">Core Logic</h4>
                  <p className="text-slate-300 text-sm font-mono">Raspberry Pi 4</p>
               </div>
               <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                  <h4 className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-2">Telemetry</h4>
                  <p className="text-slate-300 text-sm font-mono">Firebase Realtime DB</p>
               </div>
            </div>
          </div>
        </GlassCard>

        <GlassCard title="MISSION CREW" icon={Users}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {teamMembers.map((member, i) => (
              <div key={i} className="p-4 bg-white/5 rounded-lg border border-white/5 hover:border-blue-500/30 transition-colors">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400">
                    <User className="w-4 h-4" />
                  </div>
                  <h4 className="font-bold text-white tracking-wide">{member.name}</h4>
                </div>
                <div className="space-y-2 pl-11">
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <Phone className="w-3 h-3 text-slate-500" />
                    <span className="font-mono">{member.contact}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <Mail className="w-3 h-3 text-slate-500" />
                    <span className="font-mono">{member.email}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>
    </div>
  );
};

// --- 5. MAIN APP COMPONENT ---

export default function App() {
  const [currentView, setCurrentView] = useState('hero');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [data, setData] = useState({
    food_weight_g: 0,
    water_bowl_wet: true,
    mq_gas_detected: false,
    pir_motion_detected: false,
    pump_active: false,
    food_reservoir_pct: 100, 
    water_reservoir_pct: 100, 
    timestamp: getISTTime()
  });
  
  const [simulationMode, setSimulationMode] = useState(true);
  const [processing, setProcessing] = useState({ feed: false, refill: false });
  const [toast, setToast] = useState(null);
  const [logs, setLogs] = useState([]);
  const [isConnected, setIsConnected] = useState(false);

  const prevData = useRef(data);
  const manualOverride = useRef(null);

  const isCritical = data.mq_gas_detected || data.pir_motion_detected || !data.water_bowl_wet;

  const addLog = (message, type = 'info', badge = null) => {
    const newLog = {
      id: Date.now(),
      time: getISTDate() + ' ' + getISTTime(),
      message,
      type,
      badge
    };
    setLogs(prev => [newLog, ...prev].slice(0, 50)); 
  };

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    if (db) {
      const connectedRef = ref(db, '.info/connected');
      onValue(connectedRef, (snap) => {
        if (snap.val() === true) {
          if (!isConnected) addLog("Telemetry uplink established", "success");
          setIsConnected(true);
        } else {
          if (isConnected) addLog("Telemetry uplink lost", "error");
          setIsConnected(false);
        }
      });

      const sensorRef = ref(db, 'sensors');
      return onValue(sensorRef, (snapshot) => {
        const val = snapshot.val();
        if (val) {
          setSimulationMode(false); 
          setData(val);
        }
      });
    } else {
      addLog("System initializing in simulation mode", "info");
    }
  }, []);

  useEffect(() => {
    const curr = data;
    const prev = prevData.current;
    
    if (curr.pump_active && !prev.pump_active) {
      const isManual = manualOverride.current === 'refill';
      addLog("Water Pump Engaged", "info", isManual ? "MANUAL" : "AUTO");
      manualOverride.current = null; 
    }

    if (curr.mq_gas_detected && !prev.mq_gas_detected) {
      addLog("HAZARDOUS GAS DETECTED - SAFETY PROTOCOL ACTIVE", "danger");
      showToast("CRITICAL: GAS DETECTED", "error");
    } else if (!curr.mq_gas_detected && prev.mq_gas_detected) {
      addLog("Atmosphere normalized. Safety protocol disengaged.", "success");
    }

    if (curr.pir_motion_detected && !prev.pir_motion_detected) {
      addLog("Motion detected in secure perimeter", "warning");
      showToast("ALERT: MOTION DETECTED", "error");
    }

    if (curr.food_reservoir_pct < LOW_LEVEL_THRESHOLD && prev.food_reservoir_pct >= LOW_LEVEL_THRESHOLD) {
      addLog("Food reserves critical (<20%)", "warning");
    }
    if (curr.water_reservoir_pct < LOW_LEVEL_THRESHOLD && prev.water_reservoir_pct >= LOW_LEVEL_THRESHOLD) {
      addLog("Water reserves critical (<20%)", "warning");
    }

    prevData.current = curr;
  }, [data]);

  useEffect(() => {
    if (simulationMode) {
      const interval = setInterval(() => {
        setData(prev => {
          const newGas = Math.random() > 0.995;
          const newMotion = Math.random() > 0.98;
          const newPump = Math.random() > 0.95; 
          
          if (prev.pump_active && Math.random() > 0.8) return { ...prev, pump_active: false };
          
          return {
            ...prev,
            food_weight_g: Math.max(0, (prev.food_weight_g || 450) - 0.2),
            food_reservoir_pct: Math.max(0, (prev.food_reservoir_pct || 100) - 0.05),
            water_reservoir_pct: Math.max(0, (prev.water_reservoir_pct || 100) - 0.08),
            pir_motion_detected: newMotion,
            mq_gas_detected: newGas,
            pump_active: prev.pump_active || newPump,
            timestamp: getISTTime()
          };
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [simulationMode]);

  const sendCommand = (cmd) => {
    const key = cmd === 'feed_now' ? 'feed' : 'refill';
    const actionName = cmd === 'feed_now' ? 'RATION DEPLOYMENT' : 'PUMP ENGAGEMENT';
    setProcessing(p => ({ ...p, [key]: true }));
    
    manualOverride.current = key;

    if (!simulationMode && db) {
      set(ref(db, 'commands/' + cmd), true)
        .then(() => {
           showToast(`${actionName} INITIATED`, 'success');
           if (cmd === 'feed_now') addLog("Ration dispensed successfully", "success", "MANUAL");
        })
        .catch((err) => {
           showToast(`ERROR: ${actionName} FAILED`, 'error');
           addLog(`Command failed: ${err.message}`, "error");
        })
        .finally(() => {
           setTimeout(() => setProcessing(p => ({ ...p, [key]: false })), 2000);
        });
    } else {
      setTimeout(() => {
        setProcessing(p => ({ ...p, [key]: false }));
        if (cmd === 'refill_now') setData(d => ({ ...d, water_bowl_wet: true, pump_active: true }));
        if (cmd === 'feed_now') {
           setData(d => ({ ...d, food_weight_g: d.food_weight_g + 50 }));
           addLog("Ration dispensed successfully", "success", "MANUAL");
        }
        showToast(`SIMULATION: ${actionName} CONFIRMED`, 'success');
      }, 1500);
    }
  };

  const hours = Array.from({length: 24}, (_, i) => {
      const d = new Date();
      d.setHours(d.getHours() - (23 - i));
      return d.getHours() + ":00";
  });
  const historyData = Array.from({length: 24}, (_, i) => 100 - (i * 2) + Math.random() * 5);

  const chartData = {
    labels: hours,
    datasets: [{
      fill: true,
      label: 'Food Storage (%)',
      data: historyData,
      borderColor: '#60a5fa',
      backgroundColor: (context) => {
        const ctx = context.chart.ctx;
        const gradient = ctx.createLinearGradient(0, 0, 0, 300);
        gradient.addColorStop(0, 'rgba(96, 165, 250, 0.3)');
        gradient.addColorStop(1, 'rgba(96, 165, 250, 0)');
        return gradient;
      },
      tension: 0.4,
      pointRadius: 2,
      borderWidth: 2
    }]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { color: '#ffffff05' }, ticks: { color: '#64748b', maxTicksLimit: 8 } },
      y: { grid: { color: '#ffffff05' }, ticks: { color: '#64748b' } }
    },
    animation: { duration: 0 }
  };

  const handleNavClick = (view) => {
    setCurrentView(view);
    setIsMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-black text-slate-200 font-sans selection:bg-blue-500/30 overflow-x-hidden flex flex-col">
      
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#111,_#000)]" />
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 opacity-50 z-50" />
      </div>

      <nav className="h-20 border-b border-white/5 bg-black/80 backdrop-blur-xl flex items-center justify-between px-6 fixed top-0 w-full z-50">
        <div className="flex items-center gap-3 cursor-pointer group" onClick={() => setCurrentView('hero')}>
           <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-slate-800 to-black border border-white/10 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
              <Radio className="w-5 h-5 text-white" />
           </div>
           <h1 className="text-xl font-bold tracking-tighter text-white font-sans">
             BIRDS<span className="text-slate-500">BUDDY</span>
           </h1>
        </div>
        <div className="hidden md:flex items-center gap-2 p-1">
           {['Dashboard', 'Controls', 'Analytics', 'Activity', 'About'].map((item) => {
             const viewKey = item.toLowerCase();
             return <NavItem key={item} label={item} active={currentView === viewKey} onClick={() => setCurrentView(viewKey)} />
           })}
        </div>
        <div className="flex items-center gap-4">
           <div className="hidden md:block text-right">
              <div className="text-xs font-mono text-slate-300">{data.timestamp}</div>
              <div className="text-[9px] font-mono text-slate-600 uppercase tracking-widest">IST • {getISTDate()}</div>
           </div>
           <button onClick={() => setIsMenuOpen(true)} className="md:hidden p-2 text-slate-300 hover:text-white">
              <Menu className="w-6 h-6" />
           </button>
        </div>
      </nav>

      <div className={`fixed inset-0 z-50 bg-black/95 backdrop-blur-2xl transition-transform duration-500 flex flex-col justify-center items-center gap-6 ${isMenuOpen ? 'translate-y-0' : '-translate-y-full'}`}>
         <button onClick={() => setIsMenuOpen(false)} className="absolute top-6 right-6 p-2 bg-white/10 rounded-full">
            <X className="w-6 h-6" />
         </button>
         {['Dashboard', 'Controls', 'Analytics', 'Activity', 'About'].map((item) => (
            <button key={item} onClick={() => handleNavClick(item.toLowerCase())} className="text-2xl font-bold text-white tracking-widest uppercase hover:text-blue-500 transition-colors">
              {item}
            </button>
         ))}
      </div>

      <main className="relative z-10 flex-1 p-6 lg:p-12 max-w-[1600px] mx-auto w-full mt-20">
         {currentView === 'hero' && <HeroView setView={setCurrentView} />}
         {currentView === 'dashboard' && <DashboardView data={data} isCritical={isCritical} />}
         {currentView === 'controls' && <ControlsView sendCommand={sendCommand} processing={processing} data={data} />}
         {currentView === 'analytics' && <AnalyticsView chartData={chartData} chartOptions={chartOptions} />}
         {currentView === 'activity' && <ActivityView logs={logs} />}
         {currentView === 'about' && <AboutView />}
         <Footer />
      </main>
    </div>
  );
}
