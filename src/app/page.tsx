'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import * as THREE from 'three'
import { 
  Upload, 
  Printer,
  Mail,
  Phone,
  MapPin,
  Layers,
  Trash2,
  ShoppingBag,
  Check,
  ArrowRight,
  FileText,
  Ruler,
  Palette,
  Package,
  Clock,
  X,
  Plus,
  Minus,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Move3D
} from 'lucide-react'

// ==================== VERİLER ====================

const filamentTypes = [
  { 
    id: 'pla', 
    name: 'PLA', 
    description: 'En popüler, kolay baskı, çevre dostu',
    pricePerGram: 0.15,
    colors: ['Beyaz', 'Siyah', 'Kırmızı', 'Mavi', 'Yeşil', 'Sarı', 'Turuncu', 'Mor', 'Pembe', 'Gri'],
    colorCodes: ['#FFFFFF', '#1a1a1a', '#ef4444', '#3b82f6', '#22c55e', '#eab308', '#f97316', '#a855f7', '#ec4899', '#6b7280']
  },
  { 
    id: 'pla-plus', 
    name: 'PLA+', 
    description: 'Daha güçlü, darbelere dayanıklı',
    pricePerGram: 0.20,
    colors: ['Beyaz', 'Siyah', 'Kırmızı', 'Mavi', 'Yeşil', 'Gri'],
    colorCodes: ['#FFFFFF', '#1a1a1a', '#ef4444', '#3b82f6', '#22c55e', '#6b7280']
  },
  { 
    id: 'petg', 
    name: 'PETG', 
    description: 'Su geçirmez, kimyasal dayanıklı',
    pricePerGram: 0.25,
    colors: ['Şeffaf', 'Beyaz', 'Siyah', 'Mavi', 'Yeşil'],
    colorCodes: ['#e0f2fe', '#FFFFFF', '#1a1a1a', '#3b82f6', '#22c55e']
  },
  { 
    id: 'abs', 
    name: 'ABS', 
    description: 'Isıya dayanıklı, mekanik parçalar için',
    pricePerGram: 0.22,
    colors: ['Beyaz', 'Siyah', 'Kırmızı', 'Mavi'],
    colorCodes: ['#FFFFFF', '#1a1a1a', '#ef4444', '#3b82f6']
  },
  { 
    id: 'tpu', 
    name: 'TPU (Esnek)', 
    description: 'Esnek, kauçuk benzeri',
    pricePerGram: 0.35,
    colors: ['Beyaz', 'Siyah', 'Kırmızı'],
    colorCodes: ['#FFFFFF', '#1a1a1a', '#ef4444']
  },
  { 
    id: 'silk', 
    name: 'Silk PLA', 
    description: 'Parlak, ipeksi yüzey',
    pricePerGram: 0.28,
    colors: ['Altın', 'Gümüş', 'Bakır', 'Gül Altın'],
    colorCodes: ['#fbbf24', '#d1d5db', '#b45309', '#f472b6']
  },
]

const qualityOptions = [
  { id: 'draft', name: 'Draft', layer: '0.3mm', description: 'Hızlı, prototip için', multiplier: 0.8 },
  { id: 'standard', name: 'Standart', layer: '0.2mm', description: 'Dengeli kalite', multiplier: 1 },
  { id: 'high', name: 'Yüksek', layer: '0.12mm', description: 'Detaylı baskı', multiplier: 1.4 },
  { id: 'ultra', name: 'Ultra', layer: '0.08mm', description: 'Maksimum detay', multiplier: 1.8 },
]

const infillOptions = [
  { value: 10, label: '%10', description: 'Hafif' },
  { value: 20, label: '%20', description: 'Standart' },
  { value: 50, label: '%50', description: 'Güçlü' },
  { value: 80, label: '%80', description: 'Çok güçlü' },
  { value: 100, label: '%100', description: 'Dolu' },
]

// ==================== TİPLER ====================

interface OrderItem {
  id: string
  fileName: string
  fileSize: string
  filament: string
  color: string
  colorCode: string
  quality: string
  infill: number
  scale: number
  quantity: number
  estimatedPrice: number
  estimatedTime: number
  dimensions: { x: number, y: number, z: number }
  volume: number
}

interface ModelData {
  geometry: THREE.BufferGeometry
  dimensions: { x: number, y: number, z: number }
  volume: number
}

// ==================== STL PARSER ====================

function parseSTL(buffer: ArrayBuffer): ModelData {
  const data = new DataView(buffer)
  let isASCII = true
  
  // Check if ASCII or Binary
  for (let i = 0; i < Math.min(80, buffer.byteLength); i++) {
    if (data.getUint8(i) > 127) {
      isASCII = false
      break
    }
  }
  
  const headerText = new TextDecoder().decode(new Uint8Array(buffer, 0, 80))
  if (headerText.toLowerCase().startsWith('solid') && isASCII) {
    // Try ASCII parsing
    const text = new TextDecoder().decode(new Uint8Array(buffer))
    if (text.includes('facet') && text.includes('vertex')) {
      return parseASCIISTL(text)
    }
  }
  
  return parseBinarySTL(buffer)
}

