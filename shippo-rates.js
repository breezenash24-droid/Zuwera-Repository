/**
 * Netlify Function: shippo-rates
 *
 * Fetches live shipping rates from Shippo for a given address + parcel.
 *
 * POST body (JSON):
 *  {
 *    address: { name, line1, city, state, zip, country },
 *    parcel: {                  // optional — defaults to typical jacket package
 *      length: "14",            // inches
 *      width:  "10",
 *      height: "4",
 *      weight: "2",             // lbs
 *    }
 *  }
 *
 * Response:
 *  { rates: [{ provider, servicelevel, amount, currency, days, objectId }] }
 *
 * Setup:
 *  1. Create a free account at https://goshippo.com
 *  2. Add SHIPPO_API_KEY to your Netlify env vars
 *  3. Set SHIPPO_FROM_* env vars (your warehouse/return address)
 */

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': process.env.SITE_URL || '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const { address, parcel: customParcel } = JSON.parse(event.body);

    if (!address?.zip || !address?.country) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'address.zip and address.country are required' }),
      };
    }

    // ── Default parcel size (jacket in mailer box) ────────────
    const parcel = customParcel || {
      length: '14',
      width: '10',
      height: '4',
      distance_unit: 'in',
      weight: '2',
      mass_unit: 'lb',
    };

    // ── Build Shippo shipment request ─────────────────────────
    const shipmentPayload = {
      address_from: {
        name:    process.env.SHIPPO_FROM_NAME    || 'Zuwera',
        street1: process.env.SHIPPO_FROM_STREET1 || '123 Brand St',
        city:    process.env.SHIPPO_FROM_CITY    || 'Los Angeles',
        state:   process.env.SHIPPO_FROM_STATE   || 'CA',
        zip:     process.env.SHIPPO_FROM_ZIP     || '90001',
        country: process.env.SHIPPO_FROM_COUNTRY || 'US',
      },
      address_to: {
        name:    address.name    || 'Customer',
        street1: address.line1   || '',
        city:    address.city    || '',
        state:   address.state   || '',
        zip:     address.zip,
        country: address.country || 'US',
      },
      parcels: [parcel],
      async: false,
    };

    // ── Call Shippo API ───────────────────────────────────────
    const resp = await fetch('https://api.goshippo.com/shipments/', {
      method: 'POST',
      headers: {
        'Authorization': `ShippoToken ${process.env.SHIPPO_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(shipmentPayload),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      console.error('Shippo error:', errText);
      return {
        statusCode: 502,
        headers,
        body: JSON.stringify({ error: 'Shippo API error', detail: errText }),
      };
    }

    const data = await resp.json();

    // ── Filter + sort rates ───────────────────────────────────
    const rates = (data.rates || [])
      .filter((r) => r.object_status === 'VALID')
      .map((r) => ({
        objectId:     r.object_id,
        provider:     r.provider,           // e.g. "USPS"
        servicelevel: r.servicelevel_name,  // e.g. "Priority Mail"
        amount:       r.amount,             // e.g. "8.50"
        currency:     r.currency,
        days:         r.estimated_days,
      }))
      .sort((a, b) => parseFloat(a.amount) - parseFloat(b.amount));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ rates }),
    };
  } catch (err) {
    console.error('shippo-rates error:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
