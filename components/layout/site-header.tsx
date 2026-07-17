export function SiteHeader() {
  return (
    <header className="border-b bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">

        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-blue-600 flex items-center justify-center">
            <span className="text-white font-bold text-lg">
              S
            </span>
          </div>

          <div>
            <h1 className="text-lg font-bold text-slate-900 tracking-tight">
              SCIPL
            </h1>

            <p className="text-xs text-slate-500">
              Interview Question Portal
            </p>
          </div>
        </div>


        {/* Right Section */}
        <div className="hidden sm:flex items-center gap-3">

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-50 border border-green-200">
            <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />

            <span className="text-xs font-medium text-green-700">
              Assessment System Online
            </span>
          </div>

        </div>

      </div>
    </header>
  )
}
