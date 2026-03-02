import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

function App() {
  const [session, setSession] = useState(null);
  const [view, setView] = useState('dashboard'); 
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const [hospitals, setHospitals] = useState([]);
  const [surgeons, setSurgeons] = useState([]);
  const [products, setProducts] = useState([]);
  const [salesHistory, setSalesHistory] = useState([]);
  
  const [selectedHospital, setSelectedHospital] = useState('');
  const [selectedSurgeon, setSelectedSurgeon] = useState('');
  const [surgeryDate, setSurgeryDate] = useState(new Date().toISOString().split('T')[0]);
  const [cart, setCart] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [selectedSaleDetails, setSelectedSaleDetails] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session) fetchAllData();
  }, [session]);

  async function fetchAllData() {
    const [hosp, surg, prod, sales] = await Promise.all([
      supabase.from('Hospitals').select('*').order('name'),
      supabase.from('Surgeons').select('*').order('name'),
      supabase.from('Products').select('*').order('sort_order', { ascending: true }),
      supabase.from('Sales').select(`id, surgery_date, Hospitals (name), Surgeons (name), Sale_Items (quantity, unit_price, Products (name))`).order('surgery_date', { ascending: false })
    ]);
    setHospitals(hosp.data || []);
    setSurgeons(surg.data || []);
    setProducts(prod.data || []);
    setSalesHistory(sales.data || []);
  }

  // NIEUW: Verwijder Functie
  async function handleDeleteSale(saleId) {
    const confirmDelete = window.confirm("Weet je zeker dat je deze ingreep wilt verwijderen? Dit kan niet ongedaan worden gemaakt.");
    if (!confirmDelete) return;

    try {
      // 1. Verwijder eerst de items (Foreign Key constraint)
      await supabase.from('Sale_Items').delete().eq('sale_id', saleId);
      // 2. Verwijder de verkoop
      await supabase.from('Sales').delete().eq('id', saleId);
      
      setSelectedSaleDetails(null);
      fetchAllData();
      alert("Ingreep verwijderd.");
    } catch (error) {
      alert("Fout bij verwijderen: " + error.message);
    }
  }

  const getDashboardHistory = () => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const dayOfMonth = now.getDate();
    return salesHistory.filter(sale => {
      const sDate = new Date(sale.surgery_date);
      const isSameMonth = sDate.getMonth() === currentMonth && sDate.getFullYear() === currentYear;
      const isGracePeriod = dayOfMonth <= 7 && 
                           sDate.getMonth() === (currentMonth === 0 ? 11 : currentMonth - 1) &&
                           sDate.getFullYear() === (currentMonth === 0 ? currentYear - 1 : currentYear);
      return isSameMonth || isGracePeriod;
    });
  };

  const get12MonthSummary = () => {
    const summary = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const m = d.getMonth();
      const y = d.getFullYear();
      const total = salesHistory.reduce((acc, sale) => {
        const sDate = new Date(sale.surgery_date);
        if (sDate.getMonth() === m && sDate.getFullYear() === y) {
          return acc + sale.Sale_Items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
        }
        return acc;
      }, 0);
      summary.push({ label: new Intl.DateTimeFormat('nl-BE', { month: 'long', year: 'numeric' }).format(d), total, month: m, year: y });
    }
    return summary;
  };

  async function handleLogin(e) {
    e.preventDefault();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert("Fout: " + error.message);
  }

  async function handleSaveSale() {
    if (!selectedHospital || !selectedSurgeon || cart.length === 0) return alert("Vul alles in.");
    const { data: sale, error: saleError } = await supabase.from('Sales').insert([{ hospital_id: parseInt(selectedHospital), surgeon_id: parseInt(selectedSurgeon), surgery_date: surgeryDate }]).select();
    if (saleError) return alert(saleError.message);
    const itemsToInsert = cart.map(item => ({ sale_id: sale[0].id, product_id: item.product_id, quantity: item.quantity, unit_price: item.price }));
    await supabase.from('Sale_Items').insert(itemsToInsert);
    setCart([]); fetchAllData(); alert("Opgeslagen!");
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 text-white">
        <form onSubmit={handleLogin} className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-xs text-slate-800">
          <h2 className="text-xl font-bold mb-6 text-center">MEDSALES LOGIN</h2>
          <input type="email" placeholder="E-mail" className="w-full p-3 border rounded-xl mb-4" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <input type="password" placeholder="Wachtwoord" className="w-full p-3 border rounded-xl mb-6" value={password} onChange={(e) => setPassword(e.target.value)} required />
          <button className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold uppercase text-xs">Inloggen</button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 font-sans pb-24">
      <nav className="bg-slate-800 text-white p-4 mb-4 flex justify-between items-center sticky top-0 z-30 shadow-md text-xs font-bold tracking-widest">
        <h1 onClick={() => setView('dashboard')}>MEDSALES PRO</h1>
        <button onClick={() => supabase.auth.signOut()} className="bg-red-900/30 px-3 py-1 rounded border border-red-500/30">LOG UIT</button>
      </nav>

      <div className="max-w-4xl mx-auto px-4">
        {view === 'dashboard' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="bg-white p-4 rounded-2xl border shadow-sm">
                <p className="font-bold text-blue-600 mb-2 uppercase text-[10px]">1. Ingreep</p>
                <input type="date" className="w-full p-2 border rounded-lg mb-2" value={surgeryDate} onChange={(e) => setSurgeryDate(e.target.value)} />
                <select className="w-full p-2 border rounded-lg mb-2" value={selectedHospital} onChange={(e) => setSelectedHospital(e.target.value)}>
                  <option value="">Ziekenhuis...</option>
                  {hospitals.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                </select>
                <select className="w-full p-2 border rounded-lg" value={selectedSurgeon} onChange={(e) => setSelectedSurgeon(e.target.value)}>
                  <option value="">Chirurg...</option>
                  {surgeons.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>

              <div className="bg-white p-4 rounded-2xl border shadow-sm">
                <p className="font-bold text-blue-600 mb-2 uppercase text-[10px]">2. Product</p>
                <select className="w-full p-2 border rounded-lg mb-2" value={selectedProduct} onChange={(e) => setSelectedProduct(e.target.value)}>
                  <option value="">Kies product...</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <div className="flex gap-2">
                  <input type="number" className="w-16 p-2 border rounded-lg" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
                  <button onClick={() => {
                    const p = products.find(x => x.id.toString() === selectedProduct);
                    if(p) setCart([...cart, { product_id: p.id, name: p.name, price: p.price, quantity: parseInt(quantity) }]);
                  }} className="flex-grow bg-emerald-600 text-white font-bold rounded-lg uppercase text-[10px]">Add</button>
                </div>
              </div>

              <div className="bg-white p-4 rounded-2xl border shadow-sm flex flex-col min-h-[140px]">
                <p className="font-bold text-blue-600 mb-2 uppercase text-[10px]">3. Mandje</p>
                <div className="flex-grow mb-3 overflow-y-auto max-h-[80px]">
                  {cart.map((item, i) => (
                    <div key={i} className="flex justify-between border-b py-1 text-[10px]">
                      <span>{item.quantity}x {item.name}</span>
                      <button onClick={() => setCart(cart.filter((_, idx) => idx !== i))} className="text-red-500 font-bold ml-2">✕</button>
                    </div>
                  ))}
                </div>
                <button onClick={handleSaveSale} className="w-full bg-blue-600 text-white py-2.5 rounded-xl font-bold text-[10px] uppercase shadow-md">Opslaan</button>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
               <div className="px-4 py-2 bg-blue-50 border-b text-[10px] font-bold text-blue-800 uppercase tracking-widest">Actieve Maand</div>
               <table className="w-full text-left text-xs">
                  <tbody className="divide-y">
                    {getDashboardHistory().map(s => (
                      <tr key={s.id} onClick={() => setSelectedSaleDetails(s)} className="hover:bg-blue-50 cursor-pointer">
                        <td className="p-4 text-gray-400 font-mono text-[10px]">{s.surgery_date.split('-').reverse().join('/')}</td>
                        <td className="p-4 font-bold">{s.Hospitals?.name}</td>
                        <td className="p-4 text-right font-black text-blue-900">€{s.Sale_Items.reduce((a,b) => a+(b.quantity*b.unit_price),0).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
               </table>
            </div>
          </div>
        )}

        {view === 'archive' && (
          <div className="space-y-4 animate-in slide-in-from-right">
            <h2 className="text-lg font-black px-2 italic">Archief</h2>
            {get12MonthSummary().map((m, i) => {
                const monthSales = salesHistory.filter(s => {
                    const d = new Date(s.surgery_date);
                    return d.getMonth() === m.month && d.getFullYear() === m.year;
                });
                if (monthSales.length === 0) return null;
                return (
                    <div key={i} className="bg-white rounded-2xl shadow-sm border overflow-hidden mb-4">
                        <div className="bg-gray-100 px-4 py-2 font-bold text-xs flex justify-between uppercase">
                            <span>{m.label}</span>
                            <span className="text-blue-700 font-black text-[11px]">€ {m.total.toFixed(2)}</span>
                        </div>
                        <table className="w-full text-left text-[11px]">
                            <tbody className="divide-y">
                                {monthSales.map(s => (
                                    <tr key={s.id} onClick={() => setSelectedSaleDetails(s)} className="hover:bg-gray-50">
                                        <td className="p-3 text-gray-400">{s.surgery_date.split('-').reverse().join('/')}</td>
                                        <td className="p-3 font-bold">{s.Hospitals?.name}</td>
                                        <td className="p-3 text-right font-bold">€{s.Sale_Items.reduce((a,b) => a+(b.quantity*b.unit_price),0).toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                );
            })}
          </div>
        )}

        {view === 'stats' && (
          <div className="bg-white rounded-3xl shadow-xl border overflow-hidden">
            <div className="p-6 bg-slate-800 text-white font-bold">Jaaroverzicht</div>
            <div className="p-4 space-y-2">
              {get12MonthSummary().map((m, i) => (
                <div key={i} className="flex justify-between items-center p-4 rounded-2xl bg-gray-50 border text-xs">
                  <span className="font-bold text-gray-500 capitalize">{m.label}</span>
                  <span className="text-sm font-black text-gray-800">€ {m.total.toLocaleString('nl-BE', { minimumFractionDigits: 2 })}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t px-6 py-3 flex justify-between items-center z-40 shadow-lg">
        <button onClick={() => setView('dashboard')} className={`flex flex-col items-center gap-1 ${view === 'dashboard' ? 'text-blue-600' : 'text-gray-400'}`}>
          <span className="text-lg">📝</span><span className="text-[9px] font-bold uppercase">Invoer</span>
        </button>
        <button onClick={() => setView('archive')} className={`flex flex-col items-center gap-1 ${view === 'archive' ? 'text-blue-600' : 'text-gray-400'}`}>
          <span className="text-lg">📂</span><span className="text-[9px] font-bold uppercase">Archief</span>
        </button>
        <button onClick={() => setView('stats')} className={`flex flex-col items-center gap-1 ${view === 'stats' ? 'text-blue-600' : 'text-gray-400'}`}>
          <div className={`px-4 py-1.5 rounded-full ${view === 'stats' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'}`}><span className="text-xs font-black italic">€</span></div>
          <span className="text-[9px] font-bold uppercase">Totaal</span>
        </button>
      </div>

      {/* DETAIL MODAL MET VERWIJDERKNOP */}
      {selectedSaleDetails && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50 backdrop-blur-sm" onClick={() => setSelectedSaleDetails(null)}>
          <div className="bg-white rounded-[2rem] max-w-xs w-full p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold mb-4 text-[10px] uppercase text-slate-400 tracking-widest text-center">Details Ingreep</h3>
            
            <div className="bg-gray-50 p-4 rounded-2xl mb-4 space-y-2 text-[11px]">
              {selectedSaleDetails.Sale_Items.map((item, idx) => (
                <div key={idx} className="flex justify-between border-b pb-2">
                  <span className="italic">{item.quantity}x {item.Products?.name}</span>
                  <span className="font-bold italic">€{(item.quantity * item.unit_price).toFixed(2)}</span>
                </div>
              ))}
              <div className="flex justify-between font-black text-blue-900 pt-2 text-base">
                <span>Totaal</span>
                <span>€{selectedSaleDetails.Sale_Items.reduce((a,b) => a+(b.quantity*b.unit_price),0).toFixed(2)}</span>
              </div>
            </div>

            {/* ACTIE KNOPPEN */}
            <div className="space-y-2">
              <button 
                onClick={() => handleDeleteSale(selectedSaleDetails.id)}
                className="w-full bg-red-50 text-red-600 py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest border border-red-100"
              >
                🗑️ Verwijderen
              </button>
              <button 
                onClick={() => setSelectedSaleDetails(null)} 
                className="w-full bg-slate-800 text-white py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest"
              >
                Sluiten
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
