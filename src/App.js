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
  const [salesData, setSalesData] = useState([]);

  // 1. Data ophalen uit Supabase bij het laden van de app
  useEffect(() => {
    fetchInitialData();
  }, []);

  async function fetchInitialData() {
    const { data: hosp } = await supabase.from('Hospitals').select('*');
    const { data: surg } = await supabase.from('Surgeons').select('*');
    const { data: prod } = await supabase.from('Products').select('*');
    
    setHospitals(hosp || []);
    setSurgeons(surg || []);
    setProducts(prod || []);
  }

  // 2. Een verkoop opslaan
  async function handleSaveSale() {
    if (!selectedHospital || !selectedSurgeon || !selectedProduct) {
      alert("Vul alle velden in");
      return;
    }

    const product = products.find(p => p.id === parseInt(selectedProduct));
    
    // A. Maak de 'Sale' aan
    const { data: sale, error: saleError } = await supabase
      .from('Sales')
      .insert([{ 
        hospital_id: selectedHospital, 
        surgeon_id: selectedSurgeon,
        surgery_date: new Date().toISOString()
      }])
      .select();

    if (saleError) return console.error(saleError);

    // B. Voeg het product toe aan 'Sale_Items' (met de vaste prijs van nu)
    const { error: itemError } = await supabase
      .from('Sale_Items')
      .insert([{
        sale_id: sale[0].id,
        product_id: product.id,
        quantity: quantity,
        unit_price: product.price
      }]);

    if (!itemError) {
      alert("Sale succesvol geregistreerd!");
      // Reset formulier
      setQuantity(1);
    }
  }

  return (
    <div className="p-8 font-sans">
      <h1 className="text-2xl font-bold mb-6">Medische Sales Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Formulier sectie */}
        <div className="bg-gray-100 p-6 rounded-lg">
          <h2 className="text-xl mb-4 text-blue-800">Nieuwe Ingreep Invoeren</h2>
          
          <label className="block mb-2 text-gray-700">Ziekenhuis</label>
          <select className="w-full p-2 mb-4 rounded border" onChange={(e) => setSelectedHospital(e.target.value)}>
            <option value="">Selecteer ziekenhuis...</option>
            {hospitals.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
          </select>

          <label className="block mb-2 text-gray-700">Chirurg</label>
          <select className="w-full p-2 mb-4 rounded border" onChange={(e) => setSelectedSurgeon(e.target.value)}>
            <option value="">Selecteer chirurg...</option>
            {surgeons.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>

          <label className="block mb-2 text-gray-700">Product (Implantaat)</label>
          <select className="w-full p-2 mb-4 rounded border" onChange={(e) => setSelectedProduct(e.target.value)}>
            <option value="">Selecteer product...</option>
            {products.map(p => <option key={p.id} value={p.id}>{p.name} (€{p.price})</option>)}
          </select>

          <label className="block mb-2 text-gray-700">Aantal</label>
          <input 
            type="number" 
            className="w-full p-2 mb-6 rounded border" 
            value={quantity} 
            onChange={(e) => setQuantity(e.target.value)} 
          />

          <button 
            onClick={handleSaveSale}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 w-full"
          >
            Sla Verkoop Op
          </button>
        </div>

        {/* Info sectie */}
        <div className="bg-white border p-6 rounded-lg">
          <h2 className="text-xl mb-4 text-blue-800">Status Informatie</h2>
          <p className="text-gray-600">De prijzen worden automatisch uit de database opgehaald en vastgezet bij het opslaan van de verkoop.</p>
        </div>
      </div>
    </div>
  );
}

export default App;
