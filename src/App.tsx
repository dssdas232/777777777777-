import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Task1SecondaryPlan } from './components/Task1SecondaryPlan';
import { Task2SkuBOM } from './components/Task2SkuBOM';
import { Task3PrimaryPlan } from './components/Task3PrimaryPlan';
import { Task4BlendBOM } from './components/Task4BlendBOM';
import { Task5StemBOM } from './components/Task5StemBOM';
import { Task6SolutionBOM } from './components/Task6SolutionBOM';
import { Task7ProductionHistory } from './components/Task7ProductionHistory';
import { Task8AdaptiveLearning } from './components/Task8AdaptiveLearning';
import { Task9A2AHub } from './components/Task9A2AHub';
import { Task10ArchitectureDashboard } from './components/Task10ArchitectureDashboard';
import { Task11ChatAssistant } from './components/Task11ChatAssistant';
import { MainDashboard } from './components/MainDashboard';
import { VoiceConversationModal } from './components/VoiceConversationModal';

import {
  Language,
  ActiveTab,
  FactoryConstants,
  ProductionLine,
  SecondaryPlanItem,
  SkuBOMFactors,
  BatchScheduleItem,
  BlendComponent,
  StemStage,
  CasingIngredient,
  TopFlavorIngredient,
  ActualProductionRecord,
  AuditLogEntry,
  AdaptiveRecommendation,
} from './types';

import { storageService } from './services/storageService';
import { eventBus } from './services/eventBus';

