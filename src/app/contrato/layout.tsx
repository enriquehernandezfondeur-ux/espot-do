// Layout limpio para la página de contrato — sin navbar ni footer
// Solo renderiza el contenido directo para una vista imprimible
export default function ContratoLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
