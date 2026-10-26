// Register the supported Sentry Expo plugin only in an upload-capable build.
// The plugin path is stable during EAS config resolution; its token is read on
// the build worker and is never copied into Expo config or sentry.properties.
module.exports = function withOptionalSentry(config) {
  if (!process.env.SENTRY_AUTH_TOKEN) return config;
  const { SENTRY_ORG: organization, SENTRY_PROJECT: project } = process.env;
  if (!organization || !project) {
    throw new Error('SENTRY_ORG and SENTRY_PROJECT are required when SENTRY_AUTH_TOKEN is set.');
  }
  const { withSentry } = require('@sentry/react-native/expo');
  return withSentry(config, { organization, project, url: 'https://sentry.io/' });
};
