import { Fragment } from 'react';
import { Menu, Transition } from '@headlessui/react';
import { useNavigate } from 'react-router-dom';
import {
  UserCircleIcon,
  ArrowRightOnRectangleIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../../features/auth/useAuth';

export function Header() {
  const navigate = useNavigate();
  const { agent, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-6">
      {/* Page title or breadcrumbs can go here */}
      <div className="flex-1">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Dashboard
        </h2>
      </div>

      {/* User menu */}
      <div className="flex items-center space-x-4">
        <Menu as="div" className="relative">
          <Menu.Button className="flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition">
            <UserCircleIcon className="w-8 h-8 text-gray-600 dark:text-gray-400" />
            <div className="text-left">
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {agent?.name || 'Admin'}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                {agent?.tier || 'Free'} Tier
              </p>
            </div>
          </Menu.Button>

          <Transition
            as={Fragment}
            enter="transition ease-out duration-100"
            enterFrom="transform opacity-0 scale-95"
            enterTo="transform opacity-100 scale-100"
            leave="transition ease-in duration-75"
            leaveFrom="transform opacity-100 scale-100"
            leaveTo="transform opacity-0 scale-95"
          >
            <Menu.Items className="absolute right-0 mt-2 w-56 origin-top-right rounded-lg bg-white dark:bg-gray-800 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none border border-gray-200 dark:border-gray-700">
              <div className="p-2">
                <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700 mb-2">
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                    Agent ID
                  </p>
                  <p className="text-sm font-mono text-gray-900 dark:text-white truncate">
                    {agent?.agent_id}
                  </p>
                </div>

                <Menu.Item>
                  {({ active }) => (
                    <button
                      onClick={() => navigate('/settings')}
                      className={`${
                        active ? 'bg-gray-100 dark:bg-gray-700' : ''
                      } group flex w-full items-center rounded-md px-3 py-2 text-sm text-gray-900 dark:text-gray-100`}
                    >
                      <Cog6ToothIcon className="mr-3 h-5 w-5" />
                      Settings
                    </button>
                  )}
                </Menu.Item>

                <Menu.Item>
                  {({ active }) => (
                    <button
                      onClick={handleLogout}
                      className={`${
                        active ? 'bg-gray-100 dark:bg-gray-700' : ''
                      } group flex w-full items-center rounded-md px-3 py-2 text-sm text-red-600 dark:text-red-400`}
                    >
                      <ArrowRightOnRectangleIcon className="mr-3 h-5 w-5" />
                      Sign out
                    </button>
                  )}
                </Menu.Item>
              </div>
            </Menu.Items>
          </Transition>
        </Menu>
      </div>
    </header>
  );
}
