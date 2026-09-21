'use client';

import HitlDashboard, { HitlTask, ActiveLearningStats } from '@/client/views/HitlDashboard';

export type { HitlTask, ActiveLearningStats };

export default function HitlReviewDashboard(props: {
  onApplyCode?: (filename: string, code: string) => void;
  onRerouteToAi?: (prompt: string, correctedCode: string) => void;
  activeFilePath?: string;
}) {
  return <HitlDashboard {...props} />;
}
