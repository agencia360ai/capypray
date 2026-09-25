const { expo } = require("./app.json");
module.exports = () => ({ ...expo, extra: { ...expo.extra, ...(process.env.EXPO_PUBLIC_EAS_PROJECT_ID ? { eas: { projectId: process.env.EXPO_PUBLIC_EAS_PROJECT_ID } } : {}) } });
