/**
 * Validation functions for webhook-related inputs
 */

/**
 * Available webhook event types
 */
const AVAILABLE_EVENTS = [
  'verification.success',
  'verification.failure',
  'agent.created',
  'agent.updated',
  'agent.deleted',
  'tier.upgraded',
  'tier.downgraded',
  'permissions.updated',
];

/**
 * Validate webhook creation input
 */
function validateWebhookCreation(data) {
  const errors = [];
  const { agent_id, url, events, description } = data;

  // Validate agent_id
  if (!agent_id) {
    errors.push({ field: 'agent_id', message: 'Agent ID is required' });
  } else if (typeof agent_id !== 'string') {
    errors.push({ field: 'agent_id', message: 'Agent ID must be a string' });
  }

  // Validate URL
  if (!url) {
    errors.push({ field: 'url', message: 'URL is required' });
  } else if (typeof url !== 'string') {
    errors.push({ field: 'url', message: 'URL must be a string' });
  } else {
    try {
      const parsedUrl = new URL(url);
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        errors.push({ field: 'url', message: 'URL must use HTTP or HTTPS protocol' });
      }
    } catch (err) {
      errors.push({ field: 'url', message: 'Invalid URL format' });
    }
  }

  // Validate events
  if (!events) {
    errors.push({ field: 'events', message: 'Events array is required' });
  } else if (!Array.isArray(events)) {
    errors.push({ field: 'events', message: 'Events must be an array' });
  } else if (events.length === 0) {
    errors.push({ field: 'events', message: 'At least one event is required' });
  } else if (events.length > 20) {
    errors.push({ field: 'events', message: 'Too many events (max 20)' });
  } else {
    // Check all events are valid
    for (const event of events) {
      if (typeof event !== 'string') {
        errors.push({ field: 'events', message: 'All events must be strings' });
        break;
      }
      if (!AVAILABLE_EVENTS.includes(event)) {
        errors.push({
          field: 'events',
          message: `Invalid event: ${event}`,
          available: AVAILABLE_EVENTS,
        });
        break;
      }
    }
  }

  // Validate description (optional)
  if (description !== undefined && description !== null) {
    if (typeof description !== 'string') {
      errors.push({ field: 'description', message: 'Description must be a string' });
    } else if (description.length > 500) {
      errors.push({ field: 'description', message: 'Description too long (max 500 characters)' });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate webhook update input
 */
function validateWebhookUpdate(data) {
  const errors = [];
  const { url, events, description, is_active } = data;

  // URL is optional in updates
  if (url !== undefined) {
    if (typeof url !== 'string') {
      errors.push({ field: 'url', message: 'URL must be a string' });
    } else {
      try {
        const parsedUrl = new URL(url);
        if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
          errors.push({ field: 'url', message: 'URL must use HTTP or HTTPS protocol' });
        }
      } catch (err) {
        errors.push({ field: 'url', message: 'Invalid URL format' });
      }
    }
  }

  // Events are optional in updates
  if (events !== undefined) {
    if (!Array.isArray(events)) {
      errors.push({ field: 'events', message: 'Events must be an array' });
    } else if (events.length === 0) {
      errors.push({ field: 'events', message: 'At least one event required' });
    } else if (events.length > 20) {
      errors.push({ field: 'events', message: 'Too many events (max 20)' });
    } else {
      for (const event of events) {
        if (!AVAILABLE_EVENTS.includes(event)) {
          errors.push({
            field: 'events',
            message: `Invalid event: ${event}`,
            available: AVAILABLE_EVENTS,
          });
          break;
        }
      }
    }
  }

  // Validate description (optional)
  if (description !== undefined && description !== null) {
    if (typeof description !== 'string') {
      errors.push({ field: 'description', message: 'Description must be a string' });
    } else if (description.length > 500) {
      errors.push({ field: 'description', message: 'Description too long (max 500 characters)' });
    }
  }

  // Validate is_active (optional)
  if (is_active !== undefined && typeof is_active !== 'boolean') {
    errors.push({ field: 'is_active', message: 'is_active must be a boolean' });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

module.exports = {
  AVAILABLE_EVENTS,
  validateWebhookCreation,
  validateWebhookUpdate,
};
