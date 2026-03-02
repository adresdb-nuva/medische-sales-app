import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

function App() {
  const [hospitals, setHospitals] = useState([]);
  const [surgeons, setSurgeons] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedHospital, setSelectedHospital] = useState('');
  const [selectedSurgeon, setSelectedSurgeon] = useState('');
  const [selectedProduct, setSelectedProduct] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [surgeryDate, setSurgeryDate] = useState(new Date().toISOString().split('T')[0]);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    fetchInitialData();
  }, []);

  async function fetchInitialData() {
    try {
      // CORRECTIE: Tabelnamen met hoofdletters zoals in jouw Supabase
      const { data: hosp, error: hErr } = await supabase.from('Hospitals').select('*');
      const { data: surg, error: sErr } = await supabase.from('Surgeons').select('*');
      const { data: prod, error: pErr } = await supabase.from('Products').select('*');
      
      if (hErr || sErr || pErr) {
        console.error("Fetch error:", hErr || sErr || pErr);
        setErrorMessage("Controleer of de tabellen 'Hospitals', 'Surgeons' en 'Products' data bevatten.");
      } else {
        setErrorMessage('');
      }

      setHospitals(hosp || []);
      setSurgeons(surg || []);
      setProducts(prod || []);
    } catch (error) {
      setErrorMessage("Verbindingsfout: " + error.message);
    }
  }

  async function handleSaveSale() {
    if (!selectedHospital || !selectedSurgeon || !selectedProduct || !surgeryDate) {
      alert("Vul alle velden in, inclusief de datum.");
      return;
    }

    const product = products.find(p => p.id.toString() === selectedProduct.toString());
    
    // Opslaan in de tabel 'Sales' (Hoofdletter S)
    const { data: sale, error: saleError } = await supabase
      .from('Sales') 
      .insert([{ 
        hospital_id: parseInt(selectedHospital), 
        surgeon_id: parseInt(selectedSurgeon),
        surgery_date: surgeryDate
      }])
      .select();

    if (saleError) {
      alert("Fout bij opslaan verkoop: " + saleError.message);
      return;
    }

    // Opslaan in de tabel 'Sale_Items' (Hoofdletters S en I)
    const { error: itemError } = await supabase
      .from('Sale_Items')
      .insert([{
        sale_id: sale[0].id,
        product_id: product.id,
        quantity: parseInt(quantity),
        unit_price: product.price
      }]);

    if (!itemError) {
      alert("Operatie succesvol geregistreerd!");
      setQuantity(1);
    } else {
      alert("Fout bij opslaan product: " + itemError.message);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8 font-sans text-gray-900">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Medische Sales Dashboard</h1>
          {errorMessage && (
            <div className="mt-4 p-4 bg-red-100 text-red-700 rounded-lg border border-red-200">
              {errorMessage}
            </div>
          )}
        </header>
        
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
          <h2 className="text-xl font-semibold mb-6 text-blue-700 font-sans">Nieuwe Registratie</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 font-sans">
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold mb-1 text-gray-600">Operatiedatum</label>
              <input 
                type="date" 
                className="w-full p-3 rounded-xl border border-gray-300 bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none"
                value={surgeryDate}
                onChange={(e) => setSurgeryDate(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1 text-gray-600">Ziekenhuis</label>
              <select className="w-full p-3 rounded-xl border border-gray-300 bg-gray-50 focus:ring-2 focus:ring-blue-500" 
                value={selectedHospital} onChange={(e) => setSelectedHospital(e.target.value)}>
                <option value="">-- Kies ziekenhuis --</option>
                {hospitals.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1 text-gray-600">Chirurg</label>
              <select className="w-full p-3 rounded-xl border border-gray-300 bg-gray-50 focus:ring-2 focus:ring-blue-500" 
                value={selectedSurgeon} onChange={(e) => setSelectedSurgeon(e.target.value)}>
                <option value="">-- Kies chirurg --</option>
                {surgeons.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1 text-gray-600">Product</label>
              <select className="w-full p-3 rounded-xl border border-gray-300 bg-gray-50 focus:ring-2 focus:ring-blue-500" 
                value={selectedProduct} onChange={(e) => setSelectedProduct(e.target.value)}>
                <option value="">-- Kies product --</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name} (€{p.price})</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1 text-gray-600">Aantal</label>
              <input type="number" className="w-full p-3 rounded-xl border border-gray-300 bg-gray-50 focus:ring-2 focus:ring-blue-500" 
                value={quantity} onChange={(e) => setQuantity(e.target.value)} />
            </div>

            <button onClick={handleSaveSale} className="md:col-span-2 bg-blue-600 text-white font-bold py-4 rounded-xl hover:bg-blue-700 shadow-lg transition duration-200">
              Sla Operatie Gegevens Op
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
