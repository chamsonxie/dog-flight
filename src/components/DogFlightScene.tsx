import { useEffect, useRef } from 'react';
import * as THREE from 'three';

// 简易噪声函数
function simpleNoise(x: number, z: number): number {
  return Math.sin(x * 0.1) * Math.cos(z * 0.1) * 3 +
         Math.sin(x * 0.2 + 1.3) * Math.cos(z * 0.2 + 0.7) * 1.5 +
         Math.sin(x * 0.4 + 2.6) * Math.cos(z * 0.4 + 1.4) * 0.8;
}

// 获取地形高度
function getGroundHeight(x: number, z: number): number {
  return simpleNoise(x, z);
}

// 区块管理类
class ChunkManager {
  scene: THREE.Scene;
  chunks: Map<string, THREE.Group>;
  chunkSize: number;
  renderDistance: number;
  airplanePos: THREE.Vector3;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.chunks = new Map();
    this.chunkSize = 20;
    this.renderDistance = 3;
    this.airplanePos = new THREE.Vector3();
  }

  update(airplanePosition: THREE.Vector3) {
    this.airplanePos.copy(airplanePosition);

    const centerX = Math.floor(airplanePosition.x / this.chunkSize);
    const centerZ = Math.floor(airplanePosition.z / this.chunkSize);

    // 生成新区块
    for (let dx = -this.renderDistance; dx <= this.renderDistance; dx++) {
      for (let dz = -this.renderDistance; dz <= this.renderDistance; dz++) {
        const chunkX = centerX + dx;
        const chunkZ = centerZ + dz;
        const key = `${chunkX},${chunkZ}`;

        if (!this.chunks.has(key)) {
          const chunk = this.createChunk(chunkX, chunkZ);
          this.chunks.set(key, chunk);
          this.scene.add(chunk);
        }
      }
    }

    // 清理远处区块
    const keysToRemove: string[] = [];
    this.chunks.forEach((_chunk, key) => {
      const [cx, cz] = key.split(',').map(Number);
      const distanceX = Math.abs(cx - centerX);
      const distanceZ = Math.abs(cz - centerZ);

      if (distanceX > this.renderDistance + 1 || distanceZ > this.renderDistance + 1) {
        keysToRemove.push(key);
      }
    });

    keysToRemove.forEach(key => {
      const chunk = this.chunks.get(key);
      if (chunk) {
        this.scene.remove(chunk);
        chunk.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.geometry.dispose();
            if (Array.isArray(child.material)) {
              child.material.forEach(m => m.dispose());
            } else {
              child.material.dispose();
            }
          }
        });
        this.chunks.delete(key);
      }
    });
  }

  createChunk(chunkX: number, chunkZ: number): THREE.Group {
    const group = new THREE.Group();
    const offsetX = chunkX * this.chunkSize;
    const offsetZ = chunkZ * this.chunkSize;

    // 创建地面
    const groundGeometry = new THREE.PlaneGeometry(
      this.chunkSize,
      this.chunkSize,
      10,
      10
    );
    const vertices = groundGeometry.attributes.position.array;

    for (let i = 0; i < vertices.length; i += 3) {
      const x = vertices[i] + offsetX;
      const z = vertices[i + 2] + offsetZ;
      vertices[i + 1] = getGroundHeight(x, z);
    }
    groundGeometry.computeVertexNormals();

    const groundMaterial = new THREE.MeshLambertMaterial({
      color: 0x4CAF50,
      side: THREE.DoubleSide
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    group.add(ground);

    // 在区块内生成山峰
    const mountainCount = Math.floor(Math.random() * 3);
    for (let i = 0; i < mountainCount; i++) {
      const x = offsetX + Math.random() * this.chunkSize;
      const z = offsetZ + Math.random() * this.chunkSize;
      const y = getGroundHeight(x, z);
      const height = 2 + Math.random() * 5;

      const geometry = new THREE.ConeGeometry(1 + Math.random() * 2, height, 8);
      const material = new THREE.MeshLambertMaterial({
        color: new THREE.Color().setHSL(0.3, 0.3, 0.3 + Math.random() * 0.2)
      });
      const mountain = new THREE.Mesh(geometry, material);
      mountain.position.set(x, y - 1, z);
      mountain.castShadow = true;
      group.add(mountain);
    }

    // 在区块内生成树木
    const treeCount = 5 + Math.floor(Math.random() * 10);
    for (let i = 0; i < treeCount; i++) {
      const x = offsetX + Math.random() * this.chunkSize;
      const z = offsetZ + Math.random() * this.chunkSize;
      const y = getGroundHeight(x, z);
      const treeHeight = 1.5 + Math.random() * 2;

      // 树干
      const trunkGeometry = new THREE.CylinderGeometry(0.1, 0.15, treeHeight * 0.5, 6);
      const trunkMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
      const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
      trunk.position.set(x, y + treeHeight * 0.25, z);
      trunk.castShadow = true;
      group.add(trunk);

      // 树冠
      const crownGeometry = new THREE.ConeGeometry(0.8, treeHeight * 0.6, 8);
      const crownMaterial = new THREE.MeshLambertMaterial({
        color: new THREE.Color().setHSL(0.3, 0.6, 0.25 + Math.random() * 0.15)
      });
      const crown = new THREE.Mesh(crownGeometry, crownMaterial);
      crown.position.set(x, y + treeHeight * 0.7, z);
      crown.castShadow = true;
      group.add(crown);
    }

    return group;
  }
}

// 创建云朵管理系统
class CloudManager {
  scene: THREE.Scene;
  clouds: THREE.Group[];
  airplanePos: THREE.Vector3;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.clouds = [];
    this.airplanePos = new THREE.Vector3();
  }

  update(airplanePosition: THREE.Vector3) {
    this.airplanePos.copy(airplanePosition);

    // 维护云朵数量
    while (this.clouds.length < 20) {
      this.createCloud();
    }

    // 更新云朵位置
    this.clouds.forEach((cloud, _index) => {
      cloud.position.x -= cloud.userData.speed;

      // 如果云朵太远，重新定位到前方
      if (cloud.position.x < this.airplanePos.x - 50) {
        this.resetCloud(cloud);
      }
    });
  }

  createCloud(): THREE.Group {
    const cloud = new THREE.Group();

    const puffCount = 3 + Math.floor(Math.random() * 4);
    for (let j = 0; j < puffCount; j++) {
      const puffGeometry = new THREE.SphereGeometry(
        0.8 + Math.random() * 1.2,
        8, 6
      );
      const puffMaterial = new THREE.MeshLambertMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.8
      });
      const puff = new THREE.Mesh(puffGeometry, puffMaterial);
      puff.position.set(
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 0.5,
        (Math.random() - 0.5) * 2
      );
      cloud.add(puff);
    }

    this.resetCloud(cloud);
    cloud.userData.speed = 0.02 + Math.random() * 0.03;
    this.clouds.push(cloud);
    this.scene.add(cloud);

    return cloud;
  }

  resetCloud(cloud: THREE.Group) {
    cloud.position.set(
      this.airplanePos.x + 30 + Math.random() * 50,
      8 + Math.random() * 15,
      (Math.random() - 0.5) * 40
    );
  }
}

