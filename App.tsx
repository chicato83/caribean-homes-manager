import React, { useState, useEffect } from 'react';
import { StorageService } from './services/storageService';
import { GuestView } from './components/GuestView';
import { AdminDashboard } from './components/AdminDashboard';
import { Lock, User as UserIcon, X, AlertTriangle, ShieldCheck, Settings } from 'lucide-react';
import { User, Role } from './types';

const App: React.FC = () => {
  const [apartments, setApartments] = useState<any[]>([]);
  
  // Auth State
  const [showLogin, setShowLogin] = useState(false);
  const [pin, setPin] = useState('');
  const [loginError, setLoginError] = useState('');
  const [showUserHelp, setShowUserHelp] = useState(false); // New state for help guide
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentRole, setCurrentRole] = useState<Role | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  
  // Error State
  const [permissionError, setPermissionError] = useState(false);

  // Initial load
  useEffect(() => {
    const init = async () => {
        try {
            setApartments(await StorageService.getApartments());
        } catch (error: any) {
            console.error("Initialization Error:", error);
            // Check for Supabase permission/config error
            if (error.code === 'PGRST301' || error.message?.includes('permission') || error.message?.includes('42P01')) {
                setPermissionError(true);
            }
        } finally {
            setIsInitializing(false);
        }
    };
    init();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
      e.preventDefault();
      setLoginError('');
      setShowUserHelp(false);
      
      try {
        // Fetch fresh data to ensure we have latest users/roles
        const users = await StorageService.getUsers();
        const roles = await StorageService.getRoles();

        console.log("Debug - Users fetched:", users);
        console.log("Debug - Roles fetched:", roles);
        
        if (users.length === 0) {
            setLoginError('No se encontraron usuarios visibles.');
            setShowUserHelp(true); // Trigger help guide
            return;
        }

        // Normalize inputs (trim spaces, handle string/number differences)
        const inputPin = pin.trim();
        const user = users.find(u => String(u.pin).trim() === inputPin);
        
        if (user) {
            // User found, now validate Role
            // Handle case where roleId might be the ID string or an object depending on expansion
            const userRoleId = user.roleId;
            
            const role = roles.find(r => r.id === userRoleId);
            
            if (role) {
                setCurrentUser(user);
                setCurrentRole(role);
                setShowLogin(false);
                setPin('');
                setLoginError('');
                setShowUserHelp(false);
                return;
            } else {
                console.error(`User ${user.name} found, but roleId '${userRoleId}' does not match any role in`, roles);
                setLoginError('Usuario correcto, pero su Rol no existe o está mal configurado.');
                return;
            }
        }
        
        setLoginError('PIN Incorrecto. Verifique sus credenciales.');
      } catch (err) {
          console.error("Login System Error:", err);
          setLoginError('Error de conexión al validar credenciales.');
      }
  };

  const handleLogout = () => {
      setCurrentUser(null);
      setCurrentRole(null);
  };

  // --- PERMISSION ERROR SCREEN ---
  if (permissionError) {
      return (
          <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center font-sans">
              <div className="bg-white p-8 rounded-2xl shadow-xl max-w-2xl border border-red-100">
                  <div className="bg-red-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                      <AlertTriangle className="w-10 h-10 text-red-600" />
                  </div>
                  <h1 className="text-3xl font-bold text-gray-900 mb-4">Configuración Requerida: Supabase</h1>
                  <p className="text-gray-600 text-lg mb-8">
                      La aplicación está conectada, pero <strong>no tiene permisos</strong> para leer los datos.
                      <br/>
                      Las políticas RLS de tu base de datos están bloqueando el acceso.
                  </p>

                  <div className="text-left bg-gray-50 p-6 rounded-xl border border-gray-200 mb-8">
                      <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                          <ShieldCheck className="w-5 h-5 text-green-600" />
                          Cómo solucionar esto (Pasos):
                      </h3>
                      <ol className="list-decimal list-inside space-y-3 text-gray-700">
                          <li>Entra a tu panel de Supabase (<a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">supabase.com/dashboard</a>).</li>
                          <li>Ve a la sección <strong>Authentication</strong> → <strong>Policies</strong> (menú izquierdo).</li>
                          <li>Selecciona la tabla <code>apartments</code>.</li>
                          <li>Asegúrate de que exista una política <strong>"Allow all for anon"</strong> habilitada.</li>
                          <li>Repite esto para las tablas: <code>recommendations</code>, <code>inventory</code>, <code>cleaning_logs</code>, <code>cleaning_templates</code>, <code>maintenance</code>, <code>users</code> y <code>roles</code>.</li>
                          <li>Verifica que la variable de entorno <code>SUPABASE_URL</code> y <code>SUPABASE_ANON_KEY</code> estén configuradas correctamente.</li>
                      </ol>
                  </div>

                  <button 
                    onClick={() => window.location.reload()}
                    className="bg-brand-600 text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-brand-700 shadow-lg transition-transform hover:scale-105"
                  >
                      Ya lo hice, Recargar App
                  </button>
              </div>
          </div>
      );
  }

  if (isInitializing) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600 mb-4"></div>
            <p className="text-gray-400 font-medium">Conectando con Supabase...</p>
        </div>
      );
  }

  if (currentUser && currentRole) {
    return <AdminDashboard user={currentUser} role={currentRole} onLogout={handleLogout} />;
  }

  return (
    <div className="relative">
      <GuestView apartments={apartments} isLoading={isInitializing} />
      
      {/* Login Modal Overlay */}
      {showLogin && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 relative animate-fade-in max-h-[90vh] overflow-y-auto">
                  <button onClick={() => setShowLogin(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
                      <X className="w-6 h-6" />
                  </button>
                  
                  <div className="text-center mb-8">
                      <div className="bg-brand-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                          <Lock className="w-8 h-8 text-brand-600" />
                      </div>
                      <h2 className="text-2xl font-bold text-gray-800">Acceso Administrativo</h2>
                      <p className="text-gray-500">Ingrese su PIN de seguridad de 4 dígitos</p>
                  </div>

                  <form onSubmit={handleLogin} className="space-y-4">
                      <div>
                          <input 
                            type="password" 
                            inputMode="numeric"
                            maxLength={8}
                            value={pin}
                            onChange={(e) => setPin(e.target.value)}
                            className="w-full text-center text-3xl tracking-widest py-3 border-2 border-gray-200 rounded-xl focus:border-brand-500 focus:ring-0 outline-none transition-colors"
                            placeholder="••••"
                            autoFocus
                          />
                      </div>
                      
                      {loginError && (
                          <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm text-center border border-red-100 flex flex-col gap-2">
                             <div className="flex items-center justify-center gap-2 font-bold">
                                 <AlertTriangle className="w-4 h-4"/> {loginError}
                             </div>
                              {showUserHelp && (
                                  <div className="text-left text-xs text-gray-600 mt-2 bg-white p-3 rounded border border-red-100">
                                      <p className="font-bold mb-1">Posible causa: Permisos de Base de Datos</p>
                                      <p>La app no puede leer la lista de usuarios. Verifica que la tabla 'users' tenga permisos RLS habilitados.</p>
                                      <div className="mt-2 pt-2 border-t">
                                          <strong>Solución:</strong>
                                          <ol className="list-decimal list-inside mt-1 space-y-1">
                                              <li>Ve a Supabase {'>'} Authentication {'>'} <strong>Policies</strong></li>
                                              <li>Selecciona la tabla <code>users</code></li>
                                              <li>Habilita la política <strong>"Allow all for anon"</strong></li>
                                              <li>Verifica que la tabla <code>users</code> exista y tenga la columna <code>pin</code></li>
                                          </ol>
                                      </div>
                                  </div>
                              )}
                          </div>
                      )}
                      
                      <button type="submit" className="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold py-4 rounded-xl shadow-lg transition-transform active:scale-95">
                          Ingresar al Sistema
                      </button>
                  </form>
                      <p className="text-xs text-center text-gray-400 mt-6">Sistema conectado a Supabase.</p>
              </div>
          </div>
      )}

      {/* Login Trigger Button */}
      {!showLogin && (
        <button 
            onClick={() => setShowLogin(true)}
            className="fixed bottom-6 right-6 bg-slate-900 hover:bg-slate-800 text-white p-4 rounded-full shadow-2xl z-40 transition-all hover:scale-110 group"
            title="Login"
        >
            <UserIcon className="w-6 h-6" />
            <span className="absolute right-full mr-3 top-1/2 -translate-y-1/2 bg-slate-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                Acceso Staff
            </span>
        </button>
      )}
    </div>
  );
};

export default App;