export const PLANNER_IDLE = 'PLANNER_IDLE';
export const PLANNER_COLLECTING = 'PLANNER_COLLECTING';
export const PLANNER_READY = 'PLANNER_READY';
export const PLANNER_GENERATING = 'PLANNER_GENERATING';
export const PLANNER_COMPLETE = 'PLANNER_COMPLETE';

export const DISCOVERY_IDLE = 'DISCOVERY_IDLE';
export const DISCOVERY_LOADING = 'DISCOVERY_LOADING';
export const DISCOVERY_COMPLETE = 'DISCOVERY_COMPLETE';

export function canStartGeneration(state, plannerContext) {
  if (state !== PLANNER_COLLECTING && state !== PLANNER_READY) return false;
  const destination = plannerContext?.destination;
  return Boolean(destination && String(destination).trim().length > 1);
}

export function nextPlannerState(current, event) {
  const table = {
    [PLANNER_IDLE]: {
      START_WIZARD: PLANNER_COLLECTING,
      DESTINATION_KNOWN: PLANNER_COLLECTING,
    },
    [PLANNER_COLLECTING]: {
      FIELDS_READY: PLANNER_READY,
      GENERATE: PLANNER_GENERATING,
    },
    [PLANNER_READY]: {
      GENERATE: PLANNER_GENERATING,
      EDIT_FIELD: PLANNER_COLLECTING,
    },
    [PLANNER_GENERATING]: {
      DONE: PLANNER_COMPLETE,
      FAIL: PLANNER_COLLECTING,
    },
    [PLANNER_COMPLETE]: {
      RESET: PLANNER_IDLE,
      EDIT: PLANNER_COLLECTING,
    },
  };
  return table[current]?.[event] || current;
}
