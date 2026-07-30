export function Footer() {
  return (
    <footer className="bg-green-dark text-white/90">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 md:grid-cols-3">
        <div>
          <p className="font-extrabold text-lg">Ñandubay</p>
          <p className="text-sm text-white/70">
            Centro de Terapia Ocupacional. &quot;Un espacio para florecer
            juntos&quot;.
          </p>
        </div>
        <div className="text-sm">
          <p className="font-bold mb-2">Contacto</p>
          <p>Bolívar 551, planta baja — San Miguel de Tucumán</p>
          <p>Tel: 3815821197</p>
          <p>espacionandubay@gmail.com</p>
        </div>
        <div className="text-sm">
          <p className="font-bold mb-2">Legal</p>
          <p>
            <a href="/politica-de-cookies" className="hover:text-yellow-soft">
              Política de cookies
            </a>
          </p>
          <p>
            <a href="/privacidad" className="hover:text-yellow-soft">
              Protección de datos personales
            </a>
          </p>
        </div>
      </div>
      <p className="border-t border-white/10 py-4 text-center text-xs text-white/60">
        © {new Date().getFullYear()} Ñandubay — Terapia Ocupacional
      </p>
    </footer>
  );
}
