import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

function App() {
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

  async function fetchSalesHistory() {
    const { data, error } = await supabase
      .from('Sales')
      .select(`
        id, 
        surgery_date, 
        Hospitals (name), 
        Surgeons (name),
        Sale_Items (quantity, unit_price, Products (name))
      `)
      .order('surgery_date', { ascending: false });
    if (!error) setSalesHistory(data || []);
  }

  const addToCart = () => {
    if (!selectedProduct) return;
    const product = products.find(p => p.id.toString() === selectedProduct);
    setCart([...cart, { product_id: product.id, name: product.name, price: product.price, quantity: parseInt(quantity) }]);
    setSelectedProduct('');
    setQuantity(1);
  };

  async function handleSaveSale() {
    if (!selectedHospital || !selectedSurgeon || cart.length === 0) return alert("Vul alle velden in.");
    const { data: sale, error: saleError } = await supabase.from('Sales').insert([{ hospital_id: parseInt(selectedHospital), surgeon_id: parseInt(selectedSurgeon), surgery_date: surgeryDate }]).select();
    if (saleError) return alert(saleError.message);
    const itemsToInsert = cart.map(item => ({ sale_id: sale[0].id, product_id: item.product_id, quantity: item.quantity, unit_price: item.price }));
    const { error: itemError } = await supabase.from('Sale_Items').insert(itemsToInsert);
    if (!itemError) { alert("Geregistreerd!"); setCart([]); fetchSalesHistory(); }
  }

  // NIEUW: Functie om een foutieve ingreep te verwijderen
  async function handleDeleteSale(e, id) {
    e.stopPropagation(); // Voorkomt dat het detailvenster opent
    if (window.confirm("Weet je zeker dat je deze operatie wilt verwijderen?")) {
      const { error } = await supabase.from('Sales').delete().eq('id', id);
      if (!error) {
        fetchSalesHistory();
      } else {
        alert("Fout bij verwijderen: " + error.message);
      }
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8 font-sans">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-gray-800">Operatie Dashboard</h1>
        
        {/* INPUT SECTIE (Blijft hetzelfde) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12">
           <div className="bg-white p-6 rounded-xl shadow-sm border">
            <h2 className="font-bold mb-4 text-blue-700 uppercase text-xs">1. Basis Info</h2>
            <div className="space-y-4">
              <input type="date" className="w-full p-2 border rounded bg-gray-50 text-sm" value={surgeryDate} onChange={(e) => setSurgeryDate(e.target.value)} />
              <select className="w-full p-2 border rounded bg-gray-50 text-sm" value={selectedHospital} onChange={(e) => setSelectedHospital(e.target.value)}>
                <option value="">Ziekenhuis...</option>
                {hospitals.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
              </select>
              <select className="w-full p-2 border rounded bg-gray-50 text-sm" value={selectedSurgeon} onChange={(e) => setSelectedSurgeon(e.target.value)}>
                <option value="">Chirurg...</option>
                {surgeons.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border text-sm">
            <h2 className="font-bold mb-4 text-blue-700 uppercase text-xs">2. Producten</h2>
            <div className="space-y-4">
              <select className="w-full p-2 border rounded bg-gray-50" value={selectedProduct} onChange={(e) => setSelectedProduct(e.target.value)}>
                <option value="">Kies implantaat...</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <div className="flex gap-2">
                <input type="number" className="w-full p-2 border rounded bg-gray-50" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
                <button onClick={addToCart} className="bg-green-600 text-white px-4 rounded font-bold hover:bg-green-700">ADD</button>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border flex flex-col">
            <h2 className="font-bold mb-4 text-blue-700 uppercase text-xs tracking-wider">3. Mandje</h2>
            <div className="flex-grow text-xs mb-4">
              {cart.map((item, i) => <div key={i} className="border-b py-1 flex justify-between"><span>{item.quantity}x {item.name}</span></div>)}
            </div>
            <button onClick={handleSaveSale} className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold shadow-md hover:bg-blue-700">OPSLAAN</button>
          </div>
        </div>

        {/* HISTORIEK MET VERWIJDEROPTIE */}
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="p-6 border-b bg-gray-50 flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-800">Historiek Ingrepen</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-100 text-xs uppercase text-gray-600">
                  <th className="p-4">Datum</th>
                  <th className="p-4">Ziekenhuis</th>
                  <th className="p-4">Chirurg</th>
                  <th className="p-4 text-right">Totaal</th>
                  <th className="p-4 text-center">Actie</th>
                </tr>
              </thead>
              <tbody className="divide-y text-sm">
                {salesHistory.map((sale) => {
                  const total = sale.Sale_Items.reduce((acc, item) => acc + (item.quantity * item.unit_price), 0);
                  return (
                    <tr key={sale.id} onClick={() => setSelectedSaleDetails(sale)} className="cursor-pointer hover:bg-blue-50 transition">
                      <td className="p-4 font-medium whitespace-nowrap">{sale.surgery_date}</td>
                      <td className="p-4">{sale.Hospitals?.name}</td>
                      <td className="p-4">{sale.Surgeons?.name}</td>
                      <td className="p-4 text-right font-bold text-blue-600 whitespace-nowrap">€{total.toFixed(2)}</td>
                      <td className="p-4 text-center">
                        <button 
                          onClick={(e) => handleDeleteSale(e, sale.id)} 
                          className="p-2 text-red-500 hover:bg-red-100 rounded-full transition"
                          title="Verwijderen"
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* DETAIL MODAL (Blijft hetzelfde) */}
        {selectedSaleDetails && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 shadow-2xl">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6">
              <div className="flex justify-between mb-4 border-b pb-4">
                <h3 className="text-xl font-bold">Details Ingreep</h3>
                <button onClick={() => setSelectedSaleDetails(null)} className="text-gray-400 text-2xl">✕</button>
              </div>
              <div className="space-y-3 mb-6">
                <p className="text-sm"><strong>Datum:</strong> {selectedSaleDetails.surgery_date}</p>
                <p className="text-sm"><strong>Ziekenhuis:</strong> {selectedSaleDetails.Hospitals?.name}</p>
                <p className="text-sm"><strong>Chirurg:</strong> {selectedSaleDetails.Surgeons?.name}</p>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <ul className="space-y-2 text-sm">
                    {selectedSaleDetails.Sale_Items.map((item, idx) => (
                      <li key={idx} className="flex justify-between border-b pb-1">
                        <span>{item.quantity}x {item.Products?.name}</span>
                        <span>€{(item.quantity * item.unit_price).toFixed(2)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              <button onClick={() => setSelectedSaleDetails(null)} className="w-full bg-gray-800 text-white py-3 rounded-xl font-bold">Sluiten</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
