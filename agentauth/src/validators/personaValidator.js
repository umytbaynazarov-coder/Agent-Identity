const fs = require('fs');
const path = require('path');
const semver = require('semver');

const TRAITS_PATH = path.join(__dirname, '../../config/persona-traits.json');
const MAX_PERSONA_SIZE = 10 * 1024; // 10KB

let cachedTraits = null;

/**
 * Load allowed traits from config (async, cached after first load)
 */
async function loadAllowedTraits() {
  if (cachedTraits) return cachedTraits;
  const raw = await fs.promises.readFile(TRAITS_PATH, 'utf-8');
  cachedTraits = JSON.parse(raw);
  return cachedTraits;
}

/**
 * Validate a persona object
 */
async function validatePersona(persona) {
  const errors = [];

  if (!persona || typeof persona !== 'object' || Array.isArray(persona)) {
    errors.push({ field: 'persona', message: 'Persona must be a non-null object' });
    return { valid: false, errors };
  }

  // Size check (serialize to measure)
  const serialized = JSON.stringify(persona);
  if (Buffer.byteLength(serialized, 'utf-8') > MAX_PERSONA_SIZE) {
    return {
      valid: false,
      errors: [{ field: 'persona', message: 'Persona exceeds maximum size of 10KB' }],
      statusCode: 413,
    };
  }

  // version — required, must be valid semver
  if (!persona.version) {
    errors.push({ field: 'version', message: 'Version is required' });
  } else if (typeof persona.version !== 'string' || !semver.valid(persona.version)) {
    errors.push({ field: 'version', message: 'Version must be a valid semver string (e.g. "1.0.0")' });
  }

  // personality — optional
  if (persona.personality !== undefined) {
    const pErrors = await validatePersonality(persona.personality);
    errors.push(...pErrors);
  }

  // constraints — optional
  if (persona.constraints !== undefined) {
    const cErrors = validateConstraints(persona.constraints);
    errors.push(...cErrors);
  }

  // guardrails — optional
  if (persona.guardrails !== undefined) {
    const gErrors = validateGuardrails(persona.guardrails);
    errors.push(...gErrors);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate personality block
 */
async function validatePersonality(personality) {
  const errors = [];

  if (typeof personality !== 'object' || Array.isArray(personality) || personality === null) {
    errors.push({ field: 'personality', message: 'Personality must be an object' });
    return errors;
  }

  const allowedTraits = await loadAllowedTraits();

  // Validate numeric traits (values 0-1)
  if (personality.traits !== undefined) {
    if (typeof personality.traits !== 'object' || Array.isArray(personality.traits) || personality.traits === null) {
      errors.push({ field: 'personality.traits', message: 'Traits must be an object' });
    } else {
      for (const [key, value] of Object.entries(personality.traits)) {
        if (typeof value === 'number') {
          if (value < 0 || value > 1) {
            errors.push({ field: `personality.traits.${key}`, message: `Numeric trait "${key}" must be between 0 and 1` });
          }
        } else if (typeof value === 'string') {
          if (!allowedTraits.includes(value.toLowerCase())) {
            errors.push({ field: `personality.traits.${key}`, message: `String trait value "${value}" is not in the allowed trait list` });
          }
        } else {
          errors.push({ field: `personality.traits.${key}`, message: `Trait "${key}" must be a number (0-1) or an allowed string` });
        }
      }
    }
  }

  // Validate assistantAxis — array of neural steering vectors
  if (personality.assistantAxis !== undefined) {
    if (!Array.isArray(personality.assistantAxis)) {
      errors.push({ field: 'personality.assistantAxis', message: 'assistantAxis must be an array' });
    } else {
      for (let i = 0; i < personality.assistantAxis.length; i++) {
        const axis = personality.assistantAxis[i];
        if (typeof axis !== 'object' || axis === null) {
          errors.push({ field: `personality.assistantAxis[${i}]`, message: 'Each axis entry must be an object' });
        }
      }
    }
  }

  // Validate neuralVectors — object for broader LLM compatibility
  if (personality.neuralVectors !== undefined) {
    if (typeof personality.neuralVectors !== 'object' || Array.isArray(personality.neuralVectors) || personality.neuralVectors === null) {
      errors.push({ field: 'personality.neuralVectors', message: 'neuralVectors must be an object' });
    }
  }

  return errors;
}

/**
 * Validate constraints block
 */
function validateConstraints(constraints) {
  const errors = [];

  if (typeof constraints !== 'object' || Array.isArray(constraints) || constraints === null) {
    errors.push({ field: 'constraints', message: 'Constraints must be an object' });
    return errors;
  }

  if (constraints.max_response_length !== undefined) {
    if (typeof constraints.max_response_length !== 'number' || constraints.max_response_length <= 0) {
      errors.push({ field: 'constraints.max_response_length', message: 'max_response_length must be a positive number' });
    }
  }

  if (constraints.forbidden_topics !== undefined) {
    if (!Array.isArray(constraints.forbidden_topics)) {
      errors.push({ field: 'constraints.forbidden_topics', message: 'forbidden_topics must be an array' });
    } else {
      for (const topic of constraints.forbidden_topics) {
        if (typeof topic !== 'string') {
          errors.push({ field: 'constraints.forbidden_topics', message: 'All forbidden_topics must be strings' });
          break;
        }
      }
    }
  }

  if (constraints.required_disclaimers !== undefined) {
    if (!Array.isArray(constraints.required_disclaimers)) {
      errors.push({ field: 'constraints.required_disclaimers', message: 'required_disclaimers must be an array' });
    } else {
      for (const d of constraints.required_disclaimers) {
        if (typeof d !== 'string') {
          errors.push({ field: 'constraints.required_disclaimers', message: 'All required_disclaimers must be strings' });
          break;
        }
      }
    }
  }

  if (constraints.allowed_actions !== undefined) {
    if (!Array.isArray(constraints.allowed_actions)) {
      errors.push({ field: 'constraints.allowed_actions', message: 'allowed_actions must be an array' });
    } else {
      for (const a of constraints.allowed_actions) {
        if (typeof a !== 'string') {
          errors.push({ field: 'constraints.allowed_actions', message: 'All allowed_actions must be strings' });
          break;
        }
      }
    }
  }

  if (constraints.blocked_actions !== undefined) {
    if (!Array.isArray(constraints.blocked_actions)) {
      errors.push({ field: 'constraints.blocked_actions', message: 'blocked_actions must be an array' });
    } else {
      for (const a of constraints.blocked_actions) {
        if (typeof a !== 'string') {
          errors.push({ field: 'constraints.blocked_actions', message: 'All blocked_actions must be strings' });
          break;
        }
      }
    }
  }

  return errors;
}

/**
 * Validate guardrails block
 */
function validateGuardrails(guardrails) {
  const errors = [];

  if (typeof guardrails !== 'object' || Array.isArray(guardrails) || guardrails === null) {
    errors.push({ field: 'guardrails', message: 'Guardrails must be an object' });
    return errors;
  }

  if (guardrails.toxicity_threshold !== undefined) {
    if (typeof guardrails.toxicity_threshold !== 'number' || guardrails.toxicity_threshold < 0 || guardrails.toxicity_threshold > 1) {
      errors.push({ field: 'guardrails.toxicity_threshold', message: 'toxicity_threshold must be a number between 0 and 1' });
    }
  }

  const validHallucinationLevels = ['strict', 'moderate', 'lenient'];
  if (guardrails.hallucination_tolerance !== undefined) {
    if (!validHallucinationLevels.includes(guardrails.hallucination_tolerance)) {
      errors.push({ field: 'guardrails.hallucination_tolerance', message: `hallucination_tolerance must be one of: ${validHallucinationLevels.join(', ')}` });
    }
  }

  if (guardrails.source_citation_required !== undefined) {
    if (typeof guardrails.source_citation_required !== 'boolean') {
      errors.push({ field: 'guardrails.source_citation_required', message: 'source_citation_required must be a boolean' });
    }
  }

  return errors;
}

module.exports = {
  validatePersona,
  loadAllowedTraits,
};
