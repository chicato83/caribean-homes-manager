import { pb } from './pocketbase';
import { Apartment, CleaningLog, InventoryItem, MaintenanceItem, CleaningTemplate, User, Role, Recommendation, InventoryStatus } from '../types';

// Helper to resolve PocketBase image URLs
const getPbImage = (record: any, fileName: string) => {
    if (!fileName) return ''; // Return empty string if no image, let UI handle placeholder
    if (fileName.startsWith('http') || fileName.startsWith('data:')) return fileName;
    return pb.files.getUrl(record, fileName);
};

export const StorageService = {
  // --- APARTMENTS ---
  
  getApartments: async (): Promise<Apartment[]> => {
    try {
      // Try PocketBase
      const apts = await pb.collection('apartments').getFullList({ sort: '-created' });
      
      // Fetch Recs
      let recs: any[] = [];
      try {
        recs = await pb.collection('recommendations').getFullList();
      } catch(e) { console.warn("Could not fetch recs from PB", e); }

      return apts.map((record: any) => {
        const aptRecs = recs
          .filter((r: any) => r.apartmentId === record.id)
          .map((r: any) => ({
            id: r.id,
            name: r.name,
            type: r.type,
            description: r.description,
            distance: r.distance,
            imageUrl: getPbImage(r, r.imageUrl),
            mapUrl: r.mapUrl,
            phoneNumber: r.phoneNumber
          }));

        return {
          id: record.id,
          name: record.name,
          address: record.address,
          description: record.description,
          imageUrl: getPbImage(record, record.imageUrl),
          pricePerNight: record.pricePerNight,
          bedrooms: record.bedrooms,
          bathrooms: record.bathrooms,
          amenities: record.amenities || [],
          recommendations: aptRecs,
          wifiSSID: record.wifiSSID,
          wifiPassword: record.wifiPassword,
          accessCode: record.accessCode,
          checkInTime: record.checkInTime,
          checkOutTime: record.checkOutTime,
          maxGuests: record.maxGuests,
          houseRules: record.houseRules,
          notes: record.notes,
        };
      });
    } catch (error: any) {
      console.error("Error fetching apartments from PocketBase:", error);
      // Propagate specific errors for App handling
      if (error.status === 403 || error.message?.includes('superuser')) throw error;
      if (error.status === 404) throw error; // Collection not found
      if (error.status === 0) throw error; // Connection error
      return [];
    }
  },

  saveApartment: async (apt: Apartment): Promise<Apartment | null> => {
    try {
      const data = {
        name: apt.name,
        address: apt.address,
        description: apt.description,
        imageUrl: apt.imageUrl, // Expecting URL string for now
        pricePerNight: apt.pricePerNight,
        bedrooms: apt.bedrooms,
        bathrooms: apt.bathrooms,
        amenities: apt.amenities,
        wifiSSID: apt.wifiSSID,
        wifiPassword: apt.wifiPassword,
        accessCode: apt.accessCode,
        checkInTime: apt.checkInTime,
        checkOutTime: apt.checkOutTime,
        maxGuests: apt.maxGuests,
        houseRules: apt.houseRules,
        notes: apt.notes,
      };

      if (apt.id && apt.id.length > 10 && !apt.id.startsWith('new_')) { 
        const record = await pb.collection('apartments').update(apt.id, data);
        return { ...apt, id: record.id };
      } else {
        const record = await pb.collection('apartments').create(data);
        return { ...apt, id: record.id };
      }
    } catch (error) {
      console.error("Error saving apartment:", error);
      return null; 
    }
  },

  deleteApartment: async (id: string): Promise<void> => {
    try {
      await pb.collection('apartments').delete(id);
    } catch (error) {
      console.error("Error deleting apartment:", error);
    }
  },

  // --- RECOMMENDATIONS ---

  syncRecommendations: async (apartmentId: string, recs: Recommendation[]): Promise<void> => {
    // This method is kept for compatibility, but the UI generally calls individual create/update now
    // logic is minimal here as we handle recs mostly directly
  },

  createRecommendation: async (rec: Recommendation & { apartmentId: string }) => {
     try {
         await pb.collection('recommendations').create({
             apartmentId: rec.apartmentId,
             name: rec.name,
             type: rec.type,
             description: rec.description,
             distance: rec.distance,
             imageUrl: rec.imageUrl,
             mapUrl: rec.mapUrl,
             phoneNumber: rec.phoneNumber
         });
     } catch(e) { console.error("Create Rec Error", e); }
  },

  updateRecommendation: async (rec: Recommendation & { apartmentId: string }) => {
      try {
          await pb.collection('recommendations').update(rec.id, {
             apartmentId: rec.apartmentId,
             name: rec.name,
             type: rec.type,
             description: rec.description,
             distance: rec.distance,
             imageUrl: rec.imageUrl,
             mapUrl: rec.mapUrl,
             phoneNumber: rec.phoneNumber
          });
      } catch(e) { console.error("Update Rec Error", e); }
   },

   deleteRecommendation: async (id: string) => {
       try { await pb.collection('recommendations').delete(id); } catch(e) { console.error("Delete Rec Error", e); }
   },

  // --- INVENTORY ---
  
  getInventory: async (): Promise<InventoryItem[]> => {
    try {
      const records = await pb.collection('inventory').getFullList({ sort: 'name' });
      return records.map((r: any) => ({
        id: r.id,
        name: r.name,
        category: r.category,
        totalQuantity: r.totalQuantity,
        minThreshold: r.minThreshold
      }));
    } catch (error) {
      console.error("Error fetching inventory:", error);
      return [];
    }
  },

  saveInventoryItem: async (item: InventoryItem): Promise<void> => {
    try {
      if (item.id && item.id.length > 10) {
        await pb.collection('inventory').update(item.id, item);
      } else {
        await pb.collection('inventory').create(item);
      }
    } catch (error) { console.error("Save Inv Error", error); }
  },

  // --- CLEANING LOGS ---

  getCleaningLogs: async (): Promise<CleaningLog[]> => {
    try {
      const records = await pb.collection('cleaning_logs').getFullList({ sort: '-date' });
      return records.map((r: any) => ({
        id: r.id,
        apartmentId: r.apartmentId,
        date: r.date,
        cleanerName: r.cleanerName,
        notes: r.notes,
        items: r.items, // JSON field
        paymentStatus: r.paymentStatus
      }));
    } catch (error) {
      console.error("Error fetching cleaning logs:", error);
      return []; 
    }
  },

  addCleaningLog: async (log: CleaningLog): Promise<void> => {
    try {
      await pb.collection('cleaning_logs').create({
        apartmentId: log.apartmentId,
        date: log.date,
        cleanerName: log.cleanerName,
        notes: log.notes,
        items: log.items,
        paymentStatus: log.paymentStatus
      });
    } catch (error) { console.error("Add Log Error", error); }
  },

  updateCleaningLog: async (log: CleaningLog): Promise<void> => {
    try {
      await pb.collection('cleaning_logs').update(log.id, {
        paymentStatus: log.paymentStatus
      });
    } catch (error) { console.error("Update Log Error", error); }
  },

  // --- TEMPLATES ---

  getCleaningTemplate: async (apartmentId: string): Promise<CleaningTemplate | null> => {
    try {
      const records = await pb.collection('cleaning_templates').getFullList({ filter: `apartmentId="${apartmentId}"` });
      if (records.length > 0) {
        const r = records[0];
        return {
          apartmentId: r.apartmentId,
          rooms: r.rooms // JSON
        };
      }
      return null;
    } catch (error) {
      console.error("Error fetching template:", error);
      return null;
    }
  },

  saveCleaningTemplate: async (template: CleaningTemplate): Promise<void> => {
    try {
      const existing = await pb.collection('cleaning_templates').getFullList({ filter: `apartmentId="${template.apartmentId}"` });
      if (existing.length > 0) {
        await pb.collection('cleaning_templates').update(existing[0].id, {
          rooms: template.rooms
        });
      } else {
        await pb.collection('cleaning_templates').create({
          apartmentId: template.apartmentId,
          rooms: template.rooms
        });
      }
    } catch (error) { console.error("Save Template Error", error); }
  },

  // --- MAINTENANCE ---

  getMaintenance: async (): Promise<MaintenanceItem[]> => {
    try {
      const records = await pb.collection('maintenance').getFullList({ sort: 'lastMaintenanceDate' });
      return records.map((r: any) => ({
        id: r.id,
        name: r.name,
        apartmentId: r.apartmentId,
        areaId: r.areaId,
        areaName: r.areaName,
        lastMaintenanceDate: r.lastMaintenanceDate,
        frequencyDays: r.frequencyDays,
        notes: r.notes
      }));
    } catch (error) {
      console.error("Error fetching maintenance:", error);
      return [];
    }
  },

  saveMaintenanceItem: async (item: MaintenanceItem): Promise<void> => {
    try {
      if (item.id && item.id.length > 10) {
        await pb.collection('maintenance').update(item.id, item);
      } else {
        await pb.collection('maintenance').create(item);
      }
    } catch (error) { console.error("Save Maintenance Error", error); }
  },

  // --- USERS & ROLES ---

  getRoles: async (): Promise<Role[]> => {
    try {
      const records = await pb.collection('roles').getFullList();
      return records.map((r: any) => ({
        id: r.id,
        name: r.name,
        permissions: r.permissions || []
      }));
    } catch (error: any) {
      console.error("Error fetching roles:", error);
      // Ensure app sees permission errors
      if (error.status === 403) throw error; 
      return [];
    }
  },

  saveRole: async (role: Role): Promise<void> => {
    try {
      if (role.id && role.id.length > 10) {
        await pb.collection('roles').update(role.id, role);
      } else {
        await pb.collection('roles').create(role);
      }
    } catch (error) { console.error("Save Role Error", error); }
  },

  getUsers: async (): Promise<User[]> => {
    try {
      const records = await pb.collection('users').getFullList();
      console.log("StorageService: Users found:", records.length);
      return records.map((r: any) => {
        // Handle case where roleId might be an array (if relation is 'multiple') 
        // or a string (if 'single') or an Object (if expanded)
        let rId = r.roleId;
        
        // Case 1: Expanded object
        if (typeof rId === 'object' && rId !== null && rId.id) {
            rId = rId.id;
        }
        // Case 2: Array of relations
        else if (Array.isArray(rId)) {
             if (rId.length > 0) {
                 if (typeof rId[0] === 'object' && rId[0].id) {
                     rId = rId[0].id;
                 } else {
                     rId = rId[0];
                 }
             } else {
                 rId = '';
             }
        }
        // Case 3: It's already a string ID, do nothing
        
        return {
            id: r.id,
            name: r.name,
            pin: r.pin,
            roleId: rId
        };
      });
    } catch (error: any) {
      console.error("Error fetching users:", error);
      // Propagate permission error so App knows to show help
      if (error.status === 403 || error.message?.includes('superuser')) throw error;
      return [];
    }
  },

  saveUser: async (user: User): Promise<void> => {
    try {
      if (user.id && user.id.length > 10) {
        // Update existing - only update fields relevant to our app logic
        await pb.collection('users').update(user.id, {
            name: user.name,
            pin: user.pin,
            roleId: user.roleId
        });
      } else {
        // Create new
        // PocketBase 'users' collection is Auth-enabled, so it MANDATES email and password.
        // We generate dummy values to satisfy the schema since we use PIN for app-level login.
        
        const salt = Math.random().toString(36).slice(-8);
        const safeName = user.name.replace(/[^a-z0-9]/gi, '').toLowerCase() || 'user';
        
        const dummyPassword = `P${salt}@${user.pin}!`; // Ensure mixed chars and length
        const dummyEmail = `${safeName}.${salt}@caribeanhomes.app`;

        await pb.collection('users').create({
            username: `${safeName}_${salt}`,
            email: dummyEmail,
            emailVisibility: true,
            password: dummyPassword,
            passwordConfirm: dummyPassword,
            name: user.name,
            pin: user.pin,
            roleId: user.roleId
        });
      }
    } catch (error: any) { 
        console.error("Save User Error", error);
        if (error.data) console.error("Validation Details:", error.data);
        throw error; // Re-throw so UI can display alert
    }
  },
  
  deleteUser: async (id: string): Promise<void> => {
      try { await pb.collection('users').delete(id); } catch(e) { console.error("Delete User Error", e); }
  }
};