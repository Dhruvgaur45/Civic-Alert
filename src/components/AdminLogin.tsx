import React, { useState } from 'react';
import { Lock, User, AlertCircle, ShieldAlert } from 'lucide-react';

interface AdminLoginProps {
  onLoginSuccess: (token: string) => void;
}

export default function AdminLogin({ onLoginSuccess }: AdminLoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isError, setIsError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsError(false);
    setIsLoading(true);

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
      });

      if (res.ok) {
        const data = await res.json();
        onLoginSuccess(data.token);
      } else {
        setIsError(true);
      }
    } catch (err) {
      console.error(err);
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto py-12">
      <div className="bg-white rounded-2xl border border-[#E5E1D8] shadow-lg overflow-hidden">
        
        {/* Core Header */}
        <div className="bg-[#4B5E40] px-6 py-8 text-center text-white space-y-2 relative">
          <div className="bg-white/10 text-[#ECF3E9] p-3.5 rounded-full border border-white/20 w-fit mx-auto">
            <ShieldAlert className="w-6 h-6 text-[#ECF3E9]" />
          </div>
          <h2 className="text-xl font-display font-medium tracking-tight">Admin Lock Portal</h2>
          <p className="text-[#ECF3E9]/80 text-xs">Authorize credentials to access community diagnostic tools.</p>
        </div>

        {/* Form elements */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {isError && (
            <div className="p-3 bg-rose-50 border border-rose-100 text-rose-800 text-xs rounded-xl flex items-center gap-1.5 leading-relaxed">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>Invalid username or password. Check credentials in setup instructions.</span>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider font-sans">Username</label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#E5E1D8] outline-none focus:border-[#4B5E40] focus:ring-1 focus:ring-[#4B5E40] text-sm text-[#2D2D2A]"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider font-sans">Password</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#E5E1D8] outline-none focus:border-[#4B5E40] focus:ring-1 focus:ring-[#4B5E40] text-sm text-[#2D2D2A]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-[#4B5E40] hover:bg-[#3D4F33] text-white font-bold py-3 rounded-xl shadow transition-colors cursor-pointer text-xs uppercase tracking-wider mt-2"
          >
            {isLoading ? 'Verifying Sockets...' : 'Authorize Access'}
          </button>
        </form>

        {/* Credentials cheat Sheet inside developing mode */}
        <div className="bg-[#FDFCF9] px-6 py-4 border-t border-[#E5E1D8] text-[10px] text-gray-500 font-mono text-center space-y-0.5">
          <div>🔑 TESTING CREDENTIALS:</div>
          <div>User: <span className="font-bold text-[#4B5E40]">admin</span> / Password: <span className="font-bold text-[#4B5E40]">civicalert2026</span></div>
        </div>

      </div>
    </div>
  );
}
