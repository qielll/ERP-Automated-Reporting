export function Sidebar() {
  return (
    <aside className="hidden lg:flex flex-col w-60 min-h-screen bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 px-4 py-6 gap-1 fixed top-0 left-0">
      <div className="flex items-center gap-2.5 px-2 mb-8">
        <div className="w-8 h-8 rounded-lg bg-teal-500 flex items-center justify-center">
          <i className="ti ti-chart-bar text-white text-lg" aria-hidden="true" />
        </div>
        <span className="font-semibold text-zinc-800 dark:text-zinc-100 text-sm tracking-tight">SalesTrack</span>
      </div>

      <a href="#" className="flex items-center gap-3 px-3 py-2 rounded-lg bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 text-sm font-medium">
        <i className="ti ti-report-analytics text-lg" aria-hidden="true" />
        Daily Reports
      </a>
      {[
        { icon: "ti-users", label: "Salespeople" },
        { icon: "ti-chart-line", label: "Analytics" },
        { icon: "ti-file-spreadsheet", label: "Export" },
        { icon: "ti-settings", label: "Settings" },
      ].map((item) => (
        <a key={item.label} href="#" className="flex items-center gap-3 px-3 py-2 rounded-lg text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-sm font-medium transition-colors">
          <i className={`ti ${item.icon} text-lg`} aria-hidden="true" />
          {item.label}
        </a>
      ))}

      <div className="mt-auto pt-4 border-t border-zinc-100 dark:border-zinc-800">
        <div className="flex items-center gap-3 px-2">
          <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-950 flex items-center justify-center text-xs font-semibold text-blue-600 dark:text-blue-400">A</div>
          <div>
            <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Admin</p>
            <p className="text-xs text-zinc-400 dark:text-zinc-500">Odoo Manager</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
