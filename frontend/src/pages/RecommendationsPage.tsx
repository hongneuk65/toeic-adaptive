import React, { useState, useMemo, useCallback } from 'react';
import { useAsyncResource } from '../hooks/useAsyncResource';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import type { SkillMasteryItem, UserMasteryProfile } from '../types/mastery';
import { AdaptivePracticeModal } from '../components/AdaptivePracticeModal';
import { RecommendationsOverview } from '../components/recommendations/RecommendationsOverview';
import { WeakestPartAlert } from '../components/recommendations/WeakestPartAlert';
import { PartsRankingGrid } from '../components/recommendations/PartsRankingGrid';
import { SkillsDiagnosticList } from '../components/recommendations/SkillsDiagnosticList';
import { ActionPlanSteps } from '../components/recommendations/ActionPlanSteps';
import { PriorityRoadmapSection } from '../components/recommendations/PriorityRoadmapSection';
import { LoadingSkeleton } from '../components/ui/LoadingSkeleton';

export const RecommendationsPage: React.FC = () => {
  const navigate = useNavigate();

  const load = useCallback((signal: AbortSignal) => api<UserMasteryProfile>('/mastery/me', { signal }), []);
  const { data: profile, loading, error, reload: fetchProfile } = useAsyncResource(load);

  // Bộ lọc
  const [statusFilter, setStatusFilter] = useState<'all' | 'weak' | 'unpracticed' | 'mastered'>('weak');
  const [sectionFilter, setSectionFilter] = useState<'all' | 'listening' | 'reading'>('all');

  // Modal thực hành ZPD
  const [practicingSkill, setPracticingSkill] = useState<SkillMasteryItem | null>(null);

  const sortedParts = useMemo(() => {
    if (!profile?.partBreakdown) return [];
    return [...profile.partBreakdown].sort((a, b) => a.averageMastery - b.averageMastery);
  }, [profile]);

  const weakestPart = sortedParts.length > 0 ? sortedParts[0] : null;

  const { listeningAvg, readingAvg, weakSkillsCount } = useMemo(() => {
    if (!profile) return { listeningAvg: 0.5, readingAvg: 0.5, weakSkillsCount: 0 };

    const lParts = profile.partBreakdown.filter((p) => p.part >= 1 && p.part <= 4);
    const rParts = profile.partBreakdown.filter((p) => p.part >= 5 && p.part <= 7);

    const lAvg = lParts.length > 0
      ? lParts.reduce((s, p) => s + p.averageMastery, 0) / lParts.length
      : 0.5;

    const rAvg = rParts.length > 0
      ? rParts.reduce((s, p) => s + p.averageMastery, 0) / rParts.length
      : 0.5;

    const weakCount = profile.skills.filter((s) => s.masteryScore < 0.60).length;

    return {
      listeningAvg: Number(lAvg.toFixed(3)),
      readingAvg: Number(rAvg.toFixed(3)),
      weakSkillsCount: weakCount,
    };
  }, [profile]);

  const filteredSkills = useMemo(() => {
    if (!profile?.skills) return [];

    let list = [...profile.skills];

    if (sectionFilter === 'listening') {
      list = list.filter((s) => s.part >= 1 && s.part <= 4);
    } else if (sectionFilter === 'reading') {
      list = list.filter((s) => s.part >= 5 && s.part <= 7);
    }

    if (statusFilter === 'weak') {
      list = list.filter((s) => s.masteryScore < 0.60);
    } else if (statusFilter === 'unpracticed') {
      list = list.filter((s) => s.practiceCount === 0);
    } else if (statusFilter === 'mastered') {
      list = list.filter((s) => s.masteryScore >= 0.60);
    }

    list.sort((a, b) => a.masteryScore - b.masteryScore);
    return list;
  }, [profile, sectionFilter, statusFilter]);

  const handlePracticePart = (part: number) => {
    const skill = profile?.skills.filter((s) => s.part === part)
      .sort((a, b) => a.masteryScore - b.masteryScore)[0];
    if (skill) {
      setPracticingSkill(skill);
    } else {
      navigate('/exam');
    }
  };

  if (loading && !profile) {
    return (
      <LoadingSkeleton label="Đang tổng hợp kỹ năng và gợi ý học tập..." cards={6} />
    );
  }

  if (error || !profile) {
    return (
      <div className="w-full bg-paper-white p-8 border-2 border-accent-coral shadow-paper-medium rounded-sm text-center">
        <h2 className="font-display text-3xl font-bold text-accent-coral mb-2">Không thể tải dữ liệu</h2>
        <p className="font-body text-sm text-ink-medium mb-6">{error || 'Có lỗi bất ngờ xảy ra.'}</p>
        <button
          onClick={fetchProfile}
          className="px-6 py-2 bg-paper-kraft hover:bg-paper-kraft-dark text-white font-body text-sm font-bold rounded"
        >
          THỬ LẠI
        </button>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4 pb-8">
      <RecommendationsOverview
        overallMastery={profile.overallMastery}
        listeningAvg={listeningAvg}
        readingAvg={readingAvg}
        weakSkillsCount={weakSkillsCount}
        totalSkillsCount={profile.skills.length}
      />

      <WeakestPartAlert weakestPart={weakestPart} onPracticePart={handlePracticePart} />

      <SkillsDiagnosticList
        skills={filteredSkills}
        totalSkillsCount={profile.skills.length}
        sectionFilter={sectionFilter}
        setSectionFilter={setSectionFilter}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        onStartPractice={(skill) => setPracticingSkill(skill)}
      />

      <details className="section-disclosure">
        <summary>Tổng quan 7 Part TOEIC</summary>
        <PartsRankingGrid sortedParts={sortedParts} onPracticePart={handlePracticePart} />
      </details>

      <details className="section-disclosure">
      <summary>Lộ trình ưu tiên theo kỹ năng</summary>
      <PriorityRoadmapSection
        onPracticeSkill={(skillId, skillName) => {
          const matched = profile.skills.find((s) => s.skillId === skillId);
          if (matched) {
            setPracticingSkill(matched);
          } else {
            setPracticingSkill({
              skillId,
              skillName,
              skillCode: '',
              part: 5,
              masteryScore: 0.5,
              practiceCount: 0,
              lastPracticed: null,
            });
          }
        }}
      />

      </details>

      <details className="section-disclosure">
        <summary>Cách sử dụng gợi ý học tập</summary>
        <ActionPlanSteps />
      </details>

      {practicingSkill && (
        <AdaptivePracticeModal
          key={practicingSkill.skillId}
          skill={practicingSkill}
          onClose={() => setPracticingSkill(null)}
          onAnswerRecorded={fetchProfile}
        />
      )}
    </div>
  );
};
