import * as THREE from 'three';
import gsap from 'gsap';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

// --- 1. Scene Initialization (Magical Space) ---
const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
);
camera.position.z = 8;

// 如果你想让整个地球更靠屏幕中间偏下，可以改这里
const currentFocus = new THREE.Vector3(0, -0.6, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// --- Lighting ---
const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
scene.add(ambientLight);

const mainLight = new THREE.DirectionalLight(0xffffff, 2.5);
mainLight.position.set(10, 10, 10);
scene.add(mainLight);

const fillLight = new THREE.DirectionalLight(0xffb3c6, 1.5);
fillLight.position.set(-10, -5, -10);
scene.add(fillLight);

// --- Floating magical dust ---
function createMagicDust() {
    const dustGeo = new THREE.BufferGeometry();
    const dustCount = 400;
    const positions = new Float32Array(dustCount * 3);

    for (let i = 0; i < dustCount * 3; i++) {
        positions[i] = (Math.random() - 0.5) * 30;
    }

    dustGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const dustMat = new THREE.PointsMaterial({
        color: 0xffffff,
        size: 0.15,
        transparent: true,
        opacity: 0.8,
        map: createCircleTexture(),
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });

    const dustParticles = new THREE.Points(dustGeo, dustMat);
    scene.add(dustParticles);
    return dustParticles;
}

function createCircleTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;

    const ctx = canvas.getContext('2d');
    ctx.beginPath();
    ctx.arc(16, 16, 14, 0, Math.PI * 2);
    ctx.fillStyle = 'white';
    ctx.fill();

    return new THREE.CanvasTexture(canvas);
}

const magicDust = createMagicDust();

// --- 2. Planet data ---
const tagData = [
    {
        lat: 31.23,
        lon: 121.47,
        title: "Cotton Candia",
        modelPath: "models/married.glb",
        markerScale: 1.5,
        coreResource: "Marriage Planet runs on a rare emotional energy source known as the Heart Balance Core",
        specialElement: "Marriage Planet is famous for having the best relationship mediation center in the universe",
        mainTheme: "Even in the future, people are still deeply troubled by intimacy.Technology may become smarter, faster, and more advanced, but relationships can still be messy, fragile, and painfully human",
        temp: 24,
        hum: "85%",
        progress: 95,
        desc: "Marriage Planet is a pink world that hosts the best relationship mediation center in the universe. Here, emotions that emerge within intimate relationships are materialized into special substances that can be detected, analyzed, and regulated through technology. By adjusting the chemical balance of these emotional materials, people are able to ease conflict, repair emotional damage, and rebuild connection.",
        image: "images/married.png"
    },
    {
        lat: 51.50,
        lon: -0.12,
        title: "Lumina Isles",
        modelPath: "models/planet1.glb",
        markerScale: 1.0,
        coreResource: "Starlight Crystals",
        specialElement: "A solar-reactive crystal that reveals the next five minutes of the future",
        mainTheme: "Human obsession with certainty",
        temp: 18,
        hum: "60%",
        progress: 70,
        desc: "If people could predict the immediate future, would they feel safer — or simply become more afraid of everything beyond it?",
        image: "images/planet11.png"
    },
    {
        lat: 40.71,
        lon: -74.00,
        title: "Flora Dome",
        modelPath: "models/planet2.glb",
        markerScale: 1.2,
        coreResource: "Ever-Blooming Petals",
        specialElement: "Flowers that sing harmoniously at sunrise.",
        mainTheme: "Nature in its most colorful, musical form.",
        temp: 28,
        hum: "50%",
        progress: 85,
        desc: "A vibrant, oversized garden world. The trees are as tall as skyscrapers and the mushrooms serve as cozy cafes.",
        image: "images/planet2.png"
    },
    {
        lat: -33.86,
        lon: 151.20,
        title: "Aqua Pearl",
        modelPath: "models/gold.glb",
        markerScale: 1.0,
        coreResource: "Liquid Music",
        specialElement: "Water that allows you to breathe and dance flawlessly.",
        mainTheme: "Grace, flow, and sparkling waves.",
        temp: 26,
        hum: "99%",
        progress: 60,
        desc: "A massive water park planet. Its oceans are crystal clear and warm, filled with friendly dolphins and singing corals.",
        image: "images/gold.png"
    }
];

let tags = [];
let earthModel = new THREE.Group();
scene.add(earthModel);

// 让整个地球往下移一点
earthModel.position.y = -2.0;

