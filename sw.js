// Import Workbox from Google's free CDN
importScripts('https://storage.googleapis.com/workbox-cdn/releases/7.4.0/workbox-sw.js');

if (workbox) {
  console.log('Workbox is loaded and ready!');

  // Configure the Background Sync Plugin
  const bgSyncPlugin = new workbox.backgroundSync.BackgroundSyncPlugin('factory-checksheet-queue', {
    maxRetentionTime: 24 * 60 // Retry for a maximum of 24 Hours (in minutes)
  });

  // Intercept API calls to your Render Backend
  workbox.routing.registerRoute(
    // REPLACE THIS with your actual Render API URL endpoint
    new RegExp('https://checksheet-api-xby9.onrender.com'),
    
    // Use a "Network Only" strategy, but attach the Background Sync plugin
    new workbox.strategies.NetworkOnly({
      plugins: [bgSyncPlugin]
    }),
    
    // Specify the HTTP method used to submit the form (usually POST)
    'POST'
  );

} else {
  console.log('Workbox failed to load.');
}
