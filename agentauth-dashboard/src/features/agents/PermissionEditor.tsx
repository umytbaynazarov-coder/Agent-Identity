import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { agentsApi } from '../../api/agents';
import { Button } from '../../components/common/Button';
import { XMarkIcon, PlusIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import type { Agent } from '../../types/agent';

interface PermissionEditorProps {
  agent: Agent;
  onSuccess?: () => void;
}

interface Permission {
  service: string;
  resource: string;
  action: string;
}

export function PermissionEditor({ agent, onSuccess }: PermissionEditorProps) {
  const queryClient = useQueryClient();
  const [permissions, setPermissions] = useState<string[]>(agent.permissions || []);
  const [newPermission, setNewPermission] = useState({
    service: '',
    resource: '',
    action: '',
  });

  // Fetch available permissions
  const { data: availablePermissions } = useQuery({
    queryKey: ['permissions'],
    queryFn: () => agentsApi.getAvailablePermissions(),
  });

  // Group permissions by service
  const groupedPermissions = useMemo(() => {
    if (!availablePermissions) return {};

    const groups: Record<string, Permission[]> = {};
    availablePermissions.forEach((perm: string) => {
      const [service, resource, action] = perm.split(':');
      if (!groups[service]) groups[service] = [];
      groups[service].push({ service, resource, action });
    });

    return groups;
  }, [availablePermissions]);

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: (newPermissions: string[]) =>
      agentsApi.updatePermissions(agent.agent_id, newPermissions),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
      toast.success('Permissions updated successfully');
      onSuccess?.();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update permissions');
    },
  });

  const addPermission = () => {
    const { service, resource, action } = newPermission;
    if (!service || !resource || !action) {
      toast.error('Please fill all fields');
      return;
    }

    const permString = `${service}:${resource}:${action}`;
    if (permissions.includes(permString)) {
      toast.error('Permission already exists');
      return;
    }

    if (permissions.length >= 50) {
      toast.error('Maximum 50 permissions allowed per agent');
      return;
    }

    setPermissions([...permissions, permString]);
    setNewPermission({ service: '', resource: '', action: '' });
  };

  const removePermission = (perm: string) => {
    setPermissions(permissions.filter((p) => p !== perm));
  };

  const handleSave = () => {
    if (permissions.length === 0) {
      toast.error('Agent must have at least one permission');
      return;
    }
    updateMutation.mutate(permissions);
  };

  const hasChanges = JSON.stringify(permissions.sort()) !== JSON.stringify([...(agent.permissions || [])].sort());

  return (
    <div className="space-y-6">
      {/* Current permissions list */}
      <div>
        <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
          Current Permissions ({permissions.length}/50)
        </h3>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {permissions.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No permissions assigned
            </p>
          ) : (
            permissions.map((perm) => (
              <div
                key={perm}
                className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded-lg"
              >
                <code className="text-sm text-gray-900 dark:text-white font-mono">
                  {perm}
                </code>
                <button
                  onClick={() => removePermission(perm)}
                  className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                >
                  <XMarkIcon className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Add new permission */}
      <div>
        <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
          Add New Permission
        </h3>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
              Service
            </label>
            <select
              value={newPermission.service}
              onChange={(e) =>
                setNewPermission({ ...newPermission, service: e.target.value })
              }
              className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="">Select...</option>
              <option value="*">* (All)</option>
              {Object.keys(groupedPermissions).map((service) => (
                <option key={service} value={service}>
                  {service}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
              Resource
            </label>
            <input
              type="text"
              value={newPermission.resource}
              onChange={(e) =>
                setNewPermission({ ...newPermission, resource: e.target.value })
              }
              placeholder="e.g., tickets or *"
              className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
              Action
            </label>
            <input
              type="text"
              value={newPermission.action}
              onChange={(e) =>
                setNewPermission({ ...newPermission, action: e.target.value })
              }
              placeholder="e.g., read or *"
              className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
        </div>

        <button
          onClick={addPermission}
          className="mt-3 flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg text-sm font-medium transition"
        >
          <PlusIcon className="w-4 h-4" />
          Add Permission
        </button>
      </div>

      {/* Quick add common permissions */}
      <div>
        <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
          Quick Add
        </h3>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setPermissions(['*:*:*'])}
            className="px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-lg text-xs font-medium hover:bg-purple-200 dark:hover:bg-purple-900/50 transition"
          >
            Admin (*:*:*)
          </button>
          {Object.keys(groupedPermissions).slice(0, 5).map((service) => (
            <button
              key={service}
              onClick={() => {
                const perm = `${service}:*:*`;
                if (!permissions.includes(perm)) {
                  setPermissions([...permissions, perm]);
                }
              }}
              className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg text-xs font-medium hover:bg-blue-200 dark:hover:bg-blue-900/50 transition"
            >
              {service}:*:*
            </button>
          ))}
        </div>
      </div>

      {/* Save button */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
        <Button
          variant="primary"
          onClick={handleSave}
          disabled={!hasChanges || updateMutation.isPending}
        >
          {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </div>
  );
}
