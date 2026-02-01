import { lazy, type ComponentType } from 'react';

/**
 * Enhanced lazy loading with preload capability
 *
 * Usage:
 * const Component = lazyWithPreload(() => import('./Component'));
 * Component.preload(); // Preload on hover or route change
 */
export function lazyWithPreload<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>
) {
  const Component = lazy(factory);
  let factoryPromise: Promise<{ default: T }> | undefined;

  const LazyComponent = Component as typeof Component & {
    preload: () => Promise<{ default: T }>;
  };

  LazyComponent.preload = () => {
    if (!factoryPromise) {
      factoryPromise = factory();
    }
    return factoryPromise;
  };

  return LazyComponent;
}
