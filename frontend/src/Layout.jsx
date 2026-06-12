import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { api } from "@/api/apiClient";
import {
  LayoutDashboard,
  FileText,
  User,
  Menu,
  X,
  LogOut,
  ChevronRight,
  Shield,
  Settings,
  ChevronDown,
  Handshake,
  Receipt,
  Lock,
  GitBranch,
  BarChart2
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const ENVIRONMENTS = [
  { key: "retencao", label: "Retenção", icon: Handshake, color: "bg-blue-500" },
  { key: "cobranca", label: "Cobrança", icon: Receipt, color: "bg-emerald-500", soon: true },
];

const NAV_BY_ENV = {
  retencao: [
    { name: "Dashboard", page: "Dashboard", icon: LayoutDashboard },
    { name: "Solicitações", page: "Requests", icon: FileText },
    { name: "Workflow", page: "Actions", icon: GitBranch },
    { name: "Relatórios", page: "Relatorios", icon: BarChart2 },
    { name: "Meu Perfil", page: "Profile", icon: User },
    { name: "Configurações", page: "Settings", icon: Settings },
  ],
  cobranca: [],
};

function EnvironmentSwitcher({ current, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const env = ENVIRONMENTS.find(e => e.key === current) || ENVIRONMENTS[0];

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors"
      >
        <div className={`w-6 h-6 rounded-md ${env.color} flex items-center justify-center flex-shrink-0`}>
          <env.icon className="w-3.5 h-3.5 text-white" />
        </div>
        <div className="flex-1 min-w-0 text-left">
          <p className="text-xs font-semibold text-slate-200 truncate">{env.label}</p>
          <p className="text-[10px] text-slate-500">Ambiente ativo</p>
        </div>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-slate-800 border border-slate-700 rounded-lg overflow-hidden z-50 shadow-xl">
          {ENVIRONMENTS.map((e) => (
            <button
              key={e.key}
              onClick={() => { if (!e.soon) { onChange(e.key); setOpen(false); } }}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors ${
                e.soon
                  ? "opacity-50 cursor-not-allowed"
                  : current === e.key
                  ? "bg-slate-700"
                  : "hover:bg-slate-700"
              }`}
            >
              <div className={`w-6 h-6 rounded-md ${e.color} flex items-center justify-center flex-shrink-0`}>
                <e.icon className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="text-sm text-slate-200">{e.label}</span>
              {e.soon && <span className="ml-auto text-[10px] text-slate-500 flex items-center gap-1"><Lock className="w-3 h-3" />Em breve</span>}
              {current === e.key && !e.soon && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-400" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function NavItemWithChildren({ item, isActive, onClose }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <div
        onClick={() => setOpen((o) => !o)}
        className={`
          flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium
          transition-all duration-200 cursor-pointer
          ${isActive
            ? "bg-blue-500/15 text-blue-400"
            : "text-slate-400 hover:text-white hover:bg-slate-800"
          }
        `}
      >
        <item.icon className="w-[18px] h-[18px]" />
        {item.name}
        <ChevronRight className={`w-4 h-4 ml-auto transition-transform ${open ? "rotate-90" : ""}`} />
      </div>

      {open && (
        <div className="ml-4 mt-1 space-y-0.5 border-l border-slate-700 pl-3">
          {item.children.map((child) => (
            <Link
              key={child.name}
              to={`${createPageUrl(child.page)}${child.query}`}
              onClick={() => { setOpen(false); onClose(); }}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
            >
              <child.icon className="w-3.5 h-3.5" />
              {child.name}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Layout({ children, currentPageName }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [activeEnv, setActiveEnv] = useState(() => localStorage.getItem("crm_env") || "retencao");

  const handleEnvChange = (key) => {
    setActiveEnv(key);
    localStorage.setItem("crm_env", key);
  };

  const navItems = NAV_BY_ENV[activeEnv] || [];

  useEffect(() => {
    api.auth.me().then(setUser).catch(() => {});
  }, []);

  const initials = user?.full_name
    ? user.full_name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()
    : "U";

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <style>{`
        :root {
          --primary: #1e293b;
          --accent: #3b82f6;
        }
      `}</style>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:sticky top-0 left-0 z-50 h-screen w-64
        bg-slate-900 text-white flex flex-col
        transition-transform duration-300 ease-in-out
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
      `}>
        <div className="p-4 border-b border-slate-700/50 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center">
                <Shield className="w-4 h-4 text-white" />
              </div>
              <div>
                <h1 className="font-semibold text-sm tracking-wide">Portal CRM</h1>
                <p className="text-[10px] text-slate-400 uppercase tracking-widest">Relacionamento</p>
              </div>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-slate-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>
          <EnvironmentSwitcher current={activeEnv} onChange={handleEnvChange} />
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const isActive = currentPageName === item.page;
            if (item.children) {
              return (
                <NavItemWithChildren
                  key={item.page}
                  item={item}
                  isActive={isActive}
                  onClose={() => setSidebarOpen(false)}
                />
              );
            }
            return (
              <Link
                key={item.page}
                to={createPageUrl(item.page)}
                onClick={() => setSidebarOpen(false)}
                className={`
                  flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium
                  transition-all duration-200
                  ${isActive
                    ? "bg-blue-500/15 text-blue-400"
                    : "text-slate-400 hover:text-white hover:bg-slate-800"
                  }
                `}
              >
                <item.icon className="w-[18px] h-[18px]" />
                {item.name}
                {isActive && <ChevronRight className="w-4 h-4 ml-auto" />}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-700/50">
          <div className="flex items-center gap-3 px-2">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-slate-700 text-xs text-slate-300">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-200 truncate">{user?.full_name || "Usuário"}</p>
              <p className="text-[11px] text-slate-500 truncate">{user?.email}</p>
            </div>
            <button
              onClick={() => api.auth.logout()}
              className="text-slate-500 hover:text-red-400 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-h-screen">
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200/60 px-6 py-4 flex items-center lg:hidden">
          <button onClick={() => setSidebarOpen(true)} className="text-slate-600">
            <Menu className="w-5 h-5" />
          </button>
          <h2 className="ml-4 font-semibold text-slate-800">{currentPageName}</h2>
        </header>

        <main className="flex-1 p-6 lg:p-10">
          {children}
        </main>
      </div>
    </div>
  );
}