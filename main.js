import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import gsap from 'gsap';

// --- 1. 场景初始化 ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);
const currentFocus = new THREE.Vector3(0, 0, 0); // 当前相机聚焦点

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 3; 

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// 灯光
const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
scene.add(ambientLight);
const dirLight = new THREE.DirectionalLight(0xffffff, 2);
dirLight.position.set(5, 3, 5);
scene.add(dirLight);

// --- 2. 定义 Tag 数据 (你可以随意修改这里) ---
// lat: 纬度, lon: 经度
const tagData = [
    { lat: 31.23, lon: 121.47, title: "Shanghai", desc: "This is Shanghai, China." },
    { lat: 51.50, lon: -0.12, title: "London", desc: "Big Ben is here." },
    { lat: 40.71, lon: -74.00, title: "New York", desc: "The city that never sleeps." },
    { lat: -33.86, lon: 151.20, title: "Sydney", desc: "Opera House view." }
];

// 用来存储所有生成的 Tag 物体，方便稍后做点击检测
let tags = []; 
let earthModel = null;

// --- 3. 辅助函数：经纬度转 3D 坐标 ---
function latLonToVector3(lat, lon, radius) {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lon + 180) * (Math.PI / 180);
    
    // 球坐标转直角坐标公式
    const x = -(radius * Math.sin(phi) * Math.cos(theta));
    const z = (radius * Math.sin(phi) * Math.sin(theta));
    const y = (radius * Math.cos(phi));

    return new THREE.Vector3(x, y, z);
}

// --- 4. 加载模型并生成 Tag ---
const loader = new GLTFLoader();

loader.load('models/earth.glb', (gltf) => {
    earthModel = gltf.scene;

    earthModel.scale.set(2, 2, 2); // 根据需要调整大小
    
    // 自动居中修正
    const box = new THREE.Box3().setFromObject(earthModel);
    const center = box.getCenter(new THREE.Vector3());
    earthModel.position.sub(center);

    scene.add(earthModel);

    // 🏷️ 关键步骤：在地球上生成 Tag
    // 先估算地球半径 (如果不准，手动调整这个数字，比如 1.05)
    const earthRadius = 1.01; 

    tagData.forEach(data => {
        // 创建一个小球作为 Tag (稍后你可以换成图片 Sprite)
        const geometry = new THREE.SphereGeometry(0.02, 16, 16);
        const material = new THREE.MeshBasicMaterial({ color: 0xff0000 }); // 红色
        const tagMesh = new THREE.Mesh(geometry, material);

        // 计算位置
        const pos = latLonToVector3(data.lat, data.lon, earthRadius);
        tagMesh.position.copy(pos);

        // 将数据绑定到模型对象上，方便点击时读取
        tagMesh.userData = { title: data.title, desc: data.desc };

        // ⚠️ 把 Tag 加到地球上，这样它会跟着地球转！
        earthModel.add(tagMesh);
        
        // 存入数组，供射线检测用
        tags.push(tagMesh);
    });

}, undefined, (error) => {
    console.error(error);
});

// --- 5. 交互逻辑 (Raycaster) ---
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

// 定义默认速度和慢速
const NORMAL_SPEED = 0.002;
const SLOW_SPEED = 0.0002; // 慢速
let currentSpeed = NORMAL_SPEED; // 当前使用的速度

// 监听鼠标点击 (保持不变)
window.addEventListener('click', (event) => {
    pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
    pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const intersects = raycaster.intersectObjects(tags);
    if (intersects.length > 0) {
        const selectedTag = intersects[0].object;
        showPanel(intersects[0].object.userData);
        zoomToTag(selectedTag);
    }
});

// --- ✨ 修正后的鼠标悬停逻辑 ---
window.addEventListener('mousemove', (event) => {
    // 1. 更新鼠标坐标
    pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
    pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;

    // 2. 射线检测
    raycaster.setFromCamera(pointer, camera);
    const intersects = raycaster.intersectObjects(tags);

    // 3. 这里的逻辑只负责“改变状态”，不负责“运行动画”
    if (intersects.length > 0) {
        document.body.style.cursor = 'pointer';
        currentSpeed = SLOW_SPEED; // 悬停时：设为慢速
    } else {
        document.body.style.cursor = 'default';
        currentSpeed = NORMAL_SPEED; // 移开时：设为正常速度
    }
});

// ... (UI 控制函数 showPanel, closeBtn 等保持不变)
// UI 控制函数
const panel = document.getElementById('info-panel');
const titleEl = document.getElementById('panel-title');
const contentEl = document.getElementById('panel-content');
const closeBtn = document.getElementById('close-btn');

function showPanel(data) {
    titleEl.innerText = data.title;
    contentEl.innerText = data.desc;
    panel.classList.remove('hidden', 'slide-right');
    panel.classList.add('slide-left');
    // (可选) 如果你想点击时暂停地球旋转，可以在这里设置一个标志位
    isPaused = true;
}

closeBtn.addEventListener('click', () => {
    panel.classList.remove('slide-left');
    panel.classList.add('slide-right');  
    setTimeout(() => {
        panel.classList.add('hidden'); // 动画播完了，现在可以藏起来了
        panel.classList.remove('slide-right'); // 清理动画类，为下次显示保持干净
    }, 500);
    isPaused = false; // 恢复旋转
    resetCamera();
});

// --- 6. 动画循环 (只保留这一个！) ---
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
    
    // ✨ 核心修改：让相机每一帧都盯着动态焦点看
    camera.lookAt(currentFocus); 

    renderer.render(scene, camera);
}

// 启动动画 (只启动一次)
animate();

// --- ✨ 缺失的镜头控制函数 ✨ ---

// 1. 记录相机初始位置，方便重置 (和你初始化时的 camera.position.z = 3 对应)
const initialCameraPos = new THREE.Vector3(0, 0, 3); 

function zoomToTag(tagMesh) {
    // 获取 Tag 在世界空间中的绝对位置 (因为地球在转，必须用 getWorldPosition)
    const tagWorldPos = new THREE.Vector3();
    tagMesh.getWorldPosition(tagWorldPos);

    // 计算相机的新位置：
    // 地球缩放是 2，半径约为 2。
    // 我们把相机放在 Tag 延长线 3.5 的位置 (距离表面 1.5)，既能看清又不会太近
    const cameraTargetPos = tagWorldPos.clone().normalize().multiplyScalar(1); 

    // 动画 A: 移动相机
    gsap.to(camera.position, {
        x: cameraTargetPos.x,
        y: cameraTargetPos.y,
        z: cameraTargetPos.z,
        duration: 1.5,
        ease: "power2.inOut"
    });

    // 动画 B: 移动视线焦点 (让相机盯着 Tag 看)
    gsap.to(currentFocus, {
        x: tagWorldPos.x,
        y: tagWorldPos.y,
        z: tagWorldPos.z,
        duration: 1.5,
        ease: "power2.inOut"
    });
}

function resetCamera() {
    // 动画 A: 相机回到初始位置
    gsap.to(camera.position, {
        x: initialCameraPos.x,
        y: initialCameraPos.y,
        z: initialCameraPos.z,
        duration: 1.5,
        ease: "power2.inOut"
    });

    // 动画 B: 视线焦点回到地球中心 (0,0,0)
    gsap.to(currentFocus, {
        x: 0,
        y: 0,
        z: 0,
        duration: 1.5,
        ease: "power2.inOut"
    });
}