import React, { useEffect, useState, useCallback } from 'react';
import ARPage from './pages/ARPage';
import ErrorPage from './pages/ErrorPage';
import { isARSupportedOnDevice, requestLocationPermission, getCurrentLocation } from './utils/checks';
import haversine from 'haversine';

const FIXED_COORDS = { latitude: 49.6045416, longitude: 8.8033684 };

const App: React.FC = () => {
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<string>('');
  const [latLon, setLatLon] = useState<{ lat: number; lon: number } | null>(null);

  const checkRequirements = useCallback(async () => {
    setState('loading');
    setError('');
    try {
      const ar = await isARSupportedOnDevice();
      if (!ar) throw new Error("Your device does not support AR.");

      const hasPermission = await requestLocationPermission();
      if (!hasPermission) throw new Error("Location permission denied.");

      const location = await getCurrentLocation();

      const distance = haversine(
        { latitude: location.lat, longitude: location.lon },
        FIXED_COORDS,
        { unit: 'meter' }
      );

      if (distance > 100) {
        throw new Error(`You are ${Math.round(distance)}m away. Move closer to use this experience.`);
      } else {
        setLatLon(location);
        setState('ready');
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      console.error(e);
      setError(e.message || 'Something went wrong');
      setState('error');
    }
  }, []);

  useEffect(() => {
    checkRequirements();
  }, [checkRequirements]);

  function onRetry() {
    checkRequirements();
  }

  function onClose() {
    setLatLon({ lat: FIXED_COORDS.latitude, lon: FIXED_COORDS.longitude });
    setError('');
    setState('ready');
  }

  if (state === 'loading') {
    return <div className='flex-centerc h-screen w-screen'>Loading, checking your device…</div>;
  }

  if (state === 'error') {
    return <ErrorPage message={error} onRetry={onRetry} onClose={onClose} />;
  }

  return latLon && <ARPage lat={latLon.lat} lon={latLon.lon} />;
};

export default App;
