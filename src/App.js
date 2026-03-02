import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

function App() {
  const [session, setSession] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // App states
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

  // 1. Check of er al een sessie is (ingelogd)
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
  }, []);

  // 2. Data ophalen als we ingelogd zijn
  useEffect(() => {
    if (session) {
      fetchInitialData();
      fetchSalesHistory();
    }
  }, [session]);

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert("Inloggen mislukt: " + error.message);
    setLoading(false);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    setSession(null);
  }

  async function fetchInitialData() {
    const { data: hosp } = await supabase.from('Hospitals').select('*').order('name');
    const { data: surg } = await supabase.from('Surgeons').select('*').order('name');
    const { data: prod } = await supabase.from('Products').select('*').order('sort_order', { ascending: true });
    setHospitals(hosp || []); setSurgeons(surg || []); setProducts(prod || []);
  }

  async function fetchSalesHistory() {
    const { data } = await supabase.from('Sales').select(`id, surgery_date, Hospitals (name), Surgeons (name), Sale_Items (quantity, unit_price, Products (name))`).order('surgery_date', { ascending: false });
    setSalesHistory(data || []);
  }

  async function handleSaveSale() {
    if (!selectedHospital || !selectedSurgeon || cart.length === 0) return alert("Vul alles in.");
    const { data: sale, error: saleError } = await supabase.from('Sales').insert([{ hospital_id: parseInt(selectedHospital), surgeon_id: parseInt(selectedSurgeon), surgery_date: surgeryDate }]).select();
    if (saleError) return alert(saleError.message);
    const itemsToInsert = cart.map(item => ({ sale_id: sale[0].id, product_id: item.product_id, quantity: item.quantity, unit_price: item.price }));
    await supabase.from('Sale_Items').insert(itemsToInsert);
    setCart([]); fetchSalesHistory(); alert("Geregistreerd!");
  }

  // --- INLOG SCHERM ---
  if (!session) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-6">
        <form onSubmit={handleLogin} className="bg-white p-8 rounded-2xl shadow-xl max-w-sm w-full">
          <h2 className="text-2xl font-bold mb-6 text-center text-blue-900">Medical Sales Login</h2>
          <div className="space-y-4">
            <input type="email" placeholder="E-mailadres" className="w-full p-3 border rounded-xl" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <input type="password" placeholder="Wachtwoord" className="w-full p-3 border rounded-xl" value={password} onChange={(e) => setPassword(e.target.value)} required />
            <button disabled={loading} className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition">
              {loading ? 'Laden...' : 'Inloggen'}
            </button>
          </div>
        </form>
      </div>
    );
  }

  // --- DASHBOARD (Als ingelogd) ---
  return (
    <div className="min-h-screen bg-gray-100 font-sans pb-10">
      <nav className="bg-blue-900 text-white p-4 mb-6 shadow-md flex justify-between items-center">
        <h1 className="font-bold">OK Registratie</h1>
        <button onClick={handleLogout} className="text-xs bg-blue-800 px-3 py-1 rounded">Uitloggen</button>
      </nav>
      {/* Rest van je bestaande UI voor registratie en historiek... */}
      <div className="max-w-6xl mx-auto px-4">
        {/* Hier komt de rest van je registratie code die we eerder hebben gemaakt */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8 text-sm">
           {/* ... (kopieer hier de 3 kolommen voor registratie uit de vorige App.js) ... */}
           <div className="bg-white p-5 rounded-xl shadow-sm border">
            <h2 className="font-bold mb-3 text-blue-700 uppercase text-xs">1. Ingreep Info</h2>
            <input type="date" className="w-full p-2 border mb-3 rounded" value={surgeryDate} onChange={(e) => setSurgeryDate(e.target.value)} />
            <select className="w-full p-2 border mb-3 rounded" value={selectedHospital} onChange={(e) => setSelectedHospital(e.target.value)}>
              <option value="">Ziekenhuis...</option>
              {hospitals.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
            </select>
            <select className="w-full p-2 border rounded" value={selectedSurgeon} onChange={(e) => setSelectedSurgeon(e.target.value)}>
              <option value="">Chirurg...</option>
              {surgeons.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="bg-white p-5 rounded-xl shadow-sm border">
            <h2 className="font-bold mb-3 text-blue-700 uppercase text-xs">2. Producten</h2>
            <select className="w-full p-2 border mb-3 rounded" value={selectedProduct} onChange={(e) => setSelectedProduct(e.target.value)}>
              <option value="">Kies implantaat...</option>
              {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <div className="flex gap-2">
              <input type="number" className="w-20 p-2 border rounded" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
              <button onClick={() => {
                const p = products.find(x => x.id.toString() === selectedProduct);
                if(p) setCart([...cart, { ...p, product_id: p.id, quantity: parseInt(quantity) }]);
              }} className="flex-grow bg-green-600 text-white font-bold rounded">VOEG TOE</button>
            </div>
          </div>
          <div className="bg-white p-5 rounded-xl shadow-sm border flex flex-col">
            <h2 className="font-bold mb-3 text-blue-700 uppercase text-xs">3. Mandje</h2>
            <div className="flex-grow mb-3 italic text-gray-500">
              {cart.map((item, i) => <div key={i} className="border-b py-1">{item.quantity}x {item.name}</div>)}
            </div>
            <button onClick={handleSaveSale} className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold">OPSLAAN</button>
          </div>
        </div>

        {/* Historiek Tabel */}
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 uppercase text-xs text-gray-500">
              <tr><th className="p-4">Datum</th><th className="p-4">Klant</th><th className="p-4 text-right">Totaal</th></tr>
            </thead>
            <tbody className="divide-y">
              {salesHistory.map(s => (
                <tr key={s.id} onClick={() => setSelectedSaleDetails(s)} className="hover:bg-blue-50 cursor-pointer">
                  <td className="p-4">{s.surgery_date}</td>
                  <td className="p-4">{s.Hospitals?.name}<br/><span className="text-xs text-gray-400">{s.Surgeons?.name}</span></td>
                  <td className="p-4 text-right font-bold">€{s.Sale_Items.reduce((a,b) => a+(b.quantity*b.unit_price),0).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {/* Modal Details */}
      {selectedSaleDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6">
            <h3 className="text-xl font-bold mb-4 border-b pb-2 text-gray-800">Details Ingreep</h3>
            <ul className="space-y-2 mb-6 text-sm">
              {selectedSaleDetails.Sale_Items.map((item, idx) => (
                <li key={idx} className="flex justify-between border-b pb-1"><span>{item.quantity}x {item.Products?.name}</span><span>€{(item.quantity * item.unit_price).toFixed(2)}</span></li>
              ))}
            </ul>
            <button onClick={() => setSelectedSaleDetails(null)} className="w-full bg-gray-800 text-white py-2 rounded-lg">Sluiten</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
