const fs = require('node:fs');

/** Validate genuine owner input without logging its contents or creating substitutes. */
function validateFirebaseConfig(file, packageName) {
  let config;
  try { config = JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch { throw new Error('GOOGLE_SERVICES_JSON must reference a readable Firebase Android client JSON file.'); }
  const info = config?.project_info;
  if (!info || typeof info.project_id !== 'string' || !info.project_id.trim() ||
      typeof info.project_number !== 'string' || !/^\d+$/.test(info.project_number) || config.configuration_version !== '1') {
    throw new Error('Firebase Android client configuration has invalid project metadata.');
  }
  const clients = Array.isArray(config.client) ? config.client.filter(client =>
    client?.client_info?.android_client_info?.package_name === packageName) : [];
  if (clients.length !== 1) throw new Error(`Firebase Android client configuration must contain exactly one client for ${packageName}.`);
  const client = clients[0];
  if (typeof client.client_info.mobilesdk_app_id !== 'string' ||
      !client.client_info.mobilesdk_app_id.startsWith(`1:${info.project_number}:android:`) ||
      !Array.isArray(client.api_key) || !client.api_key.some(key => typeof key.current_key === 'string' && key.current_key.trim())) {
    throw new Error('Firebase Android client configuration is missing matching app ID or API-key metadata.');
  }
  return { packageName, projectId: info.project_id };
}
module.exports = { validateFirebaseConfig };