function latLonToVector3(lat, lon, radius) {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lon + 180) * (Math.PI / 180);
    const x = -(radius * Math.sin(phi) * Math.cos(theta));
    const z = (radius * Math.sin(phi) * Math.sin(theta));
    const y = (radius * Math.cos(phi));
    return new THREE.Vector3(x, y, z);
}

// --- Model loader helper ---
function loadModel(loader, path) {
    return new Promise((resolve, reject) => {
        loader.load(
            path,
            (gltf) => resolve(gltf.scene),
            undefined,
            (error) => reject(error)
        );
    });
}

// --- 4. Load custom earth + four different mini planets ---
async function loadCustomEarth() {
    // 如果 marker 埋进地球或飞太远，调这里
    const earthRadius = 3.25;

    const loader = new GLTFLoader();
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
    loader.setDRACOLoader(dracoLoader);

    try {
        // Load main earth
        const earthScene = await loadModel(loader, 'models/earth.glb');

        const earthBox = new THREE.Box3().setFromObject(earthScene);
        const earthCenter = earthBox.getCenter(new THREE.Vector3());
        earthScene.position.sub(earthCenter);

        earthScene.scale.set(5, 5, 5);
        earthModel.add(earthScene);

        // Preload all unique mini planet models
        const markerModels = {};

        for (const data of tagData) {
            if (!markerModels[data.modelPath]) {
                const markerScene = await loadModel(loader, data.modelPath);

                const markerBox = new THREE.Box3().setFromObject(markerScene);
                const markerCenter = markerBox.getCenter(new THREE.Vector3());
                markerScene.position.sub(markerCenter);

                markerModels[data.modelPath] = markerScene;
            }
        }

        // Create markers
        tagData.forEach((data, index) => {
            const markerGroup = new THREE.Group();

            const markerPlanet = markerModels[data.modelPath].clone(true);
            markerPlanet.scale.set(data.markerScale, data.markerScale, data.markerScale);
            markerGroup.add(markerPlanet);

            // 小星球离地球表面的距离
            const pos = latLonToVector3(data.lat, data.lon, earthRadius + 1.5);
            markerGroup.position.copy(pos);

            // 让模型朝外
            const outward = pos.clone().normalize();
            markerGroup.lookAt(outward.clone().multiplyScalar(2));

            markerGroup.userData = {
                ...data,
                baseScale: 1,
                animOffset: index * 0.5
            };

            // Invisible hitbox for raycasting
            const hitboxGeo = new THREE.SphereGeometry(0.5, 12, 12);
            const hitboxMat = new THREE.MeshBasicMaterial({
                transparent: true,
                opacity: 0
            });
            const hitbox = new THREE.Mesh(hitboxGeo, hitboxMat);
            hitbox.userData = markerGroup.userData;
            markerGroup.add(hitbox);

            earthModel.add(markerGroup);
            tags.push(hitbox);
        });

    } catch (error) {
        console.error('Error loading models:', error);
    }
}

loadCustomEarth();

// --- 5. Interaction Logic ---
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

const NORMAL_SPEED = 0.0015;
const ZOOM_SPEED = 0.0005;

let currentSpeed = NORMAL_SPEED;
let isZoomed = false;
let hoveredTag = null;

// drag rotation
let isDragging = false;
let dragMoved = false;
let previousMouse = { x: 0, y: 0 };

function isClickInsideUI(target) {
    return !!target.closest('#info-panel, #top-left-panel, #hud-panel');
}

window.addEventListener('mousedown', (event) => {
    if (isZoomed) return;
    if (isClickInsideUI(event.target)) return;

    isDragging = true;
    dragMoved = false;
    previousMouse.x = event.clientX;
    previousMouse.y = event.clientY;
    currentSpeed = 0;
});

