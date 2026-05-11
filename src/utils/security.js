function stripInternalSessionFields(session) {
  const { file, ...safe } = session;
  return safe;
}

module.exports = {
  stripInternalSessionFields,
};
