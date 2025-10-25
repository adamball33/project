import * as THREE from 'https://cdn.skypack.dev/three@0.132.2';
import { OrbitControls } from 'https://cdn.skypack.dev/three@0.132.2/examples/jsm/controls/OrbitControls.js';
import { createNoise3D } from 'https://cdn.skypack.dev/simplex-noise';
import { gsap } from 'https://cdn.skypack.dev/gsap';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );

const renderer = new THREE.WebGLRenderer();
renderer.setSize( window.innerWidth, window.innerHeight );
document.body.appendChild( renderer.domElement );

const controls = new OrbitControls( camera, renderer.domElement );

const noise = createNoise3D();
const geometry = new THREE.SphereGeometry(1, 128, 128);
const positionAttribute = geometry.getAttribute('position');
const elevation = new Float32Array(positionAttribute.count);

for (let i = 0; i < positionAttribute.count; i++) {
    const vertex = new THREE.Vector3().fromBufferAttribute(positionAttribute, i);

    // Layer 1: Continents
    const continentNoise = (noise(vertex.x * 0.5, vertex.y * 0.5, vertex.z * 0.5) + 1) * 0.5;

    // Layer 2: Mountains and Valleys
    const mountainNoise = (noise(vertex.x * 4, vertex.y * 4, vertex.z * 4) + 1) * 0.5;

    // Layer 3: Fine Details
    const detailNoise = (noise(vertex.x * 16, vertex.y * 16, vertex.z * 16) + 1) * 0.5;

    const elevationVal = continentNoise * 0.2 + mountainNoise * 0.05 + detailNoise * 0.01;

    vertex.addScaledVector(vertex.clone().normalize(), elevationVal);
    positionAttribute.setXYZ(i, vertex.x, vertex.y, vertex.z);
    elevation[i] = elevationVal;
}

geometry.setAttribute('elevation', new THREE.BufferAttribute(elevation, 1));

const material = new THREE.ShaderMaterial({
    uniforms: {
        terraformProgress: { value: 0.0 }
    },
    vertexShader: `
        varying float vElevation;
        attribute float elevation;
        void main() {
            vElevation = elevation;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        varying float vElevation;
        uniform float terraformProgress;
        void main() {
            // Barren planet colors
            vec3 barrenDeepColor = vec3(0.2, 0.1, 0.0);
            vec3 barrenShallowColor = vec3(0.6, 0.4, 0.2);
            vec3 barrenPeakColor = vec3(1.0);

            // Terraformed planet colors
            vec3 terraformedDeepColor = vec3(0.0, 0.2, 0.6);
            vec3 terraformedShallowColor = vec3(0.2, 0.6, 0.2);
            vec3 terraformedPeakColor = vec3(1.0);

            // Interpolate colors based on terraform progress
            vec3 deepColor = mix(barrenDeepColor, terraformedDeepColor, terraformProgress);
            vec3 shallowColor = mix(barrenShallowColor, terraformedShallowColor, terraformProgress);
            vec3 peakColor = mix(barrenPeakColor, terraformedPeakColor, terraformProgress);

            // Determine color based on elevation
            vec3 color;
            if (vElevation < 0.05) {
                color = deepColor;
            } else if (vElevation < 0.1) {
                color = mix(deepColor, shallowColor, smoothstep(0.05, 0.1, vElevation));
            } else if (vElevation < 0.15) {
                color = shallowColor;
            } else {
                color = mix(shallowColor, peakColor, smoothstep(0.15, 0.2, vElevation));
            }
            gl_FragColor = vec4(color, 1.0);
        }
    `
});
const sphere = new THREE.Mesh(geometry, material);
scene.add(sphere);

const atmosphereGeometry = new THREE.SphereGeometry(1.1, 128, 128);
const atmosphereMaterial = new THREE.ShaderMaterial({
    vertexShader: `
        varying vec3 vNormal;
        void main() {
            vNormal = normalize(normalMatrix * normal);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        varying vec3 vNormal;
        void main() {
            float intensity = pow(0.7 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
            gl_FragColor = vec4(0.3, 0.6, 1.0, 1.0) * intensity;
        }
    `,
    blending: THREE.AdditiveBlending,
    side: THREE.BackSide
});
const atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
scene.add(atmosphere);

const cloudGeometry = new THREE.SphereGeometry(1.05, 128, 128);
const cloudTexture = new THREE.TextureLoader().load('https://i.imgur.com/8i36q27.png');
const cloudMaterial = new THREE.MeshStandardMaterial({
    map: cloudTexture,
    transparent: true,
    opacity: 0.5,
    blending: THREE.AdditiveBlending
});
const clouds = new THREE.Mesh(cloudGeometry, cloudMaterial);
scene.add(clouds);

const ambientLight = new THREE.AmbientLight( 0xffffff, 0.2 );
scene.add( ambientLight );

const directionalLight = new THREE.DirectionalLight( 0xffffff, 1 );
directionalLight.position.set( 1, 1, 1 );
scene.add( directionalLight );

const terraformButton = document.getElementById('terraform-button');
terraformButton.addEventListener('click', () => {
    gsap.to(material.uniforms.terraformProgress, {
        value: 1.0,
        duration: 5,
        ease: 'power2.inOut'
    });
});

camera.position.z = 5;

const clock = new THREE.Clock();

function animate() {
	requestAnimationFrame( animate );

    const delta = clock.getDelta();
    sphere.rotation.y += (Math.PI / 30) * delta;
    clouds.rotation.y += (Math.PI / 20) * delta;

    controls.update();

	renderer.render( scene, camera );
}
animate();
