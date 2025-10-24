import * as THREE from 'https://cdn.skypack.dev/three@0.132.2';
import { OrbitControls } from 'https://cdn.skypack.dev/three@0.132.2/examples/jsm/controls/OrbitControls.js';
import { gsap } from 'https://cdn.skypack.dev/gsap';

let scene, camera, renderer, controls, clock;
let sphere, cloudLayer;
let material;
let simplex;

const starfieldTexture = 'textures/2k_stars.jpg';
const cloudTexture = 'textures/2k_earth_clouds.jpg';

function init() {
    // Scene setup
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    // Controls
    controls = new OrbitControls(camera, renderer.domElement);
    clock = new THREE.Clock();

    // Noise
    simplex = new SimplexNoise();

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(1, 1, 1);
    scene.add(directionalLight);

    // Create celestial bodies
    createStarfield();
    createPlanet();
    createClouds();

    // Set initial camera position
    camera.position.z = 5;

    // Event listeners
    setupEventListeners();
    window.addEventListener('resize', onWindowResize, false);

    // Start animation
    animate();
}

function createPlanet() {
    if (sphere) {
        scene.remove(sphere);
        sphere.geometry.dispose();
        material.dispose();
    }

    const geometry = new THREE.SphereGeometry(1, 128, 128);
    const position = geometry.attributes.position;
    const elevations = [];

    const noiseSettings = [
        { frequency: 2.0, strength: 0.05 }, // Continents
        { frequency: 8.0, strength: 0.02 }, // Mountains
        { frequency: 16.0, strength: 0.005 } // Details
    ];

    for (let i = 0; i < position.count; i++) {
        const vertex = new THREE.Vector3().fromBufferAttribute(position, i);
        let elevation = 0;
        noiseSettings.forEach(noise => {
            elevation += simplex.noise3D(vertex.x * noise.frequency, vertex.y * noise.frequency, vertex.z * noise.frequency) * noise.strength;
        });

        vertex.normalize().multiplyScalar(1 + elevation);
        position.setXYZ(i, vertex.x, vertex.y, vertex.z);
        elevations.push(elevation);
    }

    geometry.setAttribute('elevation', new THREE.Float32BufferAttribute(elevations, 1));
    geometry.computeVertexNormals();

    material = new THREE.ShaderMaterial({
        uniforms: {
            terraformProgress: { value: 0.0 }
        },
        vertexShader: `
            attribute float elevation;
            varying float vElevation;
            void main() {
                vElevation = elevation;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            varying float vElevation;
            uniform float terraformProgress;

            // Simple color gradient functions
            vec3 barrenColor(float e) {
                return mix(vec3(0.5, 0.4, 0.3), vec3(0.8, 0.7, 0.6), e * 10.0 + 0.5);
            }

            vec3 terraformedColor(float e) {
                if (e < -0.02) return vec3(0.1, 0.2, 0.5); // Deep Water
                if (e < 0.0) return vec3(0.2, 0.4, 0.8); // Shallow Water
                if (e < 0.01) return vec3(0.9, 0.8, 0.6); // Beach
                if (e < 0.05) return vec3(0.2, 0.5, 0.2); // Grass
                if (e < 0.1) return vec3(0.5, 0.5, 0.5); // Rock
                return vec3(1.0, 1.0, 1.0); // Snow
            }

            void main() {
                vec3 barren = barrenColor(vElevation);
                vec3 terraformed = terraformedColor(vElevation);
                gl_FragColor = vec4(mix(barren, terraformed, terraformProgress), 1.0);
            }
        `
    });
    sphere = new THREE.Mesh(geometry, material);
    scene.add(sphere);
}

function setupEventListeners() {
    document.getElementById('generate').addEventListener('click', createPlanet);
    document.getElementById('terraform').addEventListener('click', terraform);
}

function terraform() {
    gsap.to(material.uniforms.terraformProgress, {
        value: 1.0,
        duration: 5.0,
        ease: "power1.inOut"
    });
}

function createStarfield() {
    const starGeometry = new THREE.SphereGeometry(100, 64, 64);
    const starMaterial = new THREE.MeshBasicMaterial({
        map: new THREE.TextureLoader().load(starfieldTexture),
        side: THREE.BackSide
    });
    const starField = new THREE.Mesh(starGeometry, starMaterial);
    scene.add(starField);
}

function createClouds() {
    const cloudGeometry = new THREE.SphereGeometry(1.01, 32, 32);
    const cloudMaterial = new THREE.MeshPhongMaterial({
        map: new THREE.TextureLoader().load(cloudTexture),
        transparent: true,
        opacity: 0.8
    });
    cloudLayer = new THREE.Mesh(cloudGeometry, cloudMaterial);
    scene.add(cloudLayer);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);

    const delta = clock.getDelta();
    sphere.rotation.y += (Math.PI / 30) * delta;
    cloudLayer.rotation.y += (Math.PI / 25) * delta;

    controls.update();
    renderer.render(scene, camera);
}

init();