function parseASCIISTL(text: string): ModelData {
  const vertices: number[] = []
  const vertexRegex = /vertex\s+([\-+]?\d*\.?\d+(?:[eE][\-+]?\d+)?)\s+([\-+]?\d*\.?\d+(?:[eE][\-+]?\d+)?)\s+([\-+]?\d*\.?\d+(?:[eE][\-+]?\d+)?)/gi
  
  let match
  while ((match = vertexRegex.exec(text)) !== null) {
    vertices.push(parseFloat(match[1]), parseFloat(match[2]), parseFloat(match[3]))
  }
  
  return createModelData(vertices)
}

function parseBinarySTL(buffer: ArrayBuffer): ModelData {
  const data = new DataView(buffer)
  const triangleCount = data.getUint32(80, true)
  const vertices: number[] = []
  
  let offset = 84
  for (let i = 0; i < triangleCount; i++) {
    // Skip normal (12 bytes)
    offset += 12
    
    // Read 3 vertices
    for (let j = 0; j < 3; j++) {
      vertices.push(
        data.getFloat32(offset, true),
        data.getFloat32(offset + 4, true),
        data.getFloat32(offset + 8, true)
      )
      offset += 12
    }
    
    // Skip attribute byte count (2 bytes)
    offset += 2
  }
  
  return createModelData(vertices)
}

function createModelData(vertices: number[]): ModelData {
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
  geometry.computeVertexNormals()
  geometry.computeBoundingBox()
  
  const box = geometry.boundingBox!
  const dimensions = {
    x: Math.round((box.max.x - box.min.x) * 100) / 100,
    y: Math.round((box.max.y - box.min.y) * 100) / 100,
    z: Math.round((box.max.z - box.min.z) * 100) / 100
  }
  
  // Calculate volume using signed tetrahedron method
  let volume = 0
  for (let i = 0; i < vertices.length; i += 9) {
    const v1 = new THREE.Vector3(vertices[i], vertices[i + 1], vertices[i + 2])
    const v2 = new THREE.Vector3(vertices[i + 3], vertices[i + 4], vertices[i + 5])
    const v3 = new THREE.Vector3(vertices[i + 6], vertices[i + 7], vertices[i + 8])
    
    volume += v1.dot(v2.cross(v3)) / 6
  }
  volume = Math.abs(volume)
  
  // Center the geometry
  geometry.center()
  
  return { geometry, dimensions, volume: Math.round(volume) }
}

// ==================== 3D VIEWER ====================

