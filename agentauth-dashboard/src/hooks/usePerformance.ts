import { useEffect } from 'react';

/**
 * Performance monitoring hook
 * Tracks Core Web Vitals and custom performance metrics
 */

interface PerformanceMetrics {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
}

/**
 * Report Web Vitals metrics
 */
function reportMetric(metric: PerformanceMetrics) {
  // Log to console in development
  if (import.meta.env.DEV) {
    console.log(`[Performance] ${metric.name}:`, metric.value, `(${metric.rating})`);
  }

  // Send to analytics in production
  if (import.meta.env.PROD && window.gtag) {
    window.gtag('event', metric.name, {
      value: Math.round(metric.value),
      metric_rating: metric.rating,
      non_interaction: true,
    });
  }

  // Send to Sentry
  if (window.Sentry) {
    window.Sentry.metrics.distribution(metric.name, metric.value, {
      tags: { rating: metric.rating },
      unit: 'millisecond',
    });
  }
}

/**
 * Get rating for Core Web Vitals
 */
function getRating(name: string, value: number): 'good' | 'needs-improvement' | 'poor' {
  switch (name) {
    case 'CLS': // Cumulative Layout Shift
      return value <= 0.1 ? 'good' : value <= 0.25 ? 'needs-improvement' : 'poor';
    case 'FID': // First Input Delay (deprecated)
    case 'INP': // Interaction to Next Paint
      return value <= 100 ? 'good' : value <= 300 ? 'needs-improvement' : 'poor';
    case 'LCP': // Largest Contentful Paint
      return value <= 2500 ? 'good' : value <= 4000 ? 'needs-improvement' : 'poor';
    case 'FCP': // First Contentful Paint
      return value <= 1800 ? 'good' : value <= 3000 ? 'needs-improvement' : 'poor';
    case 'TTFB': // Time to First Byte
      return value <= 800 ? 'good' : value <= 1800 ? 'needs-improvement' : 'poor';
    default:
      return 'good';
  }
}

/**
 * Hook to monitor Core Web Vitals
 */
export function usePerformanceMonitoring() {
  useEffect(() => {
    // Only run in browser
    if (typeof window === 'undefined') return;

    // Dynamic import of web-vitals library
    import('web-vitals').then(({ onCLS, onINP, onLCP, onFCP, onTTFB }) => {
      onCLS((metric: any) => {
        reportMetric({
          name: 'CLS',
          value: metric.value,
          rating: getRating('CLS', metric.value),
        });
      });

      onINP((metric: any) => {
        reportMetric({
          name: 'INP',
          value: metric.value,
          rating: getRating('INP', metric.value),
        });
      });

      onLCP((metric: any) => {
        reportMetric({
          name: 'LCP',
          value: metric.value,
          rating: getRating('LCP', metric.value),
        });
      });

      onFCP((metric: any) => {
        reportMetric({
          name: 'FCP',
          value: metric.value,
          rating: getRating('FCP', metric.value),
        });
      });

      onTTFB((metric: any) => {
        reportMetric({
          name: 'TTFB',
          value: metric.value,
          rating: getRating('TTFB', metric.value),
        });
      });
    }).catch(() => {
      // web-vitals not available
      console.warn('[Performance] web-vitals library not available');
    });
  }, []);
}

/**
 * Mark a custom performance measurement
 */
export function usePerformanceMark(name: string) {
  useEffect(() => {
    const startMark = `${name}-start`;
    const endMark = `${name}-end`;
    const measureName = name;

    // Mark start
    performance.mark(startMark);

    return () => {
      // Mark end and measure
      performance.mark(endMark);
      try {
        performance.measure(measureName, startMark, endMark);
        const measure = performance.getEntriesByName(measureName)[0];

        if (measure) {
          reportMetric({
            name: measureName,
            value: measure.duration,
            rating: measure.duration < 1000 ? 'good' : measure.duration < 3000 ? 'needs-improvement' : 'poor',
          });
        }

        // Cleanup
        performance.clearMarks(startMark);
        performance.clearMarks(endMark);
        performance.clearMeasures(measureName);
      } catch (error) {
        // Ignore errors
        console.warn('[Performance] Failed to measure:', name, error);
      }
    };
  }, [name]);
}

/**
 * Track component render time
 */
export function useRenderTracking(componentName: string) {
  useEffect(() => {
    const startTime = performance.now();
    return () => {
      const duration = performance.now() - startTime;
      if (import.meta.env.DEV) {
        console.log(`[Render] ${componentName}: ${duration.toFixed(2)}ms`);
      }
    };
  });
}

// Type declarations for global objects
declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
    Sentry?: any;
  }
}
