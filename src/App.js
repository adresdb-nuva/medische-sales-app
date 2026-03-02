import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

function App() {
  const [session, setSession] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // App data states
  const [hospitals, setHospitals] = useState([]);
  const [surgeons, setSurgeons] = useState([]);
  const [products, setProducts] = useState([]);
  const [salesHistory, setSalesHistory] = useState([]);
  
  // Form states
  const [selectedHospital, setSelectedHospital] = useState('');
  const [selectedSurgeon, setSelectedSurgeon] = useState('');
  const [surgeryDate, setSurgeryDate] = useState(new Date().toISOString().split('T')[0]);
  const [cart, setCart] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [selectedSaleDetails, setSelectedSaleDetails] = useState(null);

  // 1. Luister naar inlog-status
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // 2. Data pas ophalen ALS er een sessie (login) is
  useEffect(() => {
    if (session) {
      fetchAllData();
    }
  }, [session]);

  async function fetchAllData() {
    try {
      // Haal alles tegelijk op
      const [hosp, surg, prod, sales] = await Promise.all([
        supabase.from('Hospitals').select('*').order('name'),
        supabase.from('Surgeons').select('*').order('name'),
        supabase.from('Products').select('*').order('sort_order', { ascending: true }),
        supabase.from('Sales').select(`
          id, 
          surgery_date, 
          Hospitals (name), 
          Surgeons (name),
          Sale_Items (quantity, unit_price, Products (name))
        `).order('surgery_date', { ascending: false })
      ]);

      setHospitals(hosp.data || []);
      setSurgeons(surg.data || []);
      setProducts(prod.data || []);
      setSalesHistory(sales.data || []);
    } catch (err) {
      console.error("Fout bij ophalen data:", err);
    }
  }

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert("Fout: " + error.message);
    setLoading(false);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    setSession(null);
    // Maak alles leeg bij uitloggen
    setHospitals([]); setSurgeons([]); setProducts([]); setSalesHistory([]);
  }

  async function handleSaveSale() {
    if (!selectedHospital || !selectedSurgeon || cart.length === 0) return alert("Vul alle velden in.");
    
    const { data: sale, error: saleError } = await supabase.from('Sales').insert([{ 
      hospital_id: parseInt(selectedHospital), 
      surgeon_id: parseInt(selectedSurgeon), 
      surgery_date: surgeryDate 
    }]).select();

    if (saleError) return alert("Sales error: " + saleError.message);

    const itemsToInsert = cart.map(item => ({ 
      sale_id: sale[0].id, 
      product_id: item.product_id, 
      quantity: item.quantity, 
      unit_price: item.price 
    }));

    const { error: itemError } = await supabase.from('Sale_Items').insert(itemsToInsert);

    if (!itemError) {
      alert("Succesvol geregistreerd!");
      setCart([]);
      fetchAllData(); // Ververs de lijst
    } else {
      alert("Item error: " + itemError.message);
    }
  }

  // --- LOGIN SCHERM ---
  if (!session) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
        <form onSubmit={handleLogin} className="bg-white p-8 rounded-2xl shadow-2xl max-w-sm w-full">
          <h2 className="text-2xl font-bold mb-6 text-center text-slate-800">OK Sales Inlog</h2>
          <div className="space-y-4">
            <input type="email" placeholder="E-mail" className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <input type="password" placeholder="Wachtwoord" className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500" value={password} onChange={(e) => setPassword(e.target.value)} required />
            <button disabled={loading} className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition disabled:bg-gray-400">
              {loading ? 'Bezig...' : 'Inloggen'}
            </button>
          </div>
        </form>
      </div>
    );
  }

  // --- HOOFDSCHERM ---
  return (
    <div className="min-h-screen bg-gray-50 font-sans pb-10">
      <nav className="bg-slate-800 text-white p-4 mb-6 flex justify-between items-center sticky top-0 z-10 shadow-md">
        <h1 className="font-bold tracking-tight">MEDICAL SALES</h1>
        <button onClick={handleLogout} className="text-xs border border-slate-500 px-3 py-1 rounded-lg hover:bg-slate-700">Uitloggen</button>
      </nav>

      <div className="max-w-6xl mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8 text-sm">
          {/* 1. Info */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
            <h2 className="font-bold mb-4 text-blue-600 uppercase text-xs">1. Ingreep Info</h2>
            <div className="space-y-3">
              <input type="date" className="w-full p-2.5 border rounded-xl bg-gray-50" value={surgeryDate} onChange={(e) => setSurgeryDate(e.target.value)} />
              <select className="w-full p-2.5 border rounded-xl bg-gray-50" value={selectedHospital} onChange={(e) => setSelectedHospital(e.target.value)}>
                <option value="">Kies ziekenhuis...</option>
                {hospitals.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
              </select>
              <select className="w-full p-2.5 border rounded-xl bg-gray-50" value={selectedSurgeon} onChange={(e) => setSelectedSurgeon(e.target.value)}>
                <option value="">Kies chirurg...</option>
                {surgeons.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>

          {/* 2. Producten */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
            <h2 className="font-bold mb-4 text-blue-600 uppercase text-xs">2. Implantaat</h2>
            <div className="space-y-3">
              <select className="w-full p-2.5 border rounded-xl bg-gray-50" value={selectedProduct} onChange={(e) => setSelectedProduct(e.target.value)}>
                <option value="">Kies product...</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <div className="flex gap-2">
                <input type="number" className="w-20 p-2.5 border rounded-xl bg-gray-50" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
                <button onClick={() => {
                  const p = products.find(x => x.id.toString() === selectedProduct);
                  if(p) {
                    setCart([...cart, { product_id: p.id, name: p.name, price: p.price, quantity: parseInt(quantity) }]);
                    setSelectedProduct(''); setQuantity(1);
                  }
                }} className="flex-grow bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700">TOEVOEGEN</button>
              </div>
            </div>
          </div>

          {/* 3. Mandje */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col">
            <h2 className="font-bold mb-4 text-blue-600 uppercase text-xs">3. Overzicht Mandje</h2>
            <div className="flex-grow space-y-2 mb-4">
              {cart.length === 0 && <p className="text-gray-400 italic text-xs">Geen producten geselecteerd...</p>}
              {cart.map((item, i) => (
                <div key={i} className="flex justify-between items-center text-xs bg-blue-50 p-2 rounded-lg">
                  <span>{item.quantity}x {item.name}</span>
                  <button onClick={() => setCart(cart.filter((_, idx) => idx !== i))} className="text-red-500 font-bold ml-2">✕</button>
                </div>
              ))}
            </div>
            <button onClick={handleSaveSale} className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold shadow-lg hover:bg-blue-700 transition">INGREEP OPSLAAN</button>
          </div>
        </div>

        {/* Historiek */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-5 border-b bg-gray-50">
            <h2 className="font-bold text-gray-700">Historiek Ingrepen</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-100 text-gray-500 text-xs uppercase">
                <tr><th className="p-4">Datum</th><th className="p-4">Info</th><th className="p-4 text-right">Totaal</th></tr>
              </thead>
              <tbody className="divide-y">
                {salesHistory.map(s => (
                  <tr key={s.id} onClick={() => setSelectedSaleDetails(s)} className="hover:bg-blue-50 cursor-pointer transition">
                    <td className="p-4 font-medium whitespace-nowrap">{s.surgery_date}</td>
                    <td className="p-4">
                      <div className="font-bold text-gray-800">{s.Hospitals?.name}</div>
                      <div className="text-xs text-gray-500">{s.Surgeons?.name}</div>
                    </td>
                    <td className="p-4 text-right font-bold text-blue-700 whitespace-nowrap">
                      €{s.Sale_Items.reduce((a,b) => a+(b.quantity*b.unit_price),0).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedSaleDetails && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-lg">Details Producten</h3>
              <button onClick={() => setSelectedSaleDetails(null)} className="text-gray-400 text-2xl">✕</button>
            </div>
            <div className="space-y-3 mb-6 bg-gray-50 p-4 rounded-2xl">
              {selectedSaleDetails.Sale_Items.map((item, idx) => (
                <div key={idx} className="flex justify-between text-sm border-b border-gray-200 pb-2 italic">
                  <span>{item.quantity}x {item.Products?.name}</span>
                  <span>€{(item.quantity * item.unit_price).toFixed(2)}</span>
                </div>
              ))}
              <div className="flex justify-between font-bold text-blue-800 pt-2 text-base">
                <span>Totaal</span>
                <span>€{selectedSaleDetails.Sale_Items.reduce((a,b) => a+(b.quantity*b.unit_price),0).toFixed(2)}</span>
              </div>
            </div>
            <button onClick={() => setSelectedSaleDetails(null)} className="w-full bg-slate-800 text-white py-3 rounded-2xl font-bold">Sluiten</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
