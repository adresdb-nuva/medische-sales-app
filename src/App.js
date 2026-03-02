import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// Initialiseer Supabase (Vervang met jouw eigen keys uit de Supabase settings)
const supabase = createClient(
  'https://JOUW_PROJECT_URL.supabase.co',
  'JOUW_ANON_KEY'
);

export default function SalesApp() {
  const [hospitals, setHospitals] = useState([]);
  const [surgeons, setSurgeons] = useState([]);
  const [products, setProducts] = useState([]);
  const [stats, setStats] = useState([]);

  // Form State
  const [selectedHospital, setSelectedHospital] = useState('');
  const [selectedSurgeon, setSelectedSurgeon] = useState('');
  const [items, setItems] = useState([{ productId: '', quantity: 1 }]);

  useEffect(() => {
    fetchInitialData();
    fetchStats();
  }, []);

  async function fetchInitialData() {
    const { data: h } = await supabase.from('hospitals').select('*');
    const { data: p } = await supabase.from('products').select('*');
    const { data: s } = await supabase.from('surgeons').select('*');
    setHospitals(h || []);
    setProducts(p || []);
    setSurgeons(s || []);
  }

  async function fetchStats() {
    // Haal sales op inclusief de items en productprijzen
    const { data, error } = await supabase
      .from('sales')
      .select(`
        surgeons(name),
        sale_items(quantity, products(price))
      `);

    if (data) {
      const summary = data.reduce((acc, curr) => {
        const name = curr.surgeons.name;
        const total = curr.sale_items.reduce((sum, item) => sum + (item.quantity * item.products.price), 0);
        acc[name] = (acc[name] || 0) + total;
        return acc;
      }, {});
      setStats(Object.entries(summary));
    }
  }

  const addItemRow = () => setItems([...items, { productId: '', quantity: 1 }]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // 1. Maak de Sale aan
    const { data: sale, error: sErr } = await supabase
      .from('sales')
      .insert([{ surgeon_id: selectedSurgeon, hospital_id: selectedHospital }])
      .select()
      .single();

    if (sErr) return alert("Fout bij opslaan sale");

    // 2. Maak de Sale Items aan
    const itemsToInsert = items.map(item => ({
      sale_id: sale.id,
      product_id: item.productId,
      quantity: item.quantity
    }));

    await supabase.from('sale_items').insert(itemsToInsert);
    
    alert("Registratie succesvol!");
    setItems([{ productId: '', quantity: 1 }]);
    fetchStats();
  };

  return (
    <div className="p-6 max-w-4xl mx-auto font-sans bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold mb-8 text-blue-800">Implantaten Tracker</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* FORMULIER */}
        <div className="bg-white p-6 rounded-xl shadow-md">
          <h2 className="text-xl font-semibold mb-4">Nieuwe Ingreep</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <select 
              className="w-full p-2 border rounded"
              onChange={(e) => setSelectedHospital(e.target.value)}
              required
            >
              <option value="">Selecteer Ziekenhuis</option>
              {hospitals.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
            </select>

            <select 
              className="w-full p-2 border rounded"
              onChange={(e) => setSelectedSurgeon(e.target.value)}
              required
            >
              <option value="">Selecteer Chirurg</option>
              {surgeons
                .filter(s => s.hospital_id === selectedHospital)
                .map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>

            <div className="border-t pt-4">
              <label className="block text-sm font-medium mb-2">Verbruik</label>
              {items.map((item, index) => (
                <div key={index} className="flex gap-2 mb-2">
                  <select 
                    className="flex-1 p-2 border rounded text-sm"
                    onChange={(e) => {
                      const newItems = [...items];
                      newItems[index].productId = e.target.value;
                      setItems(newItems);
                    }}
                  >
                    <option value="">Product...</option>
                    {products.map(p => <option key={p.id} value={p.id}>{p.name} (€{p.price})</option>)}
                  </select>
                  <input 
                    type="number" 
                    className="w-16 p-2 border rounded"
                    value={item.quantity}
                    onChange={(e) => {
                      const newItems = [...items];
                      newItems[index].quantity = parseInt(e.target.value);
                      setItems(newItems);
                    }}
                  />
                </div>
              ))}
              <button type="button" onClick={addItemRow} className="text-blue-600 text-sm font-semibold">+ Item toevoegen</button>
            </div>

            <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-lg font-bold hover:bg-blue-700 transition">
              Opslaan & Registreren
            </button>
          </form>
        </div>

        {/* STATS DASHBOARD */}
        <div className="bg-white p-6 rounded-xl shadow-md">
          <h2 className="text-xl font-semibold mb-4">Omzet per Chirurg</h2>
          <div className="space-y-4">
            {stats.map(([name, total]) => (
              <div key={name} className="flex justify-between items-center border-b pb-2">
                <span className="font-medium">{name}</span>
                <span className="text-green-600 font-bold">€ {total.toLocaleString()}</span>
              </div>
            ))}
            {stats.length === 0 && <p className="text-gray-400">Nog geen data beschikbaar.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
