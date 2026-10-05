import { useCallback, useEffect, useState } from 'react';
import { getErrorMessage } from '../lib/api';

type Loader<T> = (signal: AbortSignal) => Promise<T>;

// Keep the loader stable with useCallback. Ignore stale responses on key changes.
export function useAsyncResource<T>(load: Loader<T>) {
  const [version, setVersion] = useState(0);
  const [result, setResult] = useState<{
    load: Loader<T>; version: number; data?: T; error?: string;
  }>();

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal).then(
      (data) => {
        if (!controller.signal.aborted) setResult({ load, version, data });
      },
      (error: unknown) => {
        if (!controller.signal.aborted) setResult({ load, version, error: getErrorMessage(error) });
      },
    );
    return () => controller.abort();
  }, [load, version]);

  const reload = useCallback(() => setVersion((value) => value + 1), []);
  const current = result?.load === load;
  return {
    data: current ? result.data : undefined,
    error: current && result.version === version ? result.error : undefined,
    loading: !current || result.version !== version,
    reload,
  };
}