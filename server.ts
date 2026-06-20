import express from 'express';
import path from 'path';
import fs from 'fs';
import webpush from 'web-push';
import { createServer as createViteServer } from 'vite';

// --- DATABASE INTERFACES ---
interface Report {
  id: string;
  category: string; // Pothole, Garbage, Streetlight, Water Leakage, Public Complaint, Other
  description: string;
  image: string; // Base64 representation for local file uploads
  location: {
    lat: number;
    lng: number;
    address: string;
  };
  status: 'New' | 'In Progress' | 'Resolved' | 'Reopened';
  priority: 'Low' | 'Medium' | 'High';
  isRepeated: boolean;
  repeatedCount: number;
  createdAt: string;
}

interface Device {
  id: string;
  subscription: webpush.PushSubscription;
  label: string;
  connectedAt: string;
}

interface AppDatabase {
  vapidKeys?: {
    publicKey: string;
    privateKey: string;
  };
  reports: Report[];
  devices: Device[];
}

const DB_FILE = path.join(process.cwd(), 'db.json');

// --- DATABASE UTILITIES ---
function getDb(): AppDatabase {
  if (!fs.existsSync(DB_FILE)) {
    const initialDb: AppDatabase = {
      reports: [],
      devices: []
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initialDb, null, 2), 'utf-8');
    return initialDb;
  }
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (error) {
    console.error('Error reading JSON DB, restoring fallback:', error);
    return { reports: [], devices: [] };
  }
}

function saveDb(db: AppDatabase) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
  } catch (error) {
    console.error('Error writing to JSON DB:', error);
  }
}

