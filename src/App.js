import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

function App() {
  const [session, setSession] = useState(null);
  const [view, setView] = useState('register'); // 'register' of 'history_12m'
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

  // Berekening voor de tabel van de voorbije 12 maanden
  const get12MonthSummary = () => {
    const summary = [];
    const now = new Date();
    
    for (let i = 0; i < 12; i++) {
      const targetDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const m = targetDate.getMonth();
      const y = targetDate.getFullYear();
      
      const monthlyTotal = salesHistory.reduce((acc, sale) => {
        const sDate = new Date(sale.surgery_date);
        if (sDate.getMonth() === m && sDate.getFullYear() === y) {
          return acc + sale.Sale_Items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
        }
        return acc;
      }, 0);

      summary.push({
        label: new Intl.DateTimeFormat('nl-BE', { month: 'long', year: 'numeric' }).format(targetDate),
        total: monthlyTotal
      });
    }
    return summary;
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
    setCart([]); fetchAllData(); alert("Geregistreerd!");
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 text-sm">
        <form onSubmit={handleLogin} className="bg-white p-8 rounded-3xl shadow-2xl max-w-sm w-full font-sans">
          <h2 className="text-2xl font-bold mb-6 text-center text-slate-800 tracking-tight">Login MedSales</h2>
          <input type="email" placeholder="E-mail" className="w-full p-3 border rounded-xl mb-4 bg-gray-50" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <input type="password" placeholder="Wachtwoord" className="w-full p-3 border rounded-xl mb-6 bg-gray-50" value={password} onChange={(e) => setPassword(e.target.value)} required />
          <button className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition shadow-lg">Inloggen</button>
        </form>
      </div>
    );
  }

  const twelveMonthData = get12MonthSummary();
  const currentMonthValue = twelveMonthData[0].total;

  return (
    <div className="min-h-screen bg-gray-100 font-sans pb-10">
      <nav className="bg-slate-800 text-white p-4 mb-6 flex justify-between items-center shadow-lg sticky top-0 z-20">
        <h1 className="font-bold tracking-tight cursor-pointer" onClick={() => setView('register')}>MEDSALES PRO</h1>
        <button onClick={() => supabase.auth.signOut()} className="text-[10px] uppercase tracking-widest bg-slate-700 px-3 py-1.5 rounded-lg border border-slate-600">Log uit</button>
      </nav>

      <div className="max-w-4xl mx-auto px-4">
        {view === 'register' ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6 text-sm">
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200">
                <p className="text-[10px] font-black text-blue-600 uppercase mb-3 tracking-widest">Ingreep</p>
                <input type="date" className="w-full p-2 border rounded-xl bg-gray-50 mb-2" value={surgeryDate} onChange={(e) => setSurgeryDate(e.target.value)} />
                <select className="w-full p-2 border rounded-xl bg-gray-50 mb-2" value={selectedHospital} onChange={(e) => setSelectedHospital(e.target.value)}>
                  <option value="">Kies Ziekenhuis...</option>
                  {hospitals.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                </select>
                <select className="w-full p-2 border rounded-xl bg-gray-50" value={selectedSurgeon} onChange={(e) => setSelectedSurgeon(e.target.value)}>
                  <option value="">Kies Chirurg...</option>
                  {surgeons.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>

              <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200 text-sm">
                <p className="text-[10px] font-black text-blue-600 uppercase mb-3 tracking-widest">Product</p>
                <select className="w-full p-2 border rounded-xl bg-gray-50 mb-3" value={selectedProduct} onChange={(e) => setSelectedProduct(e.target.value)}>
                  <option value="">Kies Implantaat...</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <div className="flex gap-2">
                  <input type="number" className="w-16 p-2 border rounded-xl bg-gray-50" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
                  <button onClick={() => {
                    const p = products.find(x => x.id.toString() === selectedProduct);
                    if(p) {
                        setCart([...cart, { product_id: p.id, name: p.name, price: p.price, quantity: parseInt(quantity) }]);
                        setSelectedProduct('');
                        setQuantity(1);
                    }
                  }} className="flex-grow bg-emerald-600 text-white font-bold rounded-xl shadow-md hover:bg-emerald-700 active:scale-95 transition">VOEG TOE</button>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200 flex flex-col">
                <p className="text-[10px] font-black text-blue-600 uppercase mb-3 tracking-widest">Mandje</p>
                <div className="flex-grow text-[11px] space-y-1 mb-4">
                  {cart.map((item, i) => (
                    <div key={i} className="flex justify-between items-center bg-gray-50 p-2 rounded-lg border border-gray-100 italic">
                      <span>{item.quantity}x {item.name}</span>
                      <button onClick={() => setCart(cart.filter((_, idx)
