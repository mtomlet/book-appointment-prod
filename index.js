/**
 * Book Appointment - PRODUCTION (Phoenix Encanto)
 *
 * Railway-deployable endpoint for Retell AI
 * Books appointments with support for additional services (add-ons)
 *
 * PRODUCTION CREDENTIALS - DO NOT USE FOR TESTING
 * Location: Keep It Cut - Phoenix Encanto (201664)
 *
 * Version: 1.0.1 - Deployed 2025-12-28
 *
 * KEEP IT CUT SERVICES (Production IDs):
 * - Haircut Standard: f9160450-0b51-4ddc-bcc7-ac150103d5c0
 * - Haircut Skin Fade: 14000cb7-a5bb-4a26-9f23-b0f3016cc009
 * - Long Locks: 721e907d-fdae-41a5-bec4-ac150104229b
 * - Wash: 67c644bc-237f-4794-8b48-ac150106d5ae
 * - Grooming: 65ee2a0d-e995-4d8d-a286-ac150106994b
 */

const express = require('express');
const axios = require('axios');

const app = express();
app.use(express.json());

// PRODUCTION Meevo API Configuration
const CONFIG = {
  AUTH_URL: 'https://marketplace.meevo.com/oauth2/token',
  API_URL: 'https://na1pub.meevo.com/publicapi/v1',
  CLIENT_ID: 'f6a5046d-208e-4829-9941-034ebdd2aa65',
  CLIENT_SECRET: '2f8feb2e-51f5-40a3-83af-3d4a6a454abe',
  TENANT_ID: '200507',
  LOCATION_ID: '201664'  // Phoenix Encanto
};

// PRODUCTION Service IDs (Phoenix Encanto)
const SERVICE_MAP = {
  // PRIMARY SERVICES
  'haircut_standard': 'f9160450-0b51-4ddc-bcc7-ac150103d5c0',
  'haircut standard': 'f9160450-0b51-4ddc-bcc7-ac150103d5c0',
  'standard': 'f9160450-0b51-4ddc-bcc7-ac150103d5c0',
  'haircut': 'f9160450-0b51-4ddc-bcc7-ac150103d5c0',
  'mens_haircut': 'f9160450-0b51-4ddc-bcc7-ac150103d5c0',
  'mens haircut': 'f9160450-0b51-4ddc-bcc7-ac150103d5c0',

  // Haircut Skin Fade
  'haircut_skin_fade': '14000cb7-a5bb-4a26-9f23-b0f3016cc009',
  'haircut skin fade': '14000cb7-a5bb-4a26-9f23-b0f3016cc009',
  'skin_fade': '14000cb7-a5bb-4a26-9f23-b0f3016cc009',
  'skin fade': '14000cb7-a5bb-4a26-9f23-b0f3016cc009',
  'fade': '14000cb7-a5bb-4a26-9f23-b0f3016cc009',

  // Long Locks
  'long_locks': '721e907d-fdae-41a5-bec4-ac150104229b',
  'long locks': '721e907d-fdae-41a5-bec4-ac150104229b',
  'long': '721e907d-fdae-41a5-bec4-ac150104229b',
  'womens_haircut': '721e907d-fdae-41a5-bec4-ac150104229b',
  'womens haircut': '721e907d-fdae-41a5-bec4-ac150104229b',

  // ADD-ON SERVICES
  // Wash
  'wash': '67c644bc-237f-4794-8b48-ac150106d5ae',
  'shampoo': '67c644bc-237f-4794-8b48-ac150106d5ae',

  // Grooming
  'grooming': '65ee2a0d-e995-4d8d-a286-ac150106994b',
  'beard': '65ee2a0d-e995-4d8d-a286-ac150106994b',
  'beard_trim': '65ee2a0d-e995-4d8d-a286-ac150106994b',
  'beard trim': '65ee2a0d-e995-4d8d-a286-ac150106994b'
};

// Helper to resolve service name to ID
function resolveServiceId(input) {
  if (!input) return null;
  // If it's already a UUID, return as-is
  if (input.includes('-') && input.length > 30) return input;
  // Otherwise look up by name (case-insensitive)
  return SERVICE_MAP[input.toLowerCase().trim()] || null;
}

