import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
    Settings, LogOut, Headphones, ArrowUpRight, ChevronRight, X, User, Bell, Globe, Moon, Menu,
    LayoutDashboard
} from 'lucide-react';
import { MENU_ITEMS } from '../utils/permissions';
import { getCurrentUser, logoutUser } from '../utils/auth';
import { apiFetch } from '../utils/api';
 

const Sidebar = () => {
    const user = getCurrentUser();
    const navigate = useNavigate();

    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isMobileOpen, setIsMobileOpen] = useState(false);
    
    // NEW: State to manage the email alerts checkbox
    const [emailAlertsEnabled, setEmailAlertsEnabled] = useState(true);

    // NEW: Load the saved preference when the component mounts
    useEffect(() => {
        const savedPreference = localStorage.getItem('leadEmailAlerts');
        if (savedPreference !== null) {
            setEmailAlertsEnabled(savedPreference === 'true');
        }
    }, []);

    // NEW: Global Heartbeat Ping (Moved from Dashboard)
    useEffect(() => {
        if (!user) return;
        const empId = user.employeeId || user.id || user.username;
        const empName = user.name || user.username || empId;
        const empRole = user.designation || user.role || 'Agent';
        if (!empId) return;

        const sendHeartbeatPing = () => {
            apiFetch('/members/ping', {
                method: 'POST',
                body: JSON.stringify({
                    employeeId: String(empId),
                    name: empName,
                    designation: empRole,
                    status: 'online'
                })
            }).catch((err) => console.error("Heartbeat sync configuration failed:", err));
        };

        sendHeartbeatPing();
        const loopId = setInterval(sendHeartbeatPing, 10000); 
        return () => clearInterval(loopId);
    }, [user]);

    // ─── UNIFIED ULTRA-SPEED LOGOUT DISCONNECT BEACON ────────────
    const handleLogout = () => {
        const empId = user?.employeeId || user?.id || user?.username;
        const empRole = String(user?.role || user?.designation || '').toLowerCase();
        
        // 1. Force view closures immediately
        setIsMobileOpen(false);
        setIsSettingsOpen(false);

        // 2. Fire backend drop request WITHOUT awaiting (Fire and Forget)
        if (empId && empRole !== 'admin' && String(empId).toLowerCase() !== 'admin') {
            // Fired before logoutUser() clears the stored token, so apiFetch
            // still has a valid Authorization header to attach here.
            apiFetch('/members/logout-drop', {
                method: 'POST',
                body: JSON.stringify({ employeeId: String(empId) })
            }).catch((err) => {
                console.error("Presence engine drop context exception:", err);
            });
        }

        // 3. Wipe persistent auth storage states safely
        try {
            logoutUser();
        } catch (authErr) {
            console.warn("Auth utility layout bypass, performing brute storage flush:", authErr);
            localStorage.clear(); 
        }
        
        // 4. Immediate interface redirection
        navigate('/login');
    };

    const handleSaveSettings = () => {
        // NEW: Save the email preference to localStorage
        localStorage.setItem('leadEmailAlerts', emailAlertsEnabled);
        
        // Note: If you have a backend API to save user settings, call it here.
        
        alert("Settings preferences saved!");
        setIsSettingsOpen(false);
    };

    const authorizedMenus = MENU_ITEMS.filter(item =>
        !item.roles || item.roles.includes(user?.role)
    );

    return (
        <>
            {/* ── MOBILE/TABLET HEADER BAR ── */}
            <div className="1920px-locked-hidden xl:hidden w-full h-16 bg-[#0E172B] flex items-center justify-between px-4 border-b border-slate-800/50 fixed top-0 left-0 z-40">
                <div className="flex items-center gap-2">
                    <span className="text-white font-bold tracking-wider text-base uppercase">
                        CRM Portal
                    </span>
                </div>
                <button
                    onClick={() => setIsMobileOpen(true)}
                    className="p-2 text-white hover:bg-white/10 rounded-xl transition-colors focus:outline-none"
                >
                    <Menu size={24} />
                </button>
            </div>

            {/* ── SIDEBAR DRAWER OVERLAY ── */}
            {isMobileOpen && (
                <div
                    className="1920px-locked-hidden xl:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-sm transition-opacity duration-300"
                    onClick={() => setIsMobileOpen(false)}
                />
            )}

            {/* ── PRIMARY SIDEBAR CONTAINER ── */}
            <div className={`
                fixed top-0 bottom-0 left-0 z-50 xl:relative
                w-[280px] h-full xl:h-screen bg-[#0E172B] flex flex-col poppins-regular text-base border-r border-slate-800/50
                transition-transform duration-300 ease-in-out
                ${isMobileOpen ? 'translate-x-0' : '-translate-x-full xl:translate-x-0'}
            `}>

                <div className="1920px-locked-hidden xl:hidden flex items-center justify-between px-4 pt-5 pb-2 border-b border-slate-800/30">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Navigation</span>
                    <button
                        onClick={() => setIsMobileOpen(false)}
                        className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Brand Logo */}
                 

                {/* Scrollable Navigation List */}
                <nav className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-6 space-y-2 custom-scrollbar">
                    {authorizedMenus.map((item, index) => {
                        if (item.type === 'section') {
                            return (
                                <div key={`section-${index}`} className="flex items-center gap-3 pt-6 pb-2">
                                    <span className="text-base font-bold tracking-wider text-white uppercase whitespace-nowrap">
                                        {item.label}
                                    </span>
                                    <div className="h-px bg-slate-800/80 flex-1"></div>
                                </div>
                            );
                        }

                        const Icon = item.icon;

                        return (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                onClick={() => setIsMobileOpen(false)}
                                className={({ isActive }) => {
                                    const isItemActive = isActive || item.active;
                                    return `
                                        group flex items-center justify-between px-3 py-3 rounded-xl transition-all duration-200
                                        ${isItemActive ? 'bg-white/20 text-white' : 'text-white hover:bg-white/10' }
                                    `;
                                }}
                            >
                                {({ isActive }) => {
                                    const isItemActive = isActive || item.active;
                                    return (
                                        <>
                                            <div className="flex items-center gap-3.5 min-w-0">
                                                <div className={`p-2 rounded-lg transition-colors flex-shrink-0 ${isItemActive ? 'bg-white/20 text-white' : 'bg-white/10 text-white'}`}>
                                                    {Icon ? <Icon size={20} strokeWidth={2} /> : <LayoutDashboard size={20} strokeWidth={2} />}
                                                </div>
                                                <span className="text-base font-medium truncate">{item.label}</span>
                                            </div>

                                            <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                                                {item.badge && (
                                                    <span className={`text-base font-bold px-2.5 py-0.5 rounded-full ${isItemActive ? 'bg-white/20 text-white' : 'bg-white/15 text-white'}`}>
                                                        {item.badge}
                                                    </span>
                                                )}
                                                {item.hasSubmenu && <ChevronRight size={16} className="text-white" />}
                                            </div>
                                        </>
                                    );
                                }}
                            </NavLink>
                        );
                    })}
                </nav>

                {/* Profile Tray and Session Terminals */}
                <div className="p-4 border-t border-slate-800/80 bg-[#0E172B] space-y-3 flex-shrink-0">
                    <div className="flex items-center justify-between p-3 rounded-xl border border-slate-700/60 bg-[var(--primary-dark)] hover:bg-white/10 transition-colors">
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="flex flex-col justify-center min-w-0">
                                <span className="text-base font-bold text-white leading-tight truncate max-w-[110px]">
                                    {user?.name || "User Profile"}
                                </span>
                                <span className="text-xs text-slate-400 font-medium mt-0.5 truncate">
                                    ID: {user?.employeeId || "N/A"}
                                </span>
                                <span className="text-xs font-bold text-emerald-400 tracking-wider mt-1 uppercase truncate">
                                    {user?.role || "AGENT"}
                                </span>
                            </div>
                        </div>

                        <div className="flex items-center gap-1 text-white flex-shrink-0">
                            <button onClick={() => setIsSettingsOpen(true)} className="p-2 hover:text-white rounded-md hover:bg-slate-700/50" title="Settings">
                                <Settings size={18} />
                            </button>
                            <button onClick={handleLogout} className="p-2 hover:text-white rounded-md hover:bg-slate-700/50" title="Logout">
                                <LogOut size={18} />
                            </button>
                        </div>
                    </div>

                    <div 
                        onClick={() => {
                            window.dispatchEvent(new CustomEvent('open-ai-chat'));
                            setIsMobileOpen(false); // Auto-close drawer on mobile
                        }}
                        className="flex items-center justify-between p-3 rounded-xl border border-dashed border-slate-700/60 text-white hover:border-white/40 cursor-pointer transition-colors group"
                    >
                        <div className="flex items-center gap-2 min-w-0">
                            <Headphones size={18} className="text-white flex-shrink-0" />
                            <span className="text-sm font-medium truncate">Support Desk</span>
                        </div>
                        <ArrowUpRight size={16} className="opacity-50 group-hover:opacity-100" />
                    </div>
                </div>
            </div>

            {/* ── SETTINGS MODAL ── */}
            {isSettingsOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsSettingsOpen(false)} />
                    <div className="relative z-10 bg-[#1e293b] border border-slate-600 rounded-2xl shadow-2xl w-full max-w-md md:max-w-lg mx-auto overflow-hidden flex flex-col max-h-[92vh]">
                        <div className="flex justify-between items-center px-4 py-4 sm:px-6 border-b border-slate-700/50 bg-slate-800/30 flex-shrink-0">
                            <h3 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                                <Settings size={22} className="text-emerald-400" /> Basic Settings
                            </h3>
                            <button onClick={() => setIsSettingsOpen(false)} className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-slate-700 transition-colors">
                                <X size={22} />
                            </button>
                        </div>

                        <div className="p-4 sm:p-6 space-y-6 overflow-y-auto custom-scrollbar flex-1">
                            <div>
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                    <User size={16} /> Account Profile
                                </h4>
                                <div className="bg-[#0f172a] border border-slate-700 rounded-lg p-4 flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-full bg-slate-700 border border-slate-600 text-white flex items-center justify-center font-bold text-lg uppercase">
                                        {user?.name ? user.name.substring(0, 2) : "US"}
                                    </div>
                                    <div className="min-w-0 w-full">
                                        <p className="text-base font-bold text-white truncate">{user?.name || "User Name"}</p>
                                        <p className="text-xs text-slate-400 truncate">Workspace Session Key Authentication Active</p>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                    <Globe size={16} /> Preferences
                                </h4>
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between bg-[#0f172a] border border-slate-700 rounded-lg p-3">
                                        <span className="text-sm text-slate-200 font-medium">Dark System Skin</span>
                                        <div className="w-10 h-5 bg-emerald-600 rounded-full relative cursor-pointer">
                                            <div className="absolute right-1 top-0.5 w-4 h-4 bg-white rounded-full"></div>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between bg-[#0f172a] border border-slate-700 rounded-lg p-3">
                                        <span className="text-sm text-slate-200 font-medium">Timezone Isolation</span>
                                        <select className="bg-slate-800 text-slate-300 text-sm border border-slate-600 rounded p-1 outline-none">
                                            <option>Asia/Kolkata (IST)</option>
                                            <option>UTC (GMT)</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                    <Bell size={16} /> Notifications
                                </h4>
                                <div className="space-y-3">
                                    <label className="flex items-center justify-between bg-[#0f172a] border border-slate-700 rounded-lg p-3 cursor-pointer">
                                        <span className="text-sm text-slate-200 font-medium">Email Alerts for New Leads</span>
                                        {/* NEW: Controlled checkbox input */}
                                        <input 
                                            type="checkbox" 
                                            checked={emailAlertsEnabled}
                                            onChange={(e) => setEmailAlertsEnabled(e.target.checked)}
                                            className="accent-emerald-500 w-4 h-4 cursor-pointer" 
                                        />
                                    </label>
                                </div>
                            </div>
                        </div>

                        <div className="p-4 border-t border-slate-700/50 bg-slate-800/30 flex justify-end gap-3 flex-shrink-0">
                            <button onClick={() => setIsSettingsOpen(false)} className="px-4 py-2 rounded-lg border border-slate-600 text-slate-300 hover:bg-slate-700 text-sm font-semibold">
                                Cancel
                            </button>
                            <button onClick={handleSaveSettings} className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold shadow-lg">
                                Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default Sidebar;