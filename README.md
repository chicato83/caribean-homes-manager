<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/a83474f5-dde7-4280-9882-0ef5ff2d6fd3

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Sincronización de calendario con Airbnb

1. Ejecuta `supabase-migration-airbnb-ical.sql` en el SQL Editor de Supabase (agrega la columna `ical_url`).
2. En el panel, entra a **Apartamentos → Editar** y pega el enlace iCal de Airbnb (*Calendario → Exportar calendario*).
3. En **Calendario**, pulsa **Sincronizar Airbnb**. Las reservas se muestran en verde y se actualizan también de forma automática al abrir la vista (caché de 30 min).

El feed se descarga por `/api/ical`: una Cloudflare Pages Function en producción (`functions/api/ical.ts`) y un middleware equivalente de Vite en desarrollo. Solo se aceptan enlaces HTTPS de Airbnb.
