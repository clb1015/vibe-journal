import React, { useState, useEffect, useMemo } from 'react';
import { 
  Book, Calendar as CalendarIcon, Image as ImageIcon, Inbox, Plus, Search, 
  Mic, ScanLine, Sparkles, Tag, Share2, Trash2, Maximize2, Palette, 
  Settings, User, Music, Guitar
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { 
  getFirestore, collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, setDoc 
} from 'firebase/firestore';

// ==========================================
// 🔴 PASTE YOUR FIREBASE KEYS BELOW 🔴
// ==========================================
const firebaseConfig = {
  apiKey: "AIzaSyBhobAdo9CEG1cM6vK2RB7RzM1HBdr6n3M",
  authDomain: "my-vibe-journal.firebaseapp.com",
  projectId: "my-vibe-journal",
  storageBucket: "my-vibe-journal.firebasestorage.app",
  messagingSenderId: "944185656560",
  appId: "1:944185656560:web:0b3d2e209ef08abbd3ae35",
  measurementId: "G-2NKT3F5PHZ"
};

// Initialize Firebase safely
const app = initializeApp(firebaseConfig.apiKey !== "PASTE_YOUR_API_KEY_HERE" ? firebaseConfig : {});
const auth = getAuth(app);
const db = getFirestore(app);
const APP_ID = 'osceola-arts-journal';

// --- MOCK AI LOGIC ---
const MOODS = {
  joyful: { color: 'bg-green-500/20 text-green-400 border-green-500/50', label: 'Joyful', dot: 'bg-green-500' },
  neutral: { color: 'bg-gray-500/20 text-gray-400 border-gray-500/50', label: 'Neutral', dot: 'bg-gray-500' },
  reflective: { color: 'bg-orange-500/20 text-orange-400 border-orange-500/50', label: 'Reflective', dot: 'bg-orange-500' },
  annoyed: { color: 'bg-red-500/20 text-red-400 border-red-500/50', label: 'Frustrated', dot: 'bg-red-500' },
  creative: { color: 'bg-purple-500/20 text-purple-400 border-purple-500/50', label: 'Creative', dot: 'bg-purple-500' },
};
const SUGGESTED_TAGS = ['Music Ed', 'District Office', 'Grant Writing', 'Guitar Practice', 'Family', 'Arts Advocacy', 'Lesson Planning'];
const AI_INSIGHT_TEMPLATES = [
  "This entry suggests a strong focus on student outcomes.",
  "You seem to be balancing administrative tasks with creative vision well.",
  "Consider how this idea could be expanded into a district-wide initiative.",
  "Rest is just as important as practice. Take a moment to recharge.",
  "A very productive mindset is evident here."
];

// --- COMPONENTS ---
const SidebarItem = ({ icon: Icon, label, active, onClick, count }) => (
  <button onClick={onClick} className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 group ${active ? 'bg-zinc-800 text-white shadow-lg' : 'text-zinc-400 hover:bg-zinc-800/50'}`}>
    <div className="flex items-center gap-3"><Icon size={20} className={active ? 'text-blue-400' : 'text-zinc-500'} /><span className="font-medium text-sm">{label}</span></div>
    {count > 0 && <span className="text-xs bg-zinc-900 text-zinc-500 px-2 py-0.5 rounded-full">{count}</span>}
  </button>
);

export default function App() {
  const [user, setUser] = useState(null);
  const [entries, setEntries] = useState([]);
  const [view, setView] = useState('journal'); 
  const [selectedEntryId, setSelectedEntryId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [configError, setConfigError] = useState(false);
  
  // Custom Profile
  const [userProfile, setUserProfile] = useState({ name: 'Arts Resource Specialist', initials: 'ME', plan: 'District Pro' });
  const [activeEntryData, setActiveEntryData] = useState({ title: '', content: '', date: new Date().toISOString().split('T')[0], tags: [], mood: null, aiInsight: null, imageUrl: null });
  
  // Loading States
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGeneratingArt, setIsGeneratingArt] = useState(false);

  useEffect(() => {
    if (firebaseConfig.apiKey === "PASTE_YOUR_API_KEY_HERE") { setConfigError(true); return; }
    const initAuth = async () => { try { await signInAnonymously(auth); } catch(e) { console.error(e); } };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const entriesRef = collection(db, 'artifacts', APP_ID, 'users', user.uid, 'entries');
    const unsubscribeEntries = onSnapshot(entriesRef, (snapshot) => {
      const loadedEntries = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      loadedEntries.sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date));
      setEntries(loadedEntries);
    });
    return () => unsubscribeEntries();
  }, [user]);

  // Actions
  const handleCreateNew = async () => {
    if (!user) return;
    const newEntry = { title: '', content: '', date: new Date().toISOString().split('T')[0], createdAt: new Date().toISOString(), tags: [], mood: null, aiInsight: null, imageUrl: null, isInbox: view === 'inbox' };
    const docRef = await addDoc(collection(db, 'artifacts', APP_ID, 'users', user.uid, 'entries'), newEntry);
    setSelectedEntryId(docRef.id); setActiveEntryData(newEntry);
    if (['calendar','media','settings'].includes(view)) setView('journal');
  };

  const handleSave = async (data = activeEntryData) => {
    if (!user || !selectedEntryId) return;
    await updateDoc(doc(db, 'artifacts', APP_ID, 'users', user.uid, 'entries', selectedEntryId), { ...data, updatedAt: new Date().toISOString() });
  };
  
  const handleSelectEntry = (entry) => { setSelectedEntryId(entry.id); setActiveEntryData(entry); };
  const handleDelete = async (id) => { if(confirm("Delete?")) { await deleteDoc(doc(db, 'artifacts', APP_ID, 'users', user.uid, 'entries', id)); if(selectedEntryId === id) setSelectedEntryId(null); }};

  // Simulations
  const simulateAIAnalysis = async () => {
    if (!activeEntryData.content) return;
    setIsAnalyzing(true); await new Promise(r => setTimeout(r, 1500));
    let newTitle = activeEntryData.title || "Arts & Reflection";
    if (activeEntryData.content.toLowerCase().includes('000049')) newTitle = "Gate Code / District Access";
    const mood = 'creative'; 
    const newData = { ...activeEntryData, title: newTitle, mood, tags: ['Music', 'District'], aiInsight: AI_INSIGHT_TEMPLATES[0] };
    setActiveEntryData(newData); await handleSave(newData); setIsAnalyzing(false);
  };

  const simulateArtGeneration = async () => {
    setIsGeneratingArt(true); await new Promise(r => setTimeout(r, 2000));
    const newData = { ...activeEntryData, imageUrl: `https://picsum.photos/seed/${Math.random()}/800/600` };
    setActiveEntryData(newData); await handleSave(newData); setIsGeneratingArt(false);
  };

  // Rendering
  if (configError) return <div className="h-screen flex items-center justify-center bg-black text-white"><div><Settings className="w-16 h-16 text-red-500 mx-auto mb-4"/><h1 className="text-2xl font-bold">Missing Firebase Config</h1><p className="text-zinc-400 mt-2">Please open <code>src/App.jsx</code> and paste your keys.</p></div></div>;

  const filteredEntries = entries.filter(e => view === 'inbox' ? e.isInbox : !e.isInbox).filter(e => e.title?.toLowerCase().includes(searchQuery.toLowerCase()) || e.content?.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="flex h-screen bg-black text-zinc-200 font-sans overflow-hidden">
      {/* Sidebar */}
      <div className="w-64 bg-[#121212] border-r border-zinc-800 flex flex-col h-full shrink-0">
        <div className="p-6">
          <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500 flex items-center gap-2"><Music size={24}/> VibeJournal</h1>
          <p className="text-xs text-zinc-500 mt-1">Fine Arts Resource Manager</p>
        </div>
        <div className="flex-1 px-3 space-y-1">
          <SidebarItem icon={Book} label="Journal" active={view === 'journal'} onClick={() => setView('journal')} count={entries.filter(e => !e.isInbox).length} />
          <SidebarItem icon={CalendarIcon} label="Calendar" active={view === 'calendar'} onClick={() => setView('calendar')} />
          <SidebarItem icon={ImageIcon} label="Media" active={view === 'media'} onClick={() => setView('media')} count={entries.filter(e => e.imageUrl).length} />
          <SidebarItem icon={Inbox} label="Inbox" active={view === 'inbox'} onClick={() => setView('inbox')} count={entries.filter(e => e.isInbox).length} />
          <div className="pt-4 mt-4 border-t border-zinc-800"><SidebarItem icon={Settings} label="Settings" active={view === 'settings'} onClick={() => setView('settings')} /></div>
        </div>
        <div className="p-4 border-t border-zinc-800 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-pink-500 flex items-center justify-center text-xs font-bold text-white">{userProfile.initials}</div>
          <div><p className="text-sm font-medium text-zinc-200 truncate w-32">{userProfile.name}</p><p className="text-xs text-zinc-500">Resource Specialist</p></div>
        </div>
      </div>

      {/* Main View Switcher */}
      {view === 'journal' || view === 'inbox' ? (
        <>
          <div className="w-80 border-r border-zinc-800 bg-[#121212] flex flex-col h-full shrink-0">
            <div className="p-4 border-b border-zinc-800 sticky top-0 bg-[#121212] z-10">
              <div className="relative mb-3"><Search className="absolute left-3 top-2.5 text-zinc-500" size={16} /><input type="text" placeholder="Search..." className="w-full bg-zinc-900 text-zinc-200 pl-9 pr-4 py-2 rounded-lg border border-zinc-800 text-sm focus:outline-none focus:border-blue-500" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} /></div>
              <button onClick={handleCreateNew} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-2 rounded-lg flex items-center justify-center gap-2 text-sm transition-colors"><Plus size={16} /> New Entry</button>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-2">
              {filteredEntries.map(entry => (
                <div key={entry.id} onClick={() => handleSelectEntry(entry)} className={`p-3 rounded-xl cursor-pointer border transition-all ${selectedEntryId === entry.id ? 'bg-zinc-800 border-zinc-700' : 'border-transparent hover:bg-zinc-900'}`}>
                  <div className="flex justify-between mb-1"><span className="text-xs text-zinc-500">{entry.date}</span>{entry.mood && <div className={`w-2 h-2 rounded-full ${MOODS[entry.mood]?.dot || 'bg-gray-500'}`} />}</div>
                  <h3 className={`font-semibold text-sm mb-1 truncate ${selectedEntryId === entry.id ? 'text-white' : 'text-zinc-300'}`}>{entry.title || 'Untitled'}</h3>
                  <p className="text-xs text-zinc-500 line-clamp-2">{entry.content || 'No content...'}</p>
                </div>
              ))}
            </div>
          </div>
          {/* Detail View */}
          {selectedEntryId ? (
            <div className="flex-1 flex flex-col h-full bg-[#0c0c0c] overflow-hidden">
               <div className="h-16 px-6 border-b border-zinc-800 flex items-center justify-between shrink-0 bg-[#0c0c0c]/80 backdrop-blur">
                  <div className="flex items-center gap-4"><span className="text-zinc-500 text-sm font-mono">{activeEntryData.date}</span></div>
                  <div className="flex gap-2"><button onClick={() => handleDelete(selectedEntryId)} className="p-2 text-zinc-500 hover:text-red-400"><Trash2 size={18}/></button></div>
               </div>
               <div className="flex-1 overflow-y-auto max-w-4xl mx-auto w-full px-8 py-8 space-y-6">
                  <input type="text" value={activeEntryData.title} onChange={e => setActiveEntryData({...activeEntryData, title: e.target.value})} onBlur={() => handleSave()} placeholder="Title..." className="w-full bg-transparent text-3xl font-bold text-zinc-100 placeholder:text-zinc-700 focus:outline-none"/>
                  {activeEntryData.imageUrl && <img src={activeEntryData.imageUrl} className="w-full h-64 object-cover rounded-xl border border-zinc-800" />}
                  <div className="flex gap-2">
                    <button onClick={() => setActiveEntryData({...activeEntryData, content: activeEntryData.content + "\n[Audio Note]: "})} className="flex gap-2 px-3 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-xs text-zinc-400 hover:text-zinc-200"><Mic size={14}/> Audio</button>
                    <button onClick={() => setActiveEntryData({...activeEntryData, content: activeEntryData.content + "\n[Scanned]: "})} className="flex gap-2 px-3 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-xs text-zinc-400 hover:text-zinc-200"><ScanLine size={14}/> Scan</button>
                  </div>
                  <textarea value={activeEntryData.content} onChange={e => setActiveEntryData({...activeEntryData, content: e.target.value})} onBlur={() => handleSave()} placeholder="Start writing..." className="w-full h-[300px] bg-transparent text-zinc-300 text-lg focus:outline-none resize-none"/>
                  <div className="border-t border-zinc-800 pt-6">
                    <div className="flex justify-between mb-4"><h3 className="text-sm font-semibold text-zinc-400 uppercase flex gap-2"><Sparkles size={16} className="text-purple-400"/> AI Insights</h3><div className="flex gap-2"><button onClick={simulateArtGeneration} disabled={isGeneratingArt} className="bg-zinc-800 text-purple-400 px-3 py-1.5 rounded text-xs hover:bg-zinc-700">{isGeneratingArt ? '...' : 'Generate Art'}</button><button onClick={simulateAIAnalysis} disabled={isAnalyzing} className="bg-zinc-800 text-blue-400 px-3 py-1.5 rounded text-xs hover:bg-zinc-700">{isAnalyzing ? '...' : 'Analyze'}</button></div></div>
                    {activeEntryData.aiInsight && <div className="bg-zinc-900/50 p-4 rounded-xl border border-zinc-800/50 text-sm text-zinc-300"><p>{activeEntryData.aiInsight}</p><div className="flex gap-2 mt-2">{activeEntryData.tags.map(t => <span key={t} className="text-xs bg-zinc-950 px-2 py-1 rounded border border-zinc-800 text-zinc-500">#{t}</span>)}</div></div>}
                  </div>
               </div>
            </div>
          ) : <div className="flex-1 flex items-center justify-center text-zinc-600"><p>Select or create an entry.</p></div>}
        </>
      ) : (
        <div className="flex-1 flex items-center justify-center text-zinc-500 bg-[#0c0c0c]"><p>Calendar/Media View Placeholder</p></div>
      )}
    </div>
  );
}

### **Step 5: Publish It!**
1.  In the Terminal, type:
    bash
    git add . && git commit -m "Setup Journal" && git push
