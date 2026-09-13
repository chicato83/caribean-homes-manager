import React, { useState, useEffect } from 'react';
import { StorageService } from '../services/storageService';
import { GeminiService } from '../services/geminiService';
import { MaintenanceItem, Apartment, CleaningTemplateRoom } from '../types';
import { Clock, CheckCircle2 } from 'lucide-react';

export const MaintenanceManager: React.FC = () => {
  const [items, setItems] = useState<MaintenanceItem[]>([]);
  const [apartments, setApartments] = useState<Apartment[]>([]);
  
  // Form State
  const [newItemName, setNewItemName] = useState('');
  const [selectedApt, setSelectedApt] = useState('');
  const [selectedAreaId, setSelectedAreaId] = useState('');
  const [availableRooms, setAvailableRooms] = useState<CleaningTemplateRoom[]>([]);
  
  // Frequency inputs
  const [freqValue, setFreqValue] = useState<number>(3);
  const [freqUnit, setFreqUnit] = useState<'days' | 'months' | 'years'>('months');

  useEffect(() => {
    const init = async () => {
        setItems(await StorageService.getMaintenance());
        setApartments(await StorageService.getApartments());
    };
    init();
  }, []);

  // When apartment changes, fetch its rooms from the cleaning template
  useEffect(() => {
    const fetchRooms = async () => {
        if (selectedApt) {
            const template = await StorageService.getCleaningTemplate(selectedApt);
            setAvailableRooms(template ? template.rooms : []);
            setSelectedAreaId('');
        } else {
            setAvailableRooms([]);
            setSelectedAreaId('');
        }
    };
    fetchRooms();
  }, [selectedApt]);

  const addMaintenanceItem = async () => {
    if (!newItemName) return;
    
    // Calculate total days
    let frequencyDays = freqValue;
    if (freqUnit === 'months') frequencyDays = freqValue * 30;
    if (freqUnit === 'years') frequencyDays = freqValue * 365;

    // Get Area Name if selected
    const areaName = availableRooms.find(r => r.id === selectedAreaId)?.name || undefined;

    // Optional AI suggestion for notes
    let notes = '';
    if (GeminiService.isEnabled()) {
        try {
            const suggestion = await GeminiService.suggestMaintenance(newItemName);
            notes = suggestion.notes;
        } catch (e) { console.log("AI Suggestion skipped"); }
    }

    const newItem: MaintenanceItem = {
      id: '', // DB ID
      name: newItemName,
      apartmentId: selectedApt || null,
      areaId: selectedAreaId || undefined,
      areaName: areaName,
      lastMaintenanceDate: new Date().toISOString(), // Assume just serviced
      frequencyDays: frequencyDays,
      notes: notes || `Revisar cada ${freqValue} ${freqUnit}`
    };
    
    await StorageService.saveMaintenanceItem(newItem);
    setItems(await StorageService.getMaintenance());
    setNewItemName('');
    setFreqValue(3);
    setFreqUnit('months');
  };

  const getDaysRemaining = (lastDate: string, freq: number) => {
    const last = new Date(lastDate);
    const next = new Date(last);
    next.setDate(last.getDate() + freq);
    const today = new Date();
    const diffTime = next.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
  };

  const performMaintenance = async (id: string) => {
    const item = items.find(i => i.id === id);
    if(item) {
        await StorageService.saveMaintenanceItem({ ...item, lastMaintenanceDate: new Date().toISOString() });
        setItems(await StorageService.getMaintenance());
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Mantenimiento de Equipos</h2>

      <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm border dark:border-slate-700">
         <h3 className="font-semibold text-gray-700 mb-4">Programar Nuevo Mantenimiento</h3>
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
             <div className="lg:col-span-1">
                <label className="text-sm font-medium text-gray-700">Nombre del Equipo</label>
                <input 
                    value={newItemName} 
                    onChange={e => setNewItemName(e.target.value)} 
                    placeholder="ej. Filtro Aire Acondicionado"
                    className="w-full border p-2 rounded mt-1"
                />
             </div>
             <div className="lg:col-span-1">
                <label className="text-sm font-medium text-gray-700">Apartamento</label>
                <select 
                    value={selectedApt} 
                    onChange={e => setSelectedApt(e.target.value)}
                    className="w-full border p-2 rounded mt-1"
                >
                    <option value="">General / Área Común</option>
                    {apartments.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
             </div>
             {selectedApt && availableRooms.length > 0 && (
                <div className="lg:col-span-1 animate-fade-in">
                    <label className="text-sm font-medium text-gray-700">Área (Opcional)</label>
                    <select 
                        value={selectedAreaId} 
                        onChange={e => setSelectedAreaId(e.target.value)}
                        className="w-full border p-2 rounded mt-1"
                    >
                        <option value="">-- Todo el Apto --</option>
                        {availableRooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                    </select>
                </div>
             )}
             <div className="lg:col-span-1">
                <label className="text-sm font-medium text-gray-700">Repetir Cada</label>
                <div className="flex gap-2 mt-1">
                    <input 
                        type="number" 
                        value={freqValue} 
                        onChange={e => setFreqValue(Number(e.target.value))}
                        className="w-16 border p-2 rounded"
                        min="1"
                    />
                    <select 
                        value={freqUnit} 
                        onChange={e => setFreqUnit(e.target.value as any)} 
                        className="flex-1 border p-2 rounded"
                    >
                        <option value="days">Días</option>
                        <option value="months">Meses</option>
                        <option value="years">Años</option>
                    </select>
                </div>
             </div>
             <div className="lg:col-span-1">
                 <button onClick={addMaintenanceItem} className="bg-brand-600 text-white px-4 py-2 rounded h-10 w-full hover:bg-brand-700">
                    Agregar y Programar
                 </button>
             </div>
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {items.map(item => {
            const daysLeft = getDaysRemaining(item.lastMaintenanceDate, item.frequencyDays);
            const isUrgent = daysLeft <= 7;
            const aptName = apartments.find(a => a.id === item.apartmentId)?.name || 'General';

            return (
                <div key={item.id} className={`bg-white dark:bg-slate-800 p-6 rounded-xl shadow border-l-4 ${isUrgent ? 'border-red-500' : 'border-green-500'}`}>
                    <div className="flex justify-between items-start mb-2">
                        <h3 className="font-bold text-lg dark:text-gray-100">{item.name}</h3>
                        <div className="text-right">
                            <span className="block text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">{aptName}</span>
                            {item.areaName && <span className="block text-xs text-brand-600 font-semibold mt-1">{item.areaName}</span>}
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-2 mb-4">
                        <Clock className={`w-5 h-5 ${isUrgent ? 'text-red-500' : 'text-gray-400'}`} />
                        <span className={`font-mono text-xl font-bold ${isUrgent ? 'text-red-600' : 'text-gray-700'}`}>
                            {daysLeft} días restantes
                        </span>
                    </div>

                    <p className="text-sm text-gray-600 mb-4 h-12 overflow-hidden">{item.notes}</p>

                    <button 
                        onClick={() => performMaintenance(item.id)}
                        className="w-full py-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded text-sm font-medium flex justify-center items-center gap-2 transition-colors"
                    >
                        <CheckCircle2 className="w-4 h-4 text-green-600" /> Marcar como Realizado
                    </button>
                </div>
            )
        })}
      </div>
    </div>
  );
};