function ModelViewer({ 
  geometry, 
  colorCode 
}: { 
  geometry: THREE.BufferGeometry | null
  colorCode: string 
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const meshRef = useRef<THREE.Mesh | null>(null)
  const animationRef = useRef<number>(0)
  const isDraggingRef = useRef(false)
  const previousMouseRef = useRef({ x: 0, y: 0 })

  useEffect(() => {
    if (!containerRef.current || !geometry) return

    const container = containerRef.current
    const width = container.clientWidth
    const height = container.clientHeight

    // Scene
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x0a0d14)
    sceneRef.current = scene

    // Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 10000)
    camera.position.z = 200
    cameraRef.current = camera

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(window.devicePixelRatio)
    container.appendChild(renderer.domElement)
    rendererRef.current = renderer

    // Lights
    const ambientLight = new THREE.AmbientLight(0x404040, 2)
    scene.add(ambientLight)

    const directionalLight1 = new THREE.DirectionalLight(0x00d4ff, 1)
    directionalLight1.position.set(1, 1, 1)
    scene.add(directionalLight1)

    const directionalLight2 = new THREE.DirectionalLight(0xa855f7, 0.5)
    directionalLight2.position.set(-1, -1, -1)
    scene.add(directionalLight2)

    // Grid
    const gridHelper = new THREE.GridHelper(200, 20, 0x00d4ff, 0x1f2633)
    gridHelper.rotation.x = Math.PI / 2
    scene.add(gridHelper)

    // Mesh
    const material = new THREE.MeshPhongMaterial({
      color: colorCode,
      specular: 0x444444,
      shininess: 30,
      flatShading: false
    })
    const mesh = new THREE.Mesh(geometry, material)
    
    // Scale to fit view
    geometry.computeBoundingSphere()
    const sphere = geometry.boundingSphere!
    const scale = 80 / sphere.radius
    mesh.scale.set(scale, scale, scale)
    
    scene.add(mesh)
    meshRef.current = mesh

    // Animation
    const animate = () => {
      animationRef.current = requestAnimationFrame(animate)
      if (meshRef.current && !isDraggingRef.current) {
        meshRef.current.rotation.y += 0.005
      }
      renderer.render(scene, camera)
    }
    animate()

    // Mouse controls
    const handleMouseDown = (e: MouseEvent) => {
      isDraggingRef.current = true
      previousMouseRef.current = { x: e.clientX, y: e.clientY }
    }

    const handleMouseUp = () => {
      isDraggingRef.current = false
    }

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current || !meshRef.current) return
      
      const deltaX = e.clientX - previousMouseRef.current.x
      const deltaY = e.clientY - previousMouseRef.current.y
      
      meshRef.current.rotation.y += deltaX * 0.01
      meshRef.current.rotation.x += deltaY * 0.01
      
      previousMouseRef.current = { x: e.clientX, y: e.clientY }
    }

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault()
      if (cameraRef.current) {
        cameraRef.current.position.z += e.deltaY * 0.5
        cameraRef.current.position.z = Math.max(50, Math.min(500, cameraRef.current.position.z))
      }
    }

    renderer.domElement.addEventListener('mousedown', handleMouseDown)
    renderer.domElement.addEventListener('mouseup', handleMouseUp)
    renderer.domElement.addEventListener('mouseleave', handleMouseUp)
    renderer.domElement.addEventListener('mousemove', handleMouseMove)
    renderer.domElement.addEventListener('wheel', handleWheel, { passive: false })

    // Resize handler
    const handleResize = () => {
      if (!containerRef.current || !cameraRef.current || !rendererRef.current) return
      const w = containerRef.current.clientWidth
      const h = containerRef.current.clientHeight
      cameraRef.current.aspect = w / h
      cameraRef.current.updateProjectionMatrix()
      rendererRef.current.setSize(w, h)
    }
    window.addEventListener('resize', handleResize)

    return () => {
      cancelAnimationFrame(animationRef.current)
      renderer.domElement.removeEventListener('mousedown', handleMouseDown)
      renderer.domElement.removeEventListener('mouseup', handleMouseUp)
      renderer.domElement.removeEventListener('mouseleave', handleMouseUp)
      renderer.domElement.removeEventListener('mousemove', handleMouseMove)
      renderer.domElement.removeEventListener('wheel', handleWheel)
      window.removeEventListener('resize', handleResize)
      renderer.dispose()
      container.removeChild(renderer.domElement)
    }
  }, [geometry])

  // Update color when changed
  useEffect(() => {
    if (meshRef.current) {
      (meshRef.current.material as THREE.MeshPhongMaterial).color.set(colorCode)
    }
  }, [colorCode])

  if (!geometry) {
    return (
      <div className="aspect-video bg-dark-800/50 rounded-xl flex items-center justify-center">
        <div className="text-center text-gray-500">
          <Move3D className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <div>Model yüklendikten sonra önizleme görünecek</div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative">
      <div 
        ref={containerRef} 
        className="aspect-video bg-dark-900 rounded-xl overflow-hidden cursor-grab active:cursor-grabbing"
      />
      <div className="absolute bottom-3 left-3 flex gap-2">
        <div className="px-2 py-1 bg-dark-900/80 rounded text-xs text-gray-400 flex items-center gap-1">
          <RotateCcw className="w-3 h-3" /> Döndür: Sürükle
        </div>
        <div className="px-2 py-1 bg-dark-900/80 rounded text-xs text-gray-400 flex items-center gap-1">
          <ZoomIn className="w-3 h-3" /> Yakınlaş: Scroll
        </div>
      </div>
    </div>
  )
}

// ==================== BİLEŞENLER ====================

function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-dark-900/90 backdrop-blur-xl border-b border-dark-700/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-neon-blue to-neon-purple rounded-xl flex items-center justify-center">
              <Printer className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-display font-bold gradient-text">3D Print Lab</span>
          </div>
          
          <div className="hidden md:flex items-center gap-8">
            <a href="#order" className="text-gray-300 hover:text-neon-blue transition-colors">Sipariş Ver</a>
            <a href="#how" className="text-gray-300 hover:text-neon-blue transition-colors">Nasıl Çalışır</a>
            <a href="#materials" className="text-gray-300 hover:text-neon-blue transition-colors">Malzemeler</a>
            <a href="#contact" className="text-gray-300 hover:text-neon-blue transition-colors">İletişim</a>
          </div>
          
          <a href="#order" className="btn-primary py-2 px-4 text-xs">
            Hemen Başla
          </a>
        </div>
      </div>
    </nav>
  )
}