let token = null;
let tokenExpiry = null;

async function getToken() {
  if (token && tokenExpiry && Date.now() < tokenExpiry - 300000) return token;

  console.log('Getting fresh PRODUCTION token...');
  const res = await axios.post(CONFIG.AUTH_URL, {
    client_id: CONFIG.CLIENT_ID,
    client_secret: CONFIG.CLIENT_SECRET
  });

  token = res.data.access_token;
  tokenExpiry = Date.now() + (res.data.expires_in * 1000);
  console.log('PRODUCTION token obtained');
  return token;
}

app.post('/book', async (req, res) => {
  console.log('PRODUCTION Booking request received:', JSON.stringify(req.body));

  try {
    const { client_id, service, stylist, datetime, additional_services } = req.body;

    // Validate required fields
    if (!client_id || !service || !datetime) {
      return res.json({
        success: false,
        error: 'Missing required fields: client_id, service, and datetime are required'
      });
    }

    // Resolve service ID (accepts name or UUID)
    const serviceId = resolveServiceId(service);
    if (!serviceId) {
      return res.json({
        success: false,
        error: `Invalid service: "${service}". Use a valid service UUID or name like "haircut_standard", "wash", etc.`
      });
    }

    const authToken = await getToken();

    // Build booking data
    const bookingData = new URLSearchParams({
      ServiceId: serviceId,
      StartTime: datetime,
      ClientId: client_id,
      ClientGender: '2035'
    });

    // Add stylist if provided
    if (stylist) {
      bookingData.append('EmployeeId', stylist);
    }

    // Add additional services if provided (for multi-service bookings)
    if (additional_services && Array.isArray(additional_services) && additional_services.length > 0) {
      const resolvedAddons = additional_services
        .map(s => resolveServiceId(s))
        .filter(s => s !== null);

      if (resolvedAddons.length > 0) {
        bookingData.append('AdditionalServiceIds', resolvedAddons.join(','));
        console.log('Adding services:', resolvedAddons);
      }
    }

    console.log('PRODUCTION Booking payload:', bookingData.toString());

    const bookRes = await axios.post(
      `${CONFIG.API_URL}/book/service?TenantId=${CONFIG.TENANT_ID}&LocationId=${CONFIG.LOCATION_ID}`,
      bookingData.toString(),
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    const appointmentId = bookRes.data?.data?.appointmentId || bookRes.data?.appointmentId;

    console.log('PRODUCTION Booking successful! Appointment ID:', appointmentId);

    res.json({
      success: true,
      appointment_id: appointmentId,
      service_id: serviceId,
      additional_services: additional_services || [],
      message: additional_services && additional_services.length > 0
        ? 'Appointment booked successfully with add-on services'
        : 'Appointment booked successfully'
    });

  } catch (error) {
    console.error('PRODUCTION Booking error:', error.response?.data || error.message);

    res.json({
      success: false,
      error: error.response?.data?.error?.message || error.message
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    environment: 'PRODUCTION',
    location: 'Phoenix Encanto',
    location_id: CONFIG.LOCATION_ID,
    service: 'Book Appointment',
    version: '1.0.0'
  });
});

// Service reference endpoint
app.get('/services', (req, res) => {
  res.json({
    environment: 'PRODUCTION',
    location: 'Phoenix Encanto',
    services: {
      primary: {
        'haircut_standard': 'f9160450-0b51-4ddc-bcc7-ac150103d5c0',
        'haircut_skin_fade': '14000cb7-a5bb-4a26-9f23-b0f3016cc009',
        'long_locks': '721e907d-fdae-41a5-bec4-ac150104229b'
      },
      addons: {
        'wash': '67c644bc-237f-4794-8b48-ac150106d5ae',
        'grooming': '65ee2a0d-e995-4d8d-a286-ac150106994b'
      }
    }
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\nPRODUCTION Book Appointment Server v1.0`);
  console.log(`Location: Phoenix Encanto (${CONFIG.LOCATION_ID})`);
  console.log(`Listening on port ${PORT}\n`);
});