// 创建飞机和小狗
function createAirplaneWithDog() {
  const group = new THREE.Group();

  // 飞机机身
  const bodyGeometry = new THREE.CylinderGeometry(0.3, 0.2, 2.5, 12);
  const bodyMaterial = new THREE.MeshPhongMaterial({ color: 0x2196F3 });
  const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
  body.rotation.x = Math.PI / 2;
  body.castShadow = true;
  group.add(body);

  // 机翼
  const wingGeometry = new THREE.BoxGeometry(3, 0.1, 1);
  const wingMaterial = new THREE.MeshPhongMaterial({ color: 0x1976D2 });
  const wing = new THREE.Mesh(wingGeometry, wingMaterial);
  wing.position.z = -0.2;
  wing.castShadow = true;
  group.add(wing);

  // 尾翼
  const tailGeometry = new THREE.BoxGeometry(1, 0.1, 0.6);
  const tailMaterial = new THREE.MeshPhongMaterial({ color: 0x1976D2 });
  const tail = new THREE.Mesh(tailGeometry, tailMaterial);
  tail.position.set(0, 0.3, -1.2);
  tail.castShadow = true;
  group.add(tail);

  // 螺旋桨
  const propellerGroup = new THREE.Group();
  const propGeometry = new THREE.BoxGeometry(1.5, 0.05, 0.2);
  const propMaterial = new THREE.MeshPhongMaterial({ color: 0x444444 });
  const propeller = new THREE.Mesh(propGeometry, propMaterial);
  propellerGroup.add(propeller);

  const prop2Geometry = new THREE.BoxGeometry(0.2, 0.05, 1.5);
  const prop2 = new THREE.Mesh(prop2Geometry, propMaterial);
  propellerGroup.add(prop2);

  propellerGroup.position.set(0, 0, 1.3);
  group.add(propellerGroup);

  // 小狗
  const dog = createDog();
  dog.position.set(0, 0.4, 0.3);
  dog.scale.set(0.6, 0.6, 0.6);
  group.add(dog);

  return { group, propellerGroup };
}

