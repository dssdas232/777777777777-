import React from 'react';
import {
  Layers,
  FileSpreadsheet,
  Factory,
  Combine,
  GitMerge,
  FlaskConical,
  History,
  BrainCircuit,
  Network,
  Cpu,
  Languages,
  Activity,
  Bot,
  RotateCcw,
  LayoutDashboard,
} from 'lucide-react';
import { Language, ActiveTab } from '../types';

interface NavbarProps {
  language: Language;
  onLanguageChange: (lang: Language) => void;
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  onOpenSettings?: () => void;
  onResetDefaults?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  language,
  onLanguageChange,
  activeTab,
  onTabChange,
  onResetDefaults,
}) => {
  const isAr = language === 'ar';

  const tabs: { id: ActiveTab; nameAr: string; nameEn: string; icon: any }[] = [
    { id: 'main', nameAr: 'لوحة التحكم', nameEn: 'Main Dashboard', icon: LayoutDashboard },
    { id: 'task1', nameAr: 'خطة الثانوي', nameEn: '1. Secondary', icon: FileSpreadsheet },
    { id: 'task2', nameAr: 'BOM المواد', nameEn: '2. SKU BOM', icon: Layers },
    { id: 'task3', nameAr: 'خطة الأولي', nameEn: '3. Primary', icon: Factory },
    { id: 'task4', nameAr: 'BOM الخلطة', nameEn: '4. Blend BOM', icon: Combine },
    { id: 'task5', nameAr: 'BOM السيقان', nameEn: '5. Stem BOM', icon: GitMerge },
    { id: 'task6', nameAr: 'BOM المحاليل', nameEn: '6. Solutions', icon: FlaskConical },
    { id: 'task7', nameAr: 'سجل وتاريخ', nameEn: '7. History', icon: History },
    { id: 'task8', nameAr: 'التعلّم التكيفي', nameEn: '8. Adaptive', icon: BrainCircuit },
    { id: 'task9', nameAr: 'بروتوكول A2A', nameEn: '9. A2A Hub', icon: Network },
    { id: 'task10', nameAr: 'لوحة المعمارية', nameEn: '10. Architecture', icon: Cpu },
  ];

  return (
    <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur border-b border-slate-800">
      {/* Top Brand Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Agent Identity */}
          <div className="flex items-center space-x-3 rtl:space-x-reverse">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-inner">
              <Factory className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2 rtl:space-x-reverse">
                <h1 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  {isAr ? 'وكيل تخطيط إنتاج مصنع السجائر الذكي' : 'Cigarette Factory AI Production Planner'}
                </h1>
                <span className="px-2 py-0.5 text-[10px] sm:text-xs font-semibold rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  {isAr ? 'متصل (Active)' : 'Active (Online)'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                {isAr
                  ? 'نظام التخطيط الشامل للإنتاج الأولي والثانوي • BOM المواد • التعلّم التكيفي • A2A'
                  : 'Multi-Task Autonomous Manufacturing AI • Primary/Secondary BOMs • Adaptive Machine Learning'}
              </p>
            </div>
          </div>

          {/* Quick Metrics & Actions */}
          <div className="flex items-center space-x-2 sm:space-x-3 rtl:space-x-reverse">
            {/* Live A2A status */}
            <div className="hidden lg:flex items-center text-xs text-slate-400 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700/60 font-mono">
              <Activity className="w-3.5 h-3.5 text-amber-400 mr-1.5 rtl:mr-0 rtl:ml-1.5" />
              <span>JSON-RPC 2.0 • Port 3000</span>
            </div>

            {/* Restore Factory Baselines Button */}
            {onResetDefaults && (
              <button
                id="reset-factory-data-btn"
                onClick={onResetDefaults}
                className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 transition-colors flex items-center gap-1.5 shadow-sm"
                title={isAr ? 'استعادة بيانات المصنع الواقعية النموذجية' : 'Restore Factory Real-World Baselines'}
              >
                <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden md:inline">
                  {isAr ? 'بيانات المصنع الواقعية' : 'Factory Baselines'}
                </span>
              </button>
            )}

            {/* Language Switcher */}
            <button
              id="lang-toggle-btn"
              onClick={() => onLanguageChange(isAr ? 'en' : 'ar')}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 transition-colors flex items-center gap-1.5 shadow-sm"
              title={isAr ? 'Switch to English' : 'التحويل للعربية'}
            >
              <Languages className="w-4 h-4 text-amber-400" />
              <span>{isAr ? 'English' : 'عربي'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs Bar */}
      <div className="border-t border-slate-800/80 bg-slate-900/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-1 rtl:space-x-reverse overflow-x-auto py-2 no-scrollbar">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  id={`tab-${tab.id}`}
                  onClick={() => onTabChange(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg whitespace-nowrap transition-all ${
                    isActive
                      ? 'bg-amber-500 text-slate-950 font-bold shadow-md'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-slate-950' : 'text-slate-400'}`} />
                  <span>{isAr ? tab.nameAr : tab.nameEn}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
};
