export function Navbar() {
  return (
    <header className="flex items-center h-16 px-gutter bg-surface-container-low border-b border-outline-variant shrink-0">
      {/* Left: Logo */}
      <div className="flex items-center gap-compact-gap">
        <img
          alt="AccuLedger Logo"
          className="w-8 h-8 shrink-0"
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuBiZVh33XK4sg0Cf0Pm2N5FrKbpAMT8lNGK97INqjoemoBZsqlzyY7NiAgGS3jiGjEPzRX6s5XJyPyyEixFtC4Vj_hvysR6CBiupoA-ceSylGa8Dy44bMRlPcrGzA1WYFEJT-HR4cXIEJ2PUFTlS2QdTf5AjhxMrOmkibHJVWkrHMx6bzFoXPqCkiP2vlxvuyDbwHrlWKWaYlW8EV3M6ocVQ5ds4g6WyTZnIWhEHMvf2OV0ztC5yFT_0sF1Q4d-rcpdwYtHWMm6Azo"
        />
        <div className="flex flex-col">
          <span className="font-headline-sm text-headline-sm font-bold text-on-surface">
            AccuLedger
          </span>
          <span className="font-label-caps text-[9px] text-on-surface-variant">
            Enterprise Finance
          </span>
        </div>
      </div>

      {/* Center: Global Search */}
      <div className="flex-1 flex items-center max-w-xl mx-8">
        <div className="relative w-full">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">
            search
          </span>
          <input
            className="bg-surface-container-high border border-outline-variant/30 rounded-lg pl-10 pr-4 py-2 text-body-sm font-body-sm text-on-surface focus:ring-1 focus:ring-primary w-full transition-all"
            placeholder="Global Search (Records, Invoices, Customers)..."
            type="text"
          />
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-cozy-gap">
        <button className="bg-secondary text-on-secondary px-4 py-2 rounded-lg flex items-center gap-2 font-label-caps text-label-caps font-bold hover:opacity-90 transition-all">
          <span className="material-symbols-outlined text-[18px]">add</span>
          Quick Add
        </button>
        <div className="flex items-center gap-2 border-l border-outline-variant pl-cozy-gap">
          <button className="p-2 text-on-surface-variant hover:bg-surface-container-high rounded-full relative">
            <span className="material-symbols-outlined">notifications</span>
            <span className="absolute top-2 right-2 w-2 h-2 bg-error rounded-full border-2 border-surface-container-low" />
          </button>
          <button className="p-2 text-on-surface-variant hover:bg-surface-container-high rounded-full">
            <span className="material-symbols-outlined">settings</span>
          </button>
          <div className="flex items-center gap-compact-gap cursor-pointer hover:bg-surface-container-high p-1 pr-3 rounded-full transition-colors ml-2">
            <img
              alt="User Profile"
              className="w-8 h-8 rounded-full border border-secondary"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuAUBAQM9pd0d2Y8CyJX6QTiPWqXNZTzy2Dvsz_OYI_RhgqqQBO7jfH7iXr3tiD5m58oLfeYLboKxEeJ6qRvPmL8wgFw2mJV51DGt9FMuZQ0dntsReqcm4VhWQPJwNU8efHXGmD-wxzLibbyzc2khT29AKRbbhOivAOxGwe6H69jXIJIHK5699KvwRPkaSdrstAeU3WY2_A9cWK1lGotJwgcZtxQwXxWXeUt-9iDBQH5Udos-CZmoHXZIZLI-cP9eXuaw6LFlHbu96k"
            />
            <div className="hidden lg:block leading-tight">
              <p className="font-body-sm text-body-sm font-bold text-primary">
                Alex Sterling
              </p>
              <p className="font-label-caps text-[9px] text-on-surface-variant uppercase">
                Senior Analyst
              </p>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}