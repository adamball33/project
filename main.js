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

    material = new THREE.MeshBasicMaterial({
        map: textures.barren,
        transparent: true
    });
    sphere = new THREE.Mesh(geometry, material);
    scene.add(sphere);
}

function setupEventListeners() {
    stages.forEach(stage => {
        document.getElementById(stage.id).addEventListener('click', () => transitionToTexture(textures[stage.id]));
    });
}

function transitionToTexture(newTexture) {
    if (isTransitioning || material.map === newTexture) {
        return;
    }
    isTransitioning = true;

    const tempMaterial = new THREE.MeshBasicMaterial({
        map: newTexture,
        transparent: true,
        opacity: 0
    });

    sphere.geometry.addGroup(0, Infinity, 0);
    sphere.geometry.addGroup(0, Infinity, 1);
    sphere.material = [material, tempMaterial];

    gsap.to(tempMaterial, {
        opacity: 1,
        duration: 1.5,
        onComplete: () => {
            material.map = newTexture;
            sphere.material = material;
            sphere.geometry.clearGroups();
            tempMaterial.dispose();
            isTransitioning = false;
        }
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