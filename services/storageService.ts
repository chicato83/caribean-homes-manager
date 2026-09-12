import { supabase } from './supabase';
import { Apartment, CleaningLog, InventoryItem, MaintenanceItem, CleaningTemplate, User, Role, Recommendation, InventoryStatus, SavedReport, ReportData } from '../types';

// --- Helper: Map Supabase snake_case rows to app camelCase objects ---

const mapApartmentRow = (r: any, recs: any[] = []): Apartment => ({
  id: r.id,
  name: r.name,
  address: r.address || '',
  description: r.description || '',
  imageUrl: r.image_url || '',
  pricePerNight: Number(r.price_per_night) || 0,
  bedrooms: r.bedrooms || 1,
  bathrooms: r.bathrooms || 1,
  amenities: r.amenities || [],
  recommendations: recs
    .filter((rec: any) => rec.apartment_id === r.id)
    .map(mapRecommendationRow),
  wifiSSID: r.wifi_ssid,
  wifiPassword: r.wifi_password,
  accessCode: r.access_code,
  checkInTime: r.check_in_time,
  checkOutTime: r.check_out_time,
  maxGuests: r.max_guests || 2,
  houseRules: r.house_rules,
  notes: r.notes || '',
});

const mapRecommendationRow = (r: any): Recommendation => ({
  id: r.id,
  name: r.name,
  type: r.type,
  description: r.description || '',
  distance: r.distance || '',
  imageUrl: r.image_url || '',
  mapUrl: r.map_url || '',
  phoneNumber: r.phone_number || '',
});

const mapInventoryRow = (r: any): InventoryItem => ({
  id: r.id,
  name: r.name,
  category: r.category || 'General',
  totalQuantity: r.total_quantity || 0,
  minThreshold: r.min_threshold || 5,
});

const mapCleaningLogRow = (r: any): CleaningLog => ({
  id: r.id,
  apartmentId: r.apartment_id,
  date: r.date,
  cleanerName: r.cleaner_name,
  notes: r.notes || '',
  items: r.items || [],
  paymentStatus: r.payment_status || 'Pending',
});

const mapMaintenanceRow = (r: any): MaintenanceItem => ({
  id: r.id,
  name: r.name,
  apartmentId: r.apartment_id,
  areaId: r.area_id,
  areaName: r.area_name,
  lastMaintenanceDate: r.last_maintenance_date,
  frequencyDays: r.frequency_days || 90,
  notes: r.notes || '',
  technicianContact: r.technician_contact,
});

const mapRoleRow = (r: any): Role => ({
  id: r.id,
  name: r.name,
  permissions: r.permissions || [],
});

const mapUserRow = (r: any): User => ({
  id: r.id,
  name: r.name,
  pin: r.pin,
  roleId: r.role_id || '',
});

// --- Helpers: Map app camelCase to Supabase snake_case ---

const toApartmentRow = (apt: Apartment) => ({
  name: apt.name,
  address: apt.address,
  description: apt.description,
  image_url: apt.imageUrl,
  price_per_night: apt.pricePerNight,
  bedrooms: apt.bedrooms,
  bathrooms: apt.bathrooms,
  amenities: apt.amenities || [],
  wifi_ssid: apt.wifiSSID,
  wifi_password: apt.wifiPassword,
  access_code: apt.accessCode,
  check_in_time: apt.checkInTime,
  check_out_time: apt.checkOutTime,
  max_guests: apt.maxGuests,
  house_rules: apt.houseRules,
  notes: apt.notes,
});

const toRecommendationRow = (rec: Recommendation, apartmentId: string) => ({
  apartment_id: apartmentId,
  name: rec.name,
  type: rec.type,
  description: rec.description,
  distance: rec.distance,
  image_url: rec.imageUrl,
  map_url: rec.mapUrl,
  phone_number: rec.phoneNumber,
});

const toInventoryRow = (item: InventoryItem) => ({
  name: item.name,
  category: item.category,
  total_quantity: item.totalQuantity,
  min_threshold: item.minThreshold,
});

const toCleaningLogRow = (log: CleaningLog) => ({
  apartment_id: log.apartmentId,
  date: log.date,
  cleaner_name: log.cleanerName,
  notes: log.notes,
  items: log.items,
  payment_status: log.paymentStatus,
});

