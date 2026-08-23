# Phase 6: Learning Intelligence Layer

## Overview
Phase 6 introduces the deterministic learning intelligence and recommendation engine. It replaces static lists and duplicated calculations across screens with a unified Next Best Action framework.

## Core Principles
1. **Deterministic Logic**: No fake AI. The system bases its recommendations mathematically on the user's latest quiz results and trends.
2. **quiz_results is Authoritative**: New records are reliably written to `quiz_results`. `quiz_attempts` is merged securely to prevent double counting.
3. **Transparent Reasoning**: Every recommendation includes a `reason` explaining *why* it was suggested.
4. **No New Tables**: The system dynamically calculates mastery based on `user_id` + `topic_id` + `created_at` indexes.

## Mastery Formula
Calculated dynamically in `lib/learning/mastery.ts`:
- **1 Attempt**: 100% of the score
- **2 Attempts**: 60% latest + 40% previous
- **3+ Attempts**: 50% latest + 30% second + 20% third

## Next Best Action Engine
Rules implemented in `lib/learning/recommendations.ts`:
- **Weak Topic (< 70%)**: Recommends Targeted Practice (10-question quiz).
- **Declining Trend**: Recommends Topic Review.
- **Strong Topic (>= 85%)**:
  - Exam Approaching (<= 30 days) -> Past Paper Practice.
  - No Exam Pressure (> 30 days) -> Flashcard Maintenance.

## Integration Points
- **Home (`app/(tabs)/index.tsx`)**: Replaces hardcoded stats with personalized recommendations and progress.
- **Analytics (`app/(tabs)/analytics.tsx`)**: Upgraded to use centralized Subject and Topic mastery aggregations.
- **Topic Hub (`app/topic/[id].tsx`)**: Displays topic-specific mastery and suggests the immediate next action.
- **Quiz Completion (`app/quiz/[topic].tsx`)**: Instantly provides a post-quiz study recommendation.
