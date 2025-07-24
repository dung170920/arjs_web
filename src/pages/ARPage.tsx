import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import * as LocAR from 'locar';
import type { IData } from '../types';
import TiltCheck from '../components/TiltCheck';
import IconLink from '../assets/images/icon_link.svg?react';

const ARPage: React.FC<{ lat: number; lon: number }> = ({ lat, lon }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene>(new THREE.Scene());
  const [dataItems, setDataItems] = useState<IData[]>([]);
  const initialHeadingRef = useRef<number | null>(null);

  useEffect(() => {
    if (!containerRef.current || !headingRef.current) return;

    containerRef.current.querySelectorAll('canvas').forEach(canvas => canvas.remove());

    const scene = sceneRef.current;

    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.5, 500);
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
      },
    });

    const deviceOrientationControls = new LocAR.DeviceOrientationControls(camera);
    locar.fakeGps(lon, lat);

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const onClick = (event: MouseEvent) => {
      mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);

      const intersects = raycaster.intersectObjects(scene.children, true);
      if (intersects.length > 0) {
        const clicked = intersects[0].object;
        const url = clicked.userData?.url;
        if (url && typeof url === 'string') {
          window.open(url, '_blank');
        }
      }
    };
    window.addEventListener('click', onClick);

    renderer.setAnimationLoop(() => {
      deviceOrientationControls.update();

      const dir = new THREE.Vector3();
      camera.getWorldDirection(dir);

      const angleRad = Math.atan2(dir.x, dir.z);
      const angleDeg = (360 - THREE.MathUtils.radToDeg(angleRad)) % 360;

      if (initialHeadingRef.current === null) {
        initialHeadingRef.current = angleDeg;
      }

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

    return () => {
      renderer.dispose();
      containerRef.current?.querySelector('canvas')?.remove();
      window.removeEventListener('click', onClick);
    };
  }, [lat, lon]);

  useEffect(() => {
    const scene = sceneRef.current;
    if (initialHeadingRef.current === null) return;

    dataItems.forEach((item, index) => {
      const rad = THREE.MathUtils.degToRad(item.heading);
      const distanceMax = Math.max(...dataItems.map(i => i.distance));
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

      sprite.userData = { url: 'https://www.google.com/' };
      scene.add(sprite);
    });
  }, [dataItems]);

  return (
    <div ref={containerRef} className="h-screen w-screen" style={{ overflow: 'hidden', position: 'relative' }}>
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
          zIndex: 1,
        }}
      >
        0° - North
      </div>
      <TiltCheck />
      <a href="#" className="floating-btn">
        <IconLink />
      </a>
    </div>
  );
};

export default ARPage;
