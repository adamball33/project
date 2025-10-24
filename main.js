import * as THREE from 'https://cdn.skypack.dev/three@0.132.2';
import { OrbitControls } from 'https://cdn.skypack.dev/three@0.132.2/examples/jsm/controls/OrbitControls.js';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );

const renderer = new THREE.WebGLRenderer();
renderer.setSize( window.innerWidth, window.innerHeight );
document.body.appendChild( renderer.domElement );

const controls = new OrbitControls( camera, renderer.domElement );

const geometry = new THREE.SphereGeometry( 1, 32, 32 );
const texture = new THREE.TextureLoader().load( 'https://opengameart.org/sites/default/files/oga-textures/146206/barren_01-512x512.png' );
const material = new THREE.MeshStandardMaterial( { map: texture } );
const sphere = new THREE.Mesh( geometry, material );
scene.add( sphere );

const ambientLight = new THREE.AmbientLight( 0xffffff, 0.2 );
scene.add( ambientLight );

const directionalLight = new THREE.DirectionalLight( 0xffffff, 1 );
directionalLight.position.set( 1, 1, 1 );
scene.add( directionalLight );

camera.position.z = 5;

const clock = new THREE.Clock();

function animate() {
	requestAnimationFrame( animate );

    const delta = clock.getDelta();
    sphere.rotation.y += (Math.PI / 30) * delta;

    controls.update();

	renderer.render( scene, camera );
}
animate();
