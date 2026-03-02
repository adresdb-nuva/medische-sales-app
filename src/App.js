import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

function App() {
  const [hospitals, setHospitals] = useState([]);
  const [surgeons, setSurgeons] = useState([]);
  const [products, setProducts] = useState([]);
  
  const [selectedHospital, setSelectedHospital] = useState('');
  const [selectedSurgeon, setSelectedSurgeon] = useState('');
  const [surgeryDate, setSurgeryDate] = useState(new Date().toISOString().split('T')[0]);
  
  // States voor het "winkelmandje"
  const [cart, setCart] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [quantity, setQuantity] = useState(1);
  
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    fetchInitialData();
  }, []);

  async function fetchInitialData() {
    try {
      const { data: hosp } = await supabase.from('Hospitals').select('*');
      const { data: surg } = await supabase.from('Surgeons').select('*');
      const { data: prod } = await supabase.from('Products').select('*');
      setHospitals(hosp || []);
      setSurgeons(surg || []);
      setProducts(prod || []);
    } catch (error) {
      setErrorMessage("Fout bij laden: " + error.message);
    }
  }

  const addToCart = () => {
    if (!selectedProduct) return;
    const product = products.find(p => p.id.toString() === selectedProduct);
    const newItem = {
      product_id: product.id,
      name: product.name,
      price: product.price,
      quantity: parseInt(quantity)
    };
    setCart([...cart, newItem]);
    setSelectedProduct(''); // Reset selectie
    setQuantity(1);
  };

  const removeFromCart = (index) => {
    setCart(cart.filter((_, i) => i !== index));
  };

  async function handleSaveSale() {
    if (!selectedHospital || !selectedSurgeon || cart.length === 0) {
      alert("Zorg dat ziekenhuis, chirurg en minimaal één product zijn ingevuld.");
      return;
    }

    // 1. Maak de Sale aan
    const { data: sale, error: saleError } = await supabase
      .from('Sales') 
      .insert([{ 
        hospital_id: parseInt(selectedHospital), 
        surgeon_id: parseInt(selectedSurgeon),
        surgery_date: surgeryDate
      }])
      .select();

    if (saleError) return alert("Fout bij Sales: " + saleError.message);

    // 2. Bereid alle producten voor de Sale_Items voor
    const itemsToInsert = cart.map(item => ({
      sale_id: sale[0].id,
      product_id: item.product_id,
      quantity: item.quantity,
      unit_price: item.price
    }));

    // 3. Upload alle items in één keer
    const { error: itemError } = await supabase
      .from('Sale_Items')
      .insert(itemsToInsert);

    if (!itemError) {
      alert("Volledige ingreep succesvol geregistreerd!");
      setCart([]); // Leeg mandje
    } else {
      alert("Fout bij opslaan items: " + itemError.message);
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8 font-sans">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-extrabold mb-8 text-gray-800">Operatie Registratie</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* LINKER KOLOM: Basis Gegevens */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
            <h2 className="text-lg font-bold mb-4 text-blue-800 border-b pb-2">1. Ingreep Details</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Datum</label>
                <input type="date" className="w-full p-2.5 rounded-lg border bg-gray-50" value={surgeryDate} onChange={(e) => setSurgeryDate(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Ziekenhuis</label>
                <select className="w-full p-2.5 rounded-lg border bg-gray-50" value={selectedHospital} onChange={(e) => setSelectedHospital(e.target.value)}>
                  <option value="">Kies...</option>
                  {hospitals.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Chirurg</label>
                <select className="w-full p-2.5 rounded-lg border bg-gray-50" value={selectedSurgeon} onChange={(e) => setSelectedSurgeon(e.target.value)}>
                  <option value="">Kies...</option>
                  {surgeons.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* MIDDELSTE KOLOM: Producten Toevoegen */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
            <h2 className="text-lg font-bold mb-4 text-blue-800 border-b pb-2">2. Implanteer Producten</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Product</label>
                <select className="w-full p-2.5 rounded-lg border bg-gray-50" value={selectedProduct} onChange={(e) => setSelectedProduct(e.target.value)}>
                  <option value="">Kies implantaat...</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Aantal</label>
                <input type="number" min="1" className="w-full p-2.5 rounded-lg border bg-gray-50" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
              </div>
              <button onClick={addToCart} className="w-full bg-green-600 text-white font-bold py-2.5 rounded-lg hover:bg-green-700 transition">
                + Voeg toe aan lijst
              </button>
            </div>
          </div>

          {/* RECHTER KOLOM: Overzicht & Bevestigen */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex flex-col">
            <h2 className="text-lg font-bold mb-4 text-blue-800 border-b pb-2">3. Overzicht Ingreep</h2>
            <div className="flex-grow overflow-y-auto max-h-60 mb-4">
              {cart.length === 0 ? (
                <p className="text-gray-400 italic text-sm">Nog geen producten toegevoegd...</p>
              ) : (
                <ul className="space-y-2">
                  {cart.map((item, index) => (
                    <li key={index} className="flex justify-between items-center bg-gray-50 p-2 rounded border text-sm">
                      <span>{item.quantity}x {item.name}</span>
                      <button onClick={() => removeFromCart(index)} className="text-red-500 font-bold px-2">✕</button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <button onClick={handleSaveSale} disabled={cart.length === 0} className={`w-full py-4 rounded-xl font-bold text-white shadow-lg transition ${cart.length === 0 ? 'bg-gray-300' : 'bg-blue-600 hover:bg-blue-700'}`}>
              REGISTREER INGREEP
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
