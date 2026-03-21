jest.setTimeout(15000);

const originalWarn = console.warn;

console.warn = (...args) => {
  const [firstArg] = args;
  if (typeof firstArg === 'string' && firstArg.includes('SafeAreaView has been deprecated')) {
    return;
  }

  originalWarn(...args);
};

jest.mock('expo-status-bar', () => ({
  StatusBar: () => null,
}));

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
