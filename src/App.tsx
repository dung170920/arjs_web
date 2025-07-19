import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import * as LocAR from 'locar';

const App: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    containerRef.current.querySelectorAll('canvas').forEach(canvas => canvas.remove());

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.001,
      100000 // tăng far để không cắt box xa
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

          // ✅ Set fake GPS ONCE
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

    waitForPosition();

    return () => {
      renderer.dispose();
      containerRef.current?.querySelector('canvas')?.remove();
    };
  }, []);

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
        🔄 Di chuyển & xoay người để thấy đủ 4 box
      </div>
    </div>
  );
};

export default App;
