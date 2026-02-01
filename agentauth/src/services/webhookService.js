const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

/**
 * Generate webhook secret for signature verification
 */
function generateWebhookSecret() {
  return 'whsec_' + crypto.randomBytes(32).toString('hex');
}

/**
 * Create a new webhook
 */
async function createWebhook({ agent_id, url, events, description }) {
  const secret = generateWebhookSecret();

  const { data, error } = await supabase
    .from('webhooks')
    .insert({
      agent_id,
      url,
      events,
      description: description || null,
      secret,
      is_active: true,
      created_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

/**
 * List webhooks for an agent
 */
async function listWebhooks(agent_id) {
  const { data, error } = await supabase
    .from('webhooks')
    .select('*')
    .eq('agent_id', agent_id)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  // Don't expose secrets in list view
  return data.map(webhook => ({
    ...webhook,
    secret: webhook.secret ? '***' : null,
  }));
}

/**
 * Get webhook by ID
 */
async function getWebhookById(webhook_id) {
  const { data, error } = await supabase
    .from('webhooks')
    .select('*')
    .eq('id', webhook_id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    throw error;
  }

  return data;
}

/**
 * Update webhook
 */
async function updateWebhook(webhook_id, updates) {
  const { data, error } = await supabase
    .from('webhooks')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', webhook_id)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Delete webhook
 */
async function deleteWebhook(webhook_id) {
  const { error } = await supabase
    .from('webhooks')
    .delete()
    .eq('id', webhook_id);

  if (error) {
    throw error;
  }

  return true;
}

/**
 * Regenerate webhook secret
 */
async function regenerateWebhookSecret(webhook_id) {
  const newSecret = generateWebhookSecret();

  const { data, error } = await supabase
    .from('webhooks')
    .update({
      secret: newSecret,
      updated_at: new Date().toISOString(),
    })
    .eq('id', webhook_id)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Toggle webhook active status
 */
async function toggleWebhook(webhook_id, is_active) {
  const { data, error } = await supabase
    .from('webhooks')
    .update({
      is_active,
      updated_at: new Date().toISOString(),
    })
    .eq('id', webhook_id)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Record webhook delivery
 */
async function recordWebhookDelivery({
  webhook_id,
  event_type,
  payload,
  response_status,
  response_body,
  error_message,
}) {
  try {
    await supabase
      .from('webhook_deliveries')
      .insert({
        webhook_id,
        event_type,
        payload,
        response_status,
        response_body,
        error_message,
        delivered_at: new Date().toISOString(),
      });
  } catch (err) {
    console.error('Failed to record webhook delivery:', err);
  }
}

/**
 * Get webhook delivery history
 */
async function getWebhookDeliveries(webhook_id, { limit = 50, offset = 0 }) {
  const { data, error, count } = await supabase
    .from('webhook_deliveries')
    .select('*', { count: 'exact' })
    .eq('webhook_id', webhook_id)
    .order('delivered_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    throw error;
  }

  return {
    deliveries: data,
    total: count,
    limit,
    offset,
  };
}

module.exports = {
  createWebhook,
  listWebhooks,
  getWebhookById,
  updateWebhook,
  deleteWebhook,
  regenerateWebhookSecret,
  toggleWebhook,
  recordWebhookDelivery,
  getWebhookDeliveries,
};
