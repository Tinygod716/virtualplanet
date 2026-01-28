import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import gsap from 'gsap';

// --- 1. 场景初始化 ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);
const currentFocus = new THREE.Vector3(0, 0, 0); 

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 5; // 稍微拉远一点初始距离，防止地球太大堵脸

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// 灯光
const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
scene.add(ambientLight);
const dirLight = new THREE.DirectionalLight(0xffffff, 2);
dirLight.position.set(5, 3, 5);
scene.add(dirLight);

// --- 2. 定义 Tag 数据 ---
const tagData = [
    { lat: 31.23, lon: 121.47, title: "Shanghai", desc: "This is Shanghai, China." },
    { lat: 51.50, lon: -0.12, title: "London", desc: "Big Ben is here." },
    { lat: 40.71, lon: -74.00, title: "New York", desc: "The city that never sleeps." },
    { lat: -10.86, lon: 100.20, title: "Sydney", desc: "Opera House view." }
];

let tags = []; 
let earthModel = null;
let tagTemplate = null; 
let digitalplanet = null;

// --- 3. 辅助函数 ---
function latLonToVector3(lat, lon, radius) {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lon + 180) * (Math.PI / 180);
    const x = -(radius * Math.sin(phi) * Math.cos(theta));
    const z = (radius * Math.sin(phi) * Math.sin(theta));
    const y = (radius * Math.cos(phi));
    return new THREE.Vector3(x, y, z);
}

// --- 4. 加载模型逻辑 (关键修复点) ---
const loader = new GLTFLoader();

// ✨ 修复 1：链式加载
// 先加载 Tag (Demon)，加载完之后再加载地球
loader.load('models/demon.glb', (gltf) => {
    tagTemplate = gltf.scene;
    
    // ✨ 修复 2：在回调内部设置缩放
    tagTemplate.scale.set(0.1, 0.1, 0.1); 

}, undefined, (error) => {
    console.error('Demon 模型加载失败:', error);
});

loader.load('models/digital.glb', (gltf) => {
    digitalplanet = gltf.scene;
    
    // ✨ 修复 2：在回调内部设置缩放
    digitalplanet.scale.set(0.2, 0.2, 0.2); 
    
    // ✨ 修复 3：Tag 准备好后，才开始加载地球
    loadEarth(); 

}, undefined, (error) => {
    console.error('Demon 模型加载失败:', error);
});

function loadEarth() {
    loader.load('models/earth.glb', (gltf) => {
        earthModel = gltf.scene;
        earthModel.scale.set(3, 3, 3); 
        
        const box = new THREE.Box3().setFromObject(earthModel);
        const center = box.getCenter(new THREE.Vector3());
        earthModel.position.sub(center);

        scene.add(earthModel);

        const earthRadius = 1.01; 

        // 遍历所有地点数据
        tagData.forEach(data => {
            let tagMesh; // 先定义一个变量，用来存最终生成的物体

            // ✨ 关键判断：只想让 "Shanghai" 变成恶魔模型
            // 你可以把 'Shanghai' 改成任何你想要的那个地点的 title
            if (data.title === "Shanghai" && tagTemplate) {
                // --- A 计划：使用 Demon 模型 ---
                tagMesh = tagTemplate.clone(); 
                // 模型通常需要调整方向，让它“站”在地球上
                tagMesh.lookAt(0, 0, 0); 
            } else if (data.title === "London" && digitalplanet) {
                tagMesh = digitalplanet.clone();
                tagMesh.lookAt(0, 0, 0);
            } else {
                // --- B 计划：使用普通红色小球 ---
                const geometry = new THREE.SphereGeometry(0.02, 16, 16);
                const material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
                tagMesh = new THREE.Mesh(geometry, material);
            }

            // --- 下面是通用的定位逻辑 (对模型和小球都适用) ---
            
            // 1. 计算坐标
            const pos = latLonToVector3(data.lat, data.lon, earthRadius);
            tagMesh.position.copy(pos);

            // 2. 绑定数据 (这是点击弹窗的关键)
            // 注意：不管是模型还是小球，都把数据绑在它们身上
            tagMesh.userData = { title: data.title, desc: data.desc };

            // 3. 加入场景
            earthModel.add(tagMesh);
            tags.push(tagMesh);
        });

    }, undefined, (error) => {
        console.error('地球模型加载失败:', error);
    });
}

// --- 5. 交互逻辑 ---
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const NORMAL_SPEED = 0.002;
const SLOW_SPEED = 0.0002;
let currentSpeed = NORMAL_SPEED;

