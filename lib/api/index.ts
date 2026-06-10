import { authApi } from './auth';
import { guestsApi } from './guests';
import { eventsApi, fontsApi } from './events';

export const api = {
  ...authApi,
  ...guestsApi,
  ...eventsApi,
  ...fontsApi,
};
