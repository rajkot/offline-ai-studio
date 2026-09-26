'use client';

interface HeaderProps {
  totalPrompts: number;
  totalCategories: number;
  totalAuthors: number;
}

export default function Header({ totalPrompts, totalCategories, totalAuthors }: HeaderProps) {
  return (
    <header className="relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-[#1a1a2e] via-[#16213e] to-[#0f3460] animate-gradient" />
      <div className="absolute inset-0 opacity-20" style={{
        backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(233,69,96,0.4) 0%, transparent 50%), radial-gradient(circle at 80% 50%, rgba(15,52,96,0.4) 0%, transparent 50%)',
      }} />
      
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-8">
          <div className="animate-fade-up">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-5xl animate-float">🍌</span>
              <h1 className="text-4xl md:text-5xl font-black tracking-tight">
                <span className="text-gradient">Nano Banana Pro</span>
              </h1>
            </div>
            <p className="text-lg text-[var(--color-text-secondary)] max-w-xl leading-relaxed">
              Explore <span className="text-white font-semibold">2,500</span> hand-curated AI image generation prompts.
              Copy, remix, and create stunning visuals with Nano Banana Pro.
            </p>
          </div>

          <div className="flex flex-col gap-4 animate-fade-up" style={{ animationDelay: '0.2s' }}>
            <div className="flex flex-wrap gap-3">
              <div className="glass rounded-2xl px-5 py-3 text-center">
                <div className="text-2xl font-bold text-gradient">{totalPrompts.toLocaleString()}</div>
                <div className="text-xs text-[var(--color-text-secondary)] mt-1">Prompts</div>
              </div>
              <div className="glass rounded-2xl px-5 py-3 text-center">
                <div className="text-2xl font-bold text-[#ffa726]">{totalCategories}</div>
                <div className="text-xs text-[var(--color-text-secondary)] mt-1">Categories</div>
              </div>
              <div className="glass rounded-2xl px-5 py-3 text-center">
                <div className="text-2xl font-bold text-[#42a5f5]">{totalAuthors}</div>
                <div className="text-xs text-[var(--color-text-secondary)] mt-1">Authors</div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2">
              <button
                className="pro-btn btn-buy-pro px-5 py-2.5 rounded-xl font-bold text-sm transition-all duration-300 hover:scale-105 active:scale-95 shadow-lg"
                style={{
                  background: 'linear-gradient(135deg, #f7971e, #ffd200)',
                  color: '#1a1a2e',
                  boxShadow: '0 4px 20px rgba(247, 151, 30, 0.4)',
                }}
                onClick={() => window.open('https://wa.me/919898048483', '_blank')}
              >
                ⚡ BUY NOW PRO (APPOINTMENT)
              </button>
              <button
                className="pro-btn btn-donate px-5 py-2.5 rounded-xl font-bold text-sm transition-all duration-300 hover:scale-105 active:scale-95 shadow-lg"
                style={{
                  background: 'linear-gradient(135deg, #00b894, #00cec9)',
                  color: '#fff',
                  boxShadow: '0 4px 20px rgba(0, 184, 148, 0.4)',
                }}
                onClick={() => window.open('https://docs.google.com/forms/d/e/1FAIpQLScJ7WjuxEXqdoSlUtxN7NQ8UeKpbEAeA9iIO-IXOmBmYzlLHQ/viewform?usp=sharing&ouid=116676179363878319046', '_blank')}
              >
                🪙 DONATION SYSTEM
              </button>
              <button
                className="pro-btn btn-store px-5 py-2.5 rounded-xl font-bold text-sm transition-all duration-300 hover:scale-105 active:scale-95 shadow-lg"
                style={{
                  background: 'linear-gradient(135deg, #6c5ce7, #a29bfe)',
                  color: '#fff',
                  boxShadow: '0 4px 20px rgba(108, 92, 231, 0.4)',
                }}
                onClick={() => window.open('https://wa.me/c/919898048483', '_blank')}
              >
                🛒 OFFICIAL DIGITAL STORE
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-[var(--color-surface)] to-transparent" />
    </header>
  );
}