window.addEventListener('click', (event) => {
    pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
    pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);

    // ✨ 修复 4：添加 true 开启递归检测 (检测复杂的模型结构)
    const intersects = raycaster.intersectObjects(tags, true);
    
    if (intersects.length > 0) {
        // intersects[0].object 可能是模型的一个子部件(比如恶魔的手)
        // 我们需要找到它最顶层的那个 Group (才有 userData)
        // 这里简单处理：直接找 tags 数组里对应的那个
        
        // 更稳妥的方法是向上遍历，但因为我们把 userData 绑在了 clone 的 root 上
        // 这里我们可以尝试获取它的父级，或者利用 Three.js 的冒泡机制
        // 简单写法：直接取第一个命中的物体的【根父级】或者直接用它的 userData (如果运气好绑在 mesh 上)
        
        // 更加通用的做法：向上寻找拥有 userData 的父级
        let target = intersects[0].object;
        while(target.parent && !target.userData.title && target !== scene) {
            target = target.parent;
        }

        if(target.userData.title) {
            showPanel(target.userData);
            zoomToTag(target);

            updateTitle(target.userData.title);
        }
    }
});

window.addEventListener('mousemove', (event) => {
    pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
    pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    
    // ✨ 修复 4：同样开启递归
    const intersects = raycaster.intersectObjects(tags, true);

    if (intersects.length > 0) {
        document.body.style.cursor = 'pointer';
        currentSpeed = SLOW_SPEED;
    } else {
        document.body.style.cursor = 'default';
        currentSpeed = NORMAL_SPEED;
    }
});

// UI 控制
const panel = document.getElementById('info-panel');
const titleEl = document.getElementById('panel-title');
const contentEl = document.getElementById('panel-content');
const closeBtn = document.getElementById('close-btn');

function showPanel(data) {
    titleEl.innerText = data.title;
    contentEl.innerText = data.desc;
    setTimeout(() => {
    panel.classList.remove('hidden', 'slide-right');
    panel.classList.add('slide-left');
    }, 1000);
    isPaused = true;
}

closeBtn.addEventListener('click', () => {
    panel.classList.remove('slide-left');
    panel.classList.add('slide-right');  
    setTimeout(() => {
        panel.classList.add('hidden'); 
        panel.classList.remove('slide-right');
    }, 500);
    isPaused = false; 
    resetCamera();
    updateTitle("MY 3D WORLD");
});

// --- 6. 动画循环 ---
let isPaused = false; 

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

function animate() {
    requestAnimationFrame(animate);

    if (earthModel && !isPaused) {
        earthModel.rotation.y += currentSpeed;
    }
    camera.lookAt(currentFocus); 
    renderer.render(scene, camera);
}
animate();

// --- 镜头控制 ---
const initialCameraPos = new THREE.Vector3(0, 0, 5); // 确保这里和初始化的一致

function zoomToTag(tagMesh) {
    const tagWorldPos = new THREE.Vector3();
    tagMesh.getWorldPosition(tagWorldPos);

    // ✨ 修复 5：距离修正
    // 地球 scale 是 2，半径约 2。设为 3.0 才能在表面之外。
    // 如果设为 1，相机就进地核了。
    const cameraTargetPos = tagWorldPos.clone().normalize().multiplyScalar(3.0); 

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
        duration: 1.5,
        ease: "power2.inOut"
    });

    gsap.to(currentFocus, {
        x: 0,
        y: 0,
        z: 0,
        duration: 1.5,
        ease: "power2.inOut"
    });
}

// --- ✨ 动态标题控制函数 ---

function updateTitle(text) {
    const title = document.querySelector('h1');
    if (!title) return;

    // 1. 清空旧文字
    title.innerHTML = ''; 

    // 2. 重新拆分新文字
    text.split('').forEach(char => {
        const span = document.createElement('span');
        // 处理空格，否则空格会变成塌缩的 0 宽元素
        if (char === ' ') {
            span.innerHTML = '&nbsp;';
        } else {
            span.innerText = char;
        }
        span.style.display = 'inline-block'; 
        title.appendChild(span);
    });

    // 3. 播放 GSAP 进场动画
    // 这里用 fromTo 确保每次都能从下方飞上来
    gsap.fromTo("h1 span", 
        { 
            y: 50,          // 初始位置：下方 50px
            opacity: 0,     // 初始透明度
            rotation: 90    // 初始旋转
        },
        { 
            y: 0,           // 结束位置
            opacity: 1, 
            rotation: 0, 
            duration: 0.8, 
            stagger: 0.05,  // 每个字母间隔 0.05秒
            ease: "back.out(1.7)",
            overwrite: "auto" // 防止多次快速点击导致动画冲突
        }
    );
}

// ✨ 初始化时，先显示默认标题
updateTitle("MY 3D WORLD");