import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import * as LocAR from 'locar';

const App: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    containerRef.current.querySelectorAll('canvas').forEach(canvas => canvas.remove());

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.001, 1000);

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

    // Start render loop immediately
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

          console.log("Initial GPS position:", pos.coords);

          const boxProps: { latDis: number; lonDis: number; colour: number }[] = [
            {
              latDis: 0.001,
              lonDis: 0,
              colour: 0xff0000
            }, {
              latDis: -0.001,
              lonDis: 0,
              colour: 0xffff00
            }, {
              latDis: 0,
              lonDis: -0.001,
              colour: 0x00ffff
            }, {
              latDis: 0,
              lonDis: 0.001,
              colour: 0x00ff00
            }
          ];

          const geom = new THREE.BoxGeometry(20, 20, 20);

          for (const boxProp of boxProps) {
            const mesh = new THREE.Mesh(
              geom,
              new THREE.MeshBasicMaterial({ color: boxProp.colour })
            );

            const lon = pos.coords.longitude + boxProp.lonDis;
            const lat = pos.coords.latitude + boxProp.latDis;

            // locar.fakeGps(pos.coords.longitude, pos.coords.latitude);
            locar.startGps();
            locar.add(mesh, lon, lat);
            // console.log(mesh, lon, lat);
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
        }
      );
    };

    waitForPosition();

    return () => {
      renderer.dispose();
      containerRef.current?.querySelector('canvas')?.remove();
    };
  }, []);

  return <div ref={containerRef} style={{ width: '100vw', height: '100vh', overflow: 'hidden', position: 'relative' }} />;
};

export default App;

/*
✅ Fix:
- Start render loop immediately so camera feed is visible even if GPS is slow.
- GPS only adds boxes when available.
*/
