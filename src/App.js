import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

function App() {
  const [hospitals, setHospitals] = useState([]);
  const [surgeons, setSurgeons] = useState([]);
  const [products, setProducts] = useState([]);
  const [salesHistory, setSalesHistory] = useState([]); // Nieuw: Voor het overzicht
  
  const [selectedHospital, setSelectedHospital] = useState('');
  const [selectedSurgeon, setSelectedSurgeon] = useState('');
  const [surgeryDate, setSurgeryDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [cart, setCart] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    fetchInitialData();
    fetchSalesHistory();
  }, []);

  async function fetchInitialData() {
    const { data: hosp } = await supabase.from('Hospitals').select('*');
    const { data: surg } = await supabase.from('Surgeons').select('*');
    const { data: prod } = await supabase.from('Products').select('*');
    setHospitals(hosp || []);
    setSurgeons(surg || []);
    setProducts(prod || []);
  }

  // NIEUW: Haal de geschiedenis op
  async function fetchSalesHistory() {
    const { data, error } = await supabase
      .from('Sales')
      .select(`
        id, 
        surgery_date, 
        Hospitals (name), 
        Surgeons (name),
        Sale_Items (quantity, unit_price)
      `)
      .order('surgery_date', { ascending: false });

    if (!error) setSalesHistory(data || []);
  }

  const addToCart = () => {
    if (!selectedProduct) return;
    const product = products.find(p => p.id.toString() === selectedProduct);
    setCart([...cart, {
      product_id: product.id,
      name: product.name,
      price: product.price,
      quantity: parseInt(quantity)
    }]);
    setSelectedProduct('');
    setQuantity(1);
  };

  async function handleSaveSale() {
    if (!selectedHospital || !selectedSurgeon || cart.length === 0) {
      alert("Vul alle velden in.");
      return;
    }

    const { data: sale, error: saleError } = await supabase
      .from('Sales') 
      .insert([{ 
        hospital_id: parseInt(selectedHospital), 
        surgeon_id: parseInt(selectedSurgeon),
        surgery_date: surgeryDate
      }])
      .select();

    if (saleError) return alert(saleError.message);

    const itemsToInsert = cart.map(item => ({
      sale_id: sale[0].id,
      product_id: item.product_id,
      quantity: item.quantity,
      unit_price: item.price
    }));

    const { error: itemError } = await supabase.from('Sale_Items').insert(itemsToInsert);

    if (!itemError) {
      alert("Geregistreerd!");
      setCart([]);
      fetchSalesHistory(); // Ververs de lijst direct
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8 font-sans">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Operatie Dashboard</h1>
        
        {/* INPUT SECTIE */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12">
          <div className="bg-white p-6 rounded-xl shadow-sm border">
            <h2 className="font-bold mb-4 text-blue-700 uppercase text-sm tracking-wider">1. Basis Info</h2>
            <div className="space-y-4">
              <input type="date" className="w-full p-2 border rounded" value={surgeryDate} onChange={(e) => setSurgeryDate(e.target.value)} />
              <select className="w-full p-2 border rounded" value={selectedHospital} onChange={(e) => setSelectedHospital(e.target.value)}>
                <option value="">Ziekenhuis...</option>
                {hospitals.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
              </select>
              <select className="w-full p-2 border rounded" value={selectedSurgeon} onChange={(e) => setSelectedSurgeon(e.target.value)}>
                <option value="">Chirurg...</option>
                {surgeons.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border">
            <h2 className="font-bold mb-4 text-blue-700 uppercase text-sm tracking-wider">2. Producten</h2>
            <div className="space-y-4">
              <select className="w-full p-2 border rounded" value={selectedProduct} onChange={(e) => setSelectedProduct(e.target.value)}>
                <option value="">Kies implantaat...</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <input type="number" className="w-full p-2 border rounded" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
              <button onClick={addToCart} className="w-full bg-green-600 text-white py-2 rounded font-bold">+ Toevoegen</button>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border flex flex-col">
            <h2 className="font-bold mb-4 text-blue-700 uppercase text-sm tracking-wider">3. Mandje</h2>
            <div className="flex-grow text-sm mb-4">
              {cart.map((item, i) => <div key={i} className="border-b py-1 flex justify-between"><span>{item.quantity}x {item.name}</span></div>)}
            </div>
            <button onClick={handleSaveSale} className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold">OPSLAAN</button>
          </div>
        </div>

        {/* OVERZICHT SECTIE (Historiek) */}
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="p-6 border-b bg-gray-50">
            <h2 className="text-xl font-bold">Historiek Ingrepen</h2>
          </div>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-100 text-xs uppercase text-gray-600">
                <th className="p-4">Datum</th>
                <th className="p-4">Ziekenhuis</th>
                <th className="p-4">Chirurg</th>
                <th className="p-4">Producten</th>
                <th className="p-4">Totaal</th>
              </tr>
            </thead>
            <tbody className="divide-y text-sm">
              {salesHistory.map((sale) => {
                const total = sale.Sale_Items.reduce((acc, item) => acc + (item.quantity * item.unit_price), 0);
                return (
                  <tr key={sale.id} className="hover:bg-gray-50">
                    <td className="p-4 font-medium">{sale.surgery_date}</td>
                    <td className="p-4">{sale.Hospitals?.name}</td>
                    <td className="p-4">{sale.Surgeons?.name}</td>
                    <td className="p-4 text-gray-500">
                      {sale.Sale_Items.length} item(s)
                    </td>
                    <td className="p-4 font-bold text-blue-600">€{total.toFixed(2)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default App;