window.addEventListener('mousemove', (event) => {
    if (isZoomed) return;

    if (isDragging) {
        const deltaX = event.clientX - previousMouse.x;
        const deltaY = event.clientY - previousMouse.y;

        if (Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2) {
            dragMoved = true;
        }

        earthModel.rotation.y += deltaX * 0.005;
        earthModel.rotation.x += deltaY * 0.003;

        // 限制上下旋转幅度，避免翻转太夸张
        earthModel.rotation.x = Math.max(-0.5, Math.min(0.5, earthModel.rotation.x));

        previousMouse.x = event.clientX;
        previousMouse.y = event.clientY;
        return;
    }

    pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
    pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);

    const intersects = raycaster.intersectObjects(tags, false);

    if (intersects.length > 0) {
        document.body.style.cursor = 'pointer';
        const target = intersects[0].object.parent;

        if (hoveredTag !== target) {
            if (hoveredTag) {
                gsap.to(hoveredTag.scale, {
                    x: 1,
                    y: 1,
                    z: 1,
                    duration: 0.3,
                    ease: "power2.out"
                });
            }

            hoveredTag = target;
            gsap.to(target.scale, {
                x: 1.5,
                y: 1.5,
                z: 1.5,
                duration: 0.4,
                ease: "elastic.out(1, 0.3)"
            });
        }
    } else {
        document.body.style.cursor = 'default';

        if (hoveredTag) {
            gsap.to(hoveredTag.scale, {
                x: 1,
                y: 1,
                z: 1,
                duration: 0.4,
                ease: "elastic.out(1, 0.4)"
            });
            hoveredTag = null;
        }
    }
});

window.addEventListener('mouseup', () => {
    if (!isZoomed) {
        currentSpeed = NORMAL_SPEED;
    }
    isDragging = false;
});

window.addEventListener('mouseleave', () => {
    if (!isZoomed) {
        currentSpeed = NORMAL_SPEED;
    }
    isDragging = false;
});

window.addEventListener('click', (event) => {
    if (dragMoved) {
        dragMoved = false;
        return;
    }

    if (isClickInsideUI(event.target)) {
        return;
    }

    pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
    pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);

    const intersects = raycaster.intersectObjects(tags, false);

    if (intersects.length > 0) {
        const hitData = intersects[0].object.userData;

        if (hitData && hitData.title) {
            showTopLeftPanel(hitData);
            showCenterPanel(hitData);
            showHUD(hitData);

            zoomToTag(intersects[0].object.parent);
            updateTitle(hitData.title);
        }
    }
});

// ==========================================
// ====== UI Animation Logic =================
// ==========================================

// Top left panel
const topLeftPanel = document.getElementById('top-left-panel');
const tlName = document.getElementById('tl-name');
const tlResource = document.getElementById('tl-resource');
const tlElement = document.getElementById('tl-element');
const tlTheme = document.getElementById('tl-theme');

function showTopLeftPanel(data) {
    tlName.innerText = data.title;
    tlResource.innerText = data.coreResource;
    tlElement.innerText = data.specialElement;
    tlTheme.innerText = data.mainTheme;

    topLeftPanel.classList.remove('hidden');

    gsap.fromTo(
        topLeftPanel,
        { scale: 0.5, opacity: 0, x: -50, rotation: -5 },
        { scale: 1, opacity: 1, x: 0, rotation: 0, duration: 0.8, ease: "back.out(1.5)", overwrite: "auto" }
    );

    gsap.fromTo(
        ".tl-group",
        { y: 20, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.5, stagger: 0.1, delay: 0.2, ease: "back.out(1.5)" }
    );
}

// Center panel
const panel = document.getElementById('info-panel');
const titleEl = document.getElementById('panel-title');
const imageEl = document.getElementById('panel-image');
const descEl = document.getElementById('panel-desc');
const closeBtn = document.getElementById('close-btn');

function showCenterPanel(data) {
    titleEl.innerText = data.title;
    descEl.innerText = data.desc;
    imageEl.src = data.image;
    imageEl.classList.remove('hidden');

    panel.classList.remove('hidden');

    gsap.fromTo(
        panel,
        { scale: 0.5, opacity: 0, y: 50 },
        { scale: 1, opacity: 1, y: 0, duration: 0.8, ease: "back.out(1.5)", delay: 0.1, overwrite: "auto" }
    );
}

// Right HUD
const hudPanel = document.getElementById('hud-panel');
const hudTemp = document.getElementById('hud-temp');
const hudHum = document.getElementById('hud-hum');
const hudBarFill = document.getElementById('hud-bar-fill');

function showHUD(data) {
    hudHum.innerText = data.hum;
    hudPanel.classList.remove('hidden');

    gsap.fromTo(
        hudPanel,
        { scale: 0.5, opacity: 0, x: 50, rotation: 5 },
        { scale: 1, opacity: 1, x: 0, rotation: 0, duration: 0.8, ease: "back.out(1.5)", overwrite: "auto" }
    );

    const tempTracker = { value: 0 };

    gsap.to(tempTracker, {
        value: data.temp,
        duration: 1.5,
        ease: "power2.out",
        onUpdate: () => {
            hudTemp.innerText = Math.floor(tempTracker.value);
        }
    });

    gsap.fromTo(
        hudBarFill,
        { width: "0%" },
        { width: data.progress + "%", duration: 1.5, delay: 0.3, ease: "elastic.out(1, 0.5)", overwrite: "auto" }
    );
}

