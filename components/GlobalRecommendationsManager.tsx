import React, { useState, useEffect } from 'react';
import { StorageService } from '../services/storageService';
import { Apartment, Recommendation } from '../types';
import { MapPin, Search, Plus, Edit2, Trash2, Save, X, Utensils, Camera, ShoppingBasket, Globe, Image as ImageIcon, Phone } from 'lucide-react';

export const GlobalRecommendationsManager: React.FC = () => {
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [filterText, setFilterText] = useState('');
  const [filterType, setFilterType] = useState<'All' | 'Restaurant' | 'Attraction' | 'Grocery/Colmado'>('All');
  
  // Editor State
  const [isEditing, setIsEditing] = useState(false);
  const [editingRec, setEditingRec] = useState<Recommendation & { apartmentId: string } | null>(null);

  const loadData = async () => {
      setApartments(await StorageService.getApartments());
  };

  useEffect(() => {
    loadData();
  }, []);

  // Flatten all recommendations into one list
  const allRecs = apartments.flatMap(apt => 
    apt.recommendations.map(rec => ({
      ...rec,
      apartmentId: apt.id,
      apartmentName: apt.name
    }))
  );

  const filteredRecs = allRecs.filter(rec => {
    const matchesText = rec.name.toLowerCase().includes(filterText.toLowerCase()) || 
                        rec.description.toLowerCase().includes(filterText.toLowerCase()) ||
                        rec.apartmentName.toLowerCase().includes(filterText.toLowerCase());
    const matchesType = filterType === 'All' || rec.type === filterType;
    return matchesText && matchesType;
  });

  const handleDelete = async (recId: string) => {
    if (confirm('¿Estás seguro de eliminar esta recomendación? Desaparecerá de la página principal y del apartamento.')) {
      await StorageService.deleteRecommendation(recId);
      await loadData();
    }
  };

  const handleSave = async () => {
    if (!editingRec || !editingRec.apartmentId || !editingRec.name) {
        alert("Por favor completa el nombre y selecciona un apartamento.");
        return;
    }

    if (editingRec.id.startsWith('temp_')) {
        // New Rec
        const { id, ...data } = editingRec; // Remove temp ID
        await StorageService.createRecommendation(data);
    } else {
        // Update
        await StorageService.updateRecommendation(editingRec);
    }

    await loadData();
    setIsEditing(false);
    setEditingRec(null);
  };

  const startAddNew = () => {
    setEditingRec({
        id: 'temp_' + Date.now().toString(),
        name: '',
        type: 'Restaurant',
        description: '',
        distance: '',
        apartmentId: apartments[0]?.id || '',
        imageUrl: '',
        mapUrl: '',
        phoneNumber: ''
    });
    setIsEditing(true);
  };

  const startEdit = (rec: any) => {
      setEditingRec({ ...rec });
      setIsEditing(true);
  };

  const getTypeIcon = (type: string) => {
      switch(type) {
          case 'Restaurant': return <Utensils className="w-4 h-4 text-orange-500" />;
          case 'Attraction': return <Camera className="w-4 h-4 text-blue-500" />;
          case 'Grocery/Colmado': return <ShoppingBasket className="w-4 h-4 text-green-500" />;
          default: return <MapPin className="w-4 h-4" />;
      }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                <Globe className="w-6 h-6 text-brand-600" />
                Descubre los Alrededores
            </h2>
            <p className="text-gray-500 text-sm">Administra lo que aparece en la página principal y en las guías de apartamentos.</p>
        </div>
        <button onClick={startAddNew} className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-lg">
          <Plus className="w-4 h-4" /> Nueva Recomendación
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input 
                type="text" 
                placeholder="Buscar lugar, descripción o apartamento..." 
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                value={filterText}
                onChange={e => setFilterText(e.target.value)}
              />
          </div>
          <div className="flex gap-2">
              {(['All', 'Restaurant', 'Attraction', 'Grocery/Colmado'] as const).map(type => (
                  <button
                    key={type}
                    onClick={() => setFilterType(type)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${filterType === type ? 'bg-brand-100 text-brand-800 border border-brand-200' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}
                  >
                      {type === 'All' ? 'Todos' : type === 'Grocery/Colmado' ? 'Colmados' : type === 'Restaurant' ? 'Restaurantes' : 'Atracciones'}
                  </button>
              ))}
          </div>
      </div>

      {/* Editor Modal/Inline */}
      {isEditing && editingRec && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl p-6 animate-fade-in relative max-h-[90vh] overflow-y-auto">
                  <button onClick={() => setIsEditing(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
                      <X className="w-6 h-6" />
                  </button>
                  <h3 className="text-xl font-bold mb-6 flex items-center gap-2 border-b pb-4">
                      {getTypeIcon(editingRec.type)} 
                      {editingRec.name ? 'Editar Recomendación' : 'Nueva Recomendación'}
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700">Nombre del Lugar</label>
                          <input 
                            className="w-full border p-2 rounded mt-1 focus:ring-2 focus:ring-brand-500 outline-none" 
                            value={editingRec.name}
                            onChange={e => setEditingRec({...editingRec, name: e.target.value})}
                            placeholder="ej. Restaurante El Caribe"
                            autoFocus
                          />
                      </div>
                      
                      <div>
                          <label className="block text-sm font-medium text-gray-700">Tipo</label>
                          <select 
                            className="w-full border p-2 rounded mt-1"
                            value={editingRec.type}
                            onChange={e => setEditingRec({...editingRec, type: e.target.value as any})}
                          >
                              <option value="Restaurant">Restaurante</option>
                              <option value="Attraction">Lugar de Interés</option>
                              <option value="Grocery/Colmado">Colmado / Supermercado</option>
                          </select>
                      </div>

                      <div>
                          <label className="block text-sm font-medium text-gray-700">Distancia</label>
                          <input 
                            className="w-full border p-2 rounded mt-1" 
                            value={editingRec.distance}
                            onChange={e => setEditingRec({...editingRec, distance: e.target.value})}
                            placeholder="ej. 5 min caminando"
                          />
                      </div>

                       {/* New Fields */}
                       <div className="md:col-span-2 grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
                            <div className="col-span-2">
                                <label className="block text-sm font-medium text-gray-700 flex items-center gap-2"><ImageIcon className="w-4 h-4"/> URL de Foto</label>
                                <input 
                                    className="w-full border p-2 rounded mt-1 bg-white text-sm" 
                                    value={editingRec.imageUrl || ''}
                                    onChange={e => setEditingRec({...editingRec, imageUrl: e.target.value})}
                                    placeholder="https://..."
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 flex items-center gap-2"><MapPin className="w-4 h-4"/> Enlace Google Maps</label>
                                <input 
                                    className="w-full border p-2 rounded mt-1 bg-white text-sm" 
                                    value={editingRec.mapUrl || ''}
                                    onChange={e => setEditingRec({...editingRec, mapUrl: e.target.value})}
                                    placeholder="https://maps.google.com..."
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 flex items-center gap-2"><Phone className="w-4 h-4"/> Teléfono</label>
                                <input 
                                    className="w-full border p-2 rounded mt-1 bg-white text-sm" 
                                    value={editingRec.phoneNumber || ''}
                                    onChange={e => setEditingRec({...editingRec, phoneNumber: e.target.value})}
                                    placeholder="+1 809..."
                                />
                            </div>
                       </div>

                      <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700">Asignado al Apartamento</label>
                          <p className="text-xs text-gray-500 mb-1">Aparecerá como "Cerca de..." este apartamento.</p>
                          <select 
                            className="w-full border p-2 rounded mt-1 bg-gray-50"
                            value={editingRec.apartmentId}
                            onChange={e => setEditingRec({...editingRec, apartmentId: e.target.value})}
                          >
                              {apartments.map(apt => (
                                  <option key={apt.id} value={apt.id}>{apt.name}</option>
                              ))}
                          </select>
                      </div>

                      <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700">Descripción</label>
                          <textarea 
                            rows={3}
                            className="w-full border p-2 rounded mt-1 focus:ring-2 focus:ring-brand-500 outline-none" 
                            value={editingRec.description}
                            onChange={e => setEditingRec({...editingRec, description: e.target.value})}
                            placeholder="Breve reseña del lugar..."
                          />
                      </div>
                  </div>

                  <div className="flex justify-end gap-3 mt-8 pt-4 border-t">
                      <button onClick={() => setIsEditing(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancelar</button>
                      <button onClick={handleSave} className="bg-brand-600 hover:bg-brand-700 text-white px-6 py-2 rounded-lg font-bold shadow flex items-center gap-2">
                          <Save className="w-4 h-4" /> Guardar
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* Grid List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filteredRecs.map((rec, idx) => (
            <div key={`${rec.apartmentId}-${rec.id}`} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
                <div>
                    <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                            {rec.imageUrl ? (
                                <img src={rec.imageUrl} className="w-12 h-12 rounded-lg object-cover border" alt="" />
                            ) : (
                                <div className={`p-2 rounded-lg ${rec.type === 'Restaurant' ? 'bg-orange-100' : rec.type === 'Attraction' ? 'bg-blue-100' : 'bg-green-100'}`}>
                                    {getTypeIcon(rec.type)}
                                </div>
                            )}
                            <div>
                                <h4 className="font-bold text-gray-800">{rec.name}</h4>
                                <span className="text-xs text-gray-500">{rec.distance}</span>
                            </div>
                        </div>
                        <div className="flex gap-1">
                            <button onClick={() => startEdit(rec)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors">
                                <Edit2 className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleDelete(rec.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors">
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">{rec.description}</p>
                    <div className="flex gap-2 text-xs text-gray-500 mb-2">
                        {rec.mapUrl && <span className="flex items-center"><MapPin className="w-3 h-3 mr-1"/>Mapa</span>}
                        {rec.phoneNumber && <span className="flex items-center"><Phone className="w-3 h-3 mr-1"/>Tel</span>}
                    </div>
                </div>
                
                <div className="flex justify-between items-center pt-3 border-t mt-2">
                    <div className="flex items-center text-xs text-brand-600 font-medium bg-brand-50 px-2 py-1 rounded">
                        <MapPin className="w-3 h-3 mr-1" />
                        {rec.apartmentName}
                    </div>
                    {rec.type !== 'Grocery/Colmado' && (
                        <span className="text-[10px] font-bold uppercase tracking-wider text-green-600 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
                            Visible en Inicio
                        </span>
                    )}
                </div>
            </div>
        ))}
        {filteredRecs.length === 0 && (
            <div className="col-span-full text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                <p className="text-gray-500 italic">No se encontraron recomendaciones con los filtros actuales.</p>
            </div>
        )}
      </div>
    </div>
  );
};