export const TEST_MOCK_GOOGLE_ID_TOKEN = ['mock', 'admin@ger.local'].join(':');
export const TEST_INVALID_GOOGLE_ID_TOKEN = ['mock', 'invalid@ger.local'].join(
  ':',
);
export const TEST_ACCESS_TOKEN = ['mock', '-access-token'].join('-');
export const TEST_STORED_TOKEN = ['stored', '-token'].join('-');
export const TEST_LOGIN_TOKEN = ['token', '-real'].join('');
export const TEST_API_TOKEN = ['token', '-123'].join('');
export const TEST_LOGOUT_TOKEN = ['token', '-abc'].join('');
export const TEST_REFRESH_TOKEN = ['user-admin', ':refresh-token'].join('');
export const TEST_ROTATED_REFRESH_TOKEN = [
  'user-admin',
  ':refresh-rotated',
].join('');
