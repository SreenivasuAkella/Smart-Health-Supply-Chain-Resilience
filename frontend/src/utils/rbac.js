/**
 * Role-Based Access Control (RBAC) definitions and helpers for Sanjeevani AI.
 */

export const ROLES = {
  NATIONAL_DIRECTOR: 'NATIONAL_DIRECTOR',
  PHC_OFFICER: 'PHC_OFFICER',
  LOGISTICS_COORDINATOR: 'LOGISTICS_COORDINATOR',
  SURVEILLANCE_EPIDEMIOLOGIST: 'SURVEILLANCE_EPIDEMIOLOGIST',
};

export const ROLE_CONFIG = {
  NATIONAL_DIRECTOR: {
    title: 'National Director',
    badge: 'Supreme Clearance',
    level: 'Level 4 - Pan-India Apex',
    allowedTabs: [
      'overview', 
      'map', 
      'inventory', 
      'forecasting', 
      'coldchain', 
      'federated', 
      'simulation', 
      'vision', 
      'voice'
    ],
    defaultJurisdiction: 'All India Grid'
  },
  PHC_OFFICER: {
    title: 'PHC Medical Officer',
    badge: 'Clinical Clearance',
    level: 'Level 2 - District PHC Ops',
    allowedTabs: [
      'overview', 
      'map', 
      'inventory', 
      'coldchain', 
      'vision', 
      'voice'
    ],
    restrictedTabs: ['federated', 'simulation'],
    description: 'Authorized for local clinical drug stocks, cold chain, visual diagnostics, and clinical copilot.'
  },
  LOGISTICS_COORDINATOR: {
    title: 'Logistics Coordinator',
    badge: 'Fleet & Supply Clearance',
    level: 'Level 2 - Supply & Transit Ops',
    allowedTabs: [
      'overview', 
      'map', 
      'inventory', 
      'coldchain', 
      'simulation', 
      'voice'
    ],
    restrictedTabs: ['vision', 'federated'],
    description: 'Authorized for supply reallocation, crisis simulation drills, cold-chain telemetry, and field inventory.'
  },
  SURVEILLANCE_EPIDEMIOLOGIST: {
    title: 'Surveillance Epidemiologist',
    badge: 'Intel & Surveillance Clearance',
    level: 'Level 3 - Outbreak Intel Ops',
    allowedTabs: [
      'overview', 
      'map', 
      'forecasting', 
      'federated', 
      'voice'
    ],
    restrictedTabs: ['inventory', 'coldchain', 'simulation'],
    description: 'Authorized for epidemic outbreak time-series models, BigQuery analytics, and cross-state federated ML.'
  }
};

/**
 * Checks if a given role is allowed access to a tab.
 * Default role if none provided is NATIONAL_DIRECTOR.
 */
export function hasTabAccess(role, tabId) {
  if (!role) return true;
  const config = ROLE_CONFIG[role];
  if (!config) return true;
  return config.allowedTabs.includes(tabId);
}

/**
 * Returns formatted title for a role.
 */
export function getRoleTitle(role) {
  return ROLE_CONFIG[role]?.title || (role ? role.replace(/_/g, ' ') : 'Personnel');
}

/**
 * Returns formatted jurisdiction string for a user.
 */
export function getUserJurisdiction(user) {
  if (!user) return 'National Grid';
  if (user.role === ROLES.NATIONAL_DIRECTOR) return 'All India Grid';
  if (user.assigned_district && user.assigned_state) {
    return `${user.assigned_district}, ${user.assigned_state}`;
  }
  if (user.assigned_state) return user.assigned_state;
  return 'District Command';
}

/**
 * Returns list of roles that have access to a specific tab.
 */
export function getRequiredRolesForTab(tabId) {
  const roles = [];
  for (const [roleKey, cfg] of Object.entries(ROLE_CONFIG)) {
    if (cfg.allowedTabs && cfg.allowedTabs.includes(tabId)) {
      roles.push(roleKey);
    }
  }
  return roles.length > 0 ? roles : ['NATIONAL_DIRECTOR'];
}

/**
 * Checks if user or token has a specific scope.
 */
export function hasScope(user, requiredScope) {
  if (!user) return false;
  if (user.role === ROLES.NATIONAL_DIRECTOR) return true;
  if (Array.isArray(user.scopes)) {
    return user.scopes.includes(requiredScope) || user.scopes.includes('admin:all');
  }
  if (typeof user.scope === 'string') {
    const scopesList = user.scope.split(' ');
    return scopesList.includes(requiredScope) || scopesList.includes('admin:all');
  }
  return hasTabAccess(user.role, requiredScope);
}

