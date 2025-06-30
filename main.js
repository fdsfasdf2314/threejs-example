import Hyperbeam from "@hyperbeam/web";

(async () => {
  let embedURL = ""; // Set your Hyperbeam embed URL here for local testing
  if (embedURL === "") {
    const room = location.pathname.substring(1);
    const req = await fetch("https://demo-api.tutturu.workers.dev/" + room);
    if (req.status >= 400) {
      alert("We are out of demo servers! Visit hyperbeam.dev to get your own API key");
      return;
    }
    const body = await req.json();
    if (body.room !== room) {
      history.replaceState(null, null, "/" + body.room + location.search);
    }
    embedURL = body.url;
  }
  main(embedURL);
})();

async function main(embedURL) {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.0001, 100);
  camera.position.set(0, 0, 1); // Position camera to view the VM plane

  const texture = new THREE.Texture();
  texture.flipY = false;
  texture.generateMipmaps = false;

  // Create a simple plane for the VM texture
  const width = 0.62;
  const height = width * 9 / 16;
  const geometry = new THREE.PlaneBufferGeometry(width, height);
  geometry.rotateZ(Math.PI); // Adjust for Three.js coordinate system
  const material = new THREE.MeshBasicMaterial({ map: texture });
  const plane = new THREE.Mesh(geometry, material);
  const scene = new THREE.Scene();
  scene.add(plane);

  const hb = await Hyperbeam(document.body, embedURL, {
    frameCb: (frame) => {
      if (texture.image === null) {
        if (frame.constructor === HTMLVideoElement) {
          frame.width = frame.videoWidth;
          frame.height = frame.videoHeight;
        }
        texture.image = frame;
        texture.needsUpdate = true;
      } else {
        renderer.copyTextureToTexture(new THREE.Vector2(0, 0), new THREE.Texture(frame), texture);
      }
    },
    audioTrackCb: (track) => {
      const listener = new THREE.AudioListener();
      camera.add(listener);
      const sound = new THREE.PositionalAudio(listener);
      sound.setMediaStreamSource(new MediaStream([track]));
      sound.setRefDistance(0.5);
      plane.add(sound);
    }
  });

  window.addEventListener("resize", () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  });

  function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
  }
  animate();
}
