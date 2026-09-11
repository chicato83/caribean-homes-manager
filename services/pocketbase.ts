import PocketBase from 'pocketbase';

// Initialize PocketBase
export const pb = new PocketBase('https://posgres-caribeanhomes.5ikam5.easypanel.host');

// Disable auto-cancellation to prevent race conditions in UI effects
pb.autoCancellation(false);