// 创建小狗模型
function createDog() {
  const dogGroup = new THREE.Group();

  // 身体
  const bodyGeometry = new THREE.BoxGeometry(0.8, 0.6, 1);
  const bodyMaterial = new THREE.MeshPhongMaterial({ color: 0xD2691E });
  const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
  body.position.z = -0.2;
  dogGroup.add(body);

  // 头
  const headGeometry = new THREE.SphereGeometry(0.35, 12, 12);
  const headMaterial = new THREE.MeshPhongMaterial({ color: 0xD2691E });
  const head = new THREE.Mesh(headGeometry, headMaterial);
  head.position.set(0, 0.4, 0.4);
  dogGroup.add(head);

  // 耳朵
  const earGeometry = new THREE.BoxGeometry(0.15, 0.3, 0.05);
  const earMaterial = new THREE.MeshPhongMaterial({ color: 0x8B4513 });
  const ear1 = new THREE.Mesh(earGeometry, earMaterial);
  ear1.position.set(-0.25, 0.55, 0.35);
  ear1.rotation.z = -0.3;
  dogGroup.add(ear1);

  const ear2 = ear1.clone();
  ear2.position.x = 0.25;
  ear2.rotation.z = 0.3;
  dogGroup.add(ear2);

  // 鼻子
  const noseGeometry = new THREE.SphereGeometry(0.1, 8, 8);
  const noseMaterial = new THREE.MeshPhongMaterial({ color: 0x000000 });
  const nose = new THREE.Mesh(noseGeometry, noseMaterial);
  nose.position.set(0, 0.35, 0.75);
  dogGroup.add(nose);

  // 眼睛
  const eyeGeometry = new THREE.SphereGeometry(0.06, 8, 8);
  const eyeMaterial = new THREE.MeshPhongMaterial({ color: 0x000000 });
  const eye1 = new THREE.Mesh(eyeGeometry, eyeMaterial);
  eye1.position.set(-0.12, 0.45, 0.65);
  dogGroup.add(eye1);

  const eye2 = eye1.clone();
  eye2.position.x = 0.12;
  dogGroup.add(eye2);

  // 尾巴
  const tailGeometry = new THREE.CylinderGeometry(0.05, 0.08, 0.6, 8);
  const tailMaterial = new THREE.MeshPhongMaterial({ color: 0xD2691E });
  const tail = new THREE.Mesh(tailGeometry, tailMaterial);
  tail.position.set(0, 0.3, -0.8);
  tail.rotation.x = 0.5;
  dogGroup.add(tail);

  return dogGroup;
}

interface DogFlightSceneProps {
  onHeightChange?: (height: number) => void;
  onWeatherChange?: (isRaining: boolean) => void;
}

