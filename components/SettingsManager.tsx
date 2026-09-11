import React, { useState, useEffect } from 'react';
import { StorageService } from '../services/storageService';
import { User, Role, Permission } from '../types';
import { Shield, Users, Save, Trash2, Plus, Key } from 'lucide-react';

export const SettingsManager: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'users' | 'roles'>('users');
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);

  // Editing States
  const [editingUser, setEditingUser] = useState<Partial<User> | null>(null);
  const [editingRole, setEditingRole] = useState<Partial<Role> | null>(null);

  useEffect(() => {
    const init = async () => {
        setUsers(await StorageService.getUsers());
        setRoles(await StorageService.getRoles());
    };
    init();
  }, []);

  const refresh = async () => {
      setUsers(await StorageService.getUsers());
      setRoles(await StorageService.getRoles());
  };

  const saveUser = async () => {
    if (!editingUser?.name || !editingUser.pin || !editingUser.roleId) {
        alert("Por favor complete todos los campos (Nombre, PIN, Rol).");
        return;
    }

    try {
        const newUser: User = {
            id: editingUser.id || '',
            name: editingUser.name,
            pin: editingUser.pin,
            roleId: editingUser.roleId
        };
        
        await StorageService.saveUser(newUser);
        await refresh();
        setEditingUser(null);
    } catch (error: any) {
        console.error(error);
        let msg = "Error al guardar usuario.";
        if (error.data?.data) {
             const fields = Object.keys(error.data.data).join(', ');
             msg += ` Error en campos: ${fields}. Verifique que el nombre sea único o el PIN válido.`;
        }
        alert(msg);
    }
  };

  const deleteUser = async (id: string) => {
    if (confirm('¿Eliminar este usuario?')) {
        await StorageService.deleteUser(id);
        await refresh();
    }
  };

  const saveRole = async () => {
    if (!editingRole?.name) return;
    const newRole: Role = {
        id: editingRole.id || '',
        name: editingRole.name,
        permissions: editingRole.permissions || []
    };

    await StorageService.saveRole(newRole);
    await refresh();
    setEditingRole(null);
  };

  const togglePermission = (perm: Permission) => {
    if (!editingRole) return;
    const current = editingRole.permissions || [];
    if (current.includes(perm)) {
        setEditingRole({ ...editingRole, permissions: current.filter(p => p !== perm) });
    } else {
        setEditingRole({ ...editingRole, permissions: [...current, perm] });
    }
  };

  const ALL_PERMISSIONS: { key: Permission, label: string }[] = [
      { key: 'manage_apartments', label: 'Gestionar Apartamentos (Editar/Eliminar)' },
      { key: 'manage_cleaning', label: 'Gestionar Limpieza (Plantillas/Historial)' },
      { key: 'perform_cleaning', label: 'Realizar Limpieza (Llenar Checklist)' },
      { key: 'manage_maintenance', label: 'Gestionar Mantenimiento' },
      { key: 'manage_inventory', label: 'Gestionar Inventario' },
      { key: 'manage_settings', label: 'Gestionar Configuración (Usuarios/Roles)' },
  ];

  return (
    <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-800">Configuración del Sistema</h2>
        
        <div className="flex space-x-4 border-b">
            <button 
                className={`pb-2 px-4 ${activeTab === 'users' ? 'border-b-2 border-brand-600 text-brand-600 font-bold' : 'text-gray-500'}`}
                onClick={() => setActiveTab('users')}
            >
                Usuarios y Personal
            </button>
            <button 
                className={`pb-2 px-4 ${activeTab === 'roles' ? 'border-b-2 border-brand-600 text-brand-600 font-bold' : 'text-gray-500'}`}
                onClick={() => setActiveTab('roles')}
            >
                Roles y Permisos
            </button>
        </div>

        {activeTab === 'users' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-white p-6 rounded-xl shadow">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-lg flex items-center"><Users className="w-5 h-5 mr-2" /> Lista de Personal</h3>
                        <button 
                            onClick={() => setEditingUser({ name: '', pin: '', roleId: roles[0]?.id })}
                            className="bg-brand-600 text-white px-3 py-1 rounded text-sm hover:bg-brand-700"
                        >
                            + Nuevo Usuario
                        </button>
                    </div>
                    <ul className="space-y-2">
                        {users.map(u => (
                            <li key={u.id} className="flex justify-between items-center p-3 bg-gray-50 rounded border hover:bg-gray-100">
                                <div>
                                    <div className="font-bold">{u.name}</div>
                                    <div className="text-xs text-gray-500">Rol: {roles.find(r => r.id === u.roleId)?.name || 'Desconocido'}</div>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => setEditingUser(u)} className="text-blue-600 text-sm">Editar</button>
                                    <button onClick={() => deleteUser(u.id)} className="text-red-500 text-sm"><Trash2 className="w-4 h-4"/></button>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* User Editor */}
                {editingUser && (
                    <div className="bg-blue-50 p-6 rounded-xl border border-blue-200 animate-fade-in">
                        <h3 className="font-bold text-lg mb-4 text-blue-900">{editingUser.id ? 'Editar Usuario' : 'Crear Usuario'}</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium">Nombre</label>
                                <input className="w-full border p-2 rounded" value={editingUser.name} onChange={e => setEditingUser({...editingUser, name: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium">PIN (Acceso)</label>
                                <input className="w-full border p-2 rounded" value={editingUser.pin} onChange={e => setEditingUser({...editingUser, pin: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium">Rol</label>
                                <select className="w-full border p-2 rounded" value={editingUser.roleId} onChange={e => setEditingUser({...editingUser, roleId: e.target.value})}>
                                    <option value="">-- Seleccionar Rol --</option>
                                    {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                                </select>
                            </div>
                            <div className="flex justify-end gap-2 pt-2">
                                <button onClick={() => setEditingUser(null)} className="px-4 py-2 text-gray-600">Cancelar</button>
                                <button onClick={saveUser} className="bg-blue-600 text-white px-4 py-2 rounded flex items-center gap-2">
                                    <Save className="w-4 h-4" /> Guardar Usuario
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        )}

        {activeTab === 'roles' && (
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 <div className="bg-white p-6 rounded-xl shadow">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-lg flex items-center"><Shield className="w-5 h-5 mr-2" /> Roles Definidos</h3>
                        <button 
                            onClick={() => setEditingRole({ name: '', permissions: [] })}
                            className="bg-brand-600 text-white px-3 py-1 rounded text-sm hover:bg-brand-700"
                        >
                            + Nuevo Rol
                        </button>
                    </div>
                    <ul className="space-y-2">
                        {roles.map(r => (
                            <li key={r.id} className="flex justify-between items-center p-3 bg-gray-50 rounded border hover:bg-gray-100">
                                <div>
                                    <div className="font-bold">{r.name}</div>
                                    <div className="text-xs text-gray-500">{r.permissions.length} permisos</div>
                                </div>
                                <button onClick={() => setEditingRole(r)} className="text-blue-600 text-sm">Editar</button>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Role Editor */}
                {editingRole && (
                    <div className="bg-purple-50 p-6 rounded-xl border border-purple-200 animate-fade-in">
                        <h3 className="font-bold text-lg mb-4 text-purple-900">{editingRole.id ? 'Editar Rol' : 'Crear Rol'}</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium">Nombre del Rol</label>
                                <input className="w-full border p-2 rounded" value={editingRole.name} onChange={e => setEditingRole({...editingRole, name: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2">Permisos</label>
                                <div className="space-y-2 bg-white p-3 rounded border h-60 overflow-y-auto">
                                    {ALL_PERMISSIONS.map(perm => (
                                        <label key={perm.key} className="flex items-center space-x-2 p-1 hover:bg-gray-50 rounded cursor-pointer">
                                            <input 
                                                type="checkbox" 
                                                checked={editingRole.permissions?.includes(perm.key)}
                                                onChange={() => togglePermission(perm.key)}
                                                className="rounded text-purple-600"
                                            />
                                            <span className="text-sm">{perm.label}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                            <div className="flex justify-end gap-2 pt-2">
                                <button onClick={() => setEditingRole(null)} className="px-4 py-2 text-gray-600">Cancelar</button>
                                <button onClick={saveRole} className="bg-purple-600 text-white px-4 py-2 rounded flex items-center gap-2">
                                    <Save className="w-4 h-4" /> Guardar Rol
                                </button>
                            </div>
                        </div>
                    </div>
                )}
             </div>
        )}
    </div>
  );
};