import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as THREE from 'three';
import { 
    Maximize2, RotateCcw, Eye, Navigation, Camera as CameraIcon, 
    Layers, AlertTriangle, ShieldCheck, Sun, Compass, Play, 
    Pause, Sliders, Sparkles, X, ChevronRight, Droplets, User, Mountain,
    Plus, Crosshair, ArrowUpDown, Video, Undo2, Trash2,
    SlidersHorizontal, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Check
} from 'lucide-react';
import { toast } from 'sonner';
import type { PlantationFeature } from '../../../types';
import type { PlantationCamera } from './CameraNvrLab';
import type { 
    SandboxDroneMission, 
    SandboxSoilSensor, 
    SandboxWaterSensor, 
    SandboxWorkerGps 
} from './HardwareTestingSandboxMap';
import { 
    getElevationAtCoords, 
    getSlopeAndAspect, 
    computeTerrainViewshed, 
    checkDrone3DPathCollision,
    type HillSpineProfile,
    type SpineControlPoint,
    type PerimeterSlopeVertex,
    type PerimeterSlopeObject,
    type PhotoGpsPin,
    setActiveSpineProfilesCache,
    setActivePerimeterSlopesCache
} from '../../../utils/demTerrainViewshed';

interface Sandbox3DTerrainCanvasProps {
    plantationFeatures?: PlantationFeature[];
    cameras?: PlantationCamera[];
    droneMission?: SandboxDroneMission;
    soilSensors?: SandboxSoilSensor[];
    waterSensors?: SandboxWaterSensor[];
    workersGps?: SandboxWorkerGps[];
    selectedCameraId?: string;
    activeCameraId?: string;
    onSelectCamera?: ((cam: PlantationCamera) => void) | ((camId: any) => void);
    onSelectDevice?: (type: 'camera' | 'soil' | 'water' | 'worker' | 'drone' | 'slope_point', data: any) => void;
    onAddSpinePoint?: (coords: { lat: number; lng: number; peakHeightM?: number; widthM?: number }) => void;
    onUpdateSpinePoint?: (pointId: string, patch: Partial<SpineControlPoint>, shouldPersist?: boolean) => void;
    onUpdatePerimeterVertex?: (vertexId: string, patch: Partial<PerimeterSlopeVertex>) => void;
    onDeleteSpinePoint?: (pointId: string) => void;
    mapCenter?: [number, number];
    baseLat?: number;
    baseLng?: number;
    isKa?: boolean;
    onSwitchTo2D?: () => void;
    onSwap2d3d?: () => void;
    isMainFullView?: boolean;
    terrainKey?: number | string;
    initialViewMode?: 'orbit' | 'drone_cockpit' | 'camera_fov';
    viewMode?: any;
    spineProfile?: HillSpineProfile;
    hillSpineProfile?: HillSpineProfile;
    hillProfiles?: HillSpineProfile[];
    slopeObjects?: PerimeterSlopeObject[];
    elevationExaggeration?: number;
    hiddenCameraIds?: string[];
    isSatelliteDemLoaded?: boolean;
    terrainUpdateCounter?: number;
    onDeleteLastPoint?: () => void;
    onDeleteSlope?: () => void;
    showBaseGrid?: boolean;
    showHill1?: boolean;
    showSlope1?: boolean;
    showPhotoPins?: boolean;
    perimeterVertices?: PerimeterSlopeVertex[];
    photoPins?: PhotoGpsPin[];
    onSelectPhotoPin?: (pin: PhotoGpsPin) => void;
}

