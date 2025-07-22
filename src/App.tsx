import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import * as LocAR from 'locar';
import type { IData } from './types';
import TiltCheck from './components/TiltCheck';

const App: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene>(new THREE.Scene());
  const [dataItems, setDataItems] = useState<IData[]>([]);
  const initialHeadingRef = useRef<number | null>(null);
  const spritesRef = useRef<{ sprite: THREE.Sprite; heading: number }[]>([]);

  useEffect(() => {
    if (!containerRef.current || !headingRef.current) return;

    containerRef.current.querySelectorAll('canvas').forEach(canvas => canvas.remove());

    const scene = sceneRef.current;

    const camera = new THREE.PerspectiveCamera(
      60, // realistic FOV
      window.innerWidth / window.innerHeight,
      0.5,
      500
    );

    const renderer = new THREE.WebGLRenderer({ alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    containerRef.current.appendChild(renderer.domElement);

    window.addEventListener('resize', () => {
      renderer.setSize(window.innerWidth, window.innerHeight);
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
    });

    const locar = new LocAR.LocationBased(scene, camera);

    new LocAR.Webcam({
      idealWidth: 1024,
      idealHeight: 768,
      onVideoStarted: (texture: THREE.Texture) => {
        scene.background = texture;
      }
    });

    const deviceOrientationControls = new LocAR.DeviceOrientationControls(camera);

    renderer.setAnimationLoop(() => {
      deviceOrientationControls.update();

      const dir = new THREE.Vector3();
      camera.getWorldDirection(dir);

      const angleRad = Math.atan2(dir.x, dir.z);
      const angleDeg = ((THREE.MathUtils.radToDeg(angleRad) + 360) % 360);

      if (initialHeadingRef.current === null) {
        initialHeadingRef.current = angleDeg;
      }

      // Update heading text
      let headingText = '';
      if (angleDeg < 22.5 || angleDeg >= 337.5) headingText = 'North';
      else if (angleDeg >= 22.5 && angleDeg < 67.5) headingText = 'Northeast';
      else if (angleDeg >= 67.5 && angleDeg < 112.5) headingText = 'East';
      else if (angleDeg >= 112.5 && angleDeg < 157.5) headingText = 'Southeast';
      else if (angleDeg >= 157.5 && angleDeg < 202.5) headingText = 'South';
      else if (angleDeg >= 202.5 && angleDeg < 247.5) headingText = 'Southwest';
      else if (angleDeg >= 247.5 && angleDeg < 292.5) headingText = 'West';
      else if (angleDeg >= 292.5 && angleDeg < 337.5) headingText = 'Northwest';

      headingRef.current!.innerText = `${Math.round(angleDeg)}° - ${headingText}`;

      // Filter FOV ±30°
      spritesRef.current.forEach(({ sprite, heading }) => {
        let delta = Math.abs(heading - angleDeg);
        if (delta > 180) delta = 360 - delta;

        sprite.visible = delta <= 30;
      });

      renderer.render(scene, camera);
    });

    const waitForPosition = () => {
      if (!navigator.geolocation) {
        alert("Geolocation API not available. Please use a supported browser.");
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (!pos.coords || (!pos.coords.latitude && !pos.coords.longitude)) {
            alert("Unable to determine GPS position. Please move to an open area.");
            setTimeout(waitForPosition, 3000);
            return;
          }

          const lon = pos.coords.longitude;
          const lat = pos.coords.latitude;

          locar.fakeGps(lon, lat);
        },
        (err) => {
          console.error("GPS error:", err);
          setTimeout(waitForPosition, 3000);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 1000
        }
      );
    };

    const fetchData = async () => {
      try {
        const res = await fetch(
          'https://gist.githubusercontent.com/dung170920/c2c0d752ae7f15258f8854d8fd6383fe/raw/ar.json'
        );
        const json = await res.json();
        setDataItems(json);
      } catch (err) {
        console.error('Error fetching JSON:', err);
      }
    };

    fetchData();
    waitForPosition();

    return () => {
      renderer.dispose();
      containerRef.current?.querySelector('canvas')?.remove();
    };
  }, []);

  useEffect(() => {
    const scene = sceneRef.current;

    if (initialHeadingRef.current === null) return;

    const baseHeading = initialHeadingRef.current;

    spritesRef.current = []; // clear old

    dataItems.forEach((item, index) => {
      const relativeHeading = (item.heading - baseHeading + 360) % 360;
      const rad = THREE.MathUtils.degToRad(relativeHeading);

      const distanceMax = Math.max(...dataItems.map(item => item.distance));
      const radiusMin = 200;
      const radiusMax = 500;
      const normalized = item.distance / distanceMax;
      const radius = radiusMin + normalized * (radiusMax - radiusMin);

      const x = radius * Math.sin(rad);
      const z = -radius * Math.cos(rad);
      const y = Math.sin(index * 0.5) * 40;

      const canvas = document.createElement('canvas');
      canvas.width = 1024;
      canvas.height = 256;
      const ctx = canvas.getContext('2d')!;

      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#fff';
      ctx.font = '80px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(item.label, canvas.width / 2, canvas.height / 2);

      const texture = new THREE.CanvasTexture(canvas);
      const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
      const sprite = new THREE.Sprite(spriteMaterial);
      sprite.scale.set(150, 40, 1);
      sprite.position.set(x, y, z);
      scene.add(sprite);

      spritesRef.current.push({ sprite, heading: relativeHeading });
    });
  }, [dataItems]);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        position: 'relative'
      }}
    >
      <div
        ref={headingRef}
        style={{
          position: 'absolute',
          top: 10,
          left: '50%',
          transform: 'translateX(-50%)',
          color: '#fff',
          background: 'rgba(0,0,0,0.5)',
          padding: '4px 8px',
          borderRadius: 4,
          fontSize: 14,
          zIndex: 1
        }}
      >
        0° - North
      </div>
      <TiltCheck />
    </div>
  );
};

export default App;