function HeroSection() {
  return (
    <section className="relative min-h-[50vh] flex items-center justify-center pt-16 overflow-hidden">
      <div className="absolute inset-0 grid-bg opacity-50" />
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-neon-blue/20 rounded-full blur-[120px]" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-neon-purple/20 rounded-full blur-[120px]" />
      
      <div className="relative z-10 max-w-4xl mx-auto px-4 text-center py-12">
        <h1 className="text-4xl md:text-5xl font-display font-bold mb-4 animate-slide-up">
          <span className="text-white">3D Modelinizi Yükleyin,</span>
          <br />
          <span className="gradient-text text-shadow-glow">Biz Basalım</span>
        </h1>
        
        <p className="text-lg text-gray-400 mb-6 max-w-2xl mx-auto animate-slide-up animation-delay-200">
          STL dosyanızı yükleyin, filament ve boyut seçin, anında fiyat alın.
        </p>
        
        <a href="#order" className="btn-primary inline-flex items-center gap-2 animate-slide-up animation-delay-300">
          <Upload className="w-5 h-5" />
          Hemen Başla
          <ArrowRight className="w-5 h-5" />
        </a>
      </div>
    </section>
  )
}

function OrderSection() {
  const [orders, setOrders] = useState<OrderItem[]>([])
  const [currentStep, setCurrentStep] = useState(1)
  const [dragActive, setDragActive] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [modelGeometry, setModelGeometry] = useState<THREE.BufferGeometry | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [currentOrder, setCurrentOrder] = useState<Partial<OrderItem>>({
    filament: 'pla',
    color: 'Beyaz',
    colorCode: '#FFFFFF',
    quality: 'standard',
    infill: 20,
    scale: 100,
    quantity: 1,
    volume: 0,
  })

  const selectedFilament = filamentTypes.find(f => f.id === currentOrder.filament) || filamentTypes[0]
  const selectedQuality = qualityOptions.find(q => q.id === currentOrder.quality) || qualityOptions[1]

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0])
    }
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0])
    }
  }

  const handleFile = useCallback(async (file: File) => {
    const validExtensions = ['.stl', '.obj', '.3mf']
    const extension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'))
    
    if (!validExtensions.includes(extension)) {
      alert('Lütfen STL, OBJ veya 3MF dosyası yükleyin.')
      return
    }

    setIsLoading(true)

    try {
      const buffer = await file.arrayBuffer()
      const modelData = parseSTL(buffer)
      
      setModelGeometry(modelData.geometry)
      setCurrentOrder(prev => ({
        ...prev,
        id: Date.now().toString(),
        fileName: file.name,
        fileSize: (file.size / 1024 / 1024).toFixed(2) + ' MB',
        dimensions: modelData.dimensions,
        volume: modelData.volume,
      }))
      setCurrentStep(2)
    } catch (error) {
      console.error('Model yüklenirken hata:', error)
      alert('Model yüklenirken bir hata oluştu. Lütfen geçerli bir STL dosyası yükleyin.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  const calculatePrice = useCallback(() => {
    if (!currentOrder.dimensions || !currentOrder.volume) return { price: 0, time: 0, weight: 0 }
    
    const scale = (currentOrder.scale || 100) / 100
    const scaledVolume = currentOrder.volume * Math.pow(scale, 3) // Volume scales with cube of linear scale
    const volumeCm3 = scaledVolume / 1000 // Convert mm³ to cm³
    
    const infillFactor = 0.3 + ((currentOrder.infill || 20) / 100) * 0.7
    const materialWeight = volumeCm3 * infillFactor * 1.24 // PLA density ~1.24 g/cm³
    
    const filament = filamentTypes.find(f => f.id === currentOrder.filament)
    const quality = qualityOptions.find(q => q.id === currentOrder.quality)
    
    const basePrice = materialWeight * (filament?.pricePerGram || 0.15)
    const qualityMultiplier = quality?.multiplier || 1
    const quantity = currentOrder.quantity || 1
    
    // Add base fee
    const baseFee = 10
    const price = Math.round((baseFee + basePrice * qualityMultiplier) * quantity)
    
    // Estimate time: layer height affects time significantly
    const layerHeight = quality?.id === 'draft' ? 0.3 : quality?.id === 'standard' ? 0.2 : quality?.id === 'high' ? 0.12 : 0.08
    const dims = currentOrder.dimensions
    const height = dims.z * scale
    const layers = height / layerHeight
    const timePerLayer = 0.5 // minutes per layer (rough estimate)
    const timeMinutes = layers * timePerLayer * quantity
    const timeHours = Math.ceil(timeMinutes / 60)
    
    return { 
      price: Math.max(15, price), 
      time: Math.max(1, timeHours),
      weight: Math.round(materialWeight * quantity * 10) / 10
    }
  }, [currentOrder])

  const addToCart = () => {
    const { price, time } = calculatePrice()
    const newOrder: OrderItem = {
      id: currentOrder.id || Date.now().toString(),
      fileName: currentOrder.fileName || '',
      fileSize: currentOrder.fileSize || '',
      filament: selectedFilament.name,
      color: currentOrder.color || 'Beyaz',
      colorCode: currentOrder.colorCode || '#FFFFFF',
      quality: selectedQuality.name,
      infill: currentOrder.infill || 20,
      scale: currentOrder.scale || 100,
      quantity: currentOrder.quantity || 1,
      estimatedPrice: price,
      estimatedTime: time,
      dimensions: currentOrder.dimensions || { x: 0, y: 0, z: 0 },
      volume: currentOrder.volume || 0,
    }
    
    setOrders([...orders, newOrder])
    resetOrder()
  }

  const resetOrder = () => {
    setCurrentStep(1)
    setModelGeometry(null)
    setCurrentOrder({
      filament: 'pla',
      color: 'Beyaz',
      colorCode: '#FFFFFF',
      quality: 'standard',
      infill: 20,
      scale: 100,
      quantity: 1,
      volume: 0,
    })
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const removeOrder = (id: string) => {
    setOrders(orders.filter(o => o.id !== id))
  }

  const totalPrice = orders.reduce((sum, o) => sum + o.estimatedPrice, 0)
  const totalTime = Math.max(...orders.map(o => o.estimatedTime), 0)

  const { price: currentPrice, time: currentTime, weight: currentWeight } = calculatePrice()

  return (
    <section id="order" className="py-12 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <span className="text-neon-blue text-sm font-semibold tracking-wider uppercase mb-2 block">Sipariş</span>
          <h2 className="section-title">
            <span className="gradient-text">3D Baskı</span> Siparişi
          </h2>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left - Order Configuration */}
          <div className="lg:col-span-2 space-y-4">
            
            {/* Step 1: File Upload */}
            <div className={`glass-card p-5 transition-all ${currentStep === 1 ? 'ring-2 ring-neon-blue' : ''}`}>
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${currentStep >= 1 ? 'bg-neon-blue text-dark-900' : 'bg-dark-600 text-gray-400'}`}>1</div>
                <h3 className="text-lg font-display font-bold text-white">3D Model Yükle</h3>
                {currentStep > 1 && (
                  <button onClick={resetOrder} className="ml-auto text-xs text-gray-400 hover:text-neon-blue transition-colors flex items-center gap-1">
                    <RotateCcw className="w-3 h-3" /> Yeni Model
                  </button>
                )}
              </div>
              
              {currentStep === 1 ? (
                <div
                  className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all ${
                    dragActive 
                      ? 'border-neon-blue bg-neon-blue/10' 
                      : 'border-dark-600 hover:border-neon-blue/50 hover:bg-dark-800/50'
                  } ${isLoading ? 'pointer-events-none opacity-50' : ''}`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => !isLoading && fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".stl,.obj,.3mf"
                    onChange={handleFileInput}
                    className="hidden"
                  />
                  {isLoading ? (
                    <>
                      <div className="w-16 h-16 mx-auto mb-4 border-4 border-neon-blue/30 border-t-neon-blue rounded-full animate-spin" />
                      <div className="text-white font-semibold">Model işleniyor...</div>
                    </>
                  ) : (
                    <>
                      <Upload className={`w-14 h-14 mx-auto mb-4 ${dragActive ? 'text-neon-blue' : 'text-gray-500'}`} />
                      <div className="text-white font-semibold text-lg mb-1">
                        STL dosyanızı sürükleyin
                      </div>
                      <div className="text-gray-500 text-sm">veya tıklayarak dosya seçin</div>
                      <div className="mt-3 text-xs text-gray-600">Desteklenen: STL, OBJ, 3MF • Maks: 100MB</div>
                    </>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {/* File Info */}
                  <div className="flex items-center gap-4 p-3 bg-dark-800/50 rounded-xl">
                    <div className="w-10 h-10 bg-neon-blue/20 rounded-lg flex items-center justify-center">
                      <FileText className="w-5 h-5 text-neon-blue" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-white font-semibold truncate">{currentOrder.fileName}</div>
                      <div className="text-xs text-gray-500">{currentOrder.fileSize}</div>
                    </div>
                  </div>
                  
                  {/* 3D Preview */}
                  <ModelViewer geometry={modelGeometry} colorCode={currentOrder.colorCode || '#FFFFFF'} />
                </div>
              )}
            </div>

            {/* Step 2: Material Selection */}
            {currentStep >= 2 && (
              <div className={`glass-card p-5 transition-all ${currentStep === 2 ? 'ring-2 ring-neon-blue' : ''}`}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold bg-neon-blue text-dark-900">2</div>
                  <h3 className="text-lg font-display font-bold text-white">Filament & Renk</h3>
                </div>
                
                <div className="space-y-4">
                  {/* Filament Type */}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {filamentTypes.map((filament) => (
                      <button
                        key={filament.id}
                        onClick={() => {
                          setCurrentOrder({
                            ...currentOrder,
                            filament: filament.id,
                            color: filament.colors[0],
                            colorCode: filament.colorCodes[0]
                          })
                        }}
                        className={`p-3 rounded-xl text-left transition-all ${
                          currentOrder.filament === filament.id
                            ? 'bg-neon-blue/20 border-2 border-neon-blue'
                            : 'bg-dark-800/50 border-2 border-transparent hover:border-dark-500'
                        }`}
                      >
                        <div className="font-bold text-white text-sm">{filament.name}</div>
                        <div className="text-xs text-gray-500 mb-1">{filament.description}</div>
                        <div className="text-neon-green text-xs font-semibold">₺{filament.pricePerGram}/g</div>
                      </button>
                    ))}
                  </div>

                  {/* Color Selection */}
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Renk: <span className="text-white">{currentOrder.color}</span></label>
                    <div className="flex flex-wrap gap-2">
                      {selectedFilament.colors.map((color, index) => (
                        <button
                          key={color}
                          onClick={() => {
                            setCurrentOrder({
                              ...currentOrder,
                              color: color,
                              colorCode: selectedFilament.colorCodes[index]
                            })
                          }}
                          className={`w-10 h-10 rounded-lg transition-all ${
                            currentOrder.color === color
                              ? 'ring-2 ring-neon-blue ring-offset-2 ring-offset-dark-900 scale-110'
                              : 'hover:scale-105'
                          }`}
                          style={{ backgroundColor: selectedFilament.colorCodes[index] }}
                          title={color}
                        >
                          {currentOrder.color === color && (
                            <Check className={`w-4 h-4 mx-auto ${
                              selectedFilament.colorCodes[index] === '#FFFFFF' || selectedFilament.colorCodes[index] === '#e0f2fe' 
                                ? 'text-dark-900' 
                                : 'text-white'
                            }`} />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Size & Quality */}
            {currentStep >= 2 && currentOrder.dimensions && (
              <div className="glass-card p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold bg-neon-purple text-white">3</div>
                  <h3 className="text-lg font-display font-bold text-white">Boyut & Kalite</h3>
                </div>
                
                <div className="space-y-5">
                  {/* Dimensions Display */}
                  <div className="grid grid-cols-4 gap-3">
                    <div className="p-3 bg-dark-800/50 rounded-xl text-center">
                      <Ruler className="w-4 h-4 text-neon-blue mx-auto mb-1" />
                      <div className="text-xl font-display font-bold text-white">
                        {Math.round(currentOrder.dimensions.x * (currentOrder.scale || 100) / 100)}
                      </div>
                      <div className="text-xs text-gray-500">X (mm)</div>
                    </div>
                    <div className="p-3 bg-dark-800/50 rounded-xl text-center">
                      <Ruler className="w-4 h-4 text-neon-purple mx-auto mb-1" />
                      <div className="text-xl font-display font-bold text-white">
                        {Math.round(currentOrder.dimensions.y * (currentOrder.scale || 100) / 100)}
                      </div>
                      <div className="text-xs text-gray-500">Y (mm)</div>
                    </div>
                    <div className="p-3 bg-dark-800/50 rounded-xl text-center">
                      <Ruler className="w-4 h-4 text-neon-orange mx-auto mb-1" />
                      <div className="text-xl font-display font-bold text-white">
                        {Math.round(currentOrder.dimensions.z * (currentOrder.scale || 100) / 100)}
                      </div>
                      <div className="text-xs text-gray-500">Z (mm)</div>
                    </div>
                    <div className="p-3 bg-dark-800/50 rounded-xl text-center">
                      <Layers className="w-4 h-4 text-neon-green mx-auto mb-1" />
                      <div className="text-xl font-display font-bold text-white">
                        {currentWeight}g
                      </div>
                      <div className="text-xs text-gray-500">Ağırlık</div>
                    </div>
                  </div>

                  {/* Scale Slider */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-sm text-gray-400">Ölçek</label>
                      <span className="text-neon-blue font-bold text-lg">%{currentOrder.scale}</span>
                    </div>
                    <input 
                      type="range" 
                      min="25" 
                      max="300" 
                      step="5"
                      value={currentOrder.scale}
                      onChange={(e) => setCurrentOrder({ ...currentOrder, scale: Number(e.target.value) })}
                      className="w-full h-2 bg-dark-700 rounded-lg appearance-none cursor-pointer accent-neon-blue"
                    />
                    <div className="flex justify-between text-xs text-gray-600 mt-1">
                      <span>%25</span>
                      <span>%100</span>
                      <span>%300</span>
                    </div>
                  </div>

                  {/* Quality Selection */}
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Baskı Kalitesi</label>
                    <div className="grid grid-cols-4 gap-2">
                      {qualityOptions.map((quality) => (
                        <button
                          key={quality.id}
                          onClick={() => setCurrentOrder({ ...currentOrder, quality: quality.id })}
                          className={`p-2 rounded-lg text-center transition-all ${
                            currentOrder.quality === quality.id
                              ? 'bg-neon-purple/20 border-2 border-neon-purple'
                              : 'bg-dark-800/50 border-2 border-transparent hover:border-dark-500'
                          }`}
                        >
                          <div className="font-bold text-white text-sm">{quality.name}</div>
                          <div className="text-xs text-neon-blue">{quality.layer}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Infill Selection */}
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Doluluk Oranı</label>
                    <div className="grid grid-cols-5 gap-2">
                      {infillOptions.map((option) => (
                        <button
                          key={option.value}
                          onClick={() => setCurrentOrder({ ...currentOrder, infill: option.value })}
                          className={`p-2 rounded-lg text-center transition-all ${
                            currentOrder.infill === option.value
                              ? 'bg-neon-green/20 border-2 border-neon-green'
                              : 'bg-dark-800/50 border-2 border-transparent hover:border-dark-500'
                          }`}
                        >
                          <div className="font-bold text-white text-sm">{option.label}</div>
                          <div className="text-xs text-gray-500">{option.description}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Quantity */}
                  <div className="flex items-center justify-between">
                    <label className="text-sm text-gray-400">Adet</label>
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => setCurrentOrder({ ...currentOrder, quantity: Math.max(1, (currentOrder.quantity || 1) - 1) })}
                        className="w-10 h-10 bg-dark-700 rounded-lg text-white hover:bg-dark-600 transition-colors flex items-center justify-center"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="text-2xl font-display font-bold text-white w-10 text-center">{currentOrder.quantity}</span>
                      <button 
                        onClick={() => setCurrentOrder({ ...currentOrder, quantity: (currentOrder.quantity || 1) + 1 })}
                        className="w-10 h-10 bg-dark-700 rounded-lg text-white hover:bg-dark-600 transition-colors flex items-center justify-center"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Price Preview & Add Button */}
                  <div className="flex items-center justify-between p-4 bg-gradient-to-r from-neon-blue/10 to-neon-purple/10 rounded-xl border border-neon-blue/20">
                    <div>
                      <div className="text-gray-400 text-xs">Tahmini Fiyat</div>
                      <div className="text-3xl font-display font-bold gradient-text">₺{currentPrice}</div>
                      <div className="text-xs text-gray-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        ~{currentTime} saat
                      </div>
                    </div>
                    <button 
                      onClick={addToCart}
                      className="btn-primary flex items-center gap-2"
                    >
                      <ShoppingBag className="w-5 h-5" />
                      Sepete Ekle
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right - Cart */}
          <div className="lg:col-span-1">
            <div className="glass-card p-5 sticky top-20">
              <h3 className="text-lg font-display font-bold text-white mb-4 flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-neon-blue" />
                Sepet
                {orders.length > 0 && (
                  <span className="ml-auto bg-neon-blue text-dark-900 text-xs font-bold px-2 py-1 rounded-full">
                    {orders.length}
                  </span>
                )}
              </h3>

              {orders.length === 0 ? (
                <div className="text-center py-6">
                  <Package className="w-12 h-12 text-gray-700 mx-auto mb-2" />
                  <div className="text-gray-500 text-sm">Sepetiniz boş</div>
                </div>
              ) : (
                <div className="space-y-3">
                  {orders.map((order) => (
                    <div key={order.id} className="p-3 bg-dark-800/50 rounded-xl">
                      <div className="flex items-start gap-3">
                        <div 
                          className="w-8 h-8 rounded-lg flex-shrink-0"
                          style={{ backgroundColor: order.colorCode }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-white font-semibold text-sm truncate">{order.fileName}</div>
                          <div className="text-xs text-gray-500">
                            {order.filament} • {order.color}
                          </div>
                          <div className="text-xs text-gray-500">
                            %{order.scale} • %{order.infill} • {order.quantity}x
                          </div>
                        </div>
                        <button 
                          onClick={() => removeOrder(order.id)}
                          className="p-1 text-gray-500 hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="flex justify-between items-center mt-2 pt-2 border-t border-dark-600">
                        <span className="text-xs text-gray-500">~{order.estimatedTime}s</span>
                        <span className="font-bold text-neon-green">₺{order.estimatedPrice}</span>
                      </div>
                    </div>
                  ))}

                  <div className="border-t border-dark-600 pt-3 mt-3">
                    <div className="flex justify-between items-center mb-1 text-sm">
                      <span className="text-gray-400">Toplam Süre</span>
                      <span className="text-white font-semibold">{totalTime} saat</span>
                    </div>
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-gray-400">Toplam</span>
                      <span className="text-2xl font-display font-bold gradient-text">₺{totalPrice}</span>
                    </div>

                    <button className="w-full btn-primary flex items-center justify-center gap-2">
                      <Check className="w-5 h-5" />
                      Siparişi Tamamla
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function HowItWorksSection() {
  const steps = [
    { icon: Upload, title: "Yükle", description: "STL dosyanızı yükleyin" },
    { icon: Palette, title: "Seç", description: "Filament ve renk seçin" },
    { icon: Ruler, title: "Ayarla", description: "Boyut ve kalite belirleyin" },
    { icon: Package, title: "Teslim", description: "1-5 gün içinde kapınızda" },
  ]

  return (
    <section id="how" className="py-16 bg-dark-900/50">
      <div className="max-w-5xl mx-auto px-4">
        <div className="text-center mb-10">
          <h2 className="text-2xl font-display font-bold">
            <span className="gradient-text-warm">Nasıl Çalışır?</span>
          </h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {steps.map((step, index) => (
            <div key={index} className="text-center">
              <div className="w-16 h-16 bg-dark-800 rounded-xl flex items-center justify-center mx-auto mb-3 border border-dark-600">
                <step.icon className="w-7 h-7 text-neon-blue" />
              </div>
              <h3 className="font-bold text-white mb-1">{step.title}</h3>
              <p className="text-xs text-gray-500">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function MaterialsSection() {
  return (
    <section id="materials" className="py-16">
      <div className="max-w-5xl mx-auto px-4">
        <div className="text-center mb-10">
          <h2 className="text-2xl font-display font-bold">
            <span className="gradient-text">Filament</span> Çeşitleri
          </h2>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filamentTypes.map((filament) => (
            <div key={filament.id} className="glass-card-hover p-4">
              <div className="flex items-center gap-3 mb-3">
                <Layers className="w-5 h-5 text-neon-blue" />
                <span className="font-bold text-white">{filament.name}</span>
                <span className="ml-auto text-neon-green font-semibold text-sm">₺{filament.pricePerGram}/g</span>
              </div>
              <p className="text-gray-400 text-sm mb-3">{filament.description}</p>
              <div className="flex flex-wrap gap-1">
                {filament.colorCodes.map((color, index) => (
                  <div 
                    key={index}
                    className="w-5 h-5 rounded-full border border-dark-500"
                    style={{ backgroundColor: color }}
                    title={filament.colors[index]}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function ContactSection() {
  return (
    <section id="contact" className="py-16 bg-dark-900/50">
      <div className="max-w-3xl mx-auto px-4">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-display font-bold">
            <span className="gradient-text-warm">İletişim</span>
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-4 mb-8">
          <div className="glass-card p-4 text-center">
            <Mail className="w-6 h-6 text-neon-blue mx-auto mb-2" />
            <div className="text-white font-semibold text-sm">E-posta</div>
            <div className="text-gray-400 text-xs">info@3dprintlab.com.tr</div>
          </div>
          <div className="glass-card p-4 text-center">
            <Phone className="w-6 h-6 text-neon-purple mx-auto mb-2" />
            <div className="text-white font-semibold text-sm">Telefon</div>
            <div className="text-gray-400 text-xs">+90 555 123 4567</div>
          </div>
          <div className="glass-card p-4 text-center">
            <MapPin className="w-6 h-6 text-neon-orange mx-auto mb-2" />
            <div className="text-white font-semibold text-sm">Adres</div>
            <div className="text-gray-400 text-xs">İstanbul, Türkiye</div>
          </div>
        </div>

        <div className="glass-card p-6">
          <form className="space-y-4">
            <div className="grid md:grid-cols-2 gap-3">
              <input type="text" placeholder="Adınız" className="input-field" />
              <input type="email" placeholder="E-posta" className="input-field" />
            </div>
            <textarea rows={3} placeholder="Mesajınız..." className="input-field resize-none" />
            <button type="submit" className="w-full btn-primary">
              Gönder
            </button>
          </form>
        </div>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="bg-dark-950 border-t border-dark-700/50 py-6">
      <div className="max-w-5xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-neon-blue to-neon-purple rounded-lg flex items-center justify-center">
            <Printer className="w-4 h-4 text-white" />
          </div>
          <span className="font-display font-bold gradient-text">3D Print Lab</span>
        </div>
        <p className="text-gray-500 text-sm">
          © 2026 Tüm hakları saklıdır.
        </p>
      </div>
    </footer>
  )
}

// ==================== ANA SAYFA ====================

export default function Home() {
  return (
    <main className="min-h-screen">
      <Navbar />
      <HeroSection />
      <OrderSection />
      <HowItWorksSection />
      <MaterialsSection />
      <ContactSection />
      <Footer />
    </main>
  )
}