const toMaintenanceRow = (item: MaintenanceItem) => ({
  name: item.name,
  apartment_id: item.apartmentId,
  area_id: item.areaId,
  area_name: item.areaName,
  last_maintenance_date: item.lastMaintenanceDate,
  frequency_days: item.frequencyDays,
  notes: item.notes,
  technician_contact: item.technicianContact,
});

const toRoleRow = (role: Role) => ({
  name: role.name,
  permissions: role.permissions,
});

const toUserRow = (user: User) => ({
  name: user.name,
  pin: user.pin,
  role_id: user.roleId,
});

export const StorageService = {
  // --- APARTMENTS ---

  getApartments: async (): Promise<Apartment[]> => {
    try {
      const { data: apts, error: aptError } = await supabase
        .from('apartments')
        .select('*')
        .order('created_at', { ascending: false });

      if (aptError) throw aptError;

      // Fetch all recommendations in a single query
      const { data: recs, error: recError } = await supabase
        .from('recommendations')
        .select('*');

      if (recError) console.warn("Could not fetch recommendations:", recError);

      return (apts || []).map((r: any) => mapApartmentRow(r, recs || []));
    } catch (error: any) {
      console.error("Error fetching apartments from Supabase:", error);
      // Propagate specific errors for App handling
      if (error.code === 'PGRST301' || error.message?.includes('permission')) throw error;
      if (error.code === '42P01') throw error; // Undefined table
      if (error.message?.includes('fetch')) throw error; // Connection error
      return [];
    }
  },

  saveApartment: async (apt: Apartment): Promise<Apartment | null> => {
    try {
      const row = toApartmentRow(apt);

      if (apt.id && apt.id.length > 10 && !apt.id.startsWith('new_')) {
        const { data, error } = await supabase
          .from('apartments')
          .update(row)
          .eq('id', apt.id)
          .select()
          .single();

        if (error) throw error;
        return { ...apt, id: data.id };
      } else {
        const { data, error } = await supabase
          .from('apartments')
          .insert(row)
          .select()
          .single();

        if (error) throw error;
        return { ...apt, id: data.id };
      }
    } catch (error) {
      console.error("Error saving apartment:", error);
      return null;
    }
  },

  deleteApartment: async (id: string): Promise<void> => {
    try {
      const { error } = await supabase
        .from('apartments')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error("Error deleting apartment:", error);
    }
  },

  // --- RECOMMENDATIONS ---

  syncRecommendations: async (apartmentId: string, recs: Recommendation[]): Promise<void> => {
    // Delete existing recommendations for this apartment, then insert new ones
    try {
      await supabase
        .from('recommendations')
        .delete()
        .eq('apartment_id', apartmentId);

      if (recs.length > 0) {
        const rows = recs.map((r) => toRecommendationRow(r, apartmentId));
        const { error } = await supabase
          .from('recommendations')
          .insert(rows);

        if (error) throw error;
      }
    } catch (e) {
      console.error("Sync Recs Error", e);
    }
  },

  createRecommendation: async (rec: Recommendation & { apartmentId: string }) => {
    try {
      const { error } = await supabase
        .from('recommendations')
        .insert(toRecommendationRow(rec, rec.apartmentId));

      if (error) throw error;
    } catch (e) {
      console.error("Create Rec Error", e);
    }
  },

  updateRecommendation: async (rec: Recommendation & { apartmentId: string }) => {
    try {
      const { error } = await supabase
        .from('recommendations')
        .update(toRecommendationRow(rec, rec.apartmentId))
        .eq('id', rec.id);

      if (error) throw error;
    } catch (e) {
      console.error("Update Rec Error", e);
    }
  },

  deleteRecommendation: async (id: string) => {
    try {
      const { error } = await supabase
        .from('recommendations')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (e) {
      console.error("Delete Rec Error", e);
    }
  },

  // --- INVENTORY ---

  getInventory: async (): Promise<InventoryItem[]> => {
    try {
      const { data, error } = await supabase
        .from('inventory')
        .select('*')
        .order('name');

      if (error) throw error;
      return (data || []).map(mapInventoryRow);
    } catch (error) {
      console.error("Error fetching inventory:", error);
      return [];
    }
  },

  saveInventoryItem: async (item: InventoryItem): Promise<void> => {
    try {
      const row = toInventoryRow(item);

      if (item.id && item.id.length > 10) {
        const { error } = await supabase
          .from('inventory')
          .update(row)
          .eq('id', item.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('inventory')
          .insert(row);

        if (error) throw error;
      }
    } catch (error) {
      console.error("Save Inv Error", error);
    }
  },

  // --- CLEANING LOGS ---

  getCleaningLogs: async (): Promise<CleaningLog[]> => {
    try {
      const { data, error } = await supabase
        .from('cleaning_logs')
        .select('*')
        .order('date', { ascending: false });

      if (error) throw error;
      return (data || []).map(mapCleaningLogRow);
    } catch (error) {
      console.error("Error fetching cleaning logs:", error);
      return [];
    }
  },

  addCleaningLog: async (log: CleaningLog): Promise<void> => {
    try {
      const { error } = await supabase
        .from('cleaning_logs')
        .insert(toCleaningLogRow(log));

      if (error) throw error;
    } catch (error) {
      console.error("Add Log Error", error);
    }
  },

  updateCleaningLog: async (log: CleaningLog): Promise<void> => {
    try {
      const { error } = await supabase
        .from('cleaning_logs')
        .update({ payment_status: log.paymentStatus })
        .eq('id', log.id);

      if (error) throw error;
    } catch (error) {
      console.error("Update Log Error", error);
    }
  },

  // --- TEMPLATES ---

  getCleaningTemplate: async (apartmentId: string): Promise<CleaningTemplate | null> => {
    try {
      const { data, error } = await supabase
        .from('cleaning_templates')
        .select('*')
        .eq('apartment_id', apartmentId)
        .single();

      if (error) {
        // PGRST116 = no rows returned, which is fine (no template yet)
        if (error.code === 'PGRST116') return null;
        throw error;
      }

      return {
        apartmentId: data.apartment_id,
        rooms: data.rooms || [],
      };
    } catch (error) {
      console.error("Error fetching template:", error);
      return null;
    }
  },

  saveCleaningTemplate: async (template: CleaningTemplate): Promise<void> => {
    try {
      // Use upsert on the apartment_id unique constraint
      const { error } = await supabase
        .from('cleaning_templates')
        .upsert(
          {
            apartment_id: template.apartmentId,
            rooms: template.rooms,
          },
          { onConflict: 'apartment_id' }
        );

      if (error) throw error;
    } catch (error) {
      console.error("Save Template Error", error);
    }
  },

  // --- MAINTENANCE ---

  getMaintenance: async (): Promise<MaintenanceItem[]> => {
    try {
      const { data, error } = await supabase
        .from('maintenance')
        .select('*')
        .order('last_maintenance_date');

      if (error) throw error;
      return (data || []).map(mapMaintenanceRow);
    } catch (error) {
      console.error("Error fetching maintenance:", error);
      return [];
    }
  },

  saveMaintenanceItem: async (item: MaintenanceItem): Promise<void> => {
    try {
      const row = toMaintenanceRow(item);

      if (item.id && item.id.length > 10) {
        const { error } = await supabase
          .from('maintenance')
          .update(row)
          .eq('id', item.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('maintenance')
          .insert(row);

        if (error) throw error;
      }
    } catch (error) {
      console.error("Save Maintenance Error", error);
    }
  },

  // --- USERS & ROLES ---

  getRoles: async (): Promise<Role[]> => {
    try {
      const { data, error } = await supabase
        .from('roles')
        .select('*');

      if (error) throw error;
      return (data || []).map(mapRoleRow);
    } catch (error: any) {
      console.error("Error fetching roles:", error);
      // Ensure app sees permission errors
      if (error.code === 'PGRST301' || error.message?.includes('permission')) throw error;
      return [];
    }
  },

  saveRole: async (role: Role): Promise<void> => {
    try {
      const row = toRoleRow(role);

      if (role.id && role.id.length > 10) {
        const { error } = await supabase
          .from('roles')
          .update(row)
          .eq('id', role.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('roles')
          .insert(row);

        if (error) throw error;
      }
    } catch (error) {
      console.error("Save Role Error", error);
    }
  },

  getUsers: async (): Promise<User[]> => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*');

      if (error) throw error;
      console.log("StorageService: Users found:", data?.length || 0);
      return (data || []).map(mapUserRow);
    } catch (error: any) {
      console.error("Error fetching users:", error);
      // Propagate permission error so App knows to show help
      if (error.code === 'PGRST301' || error.message?.includes('permission')) throw error;
      return [];
    }
  },

  saveUser: async (user: User): Promise<void> => {
    try {
      const row = toUserRow(user);

      if (user.id && user.id.length > 10) {
        // Update existing
        const { error } = await supabase
          .from('users')
          .update(row)
          .eq('id', user.id);

        if (error) throw error;
      } else {
        // Create new — no dummy email/password needed for Supabase plain table
        const { error } = await supabase
          .from('users')
          .insert(row);

        if (error) throw error;
      }
    } catch (error: any) {
      console.error("Save User Error", error);
      if (error.message) console.error("Details:", error.message);
      throw error; // Re-throw so UI can display alert
    }
  },

  deleteUser: async (id: string): Promise<void> => {
    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (e) {
      console.error("Delete User Error", e);
    }
  },

  // --- REPORTS ---

  getReports: async (): Promise<SavedReport[]> => {
    try {
      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .order('generated_at', { ascending: false });

      if (error) throw error;
      return (data || []).map((r: any) => ({
        id: r.id,
        apartmentId: r.apartment_id,
        apartmentName: r.apartment_name,
        period: r.period,
        generatedAt: r.generated_at,
        reportData: r.report_data,
      }));
    } catch (error: any) {
      console.error("Error fetching reports:", error);
      // If table doesn't exist, return localStorage fallback
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        console.warn("Reports table not found, using localStorage fallback");
        try {
          const stored = localStorage.getItem('caribean_reports');
          return stored ? JSON.parse(stored) : [];
        } catch {
          return [];
        }
      }
      return [];
    }
  },

  saveReport: async (report: SavedReport): Promise<void> => {
    try {
      const row = {
        apartment_id: report.apartmentId,
        apartment_name: report.apartmentName,
        period: report.period,
        generated_at: report.generatedAt,
        report_data: report.reportData,
      };

      // Try Supabase first
      const { error } = await supabase
        .from('reports')
        .upsert(row, { onConflict: 'id' });

      if (error) throw error;

      // Also save to localStorage as backup
      try {
        const existing = JSON.parse(localStorage.getItem('caribean_reports') || '[]');
        const idx = existing.findIndex((r: SavedReport) => r.id === report.id);
        if (idx >= 0) {
          existing[idx] = report;
        } else {
          existing.unshift(report);
        }
        localStorage.setItem('caribean_reports', JSON.stringify(existing));
      } catch {
        // localStorage backup is optional
      }
    } catch (error: any) {
      console.error("Error saving report to Supabase:", error);
      // Fallback to localStorage if table doesn't exist
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        console.warn("Reports table not found, saving to localStorage only");
        try {
          const existing = JSON.parse(localStorage.getItem('caribean_reports') || '[]');
          const idx = existing.findIndex((r: SavedReport) => r.id === report.id);
          if (idx >= 0) {
            existing[idx] = report;
          } else {
            existing.unshift(report);
          }
          localStorage.setItem('caribean_reports', JSON.stringify(existing));
        } catch (e) {
          console.error("localStorage save failed:", e);
        }
      }
    }
  },

  deleteReport: async (id: string): Promise<void> => {
    try {
      const { error } = await supabase
        .from('reports')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Also remove from localStorage
      try {
        const existing = JSON.parse(localStorage.getItem('caribean_reports') || '[]');
        localStorage.setItem('caribean_reports', JSON.stringify(existing.filter((r: SavedReport) => r.id !== id)));
      } catch {
        // localStorage cleanup is optional
      }
    } catch (error: any) {
      console.error("Error deleting report:", error);
      // Fallback to localStorage
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        try {
          const existing = JSON.parse(localStorage.getItem('caribean_reports') || '[]');
          localStorage.setItem('caribean_reports', JSON.stringify(existing.filter((r: SavedReport) => r.id !== id)));
        } catch (e) {
          console.error("localStorage delete failed:", e);
        }
      }
    }
  },
};
