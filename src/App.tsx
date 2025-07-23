import React, { useEffect, useState } from 'react';
import ARPage from './pages/ARPage';
import ErrorPage from './pages/ErrorPage';
import { isARSupportedOnDevice, requestLocationPermission, getCurrentLocation } from './utils/checks';
import haversine from 'haversine';

const FIXED_COORDS = { latitude: 49.6045416, longitude: 8.8033684 };

const App: React.FC = () => {
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<string>('');
  const [latLon, setLatLon] = useState<{ lat: number; lon: number } | null>(null);

  useEffect(() => {
    const checkRequirements = async () => {
      try {
        const ar = await isARSupportedOnDevice();
        if (!ar) throw new Error("Your device does not support AR.");

        const hasPermission = await requestLocationPermission();
        if (!hasPermission) throw new Error("Location permission denied.");

        const location = await getCurrentLocation();

        const distance = haversine(location, FIXED_COORDS, { unit: 'meter' });
        if (distance > 100) {
          throw new Error(`You are ${Math.round(distance)}m away. Move closer to use this experience.`);
        }

        setLatLon(location);

        setState('ready');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (e: any) {
        console.log(e);
        setError(e.message || 'Something went wrong');
        setState('error');
      }
    };

    checkRequirements();
  }, []);

  function onRetry() {
    setState('ready');
    setError('');
  }

  function onClose() {
    setState('ready');
    setError('');
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
