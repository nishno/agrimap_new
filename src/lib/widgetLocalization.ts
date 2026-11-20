const safeTranslate = (t: (key: string) => string, key: string, fallback: string): string => {
    const translated = t(key);
    return translated && translated !== key ? translated : fallback;
};

export const getWidgetTitle = (type: string, fallbackTitle: string, t: (key: string) => string): string => {
    switch (type) {
        case 'profile_verification': return safeTranslate(t, 'dash.widget.profile_verification', 'Profile & KYC Verification');
        case 'onboarding_navigator': return safeTranslate(t, 'dash.widget.onboarding_navigator', 'Manage Profile & Onboarding');
        case 'system_command_center': return safeTranslate(t, 'dash.widget.system_command_center', 'System Command & Operations Center');
        case 'ai_stream': return safeTranslate(t, 'dash.widget.ai_stream', 'AI Autonomous Stream & Anomalies');
        case 'choose_goal': return safeTranslate(t, 'dash.widget.choose_goal', 'Choose Your Goal');
        case 'agronomy_quick': return safeTranslate(t, 'dash.widget.agronomy_quick', 'Agronomy Quick Access');
        case 'tasks': return safeTranslate(t, 'dash.widget.tasks', 'Work & Tasks Hub');
        case 'planner': return safeTranslate(t, 'dash.widget.planner', 'Agro Planner & Schedule');
        case 'weather': return safeTranslate(t, 'dash.widget.weather', 'Online Weather & Station');
        case 'hardware_labs': return safeTranslate(t, 'dash.widget.hardware_labs', 'Hardware Labs & Telemetry');
        case 'team_hubs': return safeTranslate(t, 'dash.widget.team_hubs', 'Team Hubs & Field Comms');
        case 'field_summary': return safeTranslate(t, 'dash.widget.field_summary', 'Field, Sectors & Trenches');
        case 'seedling_summary':
        case 'seedling_health':
        case 'seedling_stats': return safeTranslate(t, 'dash.widget.seedling_summary', 'Seedling Census & Health');
        case 'harvest_pulse': return safeTranslate(t, 'dash.widget.harvest_pulse', 'Harvest Pulse & Scale Station');
        case 'attendance': return safeTranslate(t, 'dash.widget.attendance', 'Staff Attendance & HR');
        case 'market_feed': return safeTranslate(t, 'dash.widget.market_feed', 'Wholesale Marketplace Feed');
        case 'daily_news': return safeTranslate(t, 'dash.widget.daily_news', 'Daily Briefing');
        case 'guest_stats': return safeTranslate(t, 'dash.widget.guest_stats', 'Global Stats');
        case 'crops_summary': return safeTranslate(t, 'dash.widget.crops_summary', 'Crops & Varieties');
        default: return fallbackTitle;
    }
};
