export type AppRole = 'admin' | 'sales' | 'engineering' | 'procurement' | 'execution' | 'client';

type LegacyRole = 'project_manager' | 'engineer' | 'qa_manager' | 'customer';

const validRoles: AppRole[] = ['admin', 'sales', 'engineering', 'procurement', 'execution', 'client'];

const roleAliasMap: Record<LegacyRole, AppRole> = {
  project_manager: 'sales',
  engineer: 'engineering',
  qa_manager: 'procurement',
  customer: 'client',
};

const normalizeRole = (value: unknown): AppRole | null => {
  if (typeof value !== 'string') return null;
  if (validRoles.includes(value as AppRole)) return value as AppRole;
  if (value in roleAliasMap) return roleAliasMap[value as LegacyRole];
  return null;
};

export const normalizeRoles = (roles: unknown[]): AppRole[] => {
  return [...new Set(roles.map(normalizeRole).filter((role): role is AppRole => role !== null))];
};

export const deriveRolesFromMetadata = (metadata: Record<string, unknown> | undefined): AppRole[] => {
  if (!metadata) return [];

  const metadataRoles: unknown[] = [];

  if (metadata.role) metadataRoles.push(metadata.role);

  if (Array.isArray(metadata.roles)) {
    metadataRoles.push(...metadata.roles);
  }

  return normalizeRoles(metadataRoles);
};

export const resolveRoleHomeRoute = (roles: AppRole[]): '/admin' | '/sales' | '/engineering' | '/procurement' | '/execution' | '/client' | '/' => {
  if (roles.includes('admin')) return '/admin';
  if (roles.includes('sales')) return '/sales';
  if (roles.includes('engineering')) return '/engineering';
  if (roles.includes('procurement')) return '/procurement';
  if (roles.includes('execution')) return '/execution';
  if (roles.includes('client')) return '/client';
  return '/';
};
