import React, { useEffect, useState } from 'react';
import IconWarning from '../assets/images/icon_warning.png'

const TiltCheck: React.FC = () => {
  const [tiltMessage, setTiltMessage] = useState<string | null>(null);

  useEffect(() => {
    const handleOrientation = (event: DeviceOrientationEvent) => {
      const beta = event.beta ?? 0; // front-back tilt

      if (beta > 15) {
        setTiltMessage('You are tilting the phone too far upward');
      } else if (beta < -15) {
        setTiltMessage('You are tilting the phone too far downward');
      } else {
        setTiltMessage(null);
      }
    };

    window.addEventListener('deviceorientation', handleOrientation);

    return () => {
      window.removeEventListener('deviceorientation', handleOrientation);
    };
  }, []);

  return (
    <>
      {tiltMessage && (
        <div className="tilt-warning">
          <img src={IconWarning} alt="Warning" className="tilt-warning__icon" />
          <span>{tiltMessage}</span>
        </div>
      )}
    </>
  );
};

export default TiltCheck;
