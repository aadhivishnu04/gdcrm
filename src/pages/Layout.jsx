import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Dashboard from '../pages/Dashboard';

const Layout = () => {
    const location = useLocation();
    const isDashboardActive = location.pathname === '/dashboard';

    return (
        <div className="flex h-screen bg-gray-50 poppins-regular">
            <Sidebar />
            <div className="flex-1 overflow-y-auto">
                {/*
                    Dashboard is always mounted (never torn down) so its data-fetch
                    effect, polling interval, and state persist when you switch to
                    another sidebar item and come back — no refetch/flicker on return.
                    It's just hidden via CSS when you're on any other route.
                */}
                <div className={isDashboardActive ? 'h-full' : 'hidden'}>
                    <Dashboard />
                </div>

                {/* Every other route still mounts/unmounts normally */}
                {!isDashboardActive && <Outlet />}
            </div>
        </div>
    );
};

export default Layout;