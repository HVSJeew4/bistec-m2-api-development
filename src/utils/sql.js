// Builds the SET part of a partial UPDATE from the fields the client actually sent.
// `columns` maps API field names to column names and is the allow-list: column names come from
// our code, values always go in as $n parameters, so client input never becomes SQL text.
// Example: buildSet({ title: 'Hi' }, { title: 'title', content: 'content' }, 2)
//   → { clause: 'title = $2', values: ['Hi'] }
function buildSet(fields, columns, firstIndex = 1) {
  const entries = Object.entries(columns).filter(([field]) => fields[field] !== undefined);
  return {
    clause: entries.map(([, column], i) => `${column} = $${firstIndex + i}`).join(', '),
    values: entries.map(([field]) => fields[field]),
  };
}

module.exports = { buildSet };
