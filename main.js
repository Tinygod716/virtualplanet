
    import * as THREE from 'three';
// 引入 GLTFLoader 加载器
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// --- 1. 场景初始化 ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000); // 黑色背景

// 相机设置
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 2.5; // 摄像机距离原点的距离

// 渲染器设置
const renderer = new THREE.WebGLRenderer({ antialias: true }); // antialias: true 让边缘更平滑
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio); // 适配高清屏
document.body.appendChild(renderer.domElement);

// --- 2. 灯光设置 (非常重要) ---
// 环境光：基础照明，防止模型太黑
const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
scene.add(ambientLight);

// 方向光：模拟太阳光，产生阴影感
const dirLight = new THREE.DirectionalLight(0xffffff, 2);
dirLight.position.set(5, 3, 5); // 光源位置
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

// --- 2.5. 辅助函数：经纬度转 3D 坐标 ---
function latLonToVector3(lat, lon, radius) {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lon + 180) * (Math.PI / 180);
    
    // 球坐标转直角坐标公式
    const x = -(radius * Math.sin(phi) * Math.cos(theta));
    const z = (radius * Math.sin(phi) * Math.sin(theta));
    const y = (radius * Math.cos(phi));

    return new THREE.Vector3(x, y, z);
}

// --- 3. 加载 3D 模型 ---
const loader = new GLTFLoader();
let earthModel = null; // 用来存储加载好的模型

// ⚠️ 确保你的 earth.glb 文件就在同一个文件夹下
loader.load('models/earth.glb', (gltf) => {
    earthModel = gltf.scene;

    earthModel.position.set(0, -1, 0); // 调整模型位置
    
    // 如果模型太大或太小，调整这里的数值
    earthModel.scale.set(2, 2, 2); 
    
    scene.add(earthModel);
    console.log("地球模型加载成功！");

}, undefined, (error) => {
    console.error("加载出错了，请检查文件名或路径是否正确", error);
});


// --- 4. 窗口自适应 (Resize) ---
window.addEventListener('resize', () => {
    // 更新相机宽高比
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    // 更新渲染器大小
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- 5. 动画循环 ---
function animate() {
    requestAnimationFrame(animate);

    // 只有当模型加载完了才让它转
    if (earthModel) {
        earthModel.rotation.y += 0.002; // 自转速度
    }

    renderer.render(scene, camera);
}

// 启动动画
animate();