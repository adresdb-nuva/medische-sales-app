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

  // 1. Data ophalen bij het laden van de pagina
  useEffect(() => {
    fetchInitialData();
  }, []);

  async function fetchInitialData() {
    try {
      // We gebruiken hoofdletters omdat deze zo in jouw Supabase staan
      const { data: hosp, error: hErr } = await supabase.from('Hospitals').select('*');
      const { data: surg, error: sErr } = await supabase.from('Surgeons').select('*');
      const { data: prod, error: pErr } = await supabase.from('Products').select('*');
      
      if (hErr) console.error("Fout bij Hospitals:", hErr.message);
      if (sErr) console.error("Fout bij Surgeons:", sErr.message);
      if (pErr) console.error("Fout bij Products:", pErr.message);

      setHospitals(hosp || []);
      setSurgeons(surg || []);
      setProducts(prod || []);
    } catch (error) {
      console.error("Onverwachte fout:", error);
    }
  }

  // 2. Een verkoop opslaan
  async function handleSaveSale() {
    if (!selectedHospital || !selectedSurgeon || !selectedProduct) {
      alert("Selecteer eerst een ziekenhuis, chirurg en product.");
      return;
    }

    const product = products.find(p => p.id.toString() === selectedProduct.toString());
    if (!product) return;
    
    // A. Maak de 'Sale' aan
    const { data: sale, error: saleError } = await supabase
      .from('Sales') 
      .insert([{ 
        hospital_id: parseInt(selectedHospital), 
        surgeon_id: parseInt(selectedSurgeon),
        surgery_date: new Date().toISOString()
      }])
      .select();

    if (saleError) {
      alert("Fout bij opslaan verkoop: " + saleError.message);
      return;
    }

    // B. Voeg het product toe aan 'Sale_Items'
    const { error: itemError } = await supabase
      .from('Sale_Items')
      .insert([{
        sale_id: sale[0].id,
        product_id: product.id,
        quantity: parseInt(quantity),
        unit_price: product.price
      }]);

    if (itemError) {
      alert("Fout bij opslaan product-details: " + itemError.message);
    } else {
      alert("Verkoop succesvol geregistreerd!");
      setQuantity(1);
      setSelectedProduct('');
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8 font-sans">
      <div className="max-w-4xl mx-auto">
        <header className="mb-10 text-center">
          <h1 className="text-3xl font-extrabold text-gray-900 md:text-4xl">
            Medische Sales Dashboard
          </h1>
          <p className="mt-2 text-gray-600">Voer hier nieuwe operatie-gegevens in</p>
        </header>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Formulier sectie */}
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
            <h2 className="text-xl font-semibold mb-6 text-blue-700 flex items-center">
              Nieuwe Registratie
            </h2>
            
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Ziekenhuis</label>
                <select 
                  className="w-full p-3 rounded-xl border border-gray-300 bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition" 
                  value={selectedHospital}
                  onChange={(e) => setSelectedHospital(e.target.value)}
                >
                  <option value="">-- Kies ziekenhuis --</option>
                  {hospitals.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Chirurg</label>
                <select 
                  className="w-full p-3 rounded-xl border border-gray-300 bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition" 
                  value={selectedSurgeon}
                  onChange={(e) => setSelectedSurgeon(e.target.value)}
                >
                  <option value="">-- Kies chirurg --</option>
                  {surgeons.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Product (Implantaat)</label>
                <select 
                  className="w-full p-3 rounded-xl border border-gray-300 bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition" 
                  value={selectedProduct}
                  onChange={(e) => setSelectedProduct(e.target.value)}
                >
                  <option value="">-- Kies product --</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name} (€{p.price})</option>)}
                </select>
              </div>

              <div className="w-1/2">
                <label className="block text-sm font-semibold text-gray-700 mb-1">Aantal</label>
                <input 
                  type="number" 
                  min="1"
                  className="w-full p-3 rounded-xl border border-gray-300 bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition" 
                  value={quantity} 
                  onChange={(e) => setQuantity(e.target.value)} 
                />
              </div>

              <button 
                onClick={handleSaveSale}
                className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl hover:bg-blue-700 transform active:scale-[0.98] transition duration-150 shadow-lg mt-4"
              >
                Sla Gegevens Op
              </button>
            </div>
          </div>

          {/* Info Status sectie */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-blue-600 p-6 rounded-2xl text-white shadow-lg">
              <h2 className="text-lg font-bold mb-2">Systeem Status</h2>
              <div className="flex items-center space-x-2 text-sm">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span>Verbonden met Supabase</span>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
              <h3 className="font-bold text-gray-800 mb-3">Hulp nodig?</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Als de lijsten leeg zijn, controleer dan of er data in de tabellen in Supabase staat en of de tabelnamen exact matchen.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
