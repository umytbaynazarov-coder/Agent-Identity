import { NavLink } from 'react-router-dom';
import {
  HomeIcon,
  UserGroupIcon,
  ChartBarIcon,
  BellIcon,
  Cog6ToothIcon,
  IdentificationIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline';

const navigation = [
  { name: 'Agents', href: '/agents', icon: UserGroupIcon },
  { name: 'Persona', href: '/persona', icon: IdentificationIcon },
  { name: 'Anti-Drift', href: '/drift', icon: ShieldCheckIcon },
  { name: 'Activity', href: '/activity', icon: HomeIcon },
  { name: 'Webhooks', href: '/webhooks', icon: BellIcon },
  { name: 'Analytics', href: '/analytics', icon: ChartBarIcon },
  { name: 'Settings', href: '/settings', icon: Cog6ToothIcon },
];

export function Sidebar() {
  return (
    <div className="flex flex-col w-64 bg-gray-900 border-r border-gray-800">
      {/* Logo */}
      <div className="flex items-center h-16 px-6 border-b border-gray-800">
        <h1 className="text-xl font-bold text-white">AgentAuth</h1>
        <span className="ml-2 px-2 py-1 text-xs font-semibold text-gray-400 bg-gray-800 rounded">
          Admin
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-1">
        {navigation.map((item) => (
          <NavLink
            key={item.name}
            to={item.href}
            className={({ isActive }) =>
              `flex items-center px-4 py-3 text-sm font-medium rounded-lg transition ${
                isActive
                  ? 'bg-primary text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`
            }
          >
            <item.icon className="w-5 h-5 mr-3" />
            {item.name}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-800">
        <div className="px-4 py-3 bg-gray-800 rounded-lg">
          <p className="text-xs font-medium text-gray-400">Version</p>
          <p className="text-sm text-white">v1.0.0</p>
        </div>
      </div>
    </div>
  );
}
