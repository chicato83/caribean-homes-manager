
export enum InventoryStatus {
  GOOD = 'Good',
  STAINED = 'Stained',
  MISSING = 'Missing',
  BROKEN = 'Broken'
}

export interface Recommendation {
  id: string;
  name: string;
  type: 'Restaurant' | 'Attraction' | 'Grocery/Colmado';
  description: string;
  distance: string;
  imageUrl?: string;
  mapUrl?: string;
  phoneNumber?: string;
}

export interface Apartment {
  id: string;
  name: string;
  address: string;
  description: string;
  imageUrl: string;
  pricePerNight: number;
  bedrooms: number;
  bathrooms: number;
  amenities: string[];
  recommendations: Recommendation[];
  // Extended Details
  wifiSSID?: string;
  wifiPassword?: string;
  accessCode?: string;
  checkInTime?: string;
  checkOutTime?: string;
  maxGuests?: number;
  houseRules?: string;
  notes: string; // Internal admin notes
}

export interface InventoryItem {
  id: string;
  name: string;
  category: string;
  totalQuantity: number; // Warehouse total
  minThreshold: number;
}

// -- Cleaning System Types --

export interface CleaningTemplateItem {
  id: string;
  name: string; // e.g., "Bath Towel"
  targetQuantity: number; // e.g., 2
}

export interface CleaningTemplateRoom {
  id: string;
  name: string; // e.g., "Master Bedroom", "Kitchen"
  items: CleaningTemplateItem[];
}

export interface CleaningTemplate {
  apartmentId: string;
  rooms: CleaningTemplateRoom[];
}

export interface CleaningLogItem {
  itemName: string;
  roomName: string;
  targetQuantity: number;
  quantityFound: number;
  status: InventoryStatus;
}

export interface CleaningLog {
  id: string;
  apartmentId: string;
  date: string;
  cleanerName: string;
  notes: string;
  items: CleaningLogItem[];
  paymentStatus: 'Pending' | 'Paid';
}

export interface MaintenanceItem {
  id: string;
  name: string;
  apartmentId: string | null; // Null if general equipment
  areaId?: string; // Specific room ID within the apartment
  areaName?: string; // Display name for the room
  lastMaintenanceDate: string;
  frequencyDays: number;
  notes: string;
  technicianContact?: string;
}

// -- Auth & Role Management --

export type Permission = 
  | 'manage_apartments' 
  | 'manage_cleaning' 
  | 'perform_cleaning' // Can only fill checklists, not edit templates
  | 'manage_maintenance' 
  | 'manage_inventory' 
  | 'manage_settings'; // Users & Roles

export interface Role {
  id: string;
  name: string;
  permissions: Permission[];
}

export interface User {
  id: string;
  name: string;
  pin: string; // Simple auth for demo
  roleId: string;
}

// -- Reports System Types --

export interface ReportData {
  period: string;
  reportDate: string;
  summary: {
    ingresos_brutos: string;
    ajustes: string;
    tarifas_servicio: string;
    impuestos_retenidos: string;
    total_usd: string;
  };
  stats: {
    noches_reservadas: string;
  };
  accommodations: {
    [key: string]: {
      name: string;
      avg_nights: string;
      ingresos_brutos: string;
      ajustes: string;
      tarifas_servicio: string;
      impuestos_retenidos: string;
      total_usd: string;
    };
  };
  payment_methods: {
    amount_usd: string;
  }[];
  tasa_banco_cibao: string;
  conversion_result?: string;
  percent_25_result?: string;
  extra_income?: string;
  extra_nights?: string;
  extra_nights_amount?: string; // USD amount for extra nights
}

export interface SavedReport {
  id: string;
  apartmentId: string;
  apartmentName: string;
  period: string;
  generatedAt: string;
  reportData: ReportData;
}