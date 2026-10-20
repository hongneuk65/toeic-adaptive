// Unit mocks must not depend on whichever model happens to be active locally.
// Contract tests opt in with their own temporary artifact; live DB tests run separately.
process.env.DAS3H_MODEL_PATH = '';
