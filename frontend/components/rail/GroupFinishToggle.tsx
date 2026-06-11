'use client';

import { contrastText, getTeamColor } from '@/lib/teamColor';
import { teams } from '@/lib/data';
import type { JourneyScenario } from '@/types/journey';

const THIRD_PLACE_ELIGIBLE_GROUPS = new Set(['A', 'B', 'C', 'D', 'E', 'F', 'H']);

interface GroupFinishToggleProps {
  teamCode: string;
  scenario: JourneyScenario;
  onScenarioChange: (s: JourneyScenario) => void;
}

export function GroupFinishToggle({ teamCode, scenario, onScenarioChange }: GroupFinishToggleProps) {
  const team = teams[teamCode];
  const teamColor = getTeamColor(teamCode);
  const group = team?.group ?? '';
  const thirdEligible = THIRD_PLACE_ELIGIBLE_GROUPS.has(group);

  return (
    <div className="rail-team-block">
      <div className="rail-h">
        <span>Group Finish</span>
      </div>
      <div className="rail-team-scenario">
        {(['first', 'second', 'third'] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onScenarioChange(s)}
            className="rail-team-scenario__btn"
            style={{
              borderColor: scenario === s ? teamColor : 'var(--rule)',
              background: scenario === s ? teamColor : 'var(--paper-2)',
              color: scenario === s ? contrastText(teamColor) : 'var(--ink)',
            }}
          >
            {s === 'first' ? '1st' : s === 'second' ? '2nd' : '3rd'}
          </button>
        ))}
      </div>
      {scenario === 'third' && (
        <div
          className="rail-team-scenario__note"
          style={{
            background: thirdEligible ? 'rgba(255,180,0,0.08)' : 'rgba(255,80,80,0.08)',
            borderColor: thirdEligible ? 'rgba(255,180,0,0.2)' : 'rgba(255,80,80,0.2)',
          }}
        >
          {thirdEligible
            ? 'Only 8 of 12 third-place teams advance. Path is approximate.'
            : `Group ${group} does not have a 3rd-place bracket slot. Shown for reference only.`}
        </div>
      )}
    </div>
  );
}
