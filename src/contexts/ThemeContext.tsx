<header className="p-6 bg-white border-b border-slate-100 flex justify-between items-center sticky top-0 z-10">
  <div>
    <h1 className="text-2xl font-black text-indigo-600 tracking-tighter">StopBet</h1>
    <p className="text-xs text-slate-400 font-medium uppercase tracking-widest">Reprenez le contrôle</p>
  </div>
  <div className="flex items-center gap-3">
    <button onClick={() => setShowSOS(true)}
      className="flex items-center gap-1.5 bg-red-500 text-white px-3 py-1.5 rounded-full font-black text-xs uppercase tracking-wider active:scale-95 transition-transform animate-pulse">
      <AlertTriangle size={13} /> SOS
    </button>
    <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-full">
      <Trophy size={16} />
      <span className="text-sm font-bold">{profile.streakCount}j sans pari</span>
    </div>
  </div>
</header>