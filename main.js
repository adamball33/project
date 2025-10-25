import * as THREE from 'https://cdn.skypack.dev/three@0.132.2';
import { OrbitControls } from 'https://cdn.skypack.dev/three@0.132.2/examples/jsm/controls/OrbitControls.js';
import { createNoise3D } from 'https://cdn.skypack.dev/simplex-noise';
import { gsap } from 'https://cdn.skypack.dev/gsap';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );

const textureLoader = new THREE.TextureLoader();
const starTexture = textureLoader.load('https://i.imgur.com/p36i94k.jpeg');
scene.background = starTexture;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize( window.innerWidth, window.innerHeight );
renderer.shadowMap.enabled = true;
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
        terraformProgress: { value: 0.0 },
        sunPosition: { value: new THREE.Vector3(5, 3, 5) },
        cameraPosition: { value: camera.position },
        uTime: { value: 0.0 },
    },
    vertexShader: `
        varying float vElevation;
        attribute float elevation;
        varying vec3 vNormal;
        varying vec3 vPosition;
        uniform float uTime;

        // GLSL simplex noise function
        vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
        vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
        float snoise(vec3 v) {
            const vec2 C = vec2(1.0/6.0, 1.0/3.0);
            const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
            vec3 i = floor(v + dot(v, C.yyy));
            vec3 x0 = v - i + dot(i, C.xxx);
            vec3 g = step(x0.yzx, x0.xyz);
            vec3 l = 1.0 - g;
            vec3 i1 = min(g.xyz, l.zxy);
            vec3 i2 = max(g.xyz, l.zxy);
            vec3 x1 = x0 - i1 + C.xxx;
            vec3 x2 = x0 - i2 + C.yyy;
            vec3 x3 = x0 - D.yyy;
            i = mod289(i);
            vec4 p = permute(permute(permute(
                i.z + vec4(0.0, i1.z, i2.z, 1.0))
                + i.y + vec4(0.0, i1.y, i2.y, 1.0))
                + i.x + vec4(0.0, i1.x, i2.x, 1.0));
            float n_ = 0.142857142857;
            vec3 ns = n_ * D.wyz - D.xzx;
            vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
            vec4 x_ = floor(j * ns.z);
            vec4 y_ = floor(j - 7.0 * x_);
            vec4 x = x_ * ns.x + ns.yyyy;
            vec4 y = y_ * ns.x + ns.yyyy;
            vec4 h = 1.0 - abs(x) - abs(y);
            vec4 b0 = vec4(x.xy, y.xy);
            vec4 b1 = vec4(x.zw, y.zw);
            vec4 s0 = floor(b0) * 2.0 + 1.0;
            vec4 s1 = floor(b1) * 2.0 + 1.0;
            vec4 sh = -step(h, vec4(0.0));
            vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
            vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
            vec3 p0 = vec3(a0.xy, h.x);
            vec3 p1 = vec3(a0.zw, h.y);
            vec3 p2 = vec3(a1.xy, h.z);
            vec3 p3 = vec3(a1.zw, h.w);
            vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
            p0 *= norm.x;
            p1 *= norm.y;
            p2 *= norm.z;
            p3 *= norm.w;
            vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
            m = m * m;
            return 42.0 * dot(m*m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
        }

        void main() {
            vElevation = elevation;
            vNormal = normalize(normalMatrix * normal);

            vec3 pos = position;
            if (elevation < 0.05) { // It's water
                float waveNoise = snoise(vec3(pos.x * 10.0, pos.y * 10.0, uTime * 0.5));
                pos += normal * waveNoise * 0.005;
            }

            vec4 worldPosition = modelMatrix * vec4(pos, 1.0);
            vPosition = worldPosition.xyz;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
    `,
    fragmentShader: `
        varying float vElevation;
        uniform float terraformProgress;
        uniform vec3 sunPosition;
        varying vec3 vNormal;
        varying vec3 vPosition;
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

            if (terraformProgress > 0.5 && vElevation < 0.05) {
                vec3 viewDir = normalize(cameraPosition - vPosition);
                vec3 lightDir = normalize(sunPosition - vPosition);
                vec3 halfwayDir = normalize(lightDir + viewDir);
                float spec = pow(max(dot(vNormal, halfwayDir), 0.0), 32.0);
                color += vec3(1.0) * spec * 0.5;
            }

            gl_FragColor = vec4(color, 1.0);
        }
    `
});
const sphere = new THREE.Mesh(geometry, material);
sphere.castShadow = true;
sphere.receiveShadow = true;
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
clouds.castShadow = true;
scene.add(clouds);

const sun = new THREE.PointLight(0xffffff, 1, 0, 2);
sun.position.set(5, 3, 5);
sun.castShadow = true;
scene.add(sun);

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
    const elapsedTime = clock.getElapsedTime();
    sphere.rotation.y += (Math.PI / 30) * delta;
    clouds.rotation.y += (Math.PI / 20) * delta;
    material.uniforms.uTime.value = elapsedTime;

    controls.update();

	renderer.render( scene, camera );
}
animate();
