import * as THREE from 'https://cdn.skypack.dev/three@0.132.2';
import { OrbitControls } from 'https://cdn.skypack.dev/three@0.132.2/examples/jsm/controls/OrbitControls.js';
import { gsap } from 'https://cdn.skypack.dev/gsap';

let scene, camera, renderer, controls, clock;
let sphere, cloudLayer;
let material, textures = {};
let isTransitioning = false;

// Pointing to your local 'textures' folder
const stages = [
    { id: 'barren', texture: 'textures/2k_mercury.jpg' },
    { id: 'molten', texture: 'textures/2k_venus_surface.jpg' },
    { id: 'water', texture: 'textures/2k_earth_daymap.jpg' },
    { id: 'snow', texture: 'textures/2k_haumea_fictional.jpg' },
    { id: 'vegetation', texture: 'textures/2k_earth_daymap.jpg' } // Using Earth for vegetation
];

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
    const geometry = new THREE.SphereGeometry(1, 32, 32);
    const textureLoader = new THREE.TextureLoader();
    stages.forEach(stage => {
        textures[stage.id] = textureLoader.load(stage.texture);
    });

    material = new THREE.ShaderMaterial({
        uniforms: {
            texture1: { value: textures.barren },
            texture2: { value: textures.barren },
            mixValue: { value: 0.0 }
        },
        vertexShader: `
            varying vec2 vUv;
            void main() {
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform sampler2D texture1;
            uniform sampler2D texture2;
            uniform float mixValue;
            varying vec2 vUv;
            void main() {
                vec4 tex1 = texture2D(texture1, vUv);
                vec4 tex2 = texture2D(texture2, vUv);
                gl_FragColor = mix(tex1, tex2, mixValue);
            }
        `
    });
    sphere = new THREE.Mesh(geometry, material);
    scene.add(sphere);
}

function setupEventListeners() {
    stages.forEach(stage => {
        document.getElementById(stage.id).addEventListener('click', () => transitionToTexture(textures[stage.id]));
    });
    document.getElementById('terraform').addEventListener('click', terraform);
}

function transitionToTexture(newTexture, onComplete) {
    if (isTransitioning) {
        return;
    }
    isTransitioning = true;

    material.uniforms.texture2.value = newTexture;
    gsap.to(material.uniforms.mixValue, {
        value: 1.0,
        duration: 1.5,
        onComplete: () => {
            material.uniforms.texture1.value = newTexture;
            material.uniforms.mixValue.value = 0.0;
            isTransitioning = false;
            if (onComplete) {
                onComplete();
            }
        }
    });
}

function terraform() {
    if (isTransitioning) {
        return;
    }
    const terraformStages = ['molten', 'water', 'vegetation'];
    const tl = gsap.timeline();

    terraformStages.forEach(stage => {
        tl.to({}, { // Empty tween to create a delay
            duration: 0.5, // Delay between transitions
            onComplete: () => {
                transitionToTexture(textures[stage]);
            }
        });
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