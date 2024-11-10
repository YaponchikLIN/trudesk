import { call, put, takeLatest } from 'redux-saga/effects';
import { FETCH_WATCHERS } from 'actions/types';

import api from '../../api';
import helpers from 'lib/helpers';

function* fetchWatchers({ payload }) {
  try {
    console.log('fetchWatchers');
    const response = yield call(api.watchers.fetch, payload);
    yield put({ type: FETCH_WATCHERS.SUCCESS, response });
  } catch (error) {
    const errorText = error.response.data.error;
    helpers.UI.showSnackbar(`Error: ${errorText}`, true);
    yield put({ type: FETCH_WATCHERS.ERROR, error });
  }
}

export default function* watcher() {
  yield takeLatest(FETCH_WATCHERS.ACTION, fetchWatchers);

}
