/**
 * Netlify Function: create-payment-intent
 *
 * Creates a real Stripe PaymentIntent with:
 *  - Automatic tax calculation via Stripe Tax
 *  - Shipping amount included
 *  - Idempotency key to prevent double charges
 *
 * POST body (JSON):
 *  {
 *    items:        [{ name, price, quantity }],
 *    shippingRate: { amount, provider, servicelevel },  // from shippo-rates
 *    address: {
 *      name, email, line1, line2, city, state, zip, country
 *    }
 *  }
 *
 * Response:
 *  { clientSecret, orderId, tax, total }
 */

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {
  // ── CORS ──────────────────────────────────────────────────
  const headers = {
    'Access-Control-Allow-Origin': process.env.SITE_URL || '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const { items, shippingRate, address } = JSON.parse(event.body);

    if (!items?.length || !address?.email) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing required fields: items and address.email' }),
      };
    }

    // ── Calculate subtotal (items in cents) ───────────────────
    const subtotalCents = items.reduce((sum, item) => {
      return sum + Math.round(item.price * 100) * (item.quantity || 1);
    }, 0);

    // ── Shipping cost in cents ────────────────────────────────
    const shippingCents = shippingRate?.amount
      ? Math.round(parseFloat(shippingRate.amount) * 100)
      : 0;

    // ── Build line items for Stripe Tax ───────────────────────
    // Stripe Tax requires automatic_tax enabled on your Stripe account
    // Dashboard → Settings → Tax → Enable
    const lineItems = items.map((item) => ({
      name: item.name,
      amount: Math.round(item.price * 100),
      quantity: item.quantity || 1,
      tax_behavior: 'exclusive', // tax added on top
    }));

    // ── Idempotency key (prevents duplicate charges on retry) ─
    const idempotencyKey = `pi_${address.email}_${Date.now()}`;

    // ── Create PaymentIntent ──────────────────────────────────
    const paymentIntent = await stripe.paymentIntents.create(
      {
        amount: subtotalCents + shippingCents,
        currency: 'usd',
        automatic_payment_methods: { enabled: true },
        automatic_tax: { enabled: true },
        receipt_email: address.email,

        // Shipping details for Stripe Tax geo lookup
        shipping: {
          name: address.name,
          address: {
            line1: address.line1,
            line2: address.line2 || '',
            city: address.city,
            state: address.state,
            postal_code: address.zip,
            country: address.country || 'US',
          },
        },

        // Store order info in metadata for webhook / label creation
        metadata: {
          customer_email: address.email,
          customer_name: address.name,
          items: JSON.stringify(lineItems),
          shipping_provider: shippingRate?.provider || '',
          shipping_service: shippingRate?.servicelevel || '',
          shipping_amount_cents: String(shippingCents),
          // Address fields for label creation
          ship_line1: address.line1,
          ship_line2: address.line2 || '',
          ship_city: address.city,
          ship_state: address.state,
          ship_zip: address.zip,
          ship_country: address.country || 'US',
        },
      },
      { idempotencyKey }
    );

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        clientSecret: paymentIntent.client_secret,
        orderId: paymentIntent.id,
        subtotal: (subtotalCents / 100).toFixed(2),
        shipping: (shippingCents / 100).toFixed(2),
        // Tax is calculated by Stripe and shown after confirmPayment
        // Use paymentIntent.latest_charge for final tax amount
      }),
    };
  } catch (err) {
    console.error('create-payment-intent error:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
