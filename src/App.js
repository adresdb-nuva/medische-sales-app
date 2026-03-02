import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

function App() {
  const [session, setSession] = useState(null);
  const [view, setView] = useState('register'); // Schakelt tussen 'register' en 'stats'
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

  // Berekening voor de voorbije 12 maanden
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
      summary.push({
        label: new Intl.DateTimeFormat('nl-BE', { month: 'long', year: 'numeric' }).format(d),
        total: total
      });
    }
    return summary;
  };

  async function handleLogin(e) {
    e.preventDefault();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert("Inloggen mislukt: " + error.message);
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
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
        <form onSubmit={handleLogin} className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-xs">
          <h2 className="text-xl font-bold mb-6 text-center text-slate-800">Login MedSales</h2>
          <input type="email" placeholder="E-mail" className="w-full p-3 border rounded-xl mb-4" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <input type="password" placeholder="Wachtwoord" className="w-full p-3 border rounded-xl mb-6" value={password} onChange={(e) => setPassword(e.target.value)} required />
          <button className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold">Inloggen</button>
        </form>
      </div>
    );
  }

  const twelveMonthData = get12MonthSummary();

  return (
    <div className="min-h-screen bg-gray-100 font-sans pb-10">
      <nav className="bg-slate-800 text-white p-4 mb-6 flex justify-between items-center shadow-lg">
        <h1 className="font-bold cursor-pointer" onClick={() => setView('register')}>MEDSALES PRO</h1>
        <button onClick={() => supabase.auth.signOut()} className="text-[10px] bg-slate-700 px-3 py-1 rounded border border-slate-600">UITLOGGEN</button>
      </nav>

      <div className="max-w-4xl mx-auto px-4">
        
        {/* WEERGAVE 1: REGISTRATIE */}
        {view === 'register' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="bg-white p-5 rounded-2xl shadow-sm border">
                <p className="text-[10px] font-bold text-blue-600 uppercase mb-2">1. Ingreep</p>
                <input type="date" className="w-full p-2 border rounded-xl mb-2" value={surgeryDate} onChange={(e) => setSurgeryDate(e.target.value)} />
                <select className="w-full p-2 border rounded-xl mb-2" value={selectedHospital} onChange={(e) => setSelectedHospital(e.target.value)}>
                  <option value="">Ziekenhuis...</option>
                  {hospitals.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                </select>
                <select className="w-full p-2 border rounded-xl" value={selectedSurgeon} onChange={(e) => setSelectedSurgeon(e.target.value)}>
                  <option value="">Chirurg...</option>
                  {surgeons.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>

              <div className="bg-white p-5 rounded-2xl shadow-sm border">
                <p className="text-[10px] font-bold text-blue-600 uppercase mb-2">2. Product</p>
                <select className="w-full p-2 border rounded-xl mb-2" value={selectedProduct} onChange={(e) => setSelectedProduct(e.target.value)}>
                  <option value="">Kies implantaat...</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <div className="flex gap-2">
                  <input type="number" className="w-16 p-2 border rounded-xl" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
                  <button onClick={() => {
                    const p = products.find(x => x.id.toString() === selectedProduct);
                    if(p) setCart([...cart, { product_id: p.id, name: p.name, price: p.price, quantity: parseInt(quantity) }]);
                  }} className="flex-grow bg-emerald-600 text-white font-bold rounded-xl">ADD</button>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl shadow-sm border flex flex-col">
                <p className="text-[10px] font-bold text-blue-600 uppercase mb-2">3. Mandje</p>
                <div className="flex-grow text-[11px] mb-4">
                  {cart.map((item, i) => <div key={i} className="flex justify-between border-b py-1"><span>{item.quantity}x {item.name}</span><button onClick={() => setCart(cart.filter((_, idx) => idx !== i))} className="text-red-500 font-bold ml-2">✕</button></div>)}
                </div>
                <button onClick={handleSaveSale} className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold shadow-lg">OPSLAAN</button>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
               <table className="w-full text-left text-xs">
                  <tbody className="divide-y">
                    {salesHistory.slice(0, 5).map(s => (
                      <tr key={s.id} onClick={() => setSelectedSaleDetails(s)} className="hover:bg-blue-50 cursor-pointer">
                        <td className="p-4 text-gray-400">{s.surgery_date.split('-').reverse().join('/')}</td>
                        <td className="p-4 font-bold">{s.Hospitals?.name}</td>
                        <td className="p-4 text-right font-black text-blue-800">€{s.Sale_Items.reduce((a,b) => a+(b.quantity*b.unit_price),0).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
               </table>
            </div>

            {/* DE BLAUWE BALK - NU MET EXPLICIETE ONCLICK */}
            <div 
              onClick={() => { console.log("Klik op balk!"); setView('stats'); }}
              className="bg-gradient-to-r from-blue-900 to-indigo-800 text-white p-6 rounded-3xl shadow-xl flex justify-between items-center cursor-pointer active:scale-95 transition-transform"
            >
              <div>
                <p className="text-blue-300 text-[10px] font-bold uppercase tracking-widest mb-1">Huidige maand</p>
                <h2 className="text-3xl font-black italic">€ {twelveMonthData[0].total.toLocaleString('nl-BE', { minimumFractionDigits: 2 })}</h2>
              </div>
              <div className="bg-white/20 px-3 py-2 rounded-xl text-[10px] font-bold border border-white/20 uppercase tracking-tighter">
                Jaaroverzicht ➔
              </div>
            </div>
          </div>
        )}

        {/* WEERGAVE 2: JAAROVERZICHT */}
        {view === 'stats' && (
          <div className="bg-white rounded-3xl shadow-2xl border overflow-hidden">
            <div className="p-6 bg-slate-800 text-white flex justify-between items-center">
              <h2 className="text-xl font-bold tracking-tight">Voorbije 12 Maanden</h2>
              <button onClick={() => setView('register')} className="bg-white text-slate-800 px-4 py-1 rounded-full font-bold text-xs uppercase">Terug</button>
            </div>
            <div className="p-4 space-y-2">
              {twelveMonthData.map((m, i) => (
                <div key={i} className={`flex justify-between items-center p-4 rounded-2xl border ${i === 0 ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-100'}`}>
                  <span className={`text-xs font-bold ${i === 0 ? 'text-blue-800' : 'text-gray-500'} capitalize`}>{m.label}</span>
                  <span className={`text-base font-black ${i === 0 ? 'text-blue-900' : 'text-gray-800'}`}>€ {m.total.toLocaleString('nl-BE', { minimumFractionDigits: 2 })}</span>
                </div>
              ))}
            </div>
            <div className="p-6 text-center">
              <button onClick={() => setView('register')} className="text-blue-600 font-bold text-xs uppercase">Ga terug naar Registratie</button>
            </div>
          </div>
        )}

      </div>

      {/* Detail Modal */}
      {selectedSaleDetails && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50 backdrop-blur-sm" onClick={() => setSelectedSaleDetails(null)}>
          <div className="bg-white rounded-3xl max-w-xs w-full p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold mb-4">Details</h3>
            <div className="bg-gray-50 p-4 rounded-xl mb-6 space-y-2 text-[11px]">
              {selectedSaleDetails.Sale_Items.map((item, idx) => (
                <div key={idx} className="flex justify-between border-b pb-2">
                  <span>{item.quantity}x {item.Products?.name}</span>
                  <span className="font-bold text-gray-700">€{(item.quantity * item.unit_price).toFixed(2)}</span>
                </div>
              ))}
              <div className="flex justify-between font-black text-blue-900 pt-2 text-base">
                <span>Totaal</span>
                <span>€{selectedSaleDetails.Sale_Items.reduce((a,b) => a+(b.quantity*b.unit_price),0).toFixed(2)}</span>
              </div>
            </div>
            <button onClick={() => setSelectedSaleDetails(null)} className="w-full bg-slate-800 text-white py-3 rounded-xl font-bold">Sluiten</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
