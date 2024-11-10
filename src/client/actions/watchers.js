import { createAction } from 'redux-actions';
import { FETCH_WATCHERS, UPDATE_WATCHERS } from 'actions/types';

export const fetchWatchers = createAction(
  FETCH_WATCHERS.ACTION,
  (payload) => payload,
  () => ({ thunk: true })
);

