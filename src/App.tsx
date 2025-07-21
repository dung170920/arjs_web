import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import * as LocAR from 'locar';
import type { IData } from './types';

const App: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLDivElement>(null);
  const [dataItems, setDataItems] = useState<Array<IData>>([]);

  useEffect(() => {
    if (!containerRef.current || !headingRef.current) return;

    containerRef.current.querySelectorAll('canvas').forEach(canvas => canvas.remove());

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.001,
      100000
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

      // 🔄 Tính toán heading
      const dir = new THREE.Vector3();
      camera.getWorldDirection(dir);

      const angleRad = Math.atan2(dir.x, dir.z);
      let angleDeg = THREE.MathUtils.radToDeg(angleRad);

      angleDeg = (angleDeg + 360) % 360;
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
            console.warn("No initial GPS position determined.");
            alert("Unable to determine initial GPS position. Please move to an open area and enable GPS.");
            setTimeout(waitForPosition, 3000);
            return;
          }

          const lon = pos.coords.longitude;
          const lat = pos.coords.latitude;

          console.log("✅ Initial GPS position:", { lat, lon });

          locar.fakeGps(lon, lat);

          const boxProps: { latDis: number; lonDis: number; colour: number }[] = [
            { latDis: 0.002, lonDis: 0, colour: 0xff0000 },     // Bắc
            { latDis: -0.002, lonDis: 0, colour: 0xffff00 },    // Nam
            { latDis: 0, lonDis: -0.002, colour: 0x00ffff },    // Tây
            { latDis: 0, lonDis: 0.002, colour: 0x00ff00 }      // Đông
          ];

          const geom = new THREE.BoxGeometry(100, 100, 100);

          for (const boxProp of boxProps) {
            const mesh = new THREE.Mesh(
              geom,
              new THREE.MeshBasicMaterial({ color: boxProp.colour })
            );

            const boxLon = lon + boxProp.lonDis;
            const boxLat = lat + boxProp.latDis;

            locar.add(mesh, boxLon, boxLat);

            console.log(`🟥 Added box at lat: ${boxLat}, lon: ${boxLon}`, mesh);
          }
        },
        (err) => {
          console.error("GPS error:", err);
          if (err.code === 2) {
            alert("GPS Position update is unavailable. Please ensure GPS is enabled and move to an open area.");
          } else {
            alert(`GPS error: ${err.message}`);
          }
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
        const res = await fetch('https://gist.githubusercontent.com/dung170920/c2c0d752ae7f15258f8854d8fd6383fe/raw/ar.json');
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

  console.log(dataItems);

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
    </div>
  );
};

export default App;
