import { useEffect, useState } from 'react';

interface PerformanceMetrics {
  loadTime: number;
  renderTime: number;
  memoryUsage?: number;
}

export const PerformanceMonitor = ({ children }: { children: React.ReactNode }) => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    loadTime: 0,
    renderTime: 0,
  });

  useEffect(() => {
    const startTime = performance.now();
    
    // Mede tempo de carregamento
    const measureLoadTime = () => {
      const loadTime = performance.now() - startTime;
      setMetrics(prev => ({ ...prev, loadTime }));
    };

    // Mede uso de memória se disponível
    const measureMemory = () => {
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        setMetrics(prev => ({ 
          ...prev, 
          memoryUsage: Math.round(memory.usedJSHeapSize / 1048576) // MB
        }));
      }
    };

    // Mede tempo de renderização
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const renderEntry = entries.find(entry => entry.name === 'render');
      if (renderEntry) {
        setMetrics(prev => ({ 
          ...prev, 
          renderTime: Math.round(renderEntry.duration) 
        }));
      }
    });

    observer.observe({ entryTypes: ['measure'] });

    // Executa medições
    requestAnimationFrame(() => {
      measureLoadTime();
      measureMemory();
    });

    return () => {
      observer.disconnect();
    };
  }, []);

  // Log de performance em desenvolvimento
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('🚀 Performance Metrics:', metrics);
    }
  }, [metrics]);

  return <>{children}</>;
};
