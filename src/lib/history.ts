export interface HistoryState {
  past: string[];
  present: string;
  future: string[];
}

export type HistoryAction =
  | { type: "SET_TYPING"; value: string }
  | { type: "SET_DISCRETE"; value: string }
  | { type: "UNDO" }
  | { type: "REDO" }
  | { type: "CHECKPOINT" };

const CAP = 100;

export function createHistory(initial: string): HistoryState {
  return { past: [], present: initial, future: [] };
}

function push(past: string[], value: string): string[] {
  const next = past.length >= CAP ? past.slice(past.length - CAP + 1) : past;
  return [...next, value];
}

export function historyReducer(
  state: HistoryState,
  action: HistoryAction,
): HistoryState {
  switch (action.type) {
    case "SET_TYPING": {
      if (action.value === state.present) return state;
      return { ...state, present: action.value };
    }
    case "CHECKPOINT": {
      const last = state.past[state.past.length - 1];
      if (last === state.present) return state;
      return {
        past: push(state.past, state.present),
        present: state.present,
        future: [],
      };
    }
    case "SET_DISCRETE": {
      if (action.value === state.present) return state;
      return {
        past: push(state.past, state.present),
        present: action.value,
        future: [],
      };
    }
    case "UNDO": {
      if (state.past.length === 0) return state;
      const prev = state.past[state.past.length - 1];
      return {
        past: state.past.slice(0, -1),
        present: prev,
        future: [state.present, ...state.future],
      };
    }
    case "REDO": {
      if (state.future.length === 0) return state;
      const [next, ...rest] = state.future;
      return {
        past: push(state.past, state.present),
        present: next,
        future: rest,
      };
    }
  }
}