// --- DISTANCE CALCULATION (HAVERSINE) ---
function getDistanceInMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371000; // Earth's Radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Set limits to handle base64 image uploads from phone camera comfortably
  app.use(express.json({ limit: '25mb' }));
  app.use(express.urlencoded({ limit: '25mb', extended: true }));

  // --- WEB PUSH CONFIGURATION ---
  const db = getDb();
  let vapidKeys = db.vapidKeys;
  if (!vapidKeys) {
    console.log('[Server] VAPID keys not found. Generating new ones...');
    vapidKeys = webpush.generateVAPIDKeys();
    db.vapidKeys = vapidKeys;
    saveDb(db);
  }

  // Configure web-push details
  webpush.setVapidDetails(
    'mailto:dggaur385@gmail.com', // Contact email
    vapidKeys.publicKey,
    vapidKeys.privateKey
  );

  console.log('[Server] VAPID keys initialized.');

  // --- API ROUTES ---

  // Admin Login
  app.post('/api/admin/login', (req, res) => {
    const { username, password } = req.body;
    // Simple, reliable administrative guard
    if (username === 'admin' && password === 'civicalert2026') {
      res.json({ success: true, token: 'session_token_civic_alert_admin_2026' });
    } else {
      res.status(401).json({ success: false, error: 'Invalid admin credentials' });
    }
  });

  // Get Web Push Public Key
  app.get('/api/vapid-public-key', (req, res) => {
    const currentDb = getDb();
    if (currentDb.vapidKeys) {
      res.json({ publicKey: currentDb.vapidKeys.publicKey });
    } else {
      res.status(500).json({ error: 'VAPID keys not configured on server' });
    }
  });

  // Connect & Solder Device
  app.post('/api/connect-device', (req, res) => {
    const { subscription, label } = req.body;
    if (!subscription || !subscription.endpoint) {
      return res.status(400).json({ error: 'Valid push subscription is required' });
    }

    const currentDb = getDb();
    const cleanLabel = label || 'Anonymous Phone';

    // Check if subscription already exists
    const existingIndex = currentDb.devices.findIndex(
      d => d.subscription.endpoint === subscription.endpoint
    );

    const deviceId = existingIndex >= 0 ? currentDb.devices[existingIndex].id : 'dev_' + Date.now();

    const newDevice: Device = {
      id: deviceId,
      subscription,
      label: cleanLabel,
      connectedAt: new Date().toISOString()
    };

    if (existingIndex >= 0) {
      currentDb.devices[existingIndex] = newDevice;
    } else {
      currentDb.devices.push(newDevice);
    }

    saveDb(currentDb);
    console.log(`[Push Notification] Registered device: "${cleanLabel}"`);

    // Send instant welcome notification to confirm subscription
    const testPayload = JSON.stringify({
      title: 'Device Connected! 📱',
      body: `You will now receive instant CivicAlert warnings on "${cleanLabel}" when new community reports are filed.`,
      data: { url: '/' }
    });

    webpush.sendNotification(subscription, testPayload)
      .catch(err => console.error('Welcome notification failed:', err));

    res.json({ success: true, deviceId });
  });

  // Get active device list
  app.get('/api/devices', (req, res) => {
    const currentDb = getDb();
    res.json(currentDb.devices.map(d => ({
      id: d.id,
      label: d.label,
      connectedAt: d.connectedAt
    })));
  });

  // Disconnect Device
  app.post('/api/disconnect-device', (req, res) => {
    const { deviceId } = req.body;
    if (!deviceId) {
      return res.status(400).json({ error: 'deviceId is required' });
    }
    const currentDb = getDb();
    const lengthBefore = currentDb.devices.length;
    currentDb.devices = currentDb.devices.filter(d => d.id !== deviceId);
    saveDb(currentDb);
    res.json({ success: true, removed: lengthBefore > currentDb.devices.length });
  });

  // Get all reports
  app.get('/api/reports', (req, res) => {
    const currentDb = getDb();
    // Return all items, sorted newest first
    res.json(currentDb.reports.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
  });

  // Get specific report
  app.get('/api/reports/:id', (req, res) => {
    const { id } = req.params;
    const currentDb = getDb();
    const report = currentDb.reports.find(r => r.id === id);
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }
    res.json(report);
  });

  // Submit and route report
  app.post('/api/reports', async (req, res) => {
    const { category, description, image, location, priority } = req.body;

    if (!category || !description || !location || !location.lat || !location.lng) {
      return res.status(400).json({ error: 'Submission lacks required properties (category, description, location)' });
    }

    const currentDb = getDb();
    const lat = Number(location.lat);
    const lng = Number(location.lng);
    const address = location.address || 'Unknown coordinates';

    // --- REAPPEARING COMPLAINDER / NEARBY CHECK ---
    // Look up existing reports matching same category and within 500 meters GPS radius
    const matchingHistoric = currentDb.reports.filter(r => {
      if (r.category.toLowerCase() !== category.toLowerCase()) return false;
      const distance = getDistanceInMeters(lat, lng, r.location.lat, r.location.lng);
      return distance <= 500; // nearby threshold (500m)
    });

    const isRepeated = matchingHistoric.length > 0;
    const repeatedCount = isRepeated ? matchingHistoric.length + 1 : 1;

    const newReportId = 'rep_' + Date.now();
    const newReport: Report = {
      id: newReportId,
      category,
      description,
      image: image || '',
      location: {
        lat,
        lng,
        address
      },
      status: 'New',
      priority: priority || 'Medium',
      isRepeated,
      repeatedCount,
      createdAt: new Date().toISOString()
    };

    // If there were historical duplicates, update all related historical reports
    // so they are marked as isRepeated = true and synchronize their cluster counts!
    if (isRepeated) {
      matchingHistoric.forEach(hist => {
        const index = currentDb.reports.findIndex(r => r.id === hist.id);
        if (index >= 0) {
          currentDb.reports[index].isRepeated = true;
          currentDb.reports[index].repeatedCount = repeatedCount;
        }
      });
    }

    currentDb.reports.push(newReport);
    saveDb(currentDb);

    console.log(`[CivicAlert] New report: ${category} filed. Repeats: ${isRepeated} (Count: ${repeatedCount})`);

    // --- SEND ALERTS SYSTEM ---
    const alertBody = isRepeated
      ? `⚠️ REPEATED ${category.toUpperCase()}! reported near ${address}`
      : `${category} reported at ${address}`;

    const pushPayload = JSON.stringify({
      title: isRepeated ? `🚨 Alert: Repeated ${category}!` : `📢 New Report: ${category}`,
      body: `${description.slice(0, 70)}${description.length > 70 ? '...' : ''}\nPriority: ${newReport.priority}`,
      data: {
        url: `/report/${newReportId}`,
        reportId: newReportId
      }
    });

    const devicesToRemove: string[] = [];
    const sendPromises = currentDb.devices.map(device => {
      return webpush.sendNotification(device.subscription, pushPayload)
        .catch(err => {
          console.error(`Alert dispatch failed for device ${device.label} (${device.id}):`, err.statusCode);
          // If subscription has expired or is unsubscribed (410, 404), schedule deletion
          if (err.statusCode === 410 || err.statusCode === 404) {
            devicesToRemove.push(device.id);
          }
        });
    });

    await Promise.all(sendPromises);

    // Prune stale device tokens
    if (devicesToRemove.length > 0) {
      const liveDb = getDb();
      liveDb.devices = liveDb.devices.filter(d => !devicesToRemove.includes(d.id));
      saveDb(liveDb);
      console.log(`[CivicAlert] Pruned ${devicesToRemove.length} inactive or dead notification subscriptions`);
    }

    res.status(201).json(newReport);
  });

  // Edit/Patch status and priority (Admin control)
  app.patch('/api/reports/:id', (req, res) => {
    const { id } = req.params;
    const { status, priority } = req.body;

    const currentDb = getDb();
    const reportIndex = currentDb.reports.findIndex(r => r.id === id);

    if (reportIndex < 0) {
      return res.status(404).json({ error: 'Report not found' });
    }

    if (status) {
      currentDb.reports[reportIndex].status = status;
    }
    if (priority) {
      currentDb.reports[reportIndex].priority = priority;
    }

    saveDb(currentDb);
    res.json(currentDb.reports[reportIndex]);
  });

  // Delete issue (Admin maintenance tool)
  app.delete('/api/reports/:id', (req, res) => {
    const { id } = req.params;
    const currentDb = getDb();
    const initialLen = currentDb.reports.length;
    currentDb.reports = currentDb.reports.filter(r => r.id !== id);
    saveDb(currentDb);
    res.json({ success: true, deleted: initialLen > currentDb.reports.length });
  });

  // --- VITE DEV OR PRODUCTION PACK CONDUIT ---
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`=========================================`);
    console.log(`[CivicAlert] Server is active!`);
    console.log(`[CivicAlert] Access via Port: ${PORT}`);
    console.log(`=========================================`);
  });
}

startServer();
