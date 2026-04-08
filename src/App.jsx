import React, { useState, useEffect } from 'react';
import { 
  Plus, LogOut, Lock, User, Trash2, X, Database, Edit3,
  LayoutGrid, Settings, ChevronRight, Loader2, Package, Save, Tag, Store, Bell, Info, Search, History, Palette, Check, Menu
} from 'lucide-react';
import { Notify, Confirm, Report } from 'notiflix';
import { db, auth } from './firebase';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, serverTimestamp, orderBy, setDoc } from 'firebase/firestore';

const App = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingCat, setIsSavingCat] = useState(false); 
  const [activeTab, setActiveTab] = useState('inventory');
  const [searchTerm, setSearchTerm] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // State untuk mobile menu
  
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [config, setConfig] = useState({ 
    name: 'Cleaner', tagline: 'Activity Log System', logoColor: 'bg-stone-900', lowStockLimit: 10 
  });

  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [showModal, setShowModal] = useState(false);
  const [newProd, setNewProd] = useState({ id: null, name: '', category: '', price: '', stock: '' });
  
  const [newCat, setNewCat] = useState('');
  const [editingCatId, setEditingCatId] = useState(null);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubAuth();
  }, []);

  useEffect(() => {
    if (user) {
      onSnapshot(query(collection(db, "products"), orderBy("createdAt", "desc")), (snap) => {
        setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      });
      
      onSnapshot(query(collection(db, "categories"), orderBy("name", "asc")), (snap) => {
        setCategories(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      });
      
      onSnapshot(doc(db, "settings", "profile"), (snap) => {
        if (snap.exists()) setConfig(prev => ({ ...prev, ...snap.data() }));
      });

      onSnapshot(query(collection(db, "transactions"), orderBy("timestamp", "desc")), (snap) => {
        setTransactions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      });
    }
  }, [user]);

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsAuthenticating(true);
    try {
      await signInWithEmailAndPassword(auth, loginForm.email, loginForm.password);
      Notify.success('Welcome Admin');
    } catch (err) { Notify.failure('Login Error'); } finally { setIsAuthenticating(false); }
  };

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
      Notify.success('Saved to Database'); 
      setShowModal(false);
    } catch (err) { Notify.failure('Failed to Sync'); } finally { setIsSaving(false); }
  };

  const handleSaveCategory = async (e) => {
    e.preventDefault();
    if (!newCat || isSavingCat) return;
    
    setIsSavingCat(true);
    try {
      if (editingCatId) {
        await updateDoc(doc(db, "categories", editingCatId), { name: newCat });
        Notify.success('Category Updated');
        setEditingCatId(null);
      } else {
        await addDoc(collection(db, "categories"), { name: newCat });
        Notify.success('Category Added');
      }
      setNewCat('');
    } catch (err) { 
      Notify.failure('Error syncing category'); 
    } finally {
      setIsSavingCat(false);
    }
  };

  const handleUpdateConfig = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await setDoc(doc(db, "settings", "profile"), config);
      Notify.success('System Configuration Updated');
    } catch (err) { Notify.failure('Update Failed'); } finally { setIsSaving(false); }
  };

  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-[#FDFCFB]">
      <Loader2 className="animate-spin text-stone-900" size={32} />
    </div>
  );

  if (!user) return (
    <div className="min-h-screen bg-[#FDFCFB] flex items-center justify-center p-4 text-stone-700">
        <div className="bg-white p-8 md:p-12 rounded-[2.5rem] md:rounded-[3.5rem] shadow-2xl border border-stone-50 w-full max-w-md animate-in zoom-in duration-500">
            <div className="text-center mb-10">
                <div className="w-16 h-16 bg-stone-900 rounded-2xl flex items-center justify-center text-white mx-auto mb-4 shadow-xl"><Lock size={28}/></div>
                <h1 className="text-2xl font-bold font-serif italic text-stone-900">Admin Terminal</h1>
                <p className="text-[9px] font-black tracking-[0.3em] text-stone-300 mt-2">Restricted Access</p>
            </div>
            <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-stone-400 ml-4">Identifier</label>
                  <input type="email" placeholder="Email Address" className="w-full bg-stone-50 rounded-2xl p-5 outline-none text-sm border border-transparent focus:border-stone-200" onChange={e => setLoginForm({...loginForm, email: e.target.value})} required />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-stone-400 ml-4">Passcode</label>
                  <input type="password" placeholder="••••••••" className="w-full bg-stone-50 rounded-2xl p-5 outline-none text-sm border border-transparent focus:border-stone-200" onChange={e => setLoginForm({...loginForm, password: e.target.value})} required />
                </div>
                <button disabled={isAuthenticating} className="w-full bg-stone-900 text-white py-6 rounded-2xl font-black text-[10px] tracking-widest shadow-xl hover:bg-black transition-all flex items-center justify-center gap-3 disabled:opacity-70">
                    {isAuthenticating ? <Loader2 className="animate-spin" size={16}/> : <User size={16}/>}
                    {isAuthenticating ? 'Authorizing...' : 'Authorize Access'}
                </button>
            </form>
        </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F9F9F9] flex flex-col md:flex-row text-stone-700 font-sans overflow-hidden">
      
      {/* MOBILE HEADER */}
      <div className="md:hidden bg-white border-b border-stone-100 p-4 flex justify-between items-center z-50">
        <div className="flex items-center gap-3">
            <div className={`w-8 h-8 ${config.logoColor} rounded-lg flex items-center justify-center text-white shadow-md`}><Database size={16}/></div>
            <h1 className="font-black text-sm italic text-stone-900 tracking-tighter">{config.name}</h1>
        </div>
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 bg-stone-50 rounded-xl text-stone-900">
            {isSidebarOpen ? <X size={20}/> : <Menu size={20}/>}
        </button>
      </div>

      {/* SIDEBAR */}
      <aside className={`
        fixed inset-0 z-40 bg-white border-r border-stone-100 p-8 flex flex-col transition-transform duration-300 ease-in-out
        md:relative md:translate-x-0 md:w-80 md:h-screen
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="hidden md:block mb-16">
          <div className={`w-12 h-12 ${config.logoColor} rounded-2xl flex items-center justify-center text-white mb-4 shadow-lg`}><Database size={24}/></div>
          <h1 className="font-black text-xl italic leading-none tracking-tighter text-stone-900">{config.name}</h1>
          <p className="text-[9px] font-bold text-stone-300 tracking-widest mt-1 leading-relaxed">System Database Control</p>
        </div>
        
        <nav className="space-y-2 flex-1 mt-12 md:mt-0">
          {[
            { id: 'inventory', label: 'Stock Master', icon: LayoutGrid },
            { id: 'history', label: 'Activity Log', icon: History },
            { id: 'config', label: 'System Setup', icon: Settings }
          ].map(tab => (
            <button key={tab.id} 
              onClick={() => { setActiveTab(tab.id); setIsSidebarOpen(false); }} 
              className={`w-full flex items-center justify-between px-6 py-4.5 rounded-[1.5rem] font-bold text-[10px] tracking-wider transition-all ${activeTab === tab.id ? 'bg-stone-50 text-stone-900 border border-stone-100 shadow-sm' : 'text-stone-300 hover:text-stone-500'}`}>
                <div className="flex items-center gap-3"><tab.icon size={16}/> {tab.label}</div>
                {activeTab === tab.id && <ChevronRight size={14}/>}
            </button>
          ))}
        </nav>

        <button onClick={() => signOut(auth)} className="flex items-center gap-3 px-6 py-4 text-stone-300 font-bold text-[10px] tracking-widest hover:text-red-500 transition-colors mt-auto border-t border-stone-50 pt-8"><LogOut size={16}/> Sign Out</button>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 h-screen overflow-y-auto overflow-x-hidden relative">
        <div className="p-6 md:p-12 lg:p-16 max-w-6xl mx-auto pb-32">
          
          {/* TAB: INVENTORY */}
          {activeTab === 'inventory' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-8 mb-12">
                <div className="w-full">
                    <h2 className="text-3xl md:text-4xl font-bold font-serif italic text-stone-900">Inventory</h2>
                    <p className="text-stone-300 text-[10px] font-black tracking-widest mt-1">Manage physical resources</p>
                    <div className="relative mt-8 w-full max-w-md">
                      <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-stone-300" size={16}/>
                      <input type="text" placeholder="Search item by name..." className="w-full bg-white border border-stone-100 rounded-2xl py-4 md:py-5 pl-14 pr-6 text-xs outline-none focus:border-stone-900 transition-all shadow-sm" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                    </div>
                </div>
                <button onClick={() => { setNewProd({ id: null, name: '', category: categories[0]?.name || '', price: '', stock: '' }); setShowModal(true); }} className="w-full lg:w-auto bg-stone-900 text-white px-10 py-5 rounded-2xl font-black text-[10px] tracking-widest shadow-xl hover:bg-black transition-all">Add Product</button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProducts.map(p => (
                  <div key={p.id} className="bg-white p-6 md:p-8 rounded-[2.5rem] md:rounded-[3rem] border border-stone-50 shadow-sm group hover:shadow-xl transition-all relative overflow-hidden">
                    <div className="flex justify-between items-start relative z-10 mb-8">
                        <span className="text-[8px] font-black bg-stone-50 text-stone-400 px-4 py-2 rounded-xl tracking-widest">{p.category}</span>
                        <div className="flex gap-1">
                            <button onClick={() => { setNewProd(p); setShowModal(true); }} className="p-2 text-stone-200 hover:text-stone-900 transition-colors"><Edit3 size={15}/></button>
                            <button onClick={() => Confirm.show('Hapus Produk?', `Menghapus "${p.name}" bersifat permanen.`, 'Ya, Hapus', 'Batal', () => deleteDoc(doc(db, "products", p.id)))} className="p-2 text-stone-100 hover:text-red-500 transition-colors"><Trash2 size={15}/></button>
                        </div>
                    </div>
                    <h3 className="text-lg md:text-xl font-bold text-stone-800 leading-tight mb-2">{p.name}</h3>
                    <p className="text-stone-400 text-xs font-medium italic">Rp {p.price?.toLocaleString('id-ID')}</p>
                    
                    <div className="mt-10 pt-6 border-t border-stone-50 flex justify-between items-end">
                        <div className="space-y-1">
                          <p className="text-[8px] font-black text-stone-300 tracking-widest">Inventory Status</p>
                          <span className={`text-2xl md:text-3xl font-serif italic ${p.stock <= config.lowStockLimit ? 'text-orange-500 font-bold' : 'text-stone-900'}`}>{p.stock}</span>
                        </div>
                        {p.stock <= config.lowStockLimit && <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse mb-3"></div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB: LOG HISTORY */}
          {activeTab === 'history' && (
            <div className="animate-in fade-in duration-700">
               <h2 className="text-3xl md:text-4xl font-bold font-serif italic text-stone-900 mb-2">Activity Log</h2>
               <p className="text-stone-300 text-[10px] font-black tracking-widest mb-12">System usage history</p>
               
               <div className="bg-white rounded-[2rem] md:rounded-[3.5rem] border border-stone-100 shadow-sm overflow-hidden">
                 <div className="overflow-x-auto scrollbar-hide">
                   <table className="w-full text-left border-collapse min-w-[700px]">
                     <thead>
                       <tr className="bg-stone-50/50">
                         <th className="p-6 md:p-8 text-[9px] font-black text-stone-400 tracking-widest">Resource Name / Date</th>
                         <th className="p-6 md:p-8 text-[9px] font-black text-stone-400 tracking-widest">Type</th>
                         <th className="p-6 md:p-8 text-[9px] font-black text-stone-400 tracking-widest text-right">Qty</th>
                         <th className="p-6 md:p-8 text-[9px] font-black text-stone-400 tracking-widest text-center">Action</th>
                       </tr>
                     </thead>
                     <tbody className="divide-y divide-stone-50">
                       {transactions.map((t) => (
                         <tr key={t.id} className="hover:bg-stone-50/30 transition-colors group">
                           <td className="p-6 md:p-8">
                             <div className="font-bold text-stone-800 text-sm">{t.productName}</div>
                             <div className="text-[10px] text-stone-300 mt-1 font-medium">{t.dateText || 'No Timestamp'}</div>
                           </td>
                           <td className="p-6 md:p-8">
                             <span className={`px-4 py-1.5 rounded-full text-[8px] font-black tracking-tighter ${t.type === 'in' ? 'bg-stone-100 text-stone-400' : 'bg-stone-900 text-white shadow-md'}`}>
                               {t.type === 'in' ? 'Stock In' : 'Stock Out'}
                             </span>
                           </td>
                           <td className="p-6 md:p-8 text-right font-serif italic text-xl md:text-2xl text-stone-900">{t.qty}</td>
                           <td className="p-6 md:p-8 text-center">
                             <button onClick={() => Confirm.show('Hapus Log?', 'Hapus record aktivitas ini?', 'Hapus', 'Batal', () => deleteDoc(doc(db, "transactions", t.id)))} className="p-3 text-stone-200 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all md:opacity-0 group-hover:opacity-100">
                               <Trash2 size={16}/>
                             </button>
                           </td>
                         </tr>
                       ))}
                     </tbody>
                   </table>
                 </div>
               </div>
            </div>
          )}

          {/* TAB: CONFIGURATION */}
          {activeTab === 'config' && (
            <div className="animate-in fade-in duration-700 grid grid-cols-1 lg:grid-cols-2 gap-12">
               <div>
                  <h2 className="text-3xl md:text-4xl font-bold font-serif italic text-stone-900 mb-2">System Setup</h2>
                  <p className="text-stone-300 text-[10px] font-black tracking-widest mb-12">Identity & Thresholds</p>
                  
                  <form onSubmit={handleUpdateConfig} className="bg-white p-8 md:p-12 rounded-[2.5rem] md:rounded-[4rem] border border-stone-100 shadow-sm space-y-8">
                    <div className="space-y-6">
                        <div className="space-y-2">
                          <label className="text-[9px] font-black text-stone-400 ml-4">Terminal Name</label>
                          <input type="text" className="w-full bg-stone-50 rounded-2xl p-5 outline-none focus:ring-1 focus:ring-stone-200 text-sm font-bold" value={config.name} onChange={e => setConfig({...config, name: e.target.value})} />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[9px] font-black text-stone-400 ml-4">Sub-tagline</label>
                          <input type="text" className="w-full bg-stone-50 rounded-2xl p-5 outline-none focus:ring-1 focus:ring-stone-200 text-sm" value={config.tagline} onChange={e => setConfig({...config, tagline: e.target.value})} />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[9px] font-black text-stone-400 ml-4 flex justify-between">Low Stock Warning Threshold <span className="text-stone-900 font-serif italic text-sm">{config.lowStockLimit} Units</span></label>
                          <input type="range" min="0" max="100" className="w-full accent-stone-900 h-2 bg-stone-100 rounded-lg appearance-none cursor-pointer" value={config.lowStockLimit} onChange={e => setConfig({...config, lowStockLimit: parseInt(e.target.value)})} />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[9px] font-black text-stone-400 ml-4">Accent Theme</label>
                          <div className="flex flex-wrap gap-3 mt-2">
                            {['bg-stone-900', 'bg-blue-900', 'bg-emerald-900', 'bg-rose-900', 'bg-orange-900'].map(color => (
                              <button key={color} type="button" onClick={() => setConfig({...config, logoColor: color})} className={`w-8 h-8 rounded-full ${color} transition-transform ${config.logoColor === color ? 'ring-4 ring-stone-100 scale-110' : 'opacity-40 hover:opacity-100'}`} />
                            ))}
                          </div>
                        </div>
                    </div>
                    <button disabled={isSaving} className="w-full bg-stone-900 text-white py-6 rounded-[2rem] font-black text-[10px] tracking-widest flex items-center justify-center gap-3 shadow-xl hover:bg-black transition-all disabled:opacity-70">
                       {isSaving ? <Loader2 className="animate-spin" size={16}/> : <Save size={16}/>} 
                       {isSaving ? 'Syncing...' : 'Update Configuration'}
                    </button>
                  </form>
               </div>

               {/* CATEGORY MANAGEMENT */}
               <div>
                  <h2 className="text-3xl md:text-4xl font-bold font-serif italic text-stone-900 mb-2">Categories</h2>
                  <p className="text-stone-300 text-[10px] font-black tracking-widest mb-12">Organization Metadata</p>
                  
                  <div className="bg-white p-8 md:p-12 rounded-[2.5rem] md:rounded-[4rem] border border-stone-100 shadow-sm">
                    <form onSubmit={handleSaveCategory} className="flex flex-col sm:flex-row gap-2 mb-10">
                      <input 
                        type="text" 
                        disabled={isSavingCat}
                        placeholder={editingCatId ? "Update category name..." : "New category..."} 
                        className={`flex-1 rounded-2xl px-6 py-4 text-xs outline-none border transition-all disabled:opacity-50 ${editingCatId ? 'bg-amber-50 border-amber-200' : 'bg-stone-50 border-transparent'}`} 
                        value={newCat} 
                        onChange={e => setNewCat(e.target.value)} 
                      />
                      <div className="flex gap-2">
                          <button 
                            disabled={isSavingCat || !newCat}
                            className={`flex-1 sm:flex-none p-4 rounded-2xl transition-all disabled:opacity-50 ${editingCatId ? 'bg-amber-500 text-white hover:bg-amber-600' : 'bg-stone-100 text-stone-900 hover:bg-stone-900 hover:text-white'}`}>
                            {isSavingCat ? <Loader2 size={20} className="animate-spin mx-auto" /> : editingCatId ? <Check size={20} className="mx-auto"/> : <Plus size={20} className="mx-auto"/>}
                          </button>
                          {editingCatId && !isSavingCat && (
                            <button type="button" onClick={() => { setEditingCatId(null); setNewCat(''); }} className="bg-stone-100 text-stone-400 p-4 rounded-2xl hover:bg-stone-200 flex-1 sm:flex-none"><X size={20} className="mx-auto"/></button>
                          )}
                      </div>
                    </form>
                    
                    <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 scrollbar-hide">
                      {categories.map(c => (
                        <div key={c.id} className={`flex justify-between items-center p-5 rounded-2xl border transition-all group ${editingCatId === c.id ? 'bg-amber-50 border-amber-200' : 'bg-stone-50/50 border-stone-50 hover:bg-white hover:shadow-md'}`}>
                          <span className={`text-[10px] font-black tracking-widest ${editingCatId === c.id ? 'text-amber-700' : 'text-stone-600'}`}>{c.name}</span>
                          <div className="flex gap-2">
                            <button 
                              disabled={isSavingCat}
                              onClick={() => { setEditingCatId(c.id); setNewCat(c.name); }} 
                              className={`transition-all disabled:hidden ${editingCatId === c.id ? 'text-amber-500' : 'text-stone-200 hover:text-stone-900 md:opacity-0 group-hover:opacity-100'}`}>
                              <Edit3 size={14}/>
                            </button>
                            <button 
                              disabled={isSavingCat}
                              onClick={() => Confirm.show('Hapus Kategori?', `Yakin ingin menghapus "${c.name}"?`, 'Ya', 'Batal', () => deleteDoc(doc(db, "categories", c.id)))} 
                              className="text-stone-200 hover:text-red-500 md:opacity-0 group-hover:opacity-100 transition-all disabled:hidden">
                              <X size={14}/>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
               </div>
            </div>
          )}
        </div>
      </main>

      {/* MODAL: ADD/EDIT PRODUCT */}
      {showModal && (
        <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-md z-[60] flex items-center justify-center p-4 md:p-6 text-stone-700 overflow-y-auto">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] md:rounded-[4rem] p-8 md:p-12 shadow-2xl border border-stone-50 animate-in zoom-in duration-300 my-auto">
            <div className="flex justify-between items-center mb-8 md:mb-10">
              <div>
                <h3 className="text-xl md:text-2xl font-bold font-serif italic text-stone-900">{newProd.id ? 'Modify Item' : 'New Resource'}</h3>
                <p className="text-[8px] font-black text-stone-300 tracking-widest mt-1">Database Entry Form</p>
              </div>
              <button disabled={isSaving} onClick={() => setShowModal(false)} className="text-stone-300 hover:text-stone-900 transition-colors disabled:opacity-0"><X size={24}/></button>
            </div>
            <form onSubmit={handleSaveProduct} className="space-y-4 md:space-y-6">
              <div className="space-y-2">
                  <label className="text-[9px] font-black text-stone-400 ml-4 tracking-widest">Formal Label</label>
                  <input type="text" disabled={isSaving} className="w-full bg-stone-50 rounded-2xl p-4 md:p-5 outline-none text-sm font-bold border border-transparent focus:border-stone-100 disabled:opacity-50" placeholder="e.g. Chemical A-01" value={newProd.name} onChange={e => setNewProd({...newProd, name: e.target.value})} required />
              </div>
              
              <div className="space-y-2">
                  <label className="text-[9px] font-black text-stone-400 ml-4 tracking-widest">Category Allocation</label>
                  <select disabled={isSaving} className="w-full bg-stone-50 rounded-2xl p-4 md:p-5 outline-none text-xs font-bold appearance-none cursor-pointer border border-transparent focus:border-stone-100 disabled:opacity-50" value={newProd.category} onChange={e => setNewProd({...newProd, category: e.target.value})} required>
                    <option value="">-- Choose Category --</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.name}>{c.name.toUpperCase()}</option>
                    ))}
                  </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                <div className="space-y-2">
                    <label className="text-[9px] font-black text-stone-400 ml-4 tracking-widest">Base Value (Rp)</label>
                    <input type="number" disabled={isSaving} className="w-full bg-stone-50 rounded-2xl p-4 md:p-5 outline-none text-sm font-bold border border-transparent focus:border-stone-100 disabled:opacity-50" placeholder="0" value={newProd.price} onChange={e => setNewProd({...newProd, price: e.target.value})} required />
                </div>
                <div className="space-y-2">
                    <label className="text-[9px] font-black text-stone-400 ml-4 tracking-widest">Opening Stock</label>
                    <input type="number" disabled={isSaving} className="w-full bg-stone-50 rounded-2xl p-4 md:p-5 outline-none text-sm font-bold border border-transparent focus:border-stone-100 disabled:opacity-50" placeholder="0" value={newProd.stock} onChange={e => setNewProd({...newProd, stock: e.target.value})} required />
                </div>
              </div>
              
              <button disabled={isSaving} className="w-full bg-stone-900 text-white py-5 md:py-6 rounded-[2rem] md:rounded-[2.5rem] font-black text-[10px] tracking-widest flex items-center justify-center gap-3 shadow-xl hover:bg-black transition-all mt-4 disabled:bg-stone-300">
                {isSaving ? <Loader2 className="animate-spin" size={16}/> : <Save size={16}/>} 
                {isSaving ? 'Synchronizing...' : 'Commit to Database'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;