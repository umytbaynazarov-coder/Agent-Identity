const personaValidator = require('./personaValidator');

/**
 * Validation functions for agent-related inputs
 */

/**
 * Validate agent registration input
 */
async function validateRegistration(data) {
  const errors = [];
  const { name, owner_email, description, permissions, persona } = data;

  // Validate name
  if (!name) {
    errors.push({ field: 'name', message: 'Name is required' });
  } else if (typeof name !== 'string' || name.trim().length === 0) {
    errors.push({ field: 'name', message: 'Name must be a non-empty string' });
  } else if (name.length < 3 || name.length > 100) {
    errors.push({ field: 'name', message: 'Name must be between 3 and 100 characters' });
  }

  // Validate email
  if (!owner_email) {
    errors.push({ field: 'owner_email', message: 'Email is required' });
  } else {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(owner_email)) {
      errors.push({ field: 'owner_email', message: 'Invalid email format' });
    } else if (owner_email.length > 255) {
      errors.push({ field: 'owner_email', message: 'Email too long (max 255 characters)' });
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

  // Validate permissions (optional)
  if (permissions !== undefined && permissions !== null) {
    if (!Array.isArray(permissions)) {
      errors.push({ field: 'permissions', message: 'Permissions must be an array' });
    } else if (permissions.length === 0) {
      errors.push({ field: 'permissions', message: 'At least one permission required' });
    } else if (permissions.length > 50) {
      errors.push({ field: 'permissions', message: 'Too many permissions (max 50)' });
    } else {
      // Check all are strings
      for (const perm of permissions) {
        if (typeof perm !== 'string') {
          errors.push({ field: 'permissions', message: 'All permissions must be strings' });
          break;
        }
      }
    }
  }

  // Validate persona (optional — delegate to personaValidator)
  if (persona !== undefined && persona !== null) {
    const pResult = await personaValidator.validatePersona(persona);
    if (!pResult.valid) {
      errors.push(...pResult.errors);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate agent verification input
 */
function validateVerification(data) {
  const errors = [];
  const { agent_id, api_key } = data;

  if (!agent_id) {
    errors.push({ field: 'agent_id', message: 'Agent ID is required' });
  } else if (typeof agent_id !== 'string') {
    errors.push({ field: 'agent_id', message: 'Agent ID must be a string' });
  }

  if (!api_key) {
    errors.push({ field: 'api_key', message: 'API key is required' });
  } else if (typeof api_key !== 'string') {
    errors.push({ field: 'api_key', message: 'API key must be a string' });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate tier update
 */
function validateTierUpdate(tier) {
  const validTiers = ['free', 'pro', 'enterprise'];

  if (!tier) {
    return {
      valid: false,
      errors: [{ field: 'tier', message: 'Tier is required' }],
    };
  }

  if (!validTiers.includes(tier)) {
    return {
      valid: false,
      errors: [{ field: 'tier', message: `Invalid tier. Must be one of: ${validTiers.join(', ')}` }],
    };
  }

  return { valid: true, errors: [] };
}

/**
 * Validate status update
 */
function validateStatusUpdate(status) {
  const validStatuses = ['active', 'suspended', 'disabled'];

  if (!status) {
    return {
      valid: false,
      errors: [{ field: 'status', message: 'Status is required' }],
    };
  }

  if (!validStatuses.includes(status)) {
    return {
      valid: false,
      errors: [{ field: 'status', message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` }],
    };
  }

  return { valid: true, errors: [] };
}

/**
 * Validate permissions array
 */
function validatePermissions(permissions) {
  const errors = [];

  if (!Array.isArray(permissions)) {
    errors.push({ field: 'permissions', message: 'Permissions must be an array' });
    return { valid: false, errors };
  }

  if (permissions.length === 0) {
    errors.push({ field: 'permissions', message: 'At least one permission required' });
    return { valid: false, errors };
  }

  // Validate each permission format (service:resource:action)
  const permissionRegex = /^[a-z*]+:[a-z*]+:[a-z*]+$/i;

  for (const perm of permissions) {
    if (typeof perm !== 'string') {
      errors.push({ permission: perm, message: 'Permission must be a string' });
    } else if (!permissionRegex.test(perm)) {
      errors.push({ permission: perm, message: 'Invalid format. Use service:resource:action' });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

module.exports = {
  validateRegistration,
  validateVerification,
  validateTierUpdate,
  validateStatusUpdate,
  validatePermissions,
};
