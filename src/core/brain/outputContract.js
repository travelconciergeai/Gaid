const OUTPUT_TYPES = {
  SHORT_MESSAGE: 'short_message',
  WIZARD: 'wizard',
  RECOMMENDATION_CARDS: 'recommendation_cards',
  RECOMMENDATION_DRAWER: 'recommendation_drawer',
  REPLANNING_PREVIEW: 'replanning_preview',
  TIMELINE_ACTION: 'timeline_action',
  CHECKLIST: 'checklist',
  LOADING: 'loading',
};

function action(id, label, payload = {}) {
  return { id, label, ...payload };
}

function shortMessage({ title = '', body = '', sections = [], actions = [] } = {}) {
  return {
    type: OUTPUT_TYPES.SHORT_MESSAGE,
    title,
    body,
    sections: Array.isArray(sections) ? sections : [],
    actions: Array.isArray(actions) ? actions : [],
  };
}

function wizardBlock({ step = null, componentType = 'free_text', question = '', options = [], prefilledValue = '', state = {} } = {}) {
  return {
    type: OUTPUT_TYPES.WIZARD,
    step,
    componentType,
    question,
    options: Array.isArray(options) ? options : [],
    prefilledValue,
    state,
  };
}

function recommendationCards({ cards = [], refinementQuestion = '', actions = [] } = {}) {
  return {
    type: OUTPUT_TYPES.RECOMMENDATION_CARDS,
    cards: Array.isArray(cards) ? cards : [],
    refinementQuestion,
    actions: Array.isArray(actions) ? actions : [],
  };
}

function recommendationDrawer(item = null) {
  return {
    type: OUTPUT_TYPES.RECOMMENDATION_DRAWER,
    item,
  };
}

function replanningPreview({ problemDetected = '', proposedChanges = [], impact = '', actions = [] } = {}) {
  return {
    type: OUTPUT_TYPES.REPLANNING_PREVIEW,
    problemDetected,
    proposedChanges: Array.isArray(proposedChanges) ? proposedChanges : [],
    impact,
    actions: Array.isArray(actions) ? actions : [],
  };
}

function timelineAction({ action: timelineActionName = '', target = null, result = null, persisted = false } = {}) {
  return {
    type: OUTPUT_TYPES.TIMELINE_ACTION,
    action: timelineActionName,
    target,
    result,
    persisted,
  };
}

function checklist({ title = '', items = [], context = {} } = {}) {
  return {
    type: OUTPUT_TYPES.CHECKLIST,
    title,
    items: Array.isArray(items) ? items : [],
    context,
  };
}

function loading({ category = 'auto', message = '' } = {}) {
  return {
    type: OUTPUT_TYPES.LOADING,
    category,
    message,
  };
}

export {
  OUTPUT_TYPES,
  action,
  shortMessage,
  wizardBlock,
  recommendationCards,
  recommendationDrawer,
  replanningPreview,
  timelineAction,
  checklist,
  loading,
};
