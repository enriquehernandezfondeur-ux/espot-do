'use client'

import { useState } from 'react'
import { Save, Camera } from 'lucide-react'

export default function AjustesPage() {
  const [fullName, setFullName] = useState('Enrique Hernández')
  const [phone, setPhone] = useState('+1 (809) 555-0101')
  const [whatsapp, setWhatsapp] = useState('+1 (809) 555-0101')
  const [saved, setSaved] = useState(false)

  function handleSave() {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Ajustes de cuenta</h1>
        <p className="text-slate-400 mt-1">Administra tu perfil de propietario</p>
      </div>

      <div className="space-y-6">
        {/* Avatar */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <h2 className="text-white font-semibold mb-4">Foto de perfil</h2>
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-16 h-16 bg-gradient-to-br from-violet-500 to-[#28A87C] rounded-full flex items-center justify-center">
                <span className="text-white text-2xl font-bold">E</span>
              </div>
              <button className="absolute -bottom-1 -right-1 w-6 h-6 bg-[#35C493] rounded-full flex items-center justify-center">
                <Camera size={12} className="text-white" />
              </button>
            </div>
            <div>
              <button className="text-[#35C493] text-sm hover:text-[#4DD9A7] transition-colors">Cambiar foto</button>
              <p className="text-slate-500 text-xs mt-0.5">JPG o PNG, máximo 2MB</p>
            </div>
          </div>
        </div>

        {/* Personal info */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
          <h2 className="text-white font-semibold">Información personal</h2>
          {[
            { label: 'Nombre completo', value: fullName, setter: setFullName, placeholder: 'Tu nombre' },
            { label: 'Teléfono', value: phone, setter: setPhone, placeholder: '+1 (809)...' },
            { label: 'WhatsApp', value: whatsapp, setter: setWhatsapp, placeholder: '+1 (809)...' },
          ].map(field => (
            <div key={field.label}>
              <label className="block text-slate-300 text-sm font-medium mb-1.5">{field.label}</label>
              <input
                value={field.value}
                onChange={e => field.setter(e.target.value)}
                placeholder={field.placeholder}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-[#35C493] text-sm transition-colors"
              />
            </div>
          ))}
        </div>

        {/* Notifications */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-3">
          <h2 className="text-white font-semibold">Notificaciones</h2>
          {[
            { label: 'Nueva reserva', desc: 'Recibir email cuando alguien haga una reserva' },
            { label: 'Nueva cotización', desc: 'Recibir email cuando alguien solicite precio' },
            { label: 'Mensaje nuevo', desc: 'Notificación de mensajes de clientes' },
          ].map(notif => (
            <div key={notif.label} className="flex items-center justify-between py-1">
              <div>
                <div className="text-white text-sm">{notif.label}</div>
                <div className="text-slate-500 text-xs">{notif.desc}</div>
              </div>
              <div className="w-12 h-6 bg-[#35C493] rounded-full relative cursor-pointer">
                <span className="absolute right-0.5 top-0.5 w-5 h-5 bg-white rounded-full shadow" />
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={handleSave}
          className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#35C493] to-[#28A87C] hover:from-violet-500 hover:to-purple-500 text-white font-semibold py-3 rounded-xl transition-all"
        >
          <Save size={18} />
          {saved ? '¡Guardado!' : 'Guardar cambios'}
        </button>
      </div>
    </div>
  )
}