export default function DogFlightScene({ onHeightChange, onWeatherChange }: DogFlightSceneProps) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mountRef.current) return;

    // 场景设置
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB);
    scene.fog = new THREE.Fog(0x87CEEB, 30, 100);

    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mountRef.current.appendChild(renderer.domElement);

    // 灯光
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 20, 5);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);

    // 创建飞机
    const { group: airplane, propellerGroup } = createAirplaneWithDog();
    airplane.position.set(0, 10, 0);
    airplane.rotation.y = Math.PI; // 朝向-Z方向（屏幕深处）
    scene.add(airplane);

    // 初始化管理系统
    const chunkManager = new ChunkManager(scene);
    const cloudManager = new CloudManager(scene);

    // 初始生成区块
    chunkManager.update(airplane.position);
    cloudManager.update(airplane.position);

    // 飞行参数
    const speed = 0.3;
    const minHeight = 5;
    const maxHeight = 25;

    // 鼠标/触摸控制
    let mouseX = 0;
    let mouseY = 0;
    let targetRotationY = Math.PI;
    let targetRotationX = 0;

    const onMouseMove = (event: MouseEvent) => {
      mouseX = (event.clientX / window.innerWidth) * 2 - 1;
      mouseY = (event.clientY / window.innerHeight) * 2 - 1;
      targetRotationY = Math.PI + mouseX * 0.5;
      targetRotationX = mouseY * 0.3;
    };

    const onTouchMove = (event: TouchEvent) => {
      if (event.touches.length > 0) {
        const touch = event.touches[0];
        mouseX = (touch.clientX / window.innerWidth) * 2 - 1;
        mouseY = (touch.clientY / window.innerHeight) * 2 - 1;
        targetRotationY = Math.PI + mouseX * 0.5;
        targetRotationX = mouseY * 0.3;
      }
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('touchmove', onTouchMove);

    // 摄像机相对位置
    const cameraOffset = new THREE.Vector3(0, 5, 10);

    // 天气系统
    let isRaining = false;
    let weatherTimer = 0;

    // 创建雨滴
    const rainGeometry = new THREE.BufferGeometry();
    const rainCount = 2000;
    const positions = new Float32Array(rainCount * 3);

    for (let i = 0; i < rainCount * 3; i += 3) {
      positions[i] = (Math.random() - 0.5) * 100;
      positions[i + 1] = Math.random() * 50;
      positions[i + 2] = (Math.random() - 0.5) * 100;
    }

    rainGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const rainMaterial = new THREE.PointsMaterial({
      color: 0x6666ff,
      size: 0.1,
      transparent: true,
      opacity: 0.6
    });

    const rain = new THREE.Points(rainGeometry, rainMaterial);
    rain.visible = false;
    scene.add(rain);

    // 动画循环
    const animate = () => {
      requestAnimationFrame(animate);

      // 更新飞机旋转
      airplane.rotation.y += (targetRotationY - airplane.rotation.y) * 0.05;
      airplane.rotation.x += (targetRotationX - airplane.rotation.x) * 0.05;

      // 向前飞行（朝向飞机前方）
      const direction = new THREE.Vector3(0, 0, -1);
      direction.applyQuaternion(airplane.quaternion);
      airplane.position.add(direction.multiplyScalar(speed));

      // 高度限制
      const groundHeight = getGroundHeight(airplane.position.x, airplane.position.z);
      const minY = groundHeight + minHeight;
      const maxY = groundHeight + maxHeight;

      if (airplane.position.y < minY) airplane.position.y = minY;
      if (airplane.position.y > maxY) airplane.position.y = maxY;

      // 回调高度信息
      if (onHeightChange) {
        onHeightChange(airplane.position.y - groundHeight);
      }

      // 螺旋桨旋转
      propellerGroup.rotation.z += 0.5;

      // 更新区块和云朵
      chunkManager.update(airplane.position);
      cloudManager.update(airplane.position);

      // 天气系统
      weatherTimer++;
      if (weatherTimer > 300) {
        isRaining = !isRaining;
        rain.visible = isRaining;
        scene.background = new THREE.Color(isRaining ? 0x404050 : 0x87CEEB);
        if (onWeatherChange) onWeatherChange(isRaining);
        weatherTimer = 0;
      }

      // 雨滴动画
      if (isRaining) {
        const positions = rain.geometry.attributes.position.array as Float32Array;
        for (let i = 0; i < positions.length; i += 3) {
          positions[i + 1] -= 0.5;
          if (positions[i + 1] < 0) {
            positions[i + 1] = 50;
          }
        }
        rain.geometry.attributes.position.needsUpdate = true;
      }

      // 摄像机跟随
      const offset = cameraOffset.clone();
      offset.applyQuaternion(airplane.quaternion);
      camera.position.copy(airplane.position).add(offset);
      camera.lookAt(airplane.position);

      renderer.render(scene, camera);
    };

    animate();

    // 窗口resize处理
    const onWindowResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', onWindowResize);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('resize', onWindowResize);
      mountRef.current?.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={mountRef} style={{ width: '100vw', height: '100vh' }} />;
}
