import React, { useState } from 'react';
import { Apartment, Recommendation } from '../types';
import { MapPin, Wifi, Bed, CheckCircle, Info, Utensils, Camera, ShoppingBasket, ExternalLink, Phone, Navigation } from 'lucide-react';

interface GuestViewProps {
  apartments: Apartment[];
  isLoading?: boolean;
}

export const GuestView: React.FC<GuestViewProps> = ({ apartments, isLoading = false }) => {
  const [selectedApt, setSelectedApt] = useState<Apartment | null>(null);
  const [activeGlobalTab, setActiveGlobalTab] = useState<'Restaurant' | 'Attraction'>('Restaurant');

  // Gather all recommendations from all apartments for the global view
  const getAllRecommendations = () => {
    const all: (Recommendation & { apartmentName: string })[] = [];
    apartments.forEach(apt => {
      apt.recommendations.forEach(rec => {
        // Only include Restaurants and Attractions for the main page bottom section
        if (rec.type === 'Restaurant' || rec.type === 'Attraction') {
             all.push({ ...rec, apartmentName: apt.name });
        }
      });
    });
    return all;
  };

  const globalRecs = getAllRecommendations().filter(r => r.type === activeGlobalTab);

  const scrollToApartments = (e: React.MouseEvent) => {
      e.preventDefault();
      const element = document.getElementById('apartments');
      if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
      }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 font-sans">
      {/* Hero Section */}
      <div className="relative h-[65vh] flex items-center justify-center text-center px-4">
         <div 
            className="absolute inset-0 bg-cover bg-center z-0" 
            style={{ backgroundImage: "url('https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&q=80&w=2000')" }}
         />
         <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/80 z-10" />
         <div className="relative z-20 max-w-4xl mx-auto text-white animate-fade-in-up">
            <h1 className="text-5xl md:text-7xl font-extrabold mb-6 tracking-tight drop-shadow-lg">Caribean Homes</h1>
            <p className="text-xl md:text-3xl text-gray-100 mb-10 font-light drop-shadow-md">
               Experiencias inolvidables en estancias únicas.
            </p>
            <button 
                onClick={scrollToApartments}
                className="bg-white text-gray-900 px-10 py-4 rounded-full font-bold text-lg transition-all shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:scale-105 hover:shadow-[0_0_30px_rgba(255,255,255,0.5)] active:scale-95"
            >
               Explorar Propiedades
            </button>
         </div>
      </div>

      <div id="apartments" className="container mx-auto py-24 px-4 md:px-8">
        {selectedApt ? (
          <ApartmentDetail apartment={selectedApt} onBack={() => setSelectedApt(null)} />
        ) : (
          <>
            <div className="text-center mb-20">
               <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 tracking-tight">Nuestras Propiedades</h2>
               <div className="h-1 w-24 bg-brand-500 mx-auto rounded-full mb-6"></div>
               <p className="text-gray-500 max-w-2xl mx-auto text-xl font-light">
                 Seleccionadas cuidadosamente para ofrecerte el máximo confort y estilo.
               </p>
            </div>

            {/* Apartments Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12 mb-32">
              {isLoading ? (
                  <div className="col-span-full text-center py-20">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600 mx-auto mb-4"></div>
                      <p className="text-gray-400">Cargando propiedades...</p>
                  </div>
              ) : apartments.length === 0 ? (
                  <div className="col-span-full text-center py-20 bg-white rounded-3xl border-2 border-dashed border-gray-200">
                      <p className="text-gray-500 text-lg">No hay apartamentos disponibles en este momento.</p>
                      <p className="text-gray-400 text-sm mt-2">Inicia sesión como administrador para agregar propiedades.</p>
                  </div>
              ) : apartments.map((apt) => (
                <div 
                  key={apt.id} 
                  className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl overflow-hidden cursor-pointer group transform transition-all duration-300 hover:-translate-y-3 hover:shadow-2xl border border-gray-100 dark:border-slate-700"
                  onClick={() => setSelectedApt(apt)}
                >
                  <div className="relative h-72 overflow-hidden">
                     <img 
                        src={apt.imageUrl} 
                        alt={apt.name} 
                        className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700" 
                     />
                     <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                     <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-md px-4 py-1.5 rounded-full text-xs font-bold text-brand-700 shadow-sm uppercase tracking-wide">
                        Recomendado
                     </div>
                  </div>
                  <div className="p-8">
                    <h3 className="text-2xl font-bold text-gray-900 mb-3 group-hover:text-brand-600 transition-colors">{apt.name}</h3>
                    <div className="flex items-center text-gray-500 text-sm mb-6">
                      <MapPin className="w-4 h-4 mr-1 text-brand-500" />
                      {apt.address}
                    </div>
                    <div className="flex justify-between items-end pt-4 border-t border-gray-100">
                      <div>
                         <span className="text-3xl font-bold text-gray-900">${apt.pricePerNight}</span>
                         <span className="text-gray-500 text-sm font-medium"> / noche</span>
                      </div>
                      <span className="text-brand-600 font-bold text-sm flex items-center group-hover:translate-x-1 transition-transform">
                         Ver Detalles <ArrowRightIcon className="w-4 h-4 ml-1" />
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Global Recommendations Section */}
            <div className="pt-20 pb-16 border-t border-gray-200">
                <div className="text-center mb-16">
                   <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 flex items-center justify-center gap-4">
                      <span className="bg-brand-100 p-3 rounded-2xl"><Navigation className="w-8 h-8 text-brand-600" /></span>
                      Descubre los Alrededores
                   </h2>
                   <p className="text-gray-500 text-xl font-light">Joyas locales recomendadas por nuestros anfitriones expertos.</p>
                </div>
                
                {/* Tabs */}
                <div className="flex justify-center mb-16">
                    <div className="bg-white p-2 rounded-2xl shadow-lg inline-flex border border-gray-100">
                        <button
                            onClick={() => setActiveGlobalTab('Restaurant')}
                            className={`px-10 py-3 rounded-xl text-base font-bold transition-all flex items-center gap-3 ${activeGlobalTab === 'Restaurant' ? 'bg-gray-900 text-white shadow-md transform scale-105' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'}`}
                        >
                            <Utensils className="w-5 h-5" /> Restaurantes
                        </button>
                        <button
                            onClick={() => setActiveGlobalTab('Attraction')}
                            className={`px-10 py-3 rounded-xl text-base font-bold transition-all flex items-center gap-3 ${activeGlobalTab === 'Attraction' ? 'bg-gray-900 text-white shadow-md transform scale-105' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'}`}
                        >
                            <Camera className="w-5 h-5" /> Lugares de Interés
                        </button>
                    </div>
                </div>

                {/* Recommendations Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 px-4 max-w-7xl mx-auto">
                    {globalRecs.map((rec, idx) => (
                        <RecommendationCardDisplay key={idx} rec={rec} showApartmentContext />
                    ))}
                    {!isLoading && globalRecs.length === 0 && (
                        <div className="col-span-full text-center py-24 bg-white rounded-3xl border-2 border-dashed border-gray-200">
                            <Utensils className="w-16 h-16 text-gray-200 mx-auto mb-6" />
                            <p className="text-gray-400 text-xl font-medium">Aún no hay recomendaciones en esta categoría.</p>
                        </div>
                    )}
                </div>
            </div>
          </>
        )}
      </div>

      <footer className="bg-gray-900 dark:bg-slate-900 text-white py-16 text-center border-t border-gray-800 dark:border-slate-800 mt-20">
          <div className="mb-8">
              <h2 className="text-2xl font-bold tracking-tight">Caribean<span className="text-brand-500">Homes</span></h2>
          </div>
          <p className="opacity-40 text-sm">© 2024 Caribean Homes. Todos los derechos reservados.</p>
      </footer>
    </div>
  );
};

// Reusable Enhanced Premium Card
const RecommendationCardDisplay: React.FC<{ rec: Recommendation & { apartmentName?: string }, showApartmentContext?: boolean }> = ({ rec, showApartmentContext }) => (
    <div className="bg-white rounded-[2rem] shadow-lg hover:shadow-2xl transition-all duration-500 group overflow-hidden border border-gray-100 flex flex-col h-full transform hover:-translate-y-2">
        <div className="relative h-56 overflow-hidden">
            {rec.imageUrl ? (
                <img 
                    src={rec.imageUrl} 
                    alt={rec.name} 
                    className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700" 
                />
            ) : (
                <div className={`w-full h-full flex items-center justify-center ${rec.type === 'Restaurant' ? 'bg-orange-50' : 'bg-blue-50'}`}>
                     {rec.type === 'Restaurant' ? <Utensils className="w-16 h-16 text-orange-200" /> : <Camera className="w-16 h-16 text-blue-200" />}
                </div>
            )}
            
            {/* Overlay Gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60"></div>

            {/* Floating Distance Badge */}
            <div className="absolute top-4 right-4 bg-white/30 backdrop-blur-md border border-white/20 px-3 py-1.5 rounded-full text-xs font-bold text-white shadow-sm flex items-center gap-1">
                 <MapPin className="w-3 h-3" /> {rec.distance}
            </div>
            
            {/* Floating Type Badge */}
            <div className="absolute top-4 left-4 bg-black/30 backdrop-blur-md border border-white/10 px-3 py-1.5 rounded-full text-xs font-bold text-white shadow-sm">
                 {rec.type === 'Restaurant' ? 'Comida' : rec.type === 'Attraction' ? 'Turismo' : 'Compras'}
            </div>
        </div>
        
        <div className="p-7 flex-1 flex flex-col relative">
            <h3 className="font-bold text-2xl text-gray-900 mb-3 leading-tight group-hover:text-brand-600 transition-colors">{rec.name}</h3>
            <p className="text-gray-500 text-sm leading-relaxed mb-6 flex-1 font-medium">{rec.description}</p>
            
            <div className="grid grid-cols-2 gap-3 mt-auto">
                 {rec.mapUrl ? (
                     <a 
                        href={rec.mapUrl} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="flex items-center justify-center gap-2 py-3 rounded-xl bg-gray-50 text-gray-700 font-bold text-sm hover:bg-brand-600 hover:text-white transition-all duration-300 group/btn"
                     >
                        <MapPin className="w-4 h-4 group-hover/btn:animate-bounce" /> Cómo llegar
                     </a>
                 ) : (
                     <button disabled className="flex items-center justify-center gap-2 py-3 rounded-xl bg-gray-50 text-gray-300 font-bold text-sm cursor-not-allowed">
                        <MapPin className="w-4 h-4" /> Mapa
                     </button>
                 )}

                 {rec.phoneNumber ? (
                     <a 
                        href={`tel:${rec.phoneNumber}`} 
                        className="flex items-center justify-center gap-2 py-3 rounded-xl bg-gray-50 text-gray-700 font-bold text-sm hover:bg-green-500 hover:text-white transition-all duration-300 group/btn"
                     >
                        <Phone className="w-4 h-4 group-hover/btn:animate-pulse" /> Llamar
                     </a>
                 ) : (
                     <button disabled className="flex items-center justify-center gap-2 py-3 rounded-xl bg-gray-50 text-gray-300 font-bold text-sm cursor-not-allowed">
                        <Phone className="w-4 h-4" /> Teléfono
                     </button>
                 )}
            </div>

            {showApartmentContext && rec.apartmentName && (
                <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-center text-xs text-gray-400 font-bold tracking-wider uppercase">
                    Cerca de {rec.apartmentName}
                </div>
            )}
        </div>
    </div>
);

const ApartmentDetail: React.FC<{ apartment: Apartment; onBack: () => void }> = ({ apartment, onBack }) => {
  const [activeTab, setActiveTab] = useState<'Restaurant' | 'Attraction' | 'Grocery/Colmado'>('Restaurant');

  const filteredRecs = apartment.recommendations.filter(r => r.type === activeTab);

  // Scroll to top on mount
  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="bg-white rounded-[2.5rem] shadow-2xl overflow-hidden animate-fade-in mb-12">
      <div className="relative h-[50vh] min-h-[400px]">
        <img src={apartment.imageUrl} alt={apartment.name} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent"></div>
        
        <button onClick={onBack} className="absolute top-6 left-6 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-white px-6 py-2.5 rounded-full font-bold transition-all flex items-center gap-2 group">
           <span className="transform group-hover:-translate-x-1 transition-transform">←</span> Volver
        </button>

        <div className="absolute bottom-0 left-0 right-0 p-8 md:p-16 max-w-4xl">
          <div className="flex gap-3 mb-4">
              <span className="bg-brand-600 text-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide">Premium</span>
              <span className="bg-white/20 backdrop-blur text-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide">{apartment.bedrooms} Habitaciones</span>
          </div>
          <h2 className="text-4xl md:text-6xl font-extrabold text-white mb-4 leading-tight shadow-sm">{apartment.name}</h2>
          <p className="text-gray-200 flex items-center text-lg md:text-xl font-medium">
            <MapPin className="w-5 h-5 mr-2 text-brand-400" /> {apartment.address}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 p-8 md:p-16">
        <div className="lg:col-span-8 space-y-16">
          <section>
            <h3 className="text-2xl font-bold mb-6 text-gray-900 flex items-center">
                <Info className="w-6 h-6 mr-3 text-brand-500" />
                Sobre este espacio
            </h3>
            <p className="text-gray-600 leading-loose text-lg whitespace-pre-line font-light">{apartment.description}</p>
          </section>

          <section>
            <h3 className="text-2xl font-bold mb-8 text-gray-900 flex items-center">
                <CheckCircle className="w-6 h-6 mr-3 text-brand-500" />
                Lo que ofrece este lugar
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
              {apartment.amenities.map((am, i) => (
                <div key={i} className="flex items-center text-gray-700 bg-gray-50 p-5 rounded-2xl border border-gray-100 hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700 transition-all">
                  <div className="w-2 h-2 rounded-full bg-brand-400 mr-3"></div>
                  <span className="font-medium">{am}</span>
                </div>
              ))}
              <div className="flex items-center text-gray-700 bg-gray-50 p-5 rounded-2xl border border-gray-100">
                <Bed className="w-5 h-5 mr-3 text-brand-500" />
                <span className="font-medium">{apartment.bedrooms} Habitaciones</span>
              </div>
            </div>
          </section>

           {/* House Rules */}
           {(apartment.houseRules || apartment.checkInTime) && (
             <section className="bg-gray-50 rounded-3xl p-8 border border-gray-200">
                <h3 className="text-xl font-bold mb-6 text-gray-900">Reglas y Horarios</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                        <div className="text-sm text-gray-400 uppercase font-bold tracking-wider mb-2">Check-in / Check-out</div>
                        <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-gray-100">
                            <div>
                                <span className="block text-xs text-gray-500">Llegada</span>
                                <span className="font-bold text-lg">{apartment.checkInTime || '15:00'}</span>
                            </div>
                            <div className="text-gray-300">→</div>
                            <div className="text-right">
                                <span className="block text-xs text-gray-500">Salida</span>
                                <span className="font-bold text-lg">{apartment.checkOutTime || '11:00'}</span>
                            </div>
                        </div>
                    </div>
                    {apartment.houseRules && (
                         <div>
                            <div className="text-sm text-gray-400 uppercase font-bold tracking-wider mb-2">Normas de la casa</div>
                            <p className="text-gray-600 text-sm leading-relaxed">{apartment.houseRules}</p>
                        </div>
                    )}
                </div>
             </section>
           )}
        </div>

        <div className="lg:col-span-4">
            {/* Sticky Sidebar Recommendations */}
          <div className="bg-white rounded-[2rem] border border-gray-100 overflow-hidden sticky top-8 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)]">
            <div className="p-8 bg-gray-900 text-white relative overflow-hidden">
                <div className="relative z-10">
                    <h3 className="text-2xl font-bold flex items-center mb-2">
                    <Navigation className="w-6 h-6 mr-3 text-brand-400" /> 
                    Guía Local
                    </h3>
                    <p className="text-gray-400 text-sm">Explora las cercanías de {apartment.name}</p>
                </div>
                {/* Decoration */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 -translate-y-1/2 translate-x-1/2"></div>
            </div>
            
            {/* Tabs */}
            <div className="flex border-b border-gray-100 bg-white p-2">
                <button 
                    onClick={() => setActiveTab('Restaurant')}
                    className={`flex-1 py-3 rounded-xl text-xs font-bold flex flex-col items-center gap-1 transition-all ${activeTab === 'Restaurant' ? 'text-white bg-gray-900 shadow-lg' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'}`}
                >
                    <Utensils className="w-4 h-4" /> Comer
                </button>
                <button 
                    onClick={() => setActiveTab('Attraction')}
                    className={`flex-1 py-3 rounded-xl text-xs font-bold flex flex-col items-center gap-1 transition-all ${activeTab === 'Attraction' ? 'text-white bg-gray-900 shadow-lg' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'}`}
                >
                    <Camera className="w-4 h-4" /> Visitar
                </button>
                <button 
                    onClick={() => setActiveTab('Grocery/Colmado')}
                    className={`flex-1 py-3 rounded-xl text-xs font-bold flex flex-col items-center gap-1 transition-all ${activeTab === 'Grocery/Colmado' ? 'text-white bg-gray-900 shadow-lg' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'}`}
                >
                    <ShoppingBasket className="w-4 h-4" /> Comprar
                </button>
            </div>

            <div className="p-6 h-[800px] overflow-y-auto space-y-6 custom-scrollbar bg-gray-50">
                  {filteredRecs.map(rec => (
                    <RecommendationCardDisplay key={rec.id} rec={rec} />
                  ))}
                  {filteredRecs.length === 0 && (
                    <div className="text-center py-20 text-gray-400 flex flex-col items-center">
                        <div className="bg-white p-4 rounded-full mb-3 shadow-sm">
                            <Utensils className="w-8 h-8 text-gray-300" />
                        </div>
                        <p className="font-medium">No hay recomendaciones en esta categoría.</p>
                    </div>
                  )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Simple Icon Helper
const ArrowRightIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
    </svg>
);