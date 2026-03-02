import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

function App() {
  const [session, setSession] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

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

  // NIEUW: Berekening maandtotaal
  const calculateMonthlyTotal = () => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    return salesHistory.reduce((acc, sale) => {
      const saleDate = new Date(sale.surgery_date);
      if (saleDate.getMonth() === currentMonth && saleDate.getFullYear() === currentYear) {
        const saleTotal = sale.Sale_Items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
        return acc + saleTotal;
      }
      return acc;
    }, 0);
  };

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert(error.message);
    setLoading(false);
  }

  async function handleSaveSale() {
    if (!selectedHospital || !selectedSurgeon || cart.length === 0) return alert("Vul alles in.");
    const { data: sale, error: saleError } = await supabase.from('Sales').insert([{ hospital_id: parseInt(selectedHospital), surgeon_id: parseInt(selectedSurgeon), surgery_date: surgeryDate }]).select();
    if (saleError) return alert(saleError.message);
    const itemsToInsert = cart.map(item => ({ sale_id: sale[0].id, product_id: item.product_id, quantity: item.quantity, unit_price: item.price }));
    await supabase.from('Sale_Items').insert(itemsToInsert);
    setCart([]); fetchAllData(); alert("Succesvol geregistreerd!");
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
        <form onSubmit={handleLogin} className="bg-white p-8 rounded-2xl shadow-2xl max-w-sm w-full">
          <h2 className="text-2xl font-bold mb-6 text-center text-slate-800">OK Sales Inlog</h2>
          <input type="email" placeholder="E-mail" className="w-full p-3 border rounded-xl mb-4" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <input type="password" placeholder="Wachtwoord" className="w-full p-3 border rounded-xl mb-6" value={password} onChange={(e) => setPassword(e.target.value)} required />
          <button className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold">Inloggen</button>
        </form>
      </div>
    );
  }

  const monthlyTotal = calculateMonthlyTotal();
  const monthName = new Intl.DateTimeFormat('nl-BE', { month: 'long' }).format(new Date());

  return (
    <div className="min-h-screen bg-gray-50 font-sans pb-10">
      <nav className="bg-slate-800 text-white p-4 mb-6 flex justify-between items-center shadow-md">
        <h1 className="font-bold">MEDICAL SALES</h1>
        <button onClick={() => supabase.auth.signOut()} className="text-xs border border-slate-500 px-3 py-1 rounded-lg">Uitloggen</button>
      </nav>

      <div className="max-w-6xl mx-auto px-4">
        {/* Input Velden (Bestaande code) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8 text-sm">
          <div className="bg-white p-5 rounded-2xl shadow-sm border">
            <h2 className="font-bold mb-4 text-blue-600 uppercase text-xs">1. Ingreep Info</h2>
            <div className="space-y-3">
              <input type="date" className="w-full p-2 border rounded-xl" value={surgeryDate} onChange={(e) => setSurgeryDate(e.target.value)} />
              <select className="w-full p-2 border rounded-xl" value={selectedHospital} onChange={(e) => setSelectedHospital(e.target.value)}>
                <option value="">Ziekenhuis...</option>
                {hospitals.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
              </select>
              <select className="w-full p-2 border rounded-xl" value={selectedSurgeon} onChange={(e) => setSelectedSurgeon(e.target.value)}>
                <option value="">Chirurg...</option>
                {surgeons.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>
          <div className="bg-white p-5 rounded-2xl shadow-sm border">
            <h2 className="font-bold mb-4 text-blue-600 uppercase text-xs">2. Implantaat</h2>
            <select className="w-full p-2 border rounded-xl mb-3" value={selectedProduct} onChange={(e) => setSelectedProduct(e.target.value)}>
              <option value="">Kies product...</option>
              {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <div className="flex gap-2">
              <input type="number" className="w-20 p-2 border rounded-xl" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
              <button onClick={() => {
                const p = products.find(x => x.id.toString() === selectedProduct);
                if(p) setCart([...cart, { product_id: p.id, name: p.name, price: p.price, quantity: parseInt(quantity) }]);
              }} className="flex-grow bg-emerald-600 text-white font-bold rounded-xl">ADD</button>
            </div>
          </div>
          <div className="bg-white p-5 rounded-2xl shadow-sm border flex flex-col">
            <h2 className="font-bold mb-4 text-blue-600 uppercase text-xs">3. Mandje</h2>
            <div className="flex-grow text-xs mb-4">
              {cart.map((item, i) => <div key={i} className="border-b py-1 flex justify-between"><span>{item.quantity}x {item.name}</span><button onClick={() => setCart(cart.filter((_, idx) => idx !== i))} className="text-red-500">✕</button></div>)}
            </div>
            <button onClick={handleSaveSale} className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold shadow-lg">OPSLAAN</button>
          </div>
        </div>

        {/* Historiek Tabel */}
        <div className="bg-white rounded-2xl shadow-sm border overflow-hidden mb-6">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-100 text-gray-500 text-xs uppercase">
              <tr><th className="p-4">Datum</th><th className="p-4">Info</th><th className="p-4 text-right">Totaal</th></tr>
            </thead>
            <tbody className="divide-y">
              {salesHistory.map(s => (
                <tr key={s.id} onClick={() => setSelectedSaleDetails(s)} className="hover:bg-blue-50 cursor-pointer transition">
                  <td className="p-4 whitespace-nowrap">{s.surgery_date}</td>
                  <td className="p-4"><strong>{s.Hospitals?.name}</strong><br/><span className="text-xs text-gray-500">{s.Surgeons?.name}</span></td>
                  <td className="p-4 text-right font-bold text-blue-700">€{s.Sale_Items.reduce((a,b) => a+(b.quantity*b.unit_price),0).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* NIEUW: Maandtotaal Statistiek Blok */}
        <div className="bg-blue-900 text-white p-6 rounded-3xl shadow-xl flex justify-between items-center">
          <div>
            <p className="text-blue-200 text-xs uppercase font-bold tracking-widest mb-1">Totaal Omzet {monthName}</p>
            <h2 className="text-3xl font-extrabold italic">€ {monthlyTotal.toLocaleString('nl-BE', { minimumFractionDigits: 2 })}</h2>
          </div>
          <div className="bg-blue-800 p-4 rounded-2xl">
            <span className="text-2xl">📈</span>
          </div>
        </div>

      </div>

      {/* Detail Modal (Bestaande code) */}
      {selectedSaleDetails && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm" onClick={() => setSelectedSaleDetails(null)}>
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-lg mb-4">Details Producten</h3>
            <div className="bg-gray-50 p-4 rounded-2xl mb-6">
              {selectedSaleDetails.Sale_Items.map((item, idx) => (
                <div key={idx} className="flex justify-between text-sm border-b py-2 italic">
                  <span>{item.quantity}x {item.Products?.name}</span>
                  <span>€{(item.quantity * item.unit_price).toFixed(2)}</span>
                </div>
              ))}
              <div className="flex justify-between font-bold text-blue-800 pt-3 text-lg">
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
