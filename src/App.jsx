import React, { useState, useEffect } from 'react';
import { 
  Plus, LogOut, Lock, User, Trash2, X, Database, Edit3,
  LayoutGrid, Settings, ChevronRight, Loader2, Package, Save, Tag, Store, Bell, Info
} from 'lucide-react';
import { Notify, Confirm } from 'notiflix';

// FIREBASE
import { db, auth } from './firebase';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { 
  collection, onSnapshot, addDoc, updateDoc, deleteDoc, 
  doc, query, serverTimestamp, orderBy, setDoc 
} from 'firebase/firestore';

const App = () => {
  // Authentication & Loading States
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // App States
  const [activeTab, setActiveTab] = useState('inventory');
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  
  // SINKRONISASI DENGAN DOKUMEN 'profile'
  const [config, setConfig] = useState({ 
    name: 'Cleaner', 
    tagline: 'Your tagline', 
    logoColor: 'bg-stone-900',
    whatsapp: '', 
    lowStockLimit: 10 
  });

  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [showModal, setShowModal] = useState(false);
  const [showCatModal, setShowCatModal] = useState(false);
  
  // Form States
  const [newProd, setNewProd] = useState({ id: null, name: '', category: '', price: '', stock: '' });
  const [newCat, setNewCat] = useState({ id: null, name: '' });

  // 1. Monitor Auth Status
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // 2. Real-time Database Sync
  useEffect(() => {
    if (user) {
      // Sync Produk
      const unsubProd = onSnapshot(query(collection(db, "products"), orderBy("createdAt", "desc")), (snap) => {
        setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      });

      // Sync Kategori
      const unsubCat = onSnapshot(query(collection(db, "categories"), orderBy("name", "asc")), (snap) => {
        const catList = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setCategories(catList);
        if (catList.length > 0 && !newProd.category) {
            setNewProd(prev => ({...prev, category: catList[0].name}));
        }
      });

      // SYNC CONFIG (Menggunakan dokumen 'profile' sesuai screenshot baru)
      const unsubConfig = onSnapshot(doc(db, "settings", "profile"), (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setConfig({
            name: data.name || 'Cleaner',
            tagline: data.tagline || '',
            logoColor: data.logoColor || 'bg-stone-900',
            whatsapp: data.whatsapp || '',
            lowStockLimit: data.lowStockLimit || 10
          });
        }
      });

      return () => { unsubProd(); unsubCat(); unsubConfig(); };
    }
  }, [user]);

  // AUTH HANDLERS
  const handleLogin = async (e) => {
    e.preventDefault();
    setIsAuthenticating(true);
    try {
      await signInWithEmailAndPassword(auth, loginForm.email, loginForm.password);
      Notify.success('Access Granted');
    } catch (err) { Notify.failure('Invalid Credentials'); } 
    finally { setIsAuthenticating(false); }
  };

  const handleLogout = () => {
    Confirm.show('Sign Out', 'Keluar dari sesi admin?', 'Logout', 'Batal', () => signOut(auth));
  };

  // PRODUCT HANDLERS
  const handleSaveProduct = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const data = { 
        name: newProd.name, 
        category: newProd.category, 
        price: parseInt(newProd.price), 
        stock: parseInt(newProd.stock), 
        updatedAt: serverTimestamp() 
      };
      
      if (newProd.id) {
        await updateDoc(doc(db, "products", newProd.id), data);
      } else {
        await addDoc(collection(db, "products"), { ...data, createdAt: serverTimestamp() });
      }
      Notify.success('Database Updated');
      setShowModal(false);
    } catch (err) { Notify.failure('Process Failed'); } 
    finally { setIsSaving(false); }
  };

  // CATEGORY HANDLERS
  const handleSaveCategory = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
        if (newCat.id) await updateDoc(doc(db, "categories", newCat.id), { name: newCat.name });
        else await addDoc(collection(db, "categories"), { name: newCat.name });
        setShowCatModal(false);
        setNewCat({ id: null, name: '' });
        Notify.success('Category Saved');
    } catch (err) { Notify.failure('Failed'); } 
    finally { setIsSaving(false); }
  };

  // CONFIGURATION HANDLER (Push ke settings/profile)
  const handleSaveConfig = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await setDoc(doc(db, "settings", "profile"), config);
      Notify.success('Cloud Profile Updated');
    } catch (err) { Notify.failure('Sync Failed'); } 
    finally { setIsSaving(false); }
  };

  if (loading) return <div className="h-screen flex items-center justify-center bg-[#FDFCFB]"><Loader2 className="animate-spin text-stone-200" size={32} /></div>;

  if (!user) return (
    <div className="min-h-screen bg-[#FDFCFB] flex items-center justify-center p-6">
        <div className="bg-white p-12 rounded-[3.5rem] shadow-2xl border border-stone-50 w-full max-w-md">
            <div className="text-center mb-10">
                <div className={`w-16 h-16 bg-stone-900 rounded-2xl flex items-center justify-center text-white mx-auto mb-4`}><Database size={28}/></div>
                <h1 className="text-2xl font-bold font-serif italic">Admin Central</h1>
            </div>
            <form onSubmit={handleLogin} className="space-y-4">
                <input type="email" placeholder="Email" className="w-full bg-stone-50 rounded-2xl p-4.5 outline-none text-sm" onChange={e => setLoginForm({...loginForm, email: e.target.value})} required />
                <input type="password" placeholder="Password" className="w-full bg-stone-50 rounded-2xl p-4.5 outline-none text-sm" onChange={e => setLoginForm({...loginForm, password: e.target.value})} required />
                <button disabled={isAuthenticating} className="w-full bg-stone-900 text-white py-5 rounded-2xl font-black text-[10px] tracking-widest">
                  {isAuthenticating ? 'Authenticating...' : 'Enter System'}
                </button>
            </form>
        </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F9F9F9] flex flex-col md:flex-row text-stone-700">
      {/* Sidebar Admin */}
      <aside className="w-full md:w-80 bg-white border-r border-stone-100 p-10 flex flex-col h-screen sticky top-0 z-40">
        <div className="mb-16">
          <div className={`w-12 h-12 ${config.logoColor} rounded-2xl flex items-center justify-center text-white mb-4 shadow-lg`}>
            <Database size={24}/>
          </div>
          <h1 className="font-black text-xl tracking-tighter italic leading-none">{config.name}</h1>
          <p className="text-[9px] font-bold text-stone-300 tracking-widest mt-1">{config.tagline}</p>
        </div>
        
        <nav className="space-y-2 flex-1">
          {[
            { id: 'inventory', label: 'Katalog Stok', icon: LayoutGrid },
            { id: 'categories', label: 'Kategori', icon: Tag },
            { id: 'config', label: 'Store Profile', icon: Settings }
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`w-full flex items-center justify-between px-6 py-4.5 rounded-[1.5rem] font-bold text-[10px] uppercase tracking-wider transition-all ${activeTab === tab.id ? 'bg-stone-50 text-stone-900 border border-stone-100' : 'text-stone-300 hover:text-stone-500'}`}>
                <div className="flex items-center gap-3"><tab.icon size={16}/> {tab.label}</div>
                {activeTab === tab.id && <ChevronRight size={14}/>}
            </button>
          ))}
        </nav>
        <button onClick={handleLogout} className="flex items-center gap-3 px-6 py-4 text-stone-300 font-bold text-[10px] uppercase tracking-widest hover:text-red-400 transition-colors mt-auto">
            <LogOut size={16}/> Sign Out
        </button>
      </aside>

      <main className="flex-1 p-6 md:p-20 overflow-y-auto">
        <div className="max-w-5xl mx-auto">
          
          {activeTab === 'inventory' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
              <div className="flex justify-between items-end mb-12">
                <div>
                    <h2 className="text-4xl font-bold font-serif italic text-stone-900">{config.name}</h2>
                    <p className="text-stone-300 text-[10px] font-black uppercase tracking-[0.3em] mt-2">Active Database Control</p>
                </div>
                <button onClick={() => { setNewProd({ id: null, name: '', category: categories[0]?.name || '', price: '', stock: '' }); setShowModal(true); }} className="bg-stone-900 text-white px-8 py-4.5 rounded-2xl font-bold text-[10px] tracking-widest uppercase shadow-xl hover:scale-105 transition-all">Add Stock</button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {products.map(p => (
                  <div key={p.id} className="bg-white p-8 rounded-[3rem] border border-stone-50 shadow-sm group">
                    <div className="flex justify-between items-start mb-6">
                        <span className="text-[8px] font-black bg-stone-50 text-stone-400 px-3 py-1.5 rounded-full uppercase">{p.category}</span>
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                            <button onClick={() => { setNewProd(p); setShowModal(true); }} className="p-2 text-stone-300 hover:text-stone-900"><Edit3 size={14}/></button>
                            <button onClick={() => { Confirm.show('Hapus', 'Aksi ini permanen.', 'Hapus', 'Batal', () => deleteDoc(doc(db, "products", p.id))); }} className="p-2 text-red-100 hover:text-red-500"><Trash2 size={14}/></button>
                        </div>
                    </div>
                    <h3 className="text-lg font-bold text-stone-800">{p.name}</h3>
                    <p className="text-stone-400 text-xs mt-1 italic">Rp {p.price?.toLocaleString()}</p>
                    <div className="mt-8 pt-6 border-t border-stone-50 flex justify-between items-end">
                        <span className="text-[9px] font-black text-stone-300 uppercase">Stock</span>
                        <span className={`text-2xl font-light ${p.stock <= config.lowStockLimit ? 'text-orange-500 font-bold' : 'text-stone-900'}`}>{p.stock}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'config' && (
            <div className="animate-in fade-in duration-700 max-w-2xl">
              <header className="mb-12">
                <h2 className="text-4xl font-bold font-serif italic text-stone-900">Store Profile</h2>
                <p className="text-stone-300 text-[10px] font-black uppercase tracking-[0.3em] mt-2">Manage Branding & Thresholds</p>
              </header>

              <form onSubmit={handleSaveConfig} className="bg-white p-12 rounded-[4rem] border border-stone-50 shadow-sm space-y-8">
                <div className="grid grid-cols-1 gap-8">
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 text-stone-400"><Store size={14}/><label className="text-[10px] font-black uppercase tracking-widest">Store Name</label></div>
                        <input type="text" className="w-full bg-stone-50 rounded-2xl p-5 text-sm outline-none" value={config.name} onChange={e => setConfig({...config, name: e.target.value})} />
                    </div>
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 text-stone-400"><Info size={14}/><label className="text-[10px] font-black uppercase tracking-widest">Tagline</label></div>
                        <input type="text" className="w-full bg-stone-50 rounded-2xl p-5 text-sm outline-none" value={config.tagline} onChange={e => setConfig({...config, tagline: e.target.value})} />
                    </div>
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 text-stone-400"><LayoutGrid size={14}/><label className="text-[10px] font-black uppercase tracking-widest">Logo Theme (Tailwind Class)</label></div>
                        <input type="text" className="w-full bg-stone-50 rounded-2xl p-5 text-sm outline-none" value={config.logoColor} onChange={e => setConfig({...config, logoColor: e.target.value})} placeholder="bg-stone-900" />
                    </div>
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 text-stone-400"><Bell size={14}/><label className="text-[10px] font-black uppercase tracking-widest">Low Stock Alert Threshold</label></div>
                        <div className="flex items-center gap-4">
                            <input type="range" min="0" max="50" className="flex-1 accent-stone-900" value={config.lowStockLimit} onChange={e => setConfig({...config, lowStockLimit: parseInt(e.target.value)})} />
                            <span className="w-12 h-12 bg-stone-900 text-white rounded-xl flex items-center justify-center font-bold text-sm">{config.lowStockLimit}</span>
                        </div>
                    </div>
                </div>
                <button disabled={isSaving} className="w-full bg-stone-900 text-white py-6 rounded-[2rem] font-bold text-[10px] tracking-[0.3em] uppercase flex items-center justify-center gap-3">
                    {isSaving ? <Loader2 className="animate-spin" size={16}/> : <Save size={16}/>}
                    {isSaving ? 'Updating...' : 'Save Profile Changes'}
                </button>
              </form>
            </div>
          )}

          {activeTab === 'categories' && (
            <div className="animate-in fade-in duration-700">
                <header className="flex justify-between items-end mb-12">
                    <h2 className="text-4xl font-bold font-serif italic text-stone-900">Category Tags</h2>
                    <button onClick={() => { setNewCat({ id: null, name: '' }); setShowCatModal(true); }} className="bg-stone-50 text-stone-900 border border-stone-200 px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest">New Tag</button>
                </header>
                <div className="bg-white rounded-[3.5rem] border border-stone-50 overflow-hidden shadow-sm">
                    <table className="w-full text-left">
                        <thead><tr className="border-b border-stone-50"><th className="px-10 py-8 text-[10px] font-black uppercase text-stone-300 tracking-widest">Name</th><th className="px-10 py-8 text-right text-[10px] font-black uppercase text-stone-300 tracking-widest">Actions</th></tr></thead>
                        <tbody>
                            {categories.map(c => (
                                <tr key={c.id} className="border-b border-stone-50 hover:bg-stone-50/30 transition-colors">
                                    <td className="px-10 py-6 font-bold">{c.name}</td>
                                    <td className="px-10 py-6 text-right space-x-2">
                                        <button onClick={() => { setNewCat(c); setShowCatModal(true); }} className="p-3 bg-stone-50 text-stone-400 rounded-xl hover:text-stone-900"><Edit3 size={16}/></button>
                                        <button onClick={() => { Confirm.show('Hapus', `Hapus kategori ${c.name}?`, 'Ya', 'Batal', () => deleteDoc(doc(db, "categories", c.id))); }} className="p-3 bg-red-50 text-red-200 rounded-xl hover:text-red-500"><Trash2 size={16}/></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
          )}

        </div>
      </main>

      {/* MODAL PRODUCT */}
      {showModal && (
        <div className="fixed inset-0 bg-stone-900/10 backdrop-blur-2xl z-50 flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-lg rounded-[4rem] p-12 shadow-2xl border border-stone-50">
            <div className="flex justify-between items-center mb-10">
              <h3 className="text-2xl font-bold font-serif italic">Inventory Item</h3>
              <button onClick={() => setShowModal(false)} className="text-stone-300 hover:text-stone-900"><X size={24}/></button>
            </div>
            <form onSubmit={handleSaveProduct} className="space-y-6">
              <input type="text" className="w-full bg-stone-50 rounded-2xl p-5 text-sm outline-none" placeholder="Product Name" value={newProd.name} onChange={e => setNewProd({...newProd, name: e.target.value})} required />
              <select className="w-full bg-stone-50 rounded-2xl p-5 text-sm outline-none" value={newProd.category} onChange={e => setNewProd({...newProd, category: e.target.value})}>
                {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
              <div className="grid grid-cols-2 gap-4">
                <input type="number" className="bg-stone-50 rounded-2xl p-5 text-sm outline-none" placeholder="Price" value={newProd.price} onChange={e => setNewProd({...newProd, price: e.target.value})} required />
                <input type="number" className="bg-stone-50 rounded-2xl p-5 text-sm outline-none" placeholder="Stock" value={newProd.stock} onChange={e => setNewProd({...newProd, stock: e.target.value})} required />
              </div>
              <button disabled={isSaving} className="w-full bg-stone-900 text-white py-5 rounded-[2rem] font-bold text-[10px] tracking-widest uppercase flex items-center justify-center gap-3">
                {isSaving ? <Loader2 className="animate-spin" size={16}/> : <Save size={16}/>} SAVE TO DATABASE
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CATEGORY */}
      {showCatModal && (
        <div className="fixed inset-0 bg-stone-900/10 backdrop-blur-2xl z-50 flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-md rounded-[3.5rem] p-12 shadow-2xl border border-stone-50">
            <div className="flex justify-between items-center mb-8">
                <h3 className="text-xl font-bold font-serif italic text-stone-800">New Category</h3>
                <button onClick={() => setShowCatModal(false)} className="text-stone-300 hover:text-stone-900"><X size={20}/></button>
            </div>
            <form onSubmit={handleSaveCategory} className="space-y-6">
                <input type="text" className="w-full bg-stone-50 rounded-2xl p-5 text-sm outline-none" placeholder="Category Name" value={newCat.name} onChange={e => setNewCat({...newCat, name: e.target.value})} required />
                <button className="w-full bg-stone-900 text-white py-5 rounded-[2rem] font-bold text-[10px] tracking-widest uppercase">Add Tag</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;