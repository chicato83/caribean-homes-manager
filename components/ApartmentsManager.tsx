import React, { useState, useEffect } from 'react';
import { StorageService } from '../services/storageService';
import { GeminiService } from '../services/geminiService';
import { Apartment, Recommendation } from '../types';
import { Plus, Trash2, Edit2, Wand2, Save, X, Utensils, Camera, ShoppingBasket, Map, ChevronDown, ChevronUp } from 'lucide-react';

export const ApartmentsManager: React.FC = () => {
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [recEditingId, setRecEditingId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const loadApartments = async () => {
    try {
        setApartments(await StorageService.getApartments());
    } catch(e) {
        console.error("Failed to load apartments", e);
    }
  };

  useEffect(() => {
    loadApartments();
  }, []);

  const handleSave = async (apt: Apartment) => {
    if (editingId) {
        // Saving Apartment Details
        await StorageService.saveApartment(apt);
    } else if (recEditingId) {
        // Saving Recommendations
        await StorageService.syncRecommendations(apt.id, apt.recommendations);
    }
    
    await loadApartments();
    setEditingId(null);
    setRecEditingId(null);
  };

  const handleDelete = async (id: string) => {
    if (confirm('¿Está seguro de que desea eliminar este apartamento?')) {
      await StorageService.deleteApartment(id);
      await loadApartments();
    }
  };

  const handleAddNew = () => {
    // We create an empty local object, not yet saved to DB until user clicks save in editor
    // But since our editor expects an ID for updates, let's treat it as a new draft
    const newApt: Apartment = {
      id: '', // Empty ID signifies new
      name: 'Nuevo Apartamento',
      address: '',
      description: '',
      imageUrl: 'https://picsum.photos/800/600',
      pricePerNight: 0,
      bedrooms: 1,
      bathrooms: 1,
      amenities: [],
      recommendations: [],
      notes: ''
    };
    // We mock adding it to list for UI, but it won't be in DB
    // Actually simpler: just open editor with this object
    // But we need to switch UI. Let's use a temporary state or hack the list.
    // Better: Render the editor directly if ID is 'new'
    setApartments([...apartments, { ...newApt, id: 'new_temp' }]);
    setEditingId('new_temp');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Mis Apartamentos</h2>
        <button onClick={handleAddNew} className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg flex items-center gap-2">
          <Plus className="w-4 h-4" /> Agregar Apartamento
        </button>
      </div>

      <div className="grid gap-6">
        {apartments.map(apt => {
          if (editingId === apt.id) {
            return (
              <ApartmentEditor 
                key={apt.id} 
                initialData={apt} 
                onSave={handleSave} 
                onCancel={() => {
                    setEditingId(null);
                    if(apt.id === 'new_temp') {
                        setApartments(apartments.filter(a => a.id !== 'new_temp'));
                    }
                }}
                isGenerating={isGenerating}
                setIsGenerating={setIsGenerating}
              />
            );
          } else if (recEditingId === apt.id) {
            return (
              <RecommendationsManager
                key={apt.id}
                apartment={apt}
                onSave={handleSave}
                onCancel={() => setRecEditingId(null)}
              />
            );
          } else {
             // Don't render the temp item in list view if not editing
             if(apt.id === 'new_temp' && editingId !== 'new_temp') return null;

            return (
              <div key={apt.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col md:flex-row gap-6">
                <img src={apt.imageUrl} alt={apt.name} className="w-full md:w-48 h-32 object-cover rounded-lg" />
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">{apt.name}</h3>
                      <p className="text-gray-500">{apt.address}</p>
                    </div>
                    <div className="flex gap-2">
                       <button 
                        onClick={() => setRecEditingId(apt.id)} 
                        className="px-3 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors border border-indigo-200"
                        title="Gestionar Recomendaciones"
                      >
                        <Map className="w-4 h-4" /> Guía Local
                      </button>
                      <button onClick={() => setEditingId(apt.id)} className="p-2 text-gray-500 hover:bg-gray-100 rounded" title="Editar Detalles">
                        <Edit2 className="w-5 h-5" />
                      </button>
                      <button onClick={() => handleDelete(apt.id)} className="p-2 text-red-500 hover:bg-red-50 rounded" title="Eliminar">
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                  <div className="mt-4 flex gap-4 text-sm text-gray-600">
                      <span className="bg-gray-100 px-2 py-1 rounded">🛏 {apt.bedrooms} Hab</span>
                      <span className="bg-gray-100 px-2 py-1 rounded">🚿 {apt.bathrooms} Baños</span>
                      <span className="bg-gray-100 px-2 py-1 rounded">👥 Max {apt.maxGuests || 2}</span>
                      <span className="bg-green-50 px-2 py-1 rounded text-green-700 font-semibold">${apt.pricePerNight}</span>
                  </div>
                  <div className="mt-4 text-sm">
                    <span className="font-semibold">Acceso:</span> {apt.accessCode || 'No config'} | <span className="font-semibold">Wifi:</span> {apt.wifiSSID || 'N/A'}
                  </div>
                </div>
              </div>
            );
          }
        })}
      </div>
    </div>
  );
};

interface EditorProps {
  initialData: Apartment;
  onSave: (data: Apartment) => void;
  onCancel: () => void;
  isGenerating: boolean;
  setIsGenerating: (v: boolean) => void;
}

const ApartmentEditor: React.FC<EditorProps> = ({ initialData, onSave, onCancel, isGenerating, setIsGenerating }) => {
  const [formData, setFormData] = useState<Apartment>(initialData);

  const handleGenerateDesc = async () => {
    setIsGenerating(true);
    const desc = await GeminiService.generateDescription(formData.name, formData.amenities);
    setFormData(prev => ({ ...prev, description: desc }));
    setIsGenerating(false);
  };

  const handleSaveClick = () => {
      // If new, remove the temp ID so DB creates one
      const dataToSave = { ...formData };
      if (dataToSave.id === 'new_temp') {
          dataToSave.id = '';
      }
      onSave(dataToSave);
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg border border-brand-200 ring-2 ring-brand-100">
      <div className="flex justify-between items-center mb-4 border-b pb-2">
        <h3 className="text-lg font-bold">Editar Información del Apartamento</h3>
        <button onClick={onCancel} className="text-gray-400 hover:text-gray-600"><X className="w-6 h-6"/></button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700">Nombre</label>
          <input 
            type="text" 
            value={formData.name} 
            onChange={e => setFormData({...formData, name: e.target.value})}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 border p-2" 
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Dirección</label>
          <input 
            type="text" 
            value={formData.address} 
            onChange={e => setFormData({...formData, address: e.target.value})}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 border p-2" 
          />
        </div>
        
        <div className="md:col-span-2">
            <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-medium text-gray-700">Descripción</label>
                <button 
                  onClick={handleGenerateDesc} 
                  disabled={isGenerating}
                  className="text-xs flex items-center text-brand-600 hover:text-brand-800 disabled:opacity-50"
                >
                    <Wand2 className="w-3 h-3 mr-1" />
                    {isGenerating ? 'Pensando...' : 'Generar con IA'}
                </button>
            </div>
          <textarea 
            rows={3}
            value={formData.description} 
            onChange={e => setFormData({...formData, description: e.target.value})}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 border p-2" 
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">URL de Imagen</label>
          <input 
            type="text" 
            value={formData.imageUrl} 
            onChange={e => setFormData({...formData, imageUrl: e.target.value})}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 border p-2" 
          />
        </div>
        
        <div className="grid grid-cols-4 gap-2">
            <div>
                <label className="block text-sm font-medium text-gray-700">Precio</label>
                <input type="number" value={formData.pricePerNight} onChange={e => setFormData({...formData, pricePerNight: Number(e.target.value)})} className="mt-1 w-full border p-2 rounded" />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700">Hab.</label>
                <input type="number" value={formData.bedrooms} onChange={e => setFormData({...formData, bedrooms: Number(e.target.value)})} className="mt-1 w-full border p-2 rounded" />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700">Baños</label>
                <input type="number" value={formData.bathrooms} onChange={e => setFormData({...formData, bathrooms: Number(e.target.value)})} className="mt-1 w-full border p-2 rounded" />
            </div>
             <div>
                <label className="block text-sm font-medium text-gray-700">Max Huésp.</label>
                <input type="number" value={formData.maxGuests || 2} onChange={e => setFormData({...formData, maxGuests: Number(e.target.value)})} className="mt-1 w-full border p-2 rounded" />
            </div>
        </div>
      </div>

      <h3 className="text-lg font-bold mb-4 border-b pb-2">Detalles Operativos</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="grid grid-cols-2 gap-4">
             <div>
                <label className="block text-sm font-medium text-gray-700">Wifi SSID</label>
                <input type="text" value={formData.wifiSSID || ''} onChange={e => setFormData({...formData, wifiSSID: e.target.value})} className="mt-1 w-full border p-2 rounded" />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700">Wifi Pass</label>
                <input type="text" value={formData.wifiPassword || ''} onChange={e => setFormData({...formData, wifiPassword: e.target.value})} className="mt-1 w-full border p-2 rounded" />
            </div>
        </div>
        <div>
             <label className="block text-sm font-medium text-gray-700">Código Puerta/Acceso</label>
             <input type="text" value={formData.accessCode || ''} onChange={e => setFormData({...formData, accessCode: e.target.value})} className="mt-1 w-full border p-2 rounded" />
        </div>
        <div className="grid grid-cols-2 gap-4">
             <div>
                <label className="block text-sm font-medium text-gray-700">Hora Check-in</label>
                <input type="time" value={formData.checkInTime || '15:00'} onChange={e => setFormData({...formData, checkInTime: e.target.value})} className="mt-1 w-full border p-2 rounded" />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700">Hora Check-out</label>
                <input type="time" value={formData.checkOutTime || '11:00'} onChange={e => setFormData({...formData, checkOutTime: e.target.value})} className="mt-1 w-full border p-2 rounded" />
            </div>
        </div>
        <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700">Reglas de la Casa</label>
             <textarea 
                rows={2}
                value={formData.houseRules || ''} 
                onChange={e => setFormData({...formData, houseRules: e.target.value})}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2" 
                placeholder="No fumar, no fiestas..."
            />
        </div>
        <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700">Notas Internas (Privado)</label>
             <textarea 
                rows={2}
                value={formData.notes} 
                onChange={e => setFormData({...formData, notes: e.target.value})}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2 bg-yellow-50" 
            />
        </div>
      </div>

      <div className="flex justify-end gap-3 mt-6 border-t pt-4">
        <button onClick={onCancel} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">Cancelar</button>
        <button onClick={handleSaveClick} className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg flex items-center gap-2">
          <Save className="w-4 h-4" /> Guardar Cambios
        </button>
      </div>
    </div>
  );
};

// --- Recommendation Manager Sub-components ---

const RecommendationsManager: React.FC<{ apartment: Apartment, onSave: (a: Apartment) => void, onCancel: () => void }> = ({ apartment, onSave, onCancel }) => {
    const [recs, setRecs] = useState<Recommendation[]>(apartment.recommendations);

    return (
        <div className="bg-white p-6 rounded-xl shadow-xl border border-indigo-200 ring-2 ring-indigo-50 animate-fade-in">
            <div className="flex justify-between items-center mb-6 border-b pb-4">
                <div>
                    <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                        <Map className="w-6 h-6 text-indigo-600" />
                        Guía Local: {apartment.name}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">Administra los lugares recomendados para tus huéspedes.</p>
                </div>
                <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 bg-gray-100 p-2 rounded-full"><X className="w-5 h-5"/></button>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                {/* Left Column */}
                <div className="space-y-6">
                    <RecSection 
                        title="Restaurantes y Comida" 
                        icon={<Utensils className="w-4 h-4"/>} 
                        type="Restaurant" 
                        recs={recs} 
                        onChange={setRecs} 
                        colorClass="bg-orange-50 text-orange-700 border-orange-200"
                    />
                    <RecSection 
                        title="Lugares de Interés" 
                        icon={<Camera className="w-4 h-4"/>} 
                        type="Attraction" 
                        recs={recs} 
                        onChange={setRecs}
                        colorClass="bg-blue-50 text-blue-700 border-blue-200"
                    />
                </div>

                {/* Right Column */}
                <div className="space-y-6">
                     <RecSection 
                        title="Colmados y Supermercados" 
                        icon={<ShoppingBasket className="w-4 h-4"/>} 
                        type="Grocery/Colmado" 
                        recs={recs} 
                        onChange={setRecs}
                        colorClass="bg-green-50 text-green-700 border-green-200"
                    />
                    
                    <div className="bg-indigo-50 p-5 rounded-xl border border-indigo-100">
                        <h4 className="font-bold text-indigo-900 mb-2 flex items-center gap-2">
                            <Utensils className="w-4 h-4" /> 
                            Info sobre la Guía
                        </h4>
                        <p className="text-sm text-indigo-800 mb-3 leading-relaxed">
                            Las recomendaciones mejoran significativamente la experiencia del huésped. 
                        </p>
                        <div className="grid grid-cols-2 gap-3 text-xs text-indigo-700">
                            <div className="bg-white p-2 rounded border border-indigo-100 shadow-sm">
                                <strong>Página Principal:</strong>
                                <br/>Se muestran Restaurantes y Atracciones.
                            </div>
                            <div className="bg-white p-2 rounded border border-indigo-100 shadow-sm">
                                <strong>Detalle Apto:</strong>
                                <br/>Se muestran todas las categorías, incluyendo Colmados.
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-8 flex justify-end gap-3 pt-4 border-t">
                <button onClick={onCancel} className="px-5 py-2.5 text-gray-600 hover:bg-gray-100 rounded-lg font-medium">Cancelar</button>
                <button 
                    onClick={() => onSave({ ...apartment, recommendations: recs })} 
                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center gap-2 font-bold shadow-lg transform hover:-translate-y-0.5 transition-all"
                >
                    <Save className="w-5 h-5" /> Guardar Guía Local
                </button>
            </div>
        </div>
    )
}

const RecSection: React.FC<{
    title: string;
    icon: React.ReactNode;
    type: 'Restaurant' | 'Attraction' | 'Grocery/Colmado';
    recs: Recommendation[];
    onChange: (recs: Recommendation[]) => void;
    colorClass: string;
}> = ({ title, icon, type, recs, onChange, colorClass }) => {
    
    const list = recs.filter(r => r.type === type);

    const addRec = () => {
        const newRec: Recommendation = {
            id: 'temp_' + Date.now().toString(),
            name: '',
            type: type,
            description: '',
            distance: '',
            imageUrl: '',
            mapUrl: '',
            phoneNumber: ''
        };
        onChange([...recs, newRec]);
    };

    const updateRec = (id: string, field: keyof Recommendation, val: string) => {
        onChange(recs.map(r => r.id === id ? { ...r, [field]: val } : r));
    };

    const removeRec = (id: string) => {
        onChange(recs.filter(r => r.id !== id));
    };

    return (
        <div className="border rounded-xl overflow-hidden shadow-sm bg-gray-50/50">
            <div className={`px-4 py-3 flex justify-between items-center border-b ${colorClass} bg-white bg-opacity-50`}>
                <h4 className="font-bold flex items-center gap-2 text-sm uppercase tracking-wide">
                    {icon} {title}
                </h4>
                <button 
                    onClick={addRec} 
                    className="text-xs bg-white border border-current px-2 py-1 rounded hover:bg-opacity-50 transition-colors flex items-center gap-1 font-bold"
                >
                    <Plus className="w-3 h-3" /> Agregar
                </button>
            </div>
            
            <div className="p-3 space-y-3">
                {list.length === 0 && (
                    <p className="text-center text-xs text-gray-400 py-2 italic">No hay lugares agregados.</p>
                )}
                {list.map(rec => (
                    <div key={rec.id} className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm relative group">
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-2 mb-2">
                             <div className="md:col-span-8">
                                <label className="text-[10px] uppercase text-gray-400 font-bold">Nombre del Lugar</label>
                                <input 
                                    placeholder="Nombre..." 
                                    className="w-full text-sm font-semibold border-b border-gray-200 focus:border-brand-500 outline-none pb-1 bg-transparent" 
                                    value={rec.name} 
                                    onChange={e => updateRec(rec.id, 'name', e.target.value)} 
                                />
                             </div>
                             <div className="md:col-span-4">
                                <label className="text-[10px] uppercase text-gray-400 font-bold">Distancia</label>
                                <input 
                                    placeholder="ej. 5 min" 
                                    className="w-full text-sm border-b border-gray-200 focus:border-brand-500 outline-none pb-1 bg-transparent" 
                                    value={rec.distance} 
                                    onChange={e => updateRec(rec.id, 'distance', e.target.value)} 
                                />
                             </div>
                        </div>
                        <div>
                             <label className="text-[10px] uppercase text-gray-400 font-bold">Descripción / Notas</label>
                             <input 
                                placeholder="Breve descripción..." 
                                className="w-full text-xs text-gray-600 border-b border-gray-200 focus:border-brand-500 outline-none pb-1 bg-transparent" 
                                value={rec.description} 
                                onChange={e => updateRec(rec.id, 'description', e.target.value)} 
                            />
                        </div>

                        {/* Expandable Details */}
                        <div className="mt-2 pt-2 border-t border-gray-100 grid grid-cols-3 gap-2">
                            <div>
                                <input 
                                    placeholder="URL Foto..." 
                                    className="w-full text-[10px] border border-gray-100 rounded p-1" 
                                    value={rec.imageUrl || ''} 
                                    onChange={e => updateRec(rec.id, 'imageUrl', e.target.value)} 
                                />
                            </div>
                            <div>
                                <input 
                                    placeholder="Link Mapa..." 
                                    className="w-full text-[10px] border border-gray-100 rounded p-1" 
                                    value={rec.mapUrl || ''} 
                                    onChange={e => updateRec(rec.id, 'mapUrl', e.target.value)} 
                                />
                            </div>
                            <div>
                                <input 
                                    placeholder="Teléfono..." 
                                    className="w-full text-[10px] border border-gray-100 rounded p-1" 
                                    value={rec.phoneNumber || ''} 
                                    onChange={e => updateRec(rec.id, 'phoneNumber', e.target.value)} 
                                />
                            </div>
                        </div>

                        <button 
                            onClick={() => removeRec(rec.id)}
                            className="absolute top-2 right-2 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Eliminar"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};