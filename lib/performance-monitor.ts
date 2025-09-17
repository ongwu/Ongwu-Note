// 性能监控工具
class PerformanceMonitor {
  private timers = new Map<string, number>();

  start(label: string) {
    this.timers.set(label, Date.now());
  }

  end(label: string): number {
    const startTime = this.timers.get(label);
    if (!startTime) {
      console.warn(`Performance monitor: No start time found for "${label}"`);
      return 0;
    }
    
    const duration = Date.now() - startTime;
    this.timers.delete(label);
    
    if (duration > 100) { // 只记录超过100ms的操作
      console.log(`⏱️ Performance: ${label} took ${duration}ms`);
    }
    
    return duration;
  }

  async measure<T>(label: string, fn: () => Promise<T>): Promise<T> {
    this.start(label);
    try {
      const result = await fn();
      this.end(label);
      return result;
    } catch (error) {
      this.end(label);
      throw error;
    }
  }

  measureSync<T>(label: string, fn: () => T): T {
    this.start(label);
    try {
      const result = fn();
      this.end(label);
      return result;
    } catch (error) {
      this.end(label);
      throw error;
    }
  }
}

export const perfMonitor = new PerformanceMonitor();
