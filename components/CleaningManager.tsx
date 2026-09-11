import React, { useState, useEffect } from 'react';
import { StorageService } from '../services/storageService';
import { Apartment, CleaningLog, InventoryStatus, CleaningTemplate, CleaningTemplateRoom, InventoryItem, Role } from '../types';
import { CheckCircle, Plus, Trash2, Clipboard, Save, ArrowRight, X, AlertTriangle, AlertCircle, ChevronDown, ChevronUp, Calendar, DollarSign, Clock } from 'lucide-react';

interface CleaningManagerProps {
    role?: Role;
}

export const CleaningManager: React.FC<CleaningManagerProps> = ({ role }) => {
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [logs, setLogs] = useState<CleaningLog[]>([]);
  const [activeMode, setActiveMode] = useState<'list' | 'perform' | 'template'>('list');

  useEffect(() => {
    const init = async () => {
        setApartments(await StorageService.getApartments());
        setLogs(await StorageService.getCleaningLogs());
    };
    init();
  }, []);

  const refreshLogs = async () => {
      setLogs(await StorageService.getCleaningLogs());
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-800">Gestión de Limpieza</h2>
        <div className="flex gap-2">
            {activeMode === 'list' && (
                <>
                <button onClick={() => setActiveMode('perform')} className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-green-700">
                    <Clipboard className="w-4 h-4" /> Iniciar Limpieza
                </button>
                {(role?.permissions.includes('manage_cleaning') || role?.permissions.includes('manage_settings')) && (
                    <button onClick={() => setActiveMode('template')} className="bg-brand-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-brand-700">
                        <Plus className="w-4 h-4" /> Plantillas de Limpieza
                    </button>
                )}
                </>
            )}
             {activeMode !== 'list' && (
                <button onClick={() => setActiveMode('list')} className="text-gray-600 hover:text-gray-800">
                   ← Volver al Panel
                </button>
            )}
        </div>
      </div>

      {activeMode === 'list' && <CleaningHistory logs={logs} apartments={apartments} role={role} onUpdate={refreshLogs} />}
      {activeMode === 'perform' && <PerformCleaning apartments={apartments} onComplete={() => {
          refreshLogs();
          setActiveMode('list');
      }} />}
      {activeMode === 'template' && <ManageTemplates apartments={apartments} />}
    </div>
  );
};