export const Sandbox3DTerrainCanvas: React.FC<Sandbox3DTerrainCanvasProps> = ({
    plantationFeatures = [],
    cameras = [],
    droneMission,
    soilSensors = [],
    waterSensors = [],
    workersGps = [],
    selectedCameraId,
    activeCameraId,
    onSelectCamera,
    onSelectDevice,
    onAddSpinePoint,
    onUpdateSpinePoint,
    onUpdatePerimeterVertex,
    mapCenter,
    baseLat: propBaseLat,
    baseLng: propBaseLng,
    isKa = false,
    onSwitchTo2D,
    onSwap2d3d,
    isMainFullView = false,
    terrainKey,
    initialViewMode = 'orbit',
    viewMode: propViewMode,
    spineProfile,
    hillSpineProfile,
    elevationExaggeration: propExaggeration,
    hiddenCameraIds = [],
    isSatelliteDemLoaded = false,
    terrainUpdateCounter,
    onDeleteLastPoint,
    onDeleteSlope,
    onDeleteSpinePoint,
    showBaseGrid = true,
    showHill1 = true,
    showSlope1 = true,
    showPhotoPins = true,
    hillProfiles = [],
    slopeObjects = [],
    perimeterVertices = [],
    photoPins = [],
    onSelectPhotoPin
}) => {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const baseLat = propBaseLat ?? (mapCenter ? mapCenter[0] : 41.9023);
    const baseLng = propBaseLng ?? (mapCenter ? mapCenter[1] : 44.5);
    const effectiveSpineProfile = hillSpineProfile || spineProfile;
    const effectiveSelectedCameraId = activeCameraId || selectedCameraId;

    // Component-level effective hills for live 3D sync & point editing
    const effectiveHills: HillSpineProfile[] = useMemo(() => {
        return (hillProfiles && hillProfiles.length > 0)
            ? hillProfiles
            : (effectiveSpineProfile ? [effectiveSpineProfile] : []);
    }, [hillProfiles, effectiveSpineProfile]);

    // View & Camera Controls
    const [viewMode, setViewMode] = useState<'orbit' | 'drone_cockpit' | 'camera_fov'>(initialViewMode);
    const [compassHeading, setCompassHeading] = useState<number>(45);

    useEffect(() => {
        if (initialViewMode) {
            setViewMode(initialViewMode);
        }
    }, [initialViewMode]);
    const [elevationExaggeration, setElevationExaggeration] = useState<number>(propExaggeration || 1.8);

    useEffect(() => {
        if (propExaggeration !== undefined) {
            setElevationExaggeration(propExaggeration);
        }
    }, [propExaggeration]);
    const [showFrustums, setShowFrustums] = useState<boolean>(true);
    const [showTerrainShadows, setShowTerrainShadows] = useState<boolean>(true);
    const [showContourGrid, setShowContourGrid] = useState<boolean>(true);
    const [activeCameraIdx, setActiveCameraIdx] = useState<number>(0);

    // Collision Warnings
    const collisionCheck = useMemo(() => {
        if (!droneMission?.waypoints || droneMission.waypoints.length === 0) {
            return { hasCollisionWarning: false, minimumClearanceM: 999 };
        }
        return checkDrone3DPathCollision(
            droneMission.waypoints,
            baseLat,
            baseLng,
            6 // 6m minimum safe clearance AGL
        );
    }, [droneMission?.waypoints, baseLat, baseLng]);

    // Three.js References
    const sceneRef = useRef<THREE.Scene | null>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
    const terrainMeshRef = useRef<THREE.Mesh | null>(null);
    const droneMeshRef = useRef<THREE.Group | null>(null);
    const rotorsRef = useRef<THREE.Mesh[]>([]);
    const reqAnimRef = useRef<number | null>(null);
    const interactiveObjectsRef = useRef<THREE.Object3D[]>([]);

    // 3D Point Addition & Slope Height/Move/Resize Drag State
    const [isAddingSlopePoint3D, setIsAddingSlopePoint3D] = useState<boolean>(false);
    const draggedPointIdRef = useRef<string | null>(null);
    const initialDragPosRef = useRef<{ clientY: number; initialHeight: number } | null>(null);
    
    interface DragOp {
        type: 'move_point' | 'resize_wing' | 'height_handle' | 'move_vertex';
        pointId: string;
        ptData?: SpineControlPoint;
        planeY: number;
        centerVec?: THREE.Vector3;
        side?: 'left' | 'right';
        initialWidth?: number;
        initialLeftW?: number;
        initialRightW?: number;
        initialHeight?: number;
        initialLat?: number;
        initialLng?: number;
        initialClientY?: number;
        vertexId?: string;
        vertexData?: PerimeterSlopeVertex;
    }
    const dragOperationRef = useRef<DragOp | null>(null);
    const [selectedEditPoint, setSelectedEditPoint] = useState<SpineControlPoint | null>(null);

    // Live synced active point being edited in 3D modal
    const activeEditPoint = useMemo(() => {
        if (!selectedEditPoint) return null;
        for (const h of effectiveHills) {
            const found = h.points?.find(p => p.id === selectedEditPoint.id);
            if (found) return found;
        }
        return selectedEditPoint;
    }, [selectedEditPoint, effectiveHills]);

    // Orbit State
    const isDraggingRef = useRef<boolean>(false);
    const dragDistanceRef = useRef<number>(0);
    const prevMousePosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
    const sphericalRef = useRef<{ radius: number; theta: number; phi: number }>({
        radius: 320,
        theta: Math.PI / 4,
        phi: Math.PI / 3.2
    });
    const targetLookAtRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 0, 0));

    // Meter per coordinate scaling
    const latRad = (baseLat * Math.PI) / 180;
    const mPerDegLat = 111111;
    const mPerDegLng = 111111 * Math.cos(latRad);

    const toLocalX = (lng: number) => (lng - baseLng) * mPerDegLng;
    const toLocalZ = (lat: number) => -(lat - baseLat) * mPerDegLat; // In Three.js: -Z is North, +X is East, +Y is Elevation

    // Helper to generate floating high-visibility 3D billboard text sprites
    const createBillboardText = (text: string, bgColor: string, textColor: string, borderColor: string): THREE.Sprite => {
        const canvas = document.createElement('canvas');
        canvas.width = 384;
        canvas.height = 80;
        const ctx = canvas.getContext('2d')!;
        
        ctx.fillStyle = bgColor;
        if (typeof ctx.roundRect === 'function') {
            ctx.roundRect(4, 4, 376, 72, 16);
            ctx.fill();
        } else {
            ctx.fillRect(4, 4, 376, 72);
        }
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = 5;
        ctx.stroke();

        ctx.fillStyle = textColor;
        ctx.font = 'bold 26px "JetBrains Mono", monospace, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, 192, 40);

        const texture = new THREE.CanvasTexture(canvas);
        texture.minFilter = THREE.LinearFilter;
        const spriteMat = new THREE.SpriteMaterial({ map: texture, depthTest: false, transparent: true });
        const sprite = new THREE.Sprite(spriteMat);
        sprite.scale.set(30, 6.5, 1);
        return sprite;
    };

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const width = container.clientWidth || 800;
        const height = container.clientHeight || 540;

        // 1. Scene Setup - Bright, clean studio daylight atmosphere
        const scene = new THREE.Scene();
        sceneRef.current = scene;
        scene.background = new THREE.Color(0x0e1726); // Modern clear slate daylight atmosphere
        scene.fog = new THREE.FogExp2(0x0e1726, 0.0004); // Crisp visibility, no dark suffocating haze

        // 2. Camera Setup
        const camera = new THREE.PerspectiveCamera(48, width / height, 1, 2500);
        cameraRef.current = camera;

        // 3. Renderer Setup
        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
        rendererRef.current = renderer;
        renderer.setSize(width, height);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        container.innerHTML = '';
        container.appendChild(renderer.domElement);

        // 4. Lighting Setup (Bright studio daylight illumination with sun, fill, bounce, and hemisphere light)
        // High ambient light to illuminate all slope facets and eliminate murky shadows
        const ambientLight = new THREE.AmbientLight(0xffffff, 1.25);
        scene.add(ambientLight);

        // Primary Sun directional light
        const sunLight = new THREE.DirectionalLight(0xfffef0, 1.9);
        sunLight.position.set(160, 280, 140);
        sunLight.castShadow = true;
        sunLight.shadow.mapSize.width = 2048;
        sunLight.shadow.mapSize.height = 2048;
        sunLight.shadow.camera.near = 10;
        sunLight.shadow.camera.far = 900;
        const d = 280;
        sunLight.shadow.camera.left = -d;
        sunLight.shadow.camera.right = d;
        sunLight.shadow.camera.top = d;
        sunLight.shadow.camera.bottom = -d;
        sunLight.shadow.bias = 0.0001;
        scene.add(sunLight);

        // Secondary Fill light from opposite quadrant (illuminates slope reverse faces and contours)
        const fillLight = new THREE.DirectionalLight(0xc7d2fe, 0.85);
        fillLight.position.set(-160, 220, -140);
        scene.add(fillLight);

        // Soft ground bounce light (brightens trenches and shaded under-slopes)
        const bounceLight = new THREE.DirectionalLight(0xdcfce7, 0.45);
        bounceLight.position.set(0, -60, 0);
        scene.add(bounceLight);

        // Sky / Ground Hemisphere light for natural ambient gradation
        const hemiLight = new THREE.HemisphereLight(0xe0f2fe, 0x334155, 1.05);
        scene.add(hemiLight);

        // 4.5 Base Grid (Flat reference plane, 30% larger than modified terrain)
        if (showBaseGrid) {
            const baseGridSpanM = 480 * 1.3; // 624m x 624m (30% larger area providing free space around relief)
            const basePlaneGeo = new THREE.PlaneGeometry(baseGridSpanM, baseGridSpanM);
            basePlaneGeo.rotateX(-Math.PI / 2);
            const basePlaneMat = new THREE.MeshStandardMaterial({
                color: 0x0f172a,
                roughness: 0.85,
                metalness: 0.12,
                side: THREE.DoubleSide
            });
            const basePlaneMesh = new THREE.Mesh(basePlaneGeo, basePlaneMat);
            basePlaneMesh.position.y = -0.6;
            basePlaneMesh.receiveShadow = true;
            scene.add(basePlaneMesh);

            // Technical Grid Overlay on Base Grid
            const gridHelper = new THREE.GridHelper(baseGridSpanM, 48, 0x0ea5e9, 0x334155);
            gridHelper.position.y = -0.3;
            scene.add(gridHelper);

            // Outer Bounding Border Line for Base Grid
            const halfSpan = baseGridSpanM / 2;
            const borderPts = [
                new THREE.Vector3(-halfSpan, -0.2, -halfSpan),
                new THREE.Vector3(halfSpan, -0.2, -halfSpan),
                new THREE.Vector3(halfSpan, -0.2, halfSpan),
                new THREE.Vector3(-halfSpan, -0.2, halfSpan),
                new THREE.Vector3(-halfSpan, -0.2, -halfSpan)
            ];
            const borderGeo = new THREE.BufferGeometry().setFromPoints(borderPts);
            const borderMat = new THREE.LineBasicMaterial({ color: 0x0ea5e9, transparent: true, opacity: 0.8, linewidth: 2.5 });
            scene.add(new THREE.Line(borderGeo, borderMat));
        }

        // 5. Generate 3D Terrain Elevation Mesh from DEM & Multi-Layer Hills & Slopes
        interactiveObjectsRef.current = [];

        // Normalize and cache active hills
        const effectiveHills: HillSpineProfile[] = (hillProfiles && hillProfiles.length > 0)
            ? hillProfiles
            : (effectiveSpineProfile ? [effectiveSpineProfile] : []);
        setActiveSpineProfilesCache(effectiveHills.filter(h => showHill1 && h.enabled));

        // Normalize and cache active slopes
        const effectiveSlopes: PerimeterSlopeObject[] = (slopeObjects && slopeObjects.length > 0)
            ? slopeObjects
            : (perimeterVertices && perimeterVertices.length > 0 ? [{
                id: 'slope_1',
                name: 'Slope 1 (Uneven Terrain)',
                enabled: showSlope1,
                vertices: perimeterVertices,
                hasRoadZeroLevel: true
            }] : []);
        setActivePerimeterSlopesCache(effectiveSlopes.filter(s => showSlope1 && s.enabled));

        const gridSize = 64;
        const terrainSpanM = 480; // 480m x 480m field
        const geometry = new THREE.PlaneGeometry(terrainSpanM, terrainSpanM, gridSize, gridSize);
        geometry.rotateX(-Math.PI / 2); // Lay flat on XZ plane

        const posAttr = geometry.attributes.position;
        const colors = new Float32Array(posAttr.count * 3);

        const baseEle = 480;

        for (let i = 0; i < posAttr.count; i++) {
            const x = posAttr.getX(i);
            const z = posAttr.getZ(i);

            const ptLng = baseLng + x / mPerDegLng;
            const ptLat = baseLat - z / mPerDegLat;

            const eleM = getElevationAtCoords(ptLat, ptLng, baseLat, baseLng, baseEle);
            const relY = (eleM - baseEle) * elevationExaggeration;
            posAttr.setY(i, relY);

            // High-contrast slope-aware terrain shading:
            // Lush orchard terrace -> golden sunlit rise -> limestone crest -> warm rock face
            const { slopeDeg } = getSlopeAndAspect(ptLat, ptLng, baseLat, baseLng);
            const normElevation = Math.max(0, Math.min(1, (eleM - baseEle) / 25));

            if (slopeDeg > 22) {
                // Steep slope / ravine: warm terracotta stone for clear edge perception
                colors[i * 3 + 0] = 0.68;
                colors[i * 3 + 1] = 0.52;
                colors[i * 3 + 2] = 0.38;
            } else if (normElevation > 0.6) {
                // High ridge / hill crest: bright sunlit golden pasture
                colors[i * 3 + 0] = 0.86;
                colors[i * 3 + 1] = 0.74;
                colors[i * 3 + 2] = 0.36;
            } else if (normElevation > 0.25) {
                // Gentle rise / terrace mound
                colors[i * 3 + 0] = 0.45;
                colors[i * 3 + 1] = 0.72;
                colors[i * 3 + 2] = 0.32;
            } else {
                // Orchard terrace: lush, vibrant agricultural green
                colors[i * 3 + 0] = 0.22;
                colors[i * 3 + 1] = 0.64;
                colors[i * 3 + 2] = 0.28;
            }
        }

        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        geometry.computeVertexNormals();

        const terrainMat = new THREE.MeshStandardMaterial({
            vertexColors: true,
            roughness: 0.65,
            metalness: 0.06,
            wireframe: false
        });

        const terrainMesh = new THREE.Mesh(geometry, terrainMat);
        terrainMesh.receiveShadow = true;
        terrainMeshRef.current = terrainMesh;
        scene.add(terrainMesh);

        // Optional wireframe contour overlay
        if (showContourGrid) {
            const wireframeMat = new THREE.MeshBasicMaterial({
                color: 0x34d399,
                wireframe: true,
                transparent: true,
                opacity: 0.08
            });
            const wireframeMesh = new THREE.Mesh(geometry, wireframeMat);
            wireframeMesh.position.y += 0.2;
            scene.add(wireframeMesh);
        }

        // 6. Draw Sectors & Trenches draped onto 3D Terrain
        const trenchLines = [
            { id: 1, x: -70 }, { id: 2, x: -35 }, { id: 3, x: 0 }, { id: 4, x: 35 }, { id: 5, x: 70 }
        ];

        trenchLines.forEach(tr => {
            const points: THREE.Vector3[] = [];
            for (let z = -140; z <= 140; z += 10) {
                const ptLat = baseLat - z / mPerDegLat;
                const ptLng = baseLng + tr.x / mPerDegLng;
                const eleY = (getElevationAtCoords(ptLat, ptLng, baseLat, baseLng, baseEle) - baseEle) * elevationExaggeration + 0.6;
                points.push(new THREE.Vector3(tr.x, eleY, z));
            }
            const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
            const lineMat = new THREE.LineDashedMaterial({
                color: tr.id === 3 ? 0x06b6d4 : 0xf59e0b,
                linewidth: 2,
                dashSize: 4,
                gapSize: 2
            });
            const line = new THREE.Line(lineGeo, lineMat);
            line.computeLineDistances();
            scene.add(line);
        });

        // 6.5 Render Multi-Layer Mound Ridge Spines, Width Cross-Sections, and Connection Points in 3D
        if (showHill1) {
            effectiveHills.forEach((hillProfile) => {
                if (!hillProfile.enabled || !hillProfile.points || hillProfile.points.length < 2) return;
                const spinePoints3D: THREE.Vector3[] = [];
                const leftHullPoints: THREE.Vector3[] = [];
                const rightHullPoints: THREE.Vector3[] = [];

                hillProfile.points.forEach((pt, idx) => {
                    const letter = String.fromCharCode(65 + idx);
                    const ptX = toLocalX(pt.lng);
                    const ptZ = toLocalZ(pt.lat);
                    const ptEle = (getElevationAtCoords(pt.lat, pt.lng, baseLat, baseLng, baseEle) - baseEle) * elevationExaggeration + 1.2;
                    const pointVec = new THREE.Vector3(ptX, ptEle, ptZ);
                    spinePoints3D.push(pointVec);

                    // 3D Connection Point Marker Sphere (Bright Yellow / Gold: Movable, Editable, Resizable)
                    const markerGeo = new THREE.SphereGeometry(3.8, 18, 18);
                    const markerMat = new THREE.MeshStandardMaterial({
                        color: 0xfbbf24,
                        emissive: 0xd97706,
                        metalness: 0.8,
                        roughness: 0.2
                    });
                    const markerMesh = new THREE.Mesh(markerGeo, markerMat);
                    markerMesh.position.copy(pointVec);
                    markerMesh.userData = { type: 'slope_point', subType: 'move_center', data: pt, hillId: hillProfile.id, pointVec, centerVec: pointVec };
                    scene.add(markerMesh);
                    interactiveObjectsRef.current.push(markerMesh);

                    // Glowing Ring around Yellow Point showing interactive editing & dragging
                    const ringGeo = new THREE.RingGeometry(4.4, 5.4, 24);
                    const ringMat = new THREE.MeshBasicMaterial({ color: 0xfef08a, side: THREE.DoubleSide, transparent: true, opacity: 0.85 });
                    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
                    ringMesh.rotation.x = Math.PI / 2;
                    ringMesh.position.copy(pointVec);
                    scene.add(ringMesh);

                    // Vertical Height Adjustment Handle (Gold Cone pointing up)
                    const heightConeGeo = new THREE.ConeGeometry(2.0, 4.2, 12);
                    const heightConeMat = new THREE.MeshStandardMaterial({
                        color: 0xfbbf24,
                        emissive: 0xd97706,
                        metalness: 0.8,
                        roughness: 0.2
                    });
                    const heightCone = new THREE.Mesh(heightConeGeo, heightConeMat);
                    heightCone.position.set(ptX, ptEle + 4.5, ptZ);
                    heightCone.userData = { type: 'slope_point', subType: 'height_handle', data: pt, hillId: hillProfile.id, centerVec: pointVec };
                    scene.add(heightCone);
                    interactiveObjectsRef.current.push(heightCone);

                    // Floating 3D Billboard Label for Slope Point
                    const widthM = pt.widthM || 40;
                    const ptLabel = createBillboardText(
                        `🏔️ ${hillProfile.name || 'Hill'} [${letter}]: +${pt.peakHeightM}m (W:${widthM}m)`,
                        '#0f172a',
                        '#fbbf24',
                        '#f59e0b'
                    );
                    ptLabel.position.set(ptX, ptEle + 8.5, ptZ);
                    scene.add(ptLabel);

                    // Vertical Elevation Guide Line (Base to Peak)
                    const baseGroundEle = (getElevationAtCoords(pt.lat, pt.lng, baseLat, baseLng, baseEle) - baseEle) * elevationExaggeration;
                    const vertGeo = new THREE.BufferGeometry().setFromPoints([
                        new THREE.Vector3(ptX, baseGroundEle, ptZ),
                        pointVec
                    ]);
                    const vertLine = new THREE.Line(vertGeo, new THREE.LineBasicMaterial({ color: 0xf59e0b, transparent: true, opacity: 0.7 }));
                    scene.add(vertLine);

                    // 3D Cross-Section Width Line at this Point
                    let dirX = 1;
                    let dirZ = 0;
                    if (idx < hillProfile.points.length - 1) {
                        const nextPt = hillProfile.points[idx + 1];
                        const dLng = toLocalX(nextPt.lng) - ptX;
                        const dLat = toLocalZ(nextPt.lat) - ptZ;
                        const len = Math.hypot(dLng, dLat) || 1;
                        dirX = -dLat / len;
                        dirZ = dLng / len;
                    } else if (idx > 0) {
                        const prevPt = hillProfile.points[idx - 1];
                        const dLng = ptX - toLocalX(prevPt.lng);
                        const dLat = ptZ - toLocalZ(prevPt.lat);
                        const len = Math.hypot(dLng, dLat) || 1;
                        dirX = -dLat / len;
                        dirZ = dLng / len;
                    }

                    const leftW = pt.leftWidthM !== undefined ? pt.leftWidthM : (widthM / 2);
                    const rightW = pt.rightWidthM !== undefined ? pt.rightWidthM : (widthM / 2);
                    
                    const leftVec = (pt.leftLat !== undefined && pt.leftLng !== undefined)
                        ? new THREE.Vector3(toLocalX(pt.leftLng), ptEle, toLocalZ(pt.leftLat))
                        : new THREE.Vector3(ptX + dirX * leftW, ptEle, ptZ + dirZ * leftW);

                    const rightVec = (pt.rightLat !== undefined && pt.rightLng !== undefined)
                        ? new THREE.Vector3(toLocalX(pt.rightLng), ptEle, toLocalZ(pt.rightLat))
                        : new THREE.Vector3(ptX - dirX * rightW, ptEle, ptZ - dirZ * rightW);

                    leftHullPoints.push(leftVec);
                    rightHullPoints.push(rightVec);

                    const widthBarGeo = new THREE.BufferGeometry().setFromPoints([leftVec, rightVec]);
                    const widthBarMat = new THREE.LineBasicMaterial({ color: 0x38bdf8, linewidth: 3 });
                    const widthBar = new THREE.Line(widthBarGeo, widthBarMat);
                    scene.add(widthBar);

                    // Interactive Left Resize Wing Handle (drag to resize width)
                    const leftWingGeo = new THREE.SphereGeometry(2.8, 16, 16);
                    const leftWingMat = new THREE.MeshStandardMaterial({
                        color: 0x06b6d4,
                        emissive: 0x0891b2,
                        metalness: 0.8,
                        roughness: 0.2
                    });
                    const leftWingMesh = new THREE.Mesh(leftWingGeo, leftWingMat);
                    leftWingMesh.position.copy(leftVec);
                    leftWingMesh.userData = {
                        type: 'slope_point',
                        subType: 'resize_wing',
                        side: 'left',
                        data: pt,
                        centerVec: pointVec,
                        hillId: hillProfile.id
                    };
                    scene.add(leftWingMesh);
                    interactiveObjectsRef.current.push(leftWingMesh);

                    // Interactive Right Resize Wing Handle (drag to resize width)
                    const rightWingGeo = new THREE.SphereGeometry(2.8, 16, 16);
                    const rightWingMat = new THREE.MeshStandardMaterial({
                        color: 0x06b6d4,
                        emissive: 0x0891b2,
                        metalness: 0.8,
                        roughness: 0.2
                    });
                    const rightWingMesh = new THREE.Mesh(rightWingGeo, rightWingMat);
                    rightWingMesh.position.copy(rightVec);
                    rightWingMesh.userData = {
                        type: 'slope_point',
                        subType: 'resize_wing',
                        side: 'right',
                        data: pt,
                        centerVec: pointVec,
                        hillId: hillProfile.id
                    };
                    scene.add(rightWingMesh);
                    interactiveObjectsRef.current.push(rightWingMesh);
                });

                // Glowing Ridge Line Tube
                try {
                    const spineCurve = new THREE.CatmullRomCurve3(spinePoints3D);
                    const spineTubeGeo = new THREE.TubeGeometry(spineCurve, 32, 1.4, 8, false);
                    const spineTubeMat = new THREE.MeshStandardMaterial({
                        color: 0xf59e0b,
                        emissive: 0xb45309,
                        roughness: 0.3
                    });
                    const spineTube = new THREE.Mesh(spineTubeGeo, spineTubeMat);
                    scene.add(spineTube);
                } catch (e) {
                    const ridgeGeo = new THREE.BufferGeometry().setFromPoints(spinePoints3D);
                    const ridgeMat = new THREE.LineBasicMaterial({ color: 0xf59e0b, linewidth: 3.5 });
                    scene.add(new THREE.Line(ridgeGeo, ridgeMat));
                }

                // 3D Perimeter Polygon Hull
                if (leftHullPoints.length > 1 && rightHullPoints.length > 1) {
                    const hullPoints3D = [...leftHullPoints, ...rightHullPoints.slice().reverse(), leftHullPoints[0]];
                    const hullGeo = new THREE.BufferGeometry().setFromPoints(hullPoints3D);
                    const hullMat = new THREE.LineBasicMaterial({ color: 0xd946ef, linewidth: 3.5 });
                    scene.add(new THREE.Line(hullGeo, hullMat));
                }
            });
        }

        // 6.7 Render Multi-Layer Perimeter-based Uneven Slopes (Multi-Point 3D Triangulated Mesh)
        if (showSlope1) {
            effectiveSlopes.forEach((slopeObj) => {
                if (!slopeObj.enabled || !slopeObj.vertices || slopeObj.vertices.length < 3) return;
                const polyPoints3D: THREE.Vector3[] = [];
                let sumX = 0, sumY = 0, sumZ = 0;

                slopeObj.vertices.forEach((v, idx) => {
                    const vx = toLocalX(v.lng);
                    const vz = toLocalZ(v.lat);
                    const baseG = (getElevationAtCoords(v.lat, v.lng, baseLat, baseLng, baseEle) - baseEle) * elevationExaggeration;
                    const vy = baseG + (v.elevationOffsetM || 0) * elevationExaggeration + 0.5;
                    const vec = new THREE.Vector3(vx, vy, vz);
                    polyPoints3D.push(vec);
                    sumX += vx;
                    sumY += vy;
                    sumZ += vz;

                    // 3D Control Vertex Marker (Spherical Handle)
                    const vGeo = new THREE.SphereGeometry(3.0, 16, 16);
                    const vMat = new THREE.MeshStandardMaterial({
                        color: 0xd946ef,
                        emissive: 0xa21caf,
                        roughness: 0.2,
                        metalness: 0.8
                    });
                    const vMesh = new THREE.Mesh(vGeo, vMat);
                    vMesh.position.copy(vec);
                    vMesh.userData = { type: 'perimeter_vertex', data: v, index: idx, slopeId: slopeObj.id };
                    scene.add(vMesh);
                    interactiveObjectsRef.current.push(vMesh);

                    // Vertical stalk to ground
                    const stalkGeo = new THREE.BufferGeometry().setFromPoints([
                        new THREE.Vector3(vx, baseG, vz),
                        vec
                    ]);
                    const stalkMat = new THREE.LineBasicMaterial({ color: 0xd946ef, transparent: true, opacity: 0.8 });
                    scene.add(new THREE.Line(stalkGeo, stalkMat));

                    // 3D Billboard Label for Vertex
                    const vLabel = createBillboardText(
                        `${slopeObj.name || 'Slope'} V${idx + 1}: +${v.elevationOffsetM}m`,
                        '#3b0764',
                        '#f0abfc',
                        '#c026d3'
                    );
                    vLabel.position.set(vx, vy + 6, vz);
                    scene.add(vLabel);
                });

                // Centroid
                const n = slopeObj.vertices.length;
                const centroid = new THREE.Vector3(sumX / n, sumY / n + 1.5, sumZ / n);

                // Generate 3D Triangulated Mesh (Triangle Fan from Centroid to Vertices)
                const triGeo = new THREE.BufferGeometry();
                const positions: number[] = [];
                const colorsArr: number[] = [];

                for (let i = 0; i < n; i++) {
                    const p1 = polyPoints3D[i];
                    const p2 = polyPoints3D[(i + 1) % n];

                    positions.push(centroid.x, centroid.y, centroid.z);
                    positions.push(p1.x, p1.y, p1.z);
                    positions.push(p2.x, p2.y, p2.z);

                    // Gradient vertex colors
                    colorsArr.push(0.7, 0.2, 0.85);
                    colorsArr.push(0.3, 0.7, 0.9);
                    colorsArr.push(0.4, 0.8, 0.5);
                }

                triGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
                triGeo.setAttribute('color', new THREE.Float32BufferAttribute(colorsArr, 3));
                triGeo.computeVertexNormals();

                const triMat = new THREE.MeshStandardMaterial({
                    vertexColors: true,
                    roughness: 0.5,
                    metalness: 0.25,
                    side: THREE.DoubleSide,
                    transparent: true,
                    opacity: 0.82
                });
                const triMesh = new THREE.Mesh(triGeo, triMat);
                triMesh.receiveShadow = true;
                triMesh.castShadow = true;
                scene.add(triMesh);

                // Glowing Perimeter Outline Wire
                const closedLoop = [...polyPoints3D, polyPoints3D[0]];
                const outlineGeo = new THREE.BufferGeometry().setFromPoints(closedLoop);
                const outlineMat = new THREE.LineBasicMaterial({ color: 0xf0abfc, linewidth: 3.5 });
                scene.add(new THREE.Line(outlineGeo, outlineMat));
            });
        }

        // 7. Cameras with 3D Frustum Cones & Terrain Slope Shadows
        cameras.forEach((cam, idx) => {
            if (hiddenCameraIds.includes(cam.id)) return;
            if (!cam || !cam.lat || !cam.lng || isNaN(cam.lat) || isNaN(cam.lng)) return;
            const isSelected = effectiveSelectedCameraId === cam.id;
            const localX = toLocalX(cam.lng);
            const localZ = toLocalZ(cam.lat);
            const groundZ = (getElevationAtCoords(cam.lat, cam.lng, baseLat, baseLng, baseEle) - baseEle) * elevationExaggeration;
            const poleHeight = Math.max(16, (cam.mountHeightM || 8) * 1.8 * elevationExaggeration);

            // Tall Glowing Sky Beacon Light Beam (makes cameras immediately visible across 3D terrain!)
            const beamGeo = new THREE.CylinderGeometry(0.35, 0.35, 55, 8);
            const beamMat = new THREE.MeshBasicMaterial({
                color: isSelected ? 0x10b981 : 0x06b6d4,
                transparent: true,
                opacity: 0.65
            });
            const beam = new THREE.Mesh(beamGeo, beamMat);
            beam.position.set(localX, groundZ + poleHeight + 28, localZ);
            scene.add(beam);

            // Highly visible Camera Mast / Tower
            const poleGeo = new THREE.CylinderGeometry(isSelected ? 1.5 : 1.1, isSelected ? 1.9 : 1.4, poleHeight, 12);
            const poleMat = new THREE.MeshStandardMaterial({ 
                color: isSelected ? 0x10b981 : 0x0284c7, 
                metalness: 0.7, 
                roughness: 0.3,
                emissive: isSelected ? 0x059669 : 0x0369a1
            });
            const pole = new THREE.Mesh(poleGeo, poleMat);
            pole.position.set(localX, groundZ + poleHeight / 2, localZ);
            pole.castShadow = true;
            pole.userData = { type: 'camera', data: cam };
            scene.add(pole);
            interactiveObjectsRef.current.push(pole);

            // Top Glowing Pulsing Beacon Orb
            const beaconGeo = new THREE.SphereGeometry(3.5, 16, 16);
            const beaconMat = new THREE.MeshStandardMaterial({
                color: 0x38bdf8,
                emissive: isSelected ? 0x10b981 : 0x06b6d4,
                roughness: 0.1,
                metalness: 0.9
            });
            const beacon = new THREE.Mesh(beaconGeo, beaconMat);
            beacon.position.set(localX, groundZ + poleHeight + 2.5, localZ);
            scene.add(beacon);

            // Ground Target Ring
            const ringGeo = new THREE.RingGeometry(8, 11, 24);
            ringGeo.rotateX(-Math.PI / 2);
            const ringMat = new THREE.MeshBasicMaterial({ color: 0x06b6d4, side: THREE.DoubleSide, transparent: true, opacity: 0.75 });
            const groundRing = new THREE.Mesh(ringGeo, ringMat);
            groundRing.position.set(localX, groundZ + 0.4, localZ);
            scene.add(groundRing);

            // Camera Housing & Lens
            const headGeo = new THREE.BoxGeometry(isSelected ? 3.5 : 2.8, isSelected ? 2.5 : 2.0, isSelected ? 4.5 : 3.6);
            const headMat = new THREE.MeshStandardMaterial({ 
                color: isSelected ? 0x10b981 : 0x2563eb, 
                metalness: 0.8, 
                roughness: 0.2,
                emissive: isSelected ? 0x047857 : 0x1e3a8a
            });
            const head = new THREE.Mesh(headGeo, headMat);
            head.position.set(localX, groundZ + poleHeight, localZ);
            head.rotation.y = -(cam.azimuthDeg * Math.PI) / 180;
            head.userData = { type: 'camera', data: cam };
            scene.add(head);
            interactiveObjectsRef.current.push(head);

            // Floating 3D Billboard Label for Camera
            const camLabel = createBillboardText(
                `📹 [CH0${cam.channel}] ${cam.name}`,
                '#020617',
                '#38bdf8',
                '#0284c7'
            );
            camLabel.position.set(localX, groundZ + poleHeight + 8, localZ);
            scene.add(camLabel);

            // 3D FRUSTUM PYRAMID (Raycast Viewshed Visualization)
            if (showFrustums) {
                const viewshed = computeTerrainViewshed(
                    {
                        id: cam.id,
                        name: cam.name,
                        lat: cam.lat,
                        lng: cam.lng,
                        mountHeightM: cam.mountHeightM || 6,
                        azimuthDeg: cam.azimuthDeg || 0,
                        tiltAngleDeg: cam.tiltAngleDeg || 4,
                        fovAngleDeg: cam.fovAngleDeg || 95,
                        rangeM: cam.rangeM || 75
                    },
                    baseLat,
                    baseLng,
                    24
                );

                const apex = new THREE.Vector3(localX, groundZ + poleHeight, localZ);
                const corners = viewshed.frustum3DVertices.slice(1).map(c => {
                    return new THREE.Vector3(c[0], (c[2] - baseEle) * elevationExaggeration, -c[1]);
                });

                if (corners.length >= 4) {
                    const frustumGeo = new THREE.BufferGeometry();
                    const vertices = [
                        // 4 Triangular Side Faces
                        apex.x, apex.y, apex.z, corners[0].x, corners[0].y, corners[0].z, corners[1].x, corners[1].y, corners[1].z,
                        apex.x, apex.y, apex.z, corners[1].x, corners[1].y, corners[1].z, corners[2].x, corners[2].y, corners[2].z,
                        apex.x, apex.y, apex.z, corners[2].x, corners[2].y, corners[2].z, corners[3].x, corners[3].y, corners[3].z,
                        apex.x, apex.y, apex.z, corners[3].x, corners[3].y, corners[3].z, corners[0].x, corners[0].y, corners[0].z,
                        // Far Rectangular Base
                        corners[0].x, corners[0].y, corners[0].z, corners[2].x, corners[2].y, corners[2].z, corners[1].x, corners[1].y, corners[1].z,
                        corners[0].x, corners[0].y, corners[0].z, corners[3].x, corners[3].y, corners[3].z, corners[2].x, corners[2].y, corners[2].z
                    ];
                    frustumGeo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
                    frustumGeo.computeVertexNormals();

                    const frustumMat = new THREE.MeshBasicMaterial({
                        color: idx === 0 ? 0x3b82f6 : 0x10b981,
                        transparent: true,
                        opacity: 0.16,
                        side: THREE.DoubleSide
                    });

                    const frustumMesh = new THREE.Mesh(frustumGeo, frustumMat);
                    scene.add(frustumMesh);

                    // Wireframe outline of the 3D Frustum
                    const edgesGeo = new THREE.EdgesGeometry(frustumGeo);
                    const edgesMat = new THREE.LineBasicMaterial({
                        color: idx === 0 ? 0x60a5fa : 0x34d399,
                        transparent: true,
                        opacity: 0.4
                    });
                    const wireFrustum = new THREE.LineSegments(edgesGeo, edgesMat);
                    scene.add(wireFrustum);
                }

                // If slope shadow was detected, drape a red Blind Zone patch on the ground
                if (showTerrainShadows && viewshed.slopeShadowDetected && viewshed.blindZoneGroundPolygons.length > 0) {
                    const shadowPoints: THREE.Vector3[] = [];
                    viewshed.blindZoneGroundPolygons.forEach(arc => {
                        const pt1 = arc[0];
                        const pt2 = arc[1];
                        const pX = toLocalX((pt1[1] + pt2[1]) / 2);
                        const pZ = toLocalZ((pt1[0] + pt2[0]) / 2);
                        const pY = (getElevationAtCoords((pt1[0] + pt2[0]) / 2, (pt1[1] + pt2[1]) / 2, baseLat, baseLng, baseEle) - baseEle) * elevationExaggeration + 0.8;
                        shadowPoints.push(new THREE.Vector3(pX, pY, pZ));
                    });

                    const shadowGeo = new THREE.BufferGeometry().setFromPoints(shadowPoints);
                    const shadowMat = new THREE.PointsMaterial({
                        color: 0xef4444,
                        size: 3.5,
                        transparent: true,
                        opacity: 0.85
                    });
                    const shadowPointsMesh = new THREE.Points(shadowGeo, shadowMat);
                    scene.add(shadowPointsMesh);
                }
            }
        });

        // 7.1 Soil Sensors in 3D Space
        soilSensors.forEach((soil) => {
            const sX = toLocalX(soil.lng);
            const sZ = toLocalZ(soil.lat);
            const sGround = (getElevationAtCoords(soil.lat, soil.lng, baseLat, baseLng, baseEle) - baseEle) * elevationExaggeration;

            const group = new THREE.Group();
            group.position.set(sX, sGround, sZ);
            group.userData = { type: 'soil', data: soil };

            // Ground spike
            const spikeGeo = new THREE.CylinderGeometry(0.35, 0.1, 3.5, 8);
            const spikeMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8 });
            const spike = new THREE.Mesh(spikeGeo, spikeMat);
            spike.position.y = 1.2;
            group.add(spike);

            // Soil sensor head probe
            const headGeo = new THREE.CylinderGeometry(1.2, 1.2, 1.8, 12);
            const headMat = new THREE.MeshStandardMaterial({
                color: 0x10b981,
                emissive: 0x059669,
                metalness: 0.5,
                roughness: 0.2
            });
            const head = new THREE.Mesh(headGeo, headMat);
            head.position.y = 2.8;
            head.userData = { type: 'soil', data: soil };
            group.add(head);

            // Ground locator ring
            const ringGeo = new THREE.RingGeometry(2.4, 3.0, 16);
            ringGeo.rotateX(-Math.PI / 2);
            const ringMat = new THREE.MeshBasicMaterial({ color: 0x10b981, transparent: true, opacity: 0.45, side: THREE.DoubleSide });
            const ring = new THREE.Mesh(ringGeo, ringMat);
            ring.position.y = 0.2;
            group.add(ring);

            scene.add(group);
            interactiveObjectsRef.current.push(head);
        });

        // 7.2 Water Sensors in 3D Space
        waterSensors.forEach((w) => {
            const wX = toLocalX(w.lng);
            const wZ = toLocalZ(w.lat);
            const wGround = (getElevationAtCoords(w.lat, w.lng, baseLat, baseLng, baseEle) - baseEle) * elevationExaggeration;

            const group = new THREE.Group();
            group.position.set(wX, wGround, wZ);
            group.userData = { type: 'water', data: w };

            // Water station housing
            const cabGeo = new THREE.BoxGeometry(2.4, 3.2, 2.4);
            const cabMat = new THREE.MeshStandardMaterial({
                color: 0x0284c7,
                emissive: 0x0369a1,
                metalness: 0.7,
                roughness: 0.3
            });
            const cab = new THREE.Mesh(cabGeo, cabMat);
            cab.position.y = 1.6;
            cab.userData = { type: 'water', data: w };
            group.add(cab);

            // Flow pipe
            const pipeGeo = new THREE.CylinderGeometry(0.5, 0.5, 4.2, 8);
            pipeGeo.rotateZ(Math.PI / 2);
            const pipeMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, metalness: 0.8 });
            const pipe = new THREE.Mesh(pipeGeo, pipeMat);
            pipe.position.set(0, 1.2, 0);
            group.add(pipe);

            // Ground ring
            const ringGeo = new THREE.RingGeometry(2.6, 3.4, 16);
            ringGeo.rotateX(-Math.PI / 2);
            const ringMat = new THREE.MeshBasicMaterial({ color: 0x0284c7, transparent: true, opacity: 0.45, side: THREE.DoubleSide });
            const ring = new THREE.Mesh(ringGeo, ringMat);
            ring.position.y = 0.2;
            group.add(ring);

            scene.add(group);
            interactiveObjectsRef.current.push(cab);
        });

        // 7.3 Workers GPS in 3D Space
        workersGps.forEach((wrk) => {
            const wrkX = toLocalX(wrk.lng);
            const wrkZ = toLocalZ(wrk.lat);
            const wrkGround = (getElevationAtCoords(wrk.lat, wrk.lng, baseLat, baseLng, baseEle) - baseEle) * elevationExaggeration;

            const group = new THREE.Group();
            group.position.set(wrkX, wrkGround, wrkZ);
            group.userData = { type: 'worker', data: wrk };

            // High-vis vest body
            const bodyGeo = new THREE.CylinderGeometry(0.9, 0.7, 2.5, 8);
            const bodyMat = new THREE.MeshStandardMaterial({
                color: 0xf97316,
                emissive: 0xc2410c,
                metalness: 0.2,
                roughness: 0.6
            });
            const body = new THREE.Mesh(bodyGeo, bodyMat);
            body.position.y = 1.5;
            body.userData = { type: 'worker', data: wrk };
            group.add(body);

            // Yellow hardhat
            const hatGeo = new THREE.SphereGeometry(0.75, 8, 8);
            const hatMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, emissive: 0xa16207 });
            const hat = new THREE.Mesh(hatGeo, hatMat);
            hat.position.y = 3.2;
            group.add(hat);

            // Ground locator ring
            const ringGeo = new THREE.RingGeometry(2.2, 2.8, 16);
            ringGeo.rotateX(-Math.PI / 2);
            const ringMat = new THREE.MeshBasicMaterial({ color: 0xa855f7, transparent: true, opacity: 0.5, side: THREE.DoubleSide });
            const ring = new THREE.Mesh(ringGeo, ringMat);
            ring.position.y = 0.2;
            group.add(ring);

            scene.add(group);
            interactiveObjectsRef.current.push(body);
        });

        // 7.4 Photo Pins in 3D Space (Field Inspection Photos with Viewing Angle Cones)
        if (showPhotoPins && photoPins && photoPins.length > 0) {
            photoPins.forEach((pin) => {
                const px = toLocalX(pin.lng);
                const pz = toLocalZ(pin.lat);
                const groundY = (getElevationAtCoords(pin.lat, pin.lng, baseLat, baseLng, baseEle) - baseEle) * elevationExaggeration;
                const pinHeight = 14;

                const pinGroup = new THREE.Group();
                pinGroup.position.set(px, groundY, pz);
                pinGroup.userData = { type: 'photo_pin', data: pin };

                // Mast / Pole
                const poleGeo = new THREE.CylinderGeometry(0.5, 0.7, pinHeight, 8);
                const poleMat = new THREE.MeshStandardMaterial({
                    color: 0x06b6d4,
                    metalness: 0.8,
                    roughness: 0.2,
                    emissive: 0x0891b2
                });
                const pole = new THREE.Mesh(poleGeo, poleMat);
                pole.position.y = pinHeight / 2;
                pole.userData = { type: 'photo_pin', data: pin };
                pinGroup.add(pole);

                // Camera Orb Beacon
                const orbGeo = new THREE.SphereGeometry(2.6, 16, 16);
                const orbMat = new THREE.MeshStandardMaterial({
                    color: 0x38bdf8,
                    emissive: 0x0284c7,
                    roughness: 0.1,
                    metalness: 0.9
                });
                const orb = new THREE.Mesh(orbGeo, orbMat);
                orb.position.y = pinHeight + 1.8;
                orb.userData = { type: 'photo_pin', data: pin };
                pinGroup.add(orb);

                // Directional 3D Viewing Cone (Field of View at compass heading)
                const azimuthRad = -(pin.azimuthDeg * Math.PI) / 180;
                const fovRad = ((pin.fovDeg || 60) * Math.PI) / 180;
                const coneLength = 30;

                const coneGeo = new THREE.ConeGeometry(coneLength * Math.tan(fovRad / 2), coneLength, 16, 1, true);
                coneGeo.rotateX(Math.PI / 2);
                const coneMat = new THREE.MeshBasicMaterial({
                    color: 0x38bdf8,
                    transparent: true,
                    opacity: 0.28,
                    side: THREE.DoubleSide
                });
                const coneMesh = new THREE.Mesh(coneGeo, coneMat);
                coneMesh.position.y = pinHeight + 1.8;
                coneMesh.rotation.y = azimuthRad;
                pinGroup.add(coneMesh);

                // Directional Ground Arrow
                const arrowLen = 24;
                const targetX = Math.sin((pin.azimuthDeg * Math.PI) / 180) * arrowLen;
                const targetZ = -Math.cos((pin.azimuthDeg * Math.PI) / 180) * arrowLen;
                const arrowGeo = new THREE.BufferGeometry().setFromPoints([
                    new THREE.Vector3(0, 0.4, 0),
                    new THREE.Vector3(targetX, 0.4, targetZ)
                ]);
                const arrowMat = new THREE.LineBasicMaterial({ color: 0x38bdf8, linewidth: 2.5 });
                pinGroup.add(new THREE.Line(arrowGeo, arrowMat));

                // Floating 3D Billboard Label for Photo Pin
                const pLabel = createBillboardText(
                    `📷 ${pin.name || 'Photo'} (${pin.azimuthDeg}°)`,
                    '#082f49',
                    '#7dd3fc',
                    '#0284c7'
                );
                pLabel.position.set(0, pinHeight + 7, 0);
                pinGroup.add(pLabel);

                scene.add(pinGroup);
                interactiveObjectsRef.current.push(orb);
                interactiveObjectsRef.current.push(pole);
            });
        }

        // 8. 3D Drone Quadcopter Model & 3D Flight Path
        const droneGroup = new THREE.Group();
        droneMeshRef.current = droneGroup;

        // Central Carbon Frame
        const frameGeo = new THREE.CylinderGeometry(2, 2.4, 0.8, 8);
        const frameMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.3 });
        const frameMesh = new THREE.Mesh(frameGeo, frameMat);
        frameMesh.userData = { type: 'drone', data: droneMission };
        droneGroup.add(frameMesh);
        interactiveObjectsRef.current.push(frameMesh);

        // 4 Rotor Arms
        const armGeo = new THREE.BoxGeometry(0.4, 0.3, 7);
        const armMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8 });
        const arm1 = new THREE.Mesh(armGeo, armMat);
        arm1.rotation.y = Math.PI / 4;
        const arm2 = new THREE.Mesh(armGeo, armMat);
        arm2.rotation.y = -Math.PI / 4;
        droneGroup.add(arm1, arm2);

        // 4 Spinning Rotors
        const rotors: THREE.Mesh[] = [];
        const rotorGeo = new THREE.BoxGeometry(3.6, 0.05, 0.4);
        const rotorMat = new THREE.MeshBasicMaterial({ color: 0x06b6d4, transparent: true, opacity: 0.7 });

        [[-2.5, 2.5], [2.5, 2.5], [2.5, -2.5], [-2.5, -2.5]].forEach(([rx, rz]) => {
            const rotor = new THREE.Mesh(rotorGeo, rotorMat);
            rotor.position.set(rx, 0.6, rz);
            droneGroup.add(rotor);
            rotors.push(rotor);
        });
        rotorsRef.current = rotors;

        // Drone Gimbal 4K Camera Lens
        const gimbalGeo = new THREE.SphereGeometry(0.8, 8, 8);
        const gimbalMat = new THREE.MeshStandardMaterial({ color: 0x06b6d4, emissive: 0x0891b2 });
        const gimbal = new THREE.Mesh(gimbalGeo, gimbalMat);
        gimbal.position.set(0, -0.6, 1.2);
        droneGroup.add(gimbal);

        scene.add(droneGroup);

        // 3D Flight Route Line (Suspended in air at altitude AGL)
        if (droneMission && droneMission.waypoints && droneMission.waypoints.length > 1) {
            const flightPoints = droneMission.waypoints.map(w => {
                const wX = toLocalX(w.lng);
                const wZ = toLocalZ(w.lat);
                const groundEle = (getElevationAtCoords(w.lat, w.lng, baseLat, baseLng, baseEle) - baseEle) * elevationExaggeration;
                const droneAlt = (w.altM || 35) * elevationExaggeration;
                return new THREE.Vector3(wX, groundEle + droneAlt, wZ);
            });

            const pathGeo = new THREE.BufferGeometry().setFromPoints(flightPoints);
            const pathMat = new THREE.LineBasicMaterial({
                color: 0x06b6d4,
                linewidth: 3,
                transparent: true,
                opacity: 0.8
            });
            const pathLine = new THREE.Line(pathGeo, pathMat);
            scene.add(pathLine);
        }

        // 9. Position Drone on Initial Coordinate
        const currentDroneLat = droneMission?.currentLat || baseLat;
        const currentDroneLng = droneMission?.currentLng || baseLng;
        const initialDroneX = toLocalX(currentDroneLng);
        const initialDroneZ = toLocalZ(currentDroneLat);
        const groundUnderDrone = (getElevationAtCoords(currentDroneLat, currentDroneLng, baseLat, baseLng, baseEle) - baseEle) * elevationExaggeration;
        droneGroup.position.set(initialDroneX, groundUnderDrone + (droneMission?.currentAlt || 35) * elevationExaggeration, initialDroneZ);

        // 10. Animation & Render Loop
        const animate = () => {
            reqAnimRef.current = requestAnimationFrame(animate);

            // Spin Drone Rotors
            rotorsRef.current.forEach((r, idx) => {
                r.rotation.y += (idx % 2 === 0 ? 0.35 : -0.35);
            });

            // Update Drone Position & Gimbal in 3D Space
            if (droneMeshRef.current && droneMission) {
                const dX = toLocalX(droneMission.currentLng || currentDroneLng);
                const dZ = toLocalZ(droneMission.currentLat || currentDroneLat);
                const dGround = (getElevationAtCoords(droneMission.currentLat || currentDroneLat, droneMission.currentLng || currentDroneLng, baseLat, baseLng, baseEle) - baseEle) * elevationExaggeration;
                const dY = dGround + (droneMission.currentAlt || 35) * elevationExaggeration;

                droneMeshRef.current.position.set(dX, dY, dZ);
                droneMeshRef.current.rotation.y = -((droneMission.directionDeg || 0) * Math.PI) / 180;
            }

            // Camera View Modes: Orbit vs Drone Cockpit View vs Camera Lens View
            if (viewMode === 'drone_cockpit' && droneMeshRef.current) {
                const dPos = droneMeshRef.current.position;
                const fwdX = Math.sin(-droneMeshRef.current.rotation.y);
                const fwdZ = Math.cos(-droneMeshRef.current.rotation.y);

                camera.position.set(dPos.x - fwdX * 12, dPos.y + 6, dPos.z - fwdZ * 12);
                camera.lookAt(dPos.x + fwdX * 30, dPos.y - 10, dPos.z + fwdZ * 30);
            } else if (viewMode === 'camera_fov' && cameras[activeCameraIdx]) {
                const cam = cameras[activeCameraIdx];
                const cX = toLocalX(cam.lng);
                const cZ = toLocalZ(cam.lat);
                const cGround = (getElevationAtCoords(cam.lat, cam.lng, baseLat, baseLng, baseEle) - baseEle) * elevationExaggeration;
                const cY = cGround + (cam.mountHeightM || 6) * elevationExaggeration;

                camera.position.set(cX, cY, cZ);
                const azRad = ((cam.azimuthDeg || 0) * Math.PI) / 180;
                const tiltRad = ((cam.tiltAngleDeg || 4) * Math.PI) / 180;
                camera.lookAt(
                    cX + Math.sin(azRad) * 100,
                    cY - Math.sin(tiltRad) * 100,
                    cZ - Math.cos(azRad) * 100
                );
            } else {
                // Orbit View
                const { radius, theta, phi } = sphericalRef.current;
                const target = targetLookAtRef.current;

                camera.position.x = target.x + radius * Math.sin(phi) * Math.sin(theta);
                camera.position.y = target.y + radius * Math.cos(phi);
                camera.position.z = target.z + radius * Math.sin(phi) * Math.cos(theta);
                camera.lookAt(target);
            }

            renderer.render(scene, camera);
        };

        animate();

        // 11. Resize Handler
        const handleResize = () => {
            if (!containerRef.current || !renderer || !camera) return;
            const w = containerRef.current.clientWidth;
            const h = containerRef.current.clientHeight;
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
            renderer.setSize(w, h);
        };

        // Synchronous Live Mesh Vertex Update (Real-time redraw on line/point movements without recreating scene)
        const syncUpdateTerrainMesh = () => {
            if (!terrainMeshRef.current) return;
            const geo = terrainMeshRef.current.geometry as THREE.BufferGeometry;
            const pos = geo.attributes.position;
            const col = geo.attributes.color;
            const colorsArray = col?.array as Float32Array;
            const bEle = 480;

            for (let i = 0; i < pos.count; i++) {
                const x = pos.getX(i);
                const z = pos.getZ(i);
                const ptLng = baseLng + x / mPerDegLng;
                const ptLat = baseLat - z / mPerDegLat;
                const eleM = getElevationAtCoords(ptLat, ptLng, baseLat, baseLng, bEle);
                const relY = (eleM - bEle) * elevationExaggeration;
                pos.setY(i, relY);

                if (colorsArray) {
                    const { slopeDeg } = getSlopeAndAspect(ptLat, ptLng, baseLat, baseLng);
                    const normElevation = Math.max(0, Math.min(1, (eleM - bEle) / 25));
                    if (slopeDeg > 22) {
                        colorsArray[i * 3 + 0] = 0.45;
                        colorsArray[i * 3 + 1] = 0.38;
                        colorsArray[i * 3 + 2] = 0.30;
                    } else if (normElevation > 0.6) {
                        colorsArray[i * 3 + 0] = 0.22;
                        colorsArray[i * 3 + 1] = 0.55;
                        colorsArray[i * 3 + 2] = 0.24;
                    } else {
                        colorsArray[i * 3 + 0] = 0.12;
                        colorsArray[i * 3 + 1] = 0.42;
                        colorsArray[i * 3 + 2] = 0.20;
                    }
                }
            }
            pos.needsUpdate = true;
            if (col) col.needsUpdate = true;
            geo.computeVertexNormals();
        };

        window.addEventListener('agrimap:terrain_mesh_sync', syncUpdateTerrainMesh);
        window.addEventListener('agrimap:terrain_slope_updated', syncUpdateTerrainMesh);

        return () => {
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('agrimap:terrain_mesh_sync', syncUpdateTerrainMesh);
            window.removeEventListener('agrimap:terrain_slope_updated', syncUpdateTerrainMesh);
            if (reqAnimRef.current) cancelAnimationFrame(reqAnimRef.current);
            renderer.dispose();
            geometry.dispose();
            terrainMat.dispose();
        };
    }, [
        baseLat, baseLng, elevationExaggeration, showFrustums, 
        showTerrainShadows, showContourGrid, viewMode, activeCameraIdx, cameras, terrainKey,
        selectedCameraId, activeCameraId, effectiveSpineProfile, soilSensors, waterSensors,
        workersGps, droneMission, hiddenCameraIds, terrainUpdateCounter, isSatelliteDemLoaded
    ]);

    // Focus 3D View on Surveillance Cameras
    const handleFocusCameras = () => {
        if (!cameras || cameras.length === 0) {
            toast.info(isKa ? 'კამერები არ არის დამატებული' : 'No cameras placed on map');
            return;
        }
        const validCams = cameras.filter(c => c.lat && c.lng && !isNaN(c.lat) && !isNaN(c.lng));
        if (validCams.length === 0) return;
        const avgX = validCams.reduce((s, c) => s + toLocalX(c.lng), 0) / validCams.length;
        const avgZ = validCams.reduce((s, c) => s + toLocalZ(c.lat), 0) / validCams.length;
        targetLookAtRef.current.set(avgX, 15, avgZ);
        sphericalRef.current = {
            radius: 130,
            theta: Math.PI / 4,
            phi: Math.PI / 3.4
        };
        setViewMode('orbit');
        toast.info(isKa ? 'კამერები ცენტრშია' : 'Framed surveillance cameras in 3D');
    };

    // Mouse Drag Orbit Controls & 3D Click Raycaster
    const handleMouseDown = (e: React.MouseEvent) => {
        dragDistanceRef.current = 0;

        // Check if user clicked on interactive 3D slope point, height cone, or resize wing
        if (rendererRef.current && cameraRef.current) {
            const rect = rendererRef.current.domElement.getBoundingClientRect();
            const mouseX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
            const mouseY = -((e.clientY - rect.top) / rect.height) * 2 + 1;
            const raycaster = new THREE.Raycaster();
            raycaster.setFromCamera(new THREE.Vector2(mouseX, mouseY), cameraRef.current);
            const hits = raycaster.intersectObjects(interactiveObjectsRef.current, true);
            if (hits.length > 0) {
                let obj: THREE.Object3D | null = hits[0].object;
                while (obj && !obj.userData?.type && obj.parent) {
                    obj = obj.parent;
                }
                if (obj && obj.userData?.type === 'slope_point') {
                    const subType = obj.userData.subType || 'move_center';
                    const pt = obj.userData.data as SpineControlPoint;
                    const centerVec = obj.userData.centerVec || obj.userData.pointVec;
                    const planeY = (centerVec?.y !== undefined) ? centerVec.y : (obj.position.y || 0);

                    dragOperationRef.current = {
                        type: subType === 'resize_wing' ? 'resize_wing' : subType === 'height_handle' ? 'height_handle' : 'move_point',
                        pointId: pt.id,
                        ptData: pt,
                        planeY,
                        centerVec,
                        side: obj.userData.side,
                        initialWidth: pt.widthM || 45,
                        initialLeftW: pt.leftWidthM ?? (pt.widthM ? pt.widthM / 2 : 22.5),
                        initialRightW: pt.rightWidthM ?? (pt.widthM ? pt.widthM / 2 : 22.5),
                        initialHeight: pt.peakHeightM || 25,
                        initialLat: pt.lat,
                        initialLng: pt.lng,
                        initialClientY: e.clientY
                    };
                    isDraggingRef.current = true;
                    prevMousePosRef.current = { x: e.clientX, y: e.clientY };
                    return;
                }
                if (obj && obj.userData?.type === 'perimeter_vertex') {
                    const v = obj.userData.data as PerimeterSlopeVertex;
                    dragOperationRef.current = {
                        type: 'move_vertex',
                        pointId: v.id,
                        vertexId: v.id,
                        vertexData: v,
                        planeY: obj.position.y || 0,
                        initialHeight: v.elevationOffsetM,
                        initialClientY: e.clientY
                    };
                    isDraggingRef.current = true;
                    prevMousePosRef.current = { x: e.clientX, y: e.clientY };
                    return;
                }
            }
        }

        if (viewMode !== 'orbit') return;
        isDraggingRef.current = true;
        prevMousePosRef.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDraggingRef.current) return;
        const dx = e.clientX - prevMousePosRef.current.x;
        const dy = e.clientY - prevMousePosRef.current.y;
        dragDistanceRef.current += Math.abs(dx) + Math.abs(dy);
        prevMousePosRef.current = { x: e.clientX, y: e.clientY };

        // Handle Active 3D Drag Operation (Move Point on Ground Plane, Resize Wings, Height Cone, Move Vertex)
        if (dragOperationRef.current && rendererRef.current && cameraRef.current) {
            const dragOp = dragOperationRef.current;
            const rect = rendererRef.current.domElement.getBoundingClientRect();
            const mouseX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
            const mouseY = -((e.clientY - rect.top) / rect.height) * 2 + 1;
            const raycaster = new THREE.Raycaster();
            raycaster.setFromCamera(new THREE.Vector2(mouseX, mouseY), cameraRef.current);

            if (dragOp.type === 'move_point') {
                if (e.shiftKey) {
                    // Holding Shift drags elevation vertically
                    const vertDy = (dragOp.initialClientY ?? e.clientY) - e.clientY;
                    const newHeight = Math.max(2, Math.min(100, Math.round((dragOp.initialHeight || 25) + vertDy * 0.4)));
                    if (onUpdateSpinePoint) {
                        onUpdateSpinePoint(dragOp.pointId, { peakHeightM: newHeight }, false);
                    }
                } else {
                    // Dragging horizontally on ground plane to relocate point
                    const dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -dragOp.planeY);
                    const planeIntersect = new THREE.Vector3();
                    if (raycaster.ray.intersectPlane(dragPlane, planeIntersect)) {
                        const newLng = baseLng + planeIntersect.x / mPerDegLng;
                        const newLat = baseLat - planeIntersect.z / mPerDegLat;
                        if (onUpdateSpinePoint) {
                            onUpdateSpinePoint(dragOp.pointId, { lat: newLat, lng: newLng }, false);
                        }
                    }
                }
                return;
            }

            if (dragOp.type === 'height_handle') {
                const vertDy = (dragOp.initialClientY ?? e.clientY) - e.clientY;
                const newHeight = Math.max(2, Math.min(100, Math.round((dragOp.initialHeight || 25) + vertDy * 0.4)));
                if (onUpdateSpinePoint) {
                    onUpdateSpinePoint(dragOp.pointId, { peakHeightM: newHeight }, false);
                }
                return;
            }

            if (dragOp.type === 'resize_wing') {
                if (dragOp.centerVec) {
                    const dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -dragOp.centerVec.y);
                    const planeIntersect = new THREE.Vector3();
                    if (raycaster.ray.intersectPlane(dragPlane, planeIntersect)) {
                        const dist = dragOp.centerVec.distanceTo(planeIntersect);
                        const sideW = Math.max(5, Math.min(150, Math.round(dist)));
                        const newTotal = Math.max(10, Math.round(sideW * 2));
                        if (onUpdateSpinePoint) {
                            if (dragOp.side === 'left') {
                                onUpdateSpinePoint(dragOp.pointId, { widthM: newTotal, leftWidthM: sideW }, false);
                            } else {
                                onUpdateSpinePoint(dragOp.pointId, { widthM: newTotal, rightWidthM: sideW }, false);
                            }
                        }
                    }
                }
                return;
            }

            if (dragOp.type === 'move_vertex') {
                if (e.shiftKey) {
                    const vertDy = (dragOp.initialClientY ?? e.clientY) - e.clientY;
                    const newEle = Math.max(0, Math.min(80, Math.round((dragOp.initialHeight || 10) + vertDy * 0.4)));
                    if (onUpdatePerimeterVertex && dragOp.vertexId) {
                        onUpdatePerimeterVertex(dragOp.vertexId, { elevationOffsetM: newEle });
                    }
                } else {
                    const dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -dragOp.planeY);
                    const planeIntersect = new THREE.Vector3();
                    if (raycaster.ray.intersectPlane(dragPlane, planeIntersect)) {
                        const newLng = baseLng + planeIntersect.x / mPerDegLng;
                        const newLat = baseLat - planeIntersect.z / mPerDegLat;
                        if (onUpdatePerimeterVertex && dragOp.vertexId) {
                            onUpdatePerimeterVertex(dragOp.vertexId, { lat: newLat, lng: newLng });
                        }
                    }
                }
                return;
            }
        }

        if (viewMode === 'orbit') {
            sphericalRef.current.theta -= dx * 0.007;
            sphericalRef.current.phi = Math.max(0.1, Math.min(Math.PI / 2.05, sphericalRef.current.phi - dy * 0.007));
            const heading = Math.round(((sphericalRef.current.theta * 180 / Math.PI) % 360 + 360) % 360);
            setCompassHeading(heading);
        }
    };

    const handleMouseUp = (e: React.MouseEvent) => {
        isDraggingRef.current = false;

        // If dragging operation was active
        if (dragOperationRef.current) {
            const dragOp = dragOperationRef.current;
            dragOperationRef.current = null;

            if (dragDistanceRef.current >= 6) {
                // Real drag: finalize and persist
                if (dragOp.type === 'move_point') {
                    if (onUpdateSpinePoint) {
                        onUpdateSpinePoint(dragOp.pointId, {}, true);
                    }
                    toast.success(isKa ? 'წერტილის პოზიცია განახლდა 3D რუკაზე' : 'Slope point relocated in 3D');
                } else if (dragOp.type === 'resize_wing') {
                    if (onUpdateSpinePoint) {
                        onUpdateSpinePoint(dragOp.pointId, {}, true);
                    }
                    toast.success(isKa ? 'ფერდობის სიგანე შეიცვალა 3D-ში' : 'Slope width resized in 3D');
                } else if (dragOp.type === 'height_handle') {
                    if (onUpdateSpinePoint) {
                        onUpdateSpinePoint(dragOp.pointId, {}, true);
                    }
                    toast.success(isKa ? 'სიმაღლე განახლდა' : 'Slope height updated');
                } else if (dragOp.type === 'move_vertex') {
                    toast.success(isKa ? 'ფერდობის წვერო განახლდა' : 'Slope vertex relocated in 3D');
                }
                return;
            } else {
                // Click without drag: Open 3D Point Editor Modal
                if (dragOp.ptData && (dragOp.type === 'move_point' || dragOp.type === 'height_handle' || dragOp.type === 'resize_wing')) {
                    setSelectedEditPoint(dragOp.ptData);
                    toast.info(isKa ? `რედაქტირება: ${dragOp.ptData.name || 'წერტილი'}` : `Editing: ${dragOp.ptData.name || 'Slope Point'}`);
                    return;
                }
            }
        }

        // If in "Add Slope Point in 3D" mode, raycast against the terrain mesh!
        if (isAddingSlopePoint3D && dragDistanceRef.current < 6 && rendererRef.current && cameraRef.current && terrainMeshRef.current) {
            const rect = rendererRef.current.domElement.getBoundingClientRect();
            const mouseX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
            const mouseY = -((e.clientY - rect.top) / rect.height) * 2 + 1;
            const raycaster = new THREE.Raycaster();
            raycaster.setFromCamera(new THREE.Vector2(mouseX, mouseY), cameraRef.current);
            const hits = raycaster.intersectObject(terrainMeshRef.current, false);
            if (hits.length > 0) {
                const hit = hits[0].point;
                const ptLng = baseLng + hit.x / mPerDegLng;
                const ptLat = baseLat - hit.z / mPerDegLat;
                if (onAddSpinePoint) {
                    onAddSpinePoint({ lat: ptLat, lng: ptLng, peakHeightM: 25, widthM: 45 });
                }
                setIsAddingSlopePoint3D(false);
                toast.success(isKa ? `3D წერტილი დაემატა: [${ptLat.toFixed(5)}, ${ptLng.toFixed(5)}]` : `Point placed in 3D terrain: [${ptLat.toFixed(5)}, ${ptLng.toFixed(5)}]`);
                return;
            }
        }

        // Clean click without drag: Raycast to select 3D device or open point editor
        if (dragDistanceRef.current < 6 && rendererRef.current && cameraRef.current) {
            const rect = rendererRef.current.domElement.getBoundingClientRect();
            const mouseX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
            const mouseY = -((e.clientY - rect.top) / rect.height) * 2 + 1;

            const raycaster = new THREE.Raycaster();
            raycaster.setFromCamera(new THREE.Vector2(mouseX, mouseY), cameraRef.current);
            const intersects = raycaster.intersectObjects(interactiveObjectsRef.current, true);

            if (intersects.length > 0) {
                let obj: THREE.Object3D | null = intersects[0].object;
                while (obj && !obj.userData?.type && obj.parent) {
                    obj = obj.parent;
                }
                if (obj && obj.userData?.type) {
                    const { type, data } = obj.userData;
                    if (type === 'camera') {
                        if (onSelectCamera) onSelectCamera(data.id || data);
                        if (onSelectDevice) onSelectDevice('camera', data);
                    } else if (type === 'soil') {
                        if (onSelectDevice) onSelectDevice('soil', data);
                    } else if (type === 'water') {
                        if (onSelectDevice) onSelectDevice('water', data);
                    } else if (type === 'worker') {
                        if (onSelectDevice) onSelectDevice('worker', data);
                    } else if (type === 'drone') {
                        if (onSelectDevice) onSelectDevice('drone', data);
                    } else if (type === 'slope_point') {
                        if (onSelectDevice) onSelectDevice('slope_point', data);
                        setSelectedEditPoint(data);
                    } else if (type === 'photo_pin') {
                        if (onSelectPhotoPin) onSelectPhotoPin(data);
                    }
                }
            }
        }
    };

    const handleWheel = (e: React.WheelEvent) => {
        if (viewMode !== 'orbit') return;
        sphericalRef.current.radius = Math.max(40, Math.min(650, sphericalRef.current.radius + e.deltaY * 0.4));
    };

    return (
        <div className="relative w-full h-full min-h-[420px] bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl select-none">
            {/* Three.js Canvas Container */}
            <div 
                ref={containerRef}
                style={{ cursor: isAddingSlopePoint3D ? 'crosshair' : isDraggingRef.current ? 'grabbing' : 'grab' }}
                className="w-full h-full"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={() => { isDraggingRef.current = false; }}
                onWheel={handleWheel}
            />

            {/* TOP BAR: 2D/3D Mode Switcher & View Modes */}
            <div className="absolute top-3 left-3 right-3 z-20 flex flex-wrap items-center justify-between gap-2.5 pointer-events-none">
                <div className="flex flex-wrap items-center gap-2 pointer-events-auto">
                    {/* Swap 2D / 3D Button */}
                    {onSwap2d3d && (
                        <button
                            type="button"
                            onClick={onSwap2d3d}
                            className="px-3 py-1.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-xl backdrop-blur-md cursor-pointer transition-all active:scale-95"
                            title="Swap places: 2D map and 3D terrain window"
                        >
                            <span>⇄ {isMainFullView ? (isKa ? '2D-ს მთავარში გადაყვანა' : 'Swap to 2D Main') : (isKa ? '3D-ს მთავარში გადაყვანა' : 'Swap to 3D Main')}</span>
                        </button>
                    )}

                    {/* Switch to 2D Map Button */}
                    {onSwitchTo2D && (
                        <button
                            type="button"
                            onClick={onSwitchTo2D}
                            className="px-3 py-1.5 bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-700/80 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-xl backdrop-blur-md cursor-pointer transition-all active:scale-95"
                        >
                            <span>🗺️ {isKa ? '2D რუკა' : '2D Map'}</span>
                        </button>
                    )}

                    {/* 3D Add Point Button */}
                    <button
                        type="button"
                        onClick={() => {
                            setIsAddingSlopePoint3D(!isAddingSlopePoint3D);
                            toast.info(isAddingSlopePoint3D ? 'რეჟიმი გაუქმდა' : 'დააწკაპუნეთ 3D რელიეფზე წერტილის დასასმელად');
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-xl backdrop-blur-md cursor-pointer transition-all active:scale-95 ${
                            isAddingSlopePoint3D
                                ? 'bg-amber-500 text-slate-950 ring-2 ring-amber-300 animate-pulse'
                                : 'bg-amber-950/80 hover:bg-amber-900 border border-amber-600/70 text-amber-300 hover:text-white'
                        }`}
                        title={isKa ? 'დააწკაპუნეთ 3D რელიეფზე წერტილის დასასმელად' : 'Click anywhere on 3D terrain to add slope point'}
                    >
                        <Plus size={13} />
                        <span>{isAddingSlopePoint3D ? (isKa ? '📍 დააწკაპუნეთ რელიეფზე' : '📍 Click on Terrain') : (isKa ? '+ 3D წერტილი' : '+ 3D Slope Point')}</span>
                    </button>

                    {/* Back / Delete Last Point in 3D */}
                    {onDeleteLastPoint && (
                        <button
                            type="button"
                            onClick={onDeleteLastPoint}
                            className="px-2.5 py-1.5 bg-rose-950/80 hover:bg-rose-900 border border-rose-700/60 text-rose-300 hover:text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-xl backdrop-blur-md cursor-pointer transition-all active:scale-95"
                            title={isKa ? 'ბოლო რედაქტირებული წერტილის წაშლა (Backspace / ⌫)' : 'Delete last edited point (Backspace / ⌫)'}
                        >
                            <Undo2 size={13} className="text-rose-400 stroke-[2.5]" />
                            <span>{isKa ? 'უკან' : 'Back'} ⌫</span>
                        </button>
                    )}

                    {/* Delete Slope in 3D */}
                    {onDeleteSlope && (
                        <button
                            type="button"
                            onClick={onDeleteSlope}
                            className="px-2.5 py-1.5 bg-red-950/80 hover:bg-red-900 border border-red-700/60 text-red-300 hover:text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-xl backdrop-blur-md cursor-pointer transition-all active:scale-95"
                            title={isKa ? 'მთელი 3D რელიეფის წაშლა' : 'Delete whole slope profile'}
                        >
                            <Trash2 size={13} className="text-red-400" />
                            <span>{isKa ? 'წაშლა' : 'Delete Slope'}</span>
                        </button>
                    )}

                    {/* Focus Cameras in 3D Button */}
                    <button
                        type="button"
                        onClick={handleFocusCameras}
                        className="px-3 py-1.5 bg-blue-950/80 hover:bg-blue-900 border border-blue-600/70 text-blue-300 hover:text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-xl backdrop-blur-md cursor-pointer transition-all active:scale-95"
                        title={isKa ? 'კამერების ცენტრში მოყვანა 3D ხედში' : 'Center & frame surveillance cameras in 3D'}
                    >
                        <Video size={13} className="text-blue-400" />
                        <span>📹 {isKa ? 'კამერები' : 'Cameras'}</span>
                    </button>

                    {/* Active 3D Badge */}
                    <div className="px-2.5 py-1.5 bg-emerald-950/90 text-emerald-400 border border-emerald-700/60 rounded-xl text-[11px] font-mono font-bold hidden md:flex items-center gap-1.5 shadow-xl backdrop-blur-md">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        <span>3D DEM</span>
                    </div>
                </div>

                {/* 3D Camera Angles: Orbit, Drone Cockpit, Camera Lens */}
                <div className="flex items-center gap-1 bg-slate-950/90 p-1 rounded-xl border border-slate-800/90 shadow-xl backdrop-blur-md pointer-events-auto text-xs">
                    <button
                        type="button"
                        onClick={() => setViewMode('orbit')}
                        className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 transition-all ${
                            viewMode === 'orbit' 
                                ? 'bg-cyan-600 text-white shadow-sm' 
                                : 'text-slate-400 hover:text-white'
                        }`}
                        title="Free 360° Orbit Navigation"
                    >
                        <Compass size={12} /> {isKa ? '3D ორბიტა' : '3D Orbit'}
                    </button>

                    <button
                        type="button"
                        onClick={() => setViewMode('drone_cockpit')}
                        className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 transition-all ${
                            viewMode === 'drone_cockpit' 
                                ? 'bg-cyan-600 text-white shadow-sm animate-pulse' 
                                : 'text-slate-400 hover:text-white'
                        }`}
                        title="First-Person Drone Cockpit View"
                    >
                        <Navigation size={12} /> {isKa ? 'დრონის კაბინა (Cockpit)' : 'Drone Eye View'}
                    </button>

                    <button
                        type="button"
                        onClick={() => setViewMode('camera_fov')}
                        className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 transition-all ${
                            viewMode === 'camera_fov' 
                                ? 'bg-blue-600 text-white shadow-sm' 
                                : 'text-slate-400 hover:text-white'
                        }`}
                        title="Surveillance Camera POV"
                    >
                        <CameraIcon size={12} /> {isKa ? 'კამერის POV' : 'Camera Lens'}
                    </button>
                </div>
            </div>

            {/* 3D INTERACTIVE COMPASS GIZMO (North Indicator) */}
            <div className="absolute top-14 right-3 z-30 flex flex-col items-center pointer-events-auto select-none">
                <button
                    type="button"
                    onClick={() => {
                        sphericalRef.current = { radius: sphericalRef.current.radius || 320, theta: 0, phi: Math.PI / 3.2 };
                        setCompassHeading(0);
                        setViewMode('orbit');
                        toast.info(isKa ? '3D ხედი გასწორდა ჩრდილოეთზე (0° N)' : '3D View Aligned to True North (0° N)');
                    }}
                    className="w-13 h-13 rounded-full bg-slate-950/90 hover:bg-slate-900 border-2 border-cyan-500/70 shadow-2xl flex items-center justify-center backdrop-blur-md relative group hover:scale-105 active:scale-95 transition-all cursor-pointer"
                    title={isKa ? 'ჩრდილოეთზე გასწორება (დააწკაპუნეთ 0°-ზე დასაბრუნებლად)' : 'Align to True North (Click to face North 0°)'}
                >
                    {/* Rotating Compass Dial */}
                    <div 
                        className="w-full h-full rounded-full flex items-center justify-center relative transition-transform duration-100 ease-out"
                        style={{ transform: `rotate(${-compassHeading}deg)` }}
                    >
                        {/* North Indicator Needle */}
                        <div className="absolute top-1.5 flex flex-col items-center">
                            <span className="text-[10px] font-black text-rose-500 font-mono leading-none tracking-tighter">N</span>
                            <div className="w-0 h-0 border-l-[3.5px] border-l-transparent border-r-[3.5px] border-r-transparent border-b-[9px] border-b-rose-500 mt-0.5" />
                        </div>
                        {/* South Indicator Needle */}
                        <div className="absolute bottom-1.5 flex flex-col items-center">
                            <div className="w-0 h-0 border-l-[3.5px] border-l-transparent border-r-[3.5px] border-r-transparent border-t-[9px] border-t-slate-400 mb-0.5" />
                            <span className="text-[9px] font-bold text-slate-400 font-mono leading-none">S</span>
                        </div>
                        {/* East & West Markers */}
                        <span className="absolute right-1 text-[8px] font-black text-slate-500 font-mono">E</span>
                        <span className="absolute left-1 text-[8px] font-black text-slate-500 font-mono">W</span>
                        {/* Compass Hub Pivot */}
                        <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 border border-slate-950 shadow-md" />
                    </div>
                </button>
                <div className="mt-1 px-1.5 py-0.5 rounded-md bg-slate-950/85 border border-slate-800 text-[10px] font-mono font-bold text-cyan-300 shadow">
                    {compassHeading}° N
                </div>
            </div>

            {/* COLLISION WARNING FLOATING HUD */}
            {collisionCheck.hasCollisionWarning && (
                <div className="absolute top-16 left-3 z-20 p-2.5 bg-red-950/90 border border-red-500/80 rounded-xl shadow-2xl text-xs text-red-200 flex items-center gap-2 backdrop-blur-md animate-bounce">
                    <AlertTriangle size={16} className="text-red-400" />
                    <span>
                        <b>{isKa ? 'შეჯახების საფრთხე:' : 'Terrain Collision Alert:'}</b> {isKa ? 'დრონის სიმაღლე 6მ-ზე დაბალია რელიეფის ბორცვზე' : 'Flight clearance < 6m above ridge crest'}
                    </span>
                </div>
            )}

            {/* FLOATING 3D POINT EDITOR HUD (Movable, Editable, Resizable controls) */}
            {activeEditPoint && (
                <div className="absolute top-16 right-16 z-40 w-80 max-w-[calc(100%-2rem)] bg-slate-900/95 border-2 border-amber-500/80 rounded-2xl shadow-2xl backdrop-blur-xl p-4 text-white flex flex-col gap-3 max-h-[82vh] overflow-y-auto pointer-events-auto animate-in slide-in-from-right-3 duration-200">
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                        <div className="flex items-center gap-2">
                            <span className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center font-black text-sm">
                                🏔️
                            </span>
                            <div>
                                <h4 className="font-black text-xs text-amber-300 tracking-wide uppercase flex items-center gap-1.5">
                                    <span>{activeEditPoint.name || 'Slope Point'}</span>
                                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-600/50">
                                        +{activeEditPoint.peakHeightM}m
                                    </span>
                                </h4>
                                <p className="text-[10px] text-slate-400 font-mono">
                                    [{activeEditPoint.lat.toFixed(5)}, {activeEditPoint.lng.toFixed(5)}]
                                </p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => setSelectedEditPoint(null)}
                            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                            title="Close"
                        >
                            <X size={15} />
                        </button>
                    </div>

                    {/* Point Name Input */}
                    <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-300 flex items-center justify-between">
                            <span>{isKa ? 'წერტილის სახელი' : 'Point Name'}</span>
                        </label>
                        <input
                            type="text"
                            value={activeEditPoint.name || ''}
                            onChange={(e) => {
                                if (onUpdateSpinePoint) {
                                    onUpdateSpinePoint(activeEditPoint.id, { name: e.target.value }, true);
                                }
                            }}
                            className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-xs font-medium text-white focus:outline-none focus:border-amber-400"
                        />
                    </div>

                    {/* Height / Elevation Control */}
                    <div className="space-y-1.5 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                        <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-slate-200 flex items-center gap-1">
                                <ArrowUpDown size={12} className="text-amber-400" />
                                <span>{isKa ? 'სიმაღლე (Height):' : 'Peak Elevation:'}</span>
                            </span>
                            <span className="font-mono font-black text-amber-400 text-sm">
                                +{activeEditPoint.peakHeightM} m
                            </span>
                        </div>
                        <input
                            type="range"
                            min="2"
                            max="90"
                            step="1"
                            value={activeEditPoint.peakHeightM || 25}
                            onChange={(e) => {
                                const h = Number(e.target.value);
                                if (onUpdateSpinePoint) {
                                    onUpdateSpinePoint(activeEditPoint.id, { peakHeightM: h }, true);
                                }
                            }}
                            className="w-full h-1.5 bg-slate-800 rounded appearance-none cursor-pointer accent-amber-400"
                        />
                        <div className="flex items-center justify-between gap-1 pt-0.5">
                            {[-5, -1, +1, +5].map((delta) => (
                                <button
                                    key={delta}
                                    type="button"
                                    onClick={() => {
                                        const h = Math.max(2, Math.min(90, (activeEditPoint.peakHeightM || 25) + delta));
                                        if (onUpdateSpinePoint) {
                                            onUpdateSpinePoint(activeEditPoint.id, { peakHeightM: h }, true);
                                        }
                                    }}
                                    className="flex-1 py-1 bg-slate-800 hover:bg-slate-700 text-[10px] font-mono font-bold rounded-lg text-slate-300 transition-colors cursor-pointer"
                                >
                                    {delta > 0 ? `+${delta}m` : `${delta}m`}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Width / Cross-Section Resize Control */}
                    <div className="space-y-1.5 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                        <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-slate-200 flex items-center gap-1">
                                <SlidersHorizontal size={12} className="text-cyan-400" />
                                <span>{isKa ? 'განივი სიგანე (Width):' : 'Cross-Section Width:'}</span>
                            </span>
                            <span className="font-mono font-black text-cyan-400 text-sm">
                                {activeEditPoint.widthM || 45} m
                            </span>
                        </div>
                        <input
                            type="range"
                            min="10"
                            max="150"
                            step="2"
                            value={activeEditPoint.widthM || 45}
                            onChange={(e) => {
                                const w = Number(e.target.value);
                                const half = Math.round(w / 2);
                                if (onUpdateSpinePoint) {
                                    onUpdateSpinePoint(activeEditPoint.id, { widthM: w, leftWidthM: half, rightWidthM: half }, true);
                                }
                            }}
                            className="w-full h-1.5 bg-slate-800 rounded appearance-none cursor-pointer accent-cyan-400"
                        />
                        <div className="flex items-center justify-between gap-1 pt-0.5">
                            {[-10, -5, +5, +10].map((delta) => (
                                <button
                                    key={delta}
                                    type="button"
                                    onClick={() => {
                                        const w = Math.max(10, Math.min(150, (activeEditPoint.widthM || 45) + delta));
                                        const half = Math.round(w / 2);
                                        if (onUpdateSpinePoint) {
                                            onUpdateSpinePoint(activeEditPoint.id, { widthM: w, leftWidthM: half, rightWidthM: half }, true);
                                        }
                                    }}
                                    className="flex-1 py-1 bg-slate-800 hover:bg-slate-700 text-[10px] font-mono font-bold rounded-lg text-slate-300 transition-colors cursor-pointer"
                                >
                                    {delta > 0 ? `+${delta}m` : `${delta}m`}
                                </button>
                            ))}
                        </div>

                        {/* Asymmetric Wings (Left & Right) */}
                        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800/80">
                            <div>
                                <div className="flex justify-between text-[10px] text-slate-400 font-mono mb-1">
                                    <span>Left (L)</span>
                                    <span className="text-cyan-300 font-bold">{activeEditPoint.leftWidthM ?? Math.round((activeEditPoint.widthM || 45) / 2)}m</span>
                                </div>
                                <input
                                    type="range"
                                    min="5"
                                    max="80"
                                    value={activeEditPoint.leftWidthM ?? Math.round((activeEditPoint.widthM || 45) / 2)}
                                    onChange={(e) => {
                                        const lw = Number(e.target.value);
                                        const rw = activeEditPoint.rightWidthM ?? Math.round((activeEditPoint.widthM || 45) / 2);
                                        if (onUpdateSpinePoint) {
                                            onUpdateSpinePoint(activeEditPoint.id, { leftWidthM: lw, widthM: lw + rw }, true);
                                        }
                                    }}
                                    className="w-full h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-cyan-400"
                                />
                            </div>
                            <div>
                                <div className="flex justify-between text-[10px] text-slate-400 font-mono mb-1">
                                    <span>Right (R)</span>
                                    <span className="text-cyan-300 font-bold">{activeEditPoint.rightWidthM ?? Math.round((activeEditPoint.widthM || 45) / 2)}m</span>
                                </div>
                                <input
                                    type="range"
                                    min="5"
                                    max="80"
                                    value={activeEditPoint.rightWidthM ?? Math.round((activeEditPoint.widthM || 45) / 2)}
                                    onChange={(e) => {
                                        const rw = Number(e.target.value);
                                        const lw = activeEditPoint.leftWidthM ?? Math.round((activeEditPoint.widthM || 45) / 2);
                                        if (onUpdateSpinePoint) {
                                            onUpdateSpinePoint(activeEditPoint.id, { rightWidthM: rw, widthM: lw + rw }, true);
                                        }
                                    }}
                                    className="w-full h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-cyan-400"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Slope Falloff Curve */}
                    <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-300">
                            {isKa ? 'ფერდობის პროფილი (Falloff Curve)' : 'Slope Profile (Falloff):'}
                        </label>
                        <div className="grid grid-cols-3 gap-1 text-[11px]">
                            {(['cosine', 'linear', 'plateau'] as const).map((mode) => (
                                <button
                                    key={mode}
                                    type="button"
                                    onClick={() => {
                                        if (onUpdateSpinePoint) {
                                            onUpdateSpinePoint(activeEditPoint.id, { slopeFalloff: mode }, true);
                                        }
                                    }}
                                    className={`py-1 rounded-lg font-bold transition-all capitalize cursor-pointer ${
                                        activeEditPoint.slopeFalloff === mode
                                            ? 'bg-amber-500 text-slate-950 shadow'
                                            : 'bg-slate-950 text-slate-400 hover:text-white'
                                    }`}
                                >
                                    {mode}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* 3D Position Nudge & GPS Controls */}
                    <div className="space-y-1 bg-slate-950/60 p-2 rounded-xl border border-slate-800">
                        <div className="flex items-center justify-between text-[11px] font-bold text-slate-300">
                            <span>{isKa ? 'წერტილის გადაადგილება (Move)' : 'Relocate Point in 3D:'}</span>
                            <span className="text-[10px] text-amber-400 font-mono">Drag in 3D / Nudge</span>
                        </div>
                        <div className="grid grid-cols-4 gap-1 pt-1">
                            <button
                                type="button"
                                onClick={() => {
                                    if (onUpdateSpinePoint) {
                                        onUpdateSpinePoint(activeEditPoint.id, { lat: activeEditPoint.lat + 0.0001 }, true);
                                    }
                                }}
                                className="py-1 bg-slate-800 hover:bg-slate-700 rounded-lg text-[10px] font-bold flex items-center justify-center gap-0.5 text-slate-200 cursor-pointer"
                                title="Move North (+Y)"
                            >
                                <ArrowUp size={11} /> N
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    if (onUpdateSpinePoint) {
                                        onUpdateSpinePoint(activeEditPoint.id, { lat: activeEditPoint.lat - 0.0001 }, true);
                                    }
                                }}
                                className="py-1 bg-slate-800 hover:bg-slate-700 rounded-lg text-[10px] font-bold flex items-center justify-center gap-0.5 text-slate-200 cursor-pointer"
                                title="Move South (-Y)"
                            >
                                <ArrowDown size={11} /> S
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    if (onUpdateSpinePoint) {
                                        onUpdateSpinePoint(activeEditPoint.id, { lng: activeEditPoint.lng - 0.0001 }, true);
                                    }
                                }}
                                className="py-1 bg-slate-800 hover:bg-slate-700 rounded-lg text-[10px] font-bold flex items-center justify-center gap-0.5 text-slate-200 cursor-pointer"
                                title="Move West (-X)"
                            >
                                <ArrowLeft size={11} /> W
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    if (onUpdateSpinePoint) {
                                        onUpdateSpinePoint(activeEditPoint.id, { lng: activeEditPoint.lng + 0.0001 }, true);
                                    }
                                }}
                                className="py-1 bg-slate-800 hover:bg-slate-700 rounded-lg text-[10px] font-bold flex items-center justify-center gap-0.5 text-slate-200 cursor-pointer"
                                title="Move East (+X)"
                            >
                                <ArrowRight size={11} /> E
                            </button>
                        </div>
                    </div>

                    {/* Action Buttons: Center Camera, Delete Point, Done */}
                    <div className="flex items-center gap-1.5 pt-1 border-t border-slate-800">
                        <button
                            type="button"
                            onClick={() => {
                                const px = toLocalX(activeEditPoint.lng);
                                const pz = toLocalZ(activeEditPoint.lat);
                                targetLookAtRef.current.set(px, 15, pz);
                                sphericalRef.current = { radius: 110, theta: sphericalRef.current.theta, phi: Math.PI / 3.4 };
                                setViewMode('orbit');
                                toast.info(isKa ? 'კამერა ფოკუსირდა წერტილზე' : 'Centered camera on point');
                            }}
                            className="flex-1 py-1.5 bg-blue-950/80 hover:bg-blue-900 border border-blue-600/60 text-blue-300 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-all cursor-pointer"
                        >
                            <Crosshair size={12} />
                            <span>{isKa ? 'ფოკუსი' : 'Focus'}</span>
                        </button>

                        {onDeleteSpinePoint && (
                            <button
                                type="button"
                                onClick={() => {
                                    onDeleteSpinePoint(activeEditPoint.id);
                                    setSelectedEditPoint(null);
                                    toast.success(isKa ? 'წერტილი წაშლილია' : 'Slope point deleted');
                                }}
                                className="py-1.5 px-2.5 bg-rose-950/80 hover:bg-rose-900 border border-rose-700/60 text-rose-300 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-all cursor-pointer"
                                title="Delete this point"
                            >
                                <Trash2 size={12} />
                            </button>
                        )}

                        <button
                            type="button"
                            onClick={() => setSelectedEditPoint(null)}
                            className="py-1.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1 shadow-lg transition-all cursor-pointer"
                        >
                            <Check size={12} />
                            <span>{isKa ? 'მზადაა' : 'Done'}</span>
                        </button>
                    </div>
                </div>
            )}

            {/* BOTTOM FLOATING CONTROLS HUD */}
            <div className="absolute bottom-3 left-3 right-3 z-20 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
                {/* 3D Visual Layer Toggles */}
                <div className="flex flex-wrap items-center gap-1.5 p-1.5 bg-slate-950/90 border border-slate-800 rounded-xl shadow-xl backdrop-blur-md pointer-events-auto text-[11px]">
                    <button
                        type="button"
                        onClick={() => setShowFrustums(!showFrustums)}
                        className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 transition-colors ${
                            showFrustums ? 'bg-blue-600/80 text-white' : 'text-slate-400 hover:text-white'
                        }`}
                    >
                        <ShieldCheck size={12} /> {isKa ? '3D ოპტიკური კონუსი' : '3D Frustums'}
                    </button>

                    <button
                        type="button"
                        onClick={() => setShowTerrainShadows(!showTerrainShadows)}
                        className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 transition-colors ${
                            showTerrainShadows ? 'bg-red-600/80 text-white' : 'text-slate-400 hover:text-white'
                        }`}
                    >
                        <AlertTriangle size={12} /> {isKa ? 'ფერდობის ბრმა ზონები' : 'Slope Shadows'}
                    </button>

                    <button
                        type="button"
                        onClick={() => setShowContourGrid(!showContourGrid)}
                        className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 transition-colors ${
                            showContourGrid ? 'bg-emerald-600/80 text-white' : 'text-slate-400 hover:text-white'
                        }`}
                    >
                        <Layers size={12} /> {isKa ? 'რელიეფის იზოჰიფსები' : 'Contour Grid'}
                    </button>

                    {/* Vertical Exaggeration Slider */}
                    <div className="flex items-center gap-1.5 ml-2 pl-2 border-l border-slate-800 text-slate-300">
                        <span className="text-[10px] text-slate-400 uppercase font-bold">
                            {isKa ? 'რელიეფის მასშტაბი:' : 'Elevation Scale:'}
                        </span>
                        <input
                            type="range"
                            min="1.0"
                            max="3.0"
                            step="0.2"
                            value={elevationExaggeration}
                            onChange={(e) => setElevationExaggeration(Number(e.target.value))}
                            className="w-16 h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-cyan-400"
                        />
                        <span className="font-mono text-cyan-400 font-bold">{elevationExaggeration}x</span>
                    </div>
                </div>

                {/* Reset View Button */}
                <button
                    type="button"
                    onClick={() => {
                        sphericalRef.current = { radius: 320, theta: Math.PI / 4, phi: Math.PI / 3.2 };
                        setViewMode('orbit');
                    }}
                    className="p-2 bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 rounded-xl shadow-xl backdrop-blur-md pointer-events-auto transition-colors"
                    title="Reset 3D Perspective"
                >
                    <RotateCcw size={14} />
                </button>
            </div>
        </div>
    );
};
