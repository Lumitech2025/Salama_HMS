import React, { useState, useEffect } from 'react';
import PsychologistSidebar from './PsychologistSidebar';

// Importing the specialized clinical modules from your psychologist/modules directory
import ClinicalOverview from './modules/ClinicalOverview';
import AppointmentCoordinator from './modules/AppointmentCoordinator';
import ReferralActiveDesk from './modules/ReferralActiveDesk';
import TracingDesk from './modules/TracingDesk';
import BereavementSupport from './modules/BereavementSupport';
import HrioCmeRegistry from './modules/HrioCmeRegistry';

const PsychologistDashboard = () => {
    // Main state machine tracking the active workflow viewport
    const [activeTab, setActiveTab] = useState('home'); 

    // Operational metrics state to feed real-time counters back to the sidebar badges
    const [badgeStats, setBadgeStats] = useState({
        activeCases: 0,
        ltfuAlerts: 0,
        bereavementCases: 0
    });

    // Simulate pulling active counts from your clinical registry lists
    useEffect(() => {
        setBadgeStats({
            activeCases: 2,       // Reflects your current pending intake lists
            ltfuAlerts: 1,       // Reflects high-priority tracing flags
            bereavementCases: 1  // Reflects active families receiving grief support
        });
    }, []);

    const handleLogout = () => {
        localStorage.clear();
        window.location.href = '/login'; 
    };

    // Explicit routing engine for the workspace panels
    const renderActiveModule = () => {
        switch (activeTab) {
            case 'overview':
                return <ClinicalOverview />;
            case 'appointments':
                return <AppointmentCoordinator />;
            case 'home':
                return <ReferralActiveDesk />;
            case 'tracing':
                return <TracingDesk />;
            case 'bereavement':
                return <BereavementSupport />;
            case 'hro_cme':
                return <HrioCmeRegistry />;
            default:
                return <ReferralActiveDesk />;
        }
    };

    return (
        <div className="flex w-full h-screen bg-slate-50 overflow-hidden select-none">
            {/* Fixed Navigation Bar */}
            <PsychologistSidebar 
                activeTab={activeTab} 
                setActiveTab={setActiveTab} 
                onLogout={handleLogout} 
                stats={badgeStats}
            />

            {/* Dynamic Clinical Content Viewport */}
            <main className="flex-1 h-full overflow-y-auto bg-slate-50 relative">
                <div className="w-full min-h-full animate-in fade-in duration-150">
                    {renderActiveModule()}
                </div>
            </main>
        </div>
    );
};

export default PsychologistDashboard;