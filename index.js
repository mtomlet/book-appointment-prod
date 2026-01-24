/**
 * Book Appointment - PRODUCTION (Phoenix Encanto)
 *
 * Railway-deployable endpoint for Retell AI
 * Books appointments with support for additional services (add-ons)
 *
 * PRODUCTION CREDENTIALS - DO NOT USE FOR TESTING
 * Location: Keep It Cut - Phoenix Encanto (201664)
 *
 * Version: 2.0.0 - FIXED: Add-ons now book correctly via sequential API calls
 *                  The Meevo API ignores AdditionalServiceIds parameter.
 *                  Add-ons are now booked as back-to-back services.
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

// Helper: Check if error is about a PAST appointment conflict
function isPastAppointmentConflict(errorMessage) {
  if (!errorMessage || !errorMessage.includes('already booked on')) return null;

  // Extract date from "already booked on 12/26/2025"
  const dateMatch = errorMessage.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (!dateMatch) return null;

  const [_, month, day, year] = dateMatch;
  const conflictDate = new Date(year, parseInt(month) - 1, parseInt(day));
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (conflictDate < today) {
    return { month, day, year, date: conflictDate };
  }
  return null;
}

// Helper: Find and cancel stale past appointment
async function cancelStaleAppointment(authToken, clientId, serviceId, conflictDate) {
  console.log('PRODUCTION: Looking for stale appointment to cancel...');

  try {
    // Get client's appointments
    const appointmentsRes = await axios.get(
      `${CONFIG.API_URL}/book/client/${clientId}/services?TenantId=${CONFIG.TENANT_ID}&LocationId=${CONFIG.LOCATION_ID}&StartDate=2025-01-01`,
      { headers: { Authorization: `Bearer ${authToken}` }}
    );

    const appointments = appointmentsRes.data?.data || [];
    console.log(`PRODUCTION: Found ${appointments.length} appointments for client`);

    // Find the stale appointment (matching service, not cancelled, in the past)
    const staleAppt = appointments.find(apt => {
      const aptDate = new Date(apt.startTime);
      const aptServiceId = apt.serviceId;
      return !apt.isCancelled &&
             aptServiceId === serviceId &&
             aptDate < new Date();
    });

    if (!staleAppt) {
      console.log('PRODUCTION: Could not find stale appointment to cancel');
      return false;
    }

    console.log(`PRODUCTION: Found stale appointment: ${staleAppt.appointmentServiceId} on ${staleAppt.startTime}`);

    // Cancel the stale appointment
    const cancelRes = await axios.delete(
      `${CONFIG.API_URL}/book/service/${staleAppt.appointmentServiceId}?TenantId=${CONFIG.TENANT_ID}&LocationId=${CONFIG.LOCATION_ID}&ConcurrencyCheckDigits=${staleAppt.concurrencyCheckDigits}`,
      { headers: { Authorization: `Bearer ${authToken}` }}
    );

    console.log('PRODUCTION: Stale appointment cancelled successfully');
    return true;

  } catch (error) {
    console.error('PRODUCTION: Error cancelling stale appointment:', error.response?.data || error.message);
    return false;
  }
}

// Helper: Book a single service
async function bookSingleService(authToken, serviceId, startTime, clientId, employeeId) {
  const bookingData = new URLSearchParams({
    ServiceId: serviceId,
    StartTime: startTime,
    ClientId: clientId,
    ClientGender: '2035'
  });

  if (employeeId) {
    bookingData.append('EmployeeId', employeeId);
  }

  const response = await axios.post(
    `${CONFIG.API_URL}/book/service?TenantId=${CONFIG.TENANT_ID}&LocationId=${CONFIG.LOCATION_ID}`,
    bookingData.toString(),
    {
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    }
  );

  return response.data?.data || response.data;
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

    // Track all booked services for response
    const bookedServices = [];

    // STEP 1: Book primary service
    console.log('PRODUCTION: Booking primary service:', service);
    let primaryResult;
    try {
      primaryResult = await bookSingleService(authToken, serviceId, datetime, client_id, stylist);
      console.log('PRODUCTION: Primary service booked! ID:', primaryResult.appointmentId);
      bookedServices.push({
        service: service,
        service_id: serviceId,
        appointment_id: primaryResult.appointmentId,
        appointment_service_id: primaryResult.appointmentServiceId,
        start_time: primaryResult.startTime,
        end_time: primaryResult.servicingEndTime
      });
    } catch (primaryError) {
      const errorMessage = primaryError.response?.data?.error?.message || primaryError.message;

      // Check for stale appointment conflict and try auto-recovery
      const pastConflict = isPastAppointmentConflict(errorMessage);
      if (pastConflict) {
        console.log(`PRODUCTION: Stale appointment conflict detected. Attempting auto-recovery...`);
        const cancelled = await cancelStaleAppointment(authToken, client_id, serviceId, pastConflict.date);
        if (cancelled) {
          primaryResult = await bookSingleService(authToken, serviceId, datetime, client_id, stylist);
          console.log('PRODUCTION: Auto-recovery successful! Primary service booked.');
          bookedServices.push({
            service: service,
            service_id: serviceId,
            appointment_id: primaryResult.appointmentId,
            appointment_service_id: primaryResult.appointmentServiceId,
            start_time: primaryResult.startTime,
            end_time: primaryResult.servicingEndTime,
            auto_recovered: true
          });
        } else {
          throw primaryError;
        }
      } else {
        throw primaryError;
      }
    }

    // STEP 2: Book add-on services SEQUENTIALLY (each starts when previous ends)
    // NOTE: Meevo API ignores AdditionalServiceIds parameter, so we book each add-on separately
    if (additional_services && Array.isArray(additional_services) && additional_services.length > 0) {
      console.log('PRODUCTION: Booking', additional_services.length, 'add-on service(s) sequentially...');

      let nextStartTime = primaryResult.servicingEndTime;

      for (const addonName of additional_services) {
        const addonServiceId = resolveServiceId(addonName);
        if (!addonServiceId) {
          console.log('PRODUCTION: Skipping invalid add-on:', addonName);
          continue;
        }

        try {
          console.log(`PRODUCTION: Booking add-on "${addonName}" starting at ${nextStartTime}`);
          const addonResult = await bookSingleService(authToken, addonServiceId, nextStartTime, client_id, stylist);

          console.log(`PRODUCTION: Add-on "${addonName}" booked! Ends at:`, addonResult.servicingEndTime);
          bookedServices.push({
            service: addonName,
            service_id: addonServiceId,
            appointment_id: addonResult.appointmentId,
            appointment_service_id: addonResult.appointmentServiceId,
            start_time: addonResult.startTime,
            end_time: addonResult.servicingEndTime,
            is_addon: true
          });

          // Next add-on starts when this one ends
          nextStartTime = addonResult.servicingEndTime;

        } catch (addonError) {
          const addonErrorMsg = addonError.response?.data?.error?.message || addonError.message;
          console.error(`PRODUCTION: Failed to book add-on "${addonName}":`, addonErrorMsg);

          // Try auto-recovery for stale appointment conflicts on add-ons too
          const pastConflict = isPastAppointmentConflict(addonErrorMsg);
          if (pastConflict) {
            const cancelled = await cancelStaleAppointment(authToken, client_id, addonServiceId, pastConflict.date);
            if (cancelled) {
              try {
                const retryResult = await bookSingleService(authToken, addonServiceId, nextStartTime, client_id, stylist);
                console.log(`PRODUCTION: Add-on "${addonName}" booked after auto-recovery!`);
                bookedServices.push({
                  service: addonName,
                  service_id: addonServiceId,
                  appointment_id: retryResult.appointmentId,
                  appointment_service_id: retryResult.appointmentServiceId,
                  start_time: retryResult.startTime,
                  end_time: retryResult.servicingEndTime,
                  is_addon: true,
                  auto_recovered: true
                });
                nextStartTime = retryResult.servicingEndTime;
              } catch (retryErr) {
                console.error(`PRODUCTION: Add-on "${addonName}" failed even after auto-recovery`);
                // Continue with other add-ons
              }
            }
          }
          // Continue booking other add-ons even if one fails
        }
      }
    }

    // Build response
    const primaryAppointmentId = bookedServices[0]?.appointment_id;
    const totalServicesBooked = bookedServices.length;
    const addonsBooked = bookedServices.filter(s => s.is_addon).length;

    console.log(`PRODUCTION: Booking complete! ${totalServicesBooked} service(s) booked.`);

    res.json({
      success: true,
      appointment_id: primaryAppointmentId,
      service_id: serviceId,
      total_services_booked: totalServicesBooked,
      booked_services: bookedServices,
      message: addonsBooked > 0
        ? `Appointment booked successfully with ${addonsBooked} add-on service(s)`
        : 'Appointment booked successfully'
    });

  } catch (error) {
    const errorMessage = error.response?.data?.error?.message || error.message;
    console.error('PRODUCTION Booking error:', errorMessage);

    res.json({
      success: false,
      error: errorMessage
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
    version: '2.0.0',
    fix_notes: 'Add-ons now book correctly via sequential API calls'
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
  console.log(`\nPRODUCTION Book Appointment Server v2.0.0`);
  console.log(`Location: Phoenix Encanto (${CONFIG.LOCATION_ID})`);
  console.log(`FIX: Add-ons now book correctly via sequential API calls`);
  console.log(`Listening on port ${PORT}\n`);
});
