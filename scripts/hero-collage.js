/**
 * Hero collage renderer for the getartcraft-website static mirror.
 *
 * Improvements:
 *   1. LAZY LOAD videos in batches (5 at a time) instead of all 35 upfront.
 *      Dramatically reduces initial load time.
 *   2. RENDER AS SOON AS FIRST BATCH IS READY - no waiting for all videos.
 *   3. LAYOUT MATCHES ORIGINAL: media positioned more toward bottom and sides,
 *      with some overlapping the center where the headline is.
 *   4. LETTER REVEAL ANIMATION: animate .wm-letter spans (the 8 letters of
 *      ARTCRAFT) with a smooth fade-in + slide-up + scale, staggered.
 *   5. SMOOTH FLOATING ANIMATION for video planes.
 */

(function () {
  'use strict';

  var canvas = document.querySelector('canvas[data-engine^="three.js"]');
  if (!canvas) {
    console.log('[hero-collage] No hero canvas on this page, skipping.');
    return;
  }

  var CDN_BASE = '/getartcraft-website/cdn-media/videos';
  var VIDEO_COUNT = 35;
  var BATCH_SIZE = 5;

  // === LETTER REVEAL ANIMATION ===
  function animateLetters() {
    var letters = document.querySelectorAll('.wm-letter');
    if (!letters.length) return;

    var style = document.createElement('style');
    style.textContent = [
      // Remove the inline opacity:1 by overriding with !important during animation
      '.wm-letter { opacity: 0 !important; }',
      '@keyframes heroLetterReveal {',
      '  0% { opacity: 0 !important; transform: translateY(60px) scale(0.7) rotate(-5deg); }',
      '  50% { opacity: 0.6 !important; transform: translateY(-8px) scale(1.05) rotate(2deg); }',
      '  100% { opacity: 1 !important; transform: translateY(0) scale(1) rotate(0deg); }',
      '}',
      '.wm-letter {',
      '  animation: heroLetterReveal 1.4s cubic-bezier(0.34, 1.56, 0.64, 1) both;',
      '}',
    ].join('\n');
    document.head.appendChild(style);

    // Stagger the animation per-letter (longer delays for more visible effect)
    letters.forEach(function (letter, i) {
      letter.style.animationDelay = (i * 150) + 'ms';
    });
    console.log('[hero-collage] Animating', letters.length, 'letters with stagger');
  }

  // === HERO SECTION CONTENT REVEAL ===
  function animateHeroContent() {
    var style = document.createElement('style');
    style.textContent = [
      '@keyframes heroContentReveal {',
      '  0% { opacity: 0; transform: translateY(30px); }',
      '  100% { opacity: 1; transform: translateY(0); }',
      '}',
      '#hero h1, #hero h2,',
      '#hero [data-reveal-group] > *,',
      '#hero [data-reveal],',
      '#hero [data-cta],',
      '#hero .pointer-events-auto > * {',
      '  animation: heroContentReveal 1.2s cubic-bezier(0.22, 1, 0.36, 1) both;',
      '  animation-delay: 0.8s;',
      '}',
      // Background pattern (concentric circles) - fade in slowly
      '@keyframes heroBgFadeIn {',
      '  0% { opacity: 0; }',
      '  100% { opacity: 1; }',
      '}',
      '#hero [aria-hidden="true"] {',
      '  animation: heroBgFadeIn 2s ease-out both;',
      '}',
    ].join('\n');
    document.head.appendChild(style);
  }

  function pad3(n) { return String(n).padStart(3, '0'); }

  function loadThree() {
    if (typeof window.THREE !== 'undefined') {
      return Promise.resolve(window.THREE);
    }
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/three@0.150.0/build/three.min.js';
      s.onload = function () {
        if (window.THREE) resolve(window.THREE);
        else reject(new Error('THREE failed to load as global'));
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

      var resolved = false;
      function done(result) {
        if (!resolved) { resolved = true; resolve(result); }
      }

      video.addEventListener('loadeddata', function () {
        var texture = new THREE.VideoTexture(video);
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.colorSpace = THREE.SRGBColorSpace;
        video.play().catch(function () {});
        done({ texture: texture, video: video, idx: idx });
      });
      video.addEventListener('error', function () {
        console.warn('[hero-collage] Failed to load video', idx);
        done(null);
      });
      setTimeout(function () { done(null); }, 15000);
    });
  }

  // Layout: arrange videos with emphasis on bottom and sides, some overlapping center
  function calculatePosition(idx, total) {
    var angle = (idx / total) * Math.PI * 2 + (idx * 0.7);

    var seed = idx * 9301 + 49297;
    var rnd = function (n) {
      seed = (seed * 9301 + 49297) % 233280;
      return (seed / 233280) * n - n / 2;
    };

    // Three rings: close (overlaps text), medium, far
    var ring = idx % 3;
    var radius;
    if (ring === 0) radius = 3.0 + rnd(0.8);
    else if (ring === 1) radius = 5.5 + rnd(1.0);
    else radius = 7.5 + rnd(1.2);

    var x = Math.cos(angle) * radius + rnd(0.5);
    // Bias Y downward so more videos at bottom
    var yBias = 0.5 + Math.sin(angle) * 0.7;
    var y = Math.sin(angle) * radius * 0.5 + yBias + rnd(0.5);
    var z = rnd(2.5);
    var rotZ = rnd(Math.PI / 4);

    return { x: x, y: y, z: z, rotZ: rotZ };
  }

  function start() {
    loadThree().then(function (THREE) {
      console.log('[hero-collage] THREE loaded, version:', THREE.REVISION);

      var renderer = new THREE.WebGLRenderer({
        canvas: canvas, antialias: true, alpha: true,
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
      renderer.setClearColor(0x000000, 0);

      var scene = new THREE.Scene();
      var camera = new THREE.PerspectiveCamera(50, canvas.clientWidth / canvas.clientHeight, 0.1, 100);
      camera.position.z = 10;

      var group = new THREE.Group();
      scene.add(group);

      var clock = new THREE.Clock();
      var meshData = [];

      function addVideoToScene(textureInfo) {
        var aspectRatio = 16 / 9;
        var planeHeight = 1.6;
        var planeWidth = planeHeight * aspectRatio;

        var geom = new THREE.PlaneGeometry(planeWidth, planeHeight);
        var mat = new THREE.MeshBasicMaterial({
          map: textureInfo.texture,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.95,
        });
        var mesh = new THREE.Mesh(geom, mat);

        var pos = calculatePosition(textureInfo.idx - 1, VIDEO_COUNT);
        mesh.position.set(pos.x, pos.y, pos.z);
        mesh.rotation.z = pos.rotZ;

        var data = {
          mesh: mesh,
          baseX: pos.x, baseY: pos.y, baseZ: pos.z,
          baseRotZ: pos.rotZ,
          phase: textureInfo.idx * 0.4,
          floatAmp: 0.08 + Math.abs(Math.sin(textureInfo.idx)) * 0.07,
          rotAmp: 0.04 + Math.abs(Math.cos(textureInfo.idx)) * 0.04,
        };
        meshData.push(data);
        group.add(mesh);
      }

      // Animation loop - starts immediately
      function animate() {
        requestAnimationFrame(animate);
        var t = clock.getElapsedTime();

        group.rotation.y = Math.sin(t * 0.08) * 0.08;
        group.rotation.x = Math.cos(t * 0.05) * 0.04;

        meshData.forEach(function (d) {
          d.mesh.position.x = d.baseX + Math.sin(t * 0.4 + d.phase) * d.floatAmp;
          d.mesh.position.y = d.baseY + Math.cos(t * 0.5 + d.phase) * d.floatAmp;
          d.mesh.position.z = d.baseZ + Math.sin(t * 0.3 + d.phase) * d.floatAmp * 0.5;
          d.mesh.rotation.z = d.baseRotZ + Math.sin(t * 0.25 + d.phase) * d.rotAmp;
        });

        renderer.render(scene, camera);
      }
      animate();

      // Load videos in batches
      function loadBatch(batchStart) {
        var batchEnd = Math.min(batchStart + BATCH_SIZE, VIDEO_COUNT);
        var promises = [];
        for (var i = batchStart + 1; i <= batchEnd; i++) {
          var url = CDN_BASE + '/' + pad3(i) + '.mp4';
          promises.push(createVideoTexture(THREE, url, i));
        }
        return Promise.all(promises).then(function (results) {
          var textures = results.filter(Boolean);
          textures.forEach(function (t) { addVideoToScene(t); });
          console.log('[hero-collage] Batch loaded:',
                      textures.length, 'videos. Total in scene:', meshData.length);
        });
      }

      // Load all batches in parallel (browser handles connection limits)
      for (var b = 0; b < Math.ceil(VIDEO_COUNT / BATCH_SIZE); b++) {
        loadBatch(b * BATCH_SIZE);
      }

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
    }).catch(function (err) {
      console.error('[hero-collage] Error:', err);
    });
  }

  // Run CSS animations immediately (no dependencies)
  animateLetters();
  animateHeroContent();

  // Start the collage script
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      setTimeout(start, 300);
    });
  } else {
    setTimeout(start, 300);
  }
})();
