import React, { useState, useEffect } from 'react';
import { StorageService } from '../services/storageService';
import { InventoryItem } from '../types';
import { AlertTriangle, Plus, X, Save } from 'lucide-react';

export const InventoryManager: React.FC = () => {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  
  // New Item State
  const [newItem, setNewItem] = useState<Partial<InventoryItem>>({
    name: '',
    category: 'General',
    totalQuantity: 0,
    minThreshold: 5
  });

  useEffect(() => {
    const load = async () => setInventory(await StorageService.getInventory());
    load();
  }, []);

  const updateQuantity = async (id: string, delta: number) => {
    const item = inventory.find(i => i.id === id);
    if(item) {
        await StorageService.saveInventoryItem({ ...item, totalQuantity: Math.max(0, item.totalQuantity + delta) });
        setInventory(await StorageService.getInventory());
    }
  };

  const handleAddItem = async () => {
    if (!newItem.name || newItem.totalQuantity === undefined) return;

    const item: InventoryItem = {
      id: '', // DB ID
      name: newItem.name,
      category: newItem.category || 'General',
      totalQuantity: Number(newItem.totalQuantity),
      minThreshold: Number(newItem.minThreshold || 0)
    };

    await StorageService.saveInventoryItem(item);
    setInventory(await StorageService.getInventory());
    
    // Reset
    setShowAddForm(false);
    setNewItem({ name: '', category: 'General', totalQuantity: 0, minThreshold: 5 });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Inventario Maestro</h2>
            <p className="text-gray-600 dark:text-gray-400">Control de stock en almacén.</p>
        </div>
        <button 
            onClick={() => setShowAddForm(!showAddForm)}
            className="bg-brand-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-brand-700"
        >
            <Plus className="w-4 h-4" /> Agregar Producto
        </button>
      </div>

      {showAddForm && (
        <div className="bg-white p-6 rounded-xl shadow-lg border border-brand-200 animate-fade-in">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-gray-800">Detalles del Nuevo Producto</h3>
                <button onClick={() => setShowAddForm(false)} className="text-gray-500 hover:text-red-500"><X className="w-5 h-5"/></button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700">Nombre del Artículo</label>
                    <input 
                        className="w-full border p-2 rounded mt-1" 
                        value={newItem.name} 
                        onChange={e => setNewItem({...newItem, name: e.target.value})}
                        placeholder="ej. Botellas de Shampoo"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Categoría</label>
                    <select 
                        className="w-full border p-2 rounded mt-1"
                        value={newItem.category}
                        onChange={e => setNewItem({...newItem, category: e.target.value})}
                    >
                        <option value="General">General</option>
                        <option value="Linens">Lencería</option>
                        <option value="Consumables">Consumibles</option>
                        <option value="Electronics">Electrónicos</option>
                        <option value="Kitchen">Cocina</option>
                        <option value="Maintenance">Mantenimiento</option>
                    </select>
                </div>
                <div>
                     <label className="block text-sm font-medium text-gray-700">Cant. Inicial</label>
                     <input 
                        type="number" 
                        className="w-full border p-2 rounded mt-1" 
                        value={newItem.totalQuantity} 
                        onChange={e => setNewItem({...newItem, totalQuantity: Number(e.target.value)})}
                    />
                </div>
                <div>
                     <label className="block text-sm font-medium text-gray-700">Alerta Mín.</label>
                     <input 
                        type="number" 
                        className="w-full border p-2 rounded mt-1" 
                        value={newItem.minThreshold} 
                        onChange={e => setNewItem({...newItem, minThreshold: Number(e.target.value)})}
                    />
                </div>
                <div className="md:col-span-4 flex justify-end mt-2">
                    <button onClick={handleAddItem} className="bg-green-600 text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-green-700">
                        <Save className="w-4 h-4" /> Guardar en Inventario
                    </button>
                </div>
            </div>
        </div>
      )}

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow overflow-hidden border border-gray-200 dark:border-slate-700">
        <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
                <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Categoría</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">En Stock</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
                </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
                {inventory.map(item => (
                    <tr key={item.id}>
                        <td className="px-6 py-4 font-medium text-gray-900">{item.name}</td>
                        <td className="px-6 py-4 text-gray-500">{item.category}</td>
                        <td className="px-6 py-4 font-bold text-lg">{item.totalQuantity}</td>
                        <td className="px-6 py-4">
                            {item.totalQuantity <= item.minThreshold ? (
                                <div className="flex items-center text-red-600 bg-red-50 px-2 py-1 rounded w-fit text-xs font-bold">
                                    <AlertTriangle className="w-3 h-3 mr-1" /> Stock Bajo
                                </div>
                            ) : (
                                <span className="text-green-600 bg-green-50 px-2 py-1 rounded text-xs font-bold">OK</span>
                            )}
                        </td>
                        <td className="px-6 py-4 space-x-2">
                            <button onClick={() => updateQuantity(item.id, -1)} className="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300">-</button>
                            <button onClick={() => updateQuantity(item.id, 1)} className="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300">+</button>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
        {inventory.length === 0 && <p className="text-center p-8 text-gray-500">No se encontraron artículos.</p>}
      </div>
    </div>
  );
};