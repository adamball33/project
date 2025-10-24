import * as THREE from 'https://cdn.skypack.dev/three@0.132.2';
import { OrbitControls } from 'https://cdn.skypack.dev/three@0.132.2/examples/jsm/controls/OrbitControls.js';

let scene, camera, renderer, controls, clock;
let sphere, cloudLayer;

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
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.2);
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
    const textures = {
        barren: textureLoader.load('barren.png'),
        water: textureLoader.load('water.png'),
        vegetation: textureLoader.load('vegetation.png')
    };
    const material = new THREE.MeshStandardMaterial({ map: textures.barren });
    sphere = new THREE.Mesh(geometry, material);
    scene.add(sphere);

    // Button listeners for texture swapping
    document.getElementById('barren').addEventListener('click', () => {
        material.map = textures.barren;
    });
    document.getElementById('water').addEventListener('click', () => {
        material.map = textures.water;
    });
    document.getElementById('vegetation').addEventListener('click', () => {
        material.map = textures.vegetation;
    });
}

function createStarfield() {
    const starGeometry = new THREE.SphereGeometry(100, 64, 64);
    const starMaterial = new THREE.MeshBasicMaterial({
        map: new THREE.TextureLoader().load('https://i.imgur.com/v631mN5.png'),
        side: THREE.BackSide
    });
    const starField = new THREE.Mesh(starGeometry, starMaterial);
    scene.add(starField);
}

function createClouds() {
    const cloudGeometry = new THREE.SphereGeometry(1.01, 32, 32);
    const cloudMaterial = new THREE.MeshPhongMaterial({
        map: new THREE.TextureLoader().load('https://i.imgur.com/W4i25X0.png'),
        transparent: true,
        opacity: 0.8
    });
    cloudLayer = new THREE.Mesh(cloudGeometry, cloudMaterial);
    scene.add(cloudLayer);
}

function setupEventListeners() {
    // Event listeners for terraforming buttons are in createPlanet()
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);

    const delta = clock.getDelta();
    // Rotate planet and clouds at different speeds
    sphere.rotation.y += (Math.PI / 30) * delta;
    cloudLayer.rotation.y += (Math.PI / 25) * delta;

    controls.update();
    renderer.render(scene, camera);
}

init();