export default function App() {
  const [language, setLanguage] = useState<Language>('ar');
  const [activeTab, setActiveTab] = useState<ActiveTab>('main');
  const [isChatOpen, setIsChatOpen] = useState<boolean>(false);
  const [isVoiceOpen, setIsVoiceOpen] = useState<boolean>(false);

  // Core state loaded from persistence layer
  const [constants, setConstants] = useState<FactoryConstants>(storageService.getConstants());
  const [lines, setLines] = useState<ProductionLine[]>(storageService.getLines());
  const [planItems, setPlanItems] = useState<SecondaryPlanItem[]>(storageService.getSecondaryPlan());
  const [bomFactors, setBomFactors] = useState<SkuBOMFactors>(storageService.getBOMFactors());
  const [batchSchedules, setBatchSchedules] = useState<BatchScheduleItem[]>(
    storageService.getBatchSchedules()
  );
  const [blendComponents, setBlendComponents] = useState<BlendComponent[]>(
    storageService.getBlendComponents()
  );
  const [stemStages, setStemStages] = useState<StemStage[]>(storageService.getStemStages());
  const [stemYield, setStemYield] = useState<number>(storageService.getStemYield());
  const [casingRate, setCasingRate] = useState<number>(storageService.getCasingRate());
  const [topFlavorRate, setTopFlavorRate] = useState<number>(storageService.getTopFlavorRate());
  const [casingIngredients, setCasingIngredients] = useState<CasingIngredient[]>(
    storageService.getCasingIngredients()
  );
  const [topFlavorIngredients, setTopFlavorIngredients] = useState<TopFlavorIngredient[]>(
    storageService.getTopFlavorIngredients()
  );
  const [actualRecords, setActualRecords] = useState<ActualProductionRecord[]>(
    storageService.getActualRecords()
  );
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(storageService.getAuditLogs());

  // Listen for storage changes
  useEffect(() => {
    const unsub = storageService.subscribe(() => {
      setConstants(storageService.getConstants());
      setLines(storageService.getLines());
      setPlanItems(storageService.getSecondaryPlan());
      setBomFactors(storageService.getBOMFactors());
      setBatchSchedules(storageService.getBatchSchedules());
      setBlendComponents(storageService.getBlendComponents());
      setStemStages(storageService.getStemStages());
      setStemYield(storageService.getStemYield());
      setCasingRate(storageService.getCasingRate());
      setTopFlavorRate(storageService.getTopFlavorRate());
      setCasingIngredients(storageService.getCasingIngredients());
      setTopFlavorIngredients(storageService.getTopFlavorIngredients());
      setActualRecords(storageService.getActualRecords());
      setAuditLogs(storageService.getAuditLogs());
    });
    return () => unsub();
  }, []);

  // Update handlers
  const handleUpdatePlanItems = (items: SecondaryPlanItem[]) => {
    setPlanItems(items);
    storageService.saveSecondaryPlan(items);
  };

  const handleUpdateConstants = (newConstants: FactoryConstants) => {
    setConstants(newConstants);
    storageService.saveConstants(newConstants);
  };

  const handleUpdateLines = (newLines: ProductionLine[]) => {
    setLines(newLines);
    storageService.saveLines(newLines);
  };

  const handleUpdateBOMFactors = (factors: SkuBOMFactors) => {
    setBomFactors(factors);
    storageService.saveBOMFactors(factors);
  };

  const handleUpdateBatchSchedules = (schedules: BatchScheduleItem[]) => {
    setBatchSchedules(schedules);
    storageService.saveBatchSchedules(schedules);
  };

  const handleUpdateBlendComponents = (components: BlendComponent[]) => {
    setBlendComponents(components);
    storageService.saveBlendComponents(components);
  };

  const handleUpdateStemStages = (stages: StemStage[]) => {
    setStemStages(stages);
    storageService.saveStemStages(stages);
  };

  const handleUpdateStemYield = (yieldPct: number) => {
    setStemYield(yieldPct);
    storageService.saveStemYield(yieldPct);
  };

  const handleUpdateCasingRate = (rate: number) => {
    setCasingRate(rate);
    storageService.saveCasingRate(rate);
  };

  const handleUpdateTopFlavorRate = (rate: number) => {
    setTopFlavorRate(rate);
    storageService.saveTopFlavorRate(rate);
  };

  const handleUpdateCasingIngredients = (ings: CasingIngredient[]) => {
    setCasingIngredients(ings);
    storageService.saveCasingIngredients(ings);
  };

  const handleUpdateTopFlavorIngredients = (ings: TopFlavorIngredient[]) => {
    setTopFlavorIngredients(ings);
    storageService.saveTopFlavorIngredients(ings);
  };

  const handleAddActualRecord = (record: Omit<ActualProductionRecord, 'id'>) => {
    storageService.addActualRecord(record);
  };

  // Adaptive recommendation acceptance
  const handleApplyRecommendation = (rec: AdaptiveRecommendation) => {
    // 1. Update line efficiency
    const updatedLines = lines.map((l) =>
      l.id === rec.lineId ? { ...l, efficiencyPercent: rec.suggestedEfficiency } : l
    );
    handleUpdateLines(updatedLines);

    // 2. Update stick weight in constants if needed
    if (Math.abs(constants.tobaccoWeightPerStickG - rec.suggestedStickWeightG) > 0.001) {
      handleUpdateConstants({
        ...constants,
        tobaccoWeightPerStickG: rec.suggestedStickWeightG,
      });
    }

    // 3. Log audit entry
    storageService.addAuditLog({
      actor: 'Adaptive Learning Agent',
      section: 'Line Baseline Calibration',
      fieldChanged: `Line ${rec.lineId} Efficiency & Weight`,
      oldValue: `Eff: ${rec.currentEfficiency}%, Weight: ${rec.currentStickWeightG}g`,
      newValue: `Eff: ${rec.suggestedEfficiency}%, Weight: ${rec.suggestedStickWeightG}g`,
      reason: `Statistical sample calibration (n=${rec.sampleCount} runs) accepted by user`,
    });
  };

  // Aggregated global indicators
  const totalTobaccoDemandKg = planItems.reduce(
    (acc, it) =>
      acc + (it.tobaccoRequiredKg ?? (it.targetMio * 1000000 * constants.tobaccoWeightPerStickG) / 1000),
    0
  );
  const totalBatches = Math.ceil(totalTobaccoDemandKg / constants.blendBatchSizeKg);
  const blendSum = blendComponents.reduce((s, c) => s + c.percentage, 0);
  const isBlendBalanced = Math.abs(blendSum - 100) < 0.01;

  const handleResetToDefaults = () => {
    storageService.resetToDefaults('Production Director');
  };

  const isAr = language === 'ar';

  return (
    <div
      dir={isAr ? 'rtl' : 'ltr'}
      className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950"
    >
      {/* Top Main Navigation */}
      <Navbar
        language={language}
        activeTab={activeTab}
        onLanguageChange={setLanguage}
        onTabChange={setActiveTab}
        onResetDefaults={handleResetToDefaults}
        onOpenVoiceConversation={() => setIsVoiceOpen(true)}
        onOpenChatAssistant={() => setIsChatOpen(true)}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Active Tab View Router */}
        {activeTab === 'main' && (
          <MainDashboard
            language={language}
            planItems={planItems}
            productionLines={lines}
            constants={constants}
            blendComponents={blendComponents}
            actualRecords={actualRecords}
            onNavigateTab={setActiveTab}
            onOpenVoiceConversation={() => setIsVoiceOpen(true)}
            onOpenChatAssistant={() => setIsChatOpen(true)}
          />
        )}

        {activeTab === 'task1' && (
          <Task1SecondaryPlan
            language={language}
            planItems={planItems}
            lines={lines}
            constants={constants}
            onUpdatePlan={handleUpdatePlanItems}
          />
        )}

        {activeTab === 'task2' && (
          <Task2SkuBOM
            language={language}
            planItems={planItems}
            lines={lines}
            bomFactors={bomFactors}
            onUpdateBOMFactors={handleUpdateBOMFactors}
          />
        )}

        {activeTab === 'task3' && (
          <Task3PrimaryPlan
            language={language}
            constants={constants}
            totalDemandFromTask1={totalTobaccoDemandKg}
            batchSchedules={batchSchedules}
            onUpdateConstants={handleUpdateConstants}
            onUpdateBatchSchedules={handleUpdateBatchSchedules}
          />
        )}

        {activeTab === 'task4' && (
          <Task4BlendBOM
            language={language}
            components={blendComponents}
            batchSizeKg={constants.blendBatchSizeKg}
            batchesCount={totalBatches}
            onUpdateComponents={handleUpdateBlendComponents}
          />
        )}

        {activeTab === 'task5' && (
          <Task5StemBOM
            language={language}
            blendComponents={blendComponents}
            batchSizeKg={constants.blendBatchSizeKg}
            batchesCount={totalBatches}
            stemStages={stemStages}
            defaultStemYield={stemYield}
            onUpdateStemStages={handleUpdateStemStages}
            onUpdateStemYield={handleUpdateStemYield}
          />
        )}

        {activeTab === 'task6' && (
          <Task6SolutionBOM
            language={language}
            batchSizeKg={constants.blendBatchSizeKg}
            batchesCount={totalBatches}
            casingRatePercent={casingRate}
            topFlavorRatePercent={topFlavorRate}
            casingIngredients={casingIngredients}
            topFlavorIngredients={topFlavorIngredients}
            onUpdateCasingRate={handleUpdateCasingRate}
            onUpdateTopFlavorRate={handleUpdateTopFlavorRate}
            onUpdateCasingIngredients={handleUpdateCasingIngredients}
            onUpdateTopFlavorIngredients={handleUpdateTopFlavorIngredients}
          />
        )}

        {activeTab === 'task7' && (
          <Task7ProductionHistory
            language={language}
            actualRecords={actualRecords}
            auditLogs={auditLogs}
            planItems={planItems}
            lines={lines}
            onAddActualRecord={handleAddActualRecord}
          />
        )}

        {activeTab === 'task8' && (
          <Task8AdaptiveLearning
            language={language}
            actualRecords={actualRecords}
            lines={lines}
            constants={constants}
            onApplyRecommendation={handleApplyRecommendation}
          />
        )}

        {activeTab === 'task9' && <Task9A2AHub language={language} />}

        {activeTab === 'task10' && <Task10ArchitectureDashboard language={language} />}

        {activeTab === 'task11' && (
          <Task11ChatAssistant
            language={language}
            planItems={planItems}
            constants={constants}
            blendComponents={blendComponents}
            lines={lines}
            actualRecords={actualRecords}
            isOpen={true}
            isFullScreenMode={true}
            onToggleOpen={() => {}}
            onApplyPlanUpdate={handleUpdatePlanItems}
            onUpdateConstants={handleUpdateConstants}
            onUpdateLines={handleUpdateLines}
            onUpdateBlendComponents={handleUpdateBlendComponents}
            onNavigateTab={(tab) => setActiveTab(tab)}
            onAddActualRecord={handleAddActualRecord}
            onResetDefaults={handleResetToDefaults}
          />
        )}
      </main>

      {/* Floating Chat Assistant Widget (Task 11) when not in Task 11 full screen tab */}
      {activeTab !== 'task11' && (
        <Task11ChatAssistant
          language={language}
          planItems={planItems}
          constants={constants}
          blendComponents={blendComponents}
          lines={lines}
          actualRecords={actualRecords}
          isOpen={isChatOpen}
          isFullScreenMode={false}
          onToggleOpen={() => setIsChatOpen(!isChatOpen)}
          onApplyPlanUpdate={handleUpdatePlanItems}
          onUpdateConstants={handleUpdateConstants}
          onUpdateLines={handleUpdateLines}
          onUpdateBlendComponents={handleUpdateBlendComponents}
          onNavigateTab={(tab) => setActiveTab(tab)}
          onAddActualRecord={handleAddActualRecord}
          onResetDefaults={handleResetToDefaults}
        />
      )}

      {/* Real-Time Voice Conversation Modal (gemini-3.8-live) */}
      <VoiceConversationModal
        isOpen={isVoiceOpen}
        onClose={() => setIsVoiceOpen(false)}
        language={language}
      />

      {/* Persistent Factory Status Bar */}
      <footer className="bg-slate-900 border-t border-slate-800 text-xs text-slate-400 py-3 px-4 sm:px-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-4 flex-wrap text-[11px]">
            <span>
              {isAr ? 'الثوابت المعيارية:' : 'Standard Standards:'}{' '}
              <strong className="text-slate-200">
                20 cig/pack | 500 pack/carton | 100 carton/Mio | 0.75g/stick | 10,000 kg batch
              </strong>
            </span>
          </div>

          <div className="flex items-center gap-3 font-mono text-[11px]">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              {isAr ? 'المعمارية: متصل ومستقر' : 'Agent Architecture: Online'}
            </span>
            <span>v2.4.0</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
