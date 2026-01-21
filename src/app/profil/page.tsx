'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { 
  Printer, 
  User, 
  Package, 
  Clock, 
  ArrowLeft,
  LogOut,
  Mail,
  Calendar,
  Loader2,
  ShoppingBag,
  CheckCircle,
  Truck,
  PackageCheck
} from 'lucide-react'
import Link from 'next/link'

interface Order {
  id: string
  items: {
    fileName: string
    filament: string
    color: string
    colorCode: string
    quantity: number
    price: number
  }[]
  totalPrice: number
  status: 'pending' | 'processing' | 'shipping' | 'completed'
  createdAt: Date
}

const statusInfo = {
  pending: { label: 'Beklemede', color: 'text-yellow-400', bg: 'bg-yellow-400/10', icon: Clock },
  processing: { label: 'Hazırlanıyor', color: 'text-neon-blue', bg: 'bg-neon-blue/10', icon: Package },
  shipping: { label: 'Kargoda', color: 'text-neon-purple', bg: 'bg-neon-purple/10', icon: Truck },
  completed: { label: 'Tamamlandı', color: 'text-neon-green', bg: 'bg-neon-green/10', icon: PackageCheck },
}

export default function ProfilPage() {
  const { user, loading, logout } = useAuth()
  const router = useRouter()
  const [orders, setOrders] = useState<Order[]>([])
  const [loadingOrders, setLoadingOrders] = useState(true)

  useEffect(() => {
    if (!loading && !user) {
      router.push('/giris')
    }
  }, [user, loading, router])

  useEffect(() => {
    if (!user) return

    const q = query(
      collection(db, 'orders'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    )

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ordersData: Order[] = []
      snapshot.forEach((doc) => {
        const data = doc.data()
        ordersData.push({
          id: doc.id,
          items: data.items,
          totalPrice: data.totalPrice,
          status: data.status,
          createdAt: data.createdAt?.toDate() || new Date(),
        })
      })
      setOrders(ordersData)
      setLoadingOrders(false)
    })

    return () => unsubscribe()
  }, [user])

  const handleLogout = async () => {
    await logout()
    router.push('/')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-neon-blue animate-spin" />
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen py-12 px-4 relative">
      {/* Background */}
      <div className="absolute inset-0 grid-bg opacity-50" />
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-neon-blue/20 rounded-full blur-[120px]" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-neon-purple/20 rounded-full blur-[120px]" />

      <div className="relative z-10 max-w-4xl mx-auto">
        {/* Back Link */}
        <Link href="/" className="inline-flex items-center gap-2 text-gray-400 hover:text-neon-blue transition-colors mb-6">
          <ArrowLeft className="w-4 h-4" />
          Ana Sayfaya Dön
        </Link>

        {/* Profile Card */}
        <div className="glass-card p-6 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-neon-blue to-neon-purple rounded-2xl flex items-center justify-center">
              {user.photoURL ? (
                <img src={user.photoURL} alt={user.displayName || ''} className="w-full h-full rounded-2xl object-cover" />
              ) : (
                <User className="w-8 h-8 text-white" />
              )}
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-display font-bold text-white">
                {user.displayName || 'Kullanıcı'}
              </h1>
              <div className="flex items-center gap-2 text-gray-400 text-sm">
                <Mail className="w-4 h-4" />
                {user.email}
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 bg-dark-700 hover:bg-dark-600 text-gray-300 rounded-xl transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Çıkış
            </button>
          </div>
        </div>

        {/* Orders Section */}
        <div className="glass-card p-6">
          <h2 className="text-xl font-display font-bold text-white mb-4 flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-neon-blue" />
            Sipariş Geçmişi
          </h2>

          {loadingOrders ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-neon-blue animate-spin" />
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-16 h-16 text-gray-700 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">Henüz sipariş vermediniz</p>
              <Link href="/#order" className="btn-primary inline-flex items-center gap-2">
                <Printer className="w-5 h-5" />
                İlk Siparişinizi Verin
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => {
                const status = statusInfo[order.status]
                const StatusIcon = status.icon
                
                return (
                  <div key={order.id} className="p-4 bg-dark-800/50 rounded-xl border border-dark-600">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`px-3 py-1 rounded-full ${status.bg} ${status.color} text-sm font-semibold flex items-center gap-1`}>
                          <StatusIcon className="w-4 h-4" />
                          {status.label}
                        </div>
                        <span className="text-gray-500 text-sm flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {order.createdAt.toLocaleDateString('tr-TR')}
                        </span>
                      </div>
                      <span className="text-xl font-display font-bold gradient-text">
                        ₺{order.totalPrice}
                      </span>
                    </div>
                    
                    <div className="space-y-2">
                      {order.items.map((item, index) => (
                        <div key={index} className="flex items-center gap-3 text-sm">
                          <div 
                            className="w-6 h-6 rounded-md flex-shrink-0"
                            style={{ backgroundColor: item.colorCode }}
                          />
                          <span className="text-white flex-1 truncate">{item.fileName}</span>
                          <span className="text-gray-500">{item.filament} • {item.color}</span>
                          <span className="text-gray-400">{item.quantity}x</span>
                          <span className="text-neon-green font-semibold">₺{item.price}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