// --- SUB-COMPONENT: TEMPLATE MANAGER (ADMIN) ---
const ManageTemplates: React.FC<{apartments: Apartment[]}> = ({ apartments }) => {
    const [selectedAptId, setSelectedAptId] = useState('');
    const [template, setTemplate] = useState<CleaningTemplate | null>(null);
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    
    // UI States for adding rooms/items
    const [isAddingRoom, setIsAddingRoom] = useState(false);
    const [newRoomName, setNewRoomName] = useState('');
    const [addingItemToRoomIdx, setAddingItemToRoomIdx] = useState<number | null>(null);
    const [newItemData, setNewItemData] = useState({ name: '', quantity: 1, isCustom: false });

    // Save Feedback State
    const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

    useEffect(() => {
        const load = async () => setInventory(await StorageService.getInventory());
        load();
    }, []);

    const loadTemplate = async (aptId: string) => {
        setSelectedAptId(aptId);
        setSaveStatus('idle');
        // Reset UI states
        setIsAddingRoom(false);
        setAddingItemToRoomIdx(null);

        if(!aptId) {
            setTemplate(null);
            return;
        }
        const existing = await StorageService.getCleaningTemplate(aptId);
        if (existing) {
            setTemplate(existing);
        } else {
            // Create default skeleton
            const apt = apartments.find(a => a.id === aptId);
            const defaultRooms: CleaningTemplateRoom[] = [];
            
            // Add rooms based on bedroom count
            for(let i=1; i <= (apt?.bedrooms || 1); i++) {
                defaultRooms.push({ id: `rm_bed_${i}`, name: `Habitación ${i}`, items: [
                    { id: 'it_sh', name: 'Juego de Sábanas', targetQuantity: 1 },
                    { id: 'it_pill', name: 'Almohadas', targetQuantity: 2 },
                ] });
            }
            // Add bathrooms
            for(let i=1; i <= (apt?.bathrooms || 1); i++) {
                defaultRooms.push({ id: `rm_bath_${i}`, name: `Baño ${i}`, items: [
                    { id: 'it_twl', name: 'Toallas de Baño', targetQuantity: 2 },
                    { id: 'it_tp', name: 'Papel Higiénico', targetQuantity: 1 },
                ] });
            }
            // Common areas
            defaultRooms.push({ id: 'rm_kitchen', name: 'Cocina', items: [] });
            defaultRooms.push({ id: 'rm_living', name: 'Sala de Estar', items: [] });
            
            setTemplate({ apartmentId: aptId, rooms: defaultRooms });
        }
    };

    const handleAddRoom = () => {
        if(!template || !newRoomName.trim()) return;
        const newRoom: CleaningTemplateRoom = { id: `rm_${Date.now()}`, name: newRoomName, items: [] };
        setTemplate({ ...template, rooms: [...template.rooms, newRoom] });
        setNewRoomName('');
        setIsAddingRoom(false);
    };

    const initiateAddItem = (roomIndex: number) => {
        setAddingItemToRoomIdx(roomIndex);
        setNewItemData({ name: '', quantity: 1, isCustom: false });
    };

    const handleAddItem = () => {
        if(!template || addingItemToRoomIdx === null || !newItemData.name) return;
        
        const newItem = { 
            id: `it_${Date.now()}`, 
            name: newItemData.name, 
            targetQuantity: newItemData.quantity 
        };
        
        const newRooms = [...template.rooms];
        newRooms[addingItemToRoomIdx].items.push(newItem);
        setTemplate({ ...template, rooms: newRooms });
        
        setAddingItemToRoomIdx(null);
    };

    const removeItem = (roomIndex: number, itemIndex: number) => {
        if(!template) return;
        const newRooms = [...template.rooms];
        newRooms[roomIndex].items.splice(itemIndex, 1);
        setTemplate({ ...template, rooms: newRooms });
    };

    const saveTemplate = async () => {
        if(template) {
            try {
                await StorageService.saveCleaningTemplate(template);
                setSaveStatus('success');
                setTimeout(() => setSaveStatus('idle'), 3000);
            } catch (e) {
                console.error(e);
                setSaveStatus('error');
            }
        } else {
            setSaveStatus('error');
        }
    };

    return (
        <div className="bg-white p-6 rounded-xl shadow border">
            <h3 className="text-xl font-bold mb-4">Editar Plantilla de Limpieza</h3>
            
            {/* Feedback Banners */}
            {saveStatus === 'success' && (
                <div className="mb-4 bg-green-100 border border-green-400 text-green-800 px-4 py-3 rounded relative flex items-center animate-fade-in">
                    <CheckCircle className="w-5 h-5 mr-2" />
                    <span className="font-bold">¡Éxito!</span> <span className="ml-1">Plantilla guardada correctamente.</span>
                </div>
            )}
            {saveStatus === 'error' && (
                <div className="mb-4 bg-red-100 border border-red-400 text-red-800 px-4 py-3 rounded relative flex items-center animate-fade-in">
                    <AlertCircle className="w-5 h-5 mr-2" />
                    <span className="font-bold">¡Error!</span> <span className="ml-1">No se pudieron guardar los cambios.</span>
                </div>
            )}

            <div className="mb-6">
                 <label className="block text-sm font-medium text-gray-700">Seleccionar Apartamento para Editar</label>
                 <select 
                    className="w-full border p-2 rounded mt-1"
                    value={selectedAptId}
                    onChange={(e) => loadTemplate(e.target.value)}
                 >
                    <option value="">-- Seleccionar --</option>
                    {apartments.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                 </select>
            </div>

            {template && (
                <div className="space-y-6 animate-fade-in">
                    <div className="flex justify-between items-center bg-gray-50 p-3 rounded-lg border border-gray-200">
                        <div>
                             <h4 className="font-semibold text-gray-800">Habitaciones y Áreas</h4>
                             <p className="text-xs text-gray-500">Defina la estructura para la inspección.</p>
                        </div>
                        
                        {!isAddingRoom ? (
                            <button onClick={() => setIsAddingRoom(true)} className="bg-white border border-brand-200 text-brand-700 px-3 py-1.5 rounded-md text-sm font-medium hover:bg-brand-50 shadow-sm flex items-center gap-1">
                                <Plus className="w-4 h-4" /> Agregar Habitación/Área
                            </button>
                        ) : (
                            <div className="flex gap-2 items-center animate-fade-in">
                                <input 
                                    autoFocus
                                    className="border p-1 rounded text-sm w-40" 
                                    placeholder="Nombre del Área..." 
                                    value={newRoomName}
                                    onChange={e => setNewRoomName(e.target.value)}
                                />
                                <button onClick={handleAddRoom} className="bg-brand-600 text-white text-xs px-2 py-1.5 rounded">Agregar</button>
                                <button onClick={() => setIsAddingRoom(false)} className="text-gray-400 hover:text-red-500"><X className="w-4 h-4"/></button>
                            </div>
                        )}
                    </div>

                    <div className="grid gap-6">
                        {template.rooms.map((room, rIdx) => (
                            <div key={room.id} className="border border-gray-200 rounded-lg p-4 bg-white shadow-sm relative">
                                <div className="flex justify-between items-center mb-4 border-b pb-2">
                                    <h4 className="font-bold text-lg text-gray-800">{room.name}</h4>
                                    <button 
                                        onClick={() => {
                                            const newRooms = template.rooms.filter((_, idx) => idx !== rIdx);
                                            setTemplate({...template, rooms: newRooms});
                                        }}
                                        className="text-gray-400 hover:text-red-500"
                                        title="Eliminar Habitación"
                                    >
                                        <Trash2 className="w-4 h-4"/>
                                    </button>
                                </div>

                                <div className="space-y-3">
                                    {room.items.length === 0 && <p className="text-xs text-gray-400 italic text-center py-2">No hay artículos configurados para esta área.</p>}
                                    
                                    {room.items.map((item, iIdx) => (
                                        <div key={item.id} className="flex justify-between items-center bg-gray-50 px-3 py-2 rounded border border-gray-100">
                                            <span className="text-sm font-medium text-gray-700">{item.name}</span>
                                            <div className="flex items-center gap-4">
                                                <span className="text-xs text-gray-500 bg-white px-2 py-0.5 rounded border">Cant: {item.targetQuantity}</span>
                                                <button onClick={() => removeItem(rIdx, iIdx)} className="text-red-400 hover:text-red-600"><Trash2 className="w-3 h-3"/></button>
                                            </div>
                                        </div>
                                    ))}

                                    {/* Add Item Form */}
                                    {addingItemToRoomIdx === rIdx ? (
                                        <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-100 animate-fade-in">
                                            <h5 className="text-xs font-bold text-blue-800 mb-2 uppercase tracking-wide">Agregar Artículo a {room.name}</h5>
                                            <div className="flex flex-col gap-3">
                                                <div className="flex gap-2">
                                                    <button 
                                                        className={`text-xs px-2 py-1 rounded ${!newItemData.isCustom ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'}`}
                                                        onClick={() => setNewItemData({...newItemData, isCustom: false, name: ''})}
                                                    >
                                                        Del Inventario
                                                    </button>
                                                    <button 
                                                        className={`text-xs px-2 py-1 rounded ${newItemData.isCustom ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'}`}
                                                        onClick={() => setNewItemData({...newItemData, isCustom: true, name: ''})}
                                                    >
                                                        Nombre Personalizado
                                                    </button>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                                                    <div className="md:col-span-2">
                                                        {!newItemData.isCustom ? (
                                                            <select 
                                                                className="w-full text-sm border p-1.5 rounded"
                                                                value={newItemData.name}
                                                                onChange={e => setNewItemData({...newItemData, name: e.target.value})}
                                                            >
                                                                <option value="">-- Seleccionar --</option>
                                                                {inventory.map(inv => (
                                                                    <option key={inv.id} value={inv.name}>{inv.name} (Stock: {inv.totalQuantity})</option>
                                                                ))}
                                                            </select>
                                                        ) : (
                                                            <input 
                                                                className="w-full text-sm border p-1.5 rounded"
                                                                placeholder="Nombre del Artículo"
                                                                value={newItemData.name}
                                                                onChange={e => setNewItemData({...newItemData, name: e.target.value})}
                                                            />
                                                        )}
                                                    </div>
                                                    <div>
                                                        <input 
                                                            type="number" 
                                                            min="1"
                                                            className="w-full text-sm border p-1.5 rounded"
                                                            placeholder="Cant"
                                                            value={newItemData.quantity}
                                                            onChange={e => setNewItemData({...newItemData, quantity: Number(e.target.value)})}
                                                        />
                                                    </div>
                                                </div>
                                                <div className="flex justify-end gap-2 mt-1">
                                                    <button onClick={() => setAddingItemToRoomIdx(null)} className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1">Cancelar</button>
                                                    <button onClick={handleAddItem} className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 font-medium">Agregar Item</button>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <button 
                                            onClick={() => initiateAddItem(rIdx)} 
                                            className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-400 text-sm hover:border-brand-300 hover:text-brand-500 hover:bg-brand-50 transition-colors flex justify-center items-center gap-1"
                                        >
                                            <Plus className="w-4 h-4" /> Agregar Artículo
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="pt-6 border-t flex justify-end sticky bottom-0 bg-white p-4 border-t shadow-inner -mx-6 -mb-6 rounded-b-xl z-10">
                        <button onClick={saveTemplate} className="bg-green-600 text-white px-8 py-3 rounded-lg flex items-center gap-2 hover:bg-green-700 font-bold shadow-lg transform hover:-translate-y-0.5 transition-all">
                            <Save className="w-5 h-5" /> Guardar Configuración
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};


// --- SUB-COMPONENT: PERFORM CLEANING (EMPLOYEE) ---
const PerformCleaning: React.FC<{apartments: Apartment[], onComplete: () => void}> = ({ apartments, onComplete }) => {
    const [selectedAptId, setSelectedAptId] = useState('');
    const [cleanerName, setCleanerName] = useState('');
    const [notes, setNotes] = useState('');
    const [template, setTemplate] = useState<CleaningTemplate | null>(null);
    // Inspection State: { [itemId]: { quantityFound, status } }
    const [inspectionData, setInspectionData] = useState<Record<string, { qty: number, status: InventoryStatus }>>({});

    const startSession = async (aptId: string) => {
        if (!aptId) {
            setSelectedAptId('');
            setTemplate(null);
            return;
        }

        setSelectedAptId(aptId);
        
        let tpl = await StorageService.getCleaningTemplate(aptId);
        
        if (!tpl) {
            const apt = apartments.find(a => a.id === aptId);
            if (apt) {
                const defaultRooms: CleaningTemplateRoom[] = [];
                for(let i=1; i <= (apt.bedrooms || 1); i++) {
                    defaultRooms.push({ id: `rm_bed_${i}`, name: `Habitación ${i}`, items: [
                        { id: `it_sh_${i}`, name: 'Sábanas', targetQuantity: 1 },
                    ] });
                }
                for(let i=1; i <= (apt.bathrooms || 1); i++) {
                    defaultRooms.push({ id: `rm_bath_${i}`, name: `Baño ${i}`, items: [
                        { id: `it_twl_${i}`, name: 'Toallas', targetQuantity: 2 },
                        { id: `it_tp_${i}`, name: 'Papel Higiénico', targetQuantity: 1 },
                    ] });
                }
                defaultRooms.push({ id: 'rm_kitchen', name: 'Cocina', items: [] });
                defaultRooms.push({ id: 'rm_living', name: 'Sala', items: [] });

                tpl = {
                    apartmentId: aptId,
                    rooms: defaultRooms
                };
            }
        }

        if(!tpl) {
             alert("No se pudo cargar la lista de verificación.");
             return;
        }

        setTemplate(tpl);
        // Init state
        const initialData: any = {};
        tpl.rooms.forEach(room => {
            room.items.forEach(item => {
                initialData[item.id] = { qty: item.targetQuantity, status: InventoryStatus.GOOD };
            });
        });
        setInspectionData(initialData);
    };

    const handleSubmit = async () => {
        if (!selectedAptId) {
            alert("Error: No se ha seleccionado un apartamento.");
            return;
        }

        const missingFields: string[] = [];
        
        if (!cleanerName.trim()) {
            missingFields.push("Nombre del Personal");
        }

        if (template) {
            template.rooms.forEach(room => {
                room.items.forEach(item => {
                    const data = inspectionData[item.id];
                    // Check if undefined, null or negative
                    if (data.qty === undefined || data.qty === null || data.qty < 0 || isNaN(data.qty)) {
                        missingFields.push(`Cantidad en: ${room.name} - ${item.name}`);
                    }
                });
            });
        }

        if (missingFields.length > 0) {
            alert(`Faltan los siguientes campos por completar:\n\n- ${missingFields.join('\n- ')}`);
            return;
        }

        // Flatten data for log
        const logItems = [];
        if(template) {
            for (const room of template.rooms) {
                for (const item of room.items) {
                    const data = inspectionData[item.id];
                    logItems.push({
                        itemName: item.name,
                        roomName: room.name,
                        targetQuantity: item.targetQuantity,
                        quantityFound: data.qty,
                        status: data.status
                    });
                }
            }
        }

        const log: CleaningLog = {
            id: '', // DB auto ID
            apartmentId: selectedAptId,
            date: new Date().toISOString(),
            cleanerName,
            notes,
            items: logItems,
            paymentStatus: 'Pending'
        };

        await StorageService.addCleaningLog(log);
        onComplete();
    };

    const updateItem = (itemId: string, field: 'qty' | 'status', value: any) => {
        setInspectionData(prev => ({
            ...prev,
            [itemId]: { ...prev[itemId], [field]: value }
        }));
    };

    if(!selectedAptId) {
        return (
            <div className="bg-white p-8 rounded-xl shadow text-center max-w-lg mx-auto">
                <h3 className="text-xl font-bold mb-4">Iniciar Nueva Inspección</h3>
                <label className="block text-left text-sm font-medium text-gray-700 mb-2">Seleccionar Apartamento</label>
                <select className="w-full border p-3 rounded mb-4" onChange={(e) => startSession(e.target.value)} value={selectedAptId}>
                    <option value="">-- Elegir Apartamento --</option>
                    {apartments.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
            </div>
        );
    }

    return (
        <div className="bg-white p-6 rounded-xl shadow max-w-3xl mx-auto animate-fade-in">
             <div className="flex justify-between items-center mb-6 border-b pb-4">
                <div>
                    <h3 className="text-xl font-bold">Inspección: {apartments.find(a => a.id === selectedAptId)?.name}</h3>
                    <p className="text-sm text-gray-500">Complete todos los artículos encontrados.</p>
                </div>
             </div>

             <div className="mb-6 grid grid-cols-2 gap-4">
                 <div>
                    <label className="text-sm font-medium">Nombre del Personal <span className="text-red-500">*</span></label>
                    <input className="w-full border p-2 rounded" value={cleanerName} onChange={e => setCleanerName(e.target.value)} placeholder="Su Nombre" />
                 </div>
             </div>

             {template?.rooms.map(room => (
                 <div key={room.id} className="mb-6">
                     <h4 className="bg-gray-100 p-2 rounded font-bold text-gray-800 mb-2">{room.name}</h4>
                     <div className="space-y-2">
                         {room.items.map(item => {
                             const data = inspectionData[item.id] || { qty: 0, status: InventoryStatus.MISSING };
                             return (
                                 <div key={item.id} className="flex flex-col md:flex-row md:items-center justify-between border-b pb-2 md:pb-0 md:border-none p-2 hover:bg-gray-50">
                                     <div className="w-1/3 font-medium text-sm">{item.name} <span className="text-xs text-gray-400">(Debe haber {item.targetQuantity})</span></div>
                                     <div className="flex gap-2 flex-1 justify-end">
                                         <div className="flex items-center gap-1">
                                             <span className="text-xs text-gray-500">Hay:</span>
                                             <input 
                                                type="number" 
                                                className={`w-16 border p-1 rounded text-center ${data.qty !== item.targetQuantity ? 'bg-yellow-50 border-yellow-300' : ''}`}
                                                value={data.qty}
                                                onChange={e => updateItem(item.id, 'qty', Number(e.target.value))}
                                             />
                                         </div>
                                         <select 
                                            className={`border p-1 rounded text-sm ${data.status === 'Good' ? 'text-green-600' : 'text-red-600'}`}
                                            value={data.status}
                                            onChange={e => updateItem(item.id, 'status', e.target.value)}
                                         >
                                            <option value={InventoryStatus.GOOD}>Buen Estado</option>
                                            <option value={InventoryStatus.STAINED}>Manchado</option>
                                            <option value={InventoryStatus.MISSING}>Faltante</option>
                                            <option value={InventoryStatus.BROKEN}>Roto</option>
                                         </select>
                                     </div>
                                 </div>
                             );
                         })}
                         {room.items.length === 0 && <p className="text-sm text-gray-400 italic p-2">No hay items para revisar.</p>}
                     </div>
                 </div>
             ))}

             <div className="mt-6">
                <label className="text-sm font-medium">Notas del Reporte</label>
                <textarea className="w-full border p-2 rounded" rows={3} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Daños o problemas encontrados..."></textarea>
             </div>

             <div className="mt-6 flex justify-end gap-3">
                 <button onClick={() => window.confirm('¿Cancelar inspección?') && onComplete()} className="px-4 py-2 text-gray-600">Cancelar</button>
                 <button onClick={handleSubmit} className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 font-bold">Enviar Reporte</button>
             </div>
        </div>
    );
};

// --- SUB-COMPONENT: HISTORY LIST ---
const CleaningHistory: React.FC<{logs: CleaningLog[], apartments: Apartment[], role?: Role, onUpdate: () => void}> = ({ logs, apartments, role, onUpdate }) => {
    const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
    const [filterDate, setFilterDate] = useState<string>('');

    const toggleExpand = (id: string) => {
        setExpandedLogId(expandedLogId === id ? null : id);
    };

    const togglePaymentStatus = async (log: CleaningLog, e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent expanding row
        if (!role?.permissions.includes('manage_cleaning')) return;

        const newStatus: 'Pending' | 'Paid' = log.paymentStatus === 'Paid' ? 'Pending' : 'Paid';
        const updatedLog = { ...log, paymentStatus: newStatus };
        await StorageService.updateCleaningLog(updatedLog);
        onUpdate();
    };

    const filteredLogs = logs.filter(log => {
        if (!filterDate) return true;
        return log.date.startsWith(filterDate);
    });

    const translateStatus = (status: string) => {
        switch(status) {
            case 'Good': return 'Buen Estado';
            case 'Stained': return 'Manchado';
            case 'Missing': return 'Faltante';
            case 'Broken': return 'Roto';
            default: return status;
        }
    }

    const isAdmin = role?.permissions.includes('manage_cleaning');

    return (
        <div className="bg-white rounded-xl shadow overflow-hidden">
            <div className="p-4 border-b flex items-center justify-between bg-gray-50">
                <h3 className="font-semibold text-gray-700">Historial de Limpiezas</h3>
                <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-600">Filtrar por fecha:</span>
                    <input 
                        type="date" 
                        className="border rounded px-2 py-1 text-sm"
                        value={filterDate}
                        onChange={(e) => setFilterDate(e.target.value)}
                    />
                    {filterDate && (
                        <button onClick={() => setFilterDate('')} className="text-xs text-brand-600 hover:underline">Limpiar</button>
                    )}
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-100">
                    <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Apartamento</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Personal</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Resultado</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pago</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Detalles</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {filteredLogs.map(log => {
                    const apt = apartments.find(a => a.id === log.apartmentId);
                    const issues = log.items ? log.items.filter(i => i.status !== InventoryStatus.GOOD || i.quantityFound !== i.targetQuantity) : []; 
                    const isExpanded = expandedLogId === log.id;
                    const isPaid = log.paymentStatus === 'Paid';
                    
                    return (
                        <React.Fragment key={log.id}>
                            <tr onClick={() => toggleExpand(log.id)} className="cursor-pointer hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {new Date(log.date).toLocaleString()}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                    {apt?.name || 'Apt Desconocido'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {log.cleanerName}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    {issues.length > 0 ? (
                                        <span className="px-2 py-1 text-xs font-bold rounded-full bg-red-100 text-red-800">
                                        {issues.length} Problemas
                                        </span>
                                    ) : (
                                        <span className="px-2 py-1 text-xs font-bold rounded-full bg-green-100 text-green-800">
                                        Perfecto
                                        </span>
                                    )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`px-2 py-1 text-xs font-bold rounded-full flex items-center w-fit gap-1 ${isPaid ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                        {isPaid ? <DollarSign className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                                        {isPaid ? 'Pagado' : 'Pendiente'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    {isExpanded ? <ChevronUp className="w-4 h-4 inline text-gray-400" /> : <ChevronDown className="w-4 h-4 inline text-gray-400" />}
                                </td>
                            </tr>
                            {isExpanded && (
                                <tr className="bg-gray-50">
                                    <td colSpan={6} className="px-6 py-4">
                                        <div className="border rounded-lg bg-white p-4 shadow-inner">
                                            <div className="flex justify-between items-start border-b pb-2 mb-4">
                                                <h4 className="font-bold text-sm text-gray-800">Informe Detallado</h4>
                                                {/* Admin Payment Toggle */}
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs text-gray-500 font-medium">Estado del Pago:</span>
                                                    {isAdmin ? (
                                                        <button 
                                                            onClick={(e) => togglePaymentStatus(log, e)}
                                                            className={`text-xs px-3 py-1.5 rounded-lg border font-bold transition-colors flex items-center gap-1 ${
                                                                isPaid 
                                                                ? 'bg-green-50 text-green-700 border-green-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200' 
                                                                : 'bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-green-50 hover:text-green-600 hover:border-green-200'
                                                            }`}
                                                        >
                                                            {isPaid ? 'Marcar como Pendiente' : 'Marcar como Pagado'}
                                                        </button>
                                                    ) : (
                                                        <span className={`text-xs font-bold ${isPaid ? 'text-green-600' : 'text-yellow-600'}`}>
                                                            {isPaid ? 'PAGADO' : 'PENDIENTE'}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="mb-4">
                                                <span className="font-semibold text-xs text-gray-500 uppercase">Notas del Personal:</span>
                                                <p className="text-sm text-gray-700 italic">{log.notes || "Sin notas adicionales."}</p>
                                            </div>
                                            
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                {log.items.map((item, idx) => (
                                                    <div key={idx} className={`text-sm p-2 rounded border ${item.status !== InventoryStatus.GOOD || item.quantityFound !== item.targetQuantity ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-100'}`}>
                                                        <div className="font-bold text-gray-700">{item.roomName} - {item.itemName}</div>
                                                        <div className="flex justify-between mt-1">
                                                            <span>Esperado: {item.targetQuantity} | <span className="font-semibold">Encontrado: {item.quantityFound}</span></span>
                                                        </div>
                                                        <div className={`mt-1 font-semibold ${item.status !== InventoryStatus.GOOD ? 'text-red-600' : 'text-green-600'}`}>
                                                            Estado: {translateStatus(item.status)}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </React.Fragment>
                    );
                    })}
                </tbody>
                </table>
            </div>
            {filteredLogs.length === 0 && <div className="p-8 text-center text-gray-500">No hay registros de limpieza.</div>}
        </div>
    );
};