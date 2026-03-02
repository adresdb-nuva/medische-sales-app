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
  const [selectedSaleDetails, setSelectedSaleDetails] = useState(null); // Voor het detailvenster

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
    // We halen nu ook de productnaam op via de relatie met Products
    const { data, error } = await supabase
      .from('Sales')
      .select(`
        id, 
        surgery_date, 
        Hospitals (name), 
        Surgeons (name),
        Sale_Items (
          quantity, 
          unit_price,
          Products (name)
        )
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
      fetchSalesHistory();
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8 font-sans">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Operatie Dashboard</h1>
        
        {/* INPUT SECTIE */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12">
          <div className="bg-white p-6 rounded-xl shadow-sm border">
            <h2 className="font-bold mb-4 text-blue-700 uppercase text-sm">1. Basis Info</h2>
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
            <h2 className="font-bold mb-4 text-blue-700 uppercase text-sm">2. Producten</h2>
            <div className="space-y-4">
              <select className="w-full p-2 border rounded" value={selectedProduct} onChange={(e) => setSelectedProduct(e.target.value)}>
                <option value="">Kies implantaat...</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <input type="number" className="w-full p-2 border rounded" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
              <button onClick={addToCart} className="w-full bg-green-600 text-white py-2 rounded font-bold hover:bg-green-700">+ Toevoegen</button>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border flex flex-col">
            <h2 className="font-bold mb-4 text-blue-700 uppercase text-sm">3. Ingreep Mandje</h2>
            <div className="flex-grow text-sm mb-4">
              {cart.map((item, i) => (
                <div key={i} className="border-b py-1 flex justify-between">
                  <span>{item.quantity}x {item.name}</span>
                  <span className="text-gray-400">€{(item.price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>
            <button onClick={handleSaveSale} className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold shadow-lg">INGREEP OPSLAAN</button>
          </div>
        </div>

        {/* HISTORIEK SECTIE */}
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="p-6 border-b bg-gray-50 flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-800">Historiek Ingrepen</h2>
            <span className="text-xs text-gray-500">Klik op een rij voor details</span>
          </div>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-100 text-xs uppercase text-gray-600">
                <th className="p-4">Datum</th>
                <th className="p-4">Ziekenhuis</th>
                <th className="p-4">Chirurg</th>
                <th className="p-4">Totaal</th>
              </tr>
            </thead>
            <tbody className="divide-y text-sm">
              {salesHistory.map((sale) => {
                const total = sale.Sale_Items.reduce((acc, item) => acc + (item.quantity * item.unit_price), 0);
                return (
                  <tr key={sale.id} onClick={() => setSelectedSaleDetails(sale)} className="cursor-pointer hover:bg-blue-50 transition">
                    <td className="p-4 font-medium">{sale.surgery_date}</td>
                    <td className="p-4">{sale.Hospitals?.name}</td>
                    <td className="p-4">{sale.Surgeons?.name}</td>
                    <td className="p-4 font-bold text-blue-600">€{total.toFixed(2)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* DETAIL MODAL (Venster dat openspringt) */}
        {selectedSaleDetails && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl">
              <div className="flex justify-between items-start mb-4 border-b pb-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-800">Details Operatie</h3>
                  <p className="text-sm text-gray-500">{selectedSaleDetails.surgery_date} - {selectedSaleDetails.Hospitals?.name}</p>
                </div>
                <button onClick={() => setSelectedSaleDetails(null)} className="text-gray-400 hover:text-gray-600 text-2xl">✕</button>
              </div>
              
              <div className="space-y-3">
                <p className="text-sm font-semibold">Chirurg: <span className="font-normal">{selectedSaleDetails.Surgeons?.name}</span></p>
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="text-xs font-bold uppercase text-gray-400 mb-2">Gebruikte Implantaat Producten</h4>
                  <ul className="space-y-2">
                    {selectedSaleDetails.Sale_Items.map((item, idx) => (
                      <li key={idx} className="flex justify-between text-sm border-b border-gray-200 pb-1">
                        <span>{item.quantity}x {item.Products?.name}</span>
                        <span className="font-mono text-gray-600">€{(item.quantity * item.unit_price).toFixed(2)}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="flex justify-between mt-4 pt-2 border-t border-gray-300 font-bold">
                    <span>Totaalbedrag</span>
                    <span className="text-blue-700 text-lg">
                      €{selectedSaleDetails.Sale_Items.reduce((acc, item) => acc + (item.quantity * item.unit_price), 0).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
              
              <button onClick={() => setSelectedSaleDetails(null)} className="mt-6 w-full bg-gray-800 text-white py-3 rounded-xl font-bold">Sluiten</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
