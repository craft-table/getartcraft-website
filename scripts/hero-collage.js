/**
 * Hero collage renderer for the getartcraft-website static mirror.
 *
 * The original site uses React + Three.js to render a collage of 35 short
 * videos arranged in a scattered pattern around the ARTCRAFT headline.
 * React hydration doesn't run on the static mirror, so we provide a
 * standalone script that:
 *   1. Finds the canvas element with data-engine="three.js"
 *   2. Loads the 35 videos directly from the original CDN
 *      (https://getartcraft.com/cdn-media/videos/001.mp4 - 035.mp4)
 *   3. Renders them as a Three.js scene with a scattered arrangement
 *      similar to the original
 *
 * Loaded as a regular script (no React dependency).
 */

(function () {
  'use strict';

  // Only run on the homepage (where the hero canvas exists)
  var canvas = document.querySelector('canvas[data-engine^="three.js"]');
  if (!canvas) {
    console.log('[hero-collage] No hero canvas on this page, skipping.');
    return;
  }

  // The CDN base URL — load videos directly from the original site
  var CDN_BASE = 'https://getartcraft.com/cdn-media/videos';
  var VIDEO_COUNT = 35;

  function pad3(n) {
    return String(n).padStart(3, '0');
  }

  function loadThree() {
    // Check if THREE is already loaded (it might be from the original chunks)
    if (typeof window.THREE !== 'undefined') {
      return Promise.resolve(window.THREE);
    }
    // Otherwise, load Three.js (r150 UMD build exposes THREE as window.THREE)
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/three@0.150.0/build/three.min.js';
      s.onload = function () {
        if (window.THREE) {
          resolve(window.THREE);
        } else {
          reject(new Error('THREE failed to load as global'));
        }
      };
      s.onerror = function () { reject(new Error('Failed to load Three.js')); };
      document.head.appendChild(s);
    });
  }

  function createVideoTexture(THREE, url, idx) {
    return new Promise(function (resolve) {
      var video = document.createElement('video');
      video.crossOrigin = 'anonymous';
      video.src = url;
      video.muted = true;
      video.loop = true;
      video.playsInline = true;
      video.preload = 'auto';
      video.setAttribute('aria-hidden', 'true');

      video.addEventListener('loadeddata', function () {
        var texture = new THREE.VideoTexture(video);
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.colorSpace = THREE.SRGBColorSpace;
        video.play().catch(function () {});
        resolve({ texture: texture, video: video, idx: idx });
      });
      video.addEventListener('error', function () {
        console.warn('[hero-collage] Failed to load video', idx, url);
        resolve(null);
      });
    });
  }

  function start() {
    loadThree().then(function (THREE) {
      console.log('[hero-collage] THREE loaded, version:', THREE.REVISION);

      // Set up the renderer on the existing canvas
      var renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        antialias: true,
        alpha: true,
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);

      var scene = new THREE.Scene();
      var camera = new THREE.PerspectiveCamera(50, canvas.clientWidth / canvas.clientHeight, 0.1, 100);
      camera.position.z = 10;

      // Load all 35 videos
      var promises = [];
      for (var i = 1; i <= VIDEO_COUNT; i++) {
        var url = CDN_BASE + '/' + pad3(i) + '.mp4';
        promises.push(createVideoTexture(THREE, url, i));
      }

      Promise.all(promises).then(function (results) {
        var textures = results.filter(Boolean);
        console.log('[hero-collage] Loaded ' + textures.length + ' video textures');

        if (textures.length === 0) {
          console.warn('[hero-collage] No video textures loaded, aborting');
          return;
        }

        // Create a plane for each video, scattered around the center
        var group = new THREE.Group();
        scene.add(group);

        var aspectRatio = 16 / 9;
        var planeHeight = 1.6;
        var planeWidth = planeHeight * aspectRatio;

        textures.forEach(function (t, i) {
            var geom = new THREE.PlaneGeometry(planeWidth, planeHeight);
            var mat = new THREE.MeshBasicMaterial({
              map: t.texture,
              side: THREE.DoubleSide,
              transparent: true,
              opacity: 0.95,
            });
            var mesh = new THREE.Mesh(geom, mat);

            // Arrange in a scattered circular pattern
            var angle = (i / textures.length) * Math.PI * 2;
            // Add some randomness based on idx
            var seed = t.idx * 9301 + 49297;
            var rnd = function (n) {
              seed = (seed * 9301 + 49297) % 233280;
              return (seed / 233280) * n - n / 2;
            };

            var radius = 5 + rnd(1.5);
            var x = Math.cos(angle) * radius + rnd(0.8);
            var y = Math.sin(angle) * radius * 0.55 + rnd(0.8); // flatten y
            var z = rnd(2);

            mesh.position.set(x, y, z);
            mesh.rotation.z = rnd(Math.PI / 3);
            mesh.userData = {
              baseX: x, baseY: y, baseZ: z,
              baseRotZ: mesh.rotation.z,
              phase: i * 0.4,
              floatAmp: 0.1 + Math.abs(rnd(0.05)),
              rotAmp: 0.05 + Math.abs(rnd(0.03)),
            };
            group.add(mesh);
        });

        // Center the group
        group.position.y = 0;

        // Animate
        var clock = new THREE.Clock();
        function animate() {
          requestAnimationFrame(animate);
          var t = clock.getElapsedTime();

          // Slowly rotate the whole group
          group.rotation.y = Math.sin(t * 0.1) * 0.1;

          // Float each plane
          group.children.forEach(function (mesh) {
            var d = mesh.userData;
            mesh.position.x = d.baseX + Math.sin(t * 0.5 + d.phase) * d.floatAmp;
            mesh.position.y = d.baseY + Math.cos(t * 0.6 + d.phase) * d.floatAmp;
            mesh.rotation.z = d.baseRotZ + Math.sin(t * 0.3 + d.phase) * d.rotAmp;
          });

          renderer.render(scene, camera);
        }
        animate();

        // Handle resize
        function onResize() {
          var w = canvas.clientWidth;
          var h = canvas.clientHeight;
          if (canvas.width !== w || canvas.height !== h) {
            renderer.setSize(w, h, false);
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
          }
        }
        window.addEventListener('resize', onResize);
        onResize();
      });
    }).catch(function (err) {
      console.error('[hero-collage] Error:', err);
    });
  }

  // Wait for the page to finish loading
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      // Give the rest of the page a moment to render
      setTimeout(start, 500);
    });
  } else {
    setTimeout(start, 500);
  }
})();