// Close panels
function closeAllPanels() {
    if (!isZoomed) return;

    isZoomed = false;
    currentSpeed = NORMAL_SPEED;

    const elementsToHide = [topLeftPanel, panel, hudPanel];

    elementsToHide.forEach((el, index) => {
        if (!el.classList.contains('hidden')) {
            gsap.to(el, {
                scale: 0.8,
                opacity: 0,
                y: 20,
                duration: 0.3,
                ease: "power2.in",
                delay: index * 0.05,
                onComplete: () => el.classList.add('hidden')
            });
        }
    });

    resetCamera();
    updateTitle("奇妙星球之旅");
}

closeBtn.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    closeAllPanels();
});

[topLeftPanel, panel, hudPanel].forEach((el) => {
    el.addEventListener('click', (event) => {
        event.stopPropagation();
    });
});

// --- 6. Animation Loop ---
const clock = new THREE.Clock();

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

function animate() {
    requestAnimationFrame(animate);
    const time = clock.getElapsedTime();

    earthModel.rotation.y += currentSpeed;

    magicDust.rotation.y -= 0.001;
    magicDust.rotation.x += 0.0005;

    earthModel.children.forEach((child) => {
        if (child.userData && child.userData.title && child !== hoveredTag && !isZoomed) {
            const offset = child.userData.animOffset;
            const scale = 1.0 + Math.sin(time * 3 + offset) * 0.08;
            child.scale.set(scale, scale, scale);
        }
    });

    camera.lookAt(currentFocus);
    renderer.render(scene, camera);
}
animate();

// --- Camera controls ---
const initialCameraPos = new THREE.Vector3(0, 0, 8);

function zoomToTag(markerGroup) {
    isZoomed = true;
    currentSpeed = ZOOM_SPEED;
    isDragging = false;

    const tagWorldPos = new THREE.Vector3();
    markerGroup.getWorldPosition(tagWorldPos);

    const cameraTargetPos = tagWorldPos.clone().normalize().multiplyScalar(5.5);

    gsap.to(camera.position, {
        x: cameraTargetPos.x,
        y: cameraTargetPos.y,
        z: cameraTargetPos.z,
        duration: 1.5,
        ease: "power2.inOut"
    });

    gsap.to(currentFocus, {
        x: tagWorldPos.x,
        y: tagWorldPos.y,
        z: tagWorldPos.z,
        duration: 1.5,
        ease: "power2.inOut"
    });
}

function resetCamera() {
    gsap.to(camera.position, {
        x: initialCameraPos.x,
        y: initialCameraPos.y,
        z: initialCameraPos.z,
        duration: 1.2,
        ease: "power2.inOut"
    });

    gsap.to(currentFocus, {
        x: 0,
        y: -0.6,
        z: 0,
        duration: 1.2,
        ease: "power2.inOut"
    });
}

// --- Dynamic title ---
function updateTitle(text) {
    const title = document.querySelector('h1');
    if (!title) return;

    title.innerHTML = '';

    text.split('').forEach((char) => {
        const span = document.createElement('span');
        if (char === ' ') {
            span.innerHTML = '&nbsp;';
        } else {
            span.innerText = char;
        }
        span.style.display = 'inline-block';
        title.appendChild(span);
    });

    gsap.fromTo(
        "h1 span",
        { y: -30, opacity: 0, scale: 0.5 },
        { y: 0, opacity: 1, scale: 1, duration: 0.8, stagger: 0.05, ease: "back.out(2)", overwrite: "auto" }
    );
}

updateTitle("奇妙星球之旅");

// --- 初始启动动画 ---
const interactionGuide = document.getElementById('interaction-guide');

if (interactionGuide) {
    gsap.fromTo(
        interactionGuide,
        { x: -50, opacity: 0, rotation: -5 },
        { x: 0, opacity: 1, rotation: 0, duration: 1, delay: 1.5, ease: "back.out(1.5)" }
    );

    gsap.to(interactionGuide, {
        y: "+=8",
        repeat: -1,
        yoyo: true,
        duration: 1.5,
        ease: "sine.inOut"
    });
}